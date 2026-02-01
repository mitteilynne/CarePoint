#!/usr/bin/env python3

"""
Script to create a demo doctor account for testing the doctor dashboard
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.models.user import User
from app.models.organization import Organization
from app import db
from werkzeug.security import generate_password_hash

def create_demo_doctor():
    app = create_app()
    
    with app.app_context():
        try:
            # Get the DEMO organization
            demo_org = Organization.query.filter_by(organization_code='DEMO123').first()
            if not demo_org:
                print("❌ DEMO organization not found. Please run create_demo_data.py first.")
                return
            
            # Check if doctor already exists
            existing_doctor = User.query.filter_by(
                email='doctor@demo.com', 
                organization_id=demo_org.id
            ).first()
            
            if existing_doctor:
                print("✅ Demo doctor account already exists:")
                print(f"   Email: {existing_doctor.email}")
                print(f"   Role: {existing_doctor.role}")
                print(f"   Organization: {existing_doctor.organization.name}")
                return
            
            # Create doctor user
            doctor = User(
                first_name='Dr. John',
                last_name='Smith',
                email='doctor@demo.com',
                password_hash=generate_password_hash('doctor123'),
                role='doctor',
                organization_id=demo_org.id,
                employee_id='DOC001'
            )
            
            db.session.add(doctor)
            db.session.commit()
            
            print("✅ Demo doctor account created successfully!")
            print(f"   Name: {doctor.first_name} {doctor.last_name}")
            print(f"   Email: {doctor.email}")
            print(f"   Password: doctor123")
            print(f"   Role: {doctor.role}")
            print(f"   Organization: {doctor.organization.name}")
            print(f"   Organization Code: {doctor.organization.organization_code}")
            
        except Exception as e:
            print(f"❌ Error creating demo doctor: {e}")
            db.session.rollback()

if __name__ == '__main__':
    create_demo_doctor()