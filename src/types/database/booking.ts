// ============================================================================
// Booking & Appointment DB-exact Types — verified against public schema
// The real tables use the crm_appointment* prefix (not booking_*)
// ============================================================================

export interface CrmAppointmentFull {
  id: string;
  tenant_id: string;
  source_appointment_id: string | null;
  customer_id: string;
  location_id: string | null;
  assigned_groomer_id: string | null;
  created_by: string | null;
  appointment_number: string | null;
  starts_at: string;
  ends_at: string | null;
  checked_in_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  cancellation_reason: string | null;
  no_show_reason: string | null;
  service_type_confirmed: boolean;
  payment_method_confirmed: boolean;
  deposit_amount: number;
  subtotal: number;
  tax_total: number;
  total: number;
  amount_paid: number;
  outstanding_amount: number;
  currency: string;
  source_channel: string | null;
  booking_outcome: string | null;
  reminder_sent_at: string | null;
  pickup_notification_sent_at: string | null;
  processed_payment_sent_at: string | null;
  thank_you_sent_at: string | null;
  magic_link_sent_at: string | null;
  internal_notes: string | null;
  customer_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer_name?: string | null;
  groomer_name?: string | null;
  location_name?: string | null;
  pet_names?: string | null;
  service_names?: string | null;
}

export interface CrmAppointmentPet {
  id: string;
  tenant_id: string;
  appointment_id: string;
  pet_id: string;
  sequence_no: number;
  check_in_notes: string | null;
  checkout_notes: string | null;
  status: string;
  created_at: string;
  // Joined
  pet_name?: string | null;
  pet_species?: string | null;
  pet_breed?: string | null;
}

export interface CrmAppointmentService {
  id: string;
  tenant_id: string;
  appointment_id: string;
  pet_id: string | null;
  service_id: string;
  groomer_id: string | null;
  quantity: number;
  duration_minutes: number | null;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  status: string;
  created_at: string;
  // Joined
  service_name?: string | null;
  groomer_name?: string | null;
}

export interface CrmAppointmentStatusHistory {
  id: string;
  tenant_id: string;
  appointment_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

export interface CrmOperatingHours {
  id: string;
  tenant_id: string;
  location_id: string | null;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
  accepts_online_booking: boolean;
  last_booking_at: string | null;
}

export interface CrmHolidayBlackout {
  id: string;
  tenant_id: string;
  location_id: string | null;
  name: string;
  blackout_date: string;
  end_date: string | null;
  blackout_type: string;
  is_closed_all_day: boolean;
  opens_at: string | null;
  closes_at: string | null;
  blocks_online_booking: boolean;
  recurs_annually: boolean;
  notes: string | null;
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

export interface CrmStaffShift {
  id: string;
  tenant_id: string;
  staff_id: string;
  location_id: string | null;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  status: string;
  // Joined
  staff_name?: string | null;
  location_name?: string | null;
}
