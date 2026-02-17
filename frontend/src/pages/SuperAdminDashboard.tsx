import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminSidebar, { getSuperAdminSidebarItems } from '@/components/AdminSidebar';
import api from '@/services/api';

type ViewMode = 'overview' | 'organizations' | 'organization_details' | 'create_organization' | 'facility_requests';

interface OrganizationFormData {
  name: string;
  code: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  description: string;
}

interface OrganizationData {
  id: number;
  code: string;
  name: string;
  organization_type: string;
  is_active: boolean;
  created_at: string;
  user_count?: number;
  patient_count?: number;
  active_user_count?: number;
  subscription_plan?: string;
  max_users?: number;
}

interface OverviewData {
  organizations: {
    total: number;
    active: number;
    inactive: number;
    new_last_30_days: number;
  };
  users: {
    total: number;
    active: number;
    new_last_30_days: number;
    by_role: Record<string, number>;
  };
  healthcare: {
    total_patients: number;
    total_lab_tests: number;
    total_medical_records: number;
  };
  organization_types: Record<string, number>;
  subscription_plans: Record<string, number>;
}

interface UserData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Overview data
  const [overview, setOverview] = useState<OverviewData | null>(null);

  // Organizations list
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [recentOrganizations, setRecentOrganizations] = useState<OrganizationData[]>([]);
  const [orgSearchTerm, setOrgSearchTerm] = useState('');
  const [orgFilter, setOrgFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Selected organization details
  const [selectedOrg, setSelectedOrg] = useState<OrganizationData | null>(null);
  const [orgUsers, setOrgUsers] = useState<UserData[]>([]);
  const [loadingOrgUsers, setLoadingOrgUsers] = useState(false);

  // New organization form
  const [orgFormData, setOrgFormData] = useState<OrganizationFormData>({
    name: '',
    code: '',
    type: 'hospital',
    address: '',
    phone: '',
    email: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Facility registration requests
  const [facilityRequests, setFacilityRequests] = useState<any[]>([]);
  const [requestsFilter, setRequestsFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [requestsCounts, setRequestsCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [processingRequest, setProcessingRequest] = useState(false);

  // Fetch platform overview
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/dashboard/overview');
      setOverview(response.data.overview);
      
      // Also fetch recent organizations for the overview
      const orgsResponse = await api.get('/super-admin/organizations', { params: { per_page: 5 } });
      setRecentOrganizations(orgsResponse.data.organizations || []);
      
      // Fetch facility requests counts
      const requestsResponse = await api.get('/super-admin/facility-requests', { params: { per_page: 1 } });
      setRequestsCounts(requestsResponse.data.counts);
      
      setError('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load overview';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all organizations
  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (orgSearchTerm) params.search = orgSearchTerm;
      if (orgFilter !== 'all') params.status = orgFilter;

      const response = await api.get('/super-admin/organizations', { params });
      setOrganizations(response.data.organizations || []);
      setError('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load organizations';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [orgSearchTerm, orgFilter]);

  // Fetch organization users
  const fetchOrgUsers = useCallback(async (orgId: number) => {
    try {
      setLoadingOrgUsers(true);
      const response = await api.get(`/super-admin/organizations/${orgId}/users`);
      setOrgUsers(response.data.users || []);
    } catch (err: unknown) {
      console.error('Failed to fetch organization users:', err);
    } finally {
      setLoadingOrgUsers(false);
    }
  }, []);

  // Toggle organization status
  const toggleOrgStatus = async (orgId: number, currentStatus: boolean) => {
    try {
      await api.post(`/super-admin/organizations/${orgId}/toggle-status`);
      setSuccessMessage(`Organization ${currentStatus ? 'disabled' : 'enabled'} successfully`);
      
      // Refresh data
      if (viewMode === 'overview') {
        fetchOverview();
      } else {
        fetchOrganizations();
      }
      
      if (selectedOrg && selectedOrg.id === orgId) {
        setSelectedOrg({ ...selectedOrg, is_active: !currentStatus });
      }
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update organization status';
      setError(errorMessage);
    }
  };

  // Toggle user status
  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await api.post(`/super-admin/users/${userId}/toggle-status`);
      setSuccessMessage(`User ${currentStatus ? 'disabled' : 'enabled'} successfully`);
      
      // Refresh org users
      if (selectedOrg) {
        fetchOrgUsers(selectedOrg.id);
      }
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user status';
      setError(errorMessage);
    }
  };

  // Create new organization
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/super-admin/organizations', {
        code: orgFormData.code,
        name: orgFormData.name,
        organization_type: orgFormData.type,
        address: orgFormData.address,
        phone: orgFormData.phone,
        email: orgFormData.email,
        description: orgFormData.description
      });
      setSuccessMessage('Organization created successfully');
      setOrgFormData({
        name: '',
        code: '',
        type: 'hospital',
        address: '',
        phone: '',
        email: '',
        description: ''
      });
      setViewMode('organizations');
      fetchOrganizations();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create organization';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // View organization details
  const viewOrgDetails = (org: OrganizationData) => {
    setSelectedOrg(org);
    fetchOrgUsers(org.id);
    setViewMode('organization_details');
  };

  // Fetch facility registration requests
  const fetchFacilityRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (requestsFilter !== 'all') params.status = requestsFilter;

      const response = await api.get('/super-admin/facility-requests', { params });
      setFacilityRequests(response.data.requests || []);
      setRequestsCounts(response.data.counts);
      setError('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load facility requests';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [requestsFilter]);

  // Approve facility request
  const approveFacilityRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      setProcessingRequest(true);
      await api.post(`/super-admin/facility-requests/${selectedRequest.id}/approve`, {
        admin_notes: adminNotes,
        organization_code: orgCode || undefined
      });
      setSuccessMessage('Facility request approved successfully');
      setApprovalModalOpen(false);
      setAdminNotes('');
      setOrgCode('');
      setSelectedRequest(null);
      fetchFacilityRequests();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve request';
      setError(errorMessage);
    } finally {
      setProcessingRequest(false);
    }
  };

  // Reject facility request
  const rejectFacilityRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      setProcessingRequest(true);
      await api.post(`/super-admin/facility-requests/${selectedRequest.id}/reject`, {
        admin_notes: adminNotes
      });
      setSuccessMessage('Facility request rejected');
      setRejectionModalOpen(false);
      setAdminNotes('');
      setSelectedRequest(null);
      fetchFacilityRequests();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject request';
      setError(errorMessage);
    } finally {
      setProcessingRequest(false);
    }
  };

  // Effects
  useEffect(() => {
    if (viewMode === 'overview') {
      fetchOverview();
    } else if (viewMode === 'organizations') {
      fetchOrganizations();
    } else if (viewMode === 'facility_requests') {
      fetchFacilityRequests();
    }
  }, [viewMode, fetchOverview, fetchOrganizations, fetchFacilityRequests]);

  useEffect(() => {
    if (viewMode === 'facility_requests') {
      fetchFacilityRequests();
    }
  }, [requestsFilter, fetchFacilityRequests, viewMode]);

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Handle view change
  const handleViewChange = (view: string) => {
    setViewMode(view as ViewMode);
    setError('');
    setSuccessMessage('');
  };

  // Get sidebar items with counts
  const sidebarItems = getSuperAdminSidebarItems({
    organizations: overview?.organizations.total,
    totalUsers: overview?.users.total,
    pendingRequests: requestsCounts.pending
  });

  // Render loading state
  if (loading && viewMode === 'overview' && !overview) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar
        currentView={viewMode}
        onViewChange={handleViewChange}
        items={sidebarItems}
        onLogout={handleLogout}
        userInfo={{
          name: `${user?.first_name} ${user?.last_name}`,
          role: 'Super Admin'
        }}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 overflow-auto">
        <div className="p-6 pt-16 lg:pt-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {viewMode === 'overview' && 'Platform Overview'}
              {viewMode === 'organizations' && 'Organizations Management'}
              {viewMode === 'organization_details' && 'Organization Details'}
              {viewMode === 'create_organization' && 'Create Organization'}
              {viewMode === 'facility_requests' && 'Facility Registration Requests'}
            </h1>
            <p className="mt-2 text-gray-600">
              {viewMode === 'overview' && 'Monitor and manage the entire healthcare platform'}
              {viewMode === 'organizations' && 'View and manage all organizations on the platform'}
              {viewMode === 'organization_details' && 'Detailed view of selected organization'}
              {viewMode === 'create_organization' && 'Add a new organization to the platform'}
              {viewMode === 'facility_requests' && 'Review and approve facility registration requests'}
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
              <button onClick={() => setError('')} className="float-right font-bold">&times;</button>
            </div>
          )}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          )}

        {/* Overview View */}
        {viewMode === 'overview' && overview && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Organizations</p>
                    <p className="text-2xl font-bold text-gray-900">{overview.organizations.total}</p>
                    <p className="text-xs text-gray-400">
                      {overview.organizations.active} active, {overview.organizations.inactive} inactive
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100 text-green-600">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{overview.users.total}</p>
                    <p className="text-xs text-gray-400">{overview.users.active} active users</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Patients</p>
                    <p className="text-2xl font-bold text-gray-900">{overview.healthcare.total_patients}</p>
                    <p className="text-xs text-gray-400">Registered patients</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Healthcare Staff</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(overview.users.by_role['doctor'] || 0) + (overview.users.by_role['lab_technician'] || 0) + (overview.users.by_role['receptionist'] || 0)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {overview.users.by_role['doctor'] || 0} doctors, {overview.users.by_role['lab_technician'] || 0} lab techs
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Organizations */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Organizations</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentOrganizations.map((org) => (
                      <tr key={org.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{org.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 font-mono">{org.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 capitalize">
                            {org.organization_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {org.user_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            org.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {org.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => viewOrgDetails(org)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() => toggleOrgStatus(org.id, org.is_active)}
                            className={`${
                              org.is_active
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {org.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Organizations List View */}
        {viewMode === 'organizations' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search organizations by name or code..."
                    value={orgSearchTerm}
                    onChange={(e) => setOrgSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={orgFilter}
                    onChange={(e) => setOrgFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                  <button
                    onClick={fetchOrganizations}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Organizations Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  All Organizations ({organizations.length})
                </h2>
              </div>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </div>
              ) : organizations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No organizations found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patients</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctors</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {organizations.map((org) => (
                        <tr key={org.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{org.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 font-mono">{org.code}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 capitalize">
                              {org.organization_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {org.user_count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {org.patient_count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            -
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              org.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {org.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(org.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => viewOrgDetails(org)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View
                            </button>
                            <button
                              onClick={() => toggleOrgStatus(org.id, org.is_active)}
                              className={`${
                                org.is_active
                                  ? 'text-red-600 hover:text-red-900'
                                  : 'text-green-600 hover:text-green-900'
                              }`}
                            >
                              {org.is_active ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Organization Details View */}
        {viewMode === 'organization_details' && selectedOrg && (
          <div className="space-y-6">
            {/* Back Button */}
            <button
              onClick={() => {
                setSelectedOrg(null);
                setViewMode('organizations');
              }}
              className="flex items-center text-indigo-600 hover:text-indigo-800"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Organizations
            </button>

            {/* Organization Header */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedOrg.name}</h2>
                  <p className="text-gray-500 font-mono">{selectedOrg.code}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    selectedOrg.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedOrg.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => toggleOrgStatus(selectedOrg.id, selectedOrg.is_active)}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      selectedOrg.is_active
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {selectedOrg.is_active ? 'Disable Organization' : 'Enable Organization'}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedOrg.user_count || 0}</p>
                  <p className="text-sm text-gray-500">Total Users</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedOrg.patient_count || 0}</p>
                  <p className="text-sm text-gray-500">Patients</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedOrg.active_user_count || 0}</p>
                  <p className="text-sm text-gray-500">Active Users</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 capitalize">{selectedOrg.organization_type}</p>
                  <p className="text-sm text-gray-500">Type</p>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Organization Users</h3>
              </div>
              {loadingOrgUsers ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </div>
              ) : orgUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No users found in this organization
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orgUsers.map((usr) => (
                        <tr key={usr.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {usr.first_name} {usr.last_name}
                            </div>
                            <div className="text-sm text-gray-500">@{usr.username}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {usr.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                              usr.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                              usr.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
                              usr.role === 'receptionist' ? 'bg-green-100 text-green-800' :
                              usr.role === 'lab_technician' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {usr.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              usr.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {usr.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(usr.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => toggleUserStatus(usr.id, usr.is_active)}
                              className={`${
                                usr.is_active
                                  ? 'text-red-600 hover:text-red-900'
                                  : 'text-green-600 hover:text-green-900'
                              }`}
                            >
                              {usr.is_active ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Organization Form */}
        {viewMode === 'create_organization' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Organization</h2>
              
              <form onSubmit={handleCreateOrg} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={orgFormData.name}
                      onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., City General Hospital"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={orgFormData.code}
                      onChange={(e) => setOrgFormData({ ...orgFormData, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                      placeholder="e.g., CGH001"
                      maxLength={20}
                    />
                    <p className="text-xs text-gray-500 mt-1">Unique code for login purposes</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Type *
                  </label>
                  <select
                    required
                    value={orgFormData.type}
                    onChange={(e) => setOrgFormData({ ...orgFormData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="hospital">Hospital</option>
                    <option value="clinic">Clinic</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="laboratory">Laboratory</option>
                    <option value="nursing_home">Nursing Home</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={orgFormData.address}
                    onChange={(e) => setOrgFormData({ ...orgFormData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Full address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={orgFormData.phone}
                      onChange={(e) => setOrgFormData({ ...orgFormData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Contact phone number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={orgFormData.email}
                      onChange={(e) => setOrgFormData({ ...orgFormData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Contact email address"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={orgFormData.description}
                    onChange={(e) => setOrgFormData({ ...orgFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Brief description of the organization"
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setViewMode('organizations')}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating...' : 'Create Organization'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Facility Requests View */}
        {viewMode === 'facility_requests' && (
          <div className="space-y-6">
            {/* Filter Tabs */}
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setRequestsFilter('pending')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    requestsFilter === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Pending ({requestsCounts.pending})
                </button>
                <button
                onClick={() => setRequestsFilter('approved')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    requestsFilter === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Approved ({requestsCounts.approved})
                </button>
                <button
                  onClick={() => setRequestsFilter('rejected')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    requestsFilter === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Rejected ({requestsCounts.rejected})
                </button>
                <button
                  onClick={() => setRequestsFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    requestsFilter === 'all'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All ({requestsCounts.total})
                </button>
              </div>
            </div>

            {/* Requests List */}
            <div className="grid grid-cols-1 gap-6">
              {facilityRequests.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <p className="text-gray-500">No facility registration requests found</p>
                </div>
              ) : (
                facilityRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-gray-900">{request.facility_name}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.status.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600"><strong>Type:</strong> {request.facility_type}</p>
                            <p className="text-gray-600"><strong>Email:</strong> {request.email}</p>
                            <p className="text-gray-600"><strong>Phone:</strong> {request.phone}</p>
                            <p className="text-gray-600"><strong>Address:</strong> {request.address}</p>
                          </div>
                          <div>
                            <p className="text-gray-600"><strong>Contact Person:</strong> {request.contact_person_name}</p>
                            <p className="text-gray-600"><strong>Contact Email:</strong> {request.contact_person_email}</p>
                            <p className="text-gray-600"><strong>Contact Phone:</strong> {request.contact_person_phone}</p>
                            {request.contact_person_position && (
                              <p className="text-gray-600"><strong>Position:</strong> {request.contact_person_position}</p>
                            )}
                          </div>
                        </div>

                        {request.description && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-600"><strong>Description:</strong></p>
                            <p className="text-sm text-gray-700 mt-1">{request.description}</p>
                          </div>
                        )}

                        {request.admin_notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600"><strong>Admin Notes:</strong></p>
                            <p className="text-sm text-gray-700 mt-1">{request.admin_notes}</p>
                          </div>
                        )}

                        <div className="mt-3 text-xs text-gray-500">
                          <p>Submitted: {new Date(request.created_at).toLocaleString()}</p>
                          {request.reviewed_at && (
                            <p>Reviewed: {new Date(request.reviewed_at).toLocaleString()}</p>
                          )}
                        </div>
                      </div>

                      {request.status === 'pending' && (
                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setApprovalModalOpen(true);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setRejectionModalOpen(true);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Approval Modal */}
        {approvalModalOpen && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Approve Facility Request</h3>
              <p className="text-gray-700 mb-4">
                Approve <strong>{selectedRequest.facility_name}</strong>?
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Code (Optional - will be auto-generated if empty)
                  </label>
                  <input
                    type="text"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Leave empty for auto-generation"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Any notes for the facility..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setApprovalModalOpen(false);
                    setSelectedRequest(null);
                    setAdminNotes('');
                    setOrgCode('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={processingRequest}
                >
                  Cancel
                </button>
                <button
                  onClick={approveFacilityRequest}
                  disabled={processingRequest}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingRequest ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {rejectionModalOpen && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Facility Request</h3>
              <p className="text-gray-700 mb-4">
                Reject <strong>{selectedRequest.facility_name}</strong>?
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Rejection (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Provide feedback to the facility..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setRejectionModalOpen(false);
                    setSelectedRequest(null);
                    setAdminNotes('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={processingRequest}
                >
                  Cancel
                </button>
                <button
                  onClick={rejectFacilityRequest}
                  disabled={processingRequest}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingRequest ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
