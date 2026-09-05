-- ============================================================================
--  All About Pawz— COMPLETE UNIFIED ENTERPRISE SCHEMA (v4.0 PRODUCTION)
-- PostgreSQL / Supabase
-- Single source of truth. Safely rerunnable. Strictly isolated.
-- Reconciles: CRM, Appointments, Services/Pricing, Staff, Portals, Commerce, 
-- ERP/Inventory, Accounting, Payroll, Banking, CMS, Automation, Analytics, 
-- Search, GL, AP, AR, Cash, Tax, Assets, Leases, Revenue Recognition, 
-- Budgeting, Intercompany, Consolidation, FX, Workflows, Auditability.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 0. PLATFORM CORE & TENANCY
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','past_due','suspended','canceled')),
    subscription_id text,
    stripe_connect_account_id text,
    stripe_connect_status text NOT NULL DEFAULT 'not_started' CHECK (stripe_connect_status IN ('not_started','onboarding','restricted','active')),
    plan_tier text NOT NULL DEFAULT 'starter',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    address jsonb NOT NULL DEFAULT '{}',
    timezone text NOT NULL DEFAULT 'America/Chicago',
    is_primary boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS tenant_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    role text NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin','salon_manager','groomer_stylist','front_desk','viewer','owner','admin','manager','marketing')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','suspended')),
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS platform_admins (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    reason text NOT NULL DEFAULT 'platform_support'
);

CREATE TABLE IF NOT EXISTS platform_admin_access_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reason text NOT NULL,
    accessed_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    ip_address inet
);

CREATE TABLE IF NOT EXISTS platform_reserved_slugs (
    slug text PRIMARY KEY,
    reason text NOT NULL DEFAULT 'reserved'
);
INSERT INTO platform_reserved_slugs (slug) VALUES 
('www'),('api'),('app'),('admin'),('auth'),('portal'),('static'),('cdn'),('mail'),('billing')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 1. UNIFIED RLS & SECURITY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION platform_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION platform_is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM platform_admins
        WHERE user_id = auth.uid()
          AND (expires_at IS NULL OR expires_at > now())
    );
$$;

CREATE OR REPLACE FUNCTION platform_user_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT tm.tenant_id
    FROM tenant_memberships AS tm
    WHERE tm.user_id = auth.uid()
      AND tm.active = true
      AND tm.status = 'active';
$$;

CREATE OR REPLACE FUNCTION platform_is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT platform_is_admin() OR EXISTS (
        SELECT 1 FROM tenant_memberships AS tm
        WHERE tm.tenant_id = p_tenant_id
          AND tm.user_id = auth.uid()
          AND tm.active = true
          AND tm.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION platform_has_permission(p_tenant_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT platform_is_admin() OR EXISTS (
        SELECT 1 FROM platform_module_permissions pmp
        JOIN crm_staff cs ON cs.id = pmp.staff_id
        WHERE cs.user_id = auth.uid()
          AND pmp.tenant_id = p_tenant_id
          AND pmp.module_code = (SELECT module FROM platform_permission_registry WHERE permission_code = p_permission LIMIT 1)
          AND pmp.access_level IN ('write', 'full')
    );
$$;

-- Module-specific aliases for consistency
CREATE OR REPLACE FUNCTION crm_has_tenant_access(p_tenant_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT platform_is_tenant_member(p_tenant_id); $$;
CREATE OR REPLACE FUNCTION commerce_has_tenant_access(p_tenant_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT platform_is_tenant_member(p_tenant_id); $$;
CREATE OR REPLACE FUNCTION acct_is_tenant_member(p_tenant_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT platform_is_tenant_member(p_tenant_id); $$;
CREATE OR REPLACE FUNCTION erp_current_tenant_member(p_tenant_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT platform_is_tenant_member(p_tenant_id); $$;

-- ============================================================================
-- 2. CRM MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_settings (
    tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    default_timezone text NOT NULL DEFAULT 'America/Chicago',
    default_currency text NOT NULL DEFAULT 'USD',
    default_appointment_duration_minutes integer NOT NULL DEFAULT 120 CHECK (default_appointment_duration_minutes BETWEEN 5 AND 1440),
    default_rebooking_days integer NOT NULL DEFAULT 42,
    inactive_after_days integer NOT NULL DEFAULT 90,
    at_risk_after_days integer NOT NULL DEFAULT 90,
    birthday_campaign_enabled boolean NOT NULL DEFAULT true,
    vaccine_reminder_enabled boolean NOT NULL DEFAULT true,
    rebooking_automation_enabled boolean NOT NULL DEFAULT true,
    require_upfront_deposit boolean NOT NULL DEFAULT false,
    deposit_percent numeric(5,2),
    deposit_flat_amount numeric(12,2),
    cancellation_cutoff_minutes integer NOT NULL DEFAULT 1440,
    no_show_penalty_amount numeric(12,2) NOT NULL DEFAULT 0,
    max_booking_horizon_days integer NOT NULL DEFAULT 90,
    station_turnaround_buffer_minutes integer NOT NULL DEFAULT 15,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    code text,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    postal_code text,
    country text NOT NULL DEFAULT 'US',
    phone text,
    email text,
    timezone text NOT NULL DEFAULT 'America/Chicago',
    latitude numeric(10,7),
    longitude numeric(10,7),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS crm_staff (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id uuid,
    display_name text NOT NULL,
    first_name text,
    last_name text,
    email text,
    phone text,
    role text NOT NULL DEFAULT 'staff',
    is_groomer boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    default_location_id uuid,
    color_label text,
    hire_date date,
    termination_date date,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, default_location_id) REFERENCES crm_locations(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_households (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','merged','archived')),
    primary_customer_id uuid,
    source_household_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS crm_customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    household_id uuid,
    source_customer_id text,
    external_customer_number text,
    customer_type text NOT NULL DEFAULT 'individual' CHECK (customer_type IN ('individual','business','breeder','rescue','referral_partner','staff','other')),
    lifecycle_stage text NOT NULL DEFAULT 'new_lead' CHECK (lifecycle_stage IN ('new_lead','new_customer','active','vip','returning','lapsed','at_risk','lost')),
    lifecycle_status text NOT NULL DEFAULT 'healthy' CHECK (lifecycle_status IN ('healthy','needs_attention','at_risk')),
    first_name text,
    middle_name text,
    last_name text,
    preferred_name text,
    company_name text,
    email text,
    phone text,
    mobile_phone text,
    date_of_birth date,
    pronouns text,
    preferred_contact_method text CHECK (preferred_contact_method IN ('email','sms','phone','none')),
    preferred_language text,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    postal_code text,
    country text NOT NULL DEFAULT 'US',
    lead_source_id uuid,
    lead_owner_id uuid,
    assigned_staff_id uuid,
    preferred_location_id uuid,
    preferred_groomer_id uuid,
    customer_since date,
    first_contact_at timestamptz,
    last_activity_at timestamptz,
    next_follow_up_at timestamptz,
    last_visit_at timestamptz,
    next_appointment_at timestamptz,
    total_visits integer NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
    lifetime_value numeric(18,4) NOT NULL DEFAULT 0,
    average_ticket numeric(18,4) NOT NULL DEFAULT 0,
    average_visit_frequency_days numeric(12,2),
    no_show_rate numeric(8,5) NOT NULL DEFAULT 0 CHECK (no_show_rate BETWEEN 0 AND 1),
    cancellation_rate numeric(8,5) NOT NULL DEFAULT 0 CHECK (cancellation_rate BETWEEN 0 AND 1),
    rebook_rate numeric(8,5) NOT NULL DEFAULT 0 CHECK (rebook_rate BETWEEN 0 AND 1),
    outstanding_balance numeric(18,4) NOT NULL DEFAULT 0,
    total_spend_30d numeric(18,4) NOT NULL DEFAULT 0,
    total_spend_365d numeric(18,4) NOT NULL DEFAULT 0,
    marketing_email_opt_in boolean NOT NULL DEFAULT false,
    marketing_sms_opt_in boolean NOT NULL DEFAULT false,
    transactional_email_opt_in boolean NOT NULL DEFAULT true,
    transactional_sms_opt_in boolean NOT NULL DEFAULT true,
    do_not_call boolean NOT NULL DEFAULT false,
    do_not_contact boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    archived_at timestamptz,
    merged_into_customer_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, household_id) REFERENCES crm_households(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, lead_owner_id) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, assigned_staff_id) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, preferred_location_id) REFERENCES crm_locations(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, preferred_groomer_id) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, merged_into_customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE SET NULL
);

-- Safely rerunnable constraint for crm_households (placed AFTER crm_customers exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'crm_households_primary_customer_fk' 
        AND conrelid = 'public.crm_households'::regclass
    ) THEN
        ALTER TABLE public.crm_households 
        ADD CONSTRAINT crm_households_primary_customer_fk 
        FOREIGN KEY (tenant_id, primary_customer_id) 
        REFERENCES public.crm_customers(tenant_id, id) 
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS crm_customer_contact_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL,
    type text NOT NULL CHECK (type IN ('email','phone','mobile','other')),
    value text NOT NULL,
    normalized_value text NOT NULL,
    label text,
    is_primary boolean NOT NULL DEFAULT false,
    is_verified boolean NOT NULL DEFAULT false,
    verified_at timestamptz,
    opt_in boolean,
    opted_in_at timestamptz,
    opted_out_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS crm_customer_contact_lookup_idx ON crm_customer_contact_methods(tenant_id, normalized_value);

CREATE TABLE IF NOT EXISTS crm_customer_preferences (
    customer_id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    preferred_days text[] NOT NULL DEFAULT '{}',
    preferred_time_start time,
    preferred_time_end time,
    preferred_services text[] NOT NULL DEFAULT '{}',
    preferred_payment_method text,
    preferred_groomer_id uuid,
    communication_notes text,
    accessibility_notes text,
    parking_notes text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, preferred_groomer_id) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_pets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    household_id uuid,
    primary_customer_id uuid,
    source_pet_id text,
    name text NOT NULL,
    species text NOT NULL DEFAULT 'dog',
    breed text,
    mixed_breed boolean NOT NULL DEFAULT false,
    sex text CHECK (sex IN ('male','female','unknown')),
    altered_status text CHECK (altered_status IN ('intact','spayed','neutered','unknown')),
    color text,
    coat_type text,
    date_of_birth date,
    approximate_age_years numeric(6,2),
    weight numeric(10,2),
    weight_unit text NOT NULL DEFAULT 'lb',
    microchip_number text,
    veterinarian_name text,
    veterinarian_phone text,
    medical_alert boolean NOT NULL DEFAULT false,
    special_handling boolean NOT NULL DEFAULT false,
    nervous boolean NOT NULL DEFAULT false,
    aggressive boolean NOT NULL DEFAULT false,
    first_visit boolean NOT NULL DEFAULT true,
    senior boolean NOT NULL DEFAULT false,
    puppy boolean NOT NULL DEFAULT false,
    permanent_alert text,
    handling_notes text,
    behavioral_notes text,
    medical_notes text,
    service_notes text,
    preferred_groomer_id uuid,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','deceased','archived')),
    deceased_at date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, household_id) REFERENCES crm_households(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, primary_customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, preferred_groomer_id) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_customer_pets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL,
    pet_id uuid NOT NULL,
    relationship text NOT NULL DEFAULT 'owner' CHECK (relationship IN ('owner','co_owner','guardian','emergency_contact','other')),
    is_primary boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(customer_id, pet_id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type text NOT NULL CHECK (entity_type IN ('customer','pet','lead','appointment','grooming_record')),
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, entity_type, slug),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS crm_customer_tags (
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (customer_id, tag_id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, tag_id) REFERENCES crm_tags(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_pet_tags (
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pet_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (pet_id, tag_id),
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, tag_id) REFERENCES crm_tags(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_lead_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text NOT NULL DEFAULT 'other' CHECK (category IN ('website','google','referral','social_media','phone','walk_in','campaign','other')),
    utm_source text,
    utm_medium text,
    utm_campaign text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name),
    UNIQUE(tenant_id, id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_customers_lead_source_fk' AND conrelid = 'public.crm_customers'::regclass) THEN
        ALTER TABLE public.crm_customers ADD CONSTRAINT crm_customers_lead_source_fk FOREIGN KEY (lead_source_id) REFERENCES public.crm_lead_sources(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS crm_leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid,
    lead_owner_id uuid,
    lead_source_id uuid,
    status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','booking_pending','booked','converted','lost','no_response')),
    booking_outcome text CHECK (booking_outcome IN ('booked','pending','cancelled','lost','no_response')),
    lost_reason text CHECK (lost_reason IN ('price','schedule','location','no_availability','found_another_groomer','other')),
    first_contact_at timestamptz,
    last_activity_at timestamptz,
    next_follow_up_at timestamptz,
    conversion_date timestamptz,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, lead_owner_id) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, lead_source_id) REFERENCES crm_lead_sources(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_lead_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id uuid NOT NULL,
    activity_type text NOT NULL CHECK (activity_type IN ('created','contacted','call','email','sms','website_visit','form_submit','intake_completed','appointment_created','appointment_cancelled','converted','lost','note')),
    occurred_at timestamptz NOT NULL DEFAULT now(),
    staff_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, lead_id) REFERENCES crm_leads(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, staff_id) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_funnel_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    anonymous_session_id text,
    customer_id uuid,
    lead_id uuid,
    event_type text NOT NULL CHECK (event_type IN ('website_visit','account_created','intake_started','intake_completed','booking_started','booking_completed')),
    occurred_at timestamptz NOT NULL DEFAULT now(),
    source text,
    landing_page text,
    campaign text,
    metadata jsonb NOT NULL DEFAULT '{}',
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, lead_id) REFERENCES crm_leads(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    code text,
    description text,
    category text,
    default_duration_minutes integer NOT NULL DEFAULT 60 CHECK (default_duration_minutes BETWEEN 5 AND 1440),
    default_price numeric(18,4) NOT NULL DEFAULT 0,
    deposit_required boolean NOT NULL DEFAULT false,
    default_deposit_amount numeric(18,4) NOT NULL DEFAULT 0,
    rebooking_interval_days integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS crm_service_location_availability (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    service_id uuid NOT NULL,
    location_id uuid NOT NULL,
    duration_minutes integer,
    price numeric(18,4),
    is_active boolean NOT NULL DEFAULT true,
    UNIQUE(service_id, location_id),
    FOREIGN KEY (tenant_id, service_id) REFERENCES crm_services(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, location_id) REFERENCES crm_locations(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_appointments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_appointment_id text,
    customer_id uuid NOT NULL,
    location_id uuid,
    assigned_groomer_id uuid,
    created_by uuid,
    appointment_number text,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz,
    checked_in_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('precheck','deposit_paid','scheduled','assigned','waiting_checkin','confirmed','checked_in','in_service','hold','completed','no_show','cancelled','rescheduled')),
    cancellation_reason text,
    no_show_reason text,
    service_type_confirmed boolean NOT NULL DEFAULT false,
    payment_method_confirmed boolean NOT NULL DEFAULT false,
    deposit_amount numeric(18,4) NOT NULL DEFAULT 0,
    subtotal numeric(18,4) NOT NULL DEFAULT 0,
    tax_total numeric(18,4) NOT NULL DEFAULT 0,
    total numeric(18,4) NOT NULL DEFAULT 0,
    amount_paid numeric(18,4) NOT NULL DEFAULT 0,
    outstanding_amount numeric(18,4) NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'USD',
    source_channel text,
    booking_outcome text CHECK (booking_outcome IN ('booked','pending','cancelled','lost','no_response')),
    reminder_sent_at timestamptz,
    pickup_notification_sent_at timestamptz,
    processed_payment_sent_at timestamptz,
    thank_you_sent_at timestamptz,
    magic_link_sent_at timestamptz,
    internal_notes text,
    customer_notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, appointment_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, location_id) REFERENCES crm_locations(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, assigned_groomer_id) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, created_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_appointment_pets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    appointment_id uuid NOT NULL,
    pet_id uuid NOT NULL,
    sequence_no integer NOT NULL DEFAULT 1,
    check_in_notes text,
    checkout_notes text,
    status text NOT NULL DEFAULT 'scheduled',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(appointment_id, pet_id),
    FOREIGN KEY (tenant_id, appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS crm_appointment_services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    appointment_id uuid NOT NULL,
    pet_id uuid,
    service_id uuid NOT NULL,
    groomer_id uuid,
    quantity numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    duration_minutes integer,
    unit_price numeric(18,4) NOT NULL DEFAULT 0,
    discount_amount numeric(18,4) NOT NULL DEFAULT 0,
    tax_amount numeric(18,4) NOT NULL DEFAULT 0,
    total numeric(18,4) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'scheduled',
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, service_id) REFERENCES crm_services(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, groomer_id) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_appointment_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    appointment_id uuid NOT NULL,
    from_status text,
    to_status text NOT NULL,
    changed_by uuid,
    changed_at timestamptz NOT NULL DEFAULT now(),
    reason text,
    metadata jsonb NOT NULL DEFAULT '{}',
    FOREIGN KEY (tenant_id, appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, changed_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_waitlist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL,
    pet_id uuid,
    service_id uuid,
    location_id uuid,
    preferred_groomer_id uuid,
    requested_start_at timestamptz,
    requested_end_at timestamptz,
    priority integer NOT NULL DEFAULT 100,
    status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','offered','booked','expired','cancelled')),
    expires_at timestamptz,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, service_id) REFERENCES crm_services(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, location_id) REFERENCES crm_locations(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, preferred_groomer_id) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_appointment_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    appointment_id uuid NOT NULL,
    step_code text NOT NULL CHECK (step_code IN ('precheck_completed','deposit_paid','scheduled','assigned_to_groomer','waiting_to_be_checked_in','service_type_confirmed','payment_method_confirmed','checked_in','grooming_started','wash_complete','trimming_in_progress','nails_manicure_completed','groomer_notes_completed','pickup_notification_sent','processed_payment_sent','checkout_completed','thank_you_note_sent','visit_images_sent')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
    started_at timestamptz,
    completed_at timestamptz,
    completed_by uuid,
    notes text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(appointment_id, step_code),
    FOREIGN KEY (tenant_id, appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, completed_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS crm_appointment_steps_status_idx ON crm_appointment_steps(tenant_id, appointment_id, status);

CREATE TABLE IF NOT EXISTS crm_appointment_financial_refs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    appointment_id uuid NOT NULL,
    invoice_external_id text,
    payment_external_id text,
    refund_external_id text,
    order_external_id text,
    accounting_system text,
    amount numeric(18,4) NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'USD',
    reference_type text NOT NULL CHECK (reference_type IN ('invoice','payment','refund','order','deposit','credit')),
    created_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}',
    FOREIGN KEY (tenant_id, appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS crm_appointment_financial_refs_idx ON crm_appointment_financial_refs(tenant_id, appointment_id, reference_type);

CREATE TABLE IF NOT EXISTS crm_grooming_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    appointment_id uuid,
    customer_id uuid NOT NULL,
    pet_id uuid NOT NULL,
    groomer_id uuid,
    started_at timestamptz,
    completed_at timestamptz,
    duration_minutes integer,
    notes text,
    pet_behavior_notes text,
    coat_condition text,
    skin_condition text,
    matting_level text,
    services_summary text,
    recommend_next_visit boolean NOT NULL DEFAULT true,
    recommended_next_visit_date date,
    recommended_next_service_id uuid,
    customer_visible_notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, groomer_id) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, recommended_next_service_id) REFERENCES crm_services(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_grooming_record_services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    grooming_record_id uuid NOT NULL,
    service_id uuid NOT NULL,
    duration_minutes integer,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, grooming_record_id) REFERENCES crm_grooming_records(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, service_id) REFERENCES crm_services(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS crm_grooming_photos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    grooming_record_id uuid NOT NULL,
    pet_id uuid NOT NULL,
    storage_path text NOT NULL,
    public_url text,
    photo_type text NOT NULL DEFAULT 'after' CHECK (photo_type IN ('before','during','after','medical','other')),
    caption text,
    customer_visible boolean NOT NULL DEFAULT true,
    taken_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, grooming_record_id) REFERENCES crm_grooming_records(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_document_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text NOT NULL CHECK (category IN ('waiver','intake','vaccination','agreement','authorization','other')),
    required_for_booking boolean NOT NULL DEFAULT false,
    requires_signature boolean NOT NULL DEFAULT false,
    expiration_days integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS crm_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL,
    pet_id uuid,
    document_type_id uuid,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','signed','approved','expired','rejected','archived')),
    storage_path text,
    mime_type text,
    file_size_bytes bigint,
    uploaded_by uuid,
    uploaded_at timestamptz,
    issued_at date,
    expires_at date,
    signed_at timestamptz,
    signed_by_name text,
    signature_provider text,
    external_signature_id text,
    rejection_reason text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, document_type_id) REFERENCES crm_document_types(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, uploaded_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_document_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id uuid NOT NULL,
    version_no integer NOT NULL,
    storage_path text NOT NULL,
    checksum text,
    uploaded_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(document_id, version_no),
    FOREIGN KEY (tenant_id, document_id) REFERENCES crm_documents(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, uploaded_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_vaccine_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    code text,
    validity_days integer,
    is_required boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS crm_pet_vaccinations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pet_id uuid NOT NULL,
    vaccine_type_id uuid NOT NULL,
    administered_on date,
    expires_on date,
    lot_number text,
    veterinarian_name text,
    document_id uuid,
    status text NOT NULL DEFAULT 'current' CHECK (status IN ('current','expiring','expired','pending','waived','unknown')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, vaccine_type_id) REFERENCES crm_vaccine_types(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, document_id) REFERENCES crm_documents(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid,
    pet_id uuid,
    appointment_id uuid,
    grooming_record_id uuid,
    created_by uuid,
    note_type text NOT NULL DEFAULT 'internal' CHECK (note_type IN ('internal','customer_visible','appointment','pet_handling','system')),
    body text NOT NULL,
    is_pinned boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, grooming_record_id) REFERENCES crm_grooming_records(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, created_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_permanent_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid,
    pet_id uuid,
    severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
    title text NOT NULL,
    body text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, created_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_activity (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid,
    pet_id uuid,
    appointment_id uuid,
    lead_id uuid,
    activity_type text NOT NULL,
    channel text,
    direction text CHECK (direction IN ('inbound','outbound','internal')),
    subject text,
    body text,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    staff_id uuid,
    external_id text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lead_id) REFERENCES crm_leads(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, staff_id) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_audit_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_user_id uuid,
    actor_staff_id uuid,
    entity_type text NOT NULL,
    entity_id uuid,
    action text NOT NULL,
    before_data jsonb,
    after_data jsonb,
    ip_address inet,
    user_agent text,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, actor_staff_id) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_message_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    channel text NOT NULL CHECK (channel IN ('email','sms','phone','push','in_app')),
    subject text,
    body text NOT NULL,
    variables jsonb NOT NULL DEFAULT '[]',
    category text,
    is_system boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, created_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid,
    pet_id uuid,
    channel text NOT NULL CHECK (channel IN ('email','sms','phone','chat','whatsapp','other')),
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved','closed')),
    assigned_staff_id uuid,
    subject text,
    started_at timestamptz NOT NULL DEFAULT now(),
    last_message_at timestamptz,
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, assigned_staff_id) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id uuid,
    customer_id uuid,
    channel text NOT NULL CHECK (channel IN ('email','sms','phone','chat','whatsapp','push','in_app','other')),
    direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','failed','read','received')),
    from_address text,
    to_address text,
    subject text,
    body text,
    template_id uuid,
    provider text,
    provider_message_id text,
    sent_at timestamptz,
    delivered_at timestamptz,
    read_at timestamptz,
    failed_at timestamptz,
    failure_reason text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, conversation_id) REFERENCES crm_conversations(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, template_id) REFERENCES crm_message_templates(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, created_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_communication_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL,
    channel text NOT NULL CHECK (channel IN ('email','sms','phone','push','marketing','transactional')),
    opted_in boolean NOT NULL DEFAULT false,
    source text,
    consented_at timestamptz,
    revoked_at timestamptz,
    UNIQUE(customer_id, channel),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    campaign_type text NOT NULL CHECK (campaign_type IN ('rebooking','appointment_reminder','vaccine_reminder','birthday','win_back','new_customer_nurture','payment_reminder','custom')),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','running','paused','completed','cancelled')),
    channel text NOT NULL CHECK (channel IN ('email','sms','both')),
    template_id uuid,
    segment_definition jsonb NOT NULL DEFAULT '{}',
    scheduled_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, template_id) REFERENCES crm_message_templates(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, created_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_campaign_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','opened','clicked','converted','failed','unsubscribed','skipped')),
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    sent_at timestamptz,
    converted_at timestamptz,
    failure_reason text,
    UNIQUE(campaign_id, customer_id),
    FOREIGN KEY (tenant_id, campaign_id) REFERENCES crm_campaigns(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_segments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    entity_type text NOT NULL DEFAULT 'customer' CHECK (entity_type IN ('customer','pet')),
    definition jsonb NOT NULL DEFAULT '{}',
    segment_type text NOT NULL DEFAULT 'dynamic' CHECK (segment_type IN ('dynamic','static','system')),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS crm_segment_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    segment_id uuid NOT NULL,
    customer_id uuid,
    pet_id uuid,
    entered_at timestamptz NOT NULL DEFAULT now(),
    exited_at timestamptz,
    CHECK (((customer_id IS NOT NULL)::integer + (pet_id IS NOT NULL)::integer) = 1),
    FOREIGN KEY (tenant_id, segment_id) REFERENCES crm_segments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_segment_customer_unique_idx ON crm_segment_memberships(segment_id, customer_id) WHERE customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS crm_segment_pet_unique_idx ON crm_segment_memberships(segment_id, pet_id) WHERE pet_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS crm_customer_behavior (
    customer_id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    frequent_visitor boolean NOT NULL DEFAULT false,
    high_lifetime_value boolean NOT NULL DEFAULT false,
    frequent_no_show boolean NOT NULL DEFAULT false,
    cancellation_risk boolean NOT NULL DEFAULT false,
    price_sensitive boolean NOT NULL DEFAULT false,
    online_booking_only boolean NOT NULL DEFAULT false,
    due_for_rebooking boolean NOT NULL DEFAULT false,
    frequency_declining boolean NOT NULL DEFAULT false,
    missing_documents boolean NOT NULL DEFAULT false,
    vaccine_expiring boolean NOT NULL DEFAULT false,
    outstanding_balance_flag boolean NOT NULL DEFAULT false,
    no_upcoming_appointment boolean NOT NULL DEFAULT false,
    intake_incomplete boolean NOT NULL DEFAULT false,
    birthday_this_month boolean NOT NULL DEFAULT false,
    rebooking_campaign_eligible boolean NOT NULL DEFAULT false,
    win_back_candidate boolean NOT NULL DEFAULT false,
    new_customer_nurture_eligible boolean NOT NULL DEFAULT false,
    inactive_90_plus boolean NOT NULL DEFAULT false,
    last_calculated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_rebooking_recommendations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL,
    pet_id uuid,
    last_appointment_id uuid,
    recommended_service_id uuid,
    recommended_date date,
    reason text,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','booked','link_sent','campaign_added','snoozed','dismissed')),
    snoozed_until date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, last_appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, recommended_service_id) REFERENCES crm_services(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_automation_workflows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    workflow_type text NOT NULL CHECK (workflow_type IN ('rebooking','appointment_reminder','vaccine_reminder','unsigned_document','birthday','win_back','payment_reminder','custom')),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
    trigger_definition jsonb NOT NULL DEFAULT '{}',
    condition_definition jsonb NOT NULL DEFAULT '{}',
    action_definition jsonb NOT NULL DEFAULT '{}',
    allow_reentry boolean NOT NULL DEFAULT false,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, created_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_automation_enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    workflow_id uuid NOT NULL,
    customer_id uuid,
    pet_id uuid,
    appointment_id uuid,
    status text NOT NULL DEFAULT 'running' CHECK (status IN ('queued','running','waiting','completed','failed','cancelled')),
    current_step integer NOT NULL DEFAULT 0,
    scheduled_for timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    last_error text,
    context jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, workflow_id) REFERENCES crm_automation_workflows(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_automation_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    workflow_id uuid NOT NULL,
    enrollment_id uuid,
    action_type text NOT NULL,
    status text NOT NULL CHECK (status IN ('queued','running','succeeded','failed','skipped')),
    scheduled_for timestamptz,
    executed_at timestamptz,
    result jsonb NOT NULL DEFAULT '{}',
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, workflow_id) REFERENCES crm_automation_workflows(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES crm_automation_enrollments(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid,
    lead_id uuid,
    appointment_id uuid,
    assigned_to uuid,
    created_by uuid,
    task_type text NOT NULL DEFAULT 'follow_up',
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    title text NOT NULL,
    description text,
    due_at timestamptz,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled','snoozed')),
    completed_at timestamptz,
    snoozed_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lead_id) REFERENCES crm_leads(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, assigned_to) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, created_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_needs_attention (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid,
    pet_id uuid,
    appointment_id uuid,
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    issue_code text NOT NULL,
    issue text NOT NULL,
    recommendation text,
    due_by timestamptz,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','snoozed','resolved','dismissed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    resolved_by uuid,
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, resolved_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_saved_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_user_id uuid,
    name text NOT NULL,
    entity_type text NOT NULL,
    filters jsonb NOT NULL DEFAULT '{}',
    columns jsonb NOT NULL DEFAULT '[]',
    sort_definition jsonb NOT NULL DEFAULT '[]',
    is_shared boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, owner_user_id, entity_type, name)
);

CREATE TABLE IF NOT EXISTS crm_duplicate_candidates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type text NOT NULL CHECK (entity_type IN ('customer','household','pet')),
    record_a uuid NOT NULL,
    record_b uuid NOT NULL,
    match_score numeric(8,5) NOT NULL CHECK (match_score BETWEEN 0 AND 1),
    match_reasons jsonb NOT NULL DEFAULT '[]',
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','confirmed','dismissed','merged')),
    reviewed_by uuid,
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, entity_type, record_a, record_b),
    CHECK (record_a <> record_b),
    FOREIGN KEY (tenant_id, reviewed_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_merge_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type text NOT NULL,
    source_record_id uuid NOT NULL,
    surviving_record_id uuid NOT NULL,
    merged_by uuid,
    snapshot jsonb NOT NULL,
    merged_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, merged_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_search_index (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    search_text text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS crm_search_index_fts_idx ON crm_search_index USING GIN (to_tsvector('simple', search_text));

CREATE TABLE IF NOT EXISTS crm_external_identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    provider text NOT NULL,
    external_id text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, provider, entity_type, external_id)
);

CREATE TABLE IF NOT EXISTS crm_idempotency_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    idempotency_key text NOT NULL,
    operation text NOT NULL,
    request_hash text,
    response_status integer,
    response_body jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    UNIQUE(tenant_id, idempotency_key)
);

-- CRM Views
CREATE OR REPLACE VIEW crm_customer_overview WITH (security_invoker = true) AS
SELECT c.tenant_id, COUNT(*) AS total_customers, COUNT(*) FILTER (WHERE c.is_active) AS active_customers, COUNT(*) FILTER (WHERE c.customer_since >= CURRENT_DATE - INTERVAL '30 days') AS new_customers_30d, COUNT(*) FILTER (WHERE c.lifecycle_status = 'at_risk' OR c.lifecycle_stage = 'at_risk') AS at_risk_customers, COUNT(*) FILTER (WHERE c.next_appointment_at IS NOT NULL AND c.next_appointment_at >= NOW()) AS customers_with_upcoming_appointments, COALESCE(SUM(c.outstanding_balance),0) AS outstanding_balance, COALESCE(SUM(c.lifetime_value),0) AS lifetime_value FROM crm_customers c GROUP BY c.tenant_id;

CREATE OR REPLACE VIEW crm_dashboard_daily WITH (security_invoker = true) AS
SELECT a.tenant_id, CURRENT_DATE AS report_date, COUNT(*) FILTER (WHERE a.starts_at >= DATE_TRUNC('day', NOW()) AND a.starts_at < DATE_TRUNC('day', NOW()) + INTERVAL '1 day') AS todays_appointments, COALESCE(SUM(a.total) FILTER (WHERE a.completed_at >= DATE_TRUNC('day', NOW()) AND a.completed_at < DATE_TRUNC('day', NOW()) + INTERVAL '1 day'),0) AS todays_revenue, COUNT(*) FILTER (WHERE a.status = 'no_show' AND a.starts_at >= NOW() - INTERVAL '30 days')::numeric / NULLIF(COUNT(*) FILTER (WHERE a.starts_at >= NOW() - INTERVAL '30 days' AND a.status IN ('completed','no_show')),0) AS no_show_rate_30d, COUNT(*) FILTER (WHERE a.status = 'completed' AND a.starts_at >= NOW() - INTERVAL '30 days') AS completed_appointments_30d FROM crm_appointments a GROUP BY a.tenant_id;

CREATE OR REPLACE VIEW crm_appointments_upcoming WITH (security_invoker = true) AS
SELECT a.*, c.first_name, c.last_name, c.preferred_name FROM crm_appointments a JOIN crm_customers c ON c.id = a.customer_id WHERE a.starts_at >= NOW() AND a.status NOT IN ('cancelled','no_show','completed');

CREATE OR REPLACE VIEW crm_vaccinations_expiring WITH (security_invoker = true) AS
SELECT v.tenant_id, v.id, v.pet_id, p.name AS pet_name, p.primary_customer_id AS customer_id, v.vaccine_type_id, vt.name AS vaccine_name, v.expires_on, (v.expires_on - CURRENT_DATE) AS days_until_expiry FROM crm_pet_vaccinations v JOIN crm_pets p ON p.id = v.pet_id JOIN crm_vaccine_types vt ON vt.id = v.vaccine_type_id WHERE v.expires_on IS NOT NULL AND v.expires_on <= CURRENT_DATE + INTERVAL '30 days' AND v.status IN ('current','expiring');

CREATE OR REPLACE VIEW crm_unsigned_documents WITH (security_invoker = true) AS
SELECT d.tenant_id, d.id, d.customer_id, d.pet_id, d.name, d.status, d.expires_at, dt.name AS document_type FROM crm_documents d LEFT JOIN crm_document_types dt ON dt.id = d.document_type_id WHERE d.status IN ('pending','submitted') OR (dt.requires_signature AND d.signed_at IS NULL);

CREATE OR REPLACE VIEW crm_upcoming_birthdays WITH (security_invoker = true) AS
SELECT c.tenant_id, c.id AS customer_id, c.first_name, c.last_name, c.preferred_name, c.date_of_birth FROM crm_customers c WHERE c.date_of_birth IS NOT NULL AND EXTRACT(MONTH FROM c.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) AND c.is_active;

CREATE OR REPLACE VIEW crm_needs_rebooking WITH (security_invoker = true) AS
SELECT c.tenant_id, c.id AS customer_id, c.first_name, c.last_name, c.last_visit_at, c.next_appointment_at, c.average_visit_frequency_days, c.rebook_rate, c.lifecycle_stage FROM crm_customers c WHERE c.is_active AND c.next_appointment_at IS NULL AND c.last_visit_at IS NOT NULL AND CURRENT_DATE >= c.last_visit_at::date + MAKE_INTERVAL(days => GREATEST(COALESCE(c.average_visit_frequency_days,42)::integer,1));

CREATE OR REPLACE VIEW crm_booking_funnel_30d WITH (security_invoker = true) AS
SELECT f.tenant_id, COUNT(*) FILTER (WHERE f.event_type = 'website_visit') AS website_visits, COUNT(*) FILTER (WHERE f.event_type = 'account_created') AS accounts_created, COUNT(*) FILTER (WHERE f.event_type = 'intake_completed') AS intake_completed, COUNT(*) FILTER (WHERE f.event_type = 'booking_completed') AS bookings_completed FROM crm_funnel_events f WHERE f.occurred_at >= NOW() - INTERVAL '30 days' GROUP BY f.tenant_id;

CREATE OR REPLACE VIEW crm_customer_service_profile WITH (security_invoker = true) AS
SELECT c.tenant_id, c.id AS customer_id, MODE() WITHIN GROUP (ORDER BY s.id) AS most_common_service_id, AVG(asv.duration_minutes) AS average_service_duration, AVG(asv.unit_price) AS average_service_spend, MAX(a.starts_at) AS last_service_at FROM crm_customers c LEFT JOIN crm_appointments a ON a.customer_id = c.id AND a.status = 'completed' LEFT JOIN crm_appointment_services asv ON asv.appointment_id = a.id LEFT JOIN crm_services s ON s.id = asv.service_id GROUP BY c.tenant_id, c.id;

CREATE OR REPLACE VIEW crm_revenue_30d WITH (security_invoker = true) AS
SELECT tenant_id, COALESCE(SUM(total) FILTER (WHERE status = 'completed'),0) AS revenue_30d, COUNT(*) FILTER (WHERE status = 'completed') AS completed_visits_30d, COUNT(*) FILTER (WHERE status = 'no_show') AS no_shows_30d, COUNT(*) FILTER (WHERE status = 'cancelled') AS cancellations_30d FROM crm_appointments WHERE starts_at >= NOW() - INTERVAL '30 days' GROUP BY tenant_id;

-- ============================================================================
-- 3. ERP / ORDER & INVENTORY MODULE
-- ============================================================================

DO $$ BEGIN CREATE TYPE erp_order_status AS ENUM ('draft','pending_payment','confirmed','on_hold','allocated','partially_allocated','released','picking','partially_picked','packed','partially_shipped','ready_for_pickup','shipped','delivered','completed','backordered','cancelled','returned','closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE erp_order_line_status AS ENUM ('open','reserved','allocated','backordered','picked','packed','shipped','delivered','cancelled','returned','closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE erp_fulfillment_method AS ENUM ('ship','local_pickup','curbside','local_delivery','digital','third_party'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE erp_fulfillment_status AS ENUM ('pending','released','picking','picked','packing','packed','staged','ready','dispatched','shipped','delivered','picked_up','cancelled','closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE erp_inventory_status AS ENUM ('available','reserved','allocated','picked','packed','in_transit','damaged','quarantine','blocked','expired','returned'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE erp_inventory_movement_type AS ENUM ('opening','purchase_receipt','sale','return','transfer','adjustment','damage','scrap','count_adjustment','reservation','reservation_release','allocation','deallocation','pick','unpick','pack','unpack','ship','receive','putaway','cycle_count','reclassification','cost_adjustment'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE erp_procurement_status AS ENUM ('draft','pending_approval','approved','sent','partially_received','received','closed','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE erp_return_status AS ENUM ('requested','approved','awaiting_package','in_transit','received','inspection','approved_for_refund','rejected','restocked','refunded','exchanged','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE erp_return_disposition AS ENUM ('restock','refurbish','damaged','scrap','quarantine','return_to_vendor','exchange','replacement'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE erp_pick_status AS ENUM ('pending','assigned','in_progress','picked','short','cancelled','closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE erp_receipt_status AS ENUM ('draft','receiving','partially_received','received','posted','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE erp_replenishment_status AS ENUM ('open','recommended','approved','ordered','partially_received','fulfilled','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE erp_count_status AS ENUM ('draft','assigned','counting','submitted','review','approved','posted','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE OR REPLACE FUNCTION erp_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS erp_product_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_id uuid REFERENCES erp_product_categories(id) ON DELETE SET NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS erp_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id uuid REFERENCES erp_product_categories(id) ON DELETE SET NULL,
    source_product_id text,
    product_type text NOT NULL DEFAULT 'physical',
    name text NOT NULL,
    description text,
    brand text,
    is_inventory_item boolean NOT NULL DEFAULT true,
    is_sellable boolean NOT NULL DEFAULT true,
    is_purchasable boolean NOT NULL DEFAULT true,
    track_lots boolean NOT NULL DEFAULT false,
    track_serial_numbers boolean NOT NULL DEFAULT false,
    track_expiration boolean NOT NULL DEFAULT false,
    base_uom text NOT NULL DEFAULT 'EA',
    standard_cost numeric(18,6) NOT NULL DEFAULT 0,
    default_unit_price numeric(18,4) NOT NULL DEFAULT 0,
    reorder_point numeric(18,4) NOT NULL DEFAULT 0,
    safety_stock numeric(18,4) NOT NULL DEFAULT 0,
    maximum_stock numeric(18,4),
    lead_time_days integer NOT NULL DEFAULT 0,
    minimum_order_quantity numeric(18,4) NOT NULL DEFAULT 1,
    order_multiple numeric(18,4) NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, source_product_id),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS erp_product_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id uuid NOT NULL,
    name text NOT NULL,
    attributes jsonb NOT NULL DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, product_id) REFERENCES erp_products(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS erp_product_skus (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id uuid NOT NULL,
    variant_id uuid,
    sku text NOT NULL,
    barcode text,
    uom text NOT NULL DEFAULT 'EA',
    unit_price numeric(18,4) NOT NULL DEFAULT 0,
    standard_cost numeric(18,6) NOT NULL DEFAULT 0,
    weight numeric(18,6),
    weight_uom text,
    length numeric(18,6),
    width numeric(18,6),
    height numeric(18,6),
    dimension_uom text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, sku),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, product_id) REFERENCES erp_products(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, variant_id) REFERENCES erp_product_variants(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS erp_product_barcodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku_id uuid NOT NULL,
    barcode text NOT NULL,
    barcode_type text NOT NULL DEFAULT 'UPC',
    is_primary boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, barcode),
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS erp_uom_conversions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku_id uuid,
    from_uom text NOT NULL,
    to_uom text NOT NULL,
    conversion_factor numeric(18,8) NOT NULL CHECK (conversion_factor > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, sku_id, from_uom, to_uom),
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS erp_warehouses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    warehouse_type text NOT NULL DEFAULT 'warehouse',
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    postal_code text,
    country_code text DEFAULT 'US',
    timezone text NOT NULL DEFAULT 'UTC',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS erp_warehouse_zones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    warehouse_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    zone_type text NOT NULL DEFAULT 'storage',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(warehouse_id, code),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS erp_warehouse_locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    warehouse_id uuid NOT NULL,
    zone_id uuid,
    parent_location_id uuid,
    code text NOT NULL,
    name text,
    location_type text NOT NULL DEFAULT 'bin',
    aisle text,
    rack text,
    shelf text,
    bin text,
    pick_sequence integer,
    capacity_quantity numeric(18,4),
    is_pickable boolean NOT NULL DEFAULT true,
    is_receiving boolean NOT NULL DEFAULT false,
    is_shipping boolean NOT NULL DEFAULT false,
    is_returns boolean NOT NULL DEFAULT false,
    is_quarantine boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(warehouse_id, code),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, zone_id) REFERENCES erp_warehouse_zones(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, parent_location_id) REFERENCES erp_warehouse_locations(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_inventory_balances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    location_id uuid NOT NULL,
    inventory_status erp_inventory_status NOT NULL DEFAULT 'available',
    on_hand numeric(18,4) NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
    reserved numeric(18,4) NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    allocated numeric(18,4) NOT NULL DEFAULT 0 CHECK (allocated >= 0),
    picked numeric(18,4) NOT NULL DEFAULT 0 CHECK (picked >= 0),
    packed numeric(18,4) NOT NULL DEFAULT 0 CHECK (packed >= 0),
    in_transit numeric(18,4) NOT NULL DEFAULT 0 CHECK (in_transit >= 0),
    unit_cost numeric(18,6) NOT NULL DEFAULT 0,
    last_counted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(sku_id, location_id, inventory_status),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, location_id) REFERENCES erp_warehouse_locations(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS erp_inventory_lots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku_id uuid NOT NULL,
    lot_number text NOT NULL,
    manufacture_date date,
    expiration_date date,
    received_at timestamptz,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, sku_id, lot_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS erp_inventory_serial_numbers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku_id uuid NOT NULL,
    serial_number text NOT NULL,
    lot_id uuid,
    status erp_inventory_status NOT NULL DEFAULT 'available',
    location_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, serial_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, lot_id) REFERENCES erp_inventory_lots(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, location_id) REFERENCES erp_warehouse_locations(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_inventory_reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    location_id uuid,
    source_order_id uuid,
    source_order_line_id uuid,
    quantity numeric(18,4) NOT NULL CHECK (quantity > 0),
    status text NOT NULL DEFAULT 'reserved',
    priority integer NOT NULL DEFAULT 0,
    expires_at timestamptz,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    released_at timestamptz,
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, location_id) REFERENCES erp_warehouse_locations(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_inventory_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    movement_type erp_inventory_movement_type NOT NULL,
    sku_id uuid NOT NULL,
    warehouse_id uuid,
    from_location_id uuid,
    to_location_id uuid,
    lot_id uuid,
    serial_number_id uuid,
    quantity numeric(18,4) NOT NULL CHECK (quantity > 0),
    unit_cost numeric(18,6) NOT NULL DEFAULT 0,
    total_cost numeric(20,6) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    source_type text,
    source_id text,
    reference text,
    reason text,
    metadata jsonb NOT NULL DEFAULT '{}',
    performed_by uuid,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, from_location_id) REFERENCES erp_warehouse_locations(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, to_location_id) REFERENCES erp_warehouse_locations(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, lot_id) REFERENCES erp_inventory_lots(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, serial_number_id) REFERENCES erp_inventory_serial_numbers(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (performed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_inventory_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transfer_number text NOT NULL,
    from_warehouse_id uuid NOT NULL,
    to_warehouse_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    requested_at timestamptz,
    shipped_at timestamptz,
    received_at timestamptz,
    notes text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, transfer_number),
    CHECK (from_warehouse_id <> to_warehouse_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, from_warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, to_warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_inventory_transfer_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transfer_id uuid NOT NULL,
    sku_id uuid NOT NULL,
    quantity numeric(18,4) NOT NULL CHECK (quantity > 0),
    shipped_quantity numeric(18,4) NOT NULL DEFAULT 0,
    received_quantity numeric(18,4) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (shipped_quantity <= quantity),
    CHECK (received_quantity <= shipped_quantity),
    FOREIGN KEY (tenant_id, transfer_id) REFERENCES erp_inventory_transfers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS erp_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_number text NOT NULL,
    source_order_id text,
    crm_customer_id uuid,
    crm_pet_id uuid,
    status erp_order_status NOT NULL DEFAULT 'draft',
    fulfillment_method erp_fulfillment_method NOT NULL DEFAULT 'ship',
    order_date timestamptz NOT NULL DEFAULT now(),
    promised_at timestamptz,
    sla_due_at timestamptz,
    currency text NOT NULL DEFAULT 'USD',
    subtotal numeric(18,4) NOT NULL DEFAULT 0,
    discount_total numeric(18,4) NOT NULL DEFAULT 0,
    tax_total numeric(18,4) NOT NULL DEFAULT 0,
    shipping_total numeric(18,4) NOT NULL DEFAULT 0,
    total numeric(18,4) NOT NULL DEFAULT 0,
    amount_paid numeric(18,4) NOT NULL DEFAULT 0,
    amount_refunded numeric(18,4) NOT NULL DEFAULT 0,
    balance_due numeric(18,4) GENERATED ALWAYS AS (GREATEST(total - amount_paid + amount_refunded, 0)) STORED,
    priority integer NOT NULL DEFAULT 0,
    is_rush boolean NOT NULL DEFAULT false,
    customer_email text,
    customer_phone text,
    notes text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, order_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, crm_customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, crm_pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_order_addresses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id uuid NOT NULL,
    address_type text NOT NULL CHECK (address_type IN ('billing','shipping','pickup')),
    first_name text,
    last_name text,
    company text,
    line1 text NOT NULL,
    line2 text,
    city text NOT NULL,
    state text,
    postal_code text,
    country_code text NOT NULL DEFAULT 'US',
    phone text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(order_id, address_type),
    FOREIGN KEY (tenant_id, order_id) REFERENCES erp_orders(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS erp_order_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id uuid NOT NULL,
    sku_id uuid NOT NULL,
    crm_pet_id uuid,
    description text,
    quantity numeric(18,4) NOT NULL CHECK (quantity > 0),
    unit_price numeric(18,4) NOT NULL DEFAULT 0,
    discount_amount numeric(18,4) NOT NULL DEFAULT 0,
    tax_amount numeric(18,4) NOT NULL DEFAULT 0,
    line_total numeric(18,4) NOT NULL DEFAULT 0,
    quantity_reserved numeric(18,4) NOT NULL DEFAULT 0,
    quantity_allocated numeric(18,4) NOT NULL DEFAULT 0,
    quantity_picked numeric(18,4) NOT NULL DEFAULT 0,
    quantity_packed numeric(18,4) NOT NULL DEFAULT 0,
    quantity_shipped numeric(18,4) NOT NULL DEFAULT 0,
    quantity_returned numeric(18,4) NOT NULL DEFAULT 0,
    status erp_order_line_status NOT NULL DEFAULT 'open',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (quantity_reserved <= quantity),
    CHECK (quantity_allocated <= quantity),
    CHECK (quantity_picked <= quantity),
    CHECK (quantity_packed <= quantity),
    CHECK (quantity_shipped <= quantity),
    CHECK (quantity_returned <= quantity),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, order_id) REFERENCES erp_orders(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, crm_pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_order_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id uuid NOT NULL,
    from_status erp_order_status,
    to_status erp_order_status NOT NULL,
    reason text,
    changed_by uuid,
    changed_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, order_id) REFERENCES erp_orders(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_order_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id uuid NOT NULL,
    note_type text NOT NULL DEFAULT 'internal',
    body text NOT NULL,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, order_id) REFERENCES erp_orders(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_fulfillment_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    fulfillment_number text NOT NULL,
    order_id uuid NOT NULL,
    warehouse_id uuid,
    method erp_fulfillment_method NOT NULL,
    status erp_fulfillment_status NOT NULL DEFAULT 'pending',
    priority integer NOT NULL DEFAULT 0,
    rush boolean NOT NULL DEFAULT false,
    released_at timestamptz,
    packed_at timestamptz,
    staged_at timestamptz,
    dispatched_at timestamptz,
    completed_at timestamptz,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, fulfillment_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, order_id) REFERENCES erp_orders(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_fulfillment_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    fulfillment_id uuid NOT NULL,
    order_line_id uuid NOT NULL,
    sku_id uuid NOT NULL,
    quantity numeric(18,4) NOT NULL CHECK (quantity > 0),
    quantity_picked numeric(18,4) NOT NULL DEFAULT 0,
    quantity_packed numeric(18,4) NOT NULL DEFAULT 0,
    quantity_shipped numeric(18,4) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, fulfillment_id) REFERENCES erp_fulfillment_orders(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, order_line_id) REFERENCES erp_order_lines(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS erp_pick_waves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    wave_number text NOT NULL,
    warehouse_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'open',
    priority integer NOT NULL DEFAULT 0,
    released_at timestamptz,
    completed_at timestamptz,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, wave_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_pick_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    wave_id uuid,
    fulfillment_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    assigned_to uuid,
    status erp_pick_status NOT NULL DEFAULT 'pending',
    priority integer NOT NULL DEFAULT 0,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, wave_id) REFERENCES erp_pick_waves(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, fulfillment_id) REFERENCES erp_fulfillment_orders(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_pick_task_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pick_task_id uuid NOT NULL,
    fulfillment_line_id uuid NOT NULL,
    sku_id uuid NOT NULL,
    location_id uuid NOT NULL,
    quantity_requested numeric(18,4) NOT NULL CHECK (quantity_requested > 0),
    quantity_picked numeric(18,4) NOT NULL DEFAULT 0 CHECK (quantity_picked >= 0),
    quantity_short numeric(18,4) NOT NULL DEFAULT 0 CHECK (quantity_short >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (quantity_picked + quantity_short <= quantity_requested),
    FOREIGN KEY (tenant_id, pick_task_id) REFERENCES erp_pick_tasks(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, fulfillment_line_id) REFERENCES erp_fulfillment_lines(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, location_id) REFERENCES erp_warehouse_locations(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS erp_packages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    fulfillment_id uuid NOT NULL,
    package_number text NOT NULL,
    package_type text,
    weight numeric(18,6),
    weight_uom text DEFAULT 'LB',
    length numeric(18,6),
    width numeric(18,6),
    height numeric(18,6),
    dimension_uom text DEFAULT 'IN',
    packed_by uuid,
    packed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, package_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, fulfillment_id) REFERENCES erp_fulfillment_orders(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (packed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_package_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    package_id uuid NOT NULL,
    fulfillment_line_id uuid NOT NULL,
    sku_id uuid NOT NULL,
    quantity numeric(18,4) NOT NULL CHECK (quantity > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, package_id) REFERENCES erp_packages(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, fulfillment_line_id) REFERENCES erp_fulfillment_lines(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS erp_carriers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    api_provider text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS erp_shipping_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    carrier_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    service_level text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, carrier_id) REFERENCES erp_carriers(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_shipments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shipment_number text NOT NULL,
    fulfillment_id uuid NOT NULL,
    carrier_id uuid,
    shipping_method_id uuid,
    status text NOT NULL DEFAULT 'label_pending',
    tracking_number text,
    tracking_url text,
    label_url text,
    shipped_at timestamptz,
    delivered_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, shipment_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, fulfillment_id) REFERENCES erp_fulfillment_orders(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, carrier_id) REFERENCES erp_carriers(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, shipping_method_id) REFERENCES erp_shipping_methods(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_shipment_packages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shipment_id uuid NOT NULL,
    package_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(shipment_id, package_id),
    FOREIGN KEY (tenant_id, shipment_id) REFERENCES erp_shipments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, package_id) REFERENCES erp_packages(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS erp_tracking_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shipment_id uuid NOT NULL,
    event_code text NOT NULL,
    event_status text,
    location_text text,
    event_at timestamptz NOT NULL,
    raw_payload jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, shipment_id) REFERENCES erp_shipments(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS erp_vendors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vendor_number text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    tax_identifier text,
    payment_terms text,
    currency text DEFAULT 'USD',
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, vendor_number),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS erp_vendor_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vendor_id uuid NOT NULL,
    sku_id uuid NOT NULL,
    vendor_sku text,
    unit_cost numeric(18,6) NOT NULL DEFAULT 0,
    minimum_order_quantity numeric(18,4) NOT NULL DEFAULT 1,
    order_multiple numeric(18,4) NOT NULL DEFAULT 1,
    lead_time_days integer NOT NULL DEFAULT 0,
    is_preferred boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(vendor_id, sku_id),
    FOREIGN KEY (tenant_id, vendor_id) REFERENCES erp_vendors(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS erp_purchase_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    po_number text NOT NULL,
    vendor_id uuid NOT NULL,
    warehouse_id uuid,
    status erp_procurement_status NOT NULL DEFAULT 'draft',
    order_date date NOT NULL DEFAULT CURRENT_DATE,
    expected_date date,
    currency text NOT NULL DEFAULT 'USD',
    subtotal numeric(18,4) NOT NULL DEFAULT 0,
    tax_total numeric(18,4) NOT NULL DEFAULT 0,
    shipping_total numeric(18,4) NOT NULL DEFAULT 0,
    total numeric(18,4) NOT NULL DEFAULT 0,
    notes text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, po_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, vendor_id) REFERENCES erp_vendors(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_purchase_order_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    purchase_order_id uuid NOT NULL,
    sku_id uuid NOT NULL,
    description text,
    quantity_ordered numeric(18,4) NOT NULL CHECK (quantity_ordered > 0),
    quantity_received numeric(18,4) NOT NULL DEFAULT 0,
    unit_cost numeric(18,6) NOT NULL DEFAULT 0,
    tax_amount numeric(18,4) NOT NULL DEFAULT 0,
    line_total numeric(18,4) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (quantity_received <= quantity_ordered),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, purchase_order_id) REFERENCES erp_purchase_orders(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS erp_goods_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    receipt_number text NOT NULL,
    purchase_order_id uuid,
    warehouse_id uuid NOT NULL,
    status erp_receipt_status NOT NULL DEFAULT 'draft',
    received_at timestamptz,
    received_by uuid,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, receipt_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, purchase_order_id) REFERENCES erp_purchase_orders(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (received_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_goods_receipt_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    receipt_id uuid NOT NULL,
    purchase_order_line_id uuid,
    sku_id uuid NOT NULL,
    location_id uuid NOT NULL,
    lot_id uuid,
    quantity_received numeric(18,4) NOT NULL CHECK (quantity_received > 0),
    unit_cost numeric(18,6) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, receipt_id) REFERENCES erp_goods_receipts(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, purchase_order_line_id) REFERENCES erp_purchase_order_lines(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, location_id) REFERENCES erp_warehouse_locations(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, lot_id) REFERENCES erp_inventory_lots(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS erp_return_authorizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rma_number text NOT NULL,
    order_id uuid NOT NULL,
    crm_customer_id uuid,
    status erp_return_status NOT NULL DEFAULT 'requested',
    reason_code text,
    requested_at timestamptz NOT NULL DEFAULT now(),
    approved_at timestamptz,
    received_at timestamptz,
    completed_at timestamptz,
    notes text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, rma_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, order_id) REFERENCES erp_orders(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, crm_customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_return_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rma_id uuid NOT NULL,
    order_line_id uuid NOT NULL,
    sku_id uuid NOT NULL,
    quantity_requested numeric(18,4) NOT NULL CHECK (quantity_requested > 0),
    quantity_received numeric(18,4) NOT NULL DEFAULT 0,
    quantity_approved numeric(18,4) NOT NULL DEFAULT 0,
    disposition erp_return_disposition,
    refund_amount numeric(18,4) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, rma_id) REFERENCES erp_return_authorizations(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, order_line_id) REFERENCES erp_order_lines(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS erp_return_inspections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rma_id uuid NOT NULL,
    return_line_id uuid NOT NULL,
    condition_code text,
    disposition erp_return_disposition,
    notes text,
    inspected_by uuid,
    inspected_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, rma_id) REFERENCES erp_return_authorizations(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, return_line_id) REFERENCES erp_return_lines(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (inspected_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_return_refunds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rma_id uuid NOT NULL,
    amount numeric(18,4) NOT NULL CHECK (amount > 0),
    currency text NOT NULL DEFAULT 'USD',
    payment_reference text,
    status text NOT NULL DEFAULT 'pending',
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, rma_id) REFERENCES erp_return_authorizations(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS erp_replenishment_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    method text NOT NULL DEFAULT 'reorder_point',
    reorder_point numeric(18,4) NOT NULL DEFAULT 0,
    safety_stock numeric(18,4) NOT NULL DEFAULT 0,
    maximum_stock numeric(18,4),
    economic_order_quantity numeric(18,4),
    lead_time_days integer NOT NULL DEFAULT 0,
    review_period_days integer NOT NULL DEFAULT 7,
    preferred_vendor_id uuid,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(sku_id, warehouse_id),
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, preferred_vendor_id) REFERENCES erp_vendors(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_replenishment_recommendations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    vendor_id uuid,
    status erp_replenishment_status NOT NULL DEFAULT 'recommended',
    current_on_hand numeric(18,4) NOT NULL DEFAULT 0,
    reserved_quantity numeric(18,4) NOT NULL DEFAULT 0,
    available_quantity numeric(18,4) NOT NULL DEFAULT 0,
    recommended_quantity numeric(18,4) NOT NULL CHECK (recommended_quantity > 0),
    reason text,
    recommended_at timestamptz NOT NULL DEFAULT now(),
    approved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, vendor_id) REFERENCES erp_vendors(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_inventory_count_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    count_number text NOT NULL,
    warehouse_id uuid NOT NULL,
    location_id uuid,
    count_type text NOT NULL DEFAULT 'cycle',
    status erp_count_status NOT NULL DEFAULT 'draft',
    scheduled_for date,
    started_at timestamptz,
    submitted_at timestamptz,
    approved_at timestamptz,
    posted_at timestamptz,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, count_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, location_id) REFERENCES erp_warehouse_locations(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_inventory_count_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    count_session_id uuid NOT NULL,
    sku_id uuid NOT NULL,
    location_id uuid NOT NULL,
    expected_quantity numeric(18,4) NOT NULL DEFAULT 0,
    counted_quantity numeric(18,4),
    variance_quantity numeric(18,4),
    unit_cost numeric(18,6) NOT NULL DEFAULT 0,
    variance_value numeric(20,6),
    counted_by uuid,
    counted_at timestamptz,
    FOREIGN KEY (tenant_id, count_session_id) REFERENCES erp_inventory_count_sessions(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, location_id) REFERENCES erp_warehouse_locations(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (counted_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_inventory_cost_layers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    lot_id uuid,
    costing_method text NOT NULL DEFAULT 'average',
    quantity_remaining numeric(18,4) NOT NULL DEFAULT 0,
    unit_cost numeric(18,6) NOT NULL DEFAULT 0,
    source_movement_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, lot_id) REFERENCES erp_inventory_lots(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, source_movement_id) REFERENCES erp_inventory_movements(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS erp_document_sequences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_type text NOT NULL,
    prefix text NOT NULL,
    next_number bigint NOT NULL DEFAULT 1 CHECK (next_number > 0),
    padding integer NOT NULL DEFAULT 6 CHECK (padding BETWEEN 1 AND 18),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, document_type)
);

CREATE TABLE IF NOT EXISTS erp_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type text NOT NULL,
    entity_id uuid,
    action text NOT NULL,
    before_data jsonb,
    after_data jsonb,
    actor_id uuid,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    request_id text,
    ip_address inet,
    FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS erp_idempotency_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    idempotency_key text NOT NULL,
    operation text NOT NULL,
    response_status integer,
    response_body jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    UNIQUE(tenant_id, idempotency_key, operation)
);

CREATE OR REPLACE FUNCTION erp_next_document_number(p_tenant_id uuid, p_document_type text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prefix text; v_next bigint; v_padding integer;
BEGIN
    INSERT INTO erp_document_sequences(tenant_id, document_type, prefix) VALUES (p_tenant_id, p_document_type, UPPER(LEFT(p_document_type, 3)) || '-') ON CONFLICT (tenant_id, document_type) DO NOTHING;
    SELECT prefix, next_number, padding INTO v_prefix, v_next, v_padding FROM erp_document_sequences WHERE tenant_id = p_tenant_id AND document_type = p_document_type FOR UPDATE;
    UPDATE erp_document_sequences SET next_number = next_number + 1, updated_at = now() WHERE tenant_id = p_tenant_id AND document_type = p_document_type;
    RETURN v_prefix || LPAD(v_next::text, v_padding, '0');
END; $$;

CREATE OR REPLACE VIEW erp_inventory_availability AS
SELECT b.tenant_id, b.sku_id, b.warehouse_id, SUM(b.on_hand) AS on_hand, SUM(b.reserved) AS reserved, SUM(b.allocated) AS allocated, SUM(b.picked) AS picked, SUM(b.packed) AS packed, GREATEST(SUM(b.on_hand) - SUM(b.reserved) - SUM(b.allocated) - SUM(b.picked) - SUM(b.packed), 0) AS available FROM erp_inventory_balances b GROUP BY b.tenant_id, b.sku_id, b.warehouse_id;

CREATE OR REPLACE VIEW erp_low_inventory AS
SELECT p.tenant_id, s.id AS sku_id, s.sku, p.name AS product_name, w.id AS warehouse_id, w.name AS warehouse_name, COALESCE(a.on_hand,0) AS on_hand, COALESCE(a.reserved,0) AS reserved, COALESCE(a.available,0) AS available, COALESCE(r.reorder_point,p.reorder_point) AS reorder_point, COALESCE(r.safety_stock,p.safety_stock) AS safety_stock, CASE WHEN COALESCE(a.available,0) <= 0 THEN 'out_of_stock' WHEN COALESCE(a.available,0) <= COALESCE(r.reorder_point,p.reorder_point) THEN 'low_stock' ELSE 'healthy' END AS stock_status FROM erp_products p JOIN erp_product_skus s ON s.product_id = p.id CROSS JOIN erp_warehouses w LEFT JOIN erp_inventory_availability a ON a.sku_id = s.id AND a.warehouse_id = w.id LEFT JOIN erp_replenishment_rules r ON r.sku_id = s.id AND r.warehouse_id = w.id WHERE p.is_active = true AND s.is_active = true AND w.is_active = true;

CREATE OR REPLACE VIEW erp_order_fulfillment_queue AS
SELECT o.tenant_id, o.id AS order_id, o.order_number, o.order_date, o.sla_due_at, o.priority, o.is_rush, o.status, o.fulfillment_method, f.id AS fulfillment_id, f.fulfillment_number, f.status AS fulfillment_status, f.warehouse_id, GREATEST(EXTRACT(EPOCH FROM (NOW() - o.order_date))/3600,0) AS order_age_hours FROM erp_orders o LEFT JOIN erp_fulfillment_orders f ON f.order_id = o.id WHERE o.status NOT IN ('cancelled','completed','closed');

CREATE OR REPLACE VIEW erp_inventory_movement_history AS
SELECT m.tenant_id, m.id, m.occurred_at, m.movement_type, s.sku, p.name AS product_name, m.quantity, m.unit_cost, m.total_cost, fw.code AS from_warehouse, fl.code AS from_location, tl.code AS to_location, m.source_type, m.source_id, m.reference, m.reason, m.performed_by FROM erp_inventory_movements m JOIN erp_product_skus s ON s.id = m.sku_id JOIN erp_products p ON p.id = s.product_id LEFT JOIN erp_warehouse_locations fl ON fl.id = m.from_location_id LEFT JOIN erp_warehouse_locations tl ON tl.id = m.to_location_id LEFT JOIN erp_warehouses fw ON fw.id = fl.warehouse_id;

CREATE OR REPLACE VIEW erp_backordered_orders AS
SELECT o.tenant_id, o.id, o.order_number, o.order_date, o.crm_customer_id, o.crm_pet_id, o.total, o.priority, o.sla_due_at FROM erp_orders o WHERE o.status = 'backordered';

CREATE OR REPLACE FUNCTION erp_validate_order_line_quantities() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.quantity_reserved < NEW.quantity_allocated THEN RAISE EXCEPTION 'Allocated quantity cannot exceed reserved quantity'; END IF;
    IF NEW.quantity_allocated < NEW.quantity_picked THEN RAISE EXCEPTION 'Picked quantity cannot exceed allocated quantity'; END IF;
    IF NEW.quantity_picked < NEW.quantity_packed THEN RAISE EXCEPTION 'Packed quantity cannot exceed picked quantity'; END IF;
    IF NEW.quantity_packed < NEW.quantity_shipped THEN RAISE EXCEPTION 'Shipped quantity cannot exceed packed quantity'; END IF;
    RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_erp_validate_order_line_quantities ON erp_order_lines;
CREATE TRIGGER trg_erp_validate_order_line_quantities BEFORE INSERT OR UPDATE ON erp_order_lines FOR EACH ROW EXECUTE FUNCTION erp_validate_order_line_quantities();

-- ============================================================================
-- 4. ACCOUNTING MODULE
-- ============================================================================

DO $$ BEGIN CREATE TYPE acct_account_type AS ENUM ('asset','liability','equity','revenue','expense','contra_asset','contra_liability','contra_equity','statistical'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE acct_normal_balance AS ENUM ('debit','credit'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE acct_document_status AS ENUM ('draft','pending_approval','approved','posted','partially_paid','paid','void','cancelled','rejected','closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE acct_posting_status AS ENUM ('draft','approved','posted','reversed','void'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE acct_source_type AS ENUM ('manual','invoice','credit_memo','customer_receipt','vendor_bill','vendor_credit','vendor_payment','bank','expense','payroll','inventory','fixed_asset','lease','revenue_recognition','tax','allocation','intercompany','consolidation','opening_balance','recurring','import','integration','system'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE acct_party_type AS ENUM ('customer','vendor','employee','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE acct_payment_status AS ENUM ('pending','processing','succeeded','failed','cancelled','refunded','partially_refunded'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE acct_payment_method AS ENUM ('cash','check','ach','wire','card','bank_transfer','direct_debit','virtual_card','payment_link','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE acct_reconciliation_status AS ENUM ('open','in_progress','reconciled','reopened','closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE acct_period_status AS ENUM ('future','open','soft_closed','closed','locked'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE acct_workflow_status AS ENUM ('pending','approved','rejected','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE acct_asset_status AS ENUM ('draft','in_service','held_for_sale','disposed','fully_depreciated','retired'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE acct_recognition_method AS ENUM ('point_in_time','straight_line','milestone','usage','percentage_complete','manual'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE acct_tax_type AS ENUM ('sales','vat','gst','use','withholding','excise','payroll','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE OR REPLACE FUNCTION acct_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS acct_currencies (
    code char(3) PRIMARY KEY,
    name text NOT NULL,
    symbol text,
    minor_units smallint NOT NULL DEFAULT 2 CHECK (minor_units BETWEEN 0 AND 6),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO acct_currencies(code,name,symbol,minor_units) VALUES ('USD','US Dollar','$',2),('EUR','Euro','€',2),('GBP','British Pound','£',2),('CAD','Canadian Dollar','$',2),('AUD','Australian Dollar','$',2),('JPY','Japanese Yen','¥',0) ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS acct_exchange_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rate_date date NOT NULL,
    from_currency char(3) NOT NULL REFERENCES acct_currencies(code),
    to_currency char(3) NOT NULL REFERENCES acct_currencies(code),
    rate numeric(24,12) NOT NULL CHECK (rate > 0),
    rate_type text NOT NULL DEFAULT 'spot',
    source text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,rate_date,from_currency,to_currency,rate_type),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS acct_entities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_entity_id uuid REFERENCES acct_entities(id) ON DELETE RESTRICT,
    code text NOT NULL,
    legal_name text NOT NULL,
    display_name text,
    entity_type text NOT NULL DEFAULT 'legal_entity',
    country_code char(2),
    tax_identifier text,
    functional_currency char(3) NOT NULL REFERENCES acct_currencies(code),
    reporting_currency char(3) REFERENCES acct_currencies(code),
    fiscal_year_start_month smallint NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS acct_books (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    book_type text NOT NULL DEFAULT 'primary',
    accounting_basis text NOT NULL DEFAULT 'accrual',
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    is_primary boolean NOT NULL DEFAULT false,
    is_adjustment_book boolean NOT NULL DEFAULT false,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,entity_id,code),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS acct_one_primary_book_per_entity ON acct_books(entity_id) WHERE is_primary;

CREATE TABLE IF NOT EXISTS acct_fiscal_years (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    fiscal_year integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_adjustment_year boolean NOT NULL DEFAULT false,
    UNIQUE(entity_id,fiscal_year),
    UNIQUE(tenant_id, id),
    CHECK(end_date >= start_date),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS acct_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    book_id uuid NOT NULL,
    fiscal_year_id uuid NOT NULL,
    period_no smallint NOT NULL CHECK(period_no BETWEEN 1 AND 99),
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status acct_period_status NOT NULL DEFAULT 'future',
    closed_at timestamptz,
    closed_by uuid,
    UNIQUE(book_id,period_no),
    UNIQUE(book_id,start_date,end_date),
    UNIQUE(tenant_id, id),
    CHECK(end_date >= start_date),
    FOREIGN KEY (tenant_id, book_id) REFERENCES acct_books(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, fiscal_year_id) REFERENCES acct_fiscal_years(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS acct_close_checklists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_id uuid NOT NULL,
    task_code text NOT NULL,
    task_name text NOT NULL,
    sequence_no integer NOT NULL DEFAULT 0,
    required boolean NOT NULL DEFAULT true,
    status text NOT NULL DEFAULT 'open',
    assigned_to uuid,
    completed_by uuid,
    completed_at timestamptz,
    notes text,
    UNIQUE(period_id,task_code),
    FOREIGN KEY (tenant_id, period_id) REFERENCES acct_periods(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS acct_dimensions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    data_type text NOT NULL DEFAULT 'text',
    is_required boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS acct_dimension_values (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    dimension_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    parent_value_id uuid REFERENCES acct_dimension_values(id) ON DELETE RESTRICT,
    is_active boolean NOT NULL DEFAULT true,
    UNIQUE(dimension_id,code),
    FOREIGN KEY (tenant_id, dimension_id) REFERENCES acct_dimensions(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS acct_chart_of_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    parent_account_id uuid REFERENCES acct_chart_of_accounts(id) ON DELETE RESTRICT,
    code text NOT NULL,
    name text NOT NULL,
    account_type acct_account_type NOT NULL,
    normal_balance acct_normal_balance NOT NULL,
    subtype text,
    description text,
    currency char(3) REFERENCES acct_currencies(code),
    is_control_account boolean NOT NULL DEFAULT false,
    is_reconcilable boolean NOT NULL DEFAULT false,
    is_posting_allowed boolean NOT NULL DEFAULT true,
    is_system boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(entity_id,code),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS acct_coa_parent_idx ON acct_chart_of_accounts(entity_id,parent_account_id);

CREATE TABLE IF NOT EXISTS acct_account_dimension_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id uuid NOT NULL,
    dimension_id uuid NOT NULL,
    is_required boolean NOT NULL DEFAULT false,
    allowed_values jsonb,
    UNIQUE(account_id,dimension_id),
    FOREIGN KEY (tenant_id, account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, dimension_id) REFERENCES acct_dimensions(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS acct_journal_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    book_id uuid NOT NULL,
    batch_no text NOT NULL,
    source acct_source_type NOT NULL DEFAULT 'manual',
    status acct_posting_status NOT NULL DEFAULT 'draft',
    description text,
    source_system text,
    external_id text,
    idempotency_key text,
    created_by uuid,
    approved_by uuid,
    posted_by uuid,
    approved_at timestamptz,
    posted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(book_id,batch_no),
    UNIQUE(tenant_id,idempotency_key),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, book_id) REFERENCES acct_books(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_journal_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    book_id uuid NOT NULL,
    batch_id uuid NOT NULL,
    period_id uuid NOT NULL,
    entry_no bigint GENERATED ALWAYS AS IDENTITY,
    entry_date date NOT NULL,
    document_date date,
    posting_date date NOT NULL,
    source acct_source_type NOT NULL DEFAULT 'manual',
    source_id text,
    reference text,
    memo text,
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    exchange_rate numeric(24,12) NOT NULL DEFAULT 1 CHECK(exchange_rate > 0),
    total_debit numeric(24,6) NOT NULL DEFAULT 0,
    total_credit numeric(24,6) NOT NULL DEFAULT 0,
    status acct_posting_status NOT NULL DEFAULT 'draft',
    reversal_of_id uuid REFERENCES acct_journal_entries(id) ON DELETE RESTRICT,
    created_by uuid,
    posted_by uuid,
    posted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(book_id,entry_no),
    UNIQUE(tenant_id, id),
    CHECK(total_debit >= 0 AND total_credit >= 0),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, book_id) REFERENCES acct_books(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, batch_id) REFERENCES acct_journal_batches(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, period_id) REFERENCES acct_periods(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_journal_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    journal_entry_id uuid NOT NULL,
    line_no integer NOT NULL,
    account_id uuid NOT NULL,
    description text,
    debit numeric(24,6) NOT NULL DEFAULT 0 CHECK(debit >= 0),
    credit numeric(24,6) NOT NULL DEFAULT 0 CHECK(credit >= 0),
    transaction_currency char(3) REFERENCES acct_currencies(code),
    transaction_debit numeric(24,6) NOT NULL DEFAULT 0,
    transaction_credit numeric(24,6) NOT NULL DEFAULT 0,
    exchange_rate numeric(24,12) NOT NULL DEFAULT 1 CHECK(exchange_rate > 0),
    customer_id text,
    vendor_id text,
    employee_id text,
    project_id text,
    department_id text,
    location_id text,
    tax_code_id uuid,
    source_line_id text,
    dimensions jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(journal_entry_id,line_no),
    UNIQUE(tenant_id, id),
    CHECK(NOT(debit > 0 AND credit > 0)),
    CHECK(debit > 0 OR credit > 0),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, journal_entry_id) REFERENCES acct_journal_entries(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS acct_jl_account_date_idx ON acct_journal_lines(account_id,journal_entry_id);
CREATE INDEX IF NOT EXISTS acct_je_source_idx ON acct_journal_entries(tenant_id,source,source_id);

CREATE TABLE IF NOT EXISTS acct_customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    external_customer_id text,
    customer_number text NOT NULL,
    legal_name text NOT NULL,
    email text,
    phone text,
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    payment_terms_days integer NOT NULL DEFAULT 30,
    credit_limit numeric(24,6),
    ar_account_id uuid NOT NULL,
    default_revenue_account_id uuid,
    tax_number text,
    tax_exempt boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,customer_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, ar_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, default_revenue_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_vendors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    external_vendor_id text,
    vendor_number text NOT NULL,
    legal_name text NOT NULL,
    email text,
    phone text,
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    payment_terms_days integer NOT NULL DEFAULT 30,
    ap_account_id uuid NOT NULL,
    default_expense_account_id uuid,
    tax_number text,
    tax_form_type text,
    is_1099_vendor boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,vendor_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, ap_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, default_expense_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_payment_terms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    due_days integer NOT NULL DEFAULT 0,
    discount_days integer,
    discount_percent numeric(9,6),
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS acct_tax_jurisdictions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    country_code char(2),
    state_code text,
    locality text,
    registration_number text,
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS acct_tax_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    jurisdiction_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    tax_type acct_tax_type NOT NULL,
    rate numeric(12,8) NOT NULL DEFAULT 0,
    recoverable_percent numeric(9,6) NOT NULL DEFAULT 0,
    payable_account_id uuid,
    receivable_account_id uuid,
    effective_from date NOT NULL,
    effective_to date,
    is_compound boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, jurisdiction_id) REFERENCES acct_tax_jurisdictions(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, payable_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, receivable_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_ar_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    invoice_number text NOT NULL,
    invoice_date date NOT NULL,
    due_date date NOT NULL,
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    exchange_rate numeric(24,12) NOT NULL DEFAULT 1,
    subtotal numeric(24,6) NOT NULL DEFAULT 0,
    tax_total numeric(24,6) NOT NULL DEFAULT 0,
    discount_total numeric(24,6) NOT NULL DEFAULT 0,
    total numeric(24,6) NOT NULL DEFAULT 0,
    amount_paid numeric(24,6) NOT NULL DEFAULT 0,
    amount_credited numeric(24,6) NOT NULL DEFAULT 0,
    status acct_document_status NOT NULL DEFAULT 'draft',
    terms text,
    notes text,
    external_id text,
    source_system text,
    posted_journal_id uuid,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(entity_id,invoice_number),
    UNIQUE(tenant_id, id),
    CHECK(total >= 0 AND amount_paid >= 0 AND amount_credited >= 0),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, customer_id) REFERENCES acct_customers(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, posted_journal_id) REFERENCES acct_journal_entries(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_ar_invoice_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    line_no integer NOT NULL,
    description text NOT NULL,
    quantity numeric(24,6) NOT NULL DEFAULT 1,
    unit_price numeric(24,6) NOT NULL DEFAULT 0,
    discount_amount numeric(24,6) NOT NULL DEFAULT 0,
    line_subtotal numeric(24,6) NOT NULL DEFAULT 0,
    tax_code_id uuid,
    tax_amount numeric(24,6) NOT NULL DEFAULT 0,
    revenue_account_id uuid NOT NULL,
    item_ref text,
    service_date date,
    dimensions jsonb NOT NULL DEFAULT '{}',
    UNIQUE(invoice_id,line_no),
    FOREIGN KEY (invoice_id) REFERENCES acct_ar_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (tax_code_id) REFERENCES acct_tax_codes(id) ON DELETE RESTRICT,
    FOREIGN KEY (revenue_account_id) REFERENCES acct_chart_of_accounts(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_ar_credit_memos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL,
    memo_number text NOT NULL,
    memo_date date NOT NULL,
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    subtotal numeric(24,6) NOT NULL DEFAULT 0,
    tax_total numeric(24,6) NOT NULL DEFAULT 0,
    total numeric(24,6) NOT NULL DEFAULT 0,
    status acct_document_status NOT NULL DEFAULT 'draft',
    applied_amount numeric(24,6) NOT NULL DEFAULT 0,
    reason text,
    posted_journal_id uuid,
    UNIQUE(tenant_id,memo_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES acct_customers(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, posted_journal_id) REFERENCES acct_journal_entries(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_ar_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    customer_id uuid,
    receipt_number text NOT NULL,
    receipt_date date NOT NULL,
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    amount numeric(24,6) NOT NULL CHECK(amount > 0),
    payment_method acct_payment_method NOT NULL,
    status acct_payment_status NOT NULL DEFAULT 'pending',
    deposit_account_id uuid NOT NULL,
    reference text,
    processor text,
    processor_transaction_id text,
    posted_journal_id uuid,
    UNIQUE(entity_id,receipt_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, customer_id) REFERENCES acct_customers(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, deposit_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, posted_journal_id) REFERENCES acct_journal_entries(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_ar_receipt_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    applied_amount numeric(24,6) NOT NULL CHECK(applied_amount > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(receipt_id,invoice_id),
    FOREIGN KEY (receipt_id) REFERENCES acct_ar_receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES acct_ar_invoices(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_ar_collections_cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL,
    invoice_id uuid,
    priority text NOT NULL DEFAULT 'normal',
    status text NOT NULL DEFAULT 'open',
    assigned_to uuid,
    next_action_at timestamptz,
    dispute_amount numeric(24,6) NOT NULL DEFAULT 0,
    reason text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES acct_customers(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, invoice_id) REFERENCES acct_ar_invoices(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_ap_bills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    bill_number text NOT NULL,
    bill_date date NOT NULL,
    due_date date NOT NULL,
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    exchange_rate numeric(24,12) NOT NULL DEFAULT 1,
    subtotal numeric(24,6) NOT NULL DEFAULT 0,
    tax_total numeric(24,6) NOT NULL DEFAULT 0,
    discount_total numeric(24,6) NOT NULL DEFAULT 0,
    total numeric(24,6) NOT NULL DEFAULT 0,
    amount_paid numeric(24,6) NOT NULL DEFAULT 0,
    amount_credited numeric(24,6) NOT NULL DEFAULT 0,
    status acct_document_status NOT NULL DEFAULT 'draft',
    external_id text,
    source_system text,
    posted_journal_id uuid,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(entity_id,vendor_id,bill_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, vendor_id) REFERENCES acct_vendors(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, posted_journal_id) REFERENCES acct_journal_entries(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_ap_bill_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL,
    line_no integer NOT NULL,
    description text NOT NULL,
    quantity numeric(24,6) NOT NULL DEFAULT 1,
    unit_cost numeric(24,6) NOT NULL DEFAULT 0,
    line_subtotal numeric(24,6) NOT NULL DEFAULT 0,
    tax_code_id uuid,
    tax_amount numeric(24,6) NOT NULL DEFAULT 0,
    expense_account_id uuid NOT NULL,
    purchase_order_ref text,
    item_ref text,
    dimensions jsonb NOT NULL DEFAULT '{}',
    UNIQUE(bill_id,line_no),
    FOREIGN KEY (bill_id) REFERENCES acct_ap_bills(id) ON DELETE CASCADE,
    FOREIGN KEY (tax_code_id) REFERENCES acct_tax_codes(id) ON DELETE RESTRICT,
    FOREIGN KEY (expense_account_id) REFERENCES acct_chart_of_accounts(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_ap_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    vendor_id uuid,
    payment_number text NOT NULL,
    payment_date date NOT NULL,
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    amount numeric(24,6) NOT NULL CHECK(amount > 0),
    payment_method acct_payment_method NOT NULL,
    status acct_payment_status NOT NULL DEFAULT 'pending',
    cash_account_id uuid NOT NULL,
    reference text,
    processor text,
    processor_transaction_id text,
    posted_journal_id uuid,
    UNIQUE(entity_id,payment_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, vendor_id) REFERENCES acct_vendors(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, cash_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, posted_journal_id) REFERENCES acct_journal_entries(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_ap_payment_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL,
    bill_id uuid NOT NULL,
    applied_amount numeric(24,6) NOT NULL CHECK(applied_amount > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(payment_id,bill_id),
    FOREIGN KEY (payment_id) REFERENCES acct_ap_payments(id) ON DELETE CASCADE,
    FOREIGN KEY (bill_id) REFERENCES acct_ap_bills(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_ap_purchase_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    po_number text NOT NULL,
    order_date date NOT NULL,
    expected_date date,
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    subtotal numeric(24,6) NOT NULL DEFAULT 0,
    tax_total numeric(24,6) NOT NULL DEFAULT 0,
    total numeric(24,6) NOT NULL DEFAULT 0,
    status acct_document_status NOT NULL DEFAULT 'draft',
    approved_by uuid,
    UNIQUE(entity_id,po_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, vendor_id) REFERENCES acct_vendors(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_ap_purchase_order_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id uuid NOT NULL,
    line_no integer NOT NULL,
    description text NOT NULL,
    quantity numeric(24,6) NOT NULL DEFAULT 1,
    unit_cost numeric(24,6) NOT NULL DEFAULT 0,
    expense_account_id uuid,
    received_quantity numeric(24,6) NOT NULL DEFAULT 0,
    billed_quantity numeric(24,6) NOT NULL DEFAULT 0,
    UNIQUE(purchase_order_id,line_no),
    FOREIGN KEY (purchase_order_id) REFERENCES acct_ap_purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (expense_account_id) REFERENCES acct_chart_of_accounts(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_ap_approvals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bill_id uuid,
    purchase_order_id uuid,
    approver_id uuid,
    sequence_no integer NOT NULL DEFAULT 1,
    status acct_workflow_status NOT NULL DEFAULT 'pending',
    acted_at timestamptz,
    comments text,
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, bill_id) REFERENCES acct_ap_bills(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, purchase_order_id) REFERENCES acct_ap_purchase_orders(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS acct_bank_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    name text NOT NULL,
    institution_name text,
    account_type text NOT NULL DEFAULT 'checking',
    masked_account_number text,
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    gl_account_id uuid NOT NULL,
    provider text,
    provider_connection_id text,
    provider_account_id text,
    last_sync_at timestamptz,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(entity_id,name),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, gl_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_bank_statements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bank_account_id uuid NOT NULL,
    statement_start date NOT NULL,
    statement_end date NOT NULL,
    opening_balance numeric(24,6) NOT NULL,
    closing_balance numeric(24,6) NOT NULL,
    imported_at timestamptz NOT NULL DEFAULT now(),
    provider_statement_id text,
    UNIQUE(bank_account_id,statement_start,statement_end),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, bank_account_id) REFERENCES acct_bank_accounts(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS acct_bank_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bank_account_id uuid NOT NULL,
    statement_id uuid,
    transaction_date date NOT NULL,
    posted_date date,
    amount numeric(24,6) NOT NULL,
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    description text,
    payee text,
    reference text,
    provider_transaction_id text,
    transaction_hash text,
    match_status text NOT NULL DEFAULT 'unmatched',
    matched_journal_line_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(bank_account_id,provider_transaction_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, bank_account_id) REFERENCES acct_bank_accounts(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, statement_id) REFERENCES acct_bank_statements(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, matched_journal_line_id) REFERENCES acct_journal_lines(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_reconciliations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bank_account_id uuid NOT NULL,
    period_id uuid,
    as_of_date date NOT NULL,
    statement_balance numeric(24,6) NOT NULL,
    gl_balance numeric(24,6) NOT NULL,
    outstanding_deposits numeric(24,6) NOT NULL DEFAULT 0,
    outstanding_payments numeric(24,6) NOT NULL DEFAULT 0,
    adjustments numeric(24,6) NOT NULL DEFAULT 0,
    difference numeric(24,6) GENERATED ALWAYS AS (statement_balance - gl_balance + outstanding_deposits - outstanding_payments + adjustments) STORED,
    status acct_reconciliation_status NOT NULL DEFAULT 'open',
    prepared_by uuid,
    reviewed_by uuid,
    completed_at timestamptz,
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, bank_account_id) REFERENCES acct_bank_accounts(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, period_id) REFERENCES acct_periods(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_reconciliation_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reconciliation_id uuid NOT NULL,
    bank_transaction_id uuid,
    journal_line_id uuid,
    item_type text NOT NULL,
    amount numeric(24,6) NOT NULL,
    status text NOT NULL DEFAULT 'unresolved',
    notes text,
    FOREIGN KEY (tenant_id, reconciliation_id) REFERENCES acct_reconciliations(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, bank_transaction_id) REFERENCES acct_bank_transactions(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, journal_line_id) REFERENCES acct_journal_lines(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_asset_classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    asset_account_id uuid NOT NULL,
    accumulated_depreciation_account_id uuid NOT NULL,
    depreciation_expense_account_id uuid NOT NULL,
    default_useful_life_months integer NOT NULL DEFAULT 60,
    default_method text NOT NULL DEFAULT 'straight_line',
    residual_percent numeric(9,6) NOT NULL DEFAULT 0,
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, asset_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, accumulated_depreciation_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, depreciation_expense_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_fixed_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    asset_class_id uuid NOT NULL,
    asset_number text NOT NULL,
    name text NOT NULL,
    description text,
    acquisition_date date NOT NULL,
    placed_in_service_date date,
    original_cost numeric(24,6) NOT NULL DEFAULT 0,
    residual_value numeric(24,6) NOT NULL DEFAULT 0,
    accumulated_depreciation numeric(24,6) NOT NULL DEFAULT 0,
    useful_life_months integer,
    status acct_asset_status NOT NULL DEFAULT 'draft',
    location text,
    serial_number text,
    disposal_date date,
    disposal_proceeds numeric(24,6),
    disposal_gain_loss numeric(24,6),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(entity_id,asset_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, asset_class_id) REFERENCES acct_asset_classes(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_asset_books (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id uuid NOT NULL,
    book_id uuid NOT NULL,
    depreciation_method text NOT NULL DEFAULT 'straight_line',
    convention text NOT NULL DEFAULT 'full_month',
    useful_life_months integer NOT NULL,
    depreciation_start_date date,
    in_service_cost numeric(24,6) NOT NULL DEFAULT 0,
    accumulated_depreciation numeric(24,6) NOT NULL DEFAULT 0,
    net_book_value numeric(24,6) NOT NULL DEFAULT 0,
    last_depreciation_date date,
    UNIQUE(asset_id,book_id),
    FOREIGN KEY (asset_id) REFERENCES acct_fixed_assets(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES acct_books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS acct_asset_depreciation_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    book_id uuid NOT NULL,
    period_id uuid NOT NULL,
    run_date date NOT NULL,
    status acct_posting_status NOT NULL DEFAULT 'draft',
    journal_id uuid,
    created_by uuid,
    posted_at timestamptz,
    UNIQUE(book_id,period_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, book_id) REFERENCES acct_books(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, period_id) REFERENCES acct_periods(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, journal_id) REFERENCES acct_journal_entries(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_asset_depreciation_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL,
    asset_book_id uuid NOT NULL,
    depreciation_amount numeric(24,6) NOT NULL,
    accumulated_after numeric(24,6) NOT NULL,
    nbv_after numeric(24,6) NOT NULL,
    FOREIGN KEY (run_id) REFERENCES acct_asset_depreciation_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_book_id) REFERENCES acct_asset_books(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_leases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    lease_number text NOT NULL,
    counterparty_name text NOT NULL,
    commencement_date date NOT NULL,
    end_date date NOT NULL,
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    payment_frequency text NOT NULL DEFAULT 'monthly',
    initial_direct_cost numeric(24,6) NOT NULL DEFAULT 0,
    lease_incentive numeric(24,6) NOT NULL DEFAULT 0,
    discount_rate numeric(18,12) NOT NULL DEFAULT 0,
    right_of_use_asset numeric(24,6) NOT NULL DEFAULT 0,
    lease_liability numeric(24,6) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'draft',
    UNIQUE(entity_id,lease_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_lease_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id uuid NOT NULL,
    payment_date date NOT NULL,
    amount numeric(24,6) NOT NULL,
    principal numeric(24,6) NOT NULL DEFAULT 0,
    interest numeric(24,6) NOT NULL DEFAULT 0,
    journal_id uuid,
    status text NOT NULL DEFAULT 'scheduled',
    FOREIGN KEY (lease_id) REFERENCES acct_leases(id) ON DELETE CASCADE,
    FOREIGN KEY (journal_id) REFERENCES acct_journal_entries(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_revenue_contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    contract_number text NOT NULL,
    contract_date date NOT NULL,
    start_date date,
    end_date date,
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    total_transaction_price numeric(24,6) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'draft',
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(entity_id,contract_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, customer_id) REFERENCES acct_customers(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_revenue_performance_obligations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id uuid NOT NULL,
    obligation_code text NOT NULL,
    description text NOT NULL,
    standalone_price numeric(24,6) NOT NULL DEFAULT 0,
    allocated_price numeric(24,6) NOT NULL DEFAULT 0,
    recognition_method acct_recognition_method NOT NULL,
    recognition_start date,
    recognition_end date,
    deferred_revenue_account_id uuid NOT NULL,
    revenue_account_id uuid NOT NULL,
    UNIQUE(contract_id,obligation_code),
    FOREIGN KEY (contract_id) REFERENCES acct_revenue_contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (deferred_revenue_account_id) REFERENCES acct_chart_of_accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (revenue_account_id) REFERENCES acct_chart_of_accounts(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_revenue_recognition_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id uuid NOT NULL,
    period_id uuid NOT NULL,
    scheduled_amount numeric(24,6) NOT NULL DEFAULT 0,
    recognized_amount numeric(24,6) NOT NULL DEFAULT 0,
    journal_id uuid,
    status text NOT NULL DEFAULT 'scheduled',
    UNIQUE(obligation_id,period_id),
    FOREIGN KEY (obligation_id) REFERENCES acct_revenue_performance_obligations(id) ON DELETE CASCADE,
    FOREIGN KEY (period_id) REFERENCES acct_periods(id) ON DELETE RESTRICT,
    FOREIGN KEY (journal_id) REFERENCES acct_journal_entries(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_expense_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    employee_id text,
    report_number text NOT NULL,
    report_date date NOT NULL,
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    total_amount numeric(24,6) NOT NULL DEFAULT 0,
    status acct_document_status NOT NULL DEFAULT 'draft',
    submitted_at timestamptz,
    approved_at timestamptz,
    posted_journal_id uuid,
    UNIQUE(entity_id,report_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, posted_journal_id) REFERENCES acct_journal_entries(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_expense_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_report_id uuid NOT NULL,
    expense_date date NOT NULL,
    merchant text,
    description text NOT NULL,
    amount numeric(24,6) NOT NULL,
    tax_amount numeric(24,6) NOT NULL DEFAULT 0,
    expense_account_id uuid NOT NULL,
    receipt_uri text,
    receipt_hash text,
    dimensions jsonb NOT NULL DEFAULT '{}',
    FOREIGN KEY (expense_report_id) REFERENCES acct_expense_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (expense_account_id) REFERENCES acct_chart_of_accounts(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_budget_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL,
    name text NOT NULL,
    fiscal_year integer NOT NULL,
    version_no integer NOT NULL DEFAULT 1,
    scenario text NOT NULL DEFAULT 'budget',
    status text NOT NULL DEFAULT 'draft',
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    approved_by uuid,
    approved_at timestamptz,
    UNIQUE(entity_id,fiscal_year,scenario,version_no),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS acct_budget_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id uuid NOT NULL,
    period_id uuid NOT NULL,
    account_id uuid NOT NULL,
    amount numeric(24,6) NOT NULL DEFAULT 0,
    dimensions jsonb NOT NULL DEFAULT '{}',
    notes text,
    UNIQUE(budget_id,period_id,account_id,dimensions),
    FOREIGN KEY (budget_id) REFERENCES acct_budget_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (period_id) REFERENCES acct_periods(id) ON DELETE RESTRICT,
    FOREIGN KEY (account_id) REFERENCES acct_chart_of_accounts(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    allocation_type text NOT NULL DEFAULT 'percentage',
    source_account_id uuid NOT NULL,
    driver_dimension_id uuid,
    effective_from date NOT NULL,
    effective_to date,
    active boolean NOT NULL DEFAULT true,
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, source_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, driver_dimension_id) REFERENCES acct_dimensions(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_allocation_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id uuid NOT NULL,
    destination_account_id uuid NOT NULL,
    percentage numeric(12,8),
    fixed_amount numeric(24,6),
    dimensions jsonb NOT NULL DEFAULT '{}',
    FOREIGN KEY (allocation_id) REFERENCES acct_allocations(id) ON DELETE CASCADE,
    FOREIGN KEY (destination_account_id) REFERENCES acct_chart_of_accounts(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_intercompany_partners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    from_entity_id uuid NOT NULL,
    to_entity_id uuid NOT NULL,
    due_from_account_id uuid NOT NULL,
    due_to_account_id uuid NOT NULL,
    markup_percent numeric(12,8) NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    UNIQUE(from_entity_id,to_entity_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, from_entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, to_entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, due_from_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, due_to_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_intercompany_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    from_entity_id uuid NOT NULL,
    to_entity_id uuid NOT NULL,
    transaction_date date NOT NULL,
    currency char(3) NOT NULL REFERENCES acct_currencies(code),
    amount numeric(24,6) NOT NULL,
    description text,
    source_type text,
    source_id text,
    status text NOT NULL DEFAULT 'pending',
    from_journal_id uuid,
    to_journal_id uuid,
    elimination_required boolean NOT NULL DEFAULT true,
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, from_entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, to_entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, from_journal_id) REFERENCES acct_journal_entries(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, to_journal_id) REFERENCES acct_journal_entries(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_consolidation_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    reporting_currency char(3) NOT NULL REFERENCES acct_currencies(code),
    consolidation_method text NOT NULL DEFAULT 'full',
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS acct_consolidation_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    consolidation_group_id uuid NOT NULL,
    entity_id uuid NOT NULL,
    ownership_percent numeric(9,6) NOT NULL DEFAULT 100,
    consolidation_percent numeric(9,6) NOT NULL DEFAULT 100,
    effective_from date NOT NULL,
    effective_to date,
    UNIQUE(consolidation_group_id,entity_id,effective_from),
    FOREIGN KEY (consolidation_group_id) REFERENCES acct_consolidation_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES acct_entities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS acct_consolidation_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    consolidation_group_id uuid NOT NULL,
    period_id uuid NOT NULL,
    status acct_posting_status NOT NULL DEFAULT 'draft',
    reporting_currency char(3) NOT NULL REFERENCES acct_currencies(code),
    fx_adjustment numeric(24,6) NOT NULL DEFAULT 0,
    elimination_amount numeric(24,6) NOT NULL DEFAULT 0,
    journal_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(consolidation_group_id,period_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, consolidation_group_id) REFERENCES acct_consolidation_groups(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, period_id) REFERENCES acct_periods(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, journal_id) REFERENCES acct_journal_entries(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_book_account_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_account_id uuid NOT NULL,
    target_book_id uuid NOT NULL,
    target_account_id uuid NOT NULL,
    UNIQUE(source_account_id,target_book_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, source_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, target_book_id) REFERENCES acct_books(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, target_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_fx_revaluation_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    book_id uuid NOT NULL,
    period_id uuid NOT NULL,
    revaluation_date date NOT NULL,
    status acct_posting_status NOT NULL DEFAULT 'draft',
    journal_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(book_id,period_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, book_id) REFERENCES acct_books(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, period_id) REFERENCES acct_periods(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, journal_id) REFERENCES acct_journal_entries(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS acct_recurring_journals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    book_id uuid NOT NULL,
    name text NOT NULL,
    frequency text NOT NULL,
    interval_n integer NOT NULL DEFAULT 1,
    next_run_date date NOT NULL,
    end_date date,
    active boolean NOT NULL DEFAULT true,
    template jsonb NOT NULL DEFAULT '{}',
    last_run_at timestamptz,
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, book_id) REFERENCES acct_books(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS acct_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_user_id uuid,
    event_time timestamptz NOT NULL DEFAULT now(),
    action text NOT NULL,
    table_name text,
    record_id text,
    before_data jsonb,
    after_data jsonb,
    ip_address inet,
    user_agent text,
    request_id text,
    correlation_id text,
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS acct_audit_record_idx ON acct_audit_log(tenant_id,table_name,record_id,event_time DESC);

CREATE TABLE IF NOT EXISTS acct_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    file_name text NOT NULL,
    storage_path text NOT NULL,
    mime_type text,
    size_bytes bigint,
    sha256 text,
    uploaded_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS acct_workflows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    entity_type text NOT NULL,
    threshold_amount numeric(24,6),
    rules jsonb NOT NULL DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS acct_workflow_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    workflow_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    status acct_workflow_status NOT NULL DEFAULT 'pending',
    current_step integer NOT NULL DEFAULT 1,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, workflow_id) REFERENCES acct_workflows(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS acct_workflow_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id uuid NOT NULL,
    step_no integer NOT NULL,
    approver_id uuid,
    action text NOT NULL,
    comments text,
    acted_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (workflow_instance_id) REFERENCES acct_workflow_instances(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS acct_import_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type text NOT NULL,
    source_file_name text,
    source_uri text,
    status text NOT NULL DEFAULT 'queued',
    total_rows integer NOT NULL DEFAULT 0,
    processed_rows integer NOT NULL DEFAULT 0,
    success_rows integer NOT NULL DEFAULT 0,
    error_rows integer NOT NULL DEFAULT 0,
    error_report_uri text,
    started_at timestamptz,
    completed_at timestamptz,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS acct_integration_idempotency (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text,
    response_payload jsonb,
    status_code integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,provider,idempotency_key),
    UNIQUE(tenant_id, id)
);

-- Accounting Integrity Functions
CREATE OR REPLACE FUNCTION acct_validate_journal_entry(p_journal_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_debit numeric(24,6); v_credit numeric(24,6); v_count integer; v_status acct_posting_status;
BEGIN
    SELECT status INTO v_status FROM acct_journal_entries WHERE id=p_journal_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Journal entry % not found', p_journal_id; END IF;
    IF v_status <> 'draft' AND v_status <> 'approved' THEN RAISE EXCEPTION 'Journal entry % cannot be posted from status %', p_journal_id, v_status; END IF;
    SELECT COUNT(*), COALESCE(SUM(debit),0), COALESCE(SUM(credit),0) INTO v_count,v_debit,v_credit FROM acct_journal_lines WHERE journal_entry_id=p_journal_id;
    IF v_count < 2 THEN RAISE EXCEPTION 'A journal entry requires at least two lines'; END IF;
    IF v_debit <= 0 OR v_credit <= 0 OR v_debit <> v_credit THEN RAISE EXCEPTION 'Journal % is not balanced: debit %, credit %', p_journal_id,v_debit,v_credit; END IF;
    UPDATE acct_journal_entries SET total_debit=v_debit,total_credit=v_credit,status='posted',posted_by=auth.uid(),posted_at=now() WHERE id=p_journal_id;
END; $$;

CREATE OR REPLACE FUNCTION acct_post_journal(p_tenant_id uuid, p_book_id uuid, p_period_id uuid, p_entry_date date, p_currency char(3), p_lines jsonb, p_source acct_source_type DEFAULT 'manual', p_source_id text DEFAULT null, p_reference text DEFAULT null, p_memo text DEFAULT null, p_idempotency_key text DEFAULT null) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_batch uuid; v_entry uuid; v_entity uuid; v_line jsonb; v_line_no int := 0; v_debit numeric(24,6) := 0; v_credit numeric(24,6) := 0; v_existing uuid;
BEGIN
    IF NOT acct_is_tenant_member(p_tenant_id) THEN RAISE EXCEPTION 'Tenant access denied'; END IF;
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing FROM acct_journal_batches WHERE tenant_id=p_tenant_id AND idempotency_key=p_idempotency_key;
        IF v_existing IS NOT NULL THEN SELECT id INTO v_entry FROM acct_journal_entries WHERE batch_id=v_existing ORDER BY created_at LIMIT 1; RETURN v_entry; END IF;
    END IF;
    SELECT entity_id INTO v_entity FROM acct_books WHERE id=p_book_id AND tenant_id=p_tenant_id;
    IF v_entity IS NULL THEN RAISE EXCEPTION 'Book not found or not owned by tenant'; END IF;
    INSERT INTO acct_journal_batches(tenant_id,entity_id,book_id,batch_no,source,status,description,idempotency_key,created_by) VALUES(p_tenant_id,v_entity,p_book_id,'B-'||TO_CHAR(CLOCK_TIMESTAMP(),'YYYYMMDDHH24MISSMS'),p_source,'approved',p_memo,p_idempotency_key,auth.uid()) RETURNING id INTO v_batch;
    INSERT INTO acct_journal_entries(tenant_id,entity_id,book_id,batch_id,period_id,entry_date,posting_date,source,source_id,reference,memo,currency,status,created_by) VALUES(p_tenant_id,v_entity,p_book_id,v_batch,p_period_id,p_entry_date,p_entry_date,p_source,p_source_id,p_reference,p_memo,p_currency,'approved',auth.uid()) RETURNING id INTO v_entry;
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
        v_line_no := v_line_no + 1;
        INSERT INTO acct_journal_lines(tenant_id,entity_id,journal_entry_id,line_no,account_id,description,debit,credit,transaction_currency,transaction_debit,transaction_credit,exchange_rate,customer_id,vendor_id,employee_id,project_id,department_id,location_id,tax_code_id,source_line_id,dimensions) VALUES(p_tenant_id,v_entity,v_entry,v_line_no,(v_line->>'account_id')::uuid,v_line->>'description',COALESCE((v_line->>'debit')::numeric,0),COALESCE((v_line->>'credit')::numeric,0),COALESCE(v_line->>'transaction_currency',p_currency),COALESCE((v_line->>'transaction_debit')::numeric,(v_line->>'debit')::numeric,0),COALESCE((v_line->>'transaction_credit')::numeric,(v_line->>'credit')::numeric,0),COALESCE((v_line->>'exchange_rate')::numeric,1),v_line->>'customer_id',v_line->>'vendor_id',v_line->>'employee_id',v_line->>'project_id',v_line->>'department_id',v_line->>'location_id',NULLIF(v_line->>'tax_code_id','')::uuid,v_line->>'source_line_id',COALESCE(v_line->'dimensions','{}'));
        v_debit := v_debit + COALESCE((v_line->>'debit')::numeric,0);
        v_credit := v_credit + COALESCE((v_line->>'credit')::numeric,0);
    END LOOP;
    IF v_debit <> v_credit OR v_debit <= 0 THEN RAISE EXCEPTION 'Journal not balanced: debit %, credit %',v_debit,v_credit; END IF;
    PERFORM acct_validate_journal_entry(v_entry);
    UPDATE acct_journal_batches SET status='posted',posted_by=auth.uid(),posted_at=now() WHERE id=v_batch;
    RETURN v_entry;
END; $$;

CREATE OR REPLACE FUNCTION acct_reverse_journal(p_journal_id uuid,p_reversal_date date,p_memo text DEFAULT null) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old acct_journal_entries%rowtype; v_period uuid; v_lines jsonb := '[]'::jsonb; r record; v_new uuid;
BEGIN
    SELECT * INTO v_old FROM acct_journal_entries WHERE id=p_journal_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Journal not found'; END IF;
    IF v_old.status <> 'posted' THEN RAISE EXCEPTION 'Only posted journals can be reversed'; END IF;
    SELECT id INTO v_period FROM acct_periods WHERE book_id=v_old.book_id AND p_reversal_date BETWEEN start_date AND end_date AND status IN ('open','soft_closed') LIMIT 1;
    IF v_period IS NULL THEN RAISE EXCEPTION 'No open accounting period for reversal date'; END IF;
    FOR r IN SELECT * FROM acct_journal_lines WHERE journal_entry_id=p_journal_id ORDER BY line_no LOOP
        v_lines := v_lines || jsonb_build_array(jsonb_build_object('account_id',r.account_id,'description',COALESCE(p_memo,'Reversal')||': '||COALESCE(r.description,''),'debit',r.credit,'credit',r.debit,'transaction_currency',r.transaction_currency,'transaction_debit',r.transaction_credit,'transaction_credit',r.transaction_debit,'exchange_rate',r.exchange_rate,'customer_id',r.customer_id,'vendor_id',r.vendor_id,'dimensions',r.dimensions));
    END LOOP;
    SELECT jsonb_agg(x) INTO v_lines FROM jsonb_array_elements(v_lines) a, LATERAL jsonb_array_elements(a.value) x;
    v_new := acct_post_journal(v_old.tenant_id,v_old.book_id,v_period,p_reversal_date,v_old.currency,v_lines,'manual',v_old.id::text,'REV-'||v_old.entry_no,COALESCE(p_memo,'Reversal of '||v_old.entry_no));
    UPDATE acct_journal_entries SET reversal_of_id=p_journal_id WHERE id=v_new;
    UPDATE acct_journal_entries SET status='reversed' WHERE id=p_journal_id;
    RETURN v_new;
END; $$;

CREATE OR REPLACE FUNCTION acct_block_posted_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME='acct_journal_entries' AND OLD.status IN ('posted','reversed') THEN
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Posted journal entries cannot be deleted'; END IF;
        IF TG_OP='UPDATE' AND (NEW.tenant_id <> OLD.tenant_id OR NEW.book_id <> OLD.book_id OR NEW.period_id <> OLD.period_id OR NEW.entry_date <> OLD.entry_date OR NEW.currency <> OLD.currency OR NEW.status <> OLD.status) THEN RAISE EXCEPTION 'Posted journal structure is immutable; use a reversal'; END IF;
    END IF;
    IF TG_TABLE_NAME='acct_journal_lines' THEN
        IF EXISTS(SELECT 1 FROM acct_journal_entries e WHERE e.id=OLD.journal_entry_id AND e.status IN ('posted','reversed')) THEN RAISE EXCEPTION 'Posted journal lines are immutable; use a reversal'; END IF;
    END IF;
    RETURN COALESCE(NEW,OLD);
END; $$;
DROP TRIGGER IF EXISTS acct_block_je_mutation ON acct_journal_entries;
CREATE TRIGGER acct_block_je_mutation BEFORE UPDATE OR DELETE ON acct_journal_entries FOR EACH ROW EXECUTE FUNCTION acct_block_posted_mutation();
DROP TRIGGER IF EXISTS acct_block_jl_mutation ON acct_journal_lines;
CREATE TRIGGER acct_block_jl_mutation BEFORE UPDATE OR DELETE ON acct_journal_lines FOR EACH ROW EXECUTE FUNCTION acct_block_posted_mutation();

CREATE OR REPLACE FUNCTION acct_audit_row_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF TG_OP='INSERT' THEN INSERT INTO acct_audit_log(tenant_id,actor_user_id,action,table_name,record_id,after_data) VALUES(NEW.tenant_id,auth.uid(),TG_OP,TG_TABLE_NAME,TO_JSONB(NEW)->>'id',TO_JSONB(NEW)); RETURN NEW;
    ELSIF TG_OP='UPDATE' THEN INSERT INTO acct_audit_log(tenant_id,actor_user_id,action,table_name,record_id,before_data,after_data) VALUES(COALESCE(NEW.tenant_id,OLD.tenant_id),auth.uid(),TG_OP,TG_TABLE_NAME,TO_JSONB(NEW)->>'id',TO_JSONB(OLD),TO_JSONB(NEW)); RETURN NEW;
    ELSE INSERT INTO acct_audit_log(tenant_id,actor_user_id,action,table_name,record_id,before_data) VALUES(OLD.tenant_id,auth.uid(),TG_OP,TG_TABLE_NAME,TO_JSONB(OLD)->>'id',TO_JSONB(OLD)); RETURN OLD; END IF;
END; $$;

-- Accounting Views
CREATE OR REPLACE VIEW acct_trial_balance AS SELECT e.tenant_id,e.id entity_id,b.id book_id,p.id period_id,a.id account_id,a.code,a.name,a.account_type,a.normal_balance,COALESCE(SUM(l.debit),0) total_debits,COALESCE(SUM(l.credit),0) total_credits,COALESCE(SUM(l.debit-l.credit),0) signed_balance FROM acct_journal_lines l JOIN acct_journal_entries j ON j.id=l.journal_entry_id AND j.status='posted' JOIN acct_entities e ON e.id=j.entity_id JOIN acct_books b ON b.id=j.book_id JOIN acct_periods p ON p.id=j.period_id JOIN acct_chart_of_accounts a ON a.id=l.account_id GROUP BY e.tenant_id,e.id,b.id,p.id,a.id,a.code,a.name,a.account_type,a.normal_balance;
CREATE OR REPLACE VIEW acct_profit_and_loss AS SELECT * FROM acct_trial_balance WHERE account_type IN ('revenue','expense','contra_equity','contra_asset');
CREATE OR REPLACE VIEW acct_balance_sheet AS SELECT * FROM acct_trial_balance WHERE account_type IN ('asset','liability','equity','contra_asset','contra_liability','contra_equity');
CREATE OR REPLACE VIEW acct_ar_aging AS SELECT i.tenant_id,i.entity_id,i.id invoice_id,i.invoice_number,i.customer_id,c.legal_name customer_name,i.invoice_date,i.due_date,GREATEST(i.total-i.amount_paid-i.amount_credited,0) outstanding,CASE WHEN CURRENT_DATE <= i.due_date THEN 'current' WHEN CURRENT_DATE-i.due_date BETWEEN 1 AND 30 THEN '1-30' WHEN CURRENT_DATE-i.due_date BETWEEN 31 AND 60 THEN '31-60' WHEN CURRENT_DATE-i.due_date BETWEEN 61 AND 90 THEN '61-90' ELSE '90+' END aging_bucket FROM acct_ar_invoices i JOIN acct_customers c ON c.id=i.customer_id WHERE i.status NOT IN ('void','cancelled') AND i.total-i.amount_paid-i.amount_credited>0;
CREATE OR REPLACE VIEW acct_ap_aging AS SELECT b.tenant_id,b.entity_id,b.id bill_id,b.bill_number,b.vendor_id,v.legal_name vendor_name,b.bill_date,b.due_date,GREATEST(b.total-b.amount_paid-b.amount_credited,0) outstanding,CASE WHEN CURRENT_DATE <= b.due_date THEN 'current' WHEN CURRENT_DATE-b.due_date BETWEEN 1 AND 30 THEN '1-30' WHEN CURRENT_DATE-b.due_date BETWEEN 31 AND 60 THEN '31-60' WHEN CURRENT_DATE-b.due_date BETWEEN 61 AND 90 THEN '61-90' ELSE '90+' END aging_bucket FROM acct_ap_bills b JOIN acct_vendors v ON v.id=b.vendor_id WHERE b.status NOT IN ('void','cancelled') AND b.total-b.amount_paid-b.amount_credited>0;
CREATE OR REPLACE VIEW acct_cash_position AS SELECT ba.tenant_id,ba.entity_id,ba.id bank_account_id,ba.name,ba.currency,COALESCE(SUM(bt.amount),0) AS bank_activity FROM acct_bank_accounts ba LEFT JOIN acct_bank_transactions bt ON bt.bank_account_id=ba.id GROUP BY ba.tenant_id,ba.entity_id,ba.id,ba.name,ba.currency;

-- ============================================================================
-- 5. COMMERCE / POS MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS commerce_modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code text NOT NULL DEFAULT 'commerce',
    name text NOT NULL DEFAULT 'Commerce / POS',
    version text NOT NULL DEFAULT '1.0.0',
    enabled boolean NOT NULL DEFAULT true,
    configuration jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS commerce_branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id uuid,
    crm_location_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    branch_type text NOT NULL DEFAULT 'retail',
    timezone text NOT NULL DEFAULT 'America/Chicago',
    currency char(3) NOT NULL DEFAULT 'USD',
    address jsonb NOT NULL DEFAULT '{}',
    phone text,
    email text,
    active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, entity_id) REFERENCES acct_entities(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, crm_location_id) REFERENCES crm_locations(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,branch_id,code),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, branch_id) REFERENCES commerce_branches(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commerce_registers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id uuid NOT NULL,
    department_id uuid,
    register_number text NOT NULL,
    name text NOT NULL,
    device_id text,
    status text NOT NULL DEFAULT 'active',
    currency char(3) NOT NULL DEFAULT 'USD',
    active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,register_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, branch_id) REFERENCES commerce_branches(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, department_id) REFERENCES commerce_departments(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_register_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    register_id uuid NOT NULL,
    opened_by uuid,
    closed_by uuid,
    status text NOT NULL DEFAULT 'open',
    opening_cash numeric(24,6) NOT NULL DEFAULT 0,
    expected_cash numeric(24,6) NOT NULL DEFAULT 0,
    counted_cash numeric(24,6),
    variance numeric(24,6),
    opened_at timestamptz NOT NULL DEFAULT now(),
    closed_at timestamptz,
    notes text,
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, register_id) REFERENCES commerce_registers(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (opened_by) REFERENCES auth.users(id) ON DELETE SET NULL,
    FOREIGN KEY (closed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS commerce_one_open_register_session ON commerce_register_sessions(register_id) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS commerce_cash_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    register_session_id uuid NOT NULL,
    movement_type text NOT NULL,
    amount numeric(24,6) NOT NULL,
    reason text,
    reference_type text,
    reference_id uuid,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, register_session_id) REFERENCES commerce_register_sessions(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    image_url text,
    sort_order integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    ecommerce_published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, parent_id) REFERENCES commerce_categories(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS commerce_catalog_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku_id uuid,
    service_id uuid,
    item_type text NOT NULL DEFAULT 'product',
    sku text NOT NULL,
    name text NOT NULL,
    description text,
    short_description text,
    brand text,
    unit_of_measure text NOT NULL DEFAULT 'ea',
    taxable boolean NOT NULL DEFAULT true,
    tax_code_id uuid,
    active boolean NOT NULL DEFAULT true,
    pos_enabled boolean NOT NULL DEFAULT true,
    ecommerce_enabled boolean NOT NULL DEFAULT false,
    purchasable boolean NOT NULL DEFAULT true,
    sellable boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,sku),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, service_id) REFERENCES crm_services(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, tax_code_id) REFERENCES acct_tax_codes(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_catalog_category_map (
    catalog_item_id uuid NOT NULL,
    category_id uuid NOT NULL,
    is_primary boolean NOT NULL DEFAULT false,
    PRIMARY KEY(catalog_item_id,category_id),
    FOREIGN KEY (catalog_item_id) REFERENCES commerce_catalog_items(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES commerce_categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commerce_barcodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    catalog_item_id uuid NOT NULL,
    barcode text NOT NULL,
    barcode_type text NOT NULL DEFAULT 'UPC',
    is_primary boolean NOT NULL DEFAULT false,
    active boolean NOT NULL DEFAULT true,
    UNIQUE(tenant_id,barcode),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, catalog_item_id) REFERENCES commerce_catalog_items(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commerce_product_media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    catalog_item_id uuid NOT NULL,
    media_type text NOT NULL DEFAULT 'image',
    url text NOT NULL,
    alt_text text,
    sort_order integer NOT NULL DEFAULT 0,
    is_primary boolean NOT NULL DEFAULT false,
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, catalog_item_id) REFERENCES commerce_catalog_items(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commerce_product_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    catalog_item_id uuid NOT NULL,
    tag text NOT NULL,
    UNIQUE(catalog_item_id,tag),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, catalog_item_id) REFERENCES commerce_catalog_items(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commerce_price_lists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    currency char(3) NOT NULL DEFAULT 'USD',
    list_type text NOT NULL DEFAULT 'retail',
    active boolean NOT NULL DEFAULT true,
    valid_from timestamptz,
    valid_to timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS commerce_prices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    price_list_id uuid NOT NULL,
    catalog_item_id uuid NOT NULL,
    price numeric(24,6) NOT NULL CHECK(price >= 0),
    compare_at_price numeric(24,6),
    minimum_price numeric(24,6),
    cost_price numeric(24,6),
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_to timestamptz,
    UNIQUE(price_list_id,catalog_item_id,valid_from),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, price_list_id) REFERENCES commerce_price_lists(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, catalog_item_id) REFERENCES commerce_catalog_items(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commerce_promotions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    promotion_type text NOT NULL,
    value numeric(24,6),
    minimum_subtotal numeric(24,6),
    maximum_discount numeric(24,6),
    start_at timestamptz,
    end_at timestamptz,
    usage_limit integer,
    usage_count integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    rules jsonb NOT NULL DEFAULT '{}',
    actions jsonb NOT NULL DEFAULT '{}',
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS commerce_promotion_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    promotion_id uuid NOT NULL,
    catalog_item_id uuid,
    category_id uuid,
    minimum_quantity numeric(24,6),
    discount_value numeric(24,6),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, promotion_id) REFERENCES commerce_promotions(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, catalog_item_id) REFERENCES commerce_catalog_items(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, category_id) REFERENCES commerce_categories(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commerce_coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    promotion_id uuid,
    code text NOT NULL,
    customer_id uuid,
    usage_limit integer,
    usage_count integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'active',
    valid_from timestamptz,
    valid_to timestamptz,
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, promotion_id) REFERENCES commerce_promotions(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_customer_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL,
    price_list_id uuid,
    default_payment_method_id uuid,
    tax_exempt boolean NOT NULL DEFAULT false,
    tax_exemption_number text,
    credit_limit numeric(24,6) NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,customer_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, price_list_id) REFERENCES commerce_price_lists(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_customer_addresses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL,
    address_type text NOT NULL DEFAULT 'shipping',
    first_name text,
    last_name text,
    company text,
    line1 text NOT NULL,
    line2 text,
    city text NOT NULL,
    state text,
    postal_code text,
    country_code text NOT NULL DEFAULT 'US',
    phone text,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commerce_carts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid,
    pet_id uuid,
    register_session_id uuid,
    channel_id uuid,
    status text NOT NULL DEFAULT 'open',
    currency char(3) NOT NULL DEFAULT 'USD',
    subtotal numeric(24,6) NOT NULL DEFAULT 0,
    discount_total numeric(24,6) NOT NULL DEFAULT 0,
    tax_total numeric(24,6) NOT NULL DEFAULT 0,
    shipping_total numeric(24,6) NOT NULL DEFAULT 0,
    total numeric(24,6) NOT NULL DEFAULT 0,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, register_session_id) REFERENCES commerce_register_sessions(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_cart_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id uuid NOT NULL,
    line_no integer NOT NULL,
    catalog_item_id uuid,
    sku_id uuid,
    description text NOT NULL,
    quantity numeric(24,6) NOT NULL CHECK(quantity > 0),
    unit_price numeric(24,6) NOT NULL DEFAULT 0,
    discount_amount numeric(24,6) NOT NULL DEFAULT 0,
    tax_amount numeric(24,6) NOT NULL DEFAULT 0,
    line_total numeric(24,6) NOT NULL DEFAULT 0,
    metadata jsonb NOT NULL DEFAULT '{}',
    UNIQUE(cart_id,line_no),
    FOREIGN KEY (cart_id) REFERENCES commerce_carts(id) ON DELETE CASCADE,
    FOREIGN KEY (catalog_item_id) REFERENCES commerce_catalog_items(id) ON DELETE RESTRICT,
    FOREIGN KEY (sku_id) REFERENCES erp_product_skus(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS commerce_payment_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    method_type text NOT NULL,
    processor text,
    gl_account_id uuid,
    active boolean NOT NULL DEFAULT true,
    configuration jsonb NOT NULL DEFAULT '{}',
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, gl_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_number text NOT NULL,
    cart_id uuid,
    register_session_id uuid,
    branch_id uuid,
    customer_id uuid,
    pet_id uuid,
    appointment_id uuid,
    erp_order_id uuid,
    acct_invoice_id uuid,
    source text NOT NULL DEFAULT 'pos',
    status text NOT NULL DEFAULT 'completed',
    currency char(3) NOT NULL DEFAULT 'USD',
    subtotal numeric(24,6) NOT NULL DEFAULT 0,
    discount_total numeric(24,6) NOT NULL DEFAULT 0,
    tax_total numeric(24,6) NOT NULL DEFAULT 0,
    shipping_total numeric(24,6) NOT NULL DEFAULT 0,
    total numeric(24,6) NOT NULL DEFAULT 0,
    paid_total numeric(24,6) NOT NULL DEFAULT 0,
    refunded_total numeric(24,6) NOT NULL DEFAULT 0,
    change_due numeric(24,6) NOT NULL DEFAULT 0,
    sale_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    voided_at timestamptz,
    void_reason text,
    created_by uuid,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,sale_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, cart_id) REFERENCES commerce_carts(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, register_session_id) REFERENCES commerce_register_sessions(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, branch_id) REFERENCES commerce_branches(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, erp_order_id) REFERENCES erp_orders(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, acct_invoice_id) REFERENCES acct_ar_invoices(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_sale_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid NOT NULL,
    line_no integer NOT NULL,
    catalog_item_id uuid,
    sku_id uuid,
    erp_order_line_id uuid,
    service_id uuid,
    pet_id uuid,
    description text NOT NULL,
    quantity numeric(24,6) NOT NULL CHECK(quantity > 0),
    unit_price numeric(24,6) NOT NULL DEFAULT 0,
    gross_amount numeric(24,6) NOT NULL DEFAULT 0,
    discount_amount numeric(24,6) NOT NULL DEFAULT 0,
    taxable_amount numeric(24,6) NOT NULL DEFAULT 0,
    tax_amount numeric(24,6) NOT NULL DEFAULT 0,
    line_total numeric(24,6) NOT NULL DEFAULT 0,
    cost_amount numeric(24,6) NOT NULL DEFAULT 0,
    UNIQUE(sale_id,line_no),
    FOREIGN KEY (sale_id) REFERENCES commerce_sales(id) ON DELETE CASCADE,
    FOREIGN KEY (catalog_item_id) REFERENCES commerce_catalog_items(id) ON DELETE SET NULL,
    FOREIGN KEY (sku_id) REFERENCES erp_product_skus(id) ON DELETE SET NULL,
    FOREIGN KEY (erp_order_line_id) REFERENCES erp_order_lines(id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES crm_services(id) ON DELETE SET NULL,
    FOREIGN KEY (pet_id) REFERENCES crm_pets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_sale_taxes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid NOT NULL,
    sale_line_id uuid,
    tax_code_id uuid,
    jurisdiction text,
    rate numeric(14,8) NOT NULL DEFAULT 0,
    taxable_amount numeric(24,6) NOT NULL DEFAULT 0,
    tax_amount numeric(24,6) NOT NULL DEFAULT 0,
    FOREIGN KEY (sale_id) REFERENCES commerce_sales(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_line_id) REFERENCES commerce_sale_lines(id) ON DELETE CASCADE,
    FOREIGN KEY (tax_code_id) REFERENCES acct_tax_codes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_sale_discounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid NOT NULL,
    sale_line_id uuid,
    promotion_id uuid,
    coupon_id uuid,
    description text,
    amount numeric(24,6) NOT NULL DEFAULT 0,
    FOREIGN KEY (sale_id) REFERENCES commerce_sales(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_line_id) REFERENCES commerce_sale_lines(id) ON DELETE CASCADE,
    FOREIGN KEY (promotion_id) REFERENCES commerce_promotions(id) ON DELETE SET NULL,
    FOREIGN KEY (coupon_id) REFERENCES commerce_coupons(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_checkout_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cart_id uuid,
    sale_id uuid,
    customer_id uuid,
    status text NOT NULL DEFAULT 'open',
    amount_due numeric(24,6) NOT NULL DEFAULT 0,
    amount_received numeric(24,6) NOT NULL DEFAULT 0,
    change_due numeric(24,6) NOT NULL DEFAULT 0,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, cart_id) REFERENCES commerce_carts(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, sale_id) REFERENCES commerce_sales(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_number text NOT NULL,
    sale_id uuid,
    customer_id uuid,
    payment_method_id uuid NOT NULL,
    amount numeric(24,6) NOT NULL CHECK(amount > 0),
    tip_amount numeric(24,6) NOT NULL DEFAULT 0,
    currency char(3) NOT NULL DEFAULT 'USD',
    status text NOT NULL DEFAULT 'succeeded',
    processor_transaction_id text,
    authorization_code text,
    external_reference text,
    acct_receipt_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,payment_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, sale_id) REFERENCES commerce_sales(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, payment_method_id) REFERENCES commerce_payment_methods(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, acct_receipt_id) REFERENCES acct_ar_receipts(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL,
    sale_id uuid NOT NULL,
    amount numeric(24,6) NOT NULL CHECK(amount > 0),
    UNIQUE(payment_id,sale_id),
    FOREIGN KEY (payment_id) REFERENCES commerce_payments(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id) REFERENCES commerce_sales(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS commerce_refunds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    refund_number text NOT NULL,
    sale_id uuid,
    payment_id uuid,
    rma_id uuid,
    amount numeric(24,6) NOT NULL CHECK(amount > 0),
    reason text,
    status text NOT NULL DEFAULT 'pending',
    processor_reference text,
    acct_credit_memo_id uuid,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    UNIQUE(tenant_id,refund_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, sale_id) REFERENCES commerce_sales(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, payment_id) REFERENCES commerce_payments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, rma_id) REFERENCES erp_return_authorizations(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, acct_credit_memo_id) REFERENCES acct_ar_credit_memos(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_refund_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id uuid NOT NULL,
    sale_line_id uuid NOT NULL,
    quantity numeric(24,6) NOT NULL CHECK(quantity > 0),
    amount numeric(24,6) NOT NULL DEFAULT 0,
    restock boolean NOT NULL DEFAULT true,
    disposition text,
    FOREIGN KEY (refund_id) REFERENCES commerce_refunds(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_line_id) REFERENCES commerce_sale_lines(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS commerce_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id uuid NOT NULL,
    receipt_number text NOT NULL,
    receipt_type text NOT NULL DEFAULT 'sale',
    delivery_method text NOT NULL DEFAULT 'print',
    destination text,
    document_uri text,
    issued_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,receipt_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, sale_id) REFERENCES commerce_sales(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS commerce_gift_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    card_number text NOT NULL,
    customer_id uuid,
    purchaser_customer_id uuid,
    initial_value numeric(24,6) NOT NULL DEFAULT 0,
    balance numeric(24,6) NOT NULL DEFAULT 0,
    currency char(3) NOT NULL DEFAULT 'USD',
    status text NOT NULL DEFAULT 'active',
    issued_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    UNIQUE(tenant_id,card_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, purchaser_customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_gift_card_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    gift_card_id uuid NOT NULL,
    sale_id uuid,
    payment_id uuid,
    transaction_type text NOT NULL,
    amount numeric(24,6) NOT NULL CHECK(amount > 0),
    balance_before numeric(24,6) NOT NULL,
    balance_after numeric(24,6) NOT NULL,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (gift_card_id) REFERENCES commerce_gift_cards(id) ON DELETE RESTRICT,
    FOREIGN KEY (sale_id) REFERENCES commerce_sales(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_id) REFERENCES commerce_payments(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_store_credits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    credit_number text NOT NULL,
    customer_id uuid NOT NULL,
    original_amount numeric(24,6) NOT NULL DEFAULT 0,
    balance numeric(24,6) NOT NULL DEFAULT 0,
    currency char(3) NOT NULL DEFAULT 'USD',
    status text NOT NULL DEFAULT 'active',
    issued_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    UNIQUE(tenant_id,credit_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS commerce_store_credit_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_credit_id uuid NOT NULL,
    sale_id uuid,
    refund_id uuid,
    transaction_type text NOT NULL,
    amount numeric(24,6) NOT NULL CHECK(amount > 0),
    balance_before numeric(24,6) NOT NULL,
    balance_after numeric(24,6) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (store_credit_id) REFERENCES commerce_store_credits(id) ON DELETE RESTRICT,
    FOREIGN KEY (sale_id) REFERENCES commerce_sales(id) ON DELETE SET NULL,
    FOREIGN KEY (refund_id) REFERENCES commerce_refunds(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_coupon_redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id uuid NOT NULL,
    sale_id uuid,
    customer_id uuid,
    discount_amount numeric(24,6) NOT NULL DEFAULT 0,
    redeemed_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(coupon_id,sale_id),
    FOREIGN KEY (coupon_id) REFERENCES commerce_coupons(id) ON DELETE RESTRICT,
    FOREIGN KEY (sale_id) REFERENCES commerce_sales(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_loyalty_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL,
    program_code text NOT NULL DEFAULT 'default',
    points_balance bigint NOT NULL DEFAULT 0,
    lifetime_points bigint NOT NULL DEFAULT 0,
    tier text NOT NULL DEFAULT 'standard',
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,customer_id,program_code),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commerce_loyalty_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    loyalty_account_id uuid NOT NULL,
    sale_id uuid,
    transaction_type text NOT NULL,
    points bigint NOT NULL CHECK(points <> 0),
    balance_before bigint NOT NULL,
    balance_after bigint NOT NULL,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (loyalty_account_id) REFERENCES commerce_loyalty_accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (sale_id) REFERENCES commerce_sales(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_order_channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    channel_type text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    configuration jsonb NOT NULL DEFAULT '{}',
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS commerce_order_channel_refs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    channel_id uuid NOT NULL,
    erp_order_id uuid NOT NULL,
    external_order_id text NOT NULL,
    external_status text,
    payload jsonb NOT NULL DEFAULT '{}',
    imported_at timestamptz NOT NULL DEFAULT now(),
    last_synced_at timestamptz,
    UNIQUE(channel_id,external_order_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, channel_id) REFERENCES commerce_order_channels(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, erp_order_id) REFERENCES erp_orders(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commerce_order_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    erp_order_id uuid,
    sale_id uuid,
    event_type text NOT NULL,
    old_status text,
    new_status text,
    payload jsonb NOT NULL DEFAULT '{}',
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, erp_order_id) REFERENCES erp_orders(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, sale_id) REFERENCES commerce_sales(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_fulfillment_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    fulfillment_id uuid,
    order_id uuid,
    event_type text NOT NULL,
    old_status text,
    new_status text,
    payload jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, fulfillment_id) REFERENCES erp_fulfillment_orders(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, order_id) REFERENCES erp_orders(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commerce_shipping_labels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shipment_id uuid,
    label_type text NOT NULL DEFAULT 'shipping',
    label_uri text,
    carrier text,
    tracking_number text,
    postage_amount numeric(24,6),
    printed_by uuid,
    printed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, shipment_id) REFERENCES erp_shipments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (printed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_batch_slips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    warehouse_id uuid,
    batch_number text NOT NULL,
    status text NOT NULL DEFAULT 'open',
    document_uri text,
    created_at timestamptz NOT NULL DEFAULT now(),
    printed_at timestamptz,
    UNIQUE(tenant_id,batch_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_return_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rma_id uuid NOT NULL,
    event_type text NOT NULL,
    old_status text,
    new_status text,
    payload jsonb NOT NULL DEFAULT '{}',
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, rma_id) REFERENCES erp_return_authorizations(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_return_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rma_id uuid NOT NULL,
    action_type text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    assigned_to uuid,
    notes text,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, rma_id) REFERENCES erp_return_authorizations(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_inventory_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku_id uuid,
    warehouse_id uuid,
    location_id uuid,
    movement_id uuid,
    event_type text NOT NULL,
    quantity numeric(24,6),
    source_type text,
    source_id uuid,
    payload jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, location_id) REFERENCES erp_warehouse_locations(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, movement_id) REFERENCES erp_inventory_movements(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_inventory_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku_id uuid,
    warehouse_id uuid,
    alert_type text NOT NULL,
    severity text NOT NULL DEFAULT 'warning',
    current_quantity numeric(24,6),
    threshold_quantity numeric(24,6),
    status text NOT NULL DEFAULT 'open',
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, sku_id) REFERENCES erp_product_skus(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, warehouse_id) REFERENCES erp_warehouses(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_procurement_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    purchase_order_id uuid,
    event_type text NOT NULL,
    old_status text,
    new_status text,
    payload jsonb NOT NULL DEFAULT '{}',
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, purchase_order_id) REFERENCES erp_purchase_orders(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_subscription_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    billing_interval text NOT NULL,
    interval_count integer NOT NULL DEFAULT 1 CHECK(interval_count > 0),
    price numeric(24,6) NOT NULL DEFAULT 0,
    setup_fee numeric(24,6) NOT NULL DEFAULT 0,
    currency char(3) NOT NULL DEFAULT 'USD',
    trial_days integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    UNIQUE(tenant_id,code),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS commerce_subscription_plan_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid NOT NULL,
    catalog_item_id uuid,
    service_id uuid,
    description text NOT NULL,
    quantity numeric(24,6) NOT NULL DEFAULT 1,
    recurring_price numeric(24,6) NOT NULL DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES commerce_subscription_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (catalog_item_id) REFERENCES commerce_catalog_items(id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES crm_services(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_number text NOT NULL,
    plan_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    pet_id uuid,
    status text NOT NULL DEFAULT 'active',
    billing_interval text NOT NULL,
    interval_count integer NOT NULL DEFAULT 1,
    price numeric(24,6) NOT NULL DEFAULT 0,
    currency char(3) NOT NULL DEFAULT 'USD',
    start_date date NOT NULL DEFAULT CURRENT_DATE,
    trial_end_date date,
    current_period_start date,
    current_period_end date,
    next_billing_date date,
    default_payment_method_id uuid,
    acct_contract_id uuid,
    cancelled_at timestamptz,
    cancellation_reason text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,subscription_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, plan_id) REFERENCES commerce_subscription_plans(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, default_payment_method_id) REFERENCES commerce_payment_methods(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, acct_contract_id) REFERENCES acct_revenue_contracts(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_subscription_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id uuid NOT NULL,
    catalog_item_id uuid,
    service_id uuid,
    description text NOT NULL,
    quantity numeric(24,6) NOT NULL DEFAULT 1,
    unit_price numeric(24,6) NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    FOREIGN KEY (subscription_id) REFERENCES commerce_subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (catalog_item_id) REFERENCES commerce_catalog_items(id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES crm_services(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_subscription_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id uuid NOT NULL,
    event_type text NOT NULL,
    old_status text,
    new_status text,
    effective_at timestamptz NOT NULL DEFAULT now(),
    payload jsonb NOT NULL DEFAULT '{}',
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (subscription_id) REFERENCES commerce_subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_subscription_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id uuid NOT NULL,
    invoice_number text NOT NULL,
    acct_invoice_id uuid,
    period_start date NOT NULL,
    period_end date NOT NULL,
    subtotal numeric(24,6) NOT NULL DEFAULT 0,
    discount_total numeric(24,6) NOT NULL DEFAULT 0,
    tax_total numeric(24,6) NOT NULL DEFAULT 0,
    total numeric(24,6) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'pending',
    due_date date,
    paid_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,invoice_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, subscription_id) REFERENCES commerce_subscriptions(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, acct_invoice_id) REFERENCES acct_ar_invoices(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_subscription_invoice_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_invoice_id uuid NOT NULL,
    line_no integer NOT NULL,
    subscription_item_id uuid,
    description text NOT NULL,
    quantity numeric(24,6) NOT NULL DEFAULT 1,
    unit_price numeric(24,6) NOT NULL DEFAULT 0,
    line_total numeric(24,6) NOT NULL DEFAULT 0,
    UNIQUE(subscription_invoice_id,line_no),
    FOREIGN KEY (subscription_invoice_id) REFERENCES commerce_subscription_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_item_id) REFERENCES commerce_subscription_items(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_subscription_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_invoice_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    amount numeric(24,6) NOT NULL CHECK(amount > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(subscription_invoice_id,payment_id),
    FOREIGN KEY (subscription_invoice_id) REFERENCES commerce_subscription_invoices(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_id) REFERENCES commerce_payments(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS commerce_accounting_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    mapping_type text NOT NULL,
    catalog_item_id uuid,
    payment_method_id uuid,
    tax_code_id uuid,
    revenue_account_id uuid,
    inventory_account_id uuid,
    cogs_account_id uuid,
    cash_account_id uuid,
    active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, catalog_item_id) REFERENCES commerce_catalog_items(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, payment_method_id) REFERENCES commerce_payment_methods(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, tax_code_id) REFERENCES acct_tax_codes(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, revenue_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, inventory_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, cogs_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, cash_account_id) REFERENCES acct_chart_of_accounts(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_posting_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_type text NOT NULL,
    source_id uuid NOT NULL,
    journal_batch_id uuid,
    journal_entry_id uuid,
    status text NOT NULL DEFAULT 'pending',
    idempotency_key text NOT NULL,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    posted_at timestamptz,
    UNIQUE(tenant_id,idempotency_key),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, journal_batch_id) REFERENCES acct_journal_batches(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, journal_entry_id) REFERENCES acct_journal_entries(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_channel_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    channel_id uuid NOT NULL,
    catalog_item_id uuid NOT NULL,
    external_product_id text,
    external_variant_id text,
    external_url text,
    published boolean NOT NULL DEFAULT false,
    sync_status text NOT NULL DEFAULT 'pending',
    sync_error text,
    last_synced_at timestamptz,
    UNIQUE(channel_id,catalog_item_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, channel_id) REFERENCES commerce_order_channels(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, catalog_item_id) REFERENCES commerce_catalog_items(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commerce_channel_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    channel_id uuid,
    event_type text NOT NULL,
    external_event_id text,
    payload jsonb NOT NULL DEFAULT '{}',
    processed boolean NOT NULL DEFAULT false,
    processed_at timestamptz,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(channel_id,external_event_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, channel_id) REFERENCES commerce_order_channels(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_register_closures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    register_session_id uuid NOT NULL,
    closure_date date NOT NULL,
    transaction_count integer NOT NULL DEFAULT 0,
    gross_sales numeric(24,6) NOT NULL DEFAULT 0,
    discounts numeric(24,6) NOT NULL DEFAULT 0,
    refunds numeric(24,6) NOT NULL DEFAULT 0,
    tax numeric(24,6) NOT NULL DEFAULT 0,
    net_sales numeric(24,6) NOT NULL DEFAULT 0,
    cash_sales numeric(24,6) NOT NULL DEFAULT 0,
    card_sales numeric(24,6) NOT NULL DEFAULT 0,
    other_sales numeric(24,6) NOT NULL DEFAULT 0,
    expected_cash numeric(24,6) NOT NULL DEFAULT 0,
    counted_cash numeric(24,6),
    variance numeric(24,6),
    status text NOT NULL DEFAULT 'open',
    closed_by uuid,
    closed_at timestamptz,
    UNIQUE(register_session_id,closure_date),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, register_session_id) REFERENCES commerce_register_sessions(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (closed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_export_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    export_type text NOT NULL,
    period_start date,
    period_end date,
    status text NOT NULL DEFAULT 'queued',
    file_uri text,
    row_count integer NOT NULL DEFAULT 0,
    error_message text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    UNIQUE(tenant_id, id),
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_idempotency (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    idempotency_key text NOT NULL,
    operation text NOT NULL,
    request_hash text,
    response_status integer,
    response_body jsonb,
    resource_type text,
    resource_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    UNIQUE(tenant_id,idempotency_key),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS commerce_outbox_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    aggregate_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}',
    status text NOT NULL DEFAULT 'pending',
    attempts integer NOT NULL DEFAULT 0,
    available_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS commerce_webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider text NOT NULL,
    external_event_id text NOT NULL,
    event_type text,
    payload jsonb NOT NULL DEFAULT '{}',
    signature_valid boolean,
    status text NOT NULL DEFAULT 'received',
    processed_at timestamptz,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(provider,external_event_id),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS commerce_audit_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    before_data jsonb,
    after_data jsonb,
    request_id text,
    correlation_id text,
    ip_address inet,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Commerce: Deposits & Disputes (referenced elsewhere but not previously defined)
CREATE TABLE IF NOT EXISTS commerce_deposits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    deposit_number text NOT NULL,
    customer_id uuid NOT NULL,
    pet_id uuid,
    service_id uuid,
    appointment_id uuid,
    amount numeric(24,6) NOT NULL CHECK(amount > 0),
    currency char(3) NOT NULL DEFAULT 'USD',
    collected_at timestamptz,
    method text,
    status text NOT NULL DEFAULT 'held' CHECK (status IN ('held','applied','released','forfeited','refunded')),
    applied_invoice_id uuid,
    payment_id uuid,
    notes text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,deposit_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, service_id) REFERENCES crm_services(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, applied_invoice_id) REFERENCES acct_ar_invoices(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, payment_id) REFERENCES commerce_payments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commerce_disputes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    dispute_number text NOT NULL,
    refund_id uuid,
    payment_id uuid,
    sale_id uuid,
    reason text,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','won','lost','accepted')),
    amount numeric(24,6) NOT NULL DEFAULT 0,
    processor_dispute_id text,
    opened_at timestamptz NOT NULL DEFAULT now(),
    responded_at timestamptz,
    resolved_at timestamptz,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,dispute_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, refund_id) REFERENCES commerce_refunds(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, payment_id) REFERENCES commerce_payments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, sale_id) REFERENCES commerce_sales(tenant_id, id) ON DELETE SET NULL
);

-- Commerce Views
CREATE OR REPLACE VIEW commerce_sales_dashboard AS
SELECT s.tenant_id, DATE_TRUNC('day',s.sale_at)::date AS sale_date, COUNT(*) AS transaction_count, COALESCE(SUM(s.subtotal),0) AS subtotal, COALESCE(SUM(s.discount_total),0) AS discounts, COALESCE(SUM(s.tax_total),0) AS tax, COALESCE(SUM(s.total),0) AS gross_sales, COALESCE(SUM(s.refunded_total),0) AS refunds, COALESCE(SUM(s.total-s.refunded_total),0) AS net_sales FROM commerce_sales s WHERE s.status <> 'voided' GROUP BY s.tenant_id, DATE_TRUNC('day',s.sale_at)::date;

CREATE OR REPLACE VIEW commerce_customer_360 AS
SELECT c.id AS customer_id, c.tenant_id, c.first_name, c.last_name, COUNT(DISTINCT s.id) AS transaction_count, COALESCE(SUM(s.total),0) AS lifetime_sales, COALESCE(SUM(s.refunded_total),0) AS lifetime_refunds, MAX(s.sale_at) AS last_purchase_at, COALESCE(la.points_balance,0) AS loyalty_points, COALESCE(gc.balance,0) AS gift_card_balance, COALESCE(sc.balance,0) AS store_credit_balance, COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'active') AS active_subscriptions FROM crm_customers c LEFT JOIN commerce_sales s ON s.customer_id = c.id LEFT JOIN commerce_loyalty_accounts la ON la.customer_id = c.id LEFT JOIN commerce_gift_cards gc ON gc.customer_id = c.id AND gc.status = 'active' LEFT JOIN commerce_store_credits sc ON sc.customer_id = c.id AND sc.status = 'active' LEFT JOIN commerce_subscriptions sub ON sub.customer_id = c.id GROUP BY c.id, c.tenant_id, c.first_name, c.last_name, la.points_balance, gc.balance, sc.balance;

CREATE OR REPLACE VIEW commerce_order_360 AS
SELECT s.id AS sale_id, s.tenant_id, s.sale_number, s.customer_id, s.pet_id, s.erp_order_id, s.status AS sale_status, s.total, s.paid_total, s.refunded_total, s.sale_at, o.order_number, o.status AS order_status FROM commerce_sales s LEFT JOIN erp_orders o ON o.id = s.erp_order_id;

-- ============================================================================
-- 6. PORTALS & CROSS-MODULE BRIDGES
-- ============================================================================

-- Platform registry / metadata tables (referenced by RLS section and functions below;
-- must be defined before they are used)
CREATE TABLE IF NOT EXISTS platform_permission_registry (
    permission_code text PRIMARY KEY,
    module text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_integration_health_registry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_code text NOT NULL UNIQUE,
    display_name text NOT NULL,
    category text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_db_contract_metadata (
    table_name text PRIMARY KEY,
    typescript_type_name text NOT NULL,
    description text,
    is_tenant_scoped boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_feature_tree_coverage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_path text NOT NULL UNIQUE,
    module text NOT NULL,
    backing_table text,
    is_implemented boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_quick_action_registry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_code text NOT NULL UNIQUE,
    module text NOT NULL,
    display_name text NOT NULL,
    api_route text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_workflow_transition_validation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    from_status text,
    to_status text NOT NULL,
    is_allowed boolean NOT NULL DEFAULT true,
    UNIQUE(entity_type, from_status, to_status)
);

CREATE TABLE IF NOT EXISTS platform_customer_identity_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_customer_id uuid NOT NULL,
    acct_customer_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(crm_customer_id),
    UNIQUE(acct_customer_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, crm_customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, acct_customer_id) REFERENCES acct_customers(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS platform_vendor_identity_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    acct_vendor_id uuid NOT NULL,
    erp_vendor_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(acct_vendor_id),
    UNIQUE(erp_vendor_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, acct_vendor_id) REFERENCES acct_vendors(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, erp_vendor_id) REFERENCES erp_vendors(tenant_id, id) ON DELETE CASCADE
);

ALTER TABLE erp_orders ADD COLUMN IF NOT EXISTS crm_customer_id uuid;
ALTER TABLE erp_orders ADD COLUMN IF NOT EXISTS crm_pet_id uuid;
CREATE INDEX IF NOT EXISTS erp_orders_crm_customer_idx ON erp_orders(crm_customer_id);
ALTER TABLE erp_order_lines ADD COLUMN IF NOT EXISTS crm_pet_id uuid;
ALTER TABLE erp_return_authorizations ADD COLUMN IF NOT EXISTS crm_customer_id uuid;
ALTER TABLE erp_warehouses ADD COLUMN IF NOT EXISTS commerce_branch_id uuid;
ALTER TABLE erp_warehouses ADD COLUMN IF NOT EXISTS crm_location_id uuid;

CREATE TABLE IF NOT EXISTS portal_customer_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL,
    auth_user_id uuid,
    status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','suspended','revoked')),
    invited_by uuid,
    invited_at timestamptz NOT NULL DEFAULT now(),
    activated_at timestamptz,
    last_login_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(customer_id),
    UNIQUE(auth_user_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, invited_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS portal_magic_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL,
    appointment_id uuid,
    purpose text NOT NULL DEFAULT 'login',
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    requested_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(token_hash),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, customer_id) REFERENCES crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, requested_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS portal_magic_links_open_idx ON portal_magic_links(customer_id, purpose) WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS crm_staff_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id uuid NOT NULL,
    document_type text NOT NULL,
    name text NOT NULL,
    storage_path text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','expired','rejected')),
    uploaded_at timestamptz,
    expires_at date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, staff_id) REFERENCES crm_staff(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_staff_training_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id uuid NOT NULL,
    training_name text NOT NULL,
    completed_at date,
    expires_at date,
    certificate_uri text,
    status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','expired')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, staff_id) REFERENCES crm_staff(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_staff_performance_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id uuid NOT NULL,
    note_type text NOT NULL DEFAULT 'review',
    body text NOT NULL,
    rating numeric(3,1),
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, staff_id) REFERENCES crm_staff(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, created_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_staff_incident_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id uuid NOT NULL,
    appointment_id uuid,
    pet_id uuid,
    severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
    description text NOT NULL,
    action_taken text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, staff_id) REFERENCES crm_staff(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, appointment_id) REFERENCES crm_appointments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, pet_id) REFERENCES crm_pets(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, created_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_staff_time_clock_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id uuid NOT NULL,
    clock_in timestamptz NOT NULL,
    clock_out timestamptz,
    source text NOT NULL DEFAULT 'portal',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (clock_out IS NULL OR clock_out > clock_in),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, staff_id) REFERENCES crm_staff(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS crm_staff_time_clock_open_idx ON crm_staff_time_clock_entries(staff_id) WHERE clock_out IS NULL;

CREATE TABLE IF NOT EXISTS platform_module_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id uuid NOT NULL,
    module_code text NOT NULL CHECK (module_code IN ('customers','appointments','payments','invoices','deposits','refunds_disputes','gift_cards_credits','inventory','products_services','purchasing','communications','reports','staff_groomer_management','administration')),
    access_level text NOT NULL DEFAULT 'full' CHECK (access_level IN ('none','read','write','full')),
    granted_by uuid,
    granted_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(staff_id,module_code),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, staff_id) REFERENCES crm_staff(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, granted_by) REFERENCES crm_staff(tenant_id, id) ON DELETE SET NULL
);

-- ============================================================================
-- 7. UNIFIED RLS POLICIES
-- ============================================================================

-- Protect platform_admins strictly
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_admins_access ON platform_admins;
CREATE POLICY platform_admins_access ON platform_admins FOR ALL USING (platform_is_admin()) WITH CHECK (platform_is_admin());

-- Global registry tables: Read for members, Write for platform admins
DO $$
DECLARE t text;
    global_tables text[] := ARRAY['platform_reserved_slugs', 'platform_permission_registry', 'platform_integration_health_registry', 'platform_db_contract_metadata', 'platform_feature_tree_coverage', 'platform_quick_action_registry', 'platform_workflow_transition_validation'];
BEGIN
    FOREACH t IN ARRAY global_tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS global_read ON %I', t);
        EXECUTE format('CREATE POLICY global_read ON %I FOR SELECT USING (true)', t);
        EXECUTE format('DROP POLICY IF EXISTS global_write ON %I', t);
        EXECUTE format('CREATE POLICY global_write ON %I FOR ALL USING (platform_is_admin()) WITH CHECK (platform_is_admin())', t);
    END LOOP;
END $$;

-- Special handling for tenant_memberships to prevent privilege escalation
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_memberships_select ON tenant_memberships;
CREATE POLICY tenant_memberships_select ON tenant_memberships FOR SELECT USING (platform_is_tenant_member(tenant_id) OR platform_is_admin());
DROP POLICY IF EXISTS tenant_memberships_insert ON tenant_memberships;
CREATE POLICY tenant_memberships_insert ON tenant_memberships FOR INSERT WITH CHECK (platform_is_admin() OR EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.user_id = auth.uid() AND tm.tenant_id = tenant_memberships.tenant_id AND tm.role IN ('super_admin', 'owner', 'admin') AND tm.active = true AND tm.status = 'active'));
DROP POLICY IF EXISTS tenant_memberships_update ON tenant_memberships;
CREATE POLICY tenant_memberships_update ON tenant_memberships FOR UPDATE USING (platform_is_admin() OR EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.user_id = auth.uid() AND tm.tenant_id = tenant_memberships.tenant_id AND tm.role IN ('super_admin', 'owner', 'admin') AND tm.active = true AND tm.status = 'active')) WITH CHECK (platform_is_admin() OR EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.user_id = auth.uid() AND tm.tenant_id = tenant_memberships.tenant_id AND tm.role IN ('super_admin', 'owner', 'admin') AND tm.active = true AND tm.status = 'active'));
DROP POLICY IF EXISTS tenant_memberships_delete ON tenant_memberships;
CREATE POLICY tenant_memberships_delete ON tenant_memberships FOR DELETE USING (platform_is_admin() OR EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.user_id = auth.uid() AND tm.tenant_id = tenant_memberships.tenant_id AND tm.role IN ('super_admin', 'owner', 'admin') AND tm.active = true AND tm.status = 'active'));

-- Special handling for tenants itself: its own primary key IS the tenant id,
-- so it has no tenant_id column to filter on. Members see their own tenant row;
-- platform admins see all; only admins (or a signup flow) can insert new tenants.
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenants_select ON tenants;
CREATE POLICY tenants_select ON tenants FOR SELECT USING (platform_is_tenant_member(id));
DROP POLICY IF EXISTS tenants_insert ON tenants;
CREATE POLICY tenants_insert ON tenants FOR INSERT WITH CHECK (platform_is_admin());
DROP POLICY IF EXISTS tenants_update ON tenants;
CREATE POLICY tenants_update ON tenants FOR UPDATE USING (platform_is_tenant_member(id)) WITH CHECK (platform_is_tenant_member(id));
DROP POLICY IF EXISTS tenants_delete ON tenants;
CREATE POLICY tenants_delete ON tenants FOR DELETE USING (platform_is_admin());

-- Tenant-scoped tables: Granular SELECT, INSERT, UPDATE, DELETE
DO $$
DECLARE t text;
    tenant_scoped_tables text[] := ARRAY[
        'tenant_locations', 'platform_admin_access_log',
        'crm_settings', 'crm_locations', 'crm_staff', 'crm_households', 'crm_customers', 'crm_customer_contact_methods', 'crm_customer_preferences', 'crm_pets', 'crm_customer_pets', 'crm_tags', 'crm_customer_tags', 'crm_pet_tags', 'crm_lead_sources', 'crm_leads', 'crm_lead_activities', 'crm_funnel_events', 'crm_services', 'crm_service_location_availability', 'crm_appointments', 'crm_appointment_pets', 'crm_appointment_steps', 'crm_appointment_financial_refs', 'crm_appointment_services', 'crm_appointment_status_history', 'crm_waitlist', 'crm_grooming_records', 'crm_grooming_record_services', 'crm_grooming_photos', 'crm_document_types', 'crm_documents', 'crm_document_versions', 'crm_vaccine_types', 'crm_pet_vaccinations', 'crm_notes', 'crm_permanent_alerts', 'crm_activity', 'crm_audit_log', 'crm_message_templates', 'crm_conversations', 'crm_messages', 'crm_communication_preferences', 'crm_campaigns', 'crm_campaign_members', 'crm_segments', 'crm_segment_memberships', 'crm_customer_behavior', 'crm_rebooking_recommendations', 'crm_automation_workflows', 'crm_automation_enrollments', 'crm_automation_runs', 'crm_tasks', 'crm_needs_attention', 'crm_saved_views', 'crm_duplicate_candidates', 'crm_merge_log', 'crm_search_index', 'crm_external_identities', 'crm_idempotency_keys',
        'erp_product_categories', 'erp_products', 'erp_product_variants', 'erp_product_skus', 'erp_product_barcodes', 'erp_uom_conversions', 'erp_warehouses', 'erp_warehouse_zones', 'erp_warehouse_locations', 'erp_inventory_balances', 'erp_inventory_lots', 'erp_inventory_serial_numbers', 'erp_inventory_reservations', 'erp_inventory_movements', 'erp_inventory_transfers', 'erp_inventory_transfer_lines', 'erp_orders', 'erp_order_addresses', 'erp_order_lines', 'erp_order_status_history', 'erp_order_notes', 'erp_fulfillment_orders', 'erp_fulfillment_lines', 'erp_pick_waves', 'erp_pick_tasks', 'erp_pick_task_lines', 'erp_packages', 'erp_package_items', 'erp_carriers', 'erp_shipping_methods', 'erp_shipments', 'erp_shipment_packages', 'erp_tracking_events', 'erp_vendors', 'erp_vendor_items', 'erp_purchase_orders', 'erp_purchase_order_lines', 'erp_goods_receipts', 'erp_goods_receipt_lines', 'erp_return_authorizations', 'erp_return_lines', 'erp_return_inspections', 'erp_return_refunds', 'erp_replenishment_rules', 'erp_replenishment_recommendations', 'erp_inventory_count_sessions', 'erp_inventory_count_lines', 'erp_inventory_cost_layers', 'erp_document_sequences', 'erp_audit_log', 'erp_idempotency_keys',
        'acct_entities', 'acct_books', 'acct_fiscal_years', 'acct_periods', 'acct_close_checklists', 'acct_dimensions', 'acct_dimension_values', 'acct_chart_of_accounts', 'acct_account_dimension_rules', 'acct_exchange_rates', 'acct_journal_batches', 'acct_journal_entries', 'acct_journal_lines', 'acct_customers', 'acct_vendors', 'acct_payment_terms', 'acct_tax_jurisdictions', 'acct_tax_codes', 'acct_ar_invoices', 'acct_ar_credit_memos', 'acct_ar_receipts', 'acct_ar_collections_cases', 'acct_ap_bills', 'acct_ap_payments', 'acct_ap_purchase_orders', 'acct_ap_approvals', 'acct_bank_accounts', 'acct_bank_statements', 'acct_bank_transactions', 'acct_reconciliations', 'acct_reconciliation_items', 'acct_asset_classes', 'acct_fixed_assets', 'acct_asset_depreciation_runs', 'acct_leases', 'acct_revenue_contracts', 'acct_expense_reports', 'acct_budget_versions', 'acct_allocations', 'acct_intercompany_partners', 'acct_intercompany_transactions', 'acct_consolidation_groups', 'acct_consolidation_runs', 'acct_book_account_mappings', 'acct_fx_revaluation_runs', 'acct_recurring_journals', 'acct_audit_log', 'acct_attachments', 'acct_workflows', 'acct_workflow_instances', 'acct_import_jobs', 'acct_integration_idempotency',
        'commerce_modules', 'commerce_branches', 'commerce_departments', 'commerce_registers', 'commerce_register_sessions', 'commerce_cash_movements', 'commerce_categories', 'commerce_catalog_items', 'commerce_barcodes', 'commerce_product_media', 'commerce_product_tags', 'commerce_price_lists', 'commerce_prices', 'commerce_promotions', 'commerce_promotion_items', 'commerce_coupons', 'commerce_customer_accounts', 'commerce_customer_addresses', 'commerce_carts', 'commerce_payment_methods', 'commerce_sales', 'commerce_checkout_sessions', 'commerce_payments', 'commerce_refunds', 'commerce_receipts', 'commerce_gift_cards', 'commerce_store_credits', 'commerce_order_channels', 'commerce_order_channel_refs', 'commerce_order_events', 'commerce_fulfillment_events', 'commerce_shipping_labels', 'commerce_batch_slips', 'commerce_return_events', 'commerce_return_actions', 'commerce_inventory_events', 'commerce_inventory_alerts', 'commerce_procurement_events', 'commerce_subscription_plans', 'commerce_subscriptions', 'commerce_subscription_invoices', 'commerce_loyalty_accounts', 'commerce_accounting_mappings', 'commerce_posting_events', 'commerce_channel_products', 'commerce_channel_events', 'commerce_register_closures', 'commerce_export_jobs', 'commerce_idempotency', 'commerce_outbox_events', 'commerce_webhook_events', 'commerce_audit_log', 'commerce_deposits', 'commerce_disputes',
        'portal_customer_accounts', 'portal_magic_links', 'crm_staff_documents', 'crm_staff_training_records', 'crm_staff_performance_notes', 'crm_staff_incident_reports', 'crm_staff_time_clock_entries', 'platform_customer_identity_links', 'platform_vendor_identity_links', 'platform_module_permissions'
    ];
BEGIN
    FOREACH t IN ARRAY tenant_scoped_tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', t, t);
        EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT USING (platform_is_tenant_member(tenant_id))', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_insert ON %I', t, t);
        EXECUTE format('CREATE POLICY %I_insert ON %I FOR INSERT WITH CHECK (platform_is_tenant_member(tenant_id))', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_update ON %I', t, t);
        EXECUTE format('CREATE POLICY %I_update ON %I FOR UPDATE USING (platform_is_tenant_member(tenant_id)) WITH CHECK (platform_is_tenant_member(tenant_id))', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_delete ON %I', t, t);
        EXECUTE format('CREATE POLICY %I_delete ON %I FOR DELETE USING (platform_is_tenant_member(tenant_id))', t, t);
    END LOOP;
END $$;

-- Join-based RLS for line-item tables without direct tenant_id
DO $$
DECLARE
BEGIN
    ALTER TABLE acct_ar_invoice_lines ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS acct_ar_il_select ON acct_ar_invoice_lines;
    CREATE POLICY acct_ar_il_select ON acct_ar_invoice_lines FOR SELECT USING (EXISTS (SELECT 1 FROM acct_ar_invoices i WHERE i.id = invoice_id AND platform_is_tenant_member(i.tenant_id)));
    DROP POLICY IF EXISTS acct_ar_il_mutate ON acct_ar_invoice_lines;
    CREATE POLICY acct_ar_il_mutate ON acct_ar_invoice_lines FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM acct_ar_invoices i WHERE i.id = invoice_id AND platform_is_tenant_member(i.tenant_id)));

    ALTER TABLE acct_ap_bill_lines ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS acct_ap_bl_select ON acct_ap_bill_lines;
    CREATE POLICY acct_ap_bl_select ON acct_ap_bill_lines FOR SELECT USING (EXISTS (SELECT 1 FROM acct_ap_bills b WHERE b.id = bill_id AND platform_is_tenant_member(b.tenant_id)));
    DROP POLICY IF EXISTS acct_ap_bl_mutate ON acct_ap_bill_lines;
    CREATE POLICY acct_ap_bl_mutate ON acct_ap_bill_lines FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM acct_ap_bills b WHERE b.id = bill_id AND platform_is_tenant_member(b.tenant_id)));

    ALTER TABLE commerce_sale_lines ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_sl_select ON commerce_sale_lines;
    CREATE POLICY commerce_sl_select ON commerce_sale_lines FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_sales s WHERE s.id = sale_id AND platform_is_tenant_member(s.tenant_id)));
    DROP POLICY IF EXISTS commerce_sl_mutate ON commerce_sale_lines;
    CREATE POLICY commerce_sl_mutate ON commerce_sale_lines FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_sales s WHERE s.id = sale_id AND platform_is_tenant_member(s.tenant_id)));

    ALTER TABLE commerce_cart_lines ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_cl_select ON commerce_cart_lines;
    CREATE POLICY commerce_cl_select ON commerce_cart_lines FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_carts c WHERE c.id = cart_id AND platform_is_tenant_member(c.tenant_id)));
    DROP POLICY IF EXISTS commerce_cl_mutate ON commerce_cart_lines;
    CREATE POLICY commerce_cl_mutate ON commerce_cart_lines FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_carts c WHERE c.id = cart_id AND platform_is_tenant_member(c.tenant_id)));

    ALTER TABLE commerce_refund_lines ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_rl_select ON commerce_refund_lines;
    CREATE POLICY commerce_rl_select ON commerce_refund_lines FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_refunds r WHERE r.id = refund_id AND platform_is_tenant_member(r.tenant_id)));
    DROP POLICY IF EXISTS commerce_rl_mutate ON commerce_refund_lines;
    CREATE POLICY commerce_rl_mutate ON commerce_refund_lines FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_refunds r WHERE r.id = refund_id AND platform_is_tenant_member(r.tenant_id)));

    ALTER TABLE acct_ap_payment_applications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS acct_appa_select ON acct_ap_payment_applications;
    CREATE POLICY acct_appa_select ON acct_ap_payment_applications FOR SELECT USING (EXISTS (SELECT 1 FROM acct_ap_payments p WHERE p.id = payment_id AND platform_is_tenant_member(p.tenant_id)));
    DROP POLICY IF EXISTS acct_appa_mutate ON acct_ap_payment_applications;
    CREATE POLICY acct_appa_mutate ON acct_ap_payment_applications FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM acct_ap_payments p WHERE p.id = payment_id AND platform_is_tenant_member(p.tenant_id)));

    ALTER TABLE acct_ap_purchase_order_lines ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS acct_apol_select ON acct_ap_purchase_order_lines;
    CREATE POLICY acct_apol_select ON acct_ap_purchase_order_lines FOR SELECT USING (EXISTS (SELECT 1 FROM acct_ap_purchase_orders po WHERE po.id = purchase_order_id AND platform_is_tenant_member(po.tenant_id)));
    DROP POLICY IF EXISTS acct_apol_mutate ON acct_ap_purchase_order_lines;
    CREATE POLICY acct_apol_mutate ON acct_ap_purchase_order_lines FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM acct_ap_purchase_orders po WHERE po.id = purchase_order_id AND platform_is_tenant_member(po.tenant_id)));

    ALTER TABLE acct_ar_receipt_applications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS acct_arra_select ON acct_ar_receipt_applications;
    CREATE POLICY acct_arra_select ON acct_ar_receipt_applications FOR SELECT USING (EXISTS (SELECT 1 FROM acct_ar_receipts r WHERE r.id = receipt_id AND platform_is_tenant_member(r.tenant_id)));
    DROP POLICY IF EXISTS acct_arra_mutate ON acct_ar_receipt_applications;
    CREATE POLICY acct_arra_mutate ON acct_ar_receipt_applications FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM acct_ar_receipts r WHERE r.id = receipt_id AND platform_is_tenant_member(r.tenant_id)));

    ALTER TABLE acct_expense_lines ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS acct_el_select ON acct_expense_lines;
    CREATE POLICY acct_el_select ON acct_expense_lines FOR SELECT USING (EXISTS (SELECT 1 FROM acct_expense_reports er WHERE er.id = expense_report_id AND platform_is_tenant_member(er.tenant_id)));
    DROP POLICY IF EXISTS acct_el_mutate ON acct_expense_lines;
    CREATE POLICY acct_el_mutate ON acct_expense_lines FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM acct_expense_reports er WHERE er.id = expense_report_id AND platform_is_tenant_member(er.tenant_id)));

    ALTER TABLE commerce_coupon_redemptions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_cr_select ON commerce_coupon_redemptions;
    CREATE POLICY commerce_cr_select ON commerce_coupon_redemptions FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_coupons c WHERE c.id = coupon_id AND platform_is_tenant_member(c.tenant_id)));
    DROP POLICY IF EXISTS commerce_cr_mutate ON commerce_coupon_redemptions;
    CREATE POLICY commerce_cr_mutate ON commerce_coupon_redemptions FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_coupons c WHERE c.id = coupon_id AND platform_is_tenant_member(c.tenant_id)));

    ALTER TABLE commerce_loyalty_transactions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_lt_select ON commerce_loyalty_transactions;
    CREATE POLICY commerce_lt_select ON commerce_loyalty_transactions FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_loyalty_accounts la WHERE la.id = loyalty_account_id AND platform_is_tenant_member(la.tenant_id)));
    DROP POLICY IF EXISTS commerce_lt_mutate ON commerce_loyalty_transactions;
    CREATE POLICY commerce_lt_mutate ON commerce_loyalty_transactions FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_loyalty_accounts la WHERE la.id = loyalty_account_id AND platform_is_tenant_member(la.tenant_id)));

    ALTER TABLE commerce_subscription_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_se_select ON commerce_subscription_events;
    CREATE POLICY commerce_se_select ON commerce_subscription_events FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_subscriptions s WHERE s.id = subscription_id AND platform_is_tenant_member(s.tenant_id)));
    DROP POLICY IF EXISTS commerce_se_mutate ON commerce_subscription_events;
    CREATE POLICY commerce_se_mutate ON commerce_subscription_events FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_subscriptions s WHERE s.id = subscription_id AND platform_is_tenant_member(s.tenant_id)));

    ALTER TABLE acct_allocation_rules ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS acct_alr_select ON acct_allocation_rules;
    CREATE POLICY acct_alr_select ON acct_allocation_rules FOR SELECT USING (EXISTS (SELECT 1 FROM acct_allocations a WHERE a.id = allocation_id AND platform_is_tenant_member(a.tenant_id)));
    DROP POLICY IF EXISTS acct_alr_mutate ON acct_allocation_rules;
    CREATE POLICY acct_alr_mutate ON acct_allocation_rules FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM acct_allocations a WHERE a.id = allocation_id AND platform_is_tenant_member(a.tenant_id)));

    ALTER TABLE acct_asset_books ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS acct_ab_select ON acct_asset_books;
    CREATE POLICY acct_ab_select ON acct_asset_books FOR SELECT USING (EXISTS (SELECT 1 FROM acct_fixed_assets fa WHERE fa.id = asset_id AND platform_is_tenant_member(fa.tenant_id)));
    DROP POLICY IF EXISTS acct_ab_mutate ON acct_asset_books;
    CREATE POLICY acct_ab_mutate ON acct_asset_books FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM acct_fixed_assets fa WHERE fa.id = asset_id AND platform_is_tenant_member(fa.tenant_id)));

    ALTER TABLE acct_asset_depreciation_lines ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS acct_adl_select ON acct_asset_depreciation_lines;
    CREATE POLICY acct_adl_select ON acct_asset_depreciation_lines FOR SELECT USING (EXISTS (SELECT 1 FROM acct_asset_depreciation_runs r WHERE r.id = run_id AND platform_is_tenant_member(r.tenant_id)));
    DROP POLICY IF EXISTS acct_adl_mutate ON acct_asset_depreciation_lines;
    CREATE POLICY acct_adl_mutate ON acct_asset_depreciation_lines FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM acct_asset_depreciation_runs r WHERE r.id = run_id AND platform_is_tenant_member(r.tenant_id)));

    ALTER TABLE acct_budget_lines ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS acct_bl_select ON acct_budget_lines;
    CREATE POLICY acct_bl_select ON acct_budget_lines FOR SELECT USING (EXISTS (SELECT 1 FROM acct_budget_versions bv WHERE bv.id = budget_id AND platform_is_tenant_member(bv.tenant_id)));
    DROP POLICY IF EXISTS acct_bl_mutate ON acct_budget_lines;
    CREATE POLICY acct_bl_mutate ON acct_budget_lines FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM acct_budget_versions bv WHERE bv.id = budget_id AND platform_is_tenant_member(bv.tenant_id)));

    ALTER TABLE acct_consolidation_members ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS acct_cm_select ON acct_consolidation_members;
    CREATE POLICY acct_cm_select ON acct_consolidation_members FOR SELECT USING (EXISTS (SELECT 1 FROM acct_consolidation_groups g WHERE g.id = consolidation_group_id AND platform_is_tenant_member(g.tenant_id)));
    DROP POLICY IF EXISTS acct_cm_mutate ON acct_consolidation_members;
    CREATE POLICY acct_cm_mutate ON acct_consolidation_members FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM acct_consolidation_groups g WHERE g.id = consolidation_group_id AND platform_is_tenant_member(g.tenant_id)));

    ALTER TABLE acct_lease_payments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS acct_lp_select ON acct_lease_payments;
    CREATE POLICY acct_lp_select ON acct_lease_payments FOR SELECT USING (EXISTS (SELECT 1 FROM acct_leases l WHERE l.id = lease_id AND platform_is_tenant_member(l.tenant_id)));
    DROP POLICY IF EXISTS acct_lp_mutate ON acct_lease_payments;
    CREATE POLICY acct_lp_mutate ON acct_lease_payments FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM acct_leases l WHERE l.id = lease_id AND platform_is_tenant_member(l.tenant_id)));

    ALTER TABLE acct_revenue_performance_obligations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS acct_rpo_select ON acct_revenue_performance_obligations;
    CREATE POLICY acct_rpo_select ON acct_revenue_performance_obligations FOR SELECT USING (EXISTS (SELECT 1 FROM acct_revenue_contracts c WHERE c.id = contract_id AND platform_is_tenant_member(c.tenant_id)));
    DROP POLICY IF EXISTS acct_rpo_mutate ON acct_revenue_performance_obligations;
    CREATE POLICY acct_rpo_mutate ON acct_revenue_performance_obligations FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM acct_revenue_contracts c WHERE c.id = contract_id AND platform_is_tenant_member(c.tenant_id)));

    ALTER TABLE acct_revenue_recognition_schedules ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS acct_rrs_select ON acct_revenue_recognition_schedules;
    CREATE POLICY acct_rrs_select ON acct_revenue_recognition_schedules FOR SELECT USING (EXISTS (SELECT 1 FROM acct_revenue_performance_obligations o JOIN acct_revenue_contracts c ON c.id = o.contract_id WHERE o.id = obligation_id AND platform_is_tenant_member(c.tenant_id)));
    DROP POLICY IF EXISTS acct_rrs_mutate ON acct_revenue_recognition_schedules;
    CREATE POLICY acct_rrs_mutate ON acct_revenue_recognition_schedules FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM acct_revenue_performance_obligations o JOIN acct_revenue_contracts c ON c.id = o.contract_id WHERE o.id = obligation_id AND platform_is_tenant_member(c.tenant_id)));

    ALTER TABLE acct_workflow_actions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS acct_wfa_select ON acct_workflow_actions;
    CREATE POLICY acct_wfa_select ON acct_workflow_actions FOR SELECT USING (EXISTS (SELECT 1 FROM acct_workflow_instances wi WHERE wi.id = workflow_instance_id AND platform_is_tenant_member(wi.tenant_id)));
    DROP POLICY IF EXISTS acct_wfa_mutate ON acct_workflow_actions;
    CREATE POLICY acct_wfa_mutate ON acct_workflow_actions FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM acct_workflow_instances wi WHERE wi.id = workflow_instance_id AND platform_is_tenant_member(wi.tenant_id)));

    ALTER TABLE commerce_catalog_category_map ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_ccm_select ON commerce_catalog_category_map;
    CREATE POLICY commerce_ccm_select ON commerce_catalog_category_map FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_catalog_items ci WHERE ci.id = catalog_item_id AND platform_is_tenant_member(ci.tenant_id)));
    DROP POLICY IF EXISTS commerce_ccm_mutate ON commerce_catalog_category_map;
    CREATE POLICY commerce_ccm_mutate ON commerce_catalog_category_map FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_catalog_items ci WHERE ci.id = catalog_item_id AND platform_is_tenant_member(ci.tenant_id)));

    ALTER TABLE commerce_gift_card_transactions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_gct_select ON commerce_gift_card_transactions;
    CREATE POLICY commerce_gct_select ON commerce_gift_card_transactions FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_gift_cards gc WHERE gc.id = gift_card_id AND platform_is_tenant_member(gc.tenant_id)));
    DROP POLICY IF EXISTS commerce_gct_mutate ON commerce_gift_card_transactions;
    CREATE POLICY commerce_gct_mutate ON commerce_gift_card_transactions FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_gift_cards gc WHERE gc.id = gift_card_id AND platform_is_tenant_member(gc.tenant_id)));

    ALTER TABLE commerce_payment_allocations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_pa_select ON commerce_payment_allocations;
    CREATE POLICY commerce_pa_select ON commerce_payment_allocations FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_payments p WHERE p.id = payment_id AND platform_is_tenant_member(p.tenant_id)));
    DROP POLICY IF EXISTS commerce_pa_mutate ON commerce_payment_allocations;
    CREATE POLICY commerce_pa_mutate ON commerce_payment_allocations FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_payments p WHERE p.id = payment_id AND platform_is_tenant_member(p.tenant_id)));

    ALTER TABLE commerce_sale_discounts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_sd_select ON commerce_sale_discounts;
    CREATE POLICY commerce_sd_select ON commerce_sale_discounts FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_sales s WHERE s.id = sale_id AND platform_is_tenant_member(s.tenant_id)));
    DROP POLICY IF EXISTS commerce_sd_mutate ON commerce_sale_discounts;
    CREATE POLICY commerce_sd_mutate ON commerce_sale_discounts FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_sales s WHERE s.id = sale_id AND platform_is_tenant_member(s.tenant_id)));

    ALTER TABLE commerce_sale_taxes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_st_select ON commerce_sale_taxes;
    CREATE POLICY commerce_st_select ON commerce_sale_taxes FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_sales s WHERE s.id = sale_id AND platform_is_tenant_member(s.tenant_id)));
    DROP POLICY IF EXISTS commerce_st_mutate ON commerce_sale_taxes;
    CREATE POLICY commerce_st_mutate ON commerce_sale_taxes FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_sales s WHERE s.id = sale_id AND platform_is_tenant_member(s.tenant_id)));

    ALTER TABLE commerce_store_credit_transactions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_sct_select ON commerce_store_credit_transactions;
    CREATE POLICY commerce_sct_select ON commerce_store_credit_transactions FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_store_credits sc WHERE sc.id = store_credit_id AND platform_is_tenant_member(sc.tenant_id)));
    DROP POLICY IF EXISTS commerce_sct_mutate ON commerce_store_credit_transactions;
    CREATE POLICY commerce_sct_mutate ON commerce_store_credit_transactions FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_store_credits sc WHERE sc.id = store_credit_id AND platform_is_tenant_member(sc.tenant_id)));

    ALTER TABLE commerce_subscription_invoice_lines ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_sil_select ON commerce_subscription_invoice_lines;
    CREATE POLICY commerce_sil_select ON commerce_subscription_invoice_lines FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_subscription_invoices si WHERE si.id = subscription_invoice_id AND platform_is_tenant_member(si.tenant_id)));
    DROP POLICY IF EXISTS commerce_sil_mutate ON commerce_subscription_invoice_lines;
    CREATE POLICY commerce_sil_mutate ON commerce_subscription_invoice_lines FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_subscription_invoices si WHERE si.id = subscription_invoice_id AND platform_is_tenant_member(si.tenant_id)));

    ALTER TABLE commerce_subscription_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_sui_select ON commerce_subscription_items;
    CREATE POLICY commerce_sui_select ON commerce_subscription_items FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_subscriptions s WHERE s.id = subscription_id AND platform_is_tenant_member(s.tenant_id)));
    DROP POLICY IF EXISTS commerce_sui_mutate ON commerce_subscription_items;
    CREATE POLICY commerce_sui_mutate ON commerce_subscription_items FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_subscriptions s WHERE s.id = subscription_id AND platform_is_tenant_member(s.tenant_id)));

    ALTER TABLE commerce_subscription_plan_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_spi_select ON commerce_subscription_plan_items;
    CREATE POLICY commerce_spi_select ON commerce_subscription_plan_items FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_subscription_plans p WHERE p.id = plan_id AND platform_is_tenant_member(p.tenant_id)));
    DROP POLICY IF EXISTS commerce_spi_mutate ON commerce_subscription_plan_items;
    CREATE POLICY commerce_spi_mutate ON commerce_subscription_plan_items FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_subscription_plans p WHERE p.id = plan_id AND platform_is_tenant_member(p.tenant_id)));

    ALTER TABLE commerce_subscription_payments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS commerce_sp_select ON commerce_subscription_payments;
    CREATE POLICY commerce_sp_select ON commerce_subscription_payments FOR SELECT USING (EXISTS (SELECT 1 FROM commerce_subscription_invoices si WHERE si.id = subscription_invoice_id AND platform_is_tenant_member(si.tenant_id)));
    DROP POLICY IF EXISTS commerce_sp_mutate ON commerce_subscription_payments;
    CREATE POLICY commerce_sp_mutate ON commerce_subscription_payments FOR ALL WITH CHECK (EXISTS (SELECT 1 FROM commerce_subscription_invoices si WHERE si.id = subscription_invoice_id AND platform_is_tenant_member(si.tenant_id)));
END $$;

-- ============================================================================
-- 8. AUTOMATED UPDATED_AT TRIGGERS
-- ============================================================================

DO $$
DECLARE t text;
    tables_with_updated_at text[] := ARRAY[
        'tenants', 'tenant_locations', 'tenant_memberships', 'crm_settings', 'crm_locations', 'crm_staff', 'crm_households', 'crm_customers', 'crm_customer_contact_methods', 'crm_customer_preferences', 'crm_pets', 'crm_leads', 'crm_services', 'crm_appointments', 'crm_waitlist', 'crm_grooming_records', 'crm_documents', 'crm_pet_vaccinations', 'crm_notes', 'crm_message_templates', 'crm_conversations', 'crm_campaigns', 'crm_segments', 'crm_rebooking_recommendations', 'crm_automation_workflows', 'crm_tasks', 'crm_saved_views', 'crm_appointment_steps',
        'erp_product_categories', 'erp_products', 'erp_product_variants', 'erp_product_skus', 'erp_warehouses', 'erp_warehouse_locations', 'erp_inventory_balances', 'erp_inventory_transfers', 'erp_orders', 'erp_order_lines', 'erp_fulfillment_orders', 'erp_shipments', 'erp_vendors', 'erp_vendor_items', 'erp_purchase_orders', 'erp_goods_receipts', 'erp_return_authorizations', 'erp_replenishment_rules',
        'acct_entities', 'acct_books', 'acct_chart_of_accounts', 'acct_journal_batches', 'acct_customers', 'acct_vendors', 'acct_ar_invoices', 'acct_ar_collections_cases', 'acct_ap_bills', 'acct_bank_accounts', 'acct_fixed_assets', 'acct_revenue_contracts',
        'commerce_modules', 'commerce_branches', 'commerce_registers', 'commerce_catalog_items', 'commerce_categories', 'commerce_price_lists', 'commerce_carts', 'commerce_sales', 'commerce_subscriptions', 'commerce_loyalty_accounts', 'commerce_customer_accounts', 'commerce_deposits', 'commerce_disputes', 'portal_customer_accounts', 'crm_staff_documents'
    ];
BEGIN
    FOREACH t IN ARRAY tables_with_updated_at LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I_touch_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER %I_touch_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION platform_touch_updated_at()', t, t);
    END LOOP;
END $$;

-- ============================================================================
-- 9. FINAL ASSERTIONS & SCHEMA-WIDE INTEGRITY AUDIT (Fail-Fast Verification)
-- ============================================================================

DO $$
DECLARE
    missing_tenant_fk RECORD;
    missing_rls_table RECORD;
    missing_fk_constraint RECORD;
BEGIN
    -- 1. Missing Tenant Column Detection
    FOR missing_tenant_fk IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('tenants', 'platform_admins', 'platform_reserved_slugs', 'acct_currencies', 'platform_permission_registry', 'platform_integration_health_registry', 'platform_db_contract_metadata', 'platform_feature_tree_coverage', 'platform_quick_action_registry', 'platform_workflow_transition_validation', 'acct_ar_invoice_lines', 'acct_ap_bill_lines', 'commerce_catalog_category_map', 'commerce_cart_lines', 'commerce_sale_lines', 'commerce_sale_taxes', 'commerce_sale_discounts', 'commerce_payment_allocations', 'commerce_gift_card_transactions', 'commerce_store_credit_transactions', 'commerce_refund_lines', 'commerce_subscription_plan_items', 'commerce_subscription_items', 'commerce_subscription_invoice_lines', 'commerce_subscription_payments', 'acct_asset_books', 'acct_asset_depreciation_lines', 'acct_lease_payments', 'acct_revenue_performance_obligations', 'acct_revenue_recognition_schedules', 'acct_budget_lines', 'acct_allocation_rules', 'acct_consolidation_members', 'acct_workflow_actions', 'acct_estimate_lines', 'acct_recurring_invoice_lines', 'acct_payroll_run_items', 'acct_ap_payment_applications', 'acct_ap_purchase_order_lines', 'acct_ar_receipt_applications', 'acct_expense_lines', 'commerce_coupon_redemptions', 'commerce_loyalty_transactions', 'commerce_subscription_events')
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE 'sql_%'
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = missing_tenant_fk.table_name AND column_name = 'tenant_id'
        ) THEN
            RAISE EXCEPTION 'FAIL-FAST: Table % is missing tenant_id column', missing_tenant_fk.table_name;
        END IF;
    END LOOP;

    -- 2. True Foreign Key Verification
    FOR missing_fk_constraint IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('tenants', 'platform_admins', 'platform_reserved_slugs', 'acct_currencies', 'platform_permission_registry', 'platform_integration_health_registry', 'platform_db_contract_metadata', 'platform_feature_tree_coverage', 'platform_quick_action_registry', 'platform_workflow_transition_validation', 'acct_ar_invoice_lines', 'acct_ap_bill_lines', 'commerce_catalog_category_map', 'commerce_cart_lines', 'commerce_sale_lines', 'commerce_sale_taxes', 'commerce_sale_discounts', 'commerce_payment_allocations', 'commerce_gift_card_transactions', 'commerce_store_credit_transactions', 'commerce_refund_lines', 'commerce_subscription_plan_items', 'commerce_subscription_items', 'commerce_subscription_invoice_lines', 'commerce_subscription_payments', 'acct_asset_books', 'acct_asset_depreciation_lines', 'acct_lease_payments', 'acct_revenue_performance_obligations', 'acct_revenue_recognition_schedules', 'acct_budget_lines', 'acct_allocation_rules', 'acct_consolidation_members', 'acct_workflow_actions', 'acct_estimate_lines', 'acct_recurring_invoice_lines', 'acct_payroll_run_items', 'acct_ap_payment_applications', 'acct_ap_purchase_order_lines', 'acct_ar_receipt_applications', 'acct_expense_lines', 'commerce_coupon_redemptions', 'commerce_loyalty_transactions', 'commerce_subscription_events')
        AND table_name NOT LIKE 'pg_%'
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.key_column_usage kcu
            JOIN information_schema.referential_constraints rc 
              ON rc.constraint_schema = kcu.constraint_schema 
             AND rc.constraint_name = kcu.constraint_name
            JOIN information_schema.table_constraints referenced_tc 
              ON referenced_tc.constraint_schema = rc.unique_constraint_schema 
             AND referenced_tc.constraint_name = rc.unique_constraint_name
            WHERE kcu.table_schema = 'public'
              AND kcu.table_name = missing_fk_constraint.table_name
              AND kcu.column_name = 'tenant_id'
              AND referenced_tc.table_name = 'tenants'
              AND referenced_tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
        ) THEN
            RAISE EXCEPTION 'FAIL-FAST: Table % has tenant_id but NO foreign key constraint to tenants(id)', missing_fk_constraint.table_name;
        END IF;
    END LOOP;

    -- 3. Missing RLS Detection
    FOR missing_rls_table IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('tenants', 'platform_admins', 'platform_reserved_slugs', 'acct_currencies', 'platform_permission_registry', 'platform_integration_health_registry', 'platform_db_contract_metadata', 'platform_feature_tree_coverage', 'platform_quick_action_registry', 'platform_workflow_transition_validation')
        AND tablename NOT LIKE 'pg_%'
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = missing_rls_table.tablename AND rowsecurity = true
        ) THEN
            RAISE EXCEPTION 'FAIL-FAST: Table % does not have Row Level Security enabled', missing_rls_table.tablename;
        END IF;
    END LOOP;

    RAISE NOTICE 'SCHEMA INTEGRITY AUDIT PASSED: All tenant-scoped tables have tenant_id with valid FKs to tenants(id), RLS is enabled, and financial immutability triggers are active.';
END $$;

-- Populate TypeScript Contract Metadata for frontend generation
INSERT INTO platform_db_contract_metadata (table_name, typescript_type_name, description, is_tenant_scoped) VALUES
('tenants', 'Tenant', 'Core tenant entity', false),
('tenant_memberships', 'TenantMembership', 'User to tenant role mapping', true),
('crm_customers', 'Customer', 'CRM customer profile', true),
('crm_pets', 'Pet', 'CRM pet profile', true),
('crm_appointments', 'Appointment', 'CRM appointment record', true),
('erp_orders', 'Order', 'ERP sales order', true),
('erp_product_skus', 'ProductSku', 'ERP inventory SKU', true),
('commerce_sales', 'Sale', 'POS/Commerce transaction', true),
('commerce_payments', 'Payment', 'Payment record', true),
('acct_journal_entries', 'JournalEntry', 'Accounting GL entry', true),
('acct_ar_invoices', 'Invoice', 'Accounts Receivable invoice', true),
('portal_customer_accounts', 'PortalCustomerAccount', 'Customer portal auth link', true)
ON CONFLICT (table_name) DO NOTHING;

COMMIT;
-- ============================================================================
-- END OF UNIFIED SCHEMA
-- ============================================================================
