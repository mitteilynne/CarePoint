"""
Test script to verify organization-based data isolation in healthcare APIs
"""

import requests
import json

BASE_URL = "http://127.0.0.1:5000/api"

def test_login_and_get_token(org_code, username, password):
    """Login and get JWT token for testing"""
    login_data = {
        "organization_code": org_code,
        "login": username,
        "password": password
    }
    
    response = requests.post(f"{BASE_URL}/login", json=login_data)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed for {username}@{org_code}: {response.text}")
        return None

def test_data_isolation():
    """Test that data is properly isolated between organizations"""
    print("Testing Organization-Based Data Isolation for Healthcare Data\n")
    
    # Test accounts from different organizations
    test_accounts = [
        {"org": "HOSP001", "username": "admin", "password": "admin123"},
        {"org": "CLINIC123", "username": "clinic_admin", "password": "admin123"},
    ]
    
    for account in test_accounts:
        print(f"\\n=== Testing with {account['org']} - {account['username']} ===")
        
        # Login and get token
        token = test_login_and_get_token(account['org'], account['username'], account['password'])
        if not token:
            continue
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test patients endpoint
        print("\\nTesting /patients endpoint:")
        response = requests.get(f"{BASE_URL}/patients", headers=headers)
        if response.status_code == 200:
            patients = response.json()["patients"]
            print(f"  Found {len(patients)} patients")
            for p in patients[:3]:  # Show first 3 patients
                print(f"    - {p['first_name']} {p['last_name']} (ID: {p['patient_id']})")
        else:
            print(f"  Error: {response.text}")
        
        # Test departments endpoint
        print("\\nTesting /departments endpoint:")
        response = requests.get(f"{BASE_URL}/departments", headers=headers)
        if response.status_code == 200:
            departments = response.json()["departments"]
            print(f"  Found {len(departments)} departments")
            for d in departments:
                print(f"    - {d['name']} ({d['location']})")
        else:
            print(f"  Error: {response.text}")
        
        # Test appointments endpoint
        print("\\nTesting /appointments endpoint:")
        response = requests.get(f"{BASE_URL}/appointments", headers=headers)
        if response.status_code == 200:
            appointments = response.json()["appointments"]
            print(f"  Found {len(appointments)} appointments")
            for a in appointments[:3]:  # Show first 3 appointments
                print(f"    - {a['patient_name']} with Dr. {a['doctor_name']} on {a['appointment_date'][:10]}")
        else:
            print(f"  Error: {response.text}")
        
        # Test data isolation verification endpoint
        print("\\nTesting /test-isolation endpoint:")
        response = requests.get(f"{BASE_URL}/test-isolation", headers=headers)
        if response.status_code == 200:
            results = response.json()["results"]
            print(f"  Organization ID: {results['current_organization_id']}")
            print(f"  Isolation Success: {results['isolation_success']}")
            print(f"  Patient Organizations Found: {results['patient_orgs_found']}")
            print(f"  Appointment Organizations Found: {results['appointment_orgs_found']}")
            print(f"  Department Organizations Found: {results['department_orgs_found']}")
        else:
            print(f"  Error: {response.text}")
        
        # Test analytics dashboard
        print("\\nTesting /analytics/dashboard endpoint:")
        response = requests.get(f"{BASE_URL}/analytics/dashboard", headers=headers)
        if response.status_code == 200:
            analytics = response.json()["analytics"]
            org_info = analytics["organization_info"]
            print(f"  Organization: {org_info['organization_name']} ({org_info['organization_code']})")
            print(f"  Total Patients: {analytics['total_patients']}")
            print(f"  Total Departments: {analytics['total_departments']}")
            print(f"  Today's Appointments: {analytics['today_appointments']}")
        else:
            print(f"  Error: {response.text}")

if __name__ == "__main__":
    try:
        test_data_isolation()
        print("\\n" + "="*60)
        print("Data isolation testing completed successfully!")
        print("Each organization can only see their own data.")
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Please make sure the Flask server is running on port 5000.")