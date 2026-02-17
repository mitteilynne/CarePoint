import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/services/api';

export default function Register() {
  const [formData, setFormData] = useState({
    facility_name: '',
    facility_type: 'clinic',
    address: '',
    phone: '',
    email: '',
    website: '',
    contact_person_name: '',
    contact_person_email: '',
    contact_person_phone: '',
    contact_person_position: '',
    description: '',
    number_of_staff: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const dataToSubmit = {
        ...formData,
        number_of_staff: formData.number_of_staff ? parseInt(formData.number_of_staff) : undefined
      };
      
      const response = await api.post('/auth/facility-registration', dataToSubmit);
      setSuccess(true);
      
      // Show success message for a few seconds then redirect to home
      setTimeout(() => {
        navigate('/');
      }, 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full">
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-8 text-center">
            <svg
              className="mx-auto h-16 w-16 text-green-500 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Registration Submitted Successfully!
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Thank you for registering your facility with CarePoint.
            </p>
            <p className="text-gray-600 mb-6">
              Our team will review your request and contact you at <strong>{formData.contact_person_email}</strong> within 1-2 business days with your organization code and setup instructions.
            </p>
            <Link
              to="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Register Your Healthcare Facility
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Submit your facility information and our team will contact you to complete the setup.
          </p>
        </div>
        
        <form className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Facility Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Facility Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facility Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="facility_name"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., City General Hospital"
                  value={formData.facility_name}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facility Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="facility_type"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.facility_type}
                  onChange={handleChange}
                >
                  <option value="hospital">Hospital</option>
                  <option value="clinic">Clinic</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="laboratory">Laboratory</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full facility address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="facility@example.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website (Optional)
                </label>
                <input
                  name="website"
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://www.example.com"
                  value={formData.website}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Staff (Optional)
                </label>
                <input
                  name="number_of_staff"
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 50"
                  value={formData.number_of_staff}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of your facility and services"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Contact Person Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Contact Person</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="contact_person_name"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                  value={formData.contact_person_name}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="contact_person_email"
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
                    value={formData.contact_person_email}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="contact_person_phone"
                    type="tel"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1234567890"
                    value={formData.contact_person_phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position/Title (Optional)
                </label>
                <input
                  name="contact_person_position"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Administrator, Director"
                  value={formData.contact_person_position}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Link
              to="/"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Back to Home
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 text-white px-8 py-3 rounded-md font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Submitting...' : 'Submit Registration Request'}
            </button>
          </div>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              Already have an organization code?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Staff Login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}