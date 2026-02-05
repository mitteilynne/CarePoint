"""
Create a demo pharmacist account for testing
"""
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.user import User
from app.models.organization import Organization

def create_demo_pharmacist():
    """Create a demo pharmacist account"""
    app = create_app()
    
    with app.app_context():
        # Get the first organization (or create a test one)
        org = Organization.query.first()
        
        if not org:
            print("No organization found. Please create an organization first.")
            return
        
        print(f"Using organization: {org.name} (Code: {org.code})")
        
        # Check if pharmacist already exists
        existing_pharmacist = User.query.filter_by(
            organization_id=org.id,
            username='pharmacist'
        ).first()
        
        if existing_pharmacist:
            print(f"Pharmacist account already exists: {existing_pharmacist.username}")
            return
        
        # Create pharmacist
        pharmacist = User(
            username='pharmacist',
            email='pharmacist@example.com',
            first_name='John',
            last_name='Smith',
            organization_id=org.id,
            role='pharmacist',
            phone='555-0103',
            is_active=True,
            email_confirmed=True
        )
        pharmacist.set_password('pharmacist123')
        
        db.session.add(pharmacist)
        db.session.commit()
        
        print("\n" + "="*60)
        print("Demo Pharmacist Account Created Successfully!")
        print("="*60)
        print(f"\nOrganization: {org.name}")
        print(f"Organization Code: {org.code}")
        print(f"\nPharmacist Login Credentials:")
        print(f"Username: pharmacist")
        print(f"Password: pharmacist123")
        print(f"Email: pharmacist@example.com")
        print(f"Name: {pharmacist.first_name} {pharmacist.last_name}")
        print(f"Role: {pharmacist.role}")
        print("="*60)

if __name__ == '__main__':
    create_demo_pharmacist()
