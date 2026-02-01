from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    username = db.Column(db.String(80), nullable=False, index=True)
    email = db.Column(db.String(120), nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    role = db.Column(db.Enum('patient', 'doctor', 'admin', 'receptionist', 'nurse', 'pharmacist', 'lab', name='user_roles'), 
                     nullable=False, default='patient')
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    email_confirmed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, 
                          onupdate=datetime.utcnow, nullable=False)
    
    # Composite unique constraints for organization-scoped uniqueness
    __table_args__ = (
        db.UniqueConstraint('organization_id', 'username', name='_org_username_uc'),
        db.UniqueConstraint('organization_id', 'email', name='_org_email_uc'),
    )

    # Relationships - using backref from Organization model
    # organization relationship is created automatically by Organization.users backref
    
    def __init__(self, organization_id, username, email, first_name, last_name, **kwargs):
        # Validate inputs
        if not organization_id:
            raise ValueError('Organization ID is required')
        
        self.organization_id = organization_id
        self.username = username.lower().strip()
        self.email = email.lower().strip()
        self.first_name = first_name.strip()
        self.last_name = last_name.strip()
        self.role = kwargs.get('role', 'patient')
        self.phone = kwargs.get('phone')
        self.address = kwargs.get('address')
        self.is_active = kwargs.get('is_active', True)
    
    def set_password(self, password):
        """Set password with hash"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def has_role(self, role):
        """Check if user has specific role"""
        return self.role == role
    
    def to_dict(self, include_sensitive=False):
        """Convert user to dictionary"""
        data = {
            'id': self.id,
            'organization_id': self.organization_id,
            'organization_code': self.organization.code if self.organization else None,
            'organization_name': self.organization.name if self.organization else None,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'role': self.role,
            'phone': self.phone,
            'address': self.address,
            'is_active': self.is_active,
            'email_confirmed': self.email_confirmed,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_sensitive:
            data['password_hash'] = self.password_hash
            
        return data
    
    @classmethod
    def find_by_login_and_organization(cls, organization_id, login):
        """Find user by email or username within an organization"""
        return cls.query.filter(
            cls.organization_id == organization_id,
            cls.is_active == True,
            (cls.email == login.lower().strip()) | (cls.username == login.lower().strip())
        ).first()
    
    @classmethod
    def find_by_email_and_organization(cls, organization_id, email):
        """Find user by email within an organization"""
        return cls.query.filter_by(
            organization_id=organization_id,
            email=email.lower().strip(),
            is_active=True
        ).first()
    
    def is_in_organization(self, organization_id):
        """Check if user belongs to specific organization"""
        return self.organization_id == organization_id

    def __repr__(self):
        return f'<User {self.username} ({self.role}) - Org {self.organization_id}>'