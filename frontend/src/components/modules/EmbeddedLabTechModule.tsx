import { useState, useEffect } from 'react';
import { LabTest } from '@/types';
import { labTechnicianAPI } from '@/services/api';

interface LabTestWithPatient extends LabTest {
  patient: {
    first_name: string;
    last_name: string;
    patient_id: string;
    date_of_birth: string;
    gender: string;
    phone?: string;
  };
  doctor: {
    first_name: string;
    last_name: string;
  };
}

interface EmbeddedLabTechModuleProps {
  onBack?: () => void;
  isEmbedded?: boolean;
}

export default function EmbeddedLabTechModule({ onBack, isEmbedded = true }: EmbeddedLabTechModuleProps) {
  const [labTests, setLabTests] = useState<LabTestWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [selectedTest, setSelectedTest] = useState<LabTestWithPatient | null>(null);

  useEffect(() => {
    fetchLabTests();
  }, [activeTab]);

  const fetchLabTests = async () => {
    try {
      setLoading(true);
      const statusFilter = getStatusFilter();
      const statusParam = statusFilter.length > 0 ? statusFilter.join(',') : undefined;
      const response = await labTechnicianAPI.getLabTests(statusParam);
      setLabTests(response.lab_tests);
      setError(null);
    } catch (err) {
      setError('Failed to fetch lab tests');
      console.error('Error fetching lab tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusFilter = () => {
    switch (activeTab) {
      case 'pending':
        return ['ordered', 'sample_collected'];
      case 'in_progress':
        return ['in_progress'];
      case 'completed':
        return ['completed'];
      default:
        return ['ordered', 'sample_collected'];
    }
  };

  const updateTestStatus = async (testId: number, newStatus: LabTest['status']) => {
    try {
      await labTechnicianAPI.updateTestStatus(testId, newStatus);
      fetchLabTests();
      setSelectedTest(null);
    } catch (err) {
      setError('Failed to update test status');
      console.error('Error updating test status:', err);
    }
  };

  const submitResults = async (testId: number, results: {
    result_value: string;
    result_notes: string;
    abnormal_flag: 'normal' | 'high' | 'low' | 'critical';
  }) => {
    try {
      const resultsString = JSON.stringify(results);
      await labTechnicianAPI.submitTestResults(testId, resultsString);
      fetchLabTests();
      setSelectedTest(null);
    } catch (err) {
      setError('Failed to submit results');
      console.error('Error submitting results:', err);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'stat': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-orange-100 text-orange-800';
      case 'routine': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ordered': return 'bg-blue-100 text-blue-800';
      case 'sample_collected': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderHeader = () => (
    <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-t-lg flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        <div>
          <h2 className="text-xl font-bold">Lab Technician Module</h2>
          <p className="text-purple-100 text-sm">Full lab technician dashboard access</p>
        </div>
      </div>
      {isEmbedded && onBack && (
        <button
          onClick={onBack}
          className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Admin</span>
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg border shadow-lg overflow-hidden">
        {renderHeader()}
        <div className="flex items-center justify-center p-12">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span>Loading lab tests...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg border shadow-lg overflow-hidden">
      {renderHeader()}
      
      <div className="p-4 min-h-[500px]">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">
              {labTests.filter(t => ['ordered', 'sample_collected'].includes(t.status)).length}
            </div>
            <div className="text-sm text-blue-800">Pending Tests</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">
              {labTests.filter(t => t.status === 'in_progress').length}
            </div>
            <div className="text-sm text-yellow-800">In Progress</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">
              {labTests.filter(t => t.status === 'completed').length}
            </div>
            <div className="text-sm text-green-800">Completed</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { key: 'pending', label: 'Pending', count: labTests.filter(t => ['ordered', 'sample_collected'].includes(t.status)).length },
              { key: 'in_progress', label: 'In Progress', count: labTests.filter(t => t.status === 'in_progress').length },
              { key: 'completed', label: 'Completed', count: labTests.filter(t => t.status === 'completed').length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Refresh Button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={fetchLabTests}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Lab Tests Grid */}
        {labTests.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No lab tests found for this category
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {labTests.map((test) => (
              <div
                key={test.id}
                className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedTest(test)}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{test.test_name}</h3>
                      <p className="text-sm text-gray-600">{test.test_type}</p>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(test.urgency)}`}>
                        {test.urgency}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                        {test.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Patient:</span>
                      <p className="text-gray-900">
                        {test.patient?.first_name} {test.patient?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">ID: {test.patient?.patient_id}</p>
                    </div>

                    <div>
                      <span className="font-medium text-gray-700">Doctor:</span>
                      <p className="text-gray-900">
                        Dr. {test.doctor?.first_name} {test.doctor?.last_name}
                      </p>
                    </div>

                    <div>
                      <span className="font-medium text-gray-700">Ordered:</span>
                      <p className="text-gray-900">
                        {new Date(test.ordered_at!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t flex justify-between text-xs text-gray-500">
                    <span>Sample: {test.sample_type || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Detail Modal */}
      {selectedTest && (
        <TestDetailModal
          test={selectedTest}
          onClose={() => setSelectedTest(null)}
          onStatusUpdate={updateTestStatus}
          onSubmitResults={submitResults}
        />
      )}
    </div>
  );
}

interface TestDetailModalProps {
  test: LabTestWithPatient;
  onClose: () => void;
  onStatusUpdate: (testId: number, status: LabTest['status']) => void;
  onSubmitResults: (testId: number, results: any) => void;
}

function TestDetailModal({ test, onClose, onStatusUpdate, onSubmitResults }: TestDetailModalProps) {
  const [resultForm, setResultForm] = useState({
    result_value: test.result_value || '',
    result_notes: test.result_notes || '',
    abnormal_flag: test.abnormal_flag || 'normal' as const
  });

  const handleSubmitResults = () => {
    onSubmitResults(test.id!, resultForm);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Lab Test Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Test Name</label>
              <p className="text-sm text-gray-900">{test.test_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Test Type</label>
              <p className="text-sm text-gray-900">{test.test_type}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Patient Information</label>
            <div className="mt-1 text-sm text-gray-900">
              <p>{test.patient?.first_name} {test.patient?.last_name}</p>
              <p>ID: {test.patient?.patient_id}</p>
              <p>DOB: {test.patient?.date_of_birth}</p>
              <p>Gender: {test.patient?.gender}</p>
            </div>
          </div>

          {test.clinical_notes && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Clinical Notes</label>
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{test.clinical_notes}</p>
            </div>
          )}

          {test.status === 'ordered' && (
            <div className="pt-4 border-t">
              <button
                onClick={() => onStatusUpdate(test.id!, 'sample_collected')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mr-2"
              >
                Mark Sample Collected
              </button>
            </div>
          )}

          {test.status === 'sample_collected' && (
            <div className="pt-4 border-t">
              <button
                onClick={() => onStatusUpdate(test.id!, 'in_progress')}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
              >
                Start Processing
              </button>
            </div>
          )}

          {test.status === 'in_progress' && (
            <div className="pt-4 border-t space-y-4">
              <h4 className="font-medium text-gray-900">Submit Results</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Result Value *</label>
                <input
                  type="text"
                  value={resultForm.result_value}
                  onChange={(e) => setResultForm(prev => ({ ...prev, result_value: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 border p-2"
                  placeholder="Enter result value"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Result Notes</label>
                <textarea
                  value={resultForm.result_notes}
                  onChange={(e) => setResultForm(prev => ({ ...prev, result_notes: e.target.value }))}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 border p-2"
                  placeholder="Additional notes about the results"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Result Flag</label>
                <select
                  value={resultForm.abnormal_flag}
                  onChange={(e) => setResultForm(prev => ({ ...prev, abnormal_flag: e.target.value as any }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 border p-2"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <button
                onClick={handleSubmitResults}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                disabled={!resultForm.result_value.trim()}
              >
                Submit Results & Complete
              </button>
            </div>
          )}

          {test.status === 'completed' && test.result_value && (
            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-900 mb-2">Results</h4>
              <div className="bg-gray-50 p-3 rounded-md">
                <p><strong>Value:</strong> {test.result_value}</p>
                {test.result_notes && <p><strong>Notes:</strong> {test.result_notes}</p>}
                <p><strong>Flag:</strong> {test.abnormal_flag}</p>
                {test.completed_at && (
                  <p><strong>Completed:</strong> {new Date(test.completed_at).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
