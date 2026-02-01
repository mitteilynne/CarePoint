from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.utils.decorators import role_required, permission_required, admin_required

user_bp = Blueprint('users', __name__)

@user_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users():
    """Get all users - Admin only"""
    from app.models import User
    try:
        users = User.query.all()
        users_data = []
        
        for user in users:
            users_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat()
            })
        
        return jsonify({
            'success': True,
            'users': users_data,
            'total': len(users_data)
        }), 200
    
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve users'}), 500

@user_bp.route('/users/<int:user_id>', methods=['GET'])
@role_required('admin', 'doctor')
def get_user(user_id):
    """Get specific user - Admin or Doctor only"""
    from app.models import User
    try:
        user = User.query.get_or_404(user_id)
        
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'is_active': user.is_active,
            'created_at': user.created_at.isoformat()
        }
        
        return jsonify({
            'success': True,
            'user': user_data
        }), 200
    
    except Exception as e:
        return jsonify({'error': 'User not found'}), 404

@user_bp.route('/users/<int:user_id>/activate', methods=['POST'])
@admin_required
def activate_user(user_id):
    """Activate a user - Admin only"""
    from app import db
    from app.models import User
    
    try:
        user = User.query.get_or_404(user_id)
        user.is_active = True
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'User {user.username} has been activated'
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to activate user'}), 500

@user_bp.route('/users/<int:user_id>/deactivate', methods=['POST'])
@admin_required
def deactivate_user(user_id):
    """Deactivate a user - Admin only"""
    from app import db
    from app.models import User
    
    try:
        user = User.query.get_or_404(user_id)
        user.is_active = False
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'User {user.username} has been deactivated'
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to deactivate user'}), 500

@user_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@permission_required('manage_users')
def update_user_role(user_id):
    """Update user role - Admin only"""
    from flask import request
    from app import db
    from app.models import User
    
    try:
        data = request.get_json()
        new_role = data.get('role')
        
        if not new_role or new_role not in ['patient', 'doctor', 'admin']:
            return jsonify({'error': 'Valid role required (patient, doctor, admin)'}), 400
        
        user = User.query.get_or_404(user_id)
        old_role = user.role
        user.role = new_role
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'User role updated from {old_role} to {new_role}',
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role
            }
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update user role'}), 500

@user_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """Get dashboard data based on user role"""
    from app.utils.decorators import get_current_user
    
    try:
        current_user = get_current_user()
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        dashboard_data = {
            'user': {
                'username': current_user.username,
                'role': current_user.role,
                'full_name': current_user.full_name
            },
            'permissions': current_user.get_permissions(),
            'role_specific_data': {}
        }
        
        # Role-specific dashboard data
        if current_user.role == 'admin':
            from app.models import User
            total_users = User.query.count()
            active_users = User.query.filter_by(is_active=True).count()
            
            dashboard_data['role_specific_data'] = {
                'total_users': total_users,
                'active_users': active_users,
                'inactive_users': total_users - active_users
            }
        
        elif current_user.role == 'doctor':
            dashboard_data['role_specific_data'] = {
                'appointments_today': 0,  # Placeholder for future implementation
                'total_patients': 0       # Placeholder for future implementation
            }
        
        elif current_user.role == 'patient':
            dashboard_data['role_specific_data'] = {
                'upcoming_appointments': 0,  # Placeholder for future implementation
                'last_visit': None           # Placeholder for future implementation
            }
        
        return jsonify({
            'success': True,
            'dashboard': dashboard_data
        }), 200
    
    except Exception as e:
        return jsonify({'error': 'Failed to load dashboard'}), 500