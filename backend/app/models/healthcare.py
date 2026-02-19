from app import db
from datetime import datetime, date
from sqlalchemy import event, Numeric

class Patient(db.Model):
    """Patient records with organization-based data isolation"""
    __tablename__ = 'patients'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    
    # Patient identification
    patient_id = db.Column(db.String(50), nullable=False)  # Organization-specific patient ID
    national_id = db.Column(db.String(50))  # National/Government ID
    
    # Personal information
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    date_of_birth = db.Column(db.Date)  # Made nullable
    gender = db.Column(db.Enum('male', 'female', 'other', name='gender_types'), nullable=False)
    blood_type = db.Column(db.String(5))  # A+, B-, O+, etc.
    
    # Contact information
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    emergency_contact = db.Column(db.String(100))
    emergency_phone = db.Column(db.String(20))
    
    # Medical information
    allergies = db.Column(db.Text)
    chronic_conditions = db.Column(db.Text)
    current_medications = db.Column(db.Text)
    insurance_info = db.Column(db.Text)
    
    # Registration and queue status
    registration_status = db.Column(db.Enum('registered', 'triaged', 'waiting', 'in_consultation', 'completed', 'discharged', name='registration_status'), 
                                   nullable=False, default='registered')
    visit_type = db.Column(db.Enum('walk_in', 'appointment', 'emergency', 'follow_up', name='visit_types'), 
                          nullable=False, default='walk_in')
    current_queue_number = db.Column(db.Integer)  # Today's queue number
    registration_date = db.Column(db.Date, default=datetime.utcnow().date)  # Date of current visit
    registered_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)  # When patient was registered
    registered_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))  # Who registered this patient
    
    # Status
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    organization = db.relationship('Organization', backref=db.backref('patients', lazy='dynamic'))
    registered_by = db.relationship('User', foreign_keys=[registered_by_id], backref='registered_patients')
    appointments = db.relationship('Appointment', backref='patient', lazy='dynamic')
    medical_records = db.relationship('MedicalRecord', backref='patient', lazy='dynamic')
    
    @property
    def name(self):
        """Return full name of the patient"""
        return f"{self.first_name} {self.last_name}"
    
    def to_dict(self):
        """Convert patient object to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'name': self.name,
            'phone': self.phone,
            'email': self.email,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'gender': self.gender,
            'address': self.address,
            'emergency_contact': self.emergency_contact,
            'emergency_phone': self.emergency_phone,
            'visit_type': self.visit_type,
            'registration_status': self.registration_status,
            'current_queue_number': self.current_queue_number,
            'registration_date': self.registration_date.isoformat() if self.registration_date else None,
            'registered_at': self.registered_at.isoformat() if self.registered_at else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    # Organization-scoped unique constraint for patient_id
    __table_args__ = (
        db.UniqueConstraint('organization_id', 'patient_id', name='_org_patient_id_uc'),
        db.Index('idx_patient_org_name', 'organization_id', 'last_name', 'first_name'),
    )

class Department(db.Model):
    """Hospital/clinic departments with organization isolation"""
    __tablename__ = 'departments'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    head_doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    location = db.Column(db.String(100))  # Building/Floor/Room
    phone = db.Column(db.String(20))
    
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    organization = db.relationship('Organization', backref=db.backref('departments', lazy='dynamic'))
    head_doctor = db.relationship('User', foreign_keys=[head_doctor_id])
    appointments = db.relationship('Appointment', backref='department', lazy='dynamic')
    
    # Organization-scoped unique constraint for department names
    __table_args__ = (
        db.UniqueConstraint('organization_id', 'name', name='_org_department_name_uc'),
    )

class Appointment(db.Model):
    """Patient appointments with organization isolation"""
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    
    # Appointment details
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'))
    
    appointment_date = db.Column(db.DateTime, nullable=False)
    duration_minutes = db.Column(db.Integer, default=30)
    
    # Appointment information
    reason = db.Column(db.Text)
    notes = db.Column(db.Text)
    status = db.Column(db.Enum('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 
                               name='appointment_status'), nullable=False, default='scheduled')
    
    # Billing
    consultation_fee = db.Column(Numeric(10, 2))
    payment_status = db.Column(db.Enum('pending', 'paid', 'cancelled', name='payment_status'), 
                              nullable=False, default='pending')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    organization = db.relationship('Organization', backref=db.backref('appointments', lazy='dynamic'))
    doctor = db.relationship('User', foreign_keys=[doctor_id], backref='doctor_appointments')
    
    # Indexes for efficient querying
    __table_args__ = (
        db.Index('idx_appointment_org_date', 'organization_id', 'appointment_date'),
        db.Index('idx_appointment_org_doctor_date', 'organization_id', 'doctor_id', 'appointment_date'),
        db.Index('idx_appointment_org_patient', 'organization_id', 'patient_id'),
    )

class MedicalRecord(db.Model):
    """Patient medical records with strict organization isolation"""
    __tablename__ = 'medical_records'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    
    # Record details
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'))
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))  # Who created this record (e.g., receptionist)
    
    # Medical data
    visit_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    visit_type = db.Column(db.Enum('routine', 'follow_up', 'emergency', 'consultation', name='visit_type'), default='routine')
    chief_complaint = db.Column(db.Text)
    diagnosis = db.Column(db.Text)
    treatment_plan = db.Column(db.Text)
    medications_prescribed = db.Column(db.Text)
    lab_tests_ordered = db.Column(db.Text)
    follow_up_instructions = db.Column(db.Text)
    
    # Vital signs
    blood_pressure = db.Column(db.String(20))  # e.g., "120/80"
    heart_rate = db.Column(db.Integer)
    temperature = db.Column(db.Float)  # in Celsius
    weight = db.Column(db.Float)  # in kg
    height = db.Column(db.Float)  # in cm
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    organization = db.relationship('Organization', backref=db.backref('medical_records', lazy='dynamic'))
    doctor = db.relationship('User', foreign_keys=[doctor_id], backref='medical_records_created')
    created_by = db.relationship('User', foreign_keys=[created_by_id], backref='medical_records_registered')
    appointment = db.relationship('Appointment', backref='medical_record', uselist=False)
    
    # Indexes for efficient querying
    __table_args__ = (
        db.Index('idx_medical_record_org_patient', 'organization_id', 'patient_id'),
        db.Index('idx_medical_record_org_date', 'organization_id', 'visit_date'),
    )

class Triage(db.Model):
    """Triage assessments for patient prioritization"""
    __tablename__ = 'triage_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    
    # Patient and staff details
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    receptionist_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Triage assessment
    chief_complaint = db.Column(db.Text, nullable=False)
    pain_scale = db.Column(db.Integer)  # 1-10 scale
    
    # Vital signs (initial)
    temperature = db.Column(db.Float)  # in Celsius
    blood_pressure_systolic = db.Column(db.Integer)
    blood_pressure_diastolic = db.Column(db.Integer)
    heart_rate = db.Column(db.Integer)
    respiratory_rate = db.Column(db.Integer)
    oxygen_saturation = db.Column(db.Integer)  # percentage
    weight = db.Column(db.Float)  # in kg
    height = db.Column(db.Float)  # in cm
    
    # Triage priority and urgency
    triage_level = db.Column(db.Enum('emergency', 'urgent', 'less_urgent', 'non_urgent', name='triage_levels'), 
                            nullable=False)
    priority_score = db.Column(db.Integer, nullable=False, default=3)  # 1=highest, 5=lowest
    
    # Additional assessment
    symptoms = db.Column(db.Text)  # JSON or text list of symptoms
    allergies_noted = db.Column(db.Text)
    current_medications_noted = db.Column(db.Text)
    mobility_status = db.Column(db.Enum('ambulatory', 'wheelchair', 'stretcher', 'assisted', name='mobility_types'))
    
    # Queue management
    queue_number = db.Column(db.Integer, nullable=False)
    estimated_wait_time = db.Column(db.Integer)  # in minutes
    queue_status = db.Column(db.Enum('waiting', 'called', 'in_progress', 'completed', 'left', name='queue_status'), 
                            nullable=False, default='waiting')
    
    # Notes and observations
    receptionist_notes = db.Column(db.Text)
    special_requirements = db.Column(db.Text)  # wheelchair access, interpreter, etc.
    
    # Timestamps
    arrival_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    triage_completed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    called_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    organization = db.relationship('Organization', backref=db.backref('triage_assessments', lazy='dynamic'))
    patient = db.relationship('Patient', backref='triage_assessments')
    receptionist = db.relationship('User', foreign_keys=[receptionist_id], backref='triage_assessments_conducted')
    
    # Indexes for efficient querying
    __table_args__ = (
        db.Index('idx_triage_org_queue', 'organization_id', 'queue_status', 'priority_score'),
        db.Index('idx_triage_org_date', 'organization_id', 'arrival_time'),
        db.UniqueConstraint('organization_id', 'queue_number', 'arrival_time', name='_org_queue_number_date_uc'),
    )
    
    def calculate_priority_score(self):
        """Calculate priority score based on triage assessment"""
        score = 3  # default
        
        # Adjust based on triage level
        if self.triage_level == 'emergency':
            score = 1
        elif self.triage_level == 'urgent':
            score = 2
        elif self.triage_level == 'less_urgent':
            score = 3
        elif self.triage_level == 'non_urgent':
            score = 4
            
        # Adjust based on vital signs
        if self.temperature and self.temperature > 39.0:  # High fever
            score = max(1, score - 1)
        if self.heart_rate and (self.heart_rate > 120 or self.heart_rate < 50):
            score = max(1, score - 1)
        if self.oxygen_saturation and self.oxygen_saturation < 90:
            score = 1  # Critical
            
        # Adjust based on pain scale
        if self.pain_scale and self.pain_scale >= 8:
            score = max(1, score - 1)
            
        self.priority_score = score
        return score

class LabTest(db.Model):
    """Lab test requests and results with organization isolation"""
    __tablename__ = 'lab_tests'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    
    # Test details
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    test_type = db.Column(db.Enum(
        'blood_chemistry', 'hematology', 'urinalysis', 'microbiology', 
        'immunology', 'toxicology', 'pathology', 'radiology', 'other',
        name='lab_test_types'
    ), nullable=False)
    test_name = db.Column(db.String(200), nullable=False)
    test_code = db.Column(db.String(50))  # Internal lab code
    
    # Request details
    clinical_notes = db.Column(db.Text)  # Doctor's notes/reason for test
    urgency = db.Column(db.Enum('routine', 'urgent', 'stat', name='test_urgency'), nullable=False, default='routine')
    sample_type = db.Column(db.String(100))  # blood, urine, stool, etc.
    
    # Status and scheduling
    status = db.Column(db.Enum(
        'ordered', 'sample_collected', 'in_progress', 'completed', 'cancelled', 'rejected',
        name='lab_test_status'
    ), nullable=False, default='ordered')
    
    # Timestamps
    ordered_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)  # When assigned to lab tech
    scheduled_for = db.Column(db.DateTime)  # When to perform the test
    sample_collected_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    # Results
    result_value = db.Column(db.Text)  # Numeric or text result
    reference_range = db.Column(db.String(100))  # Normal range
    units = db.Column(db.String(50))  # mg/dL, mmol/L, etc.
    abnormal_flag = db.Column(db.Enum('normal', 'high', 'low', 'critical', name='abnormal_flags'))
    result_notes = db.Column(db.Text)  # Lab technician notes
    
    # Lab information
    lab_technician_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    lab_location = db.Column(db.String(100))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    organization = db.relationship('Organization', backref=db.backref('lab_tests', lazy='dynamic'))
    patient = db.relationship('Patient', backref='lab_tests')
    doctor = db.relationship('User', foreign_keys=[doctor_id], backref='ordered_lab_tests')
    lab_technician = db.relationship('User', foreign_keys=[lab_technician_id], backref='processed_lab_tests')
    
    # Indexes for efficient querying
    __table_args__ = (
        db.Index('idx_lab_test_org_patient', 'organization_id', 'patient_id'),
        db.Index('idx_lab_test_org_status', 'organization_id', 'status'),
        db.Index('idx_lab_test_org_date', 'organization_id', 'ordered_at'),
    )

class Referral(db.Model):
    """Patient referrals to other doctors or facilities"""
    __tablename__ = 'referrals'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    
    # Core referral information
    medical_record_id = db.Column(db.Integer, db.ForeignKey('medical_records.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    referring_doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    referral_type = db.Column(db.Enum('internal', 'external', name='referral_types'), nullable=False)
    
    # Internal referral fields
    referred_doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'))
    
    # External referral fields
    facility_name = db.Column(db.String(200))
    facility_type = db.Column(db.String(100))  # hospital, clinic, specialist, etc.
    facility_contact = db.Column(db.String(100))  # phone/email
    facility_address = db.Column(db.Text)
    
    # Common fields
    reason = db.Column(db.Text, nullable=False)
    urgency = db.Column(db.Enum('routine', 'urgent', 'emergency', name='referral_urgency'), nullable=False, default='routine')
    status = db.Column(db.Enum('pending', 'accepted', 'completed', 'cancelled', name='referral_status'), nullable=False, default='pending')
    notes = db.Column(db.Text)
    scheduled_date = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    organization = db.relationship('Organization', backref=db.backref('referrals', lazy='dynamic'))
    medical_record = db.relationship('MedicalRecord', backref='referral', uselist=False)
    patient = db.relationship('Patient', backref='referrals')
    referring_doctor = db.relationship('User', foreign_keys=[referring_doctor_id], backref='referrals_made')
    referred_doctor = db.relationship('User', foreign_keys=[referred_doctor_id], backref='referrals_received')
    department = db.relationship('Department', backref='referrals')
    
    # Indexes for efficient querying
    __table_args__ = (
        db.Index('idx_referral_org_patient', 'organization_id', 'patient_id'),
        db.Index('idx_referral_org_status', 'organization_id', 'status'),
        db.Index('idx_referral_org_doctor', 'organization_id', 'referred_doctor_id'),
    )

class QueueManagement(db.Model):
    """Daily queue management for organizations"""
    __tablename__ = 'queue_management'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    
    queue_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    current_queue_number = db.Column(db.Integer, default=0)
    total_patients_today = db.Column(db.Integer, default=0)
    average_wait_time = db.Column(db.Integer, default=30)  # in minutes
    
    # Queue statistics
    emergency_count = db.Column(db.Integer, default=0)
    urgent_count = db.Column(db.Integer, default=0)
    routine_count = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    organization = db.relationship('Organization', backref=db.backref('queue_management', lazy='dynamic'))
    
    # Unique constraint for one record per organization per day
    __table_args__ = (
        db.UniqueConstraint('organization_id', 'queue_date', name='_org_queue_date_uc'),
    )
    
    @classmethod
    def get_or_create_today(cls, organization_id):
        """Get or create today's queue management record"""
        today = datetime.utcnow().date()
        queue_mgmt = cls.query.filter_by(
            organization_id=organization_id,
            queue_date=today
        ).first()
        
        if not queue_mgmt:
            from app import db
            queue_mgmt = cls(
                organization_id=organization_id,
                queue_date=today
            )
            db.session.add(queue_mgmt)
            db.session.commit()
            
        return queue_mgmt
    
    def get_next_queue_number(self):
        """Get the next queue number for today"""
        self.current_queue_number += 1
        self.total_patients_today += 1
        return self.current_queue_number

class Notification(db.Model):
    """Notifications for healthcare workers"""
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    
    # Notification details
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # Who receives the notification
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'))  # Who sent it (optional)
    
    # Notification content
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.Enum(
        'lab_result', 'appointment', 'referral', 'system', 'urgent', 'prescription',
        name='notification_types'
    ), nullable=False)
    
    # Status and metadata
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    priority = db.Column(db.Enum('low', 'medium', 'high', 'critical', name='notification_priority'), 
                         nullable=False, default='medium')
    
    # Related entities (optional)
    lab_test_id = db.Column(db.Integer, db.ForeignKey('lab_tests.id'))
    prescription_id = db.Column(db.Integer, db.ForeignKey('prescriptions.id'))
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    read_at = db.Column(db.DateTime)
    
    # Relationships
    organization = db.relationship('Organization', backref=db.backref('notifications', lazy='dynamic'))
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='notifications_received')
    sender = db.relationship('User', foreign_keys=[sender_id], backref='notifications_sent')
    lab_test = db.relationship('LabTest', backref='notifications')
    prescription = db.relationship('Prescription', backref='notifications')
    patient = db.relationship('Patient', backref='notifications')
    
    # Indexes
    __table_args__ = (
        db.Index('idx_notification_recipient', 'organization_id', 'recipient_id', 'is_read'),
        db.Index('idx_notification_created', 'created_at'),
    )
    
    def mark_as_read(self):
        """Mark notification as read"""
        self.is_read = True
        self.read_at = datetime.utcnow()
    
    def to_dict(self):
        """Convert notification to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'notification_type': self.notification_type,
            'priority': self.priority,
            'is_read': self.is_read,
            'lab_test_id': self.lab_test_id,
            'prescription_id': self.prescription_id,
            'patient_id': self.patient_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'sender': {
                'id': self.sender.id,
                'first_name': self.sender.first_name,
                'last_name': self.sender.last_name,
                'role': self.sender.role
            } if self.sender else None
        }
    
    def __repr__(self):
        return f'<Notification {self.id}: {self.notification_type} for User {self.recipient_id}>'

class Prescription(db.Model):
    """Prescriptions issued by doctors for patients"""
    __tablename__ = 'prescriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    
    # Prescription details
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    medical_record_id = db.Column(db.Integer, db.ForeignKey('medical_records.id'))
    
    # Medication information
    medication_name = db.Column(db.String(200), nullable=False)
    dosage = db.Column(db.String(100), nullable=False)  # e.g., "500mg"
    frequency = db.Column(db.String(100), nullable=False)  # e.g., "Twice daily"
    duration = db.Column(db.String(100), nullable=False)  # e.g., "7 days"
    quantity = db.Column(db.Integer, nullable=False)  # Total quantity to dispense
    instructions = db.Column(db.Text)  # Special instructions
    
    # Status tracking
    status = db.Column(db.Enum('pending', 'dispensed', 'partially_dispensed', 'cancelled', 'referred', 
                               name='prescription_status'), nullable=False, default='pending')
    dispensed_quantity = db.Column(db.Integer, default=0)
    dispensed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))  # Pharmacist who dispensed
    dispensed_at = db.Column(db.DateTime)
    
    # Referral information (if medication not available)
    referral_notes = db.Column(db.Text)  # Where patient was referred to
    referred_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))  # Pharmacist who made referral
    referred_at = db.Column(db.DateTime)
    
    # Timestamps
    prescribed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    organization = db.relationship('Organization', backref=db.backref('prescriptions', lazy='dynamic'))
    patient = db.relationship('Patient', backref='prescriptions', foreign_keys=[patient_id])
    doctor = db.relationship('User', foreign_keys=[doctor_id], backref='prescriptions_written')
    dispensed_by = db.relationship('User', foreign_keys=[dispensed_by_id], backref='prescriptions_dispensed')
    referred_by = db.relationship('User', foreign_keys=[referred_by_id], backref='prescriptions_referred')
    medical_record = db.relationship('MedicalRecord', backref='prescriptions')
    
    # Indexes for efficient querying
    __table_args__ = (
        db.Index('idx_prescription_org_patient', 'organization_id', 'patient_id'),
        db.Index('idx_prescription_org_status', 'organization_id', 'status'),
        db.Index('idx_prescription_org_date', 'organization_id', 'prescribed_at'),
    )
    
    def to_dict(self):
        """Convert prescription to dictionary"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'patient_name': self.patient.name if self.patient else None,
            'doctor_id': self.doctor_id,
            'doctor_name': f"{self.doctor.first_name} {self.doctor.last_name}" if self.doctor else None,
            'medication_name': self.medication_name,
            'dosage': self.dosage,
            'frequency': self.frequency,
            'duration': self.duration,
            'quantity': self.quantity,
            'dispensed_quantity': self.dispensed_quantity,
            'instructions': self.instructions,
            'status': self.status,
            'dispensed_at': self.dispensed_at.isoformat() if self.dispensed_at else None,
            'dispensed_by': f"{self.dispensed_by.first_name} {self.dispensed_by.last_name}" if self.dispensed_by else None,
            'referral_notes': self.referral_notes,
            'referred_at': self.referred_at.isoformat() if self.referred_at else None,
            'prescribed_at': self.prescribed_at.isoformat() if self.prescribed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class PharmacyInventory(db.Model):
    """Pharmacy inventory management with organization isolation"""
    __tablename__ = 'pharmacy_inventory'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    
    # Medication details
    medication_name = db.Column(db.String(200), nullable=False)
    generic_name = db.Column(db.String(200))
    brand_name = db.Column(db.String(200))
    dosage_form = db.Column(db.String(100))  # e.g., "Tablet", "Capsule", "Syrup"
    strength = db.Column(db.String(100))  # e.g., "500mg", "10ml"
    
    # Inventory tracking
    quantity_in_stock = db.Column(db.Integer, nullable=False, default=0)
    minimum_stock_level = db.Column(db.Integer, nullable=False, default=10)  # Alert threshold
    unit_of_measure = db.Column(db.String(50), default='units')  # units, boxes, bottles, etc.
    
    # Storage and identification
    batch_number = db.Column(db.String(100))
    expiry_date = db.Column(db.Date)
    storage_location = db.Column(db.String(100))  # Shelf/Cabinet location
    
    # Pricing
    unit_price = db.Column(Numeric(10, 2))
    supplier = db.Column(db.String(200))
    
    # Status
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    notes = db.Column(db.Text)  # Additional notes
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_restocked_at = db.Column(db.DateTime)
    
    # Relationships
    organization = db.relationship('Organization', backref=db.backref('pharmacy_inventory', lazy='dynamic'))
    
    # Organization-scoped unique constraint
    __table_args__ = (
        db.UniqueConstraint('organization_id', 'medication_name', 'strength', 'batch_number', 
                          name='_org_medication_batch_uc'),
        db.Index('idx_inventory_org_med', 'organization_id', 'medication_name'),
        db.Index('idx_inventory_org_stock', 'organization_id', 'quantity_in_stock'),
    )
    
    @property
    def is_low_stock(self):
        """Check if inventory is below minimum stock level"""
        return self.quantity_in_stock <= self.minimum_stock_level
    
    @property
    def is_out_of_stock(self):
        """Check if inventory is out of stock"""
        return self.quantity_in_stock == 0
    
    def to_dict(self):
        """Convert inventory item to dictionary"""
        return {
            'id': self.id,
            'medication_name': self.medication_name,
            'generic_name': self.generic_name,
            'brand_name': self.brand_name,
            'dosage_form': self.dosage_form,
            'strength': self.strength,
            'quantity_in_stock': self.quantity_in_stock,
            'minimum_stock_level': self.minimum_stock_level,
            'unit_of_measure': self.unit_of_measure,
            'batch_number': self.batch_number,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'storage_location': self.storage_location,
            'unit_price': float(self.unit_price) if self.unit_price else None,
            'supplier': self.supplier,
            'is_active': self.is_active,
            'is_low_stock': self.is_low_stock,
            'is_out_of_stock': self.is_out_of_stock,
            'notes': self.notes,
            'last_restocked_at': self.last_restocked_at.isoformat() if self.last_restocked_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Bill(db.Model):
    """Patient bills for tracking all charges during a visit"""
    __tablename__ = 'bills'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    
    # Bill identification
    bill_number = db.Column(db.String(50), nullable=False)  # e.g., "B20260219-0001"
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Bill amounts
    total_amount = db.Column(Numeric(12, 2), nullable=False, default=0.00)
    paid_amount = db.Column(Numeric(12, 2), nullable=False, default=0.00)
    discount_amount = db.Column(Numeric(12, 2), nullable=False, default=0.00)
    
    # Status tracking
    status = db.Column(db.Enum('open', 'pending_payment', 'partially_paid', 'paid', 'cancelled',
                               name='bill_status'), nullable=False, default='open')
    
    # Payment details
    payment_method = db.Column(db.Enum('cash', 'card', 'insurance', 'mobile_money', 'bank_transfer', 'other',
                                       name='payment_methods'))
    payment_reference = db.Column(db.String(200))  # Transaction ID, insurance claim #, etc.
    payment_notes = db.Column(db.Text)
    
    # Staff tracking
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))  # Receptionist who created
    paid_to_id = db.Column(db.Integer, db.ForeignKey('users.id'))  # Receptionist who received payment
    
    # Visit date for grouping
    visit_date = db.Column(db.Date, nullable=False, default=date.today)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    paid_at = db.Column(db.DateTime)
    
    # Relationships
    organization = db.relationship('Organization', backref=db.backref('bills', lazy='dynamic'))
    patient = db.relationship('Patient', backref='bills')
    created_by = db.relationship('User', foreign_keys=[created_by_id], backref='bills_created')
    paid_to = db.relationship('User', foreign_keys=[paid_to_id], backref='bills_received')
    items = db.relationship('BillItem', backref='bill', lazy='dynamic', cascade='all, delete-orphan')
    
    # Indexes
    __table_args__ = (
        db.UniqueConstraint('organization_id', 'bill_number', name='_org_bill_number_uc'),
        db.Index('idx_bill_org_patient', 'organization_id', 'patient_id'),
        db.Index('idx_bill_org_status', 'organization_id', 'status'),
        db.Index('idx_bill_org_date', 'organization_id', 'visit_date'),
    )
    
    @classmethod
    def generate_bill_number(cls, organization_id):
        """Generate a unique bill number for the organization"""
        today_str = datetime.utcnow().strftime('%Y%m%d')
        count = cls.query.filter_by(
            organization_id=organization_id,
            visit_date=date.today()
        ).count()
        return f"B{today_str}-{count + 1:04d}"
    
    def recalculate_total(self):
        """Recalculate total from all bill items"""
        from app import db
        # Flush pending items so they show up in the query
        db.session.flush()
        total = sum(float(item.total_price) for item in self.items.all())
        self.total_amount = total
        return total
    
    @property
    def balance_due(self):
        """Calculate remaining balance"""
        return float(self.total_amount or 0) - float(self.paid_amount or 0) - float(self.discount_amount or 0)
    
    def to_dict(self):
        """Convert bill to dictionary"""
        return {
            'id': self.id,
            'bill_number': self.bill_number,
            'patient_id': self.patient_id,
            'patient_name': self.patient.name if self.patient else None,
            'patient_identifier': self.patient.patient_id if self.patient else None,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'paid_amount': float(self.paid_amount) if self.paid_amount else 0,
            'discount_amount': float(self.discount_amount) if self.discount_amount else 0,
            'balance_due': self.balance_due,
            'status': self.status,
            'payment_method': self.payment_method,
            'payment_reference': self.payment_reference,
            'payment_notes': self.payment_notes,
            'visit_date': self.visit_date.isoformat() if self.visit_date else None,
            'items': [item.to_dict() for item in self.items.all()],
            'item_count': self.items.count(),
            'created_by': f"{self.created_by.first_name} {self.created_by.last_name}" if self.created_by else None,
            'paid_to': f"{self.paid_to.first_name} {self.paid_to.last_name}" if self.paid_to else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
        }


class BillItem(db.Model):
    """Individual line items on a bill"""
    __tablename__ = 'bill_items'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    bill_id = db.Column(db.Integer, db.ForeignKey('bills.id'), nullable=False, index=True)
    
    # Item details
    item_type = db.Column(db.Enum('consultation', 'lab_test', 'medication', 'procedure', 'other',
                                   name='bill_item_types'), nullable=False)
    description = db.Column(db.String(300), nullable=False)
    
    # Pricing
    quantity = db.Column(db.Integer, nullable=False, default=1)
    unit_price = db.Column(Numeric(10, 2), nullable=False, default=0.00)
    total_price = db.Column(Numeric(12, 2), nullable=False, default=0.00)
    
    # References to source records
    lab_test_id = db.Column(db.Integer, db.ForeignKey('lab_tests.id'))
    prescription_id = db.Column(db.Integer, db.ForeignKey('prescriptions.id'))
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'))
    medical_record_id = db.Column(db.Integer, db.ForeignKey('medical_records.id'))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    organization = db.relationship('Organization', backref=db.backref('bill_items', lazy='dynamic'))
    lab_test = db.relationship('LabTest', backref='bill_items')
    prescription = db.relationship('Prescription', backref='bill_items')
    appointment = db.relationship('Appointment', backref='bill_items')
    medical_record = db.relationship('MedicalRecord', backref='bill_items')
    
    # Indexes
    __table_args__ = (
        db.Index('idx_bill_item_bill', 'bill_id'),
        db.Index('idx_bill_item_type', 'organization_id', 'item_type'),
    )
    
    def to_dict(self):
        """Convert bill item to dictionary"""
        return {
            'id': self.id,
            'bill_id': self.bill_id,
            'item_type': self.item_type,
            'description': self.description,
            'quantity': self.quantity,
            'unit_price': float(self.unit_price) if self.unit_price else 0,
            'total_price': float(self.total_price) if self.total_price else 0,
            'lab_test_id': self.lab_test_id,
            'prescription_id': self.prescription_id,
            'appointment_id': self.appointment_id,
            'medical_record_id': self.medical_record_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# Data isolation enforcement through SQLAlchemy events
@event.listens_for(Patient, 'before_insert')
@event.listens_for(Department, 'before_insert')
@event.listens_for(Appointment, 'before_insert')
@event.listens_for(MedicalRecord, 'before_insert')
@event.listens_for(Triage, 'before_insert')
@event.listens_for(LabTest, 'before_insert')
@event.listens_for(Referral, 'before_insert')
@event.listens_for(QueueManagement, 'before_insert')
@event.listens_for(Notification, 'before_insert')
@event.listens_for(Prescription, 'before_insert')
@event.listens_for(PharmacyInventory, 'before_insert')
@event.listens_for(Bill, 'before_insert')
@event.listens_for(BillItem, 'before_insert')
def validate_organization_before_insert(mapper, connection, target):
    """Ensure organization_id is always set before inserting records"""
    if not hasattr(target, 'organization_id') or target.organization_id is None:
        raise ValueError(f"organization_id is required for {target.__class__.__name__}")