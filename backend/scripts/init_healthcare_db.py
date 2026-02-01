"""
Enhanced database initialization script with healthcare models and organization isolation.
This script will create sample data that demonstrates proper data isolation between organizations.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User, Organization, Patient, Department, Appointment, MedicalRecord
from datetime import datetime, date, timedelta
from decimal import Decimal

def create_sample_data():
    """Create sample data with proper organization isolation"""
    
    # Get existing organizations
    hospital = Organization.query.filter_by(code='HOSP001').first()
    clinic = Organization.query.filter_by(code='CLINIC123').first()
    pharmacy = Organization.query.filter_by(code='PHARMACY99').first()
    
    if not hospital or not clinic or not pharmacy:
        print("Organizations not found! Please run the basic init_db.py first.")
        return
    
    print("Creating healthcare data with organization isolation...")
    
    # Create departments for each organization
    
    # Hospital departments
    hospital_departments = [
        Department(
            organization_id=hospital.id,
            name="Emergency Department",
            description="24/7 emergency medical services",
            location="Ground Floor, Wing A"
        ),
        Department(
            organization_id=hospital.id,
            name="Cardiology",
            description="Heart and cardiovascular care",
            location="3rd Floor, Wing B"
        ),
        Department(
            organization_id=hospital.id,
            name="Pediatrics",
            description="Child and adolescent healthcare",
            location="2nd Floor, Wing C"
        )
    ]
    
    # Clinic departments
    clinic_departments = [
        Department(
            organization_id=clinic.id,
            name="General Practice",
            description="Primary healthcare services",
            location="Room 101-105"
        ),
        Department(
            organization_id=clinic.id,
            name="Dermatology",
            description="Skin and hair care",
            location="Room 201"
        )
    ]
    
    # Pharmacy departments
    pharmacy_departments = [
        Department(
            organization_id=pharmacy.id,
            name="Prescription Services",
            description="Prescription medication dispensing",
            location="Counter A"
        ),
        Department(
            organization_id=pharmacy.id,
            name="OTC Sales",
            description="Over-the-counter medications and health products",
            location="Counter B"
        )
    ]
    
    all_departments = hospital_departments + clinic_departments + pharmacy_departments
    for dept in all_departments:
        db.session.add(dept)
    
    db.session.commit()
    print(f"Created {len(all_departments)} departments")
    
    # Create patients for each organization
    
    # Hospital patients
    hospital_patients = [
        Patient(
            organization_id=hospital.id,
            patient_id="H001",
            first_name="John",
            last_name="Smith",
            date_of_birth=date(1980, 5, 15),
            gender="male",
            blood_type="O+",
            email="john.smith@email.com",
            phone="555-0001",
            address="123 Main St, Cityville",
            emergency_contact="Jane Smith",
            emergency_phone="555-0002"
        ),
        Patient(
            organization_id=hospital.id,
            patient_id="H002",
            first_name="Sarah",
            last_name="Johnson",
            date_of_birth=date(1975, 8, 22),
            gender="female",
            blood_type="A-",
            email="sarah.j@email.com",
            phone="555-0003",
            allergies="Penicillin, Shellfish"
        )
    ]
    
    # Clinic patients
    clinic_patients = [
        Patient(
            organization_id=clinic.id,
            patient_id="C001",
            first_name="Michael",
            last_name="Brown",
            date_of_birth=date(1990, 3, 10),
            gender="male",
            phone="555-0010"
        ),
        Patient(
            organization_id=clinic.id,
            patient_id="C002",
            first_name="Emily",
            last_name="Davis",
            date_of_birth=date(1985, 12, 5),
            gender="female",
            chronic_conditions="Diabetes Type 2"
        )
    ]
    
    # Pharmacy patients (customers)
    pharmacy_patients = [
        Patient(
            organization_id=pharmacy.id,
            patient_id="P001",
            first_name="Robert",
            last_name="Wilson",
            date_of_birth=date(1960, 7, 18),
            gender="male",
            phone="555-0020"
        )
    ]
    
    all_patients = hospital_patients + clinic_patients + pharmacy_patients
    for patient in all_patients:
        db.session.add(patient)
    
    db.session.commit()
    print(f"Created {len(all_patients)} patients across organizations")
    
    # Create appointments
    today = datetime.now().date()
    tomorrow = today + timedelta(days=1)
    
    # Get doctors from each organization
    hospital_doctor = User.query.filter_by(organization_id=hospital.id, role='doctor').first()
    clinic_doctor = User.query.filter_by(organization_id=clinic.id, role='doctor').first()
    
    appointments = []
    
    if hospital_doctor and hospital_patients:
        # Hospital appointments
        cardiology_dept = Department.query.filter_by(organization_id=hospital.id, name="Cardiology").first()
        
        appointments.extend([
            Appointment(
                organization_id=hospital.id,
                patient_id=hospital_patients[0].id,
                doctor_id=hospital_doctor.id,
                department_id=cardiology_dept.id if cardiology_dept else None,
                appointment_date=datetime.combine(tomorrow, datetime.min.time().replace(hour=10)),
                reason="Chest pain evaluation",
                status="scheduled",
                consultation_fee=Decimal('150.00')
            ),
            Appointment(
                organization_id=hospital.id,
                patient_id=hospital_patients[1].id,
                doctor_id=hospital_doctor.id,
                appointment_date=datetime.combine(tomorrow, datetime.min.time().replace(hour=14)),
                reason="Follow-up visit",
                status="confirmed",
                consultation_fee=Decimal('100.00')
            )
        ])
    
    if clinic_doctor and clinic_patients:
        # Clinic appointments
        general_practice = Department.query.filter_by(organization_id=clinic.id, name="General Practice").first()
        
        appointments.extend([
            Appointment(
                organization_id=clinic.id,
                patient_id=clinic_patients[0].id,
                doctor_id=clinic_doctor.id,
                department_id=general_practice.id if general_practice else None,
                appointment_date=datetime.combine(today, datetime.min.time().replace(hour=16)),
                reason="Annual checkup",
                status="completed",
                consultation_fee=Decimal('80.00'),
                payment_status="paid"
            )
        ])
    
    for appointment in appointments:
        db.session.add(appointment)
    
    db.session.commit()
    print(f"Created {len(appointments)} appointments")
    
    # Create medical records for completed appointments
    medical_records = []
    
    completed_appointment = next((a for a in appointments if a.status == 'completed'), None)
    if completed_appointment:
        medical_records.append(
            MedicalRecord(
                organization_id=completed_appointment.organization_id,
                patient_id=completed_appointment.patient_id,
                doctor_id=completed_appointment.doctor_id,
                appointment_id=completed_appointment.id,
                visit_date=completed_appointment.appointment_date,
                chief_complaint="Annual physical examination",
                diagnosis="Patient in good health, no acute concerns",
                treatment_plan="Continue current lifestyle, follow up in 1 year",
                blood_pressure="118/76",
                heart_rate=72,
                temperature=98.6,
                weight=70.5,
                height=175.0
            )
        )
    
    for record in medical_records:
        db.session.add(record)
    
    db.session.commit()
    print(f"Created {len(medical_records)} medical records")

def verify_data_isolation():
    """Verify that data isolation is working correctly"""
    print("\nVerifying data isolation...")
    
    hospital = Organization.query.filter_by(code='HOSP001').first()
    clinic = Organization.query.filter_by(code='CLINIC123').first()
    pharmacy = Organization.query.filter_by(code='PHARMACY99').first()
    
    # Count records per organization
    for org in [hospital, clinic, pharmacy]:
        if org:
            patient_count = Patient.query.filter_by(organization_id=org.id).count()
            dept_count = Department.query.filter_by(organization_id=org.id).count()
            appt_count = Appointment.query.filter_by(organization_id=org.id).count()
            record_count = MedicalRecord.query.filter_by(organization_id=org.id).count()
            
            print(f"{org.name} ({org.code}):")
            print(f"  - Patients: {patient_count}")
            print(f"  - Departments: {dept_count}")
            print(f"  - Appointments: {appt_count}")
            print(f"  - Medical Records: {record_count}")
    
    # Test cross-organization isolation
    print("\nTesting cross-organization data access:")
    
    # Ensure no patient can see data from other organizations
    hospital_patient = Patient.query.filter_by(organization_id=hospital.id).first()
    clinic_patient = Patient.query.filter_by(organization_id=clinic.id).first()
    
    if hospital_patient and clinic_patient:
        # This should only return hospital appointments
        hospital_appointments = Appointment.query.filter_by(organization_id=hospital.id).all()
        # This should only return clinic appointments
        clinic_appointments = Appointment.query.filter_by(organization_id=clinic.id).all()
        
        print(f"Hospital appointments visible from hospital context: {len(hospital_appointments)}")
        print(f"Clinic appointments visible from clinic context: {len(clinic_appointments)}")
        
        # Verify no cross-contamination
        hospital_appt_orgs = set(a.organization_id for a in hospital_appointments)
        clinic_appt_orgs = set(a.organization_id for a in clinic_appointments)
        
        print(f"Hospital appointments org isolation: {hospital_appt_orgs == {hospital.id}}")
        print(f"Clinic appointments org isolation: {clinic_appt_orgs == {clinic.id}}")

def main():
    """Main function to initialize enhanced database with healthcare models"""
    app = create_app()
    
    with app.app_context():
        print("Creating database tables...")
        db.create_all()
        
        print("Creating sample healthcare data...")
        create_sample_data()
        
        print("Verifying data isolation...")
        verify_data_isolation()
        
        print("\nDatabase initialization completed successfully!")
        print("Healthcare models with organization-based data isolation are now ready.")

if __name__ == '__main__':
    main()