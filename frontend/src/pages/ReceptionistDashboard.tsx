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

export default function NewReceptionistDashboard() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form states
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Receptionist Dashboard</h2>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setCurrentView('register')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Register New Patient</span>
          </button>
          
          <button
            onClick={() => setCurrentView('search')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search Patients</span>
          </button>
          
          <button
            onClick={() => loadTodaysPatients()}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Today's Patients */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Today's Patients ({patients.length})</h3>
        
        {patients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Queue #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {patient.first_name[0]}{patient.last_name[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {patient.first_name} {patient.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{patient.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {patient.patient_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        patient.visit_type === 'emergency' ? 'bg-red-100 text-red-800' :
                        patient.visit_type === 'appointment' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {patient.visit_type?.toUpperCase() || 'WALK-IN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        patient.registration_status === 'completed' ? 'bg-green-100 text-green-800' :
                        patient.registration_status === 'in_consultation' ? 'bg-blue-100 text-blue-800' :
                        patient.registration_status === 'triaged' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {patient.registration_status?.replace('_', ' ').toUpperCase() || 'REGISTERED'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {patient.current_queue_number ? `#${patient.current_queue_number}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {patient.registration_status === 'registered' && (
                        <button
                          onClick={() => {
                            setSelectedPatient(patient);
                            setCurrentView('triage');
                          }}
                          className="bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          Start Triage
                        </button>
                      )}
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
          <h2 className="text-2xl font-bold text-gray-900">Register New Patient</h2>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        <form onSubmit={handleRegisterPatient} className="space-y-6">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                id="first_name"
                value={registrationData.first_name}
                onChange={(e) => setRegistrationData({...registrationData, first_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                id="last_name"
                value={registrationData.last_name}
                onChange={(e) => setRegistrationData({...registrationData, last_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                value={registrationData.phone}
                onChange={(e) => setRegistrationData({...registrationData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={registrationData.email}
                onChange={(e) => setRegistrationData({...registrationData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                id="date_of_birth"
                value={registrationData.date_of_birth}
                onChange={(e) => setRegistrationData({...registrationData, date_of_birth: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                id="gender"
                value={registrationData.gender}
                onChange={(e) => setRegistrationData({...registrationData, gender: e.target.value as 'male' | 'female' | 'other'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              id="address"
              value={registrationData.address}
              onChange={(e) => setRegistrationData({...registrationData, address: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Emergency Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="emergency_contact_name" className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                id="emergency_contact_name"
                value={registrationData.emergency_contact_name}
                onChange={(e) => setRegistrationData({...registrationData, emergency_contact_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="emergency_contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                id="emergency_contact_phone"
                value={registrationData.emergency_contact_phone}
                onChange={(e) => setRegistrationData({...registrationData, emergency_contact_phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Visit Type */}
          <div>
            <label htmlFor="visit_type" className="block text-sm font-medium text-gray-700 mb-1">
              Visit Type
            </label>
            <select
              id="visit_type"
              value={registrationData.visit_type}
              onChange={(e) => setRegistrationData({...registrationData, visit_type: e.target.value as 'walk_in' | 'appointment' | 'emergency'})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="walk_in">Walk-in</option>
              <option value="appointment">Appointment</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderSearch = () => (
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
          <h2 className="text-2xl font-bold text-gray-900">Search Patients</h2>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Search by Patient ID, Name, or Phone Number
          </label>
          <input
            type="text"
            id="search"
            value={searchQuery}
            onChange={(e) => handleSearchPatients(e.target.value)}
            placeholder="Enter patient information..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Search Results ({searchResults.length})
            </h3>
            
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>No patients found matching your search</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Visit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {searchResults.map((patient) => (
                      <tr key={patient.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">
                                  {patient.first_name[0]}{patient.last_name[0]}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {patient.first_name} {patient.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{patient.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {patient.patient_id}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            patient.registration_status === 'completed' ? 'bg-green-100 text-green-800' :
                            patient.registration_status === 'in_consultation' ? 'bg-blue-100 text-blue-800' :
                            patient.registration_status === 'triaged' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {patient.registration_status?.replace('_', ' ').toUpperCase() || 'REGISTERED'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {patient.created_at ? new Date(patient.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedPatient(patient);
                              setCurrentView('triage');
                            }}
                            className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Start Triage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Triage Assessment</h2>
            <p className="text-gray-600">Patient: {selectedPatient?.first_name} {selectedPatient?.last_name} ({selectedPatient?.patient_id})</p>
          </div>
          <button
            onClick={() => {
              setCurrentView('dashboard');
              setSelectedPatient(null);
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        <form onSubmit={handleTriageSubmission} className="space-y-6">
          {/* Chief Complaint */}
          <div>
            <label htmlFor="chief_complaint" className="block text-sm font-medium text-gray-700 mb-1">
              Chief Complaint *
            </label>
            <textarea
              id="chief_complaint"
              value={triageData.chief_complaint}
              onChange={(e) => setTriageData({...triageData, chief_complaint: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Pain Scale */}
          <div>
            <label htmlFor="pain_scale" className="block text-sm font-medium text-gray-700 mb-1">
              Pain Scale (0-10)
            </label>
            <input
              type="range"
              id="pain_scale"
              min="0"
              max="10"
              value={triageData.pain_scale}
              onChange={(e) => setTriageData({...triageData, pain_scale: parseInt(e.target.value)})}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>0 (No pain)</span>
              <span className="font-medium">{triageData.pain_scale}</span>
              <span>10 (Worst pain)</span>
            </div>
          </div>

          {/* Vital Signs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                id="temperature"
                value={triageData.temperature || ''}
                onChange={(e) => setTriageData({...triageData, temperature: e.target.value ? parseFloat(e.target.value) : undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="heart_rate" className="block text-sm font-medium text-gray-700 mb-1">
                Heart Rate (bpm)
              </label>
              <input
                type="number"
                id="heart_rate"
                value={triageData.heart_rate || ''}
                onChange={(e) => setTriageData({...triageData, heart_rate: e.target.value ? parseInt(e.target.value) : undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="oxygen_saturation" className="block text-sm font-medium text-gray-700 mb-1">
                Oxygen Saturation (%)
              </label>
              <input
                type="number"
                id="oxygen_saturation"
                value={triageData.oxygen_saturation || ''}
                onChange={(e) => setTriageData({...triageData, oxygen_saturation: e.target.value ? parseInt(e.target.value) : undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Blood Pressure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="bp_systolic" className="block text-sm font-medium text-gray-700 mb-1">
                Blood Pressure Systolic (mmHg)
              </label>
              <input
                type="number"
                id="bp_systolic"
                value={triageData.blood_pressure_systolic || ''}
                onChange={(e) => setTriageData({...triageData, blood_pressure_systolic: e.target.value ? parseInt(e.target.value) : undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="bp_diastolic" className="block text-sm font-medium text-gray-700 mb-1">
                Blood Pressure Diastolic (mmHg)
              </label>
              <input
                type="number"
                id="bp_diastolic"
                value={triageData.blood_pressure_diastolic || ''}
                onChange={(e) => setTriageData({...triageData, blood_pressure_diastolic: e.target.value ? parseInt(e.target.value) : undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Symptoms */}
          <div>
            <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700 mb-1">
              Additional Symptoms
            </label>
            <textarea
              id="symptoms"
              value={triageData.symptoms}
              onChange={(e) => setTriageData({...triageData, symptoms: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Allergies */}
          <div>
            <label htmlFor="allergies_noted" className="block text-sm font-medium text-gray-700 mb-1">
              Known Allergies
            </label>
            <input
              type="text"
              id="allergies_noted"
              value={triageData.allergies_noted}
              onChange={(e) => setTriageData({...triageData, allergies_noted: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Current Medications */}
          <div>
            <label htmlFor="current_medications" className="block text-sm font-medium text-gray-700 mb-1">
              Current Medications
            </label>
            <textarea
              id="current_medications"
              value={triageData.current_medications_noted}
              onChange={(e) => setTriageData({...triageData, current_medications_noted: e.target.value})}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Triage Level */}
          <div>
            <label htmlFor="triage_level" className="block text-sm font-medium text-gray-700 mb-1">
              Triage Level
            </label>
            <select
              id="triage_level"
              value={triageData.triage_level}
              onChange={(e) => setTriageData({...triageData, triage_level: e.target.value as 'emergency' | 'urgent' | 'less_urgent' | 'non_urgent'})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="emergency">Emergency (Red)</option>
              <option value="urgent">Urgent (Orange)</option>
              <option value="less_urgent">Less Urgent (Yellow)</option>
              <option value="non_urgent">Non-Urgent (Green)</option>
            </select>
          </div>

          {/* Receptionist Notes */}
          <div>
            <label htmlFor="receptionist_notes" className="block text-sm font-medium text-gray-700 mb-1">
              Receptionist Notes
            </label>
            <textarea
              id="receptionist_notes"
              value={triageData.receptionist_notes}
              onChange={(e) => setTriageData({...triageData, receptionist_notes: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Submitting...' : 'Complete Triage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Receptionist Dashboard</h1>
          <p className="text-gray-600">Patient registration, search, and triage management</p>
        </div>

        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'register' && renderRegistration()}
        {currentView === 'search' && renderSearch()}
        {currentView === 'triage' && renderTriage()}
      </div>
    </div>
  );
}