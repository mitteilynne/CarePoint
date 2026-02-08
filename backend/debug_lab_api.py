"""Debug lab technician API response"""
import sys
sys.path.insert(0, '.')

from app import create_app, db
from app.models.healthcare import LabTest, Patient
from app.models.user import User
from app.utils.data_isolation import OrganizationScopedQuery

app = create_app()

with app.app_context():
    # Simulate lab technician user (organization 1)
    lab_tech = User.query.filter_by(email='lab@demohealthcare.com').first()
    print(f"Lab Tech: {lab_tech.first_name} {lab_tech.last_name}, Org: {lab_tech.organization_id}")
    
    # Check what OrganizationScopedQuery.get_current_org_id() returns
    print(f"Current org from context: {OrganizationScopedQuery.get_current_org_id()}")
    
    # Query lab tests manually
    lab_tests = LabTest.query.join(Patient).filter(
        Patient.organization_id == lab_tech.organization_id
    ).all()
    
    print(f"\nLab tests for org {lab_tech.organization_id}: {len(lab_tests)}")
    for test in lab_tests:
        print(f"  Test {test.id}: {test.test_name}, Status: {test.status}, Patient Org: {test.patient.organization_id}")
    
    # Test status filtering
    ordered_tests = LabTest.query.join(Patient).filter(
        Patient.organization_id == lab_tech.organization_id,
        LabTest.status == 'ordered'
    ).all()
    
    print(f"\nOrdered tests: {len(ordered_tests)}")
    for test in ordered_tests:
        print(f"  Test {test.id}: {test.test_name}, Status: {test.status}")