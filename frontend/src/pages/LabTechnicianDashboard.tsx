import { useState, useEffect } from 'react';
import { LabTest } from '../types';
import { labTechnicianAPI, notificationsAPI } from '../services/api';

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

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  is_read: boolean;
  created_at: string;
  lab_test_id?: number;
  patient_id?: number;
  sender?: {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
  };
}

export default function LabTechnicianDashboard() {
  const [labTests, setLabTests] = useState<LabTestWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [selectedTest, setSelectedTest] = useState<LabTestWithPatient | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchLabTests();
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
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

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getNotifications({ limit: 20 });
      setNotifications(response.notifications || []);
      const unread = response.notifications?.filter((n: Notification) => !n.is_read).length || 0;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.is_read) {
        await notificationsAPI.markAsRead(notification.id);
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      // If notification is related to a lab test, optionally navigate to it
      if (notification.lab_test_id) {
        const test = labTests.find(t => t.id === notification.lab_test_id);
        if (test) {
          setSelectedTest(test);
          setShowNotifications(false);
        } else {
          // Refresh lab tests to get the new one
          await fetchLabTests();
        }
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
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
      fetchLabTests(); // Refresh the list
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span>Loading lab tests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Lab Technician Dashboard</h1>
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-50 max-h-96 overflow-y-auto">
                      <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="divide-y">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            No notifications
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification)}
                              className={`p-4 cursor-pointer hover:bg-gray-50 ${
                                !notification.is_read ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  {notification.priority === 'high' || notification.priority === 'critical' ? (
                                    <div className="w-2 h-2 mt-2 bg-red-500 rounded-full" />
                                  ) : (
                                    <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium text-gray-900 ${
                                    !notification.is_read ? 'font-semibold' : ''
                                  }`}>
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(notification.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={fetchLabTests}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { key: 'pending', label: 'Pending Tests', count: labTests.filter(t => ['ordered', 'sample_collected'].includes(t.status)).length },
              { key: 'in_progress', label: 'In Progress', count: labTests.filter(t => t.status === 'in_progress').length },
              { key: 'completed', label: 'Completed', count: labTests.filter(t => t.status === 'completed').length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
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

        {/* Lab Tests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {labTests.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedTest(test)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{test.test_name}</h3>
                    <p className="text-sm text-gray-600">{test.test_type}</p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(test.urgency)}`}>
                      {test.urgency}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                      {test.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Patient:</span>
                    <p className="text-sm text-gray-900">
                      {test.patient?.first_name} {test.patient?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">ID: {test.patient?.patient_id}</p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-700">Doctor:</span>
                    <p className="text-sm text-gray-900">
                      Dr. {test.doctor?.first_name} {test.doctor?.last_name}
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-700">Ordered:</span>
                    <p className="text-sm text-gray-900">
                      {new Date(test.ordered_at).toLocaleDateString()} at {new Date(test.ordered_at).toLocaleTimeString()}
                    </p>
                  </div>

                  {test.clinical_notes && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Notes:</span>
                      <p className="text-sm text-gray-600">{test.clinical_notes}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t flex justify-between">
                  <span className="text-sm text-gray-500">Sample: {test.sample_type || 'N/A'}</span>
                  {test.scheduled_for && (
                    <span className="text-sm text-gray-500">
                      Due: {new Date(test.scheduled_for).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {labTests.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">No lab tests found for this category</div>
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
                <label className="block text-sm font-medium text-gray-700">Result Value</label>
                <input
                  type="text"
                  value={resultForm.result_value}
                  onChange={(e) => setResultForm(prev => ({ ...prev, result_value: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter result value"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Result Notes</label>
                <textarea
                  value={resultForm.result_notes}
                  onChange={(e) => setResultForm(prev => ({ ...prev, result_notes: e.target.value }))}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Additional notes about the results"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Result Flag</label>
                <select
                  value={resultForm.abnormal_flag}
                  onChange={(e) => setResultForm(prev => ({ ...prev, abnormal_flag: e.target.value as any }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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