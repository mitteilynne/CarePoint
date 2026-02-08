"""Fix existing triage records to include queue_number"""
import sys
sys.path.insert(0, '.')

from app import create_app, db
from app.models.healthcare import Triage, Patient

app = create_app()

with app.app_context():
    # Find all triage records without queue_number
    triages = Triage.query.filter(
        (Triage.queue_number == None) | (Triage.queue_number == 0)
    ).all()
    
    print(f"Found {len(triages)} triage records to fix")
    
    for triage in triages:
        # Get the patient's current_queue_number
        patient = Patient.query.get(triage.patient_id)
        if patient and patient.current_queue_number:
            triage.queue_number = patient.current_queue_number
            triage.queue_status = 'waiting'
            print(f"Updated triage {triage.id} - queue: {triage.queue_number}, status: {triage.queue_status}")
    
    db.session.commit()
    print("All triage records fixed!")
