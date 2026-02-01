from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, 
    get_jwt_identity, get_jwt
)
from sqlalchemy.exc import IntegrityError
from app import db
<<<<<<< Updated upstream
from app.models import User, Organization, PasswordReset
from datetime import timedelta, datetime
import logging
import secrets
import uuid
=======
<<<<<<< HEAD
from app.models import User
from datetime import timedelta
import logging
=======
from app.models import User, Organization, PasswordReset
from datetime import timedelta, datetime
import logging
import secrets
import uuid
>>>>>>> side
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
        required_fields = ['organization_code', 'username', 'email', 'password', 'first_name', 'last_name']
=======
<<<<<<< HEAD
        required_fields = ['username', 'email', 'password', 'first_name', 'last_name']
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                organization_id=organization.id,
                username=data['username'].lower().strip(),
                email=data['email'].lower().strip(),
                first_name=data['first_name'].strip(),
                last_name=data['last_name'].strip(),
                role=data.get('role', 'patient')  # Default role
=======
=======
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
>>>>>>> side
                username=data['username'],
                email=data['email'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                role=data.get('role', 'patient'),
                phone=data.get('phone'),
                address=data.get('address')
>>>>>>> Stashed changes
            )
            user.set_password(data['password'])
            
            db.session.add(user)
            db.session.commit()
<<<<<<< Updated upstream
            
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
            
=======
<<<<<<< HEAD
            logger.info(f'New user registered: {user.username} ({user.email})')
        except IntegrityError:
            db.session.rollback()
            return jsonify({'error': 'Username or email already exists'}), 400
        
        # Create tokens
        access_token = create_access_token(
            identity=user.id,
            expires_delta=timedelta(hours=1),
            additional_claims={'role': user.role}
=======
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
>>>>>>> side
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
        
>>>>>>> Stashed changes
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500

@bp.route('/login', methods=['POST'])
def login():
<<<<<<< HEAD
    """User login endpoint"""
=======
    """User login endpoint with organization support"""
>>>>>>> side
    try:
        data = request.get_json()
        
        # Validate required fields
<<<<<<< Updated upstream
        if not data.get('organization_code') or not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Organization code, username and password are required'}), 400
=======
<<<<<<< HEAD
        if not data.get('login') or not data.get('password'):
            return jsonify({'error': 'Login and password are required'}), 400
>>>>>>> Stashed changes
        
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
<<<<<<< Updated upstream
            return jsonify({'error': 'Invalid username or password'}), 401
=======
            logger.warning(f'Failed login attempt for user: {user.username}')
=======
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
>>>>>>> side
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.is_active:
            logger.warning(f'Login attempt for inactive user: {user.username}')
            return jsonify({'error': 'Account is disabled'}), 403
>>>>>>> Stashed changes
        
<<<<<<< HEAD
        # Create tokens
        access_token = create_access_token(
            identity=user.id,
<<<<<<< Updated upstream
            expires_delta=timedelta(hours=24)
=======
            expires_delta=timedelta(hours=1),
            additional_claims={'role': user.role}
=======
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
>>>>>>> side
        )
        refresh_token = create_refresh_token(
            identity=user.id,
            expires_delta=timedelta(days=30)
>>>>>>> Stashed changes
        )
        refresh_token = create_refresh_token(identity=user.id)
        
        logger.info(f"User logged in: {user.email}")
        
<<<<<<< Updated upstream
=======
<<<<<<< HEAD
        logger.info(f'Successful login: {user.username}')
=======
        logger.info(f'Successful login: {user.username} in org: {organization.code}')
>>>>>>> side
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
# Check if token is blacklisted
@bp.before_app_request
def check_if_token_revoked():
<<<<<<< HEAD
    pass  # Would implement token blacklist check here in production
=======
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
>>>>>>> side
>>>>>>> Stashed changes
