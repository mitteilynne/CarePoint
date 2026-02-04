from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Patient, Appointment, Department, QueueManagement, Triage
from app.utils.decorators import role_required
from datetime import datetime, date

bp = Blueprint('receptionist', __name__, url_prefix='/api/receptionist')

@bp.route('/patients', methods=['GET'])
@jwt_required()
@role_required(['receptionist', 'admin', 'doctor', 'nurse'])
def get_patients():
    """Get all patients for the organization"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    # Get patients for the organization
    patients = Patient.query.filter_by(organization_id=user.organization_id).all()
    
    return jsonify({
        'patients': [patient.to_dict() for patient in patients]
    }), 200


@bp.route('/patients/<int:patient_id>', methods=['GET'])
@jwt_required()
@role_required(['receptionist', 'admin', 'doctor', 'nurse'])
def get_patient(patient_id):
    """Get specific patient details"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    patient = Patient.query.filter_by(
        id=patient_id,
        organization_id=user.organization_id
    ).first()
    
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    
    return jsonify(patient.to_dict()), 200


@bp.route('/patients', methods=['POST'])
@jwt_required()
@role_required(['receptionist', 'admin'])
def create_patient():
    """Register a new patient"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['first_name', 'last_name', 'date_of_birth', 'gender', 'phone']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        # Create new patient
        patient = Patient(
            organization_id=user.organization_id,
            first_name=data['first_name'],
            last_name=data['last_name'],
            date_of_birth=datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date(),
            gender=data['gender'],
            phone=data['phone'],
            email=data.get('email'),
            address=data.get('address'),
            emergency_contact_name=data.get('emergency_contact_name'),
            emergency_contact_phone=data.get('emergency_contact_phone'),
            blood_type=data.get('blood_type'),
            allergies=data.get('allergies'),
            medical_history=data.get('medical_history')
        )
        
        db.session.add(patient)
        db.session.commit()
        
        return jsonify({
            'message': 'Patient registered successfully',
            'patient': patient.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/patients/<int:patient_id>', methods=['PUT'])
@jwt_required()
@role_required(['receptionist', 'admin'])
def update_patient(patient_id):
    """Update patient information"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    patient = Patient.query.filter_by(
        id=patient_id,
        organization_id=user.organization_id
    ).first()
    
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    
    data = request.get_json()
    
    # Update allowed fields
    allowed_fields = [
        'first_name', 'last_name', 'phone', 'email', 'address',
        'emergency_contact_name', 'emergency_contact_phone',
        'blood_type', 'allergies', 'medical_history'
    ]
    
    for field in allowed_fields:
        if field in data:
            setattr(patient, field, data[field])
    
    if 'date_of_birth' in data:
        patient.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
    
    patient.updated_at = datetime.utcnow()
    
    try:
        db.session.commit()
        return jsonify({
            'message': 'Patient updated successfully',
            'patient': patient.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/appointments', methods=['GET'])
@jwt_required()
@role_required(['receptionist', 'admin', 'doctor'])
def get_appointments():
    """Get appointments for the organization"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    # Filter by date if provided
    date_str = request.args.get('date')
    if date_str:
        filter_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        appointments = Appointment.query.filter_by(
            organization_id=user.organization_id
        ).filter(
            db.func.date(Appointment.appointment_datetime) == filter_date
        ).all()
    else:
        appointments = Appointment.query.filter_by(
            organization_id=user.organization_id
        ).all()
    
    return jsonify({
        'appointments': [apt.to_dict() for apt in appointments]
    }), 200


@bp.route('/appointments', methods=['POST'])
@jwt_required()
@role_required(['receptionist', 'admin'])
def create_appointment():
    """Create a new appointment"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['patient_id', 'doctor_id', 'appointment_datetime', 'reason']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        appointment = Appointment(
            organization_id=user.organization_id,
            patient_id=data['patient_id'],
            doctor_id=data['doctor_id'],
            appointment_datetime=datetime.fromisoformat(data['appointment_datetime']),
            reason=data['reason'],
            notes=data.get('notes'),
            status='scheduled'
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        return jsonify({
            'message': 'Appointment created successfully',
            'appointment': appointment.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/queue', methods=['GET'])
@jwt_required()
@role_required(['receptionist', 'admin', 'doctor', 'nurse'])
def get_queue():
    """Get current queue"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    # Get active queue items
    queue_items = QueueManagement.query.filter_by(
        organization_id=user.organization_id,
        status='waiting'
    ).order_by(QueueManagement.queue_number).all()
    
    return jsonify({
        'queue': [item.to_dict() for item in queue_items]
    }), 200


@bp.route('/departments', methods=['GET'])
@jwt_required()
@role_required(['receptionist', 'admin', 'doctor', 'nurse'])
def get_departments():
    """Get all departments"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    departments = Department.query.filter_by(
        organization_id=user.organization_id
    ).all()
    
    return jsonify({
        'departments': [dept.to_dict() for dept in departments]
    }), 200


@bp.route('/doctors', methods=['GET'])
@jwt_required()
@role_required(['receptionist', 'admin'])
def get_doctors():
    """Get all doctors in the organization"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    doctors = User.query.filter_by(
        organization_id=user.organization_id,
        role='doctor',
        is_active=True
    ).all()
    
    return jsonify({
        'doctors': [doctor.to_dict() for doctor in doctors]
    }), 200
