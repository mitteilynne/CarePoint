from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, 
    get_jwt_identity, get_jwt
)
from sqlalchemy.exc import IntegrityError
from app import db
from app.models import User, Organization, PasswordReset, FacilityRegistrationRequest
from datetime import timedelta, datetime
import logging
import secrets
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bp = Blueprint('auth', __name__, url_prefix='/api/auth')
auth_bp = bp  # Create alias for consistency

# JWT token blacklist (in production, use Redis or database)
blacklisted_tokens = set()

@bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['organization_code', 'username', 'email', 'password', 'first_name', 'last_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field.replace("_", " ").title()} is required'}), 400
        
        # Find and validate organization
        organization = Organization.find_by_code(data['organization_code'])
        if not organization:
            return jsonify({'error': 'Invalid organization code'}), 400
        
        if not organization.is_active:
            return jsonify({'error': 'Organization is not active'}), 400
        
        # Check if user already exists within organization
        existing_user = User.query.filter(
            User.organization_id == organization.id,
            (User.email == data['email'].lower().strip()) | 
            (User.username == data['username'].lower().strip())
        ).first()
        
        if existing_user:
            if existing_user.email == data['email'].lower().strip():
                return jsonify({'error': 'Email already registered in this organization'}), 400
            else:
                return jsonify({'error': 'Username already taken in this organization'}), 400
        
        # Validate and create new user
        user = User(
            organization_id=organization.id,
            username=data['username'].lower().strip(),
            email=data['email'].lower().strip(),
            first_name=data['first_name'].strip(),
            last_name=data['last_name'].strip(),
            role=data.get('role', 'patient')  # Default role
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        logger.info(f"New user registered: {user.email} in organization {organization.code}")
        
        return jsonify({
            'message': 'User registered successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'organization_code': user.organization.code
            }
        }), 201
        
    except IntegrityError:
        db.session.rollback()
        logger.error(f"Database integrity error during registration")
        return jsonify({'error': 'User already exists'}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500

@bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        
        # Check for super admin login (no organization code needed)
        if data.get('username') and data.get('password') and not data.get('organization_code'):
            # Try to find a super admin user
            user = User.query.filter_by(
                username=data['username'].strip(),
                role='super_admin'
            ).first()
            
            if user and user.check_password(data['password']):
                # Super admin login successful
                access_token = create_access_token(
                    identity=str(user.id),
                    expires_delta=timedelta(hours=24)
                )
                refresh_token = create_refresh_token(identity=str(user.id))
                
                logger.info(f"Super Admin logged in: {user.email}")
                
                return jsonify({
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'role': user.role,
                        'organization_code': None,
                        'organization_name': 'Platform Administration'
                    }
                })
        
        # Validate required fields for regular login
        if not data.get('organization_code') or not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Organization code, username and password are required'}), 400
        
        # Find organization first
        organization = Organization.find_by_code(data['organization_code'])
        if not organization:
            return jsonify({'error': 'Invalid organization code'}), 401
            
        if not organization.is_active:
            return jsonify({'error': 'Organization is inactive'}), 403
        
        # Find user within the organization
        user = User.query.filter_by(
            username=data['username'].strip(),
            organization_id=organization.id
        ).first()
        
        if not user:
            return jsonify({'error': 'Invalid username or password'}), 401
        
        if not user.check_password(data['password']):
            return jsonify({'error': 'Invalid username or password'}), 401

        # Create tokens
        access_token = create_access_token(
            identity=str(user.id),  # Convert to string
            expires_delta=timedelta(hours=24)
        )
        refresh_token = create_refresh_token(identity=str(user.id))  # Convert to string
        
        logger.info(f"User logged in: {user.email}")
        
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'organization_code': user.organization.code,
                'organization_name': user.organization.name
            }
        })
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh token endpoint"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    new_access_token = create_access_token(
        identity=user.id,
        expires_delta=timedelta(hours=24)
    )
    
    return jsonify({
        'access_token': new_access_token
    })

@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout endpoint"""
    jti = get_jwt()['jti']
    blacklisted_tokens.add(jti)
    return jsonify({'message': 'Successfully logged out'})

@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user information"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'organization_code': user.organization.code,
                'organization_name': user.organization.name
            }
        })
        
    except Exception as e:
        logger.error(f"Get user error: {str(e)}")
        return jsonify({'error': 'Failed to get user information'}), 500


@bp.route('/facility-registration', methods=['POST'])
def facility_registration():
    """Submit facility registration request"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = [
            'facility_name', 'facility_type', 'address', 'phone', 'email',
            'contact_person_name', 'contact_person_email', 'contact_person_phone'
        ]
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field.replace("_", " ").title()} is required'}), 400
        
        # Check if facility already has a pending or approved request
        existing_request = FacilityRegistrationRequest.query.filter(
            (FacilityRegistrationRequest.email == data['email'].lower().strip()) |
            (FacilityRegistrationRequest.facility_name == data['facility_name'].strip())
        ).filter(
            FacilityRegistrationRequest.status.in_(['pending', 'approved'])
        ).first()
        
        if existing_request:
            if existing_request.status == 'approved':
                return jsonify({'error': 'This facility is already registered'}), 400
            else:
                return jsonify({'error': 'A registration request for this facility is already pending'}), 400
        
        # Create new facility registration request
        facility_request = FacilityRegistrationRequest(
            facility_name=data['facility_name'].strip(),
            facility_type=data['facility_type'],
            address=data['address'].strip(),
            phone=data['phone'].strip(),
            email=data['email'].lower().strip(),
            website=data.get('website', '').strip() if data.get('website') else None,
            contact_person_name=data['contact_person_name'].strip(),
            contact_person_email=data['contact_person_email'].lower().strip(),
            contact_person_phone=data['contact_person_phone'].strip(),
            contact_person_position=data.get('contact_person_position', '').strip() if data.get('contact_person_position') else None,
            description=data.get('description', '').strip() if data.get('description') else None,
            number_of_staff=data.get('number_of_staff'),
            status='pending'
        )
        
        db.session.add(facility_request)
        db.session.commit()
        
        logger.info(f"New facility registration request submitted: {facility_request.facility_name}")
        
        return jsonify({
            'message': 'Facility registration request submitted successfully. Our team will review and contact you soon.',
            'request': facility_request.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Facility registration error: {str(e)}")
        return jsonify({'error': 'Failed to submit registration request'}), 500