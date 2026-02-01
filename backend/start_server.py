import os
import logging
from app import create_app, db
from app.models import User, Organization, PasswordReset

# Set up logging
logging.basicConfig(level=logging.INFO)

app = create_app(os.getenv('FLASK_CONFIG', 'default'))

@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'User': User, 'Organization': Organization, 'PasswordReset': PasswordReset}

@app.route('/health')
def health_check():
    return {'status': 'healthy', 'message': 'CarePoint API is running'}, 200

if __name__ == '__main__':
    print("Starting CarePoint Backend Server...")
    print("Server will be available at:")
    print("  - http://localhost:5000")
    print("  - http://127.0.0.1:5000")
    print("\nAPI Endpoints:")
    print("  - POST /api/auth/login")
    print("  - POST /api/auth/register") 
    print("  - POST /api/organization/validate-code")
    print("  - GET /health")
    
    try:
        app.run(host='0.0.0.0', port=5000, debug=True)
    except Exception as e:
        print(f"Error starting server: {e}")
        raise