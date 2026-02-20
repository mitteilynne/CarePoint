import React, { useState, useEffect } from 'react';
import { Patient } from '@/types';
import api from '@/services/api';

type ViewMode = 'dashboard' | 'register' | 'search' | 'triage';

interface PatientRegistrationData {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  visit_type: 'walk_in' | 'appointment' | 'emergency';
}

interface TriageData {
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
  symptoms?: string;
  allergies_noted?: string;
  current_medications_noted?: string;
  mobility_status?: string;
  receptionist_notes?: string;
  special_requirements?: string;
  triage_level: 'emergency' | 'urgent' | 'less_urgent' | 'non_urgent';
}

interface EmbeddedReceptionistModuleProps {
  onBack?: () => void;
  isEmbedded?: boolean;
}

export default function EmbeddedReceptionistModule({ onBack, isEmbedded = true }: EmbeddedReceptionistModuleProps) {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<PatientRegistrationData & { blood_type: string; allergies: string; medical_history: string }>>({}); 

  const [registrationData, setRegistrationData] = useState<PatientRegistrationData>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    gender: 'male',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    visit_type: 'walk_in'
  });

  const [triageData, setTriageData] = useState<TriageData>({
    chief_complaint: '',
    pain_scale: 0,
    temperature: undefined,
    blood_pressure_systolic: undefined,
    blood_pressure_diastolic: undefined,
    heart_rate: undefined,
    respiratory_rate: undefined,
    oxygen_saturation: undefined,
    weight: undefined,
    height: undefined,
    symptoms: '',
    allergies_noted: '',
    current_medications_noted: '',
    mobility_status: 'ambulatory',
    receptionist_notes: '',
    special_requirements: '',
    triage_level: 'non_urgent'
  });

  useEffect(() => {
    loadTodaysPatients();
  }, []);

  const loadTodaysPatients = async () => {
    try {
      const response = await api.get('/receptionist/patients/todays-registrations');
      setPatients(response.data.patients || []);
    } catch (error) {
      console.error('Failed to load patients:', error);
      showMessage('error', 'Failed to load today\'s patients');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const resetForms = () => {
    setRegistrationData({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      date_of_birth: '',
      gender: 'male',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      visit_type: 'walk_in'
    });
    setTriageData({
      chief_complaint: '',
      pain_scale: 0,
      temperature: undefined,
      blood_pressure_systolic: undefined,
      blood_pressure_diastolic: undefined,
      heart_rate: undefined,
      respiratory_rate: undefined,
      oxygen_saturation: undefined,
      weight: undefined,
      height: undefined,
      symptoms: '',
      allergies_noted: '',
      current_medications_noted: '',
      mobility_status: 'ambulatory',
      receptionist_notes: '',
      special_requirements: '',
      triage_level: 'non_urgent'
    });
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationData.first_name || !registrationData.last_name || !registrationData.phone) {
      showMessage('error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/receptionist/register-patient', registrationData);
      showMessage('success', `Patient ${registrationData.first_name} ${registrationData.last_name} registered successfully with ID: ${response.data.patient.patient_id}`);
      resetForms();
      await loadTodaysPatients();
      setCurrentView('dashboard');
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPatients = async (query: string) => {
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
      showMessage('error', 'Search failed');
    }
  };

  const openEditModal = (patient: Patient) => {
    setEditingPatient(patient);
    setEditFormData({
      first_name: patient.first_name,
      last_name: patient.last_name,
      phone: patient.phone,
      email: patient.email || '',
      date_of_birth: patient.date_of_birth || '',
      gender: (patient.gender as 'male' | 'female' | 'other') || 'male',
      address: patient.address || '',
      emergency_contact_name: patient.emergency_contact || '',
      emergency_contact_phone: patient.emergency_phone || '',
      blood_type: (patient as any).blood_type || '',
      allergies: (patient as any).allergies || '',
      medical_history: (patient as any).medical_history || '',
    });
  };

  const handleEditPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    setLoading(true);
    try {
      await api.put(`/receptionist/patients/${editingPatient.id}`, editFormData);
      showMessage('success', `Patient ${editFormData.first_name} ${editFormData.last_name} updated successfully`);
      setEditingPatient(null);
      await loadTodaysPatients();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to update patient');
    } finally {
      setLoading(false);
    }
  };

  const handleTriageSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !triageData.chief_complaint) {
      showMessage('error', 'Please fill in required triage fields');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/receptionist/patient/${selectedPatient.id}/triage`, triageData);
      showMessage('success', `Triage completed for ${selectedPatient.first_name} ${selectedPatient.last_name}. Queue number: ${response.data.triage.queue_number}`);
      resetForms();
      setSelectedPatient(null);
      await loadTodaysPatients();
      setCurrentView('dashboard');
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Triage submission failed');
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <div>
          <h2 className="text-xl font-bold">Receptionist Module</h2>
          <p className="text-blue-100 text-sm">Full receptionist dashboard access</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{patients.length}</div>
          <div className="text-sm text-blue-800">Today's Registrations</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">
            {patients.filter(p => p.registration_status === 'registered').length}
          </div>
          <div className="text-sm text-yellow-800">Awaiting Triage</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-600">
            {patients.filter(p => p.registration_status === 'triaged').length}
          </div>
          <div className="text-sm text-green-800">Triaged</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">
            {patients.filter(p => p.registration_status === 'completed').length}
          </div>
          <div className="text-sm text-purple-800">Completed</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Receptionist Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setCurrentView('register')}
            className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm">Register Patient</span>
          </button>
          
          <button
            onClick={() => setCurrentView('search')}
            className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm">Search Patients</span>
          </button>
          
          <button
            onClick={() => {
              if (patients.filter(p => p.registration_status === 'registered').length === 0) {
                showMessage('error', 'No patients available for triage');
                return;
              }
              setCurrentView('triage');
            }}
            className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm">Triage Assessment</span>
          </button>
          
          <button
            onClick={loadTodaysPatients}
            className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm">Refresh</span>
          </button>
        </div>
      </div>

      {/* Today's Patients */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Today's Patients ({patients.length})</h3>
        
        {patients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No patients registered today</p>
            <button
              onClick={() => setCurrentView('register')}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Register the first patient
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                          {patient.first_name[0]}{patient.last_name[0]}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {patient.first_name} {patient.last_name}
                          </div>
                          <div className="text-xs text-gray-500">{patient.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        {patient.patient_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        patient.visit_type === 'emergency' ? 'bg-red-100 text-red-800' :
                        patient.visit_type === 'appointment' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {patient.visit_type?.toUpperCase() || 'WALK-IN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        patient.registration_status === 'completed' ? 'bg-green-100 text-green-800' :
                        patient.registration_status === 'in_consultation' ? 'bg-blue-100 text-blue-800' :
                        patient.registration_status === 'triaged' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {patient.registration_status?.replace('_', ' ').toUpperCase() || 'REGISTERED'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {patient.current_queue_number ? `#${patient.current_queue_number}` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {patient.registration_status === 'registered' && (
                          <button
                            onClick={() => {
                              setSelectedPatient(patient);
                              setCurrentView('triage');
                            }}
                            className="bg-orange-600 text-white px-2 py-1 rounded text-xs hover:bg-orange-700"
                          >
                            Triage
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(patient)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderRegistration = () => (
    <div className="space-y-4 p-4">
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="float-right text-lg">&times;</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Register New Patient</h3>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"
        >
          Back
        </button>
      </div>

      <form onSubmit={handleRegisterPatient} className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input
              type="text"
              value={registrationData.first_name}
              onChange={(e) => setRegistrationData({...registrationData, first_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input
              type="text"
              value={registrationData.last_name}
              onChange={(e) => setRegistrationData({...registrationData, last_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input
              type="tel"
              value={registrationData.phone}
              onChange={(e) => setRegistrationData({...registrationData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={registrationData.email}
              onChange={(e) => setRegistrationData({...registrationData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={registrationData.date_of_birth}
              onChange={(e) => setRegistrationData({...registrationData, date_of_birth: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={registrationData.gender}
              onChange={(e) => setRegistrationData({...registrationData, gender: e.target.value as 'male' | 'female' | 'other'})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type</label>
            <select
              value={registrationData.visit_type}
              onChange={(e) => setRegistrationData({...registrationData, visit_type: e.target.value as 'walk_in' | 'appointment' | 'emergency'})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="walk_in">Walk-in</option>
              <option value="appointment">Appointment</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
            <input
              type="text"
              value={registrationData.emergency_contact_name}
              onChange={(e) => setRegistrationData({...registrationData, emergency_contact_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Contact name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea
            value={registrationData.address}
            onChange={(e) => setRegistrationData({...registrationData, address: e.target.value})}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Registering...' : 'Register Patient'}
        </button>
      </form>
    </div>
  );

  const renderSearch = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Search Patients</h3>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"
        >
          Back
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchPatients(e.target.value)}
          placeholder="Search by name, ID, or phone..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((patient) => (
              <div key={patient.id} className="p-3 bg-gray-50 rounded-lg border hover:bg-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{patient.first_name} {patient.last_name}</div>
                    <div className="text-sm text-gray-600">ID: {patient.patient_id} | Phone: {patient.phone}</div>
                    <div className="text-xs text-gray-500 capitalize">{patient.registration_status?.replace('_', ' ')}</div>
                  </div>
                  <div className="flex space-x-2">
                    {patient.registration_status === 'registered' && (
                      <button
                        onClick={() => {
                          setSelectedPatient(patient);
                          setCurrentView('triage');
                        }}
                        className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
                      >
                        Triage
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(patient)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Edit
                    </button>

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchQuery && searchResults.length === 0 && (
          <div className="mt-4 text-center text-gray-500">
            No patients found
          </div>
        )}
      </div>
    </div>
  );

  const renderTriage = () => (
    <div className="space-y-4 p-4">
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="float-right text-lg">&times;</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Triage Assessment</h3>
        <button
          onClick={() => { setCurrentView('dashboard'); setSelectedPatient(null); }}
          className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"
        >
          Back
        </button>
      </div>

      {!selectedPatient ? (
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold mb-3">Select Patient for Triage</h4>
          <div className="space-y-2">
            {patients.filter(p => p.registration_status === 'registered').map((patient) => (
              <button
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border"
              >
                <div className="font-medium">{patient.first_name} {patient.last_name}</div>
                <div className="text-sm text-gray-600">ID: {patient.patient_id}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleTriageSubmission} className="bg-white p-4 rounded-lg shadow space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="font-medium">Patient: {selectedPatient.first_name} {selectedPatient.last_name}</div>
            <div className="text-sm text-gray-600">ID: {selectedPatient.patient_id}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint *</label>
            <textarea
              value={triageData.chief_complaint}
              onChange={(e) => setTriageData({...triageData, chief_complaint: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pain Scale (0-10)</label>
              <input
                type="number"
                min="0"
                max="10"
                value={triageData.pain_scale}
                onChange={(e) => setTriageData({...triageData, pain_scale: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                value={triageData.temperature || ''}
                onChange={(e) => setTriageData({...triageData, temperature: parseFloat(e.target.value) || undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heart Rate</label>
              <input
                type="number"
                value={triageData.heart_rate || ''}
                onChange={(e) => setTriageData({...triageData, heart_rate: parseInt(e.target.value) || undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">O2 Saturation (%)</label>
              <input
                type="number"
                value={triageData.oxygen_saturation || ''}
                onChange={(e) => setTriageData({...triageData, oxygen_saturation: parseInt(e.target.value) || undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Triage Level *</label>
            <select
              value={triageData.triage_level}
              onChange={(e) => setTriageData({...triageData, triage_level: e.target.value as TriageData['triage_level']})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="non_urgent">Non-Urgent (Green)</option>
              <option value="less_urgent">Less Urgent (Yellow)</option>
              <option value="urgent">Urgent (Orange)</option>
              <option value="emergency">Emergency (Red)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={triageData.receptionist_notes}
              onChange={(e) => setTriageData({...triageData, receptionist_notes: e.target.value})}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Submitting...' : 'Complete Triage & Add to Queue'}
          </button>
        </form>
      )}
    </div>
  );

  return (
    <div className="bg-gray-50 rounded-lg border shadow-lg overflow-hidden">
      {renderHeader()}

      <div className="min-h-[500px]">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'register' && renderRegistration()}
        {currentView === 'search' && renderSearch()}
        {currentView === 'triage' && renderTriage()}
      </div>

      {/* Edit Patient Modal */}
      {editingPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Edit Patient — {editingPatient.first_name} {editingPatient.last_name}</h3>
              <button onClick={() => setEditingPatient(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleEditPatient} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input type="text" value={editFormData.first_name || ''} onChange={e => setEditFormData(p => ({...p, first_name: e.target.value}))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input type="text" value={editFormData.last_name || ''} onChange={e => setEditFormData(p => ({...p, last_name: e.target.value}))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input type="tel" value={editFormData.phone || ''} onChange={e => setEditFormData(p => ({...p, phone: e.target.value}))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={editFormData.email || ''} onChange={e => setEditFormData(p => ({...p, email: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input type="date" value={editFormData.date_of_birth || ''} onChange={e => setEditFormData(p => ({...p, date_of_birth: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select value={editFormData.gender || 'male'} onChange={e => setEditFormData(p => ({...p, gender: e.target.value as 'male' | 'female' | 'other'}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                  <input type="text" value={editFormData.emergency_contact_name || ''} onChange={e => setEditFormData(p => ({...p, emergency_contact_name: e.target.value}))} placeholder="Contact name" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Phone</label>
                  <input type="tel" value={editFormData.emergency_contact_phone || ''} onChange={e => setEditFormData(p => ({...p, emergency_contact_phone: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
                  <select value={(editFormData as any).blood_type || ''} onChange={e => setEditFormData(p => ({...p, blood_type: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Unknown</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={editFormData.address || ''} onChange={e => setEditFormData(p => ({...p, address: e.target.value}))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                <textarea value={(editFormData as any).allergies || ''} onChange={e => setEditFormData(p => ({...p, allergies: e.target.value}))} rows={2} placeholder="Known allergies..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end space-x-3 pt-2 border-t">
                <button type="button" onClick={() => setEditingPatient(null)} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
