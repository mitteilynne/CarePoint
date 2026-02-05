from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Organization, User
from app.utils.decorators import role_required
from datetime import datetime

bp = Blueprint('organization', __name__, url_prefix='/api/organization')

@bp.route('', methods=['GET'])
@jwt_required()
@role_required(['admin', 'super_admin'])
def get_organization():
    """Get organization details"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Super admin can query any organization
    if user.role == 'super_admin':
        org_id = request.args.get('org_id', type=int)
        if org_id:
            org = Organization.query.get(org_id)
        else:
            # Return all organizations for super admin
            orgs = Organization.query.all()
            return jsonify({
                'organizations': [org.to_dict() for org in orgs]
            }), 200
    else:
        org = user.organization
    
    if not org:
        return jsonify({'error': 'Organization not found'}), 404
    
    return jsonify(org.to_dict()), 200


@bp.route('', methods=['PUT'])
@jwt_required()
@role_required(['admin', 'super_admin'])
def update_organization():
    """Update organization details"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    # Super admin can update any organization
    if user.role == 'super_admin':
        org_id = data.get('org_id') or request.args.get('org_id', type=int)
        if not org_id:
            return jsonify({'error': 'Organization ID required for super admin'}), 400
        org = Organization.query.get(org_id)
    else:
        org = user.organization
    
    if not org:
        return jsonify({'error': 'Organization not found'}), 404
    
    # Update allowed fields
    allowed_fields = ['name', 'email', 'phone', 'address', 'license_number']
    for field in allowed_fields:
        if field in data:
            setattr(org, field, data[field])
    
    # Only super admin can update these fields
    if user.role == 'super_admin':
        if 'is_active' in data:
            org.is_active = data['is_active']
        if 'subscription_plan' in data:
            org.subscription_plan = data['subscription_plan']
        if 'subscription_expires' in data:
            if data['subscription_expires']:
                org.subscription_expires = datetime.fromisoformat(data['subscription_expires'])
            else:
                org.subscription_expires = None
    
    org.updated_at = datetime.utcnow()
    
    try:
        db.session.commit()
        return jsonify({
            'message': 'Organization updated successfully',
            'organization': org.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/stats', methods=['GET'])
@jwt_required()
@role_required(['admin', 'super_admin'])
def get_organization_stats():
    """Get organization statistics"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Super admin can query any organization
    if user.role == 'super_admin':
        org_id = request.args.get('org_id', type=int)
        if org_id:
            org = Organization.query.get(org_id)
        else:
            return jsonify({'error': 'Organization ID required'}), 400
    else:
        org = user.organization
    
    if not org:
        return jsonify({'error': 'Organization not found'}), 404
    
    # Calculate statistics
    stats = {
        'total_users': org.users.count(),
        'total_patients': org.patients.count(),
        'total_departments': org.departments.count(),
        'total_appointments': org.appointments.count(),
        'active_users': org.users.filter_by(is_active=True).count(),
        'doctors': org.users.filter_by(role='doctor', is_active=True).count(),
        'nurses': org.users.filter_by(role='nurse', is_active=True).count(),
        'lab_technicians': org.users.filter_by(role='lab_technician', is_active=True).count(),
        'receptionists': org.users.filter_by(role='receptionist', is_active=True).count(),
    }
    
    return jsonify(stats), 200
