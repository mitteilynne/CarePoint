#!/usr/bin/env python3
"""
Test script to verify the admin API endpoints are working correctly
"""

import requests
import json

API_BASE_URL = 'http://localhost:5000/api'

def login_as_admin():
    """Login as admin user and return the token"""
    login_data = {
        'organization_code': 'DEMO123',
        'username': 'admin1',
        'password': 'Admin1234'
    }
    
    response = requests.post(f'{API_BASE_URL}/auth/login', json=login_data)
    if response.status_code == 200:
        data = response.json()
        print(f"Login response: {data}")
        return data.get('access_token') or data.get('token')
    else:
        print(f"Login failed: {response.status_code}")
        print(response.text)
        return None

def test_admin_endpoints(token):
    """Test all admin endpoints"""
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    print("\n=== Testing Admin Dashboard Overview ===")
    response = requests.get(f'{API_BASE_URL}/admin/dashboard/overview', headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Overview data: {json.dumps(data, indent=2)}")
    else:
        print(f"Error: {response.text}")
    
    print("\n=== Testing Get All Users ===")
    response = requests.get(f'{API_BASE_URL}/admin/users', headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data['users'])} users")
        print(f"First user: {json.dumps(data['users'][0] if data['users'] else {}, indent=2)}")
    else:
        print(f"Error: {response.text}")
    
    print("\n=== Testing Organization Info ===")
    response = requests.get(f'{API_BASE_URL}/admin/organization/info', headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Organization: {json.dumps(data, indent=2)}")
    else:
        print(f"Error: {response.text}")

if __name__ == '__main__':
    print("Testing Admin API Endpoints")
    print("=" * 40)
    
    token = login_as_admin()
    if token:
        print(f"✓ Login successful, token: {token[:20]}...")
        test_admin_endpoints(token)
    else:
        print("✗ Login failed, cannot test admin endpoints")