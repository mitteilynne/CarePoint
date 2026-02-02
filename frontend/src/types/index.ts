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

export interface LabTest {
  id?: number;
  patient_id: number;
  doctor_id: number;
  test_type: 'blood_chemistry' | 'hematology' | 'urinalysis' | 'microbiology' | 'immunology' | 'toxicology' | 'pathology' | 'radiology' | 'other';
  test_name: string;
  test_code?: string;
  clinical_notes?: string;
  urgency: 'routine' | 'urgent' | 'stat';
  sample_type?: string;
  status: 'ordered' | 'sample_collected' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  ordered_at: string;
  scheduled_for?: string;
  sample_collected_at?: string;
  completed_at?: string;
  result_value?: string;
  reference_range?: string;
  units?: string;
  abnormal_flag?: 'normal' | 'high' | 'low' | 'critical';
  result_notes?: string;
  lab_location?: string;
  patient_name?: string;
  doctor_name?: string;
}

export interface LabTestRequest {
  patient_id: number;
  test_type: LabTest['test_type'];
  test_name: string;
  test_code?: string;
  clinical_notes?: string;
  urgency?: LabTest['urgency'];
  sample_type?: string;
  scheduled_for?: string;
  lab_location?: string;
}

export interface MedicalRecord {
  id?: number;
  patient_id: number;
  doctor_id: number;
  appointment_id?: number;
  visit_date: string;
  chief_complaint?: string;
  diagnosis?: string;
  treatment_plan?: string;
  medications_prescribed?: string;
  lab_tests_ordered?: string;
  follow_up_instructions?: string;
  blood_pressure?: string;
  heart_rate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  doctor_name?: string;
  patient_name?: string;
  lab_test_id?: number;
  referral_type?: 'none' | 'internal' | 'external';
  referral_doctor_id?: number;
  referral_department_id?: number;
  referral_facility?: string;
  referral_reason?: string;
  referral_urgency?: 'routine' | 'urgent' | 'emergency';
}

export interface Referral {
  id?: number;
  medical_record_id: number;
  patient_id: number;
  referring_doctor_id: number;
  referral_type: 'internal' | 'external';
  // Internal referral fields
  referred_doctor_id?: number;
  department_id?: number;
  // External referral fields
  facility_name?: string;
  facility_type?: string;
  facility_contact?: string;
  facility_address?: string;
  // Common fields
  reason: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  notes?: string;
  created_at?: string;
  scheduled_date?: string;
}

export interface ApiError {
  error: string;
}