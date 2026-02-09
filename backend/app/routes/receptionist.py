from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Patient, Appointment, Department, QueueManagement, Triage
from app.utils.decorators import role_required
from datetime import datetime, date

bp = Blueprint('receptionist', __name__, url_prefix='/api/receptionist')

@bp.route('/patients/todays-registrations', methods=['GET'])
@jwt_required()
@role_required(['receptionist', 'admin', 'doctor', 'nurse'])
def get_todays_patients():
    """Get patients registered today"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    today = date.today()
    patients = Patient.query.filter_by(
        organization_id=user.organization_id,
        registration_date=today
    ).order_by(Patient.registered_at.desc()).all()
    
    return jsonify({
        'patients': [patient.to_dict() for patient in patients]
    }), 200


@bp.route('/patients/search', methods=['GET'])
@jwt_required()
@role_required(['receptionist', 'admin', 'doctor', 'nurse'])
def search_patients():
    """Search patients by name, phone, or patient ID"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'patients': []}), 200
    
    # Search by name, phone, or patient ID
    patients = Patient.query.filter_by(
        organization_id=user.organization_id
    ).filter(
        db.or_(
            Patient.first_name.ilike(f'%{query}%'),
            Patient.last_name.ilike(f'%{query}%'),
            Patient.phone.ilike(f'%{query}%'),
            Patient.patient_id.ilike(f'%{query}%')
        )
    ).limit(20).all()
    
    return jsonify({
        'patients': [patient.to_dict() for patient in patients]
    }), 200


@bp.route('/register-patient', methods=['POST'])
@jwt_required()
@role_required(['receptionist', 'admin'])
def register_patient():
    """Register a new patient for today's visit"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['first_name', 'last_name', 'phone']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        # Generate patient ID if this is a new patient
        today_str = datetime.now().strftime('%Y%m%d')
        patient_count = Patient.query.filter_by(
            organization_id=user.organization_id,
            registration_date=date.today()
        ).count()
        patient_id = f"P{today_str}{patient_count + 1:04d}"
        
        # Create new patient
        patient = Patient(
            organization_id=user.organization_id,
            patient_id=patient_id,
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone=data['phone'],
            email=data.get('email'),
            date_of_birth=datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date() if data.get('date_of_birth') and data['date_of_birth'].strip() else None,
            gender=data.get('gender', 'male'),
            address=data.get('address'),
            emergency_contact=data.get('emergency_contact_name'),  # Fixed field name
            emergency_phone=data.get('emergency_contact_phone'),   # Fixed field name
            visit_type=data.get('visit_type', 'walk_in'),
            registration_status='registered',
            registration_date=date.today(),
            registered_by_id=current_user_id
        )
        
        db.session.add(patient)
        db.session.commit()
        
        return jsonify({
            'message': 'Patient registered successfully',
            'patient': patient.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        # Better error logging
        import traceback
        print(f"ERROR in patient registration: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        print(f"Data received: {data}")
        return jsonify({'error': str(e)}), 500


@bp.route('/patient/<int:patient_id>/triage', methods=['POST'])
@jwt_required()
@role_required(['receptionist', 'admin', 'nurse'])
def complete_triage(patient_id):
    """Complete triage assessment and assign queue number"""
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
    
    try:
        # Create triage assessment
        triage = Triage(
            organization_id=user.organization_id,
            patient_id=patient_id,
            receptionist_id=current_user_id,
            chief_complaint=data['chief_complaint'],
            pain_scale=data.get('pain_scale', 0),
            temperature=data.get('temperature'),
            blood_pressure_systolic=data.get('blood_pressure_systolic'),
            blood_pressure_diastolic=data.get('blood_pressure_diastolic'),
            heart_rate=data.get('heart_rate'),
            respiratory_rate=data.get('respiratory_rate'),
            oxygen_saturation=data.get('oxygen_saturation'),
            weight=data.get('weight'),
            height=data.get('height'),
            symptoms=data.get('symptoms'),
            allergies_noted=data.get('allergies_noted'),
            current_medications_noted=data.get('current_medications_noted'),
            mobility_status=data.get('mobility_status', 'ambulatory'),
            receptionist_notes=data.get('receptionist_notes'),
            special_requirements=data.get('special_requirements'),
            triage_level=data.get('triage_level', 'non_urgent')
        )
        
        # Get or create today's queue management
        queue_mgmt = QueueManagement.get_or_create_today(user.organization_id)
        queue_number = queue_mgmt.get_next_queue_number()
        
        # Set queue number and status on triage
        triage.queue_number = queue_number
        triage.queue_status = 'waiting'
        
        # Update patient with queue number and status
        patient.current_queue_number = queue_number
        patient.registration_status = 'triaged'
        patient.updated_at = datetime.utcnow()
        
        # Add triage to database
        db.session.add(triage)
        db.session.commit()
        
        return jsonify({
            'message': 'Triage completed successfully',
            'triage': {
                'id': triage.id,
                'queue_number': queue_number,
                'triage_level': triage.triage_level
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


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
    """Get appointments for the organization with patient and doctor details"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    # Filter by date if provided
    date_str = request.args.get('date')
    if date_str:
        filter_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Query appointments with patient and doctor information
        appointments_query = db.session.query(
            Appointment.id,
            Appointment.appointment_date,
            Appointment.duration_minutes,
            Appointment.reason,
            Appointment.status,
            Appointment.notes,
            Patient.first_name.label('patient_first_name'),
            Patient.last_name.label('patient_last_name'),
            User.first_name.label('doctor_first_name'),
            User.last_name.label('doctor_last_name')
        ).join(
            Patient, Appointment.patient_id == Patient.id
        ).join(
            User, Appointment.doctor_id == User.id
        ).filter(
            Appointment.organization_id == user.organization_id,
            db.func.date(Appointment.appointment_date) == filter_date
        ).order_by(Appointment.appointment_date)
        
        appointments_results = appointments_query.all()
        
        # Format the appointments
        appointments = []
        for result in appointments_results:
            appointments.append({
                'id': result.id,
                'patient_id': 0,  # We don't have patient_id in the select, but could add it
                'patient_name': f"{result.patient_first_name} {result.patient_last_name}",
                'doctor_id': 0,  # We don't have doctor_id in the select, but could add it
                'doctor_name': f"Dr. {result.doctor_first_name} {result.doctor_last_name}",
                'appointment_date': result.appointment_date.isoformat(),
                'duration_minutes': result.duration_minutes,
                'reason': result.reason,
                'status': result.status,
                'notes': result.notes
            })
    else:
        # Get all appointments (limit to recent ones)
        appointments_query = db.session.query(
            Appointment.id,
            Appointment.appointment_date,
            Appointment.duration_minutes,
            Appointment.reason,
            Appointment.status,
            Appointment.notes,
            Patient.first_name.label('patient_first_name'),
            Patient.last_name.label('patient_last_name'),
            User.first_name.label('doctor_first_name'),
            User.last_name.label('doctor_last_name')
        ).join(
            Patient, Appointment.patient_id == Patient.id
        ).join(
            User, Appointment.doctor_id == User.id
        ).filter(
            Appointment.organization_id == user.organization_id
        ).order_by(Appointment.appointment_date.desc()).limit(50)
        
        appointments_results = appointments_query.all()
        
        # Format the appointments
        appointments = []
        for result in appointments_results:
            appointments.append({
                'id': result.id,
                'patient_id': 0,  # We don't have patient_id in the select, but could add it
                'patient_name': f"{result.patient_first_name} {result.patient_last_name}",
                'doctor_id': 0,  # We don't have doctor_id in the select, but could add it
                'doctor_name': f"Dr. {result.doctor_first_name} {result.doctor_last_name}",
                'appointment_date': result.appointment_date.isoformat(),
                'duration_minutes': result.duration_minutes,
                'reason': result.reason,
                'status': result.status,
                'notes': result.notes
            })
    
    return jsonify({
        'appointments': appointments
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


@bp.route('/appointments/<int:appointment_id>', methods=['PUT'])
@jwt_required()
@role_required(['receptionist', 'admin', 'doctor'])
def update_appointment(appointment_id):
    """Update appointment status"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    appointment = Appointment.query.filter_by(
        id=appointment_id,
        organization_id=user.organization_id
    ).first()
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    data = request.get_json()
    
    # Update allowed fields
    if 'status' in data:
        appointment.status = data['status']
    if 'notes' in data:
        appointment.notes = data['notes']
    
    appointment.updated_at = datetime.utcnow()
    
    try:
        db.session.commit()
        return jsonify({
            'message': 'Appointment updated successfully',
            'appointment': appointment.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/queue/<int:queue_id>', methods=['PUT'])
@jwt_required()
@role_required(['receptionist', 'admin', 'doctor', 'nurse'])
def update_queue_status(queue_id):
    """Update queue item status"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    # For now, we'll handle queue updates through the triage system
    # This can be expanded later for more sophisticated queue management
    data = request.get_json()
    status = data.get('status')
    
    if status == 'in_consultation':
        # Update patient registration status
        queue_item = QueueManagement.query.filter_by(
            id=queue_id,
            organization_id=user.organization_id
        ).first()
        
        if queue_item:
            patient = Patient.query.get(queue_item.patient_id)
            if patient:
                patient.registration_status = 'in_consultation'
                patient.updated_at = datetime.utcnow()
    
    elif status == 'completed':
        # Mark as completed
        queue_item = QueueManagement.query.filter_by(
            id=queue_id,
            organization_id=user.organization_id
        ).first()
        
        if queue_item:
            patient = Patient.query.get(queue_item.patient_id)
            if patient:
                patient.registration_status = 'completed'
                patient.updated_at = datetime.utcnow()
            
            # Remove from active queue
            queue_item.status = 'completed'
    
    try:
        db.session.commit()
        return jsonify({'message': 'Queue status updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/queue', methods=['GET'])
@jwt_required()
@role_required(['receptionist', 'admin', 'doctor', 'nurse'])
def get_queue():
    """Get current queue with patient details"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    # Get patients from today who are triaged and waiting
    today = date.today()
    
    # Query patients with their triage information
    queue_query = db.session.query(
        Patient.id,
        Patient.first_name,
        Patient.last_name,
        Patient.current_queue_number,
        Patient.registration_status,
        Triage.chief_complaint,
        Triage.triage_level,
        Triage.created_at.label('triage_time')
    ).join(
        Triage, Patient.id == Triage.patient_id
    ).filter(
        Patient.organization_id == user.organization_id,
        Patient.registration_date == today,
        Patient.registration_status.in_(['triaged', 'waiting', 'in_consultation'])
    ).order_by(
        # Emergency cases first, then by queue number
        db.case(
            (Triage.triage_level == 'emergency', 1),
            (Triage.triage_level == 'urgent', 2),
            (Triage.triage_level == 'less_urgent', 3),
            else_=4
        ),
        Patient.current_queue_number
    )
    
    queue_results = queue_query.all()
    
    # Format the queue data
    queue_items = []
    for result in queue_results:
        # Calculate wait time
        wait_time_minutes = int((datetime.utcnow() - result.triage_time).total_seconds() / 60)
        
        queue_items.append({
            'id': result.id,
            'patient_id': result.id,
            'patient_name': f"{result.first_name} {result.last_name}",
            'queue_number': result.current_queue_number,
            'triage_level': result.triage_level,
            'chief_complaint': result.chief_complaint,
            'wait_time_minutes': wait_time_minutes,
            'status': 'waiting' if result.registration_status in ['triaged', 'waiting'] else result.registration_status,
            'assigned_doctor': None  # This would be populated if we had doctor assignment logic
        })
    
    # Calculate queue statistics
    total_waiting = len([item for item in queue_items if item['status'] == 'waiting'])
    total_in_progress = len([item for item in queue_items if item['status'] == 'in_consultation'])
    
    # Get today's completed count
    completed_today = Patient.query.filter(
        Patient.organization_id == user.organization_id,
        Patient.registration_date == today,
        Patient.registration_status == 'completed'
    ).count()
    
    # Calculate average wait time (in minutes)
    wait_times = [item['wait_time_minutes'] for item in queue_items if item['status'] == 'waiting']
    avg_wait_time = sum(wait_times) // len(wait_times) if wait_times else 0
    
    # Count by priority
    emergency_count = len([item for item in queue_items if item['triage_level'] == 'emergency'])
    urgent_count = len([item for item in queue_items if item['triage_level'] == 'urgent'])
    routine_count = len([item for item in queue_items if item['triage_level'] in ['less_urgent', 'non_urgent']])
    
    # Get current queue number
    highest_queue_num = max([item['queue_number'] for item in queue_items] or [0])
    
    # Total registrations today
    total_today = Patient.query.filter(
        Patient.organization_id == user.organization_id,
        Patient.registration_date == today
    ).count()
    
    return jsonify({
        'queue_management': {
            'current_number': highest_queue_num,
            'total_today': total_today,
            'average_wait_time': avg_wait_time,
            'emergency_count': emergency_count,
            'urgent_count': urgent_count,
            'routine_count': routine_count
        },
        'queue_counts': {
            'waiting': total_waiting,
            'in_progress': total_in_progress,
            'completed': completed_today
        },
        'waiting_patients': queue_items
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
