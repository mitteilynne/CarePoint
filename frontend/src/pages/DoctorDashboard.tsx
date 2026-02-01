import React, { useState, useEffect } from 'react';
import { Patient } from '@/types';
import api from '@/services/api';

type ViewMode = 'dashboard' | 'queue' | 'triage' | 'records';

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

  useEffect(() => {
    loadQueueStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadQueueStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadQueueStatus = async () => {
    try {
      const response = await api.get('/receptionist/queue/status');
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setCurrentView('queue')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>View Queue</span>
          </button>
          
          <button
            onClick={() => setCurrentView('triage')}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 flex items-center justify-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>View Triage Reports</span>
          </button>
          
          <button
            onClick={() => setCurrentView('records')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Patient Records</span>
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

        {queueStatus && queueStatus.waiting_patients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>No patients in queue</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queueStatus?.waiting_patients.map((patient) => (
              <div
                key={patient.id}
                className={`border-l-4 p-4 rounded-lg ${getTreatmentPriorityColor(patient.triage_level)} border`}
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
                      Start Consultation
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPatient(patient);
                        // Here you could open a detailed view or triage modal
                      }}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Records
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Medical Records */}
        {medicalRecords.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Medical History ({medicalRecords.length} visits)
            </h3>
            
            <div className="space-y-4">
              {medicalRecords.map((record) => (
                <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Visit Date: {new Date(record.visit_date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-sm text-gray-500">Dr. {record.doctor_name}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Chief Complaint:</strong> {record.chief_complaint}</p>
                      <p><strong>Diagnosis:</strong> {record.diagnosis}</p>
                      <p><strong>Treatment Plan:</strong> {record.treatment_plan}</p>
                      {record.medications_prescribed && <p><strong>Medications:</strong> {record.medications_prescribed}</p>}
                    </div>
                    <div>
                      {record.blood_pressure && <p><strong>Blood Pressure:</strong> {record.blood_pressure}</p>}
                      {record.heart_rate && <p><strong>Heart Rate:</strong> {record.heart_rate} bpm</p>}
                      {record.temperature && <p><strong>Temperature:</strong> {record.temperature}°C</p>}
                      {record.weight && <p><strong>Weight:</strong> {record.weight} kg</p>}
                      {record.height && <p><strong>Height:</strong> {record.height} cm</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
      </div>
    </div>
  );
}