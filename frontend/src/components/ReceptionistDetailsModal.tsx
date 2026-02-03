import { useState, useEffect } from 'react';
import api from '@/services/api';

interface Patient {
  id: number;
  patient_id: string;
  name: string;
  registered_at: string;
  phone?: string;
  email?: string;
}

interface Appointment {
  id: number;
  patient_name: string;
  patient_id: string;
  visit_date: string;
  chief_complaint: string;
  visit_type: string;
}

interface ReceptionistStats {
  receptionist: {
    id: number;
    name: string;
    email: string;
  };
  period_days: number;
  statistics: {
    total_patients_registered: number;
    total_appointments_scheduled: number;
  };
  recent_patients: Patient[];
  recent_appointments: Appointment[];
}

interface ReceptionistDetailsModalProps {
  receptionistId: number;
  receptionistName: string;
  isOpen: boolean;
  onClose: () => void;
}

const ReceptionistDetailsModal = ({ receptionistId, receptionistName, isOpen, onClose }: ReceptionistDetailsModalProps) => {
  const [stats, setStats] = useState<ReceptionistStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState(30);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/admin/receptionists/${receptionistId}/stats?days=${timePeriod}`);
      setStats(response.data);
    } catch (error: any) {
      console.error('Error fetching receptionist stats:', error);
      setError(error.response?.data?.error || 'Failed to fetch receptionist statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && receptionistId) {
      fetchStats();
    }
  }, [isOpen, receptionistId, timePeriod]);

  const handleTimePeriodChange = (period: number) => {
    setTimePeriod(period);
  };

  const getVisitTypeColor = (visitType: string) => {
    switch (visitType) {
      case 'emergency': return 'text-red-600 bg-red-50';
      case 'appointment': return 'text-blue-600 bg-blue-50';
      case 'follow_up': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-gray-900">
            Receptionist Details: {receptionistName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Time Period Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Period:
          </label>
          <div className="flex space-x-2">
            {[7, 30, 90].map(period => (
              <button
                key={period}
                onClick={() => handleTimePeriodChange(period)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  timePeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {period} days
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {stats && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-600 mb-1">Patients Registered</h4>
                <p className="text-2xl font-bold text-blue-900">{stats.statistics.total_patients_registered}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-green-600 mb-1">Appointments Scheduled</h4>
                <p className="text-2xl font-bold text-green-900">{stats.statistics.total_appointments_scheduled}</p>
              </div>
            </div>

            {/* Recent Patients */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Recent Patients Registered</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.recent_patients.map((patient) => (
                      <tr key={patient.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-blue-600">
                          {patient.patient_id}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {patient.name}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {new Date(patient.registered_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            {patient.phone && <div>{patient.phone}</div>}
                            {patient.email && <div className="text-xs text-gray-500">{patient.email}</div>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Appointments */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Recent Appointments Scheduled</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Visit Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Chief Complaint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.recent_appointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{appointment.patient_name}</div>
                            <div className="text-gray-500 text-xs">{appointment.patient_id}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {new Date(appointment.visit_date).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getVisitTypeColor(appointment.visit_type)}`}>
                            {appointment.visit_type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate">
                          {appointment.chief_complaint || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceptionistDetailsModal;