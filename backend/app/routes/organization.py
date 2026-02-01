from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app import db
from app.models import Organization, User
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bp = Blueprint('organization', __name__, url_prefix='/api/organization')

def require_admin_role():
    """Decorator to require admin role"""
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin role required'}), 403
    return None

@bp.route('', methods=['POST'])
@jwt_required()
def create_organization():
    """Create a new organization (admin only)"""
    try:
        # Check admin role
        error_response = require_admin_role()
        if error_response:
            return error_response
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['code', 'name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if organization code already exists
        existing_org = Organization.query.filter_by(code=data['code'].upper()).first()
        if existing_org:
            return jsonify({'error': 'Organization code already exists'}), 400
        
        # Create organization
        try:
            organization = Organization(
                code=data['code'],
                name=data['name'],
                description=data.get('description'),
                address=data.get('address'),
                phone=data.get('phone'),
                email=data.get('email'),
                website=data.get('website'),
                organization_type=data.get('organization_type', 'clinic'),
                max_users=data.get('max_users', 50),
                subscription_plan=data.get('subscription_plan', 'basic')
            )
            
            db.session.add(organization)
            db.session.commit()
            
            logger.info(f'New organization created: {organization.code} - {organization.name}')
            return jsonify({
                'message': 'Organization created successfully',
                'organization': organization.to_dict()
            }), 201
            
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
            
    except Exception as e:
        logger.error(f'Create organization error: {str(e)}')
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('', methods=['GET'])
@jwt_required()
def get_organizations():
    """Get list of organizations"""
    try:
        claims = get_jwt()
        
        if claims.get('role') == 'admin':
            # Admins can see all organizations
            organizations = Organization.query.all()
        else:
            # Regular users can only see their organization
            org_id = claims.get('organization_id')
            if not org_id:
                return jsonify({'error': 'Organization not found in token'}), 400
            
            organizations = Organization.query.filter_by(id=org_id).all()
        
        return jsonify({
            'organizations': [org.to_dict() for org in organizations]
        }), 200
        
    except Exception as e:
        logger.error(f'Get organizations error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:org_id>', methods=['GET'])
@jwt_required()
def get_organization(org_id):
    """Get specific organization"""
    try:
        claims = get_jwt()
        
        # Check if user can access this organization
        if claims.get('role') != 'admin' and claims.get('organization_id') != org_id:
            return jsonify({'error': 'Access denied'}), 403
        
        organization = Organization.query.get(org_id)
        if not organization:
            return jsonify({'error': 'Organization not found'}), 404
        
        return jsonify({'organization': organization.to_dict()}), 200
        
    except Exception as e:
        logger.error(f'Get organization error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:org_id>', methods=['PUT'])
@jwt_required()
def update_organization(org_id):
    """Update organization (admin only)"""
    try:
        # Check admin role
        error_response = require_admin_role()
        if error_response:
            return error_response
        
        organization = Organization.query.get(org_id)
        if not organization:
            return jsonify({'error': 'Organization not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        updatable_fields = ['name', 'description', 'address', 'phone', 'email', 
                           'website', 'organization_type', 'max_users', 'subscription_plan']
        
        for field in updatable_fields:
            if field in data:
                setattr(organization, field, data[field])
        
        # Handle activation/deactivation
        if 'is_active' in data:
            organization.is_active = bool(data['is_active'])
        
        try:
            db.session.commit()
            logger.info(f'Organization updated: {organization.code}')
            return jsonify({
                'message': 'Organization updated successfully',
                'organization': organization.to_dict()
            }), 200
        except Exception as e:
            db.session.rollback()
            raise e
            
    except Exception as e:
        logger.error(f'Update organization error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:org_id>/users', methods=['GET'])
@jwt_required()
def get_organization_users(org_id):
    """Get users in organization"""
    try:
        claims = get_jwt()
        
        # Check if user can access this organization
        if claims.get('role') != 'admin' and claims.get('organization_id') != org_id:
            return jsonify({'error': 'Access denied'}), 403
        
        organization = Organization.query.get(org_id)
        if not organization:
            return jsonify({'error': 'Organization not found'}), 404
        
        users = User.query.filter_by(organization_id=org_id, is_active=True).all()
        
        return jsonify({
            'users': [user.to_dict() for user in users],
            'total_count': len(users),
            'max_users': organization.max_users
        }), 200
        
    except Exception as e:
        logger.error(f'Get organization users error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/validate-code', methods=['POST'])
def validate_organization_code():
    """Validate organization code (public endpoint)"""
    try:
        data = request.get_json()
        
        if not data.get('code'):
            return jsonify({'error': 'Organization code is required'}), 400
        
        organization = Organization.find_by_code(data['code'])
        
        if not organization:
            return jsonify({'valid': False, 'error': 'Organization not found'}), 200
        
        if not organization.is_active:
            return jsonify({'valid': False, 'error': 'Organization is not active'}), 200
        
        if not organization.can_add_user():
            return jsonify({'valid': False, 'error': 'Organization has reached its user limit'}), 200
        
        return jsonify({
            'valid': True,
            'organization': {
                'name': organization.name,
                'type': organization.organization_type
            }
        }), 200
        
    except Exception as e:
        logger.error(f'Validate organization code error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500