export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'patient' | 'doctor' | 'admin' | 'receptionist' | 'nurse';
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
  username: string;
  password: string;
}

export interface RegisterRequest {
  organization_code: string;
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: 'patient' | 'doctor' | 'admin' | 'receptionist' | 'nurse';
  phone?: string;
  address?: string;
}

export interface Patient {
  id: number;
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender: 'male' | 'female' | 'other';
  blood_type?: string;
  email?: string;
  phone?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  allergies?: string;
  chronic_conditions?: string;
  current_medications?: string;
  insurance_info?: string;
  registration_status: 'registered' | 'triaged' | 'waiting' | 'in_consultation' | 'completed' | 'discharged';
  visit_type: 'walk_in' | 'appointment' | 'emergency' | 'follow_up';
  current_queue_number?: number;
  registration_date?: string;
  is_active: boolean;
  created_at: string;
}

export interface TriageAssessment {
  id?: number;
  patient_id: number;
  chief_complaint: string;
  pain_scale?: number;
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  symptoms?: string;
  allergies_noted?: string;
  current_medications_noted?: string;
  mobility_status?: 'ambulatory' | 'wheelchair' | 'stretcher' | 'assisted';
  triage_level: 'emergency' | 'urgent' | 'less_urgent' | 'non_urgent';
  receptionist_notes?: string;
  special_requirements?: string;
  estimated_wait_time?: number;
  queue_number?: number;
  queue_status?: 'waiting' | 'called' | 'in_progress' | 'completed' | 'left';
  arrival_time?: string;
  priority_score?: number;
}

export interface QueueStatus {
  queue_management: {
    current_number: number;
    total_today: number;
    average_wait_time: number;
    emergency_count: number;
    urgent_count: number;
    routine_count: number;
  };
  queue_counts: {
    waiting: number;
    in_progress: number;
    completed: number;
  };
  waiting_patients: Array<{
    id: number;
    patient_name: string;
    queue_number: number;
    triage_level: string;
    chief_complaint: string;
    arrival_time: string;
    wait_time_minutes: number;
  }>;
}

export interface ApiError {
  error: string;
}