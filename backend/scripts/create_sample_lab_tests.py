"""
Create sample lab test data for testing the lab technician dashboard
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.healthcare import Patient, LabTest, MedicalRecord
from app.models.user import User
from app.models.organization import Organization
from datetime import datetime, timedelta
import random

def create_sample_lab_tests():
    """Create sample lab tests for the DEMO organization"""
    
    # Get DEMO organization
    demo_org = Organization.query.filter_by(code='DEMO123').first()
    if not demo_org:
        print("DEMO organization not found. Please run create_demo_workers.py first.")
        return
    
    # Get doctor user for medical records
    doctor = User.query.filter_by(username='doctor', organization_id=demo_org.id).first()
    if not doctor:
        print("Doctor not found in DEMO organization")
        return
    
    # Sample patients data
    sample_patients = [
        {
            'first_name': 'John',
            'last_name': 'Smith',
            'date_of_birth': datetime(1980, 5, 15),
            'gender': 'male',
            'phone': '555-0101',
            'email': 'john.smith@email.com',
            'address': '123 Main St, City, State 12345',
            'patient_id': 'DEMO001'
        },
        {
            'first_name': 'Sarah',
            'last_name': 'Johnson',
            'date_of_birth': datetime(1992, 8, 22),
            'gender': 'female',
            'phone': '555-0102',
            'email': 'sarah.johnson@email.com',
            'address': '456 Oak Ave, City, State 12345',
            'patient_id': 'DEMO002'
        },
        {
            'first_name': 'Mike',
            'last_name': 'Davis',
            'date_of_birth': datetime(1975, 11, 3),
            'gender': 'male',
            'phone': '555-0103',
            'email': 'mike.davis@email.com',
            'address': '789 Pine Rd, City, State 12345',
            'patient_id': 'DEMO003'
        },
        {
            'first_name': 'Emma',
            'last_name': 'Wilson',
            'date_of_birth': datetime(1988, 2, 14),
            'gender': 'female',
            'phone': '555-0104',
            'email': 'emma.wilson@email.com',
            'address': '321 Elm St, City, State 12345',
            'patient_id': 'DEMO004'
        }
    ]
    
    # Create or get patients
    patients = []
    for patient_data in sample_patients:
        existing_patient = Patient.query.filter_by(
            patient_id=patient_data['patient_id'], 
            organization_id=demo_org.id
        ).first()
        
        if not existing_patient:
            patient = Patient(
                organization_id=demo_org.id,
                **patient_data
            )
            db.session.add(patient)
            patients.append(patient)
            print(f"Created patient: {patient_data['first_name']} {patient_data['last_name']}")
        else:
            patients.append(existing_patient)
            print(f"Patient already exists: {patient_data['first_name']} {patient_data['last_name']}")
    
    db.session.commit()
    
    # Sample lab tests data
    test_types = [
        'Complete Blood Count (CBC)',
        'Basic Metabolic Panel (BMP)',
        'Lipid Panel',
        'Liver Function Tests',
        'Thyroid Function Tests',
        'Hemoglobin A1C',
        'Urinalysis',
        'Blood Glucose',
        'Vitamin D Level',
        'Iron Studies'
    ]
    
    priorities = ['routine', 'urgent', 'stat']
    statuses = ['ordered', 'sample_collected', 'in_progress', 'completed']
    
    # Create medical records and lab tests
    lab_tests_created = 0
    
    for patient in patients:
        # Create 2-4 lab tests per patient
        num_tests = random.randint(2, 4)
        
        for i in range(num_tests):
            # Create medical record first
            medical_record = MedicalRecord(
                organization_id=demo_org.id,
                patient_id=patient.id,
                doctor_id=doctor.id,
                chief_complaint=f"Routine checkup and lab work for {patient.first_name} {patient.last_name}",
                diagnosis="Pending lab results",
                treatment_plan="Review lab results when available",
                visit_date=datetime.utcnow() - timedelta(days=random.randint(0, 7))
            )
            db.session.add(medical_record)
            db.session.flush()  # Get the ID
            
            # Create lab test
            test_type_choice = random.choice(test_types)
            status = random.choice(statuses)
            priority = random.choice(priorities)
            
            # Map our test types to the enum values
            test_type_enum = 'blood_chemistry' if 'Blood' in test_type_choice or 'Glucose' in test_type_choice else \
                           'hematology' if 'CBC' in test_type_choice else \
                           'urinalysis' if 'Urin' in test_type_choice else \
                           'other'
            
            # Map status values to the enum
            status_enum = status
            
            # Map priority to urgency enum  
            urgency_enum = 'stat' if priority == 'stat' else \
                          'urgent' if priority == 'urgent' else \
                          'routine'
            
            lab_test = LabTest(
                organization_id=demo_org.id,
                patient_id=patient.id,
                doctor_id=doctor.id,
                test_type=test_type_enum,
                test_name=test_type_choice,
                clinical_notes=f"{test_type_choice} ordered for {patient.first_name} {patient.last_name}",
                status=status_enum,
                urgency=urgency_enum,
                sample_type='blood',
                ordered_at=datetime.utcnow() - timedelta(days=random.randint(0, 5))
            )
            
            # Add sample results for completed tests
            if status_enum == 'completed':
                if 'CBC' in test_type_choice:
                    lab_test.result_value = "WBC: 7.2, RBC: 4.8, Hemoglobin: 14.2, Hematocrit: 42.1"
                    lab_test.result_notes = "All values within normal range"
                    lab_test.abnormal_flag = "normal"
                elif 'Glucose' in test_type_choice:
                    lab_test.result_value = "92 mg/dL"
                    lab_test.result_notes = "Fasting glucose normal"
                    lab_test.abnormal_flag = "normal"
                elif 'Lipid' in test_type_choice:
                    lab_test.result_value = "Total Cholesterol: 185, LDL: 110, HDL: 52, Triglycerides: 115"
                    lab_test.result_notes = "Lipid levels acceptable"
                    lab_test.abnormal_flag = "normal"
                else:
                    lab_test.result_value = "Normal range"
                    lab_test.result_notes = "Test completed successfully"
                    lab_test.abnormal_flag = "normal"
            
            db.session.add(lab_test)
            lab_tests_created += 1
    
    db.session.commit()
    
    print(f"\nCreated {lab_tests_created} lab tests for {len(patients)} patients")
    print("\nLab Test Summary:")
    
    # Print summary
    for status in statuses:
        count = LabTest.query.join(Patient).filter(
            Patient.organization_id == demo_org.id,
            LabTest.status == status
        ).count()
        print(f"  {status.replace('_', ' ').title()}: {count} tests")
    
    print(f"\nTotal tests in DEMO organization: {LabTest.query.join(Patient).filter(Patient.organization_id == demo_org.id).count()}")

def main():
    """Main function to create sample lab test data"""
    app = create_app()
    
    with app.app_context():
        print("Creating sample lab test data for DEMO organization...")
        print("="*55)
        
        create_sample_lab_tests()
        
        print("\n" + "="*55)
        print("SAMPLE LAB TEST DATA CREATED SUCCESSFULLY!")
        print("="*55)
        print("\n🔬 LAB TECHNICIAN TEST ACCOUNT:")
        print("Username: lab")
        print("Password: demo123")
        print("Organization Code: DEMO123")
        print("\n📋 You can now:")
        print("1. Login as 'lab' user at http://localhost:3000")
        print("2. View pending lab tests")
        print("3. Update test statuses")
        print("4. Submit test results")
        print("="*55)

if __name__ == '__main__':
    main()