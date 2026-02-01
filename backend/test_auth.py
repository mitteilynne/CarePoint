# Test the authentication system
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User

def test_user_model():
    """Test the User model functionality"""
    app = create_app('default')
    
    with app.app_context():
        print("🧪 Testing User Model...")
        
        # Test user creation with validation
        try:
            user = User(
                username='testuser',
                email='test@example.com',
                password='SecurePass123!',
                full_name='Test User',
                role='patient'
            )
            print("✅ User creation successful")
        except Exception as e:
            print(f"❌ User creation failed: {e}")
            return
        
        # Test password validation
        print("\n🔐 Testing password validation...")
        
        # Valid password
        try:
            User.validate_password('SecurePass123!')
            print("✅ Valid password accepted")
        except Exception as e:
            print(f"❌ Valid password rejected: {e}")
        
        # Invalid passwords
        invalid_passwords = [
            'short',  # Too short
            'nouppercase123',  # No uppercase
            'NOLOWERCASE123',  # No lowercase
            'NoNumbers!',  # No numbers
            'NoSpecialChar123',  # No special characters
        ]
        
        for pwd in invalid_passwords:
            try:
                User.validate_password(pwd)
                print(f"❌ Invalid password '{pwd}' was accepted")
            except Exception:
                print(f"✅ Invalid password '{pwd}' correctly rejected")
        
        # Test role permissions
        print("\n👥 Testing role permissions...")
        
        roles_permissions = {
            'patient': ['view_profile', 'update_profile'],
            'doctor': ['view_profile', 'update_profile', 'view_patients', 'manage_appointments'],
            'admin': ['view_profile', 'update_profile', 'view_patients', 'manage_appointments', 'manage_users', 'system_admin']
        }
        
        for role, expected_perms in roles_permissions.items():
            user.role = role
            actual_perms = user.get_permissions()
            if set(expected_perms) == set(actual_perms):
                print(f"✅ {role.capitalize()} permissions correct: {actual_perms}")
            else:
                print(f"❌ {role.capitalize()} permissions incorrect. Expected: {expected_perms}, Got: {actual_perms}")
        
        print("\n🎉 User model testing completed!")

def test_database_connection():
    """Test database connection"""
    app = create_app('default')
    
    with app.app_context():
        print("🗄️  Testing database connection...")
        
        try:
            # Try to execute a simple query using text() for SQLAlchemy 2.0
            from sqlalchemy import text
            result = db.session.execute(text('SELECT 1'))
            print("✅ Database connection successful")
            return True
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            print("\n💡 To fix this:")
            print("1. Make sure PostgreSQL is running")
            print("2. Check database credentials in config/config.py")
            print("3. Create the database: createdb carepoint_db")
            print("4. Run: flask db init && flask db migrate && flask db upgrade")
            return False

if __name__ == '__main__':
    print("🚀 CarePoint Backend Authentication Test")
    print("=" * 50)
    
    # Test database connection first
    if test_database_connection():
        # Test user model functionality
        test_user_model()
    else:
        print("\n⚠️  Skipping user model tests due to database connection issues")
    
    print("\n📝 Next Steps:")
    print("1. Fix database connection if needed")
    print("2. Run database migrations: flask db init && flask db migrate && flask db upgrade")
    print("3. Test API endpoints using a tool like Postman or curl")
    print("4. Register a test user via POST /api/auth/register")
    print("5. Login to get JWT token via POST /api/auth/login")