"""
Database initialization script for CarePoint
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app import create_app, db
from app.models import Organization, User

def init_db():
    """Initialize database with sample data"""
    app = create_app('development')
    
    with app.app_context():
        # Drop all tables and recreate them
        print("Creating database tables...")
        db.drop_all()
        db.create_all()
        
        # Create sample organizations
        print("Creating sample organizations...")
        
        # Hospital organization
        hospital_org = Organization(
            code="HOSP001",
            name="CarePoint General Hospital",
            description="A leading healthcare facility providing comprehensive medical services",
            organization_type="hospital",
            address="123 Medical Center Drive, Healthcare City",
            phone="+1-555-HOSPITAL",
            email="admin@carepointgeneral.com",
            max_users=200,
            subscription_plan="enterprise"
        )
        
        # Clinic organization
        clinic_org = Organization(
            code="CLINIC123", 
            name="Family Health Clinic",
            description="Community-focused family medicine practice",
            organization_type="clinic",
            address="456 Community Street, Wellness Town",
            phone="+1-555-CLINIC",
            email="info@familyhealthclinic.com",
            max_users=50,
            subscription_plan="premium"
        )
        
        # Pharmacy organization
        pharmacy_org = Organization(
            code="PHARMACY99",
            name="Central Pharmacy",
            description="Your trusted neighborhood pharmacy",
            organization_type="pharmacy",
            address="789 Main Street, Downtown",
            phone="+1-555-PHARMACY",
            email="contact@centralpharmacy.com",
            max_users=25,
            subscription_plan="basic"
        )
        
        db.session.add_all([hospital_org, clinic_org, pharmacy_org])
        db.session.commit()
        
        print("Creating sample users...")
        
        # Create admin user for hospital
        hospital_admin = User(
            organization_id=hospital_org.id,
            username="admin",
            email="admin@example.com",
            first_name="System",
            last_name="Administrator",
            role="admin",
            phone="+1-555-0001"
        )
        hospital_admin.set_password("AdminPass123!")
        
        # Create doctor for hospital
        doctor = User(
            organization_id=hospital_org.id,
            username="dr_smith",
            email="john.smith@example.com",
            first_name="John",
            last_name="Smith",
            role="doctor",
            phone="+1-555-0002"
        )
        doctor.set_password("DoctorPass123!")
        
        # Create patient for clinic
        patient = User(
            organization_id=clinic_org.id,
            username="jane_doe",
            email="jane.doe@gmail.com",
            first_name="Jane",
            last_name="Doe",
            role="patient",
            phone="+1-555-0003",
            address="123 Patient Street, City"
        )
        patient.set_password("PatientPass123!")
        
        # Create admin for clinic
        clinic_admin = User(
            organization_id=clinic_org.id,
            username="clinic_admin",
            email="admin@clinic.example.com",
            first_name="Mary",
            last_name="Johnson",
            role="admin",
            phone="+1-555-0004"
        )
        clinic_admin.set_password("ClinicAdmin123!")
        
        db.session.add_all([hospital_admin, doctor, patient, clinic_admin])
        db.session.commit()
        
        print("Database initialization completed successfully!")
        print("\nSample Organizations:")
        print("1. HOSP001 - CarePoint General Hospital")
        print("2. CLINIC123 - Family Health Clinic") 
        print("3. PHARMACY99 - Central Pharmacy")
        print("\nSample Users:")
        print("Hospital Admin: admin@example.com / AdminPass123!")
        print("Doctor: john.smith@example.com / DoctorPass123!")
        print("Clinic Patient: jane.doe@gmail.com / PatientPass123!")
        print("Clinic Admin: admin@clinic.example.com / ClinicAdmin123!")

if __name__ == '__main__':
    init_db()