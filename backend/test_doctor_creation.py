#!/usr/bin/env python3

"""
Simple script to test the demo doctor creation without complex relationships
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.user import User
from app.models.organization import Organization
from werkzeug.security import generate_password_hash

def test_doctor_creation():
    app = create_app()
    
    with app.app_context():
        try:
            # Get the DEMO organization
            demo_org = Organization.query.filter_by(code='DEMO123').first()
            if not demo_org:
                print("❌ DEMO organization not found.")
                return
            
            print(f"✅ Found organization: {demo_org.name}")
            
            # Check if doctor already exists
            existing_doctor = User.query.filter_by(
                email='doctor@demo.com', 
                organization_id=demo_org.id
            ).first()
            
            if existing_doctor:
                print("✅ Demo doctor account already exists:")
                print(f"   Email: {existing_doctor.email}")
                print(f"   Role: {existing_doctor.role}")
                return
            
            # Create doctor user
            doctor = User(
                organization_id=demo_org.id,
                username='doctor',
                email='doctor@demo.com',
                first_name='Dr. John',
                last_name='Smith',
                role='doctor'
            )
            doctor.set_password('doctor123')
            
            db.session.add(doctor)
            db.session.commit()
            
            print("✅ Demo doctor account created successfully!")
            print(f"   Email: {doctor.email}")
            print(f"   Password: doctor123")
            print(f"   Role: {doctor.role}")
            
        except Exception as e:
            print(f"❌ Error creating demo doctor: {e}")
            db.session.rollback()
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    test_doctor_creation()