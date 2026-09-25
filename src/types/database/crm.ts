// ============================================================================
// DB-EXACT CRM Types — verified against the live Supabase schema.
// Every column name, type, and nullability matches information_schema.
// ============================================================================

export type CustomerType =
  | 'individual'
  | 'business'
  | 'breeder'
  | 'rescue'
  | 'referral_partner'
  | 'staff'
  | 'other';

export type LifecycleStage =
  | 'new_lead'
  | 'new_customer'
  | 'active'
  | 'vip'
  | 'returning'
  | 'lapsed'
  | 'at_risk'
  | 'lost';

export type LifecycleStatus = 'healthy' | 'needs_attention' | 'at_risk';

export type PreferredContactMethod = 'email' | 'sms' | 'phone' | 'none';

export type PetSex = 'male' | 'female' | 'unknown';

export type AlteredStatus = 'intact' | 'spayed' | 'neutered' | 'unknown';

export type PetStatus = 'active' | 'inactive' | 'deceased' | 'archived';

export type AppointmentStatus =
  | 'precheck'
  | 'deposit_paid'
  | 'scheduled'
  | 'assigned'
  | 'waiting_checkin'
  | 'confirmed'
  | 'checked_in'
  | 'in_service'
  | 'hold'
  | 'completed'
  | 'no_show'
  | 'cancelled'
  | 'rescheduled';

export type BookingOutcome = 'booked' | 'pending' | 'cancelled' | 'lost' | 'no_response';

export type HouseholdStatus = 'active' | 'inactive' | 'merged' | 'archived';

export interface CrmSettings {
  tenant_id: string;
  default_timezone: string;
  default_currency: string;
  default_appointment_duration_minutes: number;
  default_rebooking_days: number;
  inactive_after_days: number;
  at_risk_after_days: number;
  birthday_campaign_enabled: boolean;
  vaccine_reminder_enabled: boolean;
  rebooking_automation_enabled: boolean;
  require_upfront_deposit: boolean;
  deposit_percent: number | null;
  deposit_flat_amount: number | null;
  cancellation_cutoff_minutes: number;
  no_show_penalty_amount: number;
  max_booking_horizon_days: number;
  station_turnaround_buffer_minutes: number;
  updated_at: string;
}

export interface CrmLocation {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmStaff {
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
}

export interface CrmHousehold {
  id: string;
  tenant_id: string;
  name: string;
  status: HouseholdStatus;
  primary_customer_id: string | null;
  source_household_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmCustomer {
  id: string;
  tenant_id: string;
  household_id: string | null;
  source_customer_id: string | null;
  external_customer_number: string | null;
  customer_type: CustomerType;
  lifecycle_stage: LifecycleStage;
  lifecycle_status: LifecycleStatus;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  date_of_birth: string | null;
  pronouns: string | null;
  preferred_contact_method: PreferredContactMethod | null;
  preferred_language: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  lead_source_id: string | null;
  lead_owner_id: string | null;
  assigned_staff_id: string | null;
  preferred_location_id: string | null;
  preferred_groomer_id: string | null;
  customer_since: string | null;
  first_contact_at: string | null;
  last_activity_at: string | null;
  next_follow_up_at: string | null;
  last_visit_at: string | null;
  next_appointment_at: string | null;
  total_visits: number;
  lifetime_value: number;
  average_ticket: number;
  average_visit_frequency_days: number | null;
  no_show_rate: number;
  cancellation_rate: number;
  rebook_rate: number;
  outstanding_balance: number;
  total_spend_30d: number;
  total_spend_365d: number;
  marketing_email_opt_in: boolean;
  marketing_sms_opt_in: boolean;
  transactional_email_opt_in: boolean;
  transactional_sms_opt_in: boolean;
  do_not_call: boolean;
  do_not_contact: boolean;
  is_active: boolean;
  archived_at: string | null;
  merged_into_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmPet {
  id: string;
  tenant_id: string;
  household_id: string | null;
  primary_customer_id: string | null;
  source_pet_id: string | null;
  name: string;
  species: string;
  breed: string | null;
  mixed_breed: boolean;
  sex: PetSex | null;
  altered_status: AlteredStatus | null;
  color: string | null;
  coat_type: string | null;
  date_of_birth: string | null;
  approximate_age_years: number | null;
  weight: number | null;
  weight_unit: string;
  microchip_number: string | null;
  veterinarian_name: string | null;
  veterinarian_phone: string | null;
  medical_alert: boolean;
  special_handling: boolean;
  nervous: boolean;
  aggressive: boolean;
  first_visit: boolean;
  senior: boolean;
  puppy: boolean;
  permanent_alert: string | null;
  handling_notes: string | null;
  behavioral_notes: string | null;
  medical_notes: string | null;
  service_notes: string | null;
  preferred_groomer_id: string | null;
  status: PetStatus;
  deceased_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmService {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  description: string | null;
  category: string | null;
  default_duration_minutes: number;
  default_price: number;
  deposit_required: boolean;
  default_deposit_amount: number;
  rebooking_interval_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmAppointment {
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
  status: AppointmentStatus;
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
  booking_outcome: BookingOutcome | null;
  reminder_sent_at: string | null;
  pickup_notification_sent_at: string | null;
  processed_payment_sent_at: string | null;
  thank_you_sent_at: string | null;
  magic_link_sent_at: string | null;
  internal_notes: string | null;
  customer_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmNote {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  pet_id: string | null;
  appointment_id: string | null;
  grooming_record_id: string | null;
  created_by: string | null;
  note_type: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmMessage {
  id: string;
  tenant_id: string;
  conversation_id: string | null;
  customer_id: string | null;
  channel: string;
  direction: string;
  status: string;
  from_address: string | null;
  to_address: string | null;
  subject: string | null;
  body: string | null;
  template_id: string | null;
  provider: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
}

export interface CrmDocument {
  id: string;
  tenant_id: string;
  customer_id: string;
  pet_id: string | null;
  document_type_id: string | null;
  name: string;
  status: string;
  storage_path: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  issued_at: string | null;
  expires_at: string | null;
  signed_at: string | null;
  signed_by_name: string | null;
  signature_provider: string | null;
  external_signature_id: string | null;
  rejection_reason: string | null;
}

export interface CommercePayment {
  id: string;
  tenant_id: string;
  payment_number: string;
  sale_id: string | null;
  customer_id: string | null;
  payment_method_id: string;
  amount: number;
  tip_amount: number;
  currency: string;
  status: string;
  processor_transaction_id: string | null;
  authorization_code: string | null;
  external_reference: string | null;
  acct_receipt_id: string | null;
  created_at: string;
  staff_id: string | null;
  branch_id: string | null;
  location_id: string | null;
  // Joined fields
  customer_name?: string | null;
}
