import React, { useState } from 'react';
import { LabTest } from '@/types';

interface DiagnosisFormProps {
  labTest: LabTest;
  onSubmit: (diagnosisData: DiagnosisFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export interface DiagnosisFormData {
  patient_id: number;
  chief_complaint: string;
  diagnosis: string;
  treatment_plan: string;
  medications_prescribed?: string;
  lab_tests_ordered?: string;
  follow_up_instructions?: string;
  blood_pressure?: string;
  heart_rate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  lab_test_id?: number;
  referral_type: 'none' | 'internal' | 'external';
  referral_doctor_id?: number;
  referral_department_id?: number;
  referral_facility?: string;
  referral_reason?: string;
  referral_urgency?: 'routine' | 'urgent' | 'emergency';
}

export default function DiagnosisForm({ 
  labTest, 
  onSubmit, 
  onCancel, 
  loading = false 
}: DiagnosisFormProps) {
  const [formData, setFormData] = useState<DiagnosisFormData>({
    patient_id: labTest.patient_id,
    chief_complaint: '',
    diagnosis: '',
    treatment_plan: '',
    medications_prescribed: '',
    lab_tests_ordered: labTest.test_name,
    follow_up_instructions: '',
    blood_pressure: '',
    heart_rate: undefined,
    temperature: undefined,
    weight: undefined,
    height: undefined,
    lab_test_id: labTest.id,
    referral_type: 'none',
    referral_doctor_id: undefined,
    referral_department_id: undefined,
    referral_facility: '',
    referral_reason: '',
    referral_urgency: 'routine'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : undefined) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.diagnosis.trim()) {
      onSubmit(formData);
    }
  };

  const getSuggestions = () => {
    const testType = labTest.test_type;
    const resultValue = labTest.result_value?.toLowerCase() || '';
    const abnormalFlag = labTest.abnormal_flag;

    const suggestions: string[] = [];

    if (testType === 'blood_chemistry') {
      if (resultValue.includes('glucose') || labTest.test_name.toLowerCase().includes('glucose')) {
        if (abnormalFlag === 'high') {
          suggestions.push('Diabetes mellitus', 'Hyperglycemia', 'Impaired glucose tolerance');
        } else if (abnormalFlag === 'low') {
          suggestions.push('Hypoglycemia', 'Reactive hypoglycemia');
        }
      }
      if (resultValue.includes('cholesterol') || labTest.test_name.toLowerCase().includes('lipid')) {
        if (abnormalFlag === 'high') {
          suggestions.push('Hyperlipidemia', 'Dyslipidemia', 'Cardiovascular risk');
        }
      }
    } else if (testType === 'hematology') {
      if (labTest.test_name.toLowerCase().includes('cbc')) {
        if (abnormalFlag === 'low') {
          suggestions.push('Anemia', 'Leukopenia', 'Thrombocytopenia');
        } else if (abnormalFlag === 'high') {
          suggestions.push('Polycythemia', 'Leukocytosis', 'Thrombocytosis');
        }
      }
    } else if (testType === 'urinalysis') {
      if (abnormalFlag === 'high' || abnormalFlag === 'critical') {
        suggestions.push('Urinary tract infection', 'Proteinuria', 'Hematuria');
      }
    }

    if (abnormalFlag === 'critical') {
      suggestions.unshift('Acute condition requiring immediate attention');
    }

    return suggestions;
  };

  const suggestions = getSuggestions();

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Create Diagnosis</h3>
          <p className="text-sm text-gray-600">Based on lab test results for {labTest.patient_name}</p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* Lab Test Results Summary */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">Lab Test Results</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Test:</strong> {labTest.test_name}</p>
            <p><strong>Type:</strong> {labTest.test_type.replace('_', ' ')}</p>
            <p><strong>Result:</strong> {labTest.result_value} {labTest.units}</p>
          </div>
          <div>
            <p><strong>Reference Range:</strong> {labTest.reference_range || 'N/A'}</p>
            <p><strong>Status:</strong> 
              <span className={`ml-1 px-2 py-1 text-xs rounded-full ${
                labTest.abnormal_flag === 'critical' ? 'bg-red-100 text-red-800' :
                labTest.abnormal_flag === 'high' || labTest.abnormal_flag === 'low' ? 'bg-orange-100 text-orange-800' :
                'bg-green-100 text-green-800'
              }`}>
                {labTest.abnormal_flag?.toUpperCase() || 'NORMAL'}
              </span>
            </p>
          </div>
        </div>
        {labTest.result_notes && (
          <p className="text-sm text-blue-700 mt-2">
            <strong>Lab Notes:</strong> {labTest.result_notes}
          </p>
        )}
      </div>

      {/* Diagnosis Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-900 mb-2">Suggested Diagnoses</h4>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  diagnosis: prev.diagnosis ? `${prev.diagnosis}; ${suggestion}` : suggestion 
                }))}
                className="text-sm px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full hover:bg-yellow-300 transition-colors"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Chief Complaint */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chief Complaint *
          </label>
          <textarea
            name="chief_complaint"
            value={formData.chief_complaint}
            onChange={handleInputChange}
            required
            rows={2}
            placeholder="Patient's main concern or symptom..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Diagnosis */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Diagnosis *
          </label>
          <textarea
            name="diagnosis"
            value={formData.diagnosis}
            onChange={handleInputChange}
            required
            rows={3}
            placeholder="Primary and secondary diagnoses based on lab results and clinical assessment..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Treatment Plan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Treatment Plan *
          </label>
          <textarea
            name="treatment_plan"
            value={formData.treatment_plan}
            onChange={handleInputChange}
            required
            rows={3}
            placeholder="Recommended treatment approach, procedures, lifestyle modifications..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Medications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Medications Prescribed
            </label>
            <textarea
              name="medications_prescribed"
              value={formData.medications_prescribed}
              onChange={handleInputChange}
              rows={3}
              placeholder="Medication name, dosage, frequency, duration..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Follow-up Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Follow-up Instructions
            </label>
            <textarea
              name="follow_up_instructions"
              value={formData.follow_up_instructions}
              onChange={handleInputChange}
              rows={3}
              placeholder="Return visit schedule, monitoring instructions, warning signs..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Vital Signs */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Current Vital Signs (Optional)</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Blood Pressure</label>
              <input
                type="text"
                name="blood_pressure"
                value={formData.blood_pressure}
                onChange={handleInputChange}
                placeholder="120/80"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Heart Rate (bpm)</label>
              <input
                type="number"
                name="heart_rate"
                value={formData.heart_rate || ''}
                onChange={handleInputChange}
                placeholder="72"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                name="temperature"
                value={formData.temperature || ''}
                onChange={handleInputChange}
                placeholder="36.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                name="weight"
                value={formData.weight || ''}
                onChange={handleInputChange}
                placeholder="70.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Height (cm)</label>
              <input
                type="number"
                name="height"
                value={formData.height || ''}
                onChange={handleInputChange}
                placeholder="175"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Referral and Next Steps */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Referral & Next Steps</h4>
          
          {/* Referral Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patient Disposition
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="referral_type"
                  value="none"
                  checked={formData.referral_type === 'none'}
                  onChange={handleInputChange}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-green-700">Prescription Only</div>
                  <div className="text-sm text-gray-600">Provide medication and discharge</div>
                </div>
              </label>
              
              <label className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="referral_type"
                  value="internal"
                  checked={formData.referral_type === 'internal'}
                  onChange={handleInputChange}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-blue-700">Internal Referral</div>
                  <div className="text-sm text-gray-600">Refer to another doctor here</div>
                </div>
              </label>
              
              <label className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="referral_type"
                  value="external"
                  checked={formData.referral_type === 'external'}
                  onChange={handleInputChange}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-orange-700">External Referral</div>
                  <div className="text-sm text-gray-600">Refer to another facility</div>
                </div>
              </label>
            </div>
          </div>

          {/* Internal Referral Fields */}
          {formData.referral_type === 'internal' && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
              <h5 className="font-medium text-blue-900 mb-3">Internal Referral Details</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Department</label>
                  <select
                    name="referral_department_id"
                    value={formData.referral_department_id || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      referral_department_id: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select department...</option>
                    <option value="1">Cardiology</option>
                    <option value="2">Neurology</option>
                    <option value="3">Orthopedics</option>
                    <option value="4">Psychiatry</option>
                    <option value="5">Surgery</option>
                    <option value="6">Pediatrics</option>
                    <option value="7">Dermatology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Specific Doctor (Optional)</label>
                  <input
                    type="text"
                    placeholder="Dr. Smith, Dr. Johnson, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* External Referral Fields */}
          {formData.referral_type === 'external' && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 mb-4">
              <h5 className="font-medium text-orange-900 mb-3">External Referral Details</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Facility Name *</label>
                  <input
                    type="text"
                    name="referral_facility"
                    value={formData.referral_facility || ''}
                    onChange={handleInputChange}
                    required={formData.referral_type === 'external'}
                    placeholder="General Hospital, Specialist Clinic, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Facility Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select type...</option>
                    <option value="hospital">Hospital</option>
                    <option value="specialist_clinic">Specialist Clinic</option>
                    <option value="diagnostic_center">Diagnostic Center</option>
                    <option value="rehabilitation">Rehabilitation Center</option>
                    <option value="mental_health">Mental Health Facility</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Referral Reason (for both internal and external) */}
          {(formData.referral_type as string) !== 'none' && (
            <div className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Reason for Referral *</label>
                  <textarea
                    name="referral_reason"
                    value={formData.referral_reason || ''}
                    onChange={handleInputChange}
                    required={(formData.referral_type as string) !== 'none'}
                    rows={3}
                    placeholder="Describe why the patient needs to be referred..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Urgency Level</label>
                  <select
                    name="referral_urgency"
                    value={formData.referral_urgency || 'routine'}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="routine">Routine (within 2 weeks)</option>
                    <option value="urgent">Urgent (within 2-3 days)</option>
                    <option value="emergency">Emergency (immediate)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.diagnosis.trim() || !formData.chief_complaint.trim() || !formData.treatment_plan.trim()}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Medical Record'}
          </button>
        </div>
      </form>
    </div>
  );
}