"""
Data isolation utilities for organization-based multi-tenancy.
Ensures that all data access is properly scoped to the user's organization.
"""

from flask import g
from flask_jwt_extended import get_jwt_identity, get_jwt
from functools import wraps
from sqlalchemy import and_

class OrganizationScopedQuery:
    """
    Helper class to automatically add organization filtering to database queries
    """
    
    @staticmethod
    def get_current_org_id():
        """Get the current user's organization ID from JWT token or context"""
        try:
            # First try to get from JWT claims
            claims = get_jwt()
            if claims and 'organization_id' in claims:
                return claims['organization_id']
            
            # Fallback to context if available
            if hasattr(g, 'current_user') and g.current_user:
                return g.current_user.organization_id
                
            return None
        except:
            return None
    
    @classmethod
    def filter_by_organization(cls, query, model_class):
        """
        Add organization filter to any query for models that have organization_id
        """
        org_id = cls.get_current_org_id()
        if org_id and hasattr(model_class, 'organization_id'):
            return query.filter(model_class.organization_id == org_id)
        return query
    
    @classmethod
    def validate_organization_access(cls, model_instance):
        """
        Validate that the current user can access the given model instance
        """
        if not model_instance:
            return False
            
        current_org_id = cls.get_current_org_id()
        if not current_org_id:
            return False
            
        # Check if model has organization_id and if it matches current user's org
        if hasattr(model_instance, 'organization_id'):
            return model_instance.organization_id == current_org_id
            
        return True  # Allow access to models without organization_id

def organization_required(f):
    """
    Decorator to ensure that the current user has a valid organization context
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        org_id = OrganizationScopedQuery.get_current_org_id()
        if not org_id:
            from flask import jsonify
            return jsonify({'error': 'Organization context required'}), 403
        return f(*args, **kwargs)
    return decorated_function

def organization_access_required(model_class):
    """
    Decorator factory to validate organization access for specific model operations
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Extract model ID from kwargs or args
            model_id = kwargs.get('id') or (args[0] if args else None)
            
            if model_id:
                instance = model_class.query.get(model_id)
                if not OrganizationScopedQuery.validate_organization_access(instance):
                    from flask import jsonify
                    return jsonify({'error': 'Access denied to this resource'}), 403
                    
            return f(*args, **kwargs)
        return decorated_function
    return decorator

class BaseOrganizationService:
    """
    Base service class that provides organization-scoped CRUD operations
    """
    
    def __init__(self, model_class):
        self.model_class = model_class
    
    def get_organization_scoped_query(self):
        """Get a query automatically filtered by current organization"""
        from app import db
        query = db.session.query(self.model_class)
        return OrganizationScopedQuery.filter_by_organization(query, self.model_class)
    
    def get_all(self):
        """Get all records for the current organization"""
        return self.get_organization_scoped_query().all()
    
    def get_by_id(self, record_id):
        """Get a record by ID, ensuring it belongs to the current organization"""
        return self.get_organization_scoped_query().filter(
            self.model_class.id == record_id
        ).first()
    
    def create(self, data):
        """Create a new record with automatic organization assignment"""
        from app import db
        
        # Ensure organization_id is set
        org_id = OrganizationScopedQuery.get_current_org_id()
        if not org_id:
            raise ValueError("Organization context required for creating records")
        
        if hasattr(self.model_class, 'organization_id'):
            data['organization_id'] = org_id
        
        instance = self.model_class(**data)
        db.session.add(instance)
        db.session.commit()
        return instance
    
    def update(self, record_id, data):
        """Update a record, ensuring it belongs to the current organization"""
        from app import db
        
        instance = self.get_by_id(record_id)
        if not instance:
            return None
        
        # Prevent changing organization_id
        if 'organization_id' in data:
            del data['organization_id']
        
        for key, value in data.items():
            if hasattr(instance, key):
                setattr(instance, key, value)
        
        db.session.commit()
        return instance
    
    def delete(self, record_id):
        """Delete a record, ensuring it belongs to the current organization"""
        from app import db
        
        instance = self.get_by_id(record_id)
        if not instance:
            return False
        
        db.session.delete(instance)
        db.session.commit()
        return True

# Service instances for each model
class PatientService(BaseOrganizationService):
    def __init__(self):
        from app.models import Patient
        super().__init__(Patient)
    
    def find_by_patient_id(self, patient_id):
        """Find patient by organization-specific patient ID"""
        return self.get_organization_scoped_query().filter(
            self.model_class.patient_id == patient_id
        ).first()
    
    def search_patients(self, search_term):
        """Search patients by name within current organization"""
        search_pattern = f"%{search_term}%"
        return self.get_organization_scoped_query().filter(
            and_(
                (self.model_class.first_name.ilike(search_pattern)) |
                (self.model_class.last_name.ilike(search_pattern)) |
                (self.model_class.patient_id.ilike(search_pattern))
            )
        ).all()

class AppointmentService(BaseOrganizationService):
    def __init__(self):
        from app.models import Appointment
        super().__init__(Appointment)
    
    def get_appointments_by_date(self, date):
        """Get appointments for a specific date within current organization"""
        return self.get_organization_scoped_query().filter(
            self.model_class.appointment_date.date() == date
        ).all()
    
    def get_doctor_appointments(self, doctor_id, date=None):
        """Get appointments for a specific doctor within current organization"""
        query = self.get_organization_scoped_query().filter(
            self.model_class.doctor_id == doctor_id
        )
        if date:
            query = query.filter(self.model_class.appointment_date.date() == date)
        return query.all()

class MedicalRecordService(BaseOrganizationService):
    def __init__(self):
        from app.models import MedicalRecord
        super().__init__(MedicalRecord)
    
    def get_patient_records(self, patient_id):
        """Get all medical records for a patient within current organization"""
        return self.get_organization_scoped_query().filter(
            self.model_class.patient_id == patient_id
        ).order_by(self.model_class.visit_date.desc()).all()

class DepartmentService(BaseOrganizationService):
    def __init__(self):
        from app.models import Department
        super().__init__(Department)

# Create service instances
patient_service = PatientService()
appointment_service = AppointmentService()
medical_record_service = MedicalRecordService()
department_service = DepartmentService()