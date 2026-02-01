from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models import User

def role_required(*allowed_roles):
    """
    Decorator that restricts access to users with specific roles
    Usage: @role_required('admin', 'doctor')
    """
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            try:
                current_user_id = get_jwt_identity()
                current_user = User.query.get(current_user_id)
                
                if not current_user:
                    return jsonify({'error': 'User not found'}), 404
                
                if not current_user.is_active:
                    return jsonify({'error': 'Account is disabled'}), 403
                
                if current_user.role not in allowed_roles:
                    return jsonify({
                        'error': 'Insufficient permissions',
                        'required_roles': list(allowed_roles),
                        'current_role': current_user.role
                    }), 403
                
                return f(*args, **kwargs)
            except Exception as e:
                return jsonify({'error': 'Authorization failed'}), 500
        
        return decorated_function
    return decorator

def permission_required(permission):
    """
    Decorator that restricts access based on specific permissions
    Usage: @permission_required('manage_users')
    """
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            try:
                current_user_id = get_jwt_identity()
                current_user = User.query.get(current_user_id)
                
                if not current_user:
                    return jsonify({'error': 'User not found'}), 404
                
                if not current_user.is_active:
                    return jsonify({'error': 'Account is disabled'}), 403
                
                if not current_user.has_permission(permission):
                    return jsonify({
                        'error': 'Insufficient permissions',
                        'required_permission': permission,
                        'current_role': current_user.role
                    }), 403
                
                return f(*args, **kwargs)
            except Exception as e:
                return jsonify({'error': 'Authorization failed'}), 500
        
        return decorated_function
    return decorator

def admin_required(f):
    """
    Decorator that restricts access to admin users only
    Usage: @admin_required
    """
    return role_required('admin')(f)

def doctor_or_admin_required(f):
    """
    Decorator that restricts access to doctor or admin users
    Usage: @doctor_or_admin_required
    """
    return role_required('doctor', 'admin')(f)

def get_current_user():
    """
    Helper function to get the current authenticated user
    Returns User object or None
    """
    try:
        current_user_id = get_jwt_identity()
        if current_user_id:
            return User.query.get(current_user_id)
        return None
    except Exception:
        return None

def is_owner_or_admin(user_id):
    """
    Check if current user is the owner of a resource or an admin
    Usage: if not is_owner_or_admin(user_id): return error
    """
    try:
        current_user = get_current_user()
        if not current_user:
            return False
        
        return current_user.id == user_id or current_user.role == 'admin'
    except Exception:
        return False