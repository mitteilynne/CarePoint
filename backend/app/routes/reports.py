from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from app import db
from app.models import User, Organization
from app.models.healthcare import (
    Patient, Appointment, MedicalRecord, LabTest, Prescription,
    PharmacyInventory, Bill, BillItem, Triage
)
from sqlalchemy import func, case, and_, or_, extract, desc
from datetime import datetime, timedelta, date
import logging
import csv
import io

logger = logging.getLogger(__name__)

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')


def require_admin_or_role(allowed_roles):
    """Decorator to ensure user has admin role or one of the allowed roles"""
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            current_user_id = int(get_jwt_identity())
            user = User.query.get(current_user_id)

            if not user:
                return jsonify({'error': 'User not found'}), 404

            if user.role != 'admin' and user.role not in allowed_roles:
                return jsonify({'error': 'Access denied. Insufficient permissions.'}), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator


# ─── DOCTOR REPORTS ────────────────────────────────────────────────────────────

@reports_bp.route('/doctor/summary', methods=['GET'])
@require_admin_or_role(['doctor'])
def doctor_summary_report():
    """
    Comprehensive doctor activity report.
    Query params: start_date, end_date, doctor_id (admin only)
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        org_id = user.organization_id

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        doctor_id = request.args.get('doctor_id', type=int)

        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
        else:
            start_date = datetime.utcnow() - timedelta(days=30)

        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
        else:
            end_date = datetime.utcnow() + timedelta(days=1)

        # If user is doctor, restrict to their own data
        if user.role == 'doctor':
            doctor_id = user.id

        # Get all doctors in org
        doctor_filter = [User.organization_id == org_id, User.role == 'doctor', User.is_active == True]
        if doctor_id:
            doctor_filter.append(User.id == doctor_id)
        doctors = User.query.filter(*doctor_filter).all()

        doctor_reports = []
        for doc in doctors:
            # Patients seen (medical records created)
            records = MedicalRecord.query.filter(
                MedicalRecord.organization_id == org_id,
                MedicalRecord.doctor_id == doc.id,
                MedicalRecord.visit_date >= start_date,
                MedicalRecord.visit_date < end_date
            )
            patients_seen = records.count()

            # Unique patients
            unique_patients = db.session.query(
                func.count(func.distinct(MedicalRecord.patient_id))
            ).filter(
                MedicalRecord.organization_id == org_id,
                MedicalRecord.doctor_id == doc.id,
                MedicalRecord.visit_date >= start_date,
                MedicalRecord.visit_date < end_date
            ).scalar() or 0

            # Lab tests ordered
            lab_tests_ordered = LabTest.query.filter(
                LabTest.organization_id == org_id,
                LabTest.doctor_id == doc.id,
                LabTest.ordered_at >= start_date,
                LabTest.ordered_at < end_date
            ).count()

            # Prescriptions written
            prescriptions_written = Prescription.query.filter(
                Prescription.organization_id == org_id,
                Prescription.doctor_id == doc.id,
                Prescription.prescribed_at >= start_date,
                Prescription.prescribed_at < end_date
            ).count()

            # Appointments
            appointments_total = Appointment.query.filter(
                Appointment.organization_id == org_id,
                Appointment.doctor_id == doc.id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date < end_date
            ).count()

            appointments_completed = Appointment.query.filter(
                Appointment.organization_id == org_id,
                Appointment.doctor_id == doc.id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date < end_date,
                Appointment.status == 'completed'
            ).count()

            # Top diagnoses
            top_diagnoses = db.session.query(
                MedicalRecord.diagnosis,
                func.count(MedicalRecord.id).label('count')
            ).filter(
                MedicalRecord.organization_id == org_id,
                MedicalRecord.doctor_id == doc.id,
                MedicalRecord.visit_date >= start_date,
                MedicalRecord.visit_date < end_date,
                MedicalRecord.diagnosis.isnot(None),
                MedicalRecord.diagnosis != ''
            ).group_by(MedicalRecord.diagnosis).order_by(desc('count')).limit(10).all()

            doctor_reports.append({
                'doctor_id': doc.id,
                'doctor_name': f"{doc.first_name} {doc.last_name}",
                'email': doc.email,
                'patients_seen': patients_seen,
                'unique_patients': unique_patients,
                'lab_tests_ordered': lab_tests_ordered,
                'prescriptions_written': prescriptions_written,
                'appointments_total': appointments_total,
                'appointments_completed': appointments_completed,
                'completion_rate': round((appointments_completed / appointments_total * 100), 1) if appointments_total > 0 else 0,
                'top_diagnoses': [{'diagnosis': d[0], 'count': d[1]} for d in top_diagnoses]
            })

        # Daily trend
        daily_trend = db.session.query(
            func.date(MedicalRecord.visit_date).label('date'),
            func.count(MedicalRecord.id).label('count')
        ).filter(
            MedicalRecord.organization_id == org_id,
            MedicalRecord.visit_date >= start_date,
            MedicalRecord.visit_date < end_date,
            *([MedicalRecord.doctor_id == doctor_id] if doctor_id else [])
        ).group_by(func.date(MedicalRecord.visit_date)).order_by('date').all()

        return jsonify({
            'report': {
                'type': 'doctor_summary',
                'period': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': (end_date - timedelta(days=1)).strftime('%Y-%m-%d')
                },
                'doctors': doctor_reports,
                'daily_trend': [{'date': str(d[0]), 'consultations': d[1]} for d in daily_trend],
                'totals': {
                    'total_doctors': len(doctor_reports),
                    'total_patients_seen': sum(d['patients_seen'] for d in doctor_reports),
                    'total_lab_tests': sum(d['lab_tests_ordered'] for d in doctor_reports),
                    'total_prescriptions': sum(d['prescriptions_written'] for d in doctor_reports),
                    'total_appointments': sum(d['appointments_total'] for d in doctor_reports),
                }
            }
        }), 200

    except Exception as e:
        logger.error(f"Error generating doctor report: {str(e)}")
        return jsonify({'error': f'Failed to generate report: {str(e)}'}), 500


# ─── LAB REPORTS ───────────────────────────────────────────────────────────────

@reports_bp.route('/lab/summary', methods=['GET'])
@require_admin_or_role(['lab_technician'])
def lab_summary_report():
    """
    Comprehensive lab activity report.
    Query params: start_date, end_date, technician_id (admin only)
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        org_id = user.organization_id

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        technician_id = request.args.get('technician_id', type=int)

        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
        else:
            start_date = datetime.utcnow() - timedelta(days=30)

        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
        else:
            end_date = datetime.utcnow() + timedelta(days=1)

        if user.role == 'lab_technician':
            technician_id = user.id

        base_filter = [
            LabTest.organization_id == org_id,
            LabTest.ordered_at >= start_date,
            LabTest.ordered_at < end_date
        ]

        # Overall stats
        total_tests = LabTest.query.filter(*base_filter).count()

        status_counts = db.session.query(
            LabTest.status,
            func.count(LabTest.id).label('count')
        ).filter(*base_filter).group_by(LabTest.status).all()

        status_dict = {s[0]: s[1] for s in status_counts}

        # Tests by type
        tests_by_type = db.session.query(
            LabTest.test_type,
            func.count(LabTest.id).label('count')
        ).filter(*base_filter).group_by(LabTest.test_type).order_by(desc('count')).all()

        # Tests by urgency
        tests_by_urgency = db.session.query(
            LabTest.urgency,
            func.count(LabTest.id).label('count')
        ).filter(*base_filter).group_by(LabTest.urgency).all()

        # Abnormal results
        abnormal_count = LabTest.query.filter(
            *base_filter,
            LabTest.status == 'completed',
            LabTest.abnormal_flag.in_(['high', 'low', 'critical'])
        ).count()

        completed_count = status_dict.get('completed', 0)
        abnormal_rate = round((abnormal_count / completed_count * 100), 1) if completed_count > 0 else 0

        # Average turnaround time (ordered_at to completed_at)
        avg_turnaround = db.session.query(
            func.avg(
                func.julianday(LabTest.completed_at) - func.julianday(LabTest.ordered_at)
            )
        ).filter(
            *base_filter,
            LabTest.status == 'completed',
            LabTest.completed_at.isnot(None)
        ).scalar()
        avg_turnaround_hours = round(float(avg_turnaround or 0) * 24, 1)

        # Per-technician breakdown
        technician_filter = base_filter.copy()
        if technician_id:
            technician_filter.append(LabTest.lab_technician_id == technician_id)

        technician_stats = db.session.query(
            User.id,
            User.first_name,
            User.last_name,
            func.count(LabTest.id).label('total'),
            func.count(case((LabTest.status == 'completed', 1))).label('completed')
        ).join(
            LabTest, LabTest.lab_technician_id == User.id
        ).filter(
            *technician_filter,
            LabTest.lab_technician_id.isnot(None)
        ).group_by(User.id, User.first_name, User.last_name).all()

        # Daily trend
        daily_trend = db.session.query(
            func.date(LabTest.ordered_at).label('date'),
            func.count(LabTest.id).label('ordered'),
            func.count(case((LabTest.status == 'completed', 1))).label('completed')
        ).filter(*base_filter).group_by(func.date(LabTest.ordered_at)).order_by('date').all()

        # Top ordered tests
        top_tests = db.session.query(
            LabTest.test_name,
            func.count(LabTest.id).label('count')
        ).filter(*base_filter).group_by(LabTest.test_name).order_by(desc('count')).limit(10).all()

        return jsonify({
            'report': {
                'type': 'lab_summary',
                'period': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': (end_date - timedelta(days=1)).strftime('%Y-%m-%d')
                },
                'overview': {
                    'total_tests': total_tests,
                    'completed': status_dict.get('completed', 0),
                    'in_progress': status_dict.get('in_progress', 0),
                    'ordered': status_dict.get('ordered', 0),
                    'cancelled': status_dict.get('cancelled', 0),
                    'sample_collected': status_dict.get('sample_collected', 0),
                    'abnormal_results': abnormal_count,
                    'abnormal_rate': abnormal_rate,
                    'avg_turnaround_hours': avg_turnaround_hours
                },
                'tests_by_type': [{'type': t[0], 'count': t[1]} for t in tests_by_type],
                'tests_by_urgency': [{'urgency': t[0], 'count': t[1]} for t in tests_by_urgency],
                'top_tests': [{'test_name': t[0], 'count': t[1]} for t in top_tests],
                'technicians': [{
                    'id': t[0],
                    'name': f"{t[1]} {t[2]}",
                    'total_processed': t[3],
                    'completed': t[4],
                    'efficiency': round((t[4] / t[3] * 100), 1) if t[3] > 0 else 0
                } for t in technician_stats],
                'daily_trend': [{'date': str(d[0]), 'ordered': d[1], 'completed': d[2]} for d in daily_trend]
            }
        }), 200

    except Exception as e:
        logger.error(f"Error generating lab report: {str(e)}")
        return jsonify({'error': f'Failed to generate report: {str(e)}'}), 500


# ─── PHARMACY REPORTS ──────────────────────────────────────────────────────────

@reports_bp.route('/pharmacy/summary', methods=['GET'])
@require_admin_or_role(['pharmacist'])
def pharmacy_summary_report():
    """
    Comprehensive pharmacy activity report.
    Query params: start_date, end_date
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        org_id = user.organization_id

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
        else:
            start_date = datetime.utcnow() - timedelta(days=30)

        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
        else:
            end_date = datetime.utcnow() + timedelta(days=1)

        base_filter = [
            Prescription.organization_id == org_id,
            Prescription.prescribed_at >= start_date,
            Prescription.prescribed_at < end_date
        ]

        # Overall prescription stats
        total_prescriptions = Prescription.query.filter(*base_filter).count()

        status_counts = db.session.query(
            Prescription.status,
            func.count(Prescription.id).label('count')
        ).filter(*base_filter).group_by(Prescription.status).all()

        status_dict = {s[0]: s[1] for s in status_counts}

        # Most prescribed medications
        top_medications = db.session.query(
            Prescription.medication_name,
            func.count(Prescription.id).label('count'),
            func.sum(Prescription.quantity).label('total_quantity')
        ).filter(*base_filter).group_by(
            Prescription.medication_name
        ).order_by(desc('count')).limit(15).all()

        # Dispensing metrics
        dispensed_filter = [
            Prescription.organization_id == org_id,
            Prescription.dispensed_at >= start_date,
            Prescription.dispensed_at < end_date,
            Prescription.status.in_(['dispensed', 'picked_up'])
        ]

        total_dispensed = Prescription.query.filter(*dispensed_filter).count()

        # Average dispensing time (prescribed_at to dispensed_at)
        avg_dispense_time = db.session.query(
            func.avg(
                func.julianday(Prescription.dispensed_at) - func.julianday(Prescription.prescribed_at)
            )
        ).filter(
            *dispensed_filter,
            Prescription.dispensed_at.isnot(None)
        ).scalar()
        avg_dispense_hours = round(float(avg_dispense_time or 0) * 24, 1)

        # Inventory status
        total_items = PharmacyInventory.query.filter(
            PharmacyInventory.organization_id == org_id,
            PharmacyInventory.is_active == True
        ).count()

        low_stock_items = PharmacyInventory.query.filter(
            PharmacyInventory.organization_id == org_id,
            PharmacyInventory.is_active == True,
            PharmacyInventory.quantity_in_stock <= PharmacyInventory.minimum_stock_level,
            PharmacyInventory.quantity_in_stock > 0
        ).count()

        out_of_stock_items = PharmacyInventory.query.filter(
            PharmacyInventory.organization_id == org_id,
            PharmacyInventory.is_active == True,
            PharmacyInventory.quantity_in_stock == 0
        ).count()

        # Expiring soon (within 90 days)
        expiry_date_threshold = date.today() + timedelta(days=90)
        expiring_soon = PharmacyInventory.query.filter(
            PharmacyInventory.organization_id == org_id,
            PharmacyInventory.is_active == True,
            PharmacyInventory.expiry_date.isnot(None),
            PharmacyInventory.expiry_date <= expiry_date_threshold,
            PharmacyInventory.expiry_date >= date.today()
        ).count()

        expired_items = PharmacyInventory.query.filter(
            PharmacyInventory.organization_id == org_id,
            PharmacyInventory.is_active == True,
            PharmacyInventory.expiry_date.isnot(None),
            PharmacyInventory.expiry_date < date.today()
        ).count()

        # Inventory value
        inventory_value = db.session.query(
            func.sum(PharmacyInventory.unit_price * PharmacyInventory.quantity_in_stock)
        ).filter(
            PharmacyInventory.organization_id == org_id,
            PharmacyInventory.is_active == True
        ).scalar() or 0

        # Referred prescriptions
        referred_count = status_dict.get('referred', 0)

        # Daily dispensing trend
        daily_trend = db.session.query(
            func.date(Prescription.dispensed_at).label('date'),
            func.count(Prescription.id).label('dispensed')
        ).filter(
            Prescription.organization_id == org_id,
            Prescription.dispensed_at >= start_date,
            Prescription.dispensed_at < end_date,
            Prescription.dispensed_at.isnot(None)
        ).group_by(func.date(Prescription.dispensed_at)).order_by('date').all()

        # Pharmacist performance
        pharmacist_stats = db.session.query(
            User.id,
            User.first_name,
            User.last_name,
            func.count(Prescription.id).label('total_dispensed')
        ).join(
            Prescription, Prescription.dispensed_by_id == User.id
        ).filter(
            Prescription.organization_id == org_id,
            Prescription.dispensed_at >= start_date,
            Prescription.dispensed_at < end_date
        ).group_by(User.id, User.first_name, User.last_name).all()

        # Low stock details
        low_stock_details = PharmacyInventory.query.filter(
            PharmacyInventory.organization_id == org_id,
            PharmacyInventory.is_active == True,
            PharmacyInventory.quantity_in_stock <= PharmacyInventory.minimum_stock_level
        ).order_by(PharmacyInventory.quantity_in_stock.asc()).limit(20).all()

        return jsonify({
            'report': {
                'type': 'pharmacy_summary',
                'period': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': (end_date - timedelta(days=1)).strftime('%Y-%m-%d')
                },
                'prescriptions': {
                    'total': total_prescriptions,
                    'pending': status_dict.get('pending', 0),
                    'dispensed': status_dict.get('dispensed', 0),
                    'picked_up': status_dict.get('picked_up', 0),
                    'cancelled': status_dict.get('cancelled', 0),
                    'referred': referred_count,
                    'partially_dispensed': status_dict.get('partially_dispensed', 0),
                    'fulfillment_rate': round(
                        ((status_dict.get('dispensed', 0) + status_dict.get('picked_up', 0)) / total_prescriptions * 100), 1
                    ) if total_prescriptions > 0 else 0,
                    'avg_dispense_hours': avg_dispense_hours
                },
                'inventory': {
                    'total_items': total_items,
                    'low_stock': low_stock_items,
                    'out_of_stock': out_of_stock_items,
                    'expiring_soon': expiring_soon,
                    'expired': expired_items,
                    'total_value': float(inventory_value),
                    'low_stock_details': [{
                        'medication_name': item.medication_name,
                        'strength': item.strength,
                        'quantity_in_stock': item.quantity_in_stock,
                        'minimum_stock_level': item.minimum_stock_level,
                        'expiry_date': item.expiry_date.isoformat() if item.expiry_date else None
                    } for item in low_stock_details]
                },
                'top_medications': [{
                    'medication_name': m[0],
                    'prescription_count': m[1],
                    'total_quantity': m[2]
                } for m in top_medications],
                'pharmacists': [{
                    'id': p[0],
                    'name': f"{p[1]} {p[2]}",
                    'total_dispensed': p[3]
                } for p in pharmacist_stats],
                'daily_trend': [{'date': str(d[0]), 'dispensed': d[1]} for d in daily_trend]
            }
        }), 200

    except Exception as e:
        logger.error(f"Error generating pharmacy report: {str(e)}")
        return jsonify({'error': f'Failed to generate report: {str(e)}'}), 500


# ─── CSV EXPORT ENDPOINTS ─────────────────────────────────────────────────────

@reports_bp.route('/doctor/export', methods=['GET'])
@require_admin_or_role(['doctor'])
def export_doctor_report():
    """Export doctor report as CSV"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        org_id = user.organization_id

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        doctor_id = request.args.get('doctor_id', type=int)

        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
        else:
            start_date = datetime.utcnow() - timedelta(days=30)

        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
        else:
            end_date = datetime.utcnow() + timedelta(days=1)

        if user.role == 'doctor':
            doctor_id = user.id

        doctor_filter = [User.organization_id == org_id, User.role == 'doctor', User.is_active == True]
        if doctor_id:
            doctor_filter.append(User.id == doctor_id)
        doctors = User.query.filter(*doctor_filter).all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Doctor Name', 'Email', 'Patients Seen', 'Unique Patients',
                        'Lab Tests Ordered', 'Prescriptions Written', 'Appointments', 'Completion Rate %'])

        for doc in doctors:
            patients_seen = MedicalRecord.query.filter(
                MedicalRecord.organization_id == org_id,
                MedicalRecord.doctor_id == doc.id,
                MedicalRecord.visit_date >= start_date,
                MedicalRecord.visit_date < end_date
            ).count()

            unique_patients = db.session.query(
                func.count(func.distinct(MedicalRecord.patient_id))
            ).filter(
                MedicalRecord.organization_id == org_id,
                MedicalRecord.doctor_id == doc.id,
                MedicalRecord.visit_date >= start_date,
                MedicalRecord.visit_date < end_date
            ).scalar() or 0

            lab_tests = LabTest.query.filter(
                LabTest.organization_id == org_id,
                LabTest.doctor_id == doc.id,
                LabTest.ordered_at >= start_date,
                LabTest.ordered_at < end_date
            ).count()

            prescriptions = Prescription.query.filter(
                Prescription.organization_id == org_id,
                Prescription.doctor_id == doc.id,
                Prescription.prescribed_at >= start_date,
                Prescription.prescribed_at < end_date
            ).count()

            total_appts = Appointment.query.filter(
                Appointment.organization_id == org_id,
                Appointment.doctor_id == doc.id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date < end_date
            ).count()

            completed_appts = Appointment.query.filter(
                Appointment.organization_id == org_id,
                Appointment.doctor_id == doc.id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date < end_date,
                Appointment.status == 'completed'
            ).count()

            rate = round((completed_appts / total_appts * 100), 1) if total_appts > 0 else 0

            writer.writerow([
                f"{doc.first_name} {doc.last_name}",
                doc.email,
                patients_seen,
                unique_patients,
                lab_tests,
                prescriptions,
                total_appts,
                rate
            ])

        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename=doctor_report_{start_date.strftime("%Y%m%d")}_{(end_date - timedelta(days=1)).strftime("%Y%m%d")}.csv'
        return response

    except Exception as e:
        logger.error(f"Error exporting doctor report: {str(e)}")
        return jsonify({'error': f'Failed to export report: {str(e)}'}), 500


@reports_bp.route('/lab/export', methods=['GET'])
@require_admin_or_role(['lab_technician'])
def export_lab_report():
    """Export lab report as CSV"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        org_id = user.organization_id

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
        else:
            start_date = datetime.utcnow() - timedelta(days=30)

        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
        else:
            end_date = datetime.utcnow() + timedelta(days=1)

        lab_tests = LabTest.query.filter(
            LabTest.organization_id == org_id,
            LabTest.ordered_at >= start_date,
            LabTest.ordered_at < end_date
        ).order_by(LabTest.ordered_at.desc()).all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Test Name', 'Test Type', 'Patient', 'Ordering Doctor', 'Technician',
                        'Status', 'Urgency', 'Ordered At', 'Completed At', 'Abnormal Flag', 'Result'])

        for test in lab_tests:
            patient = Patient.query.get(test.patient_id)
            doctor = User.query.get(test.doctor_id)
            tech = User.query.get(test.lab_technician_id) if test.lab_technician_id else None

            writer.writerow([
                test.test_name,
                test.test_type,
                patient.name if patient else 'N/A',
                f"{doctor.first_name} {doctor.last_name}" if doctor else 'N/A',
                f"{tech.first_name} {tech.last_name}" if tech else 'Unassigned',
                test.status,
                test.urgency,
                test.ordered_at.strftime('%Y-%m-%d %H:%M') if test.ordered_at else '',
                test.completed_at.strftime('%Y-%m-%d %H:%M') if test.completed_at else '',
                test.abnormal_flag or '',
                test.result_value or ''
            ])

        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename=lab_report_{start_date.strftime("%Y%m%d")}_{(end_date - timedelta(days=1)).strftime("%Y%m%d")}.csv'
        return response

    except Exception as e:
        logger.error(f"Error exporting lab report: {str(e)}")
        return jsonify({'error': f'Failed to export report: {str(e)}'}), 500


@reports_bp.route('/pharmacy/export', methods=['GET'])
@require_admin_or_role(['pharmacist'])
def export_pharmacy_report():
    """Export pharmacy report as CSV"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        org_id = user.organization_id

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
        else:
            start_date = datetime.utcnow() - timedelta(days=30)

        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
        else:
            end_date = datetime.utcnow() + timedelta(days=1)

        prescriptions = Prescription.query.filter(
            Prescription.organization_id == org_id,
            Prescription.prescribed_at >= start_date,
            Prescription.prescribed_at < end_date
        ).order_by(Prescription.prescribed_at.desc()).all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Medication', 'Patient', 'Doctor', 'Dosage', 'Quantity',
                        'Status', 'Prescribed At', 'Dispensed At', 'Dispensed By'])

        for rx in prescriptions:
            writer.writerow([
                rx.medication_name,
                rx.patient.name if rx.patient else 'N/A',
                f"{rx.doctor.first_name} {rx.doctor.last_name}" if rx.doctor else 'N/A',
                rx.dosage,
                rx.quantity,
                rx.status,
                rx.prescribed_at.strftime('%Y-%m-%d %H:%M') if rx.prescribed_at else '',
                rx.dispensed_at.strftime('%Y-%m-%d %H:%M') if rx.dispensed_at else '',
                f"{rx.dispensed_by.first_name} {rx.dispensed_by.last_name}" if rx.dispensed_by else ''
            ])

        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename=pharmacy_report_{start_date.strftime("%Y%m%d")}_{(end_date - timedelta(days=1)).strftime("%Y%m%d")}.csv'
        return response

    except Exception as e:
        logger.error(f"Error exporting pharmacy report: {str(e)}")
        return jsonify({'error': f'Failed to export report: {str(e)}'}), 500
