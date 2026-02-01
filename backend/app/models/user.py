from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from email_validator import validate_email, EmailNotValidError
import re

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False, index=True)
    username = db.Column(db.String(80), nullable=False, index=True)
    email = db.Column(db.String(120), nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    role = db.Column(db.Enum('patient', 'doctor', 'admin', name='user_roles'), 
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

    def __init__(self, organization_id, username, email, first_name, last_name, **kwargs):
        # Validate inputs
        if not organization_id:
            raise ValueError('Organization ID is required')
        self.validate_username(username)
        self.validate_email(email)
        self.validate_name(first_name, 'First name')
        self.validate_name(last_name, 'Last name')
        
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
        """Set password with validation"""
        self.validate_password(password)
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    @staticmethod
    def validate_username(username):
        """Validate username format"""
        if not username or len(username.strip()) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if len(username.strip()) > 80:
            raise ValueError('Username must not exceed 80 characters')
        if not re.match(r'^[a-zA-Z0-9_]+$', username.strip()):
            raise ValueError('Username can only contain letters, numbers, and underscores')
    
    @staticmethod
    def validate_email(email):
        """Validate email format"""
        try:
            # Only validate syntax, not deliverability for development
            validate_email(email.strip(), check_deliverability=False)
        except EmailNotValidError:
            raise ValueError('Invalid email format')
    
    @staticmethod
    def validate_name(name, field_name):
        """Validate first/last name"""
        if not name or len(name.strip()) < 2:
            raise ValueError(f'{field_name} must be at least 2 characters long')
        if len(name.strip()) > 50:
            raise ValueError(f'{field_name} must not exceed 50 characters')
        if not re.match(r'^[a-zA-Z\s\-\']+$', name.strip()):
            raise ValueError(f'{field_name} can only contain letters, spaces, hyphens, and apostrophes')
    
    @staticmethod
    def validate_password(password):
        """Validate password strength"""
        if len(password) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if len(password) > 128:
            raise ValueError('Password must not exceed 128 characters')
        if not re.search(r'[A-Z]', password):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', password):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', password):
            raise ValueError('Password must contain at least one number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValueError('Password must contain at least one special character')
    
    def validate_role(self, role):
        """Validate user role"""
        valid_roles = ['patient', 'doctor', 'admin']
        if role not in valid_roles:
            raise ValueError(f'Invalid role. Must be one of: {", ".join(valid_roles)}')
    
    def has_role(self, role):
        """Check if user has specific role"""
        return self.role == role
    
    def has_permission(self, permission):
        """Check if user has specific permission based on role"""
        role_permissions = {
            'patient': ['view_own_data', 'update_own_profile'],
            'doctor': ['view_own_data', 'update_own_profile', 'view_patient_data', 
                      'create_appointment', 'view_appointments'],
            'admin': ['view_own_data', 'update_own_profile', 'view_patient_data', 
                     'create_appointment', 'view_appointments', 'manage_users', 
                     'view_all_data', 'system_admin']
        }
        return permission in role_permissions.get(self.role, [])
    
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