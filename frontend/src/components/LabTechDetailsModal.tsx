import { useState, useEffect } from 'react';
import api from '@/services/api';

interface LabTest {
  id: number;
  test_type: string;
  patient_name: string;
  patient_id: string;
  status: string;
  assigned_at: string;
  completed_at?: string;
}

interface TestsByType {
  test_type: string;
  completed: number;
  pending: number;
  total: number;
}

interface LabTechnicianStats {
  lab_technician: {
    id: number;
    name: string;
    email: string;
  };
  period_days: number;
  statistics: {
    total_assigned: number;
    total_completed: number;
    total_pending: number;
    efficiency_percentage: number;
  };
  tests_by_type: TestsByType[];
  recent_tests: LabTest[];
}

interface LabTechDetailsModalProps {
  techId: number;
  techName: string;
  isOpen: boolean;
  onClose: () => void;
}

const LabTechDetailsModal = ({ techId, techName, isOpen, onClose }: LabTechDetailsModalProps) => {
  const [stats, setStats] = useState<LabTechnicianStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState(30);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/admin/lab-technicians/${techId}/stats?days=${timePeriod}`);
      setStats(response.data);
    } catch (error: any) {
      console.error('Error fetching lab technician stats:', error);
      setError(error.response?.data?.error || 'Failed to fetch lab technician statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && techId) {
      fetchStats();
    }
  }, [isOpen, techId, timePeriod]);

  const handleTimePeriodChange = (period: number) => {
    setTimePeriod(period);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-gray-900">
            Lab Technician Details: {techName}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-600 mb-1">Total Assigned</h4>
                <p className="text-2xl font-bold text-blue-900">{stats.statistics.total_assigned}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-green-600 mb-1">Completed</h4>
                <p className="text-2xl font-bold text-green-900">{stats.statistics.total_completed}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-600 mb-1">Pending</h4>
                <p className="text-2xl font-bold text-yellow-900">{stats.statistics.total_pending}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-purple-600 mb-1">Efficiency</h4>
                <p className="text-2xl font-bold text-purple-900">{stats.statistics.efficiency_percentage}%</p>
              </div>
            </div>

            {/* Tests by Type */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Tests by Type</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.tests_by_type.map((testType, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {testType.test_type.replace('_', ' ')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{testType.total}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">{testType.completed}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-yellow-600">{testType.pending}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {testType.total > 0 ? Math.round((testType.completed / testType.total) * 100) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Tests */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Recent Tests</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.recent_tests.map((test) => (
                      <tr key={test.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{test.patient_name}</div>
                            <div className="text-gray-500 text-xs">{test.patient_id}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {test.test_type.replace('_', ' ')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(test.status)}`}>
                            {test.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {new Date(test.assigned_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {test.completed_at ? new Date(test.completed_at).toLocaleDateString() : '-'}
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

export default LabTechDetailsModal;