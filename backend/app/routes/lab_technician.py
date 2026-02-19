from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.healthcare import LabTest, Patient, MedicalRecord, Notification
from ..models.user import User
from .. import db
from ..utils.data_isolation import OrganizationScopedQuery
from datetime import datetime
import json

lab_technician_bp = Blueprint('lab_technician', __name__, url_prefix='/api/lab_technician')

@lab_technician_bp.route('/lab_tests', methods=['GET'])
@jwt_required()
def get_lab_tests():
    """Get all lab tests for the lab technician's organization"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role not in ['lab_technician', 'admin']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        user_org_id = user.organization_id
        if not user_org_id:
            return jsonify({'error': 'User not associated with any organization'}), 400
        
        # Get status filter if provided
        status = request.args.get('status')
        
        # Base query - lab tests for the organization
        query = LabTest.query.join(Patient).filter(
            Patient.organization_id == user_org_id
        )
        
        # Apply status filter if provided - handle comma-separated values
        if status:
            # Split comma-separated statuses and filter
            status_list = [s.strip() for s in status.split(',')]
            query = query.filter(LabTest.status.in_(status_list))
        
        lab_tests = query.order_by(LabTest.created_at.desc()).all()
        
        # Debug logging
        print(f"DEBUG: Lab technician org {user_org_id} - Found {len(lab_tests)} lab tests")
        for test in lab_tests:
            print(f"  Test {test.id}: {test.test_name}, Status: {test.status}, Patient: {test.patient.first_name} {test.patient.last_name}")
        
        # Format the response with patient and doctor information
        tests_data = []
        for test in lab_tests:
            patient = test.patient
            doctor = test.doctor if test.doctor else None
            
            test_data = {
                'id': test.id,
                'test_type': test.test_type,
                'test_name': test.test_name,
                'clinical_notes': test.clinical_notes,
                'status': test.status,
                'urgency': test.urgency,
                'sample_type': test.sample_type,
                'result_value': test.result_value,
                'result_notes': test.result_notes,
                'abnormal_flag': test.abnormal_flag,
                'ordered_at': test.ordered_at.isoformat() if test.ordered_at else None,
                'completed_at': test.completed_at.isoformat() if test.completed_at else None,
                'patient': {
                    'id': patient.id,
                    'first_name': patient.first_name,
                    'last_name': patient.last_name,
                    'patient_id': patient.patient_id,
                    'date_of_birth': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                    'gender': patient.gender,
                    'phone': patient.phone,
                    'email': patient.email
                } if patient else None,
                'doctor': {
                    'id': doctor.id,
                    'first_name': doctor.first_name,
                    'last_name': doctor.last_name,
                    'email': doctor.email
                } if doctor else None
            }
            tests_data.append(test_data)
        
        return jsonify({
            'lab_tests': tests_data,
            'total': len(tests_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@lab_technician_bp.route('/lab_tests/<int:test_id>/status', methods=['PUT'])
@jwt_required()
def update_test_status(test_id):
    """Update the status of a lab test"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role not in ['lab_technician', 'admin']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        new_status = data.get('status')
        
        # Debug logging
        print(f"DEBUG: Received status update request for test {test_id} with status: {new_status}")
        
        # Valid statuses from LabTest model enum
        valid_statuses = ['ordered', 'sample_collected', 'in_progress', 'completed', 'cancelled', 'rejected']
        if not new_status or new_status not in valid_statuses:
            print(f"DEBUG: Invalid status received: {new_status}, valid: {valid_statuses}")
            return jsonify({'error': f'Valid status is required. Allowed values: {valid_statuses}'}), 400
        
        # No status mapping needed - use the status as-is
        backend_status = new_status
        
        user_org_id = user.organization_id
        if not user_org_id:
            return jsonify({'error': 'User not associated with any organization'}), 400
        
        # Get the lab test and verify it belongs to the user's organization
        lab_test = LabTest.query.join(Patient).filter(
            LabTest.id == test_id,
            Patient.organization_id == user_org_id
        ).first()
        
        if not lab_test:
            return jsonify({'error': 'Lab test not found'}), 404
        
        # Update status and timestamp
        lab_test.status = backend_status
        
        # Set appropriate timestamps based on status
        if backend_status == 'sample_collected':
            lab_test.sample_collected_at = datetime.utcnow()
        elif backend_status == 'in_progress':
            if not lab_test.sample_collected_at:
                lab_test.sample_collected_at = datetime.utcnow()
        elif backend_status == 'completed':
            lab_test.completed_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Test status updated successfully',
            'test': {
                'id': lab_test.id,
                'status': lab_test.status,
                'updated_at': lab_test.updated_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@lab_technician_bp.route('/lab_tests/<int:test_id>/results', methods=['PUT'])
@jwt_required()
def submit_test_results(test_id):
    """Submit results for a lab test"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role not in ['lab_technician', 'admin']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        results = data.get('results')
        
        if not results:
            return jsonify({'error': 'Results are required'}), 400
        
        user_org_id = user.organization_id
        if not user_org_id:
            return jsonify({'error': 'User not associated with any organization'}), 400
        
        # Get the lab test and verify it belongs to the user's organization
        lab_test = LabTest.query.join(Patient).filter(
            LabTest.id == test_id,
            Patient.organization_id == user_org_id
        ).first()
        
        if not lab_test:
            return jsonify({'error': 'Lab test not found'}), 404
        
        # Update results, status to completed, and timestamp
        results_data = json.loads(results)
        lab_test.result_value = results_data.get('result_value', '')
        lab_test.result_notes = results_data.get('result_notes', '')
        lab_test.abnormal_flag = results_data.get('abnormal_flag', 'normal')
        lab_test.status = 'completed'
        lab_test.completed_at = datetime.utcnow()
        
        db.session.commit()
        
        # ===== BILLING: Add lab test fee to patient's bill =====
        try:
            from app.routes.billing import add_lab_test_fee
            add_lab_test_fee(
                organization_id=user_org_id,
                patient_id=lab_test.patient_id,
                lab_test_id=lab_test.id,
                test_name=lab_test.test_name
            )
            db.session.commit()
            print(f"DEBUG: Added lab test fee for test {lab_test.test_name} to patient {lab_test.patient_id}'s bill")
        except Exception as e:
            print(f"Warning: Could not add lab test billing: {e}")
        
        # Create notification for the ordering doctor
        patient = lab_test.patient
        doctor = lab_test.doctor
        
        if doctor:
            # Determine priority based on abnormal flag
            priority = 'critical' if results_data.get('abnormal_flag') == 'critical' else \
                      'high' if results_data.get('abnormal_flag') in ['high', 'low'] else 'medium'
            
            notification = Notification(
                organization_id=user_org_id,
                recipient_id=doctor.id,
                sender_id=current_user_id,
                title=f"Lab Results Ready: {lab_test.test_name}",
                message=f"Lab results are now available for {patient.first_name} {patient.last_name} (ID: {patient.patient_id}). Test: {lab_test.test_name}. Result: {results_data.get('abnormal_flag', 'normal').upper()}",
                notification_type='lab_result',
                priority=priority,
                lab_test_id=lab_test.id,
                patient_id=patient.id
            )
            db.session.add(notification)
            db.session.commit()
        
        return jsonify({
            'message': 'Test results submitted successfully',
            'test': {
                'id': lab_test.id,
                'result_value': lab_test.result_value,
                'result_notes': lab_test.result_notes,
                'abnormal_flag': lab_test.abnormal_flag,
                'status': lab_test.status,
                'completed_at': lab_test.completed_at.isoformat() if lab_test.completed_at else None
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@lab_technician_bp.route('/lab_tests/<int:test_id>', methods=['GET'])
@jwt_required()
def get_lab_test_details(test_id):
    """Get detailed information about a specific lab test"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role not in ['lab_technician', 'admin']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        user_org_id = user.organization_id
        
        if not user_org_id:
            return jsonify({'error': 'User not associated with any organization'}), 400
        
        # Get the lab test with patient and doctor information
        lab_test = LabTest.query.join(Patient).filter(
            LabTest.id == test_id,
            Patient.organization_id == user_org_id
        ).first()
        
        if not lab_test:
            return jsonify({'error': 'Lab test not found'}), 404
        
        patient = lab_test.patient
        doctor = lab_test.doctor if lab_test.doctor else None
        
        test_data = {
            'id': lab_test.id,
            'test_type': lab_test.test_type,
            'test_name': lab_test.test_name,
            'clinical_notes': lab_test.clinical_notes,
            'status': lab_test.status,
            'urgency': lab_test.urgency,
            'sample_type': lab_test.sample_type,
            'result_value': lab_test.result_value,
            'result_notes': lab_test.result_notes,
            'abnormal_flag': lab_test.abnormal_flag,
            'ordered_at': lab_test.ordered_at.isoformat() if lab_test.ordered_at else None,
            'completed_at': lab_test.completed_at.isoformat() if lab_test.completed_at else None,
            'patient': {
                'id': patient.id,
                'first_name': patient.first_name,
                'last_name': patient.last_name,
                'patient_id': patient.patient_id,
                'date_of_birth': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                'gender': patient.gender,
                'phone': patient.phone,
                'email': patient.email,
                'address': patient.address,
                'emergency_contact': patient.emergency_contact
            } if patient else None,
            'doctor': {
                'id': doctor.id,
                'first_name': doctor.first_name,
                'last_name': doctor.last_name,
                'email': doctor.email
            } if doctor else None
        }
        
        return jsonify(test_data), 200
        
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@lab_technician_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_lab_stats():
    """Get statistics for lab tests in the organization"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role not in ['lab_technician', 'admin']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        user_org_id = OrganizationScopedQuery.get_current_org_id()
        if not user_org_id:
            return jsonify({'error': 'User not associated with any organization'}), 400
        
        # Count tests by status
        base_query = LabTest.query.join(Patient).filter(
            Patient.organization_id == user_org_id
        )
        
        total_tests = base_query.count()
        pending_tests = base_query.filter(LabTest.status == 'pending').count()
        in_progress_tests = base_query.filter(LabTest.status == 'in_progress').count()
        completed_tests = base_query.filter(LabTest.status == 'completed').count()
        
        # Get recent tests (last 7 days)
        from datetime import timedelta
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_tests = base_query.filter(LabTest.created_at >= seven_days_ago).count()
        
        return jsonify({
            'total_tests': total_tests,
            'pending_tests': pending_tests,
            'in_progress_tests': in_progress_tests,
            'completed_tests': completed_tests,
            'recent_tests': recent_tests
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500