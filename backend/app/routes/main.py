from flask import Blueprint, jsonify

bp = Blueprint('main', __name__, url_prefix='/api')

@bp.route('/')
def index():
    return jsonify({
        'message': 'Welcome to CarePoint API',
        'version': '1.0.0',
        'status': 'running'
    })

@bp.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'CarePoint Backend'
    })