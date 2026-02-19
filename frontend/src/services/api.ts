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

// Doctor API (Healthcare API)
export const doctorAPI = {
  createPrescription: async (data: {
    patient_id: number;
    medication_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instructions?: string;
    medical_record_id?: number;
  }) => {
    const response = await api.post('/healthcare/prescriptions', data);
    return response.data;
  },

  getPatientPrescriptions: async (patientId: number) => {
    const response = await api.get(`/healthcare/patients/${patientId}/prescriptions`);
    return response.data;
  },

  updatePrescription: async (prescriptionId: number, data: any) => {
    const response = await api.put(`/healthcare/prescriptions/${prescriptionId}`, data);
    return response.data;
  },

  cancelPrescription: async (prescriptionId: number) => {
    const response = await api.delete(`/healthcare/prescriptions/${prescriptionId}`);
    return response.data;
  },
};

// Pharmacist API
export const pharmacistAPI = {
  getPrescriptions: async (status?: string, search?: string) => {
    const params: any = {};
    if (status) params.status = status;
    if (search) params.search = search;
    const response = await api.get('/pharmacist/prescriptions', { params });
    return response.data;
  },

  getPrescriptionDetails: async (prescriptionId: number) => {
    const response = await api.get(`/pharmacist/prescriptions/${prescriptionId}`);
    return response.data;
  },

  dispensePrescription: async (prescriptionId: number, data: { quantity_dispensed: number; notes?: string }) => {
    const response = await api.post(`/pharmacist/prescriptions/${prescriptionId}/dispense`, data);
    return response.data;
  },

  markPickedUp: async (prescriptionId: number) => {
    const response = await api.post(`/pharmacist/prescriptions/${prescriptionId}/pickup`, {});
    return response.data;
  },

  referPrescription: async (prescriptionId: number, data: { referral_notes: string }) => {
    const response = await api.post(`/pharmacist/prescriptions/${prescriptionId}/refer`, data);
    return response.data;
  },

  getInventory: async (search?: string, lowStockOnly?: boolean) => {
    const params: any = {};
    if (search) params.search = search;
    if (lowStockOnly) params.low_stock_only = 'true';
    const response = await api.get('/pharmacist/inventory', { params });
    return response.data;
  },

  addInventoryItem: async (data: any) => {
    const response = await api.post('/pharmacist/inventory', data);
    return response.data;
  },

  updateInventoryItem: async (itemId: number, data: any) => {
    const response = await api.put(`/pharmacist/inventory/${itemId}`, data);
    return response.data;
  },

  deleteInventoryItem: async (itemId: number) => {
    const response = await api.delete(`/pharmacist/inventory/${itemId}`);
    return response.data;
  },

  getPatientPrescriptions: async (patientId: number) => {
    const response = await api.get(`/pharmacist/patients/${patientId}/prescriptions`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/pharmacist/stats');
    return response.data;
  },
};

// Billing API
export const billingAPI = {
  getBills: async (params?: { status?: string; search?: string; date?: string }) => {
    const response = await api.get('/billing/bills', { params });
    return response.data;
  },

  getBillDetails: async (billId: number) => {
    const response = await api.get(`/billing/bills/${billId}`);
    return response.data;
  },

  getPatientBills: async (patientId: number) => {
    const response = await api.get(`/billing/bills/patient/${patientId}`);
    return response.data;
  },

  processPayment: async (billId: number, data: {
    amount_paid: number;
    payment_method: string;
    payment_reference?: string;
    payment_notes?: string;
    discount_amount?: number;
  }) => {
    const response = await api.post(`/billing/bills/${billId}/pay`, data);
    return response.data;
  },

  applyDiscount: async (billId: number, data: { discount_amount: number }) => {
    const response = await api.post(`/billing/bills/${billId}/discount`, data);
    return response.data;
  },

  cancelBill: async (billId: number) => {
    const response = await api.post(`/billing/bills/${billId}/cancel`);
    return response.data;
  },

  getPendingBills: async () => {
    const response = await api.get('/billing/pending');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/billing/stats');
    return response.data;
  },
};

export default api;