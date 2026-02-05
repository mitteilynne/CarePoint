from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.healthcare import Prescription, PharmacyInventory, Patient
from datetime import datetime
from sqlalchemy import or_, and_

pharmacist_bp = Blueprint('pharmacist', __name__, url_prefix='/api/pharmacist')

@pharmacist_bp.route('/prescriptions', methods=['GET'])
@jwt_required()
def get_prescriptions():
    """Get all prescriptions for pharmacist's organization"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role not in ['pharmacist', 'admin']:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    organization_id = user.organization_id
    if not organization_id:
        return jsonify({'error': 'Organization not found'}), 404
    
    # Get query parameters for filtering
    status = request.args.get('status', 'pending')
    patient_id = request.args.get('patient_id')
    search = request.args.get('search', '')
    
    # Build query with organization isolation
    query = Prescription.query.filter_by(organization_id=organization_id)
    
    # Apply filters
    if status and status != 'all':
        query = query.filter_by(status=status)
    
    if patient_id:
        query = query.filter_by(patient_id=patient_id)
    
    if search:
        query = query.join(Patient).filter(
            or_(
                Prescription.medication_name.ilike(f'%{search}%'),
                Patient.first_name.ilike(f'%{search}%'),
                Patient.last_name.ilike(f'%{search}%')
            )
        )
    
    # Order by most recent first
    prescriptions = query.order_by(Prescription.prescribed_at.desc()).all()
    
    return jsonify({
        'prescriptions': [p.to_dict() for p in prescriptions]
    }), 200

@pharmacist_bp.route('/prescriptions/<int:prescription_id>', methods=['GET'])
@jwt_required()
def get_prescription_details(prescription_id):
    """Get detailed information about a specific prescription"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role not in ['pharmacist', 'admin']:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    organization_id = user.organization_id
    prescription = Prescription.query.filter_by(
        id=prescription_id,
        organization_id=organization_id
    ).first()
    
    if not prescription:
        return jsonify({'error': 'Prescription not found'}), 404
    
    return jsonify(prescription.to_dict()), 200

@pharmacist_bp.route('/prescriptions/<int:prescription_id>/dispense', methods=['POST'])
@jwt_required()
def dispense_prescription(prescription_id):
    """Dispense medication for a prescription"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role not in ['pharmacist', 'admin']:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    organization_id = user.organization_id
    prescription = Prescription.query.filter_by(
        id=prescription_id,
        organization_id=organization_id
    ).first()
    
    if not prescription:
        return jsonify({'error': 'Prescription not found'}), 404
    
    if prescription.status in ['dispensed', 'cancelled']:
        return jsonify({'error': f'Prescription already {prescription.status}'}), 400
    
    data = request.get_json()
    quantity_dispensed = data.get('quantity_dispensed', prescription.quantity)
    notes = data.get('notes', '')
    
    # Check inventory
    inventory_item = PharmacyInventory.query.filter(
        and_(
            PharmacyInventory.organization_id == organization_id,
            PharmacyInventory.medication_name.ilike(f'%{prescription.medication_name}%'),
            PharmacyInventory.is_active == True
        )
    ).first()
    
    if inventory_item:
        if inventory_item.quantity_in_stock < quantity_dispensed:
            return jsonify({
                'error': 'Insufficient stock',
                'available': inventory_item.quantity_in_stock,
                'requested': quantity_dispensed
            }), 400
        
        # Update inventory
        inventory_item.quantity_in_stock -= quantity_dispensed
        inventory_item.updated_at = datetime.utcnow()
    
    # Update prescription
    prescription.dispensed_quantity = quantity_dispensed
    prescription.dispensed_by_id = current_user_id
    prescription.dispensed_at = datetime.utcnow()
    
    if quantity_dispensed >= prescription.quantity:
        prescription.status = 'dispensed'
    else:
        prescription.status = 'partially_dispensed'
    
    prescription.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'message': 'Prescription dispensed successfully',
        'prescription': prescription.to_dict()
    }), 200

@pharmacist_bp.route('/prescriptions/<int:prescription_id>/refer', methods=['POST'])
@jwt_required()
def refer_prescription(prescription_id):
    """Refer patient to another pharmacy due to stock shortage"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role not in ['pharmacist', 'admin']:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    organization_id = user.organization_id
    prescription = Prescription.query.filter_by(
        id=prescription_id,
        organization_id=organization_id
    ).first()
    
    if not prescription:
        return jsonify({'error': 'Prescription not found'}), 404
    
    data = request.get_json()
    referral_notes = data.get('referral_notes')
    
    if not referral_notes:
        return jsonify({'error': 'Referral notes are required'}), 400
    
    # Update prescription with referral information
    prescription.status = 'referred'
    prescription.referral_notes = referral_notes
    prescription.referred_by_id = current_user_id
    prescription.referred_at = datetime.utcnow()
    prescription.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'message': 'Patient referred successfully',
        'prescription': prescription.to_dict()
    }), 200

@pharmacist_bp.route('/inventory', methods=['GET'])
@jwt_required()
def get_inventory():
    """Get pharmacy inventory"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role not in ['pharmacist', 'admin']:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    organization_id = user.organization_id
    if not organization_id:
        return jsonify({'error': 'Organization not found'}), 404
    
    # Get query parameters
    search = request.args.get('search', '')
    low_stock_only = request.args.get('low_stock_only', 'false').lower() == 'true'
    is_active = request.args.get('is_active', 'true').lower() == 'true'
    
    # Build query
    query = PharmacyInventory.query.filter_by(
        organization_id=organization_id,
        is_active=is_active
    )
    
    if search:
        query = query.filter(
            or_(
                PharmacyInventory.medication_name.ilike(f'%{search}%'),
                PharmacyInventory.generic_name.ilike(f'%{search}%'),
                PharmacyInventory.brand_name.ilike(f'%{search}%')
            )
        )
    
    if low_stock_only:
        query = query.filter(
            PharmacyInventory.quantity_in_stock <= PharmacyInventory.minimum_stock_level
        )
    
    inventory_items = query.order_by(PharmacyInventory.medication_name).all()
    
    return jsonify({
        'inventory': [item.to_dict() for item in inventory_items]
    }), 200

@pharmacist_bp.route('/inventory', methods=['POST'])
@jwt_required()
def add_inventory_item():
    """Add new medication to inventory"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role not in ['pharmacist', 'admin']:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    organization_id = user.organization_id
    if not organization_id:
        return jsonify({'error': 'Organization not found'}), 404
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['medication_name', 'quantity_in_stock']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    # Create new inventory item
    inventory_item = PharmacyInventory(
        organization_id=organization_id,
        medication_name=data['medication_name'],
        generic_name=data.get('generic_name'),
        brand_name=data.get('brand_name'),
        dosage_form=data.get('dosage_form'),
        strength=data.get('strength'),
        quantity_in_stock=data['quantity_in_stock'],
        minimum_stock_level=data.get('minimum_stock_level', 10),
        unit_of_measure=data.get('unit_of_measure', 'units'),
        batch_number=data.get('batch_number'),
        expiry_date=datetime.strptime(data['expiry_date'], '%Y-%m-%d').date() if data.get('expiry_date') else None,
        storage_location=data.get('storage_location'),
        unit_price=data.get('unit_price'),
        supplier=data.get('supplier'),
        notes=data.get('notes'),
        last_restocked_at=datetime.utcnow()
    )
    
    db.session.add(inventory_item)
    db.session.commit()
    
    return jsonify({
        'message': 'Inventory item added successfully',
        'inventory_item': inventory_item.to_dict()
    }), 201

@pharmacist_bp.route('/inventory/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_inventory_item(item_id):
    """Update inventory item (restock, adjust quantity, update details)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role not in ['pharmacist', 'admin']:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    organization_id = user.organization_id
    inventory_item = PharmacyInventory.query.filter_by(
        id=item_id,
        organization_id=organization_id
    ).first()
    
    if not inventory_item:
        return jsonify({'error': 'Inventory item not found'}), 404
    
    data = request.get_json()
    
    # Update fields if provided
    if 'medication_name' in data:
        inventory_item.medication_name = data['medication_name']
    if 'generic_name' in data:
        inventory_item.generic_name = data['generic_name']
    if 'brand_name' in data:
        inventory_item.brand_name = data['brand_name']
    if 'dosage_form' in data:
        inventory_item.dosage_form = data['dosage_form']
    if 'strength' in data:
        inventory_item.strength = data['strength']
    if 'quantity_in_stock' in data:
        old_quantity = inventory_item.quantity_in_stock
        new_quantity = data['quantity_in_stock']
        inventory_item.quantity_in_stock = new_quantity
        # If restocking (increasing quantity), update last_restocked_at
        if new_quantity > old_quantity:
            inventory_item.last_restocked_at = datetime.utcnow()
    if 'minimum_stock_level' in data:
        inventory_item.minimum_stock_level = data['minimum_stock_level']
    if 'unit_of_measure' in data:
        inventory_item.unit_of_measure = data['unit_of_measure']
    if 'batch_number' in data:
        inventory_item.batch_number = data['batch_number']
    if 'expiry_date' in data:
        inventory_item.expiry_date = datetime.strptime(data['expiry_date'], '%Y-%m-%d').date()
    if 'storage_location' in data:
        inventory_item.storage_location = data['storage_location']
    if 'unit_price' in data:
        inventory_item.unit_price = data['unit_price']
    if 'supplier' in data:
        inventory_item.supplier = data['supplier']
    if 'notes' in data:
        inventory_item.notes = data['notes']
    if 'is_active' in data:
        inventory_item.is_active = data['is_active']
    
    inventory_item.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Inventory item updated successfully',
        'inventory_item': inventory_item.to_dict()
    }), 200

@pharmacist_bp.route('/inventory/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_inventory_item(item_id):
    """Delete (deactivate) inventory item"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role not in ['pharmacist', 'admin']:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    organization_id = user.organization_id
    inventory_item = PharmacyInventory.query.filter_by(
        id=item_id,
        organization_id=organization_id
    ).first()
    
    if not inventory_item:
        return jsonify({'error': 'Inventory item not found'}), 404
    
    # Soft delete - just mark as inactive
    inventory_item.is_active = False
    inventory_item.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'message': 'Inventory item deleted successfully'}), 200

@pharmacist_bp.route('/patients/<int:patient_id>/prescriptions', methods=['GET'])
@jwt_required()
def get_patient_prescriptions(patient_id):
    """Get all prescriptions for a specific patient"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role not in ['pharmacist', 'admin']:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    organization_id = user.organization_id
    
    # Verify patient belongs to same organization
    patient = Patient.query.filter_by(
        id=patient_id,
        organization_id=organization_id
    ).first()
    
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    
    prescriptions = Prescription.query.filter_by(
        organization_id=organization_id,
        patient_id=patient_id
    ).order_by(Prescription.prescribed_at.desc()).all()
    
    return jsonify({
        'patient': {
            'id': patient.id,
            'name': patient.name,
            'patient_id': patient.patient_id
        },
        'prescriptions': [p.to_dict() for p in prescriptions]
    }), 200

@pharmacist_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_pharmacist_stats():
    """Get statistics for pharmacist dashboard"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.role not in ['pharmacist', 'admin']:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    organization_id = user.organization_id
    
    # Count pending prescriptions
    pending_prescriptions = Prescription.query.filter_by(
        organization_id=organization_id,
        status='pending'
    ).count()
    
    # Count low stock items
    low_stock_items = PharmacyInventory.query.filter(
        PharmacyInventory.organization_id == organization_id,
        PharmacyInventory.quantity_in_stock <= PharmacyInventory.minimum_stock_level,
        PharmacyInventory.is_active == True
    ).count()
    
    # Count out of stock items
    out_of_stock_items = PharmacyInventory.query.filter_by(
        organization_id=organization_id,
        quantity_in_stock=0,
        is_active=True
    ).count()
    
    # Count today's dispensed prescriptions
    today = datetime.utcnow().date()
    dispensed_today = Prescription.query.filter(
        Prescription.organization_id == organization_id,
        Prescription.status == 'dispensed',
        db.func.date(Prescription.dispensed_at) == today
    ).count()
    
    return jsonify({
        'pending_prescriptions': pending_prescriptions,
        'low_stock_items': low_stock_items,
        'out_of_stock_items': out_of_stock_items,
        'dispensed_today': dispensed_today
    }), 200
