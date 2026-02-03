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
  onBack: () => void;
}

export default function DoctorDetailsModal({ doctorId, onBack }: Props) {
  const [statistics, setStatistics] = useState<DoctorStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [periodDays, setPeriodDays] = useState(30);

  useEffect(() => {
    loadDoctorStatistics();
  }, [doctorId, periodDays]);

  const loadDoctorStatistics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/doctors/${doctorId}/statistics`, { 
        params: { days: periodDays } 
      });
      setStatistics(response.data);
    } catch (error: any) {
      console.error('Error loading doctor statistics:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to load doctor statistics' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!statistics && !loading) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Doctor Activity Details
            </h2>
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {message.text && (
            <div className={`mb-4 p-3 rounded ${
              message.type === 'error' 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : statistics ? (
            <div className="space-y-6">
              {/* Doctor Info & Period Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {statistics.doctor.name}
                  </h3>
                  <p className="text-sm text-gray-500">{statistics.doctor.email}</p>
                </div>
                <div className="mt-4 sm:mt-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Period
                  </label>
                  <select
                    value={periodDays}
                    onChange={(e) => setPeriodDays(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 3 months</option>
                    <option value={180}>Last 6 months</option>
                    <option value={365}>Last year</option>
                  </select>
                </div>
              </div>

              {/* Statistics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-800">
                    {statistics.statistics.total_patients}
                  </div>
                  <div className="text-blue-600">Patients Seen</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-800">
                    {statistics.statistics.total_visits}
                  </div>
                  <div className="text-green-600">Total Visits</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-800">
                    {statistics.statistics.total_lab_tests}
                  </div>
                  <div className="text-orange-600">Lab Tests Ordered</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="text-2xl font-bold text-purple-800">
                    {statistics.statistics.total_prescriptions}
                  </div>
                  <div className="text-purple-600">Prescriptions</div>
                </div>
              </div>

              {/* Lab Tests by Type */}
              {statistics.lab_tests_by_type.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h4 className="text-lg font-medium text-gray-900">Lab Tests by Type</h4>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {statistics.lab_tests_by_type.map((testType, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded border">
                          <div className="font-medium text-gray-900 capitalize">
                            {testType.test_type.replace('_', ' ')}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Total: {testType.total} | 
                            Completed: {testType.completed} | 
                            Pending: {testType.pending}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Patients List */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="text-lg font-medium text-gray-900">Patients Seen</h4>
                </div>
                <div className="overflow-x-auto">
                  {statistics.patients.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Patient
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Patient ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Visits
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Visit
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {statistics.patients.map((patient) => (
                          <tr key={patient.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {patient.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {patient.patient_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {patient.visit_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {patient.last_visit 
                                ? new Date(patient.last_visit).toLocaleDateString()
                                : 'N/A'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      No patient data available for the selected period
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}