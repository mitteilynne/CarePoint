"""Check existing triage records"""
import sys
sys.path.insert(0, '.')

from app import create_app, db
from app.models.healthcare import Triage, Patient
from datetime import datetime, date

app = create_app()

with app.app_context():
    # Get all triage records
    all_triages = Triage.query.all()
    print(f"Total triage records: {len(all_triages)}")
    
    # Get today's triages
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    today_triages = Triage.query.filter(
        Triage.arrival_time >= today_start,
        Triage.arrival_time <= today_end
    ).all()
    
    print(f"\nToday's triage records: {len(today_triages)}")
    
    for triage in all_triages:
        patient = Patient.query.get(triage.patient_id)
        print(f"\nTriage ID: {triage.id}")
        print(f"  Patient: {patient.first_name} {patient.last_name} (ID: {patient.id})")
        print(f"  Queue Number: {triage.queue_number}")
        print(f"  Queue Status: {triage.queue_status}")
        print(f"  Arrival Time: {triage.arrival_time}")
        print(f"  Organization ID: {triage.organization_id}")
        print(f"  Patient Queue #: {patient.current_queue_number}")
        print(f"  Patient Status: {patient.registration_status}")
