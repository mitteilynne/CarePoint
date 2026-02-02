from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.healthcare import Notification, LabTest, Patient
from ..models.user import User
from .. import db
from ..utils.data_isolation import OrganizationScopedQuery
from datetime import datetime

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get notifications for the current user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_org_id = OrganizationScopedQuery.get_current_org_id()
        if not user_org_id:
            return jsonify({'error': 'User not associated with any organization'}), 400
        
        # Get query parameters
        is_read = request.args.get('is_read')
        notification_type = request.args.get('type')
        limit = request.args.get('limit', 50, type=int)
        
        # Base query
        query = Notification.query.filter(
            Notification.organization_id == user_org_id,
            Notification.recipient_id == current_user_id
        )
        
        # Apply filters
        if is_read is not None:
            query = query.filter(Notification.is_read == (is_read.lower() == 'true'))
        
        if notification_type:
            query = query.filter(Notification.notification_type == notification_type)
        
        # Order by creation date (newest first)
        notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
        
        return jsonify({
            'notifications': [notification.to_dict() for notification in notifications],
            'total': len(notifications)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@notifications_bp.route('/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read():
    """Mark a notification as read"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        notification_id = request.view_args['notification_id']
        user_org_id = OrganizationScopedQuery.get_current_org_id()
        
        if not user_org_id:
            return jsonify({'error': 'User not associated with any organization'}), 400
        
        # Get the notification
        notification = Notification.query.filter(
            Notification.id == notification_id,
            Notification.organization_id == user_org_id,
            Notification.recipient_id == current_user_id
        ).first()
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        # Mark as read
        notification.mark_as_read()
        db.session.commit()
        
        return jsonify({
            'message': 'Notification marked as read',
            'notification': notification.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@notifications_bp.route('/mark-all-read', methods=['PUT'])
@jwt_required()
def mark_all_notifications_read():
    """Mark all notifications as read for the current user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_org_id = OrganizationScopedQuery.get_current_org_id()
        if not user_org_id:
            return jsonify({'error': 'User not associated with any organization'}), 400
        
        # Mark all unread notifications as read
        notifications = Notification.query.filter(
            Notification.organization_id == user_org_id,
            Notification.recipient_id == current_user_id,
            Notification.is_read == False
        ).all()
        
        for notification in notifications:
            notification.mark_as_read()
        
        db.session.commit()
        
        return jsonify({
            'message': f'Marked {len(notifications)} notifications as read',
            'count': len(notifications)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Get count of unread notifications for the current user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_org_id = OrganizationScopedQuery.get_current_org_id()
        if not user_org_id:
            return jsonify({'error': 'User not associated with any organization'}), 400
        
        # Count unread notifications
        unread_count = Notification.query.filter(
            Notification.organization_id == user_org_id,
            Notification.recipient_id == current_user_id,
            Notification.is_read == False
        ).count()
        
        return jsonify({'unread_count': unread_count}), 200
        
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@notifications_bp.route('/lab-results', methods=['GET'])
@jwt_required()
def get_lab_result_notifications():
    """Get lab result notifications with full test details"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'doctor':
            return jsonify({'error': 'Access denied. Doctor role required'}), 403
        
        user_org_id = OrganizationScopedQuery.get_current_org_id()
        if not user_org_id:
            return jsonify({'error': 'User not associated with any organization'}), 400
        
        # Get lab result notifications with test details
        notifications = Notification.query.filter(
            Notification.organization_id == user_org_id,
            Notification.recipient_id == current_user_id,
            Notification.notification_type == 'lab_result'
        ).order_by(Notification.created_at.desc()).all()
        
        result_data = []
        for notification in notifications:
            notification_dict = notification.to_dict()
            
            # Add lab test details
            if notification.lab_test:
                lab_test = notification.lab_test
                patient = lab_test.patient
                
                notification_dict['lab_test'] = {
                    'id': lab_test.id,
                    'test_name': lab_test.test_name,
                    'test_type': lab_test.test_type,
                    'result_value': lab_test.result_value,
                    'result_notes': lab_test.result_notes,
                    'abnormal_flag': lab_test.abnormal_flag,
                    'completed_at': lab_test.completed_at.isoformat() if lab_test.completed_at else None,
                    'patient': {
                        'id': patient.id,
                        'first_name': patient.first_name,
                        'last_name': patient.last_name,
                        'patient_id': patient.patient_id
                    } if patient else None
                }
            
            result_data.append(notification_dict)
        
        return jsonify({
            'notifications': result_data,
            'total': len(result_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500