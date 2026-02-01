"""
Create demo organization and user accounts for testing all roles
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User, Organization, Patient, Triage, QueueManagement
from datetime import datetime, date, timedelta
from werkzeug.security import generate_password_hash

def create_demo_organization():
    """Create DEMO organization"""
    print("Creating DEMO organization...")
    
    # Check if DEMO org already exists
    demo_org = Organization.query.filter_by(code='DEMO').first()
    if demo_org:
        print("DEMO organization already exists")
        return demo_org
    
    demo_org = Organization(
        name='Demo Healthcare Center',
        code='DEMO',
        address='123 Demo Street, Demo City, DC 12345',
        phone='555-DEMO-123',
        email='info@demohealthcare.com',
        website='https://demohealthcare.com',
        registration_number='DEMO2026001',
        license_number='LIC-DEMO-2026',
        organization_type='hospital',
        status='active'
    )
    
    db.session.add(demo_org)
    db.session.commit()
    print(f"Created organization: {demo_org.name} ({demo_org.code})")
    return demo_org

def create_demo_users(demo_org):
    """Create demo users with different roles"""
    print("Creating demo user accounts...")
    
    # Demo user accounts with different roles
    demo_users = [
        {
            'username': 'demo_admin',
            'email': 'admin@demohealthcare.com',
            'first_name': 'Admin',
            'last_name': 'Demo',
            'role': 'admin',
            'phone': '555-DEMO-001',
            'password': 'demo123'
        },
        {
            'username': 'demo_receptionist',
            'email': 'reception@demohealthcare.com',
            'first_name': 'Reception',
            'last_name': 'Demo',
            'role': 'receptionist',
            'phone': '555-DEMO-002',
            'password': 'demo123'
        },
        {
            'username': 'demo_doctor',
            'email': 'doctor@demohealthcare.com',
            'first_name': 'Michael',
            'last_name': 'Demo',
            'role': 'doctor',
            'phone': '555-DEMO-003',
            'password': 'demo123'
        },
        {
            'username': 'demo_lab_tech',
            'email': 'lab@demohealthcare.com',
            'first_name': 'Lab',
            'last_name': 'Technician',
            'role': 'lab_technician',
            'phone': '555-DEMO-004',
            'password': 'demo123'
        },
        {
            'username': 'demo_pharmacist',
            'email': 'pharmacy@demohealthcare.com',
            'first_name': 'Pharma',
            'last_name': 'Demo',
            'role': 'pharmacist',
            'phone': '555-DEMO-005',
            'password': 'demo123'
        }
    ]
    
    created_users = []
    for user_data in demo_users:
        # Check if user already exists
        existing_user = User.query.filter_by(username=user_data['username']).first()
        if existing_user:
            print(f"User {user_data['username']} already exists")
            created_users.append(existing_user)
            continue
        
        user = User(
            organization_id=demo_org.id,
            username=user_data['username'],
            email=user_data['email'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name'],
            role=user_data['role'],
            phone=user_data['phone'],
            is_active=True
        )
        user.password_hash = generate_password_hash(user_data['password'])
        
        db.session.add(user)
        created_users.append(user)
        print(f"Created {user_data['role']}: {user_data['username']}")
    
    db.session.commit()
    print(f"Created {len(created_users)} demo users")
    return created_users

def create_demo_patients(demo_org):
    """Create sample patients for DEMO organization"""
    print("Creating demo patients...")
    
    # Sample patients
    demo_patients = [
        {
            'patient_id': 'D0001',
            'first_name': 'John',
            'last_name': 'Smith',
            'date_of_birth': date(1985, 3, 15),
            'gender': 'male',
            'phone': '555-0001',
            'email': 'john.smith@email.com',
            'address': '123 Main St, Demo City',
            'emergency_contact_name': 'Jane Smith',
            'emergency_contact_phone': '555-0002',
            'visit_type': 'walk_in',
            'registration_status': 'registered'
        },
        {
            'patient_id': 'D0002',
            'first_name': 'Mary',
            'last_name': 'Johnson',
            'date_of_birth': date(1990, 7, 22),
            'gender': 'female',
            'phone': '555-0003',
            'email': 'mary.johnson@email.com',
            'address': '456 Oak Ave, Demo City',
            'emergency_contact_name': 'Bob Johnson',
            'emergency_contact_phone': '555-0004',
            'visit_type': 'appointment',
            'registration_status': 'triaged'
        },
        {
            'patient_id': 'D0003',
            'first_name': 'Robert',
            'last_name': 'Williams',
            'date_of_birth': date(1978, 11, 8),
            'gender': 'male',
            'phone': '555-0005',
            'email': 'robert.williams@email.com',
            'address': '789 Pine St, Demo City',
            'emergency_contact_name': 'Lisa Williams',
            'emergency_contact_phone': '555-0006',
            'visit_type': 'emergency',
            'registration_status': 'waiting'
        },
        {
            'patient_id': 'D0004',
            'first_name': 'Emily',
            'last_name': 'Davis',
            'date_of_birth': date(1995, 5, 3),
            'gender': 'female',
            'phone': '555-0007',
            'email': 'emily.davis@email.com',
            'address': '321 Elm St, Demo City',
            'emergency_contact_name': 'Tom Davis',
            'emergency_contact_phone': '555-0008',
            'visit_type': 'walk_in',
            'registration_status': 'completed'
        }
    ]
    
    created_patients = []
    for patient_data in demo_patients:
        # Check if patient already exists
        existing_patient = Patient.query.filter_by(
            organization_id=demo_org.id,
            patient_id=patient_data['patient_id']
        ).first()
        
        if existing_patient:
            print(f"Patient {patient_data['patient_id']} already exists")
            created_patients.append(existing_patient)
            continue
        
        patient = Patient(
            organization_id=demo_org.id,
            patient_id=patient_data['patient_id'],
            first_name=patient_data['first_name'],
            last_name=patient_data['last_name'],
            date_of_birth=patient_data['date_of_birth'],
            gender=patient_data['gender'],
            phone=patient_data['phone'],
            email=patient_data['email'],
            address=patient_data['address'],
            emergency_contact_name=patient_data['emergency_contact_name'],
            emergency_contact_phone=patient_data['emergency_contact_phone'],
            visit_type=patient_data['visit_type'],
            registration_status=patient_data['registration_status'],
            registration_date=date.today()
        )
        
        db.session.add(patient)
        created_patients.append(patient)
    
    db.session.commit()
    print(f"Created {len(created_patients)} demo patients")
    return created_patients

def create_demo_queue_management(demo_org):
    """Create queue management for DEMO organization"""
    print("Creating demo queue management...")
    
    today = date.today()
    
    # Check if queue management already exists for today
    existing_queue = QueueManagement.query.filter_by(
        organization_id=demo_org.id,
        queue_date=today
    ).first()
    
    if existing_queue:
        print("Queue management for today already exists")
        return existing_queue
    
    queue_mgmt = QueueManagement(
        organization_id=demo_org.id,
        queue_date=today,
        current_queue_number=4,
        total_patients_today=4,
        average_wait_time=15,
        emergency_count=1,
        urgent_count=1,
        routine_count=2
    )
    
    db.session.add(queue_mgmt)
    db.session.commit()
    print("Created demo queue management")
    return queue_mgmt

def create_demo_triage_assessments(demo_org, patients, receptionist):
    """Create sample triage assessments"""
    print("Creating demo triage assessments...")
    
    if not patients or not receptionist:
        print("No patients or receptionist found - skipping triage creation")
        return []
    
    # Sample triage data
    triage_data = [
        {
            'patient': patients[0],  # John Smith
            'chief_complaint': 'Chest pain and shortness of breath',
            'pain_scale': 8,
            'temperature': 38.2,
            'blood_pressure_systolic': 150,
            'blood_pressure_diastolic': 95,
            'heart_rate': 110,
            'respiratory_rate': 22,
            'oxygen_saturation': 94,
            'triage_level': 'urgent',
            'queue_number': 1,
            'queue_status': 'waiting'
        },
        {
            'patient': patients[1],  # Mary Johnson
            'chief_complaint': 'Routine checkup and vaccination',
            'pain_scale': 2,
            'temperature': 37.0,
            'blood_pressure_systolic': 120,
            'blood_pressure_diastolic': 80,
            'heart_rate': 75,
            'respiratory_rate': 16,
            'oxygen_saturation': 98,
            'triage_level': 'non_urgent',
            'queue_number': 2,
            'queue_status': 'waiting'
        },
        {
            'patient': patients[2],  # Robert Williams
            'chief_complaint': 'Severe abdominal pain, nausea',
            'pain_scale': 9,
            'temperature': 39.1,
            'blood_pressure_systolic': 140,
            'blood_pressure_diastolic': 90,
            'heart_rate': 120,
            'respiratory_rate': 20,
            'oxygen_saturation': 96,
            'triage_level': 'emergency',
            'queue_number': 3,
            'queue_status': 'in_progress'
        }
    ]
    
    created_triages = []
    for triage_info in triage_data:
        # Check if triage already exists
        existing_triage = Triage.query.filter_by(
            organization_id=demo_org.id,
            patient_id=triage_info['patient'].id
        ).first()
        
        if existing_triage:
            print(f"Triage for patient {triage_info['patient'].patient_id} already exists")
            created_triages.append(existing_triage)
            continue
        
        triage = Triage(
            organization_id=demo_org.id,
            patient_id=triage_info['patient'].id,
            receptionist_id=receptionist.id,
            chief_complaint=triage_info['chief_complaint'],
            pain_scale=triage_info['pain_scale'],
            temperature=triage_info['temperature'],
            blood_pressure_systolic=triage_info['blood_pressure_systolic'],
            blood_pressure_diastolic=triage_info['blood_pressure_diastolic'],
            heart_rate=triage_info['heart_rate'],
            respiratory_rate=triage_info['respiratory_rate'],
            oxygen_saturation=triage_info['oxygen_saturation'],
            triage_level=triage_info['triage_level'],
            queue_number=triage_info['queue_number'],
            queue_status=triage_info['queue_status'],
            arrival_time=datetime.utcnow() - timedelta(hours=1),
            symptoms=triage_info['chief_complaint'],
            mobility_status='ambulatory',
            receptionist_notes=f'Assessment completed for {triage_info["patient"].first_name}',
            estimated_wait_time=20
        )
        
        # Calculate priority score
        triage.calculate_priority_score()
        
        db.session.add(triage)
        created_triages.append(triage)
    
    db.session.commit()
    print(f"Created {len(created_triages)} demo triage assessments")
    return created_triages

def print_demo_credentials():
    """Print all demo account credentials"""
    print("\n" + "="*60)
    print("DEMO ORGANIZATION SETUP COMPLETE")
    print("="*60)
    print("\n🏥 ORGANIZATION DETAILS:")
    print("Organization Name: Demo Healthcare Center")
    print("Organization Code: DEMO")
    print("Type: Hospital")
    
    print("\n👥 DEMO USER ACCOUNTS:")
    print("All passwords: demo123")
    print()
    print("🔐 ADMIN (Full Access):")
    print("   Username: demo_admin")
    print("   Role: Administrator - Can view and manage everything")
    print()
    print("📋 RECEPTIONIST:")
    print("   Username: demo_receptionist") 
    print("   Role: Receptionist - Patient registration, triage, queue management")
    print()
    print("👨‍⚕️ DOCTOR:")
    print("   Username: demo_doctor")
    print("   Role: Doctor - Patient consultations, medical records, prescriptions")
    print()
    print("🔬 LAB TECHNICIAN:")
    print("   Username: demo_lab_tech")
    print("   Role: Lab Technician - Laboratory tests, results management")
    print()
    print("💊 PHARMACIST:")
    print("   Username: demo_pharmacist")
    print("   Role: Pharmacist - Medication dispensing, prescription management")
    
    print("\n📊 SAMPLE DATA CREATED:")
    print("✅ 4 Demo patients with different statuses")
    print("✅ 3 Triage assessments with various priority levels")
    print("✅ Queue management for today")
    print("✅ Organization-specific data isolation")
    
    print("\n🌐 ACCESS INSTRUCTIONS:")
    print("1. Frontend: http://localhost:3000")
    print("2. Backend API: http://127.0.0.1:5000")
    print("3. Login with any of the demo accounts above")
    print("4. Each role will have different dashboard views and permissions")
    
    print("\n🧪 TESTING FEATURES:")
    print("• Patient registration and management")
    print("• Triage assessment and priority scoring")
    print("• Queue management and real-time updates") 
    print("• Role-based access control")
    print("• Organization data isolation")
    print("• Multi-user workflow simulation")
    print("="*60)

def main():
    """Main function to create demo setup"""
    app = create_app()
    
    with app.app_context():
        print("Setting up DEMO organization and accounts...")
        print("="*50)
        
        # Create database tables
        db.create_all()
        
        # Create DEMO organization
        demo_org = create_demo_organization()
        
        # Create demo users
        demo_users = create_demo_users(demo_org)
        
        # Create demo patients
        demo_patients = create_demo_patients(demo_org)
        
        # Create queue management
        create_demo_queue_management(demo_org)
        
        # Create triage assessments
        receptionist = next((u for u in demo_users if u.role == 'receptionist'), None)
        create_demo_triage_assessments(demo_org, demo_patients, receptionist)
        
        # Print credentials and setup info
        print_demo_credentials()

if __name__ == '__main__':
    main()