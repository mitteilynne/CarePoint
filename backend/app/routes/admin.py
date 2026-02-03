from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from app import db
from app.models import User, Organization
from app.models.healthcare import Patient, MedicalRecord, LabTest
from sqlalchemy import func, case, and_, or_
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('admin', __name__, url_prefix='/api/admin')

def require_admin(f):
    """Decorator to ensure user has admin role"""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

@bp.route('/dashboard/overview', methods=['GET'])
@jwt_required()
def get_dashboard_overview():
    """Get overview statistics for admin dashboard"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        org_id = user.organization_id
        
        # Get user counts by role
        user_counts = db.session.query(
            User.role,
            func.count(User.id).label('count')
        ).filter(
            User.organization_id == org_id,
            User.is_active == True
        ).group_by(User.role).all()
        
        # Get recent registrations (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_users = db.session.query(
            func.date(User.created_at).label('date'),
            func.count(User.id).label('count')
        ).filter(
            User.organization_id == org_id,
            User.created_at >= thirty_days_ago
        ).group_by(func.date(User.created_at)).order_by('date').all()
        
        # Format data for response
        role_counts = {role: count for role, count in user_counts}
        registration_trends = [
            {
                'date': str(date),
                'count': count
            } for date, count in recent_users
        ]
        
        # Calculate total active users
        total_users = sum(role_counts.values())
        
        return jsonify({
            'overview': {
                'total_users': total_users,
                'role_counts': role_counts,
                'registration_trends': registration_trends
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting dashboard overview: {str(e)}")
        return jsonify({'error': 'Failed to get dashboard overview'}), 500

@bp.route('/users', methods=['GET'])
@require_admin
def get_all_users():
    """Get all users in the organization with filtering and pagination"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        org_id = user.organization_id
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        role_filter = request.args.get('role', None)
        search = request.args.get('search', '')
        status_filter = request.args.get('status', 'all')  # 'active', 'inactive', 'all'
        
        # Build query
        query = User.query.filter(User.organization_id == org_id)
        
        # Apply filters
        if role_filter and role_filter != 'all':
            query = query.filter(User.role == role_filter)
        
        if status_filter == 'active':
            query = query.filter(User.is_active == True)
        elif status_filter == 'inactive':
            query = query.filter(User.is_active == False)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    User.email.ilike(search_term),
                    User.username.ilike(search_term)
                )
            )
        
        # Order by creation date (newest first)
        query = query.order_by(User.created_at.desc())
        
        # Paginate
        users_paginated = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Format users data
        users_data = []
        for user in users_paginated.items:
            users_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'is_active': user.is_active,
                'email_confirmed': user.email_confirmed,
                'phone': user.phone,
                'address': user.address,
                'created_at': user.created_at.isoformat(),
                'updated_at': user.updated_at.isoformat()
            })
        
        return jsonify({
            'users': users_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': users_paginated.total,
                'pages': users_paginated.pages,
                'has_prev': users_paginated.has_prev,
                'has_next': users_paginated.has_next
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}")
        return jsonify({'error': 'Failed to get users'}), 500

@bp.route('/users/<int:user_id>', methods=['GET'])
@require_admin
def get_user_detail(user_id):
    """Get detailed information about a specific user"""
    try:
        current_user_id = int(get_jwt_identity())
        admin_user = User.query.get(current_user_id)
        org_id = admin_user.organization_id
        
        # Get the user (must be in same organization)
        user = User.query.filter(
            User.id == user_id,
            User.organization_id == org_id
        ).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'is_active': user.is_active,
            'email_confirmed': user.email_confirmed,
            'phone': user.phone,
            'address': user.address,
            'created_at': user.created_at.isoformat(),
            'updated_at': user.updated_at.isoformat()
        }
        
        return jsonify({'user': user_data}), 200
        
    except Exception as e:
        logger.error(f"Error getting user detail: {str(e)}")
        return jsonify({'error': 'Failed to get user detail'}), 500

@bp.route('/users/<int:user_id>/toggle-status', methods=['POST'])
@require_admin
def toggle_user_status(user_id):
    """Toggle user active/inactive status"""
    try:
        current_user_id = int(get_jwt_identity())
        admin_user = User.query.get(current_user_id)
        org_id = admin_user.organization_id
        
        # Get the user (must be in same organization)
        user = User.query.filter(
            User.id == user_id,
            User.organization_id == org_id
        ).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Don't allow admin to deactivate themselves
        if user.id == current_user_id:
            return jsonify({'error': 'Cannot deactivate your own account'}), 400
        
        # Toggle status
        user.is_active = not user.is_active
        user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        action = 'activated' if user.is_active else 'deactivated'
        logger.info(f"Admin {current_user_id} {action} user {user_id}")
        
        return jsonify({
            'message': f'User {action} successfully',
            'user': {
                'id': user.id,
                'is_active': user.is_active
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error toggling user status: {str(e)}")
        return jsonify({'error': 'Failed to update user status'}), 500

@bp.route('/users/<int:user_id>/role', methods=['PUT'])
@require_admin
def update_user_role(user_id):
    """Update user role"""
    try:
        current_user_id = int(get_jwt_identity())
        admin_user = User.query.get(current_user_id)
        org_id = admin_user.organization_id
        
        data = request.get_json()
        new_role = data.get('role')
        
        if not new_role:
            return jsonify({'error': 'Role is required'}), 400
        
        # Validate role
        valid_roles = ['patient', 'doctor', 'admin', 'receptionist', 'nurse', 'pharmacist', 'lab_technician']
        if new_role not in valid_roles:
            return jsonify({'error': 'Invalid role'}), 400
        
        # Get the user (must be in same organization)
        user = User.query.filter(
            User.id == user_id,
            User.organization_id == org_id
        ).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Don't allow admin to change their own role
        if user.id == current_user_id:
            return jsonify({'error': 'Cannot change your own role'}), 400
        
        old_role = user.role
        user.role = new_role
        user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        logger.info(f"Admin {current_user_id} changed user {user_id} role from {old_role} to {new_role}")
        
        return jsonify({
            'message': f'User role updated from {old_role} to {new_role}',
            'user': {
                'id': user.id,
                'role': user.role
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating user role: {str(e)}")
        return jsonify({'error': 'Failed to update user role'}), 500

@bp.route('/organization/info', methods=['GET'])
@require_admin
def get_organization_info():
    """Get organization information"""
    try:
        current_user_id = int(get_jwt_identity())
        admin_user = User.query.get(current_user_id)
        org = admin_user.organization
        
        org_data = {
            'id': org.id,
            'code': org.code,
            'name': org.name,
            'type': org.organization_type,
            'is_active': org.is_active,
            'created_at': org.created_at.isoformat()
        }
        
        return jsonify({'organization': org_data}), 200
        
    except Exception as e:
        logger.error(f"Error getting organization info: {str(e)}")
        return jsonify({'error': 'Failed to get organization info'}), 500

@bp.route('/doctors/<int:doctor_id>/statistics', methods=['GET'])
@jwt_required()
def get_doctor_statistics(doctor_id):
    """Get detailed statistics for a specific doctor"""
    try:
        current_user_id = int(get_jwt_identity())
        admin_user = User.query.get(current_user_id)
        
        if not admin_user or admin_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        org_id = admin_user.organization_id
        
        # Verify doctor exists and belongs to same organization
        doctor = User.query.filter(
            User.id == doctor_id,
            User.organization_id == org_id,
            User.role == 'doctor'
        ).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
        
        # Get time period from query params (default to last 30 days)
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get patients seen by this doctor
        patients_query = db.session.query(
            Patient.id,
            Patient.first_name,
            Patient.last_name,
            Patient.patient_id,
            func.count(MedicalRecord.id).label('visit_count'),
            func.max(MedicalRecord.visit_date).label('last_visit')
        ).join(
            MedicalRecord, Patient.id == MedicalRecord.patient_id
        ).filter(
            MedicalRecord.doctor_id == doctor_id,
            MedicalRecord.organization_id == org_id,
            MedicalRecord.visit_date >= start_date
        ).group_by(
            Patient.id, Patient.first_name, Patient.last_name, Patient.patient_id
        ).all()
        
        # Get total statistics
        total_patients = len(patients_query)
        total_visits = sum(p.visit_count for p in patients_query)
        
        # Get lab tests ordered
        lab_tests = db.session.query(
            func.count(LabTest.id).label('total_tests'),
            LabTest.test_type,
            func.count(case((LabTest.status == 'completed', 1), else_=None)).label('completed_tests'),
            func.count(case((LabTest.status == 'pending', 1), else_=None)).label('pending_tests')
        ).filter(
            LabTest.doctor_id == doctor_id,
            LabTest.organization_id == org_id,
            LabTest.ordered_at >= start_date
        ).group_by(LabTest.test_type).all()
        
        total_lab_tests = db.session.query(func.count(LabTest.id)).filter(
            LabTest.doctor_id == doctor_id,
            LabTest.organization_id == org_id,
            LabTest.ordered_at >= start_date
        ).scalar()
        
        # Get prescriptions (from medical records)
        prescriptions_count = db.session.query(func.count(MedicalRecord.id)).filter(
            MedicalRecord.doctor_id == doctor_id,
            MedicalRecord.organization_id == org_id,
            MedicalRecord.visit_date >= start_date,
            MedicalRecord.medications_prescribed.isnot(None),
            MedicalRecord.medications_prescribed != ''
        ).scalar()
        
        # Format patients data
        patients_data = []
        for p in patients_query:
            patients_data.append({
                'id': p.id,
                'patient_id': p.patient_id,
                'name': f"{p.first_name} {p.last_name}",
                'visit_count': p.visit_count,
                'last_visit': p.last_visit.isoformat() if p.last_visit else None
            })
        
        # Format lab tests data
        lab_tests_data = []
        for test in lab_tests:
            lab_tests_data.append({
                'test_type': test.test_type,
                'total': test.total_tests,
                'completed': test.completed_tests,
                'pending': test.pending_tests
            })
        
        return jsonify({
            'doctor': {
                'id': doctor.id,
                'name': f"{doctor.first_name} {doctor.last_name}",
                'email': doctor.email
            },
            'period_days': days,
            'statistics': {
                'total_patients': total_patients,
                'total_visits': total_visits,
                'total_lab_tests': total_lab_tests,
                'total_prescriptions': prescriptions_count
            },
            'patients': patients_data,
            'lab_tests_by_type': lab_tests_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting doctor statistics: {str(e)}")
        return jsonify({'error': 'Failed to get doctor statistics'}), 500

@bp.route('/doctors/summary', methods=['GET'])
@jwt_required()
def get_doctors_summary():
    """Get summary statistics for all doctors in the organization"""
    try:
        current_user_id = int(get_jwt_identity())
        admin_user = User.query.get(current_user_id)
        
        if not admin_user or admin_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        org_id = admin_user.organization_id
        
        # Get time period from query params (default to last 30 days)
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get all doctors in the organization
        doctors = User.query.filter(
            User.organization_id == org_id,
            User.role == 'doctor',
            User.is_active == True
        ).all()
        
        doctors_summary = []
        
        for doctor in doctors:
            # Count patients seen
            patients_count = db.session.query(
                func.count(func.distinct(MedicalRecord.patient_id))
            ).filter(
                MedicalRecord.doctor_id == doctor.id,
                MedicalRecord.organization_id == org_id,
                MedicalRecord.visit_date >= start_date
            ).scalar()
            
            # Count total visits
            visits_count = db.session.query(func.count(MedicalRecord.id)).filter(
                MedicalRecord.doctor_id == doctor.id,
                MedicalRecord.organization_id == org_id,
                MedicalRecord.visit_date >= start_date
            ).scalar()
            
            # Count lab tests ordered
            lab_tests_count = db.session.query(func.count(LabTest.id)).filter(
                LabTest.doctor_id == doctor.id,
                LabTest.organization_id == org_id,
                LabTest.ordered_at >= start_date
            ).scalar()
            
            # Count prescriptions
            prescriptions_count = db.session.query(func.count(MedicalRecord.id)).filter(
                MedicalRecord.doctor_id == doctor.id,
                MedicalRecord.organization_id == org_id,
                MedicalRecord.visit_date >= start_date,
                MedicalRecord.medications_prescribed.isnot(None),
                MedicalRecord.medications_prescribed != ''
            ).scalar()
            
            doctors_summary.append({
                'id': doctor.id,
                'name': f"{doctor.first_name} {doctor.last_name}",
                'email': doctor.email,
                'username': doctor.username,
                'is_active': doctor.is_active,
                'patients_count': patients_count or 0,
                'visits_count': visits_count or 0,
                'lab_tests_count': lab_tests_count or 0,
                'prescriptions_count': prescriptions_count or 0
            })
        
        return jsonify({
            'period_days': days,
            'doctors': doctors_summary
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting doctors summary: {str(e)}")
        return jsonify({'error': 'Failed to get doctors summary'}), 500


@bp.route('/lab-technicians', methods=['GET'])
@require_admin
def get_lab_technicians_summary():
    """Get summary statistics for all lab technicians"""
    try:
        current_user_id = int(get_jwt_identity())
        admin_user = User.query.get(current_user_id)
        org_id = admin_user.organization_id
        
        # Get days parameter for date filtering
        days = request.args.get('days', default=30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get all lab technicians in organization
        lab_technicians = User.query.filter(
            User.organization_id == org_id,
            User.role == 'lab_technician',
            User.is_active == True
        ).all()
        
        lab_techs_summary = []
        for lab_tech in lab_technicians:
            # Count tests assigned
            assigned_tests_count = db.session.query(func.count(LabTest.id)).filter(
                LabTest.lab_technician_id == lab_tech.id,
                LabTest.organization_id == org_id,
                LabTest.assigned_at >= start_date
            ).scalar()
            
            # Count completed tests
            completed_tests_count = db.session.query(func.count(LabTest.id)).filter(
                LabTest.lab_technician_id == lab_tech.id,
                LabTest.organization_id == org_id,
                LabTest.status == 'completed',
                LabTest.assigned_at >= start_date
            ).scalar()
            
            # Count pending tests
            pending_tests_count = db.session.query(func.count(LabTest.id)).filter(
                LabTest.lab_technician_id == lab_tech.id,
                LabTest.organization_id == org_id,
                LabTest.status == 'pending',
                LabTest.assigned_at >= start_date
            ).scalar()
            
            # Calculate efficiency (completed/assigned)
            efficiency = (completed_tests_count / assigned_tests_count * 100) if assigned_tests_count > 0 else 0
            
            lab_techs_summary.append({
                'id': lab_tech.id,
                'name': f"{lab_tech.first_name} {lab_tech.last_name}",
                'email': lab_tech.email,
                'username': lab_tech.username,
                'is_active': lab_tech.is_active,
                'assigned_tests_count': assigned_tests_count or 0,
                'completed_tests_count': completed_tests_count or 0,
                'pending_tests_count': pending_tests_count or 0,
                'efficiency_percentage': round(efficiency, 1)
            })
        
        return jsonify({
            'period_days': days,
            'lab_technicians': lab_techs_summary
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting lab technicians summary: {str(e)}")
        return jsonify({'error': 'Failed to get lab technicians summary'}), 500


@bp.route('/lab-technicians/<int:tech_id>/stats', methods=['GET'])
@require_admin
def get_lab_technician_statistics(tech_id):
    """Get detailed statistics for a specific lab technician"""
    try:
        current_user_id = int(get_jwt_identity())
        admin_user = User.query.get(current_user_id)
        org_id = admin_user.organization_id
        
        # Get days parameter for date filtering
        days = request.args.get('days', default=30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get the lab technician (must be in same organization)
        lab_tech = User.query.filter(
            User.id == tech_id,
            User.organization_id == org_id,
            User.role == 'lab_technician'
        ).first()
        
        if not lab_tech:
            return jsonify({'error': 'Lab technician not found'}), 404
        
        # Get test statistics by type and status
        test_stats = db.session.query(
            LabTest.test_type,
            func.count(case((LabTest.status == 'completed', 1), else_=None)).label('completed'),
            func.count(case((LabTest.status == 'pending', 1), else_=None)).label('pending'),
            func.count(LabTest.id).label('total')
        ).filter(
            LabTest.lab_technician_id == tech_id,
            LabTest.organization_id == org_id,
            LabTest.assigned_at >= start_date
        ).group_by(LabTest.test_type).all()
        
        tests_by_type = []
        for stat in test_stats:
            tests_by_type.append({
                'test_type': stat.test_type,
                'completed': stat.completed,
                'pending': stat.pending,
                'total': stat.total
            })
        
        # Get recent tests
        recent_tests = db.session.query(LabTest).join(Patient).filter(
            LabTest.lab_technician_id == tech_id,
            LabTest.organization_id == org_id,
            LabTest.assigned_at >= start_date
        ).order_by(LabTest.assigned_at.desc()).limit(20).all()
        
        tests_data = []
        for test in recent_tests:
            tests_data.append({
                'id': test.id,
                'test_type': test.test_type,
                'patient_name': test.patient.name,
                'patient_id': test.patient.patient_id,
                'status': test.status,
                'assigned_at': test.assigned_at.isoformat(),
                'completed_at': test.completed_at.isoformat() if test.completed_at else None
            })
        
        # Calculate totals
        total_assigned = db.session.query(func.count(LabTest.id)).filter(
            LabTest.lab_technician_id == tech_id,
            LabTest.organization_id == org_id,
            LabTest.assigned_at >= start_date
        ).scalar()
        
        total_completed = db.session.query(func.count(LabTest.id)).filter(
            LabTest.lab_technician_id == tech_id,
            LabTest.organization_id == org_id,
            LabTest.status == 'completed',
            LabTest.assigned_at >= start_date
        ).scalar()
        
        total_pending = db.session.query(func.count(LabTest.id)).filter(
            LabTest.lab_technician_id == tech_id,
            LabTest.organization_id == org_id,
            LabTest.status == 'pending',
            LabTest.assigned_at >= start_date
        ).scalar()
        
        return jsonify({
            'lab_technician': {
                'id': lab_tech.id,
                'name': f"{lab_tech.first_name} {lab_tech.last_name}",
                'email': lab_tech.email
            },
            'period_days': days,
            'statistics': {
                'total_assigned': total_assigned or 0,
                'total_completed': total_completed or 0,
                'total_pending': total_pending or 0,
                'efficiency_percentage': round((total_completed / total_assigned * 100) if total_assigned > 0 else 0, 1)
            },
            'tests_by_type': tests_by_type,
            'recent_tests': tests_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting lab technician statistics: {str(e)}")
        return jsonify({'error': 'Failed to get lab technician statistics'}), 500


@bp.route('/receptionists', methods=['GET'])
@require_admin
def get_receptionists_summary():
    """Get summary statistics for all receptionists"""
    try:
        current_user_id = int(get_jwt_identity())
        admin_user = User.query.get(current_user_id)
        org_id = admin_user.organization_id
        
        # Get days parameter for date filtering
        days = request.args.get('days', default=30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get all receptionists in organization
        receptionists = User.query.filter(
            User.organization_id == org_id,
            User.role == 'receptionist',
            User.is_active == True
        ).all()
        
        receptionists_summary = []
        for receptionist in receptionists:
            # Count patients registered
            patients_registered = db.session.query(func.count(Patient.id)).filter(
                Patient.organization_id == org_id,
                Patient.registered_at >= start_date,
                Patient.registered_by_id == receptionist.id
            ).scalar()
            
            # Count appointments scheduled (using medical records as proxy)
            appointments_scheduled = db.session.query(func.count(MedicalRecord.id)).filter(
                MedicalRecord.organization_id == org_id,
                MedicalRecord.visit_date >= start_date,
                MedicalRecord.created_by_id == receptionist.id
            ).scalar()
            
            receptionists_summary.append({
                'id': receptionist.id,
                'name': f"{receptionist.first_name} {receptionist.last_name}",
                'email': receptionist.email,
                'username': receptionist.username,
                'is_active': receptionist.is_active,
                'patients_registered': patients_registered or 0,
                'appointments_scheduled': appointments_scheduled or 0
            })
        
        return jsonify({
            'period_days': days,
            'receptionists': receptionists_summary
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting receptionists summary: {str(e)}")
        return jsonify({'error': 'Failed to get receptionists summary'}), 500


@bp.route('/receptionists/<int:receptionist_id>/stats', methods=['GET'])
@require_admin
def get_receptionist_statistics(receptionist_id):
    """Get detailed statistics for a specific receptionist"""
    try:
        current_user_id = int(get_jwt_identity())
        admin_user = User.query.get(current_user_id)
        org_id = admin_user.organization_id
        
        # Get days parameter for date filtering
        days = request.args.get('days', default=30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get the receptionist (must be in same organization)
        receptionist = User.query.filter(
            User.id == receptionist_id,
            User.organization_id == org_id,
            User.role == 'receptionist'
        ).first()
        
        if not receptionist:
            return jsonify({'error': 'Receptionist not found'}), 404
        
        # Get patients registered by this receptionist
        patients_registered = db.session.query(Patient).filter(
            Patient.organization_id == org_id,
            Patient.registered_at >= start_date,
            Patient.registered_by_id == receptionist_id
        ).order_by(Patient.registered_at.desc()).limit(20).all()
        
        patients_data = []
        for patient in patients_registered:
            patients_data.append({
                'id': patient.id,
                'patient_id': patient.patient_id,
                'name': patient.name,
                'registered_at': patient.registered_at.isoformat(),
                'phone': patient.phone,
                'email': patient.email
            })
        
        # Get appointments scheduled by this receptionist
        appointments = db.session.query(MedicalRecord).join(Patient).filter(
            MedicalRecord.organization_id == org_id,
            MedicalRecord.visit_date >= start_date,
            MedicalRecord.created_by_id == receptionist_id
        ).order_by(MedicalRecord.visit_date.desc()).limit(20).all()
        
        appointments_data = []
        for appointment in appointments:
            appointments_data.append({
                'id': appointment.id,
                'patient_name': appointment.patient.name,
                'patient_id': appointment.patient.patient_id,
                'visit_date': appointment.visit_date.isoformat(),
                'chief_complaint': appointment.chief_complaint,
                'visit_type': appointment.visit_type
            })
        
        # Calculate totals
        total_patients = db.session.query(func.count(Patient.id)).filter(
            Patient.organization_id == org_id,
            Patient.registered_at >= start_date,
            Patient.registered_by_id == receptionist_id
        ).scalar()
        
        total_appointments = db.session.query(func.count(MedicalRecord.id)).filter(
            MedicalRecord.organization_id == org_id,
            MedicalRecord.visit_date >= start_date,
            MedicalRecord.created_by_id == receptionist_id
        ).scalar()
        
        return jsonify({
            'receptionist': {
                'id': receptionist.id,
                'name': f"{receptionist.first_name} {receptionist.last_name}",
                'email': receptionist.email
            },
            'period_days': days,
            'statistics': {
                'total_patients_registered': total_patients or 0,
                'total_appointments_scheduled': total_appointments or 0
            },
            'recent_patients': patients_data,
            'recent_appointments': appointments_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting receptionist statistics: {str(e)}")
        return jsonify({'error': 'Failed to get receptionist statistics'}), 500