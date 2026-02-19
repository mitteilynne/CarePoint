"""
Billing API routes for managing patient bills and payments.
Bills are automatically created and updated as services are rendered.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app import db
from app.models.user import User
from app.models.healthcare import (
    Patient, Bill, BillItem, Appointment, LabTest, Prescription, 
    PharmacyInventory, Notification
)
from app.utils.decorators import role_required
from datetime import datetime, date
from sqlalchemy import or_, func

billing_bp = Blueprint('billing', __name__, url_prefix='/api/billing')


# ============================================================
# HELPER FUNCTIONS - Used by other modules to add billing items
# ============================================================

def get_or_create_bill(organization_id, patient_id, created_by_id=None):
    """
    Get an existing open bill for today's visit, or create a new one.
    This ensures one bill per patient per visit day.
    """
    today = date.today()
    
    # Look for an existing open/pending bill for this patient today
    bill = Bill.query.filter(
        Bill.organization_id == organization_id,
        Bill.patient_id == patient_id,
        Bill.visit_date == today,
        Bill.status.in_(['open', 'pending_payment'])
    ).first()
    
    if not bill:
        bill_number = Bill.generate_bill_number(organization_id)
        bill = Bill(
            organization_id=organization_id,
            bill_number=bill_number,
            patient_id=patient_id,
            visit_date=today,
            status='open',
            created_by_id=created_by_id
        )
        db.session.add(bill)
        db.session.flush()  # Get the ID
    
    return bill


def add_consultation_fee(organization_id, patient_id, doctor_id, medical_record_id=None, 
                         appointment_id=None, fee_amount=None):
    """
    Add consultation fee to patient's bill.
    Called when doctor creates a medical record (finishes consultation).
    """
    # Default consultation fee if not specified
    if fee_amount is None:
        # Try to get from appointment
        if appointment_id:
            appointment = Appointment.query.get(appointment_id)
            if appointment and appointment.consultation_fee:
                fee_amount = float(appointment.consultation_fee)
        
        # Default fee if still not set
        if fee_amount is None:
            fee_amount = 500.00  # Default consultation fee
    
    bill = get_or_create_bill(organization_id, patient_id)
    
    # Check if consultation fee already added for this medical record
    existing = BillItem.query.filter_by(
        bill_id=bill.id,
        item_type='consultation',
        medical_record_id=medical_record_id
    ).first() if medical_record_id else None
    
    if not existing:
        doctor = User.query.get(doctor_id)
        doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}" if doctor else "Doctor"
        
        bill_item = BillItem(
            organization_id=organization_id,
            bill_id=bill.id,
            item_type='consultation',
            description=f"Consultation fee - {doctor_name}",
            quantity=1,
            unit_price=fee_amount,
            total_price=fee_amount,
            medical_record_id=medical_record_id,
            appointment_id=appointment_id
        )
        db.session.add(bill_item)
        db.session.flush()  # Flush first so recalculate_total sees the new item
        bill.recalculate_total()
    
    return bill


def add_lab_test_fee(organization_id, patient_id, lab_test_id, test_name, fee_amount=None):
    """
    Add lab test fee to patient's bill.
    Called when lab test results are submitted (completed).
    """
    if fee_amount is None:
        # Default lab test fees by type
        lab_test = LabTest.query.get(lab_test_id)
        fee_map = {
            'blood_chemistry': 300.00,
            'hematology': 250.00,
            'urinalysis': 150.00,
            'microbiology': 400.00,
            'immunology': 350.00,
            'toxicology': 500.00,
            'pathology': 600.00,
            'radiology': 800.00,
            'other': 200.00
        }
        fee_amount = fee_map.get(lab_test.test_type, 200.00) if lab_test else 200.00
    
    bill = get_or_create_bill(organization_id, patient_id)
    
    # Check if this lab test was already billed
    existing = BillItem.query.filter_by(
        bill_id=bill.id,
        lab_test_id=lab_test_id
    ).first()
    
    if not existing:
        bill_item = BillItem(
            organization_id=organization_id,
            bill_id=bill.id,
            item_type='lab_test',
            description=f"Lab Test - {test_name}",
            quantity=1,
            unit_price=fee_amount,
            total_price=fee_amount,
            lab_test_id=lab_test_id
        )
        db.session.add(bill_item)
        db.session.flush()  # Flush first so recalculate_total sees the new item
        bill.recalculate_total()
    
    return bill


def add_medication_fee(organization_id, patient_id, prescription_id, medication_name, 
                       quantity, unit_price):
    """
    Add medication fee to patient's bill.
    Called when pharmacist dispenses medication.
    """
    total_price = float(unit_price or 0) * int(quantity or 0)
    
    bill = get_or_create_bill(organization_id, patient_id)
    
    # Check if this prescription was already billed
    existing = BillItem.query.filter_by(
        bill_id=bill.id,
        prescription_id=prescription_id
    ).first()
    
    if not existing:
        bill_item = BillItem(
            organization_id=organization_id,
            bill_id=bill.id,
            item_type='medication',
            description=f"Medication - {medication_name}",
            quantity=quantity,
            unit_price=unit_price or 0,
            total_price=total_price,
            prescription_id=prescription_id
        )
        db.session.add(bill_item)
        db.session.flush()  # Flush first so recalculate_total sees the new item
        bill.recalculate_total()
        print(f"DEBUG: Medication bill item added - {medication_name}, qty: {quantity}, unit: {unit_price}, total: {total_price}, bill total: {bill.total_amount}")
    
    return bill


def finalize_bill(organization_id, patient_id):
    """
    Finalize the bill when consultation is complete.
    Changes status to 'pending_payment' and notifies receptionists.
    """
    today = date.today()
    bill = Bill.query.filter(
        Bill.organization_id == organization_id,
        Bill.patient_id == patient_id,
        Bill.visit_date == today,
        Bill.status == 'open'
    ).first()
    
    if bill:
        bill.recalculate_total()
        bill.status = 'pending_payment'
        bill.updated_at = datetime.utcnow()
        
        # Notify all receptionists about pending payment
        patient = Patient.query.get(patient_id)
        receptionists = User.query.filter_by(
            organization_id=organization_id,
            role='receptionist',
            is_active=True
        ).all()
        
        for receptionist in receptionists:
            notification = Notification(
                organization_id=organization_id,
                recipient_id=receptionist.id,
                title=f'Payment Pending - {patient.name if patient else "Patient"}',
                message=f'Bill #{bill.bill_number} for {patient.name if patient else "Patient"} '
                        f'(ID: {patient.patient_id if patient else "N/A"}) is ready for payment. '
                        f'Total: {float(bill.total_amount):.2f}',
                notification_type='system',
                priority='medium',
                patient_id=patient_id
            )
            db.session.add(notification)
        
        db.session.flush()
    
    return bill


# ============================================================
# API ROUTES
# ============================================================

@billing_bp.route('/bills', methods=['GET'])
@jwt_required()
@role_required(['receptionist', 'admin', 'doctor'])
def get_bills():
    """Get all bills for the organization with filtering"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    # Query parameters
    status = request.args.get('status', '')
    patient_search = request.args.get('search', '')
    date_filter = request.args.get('date', '')
    
    query = Bill.query.filter_by(organization_id=user.organization_id)
    
    # Apply filters
    if status and status != 'all':
        query = query.filter_by(status=status)
    
    if date_filter:
        try:
            filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
            query = query.filter_by(visit_date=filter_date)
        except ValueError:
            pass
    
    if patient_search:
        query = query.join(Patient).filter(
            or_(
                Patient.first_name.ilike(f'%{patient_search}%'),
                Patient.last_name.ilike(f'%{patient_search}%'),
                Patient.patient_id.ilike(f'%{patient_search}%'),
                Bill.bill_number.ilike(f'%{patient_search}%')
            )
        )
    
    bills = query.order_by(Bill.created_at.desc()).limit(100).all()
    
    return jsonify({
        'bills': [bill.to_dict() for bill in bills]
    }), 200


@billing_bp.route('/bills/<int:bill_id>', methods=['GET'])
@jwt_required()
@role_required(['receptionist', 'admin', 'doctor'])
def get_bill_details(bill_id):
    """Get detailed bill information with all items"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    bill = Bill.query.filter_by(
        id=bill_id,
        organization_id=user.organization_id
    ).first()
    
    if not bill:
        return jsonify({'error': 'Bill not found'}), 404
    
    return jsonify(bill.to_dict()), 200


@billing_bp.route('/bills/patient/<int:patient_id>', methods=['GET'])
@jwt_required()
@role_required(['receptionist', 'admin', 'doctor'])
def get_patient_bills(patient_id):
    """Get all bills for a specific patient"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    # Verify patient belongs to same organization
    patient = Patient.query.filter_by(
        id=patient_id,
        organization_id=user.organization_id
    ).first()
    
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    
    bills = Bill.query.filter_by(
        organization_id=user.organization_id,
        patient_id=patient_id
    ).order_by(Bill.created_at.desc()).all()
    
    return jsonify({
        'patient': {
            'id': patient.id,
            'name': patient.name,
            'patient_id': patient.patient_id
        },
        'bills': [bill.to_dict() for bill in bills]
    }), 200


@billing_bp.route('/bills/<int:bill_id>/pay', methods=['POST'])
@jwt_required()
@role_required(['receptionist', 'admin'])
def process_payment(bill_id):
    """Process payment for a bill"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    bill = Bill.query.filter_by(
        id=bill_id,
        organization_id=user.organization_id
    ).first()
    
    if not bill:
        return jsonify({'error': 'Bill not found'}), 404
    
    if bill.status in ['paid', 'cancelled']:
        return jsonify({'error': f'Bill is already {bill.status}'}), 400
    
    data = request.get_json()
    amount_paid = float(data.get('amount_paid', 0))
    payment_method = data.get('payment_method', 'cash')
    payment_reference = data.get('payment_reference', '')
    payment_notes = data.get('payment_notes', '')
    discount = float(data.get('discount_amount', 0))
    
    if amount_paid <= 0:
        return jsonify({'error': 'Payment amount must be greater than 0'}), 400
    
    try:
        # Apply discount if provided
        if discount > 0:
            bill.discount_amount = float(bill.discount_amount or 0) + discount
        
        # Add payment
        bill.paid_amount = float(bill.paid_amount or 0) + amount_paid
        bill.payment_method = payment_method
        bill.payment_reference = payment_reference
        bill.payment_notes = payment_notes
        bill.paid_to_id = current_user_id
        bill.updated_at = datetime.utcnow()
        
        # Check if fully paid
        balance = float(bill.total_amount or 0) - float(bill.paid_amount or 0) - float(bill.discount_amount or 0)
        
        if balance <= 0:
            bill.status = 'paid'
            bill.paid_at = datetime.utcnow()
            
            # Update patient status to discharged
            patient = Patient.query.get(bill.patient_id)
            if patient:
                patient.registration_status = 'discharged'
                patient.updated_at = datetime.utcnow()
        else:
            bill.status = 'partially_paid'
        
        db.session.commit()
        
        return jsonify({
            'message': 'Payment processed successfully',
            'bill': bill.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@billing_bp.route('/bills/<int:bill_id>/discount', methods=['POST'])
@jwt_required()
@role_required(['receptionist', 'admin'])
def apply_discount(bill_id):
    """Apply discount to a bill"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    bill = Bill.query.filter_by(
        id=bill_id,
        organization_id=user.organization_id
    ).first()
    
    if not bill:
        return jsonify({'error': 'Bill not found'}), 404
    
    data = request.get_json()
    discount_amount = float(data.get('discount_amount', 0))
    
    if discount_amount <= 0:
        return jsonify({'error': 'Discount amount must be greater than 0'}), 400
    
    if discount_amount > float(bill.total_amount or 0):
        return jsonify({'error': 'Discount cannot exceed total amount'}), 400
    
    bill.discount_amount = discount_amount
    bill.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'message': 'Discount applied successfully',
        'bill': bill.to_dict()
    }), 200


@billing_bp.route('/bills/<int:bill_id>/cancel', methods=['POST'])
@jwt_required()
@role_required(['admin'])
def cancel_bill(bill_id):
    """Cancel a bill (admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    bill = Bill.query.filter_by(
        id=bill_id,
        organization_id=user.organization_id
    ).first()
    
    if not bill:
        return jsonify({'error': 'Bill not found'}), 404
    
    if bill.status == 'paid':
        return jsonify({'error': 'Cannot cancel a paid bill'}), 400
    
    bill.status = 'cancelled'
    bill.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'message': 'Bill cancelled successfully',
        'bill': bill.to_dict()
    }), 200


@billing_bp.route('/stats', methods=['GET'])
@jwt_required()
@role_required(['receptionist', 'admin'])
def get_billing_stats():
    """Get billing statistics for the dashboard"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    org_id = user.organization_id
    today = date.today()
    
    # Pending payments count
    pending_count = Bill.query.filter(
        Bill.organization_id == org_id,
        Bill.status == 'pending_payment'
    ).count()
    
    # Today's collections
    today_paid = db.session.query(func.sum(Bill.paid_amount)).filter(
        Bill.organization_id == org_id,
        Bill.visit_date == today,
        Bill.status.in_(['paid', 'partially_paid'])
    ).scalar() or 0
    
    # Today's total bills
    today_total = db.session.query(func.sum(Bill.total_amount)).filter(
        Bill.organization_id == org_id,
        Bill.visit_date == today
    ).scalar() or 0
    
    # Outstanding amount
    outstanding = db.session.query(
        func.sum(Bill.total_amount) - func.sum(Bill.paid_amount) - func.sum(Bill.discount_amount)
    ).filter(
        Bill.organization_id == org_id,
        Bill.status.in_(['pending_payment', 'partially_paid'])
    ).scalar() or 0
    
    # Today's bill count
    today_bills = Bill.query.filter(
        Bill.organization_id == org_id,
        Bill.visit_date == today
    ).count()
    
    # Paid today count
    paid_today = Bill.query.filter(
        Bill.organization_id == org_id,
        Bill.visit_date == today,
        Bill.status == 'paid'
    ).count()
    
    return jsonify({
        'pending_payments': pending_count,
        'today_collections': float(today_paid),
        'today_total_billed': float(today_total),
        'outstanding_amount': float(outstanding) if outstanding > 0 else 0,
        'today_bills': today_bills,
        'paid_today': paid_today
    }), 200


@billing_bp.route('/pending', methods=['GET'])
@jwt_required()
@role_required(['receptionist', 'admin'])
def get_pending_bills():
    """Get all bills pending payment - main view for receptionist"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.organization_id:
        return jsonify({'error': 'User not found or not associated with organization'}), 404
    
    bills = Bill.query.filter(
        Bill.organization_id == user.organization_id,
        Bill.status.in_(['pending_payment', 'partially_paid'])
    ).order_by(Bill.created_at.desc()).all()
    
    return jsonify({
        'bills': [bill.to_dict() for bill in bills]
    }), 200
