"""
Initialize database with receptionist module data including sample receptionists and triage records.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User, Organization, Patient, Triage, QueueManagement
from datetime import datetime, date, timedelta
from werkzeug.security import generate_password_hash

def create_receptionist_data():
    """Create sample receptionist users and data"""
    
    # Get existing organizations
    hospital = Organization.query.filter_by(code='HOSP001').first()
    clinic = Organization.query.filter_by(code='CLINIC123').first()
    
    if not hospital or not clinic:
        print("Organizations not found! Please run the basic init_db.py first.")
        return
    
    print("Creating receptionist users and sample data...")
    
    # Create receptionist users for each organization
    receptionists = [
        # Hospital receptionists
        User(
            organization_id=hospital.id,
            username='reception1',
            email='reception1@hospital.com',
            first_name='Mary',
            last_name='Johnson',
            role='receptionist',
            phone='555-1001'
        ),
        User(
            organization_id=hospital.id,
            username='reception2',
            email='reception2@hospital.com',
            first_name='Lisa',
            last_name='Williams',
            role='receptionist',
            phone='555-1002'
        ),
        
        # Clinic receptionist
        User(
            organization_id=clinic.id,
            username='clinic_reception',
            email='reception@clinic.com',
            first_name='Susan',
            last_name='Anderson',
            role='receptionist',
            phone='555-2001'
        )
    ]
    
    # Set passwords for receptionists
    for receptionist in receptionists:
        receptionist.password_hash = generate_password_hash('reception123')
        db.session.add(receptionist)
    
    db.session.commit()
    print(f"Created {len(receptionists)} receptionist users")
    
    # Create today's queue management records
    today = date.today()
    
    # Hospital queue
    hospital_queue = QueueManagement(
        organization_id=hospital.id,
        queue_date=today,
        current_queue_number=15,
        total_patients_today=15,
        average_wait_time=25,
        emergency_count=2,
        urgent_count=4,
        routine_count=9
    )
    
    # Clinic queue
    clinic_queue = QueueManagement(
        organization_id=clinic.id,
        queue_date=today,
        current_queue_number=8,
        total_patients_today=8,
        average_wait_time=20,
        emergency_count=0,
        urgent_count=2,
        routine_count=6
    )
    
    db.session.add(hospital_queue)
    db.session.add(clinic_queue)
    db.session.commit()
    
    print("Created queue management records")

def main():
    """Main function to initialize receptionist module"""
    app = create_app()
    
    with app.app_context():
        print("Creating database tables...")
        db.create_all()
        
        print("Creating receptionist module data...")
        create_receptionist_data()
        
        print("\nReceptionist module initialization completed successfully!")
        print("")
        print("Login credentials for testing:")
        print("Hospital Receptionist 1: reception1 / reception123")
        print("Hospital Receptionist 2: reception2 / reception123")
        print("Clinic Receptionist: clinic_reception / reception123")

if __name__ == '__main__':
    main()