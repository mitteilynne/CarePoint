import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import DoctorDetailsModal from '@/components/DoctorDetailsModal';
import LabTechDetailsModal from '@/components/LabTechDetailsModal';
import ReceptionistDetailsModal from '@/components/ReceptionistDetailsModal';
import AdminSidebar, { getAdminSidebarItems } from '@/components/AdminSidebar';
import { EmbeddedDoctorModule, EmbeddedReceptionistModule, EmbeddedLabTechModule, EmbeddedPharmacistModule } from '@/components/modules';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  email_confirmed: boolean;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

interface DashboardOverview {
  total_users: number;
  role_counts: { [key: string]: number };
  registration_trends: Array<{ date: string; count: number }>;
}

interface OrganizationInfo {
  id: number;
  code: string;
  name: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

interface DoctorSummary {
  id: number;
  name: string;
  email: string;
  username: string;
  is_active: boolean;
  patients_count: number;
  visits_count: number;
  lab_tests_count: number;
  prescriptions_count: number;
}

interface LabTechnicianSummary {
  id: number;
  name: string;
  email: string;
  username: string;
  is_active: boolean;
  assigned_tests_count: number;
  completed_tests_count: number;
  pending_tests_count: number;
  efficiency_percentage: number;
}

interface ReceptionistSummary {
  id: number;
  name: string;
  email: string;
  username: string;
  is_active: boolean;
  patients_registered: number;
  appointments_scheduled: number;
}

interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_prev: boolean;
  has_next: boolean;
}

type ViewMode = 'overview' | 'users' | 'doctors' | 'receptionists' | 'lab_technicians' | 'organization' | 'doctor_module' | 'receptionist_module' | 'lab_tech_module' | 'pharmacist_module';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ViewMode>('overview');
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [organizationInfo, setOrganizationInfo] = useState<OrganizationInfo | null>(null);
  const [doctorsSummary, setDoctorsSummary] = useState<DoctorSummary[]>([]);
  const [labTechsSummary, setLabTechsSummary] = useState<LabTechnicianSummary[]>([]);
  const [receptionistsSummary, setReceptionistsSummary] = useState<ReceptionistSummary[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedLabTechId, setSelectedLabTechId] = useState<number | null>(null);
  const [selectedReceptionistId, setSelectedReceptionistId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filters and search
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (currentView === 'overview') {
      loadOverview();
    } else if (currentView === 'organization') {
      loadOrganizationInfo();
    } else if (currentView === 'doctors') {
      loadDoctorsSummary();
    } else if (currentView === 'lab_technicians') {
      loadLabTechsSummary();
    } else if (currentView === 'receptionists') {
      loadReceptionistsSummary();
    } else {
      loadUsers();
    }
  }, [currentView, currentPage, roleFilter, statusFilter, searchQuery]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/dashboard/overview');
      setOverview(response.data.overview);
    } catch (error) {
      console.error('Error loading overview:', error);
      setMessage({ type: 'error', text: 'Failed to load dashboard overview' });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        per_page: 20
      };

      if (currentView === 'doctors') {
        params.role = 'doctor';
      } else if (currentView === 'receptionists') {
        params.role = 'receptionist';
      } else if (currentView === 'lab_technicians') {
        params.role = 'lab_technician';
      } else if (roleFilter !== 'all') {
        params.role = roleFilter;
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await api.get('/admin/users', { params });
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/organization/info');
      setOrganizationInfo(response.data.organization);
    } catch (error) {
      console.error('Error loading organization info:', error);
      setMessage({ type: 'error', text: 'Failed to load organization info' });
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorsSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/doctors', { 
        params: { days: 30 }
      });
      setDoctorsSummary(response.data.doctors);
    } catch (error) {
      console.error('Error loading doctors summary:', error);
      setMessage({ type: 'error', text: 'Failed to load doctors summary' });
    } finally {
      setLoading(false);
    }
  };

  const loadLabTechsSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/lab-technicians', { 
        params: { days: 30 }
      });
      setLabTechsSummary(response.data.lab_technicians);
    } catch (error) {
      console.error('Error loading lab technicians summary:', error);
      setMessage({ type: 'error', text: 'Failed to load lab technicians summary' });
    } finally {
      setLoading(false);
    }
  };

  const loadReceptionistsSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/receptionists', { 
        params: { days: 30 }
      });
      setReceptionistsSummary(response.data.receptionists);
    } catch (error) {
      console.error('Error loading receptionists summary:', error);
      setMessage({ type: 'error', text: 'Failed to load receptionists summary' });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: number) => {
    try {
      const response = await api.post(`/admin/users/${userId}/toggle-status`);
      setMessage({ type: 'success', text: response.data.message });
      loadUsers();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update user status' 
      });
    }
  };

  const updateUserRole = async (userId: number, newRole: string) => {
    try {
      const response = await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setMessage({ type: 'success', text: response.data.message });
      loadUsers();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update user role' 
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadUsers();
  };

  const resetFilters = () => {
    setRoleFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Organization Overview</h2>
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-800">
                {overview.total_users}
              </div>
              <div className="text-blue-600">Total Users</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-800">
                {overview.role_counts.doctor || 0}
              </div>
              <div className="text-green-600">Doctors</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-800">
                {overview.role_counts.receptionist || 0}
              </div>
              <div className="text-purple-600">Receptionists</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-800">
                {overview.role_counts.lab_technician || 0}
              </div>
              <div className="text-orange-600">Lab Technicians</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Role Distribution</h3>
        {overview && (
          <div className="space-y-2">
            {Object.entries(overview.role_counts).map(([role, count]) => (
              <div key={role} className="flex justify-between items-center">
                <span className="capitalize font-medium">
                  {role.replace('_', ' ')}
                </span>
                <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderUserTable = () => (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, username..."
              className="border border-gray-300 rounded-md px-3 py-2 w-64"
            />
          </div>
          
          {currentView === 'users' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">All Roles</option>
                <option value="doctor">Doctor</option>
                <option value="receptionist">Receptionist</option>
                <option value="lab_technician">Lab Technician</option>
                <option value="admin">Admin</option>
                <option value="patient">Patient</option>
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Search
          </button>
          
          <button
            type="button"
            onClick={resetFilters}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
          >
            Reset
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="patient">Patient</option>
                      <option value="doctor">Doctor</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="lab_technician">Lab Technician</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => toggleUserStatus(user.id)}
                      className={`mr-2 px-3 py-1 rounded text-sm ${
                        user.is_active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!pagination.has_prev}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!pagination.has_next}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page {pagination.page} of {pagination.pages} 
                  ({pagination.total} total users)
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === pagination.page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderOrganization = () => (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Organization Information</h2>
      {organizationInfo && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{organizationInfo.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Code</label>
              <p className="mt-1 text-sm text-gray-900">{organizationInfo.code}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <p className="mt-1 text-sm text-gray-900 capitalize">{organizationInfo.type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                organizationInfo.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {organizationInfo.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Created</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(organizationInfo.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDoctorsView = () => (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Doctors Activity Summary (Last 30 days)</h3>
        {doctorsSummary.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patients
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lab Tests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prescriptions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {doctorsSummary.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {doctor.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {doctor.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {doctor.patients_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {doctor.visits_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {doctor.lab_tests_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {doctor.prescriptions_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        doctor.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {doctor.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedDoctorId(doctor.id)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => toggleUserStatus(doctor.id)}
                        className={`${
                          doctor.is_active
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {doctor.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No doctors found in this organization
          </div>
        )}
      </div>
    </div>
  );

  const renderLabTechniciansView = () => (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Lab Technicians Activity Summary (Last 30 days)</h3>
        {labTechsSummary.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lab Technician
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Tests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pending
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Efficiency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {labTechsSummary.map((tech) => (
                  <tr key={tech.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {tech.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {tech.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tech.assigned_tests_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {tech.completed_tests_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {tech.pending_tests_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tech.efficiency_percentage >= 80 
                          ? 'bg-green-100 text-green-800'
                          : tech.efficiency_percentage >= 60
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tech.efficiency_percentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tech.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tech.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedLabTechId(tech.id)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => toggleUserStatus(tech.id)}
                        className={`${
                          tech.is_active
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {tech.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No lab technicians found in this organization
          </div>
        )}
      </div>
    </div>
  );

  const renderReceptionistsView = () => (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Receptionists Activity Summary (Last 30 days)</h3>
        {receptionistsSummary.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receptionist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patients Registered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appointments Scheduled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {receptionistsSummary.map((receptionist) => (
                  <tr key={receptionist.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {receptionist.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {receptionist.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {receptionist.patients_registered}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {receptionist.appointments_scheduled}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        receptionist.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {receptionist.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedReceptionistId(receptionist.id)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => toggleUserStatus(receptionist.id)}
                        className={`${
                          receptionist.is_active
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {receptionist.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No receptionists found in this organization
          </div>
        )}
      </div>
    </div>
  );

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Handle view change
  const handleViewChange = (view: string) => {
    setCurrentView(view as ViewMode);
    setCurrentPage(1);
    setMessage({ type: '', text: '' });
  };

  // Get sidebar items with counts
  const sidebarItems = getAdminSidebarItems({
    users: overview?.total_users,
    doctors: overview?.role_counts?.doctor,
    receptionists: overview?.role_counts?.receptionist,
    labTechs: overview?.role_counts?.lab_technician
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-md p-8 max-w-md">
            <div className="text-red-800 text-center">
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p>Admin privileges required to access this dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        items={sidebarItems}
        onLogout={handleLogout}
        userInfo={{
          name: `${user.first_name} ${user.last_name}`,
          role: user.role
        }}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 overflow-auto">
        <div className="p-6 pt-16 lg:pt-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {currentView === 'overview' && 'Dashboard Overview'}
              {currentView === 'users' && 'All Users'}
              {currentView === 'doctors' && 'Doctors Management'}
              {currentView === 'receptionists' && 'Receptionists Management'}
              {currentView === 'lab_technicians' && 'Lab Technicians Management'}
              {currentView === 'organization' && 'Organization Settings'}
              {currentView === 'doctor_module' && 'Doctor Module'}
              {currentView === 'receptionist_module' && 'Receptionist Module'}
              {currentView === 'lab_tech_module' && 'Lab Technician Module'}
              {currentView === 'pharmacist_module' && 'Pharmacist Module'}
            </h1>
            {currentView === 'overview' && (
              <p className="mt-2 text-gray-600">
                Manage users and view system overview
              </p>
            )}
          </div>

          {/* Error/Success Messages */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'error' 
                ? 'bg-red-50 border border-red-200 text-red-700' 
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Module Access Cards - Show only on overview */}
          {currentView === 'overview' && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Access Full Modules</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setCurrentView('doctor_module')}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105"
                >
                  <div className="flex items-center space-x-4">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-left">
                      <h3 className="text-xl font-bold">Doctor Module</h3>
                      <p className="text-green-100 text-sm">Consultations & Records</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setCurrentView('receptionist_module')}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105"
                >
                <div className="flex items-center space-x-4">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div className="text-left">
                    <h3 className="text-xl font-bold">Receptionist Module</h3>
                    <p className="text-blue-100 text-sm">Registration, Triage, Queue Management</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setCurrentView('lab_tech_module')}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105"
              >
                <div className="flex items-center space-x-4">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <div className="text-left">
                    <h3 className="text-xl font-bold">Lab Tech Module</h3>
                    <p className="text-purple-100 text-sm">Lab Tests, Sample Processing, Results</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setCurrentView('pharmacist_module')}
                className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-6 rounded-lg shadow-lg hover:from-teal-600 hover:to-teal-700 transition-all transform hover:scale-105"
              >
                <div className="flex items-center space-x-4">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="text-left">
                    <h3 className="text-xl font-bold">Pharmacist Module</h3>
                    <p className="text-teal-100 text-sm">Prescriptions, Inventory, Dispensing</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}



          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div>
              {currentView === 'overview' && renderOverview()}
              {currentView === 'users' && renderUserTable()}
              {currentView === 'doctors' && renderDoctorsView()}
              {currentView === 'lab_technicians' && renderLabTechniciansView()}
              {currentView === 'receptionists' && renderReceptionistsView()}
              {currentView === 'organization' && renderOrganization()}
              
              {/* Embedded Module Views */}
              {currentView === 'doctor_module' && (
                <EmbeddedDoctorModule 
                  onBack={() => setCurrentView('overview')} 
                  isEmbedded={true} 
                />
              )}
              {currentView === 'receptionist_module' && (
                <EmbeddedReceptionistModule 
                  onBack={() => setCurrentView('overview')} 
                  isEmbedded={true} 
                />
              )}
              {currentView === 'lab_tech_module' && (
                <EmbeddedLabTechModule 
                  onBack={() => setCurrentView('overview')} 
                  isEmbedded={true} 
                />
              )}
              {currentView === 'pharmacist_module' && (
                <EmbeddedPharmacistModule 
                  onBack={() => setCurrentView('overview')} 
                  isEmbedded={true} 
                />
              )}
            </div>
          )}

          {/* Detail Modals */}
          {selectedDoctorId && (
            <DoctorDetailsModal
              doctorId={selectedDoctorId}
              doctorName={doctorsSummary.find(d => d.id === selectedDoctorId)?.name || ''}
              isOpen={!!selectedDoctorId}
              onClose={() => setSelectedDoctorId(null)}
            />
          )}
          
          {selectedLabTechId && (
            <LabTechDetailsModal
              labTechId={selectedLabTechId}
              labTechName={labTechsSummary.find(l => l.id === selectedLabTechId)?.name || ''}
              isOpen={!!selectedLabTechId}
              onClose={() => setSelectedLabTechId(null)}
            />
          )}
          
          {selectedReceptionistId && (
            <ReceptionistDetailsModal
              receptionistId={selectedReceptionistId}
              receptionistName={receptionistsSummary.find(r => r.id === selectedReceptionistId)?.name || ''}
              isOpen={!!selectedReceptionistId}
              onClose={() => setSelectedReceptionistId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}