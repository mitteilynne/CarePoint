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
    referral_service,
    organization_required,
    organization_access_required
)
from app.models import Patient, Appointment, MedicalRecord, Department, LabTest, Referral, Triage
from app.models.user import User
from app import db
from datetime import datetime, date
import traceback

bp = Blueprint('healthcare', __name__, url_prefix='/api/healthcare')

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
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        org_id = claims.get('organization_id')
        
        print(f"DEBUG: Getting medical records for patient {patient_id}, user {current_user_id}, org {org_id}")
        
        # Get records with organization filtering
        records = MedicalRecord.query.filter(
            MedicalRecord.patient_id == patient_id,
            MedicalRecord.organization_id == org_id
        ).all()
        
        print(f"DEBUG: Found {len(records)} medical records")
        for record in records:
            print(f"  - Record ID: {record.id}, Date: {record.visit_date}, Diagnosis: {record.diagnosis}")
        
        return jsonify({
            'medical_records': [{
                'id': r.id,
                'visit_date': r.visit_date.isoformat(),
                'doctor_name': f"{r.doctor.first_name} {r.doctor.last_name}",
                'chief_complaint': r.chief_complaint,
                'diagnosis': r.diagnosis,
                'treatment_plan': r.treatment_plan,
                'medications_prescribed': r.medications_prescribed,
                'lab_tests_ordered': r.lab_tests_ordered if hasattr(r, 'lab_tests_ordered') else None,
                'follow_up_instructions': r.follow_up_instructions if hasattr(r, 'follow_up_instructions') else None,
                'follow_up_date': r.follow_up_date.isoformat() if hasattr(r, 'follow_up_date') and r.follow_up_date else None,
                'blood_pressure': r.blood_pressure,
                'heart_rate': r.heart_rate,
                'temperature': r.temperature,
                'weight': r.weight,
                'height': r.height
            } for r in records],
            'total': len(records)
        })
    except Exception as e:
        print(f"ERROR getting medical records: {e}")
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
        
        # Debug logging
        print(f"DEBUG: Creating medical record - User: {current_user_id}, Org: {org_id}")
        print(f"DEBUG: Request data keys: {list(data.keys()) if data else 'No data'}")
        print(f"DEBUG: Full request data: {data}")
        
        # Convert visit_date string to datetime object if provided
        if 'visit_date' in data and data['visit_date']:
            data['visit_date'] = datetime.fromisoformat(data['visit_date'].replace('Z', '+00:00'))
        else:
            data['visit_date'] = datetime.utcnow()
        
        # Extract lab test ID for separate processing
        lab_test_id = data.pop('lab_test_id', None)
        
        # Define valid MedicalRecord fields
        valid_fields = {
            'patient_id', 'chief_complaint', 'diagnosis', 'treatment_plan',
            'medications_prescribed', 'lab_tests_ordered', 'follow_up_instructions',
            'blood_pressure', 'heart_rate', 'temperature', 'weight', 'height',
            'visit_type', 'appointment_id'
        }
        
        # Filter data to only include valid MedicalRecord fields
        filtered_data = {k: v for k, v in data.items() if k in valid_fields}
        
        # Ensure organization and doctor are set
        filtered_data['organization_id'] = org_id
        filtered_data['doctor_id'] = current_user_id
        
        print(f"DEBUG: Filtered data for MedicalRecord: {filtered_data}")
        
        record = medical_record_service.create(filtered_data)
        
        # If this medical record is linked to a lab test, update the lab test status
        if lab_test_id:
            try:
                lab_test = lab_test_service.get_by_id(lab_test_id)
                if lab_test and lab_test.organization_id == org_id:
                    lab_test.status = 'completed'
                    lab_test_service.update(lab_test)
                    print(f"DEBUG: Updated lab test {lab_test_id} status to completed")
            except Exception as e:
                print(f"Warning: Could not update lab test status: {e}")
        
        # Handle referral data separately if needed
        referral_data = {k: v for k, v in data.items() if k.startswith('referral_')}
        if referral_data.get('referral_type') and referral_data.get('referral_type') != 'none':
            print(f"DEBUG: Referral data received (not implemented yet): {referral_data}")
        
        # Handle referral creation if referral_type is not 'none'
        referral_id = None
        if data.get('referral_type') and data['referral_type'] != 'none':
            try:
                referral_data = {
                    'organization_id': org_id,
                    'medical_record_id': record.id,
                    'patient_id': data['patient_id'],
                    'referring_doctor_id': current_user_id,
                    'referral_type': data['referral_type'],
                    'reason': data.get('referral_reason', ''),
                    'urgency': data.get('referral_urgency', 'routine')
                }
                
                # Add internal referral fields
                if data['referral_type'] == 'internal':
                    if data.get('referral_doctor_id'):
                        referral_data['referred_doctor_id'] = data['referral_doctor_id']
                    if data.get('referral_department_id'):
                        referral_data['department_id'] = data['referral_department_id']
                
                # Add external referral fields
                elif data['referral_type'] == 'external':
                    referral_data['facility_name'] = data.get('referral_facility')
                    referral_data['facility_type'] = data.get('facility_type')
                    referral_data['facility_contact'] = data.get('facility_contact')
                    referral_data['facility_address'] = data.get('facility_address')
                
                referral = referral_service.create(referral_data)
                referral_id = referral.id
            except Exception as e:
                print(f"Warning: Could not create referral: {e}")
        
        response_data = {
            'message': 'Medical record created successfully',
            'medical_record': {
                'id': record.id,
                'visit_date': record.visit_date.isoformat(),
                'diagnosis': record.diagnosis,
                'treatment_plan': record.treatment_plan
            }
        }
        
        if referral_id:
            response_data['referral_created'] = True
            response_data['referral_id'] = referral_id
        
        return jsonify(response_data), 201
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
                'lab_location': test.lab_location,
                'patient_name': f"{test.patient.first_name} {test.patient.last_name}" if test.patient else None,
                'doctor_name': f"Dr. {test.doctor.first_name} {test.doctor.last_name}" if test.doctor else None
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

# Referral routes
@bp.route('/referrals', methods=['GET'])
@jwt_required()
@organization_required
def get_referrals():
    """Get referrals for the current organization"""
    try:
        referral_type = request.args.get('type')  # 'made' or 'received'
        claims = get_jwt()
        current_user_id = claims.get('user_id')
        
        if referral_type == 'made':
            referrals = referral_service.get_by_referring_doctor(current_user_id)
        elif referral_type == 'received':
            referrals = referral_service.get_by_referred_doctor(current_user_id)
        else:
            referrals = referral_service.get_all()
        
        return jsonify({
            'referrals': [{
                'id': ref.id,
                'patient_id': ref.patient_id,
                'patient_name': f"{ref.patient.first_name} {ref.patient.last_name}" if ref.patient else None,
                'referring_doctor_name': f"Dr. {ref.referring_doctor.first_name} {ref.referring_doctor.last_name}" if ref.referring_doctor else None,
                'referred_doctor_name': f"Dr. {ref.referred_doctor.first_name} {ref.referred_doctor.last_name}" if ref.referred_doctor else None,
                'department_name': ref.department.name if ref.department else None,
                'referral_type': ref.referral_type,
                'facility_name': ref.facility_name,
                'facility_type': ref.facility_type,
                'reason': ref.reason,
                'urgency': ref.urgency,
                'status': ref.status,
                'notes': ref.notes,
                'created_at': ref.created_at.isoformat(),
                'scheduled_date': ref.scheduled_date.isoformat() if ref.scheduled_date else None
            } for ref in referrals],
            'total': len(referrals)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/referrals/<int:referral_id>', methods=['PUT'])
@jwt_required()
@organization_access_required(Referral)
def update_referral(referral_id):
    """Update a referral status (organization-scoped)"""
    try:
        referral = referral_service.get_by_id(referral_id)
        if not referral:
            return jsonify({'error': 'Referral not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        updatable_fields = ['status', 'notes', 'scheduled_date']
        
        for field in updatable_fields:
            if field in data:
                if field == 'scheduled_date' and data[field]:
                    setattr(referral, field, datetime.fromisoformat(data[field].replace('Z', '+00:00')))
                else:
                    setattr(referral, field, data[field])
        
        referral_service.update(referral)
        
        return jsonify({
            'message': 'Referral updated successfully',
            'referral': {
                'id': referral.id,
                'status': referral.status,
                'notes': referral.notes
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/prescriptions', methods=['POST'])
@jwt_required()
def create_prescription():
    """Create a new prescription for a patient"""
    from app.models.healthcare import Prescription
    
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role != 'doctor':
        return jsonify({'error': 'Only doctors can create prescriptions'}), 403
    
    organization_id = user.organization_id
    if not organization_id:
        return jsonify({'error': 'Organization not found'}), 404
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['patient_id', 'medication_name', 'dosage', 'frequency', 'duration', 'quantity']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    # Verify patient belongs to same organization
    patient = Patient.query.filter_by(
        id=data['patient_id'],
        organization_id=organization_id
    ).first()
    
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    
    # Create prescription
    prescription = Prescription(
        organization_id=organization_id,
        patient_id=data['patient_id'],
        doctor_id=current_user_id,
        medical_record_id=data.get('medical_record_id'),
        medication_name=data['medication_name'],
        dosage=data['dosage'],
        frequency=data['frequency'],
        duration=data['duration'],
        quantity=data['quantity'],
        instructions=data.get('instructions', '')
    )
    
    db.session.add(prescription)
    db.session.commit()
    
    return jsonify({
        'message': 'Prescription created successfully',
        'prescription': prescription.to_dict()
    }), 201

@bp.route('/patients/<int:patient_id>/prescriptions', methods=['GET'])
@jwt_required()
def get_patient_prescriptions(patient_id):
    """Get all prescriptions for a patient"""
    from app.models.healthcare import Prescription
    
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    organization_id = user.organization_id
    
    # Verify patient belongs to same organization
    patient = Patient.query.filter_by(
        id=patient_id,
        organization_id=organization_id
    ).first()
    
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    
    prescriptions = Prescription.query.filter_by(
        organization_id=organization_id,
        patient_id=patient_id
    ).order_by(Prescription.prescribed_at.desc()).all()
    
    return jsonify({
        'prescriptions': [p.to_dict() for p in prescriptions]
    }), 200

@bp.route('/prescriptions/<int:prescription_id>', methods=['PUT'])
@jwt_required()
def update_prescription(prescription_id):
    """Update a prescription (only by the prescribing doctor)"""
    from app.models.healthcare import Prescription
    
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role != 'doctor':
        return jsonify({'error': 'Only doctors can update prescriptions'}), 403
    
    organization_id = user.organization_id
    
    prescription = Prescription.query.filter_by(
        id=prescription_id,
        organization_id=organization_id,
        doctor_id=current_user_id  # Only the prescribing doctor can update
    ).first()
    
    if not prescription:
        return jsonify({'error': 'Prescription not found or unauthorized'}), 404
    
    if prescription.status != 'pending':
        return jsonify({'error': 'Cannot update prescription that has been processed'}), 400
    
    data = request.get_json()
    
    # Update allowed fields
    updatable_fields = ['medication_name', 'dosage', 'frequency', 'duration', 'quantity', 'instructions']
    for field in updatable_fields:
        if field in data:
            setattr(prescription, field, data[field])
    
    prescription.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Prescription updated successfully',
        'prescription': prescription.to_dict()
    }), 200

@bp.route('/prescriptions/<int:prescription_id>', methods=['DELETE'])
@jwt_required()
def cancel_prescription(prescription_id):
    """Cancel a prescription (only by the prescribing doctor)"""
    from app.models.healthcare import Prescription
    
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role != 'doctor':
        return jsonify({'error': 'Only doctors can cancel prescriptions'}), 403
    
    organization_id = user.organization_id
    
    prescription = Prescription.query.filter_by(
        id=prescription_id,
        organization_id=organization_id,
        doctor_id=current_user_id
    ).first()
    
    if not prescription:
        return jsonify({'error': 'Prescription not found or unauthorized'}), 404
    
    if prescription.status in ['dispensed', 'partially_dispensed']:
        return jsonify({'error': 'Cannot cancel prescription that has been dispensed'}), 400
    
    prescription.status = 'cancelled'
    prescription.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'message': 'Prescription cancelled successfully'}), 200

# Doctor Queue endpoints
@bp.route('/doctor/queue', methods=['GET'])
@jwt_required()
@organization_required
def get_doctor_queue():
    """Get queue status for doctors with comprehensive stats"""
    try:
        claims = get_jwt()
        org_id = claims.get('organization_id')
        today = date.today()
        
        # Get all triage records for today (filter by arrival_time date)
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        triages = Triage.query.filter(
            Triage.organization_id == org_id,
            Triage.arrival_time >= today_start,
            Triage.arrival_time <= today_end
        ).all()
        
        # Debug logging
        print(f"DEBUG: Found {len(triages)} triage records for today")
        for t in triages:
            print(f"  - Triage ID: {t.id}, Patient: {t.patient_id}, Status: {t.queue_status}, Level: {t.triage_level}")
        
        # Calculate queue statistics
        total_today = len(triages)
        emergency_count = len([t for t in triages if t.triage_level == 'emergency'])
        urgent_count = len([t for t in triages if t.triage_level == 'urgent'])
        routine_count = len([t for t in triages if t.triage_level not in ['emergency', 'urgent']])
        
        # Count by status
        waiting_count = len([t for t in triages if t.queue_status == 'waiting'])
        in_progress_count = len([t for t in triages if t.queue_status == 'in_progress'])
        completed_count = len([t for t in triages if t.queue_status == 'completed'])
        
        # Calculate average wait time for waiting patients
        waiting_triages = [t for t in triages if t.queue_status == 'waiting']
        avg_wait_time = 0
        if waiting_triages:
            total_wait = sum([(datetime.utcnow() - t.created_at).total_seconds() / 60 for t in waiting_triages])
            avg_wait_time = int(total_wait / len(waiting_triages))
        
        # Get current queue number
        current_number = max([t.queue_number for t in triages]) if triages else 0
        
        # Format patients by status
        waiting_patients = []
        in_progress_patients = []
        completed_patients = []
        all_patients = []
        
        # Sort triages by priority and arrival time for consistent ordering
        sorted_triages = sorted(triages, key=lambda x: (x.priority_score, x.created_at))
        
        for triage in sorted_triages:
            patient = triage.patient
            if patient:
                wait_minutes = int((datetime.utcnow() - triage.created_at).total_seconds() / 60)
                patient_data = {
                    'id': triage.id,
                    'patient_id': str(patient.id),
                    'patient_name': f"{patient.first_name} {patient.last_name}",
                    'queue_number': triage.queue_number,
                    'triage_level': triage.triage_level,
                    'chief_complaint': triage.chief_complaint,
                    'arrival_time': triage.created_at.isoformat(),
                    'wait_time_minutes': wait_minutes,
                    'priority_score': triage.priority_score,
                    'status': triage.queue_status
                }
                
                all_patients.append(patient_data)
                
                # Categorize by status
                if triage.queue_status == 'waiting':
                    waiting_patients.append(patient_data)
                elif triage.queue_status == 'in_progress':
                    in_progress_patients.append(patient_data)
                elif triage.queue_status == 'completed':
                    completed_patients.append(patient_data)

        return jsonify({
            'queue_management': {
                'current_number': current_number,
                'total_today': total_today,
                'average_wait_time': avg_wait_time,
                'emergency_count': emergency_count,
                'urgent_count': urgent_count,
                'routine_count': routine_count
            },
            'queue_counts': {
                'waiting': waiting_count,
                'in_progress': in_progress_count,
                'completed': completed_count
            },
            'waiting_patients': waiting_patients,
            'in_progress_patients': in_progress_patients,
            'completed_patients': completed_patients,
            'all_patients': all_patients
        })
    except Exception as e:
        print(f"Error in get_doctor_queue: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@bp.route('/doctor/patients/search', methods=['GET'])
@jwt_required()
@organization_required
def doctor_search_patients():
    """Search patients for doctors"""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'patients': []}), 200
        
        patients = patient_service.search_patients(query)
        
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
            } for p in patients]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/doctor/queue/update-status/<int:triage_id>', methods=['PUT'])
@jwt_required()
@organization_required
def update_queue_status(triage_id):
    """Update the status of a patient in the queue"""
    try:
        data = request.get_json()
        new_status = data.get('queue_status')
        
        if not new_status:
            return jsonify({'error': 'queue_status is required'}), 400
        
        # Get the triage record
        org_id = get_jwt().get('organization_id')
        triage = Triage.query.filter_by(
            id=triage_id,
            organization_id=org_id
        ).first()
        
        if not triage:
            return jsonify({'error': 'Triage record not found'}), 404
        
        # Update the status
        triage.queue_status = new_status
        db.session.commit()
        
        return jsonify({
            'message': 'Queue status updated successfully',
            'triage': {
                'id': triage.id,
                'queue_status': triage.queue_status
            }
        })
    except Exception as e:
        print(f"Error updating queue status: {str(e)}")
        return jsonify({'error': str(e)}), 500
