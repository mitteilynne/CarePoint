import React, { useState, useEffect } from 'react';
import { LabTestRequest, Patient } from '@/types';
import api from '@/services/api';

interface LabTestFormProps {
  patients?: Patient[];
  selectedPatientId?: number;
  onSubmit: (labTest: LabTestRequest) => void;
  onCancel: () => void;
  loading?: boolean;
}

const LAB_TEST_TYPES = [
  { value: 'blood_chemistry', label: 'Blood Chemistry' },
  { value: 'hematology', label: 'Hematology' },
  { value: 'urinalysis', label: 'Urinalysis' },
  { value: 'microbiology', label: 'Microbiology' },
  { value: 'immunology', label: 'Immunology' },
  { value: 'toxicology', label: 'Toxicology' },
  { value: 'pathology', label: 'Pathology' },
  { value: 'radiology', label: 'Radiology' },
  { value: 'other', label: 'Other' }
];

const COMMON_TESTS = {
  blood_chemistry: [
    'Complete Metabolic Panel (CMP)',
    'Basic Metabolic Panel (BMP)',
    'Lipid Panel',
    'Liver Function Tests',
    'Thyroid Function Tests',
    'Hemoglobin A1C',
    'Glucose (Fasting)',
    'Glucose (Random)'
  ],
  hematology: [
    'Complete Blood Count (CBC)',
    'CBC with Differential',
    'Platelet Count',
    'Prothrombin Time (PT)',
    'Partial Thromboplastin Time (PTT)',
    'International Normalized Ratio (INR)',
    'Erythrocyte Sedimentation Rate (ESR)',
    'C-Reactive Protein (CRP)'
  ],
  urinalysis: [
    'Complete Urinalysis',
    'Urine Culture',
    'Urine Microscopy',
    'Protein in Urine',
    'Glucose in Urine',
    'Ketones in Urine'
  ],
  microbiology: [
    'Blood Culture',
    'Urine Culture',
    'Throat Culture',
    'Wound Culture',
    'Stool Culture',
    'Sputum Culture'
  ],
  immunology: [
    'Hepatitis Panel',
    'HIV Test',
    'Autoimmune Panel',
    'Allergy Testing',
    'Immunoglobulin Levels',
    'Rheumatoid Factor'
  ],
  toxicology: [
    'Drug Screen',
    'Alcohol Level',
    'Carbon Monoxide Level',
    'Lead Level',
    'Heavy Metals Panel'
  ],
  pathology: [
    'Biopsy',
    'Cytology',
    'Pap Smear',
    'Fine Needle Aspiration'
  ],
  radiology: [
    'X-Ray',
    'CT Scan',
    'MRI',
    'Ultrasound',
    'Mammography'
  ],
  other: [
    'Custom Test'
  ]
};

export default function LabTestForm({ 
  patients = [], 
  selectedPatientId, 
  onSubmit, 
  onCancel, 
  loading = false 
}: LabTestFormProps) {
  const [formData, setFormData] = useState<LabTestRequest>({
    patient_id: selectedPatientId || 0,
    test_type: 'blood_chemistry',
    test_name: '',
    test_code: '',
    clinical_notes: '',
    urgency: 'routine',
    sample_type: '',
    scheduled_for: '',
    lab_location: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);

  useEffect(() => {
    if (selectedPatientId) {
      setFormData(prev => ({ ...prev, patient_id: selectedPatientId }));
    }
  }, [selectedPatientId]);

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
      console.error('Patient search failed:', error);
      setSearchResults([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePatientSelect = (patient: Patient) => {
    setFormData(prev => ({ ...prev, patient_id: patient.id }));
    setSearchQuery(`${patient.first_name} ${patient.last_name}`);
    setSearchResults([]);
  };

  const handleTestTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const testType = e.target.value as LabTestRequest['test_type'];
    setFormData(prev => ({ 
      ...prev, 
      test_type: testType,
      test_name: '' // Reset test name when type changes
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.patient_id && formData.test_name) {
      onSubmit(formData);
    }
  };

  const selectedPatient = patients.find(p => p.id === formData.patient_id) || 
    searchResults.find(p => p.id === formData.patient_id);

  const commonTests = COMMON_TESTS[formData.test_type] || [];

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Request Lab Test</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Patient Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Patient *
          </label>
          {!selectedPatientId && (
            <div className="mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => searchPatients(e.target.value)}
                placeholder="Search for patient by name, ID, or phone..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                  {searchResults.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => handlePatientSelect(patient)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center"
                    >
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
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
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedPatient && (
            <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <span className="text-sm font-medium text-blue-600">
                  {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedPatient.patient_id} • {selectedPatient.phone}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Test Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test Type *
          </label>
          <select
            name="test_type"
            value={formData.test_type}
            onChange={handleTestTypeChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {LAB_TEST_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Test Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test Name *
          </label>
          <div className="space-y-2">
            <select
              value={formData.test_name}
              onChange={(e) => setFormData(prev => ({ ...prev, test_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a common test...</option>
              {commonTests.map((test) => (
                <option key={test} value={test}>
                  {test}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="test_name"
              value={formData.test_name}
              onChange={handleInputChange}
              placeholder="Or enter custom test name"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Test Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Code
            </label>
            <input
              type="text"
              name="test_code"
              value={formData.test_code}
              onChange={handleInputChange}
              placeholder="e.g., CBC001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urgency *
            </label>
            <select
              name="urgency"
              value={formData.urgency}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">STAT (Immediate)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sample Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sample Type
            </label>
            <input
              type="text"
              name="sample_type"
              value={formData.sample_type}
              onChange={handleInputChange}
              placeholder="e.g., Blood, Urine, Saliva"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Lab Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lab Location
            </label>
            <input
              type="text"
              name="lab_location"
              value={formData.lab_location}
              onChange={handleInputChange}
              placeholder="e.g., Main Lab, Building A"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Scheduled For */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scheduled For
          </label>
          <input
            type="datetime-local"
            name="scheduled_for"
            value={formData.scheduled_for}
            onChange={handleInputChange}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Clinical Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Clinical Notes
          </label>
          <textarea
            name="clinical_notes"
            value={formData.clinical_notes}
            onChange={handleInputChange}
            rows={3}
            placeholder="Enter the clinical reason for this test, symptoms, or other relevant information..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.patient_id || !formData.test_name}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Ordering...' : 'Order Test'}
          </button>
        </div>
      </form>
    </div>
  );
}