#!/usr/bin/env python3
"""
Test script to create sample prescriptions for pharmacist dashboard validation.
This script creates sample prescriptions from doctors to test the pharmacist module.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.healthcare import Patient, Prescription
from app.models.user import User
from app.models.organization import Organization  
from datetime import datetime, timedelta
import random

def create_sample_prescriptions():
    """Create sample prescriptions from doctors for pharmacist testing"""
    
    app = create_app()
    
    with app.app_context():
        # Find an existing organization
        org = Organization.query.first()
        if not org:
            print("No organization found. Please create an organization first.")
            return
            
        # Find doctors and patients
        doctors = User.query.filter_by(role='doctor', organization_id=org.id).all()
        patients = Patient.query.filter_by(organization_id=org.id).all()
        
        if not doctors:
            print("No doctors found. Please create doctors first.")
            return
            
        if not patients:
            print("No patients found. Please create patients first.")
            return
        
        # Sample medications and dosages
        medications = [
            {
                'name': 'Amoxicillin',
                'dosage': '500mg',
                'frequency': 'Three times daily',
                'duration': '7 days',
                'instructions': 'Take with food to avoid stomach upset'
            },
            {
                'name': 'Ibuprofen', 
                'dosage': '200mg',
                'frequency': 'Every 6 hours as needed',
                'duration': '5 days',
                'instructions': 'Take with food. Do not exceed 8 tablets per day'
            },
            {
                'name': 'Metformin',
                'dosage': '1000mg', 
                'frequency': 'Twice daily',
                'duration': '30 days',
                'instructions': 'Take with meals. Monitor blood sugar levels'
            },
            {
                'name': 'Lisinopril',
                'dosage': '10mg',
                'frequency': 'Once daily',
                'duration': '30 days', 
                'instructions': 'Take at the same time each day. Monitor blood pressure'
            },
            {
                'name': 'Omeprazole',
                'dosage': '20mg',
                'frequency': 'Once daily before meals',
                'duration': '14 days',
                'instructions': 'Take on empty stomach, 1 hour before eating'
            }
        ]
        
        created_count = 0
        
        # Create 15-20 sample prescriptions
        for i in range(random.randint(15, 20)):
            doctor = random.choice(doctors)
            patient = random.choice(patients)
            medication = random.choice(medications)
            
            # Random prescribed date (last 30 days)
            days_ago = random.randint(0, 30)
            prescribed_at = datetime.utcnow() - timedelta(days=days_ago)
            
            # Random status based on age of prescription
            if days_ago <= 1:
                status = 'pending'  # Recent prescriptions are usually pending
            elif days_ago <= 7:
                status = random.choice(['pending', 'dispensed', 'partially_dispensed'])
            else:
                status = random.choice(['dispensed', 'referred', 'cancelled'])
            
            quantity = random.randint(10, 90)
            
            # Calculate dispensed quantity based on status
            if status == 'dispensed':
                dispensed_quantity = quantity
                dispensed_at = prescribed_at + timedelta(hours=random.randint(1, 48))
            elif status == 'partially_dispensed':
                dispensed_quantity = random.randint(1, quantity - 1)
                dispensed_at = prescribed_at + timedelta(hours=random.randint(1, 48))
            else:
                dispensed_quantity = 0
                dispensed_at = None
            
            prescription = Prescription(
                organization_id=org.id,
                patient_id=patient.id,
                doctor_id=doctor.id,
                medication_name=medication['name'],
                dosage=medication['dosage'],
                frequency=medication['frequency'],
                duration=medication['duration'],
                quantity=quantity,
                dispensed_quantity=dispensed_quantity,
                instructions=medication['instructions'],
                status=status,
                prescribed_at=prescribed_at,
                dispensed_at=dispensed_at,
                created_at=prescribed_at
            )
            
            # Add referral notes for referred prescriptions
            if status == 'referred':
                prescription.referral_notes = "Medication not available. Patient referred to City Pharmacy on Main Street."
                prescription.referred_at = prescribed_at + timedelta(hours=random.randint(1, 24))
            
            db.session.add(prescription)
            created_count += 1
            
        try:
            db.session.commit()
            print(f"✅ Successfully created {created_count} sample prescriptions!")
            print(f"📊 Prescriptions are assigned to organization: {org.name}")
            print(f"👨‍⚕️ Created prescriptions from {len(doctors)} doctors for {len(patients)} patients")
            print("\n📋 Summary:")
            print("- Prescriptions include various medications (Amoxicillin, Ibuprofen, Metformin, etc.)")
            print("- Different statuses: pending, dispensed, partially dispensed, referred, cancelled")
            print("- Prescribed dates span the last 30 days")
            print("- Each prescription includes detailed instructions")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error creating prescriptions: {str(e)}")

if __name__ == "__main__":
    print("🔬 Creating sample prescriptions for pharmacist dashboard testing...")
    create_sample_prescriptions()