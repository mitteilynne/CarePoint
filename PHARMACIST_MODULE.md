# Pharmacist Module Documentation

## Overview
The Pharmacist Module is a comprehensive pharmacy management system integrated into CarePoint that enables pharmacists to:
- View and dispense prescriptions issued by doctors
- Manage pharmacy inventory
- Track medication stock levels
- Refer patients to alternative pharmacies when medications are unavailable

## Features

### 1. Prescription Management
- **View Prescriptions**: Access all prescriptions filtered by status (pending, dispensed, referred, etc.)
- **Dispense Medications**: Mark prescriptions as dispensed and update inventory automatically
- **Patient Referral**: Refer patients to other pharmacies when medications are out of stock
- **Prescription History**: View complete prescription history for each patient

### 2. Inventory Management
- **Stock Tracking**: Monitor real-time medication inventory levels
- **Low Stock Alerts**: Automatic notifications when stock falls below minimum levels
- **Inventory CRUD**: Add, update, and manage medication entries
- **Batch Management**: Track batch numbers and expiry dates
- **Stock Location**: Record storage locations for easy retrieval

### 3. Dashboard Analytics
- Pending prescriptions count
- Low stock items alert
- Out of stock items count
- Daily dispensing statistics

## Database Models

### Prescription Model
```python
- patient_id: Foreign key to patients
- doctor_id: Foreign key to doctors
- medication_name: Name of medication
- dosage: e.g., "500mg"
- frequency: e.g., "Twice daily"
- duration: e.g., "7 days"
- quantity: Total quantity to dispense
- status: pending, dispensed, partially_dispensed, cancelled, referred
- dispensed_by_id: Pharmacist who dispensed
- referral_notes: Where patient was referred (if applicable)
```

### PharmacyInventory Model
```python
- medication_name: Primary medication identifier
- generic_name: Generic drug name
- brand_name: Brand/commercial name
- dosage_form: Tablet, Capsule, Syrup, etc.
- strength: e.g., "500mg"
- quantity_in_stock: Current stock level
- minimum_stock_level: Threshold for low stock alerts
- batch_number: Manufacturing batch
- expiry_date: Medication expiry date
- storage_location: Physical location in pharmacy
- unit_price: Cost per unit
- supplier: Supplier information
```

## API Endpoints

### Pharmacist Routes (`/api/pharmacist`)

#### Prescriptions
- `GET /prescriptions` - Get all prescriptions with filters
- `GET /prescriptions/<id>` - Get prescription details
- `POST /prescriptions/<id>/dispense` - Dispense medication
- `POST /prescriptions/<id>/refer` - Refer patient elsewhere
- `GET /patients/<id>/prescriptions` - Get patient's prescriptions

#### Inventory
- `GET /inventory` - Get inventory items with filters
- `POST /inventory` - Add new inventory item
- `PUT /inventory/<id>` - Update inventory item
- `DELETE /inventory/<id>` - Delete (deactivate) inventory item

#### Statistics
- `GET /stats` - Get dashboard statistics

### Doctor Routes (Healthcare API - `/api/healthcare`)

#### Prescription Creation
- `POST /prescriptions` - Create new prescription
- `GET /patients/<id>/prescriptions` - Get patient prescriptions
- `PUT /prescriptions/<id>` - Update prescription
- `DELETE /prescriptions/<id>` - Cancel prescription

## Frontend Components

### 1. PharmacistDashboard
Main dashboard page with two tabs:
- **Prescriptions Tab**: List and manage prescriptions
- **Inventory Tab**: Manage medication stock

### 2. EmbeddedPharmacistModule
Compact module showing:
- Pending prescriptions requiring attention
- Low stock alerts

## Setup Instructions

### Backend Setup

1. **Create Demo Pharmacist Account**:
   ```bash
   cd backend
   python scripts/create_demo_pharmacist.py
   ```

2. **Run Database Migrations**:
   ```bash
   flask db upgrade
   ```

### Frontend Setup

The pharmacist module is automatically included in the routing. Login with pharmacist credentials to access the dashboard.

## Usage Workflow

### For Doctors
1. Doctor examines patient and creates medical record
2. Doctor creates prescription with medication details
3. Prescription appears in pharmacist's pending queue

### For Pharmacists
1. View pending prescriptions in dashboard
2. Check inventory availability
3. Either:
   - **Dispense**: If medication available, dispense and update inventory
   - **Refer**: If unavailable, refer patient with notes on where to obtain medication
4. Monitor inventory levels and restock as needed

## Login Credentials (Demo)

```
Username: pharmacist
Password: pharmacist123
Organization Code: [Your organization code]
```

## Security Features

- **Organization Isolation**: Pharmacists can only access prescriptions and inventory for their organization
- **Role-Based Access**: Only pharmacists can dispense or refer prescriptions
- **Audit Trail**: All dispensing and referral actions are logged with timestamp and user

## Inventory Management Best Practices

1. **Set Appropriate Minimum Levels**: Configure minimum stock levels based on usage patterns
2. **Regular Stock Checks**: Review low stock alerts daily
3. **Expiry Date Monitoring**: Track expiration dates and remove expired medications
4. **Batch Tracking**: Maintain accurate batch numbers for recall purposes
5. **Storage Organization**: Use consistent storage location naming

## Integration Points

### With Doctor Module
- Doctors create prescriptions during patient consultations
- Prescriptions automatically appear in pharmacist queue
- Two-way visibility for prescription status

### With Patient Records
- Complete prescription history linked to patient records
- Track medication adherence and patterns
- Support for allergy checking (future enhancement)

### With Notifications System
- Alerts for low stock items
- Notifications for urgent prescriptions
- Referral confirmations

## Future Enhancements

- Automatic reorder suggestions based on usage patterns
- Integration with external pharmacy suppliers
- Barcode scanning for medication verification
- Drug interaction checking
- Insurance claim processing
- E-prescription integration
- Mobile app for pharmacists

## Troubleshooting

### Common Issues

1. **Prescription not appearing**: 
   - Verify doctor successfully created prescription
   - Check organization isolation settings
   - Ensure prescription status is 'pending'

2. **Inventory not updating after dispensing**:
   - Check inventory item exists for medication
   - Verify medication name matching
   - Review database constraints

3. **Cannot dispense prescription**:
   - Verify sufficient stock in inventory
   - Check pharmacist role permissions
   - Ensure prescription status allows dispensing

## Support

For issues or questions, please contact the development team or refer to the main CarePoint documentation.
