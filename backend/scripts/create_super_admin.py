"""
Script to create a Super Admin user for the CarePoint platform.
Super Admins can manage all organizations and have platform-wide access.
"""

import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User, Organization

def create_super_admin():
    app = create_app()
    
    with app.app_context():
        # Check if super admin already exists
        existing = User.query.filter_by(role='super_admin').first()
        if existing:
            print(f"Super Admin already exists: {existing.username} ({existing.email})")
            print("If you want to create another, you'll need to manually edit the database.")
            return existing
        
        # Create or get the platform organization for super admins
        platform_org = Organization.query.filter_by(code='PLATFORM').first()
        if not platform_org:
            platform_org = Organization(
                code='PLATFORM',
                name='CarePoint Platform',
                description='Platform administration organization',
                organization_type='other',
                is_active=True
            )
            db.session.add(platform_org)
            db.session.flush()  # Get the ID
            print("Created Platform organization for Super Admins")
        
        # Create super admin user
        super_admin = User(
            username='superadmin',
            email='superadmin@carepoint.com',
            first_name='Super',
            last_name='Admin',
            organization_id=platform_org.id,
            role='super_admin',
            is_active=True
        )
        super_admin.set_password('SuperAdmin@123')
        
        db.session.add(super_admin)
        db.session.commit()
        
        print("=" * 60)
        print("Super Admin created successfully!")
        print("=" * 60)
        print(f"Username: superadmin")
        print(f"Email: superadmin@carepoint.com")
        print(f"Password: SuperAdmin@123")
        print("=" * 60)
        print("IMPORTANT: Change this password immediately after first login!")
        print("=" * 60)
        
        return super_admin

if __name__ == '__main__':
    create_super_admin()
