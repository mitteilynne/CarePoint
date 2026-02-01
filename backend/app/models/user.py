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

    def __init__(self, organization_id, username, email, first_name, last_name, **kwargs):
        # Validate inputs
        if not all([organization_id, username, email, first_name, last_name]):
            raise ValueError("All required fields must be provided")
        
        # Strip whitespace and normalize
        self.organization_id = organization_id
        self.username = username.lower().strip() if username else None
        self.email = email.lower().strip() if email else None
        self.first_name = first_name.strip() if first_name else None
        self.last_name = last_name.strip() if last_name else None
        
        # Set optional fields
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)

    def set_password(self, password):
        """Hash and store password"""
        if not password:
            raise ValueError("Password cannot be empty")
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters long")
        
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check if provided password matches the stored password hash"""
        if not password:
            return False
        return check_password_hash(self.password_hash, password)

    @property
    def full_name(self):
        """Return full name"""
        return f"{self.first_name} {self.last_name}".strip()

    def to_dict(self, include_sensitive=False):
        """Convert user to dictionary representation"""
        user_dict = {
            'id': self.id,
            'organization_id': self.organization_id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'role': self.role,
            'phone': self.phone,
            'address': self.address,
            'is_active': self.is_active,
            'email_confirmed': self.email_confirmed,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        # Include organization details if available
        if hasattr(self, 'organization') and self.organization:
            user_dict.update({
                'organization_code': self.organization.code,
                'organization_name': self.organization.name
            })
        
        if include_sensitive:
            user_dict['password_hash'] = self.password_hash
        
        return user_dict

    def can_access_role(self, required_role):
        """Check if user can access a specific role"""
        role_hierarchy = {
            'admin': 5,
            'doctor': 4,
            'nurse': 3,
            'receptionist': 2,
            'patient': 1
        }
        
        user_level = role_hierarchy.get(self.role, 0)
        required_level = role_hierarchy.get(required_role, 0)
        
        return user_level >= required_level

    def update_profile(self, **kwargs):
        """Update user profile with new data"""
        allowed_fields = {
            'first_name', 'last_name', 'phone', 'address', 'email'
        }
        
        for key, value in kwargs.items():
            if key in allowed_fields and hasattr(self, key):
                if key in ['first_name', 'last_name', 'email'] and value:
                    setattr(self, key, value.strip())
                else:
                    setattr(self, key, value)
        
        self.updated_at = datetime.utcnow()

    @classmethod
    def find_by_username(cls, username, organization_id=None):
        """Find user by username, optionally scoped to organization"""
        query = cls.query.filter_by(username=username.lower().strip())
        if organization_id:
            query = query.filter_by(organization_id=organization_id)
        return query.first()

    @classmethod
    def find_by_email(cls, email, organization_id=None):
        """Find user by email, optionally scoped to organization"""
        query = cls.query.filter_by(email=email.lower().strip())
        if organization_id:
            query = query.filter_by(organization_id=organization_id)
        return query.first()

    @classmethod
    def find_by_credentials(cls, login, organization_id):
        """Find user by username or email within organization"""
        login_clean = login.lower().strip()
        return cls.query.filter(
            cls.organization_id == organization_id,
            (cls.username == login_clean) | (cls.email == login_clean)
        ).first()

    def deactivate(self):
        """Deactivate user account"""
        self.is_active = False
        self.updated_at = datetime.utcnow()

    def activate(self):
        """Activate user account"""
        self.is_active = True
        self.updated_at = datetime.utcnow()

    def confirm_email(self):
        """Confirm user's email address"""
        self.email_confirmed = True
        self.updated_at = datetime.utcnow()

    def __repr__(self):
        return f'<User {self.username}@{self.organization_id}>'