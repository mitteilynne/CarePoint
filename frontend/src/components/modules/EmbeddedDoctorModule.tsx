import { useState, useEffect } from 'react';
import { Patient, LabTest, Notification } from '@/types';
import api, { notificationsAPI } from '@/services/api';
import DiagnosisForm, { DiagnosisFormData } from '@/components/DiagnosisForm';

type ViewMode = 'dashboard' | 'queue' | 'triage' | 'records' | 'lab-tests' | 'referrals' | 'notifications';

interface QueuePatient {
  id: number;
  patient_name: string;
  patient_id: string;
  queue_number: number;
  triage_level: 'emergency' | 'urgent' | 'less_urgent' | 'non_urgent';
  chief_complaint: string;
  arrival_time: string;
  wait_time_minutes: number;
  priority_score: number;
}

interface QueueStatus {
  queue_management: {
    current_number: number;
    total_today: number;
    average_wait_time: number;
    emergency_count: number;
    urgent_count: number;
    routine_count: number;
  };
  queue_counts: {
    waiting: number;
    in_progress: number;
    completed: number;
  };
  waiting_patients: QueuePatient[];
}

interface MedicalRecord {
  id: number;
  visit_date: string;
  doctor_name: string;
  chief_complaint: string;
  diagnosis: string;
  treatment_plan: string;
  medications_prescribed: string;
  blood_pressure?: string;
  heart_rate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
}

interface EmbeddedDoctorModuleProps {
  onBack?: () => void;
  isEmbedded?: boolean;
}

export default function EmbeddedDoctorModule({ onBack, isEmbedded = true }: EmbeddedDoctorModuleProps) {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [showLabTestForm, setShowLabTestForm] = useState(false);
  const [selectedPatientForTest, setSelectedPatientForTest] = useState<number | null>(null);
  const [showDiagnosisForm, setShowDiagnosisForm] = useState(false);
  const [selectedLabTestForDiagnosis, setSelectedLabTestForDiagnosis] = useState<LabTest | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadQueueStatus();
    loadNotifications();
    loadUnreadCount();
    const interval = setInterval(() => {
      loadQueueStatus();
      loadUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadQueueStatus = async () => {
    try {
      const response = await api.get('/receptionist/queue');
      setQueueStatus(response.data);
    } catch (error) {
      console.error('Failed to load queue status:', error);
      showMessage('error', 'Failed to load queue status');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const loadNotifications = async () => {
    try {
      const response = await notificationsAPI.getLabResults();
      setNotifications(response.notifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.unread_count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      await loadUnreadCount();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handlePatientAction = async (triageId: number, action: string) => {
    setLoading(true);
    try {
      await api.put(`/receptionist/queue/update-status/${triageId}`, {
        queue_status: action
      });
      showMessage('success', `Patient status updated to ${action.replace('_', ' ')}`);
      await loadQueueStatus();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to update patient status');
    } finally {
      setLoading(false);
    }
  };

  const searchPatients = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/receptionist/patients/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.patients || []);
    } catch (error) {
      console.error('Search failed:', error);
      showMessage('error', 'Patient search failed');
    }
  };

  const loadPatientRecords = async (patientId: number) => {
    try {
      const response = await api.get(`/healthcare/patients/${patientId}/medical-records`);
      setMedicalRecords(response.data.medical_records || []);
    } catch (error) {
      console.error('Failed to load patient records:', error);
      showMessage('error', 'Failed to load patient medical records');
    }
  };

  const loadLabTests = async (patientId?: number) => {
    try {
      const url = patientId ? `/healthcare/patients/${patientId}/lab-tests` : '/healthcare/lab-tests';
      const response = await api.get(url);
      setLabTests(response.data.lab_tests || []);
    } catch (error) {
      console.error('Failed to load lab tests:', error);
      showMessage('error', 'Failed to load lab tests');
    }
  };

  const orderLabTestForPatient = (patientId: number) => {
    setSelectedPatientForTest(patientId);
    setShowLabTestForm(true);
  };

  const handleDiagnosisSubmit = async (diagnosisData: DiagnosisFormData) => {
    setLoading(true);
    try {
      const response = await api.post('/healthcare/medical-records', diagnosisData);
      let message = 'Diagnosis and medical record created successfully';
      
      if (response.data.referral_created) {
        if (diagnosisData.referral_type === 'internal') {
          message += ' and internal referral created';
        } else if (diagnosisData.referral_type === 'external') {
          message += ' and external referral created';
        }
      }
      
      showMessage('success', message);
      setShowDiagnosisForm(false);
      setSelectedLabTestForDiagnosis(null);
      if (currentView === 'lab-tests') {
        loadLabTests();
      }
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to create diagnosis');
    } finally {
      setLoading(false);
    }
  };

  const createDiagnosisForLabTest = (labTest: LabTest) => {
    setSelectedLabTestForDiagnosis(labTest);
    setShowDiagnosisForm(true);
  };

  const loadReferrals = async () => {
    try {
      const response = await api.get('/healthcare/referrals');
      setReferrals(response.data.referrals || []);
    } catch (error) {
      console.error('Failed to load referrals:', error);
      showMessage('error', 'Failed to load referrals');
    }
  };

  const getTreatmentPriorityColor = (level: string) => {
    switch (level) {
      case 'emergency': return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'less_urgent': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'non_urgent': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderHeader = () => (
    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-t-lg flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h2 className="text-xl font-bold">Doctor Module</h2>
          <p className="text-green-100 text-sm">Full doctor dashboard access</p>
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

  const renderDashboard = () => (
    <div className="space-y-6 p-4">
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="float-right text-lg">&times;</button>
        </div>
      )}

      {/* Quick Stats */}
      {queueStatus && queueStatus.queue_counts && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{queueStatus.queue_counts.waiting || 0}</div>
            <div className="text-sm text-blue-800">Patients Waiting</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{queueStatus.queue_counts.in_progress || 0}</div>
            <div className="text-sm text-yellow-800">In Consultation</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{queueStatus.queue_counts.completed || 0}</div>
            <div className="text-sm text-green-800">Completed Today</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">{queueStatus.queue_management?.average_wait_time || 0}min</div>
            <div className="text-sm text-purple-800">Average Wait</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Doctor Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <button
            onClick={() => setCurrentView('queue')}
            className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-sm">Queue</span>
          </button>
          
          <button
            onClick={() => setCurrentView('triage')}
            className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm">Triage</span>
          </button>
          
          <button
            onClick={() => { setCurrentView('lab-tests'); loadLabTests(); }}
            className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span className="text-sm">Lab Tests</span>
          </button>
          
          <button
            onClick={() => { setCurrentView('notifications'); loadNotifications(); }}
            className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 flex flex-col items-center justify-center space-y-1 transition-colors relative"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-sm">Results</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => { setCurrentView('referrals'); loadReferrals(); }}
            className="bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-sm">Referrals</span>
          </button>
          
          <button
            onClick={() => setCurrentView('records')}
            className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-sm">Records</span>
          </button>
        </div>
      </div>

      {/* Priority Patients Alert */}
      {queueStatus && queueStatus.waiting_patients && queueStatus.waiting_patients.filter(p => p.triage_level === 'emergency' || p.triage_level === 'urgent').length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-lg font-medium text-red-800">Priority Patients Waiting</h3>
              <div className="mt-2 text-sm text-red-700">
                {(queueStatus.waiting_patients || [])
                  .filter(p => p.triage_level === 'emergency' || p.triage_level === 'urgent')
                  .map(patient => (
                    <div key={patient.id} className="mb-1">
                      <span className="font-medium">#{patient.queue_number}</span> - {patient.patient_name} 
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        patient.triage_level === 'emergency' ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'
                      }`}>
                        {patient.triage_level.toUpperCase()}
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Waiting Patients List */}
      {queueStatus && queueStatus.waiting_patients && queueStatus.waiting_patients.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Patients in Queue ({queueStatus.waiting_patients?.length || 0})</h3>
          <div className="space-y-3">
            {(queueStatus.waiting_patients || []).slice(0, 5).map((patient) => (
              <div
                key={patient.id}
                className={`border-l-4 p-3 rounded-r-lg ${getTreatmentPriorityColor(patient.triage_level)} border`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold mr-2">#{patient.queue_number}</span>
                    <span className="font-medium">{patient.patient_name}</span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getTreatmentPriorityColor(patient.triage_level)}`}>
                      {patient.triage_level.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => handlePatientAction(patient.id, 'in_progress')}
                    disabled={loading}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Start
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">{patient.chief_complaint}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderQueue = () => (
    <div className="space-y-4 p-4">
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="float-right text-lg">&times;</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Patient Queue</h3>
        <div className="flex space-x-2">
          <button
            onClick={loadQueueStatus}
            className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 text-sm"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"
          >
            Back
          </button>
        </div>
      </div>

      {queueStatus && (!queueStatus.waiting_patients || queueStatus.waiting_patients.length === 0) ? (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
          <p>No patients in queue</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queueStatus?.waiting_patients.map((patient) => (
            <div
              key={patient.id}
              className={`border-l-4 p-4 rounded-lg ${getTreatmentPriorityColor(patient.triage_level)} border bg-white`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-lg font-bold mr-3">#{patient.queue_number}</span>
                    <h3 className="text-lg font-semibold">{patient.patient_name}</h3>
                    <span className={`ml-3 px-3 py-1 text-sm rounded-full font-medium ${getTreatmentPriorityColor(patient.triage_level)}`}>
                      {patient.triage_level.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2"><strong>Chief Complaint:</strong> {patient.chief_complaint}</p>
                  <div className="text-sm text-gray-600">
                    <span>Waiting: {patient.wait_time_minutes} min</span>
                    <span className="mx-2">•</span>
                    <span>Arrived: {new Date(patient.arrival_time).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => handlePatientAction(patient.id, 'in_progress')}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    Start Consultation
                  </button>
                  <button
                    onClick={() => orderLabTestForPatient(parseInt(patient.patient_id))}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
                  >
                    Order Lab Test
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderLabTests = () => (
    <div className="space-y-4 p-4">
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="float-right text-lg">&times;</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Lab Tests</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => loadLabTests()}
            className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 text-sm"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"
          >
            Back
          </button>
        </div>
      </div>

      {labTests.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
          <p>No lab tests found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {labTests.map((test) => (
            <div key={test.id} className="bg-white p-4 rounded-lg shadow border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold">{test.test_name}</h4>
                  <p className="text-sm text-gray-600">{test.test_type}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  test.status === 'completed' ? 'bg-green-100 text-green-800' :
                  test.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {test.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-3">
                <p>Patient ID: {test.patient_id}</p>
                <p>Ordered: {new Date(test.ordered_at!).toLocaleDateString()}</p>
              </div>
              {test.status === 'completed' && (
                <button
                  onClick={() => createDiagnosisForLabTest(test)}
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 text-sm"
                >
                  Create Diagnosis
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Lab Results & Notifications</h3>
        <div className="flex space-x-2">
          <button
            onClick={loadNotifications}
            className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 text-sm"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"
          >
            Back
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
          <p>No notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${notification.is_read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{notification.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                {!notification.is_read && (
                  <button
                    onClick={() => markNotificationAsRead(notification.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderReferrals = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Referrals</h3>
        <div className="flex space-x-2">
          <button
            onClick={loadReferrals}
            className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 text-sm"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"
          >
            Back
          </button>
        </div>
      </div>

      {referrals.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
          <p>No referrals found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {referrals.map((referral) => (
            <div key={referral.id} className="bg-white p-4 rounded-lg shadow border">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{referral.referral_type} Referral</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    To: {referral.referred_to_name || referral.external_facility_name}
                  </p>
                  <p className="text-sm text-gray-600">Reason: {referral.reason}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  referral.status === 'completed' ? 'bg-green-100 text-green-800' :
                  referral.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {referral.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRecords = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Medical Records Search</h3>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"
        >
          Back
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Patients</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => searchPatients(e.target.value)}
            placeholder="Search by name, ID, or phone..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((patient) => (
              <button
                key={patient.id}
                onClick={() => loadPatientRecords(patient.id)}
                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border"
              >
                <div className="font-medium">{patient.first_name} {patient.last_name}</div>
                <div className="text-sm text-gray-600">ID: {patient.patient_id}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {medicalRecords.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold mb-3">Medical Records</h4>
          <div className="space-y-3">
            {medicalRecords.map((record) => (
              <div key={record.id} className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">{new Date(record.visit_date).toLocaleDateString()}</span>
                  <span className="text-sm text-gray-600">Dr. {record.doctor_name}</span>
                </div>
                <p className="text-sm"><strong>Complaint:</strong> {record.chief_complaint}</p>
                <p className="text-sm"><strong>Diagnosis:</strong> {record.diagnosis}</p>
                <p className="text-sm"><strong>Treatment:</strong> {record.treatment_plan}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-gray-50 rounded-lg border shadow-lg overflow-hidden">
      {renderHeader()}
      
      <div className="min-h-[500px]">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'queue' && renderQueue()}
        {currentView === 'lab-tests' && renderLabTests()}
        {currentView === 'notifications' && renderNotifications()}
        {currentView === 'referrals' && renderReferrals()}
        {currentView === 'records' && renderRecords()}
        {currentView === 'triage' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Triage Information</h3>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"
              >
                Back
              </button>
            </div>
            <p className="text-gray-600">View patient triage data from the queue.</p>
          </div>
        )}
      </div>

      {/* Lab Test Form Modal */}
      {showLabTestForm && selectedPatientForTest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Order Lab Test</h3>
            <p className="text-gray-600 mb-4">Patient ID: {selectedPatientForTest}</p>
            <p className="text-gray-500 text-sm">Lab test ordering functionality. Please use the Doctor dashboard directly for full lab test ordering features.</p>
            <button
              onClick={() => { setShowLabTestForm(false); setSelectedPatientForTest(null); }}
              className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Diagnosis Form Modal */}
      {showDiagnosisForm && selectedLabTestForDiagnosis && (
        <DiagnosisForm
          labTest={selectedLabTestForDiagnosis}
          onSubmit={handleDiagnosisSubmit}
          onCancel={() => { setShowDiagnosisForm(false); setSelectedLabTestForDiagnosis(null); }}
        />
      )}
    </div>
  );
}
