from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from app.models import User

def role_required(allowed_roles):
    """
    Decorator to restrict access to specific user roles.
    
    Usage:
        @role_required(['admin', 'doctor'])
        def some_function():
            pass
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            if user.role not in allowed_roles:
                return jsonify({
                    'error': 'Access denied',
                    'message': f'This endpoint requires one of the following roles: {", ".join(allowed_roles)}'
                }), 403
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def organization_required(fn):
    """
    Decorator to ensure user belongs to an organization.
    Super admins are exempt from this requirement.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Super admin doesn't need organization
        if user.role == 'super_admin':
            return fn(*args, **kwargs)
        
        if not user.organization_id:
            return jsonify({
                'error': 'Access denied',
                'message': 'User must belong to an organization'
            }), 403
        
        return fn(*args, **kwargs)
    return wrapper
