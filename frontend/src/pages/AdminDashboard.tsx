import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

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

interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_prev: boolean;
  has_next: boolean;
}

type ViewMode = 'overview' | 'users' | 'doctors' | 'receptionists' | 'lab_technicians' | 'organization';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('overview');
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [organizationInfo, setOrganizationInfo] = useState<OrganizationInfo | null>(null);
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

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">
              Access denied. Admin privileges required.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Manage users and view system overview
          </p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'error' 
              ? 'bg-red-50 border border-red-200 text-red-700' 
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Navigation */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'users', label: 'All Users' },
                { key: 'doctors', label: 'Doctors' },
                { key: 'receptionists', label: 'Receptionists' },
                { key: 'lab_technicians', label: 'Lab Technicians' },
                { key: 'organization', label: 'Organization' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setCurrentView(tab.key as ViewMode);
                    setCurrentPage(1);
                    setMessage({ type: '', text: '' });
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    currentView === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div>
            {currentView === 'overview' && renderOverview()}
            {(currentView === 'users' || currentView === 'doctors' || 
              currentView === 'receptionists' || currentView === 'lab_technicians') && 
              renderUserTable()}
            {currentView === 'organization' && renderOrganization()}
          </div>
        )}
      </div>
    </div>
  );
}