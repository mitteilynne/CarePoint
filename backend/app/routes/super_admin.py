"""
Super Admin Routes - Platform-level administration
Manages all organizations, monitors usage, enables/disables organizations
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from app import db
from app.models import User, Organization
from app.models.healthcare import Patient, MedicalRecord, LabTest
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('super_admin', __name__, url_prefix='/api/super-admin')


def require_super_admin(f):
    """Decorator to ensure user has super_admin role"""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'super_admin':
            return jsonify({'error': 'Super Admin access required'}), 403
        
        return f(*args, **kwargs)
    return decorated_function


@bp.route('/dashboard/overview', methods=['GET'])
@require_super_admin
def get_platform_overview():
    """Get platform-wide statistics for super admin dashboard"""
    try:
        # Get total organizations
        total_organizations = Organization.query.count()
        active_organizations = Organization.query.filter_by(is_active=True).count()
        inactive_organizations = total_organizations - active_organizations
        
        # Get total users across all organizations
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        
        # Get users by role across all organizations
        role_counts = db.session.query(
            User.role,
            func.count(User.id).label('count')
        ).group_by(User.role).all()
        
        # Get organization type distribution
        org_type_counts = db.session.query(
            Organization.organization_type,
            func.count(Organization.id).label('count')
        ).group_by(Organization.organization_type).all()
        
        # Get new organizations in last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        new_organizations = Organization.query.filter(
            Organization.created_at >= thirty_days_ago
        ).count()
        
        # Get new users in last 30 days
        new_users = User.query.filter(
            User.created_at >= thirty_days_ago
        ).count()
        
        # Get total patients, visits, lab tests across all organizations
        total_patients = Patient.query.count() if Patient else 0
        total_lab_tests = LabTest.query.count() if LabTest else 0
        total_medical_records = MedicalRecord.query.count() if MedicalRecord else 0
        
        # Get subscription plan distribution
        subscription_counts = db.session.query(
            Organization.subscription_plan,
            func.count(Organization.id).label('count')
        ).group_by(Organization.subscription_plan).all()
        
        return jsonify({
            'overview': {
                'organizations': {
                    'total': total_organizations,
                    'active': active_organizations,
                    'inactive': inactive_organizations,
                    'new_last_30_days': new_organizations
                },
                'users': {
                    'total': total_users,
                    'active': active_users,
                    'new_last_30_days': new_users,
                    'by_role': {role: count for role, count in role_counts}
                },
                'healthcare': {
                    'total_patients': total_patients,
                    'total_lab_tests': total_lab_tests,
                    'total_medical_records': total_medical_records
                },
                'organization_types': {org_type: count for org_type, count in org_type_counts},
                'subscription_plans': {plan or 'basic': count for plan, count in subscription_counts}
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting platform overview: {str(e)}")
        return jsonify({'error': 'Failed to get platform overview'}), 500


@bp.route('/organizations', methods=['GET'])
@require_super_admin
def get_all_organizations():
    """Get all organizations with filtering and pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status', 'all')
        org_type = request.args.get('type', 'all')
        
        query = Organization.query
        
        # Apply filters
        if status == 'active':
            query = query.filter(Organization.is_active == True)
        elif status == 'inactive':
            query = query.filter(Organization.is_active == False)
        
        if org_type != 'all':
            query = query.filter(Organization.organization_type == org_type)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Organization.name.ilike(search_term),
                    Organization.code.ilike(search_term),
                    Organization.email.ilike(search_term)
                )
            )
        
        # Order by creation date (newest first)
        query = query.order_by(Organization.created_at.desc())
        
        # Paginate
        orgs_paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Build response with usage stats
        organizations_data = []
        for org in orgs_paginated.items:
            org_data = org.to_dict()
            
            # Get usage statistics for this organization
            user_count = User.query.filter_by(organization_id=org.id).count()
            active_user_count = User.query.filter_by(organization_id=org.id, is_active=True).count()
            
            # Get patient count
            patient_count = Patient.query.filter_by(organization_id=org.id).count() if hasattr(Patient, 'organization_id') else 0
            
            # Get activity in last 30 days
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            recent_users = User.query.filter(
                User.organization_id == org.id,
                User.created_at >= thirty_days_ago
            ).count()
            
            org_data.update({
                'user_count': user_count,
                'active_user_count': active_user_count,
                'patient_count': patient_count,
                'recent_users': recent_users,
                'usage_percentage': round((user_count / org.max_users) * 100, 1) if org.max_users > 0 else 0
            })
            
            organizations_data.append(org_data)
        
        return jsonify({
            'organizations': organizations_data,
            'pagination': {
                'page': orgs_paginated.page,
                'per_page': orgs_paginated.per_page,
                'total': orgs_paginated.total,
                'pages': orgs_paginated.pages,
                'has_prev': orgs_paginated.has_prev,
                'has_next': orgs_paginated.has_next
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting organizations: {str(e)}")
        return jsonify({'error': 'Failed to get organizations'}), 500


@bp.route('/organizations/<int:org_id>', methods=['GET'])
@require_super_admin
def get_organization_details(org_id):
    """Get detailed information about a specific organization"""
    try:
        org = Organization.query.get(org_id)
        if not org:
            return jsonify({'error': 'Organization not found'}), 404
        
        org_data = org.to_dict()
        
        # Get user breakdown by role
        role_counts = db.session.query(
            User.role,
            func.count(User.id).label('count')
        ).filter(User.organization_id == org_id).group_by(User.role).all()
        
        # Get recent activity (users created in last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        user_trends = db.session.query(
            func.date(User.created_at).label('date'),
            func.count(User.id).label('count')
        ).filter(
            User.organization_id == org_id,
            User.created_at >= thirty_days_ago
        ).group_by(func.date(User.created_at)).order_by('date').all()
        
        # Get patient count if available
        try:
            patient_count = Patient.query.filter_by(organization_id=org_id).count()
            recent_patients = Patient.query.filter(
                Patient.organization_id == org_id,
                Patient.created_at >= thirty_days_ago
            ).count()
        except:
            patient_count = 0
            recent_patients = 0
        
        # Get lab test count
        try:
            lab_test_count = db.session.query(LabTest).join(Patient).filter(
                Patient.organization_id == org_id
            ).count()
        except:
            lab_test_count = 0
        
        org_data.update({
            'role_breakdown': {role: count for role, count in role_counts},
            'user_trends': [{'date': str(date), 'count': count} for date, count in user_trends],
            'patient_count': patient_count,
            'recent_patients': recent_patients,
            'lab_test_count': lab_test_count,
            'address': org.address,
            'phone': org.phone,
            'email': org.email,
            'website': org.website,
            'subscription_plan': org.subscription_plan
        })
        
        return jsonify({'organization': org_data}), 200
        
    except Exception as e:
        logger.error(f"Error getting organization details: {str(e)}")
        return jsonify({'error': 'Failed to get organization details'}), 500


@bp.route('/organizations/<int:org_id>/toggle-status', methods=['POST'])
@require_super_admin
def toggle_organization_status(org_id):
    """Enable or disable an organization"""
    try:
        org = Organization.query.get(org_id)
        if not org:
            return jsonify({'error': 'Organization not found'}), 404
        
        org.is_active = not org.is_active
        status = 'enabled' if org.is_active else 'disabled'
        
        db.session.commit()
        
        logger.info(f"Organization {org.code} has been {status}")
        
        return jsonify({
            'message': f'Organization {org.name} has been {status}',
            'organization': org.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error toggling organization status: {str(e)}")
        return jsonify({'error': 'Failed to update organization status'}), 500


@bp.route('/organizations', methods=['POST'])
@require_super_admin
def create_organization():
    """Create a new organization"""
    try:
        data = request.get_json()
        
        required_fields = ['code', 'name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if code already exists
        existing = Organization.query.filter_by(code=data['code'].upper()).first()
        if existing:
            return jsonify({'error': 'Organization code already exists'}), 400
        
        org = Organization(
            code=data['code'],
            name=data['name'],
            description=data.get('description'),
            organization_type=data.get('organization_type', 'clinic'),
            address=data.get('address'),
            phone=data.get('phone'),
            email=data.get('email'),
            website=data.get('website'),
            subscription_plan=data.get('subscription_plan', 'basic'),
            max_users=data.get('max_users', 50)
        )
        
        db.session.add(org)
        db.session.commit()
        
        logger.info(f"Created new organization: {org.code}")
        
        return jsonify({
            'message': 'Organization created successfully',
            'organization': org.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating organization: {str(e)}")
        return jsonify({'error': 'Failed to create organization'}), 500


@bp.route('/organizations/<int:org_id>', methods=['PUT'])
@require_super_admin
def update_organization(org_id):
    """Update an organization's details"""
    try:
        org = Organization.query.get(org_id)
        if not org:
            return jsonify({'error': 'Organization not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        updatable_fields = ['name', 'description', 'organization_type', 'address', 
                           'phone', 'email', 'website', 'subscription_plan', 'max_users']
        
        for field in updatable_fields:
            if field in data:
                setattr(org, field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Organization updated successfully',
            'organization': org.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating organization: {str(e)}")
        return jsonify({'error': 'Failed to update organization'}), 500


@bp.route('/organizations/<int:org_id>/users', methods=['GET'])
@require_super_admin
def get_organization_users(org_id):
    """Get all users in a specific organization"""
    try:
        org = Organization.query.get(org_id)
        if not org:
            return jsonify({'error': 'Organization not found'}), 404
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        role = request.args.get('role', 'all')
        
        query = User.query.filter_by(organization_id=org_id)
        
        if role != 'all':
            query = query.filter(User.role == role)
        
        query = query.order_by(User.created_at.desc())
        users_paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        
        users_data = [user.to_dict() for user in users_paginated.items]
        
        return jsonify({
            'users': users_data,
            'organization': org.to_dict(),
            'pagination': {
                'page': users_paginated.page,
                'per_page': users_paginated.per_page,
                'total': users_paginated.total,
                'pages': users_paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting organization users: {str(e)}")
        return jsonify({'error': 'Failed to get organization users'}), 500


@bp.route('/users/<int:user_id>/toggle-status', methods=['POST'])
@require_super_admin
def toggle_user_status(user_id):
    """Enable or disable any user"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Prevent disabling super admins
        if user.role == 'super_admin':
            return jsonify({'error': 'Cannot disable super admin users'}), 400
        
        user.is_active = not user.is_active
        status = 'enabled' if user.is_active else 'disabled'
        
        db.session.commit()
        
        return jsonify({
            'message': f'User {user.username} has been {status}',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error toggling user status: {str(e)}")
        return jsonify({'error': 'Failed to update user status'}), 500


@bp.route('/activity/recent', methods=['GET'])
@require_super_admin
def get_recent_activity():
    """Get recent platform activity"""
    try:
        days = request.args.get('days', 7, type=int)
        since = datetime.utcnow() - timedelta(days=days)
        
        # Recent new organizations
        new_orgs = Organization.query.filter(
            Organization.created_at >= since
        ).order_by(Organization.created_at.desc()).limit(10).all()
        
        # Recent new users
        new_users = User.query.filter(
            User.created_at >= since
        ).order_by(User.created_at.desc()).limit(20).all()
        
        # Daily registration trends
        daily_orgs = db.session.query(
            func.date(Organization.created_at).label('date'),
            func.count(Organization.id).label('count')
        ).filter(Organization.created_at >= since).group_by(
            func.date(Organization.created_at)
        ).order_by('date').all()
        
        daily_users = db.session.query(
            func.date(User.created_at).label('date'),
            func.count(User.id).label('count')
        ).filter(User.created_at >= since).group_by(
            func.date(User.created_at)
        ).order_by('date').all()
        
        return jsonify({
            'activity': {
                'new_organizations': [org.to_dict() for org in new_orgs],
                'new_users': [{
                    'id': u.id,
                    'username': u.username,
                    'email': u.email,
                    'role': u.role,
                    'organization_id': u.organization_id,
                    'created_at': u.created_at.isoformat()
                } for u in new_users],
                'trends': {
                    'organizations': [{'date': str(d), 'count': c} for d, c in daily_orgs],
                    'users': [{'date': str(d), 'count': c} for d, c in daily_users]
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting recent activity: {str(e)}")
        return jsonify({'error': 'Failed to get recent activity'}), 500
