import React, { useState } from 'react';
import { TriageAssessment, Patient } from '../types';

interface TriageFormProps {
  patient: Patient;
  onSubmit: (triageData: Partial<TriageAssessment>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function TriageForm({ 
  patient, 
  onSubmit, 
  onCancel, 
  loading = false 
}: TriageFormProps) {
  const [formData, setFormData] = useState({
    chief_complaint: '',
    pain_scale: '',
    temperature: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
    height: '',
    symptoms: '',
    allergies_noted: patient.allergies || '',
    current_medications_noted: patient.current_medications || '',
    mobility_status: 'ambulatory' as const,
    triage_level: 'non_urgent' as const,
    receptionist_notes: '',
    special_requirements: '',
    estimated_wait_time: '30'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.chief_complaint.trim()) {
      newErrors.chief_complaint = 'Chief complaint is required';
    }
    if (!formData.triage_level) {
      newErrors.triage_level = 'Triage level is required';
    }

    if (formData.temperature && (parseFloat(formData.temperature) < 30 || parseFloat(formData.temperature) > 50)) {
      newErrors.temperature = 'Temperature should be between 30-50°C';
    }
    if (formData.heart_rate && (parseInt(formData.heart_rate) < 30 || parseInt(formData.heart_rate) > 250)) {
      newErrors.heart_rate = 'Heart rate should be between 30-250 bpm';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const triageData = {
          ...formData,
          pain_scale: formData.pain_scale ? parseInt(formData.pain_scale) : undefined,
          temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
          blood_pressure_systolic: formData.blood_pressure_systolic ? parseInt(formData.blood_pressure_systolic) : undefined,
          blood_pressure_diastolic: formData.blood_pressure_diastolic ? parseInt(formData.blood_pressure_diastolic) : undefined,
          heart_rate: formData.heart_rate ? parseInt(formData.heart_rate) : undefined,
          respiratory_rate: formData.respiratory_rate ? parseInt(formData.respiratory_rate) : undefined,
          oxygen_saturation: formData.oxygen_saturation ? parseInt(formData.oxygen_saturation) : undefined,
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
          height: formData.height ? parseFloat(formData.height) : undefined,
          estimated_wait_time: formData.estimated_wait_time ? parseInt(formData.estimated_wait_time) : 30
        };
        
        await onSubmit(triageData);
      } catch (error) {
        console.error('Triage assessment failed:', error);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Triage Assessment</h2>
          <p className="text-gray-600">Patient: {patient.first_name} {patient.last_name} (ID: {patient.patient_id})</p>
        </div>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Chief Complaint *</label>
            <textarea
              name="chief_complaint"
              value={formData.chief_complaint}
              onChange={handleChange}
              rows={3}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.chief_complaint ? 'border-red-500' : ''}`}
              placeholder="Describe the main reason for the visit..."
            />
            {errors.chief_complaint && <p className="mt-1 text-sm text-red-600">{errors.chief_complaint}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Triage Level *</label>
            <select
              name="triage_level"
              value={formData.triage_level}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.triage_level ? 'border-red-500' : ''}`}
            >
              <option value="emergency">🔴 Emergency - Life threatening</option>
              <option value="urgent">🟠 Urgent - Serious condition</option>
              <option value="less_urgent">🟡 Less Urgent - Stable condition</option>
              <option value="non_urgent">🟢 Non-Urgent - Minor condition</option>
            </select>
            {errors.triage_level && <p className="mt-1 text-sm text-red-600">{errors.triage_level}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
            <input
              type="number"
              name="temperature"
              value={formData.temperature}
              onChange={handleChange}
              step="0.1"
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.temperature ? 'border-red-500' : ''}`}
              placeholder="36.5"
            />
            {errors.temperature && <p className="mt-1 text-sm text-red-600">{errors.temperature}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Heart Rate (bpm)</label>
            <input
              type="number"
              name="heart_rate"
              value={formData.heart_rate}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.heart_rate ? 'border-red-500' : ''}`}
              placeholder="80"
            />
            {errors.heart_rate && <p className="mt-1 text-sm text-red-600">{errors.heart_rate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Pain Scale (1-10)</label>
            <input
              type="number"
              name="pain_scale"
              value={formData.pain_scale}
              onChange={handleChange}
              min="1"
              max="10"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Pain level"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Estimated Wait (min)</label>
            <input
              type="number"
              name="estimated_wait_time"
              value={formData.estimated_wait_time}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="30"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Completing Triage...' : 'Complete Triage Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
}