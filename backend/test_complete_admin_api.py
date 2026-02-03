#!/usr/bin/env python3
"""
Test script for all admin API endpoints including lab technicians and receptionists
"""

import requests
import json

BASE_URL = 'http://localhost:5000/api'

def test_admin_endpoints():
    print("Testing Complete Admin API Endpoints")
    print("=" * 50)
    
    # Login
    login_data = {
        'organization_code': 'DEMO',
        'username': 'demo_admin',
        'password': 'demo123'
    }
    
    try:
        response = requests.post(f'{BASE_URL}/auth/login', json=login_data)
        if response.status_code != 200:
            print(f"❌ Login failed: {response.status_code}")
            return
        
        login_result = response.json()
        token = login_result['access_token']
        print(f"✓ Login successful, token: {token[:20]}...")
        
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test 1: Dashboard Overview
        print("\n=== Testing Admin Dashboard Overview ===")
        response = requests.get(f'{BASE_URL}/admin/dashboard/overview', headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            overview = response.json()
            print("Overview data:", json.dumps(overview, indent=2))
        else:
            print(f"Error: {response.text}")
        
        # Test 2: Get All Users
        print("\n=== Testing Get All Users ===")
        response = requests.get(f'{BASE_URL}/admin/users', headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            users = response.json()
            print(f"Found {len(users['users'])} users")
            if users['users']:
                print("First user:", json.dumps(users['users'][0], indent=2))
        else:
            print(f"Error: {response.text}")
        
        # Test 3: Organization Info
        print("\n=== Testing Organization Info ===")
        response = requests.get(f'{BASE_URL}/admin/organization/info', headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            org = response.json()
            print("Organization:", json.dumps(org, indent=2))
        else:
            print(f"Error: {response.text}")
        
        # Test 4: Doctors Summary
        print("\n=== Testing Doctors Summary ===")
        response = requests.get(f'{BASE_URL}/admin/doctors/summary', headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            doctors = response.json()
            print("Doctors Summary:", json.dumps(doctors, indent=2))
            
            # Test doctor details if doctors exist
            if doctors['doctors']:
                doctor_id = doctors['doctors'][0]['id']
                print(f"\n=== Testing Doctor {doctor_id} Statistics ===")
                response = requests.get(f'{BASE_URL}/admin/doctors/{doctor_id}/stats', headers=headers)
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    doctor_stats = response.json()
                    print("Doctor Statistics:", json.dumps(doctor_stats, indent=2))
                else:
                    print(f"Error: {response.text}")
        else:
            print(f"Error: {response.text}")
        
        # Test 5: Lab Technicians Summary
        print("\n=== Testing Lab Technicians Summary ===")
        response = requests.get(f'{BASE_URL}/admin/lab-technicians', headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            lab_techs = response.json()
            print("Lab Technicians Summary:", json.dumps(lab_techs, indent=2))
            
            # Test lab tech details if lab techs exist
            if lab_techs['lab_technicians']:
                tech_id = lab_techs['lab_technicians'][0]['id']
                print(f"\n=== Testing Lab Technician {tech_id} Statistics ===")
                response = requests.get(f'{BASE_URL}/admin/lab-technicians/{tech_id}/stats', headers=headers)
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    tech_stats = response.json()
                    print("Lab Technician Statistics:", json.dumps(tech_stats, indent=2))
                else:
                    print(f"Error: {response.text}")
        else:
            print(f"Error: {response.text}")
        
        # Test 6: Receptionists Summary
        print("\n=== Testing Receptionists Summary ===")
        response = requests.get(f'{BASE_URL}/admin/receptionists', headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            receptionists = response.json()
            print("Receptionists Summary:", json.dumps(receptionists, indent=2))
            
            # Test receptionist details if receptionists exist
            if receptionists['receptionists']:
                receptionist_id = receptionists['receptionists'][0]['id']
                print(f"\n=== Testing Receptionist {receptionist_id} Statistics ===")
                response = requests.get(f'{BASE_URL}/admin/receptionists/{receptionist_id}/stats', headers=headers)
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    receptionist_stats = response.json()
                    print("Receptionist Statistics:", json.dumps(receptionist_stats, indent=2))
                else:
                    print(f"Error: {response.text}")
        else:
            print(f"Error: {response.text}")
        
        print("\n✓ All admin endpoint tests completed!")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")

if __name__ == '__main__':
    test_admin_endpoints()