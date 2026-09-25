// ============================================================================
// crm-enums.ts — DB-exact interfaces for the CRM vertical slice.
//
// Every field name below is the REAL snake_case column from the live
// Supabase schema (verified against public.crm_*, public.commerce_payments).
// The TanStack Query hooks in src/lib/hooks/crm.ts consume these types so
// the page components can stay 100% aligned to the underlying table shape.
//
// Casting rules (match the existing pattern in src/hooks/useEnrollments.ts):
//   - text                → string (NOT NULL) | string | null (nullable)
//   - boolean             → boolean
//   - integer             → number (NOT NULL) | number | null (nullable)
//   - numeric / bigint    → string  (pgQuery returns these as strings, just
//                                    like progress_percentage::text in the
//                                    LMS hooks — keeping them as strings
//                                    avoids floating-point drift on money)
//   - uuid                → string
//   - date / timestamptz  → string (ISO) | string | null (nullable)
// ============================================================================

// public.crm_staff (3 rows)
export interface CrmStaffMember {
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
}

// public.crm_services (12 rows)
export interface CrmService {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  description: string | null;
  category: string | null;
  default_duration_minutes: number;
  default_price: string; // numeric → string
  deposit_required: boolean;
  default_deposit_amount: string; // numeric → string
  rebooking_interval_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service_category: string;
  is_add_on: boolean;
  parent_service_id: string | null;
  bookable_online: boolean;
  image_url: string | null;
}

// public.commerce_payments (12 rows)
// (customer_name is the JOINed field from crm_customers — see the API route.)
export interface CommercePayment {
  id: string;
  tenant_id: string;
  payment_number: string;
  sale_id: string | null;
  customer_id: string | null;
  payment_method_id: string;
  amount: string; // numeric → string
  tip_amount: string; // numeric → string
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
  /** Derived: first_name + ' ' + last_name (or email) from the JOINed
   *  crm_customers row, or null when the payment has no customer. */
  customer_name: string | null;
}

// public.crm_notes (0 rows)
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

// public.crm_messages (0 rows)
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
  /** Derived: created_at aliased for sort stability across the 3 sub-tabs. */
  created_at: string;
}

// public.crm_documents (0 rows)
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
  file_size_bytes: string | null; // bigint → string
  uploaded_by: string | null;
  uploaded_at: string | null;
  issued_at: string | null;
  expires_at: string | null;
  signed_at: string | null;
  signed_by_name: string | null;
  signature_provider: string | null;
  external_signature_id: string | null;
  rejection_reason: string | null;
  /** Derived: created_at alias for sort stability. */
  created_at: string;
}

// public.crm_pets (2 rows)
// (primary_customer_name is the JOINed field from crm_customers.)
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
  sex: string | null;
  altered_status: string | null;
  color: string | null;
  coat_type: string | null;
  date_of_birth: string | null;
  approximate_age_years: string | null; // numeric → string
  weight: string | null; // numeric → string
  weight_unit: string;
  microchip_number: string | null;
  veterinarian_name: string | null;
  veterinarian_phone: string | null;
  medical_alert: boolean;
  special_handling: boolean;
  nervous: boolean;
  aggressive: boolean;
  /** Derived: first_name + ' ' + last_name (or email) from the JOINed
   *  crm_customers row, or null when primary_customer_id is null. */
  primary_customer_name: string | null;
}

// public.crm_customers (7 rows) — used as the JOIN target for payments + pets.
export interface CrmCustomer {
  id: string;
  tenant_id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  customer_type: string;
  lifecycle_stage: string;
  lifecycle_status: string;
}
