import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import ReceptionistDashboard from './ReceptionistDashboard';
import DoctorDashboard from './DoctorDashboard';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Route to specific dashboard based on user role
  if (user?.role === 'receptionist') {
    return <ReceptionistDashboard />;
  }
  
  if (user?.role === 'doctor') {
    return <DoctorDashboard />;
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
          <div className="text-center">
            <div className="mb-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
              <h2 className="text-lg font-semibold text-primary-800 mb-1">
                {user?.organization_name || 'Healthcare Facility'}
              </h2>
              <p className="text-sm text-primary-600">
                Organization Code: {user?.organization_code}
              </p>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to your Dashboard, {user?.first_name}!
            </h1>
            <p className="text-gray-600 mb-8">
              You are logged in as a {user?.role}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile</h3>
                <p className="text-gray-600">Manage your account information</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Appointments</h3>
                <p className="text-gray-600">Schedule and manage appointments</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Health Records</h3>
                <p className="text-gray-600">View your medical history</p>
              </div>
            </div>

            <div className="mt-8 bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h3>
              <div className="text-left space-y-2">
                <p><strong>Name:</strong> {user?.first_name} {user?.last_name}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Username:</strong> {user?.username}</p>
                <p><strong>Role:</strong> {user?.role}</p>
                {user?.phone && <p><strong>Phone:</strong> {user.phone}</p>}
                <p><strong>Member since:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}