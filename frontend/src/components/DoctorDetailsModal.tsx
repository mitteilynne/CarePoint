import { useState, useEffect } from 'react';
import api from '@/services/api';

interface Patient {
  id: number;
  patient_id: string;
  name: string;
  visit_count: number;
  last_visit: string | null;
}

interface LabTestType {
  test_type: string;
  total: number;
  completed: number;
  pending: number;
}

interface DoctorStatistics {
  doctor: {
    id: number;
    name: string;
    email: string;
  };
  period_days: number;
  statistics: {
    total_patients: number;
    total_visits: number;
    total_lab_tests: number;
    total_prescriptions: number;
  };
  patients: Patient[];
  lab_tests_by_type: LabTestType[];
}

interface Props {
  doctorId: number;
  doctorName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function DoctorDetailsModal({ doctorId, doctorName, isOpen, onClose }: Props) {
  const [statistics, setStatistics] = useState<DoctorStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState(30);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/admin/doctors/${doctorId}/statistics?days=${timePeriod}`);
      setStatistics(response.data);
    } catch (error: any) {
      console.error('Error fetching doctor statistics:', error);
      setError(error.response?.data?.error || 'Failed to fetch doctor statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && doctorId) {
      fetchStats();
    }
  }, [isOpen, doctorId, timePeriod]);

  const handleTimePeriodChange = (period: number) => {
    setTimePeriod(period);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-gray-900">
            Doctor Details: {doctorName}
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

        {statistics && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-600 mb-1">Patients Seen</h4>
                <p className="text-2xl font-bold text-blue-900">{statistics.statistics.total_patients}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-green-600 mb-1">Total Visits</h4>
                <p className="text-2xl font-bold text-green-900">{statistics.statistics.total_visits}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-orange-600 mb-1">Lab Tests</h4>
                <p className="text-2xl font-bold text-orange-900">{statistics.statistics.total_lab_tests}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-purple-600 mb-1">Prescriptions</h4>
                <p className="text-2xl font-bold text-purple-900">{statistics.statistics.total_prescriptions}</p>
              </div>
            </div>

            {/* Lab Tests by Type */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Lab Tests by Type</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {statistics.lab_tests_by_type.map((testType, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {testType.test_type.replace('_', ' ')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{testType.total}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">{testType.completed}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-yellow-600">{testType.pending}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Patients List */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Patients</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Visit Count</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Visit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {statistics.patients.map((patient) => (
                      <tr key={patient.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-blue-600">
                          {patient.patient_id}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {patient.name}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {patient.visit_count}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : '-'}
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
}
