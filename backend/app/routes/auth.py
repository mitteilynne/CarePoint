from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, 
    get_jwt_identity, get_jwt
)
from sqlalchemy.exc import IntegrityError
from app import db
from app.models import User, Organization, PasswordReset
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
        
        if not organization.can_add_user():
            return jsonify({'error': 'Organization has reached its user limit'}), 400
        
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
        try:
            user = User(
                organization_id=organization.id,
                username=data['username'],
                email=data['email'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                role=data.get('role', 'patient'),
                phone=data.get('phone'),
                address=data.get('address')
            )
            user.set_password(data['password'])
            
            # Validate role if provided
            if data.get('role'):
                user.validate_role(data['role'])
                user.role = data['role']
            
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        
        try:
            db.session.add(user)
            db.session.commit()
            logger.info(f'New user registered: {user.username} ({user.email}) - Org: {organization.code}')
        except IntegrityError:
            db.session.rollback()
            return jsonify({'error': 'Username or email already exists in this organization'}), 400
        
        # Create tokens with organization context
        additional_claims = {
            'role': user.role,
            'organization_id': organization.id,
            'organization_code': organization.code
        }
        
        access_token = create_access_token(
            identity=user.id,
            expires_delta=timedelta(hours=1),
            additional_claims=additional_claims
        )
        refresh_token = create_refresh_token(
            identity=user.id,
            expires_delta=timedelta(days=30)
        )
        
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f'Registration error: {str(e)}')
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/login', methods=['POST'])
def login():
    """User login endpoint with organization support"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['organization_code', 'login', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field.replace("_", " ").title()} is required'}), 400
        
        # Find and validate organization
        organization = Organization.find_by_code(data['organization_code'])
        if not organization:
            logger.warning(f'Login attempt with invalid organization code: {data["organization_code"]}')
            return jsonify({'error': 'Invalid organization code'}), 401
        
        if not organization.is_active:
            logger.warning(f'Login attempt for inactive organization: {organization.code}')
            return jsonify({'error': 'Organization is not active'}), 403
        
        # Find user within organization
        login_value = data['login'].lower().strip()
        user = User.find_by_login_and_organization(organization.id, login_value)
        
        if not user:
            logger.warning(f'Login attempt with non-existent user: {login_value} in org: {organization.code}')
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.check_password(data['password']):
            logger.warning(f'Failed login attempt for user: {user.username} in org: {organization.code}')
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.is_active:
            logger.warning(f'Login attempt for inactive user: {user.username}')
            return jsonify({'error': 'Account is disabled'}), 403
        
        # Create tokens with organization context
        additional_claims = {
            'role': user.role,
            'organization_id': organization.id,
            'organization_code': organization.code
        }
        
        access_token = create_access_token(
            identity=user.id,
            expires_delta=timedelta(hours=1),
            additional_claims=additional_claims
        )
        refresh_token = create_refresh_token(
            identity=user.id,
            expires_delta=timedelta(days=30)
        )
        
        logger.info(f'Successful login: {user.username} in org: {organization.code}')
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f'Login error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """Refresh access token endpoint"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active:
            return jsonify({'error': 'Invalid user'}), 401
        
        # Create new access token
        new_token = create_access_token(
            identity=user.id,
            expires_delta=timedelta(hours=1),
            additional_claims={'role': user.role}
        )
        
        return jsonify({
            'access_token': new_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f'Token refresh error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout endpoint"""
    try:
        jti = get_jwt()['jti']
        blacklisted_tokens.add(jti)
        logger.info('User logged out successfully')
        return jsonify({'message': 'Successfully logged out'}), 200
    except Exception as e:
        logger.error(f'Logout error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if not user.is_active:
            return jsonify({'error': 'Account is disabled'}), 403
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        logger.error(f'Get profile error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if not user.is_active:
            return jsonify({'error': 'Account is disabled'}), 403
        
        data = request.get_json()
        
        # Update allowed fields
        updatable_fields = ['first_name', 'last_name', 'phone', 'address']
        
        for field in updatable_fields:
            if field in data:
                try:
                    if field in ['first_name', 'last_name'] and data[field]:
                        User.validate_name(data[field], field.replace('_', ' ').title())
                    setattr(user, field, data[field])
                except ValueError as e:
                    return jsonify({'error': str(e)}), 400
        
        try:
            db.session.commit()
            logger.info(f'Profile updated for user: {user.username}')
            return jsonify({
                'message': 'Profile updated successfully',
                'user': user.to_dict()
            }), 200
        except Exception as e:
            db.session.rollback()
            raise e
        
    except Exception as e:
        logger.error(f'Update profile error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        # Check current password
        if not user.check_password(data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        # Validate and set new password
        try:
            user.set_password(data['new_password'])
            db.session.commit()
            logger.info(f'Password changed for user: {user.username}')
            return jsonify({'message': 'Password changed successfully'}), 200
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        
    except Exception as e:
        logger.error(f'Change password error: {str(e)}')
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

# Check if token is blacklisted
@bp.before_app_request
def check_if_token_revoked():
    pass  # Would implement token blacklist check here in production

@bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('organization_code') or not data.get('email'):
            return jsonify({'error': 'Organization code and email are required'}), 400
        
        # Find and validate organization
        organization = Organization.find_by_code(data['organization_code'])
        if not organization:
            # Return success even for invalid org to prevent enumeration
            return jsonify({'message': 'If the email exists, password reset instructions have been sent'}), 200
        
        # Find user within organization
        user = User.find_by_email_and_organization(organization.id, data['email'])
        if not user or not user.is_active:
            # Return success even for invalid user to prevent enumeration
            return jsonify({'message': 'If the email exists, password reset instructions have been sent'}), 200
        
        # Generate secure reset token
        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
        
        # Create password reset record
        password_reset = PasswordReset(
            organization_id=organization.id,
            user_id=user.id,
            token=reset_token,
            expires_at=expires_at
        )
        
        try:
            # Remove any existing reset tokens for this user
            PasswordReset.query.filter_by(user_id=user.id, used=False).update({'used': True})
            
            db.session.add(password_reset)
            db.session.commit()
            
            # In a real application, you would send an email here
            # For now, we'll just log the token for development
            logger.info(f'Password reset requested for user: {user.email} in org: {organization.code}')
            logger.info(f'Reset token: {reset_token}')  # Remove this in production
            
            return jsonify({
                'message': 'If the email exists, password reset instructions have been sent',
                # Remove this in production - only for development
                'reset_token': reset_token,
                'reset_url': f'/reset-password?token={reset_token}'
            }), 200
            
        except Exception as e:
            db.session.rollback()
            raise e
            
    except Exception as e:
        logger.error(f'Forgot password error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password using token"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('token') or not data.get('password'):
            return jsonify({'error': 'Reset token and new password are required'}), 400
        
        # Find and validate reset token
        password_reset = PasswordReset.find_valid_token(data['token'])
        if not password_reset:
            return jsonify({'error': 'Invalid or expired reset token'}), 400
        
        # Get user and validate
        user = User.query.get(password_reset.user_id)
        if not user or not user.is_active:
            return jsonify({'error': 'User account not found or disabled'}), 400
        
        # Validate and set new password
        try:
            user.set_password(data['password'])
            password_reset.mark_as_used()
            
            db.session.commit()
            logger.info(f'Password reset completed for user: {user.username}')
            
            return jsonify({'message': 'Password reset successfully'}), 200
            
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
            
    except Exception as e:
        logger.error(f'Reset password error: {str(e)}')
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/organizations', methods=['GET'])
def get_organizations():
    """Get list of active organizations (for development/admin purposes)"""
    try:
        organizations = Organization.query.filter_by(is_active=True).all()
        return jsonify({
            'organizations': [org.to_dict() for org in organizations]
        }), 200
    except Exception as e:
        logger.error(f'Get organizations error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500