export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'patient' | 'doctor' | 'admin';
  phone?: string;
  address?: string;
  organization_id: number;
  organization_code: string;
  organization_name: string;
  created_at: string;
}

export interface AuthResponse {
  message: string;
  access_token: string;
  user: User;
}

export interface LoginRequest {
  organization_code: string;
  login: string; // email or username
  password: string;
}

export interface RegisterRequest {
  organization_code: string;
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: 'patient' | 'doctor' | 'admin';
  phone?: string;
  address?: string;
}

export interface ApiError {
  error: string;
}