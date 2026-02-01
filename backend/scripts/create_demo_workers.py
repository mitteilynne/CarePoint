"""
Create DEMO organization and facility worker accounts for testing
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User, Organization
from werkzeug.security import generate_password_hash

def create_demo_organization():
    """Create DEMO organization"""
    print("Creating DEMO organization...")
    
    # Check if DEMO org already exists
    demo_org = Organization.query.filter_by(code='DEMO123').first()
    if demo_org:
        print("DEMO organization already exists")
        return demo_org
    
    demo_org = Organization(
        name='DEMO',
        code='DEMO123',
        address='123 Demo Street, Demo City, DC 12345',
        phone='555-DEMO-123',
        email='info@demo.com',
        website='https://demo.com',
        registration_number='DEMO2026001',
        license_number='LIC-DEMO-2026',
        organization_type='hospital',
        status='active'
    )
    
    db.session.add(demo_org)
    db.session.commit()
    print(f"Created organization: {demo_org.name} ({demo_org.code})")
    return demo_org

def create_demo_workers(demo_org):
    """Create demo facility worker accounts"""
    print("Creating demo worker accounts...")
    
    # Demo worker accounts
    demo_workers = [
        {
            'username': 'admin',
            'email': 'admin@demo.com',
            'first_name': 'Admin',
            'last_name': 'User',
            'role': 'admin',
            'phone': '555-0001',
            'password': 'demo123'
        },
        {
            'username': 'doctor',
            'email': 'doctor@demo.com',
            'first_name': 'Doctor',
            'last_name': 'Smith',
            'role': 'doctor',
            'phone': '555-0002',
            'password': 'demo123'
        },
        {
            'username': 'pharmacist',
            'email': 'pharmacist@demo.com',
            'first_name': 'Pharma',
            'last_name': 'Jones',
            'role': 'pharmacist',
            'phone': '555-0003',
            'password': 'demo123'
        },
        {
            'username': 'lab',
            'email': 'lab@demo.com',
            'first_name': 'Lab',
            'last_name': 'Tech',
            'role': 'lab_technician',
            'phone': '555-0004',
            'password': 'demo123'
        },
        {
            'username': 'receptionist',
            'email': 'receptionist@demo.com',
            'first_name': 'Reception',
            'last_name': 'Desk',
            'role': 'receptionist',
            'phone': '555-0005',
            'password': 'demo123'
        }
    ]
    
    created_workers = []
    for worker_data in demo_workers:
        # Check if user already exists
        existing_user = User.query.filter_by(username=worker_data['username']).first()
        if existing_user:
            print(f"User {worker_data['username']} already exists")
            created_workers.append(existing_user)
            continue
        
        worker = User(
            organization_id=demo_org.id,
            username=worker_data['username'],
            email=worker_data['email'],
            first_name=worker_data['first_name'],
            last_name=worker_data['last_name'],
            role=worker_data['role'],
            phone=worker_data['phone'],
            is_active=True
        )
        worker.password_hash = generate_password_hash(worker_data['password'])
        
        db.session.add(worker)
        created_workers.append(worker)
        print(f"Created {worker_data['role']}: {worker_data['username']}")
    
    db.session.commit()
    print(f"Created {len(created_workers)} demo workers")
    return created_workers

def print_demo_credentials():
    """Print all demo account credentials"""
    print("\n" + "="*60)
    print("DEMO ORGANIZATION SETUP COMPLETE")
    print("="*60)
    print("\n🏥 ORGANIZATION DETAILS:")
    print("Organization Name: DEMO")
    print("Organization Code: DEMO123")
    print("Type: Hospital")
    
    print("\n👥 DEMO WORKER ACCOUNTS:")
    print("All passwords: demo123")
    print()
    print("🔐 ADMIN:")
    print("   Username: admin")
    print("   Role: Administrator - Full system access")
    print()
    print("👨‍⚕️ DOCTOR:")
    print("   Username: doctor") 
    print("   Role: Doctor - Patient consultations and medical records")
    print()
    print("💊 PHARMACIST:")
    print("   Username: pharmacist")
    print("   Role: Pharmacist - Medication management")
    print()
    print("🔬 LAB TECHNICIAN:")
    print("   Username: lab")
    print("   Role: Lab Technician - Laboratory operations")
    print()
    print("📋 RECEPTIONIST:")
    print("   Username: receptionist")
    print("   Role: Receptionist - Patient registration and queue management")
    
    print("\n🌐 ACCESS INSTRUCTIONS:")
    print("1. Frontend: http://localhost:3000")
    print("2. Backend API: http://127.0.0.1:5000")
    print("3. Login with any of the worker accounts above")
    print("4. Each role will have different permissions and dashboard views")
    
    print("\n📋 NOTE:")
    print("• Only facility workers can login to the system")
    print("• Patients are registered by receptionists but cannot login")
    print("• Role-based access control is enforced")
    print("• Organization data isolation is active")
    print("="*60)

def main():
    """Main function to create demo setup"""
    app = create_app()
    
    with app.app_context():
        print("Setting up DEMO organization and worker accounts...")
        print("="*50)
        
        # Create database tables
        db.create_all()
        
        # Create DEMO organization
        demo_org = create_demo_organization()
        
        # Create demo workers
        demo_workers = create_demo_workers(demo_org)
        
        # Print credentials and setup info
        print_demo_credentials()

if __name__ == '__main__':
    main()