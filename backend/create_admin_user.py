#!/usr/bin/env python3
"""
Script to create an admin user for the CarePoint system.
This script should be run from the backend directory.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, Organization

def create_admin_user():
    app = create_app()
    
    with app.app_context():
        # Get organization code from user input
        org_code = input("Enter organization code (default: DEMO001): ").strip() or "DEMO001"
        
        # Find organization
        organization = Organization.query.filter_by(code=org_code).first()
        if not organization:
            print(f"Organization with code '{org_code}' not found!")
            print("Available organizations:")
            orgs = Organization.query.all()
            for org in orgs:
                print(f"  - {org.code}: {org.name}")
            return
        
        print(f"Creating admin user for organization: {organization.name} ({organization.code})")
        
        # Get user details
        username = input("Enter username for admin user (default: admin): ").strip() or "admin"
        email = input("Enter email for admin user (default: admin@example.com): ").strip() or "admin@example.com"
        password = input("Enter password for admin user (default: Admin123!): ").strip() or "Admin123!"
        first_name = input("Enter first name (default: Admin): ").strip() or "Admin"
        last_name = input("Enter last name (default: User): ").strip() or "User"
        
        # Check if user already exists
        existing_user = User.query.filter_by(
            organization_id=organization.id,
            email=email
        ).first()
        
        if existing_user:
            print(f"User with email '{email}' already exists in this organization!")
            update = input("Update existing user to admin? (y/N): ").strip().lower()
            if update == 'y':
                existing_user.role = 'admin'
                existing_user.is_active = True
                db.session.commit()
                print(f"Updated user '{existing_user.username}' to admin role.")
            return
        
        # Create new admin user
        try:
            admin_user = User(
                organization_id=organization.id,
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role='admin'
            )
            admin_user.set_password(password)
            admin_user.is_active = True
            admin_user.email_confirmed = True
            
            db.session.add(admin_user)
            db.session.commit()
            
            print("\n✓ Admin user created successfully!")
            print(f"  Organization: {organization.name} ({organization.code})")
            print(f"  Username: {admin_user.username}")
            print(f"  Email: {admin_user.email}")
            print(f"  Name: {admin_user.first_name} {admin_user.last_name}")
            print(f"  Role: {admin_user.role}")
            print(f"  User ID: {admin_user.id}")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error creating admin user: {e}")

def list_users():
    """List all users in the system"""
    app = create_app()
    
    with app.app_context():
        users = User.query.all()
        print(f"\nFound {len(users)} users:")
        for user in users:
            org = user.organization
            print(f"  {user.id}: {user.username} ({user.email}) - {user.role} - {org.code}")

if __name__ == '__main__':
    print("CarePoint Admin User Creation Tool")
    print("=" * 40)
    
    if len(sys.argv) > 1 and sys.argv[1] == 'list':
        list_users()
    else:
        create_admin_user()