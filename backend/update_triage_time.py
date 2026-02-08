"""Update triage arrival time to today"""
import sys
sys.path.insert(0, '.')

from app import create_app, db
from app.models.healthcare import Triage
from datetime import datetime

app = create_app()

with app.app_context():
    # Update triage ID 4 (LYNNE MITTEI) to have today's arrival time
    triage = Triage.query.get(4)
    if triage:
        old_time = triage.arrival_time
        triage.arrival_time = datetime.utcnow()
        triage.triage_completed_at = datetime.utcnow()
        db.session.commit()
        print(f"Updated triage {triage.id}")
        print(f"  Old arrival time: {old_time}")
        print(f"  New arrival time: {triage.arrival_time}")
    else:
        print("Triage not found")
