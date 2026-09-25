// ============================================================================
// Staff & Resource HR DB-exact Types — verified against public schema
// ============================================================================

export interface CrmStaffFull {
  id: string;
  tenant_id: string;
  user_id: string | null;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  is_groomer: boolean;
  is_active: boolean;
  default_location_id: string | null;
  color_label: string | null;
  hire_date: string | null;
  termination_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  image_url: string | null;
  bio: string | null;
  service_specialties: string[];
  certifications: string[];
  show_on_website: boolean;
  max_daily_appointments: number | null;
  // Joined
  location_name?: string | null;
  appointment_count_today?: number;
}

export interface CrmStaffShift {
  id: string;
  tenant_id: string;
  staff_id: string;
  location_id: string | null;
  shift_template_id: string | null;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  role: string | null;
  status: string;
  published_at: string | null;
  confirmed_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  is_overtime: boolean;
  notes: string | null;
  // Joined
  staff_name?: string | null;
  location_name?: string | null;
}

export interface CrmShiftTemplate {
  id: string;
  tenant_id: string;
  name: string;
  location_id: string | null;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  role: string | null;
  required_headcount: number;
  color_label: string | null;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
}

export interface CrmStaffTimeClockEntry {
  id: string;
  tenant_id: string;
  staff_id: string;
  clock_in: string;
  clock_out: string | null;
  source: string;
  notes: string | null;
  created_at: string;
  // Joined
  staff_name?: string | null;
}

export interface CrmStaffAvailability {
  id: string;
  tenant_id: string;
  staff_id: string;
  location_id: string | null;
  day_of_week: number;
  available_from: string;
  available_to: string;
  availability_type: string;
  effective_from: string;
  effective_to: string | null;
}

export interface CrmStaffTrainingRecord {
  id: string;
  tenant_id: string;
  staff_id: string;
  training_name: string;
  completed_at: string | null;
  expires_at: string | null;
  certificate_uri: string | null;
  status: string;
  created_at: string;
}

export interface CrmStaffCommissionAssignment {
  id: string;
  tenant_id: string;
  staff_id: string;
  plan_id: string;
  override_rate_percent: number | null;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
}
