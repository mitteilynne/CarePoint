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
                username=data['username'].lower().strip(),
                email=data['email'].lower().strip(),
                first_name=data['first_name'].strip(),
                last_name=data['last_name'].strip(),
                role=data.get('role', 'patient')  # Default role
            )
            user.set_password(data['password'])
            
            db.session.add(user)
            db.session.commit()
            
            logger.info(f"New user registered: {user.email} in organization {organization.name}")
            
            # Create tokens
            access_token = create_access_token(
                identity=user.id,
                expires_delta=timedelta(hours=24)
            )
            refresh_token = create_refresh_token(identity=user.id)
            
            return jsonify({
                'message': 'User registered successfully',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role,
                    'organization_id': user.organization_id,
                    'organization_name': user.organization.name,
                    'organization_code': user.organization.code
                }
            }), 201
            
        except IntegrityError as e:
            db.session.rollback()
            logger.error(f"Database integrity error during registration: {str(e)}")
            return jsonify({'error': 'Registration failed. User may already exist.'}), 400
            
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500

@bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        
        # Validate required fields
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
            identity=user.id,
            expires_delta=timedelta(hours=24)
        )
        refresh_token = create_refresh_token(identity=user.id)
        
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
                'organization_id': user.organization_id,
                'organization_name': user.organization.name,
                'organization_code': user.organization.code
            }
        })
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout endpoint"""
    try:
        token = get_jwt()
        blacklisted_tokens.add(token['jti'])
        
        logger.info(f"User logged out")
        
        return jsonify({'message': 'Successfully logged out'})
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({'error': 'Logout failed'}), 500

@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token endpoint"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if user still exists and is active
        user = User.query.get(current_user_id)
        if not user or not user.organization.is_active:
            return jsonify({'error': 'User not found or inactive'}), 404
        
        new_access_token = create_access_token(
            identity=current_user_id,
            expires_delta=timedelta(hours=24)
        )
        
        return jsonify({'access_token': new_access_token})
        
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return jsonify({'error': 'Token refresh failed'}), 500

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
                'organization_id': user.organization_id,
                'organization_name': user.organization.name,
                'organization_code': user.organization.code
            }
        })
        
    except Exception as e:
        logger.error(f"Get current user error: {str(e)}")
        return jsonify({'error': 'Failed to get user information'}), 500

@bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset"""
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # Don't reveal if email exists or not
            return jsonify({'message': 'If the email exists, a password reset link will be sent'}), 200
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        # Delete any existing password reset tokens for this user
        PasswordReset.query.filter_by(user_id=user.id).delete()
        
        # Create new password reset token
        password_reset = PasswordReset(
            user_id=user.id,
            token=reset_token,
            expires_at=expires_at
        )
        
        db.session.add(password_reset)
        db.session.commit()
        
        # In a real application, you would send an email here
        logger.info(f"Password reset requested for user: {user.email}")
        
        return jsonify({
            'message': 'If the email exists, a password reset link will be sent',
            'reset_token': reset_token  # Remove this in production!
        }), 200
        
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        return jsonify({'error': 'Password reset request failed'}), 500

@bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password with token"""
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('password')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400
        
        # Find valid reset token
        password_reset = PasswordReset.query.filter_by(
            token=token,
            used=False
        ).first()
        
        if not password_reset or password_reset.is_expired():
            return jsonify({'error': 'Invalid or expired reset token'}), 400
        
        # Update user password
        user = password_reset.user
        user.set_password(new_password)
        
        # Mark token as used
        password_reset.used = True
        password_reset.used_at = datetime.utcnow()
        
        db.session.commit()
        
        logger.info(f"Password reset completed for user: {user.email}")
        
        return jsonify({'message': 'Password has been reset successfully'}), 200
        
    except Exception as e:
        logger.error(f"Reset password error: {str(e)}")
        return jsonify({'error': 'Password reset failed'}), 500
