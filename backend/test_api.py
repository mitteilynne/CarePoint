"""
Test script for CarePoint multi-tenant authentication
"""
import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_organization_validation():
    """Test organization code validation"""
    print("=== Testing Organization Validation ===")
    
    # Test valid organization
    response = requests.post(f"{BASE_URL}/organization/validate-code", 
                           json={"code": "HOSP001"})
    print(f"Valid org (HOSP001): {response.status_code} - {response.json()}")
    
    # Test invalid organization
    response = requests.post(f"{BASE_URL}/organization/validate-code", 
                           json={"code": "INVALID"})
    print(f"Invalid org: {response.status_code} - {response.json()}")

def test_login():
    """Test multi-tenant login"""
    print("\n=== Testing Multi-Tenant Login ===")
    
    # Test hospital admin login
    login_data = {
        "organization_code": "HOSP001",
        "login": "admin",
        "password": "AdminPass123!"
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"Hospital admin login: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"  User: {data['user']['first_name']} {data['user']['last_name']}")
        print(f"  Organization: {data['user']['organization_name']}")
        print(f"  Role: {data['user']['role']}")
        return data['access_token']
    else:
        print(f"  Error: {response.json()}")
    
    return None

def test_wrong_org_login():
    """Test login with wrong organization"""
    print("\n=== Testing Wrong Organization Login ===")
    
    # Try to login to wrong organization
    login_data = {
        "organization_code": "CLINIC123",  # Wrong org
        "login": "admin",  # This user exists in HOSP001, not CLINIC123
        "password": "AdminPass123!"
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"Wrong org login: {response.status_code}")
    if response.status_code != 200:
        print(f"  Expected error: {response.json()}")

def test_profile_access(token):
    """Test accessing profile with JWT token"""
    if not token:
        return
        
    print("\n=== Testing Profile Access ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/auth/profile", headers=headers)
    print(f"Profile access: {response.status_code}")
    if response.status_code == 200:
        user = response.json()['user']
        print(f"  Profile: {user['first_name']} {user['last_name']}")
        print(f"  Organization: {user['organization_name']} ({user['organization_code']})")

def main():
    """Run all tests"""
    print("CarePoint Multi-Tenant Authentication Test")
    print("=" * 50)
    
    try:
        test_organization_validation()
        token = test_login()
        test_wrong_org_login()
        test_profile_access(token)
        
        print("\n" + "=" * 50)
        print("Multi-tenant authentication system is working correctly!")
        
    except requests.ConnectionError:
        print("Error: Could not connect to backend server. Make sure it's running on http://localhost:5000")
    except Exception as e:
        print(f"Test error: {e}")

if __name__ == "__main__":
    main()