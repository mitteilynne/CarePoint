#!/usr/bin/env python3
"""
Script to check medical records and user data in the database
"""
from app import create_app
from app.models.healthcare import MedicalRecord
from app.models.user import User
import sys

def main():
    app = create_app()
    with app.app_context():
        # Check all users and their roles
        all_users = User.query.all()
        print(f'Total users: {len(all_users)}')
        
        role_counts = {}
        for user in all_users:
            role_counts[user.role] = role_counts.get(user.role, 0) + 1
            print(f'ID: {user.id}, Username: {user.username}, Role: {user.role}, Organization: {user.organization_id}')
        
        print(f'\nRole distribution: {role_counts}')
        
        # Check the medical records with patient and doctor info
        records = MedicalRecord.query.all()
        print(f'\nMedical Records Details ({len(records)} total):')
        for record in records:
            patient = User.query.get(record.patient_id)
            doctor = User.query.get(record.doctor_id)
            print(f'Record ID: {record.id}')
            if patient:
                print(f'  Patient: {patient.username} (ID: {record.patient_id})')
            else:
                print(f'  Patient: Not found (ID: {record.patient_id})')
            
            if doctor:
                print(f'  Doctor: {doctor.username} (ID: {record.doctor_id})')
            else:
                print(f'  Doctor: Not found (ID: {record.doctor_id})')
                
            print(f'  Diagnosis: {record.diagnosis}')
            print(f'  Medications: {record.medications_prescribed or "None"}')
            print(f'  Organization: {record.organization_id}')
            print(f'  Created: {record.created_at}')
            print('---')

if __name__ == '__main__':
    main()