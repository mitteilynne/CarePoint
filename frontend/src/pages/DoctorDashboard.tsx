import React, { useState, useEffect } from 'react';
import { Patient, LabTest, LabTestRequest, MedicalRecord, Notification } from '@/types';
import api, { notificationsAPI, doctorAPI, appointmentsAPI } from '@/services/api';
import LabTestForm from '@/components/LabTestForm';
import DiagnosisForm, { DiagnosisFormData } from '@/components/DiagnosisForm';
import { useAuth } from '@/context/AuthContext';

type ViewMode = 'dashboard' | 'queue' | 'triage' | 'records' | 'patient-records' | 'lab-tests' | 'referrals' | 'notifications' | 'appointments';

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

interface TriageData {
  id: number;
  patient_id: number;
  patient_name: string;
  queue_number: number;
  chief_complaint: string;
  pain_scale: number;
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  symptoms: string;
  allergies_noted: string;
  current_medications_noted: string;
  mobility_status: string;
  receptionist_notes: string;
  special_requirements: string;
  triage_level: string;
  priority_score: number;
  arrival_time: string;
  queue_status: string;
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

export default function DoctorDashboard() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<QueuePatient | null>(null);
  const [selectedTriage, setSelectedTriage] = useState<TriageData | null>(null);
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
  const [selectedPatientForDirectDiagnosis, setSelectedPatientForDirectDiagnosis] = useState<QueuePatient | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [appointments, setAppointments] = useState<any[]>([]);
  
  // Medical record sharing
  const [showShareModal, setShowShareModal] = useState(false);
  const [recordToShare, setRecordToShare] = useState<MedicalRecord | null>(null);
  const [shareFormData, setShareFormData] = useState({
    recipient_name: '',
    recipient_email: '',
    recipient_facility: '',
    recipient_specialty: '',
    reason: '',
    patient_consent: true,
    notes: ''
  });
  const [showReturnVisitModal, setShowReturnVisitModal] = useState(false);
  const [returnVisitPatient, setReturnVisitPatient] = useState<QueuePatient | null>(null);
  const [returnVisitData, setReturnVisitData] = useState({
    appointment_date: '',
    appointment_time: '09:00',
    reason: '',
    notes: '',
    duration_minutes: 30,
  });

  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadQueueStatus();
    loadNotifications();
    loadUnreadCount();
    loadAppointments();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadQueueStatus();
      loadUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadQueueStatus = async () => {
    try {
      const response = await api.get('/healthcare/doctor/queue');
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
      await api.put(`/healthcare/doctor/queue/update-status/${triageId}`, {
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
      const response = await api.get(`/healthcare/doctor/patients/search?q=${encodeURIComponent(query)}`);
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

  const handleLabTestSubmit = async (labTestData: LabTestRequest) => {
    setLoading(true);
    try {
      await api.post('/healthcare/lab-tests', labTestData);
      showMessage('success', 'Lab test ordered successfully');
      setShowLabTestForm(false);
      setSelectedPatientForTest(null);
      if (currentView === 'lab-tests') {
        loadLabTests();
      }
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to order lab test');
    } finally {
      setLoading(false);
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
      setSelectedPatientForDirectDiagnosis(null);
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
    setSelectedPatientForDirectDiagnosis(null);
    setShowDiagnosisForm(true);
  };

  const startDirectDiagnosis = (patient: QueuePatient) => {
    setSelectedPatientForDirectDiagnosis(patient);
    setSelectedLabTestForDiagnosis(null);
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

  const loadAppointments = async () => {
    try {
      const response = await appointmentsAPI.getMyAppointments(true);
      setAppointments(response.appointments || []);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  };

  const openReturnVisitModal = (patient: QueuePatient) => {
    setReturnVisitPatient(patient);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setReturnVisitData({
      appointment_date: tomorrow.toISOString().split('T')[0],
      appointment_time: '09:00',
      reason: '',
      notes: '',
      duration_minutes: 30,
    });
    setShowReturnVisitModal(true);
  };

  const handleScheduleReturnVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnVisitPatient || !currentUser) return;
    setLoading(true);
    try {
      const appointmentDatetime = `${returnVisitData.appointment_date}T${returnVisitData.appointment_time}:00`;
      await appointmentsAPI.createReturnVisit({
        patient_id: parseInt(returnVisitPatient.patient_id),
        doctor_id: currentUser.id,
        appointment_date: appointmentDatetime,
        reason: returnVisitData.reason,
        notes: returnVisitData.notes,
        duration_minutes: returnVisitData.duration_minutes,
      });
      showMessage('success', `Return visit scheduled for ${returnVisitPatient.patient_name} on ${new Date(appointmentDatetime).toLocaleDateString()}`);
      setShowReturnVisitModal(false);
      setReturnVisitPatient(null);
      await loadAppointments();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to schedule return visit');
    } finally {
      setLoading(false);
    }
  };

  const shareRecord = async (record: MedicalRecord) => {
    setRecordToShare(record);
    setShowShareModal(true);
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordToShare) return;

    try {
      setLoading(true);
      await api.post(`/healthcare/medical-records/${recordToShare.id}/share`, shareFormData);
      showMessage('success', 'Medical record shared successfully');
      setShowShareModal(false);
      setShareFormData({
        recipient_name: '',
        recipient_email: '',
        recipient_facility: '',
        recipient_specialty: '',
        reason: '',
        patient_consent: true,
        notes: ''
      });
    } catch (error: any) {
      console.error('Error sharing record:', error);
      showMessage('error', error.response?.data?.error || 'Failed to share medical record');
    } finally {
      setLoading(false);
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

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="float-right text-lg">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Doctor Dashboard</h2>
        
        {/* Quick Stats */}
        {queueStatus && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{queueStatus.queue_counts.waiting}</div>
              <div className="text-sm text-blue-800">Patients Waiting</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{queueStatus.queue_counts.in_progress}</div>
              <div className="text-sm text-yellow-800">In Consultation</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{queueStatus.queue_counts.completed}</div>
              <div className="text-sm text-green-800">Completed Today</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">{queueStatus.queue_management.average_wait_time}min</div>
              <div className="text-sm text-purple-800">Average Wait</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <button
            onClick={() => setCurrentView('queue')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Queue</span>
          </button>
          
          <button
            onClick={() => setCurrentView('triage')}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 flex items-center justify-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Triage</span>
          </button>
          
          <button
            onClick={() => {
              setCurrentView('lab-tests');
              loadLabTests();
            }}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span>Lab Tests</span>
          </button>
          
          <button
            onClick={() => {
              setCurrentView('notifications');
              loadNotifications();
            }}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2 transition-colors relative"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>Lab Results</span>
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => {
              setCurrentView('referrals');
              loadReferrals();
            }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 flex items-center justify-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Referrals</span>
          </button>
          
          <button
            onClick={() => setCurrentView('records')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Records</span>
          </button>

          <button
            onClick={() => { setCurrentView('appointments'); loadAppointments(); }}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 flex items-center justify-center space-x-2 transition-colors relative"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Appointments</span>
            {appointments.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-teal-400 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                {appointments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Priority Patients Alert */}
      {queueStatus && queueStatus.waiting_patients.filter(p => p.triage_level === 'emergency' || p.triage_level === 'urgent').length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-lg font-medium text-red-800">
                Priority Patients Waiting
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {queueStatus.waiting_patients
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
    </div>
  );

  const renderQueue = () => (
    <div className="space-y-6">
      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="float-right text-lg">&times;</button>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Patient Queue</h2>
          <div className="flex space-x-3">
            <button
              onClick={loadQueueStatus}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {queueStatus && queueStatus.all_patients && queueStatus.all_patients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>No patients in queue</p>
          </div>
        ) : queueStatus && (queueStatus.waiting_patients || queueStatus.in_progress_patients) ? (
          <div className="space-y-6">
            {/* Show ALL patients regardless of status */}
            {queueStatus.waiting_patients && queueStatus.waiting_patients.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full mr-2">Waiting</span>
                  {queueStatus.waiting_patients.length} patients
                </h3>
                <div className="space-y-4">
                  {queueStatus.waiting_patients.map((patient) => (
                    <div
                      key={patient.id}
                      className={`border-l-4 p-4 rounded-lg bg-yellow-50 border-yellow-300`}
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
                            <span>Waiting: {patient.wait_time_minutes} minutes</span>
                            <span className="mx-2">•</span>
                            <span>Arrived: {new Date(patient.arrival_time).toLocaleTimeString()}</span>
                            <span className="mx-2">•</span>
                            <span>Priority Score: {patient.priority_score}</span>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2 ml-4">
                          <button
                            onClick={() => handlePatientAction(patient.id, 'in_progress')}
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            ▶️ Start Consultation
                          </button>
                          <button
                            onClick={() => startDirectDiagnosis(patient)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            📝 Make Diagnosis
                          </button>
                          <button
                            onClick={() => openReturnVisitModal(patient)}
                            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                          >
                            📅 Schedule Return Visit
                          </button>
                          <button
                            onClick={() => orderLabTestForPatient(parseInt(patient.patient_id))}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            🧪 Order Lab Test
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show In Progress patients */}
            {queueStatus.in_progress_patients && queueStatus.in_progress_patients.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full mr-2">In Consultation</span>
                  {queueStatus.in_progress_patients.length} patients
                </h3>
                <div className="space-y-4">
                  {queueStatus.in_progress_patients.map((patient) => (
                    <div
                      key={patient.id}
                      className={`border-l-4 p-4 rounded-lg bg-blue-50 border-blue-300`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="text-lg font-bold mr-3">#{patient.queue_number}</span>
                            <h3 className="text-lg font-semibold">{patient.patient_name}</h3>
                            <span className={`ml-3 px-3 py-1 text-sm rounded-full font-medium ${getTreatmentPriorityColor(patient.triage_level)}`}>
                              {patient.triage_level.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="ml-3 px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800">
                              IN CONSULTATION
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2"><strong>Chief Complaint:</strong> {patient.chief_complaint}</p>
                          <div className="text-sm text-gray-600">
                            <span>In consultation: {patient.wait_time_minutes} minutes total</span>
                            <span className="mx-2">•</span>
                            <span>Arrived: {new Date(patient.arrival_time).toLocaleTimeString()}</span>
                            <span className="mx-2">•</span>
                            <span>Priority Score: {patient.priority_score}</span>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2 ml-4">
                          <button
                            onClick={() => handlePatientAction(patient.id, 'completed')}
                            disabled={loading}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            ✅ Complete Consultation
                          </button>
                          <button
                            onClick={() => startDirectDiagnosis(patient)}
                            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                          >
                            📝 Make Diagnosis
                          </button>
                          <button
                            onClick={() => openReturnVisitModal(patient)}
                            className="bg-teal-700 text-white px-4 py-2 rounded-lg hover:bg-teal-800 transition-colors"
                          >
                            📅 Schedule Return Visit
                          </button>
                          <button
                            onClick={() => orderLabTestForPatient(parseInt(patient.patient_id))}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            🧪 Order Lab Test
                          </button>
                          <button
                            onClick={() => {
                              setCurrentView('patient-records');
                              loadPatientRecords(parseInt(patient.patient_id));
                              setSearchQuery(patient.patient_name);
                            }}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            📋 View Records
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show completed patients if any */}
            {queueStatus.completed_patients && queueStatus.completed_patients.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full mr-2">Completed Today</span>
                  {queueStatus.completed_patients.length} patients
                </h3>
                <div className="space-y-4">
                  {queueStatus.completed_patients.map((patient) => (
                    <div
                      key={patient.id}
                      className={`border-l-4 p-4 rounded-lg bg-green-50 border-green-300`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="text-lg font-bold mr-3">#{patient.queue_number}</span>
                            <h3 className="text-lg font-semibold">{patient.patient_name}</h3>
                            <span className="ml-3 px-3 py-1 text-sm rounded-full bg-green-100 text-green-800">
                              COMPLETED
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2"><strong>Chief Complaint:</strong> {patient.chief_complaint}</p>
                          <div className="text-sm text-gray-600">
                            <span>Total time: {patient.wait_time_minutes} minutes</span>
                            <span className="mx-2">•</span>
                            <span>Completed: {new Date(patient.arrival_time).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2 ml-4">
                          <button
                            onClick={() => {
                              setCurrentView('patient-records');
                              loadPatientRecords(parseInt(patient.patient_id));
                              setSearchQuery(patient.patient_name);
                            }}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            📋 View Records
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading patient queue...</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTriage = () => (
    <div className="space-y-6">
      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="float-right text-lg">&times;</button>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Patient Triage Reports</h2>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        {queueStatus && (
          <div className="space-y-4">
            {queueStatus.waiting_patients.map((patient) => (
              <div key={patient.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <h3 className="text-lg font-semibold mr-3">{patient.patient_name}</h3>
                      <span className="text-gray-600 mr-3">#{patient.queue_number}</span>
                      <span className={`px-3 py-1 text-sm rounded-full font-medium ${getTreatmentPriorityColor(patient.triage_level)}`}>
                        {patient.triage_level.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Chief Complaint:</strong> {patient.chief_complaint}</p>
                        <p><strong>Arrival Time:</strong> {new Date(patient.arrival_time).toLocaleString()}</p>
                        <p><strong>Wait Time:</strong> {patient.wait_time_minutes} minutes</p>
                      </div>
                      <div>
                        <p><strong>Priority Score:</strong> {patient.priority_score}</p>
                        <p><strong>Patient ID:</strong> {patient.patient_id}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // Load detailed triage information
                      setSelectedTriage({
                        id: patient.id,
                        patient_id: parseInt(patient.patient_id),
                        patient_name: patient.patient_name,
                        queue_number: patient.queue_number,
                        chief_complaint: patient.chief_complaint,
                        pain_scale: 0, // These would come from detailed API call
                        symptoms: '',
                        allergies_noted: '',
                        current_medications_noted: '',
                        mobility_status: '',
                        receptionist_notes: '',
                        special_requirements: '',
                        triage_level: patient.triage_level,
                        priority_score: patient.priority_score,
                        arrival_time: patient.arrival_time,
                        queue_status: 'waiting'
                      });
                    }}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    View Full Triage
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detailed Triage View Modal/Section */}
        {selectedTriage && (
          <div className="mt-8 bg-gray-50 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Detailed Triage Assessment</h3>
              <button
                onClick={() => setSelectedTriage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕ Close
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Patient Information</h4>
                <p><strong>Name:</strong> {selectedTriage.patient_name}</p>
                <p><strong>Queue Number:</strong> #{selectedTriage.queue_number}</p>
                <p><strong>Chief Complaint:</strong> {selectedTriage.chief_complaint}</p>
                <p><strong>Triage Level:</strong> {selectedTriage.triage_level.replace('_', ' ')}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Assessment Details</h4>
                <p><strong>Priority Score:</strong> {selectedTriage.priority_score}</p>
                <p><strong>Arrival Time:</strong> {new Date(selectedTriage.arrival_time).toLocaleString()}</p>
                <p><strong>Status:</strong> {selectedTriage.queue_status}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderPatientRecords = () => (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Patient Medical Records</h2>
          <p className="text-gray-600">{searchQuery}</p>
        </div>
        <button
          onClick={() => setCurrentView('records')}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Back to Search
        </button>
      </div>

      {/* Medical Records Display */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Medical History ({medicalRecords.length} visits)
        </h3>
        
        {medicalRecords.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No medical records found for this patient.</p>
            <p className="text-sm text-gray-400 mt-2">
              Records will appear here once you create a consultation for this patient.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {medicalRecords.map((record) => (
              <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Visit Date: {new Date(record.visit_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Dr. {record.doctor_name}</span>
                    <button
                      onClick={() => shareRecord(record)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1"
                      title="Share this record with another doctor"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      <span>Share</span>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Chief Complaint:</strong> {record.chief_complaint}</p>
                    <p><strong>Diagnosis:</strong> {record.diagnosis}</p>
                    <p><strong>Treatment Plan:</strong> {record.treatment_plan}</p>
                    {record.medications_prescribed && <p><strong>Medications:</strong> {record.medications_prescribed}</p>}
                    {record.lab_tests_ordered && (
                      <p><strong>Lab Tests:</strong> {record.lab_tests_ordered}</p>
                    )}
                  </div>
                  <div>
                    {record.blood_pressure && <p><strong>Blood Pressure:</strong> {record.blood_pressure}</p>}
                    {record.heart_rate && <p><strong>Heart Rate:</strong> {record.heart_rate} bpm</p>}
                    {record.temperature && <p><strong>Temperature:</strong> {record.temperature}°C</p>}
                    {record.weight && <p><strong>Weight:</strong> {record.weight} kg</p>}
                    {record.height && <p><strong>Height:</strong> {record.height} cm</p>}
                    {record.follow_up_instructions && (
                      <p><strong>Follow-up:</strong> {record.follow_up_instructions}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderRecords = () => (
    <div className="space-y-6">
      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="float-right text-lg">&times;</button>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Patient Medical Records</h2>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Search Section */}
        <div className="mb-6">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Search Patient by Name, ID, or Phone
          </label>
          <input
            type="text"
            id="search"
            value={searchQuery}
            onChange={(e) => searchPatients(e.target.value)}
            placeholder="Enter patient information..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Search Results ({searchResults.length})
            </h3>
            
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No patients found matching your search</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-blue-600">
                          {patient.first_name[0]}{patient.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {patient.first_name} {patient.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {patient.patient_id} • {patient.phone}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        loadPatientRecords(patient.id);
                        setSearchQuery(`${patient.first_name} ${patient.last_name}`);
                        setCurrentView('patient-records');
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mr-2"
                    >
                      View Records
                    </button>
                    <button
                      onClick={() => orderLabTestForPatient(patient.id)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Order Lab Test
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Medical Records */}
        
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Medical History ({medicalRecords.length} visits)
          </h3>
          
          {medicalRecords.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No medical records found for this patient.</p>
              <p className="text-sm text-gray-400 mt-2">
                Records will appear here once you create a consultation for this patient.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {medicalRecords.map((record) => (
                <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Visit Date: {new Date(record.visit_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Dr. {record.doctor_name}</span>
                      <button
                        onClick={() => shareRecord(record)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1"
                        title="Share this record with another doctor"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Chief Complaint:</strong> {record.chief_complaint}</p>
                      <p><strong>Diagnosis:</strong> {record.diagnosis}</p>
                      <p><strong>Treatment Plan:</strong> {record.treatment_plan}</p>
                      {record.medications_prescribed && <p><strong>Medications:</strong> {record.medications_prescribed}</p>}
                      {record.lab_tests_ordered && (
                        <p><strong>Lab Tests:</strong> {record.lab_tests_ordered}</p>
                      )}
                    </div>
                    <div>
                      {record.blood_pressure && <p><strong>Blood Pressure:</strong> {record.blood_pressure}</p>}
                      {record.heart_rate && <p><strong>Heart Rate:</strong> {record.heart_rate} bpm</p>}
                      {record.temperature && <p><strong>Temperature:</strong> {record.temperature}°C</p>}
                      {record.weight && <p><strong>Weight:</strong> {record.weight} kg</p>}
                      {record.height && <p><strong>Height:</strong> {record.height} cm</p>}
                      {record.follow_up_instructions && (
                        <p><strong>Follow-up:</strong> {record.follow_up_instructions}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderLabTests = () => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'ordered': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'sample_collected': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'in_progress': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'completed': return 'bg-green-100 text-green-800 border-green-200';
        case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
        case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const getUrgencyColor = (urgency: string) => {
      switch (urgency) {
        case 'stat': return 'bg-red-100 text-red-800';
        case 'urgent': return 'bg-orange-100 text-orange-800';
        case 'routine': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div className="space-y-6">
        {/* Message Display */}
        {message.text && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
            <button onClick={() => setMessage({ type: '', text: '' })} className="float-right text-lg">&times;</button>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Lab Tests</h2>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLabTestForm(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                + Order New Test
              </button>
              <button
                onClick={() => loadLabTests()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {labTests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <p>No lab tests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {labTests.map((test) => (
                <div key={test.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold mr-3">{test.test_name}</h3>
                        <span className={`px-2 py-1 text-sm rounded-full font-medium ${getStatusColor(test.status)}`}>
                          {test.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getUrgencyColor(test.urgency)}`}>
                          {test.urgency.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">
                        <strong>Patient:</strong> {test.patient_name}
                        {test.test_code && <span className="ml-4"><strong>Code:</strong> {test.test_code}</span>}
                      </p>
                      <p className="text-gray-700 mb-2">
                        <strong>Type:</strong> {test.test_type.replace('_', ' ')}
                        {test.sample_type && <span className="ml-4"><strong>Sample:</strong> {test.sample_type}</span>}
                      </p>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <span><strong>Ordered:</strong> {new Date(test.ordered_at).toLocaleString()}</span>
                        {test.scheduled_for && (
                          <span className="ml-4"><strong>Scheduled:</strong> {new Date(test.scheduled_for).toLocaleString()}</span>
                        )}
                        {test.lab_location && <span className="ml-4"><strong>Lab:</strong> {test.lab_location}</span>}
                      </div>

                      {test.clinical_notes && (
                        <div className="text-sm text-gray-700 mb-2">
                          <strong>Clinical Notes:</strong> {test.clinical_notes}
                        </div>
                      )}

                      {test.result_value && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-semibold text-blue-900 mb-1">Results</h4>
                          <p className="text-blue-800">
                            <strong>Value:</strong> {test.result_value}
                            {test.units && <span> {test.units}</span>}
                            {test.reference_range && <span className="ml-2">(Normal: {test.reference_range})</span>}
                          </p>
                          {test.abnormal_flag && test.abnormal_flag !== 'normal' && (
                            <p className={`text-sm font-medium ${
                              test.abnormal_flag === 'critical' ? 'text-red-700' : 
                              test.abnormal_flag === 'high' || test.abnormal_flag === 'low' ? 'text-orange-700' : 'text-blue-700'
                            }`}>
                              {test.abnormal_flag.toUpperCase()}
                            </p>
                          )}
                          {test.result_notes && (
                            <p className="text-blue-700 text-sm mt-1">
                              <strong>Notes:</strong> {test.result_notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons for Lab Tests */}
                    <div className="flex flex-col space-y-2 ml-4">
                      {test.status === 'completed' && test.result_value && (
                        <button
                          onClick={() => createDiagnosisForLabTest(test)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Create Diagnosis</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReferrals = () => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'completed': return 'bg-green-100 text-green-800 border-green-200';
        case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const getUrgencyColor = (urgency: string) => {
      switch (urgency) {
        case 'emergency': return 'bg-red-100 text-red-800';
        case 'urgent': return 'bg-orange-100 text-orange-800';
        case 'routine': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div className="space-y-6">
        {/* Message Display */}
        {message.text && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
            <button onClick={() => setMessage({ type: '', text: '' })} className="float-right text-lg">&times;</button>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Patient Referrals</h2>
            <div className="flex space-x-3">
              <button
                onClick={() => loadReferrals()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {referrals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p>No referrals found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <div key={referral.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold mr-3">{referral.patient_name}</h3>
                        <span className={`px-2 py-1 text-sm rounded-full font-medium ${getStatusColor(referral.status)}`}>
                          {referral.status.toUpperCase()}
                        </span>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getUrgencyColor(referral.urgency)}`}>
                          {referral.urgency.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p><strong>Type:</strong> {referral.referral_type === 'internal' ? 'Internal' : 'External'}</p>
                          {referral.referral_type === 'internal' ? (
                            <>
                              {referral.department_name && <p><strong>Department:</strong> {referral.department_name}</p>}
                              {referral.referred_doctor_name && <p><strong>Referred to:</strong> {referral.referred_doctor_name}</p>}
                            </>
                          ) : (
                            <>
                              <p><strong>Facility:</strong> {referral.facility_name}</p>
                              {referral.facility_type && <p><strong>Type:</strong> {referral.facility_type}</p>}
                            </>
                          )}
                        </div>
                        <div>
                          <p><strong>Created:</strong> {new Date(referral.created_at).toLocaleDateString()}</p>
                          {referral.scheduled_date && (
                            <p><strong>Scheduled:</strong> {new Date(referral.scheduled_date).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-gray-700 mb-2">
                        <strong>Reason:</strong> {referral.reason}
                      </div>

                      {referral.notes && (
                        <div className="text-sm text-gray-600">
                          <strong>Notes:</strong> {referral.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderNotifications = () => {
    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'high': return 'bg-red-100 text-red-800 border-red-200';
        case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'low': return 'bg-green-100 text-green-800 border-green-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const formatDateTime = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
      <div className="space-y-6">
        {/* Message Display */}
        {message.text && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
            <button onClick={() => setMessage({ type: '', text: '' })} className="float-right text-lg">&times;</button>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Lab Result Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-red-600 text-white text-sm rounded-full px-2 py-1">{unreadCount} unread</span>
              )}
            </h2>
            <div className="flex space-x-3">
              <button
                onClick={loadNotifications}
                disabled={loading}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? '🔄 Loading...' : '🔄 Refresh'}
              </button>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p>No lab result notifications</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                    !notification.is_read ? 'border-red-200 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold mr-3">{notification.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getPriorityColor(notification.priority)}`}>
                          {notification.priority.toUpperCase()}
                        </span>
                        {!notification.is_read && (
                          <span className="ml-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">NEW</span>
                        )}
                      </div>
                      
                      <p className="text-gray-700 mb-3">{notification.message}</p>
                      
                      {/* Lab Test Details */}
                      {notification.lab_test && (
                        <div className="bg-gray-100 p-3 rounded-lg mb-3">
                          <h4 className="font-semibold text-sm mb-2">Lab Test Details:</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><strong>Patient:</strong> {notification.lab_test.patient_name}</p>
                              <p><strong>Test Type:</strong> {notification.lab_test.test_type}</p>
                              <p><strong>Status:</strong> 
                                <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                                  notification.lab_test.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                  notification.lab_test.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {notification.lab_test.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </p>
                            </div>
                            <div>
                              {notification.lab_test.result_value && (
                                <>
                                  <p><strong>Result:</strong> {notification.lab_test.result_value} {notification.lab_test.unit}</p>
                                  <p><strong>Reference Range:</strong> {notification.lab_test.reference_range}</p>
                                  {notification.lab_test.is_abnormal && (
                                    <p className="text-red-600 font-semibold">⚠️ Abnormal Result</p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          {notification.lab_test.notes && (
                            <div className="mt-2">
                              <p><strong>Notes:</strong> {notification.lab_test.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span>📅 {formatDateTime(notification.created_at)}</span>
                        <span>👨‍⚕️ From: Lab Technician</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      {!notification.is_read && (
                        <button
                          onClick={() => markNotificationAsRead(notification.id)}
                          disabled={loading}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Mark Read</span>
                        </button>
                      )}
                      
                      {notification.lab_test && notification.lab_test.status === 'completed' && (
                        <button
                          onClick={() => createDiagnosisForLabTest(notification.lab_test)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Create Diagnosis</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAppointments = () => (
    <div className="space-y-6">
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="float-right text-lg">&times;</button>
        </div>
      )}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">My Upcoming Appointments</h2>
          <div className="flex space-x-3">
            <button
              onClick={loadAppointments}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium">No upcoming appointments</p>
            <p className="text-sm mt-1">Return visits you schedule will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appt) => (
              <div key={appt.id} className="border-l-4 border-teal-400 p-4 rounded-lg bg-teal-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-semibold text-gray-900">{appt.patient_name}</span>
                      <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                        appt.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        appt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        appt.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {appt.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-1">
                      📅 <strong>{new Date(appt.appointment_date).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}</strong>
                      <span className="ml-2 text-gray-500">· {appt.duration_minutes} min</span>
                    </p>
                    {appt.reason && <p className="text-sm text-gray-700"><strong>Reason:</strong> {appt.reason}</p>}
                    {appt.notes && <p className="text-sm text-gray-500 italic mt-1">{appt.notes}</p>}
                    {appt.patient_phone && <p className="text-xs text-gray-400 mt-1">📞 {appt.patient_phone}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
          <p className="text-gray-600">Patient queue management, triage review, and medical records</p>
        </div>

        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'queue' && renderQueue()}
        {currentView === 'triage' && renderTriage()}
        {currentView === 'records' && renderRecords()}
        {currentView === 'patient-records' && renderPatientRecords()}
        {currentView === 'lab-tests' && renderLabTests()}
        {currentView === 'notifications' && renderNotifications()}
        {currentView === 'referrals' && renderReferrals()}
        {currentView === 'appointments' && renderAppointments()}



        {/* Return Visit Modal */}
        {showReturnVisitModal && returnVisitPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-bold text-gray-900">📅 Schedule Return Visit</h3>
                <button onClick={() => setShowReturnVisitModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <form onSubmit={handleScheduleReturnVisit} className="p-4 space-y-4">
                <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                  <div className="font-medium text-teal-900">Patient: {returnVisitPatient.patient_name}</div>
                  <div className="text-sm text-teal-700">Chief Complaint: {returnVisitPatient.chief_complaint}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Return Date *</label>
                    <input
                      type="date"
                      value={returnVisitData.appointment_date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setReturnVisitData(p => ({...p, appointment_date: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                    <input
                      type="time"
                      value={returnVisitData.appointment_time}
                      onChange={(e) => setReturnVisitData(p => ({...p, appointment_time: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <select
                    value={returnVisitData.duration_minutes}
                    onChange={(e) => setReturnVisitData(p => ({...p, duration_minutes: parseInt(e.target.value)}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Return Visit *</label>
                  <textarea
                    value={returnVisitData.reason}
                    onChange={(e) => setReturnVisitData(p => ({...p, reason: e.target.value}))}
                    rows={2}
                    placeholder="Follow-up, medication review, test results review..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                  <textarea
                    value={returnVisitData.notes}
                    onChange={(e) => setReturnVisitData(p => ({...p, notes: e.target.value}))}
                    rows={2}
                    placeholder="Special instructions for the receptionist..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowReturnVisitModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                  >
                    {loading ? 'Scheduling...' : 'Schedule Return Visit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lab Test Form Modal */}
        {showLabTestForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <LabTestForm
                selectedPatientId={selectedPatientForTest || undefined}
                onSubmit={handleLabTestSubmit}
                onCancel={() => {
                  setShowLabTestForm(false);
                  setSelectedPatientForTest(null);
                }}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* Diagnosis Form Modal */}
        {showDiagnosisForm && (selectedLabTestForDiagnosis || selectedPatientForDirectDiagnosis) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
            <div className="max-w-5xl w-full my-4">
              <DiagnosisForm
                labTest={selectedLabTestForDiagnosis ?? undefined}
                patientId={selectedPatientForDirectDiagnosis ? parseInt(selectedPatientForDirectDiagnosis.patient_id) : undefined}
                patientName={selectedPatientForDirectDiagnosis?.patient_name}
                chiefComplaint={selectedPatientForDirectDiagnosis?.chief_complaint}
                onSubmit={handleDiagnosisSubmit}
                onCancel={() => {
                  setShowDiagnosisForm(false);
                  setSelectedLabTestForDiagnosis(null);
                  setSelectedPatientForDirectDiagnosis(null);
                }}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* Share Medical Record Modal */}
        {showShareModal && recordToShare && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Share Medical Record</h2>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Record Date:</strong> {new Date(recordToShare.visit_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Diagnosis:</strong> {recordToShare.diagnosis || 'N/A'}
                  </p>
                </div>

                <form onSubmit={handleShareSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recipient Doctor Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={shareFormData.recipient_name}
                        onChange={(e) => setShareFormData({ ...shareFormData, recipient_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Dr. John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recipient Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={shareFormData.recipient_email}
                        onChange={(e) => setShareFormData({ ...shareFormData, recipient_email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="doctor@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recipient Facility
                      </label>
                      <input
                        type="text"
                        value={shareFormData.recipient_facility}
                        onChange={(e) => setShareFormData({ ...shareFormData, recipient_facility: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Hospital/Clinic Name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Specialty
                      </label>
                      <input
                        type="text"
                        value={shareFormData.recipient_specialty}
                        onChange={(e) => setShareFormData({ ...shareFormData, recipient_specialty: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Cardiology"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for Transfer
                    </label>
                    <textarea
                      value={shareFormData.reason}
                      onChange={(e) => setShareFormData({ ...shareFormData, reason: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="e.g., Patient requested records for second opinion, Specialist referral, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      value={shareFormData.notes}
                      onChange={(e) => setShareFormData({ ...shareFormData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Any additional context..."
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="patient_consent"
                      checked={shareFormData.patient_consent}
                      onChange={(e) => setShareFormData({ ...shareFormData, patient_consent: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="patient_consent" className="ml-2 block text-sm text-gray-700">
                      Patient has consented to share their medical records
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowShareModal(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !shareFormData.patient_consent}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Sharing...' : 'Share Record'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}