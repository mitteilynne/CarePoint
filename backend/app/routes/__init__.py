from .auth import bp as auth_bp
from .main import bp as main_bp
from .organization import bp as organization_bp
from .lab_technician import lab_technician_bp
from .notifications import notifications_bp

__all__ = ['auth_bp', 'main_bp', 'organization_bp', 'lab_technician_bp', 'notifications_bp']