import axios from 'axios';
import { AuthResponse, LoginRequest, RegisterRequest } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  forgotPassword: async (organizationCode: string, email: string) => {
    const response = await api.post('/auth/forgot-password', { organization_code: organizationCode, email });
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },
};

// General API
export const generalAPI = {
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

// Lab Technician API
export const labTechnicianAPI = {
  getLabTests: async (status?: string) => {
    const params = status ? { status } : {};
    const response = await api.get('/lab_technician/lab_tests', { params });
    return response.data;
  },

  getLabTestDetails: async (testId: number) => {
    const response = await api.get(`/lab_technician/lab_tests/${testId}`);
    return response.data;
  },

  updateTestStatus: async (testId: number, status: string) => {
    const response = await api.put(`/lab_technician/lab_tests/${testId}/status`, { status });
    return response.data;
  },

  submitTestResults: async (testId: number, results: string) => {
    const response = await api.put(`/lab_technician/lab_tests/${testId}/results`, { results });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/lab_technician/stats');
    return response.data;
  },
};

// Notifications API
export const notificationsAPI = {
  getNotifications: async (filters?: { is_read?: boolean; type?: string; limit?: number }) => {
    const response = await api.get('/notifications', { params: filters });
    return response.data;
  },

  markAsRead: async (notificationId: number) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  getLabResults: async () => {
    const response = await api.get('/notifications/lab-results');
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  getDashboardOverview: async () => {
    const response = await api.get('/admin/dashboard/overview');
    return response.data;
  },

  getUsers: async (params?: {
    page?: number;
    per_page?: number;
    role?: string;
    search?: string;
    status?: string;
  }) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  getUserDetail: async (userId: number) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  toggleUserStatus: async (userId: number) => {
    const response = await api.post(`/admin/users/${userId}/toggle-status`);
    return response.data;
  },

  updateUserRole: async (userId: number, role: string) => {
    const response = await api.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  getOrganizationInfo: async () => {
    const response = await api.get('/admin/organization/info');
    return response.data;
  },

  getDoctorStatistics: async (doctorId: number, days?: number) => {
    const params = days ? { days } : {};
    const response = await api.get(`/admin/doctors/${doctorId}/statistics`, { params });
    return response.data;
  },

  getDoctorsSummary: async (days?: number) => {
    const params = days ? { days } : {};
    const response = await api.get('/admin/doctors/summary', { params });
    return response.data;
  },
};

export default api;
