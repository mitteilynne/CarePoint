"""Check existing lab tests"""
import sys
sys.path.insert(0, '.')

from app import create_app, db
from app.models.healthcare import LabTest, Patient
from app.models.user import User

app = create_app()

with app.app_context():
    # Get all lab tests
    all_lab_tests = LabTest.query.all()
    print(f"Total lab tests: {len(all_lab_tests)}")
    
    for lab_test in all_lab_tests:
        patient = Patient.query.get(lab_test.patient_id)
        doctor = User.query.get(lab_test.doctor_id)
        
        print(f"\nLab Test ID: {lab_test.id}")
        print(f"  Test Name: {lab_test.test_name}")
        print(f"  Test Type: {lab_test.test_type}")
        print(f"  Status: {lab_test.status}")
        print(f"  Organization ID: {lab_test.organization_id}")
        print(f"  Patient: {patient.first_name} {patient.last_name} (Org: {patient.organization_id})")
        print(f"  Doctor: {doctor.first_name} {doctor.last_name} (Org: {doctor.organization_id})")
        print(f"  Ordered At: {lab_test.ordered_at}")
        print(f"  Urgency: {lab_test.urgency}")
    
    # Check current user's organization
    print(f"\nUsers by role:")
    users = User.query.all()
    for user in users:
        print(f"  {user.first_name} {user.last_name} - Role: {user.role}, Org: {user.organization_id}")