#!/usr/bin/env python3
"""Test script to check medical records"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.healthcare import MedicalRecord, Patient

def main():
    app = create_app()
    
    with app.app_context():
        print("=== TESTING MEDICAL RECORDS ===")
        
        # Check all medical records
        records = MedicalRecord.query.all()
        print(f"Total medical records in database: {len(records)}")
        
        for record in records:
            patient = Patient.query.get(record.patient_id)
            patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Unknown"
            print(f"Record ID: {record.id}")
            print(f"Patient: {patient_name} (ID: {record.patient_id})")
            print(f"Visit Date: {record.visit_date}")
            print(f"Chief Complaint: {record.chief_complaint}")
            print(f"Diagnosis: {record.diagnosis}")
            print(f"Organization ID: {record.organization_id}")
            print("---")
        
        # Specifically check patient ID 5 (LYNNE MITTEI)
        print("\n=== PATIENT ID 5 RECORDS ===")
        patient_5_records = MedicalRecord.query.filter_by(patient_id=5).all()
        print(f"Patient ID 5 has {len(patient_5_records)} medical records")
        
        for record in patient_5_records:
            print(f"Record ID: {record.id}, Date: {record.visit_date}, Diagnosis: {record.diagnosis}")

if __name__ == '__main__':
    main()