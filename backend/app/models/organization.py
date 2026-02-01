from app import db
from datetime import datetime
import uuid

class Organization(db.Model):
    __tablename__ = 'organizations'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    address = db.Column(db.Text)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    website = db.Column(db.String(255))
    
    # Organization type: hospital, clinic, pharmacy, etc.
    organization_type = db.Column(db.Enum('hospital', 'clinic', 'pharmacy', 'laboratory', 'other', 
                                         name='organization_types'), 
                                 nullable=False, default='clinic')
    
    # Status and activity tracking
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    subscription_plan = db.Column(db.String(50), default='basic')  # basic, premium, enterprise
    max_users = db.Column(db.Integer, default=50)  # User limit for this organization
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, 
                          onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    users = db.relationship('User', backref='organization', lazy='dynamic', cascade='all, delete-orphan')
    
    def __init__(self, code, name, **kwargs):
        self.validate_code(code)
        self.code = code.upper()  # Always store codes in uppercase
        self.name = name.strip()
        
        # Set optional fields
        for key, value in kwargs.items():
            if hasattr(self, key) and value is not None:
                setattr(self, key, value)
    
    @staticmethod
    def validate_code(code):
        """Validate organization code format"""
        if not code or not isinstance(code, str):
            raise ValueError('Organization code is required')
        
        code = code.strip().upper()
        if len(code) < 3 or len(code) > 20:
            raise ValueError('Organization code must be between 3 and 20 characters')
        
        # Code should contain only alphanumeric characters and hyphens
        if not all(c.isalnum() or c == '-' for c in code):
            raise ValueError('Organization code can only contain letters, numbers, and hyphens')
        
        return True
    
    def get_user_count(self):
        """Get the current number of users in this organization"""
        return self.users.filter_by(is_active=True).count()
    
    def can_add_user(self):
        """Check if organization can add more users"""
        return self.get_user_count() < self.max_users
    
    def to_dict(self):
        """Convert organization to dictionary"""
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'description': self.description,
            'organization_type': self.organization_type,
            'is_active': self.is_active,
            'user_count': self.get_user_count(),
            'max_users': self.max_users,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def find_by_code(cls, code):
        """Find organization by code"""
        if not code:
            return None
        return cls.query.filter_by(code=code.upper(), is_active=True).first()
    
    def __repr__(self):
        return f'<Organization {self.code}: {self.name}>'


class PasswordReset(db.Model):
    __tablename__ = 'password_resets'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(100), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    organization = db.relationship('Organization', backref='password_resets')
    user = db.relationship('User', backref='password_resets')
    
    def __init__(self, organization_id, user_id, token, expires_at):
        self.organization_id = organization_id
        self.user_id = user_id
        self.token = token
        self.expires_at = expires_at
    
    def is_valid(self):
        """Check if token is still valid"""
        return not self.used and self.expires_at > datetime.utcnow()
    
    def mark_as_used(self):
        """Mark token as used"""
        self.used = True
        db.session.commit()
    
    @classmethod
    def find_valid_token(cls, token):
        """Find a valid password reset token"""
        return cls.query.filter_by(token=token, used=False).filter(
            cls.expires_at > datetime.utcnow()
        ).first()
    
    def __repr__(self):
        return f'<PasswordReset {self.token} for user {self.user_id}>'