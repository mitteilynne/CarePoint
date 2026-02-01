from app import db
from datetime import datetime
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
    date_of_birth = db.Column(db.Date, nullable=False)
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
    
    # Status
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    organization = db.relationship('Organization', backref=db.backref('patients', lazy='dynamic'))
    appointments = db.relationship('Appointment', backref='patient', lazy='dynamic')
    medical_records = db.relationship('MedicalRecord', backref='patient', lazy='dynamic')
    
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
    
    # Medical data
    visit_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
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

# Data isolation enforcement through SQLAlchemy events
@event.listens_for(Patient, 'before_insert')
@event.listens_for(Department, 'before_insert')
@event.listens_for(Appointment, 'before_insert')
@event.listens_for(MedicalRecord, 'before_insert')
@event.listens_for(Triage, 'before_insert')
@event.listens_for(QueueManagement, 'before_insert')
def validate_organization_before_insert(mapper, connection, target):
    """Ensure organization_id is always set before inserting records"""
    if not hasattr(target, 'organization_id') or target.organization_id is None:
        raise ValueError(f"organization_id is required for {target.__class__.__name__}")