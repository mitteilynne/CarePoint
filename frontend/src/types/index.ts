export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'patient' | 'doctor' | 'admin';
  phone?: string;
  address?: string;
  created_at: string;
}

export interface AuthResponse {
  message: string;
  access_token: string;
  user: User;
}

export interface LoginRequest {
  login: string; // email or username
  password: string;
}

export interface RegisterRequest {
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