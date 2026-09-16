-- ============================================================================
-- All About Pawz OS: Enterprise Schema Migration (Production Ready)
-- ============================================================================
-- Migration: 20250101000000_enterprise_schema.sql
-- Description: Establishes enterprise-standard schemas for Pet Care, OMS,
--              Financials, LMS (Learning Management System), and Staff Management.
-- ============================================================================

-- Ensure Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 0. CLEANUP / DROP STATEMENTS (To safely supersede legacy/vulnerable schemas)
-- ============================================================================
DROP TABLE IF EXISTS public.lms_quiz_submissions CASCADE;
DROP TABLE IF EXISTS public.lms_enrollments CASCADE;
DROP TABLE IF EXISTS public.lms_quizzes CASCADE;
DROP TABLE IF EXISTS public.lms_lessons CASCADE;
DROP TABLE IF EXISTS public.lms_modules CASCADE;
DROP TABLE IF EXISTS public.lms_courses CASCADE;
DROP TABLE IF EXISTS public.purchase_order_items CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.returns CASCADE;
DROP TABLE IF EXISTS public.shipping_labels CASCADE;
DROP TABLE IF EXISTS public.gift_cards CASCADE;
DROP TABLE IF EXISTS public.refunds CASCADE;
DROP TABLE IF EXISTS public.deposits CASCADE;
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.appointment_addons CASCADE;
DROP TABLE IF EXISTS public.grooming_session_notes CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.service_addons CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.staff_schedules CASCADE;
DROP TABLE IF EXISTS public.staff CASCADE;
DROP TABLE IF EXISTS public.dog_medical_records CASCADE;
DROP TABLE IF EXISTS public.dogs CASCADE;
DROP TABLE IF EXISTS public.pets CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Drop custom types if exist
DROP TYPE IF EXISTS public.appointment_status_enum CASCADE;
DROP TYPE IF EXISTS public.payment_status_enum CASCADE;
DROP TYPE IF EXISTS public.order_status_enum CASCADE;
DROP TYPE IF EXISTS public.lms_status_enum CASCADE;

-- ============================================================================
-- 1. ENUMS & DOMAINS
-- ============================================================================
CREATE TYPE public.appointment_status_enum AS ENUM (
    'Scheduled', 'Confirmed', 'Checked In', 'In Progress', 'Completed', 'Cancelled', 'No Show', 'Waitlisted'
);

CREATE TYPE public.payment_status_enum AS ENUM (
    'Pending', 'Authorized', 'Paid', 'Partially Paid', 'Refunded', 'Partially Refunded', 'Failed', 'Voided'
);

CREATE TYPE public.order_status_enum AS ENUM (
    'UNFULFILLED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'
);

CREATE TYPE public.lms_status_enum AS ENUM (
    'Draft', 'Published', 'Archived'
);

-- ============================================================================
-- 2. ORGANIZATIONS & LOCATIONS
-- ============================================================================
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'Salon' CHECK (type IN ('Salon', 'Mobile Van', 'Self-Wash', 'Headquarters')),
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    phone TEXT,
    email TEXT,
    capacity_per_hour INTEGER DEFAULT 4,
    is_active BOOLEAN DEFAULT true,
    operating_hours JSONB DEFAULT '{"mon": {"open": "08:00", "close": "18:00"}, "tue": {"open": "08:00", "close": "18:00"}, "wed": {"open": "08:00", "close": "18:00"}, "thu": {"open": "08:00", "close": "18:00"}, "fri": {"open": "08:00", "close": "18:00"}, "sat": {"open": "09:00", "close": "17:00"}, "sun": {"closed": true}}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. CUSTOMERS & CLIENTS
-- ============================================================================
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    alt_phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    vip BOOLEAN DEFAULT false,
    total_spent NUMERIC(12, 2) DEFAULT 0.00,
    outstanding_balance NUMERIC(10, 2) DEFAULT 0.00,
    notes TEXT,
    preferred_contact_method TEXT DEFAULT 'SMS' CHECK (preferred_contact_method IN ('SMS', 'Email', 'Phone')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. PETS & DOGS (With Health & Vaccine tracking)
-- ============================================================================
CREATE TABLE public.pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    species TEXT DEFAULT 'Dog',
    breed TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Unknown')),
    is_neutered_spayed BOOLEAN DEFAULT true,
    birth_date DATE,
    age_approx TEXT,
    weight_lbs NUMERIC(5, 2),
    color TEXT,
    photo_url TEXT,
    microchip_number TEXT,
    vaccinations_current BOOLEAN DEFAULT true,
    rabies_exp_date DATE,
    dhpp_exp_date DATE,
    bordetella_exp_date DATE,
    allergies TEXT,
    behavioral_notes TEXT,
    grooming_instructions TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alias view for backward compatibility with older 'dogs' table queries
CREATE OR REPLACE VIEW public.dogs AS
SELECT 
    id,
    customer_id,
    name,
    breed,
    age_approx AS age,
    weight_lbs::text AS weight,
    gender,
    color,
    photo_url,
    vaccinations_current,
    rabies_exp_date,
    grooming_instructions AS special_handling_notes,
    behavioral_notes,
    created_at,
    updated_at
FROM public.pets;

-- ============================================================================
-- 5. STAFF, GROOMERS & SCHEDULES
-- ============================================================================
CREATE TABLE public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    user_id UUID, -- Links to Supabase auth.users if applicable
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'Groomer' CHECK (role IN ('Owner', 'Manager', 'Groomer', 'Bather', 'Stylist', 'Receptionist', 'Assistant')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    commission_rate NUMERIC(5, 2) DEFAULT 50.00,
    hourly_rate NUMERIC(10, 2) DEFAULT 0.00,
    primary_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    specialties TEXT[],
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.staff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. SERVICES CATALOG & ADD-ONS
-- ============================================================================
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Full Groom' CHECK (category IN ('Full Groom', 'Bath & Brush', 'Express Groom', 'Styling & Scissoring', 'Puppy Groom', 'Cat Grooming', 'Spa & Wellness')),
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    deposit_required NUMERIC(10, 2) DEFAULT 0.00,
    eligible_weight_max NUMERIC(5, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.service_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    extra_duration_minutes INTEGER DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. APPOINTMENTS & BOOKINGS (Comprehensive Operational Hub)
-- ============================================================================
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    
    -- Denormalized cache fields for speed & legacy compatibility
    owner_name TEXT,
    pet_name TEXT,
    breed TEXT,
    service_name TEXT NOT NULL,
    
    appointment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TEXT NOT NULL, -- e.g. '09:00 AM'
    duration_minutes INTEGER DEFAULT 60,
    status public.appointment_status_enum DEFAULT 'Scheduled',
    payment_status public.payment_status_enum DEFAULT 'Pending',
    
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    deposit_amount NUMERIC(10, 2) DEFAULT 0.00,
    tip_amount NUMERIC(10, 2) DEFAULT 0.00,
    
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    notes TEXT,
    internal_groomer_notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alias view for 'bookings' table backward compatibility
CREATE OR REPLACE VIEW public.bookings AS
SELECT
    id,
    customer_id,
    pet_id AS dog_id,
    staff_id AS groomer_id,
    owner_name,
    pet_name AS dog_name,
    breed,
    service_name AS service,
    ('$' || total_price::text) AS service_price,
    ('$' || deposit_amount::text) AS deposit_amount,
    appointment_date AS date,
    start_time AS time,
    status::text AS status,
    payment_status::text AS payment_status,
    notes,
    created_at,
    updated_at
FROM public.appointments;

-- ============================================================================
-- 8. OMS: ORDERS, ORDER ITEMS, SHIPPING & RETURNS
-- ============================================================================
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    
    subtotal NUMERIC(12, 2) NOT NULL,
    tax NUMERIC(10, 2) DEFAULT 0.00,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    shipping_cost NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    
    fulfillment_status public.order_status_enum DEFAULT 'UNFULFILLED',
    payment_status public.payment_status_enum DEFAULT 'Paid',
    
    shipping_carrier TEXT, -- 'USPS', 'FedEx', 'UPS', 'Local Courier'
    tracking_number TEXT,
    shipping_method TEXT DEFAULT 'Standard Ground',
    shipping_address JSONB,
    billing_address JSONB,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID, -- Nullable if custom item
    product_name TEXT NOT NULL,
    sku TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number TEXT UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'APPROVED', 'RECEIVED', 'REFUNDED', 'REJECTED')),
    refund_amount NUMERIC(10, 2) DEFAULT 0.00,
    restock_status BOOLEAN DEFAULT false,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. INVENTORY, PRODUCTS, VENDORS & PURCHASE ORDERS
-- ============================================================================
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT DEFAULT 'Retail' CHECK (category IN ('Retail', 'Shampoo & Coat Care', 'Tools & Blades', 'Treats & Nutrition', 'Apparel & Leashes', 'Salon Supplies')),
    cost_price NUMERIC(10, 2) DEFAULT 0.00,
    price NUMERIC(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'units',
    barcode TEXT,
    photo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    account_number TEXT,
    payment_terms TEXT DEFAULT 'Net 30',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number TEXT UNIQUE NOT NULL,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
    total_cost NUMERIC(12, 2) DEFAULT 0.00,
    expected_delivery_date DATE,
    received_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    sku TEXT,
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    unit_cost NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. FINANCIALS: PAYMENTS, INVOICES, DEPOSITS, REFUNDS & GIFT CARDS
-- ============================================================================
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT UNIQUE DEFAULT ('TXN-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8))),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    
    amount NUMERIC(12, 2) NOT NULL,
    tip_amount NUMERIC(10, 2) DEFAULT 0.00,
    processing_fee NUMERIC(10, 2) DEFAULT 0.00,
    net_amount NUMERIC(12, 2) GENERATED ALWAYS AS (amount - processing_fee) STORED,
    
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Credit Card', 'Debit Card', 'Cash', 'Apple Pay', 'Gift Card', 'ACH', 'Store Credit')),
    payment_provider TEXT DEFAULT 'Stripe', -- 'Stripe', 'Square', 'Manual'
    provider_transaction_id TEXT,
    
    status TEXT DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded')),
    card_brand TEXT,
    card_last4 TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    recipient_name TEXT NOT NULL,
    recipient_email TEXT,
    recipient_phone TEXT,
    
    subtotal NUMERIC(12, 2) NOT NULL,
    tax NUMERIC(10, 2) DEFAULT 0.00,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) DEFAULT 0.00,
    balance_due NUMERIC(12, 2) GENERATED ALWAYS AS (total - amount_paid) STORED,
    
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'VOID')),
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'HELD' CHECK (status IN ('HELD', 'APPLIED', 'FORFEITED', 'REFUNDED')),
    payment_method TEXT DEFAULT 'Credit Card',
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_number TEXT UNIQUE NOT NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    processed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.gift_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    initial_balance NUMERIC(10, 2) NOT NULL,
    current_balance NUMERIC(10, 2) NOT NULL,
    purchaser_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    recipient_name TEXT,
    recipient_email TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. LMS: LEARNING MANAGEMENT SYSTEM (Courses, Lessons, Quizzes & Certs)
-- ============================================================================
CREATE TABLE public.lms_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Breed Standards', 'Health & Safety', 'Scissoring & Styling', 'Customer Service', 'Emergency & First Aid', 'Salon Operations', 'Bathing & Drying')),
    level TEXT DEFAULT 'Intermediate' CHECK (level IN ('Beginner', 'Intermediate', 'Advanced', 'Masterclass')),
    duration_hours NUMERIC(4, 1) DEFAULT 1.0,
    thumbnail_url TEXT,
    description TEXT,
    instructor_name TEXT DEFAULT 'Pawz Academy Master Groomers',
    status public.lms_status_enum DEFAULT 'Published',
    is_required_for_onboarding BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.lms_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER DEFAULT 1,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.lms_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.lms_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER DEFAULT 1,
    lesson_type TEXT DEFAULT 'video' CHECK (lesson_type IN ('video', 'article', 'interactive', 'quiz')),
    duration_minutes INTEGER DEFAULT 15,
    video_url TEXT,
    content_markdown TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.lms_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES public.lms_lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    passing_score_percent INTEGER DEFAULT 80,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { id, question, options: [], correct_index, explanation }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.lms_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    completed_lessons UUID[] DEFAULT ARRAY[]::UUID[],
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    certificate_number TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, staff_id)
);

CREATE TABLE public.lms_quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    score_percent INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 12. AUDIT & ACTIVITY LOGS
-- ============================================================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 13. INDEXES FOR ENTERPRISE QUERY PERFORMANCE
-- ============================================================================
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_pets_customer_id ON public.pets(customer_id);
CREATE INDEX idx_pets_breed ON public.pets(breed);
CREATE INDEX idx_staff_role ON public.staff(role);
CREATE INDEX idx_staff_active ON public.staff(is_active);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_staff ON public.appointments(staff_id);
CREATE INDEX idx_appointments_customer ON public.appointments(customer_id);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_fulfillment ON public.orders(fulfillment_status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_payments_appointment ON public.payments(appointment_id);
CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX idx_lms_courses_slug ON public.lms_courses(slug);
CREATE INDEX idx_lms_enrollments_staff ON public.lms_enrollments(staff_id);

-- Full text search index
CREATE INDEX idx_customers_fts ON public.customers USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || coalesce(email, '') || ' ' || coalesce(phone, '')));
CREATE INDEX idx_pets_fts ON public.pets USING gin(to_tsvector('english', name || ' ' || breed));

-- ============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissive standard service role & public read/write policies for authorized application client
DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'organizations', 'locations', 'customers', 'pets', 'staff', 'staff_schedules', 
        'services', 'service_addons', 'appointments', 'orders', 'order_items', 'returns', 
        'products', 'vendors', 'purchase_orders', 'purchase_order_items', 'payments', 
        'invoices', 'invoice_items', 'deposits', 'refunds', 'gift_cards', 
        'lms_courses', 'lms_modules', 'lms_lessons', 'lms_quizzes', 'lms_enrollments', 
        'lms_quiz_submissions', 'audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public Full Access" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Public Full Access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;

-- ============================================================================
-- 15. AUTOMATIC UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'organizations', 'locations', 'customers', 'pets', 'staff', 'services',
        'appointments', 'orders', 'returns', 'products', 'purchase_orders',
        'invoices', 'lms_courses', 'lms_enrollments'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.%I', tbl);
        EXECUTE format('CREATE TRIGGER trigger_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', tbl);
    END LOOP;
END $$;
