"""
Healthcare API routes with organization-based data isolation
All routes automatically filter data by the current user's organization.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.utils.data_isolation import (
    patient_service, 
    appointment_service, 
    medical_record_service, 
    department_service,
    lab_test_service,
    organization_required,
    organization_access_required
)
from app.models import Patient, Appointment, MedicalRecord, Department, LabTest
from datetime import datetime, date
import traceback

bp = Blueprint('healthcare', __name__, url_prefix='/api')

# Patient routes
@bp.route('/patients', methods=['GET'])
@jwt_required()
@organization_required
def get_patients():
    """Get all patients for the current organization"""
    try:
        search = request.args.get('search', '').strip()
        
        if search:
            patients = patient_service.search_patients(search)
        else:
            patients = patient_service.get_all()
        
        return jsonify({
            'patients': [{
                'id': p.id,
                'patient_id': p.patient_id,
                'first_name': p.first_name,
                'last_name': p.last_name,
                'date_of_birth': p.date_of_birth.isoformat() if p.date_of_birth else None,
                'gender': p.gender,
                'phone': p.phone,
                'email': p.email,
                'blood_type': p.blood_type,
                'is_active': p.is_active
            } for p in patients],
            'total': len(patients)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/patients/<int:patient_id>', methods=['GET'])
@jwt_required()
@organization_access_required(Patient)
def get_patient(patient_id):
    """Get a specific patient (organization-scoped)"""
    try:
        patient = patient_service.get_by_id(patient_id)
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        return jsonify({
            'patient': {
                'id': patient.id,
                'patient_id': patient.patient_id,
                'first_name': patient.first_name,
                'last_name': patient.last_name,
                'date_of_birth': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                'gender': patient.gender,
                'blood_type': patient.blood_type,
                'phone': patient.phone,
                'email': patient.email,
                'address': patient.address,
                'emergency_contact': patient.emergency_contact,
                'emergency_phone': patient.emergency_phone,
                'allergies': patient.allergies,
                'chronic_conditions': patient.chronic_conditions,
                'current_medications': patient.current_medications,
                'insurance_info': patient.insurance_info,
                'is_active': patient.is_active,
                'created_at': patient.created_at.isoformat() if patient.created_at else None
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/patients', methods=['POST'])
@jwt_required()
@organization_required
def create_patient():
    """Create a new patient (automatically scoped to current organization)"""
    try:
        data = request.get_json()
        
        # Convert date_of_birth string to date object
        if 'date_of_birth' in data and data['date_of_birth']:
            data['date_of_birth'] = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        
        patient = patient_service.create(data)
        
        return jsonify({
            'message': 'Patient created successfully',
            'patient': {
                'id': patient.id,
                'patient_id': patient.patient_id,
                'first_name': patient.first_name,
                'last_name': patient.last_name
            }
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# Appointment routes
@bp.route('/appointments', methods=['GET'])
@jwt_required()
@organization_required
def get_appointments():
    """Get appointments for the current organization"""
    try:
        # Optional date filter
        date_str = request.args.get('date')
        doctor_id = request.args.get('doctor_id', type=int)
        
        if date_str:
            appointment_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            if doctor_id:
                appointments = appointment_service.get_doctor_appointments(doctor_id, appointment_date)
            else:
                appointments = appointment_service.get_appointments_by_date(appointment_date)
        elif doctor_id:
            appointments = appointment_service.get_doctor_appointments(doctor_id)
        else:
            appointments = appointment_service.get_all()
        
        return jsonify({
            'appointments': [{
                'id': a.id,
                'patient_id': a.patient_id,
                'patient_name': f"{a.patient.first_name} {a.patient.last_name}",
                'doctor_id': a.doctor_id,
                'doctor_name': f"{a.doctor.first_name} {a.doctor.last_name}",
                'department': a.department.name if a.department else None,
                'appointment_date': a.appointment_date.isoformat(),
                'duration_minutes': a.duration_minutes,
                'reason': a.reason,
                'status': a.status,
                'consultation_fee': float(a.consultation_fee) if a.consultation_fee else None,
                'payment_status': a.payment_status
            } for a in appointments],
            'total': len(appointments)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/appointments', methods=['POST'])
@jwt_required()
@organization_required
def create_appointment():
    """Create a new appointment (automatically scoped to current organization)"""
    try:
        data = request.get_json()
        
        # Convert appointment_date string to datetime object
        if 'appointment_date' in data:
            data['appointment_date'] = datetime.fromisoformat(data['appointment_date'].replace('Z', '+00:00'))
        
        # Convert consultation_fee to Decimal if provided
        if 'consultation_fee' in data and data['consultation_fee']:
            from decimal import Decimal
            data['consultation_fee'] = Decimal(str(data['consultation_fee']))
        
        appointment = appointment_service.create(data)
        
        return jsonify({
            'message': 'Appointment created successfully',
            'appointment': {
                'id': appointment.id,
                'appointment_date': appointment.appointment_date.isoformat(),
                'status': appointment.status
            }
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# Medical Records routes
@bp.route('/patients/<int:patient_id>/medical-records', methods=['GET'])
@jwt_required()
@organization_access_required(Patient)
def get_patient_medical_records(patient_id):
    """Get medical records for a specific patient (organization-scoped)"""
    try:
        records = medical_record_service.get_patient_records(patient_id)
        
        return jsonify({
            'medical_records': [{
                'id': r.id,
                'visit_date': r.visit_date.isoformat(),
                'doctor_name': f"{r.doctor.first_name} {r.doctor.last_name}",
                'chief_complaint': r.chief_complaint,
                'diagnosis': r.diagnosis,
                'treatment_plan': r.treatment_plan,
                'medications_prescribed': r.medications_prescribed,
                'blood_pressure': r.blood_pressure,
                'heart_rate': r.heart_rate,
                'temperature': r.temperature,
                'weight': r.weight,
                'height': r.height
            } for r in records],
            'total': len(records)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/medical-records', methods=['POST'])
@jwt_required()
@organization_required
def create_medical_record():
    """Create a new medical record (automatically scoped to current organization)"""
    try:
        data = request.get_json()
        claims = get_jwt()
        current_user_id = claims.get('user_id')
        org_id = claims.get('organization_id')
        
        # Convert visit_date string to datetime object if provided
        if 'visit_date' in data and data['visit_date']:
            data['visit_date'] = datetime.fromisoformat(data['visit_date'].replace('Z', '+00:00'))
        else:
            data['visit_date'] = datetime.utcnow()
        
        # Ensure organization and doctor are set
        data['organization_id'] = org_id
        data['doctor_id'] = current_user_id
        
        record = medical_record_service.create(data)
        
        # If this medical record is linked to a lab test, update the lab test status
        if data.get('lab_test_id'):
            try:
                lab_test = lab_test_service.get_by_id(data['lab_test_id'])
                if lab_test and lab_test.organization_id == org_id:
                    lab_test.status = 'completed'
                    lab_test_service.update(lab_test)
            except Exception as e:
                print(f"Warning: Could not update lab test status: {e}")
        
        return jsonify({
            'message': 'Medical record created successfully',
            'medical_record': {
                'id': record.id,
                'visit_date': record.visit_date.isoformat(),
                'diagnosis': record.diagnosis,
                'treatment_plan': record.treatment_plan
            }
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# Department routes
@bp.route('/departments', methods=['GET'])
@jwt_required()
@organization_required
def get_departments():
    """Get all departments for the current organization"""
    try:
        departments = department_service.get_all()
        
        return jsonify({
            'departments': [{
                'id': d.id,
                'name': d.name,
                'description': d.description,
                'location': d.location,
                'phone': d.phone,
                'head_doctor': f"{d.head_doctor.first_name} {d.head_doctor.last_name}" if d.head_doctor else None,
                'is_active': d.is_active
            } for d in departments],
            'total': len(departments)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Analytics and reporting routes
@bp.route('/analytics/dashboard', methods=['GET'])
@jwt_required()
@organization_required
def get_dashboard_analytics():
    """Get dashboard analytics scoped to current organization"""
    try:
        # Get counts of various entities for the current organization
        total_patients = len(patient_service.get_all())
        total_departments = len(department_service.get_all())
        
        # Get today's appointments
        today = date.today()
        today_appointments = appointment_service.get_appointments_by_date(today)
        
        # Get appointment statistics
        scheduled_count = len([a for a in today_appointments if a.status == 'scheduled'])
        completed_count = len([a for a in today_appointments if a.status == 'completed'])
        
        return jsonify({
            'analytics': {
                'total_patients': total_patients,
                'total_departments': total_departments,
                'today_appointments': len(today_appointments),
                'scheduled_appointments': scheduled_count,
                'completed_appointments': completed_count,
                'organization_info': {
                    'organization_id': get_jwt().get('organization_id'),
                    'organization_code': get_jwt().get('organization_code'),
                    'organization_name': get_jwt().get('organization_name')
                }
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/test-isolation', methods=['GET'])
@jwt_required()
@organization_required
def test_data_isolation():
    """Test endpoint to verify data isolation is working"""
    try:
        current_org_id = get_jwt().get('organization_id')
        
        # Count records in current organization
        patients = patient_service.get_all()
        appointments = appointment_service.get_all()
        departments = department_service.get_all()
        
        # Verify all records belong to current organization
        patient_orgs = set(p.organization_id for p in patients)
        appointment_orgs = set(a.organization_id for a in appointments)
        department_orgs = set(d.organization_id for d in departments)
        
        isolation_check = {
            'current_organization_id': current_org_id,
            'patient_count': len(patients),
            'appointment_count': len(appointments),
            'department_count': len(departments),
            'patient_orgs_found': list(patient_orgs),
            'appointment_orgs_found': list(appointment_orgs),
            'department_orgs_found': list(department_orgs),
            'isolation_success': (
                patient_orgs <= {current_org_id} and
                appointment_orgs <= {current_org_id} and
                department_orgs <= {current_org_id}
            )
        }
        
        return jsonify({
            'message': 'Data isolation test completed',
            'results': isolation_check
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Lab Test routes
@bp.route('/lab-tests', methods=['GET'])
@jwt_required()
@organization_required
def get_lab_tests():
    """Get all lab tests for the current organization"""
    try:
        patient_id = request.args.get('patient_id')
        status = request.args.get('status')
        
        if patient_id:
            lab_tests = lab_test_service.get_by_patient(int(patient_id))
        elif status:
            lab_tests = lab_test_service.get_by_status(status)
        else:
            lab_tests = lab_test_service.get_all()
        
        return jsonify({
            'lab_tests': [{
                'id': test.id,
                'patient_id': test.patient_id,
                'doctor_id': test.doctor_id,
                'test_type': test.test_type,
                'test_name': test.test_name,
                'test_code': test.test_code,
                'clinical_notes': test.clinical_notes,
                'urgency': test.urgency,
                'sample_type': test.sample_type,
                'status': test.status,
                'ordered_at': test.ordered_at.isoformat(),
                'scheduled_for': test.scheduled_for.isoformat() if test.scheduled_for else None,
                'sample_collected_at': test.sample_collected_at.isoformat() if test.sample_collected_at else None,
                'completed_at': test.completed_at.isoformat() if test.completed_at else None,
                'result_value': test.result_value,
                'reference_range': test.reference_range,
                'units': test.units,
                'abnormal_flag': test.abnormal_flag,
                'result_notes': test.result_notes,
                'lab_location': test.lab_location
            } for test in lab_tests],
            'total': len(lab_tests)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/patients/<int:patient_id>/lab-tests', methods=['GET'])
@jwt_required()
@organization_access_required(Patient)
def get_patient_lab_tests(patient_id):
    """Get all lab tests for a specific patient (organization-scoped)"""
    try:
        lab_tests = lab_test_service.get_by_patient(patient_id)
        
        return jsonify({
            'lab_tests': [{
                'id': test.id,
                'patient_id': test.patient_id,
                'doctor_id': test.doctor_id,
                'test_type': test.test_type,
                'test_name': test.test_name,
                'test_code': test.test_code,
                'clinical_notes': test.clinical_notes,
                'urgency': test.urgency,
                'sample_type': test.sample_type,
                'status': test.status,
                'ordered_at': test.ordered_at.isoformat(),
                'scheduled_for': test.scheduled_for.isoformat() if test.scheduled_for else None,
                'sample_collected_at': test.sample_collected_at.isoformat() if test.sample_collected_at else None,
                'completed_at': test.completed_at.isoformat() if test.completed_at else None,
                'result_value': test.result_value,
                'reference_range': test.reference_range,
                'units': test.units,
                'abnormal_flag': test.abnormal_flag,
                'result_notes': test.result_notes,
                'lab_location': test.lab_location,
                'patient_name': f"{test.patient.first_name} {test.patient.last_name}" if test.patient else None,
                'doctor_name': f"Dr. {test.doctor.first_name} {test.doctor.last_name}" if test.doctor else None
            } for test in lab_tests]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/lab-tests', methods=['POST'])
@jwt_required()
@organization_required
def create_lab_test():
    """Create a new lab test request (automatically scoped to current organization)"""
    try:
        data = request.get_json()
        claims = get_jwt()
        current_user_id = claims.get('user_id')
        org_id = claims.get('organization_id')
        
        # Convert scheduled_for string to datetime object if provided
        scheduled_for = None
        if data.get('scheduled_for'):
            scheduled_for = datetime.fromisoformat(data['scheduled_for'].replace('Z', '+00:00'))
        
        lab_test = lab_test_service.create({
            'organization_id': org_id,
            'patient_id': data['patient_id'],
            'doctor_id': current_user_id,
            'test_type': data['test_type'],
            'test_name': data['test_name'],
            'test_code': data.get('test_code'),
            'clinical_notes': data.get('clinical_notes'),
            'urgency': data.get('urgency', 'routine'),
            'sample_type': data.get('sample_type'),
            'scheduled_for': scheduled_for,
            'lab_location': data.get('lab_location')
        })
        
        return jsonify({
            'message': 'Lab test ordered successfully',
            'lab_test': {
                'id': lab_test.id,
                'test_name': lab_test.test_name,
                'test_type': lab_test.test_type,
                'status': lab_test.status,
                'urgency': lab_test.urgency,
                'ordered_at': lab_test.ordered_at.isoformat()
            }
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/lab-tests/<int:test_id>', methods=['PUT'])
@jwt_required()
@organization_access_required(LabTest)
def update_lab_test(test_id):
    """Update a lab test (organization-scoped)"""
    try:
        lab_test = lab_test_service.get_by_id(test_id)
        if not lab_test:
            return jsonify({'error': 'Lab test not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        updatable_fields = [
            'status', 'sample_collected_at', 'completed_at', 'result_value', 
            'reference_range', 'units', 'abnormal_flag', 'result_notes', 
            'lab_technician_id', 'scheduled_for'
        ]
        
        for field in updatable_fields:
            if field in data:
                if field in ['sample_collected_at', 'completed_at', 'scheduled_for'] and data[field]:
                    # Convert datetime strings to datetime objects
                    setattr(lab_test, field, datetime.fromisoformat(data[field].replace('Z', '+00:00')))
                else:
                    setattr(lab_test, field, data[field])
        
        lab_test_service.update(lab_test)
        
        return jsonify({
            'message': 'Lab test updated successfully',
            'lab_test': {
                'id': lab_test.id,
                'status': lab_test.status,
                'result_value': lab_test.result_value,
                'abnormal_flag': lab_test.abnormal_flag
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400