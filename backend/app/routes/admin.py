from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from app import db
from app.models import User, Organization
from sqlalchemy import func, case, and_, or_
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('admin', __name__, url_prefix='/api/admin')

def require_admin(f):
    """Decorator to ensure user has admin role"""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

@bp.route('/dashboard/overview', methods=['GET'])
@jwt_required()
def get_dashboard_overview():
    """Get overview statistics for admin dashboard"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        org_id = user.organization_id
        
        # Get user counts by role
        user_counts = db.session.query(
            User.role,
            func.count(User.id).label('count')
        ).filter(
            User.organization_id == org_id,
            User.is_active == True
        ).group_by(User.role).all()
        
        # Get recent registrations (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_users = db.session.query(
            func.date(User.created_at).label('date'),
            func.count(User.id).label('count')
        ).filter(
            User.organization_id == org_id,
            User.created_at >= thirty_days_ago
        ).group_by(func.date(User.created_at)).order_by('date').all()
        
        # Format data for response
        role_counts = {role: count for role, count in user_counts}
        registration_trends = [
            {
                'date': str(date),
                'count': count
            } for date, count in recent_users
        ]
        
        # Calculate total active users
        total_users = sum(role_counts.values())
        
        return jsonify({
            'overview': {
                'total_users': total_users,
                'role_counts': role_counts,
                'registration_trends': registration_trends
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting dashboard overview: {str(e)}")
        return jsonify({'error': 'Failed to get dashboard overview'}), 500

@bp.route('/users', methods=['GET'])
@require_admin
def get_all_users():
    """Get all users in the organization with filtering and pagination"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        org_id = user.organization_id
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        role_filter = request.args.get('role', None)
        search = request.args.get('search', '')
        status_filter = request.args.get('status', 'all')  # 'active', 'inactive', 'all'
        
        # Build query
        query = User.query.filter(User.organization_id == org_id)
        
        # Apply filters
        if role_filter and role_filter != 'all':
            query = query.filter(User.role == role_filter)
        
        if status_filter == 'active':
            query = query.filter(User.is_active == True)
        elif status_filter == 'inactive':
            query = query.filter(User.is_active == False)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    User.email.ilike(search_term),
                    User.username.ilike(search_term)
                )
            )
        
        # Order by creation date (newest first)
        query = query.order_by(User.created_at.desc())
        
        # Paginate
        users_paginated = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Format users data
        users_data = []
        for user in users_paginated.items:
            users_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'is_active': user.is_active,
                'email_confirmed': user.email_confirmed,
                'phone': user.phone,
                'address': user.address,
                'created_at': user.created_at.isoformat(),
                'updated_at': user.updated_at.isoformat()
            })
        
        return jsonify({
            'users': users_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': users_paginated.total,
                'pages': users_paginated.pages,
                'has_prev': users_paginated.has_prev,
                'has_next': users_paginated.has_next
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}")
        return jsonify({'error': 'Failed to get users'}), 500

@bp.route('/users/<int:user_id>', methods=['GET'])
@require_admin
def get_user_detail(user_id):
    """Get detailed information about a specific user"""
    try:
        current_user_id = int(get_jwt_identity())
        admin_user = User.query.get(current_user_id)
        org_id = admin_user.organization_id
        
        # Get the user (must be in same organization)
        user = User.query.filter(
            User.id == user_id,
            User.organization_id == org_id
        ).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'is_active': user.is_active,
            'email_confirmed': user.email_confirmed,
            'phone': user.phone,
            'address': user.address,
            'created_at': user.created_at.isoformat(),
            'updated_at': user.updated_at.isoformat()
        }
        
        return jsonify({'user': user_data}), 200
        
    except Exception as e:
        logger.error(f"Error getting user detail: {str(e)}")
        return jsonify({'error': 'Failed to get user detail'}), 500

@bp.route('/users/<int:user_id>/toggle-status', methods=['POST'])
@require_admin
def toggle_user_status(user_id):
    """Toggle user active/inactive status"""
    try:
        current_user_id = int(get_jwt_identity())
        admin_user = User.query.get(current_user_id)
        org_id = admin_user.organization_id
        
        # Get the user (must be in same organization)
        user = User.query.filter(
            User.id == user_id,
            User.organization_id == org_id
        ).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Don't allow admin to deactivate themselves
        if user.id == current_user_id:
            return jsonify({'error': 'Cannot deactivate your own account'}), 400
        
        # Toggle status
        user.is_active = not user.is_active
        user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        action = 'activated' if user.is_active else 'deactivated'
        logger.info(f"Admin {current_user_id} {action} user {user_id}")
        
        return jsonify({
            'message': f'User {action} successfully',
            'user': {
                'id': user.id,
                'is_active': user.is_active
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error toggling user status: {str(e)}")
        return jsonify({'error': 'Failed to update user status'}), 500

@bp.route('/users/<int:user_id>/role', methods=['PUT'])
@require_admin
def update_user_role(user_id):
    """Update user role"""
    try:
        current_user_id = int(get_jwt_identity())
        admin_user = User.query.get(current_user_id)
        org_id = admin_user.organization_id
        
        data = request.get_json()
        new_role = data.get('role')
        
        if not new_role:
            return jsonify({'error': 'Role is required'}), 400
        
        # Validate role
        valid_roles = ['patient', 'doctor', 'admin', 'receptionist', 'nurse', 'pharmacist', 'lab_technician']
        if new_role not in valid_roles:
            return jsonify({'error': 'Invalid role'}), 400
        
        # Get the user (must be in same organization)
        user = User.query.filter(
            User.id == user_id,
            User.organization_id == org_id
        ).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Don't allow admin to change their own role
        if user.id == current_user_id:
            return jsonify({'error': 'Cannot change your own role'}), 400
        
        old_role = user.role
        user.role = new_role
        user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        logger.info(f"Admin {current_user_id} changed user {user_id} role from {old_role} to {new_role}")
        
        return jsonify({
            'message': f'User role updated from {old_role} to {new_role}',
            'user': {
                'id': user.id,
                'role': user.role
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating user role: {str(e)}")
        return jsonify({'error': 'Failed to update user role'}), 500

@bp.route('/organization/info', methods=['GET'])
@require_admin
def get_organization_info():
    """Get organization information"""
    try:
        current_user_id = int(get_jwt_identity())
        admin_user = User.query.get(current_user_id)
        org = admin_user.organization
        
        org_data = {
            'id': org.id,
            'code': org.code,
            'name': org.name,
            'type': org.organization_type,
            'is_active': org.is_active,
            'created_at': org.created_at.isoformat()
        }
        
        return jsonify({'organization': org_data}), 200
        
    except Exception as e:
        logger.error(f"Error getting organization info: {str(e)}")
        return jsonify({'error': 'Failed to get organization info'}), 500