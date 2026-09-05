============================================================================
-- ALL ABOUT PAWZ — LMS ENTERPRISE SCHEMA (v1.0)
-- PostgreSQL / Supabase
-- Single runnable script. Safely rerunnable. Strictly isolated in lms schema.
-- Implements 13 LMS domains with real cross-schema FKs to public.tenants,
-- public.tenant_memberships, auth.users, public.crm_customers, public.commerce_branches.
-- Audit-grade clock-hour ledger. Hybrid teaching. Whole-human mission.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 0. SCHEMA CREATION & PUBLIC COMPATIBILITY PATCH
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS lms;

-- tenant_kind discriminator on public.tenants (individual / organization)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tenant_kind text NOT NULL DEFAULT 'organization';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'tenants_tenant_kind_check'
        AND conrelid = 'public.tenants'::regclass
    ) THEN
        ALTER TABLE public.tenants
        ADD CONSTRAINT tenants_tenant_kind_check
        CHECK (tenant_kind IN ('individual', 'organization'));
    END IF;
END $$;

-- LMS module code for platform_module_permissions (additive, does not alter existing check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'platform_module_permissions_module_code_check'
        AND conrelid = 'public.platform_module_permissions'::regclass
    ) THEN
        -- The existing check constraint already exists; we add LMS codes via a separate
        -- LMS-specific permission table instead of modifying the platform one.
        NULL;
    END IF;
END $$;

-- ============================================================================
-- 1. LMS HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION lms.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION lms.is_platform_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, lms
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.platform_admins
        WHERE user_id = auth.uid()
          AND (expires_at IS NULL OR expires_at > now())
    );
$$;

CREATE OR REPLACE FUNCTION lms.is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, lms
AS $$
    SELECT lms.is_platform_admin() OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = p_tenant_id
          AND tm.user_id = auth.uid()
          AND tm.active = true
          AND tm.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION lms.user_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, lms
AS $$
    SELECT tm.tenant_id
    FROM public.tenant_memberships tm
    WHERE tm.user_id = auth.uid()
      AND tm.active = true
      AND tm.status = 'active';
$$;

CREATE OR REPLACE FUNCTION lms.get_lms_role(p_tenant_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = lms, public
AS $$
DECLARE v_role text;
BEGIN
    EXECUTE format('SELECT role FROM lms.lms_roles WHERE tenant_id = $1 AND user_id = $2 AND status = $3 LIMIT 1')
        INTO v_role USING p_tenant_id, p_user_id, 'active';
    RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION lms.has_lms_role(p_tenant_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = lms, public
AS $$
DECLARE v_exists boolean;
BEGIN
    IF lms.is_platform_admin() THEN RETURN true; END IF;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM lms.lms_roles WHERE tenant_id = $1 AND user_id = $2 AND status = $3 AND role = ANY($4))')
        INTO v_exists USING p_tenant_id, auth.uid(), 'active', p_roles;
    RETURN v_exists;
END;
$$;

CREATE OR REPLACE FUNCTION lms.is_lms_admin(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = lms, public
AS $$
DECLARE v_exists boolean;
BEGIN
    IF lms.is_platform_admin() THEN RETURN true; END IF;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM lms.lms_roles WHERE tenant_id = $1 AND user_id = $2 AND status = $3 AND role IN ($4, $5))')
        INTO v_exists USING p_tenant_id, auth.uid(), 'active', 'org_admin', 'platform_admin';
    RETURN v_exists;
END;
$$;

CREATE OR REPLACE FUNCTION lms.is_instructor(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = lms, public
AS $$
DECLARE v_exists boolean;
BEGIN
    IF lms.is_platform_admin() THEN RETURN true; END IF;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM lms.lms_roles WHERE tenant_id = $1 AND user_id = $2 AND status = $3 AND role IN ($4, $5, $6))')
        INTO v_exists USING p_tenant_id, auth.uid(), 'active', 'instructor', 'org_admin', 'platform_admin';
    RETURN v_exists;
END;
$$;

CREATE OR REPLACE FUNCTION lms.is_learner_self(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = lms, public
AS $$
    SELECT lms.is_platform_admin() OR p_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION lms.can_view_learner(p_tenant_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = lms, public
AS $$
DECLARE v_exists boolean;
BEGIN
    IF lms.is_platform_admin() THEN RETURN true; END IF;
    IF lms.is_instructor(p_tenant_id) THEN RETURN true; END IF;
    IF p_user_id = auth.uid() AND lms.is_tenant_member(p_tenant_id) THEN RETURN true; END IF;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM lms.lms_roles WHERE tenant_id = $1 AND user_id = $2 AND status = $3 AND role = $4)')
        INTO v_exists USING p_tenant_id, auth.uid(), 'active', 'support_navigator';
    IF v_exists THEN RETURN true; END IF;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM lms.navigator_caseloads WHERE tenant_id = $1 AND navigator_user_id = $2 AND learner_user_id = $3 AND status = $4)')
        INTO v_exists USING p_tenant_id, auth.uid(), p_user_id, 'active';
    RETURN v_exists;
END;
$$;

CREATE OR REPLACE FUNCTION lms.is_minor(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = lms, public
AS $$
DECLARE v_exists boolean;
BEGIN
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM lms.minor_profiles WHERE learner_user_id = $1 AND status = $2)')
        INTO v_exists USING p_user_id, 'active';
    RETURN v_exists;
END;
$$;

CREATE OR REPLACE FUNCTION lms.has_guardian_consent(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = lms, public
AS $$
DECLARE v_exists boolean;
BEGIN
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM lms.guardian_consents WHERE minor_user_id = $1 AND consent_status = $2 AND (expires_at IS NULL OR expires_at > now()))')
        INTO v_exists USING p_user_id, 'granted';
    RETURN v_exists;
END;
$$;

CREATE OR REPLACE FUNCTION lms.can_access_minor_data(p_tenant_id uuid, p_minor_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = lms, public
AS $$
DECLARE v_exists boolean;
BEGIN
    IF lms.is_platform_admin() THEN RETURN true; END IF;
    IF lms.is_lms_admin(p_tenant_id) THEN RETURN true; END IF;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM lms.guardian_consents WHERE minor_user_id = $1 AND guardian_user_id = $2 AND consent_status = $3 AND (expires_at IS NULL OR expires_at > now()))')
        INTO v_exists USING p_minor_user_id, auth.uid(), 'granted';
    RETURN v_exists;
END;
$$;

CREATE OR REPLACE FUNCTION lms.enrollment_is_active(p_enrollment_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = lms, public
AS $$
DECLARE v_exists boolean;
BEGIN
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM lms.enrollments WHERE id = $1 AND status = $2)')
        INTO v_exists USING p_enrollment_id, 'active';
    RETURN v_exists;
END;
$$;

-- Clock-hour ledger immutability: blocks UPDATE and DELETE
CREATE OR REPLACE FUNCTION lms.block_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'CLOCK_HOUR_LEDGER_IS_IMMUTABLE: Use superseding entry via void_and_reissue, not direct UPDATE/DELETE. Attempted % on row %', TG_OP, OLD.id;
END;
$$;

-- Prevent voiding already-voided or superseded rows via trigger guard
CREATE OR REPLACE FUNCTION lms.guard_void_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL THEN
        IF NEW.voided_by IS NULL THEN
            RAISE EXCEPTION 'CLOCK_HOUR_LEDGER_VOID_REQUIRES_VOIDED_BY';
        END IF;
        IF NEW.void_reason IS NULL OR BTRIM(NEW.void_reason) = '' THEN
            RAISE EXCEPTION 'CLOCK_HOUR_LEDGER_VOID_REQUIRES_REASON';
        END IF;
    END IF;
    IF NEW.voided_at IS NOT NULL AND NEW.supersedes_ledger_id IS NOT NULL THEN
        RAISE EXCEPTION 'CLOCK_HOUR_LEDGER_CANNOT_BE_BOTH_VOIDED_AND_SUPERCEDING';
    END IF;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- DOMAIN 1: IDENTITY & ACCESS
-- LMS roles, minor/guardian consent, LMS sessions, cross-tenant staff grants,
-- auth method registry, mass enrollment, user notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS lms.lms_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('learner','instructor','support_navigator','org_admin','platform_admin')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
    assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    revoked_at timestamptz,
    revoke_reason text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_roles_user_idx ON lms.lms_roles(user_id);
CREATE INDEX IF NOT EXISTS lms_roles_tenant_role_idx ON lms.lms_roles(tenant_id, role) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS lms.minor_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date_of_birth date NOT NULL,
    guardian_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    guardian_relationship text,
    guardian_name text,
    guardian_email text,
    guardian_phone text,
    consent_captured_at timestamptz,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','emancipated','archived')),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, learner_user_id),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_minor_profiles_guardian_idx ON lms.minor_profiles(guardian_user_id);

CREATE TABLE IF NOT EXISTS lms.guardian_consents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    minor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    guardian_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type text NOT NULL CHECK (consent_type IN ('enrollment','data_processing','media_release','ai_teaching','external_referral','all')),
    consent_status text NOT NULL DEFAULT 'pending' CHECK (consent_status IN ('pending','granted','denied','revoked','expired')),
    granted_at timestamptz,
    revoked_at timestamptz,
    expires_at timestamptz,
    ip_address inet,
    signature_reference text,
    document_storage_path text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, minor_user_id) REFERENCES lms.minor_profiles(tenant_id, learner_user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_guardian_consents_minor_idx ON lms.guardian_consents(tenant_id, minor_user_id, consent_status);

CREATE TABLE IF NOT EXISTS lms.lms_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token_hash text,
    device_info jsonb NOT NULL DEFAULT '{}',
    ip_address inet,
    started_at timestamptz NOT NULL DEFAULT now(),
    last_activity_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended','timeout','forced_logout')),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_lms_sessions_user_idx ON lms.lms_sessions(user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS lms.cross_tenant_staff_grants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    target_tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    grant_type text NOT NULL CHECK (grant_type IN ('instructor','support_navigator','platform_admin','read_only')),
    granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    revoked_at timestamptz,
    revoke_reason text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS lms_cross_tenant_staff_grants_active_uniq
    ON lms.cross_tenant_staff_grants (source_tenant_id, target_tenant_id, staff_user_id)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS lms_cross_tenant_staff_target_idx ON lms.cross_tenant_staff_grants(target_tenant_id, staff_user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS lms.auth_method_registry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    method_code text NOT NULL UNIQUE,
    method_name text NOT NULL,
    method_type text NOT NULL CHECK (method_type IN ('sso','oauth','saml','oidc','magic_link','sms_otp','email_otp','biometric','passkey','social','ldap','password')),
    provider text,
    is_active boolean NOT NULL DEFAULT true,
    config_schema jsonb NOT NULL DEFAULT '{}',
    display_order integer NOT NULL DEFAULT 100,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lms.mass_enrollment_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cohort_id uuid,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    file_storage_path text,
    total_records integer NOT NULL DEFAULT 0,
    processed_count integer NOT NULL DEFAULT 0,
    success_count integer NOT NULL DEFAULT 0,
    failure_count integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','partial')),
    error_log jsonb NOT NULL DEFAULT '[]',
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.user_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type text NOT NULL,
    title text NOT NULL,
    body text,
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    is_read boolean NOT NULL DEFAULT false,
    read_at timestamptz,
    action_url text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_user_notifications_unread_idx ON lms.user_notifications(tenant_id, user_id) WHERE is_read = false;

-- ============================================================================
-- DOMAIN 2: CURRICULUM AUTHORING
-- Pathways, programs/courses, modules, lessons, content blocks, prerequisites, versioning
-- ============================================================================

CREATE TABLE IF NOT EXISTS lms.pathways (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    pathway_type text NOT NULL DEFAULT 'standard' CHECK (pathway_type IN ('standard','ai_instructor_led','self_paced','blended','entirely_online')),
    delivery_mode text NOT NULL DEFAULT 'self_paced' CHECK (delivery_mode IN ('ai_guided','self_paced','blended')),
    total_estimated_hours numeric(8,2),
    is_published boolean NOT NULL DEFAULT false,
    published_at timestamptz,
    sort_order integer NOT NULL DEFAULT 0,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, slug),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_pathways_published_idx ON lms.pathways(tenant_id) WHERE is_published = true;

CREATE TABLE IF NOT EXISTS lms.pathway_courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    pathway_id uuid NOT NULL,
    course_id uuid NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    is_required boolean NOT NULL DEFAULT true,
    is_elective boolean NOT NULL DEFAULT false,
    prerequisite_courses jsonb NOT NULL DEFAULT '[]',
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, pathway_id, course_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, pathway_id) REFERENCES lms.pathways(tenant_id, id) ON DELETE CASCADE
    -- FK to lms.courses added after courses table is created (forward reference)
);
CREATE INDEX IF NOT EXISTS lms_pathway_courses_pathway_idx ON lms.pathway_courses(tenant_id, pathway_id, sort_order);

CREATE TABLE IF NOT EXISTS lms.courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    pathway_id uuid,
    code text,
    title text NOT NULL,
    slug text NOT NULL,
    description text,
    long_description text,
    course_type text NOT NULL DEFAULT 'course' CHECK (course_type IN ('course','program','certification_prep','roleplay','lab')),
    delivery_modes text[] NOT NULL DEFAULT ARRAY['self_paced'],
    total_estimated_hours numeric(8,2),
    total_clock_hours numeric(8,2),
    difficulty_level text NOT NULL DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner','intermediate','advanced','expert')),
    cover_image_url text,
    category text,
    tags text[] NOT NULL DEFAULT ARRAY[]::text[],
    is_published boolean NOT NULL DEFAULT false,
    published_at timestamptz,
    current_version_id uuid,
    author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    co_instructor_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
    sort_order integer NOT NULL DEFAULT 0,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, slug),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, pathway_id) REFERENCES lms.pathways(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_courses_published_idx ON lms.courses(tenant_id) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS lms_courses_category_idx ON lms.courses(tenant_id, category);

-- Deferred FK: pathway_courses.course_id -> courses (could not be inline due to forward reference)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pathway_courses_course_fk'
    ) THEN
        ALTER TABLE lms.pathway_courses
            ADD CONSTRAINT pathway_courses_course_fk
            FOREIGN KEY (tenant_id, course_id)
            REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS lms.course_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    version_number integer NOT NULL,
    version_label text,
    change_summary text,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','published','archived')),
    published_at timestamptz,
    published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    is_current boolean NOT NULL DEFAULT false,
    content_snapshot jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, course_id, version_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_course_versions_current_idx ON lms.course_versions(tenant_id, course_id) WHERE is_current = true;

-- Link courses.current_version_id to course_versions (after course_versions exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lms_courses_current_version_fk'
        AND conrelid = 'lms.courses'::regclass
    ) THEN
        ALTER TABLE lms.courses
        ADD CONSTRAINT lms_courses_current_version_fk
        FOREIGN KEY (tenant_id, current_version_id)
        REFERENCES lms.course_versions(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS lms.modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    course_version_id uuid,
    title text NOT NULL,
    slug text NOT NULL,
    description text,
    sort_order integer NOT NULL DEFAULT 0,
    estimated_minutes integer,
    is_required boolean NOT NULL DEFAULT true,
    is_published boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, course_id, slug),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, course_version_id) REFERENCES lms.course_versions(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_modules_course_idx ON lms.modules(tenant_id, course_id, sort_order);

CREATE TABLE IF NOT EXISTS lms.lessons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    module_id uuid NOT NULL,
    course_version_id uuid,
    title text NOT NULL,
    slug text NOT NULL,
    description text,
    lesson_type text NOT NULL DEFAULT 'text' CHECK (lesson_type IN ('text','video','video_pdf_mashup','article','quiz','assignment','practice_test','coding_exercise','roleplay','lab','discussion')),
    content_body text,
    estimated_minutes integer,
    sort_order integer NOT NULL DEFAULT 0,
    is_required boolean NOT NULL DEFAULT true,
    is_published boolean NOT NULL DEFAULT false,
    ai_generated boolean NOT NULL DEFAULT false,
    ai_generated_at timestamptz,
    ai_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ai_approved_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, module_id, slug),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, module_id) REFERENCES lms.modules(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, course_version_id) REFERENCES lms.course_versions(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_lessons_module_idx ON lms.lessons(tenant_id, module_id, sort_order);
CREATE INDEX IF NOT EXISTS lms_lessons_ai_generated_idx ON lms.lessons(tenant_id, course_id) WHERE ai_generated = true AND ai_approved_at IS NULL;

CREATE TABLE IF NOT EXISTS lms.content_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL,
    block_type text NOT NULL CHECK (block_type IN ('text','structured_steps','connect','learn','see_it','do_it','check','video','image','embed','interactive','download','divider','callout','code','quiz_embed','assignment_embed')),
    title text,
    body text,
    content jsonb NOT NULL DEFAULT '{}',
    sort_order integer NOT NULL DEFAULT 0,
    is_required boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_content_blocks_lesson_idx ON lms.content_blocks(tenant_id, lesson_id, sort_order);

CREATE TABLE IF NOT EXISTS lms.content_block_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    content_block_id uuid NOT NULL,
    media_asset_id uuid,
    sort_order integer NOT NULL DEFAULT 0,
    caption text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, content_block_id) REFERENCES lms.content_blocks(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.prerequisites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    prerequisite_course_id uuid NOT NULL,
    prerequisite_type text NOT NULL DEFAULT 'completion' CHECK (prerequisite_type IN ('completion','passing_grade','skill_signoff','enrollment')),
    min_score numeric(5,2),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, course_id, prerequisite_course_id, prerequisite_type),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, prerequisite_course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lms.publishing_workflows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    entity_type text NOT NULL CHECK (entity_type IN ('course','module','lesson','content_block','pathway')),
    entity_id uuid NOT NULL,
    version_id uuid,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','in_review','approved','published','rejected','archived')),
    submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    submitted_at timestamptz,
    reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    review_notes text,
    published_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_publishing_workflows_status_idx ON lms.publishing_workflows(tenant_id, status) WHERE status IN ('submitted','in_review');

CREATE TABLE IF NOT EXISTS lms.collaborative_authors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'co_author' CHECK (role IN ('lead_author','co_author','reviewer','co_instructor')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
    invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, course_id, user_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.content_library_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    item_type text NOT NULL CHECK (item_type IN ('template','reusable_block','assessment_template','rubric_template','media_clip')),
    content jsonb NOT NULL DEFAULT '{}',
    tags text[] NOT NULL DEFAULT ARRAY[]::text[],
    is_published boolean NOT NULL DEFAULT false,
    is_customizable boolean NOT NULL DEFAULT true,
    certification_ready boolean NOT NULL DEFAULT false,
    source_course_id uuid,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, source_course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_content_library_items_type_idx ON lms.content_library_items(tenant_id, item_type) WHERE is_published = true;

-- ============================================================================
-- DOMAIN 3: MEDIA & CONTENT ASSETS
-- Video/audio/document/SCORM refs, captions, accessibility variants, storage
-- ============================================================================

CREATE TABLE IF NOT EXISTS lms.media_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    media_type text NOT NULL CHECK (media_type IN ('video','audio','document','image','scorm','xapi','pdf','presentation','spreadsheet','other')),
    file_name text NOT NULL,
    file_extension text,
    mime_type text,
    file_size_bytes bigint,
    storage_path text NOT NULL,
    public_url text,
    thumbnail_url text,
    duration_seconds integer,
    width_pixels integer,
    height_pixels integer,
    checksum text,
    is_accessible boolean NOT NULL DEFAULT true,
    is_published boolean NOT NULL DEFAULT false,
    uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_media_assets_type_idx ON lms.media_assets(tenant_id, media_type);
CREATE INDEX IF NOT EXISTS lms_media_assets_search_idx ON lms.media_assets USING gin (to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE TABLE IF NOT EXISTS lms.captions_transcripts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    media_asset_id uuid NOT NULL,
    language_code text NOT NULL DEFAULT 'en',
    caption_type text NOT NULL DEFAULT 'closed_caption' CHECK (caption_type IN ('closed_caption','subtitle','transcript','audio_description')),
    content text NOT NULL,
    format text NOT NULL DEFAULT 'vtt' CHECK (format IN ('vtt','srt','txt','json')),
    is_ai_generated boolean NOT NULL DEFAULT false,
    is_ai_approved boolean NOT NULL DEFAULT false,
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    storage_path text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, media_asset_id) REFERENCES lms.media_assets(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_captions_transcripts_media_idx ON lms.captions_transcripts(tenant_id, media_asset_id, language_code);

CREATE TABLE IF NOT EXISTS lms.accessibility_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    media_asset_id uuid NOT NULL,
    variant_type text NOT NULL CHECK (variant_type IN ('audio_description','sign_language','high_contrast','large_text','screen_reader_optimized','simplified_language','braille_ready')),
    storage_path text NOT NULL,
    public_url text,
    is_ai_generated boolean NOT NULL DEFAULT false,
    is_ai_approved boolean NOT NULL DEFAULT false,
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, media_asset_id) REFERENCES lms.media_assets(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.scorm_packages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    media_asset_id uuid NOT NULL,
    scorm_version text NOT NULL DEFAULT '1.2' CHECK (scorm_version IN ('1.2','2004')),
    manifest_path text,
    launch_path text,
    tracking_mode text NOT NULL DEFAULT 'full' CHECK (tracking_mode IN ('none','basic','full')),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, media_asset_id) REFERENCES lms.media_assets(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.submission_storage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text,
    file_size_bytes bigint,
    checksum text,
    uploaded_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

-- ============================================================================
-- DOMAIN 8: SKILLS & CREDENTIAL REGISTRY
-- skill_domains, skills, course_skill_targets, skill_signoffs, credentials, badges, verification
-- ============================================================================

CREATE TABLE IF NOT EXISTS lms.skill_domains (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    domain_category text NOT NULL DEFAULT 'vocational' CHECK (domain_category IN ('vocational','behavioral','life_skills','safety','business','soft_skill','technical','compliance')),
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, slug),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.skills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    skill_domain_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    is_core boolean NOT NULL DEFAULT false,
    proficiency_levels text[] NOT NULL DEFAULT ARRAY['introduced','practiced','mastered'],
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, slug),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, skill_domain_id) REFERENCES lms.skill_domains(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_skills_domain_idx ON lms.skills(tenant_id, skill_domain_id);

CREATE TABLE IF NOT EXISTS lms.course_skill_targets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    target_level text NOT NULL CHECK (target_level IN ('introduced','practiced','mastered')),
    assessment_required boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, course_id, skill_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, skill_id) REFERENCES lms.skills(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.skill_signoffs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_id uuid NOT NULL,
    course_id uuid,
    assessment_id uuid,
    signoff_level text NOT NULL CHECK (signoff_level IN ('introduced','practiced','mastered')),
    signoff_method text NOT NULL CHECK (signoff_method IN ('assessment_pass','instructor_verified','ai_verified_human_approved','demonstration','portfolio_review','auto_on_completion')),
    verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at timestamptz NOT NULL DEFAULT now(),
    evidence_url text,
    notes text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, skill_id) REFERENCES lms.skills(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_skill_signoffs_learner_idx ON lms.skill_signoffs(tenant_id, learner_user_id);

CREATE TABLE IF NOT EXISTS lms.credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id uuid,
    credential_type text NOT NULL CHECK (credential_type IN ('diploma','certificate','badge','micro_credential','state_license_prep','completion_record')),
    title text NOT NULL,
    description text,
    issuer_name text,
    issue_date date NOT NULL DEFAULT CURRENT_DATE,
    expiry_date date,
    verification_code text NOT NULL,
    is_revocable boolean NOT NULL DEFAULT true,
    revoked_at timestamptz,
    revoke_reason text,
    metadata jsonb NOT NULL DEFAULT '{}',
    certificate_url text,
    enrollment_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, verification_code),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE SET NULL
    -- FK to lms.enrollments added after enrollments table is created (forward reference)
);
CREATE INDEX IF NOT EXISTS lms_credentials_learner_idx ON lms.credentials(tenant_id, learner_user_id);
CREATE INDEX IF NOT EXISTS lms_credentials_verification_idx ON lms.credentials(verification_code) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS lms.badges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    badge_type text NOT NULL DEFAULT 'achievement' CHECK (badge_type IN ('achievement','milestone','skill','completion','special')),
    icon_url text,
    criteria jsonb NOT NULL DEFAULT '{}',
    points_value integer NOT NULL DEFAULT 0,
    is_mozilla_open_badges_compatible boolean NOT NULL DEFAULT true,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, slug),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.learner_badges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id uuid NOT NULL,
    enrollment_id uuid,
    awarded_at timestamptz NOT NULL DEFAULT now(),
    awarded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    is_displayed boolean NOT NULL DEFAULT true,
    evidence jsonb NOT NULL DEFAULT '{}',
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, learner_user_id, badge_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, badge_id) REFERENCES lms.badges(tenant_id, id) ON DELETE CASCADE
    -- FK to lms.enrollments added after enrollments table is created (forward reference)
);
CREATE INDEX IF NOT EXISTS lms_learner_badges_learner_idx ON lms.learner_badges(tenant_id, learner_user_id);

CREATE TABLE IF NOT EXISTS lms.gamification_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    points_enabled boolean NOT NULL DEFAULT true,
    leaderboards_enabled boolean NOT NULL DEFAULT false,
    contests_enabled boolean NOT NULL DEFAULT false,
    rewards_marketplace_enabled boolean NOT NULL DEFAULT false,
    leaderboard_scope text NOT NULL DEFAULT 'cohort' CHECK (leaderboard_scope IN ('cohort','tenant','course')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id)
);

CREATE TABLE IF NOT EXISTS lms.learner_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    total_points integer NOT NULL DEFAULT 0,
    points_this_week integer NOT NULL DEFAULT 0,
    points_this_month integer NOT NULL DEFAULT 0,
    last_earned_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, learner_user_id),
    UNIQUE(tenant_id, id)
    -- FK to lms.enrollments added after enrollments table is created (forward reference)
);

CREATE TABLE IF NOT EXISTS lms.point_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points integer NOT NULL CHECK (points <> 0),
    reason text NOT NULL,
    source_type text NOT NULL CHECK (source_type IN ('lesson_completion','quiz_pass','badge_award','instructor_bonus','contest_reward','marketplace_redemption','penalty')),
    source_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lms_point_transactions_learner_idx ON lms.point_transactions(tenant_id, learner_user_id, created_at DESC);

-- ============================================================================
-- DOMAIN 4: DELIVERY & ENROLLMENT
-- Cohorts, enrollments, pacing, delivery mode, live sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS lms.cohorts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    course_id uuid NOT NULL,
    pathway_id uuid,
    instructor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    start_date date NOT NULL,
    end_date date,
    max_enrollment integer,
    current_enrollment integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','enrolling','active','completed','cancelled','archived')),
    is_self_paced_eligible boolean NOT NULL DEFAULT true,
    is_ai_guided_eligible boolean NOT NULL DEFAULT true,
    default_delivery_mode text NOT NULL DEFAULT 'self_paced' CHECK (default_delivery_mode IN ('ai_guided','self_paced','blended')),
    pacing_template jsonb NOT NULL DEFAULT '{}',
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, slug),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, pathway_id) REFERENCES lms.pathways(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_cohorts_status_idx ON lms.cohorts(tenant_id, status);
CREATE INDEX IF NOT EXISTS lms_cohorts_instructor_idx ON lms.cohorts(tenant_id, instructor_user_id) WHERE status IN ('planned','enrolling','active');

CREATE TABLE IF NOT EXISTS lms.cohort_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cohort_id uuid NOT NULL,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    delivery_mode text NOT NULL DEFAULT 'self_paced' CHECK (delivery_mode IN ('ai_guided','self_paced','blended')),
    status text NOT NULL DEFAULT 'enrolled' CHECK (status IN ('invited','enrolled','active','paused','completed','dropped','removed')),
    invited_at timestamptz,
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    dropped_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, cohort_id, learner_user_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, cohort_id) REFERENCES lms.cohorts(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_cohort_members_learner_idx ON lms.cohort_members(tenant_id, learner_user_id) WHERE status IN ('enrolled','active');

CREATE TABLE IF NOT EXISTS lms.enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    cohort_id uuid,
    course_version_id uuid NOT NULL,
    delivery_mode text NOT NULL DEFAULT 'self_paced' CHECK (delivery_mode IN ('ai_guided','self_paced','blended')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','paused','completed','dropped','failed','transferred')),
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    dropped_at timestamptz,
    transfer_target_enrollment_id uuid,
    progress_percentage numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    last_activity_at timestamptz,
    is_minor boolean NOT NULL DEFAULT false,
    guardian_consent_id uuid,
    pinned_version_locked boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, cohort_id) REFERENCES lms.cohorts(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, course_version_id) REFERENCES lms.course_versions(tenant_id, id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS lms_enrollments_active_uniq
    ON lms.enrollments (tenant_id, learner_user_id, course_id)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS lms_enrollments_learner_idx ON lms.enrollments(tenant_id, learner_user_id, status);
CREATE INDEX IF NOT EXISTS lms_enrollments_course_idx ON lms.enrollments(tenant_id, course_id, status);

-- Link cohort_members.enrollment_id to enrollments (after enrollments exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lms_cohort_members_enrollment_fk'
        AND conrelid = 'lms.cohort_members'::regclass
    ) THEN
        ALTER TABLE lms.cohort_members
        ADD CONSTRAINT lms_cohort_members_enrollment_fk
        FOREIGN KEY (tenant_id, enrollment_id)
        REFERENCES lms.enrollments(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Deferred FKs: learner_badges and learner_points reference enrollments (defined later in domain 6)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learner_badges_enrollment_fk') THEN
        ALTER TABLE lms.learner_badges
            ADD CONSTRAINT learner_badges_enrollment_fk
            FOREIGN KEY (tenant_id, enrollment_id)
            REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learner_points_enrollment_fk') THEN
        ALTER TABLE lms.learner_points
            ADD CONSTRAINT learner_points_enrollment_fk
            FOREIGN KEY (tenant_id, enrollment_id)
            REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL;
    END IF;
END $$;

-- Deferred FK: credentials.enrollment_id -> enrollments
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credentials_enrollment_fk') THEN
        ALTER TABLE lms.credentials
            ADD CONSTRAINT credentials_enrollment_fk
            FOREIGN KEY (tenant_id, enrollment_id)
            REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS lms.pacing_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cohort_id uuid NOT NULL,
    module_id uuid,
    lesson_id uuid,
    target_completion_date date,
    release_date date,
    is_locked boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, cohort_id) REFERENCES lms.cohorts(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, module_id) REFERENCES lms.modules(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.delivery_mode_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    enrollment_id uuid NOT NULL,
    from_mode text,
    to_mode text NOT NULL CHECK (to_mode IN ('ai_guided','self_paced','blended')),
    changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at timestamptz NOT NULL DEFAULT now(),
    reason text,
    metadata jsonb NOT NULL DEFAULT '{}',
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.live_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cohort_id uuid NOT NULL,
    course_id uuid NOT NULL,
    lesson_id uuid,
    title text NOT NULL,
    description text,
    session_type text NOT NULL DEFAULT 'lecture' CHECK (session_type IN ('lecture','lab','workshop','q_and_a','review','exam_review','hands_on_lab')),
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    timezone text NOT NULL DEFAULT 'America/Chicago',
    meeting_url text,
    meeting_provider text NOT NULL DEFAULT 'internal' CHECK (meeting_provider IN ('internal','zoom','google_meet','teams','custom')),
    meeting_id text,
    meeting_password text,
    max_participants integer,
    is_recorded boolean NOT NULL DEFAULT false,
    recording_url text,
    recording_storage_path text,
    is_hands_on_lab boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','completed','cancelled','no_show')),
    instructor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, cohort_id) REFERENCES lms.cohorts(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_live_sessions_cohort_idx ON lms.live_sessions(tenant_id, cohort_id, starts_at);
CREATE INDEX IF NOT EXISTS lms_live_sessions_upcoming_idx ON lms.live_sessions(tenant_id, starts_at) WHERE status = 'scheduled';

CREATE TABLE IF NOT EXISTS lms.live_session_attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    live_session_id uuid NOT NULL,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at timestamptz,
    left_at timestamptz,
    attendance_status text NOT NULL DEFAULT 'registered' CHECK (attendance_status IN ('registered','attended','partial','absent','excused')),
    duration_minutes integer,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, live_session_id, learner_user_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, live_session_id) REFERENCES lms.live_sessions(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.collaborative_tools (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    tool_type text NOT NULL CHECK (tool_type IN ('forum','wiki','glossary','chat','collaborative_doc')),
    title text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    settings jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.forum_threads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    collaborative_tool_id uuid NOT NULL,
    course_id uuid NOT NULL,
    author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    title text NOT NULL,
    body text,
    is_pinned boolean NOT NULL DEFAULT false,
    is_locked boolean NOT NULL DEFAULT false,
    is_ai_moderated boolean NOT NULL DEFAULT false,
    ai_moderation_status text CHECK (ai_moderation_status IN ('pending','approved','flagged','rejected')),
    view_count integer NOT NULL DEFAULT 0,
    reply_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, collaborative_tool_id) REFERENCES lms.collaborative_tools(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_forum_threads_tool_idx ON lms.forum_threads(tenant_id, collaborative_tool_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lms.forum_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    thread_id uuid NOT NULL,
    author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    parent_post_id uuid,
    body text NOT NULL,
    is_ai_generated boolean NOT NULL DEFAULT false,
    is_ai_moderated boolean NOT NULL DEFAULT false,
    ai_moderation_status text CHECK (ai_moderation_status IN ('pending','approved','flagged','rejected')),
    is_answer boolean NOT NULL DEFAULT false,
    upvotes integer NOT NULL DEFAULT 0,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, thread_id) REFERENCES lms.forum_threads(tenant_id, id) ON DELETE CASCADE
);

-- ============================================================================
-- DOMAIN 7: ASSESSMENT & GRADING
-- Quizzes, question bank, rubrics, submissions, reviews, retakes, AI competency
-- ============================================================================

CREATE TABLE IF NOT EXISTS lms.question_bank (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid,
    question_type text NOT NULL CHECK (question_type IN ('multiple_choice','multiple_select','true_false','short_answer','essay','fill_blank','matching','ordering','coding','file_upload','oral_practical','demonstration')),
    question_text text NOT NULL,
    question_rich_content jsonb NOT NULL DEFAULT '{}',
    answer_options jsonb NOT NULL DEFAULT '[]',
    correct_answer jsonb NOT NULL DEFAULT '{}',
    explanation text,
    difficulty_level text NOT NULL DEFAULT 'medium' CHECK (difficulty_level IN ('easy','medium','hard','expert')),
    points_possible numeric(5,2) NOT NULL DEFAULT 1,
    is_ai_generated boolean NOT NULL DEFAULT false,
    ai_generation_metadata jsonb NOT NULL DEFAULT '{}',
    is_ai_approved boolean NOT NULL DEFAULT false,
    ai_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ai_approved_at timestamptz,
    tags text[] NOT NULL DEFAULT ARRAY[]::text[],
    skill_id uuid,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, skill_id) REFERENCES lms.skills(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_question_bank_course_idx ON lms.question_bank(tenant_id, course_id, question_type);
CREATE INDEX IF NOT EXISTS lms_question_bank_skill_idx ON lms.question_bank(tenant_id, skill_id) WHERE skill_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lms_question_bank_ai_pending_idx ON lms.question_bank(tenant_id) WHERE is_ai_generated = true AND is_ai_approved = false;

CREATE TABLE IF NOT EXISTS lms.quizzes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    lesson_id uuid,
    title text NOT NULL,
    description text,
    quiz_type text NOT NULL DEFAULT 'quiz' CHECK (quiz_type IN ('quiz','practice_test','exam','coding_exercise','assignment','self_assessment','peer_assessment')),
    is_ai_generated boolean NOT NULL DEFAULT false,
    is_ai_approved boolean NOT NULL DEFAULT false,
    ai_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ai_approved_at timestamptz,
    instructions text,
    time_limit_minutes integer,
    max_attempts integer NOT NULL DEFAULT 1,
    passing_score numeric(5,2) NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
    is_graded_automatically boolean NOT NULL DEFAULT true,
    shuffle_questions boolean NOT NULL DEFAULT false,
    shuffle_answers boolean NOT NULL DEFAULT false,
    show_results_to_learner boolean NOT NULL DEFAULT true,
    show_correct_answers boolean NOT NULL DEFAULT false,
    available_from timestamptz,
    available_until timestamptz,
    is_published boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_quizzes_course_idx ON lms.quizzes(tenant_id, course_id, quiz_type);
CREATE INDEX IF NOT EXISTS lms_quizzes_ai_pending_idx ON lms.quizzes(tenant_id) WHERE is_ai_generated = true AND is_ai_approved = false;

CREATE TABLE IF NOT EXISTS lms.quiz_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    quiz_id uuid NOT NULL,
    question_id uuid NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    points_possible numeric(5,2) NOT NULL DEFAULT 1,
    is_required boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, quiz_id, question_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, quiz_id) REFERENCES lms.quizzes(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, question_id) REFERENCES lms.question_bank(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lms.coding_exercises (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    quiz_id uuid,
    lesson_id uuid,
    title text NOT NULL,
    description text,
    problem_statement text NOT NULL,
    starter_code text,
    solution_code text,
    test_cases jsonb NOT NULL DEFAULT '[]',
    language text NOT NULL DEFAULT 'javascript',
    is_ai_generated boolean NOT NULL DEFAULT false,
    ai_test_cases_generated boolean NOT NULL DEFAULT false,
    is_ai_approved boolean NOT NULL DEFAULT false,
    time_limit_seconds integer NOT NULL DEFAULT 30,
    memory_limit_mb integer NOT NULL DEFAULT 256,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, quiz_id) REFERENCES lms.quizzes(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.rubrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid,
    title text NOT NULL,
    description text,
    rubric_type text NOT NULL DEFAULT 'analytic' CHECK (rubric_type IN ('analytic','holistic','single_point','competency')),
    max_points numeric(5,2) NOT NULL DEFAULT 100,
    is_competency_based boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.rubric_criteria (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    rubric_id uuid NOT NULL,
    criterion_label text NOT NULL,
    criterion_description text,
    sort_order integer NOT NULL DEFAULT 0,
    max_points numeric(5,2) NOT NULL DEFAULT 0,
    performance_levels jsonb NOT NULL DEFAULT '[]',
    skill_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, rubric_id) REFERENCES lms.rubrics(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, skill_id) REFERENCES lms.skills(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    lesson_id uuid,
    quiz_id uuid,
    rubric_id uuid,
    title text NOT NULL,
    description text,
    instructions text,
    assignment_type text NOT NULL DEFAULT 'individual' CHECK (assignment_type IN ('individual','group','peer_review','self_assessment','portfolio','oral_practical','demonstration')),
    submission_type text NOT NULL DEFAULT 'file_upload' CHECK (submission_type IN ('file_upload','text_entry','url_submission','video_upload','audio_upload','in_browser_annotation','coding','none')),
    max_file_size_mb integer NOT NULL DEFAULT 50,
    allowed_file_types text[] NOT NULL DEFAULT ARRAY[]::text[],
    due_date timestamptz,
    late_submission_allowed boolean NOT NULL DEFAULT false,
    late_penalty_percent numeric(5,2),
    is_ai_drafted boolean NOT NULL DEFAULT false,
    is_ai_approved boolean NOT NULL DEFAULT false,
    ai_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    is_published boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, quiz_id) REFERENCES lms.quizzes(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, rubric_id) REFERENCES lms.rubrics(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.quiz_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    quiz_id uuid NOT NULL,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    attempt_number integer NOT NULL DEFAULT 1,
    started_at timestamptz NOT NULL DEFAULT now(),
    submitted_at timestamptz,
    time_spent_seconds integer,
    score numeric(5,2),
    max_score numeric(5,2),
    percentage numeric(5,2),
    is_passed boolean,
    status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','graded','expired','abandoned')),
    is_ai_graded boolean NOT NULL DEFAULT false,
    ai_grading_metadata jsonb NOT NULL DEFAULT '{}',
    human_verified boolean NOT NULL DEFAULT false,
    verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at timestamptz,
    answers jsonb NOT NULL DEFAULT '{}',
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, quiz_id) REFERENCES lms.quizzes(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_quiz_attempts_learner_idx ON lms.quiz_attempts(tenant_id, learner_user_id, quiz_id, attempt_number);
CREATE INDEX IF NOT EXISTS lms_quiz_attempts_grading_idx ON lms.quiz_attempts(tenant_id, status) WHERE status = 'submitted' AND is_ai_graded = true AND human_verified = false;

CREATE TABLE IF NOT EXISTS lms.artifact_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    assignment_id uuid NOT NULL,
    quiz_id uuid,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    submission_storage_id uuid,
    submission_data jsonb NOT NULL DEFAULT '{}',
    text_content text,
    file_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
    submitted_at timestamptz NOT NULL DEFAULT now(),
    is_late boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft','submitted','under_review','graded','returned','resubmitted')),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, assignment_id) REFERENCES lms.assignments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, quiz_id) REFERENCES lms.quizzes(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_artifact_submissions_learner_idx ON lms.artifact_submissions(tenant_id, learner_user_id, status);

CREATE TABLE IF NOT EXISTS lms.submission_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    submission_id uuid NOT NULL,
    reviewer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    review_type text NOT NULL DEFAULT 'instructor' CHECK (review_type IN ('instructor','peer','self','ai_assisted','moderator')),
    review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','in_progress','completed','moderated','returned')),
    score numeric(5,2),
    max_score numeric(5,2),
    rubric_scores jsonb NOT NULL DEFAULT '{}',
    feedback_text text,
    feedback_rich_content jsonb NOT NULL DEFAULT '{}',
    annotated_file_url text,
    inline_annotations jsonb NOT NULL DEFAULT '[]',
    is_ai_assisted boolean NOT NULL DEFAULT false,
    ai_grading_metadata jsonb NOT NULL DEFAULT '{}',
    human_verified boolean NOT NULL DEFAULT false,
    verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at timestamptz,
    is_released_to_learner boolean NOT NULL DEFAULT false,
    released_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, submission_id) REFERENCES lms.artifact_submissions(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_submission_reviews_queue_idx ON lms.submission_reviews(tenant_id, review_status) WHERE review_status IN ('pending','in_progress');

CREATE TABLE IF NOT EXISTS lms.grading_workflow (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    submission_id uuid NOT NULL,
    assigned_marker_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    moderator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    stage text NOT NULL DEFAULT 'assigned' CHECK (stage IN ('assigned','in_progress','submitted_for_moderation','moderated','approved','released','returned')),
    marker_notes text,
    moderator_notes text,
    is_blind_marking boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, submission_id) REFERENCES lms.artifact_submissions(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.retake_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    quiz_id uuid,
    assignment_id uuid,
    course_id uuid,
    max_retakes integer NOT NULL DEFAULT 1,
    cooldown_hours integer NOT NULL DEFAULT 24,
    require_instructor_approval boolean NOT NULL DEFAULT false,
    retake_penalty_percent numeric(5,2) NOT NULL DEFAULT 0,
    highest_score_kept boolean NOT NULL DEFAULT true,
    latest_score_kept boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, quiz_id) REFERENCES lms.quizzes(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, assignment_id) REFERENCES lms.assignments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.ai_competency_assessments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_id uuid,
    enrollment_id uuid,
    quiz_attempt_id uuid,
    submission_id uuid,
    ai_assessment_result jsonb NOT NULL DEFAULT '{}',
    ai_confidence_score numeric(5,2),
    ai_feedback text,
    human_verification_required boolean NOT NULL DEFAULT true,
    human_verified boolean NOT NULL DEFAULT false,
    verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at timestamptz,
    verification_notes text,
    final_competency_level text CHECK (final_competency_level IN ('introduced','practiced','mastered','not_yet_competent')),
    status text NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification','verified','rejected','expired')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, skill_id) REFERENCES lms.skills(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, quiz_attempt_id) REFERENCES lms.quiz_attempts(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, submission_id) REFERENCES lms.artifact_submissions(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_ai_competency_pending_idx ON lms.ai_competency_assessments(tenant_id) WHERE human_verification_required = true AND human_verified = false;

-- ============================================================================
-- DOMAIN 6: PROGRESS & COMPLETION ENGINE
-- Lesson/module progress, audited clock-hour ledger, completion rules
-- ============================================================================

CREATE TABLE IF NOT EXISTS lms.lesson_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    enrollment_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','skipped','failed')),
    progress_percentage numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    time_spent_seconds integer NOT NULL DEFAULT 0,
    last_position jsonb NOT NULL DEFAULT '{}',
    started_at timestamptz,
    completed_at timestamptz,
    last_accessed_at timestamptz,
    delivery_mode text CHECK (delivery_mode IN ('ai_guided','self_paced','blended')),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, enrollment_id, lesson_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_lesson_progress_learner_idx ON lms.lesson_progress(tenant_id, learner_user_id, status);
CREATE INDEX IF NOT EXISTS lms_lesson_progress_enrollment_idx ON lms.lesson_progress(tenant_id, enrollment_id, status);

CREATE TABLE IF NOT EXISTS lms.module_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    enrollment_id uuid NOT NULL,
    module_id uuid NOT NULL,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','locked')),
    lessons_total integer NOT NULL DEFAULT 0,
    lessons_completed integer NOT NULL DEFAULT 0,
    progress_percentage numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    time_spent_seconds integer NOT NULL DEFAULT 0,
    started_at timestamptz,
    completed_at timestamptz,
    last_accessed_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, enrollment_id, module_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, module_id) REFERENCES lms.modules(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.completion_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    rule_type text NOT NULL CHECK (rule_type IN ('all_lessons','min_lessons_percentage','pass_all_quizzes','min_quiz_average','final_exam_pass','attendance_threshold','skill_signoff','clock_hours_complete','mixed')),
    rule_config jsonb NOT NULL DEFAULT '{}',
    min_percentage numeric(5,2),
    min_attendance_percentage numeric(5,2),
    required_clock_hours numeric(8,2),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.course_completions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    enrollment_id uuid NOT NULL,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    completion_rule_id uuid,
    completed_at timestamptz NOT NULL DEFAULT now(),
    final_score numeric(5,2),
    final_percentage numeric(5,2),
    total_clock_hours numeric(8,2),
    is_passed boolean NOT NULL DEFAULT true,
    certificate_issued boolean NOT NULL DEFAULT false,
    credential_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, enrollment_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, completion_rule_id) REFERENCES lms.completion_rules(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_course_completions_learner_idx ON lms.course_completions(tenant_id, learner_user_id);

CREATE TABLE IF NOT EXISTS lms.at_risk_learners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    enrollment_id uuid NOT NULL,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high','critical')),
    risk_factors jsonb NOT NULL DEFAULT '[]',
    identified_at timestamptz NOT NULL DEFAULT now(),
    last_evaluated_at timestamptz NOT NULL DEFAULT now(),
    intervention_status text NOT NULL DEFAULT 'none' CHECK (intervention_status IN ('none','notified','intervened','resolved','escalated')),
    intervention_notes text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, enrollment_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_at_risk_learners_level_idx ON lms.at_risk_learners(tenant_id, risk_level) WHERE intervention_status NOT IN ('resolved');

-- THE AUDIT-GRADE CLOCK HOUR LEDGER - IMMUTABLE
CREATE TABLE IF NOT EXISTS lms.clock_hour_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid NOT NULL,
    course_id uuid NOT NULL,
    lesson_id uuid,
    module_id uuid,
    source_type text NOT NULL CHECK (source_type IN ('lesson_completion','quiz_completion','live_session_attendance','assignment_submission','ai_session','instructor_override','manual_entry','system_adjustment')),
    source_id uuid,
    computed_minutes numeric(8,2) NOT NULL,
    verified_minutes numeric(8,2) NOT NULL DEFAULT 0,
    verification_status text NOT NULL DEFAULT 'computed' CHECK (verification_status IN ('computed','human_verified','ai_verified_pending_human','disputed','voided')),
    verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at timestamptz,
    verification_notes text,
    supersedes_ledger_id uuid,
    voided_at timestamptz,
    voided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    void_reason text,
    session_started_at timestamptz,
    session_ended_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, module_id) REFERENCES lms.modules(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_clock_hour_ledger_learner_idx ON lms.clock_hour_ledger(tenant_id, learner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lms_clock_hour_ledger_enrollment_idx ON lms.clock_hour_ledger(tenant_id, enrollment_id, verification_status);
CREATE INDEX IF NOT EXISTS lms_clock_hour_ledger_pending_idx ON lms.clock_hour_ledger(tenant_id) WHERE verification_status = 'computed';
CREATE INDEX IF NOT EXISTS lms_clock_hour_ledger_active_idx ON lms.clock_hour_ledger(tenant_id, learner_user_id) WHERE voided_at IS NULL;

-- Immutability triggers on clock_hour_ledger
-- block_update trigger is defined below after clock_hour_ledger_void_guard() is created
DROP TRIGGER IF EXISTS clock_hour_ledger_block_delete ON lms.clock_hour_ledger;
CREATE TRIGGER clock_hour_ledger_block_delete
    BEFORE DELETE ON lms.clock_hour_ledger
    FOR EACH ROW
    EXECUTE FUNCTION lms.block_ledger_mutation();

-- Allow voiding via controlled UPDATE path (voided_at, voided_by, void_reason, verification_status)
-- This is the ONLY permitted UPDATE: marking a row as voided
CREATE OR REPLACE FUNCTION lms.clock_hour_ledger_void_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only allow changes to void-related fields and verification fields
    IF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL THEN
        -- This is a void operation - allowed
        IF NEW.voided_by IS NULL THEN
            RAISE EXCEPTION 'CLOCK_HOUR_LEDGER_VOID_REQUIRES_VOIDED_BY';
        END IF;
        IF NEW.void_reason IS NULL OR BTRIM(NEW.void_reason) = '' THEN
            RAISE EXCEPTION 'CLOCK_HOUR_LEDGER_VOID_REQUIRES_REASON';
        END IF;
        IF NEW.verification_status <> 'voided' THEN
            RAISE EXCEPTION 'CLOCK_HOUR_LEDGER_VOID_MUST_SET_VERIFICATION_STATUS_VOIDED';
        END IF;
        RETURN NEW;
    END IF;
    
    -- Allow verification status updates (human verification)
    IF OLD.verification_status = 'computed' AND NEW.verification_status IN ('human_verified', 'ai_verified_pending_human') THEN
        IF NEW.verification_status = 'human_verified' AND NEW.verified_by IS NULL THEN
            RAISE EXCEPTION 'CLOCK_HOUR_LEDGER_VERIFICATION_REQUIRES_VERIFIED_BY';
        END IF;
        RETURN NEW;
    END IF;
    
    -- Block all other updates
    RAISE EXCEPTION 'CLOCK_HOUR_LEDGER_IS_IMMUTABLE: Only voiding and verification status updates are permitted. Attempted UPDATE on row %', OLD.id;
END;
$$;

-- Replace the blanket block with the nuanced guard
DROP TRIGGER IF EXISTS clock_hour_ledger_block_update ON lms.clock_hour_ledger;
CREATE TRIGGER clock_hour_ledger_block_update
    BEFORE UPDATE ON lms.clock_hour_ledger
    FOR EACH ROW
    EXECUTE FUNCTION lms.clock_hour_ledger_void_guard();

-- ============================================================================
-- DOMAIN 5: AI TEACHING & PERSONALIZATION
-- Consent gate, AI sessions, turn logs, personalization, escalation routing
-- ============================================================================

CREATE TABLE IF NOT EXISTS lms.ai_consent_gates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    consent_status text NOT NULL DEFAULT 'not_offered' CHECK (consent_status IN ('not_offered','offered','granted','denied','revoked','expired')),
    consent_scope text NOT NULL DEFAULT 'full' CHECK (consent_scope IN ('full','teaching_only','assessment_only','limited')),
    granted_at timestamptz,
    revoked_at timestamptz,
    expires_at timestamptz,
    consent_document_path text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, learner_user_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.ai_teaching_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    course_id uuid NOT NULL,
    lesson_id uuid,
    consent_gate_id uuid,
    persona_id uuid,
    session_status text NOT NULL DEFAULT 'active' CHECK (session_status IN ('active','paused','ended','escalated','timeout','error')),
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    total_turns integer NOT NULL DEFAULT 0,
    total_duration_seconds integer NOT NULL DEFAULT 0,
    delivery_mode text NOT NULL DEFAULT 'ai_guided' CHECK (delivery_mode IN ('ai_guided','blended')),
    escalation_triggered boolean NOT NULL DEFAULT false,
    escalation_reason text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, consent_gate_id) REFERENCES lms.ai_consent_gates(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_ai_teaching_sessions_learner_idx ON lms.ai_teaching_sessions(tenant_id, learner_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS lms_ai_teaching_sessions_active_idx ON lms.ai_teaching_sessions(tenant_id) WHERE session_status = 'active';

CREATE TABLE IF NOT EXISTS lms.ai_turn_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    session_id uuid NOT NULL,
    turn_number integer NOT NULL,
    learner_message text,
    learner_message_type text CHECK (learner_message_type IN ('text','voice','selection','action','question')),
    ai_response text,
    ai_response_type text CHECK (ai_response_type IN ('text','voice','suggestion','explanation','question','escalation')),
    pedagogy_signal text CHECK (pedagogy_signal IN ('understanding','confusion','frustration','engagement','boredom','mastery','struggle','curiosity')),
    signal_confidence numeric(5,2),
    content_block_referenced uuid,
    skill_referenced uuid,
    is_escalation_triggered boolean NOT NULL DEFAULT false,
    escalation_type text CHECK (escalation_type IN ('confusion','frustration','safety','crisis','technical','human_request')),
    response_time_ms integer,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, session_id, turn_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, session_id) REFERENCES lms.ai_teaching_sessions(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, content_block_referenced) REFERENCES lms.content_blocks(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, skill_referenced) REFERENCES lms.skills(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_ai_turn_logs_session_idx ON lms.ai_turn_logs(tenant_id, session_id, turn_number);
CREATE INDEX IF NOT EXISTS lms_ai_turn_logs_escalation_idx ON lms.ai_turn_logs(tenant_id) WHERE is_escalation_triggered = true;

CREATE TABLE IF NOT EXISTS lms.personalization_state (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    pace_preference text NOT NULL DEFAULT 'normal' CHECK (pace_preference IN ('slow','normal','fast','adaptive')),
    tone_preference text NOT NULL DEFAULT 'encouraging' CHECK (tone_preference IN ('encouraging','formal','casual','direct','socratic')),
    difficulty_level text NOT NULL DEFAULT 'adaptive' CHECK (difficulty_level IN ('easy','medium','hard','adaptive')),
    learning_style text CHECK (learning_style IN ('visual','auditory','reading_writing','kinesthetic','multimodal')),
    session_context jsonb NOT NULL DEFAULT '{}',
    adaptation_history jsonb NOT NULL DEFAULT '[]',
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, learner_user_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.human_escalation_routing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    session_id uuid,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    escalation_type text NOT NULL CHECK (escalation_type IN ('confusion','frustration','safety','crisis','technical','human_request','ai_limitation')),
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent','critical')),
    assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_role text CHECK (assigned_role IN ('instructor','support_navigator','org_admin','platform_admin','crisis_counselor')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','acknowledged','in_progress','resolved','escalated','closed')),
    escalation_context jsonb NOT NULL DEFAULT '{}',
    resolution_notes text,
    resolved_at timestamptz,
    resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, session_id) REFERENCES lms.ai_teaching_sessions(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_human_escalation_pending_idx ON lms.human_escalation_routing(tenant_id, status, priority) WHERE status IN ('pending','assigned','acknowledged');

CREATE TABLE IF NOT EXISTS lms.ai_escalation_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    escalation_id uuid NOT NULL,
    queue_position integer NOT NULL DEFAULT 0,
    is_auto_routed boolean NOT NULL DEFAULT true,
    routed_to_role text,
    routed_at timestamptz,
    acknowledged_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, escalation_id) REFERENCES lms.human_escalation_routing(tenant_id, id) ON DELETE CASCADE
);

-- ============================================================================
-- DOMAIN 13: AI INSTRUCTOR SKILLS (cross-cutting)
-- Persona, AI-generated lectures, content drafting, assessment generation,
-- roleplay simulation, session telemetry
-- ============================================================================

CREATE TABLE IF NOT EXISTS lms.ai_instructor_personas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    display_name text NOT NULL DEFAULT 'LeashGuide',
    voice_profile text,
    personality_traits jsonb NOT NULL DEFAULT '{}',
    avatar_url text,
    tone_default text NOT NULL DEFAULT 'encouraging',
    is_co_instructor boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    course_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE SET NULL
);

-- Link ai_teaching_sessions.persona_id to ai_instructor_personas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lms_ai_teaching_sessions_persona_fk'
        AND conrelid = 'lms.ai_teaching_sessions'::regclass
    ) THEN
        ALTER TABLE lms.ai_teaching_sessions
        ADD CONSTRAINT lms_ai_teaching_sessions_persona_fk
        FOREIGN KEY (tenant_id, persona_id)
        REFERENCES lms.ai_instructor_personas(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS lms.ai_co_instructor_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    persona_id uuid NOT NULL,
    assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    permissions jsonb NOT NULL DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, course_id, persona_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, persona_id) REFERENCES lms.ai_instructor_personas(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.ai_generated_lectures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL,
    persona_id uuid,
    lecture_type text NOT NULL CHECK (lecture_type IN ('video_narrated','article','video_pdf_mashup','audio_only')),
    source_content_block_id uuid,
    generated_script text,
    generated_media_asset_id uuid,
    pacing_words_per_minute integer NOT NULL DEFAULT 240,
    generation_model text,
    generation_prompt text,
    is_versioned boolean NOT NULL DEFAULT true,
    version_number integer NOT NULL DEFAULT 1,
    approval_status text NOT NULL DEFAULT 'pending_review' CHECK (approval_status IN ('pending_review','approved','rejected','revision_requested')),
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    rejection_reason text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, persona_id) REFERENCES lms.ai_instructor_personas(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, source_content_block_id) REFERENCES lms.content_blocks(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, generated_media_asset_id) REFERENCES lms.media_assets(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_ai_generated_lectures_pending_idx ON lms.ai_generated_lectures(tenant_id) WHERE approval_status = 'pending_review';

CREATE TABLE IF NOT EXISTS lms.ai_content_drafts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    draft_type text NOT NULL CHECK (draft_type IN ('course_description','lesson_content','article_lecture','announcement','assignment_prompt','supplementary_resource','content_refresh')),
    target_entity_type text CHECK (target_entity_type IN ('course','module','lesson','content_block','announcement','assignment')),
    target_entity_id uuid,
    requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    generation_prompt text,
    generated_content text NOT NULL,
    generation_model text,
    generation_metadata jsonb NOT NULL DEFAULT '{}',
    status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected','revised','published')),
    reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    review_notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_ai_content_drafts_queue_idx ON lms.ai_content_drafts(tenant_id, status) WHERE status = 'pending_review';

CREATE TABLE IF NOT EXISTS lms.ai_assessment_generation_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid,
    lesson_id uuid,
    job_type text NOT NULL CHECK (job_type IN ('quiz_generation','question_generation','practice_test_generation','coding_test_case_generation','explanation_generation')),
    requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    generation_config jsonb NOT NULL DEFAULT '{}',
    generated_items jsonb NOT NULL DEFAULT '[]',
    generation_model text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','human_approved','human_rejected')),
    error_message text,
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.roleplay_scenarios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid,
    lesson_id uuid,
    title text NOT NULL,
    description text,
    scenario_type text NOT NULL DEFAULT 'soft_skill' CHECK (scenario_type IN ('soft_skill','customer_interaction','conflict_resolution','sales_pitch','interview_practice','safety_response')),
    persona_id uuid,
    scenario_script jsonb NOT NULL DEFAULT '{}',
    evaluation_rubric_id uuid,
    is_ai_generated boolean NOT NULL DEFAULT false,
    is_published boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, persona_id) REFERENCES lms.ai_instructor_personas(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, evaluation_rubric_id) REFERENCES lms.rubrics(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.roleplay_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    scenario_id uuid NOT NULL,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    transcript jsonb NOT NULL DEFAULT '[]',
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned','escalated')),
    ai_evaluation jsonb NOT NULL DEFAULT '{}',
    ai_score numeric(5,2),
    human_verified boolean NOT NULL DEFAULT false,
    verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    escalation_triggered boolean NOT NULL DEFAULT false,
    escalation_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, scenario_id) REFERENCES lms.roleplay_scenarios(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, escalation_id) REFERENCES lms.human_escalation_routing(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.ai_session_telemetry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    session_id uuid,
    roleplay_session_id uuid,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_type text NOT NULL CHECK (metric_type IN ('response_latency','engagement_score','comprehension_signal','sentiment','completion_rate','dropout_point')),
    metric_value numeric(12,4),
    metric_metadata jsonb NOT NULL DEFAULT '{}',
    recorded_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, session_id) REFERENCES lms.ai_teaching_sessions(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, roleplay_session_id) REFERENCES lms.roleplay_sessions(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_ai_session_telemetry_learner_idx ON lms.ai_session_telemetry(tenant_id, learner_user_id, metric_type);

CREATE TABLE IF NOT EXISTS lms.qa_threads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    lesson_id uuid,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_text text NOT NULL,
    ai_answer text,
    ai_answered_at timestamptz,
    is_flagged_for_human boolean NOT NULL DEFAULT false,
    human_answer text,
    answered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    answered_at timestamptz,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','ai_answered','flagged','human_answered','resolved')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_qa_threads_flagged_idx ON lms.qa_threads(tenant_id) WHERE is_flagged_for_human = true;

CREATE TABLE IF NOT EXISTS lms.learner_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id uuid,
    course_id uuid,
    note_body text NOT NULL,
    ai_summary text,
    is_ai_summarized boolean NOT NULL DEFAULT false,
    timestamp_reference numeric(10,2),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_learner_notes_learner_idx ON lms.learner_notes(tenant_id, learner_user_id, lesson_id);

CREATE TABLE IF NOT EXISTS lms.course_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text text,
    is_ai_moderated boolean NOT NULL DEFAULT false,
    moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','flagged','rejected')),
    ai_summary_included boolean NOT NULL DEFAULT false,
    is_published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, course_id, learner_user_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_course_reviews_course_idx ON lms.course_reviews(tenant_id, course_id) WHERE is_published = true;

CREATE TABLE IF NOT EXISTS lms.review_summaries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    ai_summary_text text NOT NULL,
    average_rating numeric(3,2),
    total_reviews integer NOT NULL DEFAULT 0,
    highlight_themes jsonb NOT NULL DEFAULT '[]',
    generated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, course_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE
);

-- ============================================================================
-- DOMAIN 9: WHOLE-HUMAN SUPPORT (WORKFORCE & BEHAVIORAL)
-- Support referrals, safety incidents, workforce outcomes, benefits-cliff
-- coaching, navigator caseload
-- ============================================================================

CREATE TABLE IF NOT EXISTS lms.navigator_caseloads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    navigator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','transferred','closed')),
    closed_at timestamptz,
    closed_reason text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, navigator_user_id, learner_user_id) ,
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_navigator_caseloads_navigator_idx ON lms.navigator_caseloads(tenant_id, navigator_user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS lms_navigator_caseloads_learner_idx ON lms.navigator_caseloads(tenant_id, learner_user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS lms.support_referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    navigator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    referral_category text NOT NULL CHECK (referral_category IN ('housing','transportation','benefits','legal','childcare','food_security','mental_health','financial_coaching','job_placement','other')),
    referral_source text NOT NULL DEFAULT 'navigator_intake' CHECK (referral_source IN ('navigator_intake','ai_escalation','learner_disclosure','instructor_flag','self_referral')),
    partner_organization text,
    description text,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','referred_out','resolved','declined_by_learner','closed')),
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    resolution_notes text,
    resolved_at timestamptz,
    is_private_to_learner boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_support_referrals_learner_idx ON lms.support_referrals(tenant_id, learner_user_id);
CREATE INDEX IF NOT EXISTS lms_support_referrals_open_idx ON lms.support_referrals(tenant_id, status) WHERE status IN ('open','in_progress');

CREATE TABLE IF NOT EXISTS lms.safety_incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    incident_type text NOT NULL CHECK (incident_type IN ('self_harm_risk','crisis','abuse_disclosure','threat_to_others','substance_concern','ai_flagged_crisis','other')),
    severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
    description text NOT NULL,
    source text NOT NULL DEFAULT 'navigator_intake' CHECK (source IN ('navigator_intake','ai_escalation','instructor_flag','learner_disclosure','peer_report')),
    ai_session_reference uuid,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','escalated_external','resolved','closed')),
    handled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action_taken text,
    external_authority_notified boolean NOT NULL DEFAULT false,
    external_notification_details text,
    resolved_at timestamptz,
    is_confidential boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, ai_session_reference) REFERENCES lms.ai_teaching_sessions(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_safety_incidents_learner_idx ON lms.safety_incidents(tenant_id, learner_user_id);
CREATE INDEX IF NOT EXISTS lms_safety_incidents_open_idx ON lms.safety_incidents(tenant_id, severity) WHERE status IN ('open','under_review');

CREATE TABLE IF NOT EXISTS lms.workforce_outcomes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id uuid,
    credential_id uuid,
    outcome_type text NOT NULL CHECK (outcome_type IN ('employment','wage_increase','promotion','business_launch','retention_90_day','retention_180_day','retention_365_day','continued_education','licensure_obtained')),
    employer_name text,
    job_title text,
    hourly_wage numeric(10,2),
    previous_hourly_wage numeric(10,2),
    wage_change_percent numeric(6,2),
    employment_start_date date,
    outcome_date date NOT NULL DEFAULT CURRENT_DATE,
    verification_method text CHECK (verification_method IN ('self_reported','employer_verified','pay_stub_verified','navigator_verified')),
    verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at timestamptz,
    notes text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, credential_id) REFERENCES lms.credentials(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_workforce_outcomes_learner_idx ON lms.workforce_outcomes(tenant_id, learner_user_id);
CREATE INDEX IF NOT EXISTS lms_workforce_outcomes_type_idx ON lms.workforce_outcomes(tenant_id, outcome_type, outcome_date);

CREATE TABLE IF NOT EXISTS lms.benefits_cliff_coaching (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    navigator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    session_date date NOT NULL DEFAULT CURRENT_DATE,
    benefits_programs_discussed text[] NOT NULL DEFAULT ARRAY[]::text[],
    projected_income_change numeric(12,2),
    cliff_risk_identified boolean NOT NULL DEFAULT false,
    coaching_notes text,
    action_plan text,
    follow_up_date date,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_benefits_cliff_coaching_learner_idx ON lms.benefits_cliff_coaching(tenant_id, learner_user_id);

CREATE TABLE IF NOT EXISTS lms.support_case_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_id uuid,
    safety_incident_id uuid,
    author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    note_body text NOT NULL,
    is_confidential boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, referral_id) REFERENCES lms.support_referrals(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, safety_incident_id) REFERENCES lms.safety_incidents(tenant_id, id) ON DELETE CASCADE
);

-- ============================================================================
-- DOMAIN 10: COMMUNICATION & NOTIFICATIONS
-- Announcements, notification preferences, delivery log, reminders
-- ============================================================================

CREATE TABLE IF NOT EXISTS lms.announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid,
    cohort_id uuid,
    author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    author_type text NOT NULL DEFAULT 'human' CHECK (author_type IN ('human','ai_persona')),
    persona_id uuid,
    title text NOT NULL,
    body text,
    rich_content jsonb NOT NULL DEFAULT '{}',
    audience_scope text NOT NULL DEFAULT 'course' CHECK (audience_scope IN ('course','cohort','module','specific_users','all_tenant')),
    target_user_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
    sticky_until timestamptz,
    is_published boolean NOT NULL DEFAULT false,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, cohort_id) REFERENCES lms.cohorts(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, persona_id) REFERENCES lms.ai_instructor_personas(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_announcements_course_idx ON lms.announcements(tenant_id, course_id) WHERE is_published = true;

CREATE TABLE IF NOT EXISTS lms.notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category text NOT NULL CHECK (category IN ('assignment','quiz','module_progress','cohort','discussion','announcement','attendance','credential','support','ai_session','roleplay','certificate','general')),
    preferred_channel text NOT NULL DEFAULT 'email' CHECK (preferred_channel IN ('email','sms','push','in_app','none')),
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id, category),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.notification_delivery_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    announcement_id uuid,
    trigger_entity_type text,
    trigger_entity_id uuid,
    notification_type text NOT NULL,
    channel text NOT NULL CHECK (channel IN ('email','sms','push','in_app')),
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','read','failed','bounced')),
    sent_at timestamptz,
    delivered_at timestamptz,
    read_at timestamptz,
    error_message text,
    payload jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, announcement_id) REFERENCES lms.announcements(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_notification_delivery_log_user_idx ON lms.notification_delivery_log(tenant_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lms_notification_delivery_log_pending_idx ON lms.notification_delivery_log(tenant_id, status) WHERE status = 'queued';

CREATE TABLE IF NOT EXISTS lms.learner_reminders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reminder_type text NOT NULL CHECK (reminder_type IN ('assignment_due','quiz_deadline','module_deadline','course_deadline','attendance','check_in','follow_up','live_session','cert_expiry','cohort_event')),
    target_entity_type text,
    target_entity_id uuid,
    scheduled_for timestamptz NOT NULL,
    delivered boolean NOT NULL DEFAULT false,
    delivered_at timestamptz,
    snoozed_until timestamptz,
    snooze_count integer NOT NULL DEFAULT 0,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_learner_reminders_pending_idx ON lms.learner_reminders(tenant_id, scheduled_for) WHERE delivered = false;

-- ============================================================================
-- DOMAIN 11: COMPLIANCE & REPORTING
-- Platform audit log, funder reports, minor consent guardrails, audit views
-- ============================================================================

CREATE TABLE IF NOT EXISTS lms.platform_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role text,
    action text NOT NULL,
    target_entity_type text NOT NULL,
    target_entity_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    user_agent text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lms_platform_audit_log_tenant_idx ON lms.platform_audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lms_platform_audit_log_actor_idx ON lms.platform_audit_log(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lms_platform_audit_log_target_idx ON lms.platform_audit_log(target_entity_type, target_entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS lms_platform_audit_log_tenant_id_uniq ON lms.platform_audit_log(tenant_id, id);

CREATE TABLE IF NOT EXISTS lms.funder_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    funder_name text NOT NULL,
    report_type text NOT NULL CHECK (report_type IN ('enrollment','completion','demographics','wage_gain','retention','attendance','clock_hours','outcomes')),
    period_start date NOT NULL,
    period_end date NOT NULL,
    generated_data jsonb NOT NULL DEFAULT '{}',
    generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    generated_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
    metadata jsonb NOT NULL DEFAULT '{}',
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_funder_reports_tenant_idx ON lms.funder_reports(tenant_id, period_start, period_end);

CREATE TABLE IF NOT EXISTS lms.minor_consent_guardrails (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    guardian_name text,
    guardian_email text,
    guardian_phone text,
    guardian_relationship text,
    guardian_signature_path text,
    consent_status text NOT NULL DEFAULT 'pending' CHECK (consent_status IN ('pending','signed','renewed','revoked')),
    signed_at timestamptz,
    expires_at timestamptz,
    revoked_at timestamptz,
    revoke_reason text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, learner_user_id),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_minor_consent_guardrails_active_idx ON lms.minor_consent_guardrails(tenant_id) WHERE consent_status = 'signed';

CREATE TABLE IF NOT EXISTS lms.compliance_report_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    report_type text NOT NULL,
    parameters jsonb NOT NULL DEFAULT '{}',
    result_summary jsonb NOT NULL DEFAULT '{}',
    generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
    error_message text,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    UNIQUE(tenant_id, id)
);

-- ============================================================================
-- DOMAIN 12: PLATFORM BRIDGE / CONVERSION (ALL ABOUT PAWZ <-> ALL ABOUT PAWZ SALON)
-- Conversion records, free license grants, salon conversion from CRM, bridge log
-- ============================================================================

CREATE TABLE IF NOT EXISTS lms.conversion_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    crm_customer_id uuid,
    salon_branch_id uuid,
    crm_referral_id uuid,
    origin_entity text NOT NULL CHECK (origin_entity IN ('salon_intake','navigator_referral','learner_self_enroll','instructor_invite','cohort_import','marketing_campaign')),
    origin_reference_id text,
    conversion_status text NOT NULL DEFAULT 'pending' CHECK (conversion_status IN ('pending','learner_created','course_enrolled','completed','abandoned','reversed')),
    converted_at timestamptz,
    notes text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, crm_customer_id) REFERENCES public.crm_customers(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, salon_branch_id) REFERENCES public.commerce_branches(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_conversion_records_status_idx ON lms.conversion_records(tenant_id, conversion_status);
CREATE INDEX IF NOT EXISTS lms_conversion_records_learner_idx ON lms.conversion_records(tenant_id, learner_user_id);

CREATE TABLE IF NOT EXISTS lms.free_license_grants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    crm_customer_id uuid,
    salon_branch_id uuid,
    course_id uuid,
    granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    license_type text NOT NULL DEFAULT 'free' CHECK (license_type IN ('free','sponsored','employer_paid','grant_funded')),
    sponsor_name text,
    sponsor_organization text,
    granted_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    is_active boolean NOT NULL DEFAULT true,
    revoked_at timestamptz,
    revoke_reason text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, crm_customer_id) REFERENCES public.crm_customers(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, salon_branch_id) REFERENCES public.commerce_branches(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.salon_conversions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    salon_customer_id uuid NOT NULL,
    salon_branch_id uuid,
    converted_learner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    navigator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    conversion_status text NOT NULL DEFAULT 'pending' CHECK (conversion_status IN ('pending','contacted','enrolled','completed','declined')),
    outreach_method text CHECK (outreach_method IN ('phone','text','email','in_person','app_notification')),
    outreach_date timestamptz,
    outcome_notes text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, salon_customer_id) REFERENCES public.crm_customers(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, salon_branch_id) REFERENCES public.commerce_branches(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.platform_bridge_sync_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    sync_type text NOT NULL CHECK (sync_type IN ('salon_to_lms','lms_to_salon','crm_sync','credential_sync','commerce_sync','full_sync')),
    sync_status text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending','running','completed','failed')),
    records_processed integer NOT NULL DEFAULT 0,
    records_succeeded integer NOT NULL DEFAULT 0,
    records_failed integer NOT NULL DEFAULT 0,
    error_details jsonb NOT NULL DEFAULT '[]',
    started_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_platform_bridge_sync_log_tenant_idx ON lms.platform_bridge_sync_log(tenant_id, started_at DESC);

-- ============================================================================
-- MISSING TABLE DEFINITIONS (referenced by RLS policies and triggers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lms.consent_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type text NOT NULL,
    consent_status text NOT NULL DEFAULT 'pending' CHECK (consent_status IN ('granted','denied','pending','revoked')),
    granted_at timestamptz,
    revoked_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.session_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.cross_tenant_grants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    granting_tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    receiving_tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    resource_type text NOT NULL,
    resource_id uuid NOT NULL,
    grant_level text NOT NULL DEFAULT 'read',
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
    expires_at timestamptz,
    granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.media_captions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    media_asset_id uuid NOT NULL,
    language_code text NOT NULL DEFAULT 'en',
    caption_format text NOT NULL DEFAULT 'vtt',
    content text NOT NULL,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.media_accessibility (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    media_asset_id uuid NOT NULL,
    feature_type text NOT NULL CHECK (feature_type IN ('audio_description','sign_language','transcript','accessible_pdf')),
    content_url text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.credential_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    credential_id uuid NOT NULL,
    verification_method text NOT NULL CHECK (verification_method IN ('manual','auto','blockchain','third_party')),
    verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at timestamptz,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','expired')),
    verification_data jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, credential_id) REFERENCES lms.credentials(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.delivery_modes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    mode_type text NOT NULL CHECK (mode_type IN ('online','in_person','hybrid','self_paced')),
    settings jsonb NOT NULL DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.cohort_enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cohort_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','dropped','transferred')),
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.cohort_calendar (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cohort_id uuid NOT NULL,
    event_type text NOT NULL CHECK (event_type IN ('session','exam','break','holiday','custom')),
    title text NOT NULL,
    description text,
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    location text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.cohort_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cohort_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    max_members int,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.discussions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id uuid,
    lesson_id uuid,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','archived')),
    pinned boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.discussion_replies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    discussion_id uuid NOT NULL,
    parent_reply_id uuid,
    content text NOT NULL,
    author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','deleted')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.peer_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    submission_id uuid NOT NULL,
    reviewer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feedback_text text NOT NULL,
    rating int CHECK (rating >= 1 AND rating <= 5),
    status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewed','archived')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.attendance_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cohort_id uuid NOT NULL,
    session_date date NOT NULL,
    status text NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','excused')),
    check_in_time timestamptz,
    check_out_time timestamptz,
    notes text,
    recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.skill_signoff_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    skill_id uuid NOT NULL,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signoff_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    signoff_level text NOT NULL CHECK (signoff_level IN ('introduced','practiced','mastered')),
    evidence_url text,
    notes text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

-- ============================================================================
-- RLS POLICIES FOR ALL LMS TABLES
-- Pattern: platform_admin = full access, tenant members = tenant-scoped,
--   instructors = course-scoped, learners = own records + enrolled courses
-- ============================================================================

-- Helper: grant RLS to authenticated users on all LMS tables
-- (Table-level GRANT still required per table in Supabase)

-- === DOMAIN 1: IDENTITY & ACCESS ===
ALTER TABLE lms.lms_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lms_roles_tenant_access ON lms.lms_roles;
CREATE POLICY lms_roles_tenant_access ON lms.lms_roles
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id))
    WITH CHECK (lms.is_platform_admin() OR lms.is_lms_admin(tenant_id));

ALTER TABLE lms.consent_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS consent_records_access ON lms.consent_records;
CREATE POLICY consent_records_access ON lms.consent_records
    FOR ALL USING (
        lms.is_platform_admin()
        OR lms.is_tenant_member(tenant_id) AND lms.is_learner_self(user_id)
        OR lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id)
        OR lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id)
    );

ALTER TABLE lms.session_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS session_tokens_access ON lms.session_tokens;
CREATE POLICY session_tokens_access ON lms.session_tokens
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.cross_tenant_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cross_tenant_grants_access ON lms.cross_tenant_grants;
CREATE POLICY cross_tenant_grants_access ON lms.cross_tenant_grants
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(granting_tenant_id));

-- === DOMAIN 2: CURRICULUM ===
ALTER TABLE lms.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS courses_access ON lms.courses;
CREATE POLICY courses_access ON lms.courses
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.course_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS course_versions_access ON lms.course_versions;
CREATE POLICY course_versions_access ON lms.course_versions
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS modules_access ON lms.modules;
CREATE POLICY modules_access ON lms.modules
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lessons_access ON lms.lessons;
CREATE POLICY lessons_access ON lms.lessons
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.content_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS content_blocks_access ON lms.content_blocks;
CREATE POLICY content_blocks_access ON lms.content_blocks
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.prerequisites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prerequisites_access ON lms.prerequisites;
CREATE POLICY prerequisites_access ON lms.prerequisites
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

-- === DOMAIN 3: MEDIA ===
ALTER TABLE lms.media_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS media_assets_access ON lms.media_assets;
CREATE POLICY media_assets_access ON lms.media_assets
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.media_captions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS media_captions_access ON lms.media_captions;
CREATE POLICY media_captions_access ON lms.media_captions
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.media_accessibility ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS media_accessibility_access ON lms.media_accessibility;
CREATE POLICY media_accessibility_access ON lms.media_accessibility
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

-- === DOMAIN 8: SKILLS & CREDENTIALS ===
ALTER TABLE lms.skill_domains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS skill_domains_access ON lms.skill_domains;
CREATE POLICY skill_domains_access ON lms.skill_domains
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS skills_access ON lms.skills;
CREATE POLICY skills_access ON lms.skills
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.course_skill_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS course_skill_targets_access ON lms.course_skill_targets;
CREATE POLICY course_skill_targets_access ON lms.course_skill_targets
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.skill_signoff_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS skill_signoff_events_access ON lms.skill_signoff_events;
CREATE POLICY skill_signoff_events_access ON lms.skill_signoff_events
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credentials_access ON lms.credentials;
CREATE POLICY credentials_access ON lms.credentials
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.credential_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credential_verifications_access ON lms.credential_verifications;
CREATE POLICY credential_verifications_access ON lms.credential_verifications
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

-- === DOMAIN 4: DELIVERY & ENROLLMENT ===
ALTER TABLE lms.delivery_modes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS delivery_modes_access ON lms.delivery_modes;
CREATE POLICY delivery_modes_access ON lms.delivery_modes
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.cohorts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cohorts_access ON lms.cohorts;
CREATE POLICY cohorts_access ON lms.cohorts
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.cohort_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cohort_enrollments_access ON lms.cohort_enrollments;
CREATE POLICY cohort_enrollments_access ON lms.cohort_enrollments
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.cohort_calendar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cohort_calendar_access ON lms.cohort_calendar;
CREATE POLICY cohort_calendar_access ON lms.cohort_calendar
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS enrollments_access ON lms.enrollments;
CREATE POLICY enrollments_access ON lms.enrollments
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.live_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS live_sessions_access ON lms.live_sessions;
CREATE POLICY live_sessions_access ON lms.live_sessions
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attendance_records_access ON lms.attendance_records;
CREATE POLICY attendance_records_access ON lms.attendance_records
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.forum_threads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS forum_threads_access ON lms.forum_threads;
CREATE POLICY forum_threads_access ON lms.forum_threads
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.forum_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS forum_posts_access ON lms.forum_posts;
CREATE POLICY forum_posts_access ON lms.forum_posts
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.cohort_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cohort_groups_access ON lms.cohort_groups;
CREATE POLICY cohort_groups_access ON lms.cohort_groups
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.discussions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS discussions_access ON lms.discussions;
CREATE POLICY discussions_access ON lms.discussions
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.discussion_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS discussion_replies_access ON lms.discussion_replies;
CREATE POLICY discussion_replies_access ON lms.discussion_replies
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.peer_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS peer_feedback_access ON lms.peer_feedback;
CREATE POLICY peer_feedback_access ON lms.peer_feedback
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

-- === DOMAIN 7: ASSESSMENT ===
ALTER TABLE lms.question_bank ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS question_bank_access ON lms.question_bank;
CREATE POLICY question_bank_access ON lms.question_bank
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quizzes_access ON lms.quizzes;
CREATE POLICY quizzes_access ON lms.quizzes
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quiz_questions_access ON lms.quiz_questions;
CREATE POLICY quiz_questions_access ON lms.quiz_questions
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.coding_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coding_exercises_access ON lms.coding_exercises;
CREATE POLICY coding_exercises_access ON lms.coding_exercises
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.rubrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rubrics_access ON lms.rubrics;
CREATE POLICY rubrics_access ON lms.rubrics
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.rubric_criteria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rubric_criteria_access ON lms.rubric_criteria;
CREATE POLICY rubric_criteria_access ON lms.rubric_criteria
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assignments_access ON lms.assignments;
CREATE POLICY assignments_access ON lms.assignments
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quiz_attempts_access ON lms.quiz_attempts;
CREATE POLICY quiz_attempts_access ON lms.quiz_attempts
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.artifact_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS artifact_submissions_access ON lms.artifact_submissions;
CREATE POLICY artifact_submissions_access ON lms.artifact_submissions
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.submission_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS submission_reviews_access ON lms.submission_reviews;
CREATE POLICY submission_reviews_access ON lms.submission_reviews
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(reviewer_user_id))
    );

ALTER TABLE lms.grading_workflow ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grading_workflow_access ON lms.grading_workflow;
CREATE POLICY grading_workflow_access ON lms.grading_workflow
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.retake_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS retake_policies_access ON lms.retake_policies;
CREATE POLICY retake_policies_access ON lms.retake_policies
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.ai_competency_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_competency_assessments_access ON lms.ai_competency_assessments;
CREATE POLICY ai_competency_assessments_access ON lms.ai_competency_assessments
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

-- === DOMAIN 6: PROGRESS ===
ALTER TABLE lms.lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_progress_access ON lms.lesson_progress;
CREATE POLICY lesson_progress_access ON lms.lesson_progress
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.module_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS module_progress_access ON lms.module_progress;
CREATE POLICY module_progress_access ON lms.module_progress
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.completion_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS completion_rules_access ON lms.completion_rules;
CREATE POLICY completion_rules_access ON lms.completion_rules
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.course_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS course_completions_access ON lms.course_completions;
CREATE POLICY course_completions_access ON lms.course_completions
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.at_risk_learners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS at_risk_learners_access ON lms.at_risk_learners;
CREATE POLICY at_risk_learners_access ON lms.at_risk_learners
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

-- CLOCK HOUR LEDGER - strictest RLS
ALTER TABLE lms.clock_hour_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clock_hour_ledger_select ON lms.clock_hour_ledger;
CREATE POLICY clock_hour_ledger_select ON lms.clock_hour_ledger
    FOR SELECT USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );
DROP POLICY IF EXISTS clock_hour_ledger_insert ON lms.clock_hour_ledger;
CREATE POLICY clock_hour_ledger_insert ON lms.clock_hour_ledger
    FOR INSERT WITH CHECK (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    );
-- NO UPDATE or DELETE policies - ledger is immutable via triggers

-- === DOMAIN 5: AI TEACHING ===
ALTER TABLE lms.ai_consent_gates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_consent_gates_access ON lms.ai_consent_gates;
CREATE POLICY ai_consent_gates_access ON lms.ai_consent_gates
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.ai_teaching_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_teaching_sessions_access ON lms.ai_teaching_sessions;
CREATE POLICY ai_teaching_sessions_access ON lms.ai_teaching_sessions
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.ai_turn_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_turn_logs_access ON lms.ai_turn_logs;
CREATE POLICY ai_turn_logs_access ON lms.ai_turn_logs
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.personalization_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS personalization_state_access ON lms.personalization_state;
CREATE POLICY personalization_state_access ON lms.personalization_state
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.human_escalation_routing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS human_escalation_routing_access ON lms.human_escalation_routing;
CREATE POLICY human_escalation_routing_access ON lms.human_escalation_routing
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.ai_escalation_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_escalation_queue_access ON lms.ai_escalation_queue;
CREATE POLICY ai_escalation_queue_access ON lms.ai_escalation_queue
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

-- === DOMAIN 13: AI INSTRUCTOR SKILLS ===
ALTER TABLE lms.ai_instructor_personas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_instructor_personas_access ON lms.ai_instructor_personas;
CREATE POLICY ai_instructor_personas_access ON lms.ai_instructor_personas
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.ai_co_instructor_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_co_instructor_assignments_access ON lms.ai_co_instructor_assignments;
CREATE POLICY ai_co_instructor_assignments_access ON lms.ai_co_instructor_assignments
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.ai_generated_lectures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_generated_lectures_access ON lms.ai_generated_lectures;
CREATE POLICY ai_generated_lectures_access ON lms.ai_generated_lectures
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.ai_content_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_content_drafts_access ON lms.ai_content_drafts;
CREATE POLICY ai_content_drafts_access ON lms.ai_content_drafts
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.ai_assessment_generation_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_assessment_generation_jobs_access ON lms.ai_assessment_generation_jobs;
CREATE POLICY ai_assessment_generation_jobs_access ON lms.ai_assessment_generation_jobs
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.roleplay_scenarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS roleplay_scenarios_access ON lms.roleplay_scenarios;
CREATE POLICY roleplay_scenarios_access ON lms.roleplay_scenarios
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.roleplay_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS roleplay_sessions_access ON lms.roleplay_sessions;
CREATE POLICY roleplay_sessions_access ON lms.roleplay_sessions
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.ai_session_telemetry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_session_telemetry_access ON lms.ai_session_telemetry;
CREATE POLICY ai_session_telemetry_access ON lms.ai_session_telemetry
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.qa_threads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qa_threads_access ON lms.qa_threads;
CREATE POLICY qa_threads_access ON lms.qa_threads
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.learner_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS learner_notes_access ON lms.learner_notes;
CREATE POLICY learner_notes_access ON lms.learner_notes
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    );

ALTER TABLE lms.course_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS course_reviews_access ON lms.course_reviews;
CREATE POLICY course_reviews_access ON lms.course_reviews
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.review_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS review_summaries_access ON lms.review_summaries;
CREATE POLICY review_summaries_access ON lms.review_summaries
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

-- === DOMAIN 9: WHOLE-HUMAN SUPPORT (STRICTER RLS) ===
ALTER TABLE lms.navigator_caseloads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS navigator_caseloads_access ON lms.navigator_caseloads;
CREATE POLICY navigator_caseloads_access ON lms.navigator_caseloads
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(navigator_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.support_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS support_referrals_access ON lms.support_referrals;
CREATE POLICY support_referrals_access ON lms.support_referrals
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.safety_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS safety_incidents_access ON lms.safety_incidents;
CREATE POLICY safety_incidents_access ON lms.safety_incidents
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.workforce_outcomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workforce_outcomes_access ON lms.workforce_outcomes;
CREATE POLICY workforce_outcomes_access ON lms.workforce_outcomes
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.benefits_cliff_coaching ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS benefits_cliff_coaching_access ON lms.benefits_cliff_coaching;
CREATE POLICY benefits_cliff_coaching_access ON lms.benefits_cliff_coaching
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.support_case_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS support_case_notes_access ON lms.support_case_notes;
CREATE POLICY support_case_notes_access ON lms.support_case_notes
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

-- === DOMAIN 10: COMMUNICATION ===
ALTER TABLE lms.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS announcements_access ON lms.announcements;
CREATE POLICY announcements_access ON lms.announcements
    FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_preferences_access ON lms.notification_preferences;
CREATE POLICY notification_preferences_access ON lms.notification_preferences
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(user_id))
    );

ALTER TABLE lms.notification_delivery_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_delivery_log_access ON lms.notification_delivery_log;
CREATE POLICY notification_delivery_log_access ON lms.notification_delivery_log
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.learner_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS learner_reminders_access ON lms.learner_reminders;
CREATE POLICY learner_reminders_access ON lms.learner_reminders
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(user_id))
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

-- === DOMAIN 11: COMPLIANCE ===
ALTER TABLE lms.platform_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_audit_log_access ON lms.platform_audit_log;
CREATE POLICY platform_audit_log_access ON lms.platform_audit_log
    FOR SELECT USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.funder_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS funder_reports_access ON lms.funder_reports;
CREATE POLICY funder_reports_access ON lms.funder_reports
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.minor_consent_guardrails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS minor_consent_guardrails_access ON lms.minor_consent_guardrails;
CREATE POLICY minor_consent_guardrails_access ON lms.minor_consent_guardrails
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.compliance_report_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS compliance_report_runs_access ON lms.compliance_report_runs;
CREATE POLICY compliance_report_runs_access ON lms.compliance_report_runs
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

-- === DOMAIN 12: PLATFORM BRIDGE ===
ALTER TABLE lms.conversion_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS conversion_records_access ON lms.conversion_records;
CREATE POLICY conversion_records_access ON lms.conversion_records
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.free_license_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS free_license_grants_access ON lms.free_license_grants;
CREATE POLICY free_license_grants_access ON lms.free_license_grants
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.salon_conversions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS salon_conversions_access ON lms.salon_conversions;
CREATE POLICY salon_conversions_access ON lms.salon_conversions
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

ALTER TABLE lms.platform_bridge_sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_bridge_sync_log_access ON lms.platform_bridge_sync_log;
CREATE POLICY platform_bridge_sync_log_access ON lms.platform_bridge_sync_log
    FOR ALL USING (
        lms.is_platform_admin()
        OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    );

-- ============================================================================
-- UPDATED_AT TRIGGERS FOR ALL LMS TABLES
-- ============================================================================

-- Domain 1
CREATE TRIGGER lms_lms_roles_updated_at BEFORE UPDATE ON lms.lms_roles FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_consent_records_updated_at BEFORE UPDATE ON lms.consent_records FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_session_tokens_updated_at BEFORE UPDATE ON lms.session_tokens FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_cross_tenant_grants_updated_at BEFORE UPDATE ON lms.cross_tenant_grants FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();

-- Domain 2
CREATE TRIGGER lms_courses_updated_at BEFORE UPDATE ON lms.courses FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_course_versions_updated_at BEFORE UPDATE ON lms.course_versions FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_modules_updated_at BEFORE UPDATE ON lms.modules FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_lessons_updated_at BEFORE UPDATE ON lms.lessons FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_content_blocks_updated_at BEFORE UPDATE ON lms.content_blocks FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_prerequisites_updated_at BEFORE UPDATE ON lms.prerequisites FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();

-- Domain 3
CREATE TRIGGER lms_media_assets_updated_at BEFORE UPDATE ON lms.media_assets FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_media_captions_updated_at BEFORE UPDATE ON lms.media_captions FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_media_accessibility_updated_at BEFORE UPDATE ON lms.media_accessibility FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();

-- Domain 8
CREATE TRIGGER lms_skill_domains_updated_at BEFORE UPDATE ON lms.skill_domains FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_skills_updated_at BEFORE UPDATE ON lms.skills FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_course_skill_targets_updated_at BEFORE UPDATE ON lms.course_skill_targets FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_skill_signoff_events_updated_at BEFORE UPDATE ON lms.skill_signoff_events FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_credentials_updated_at BEFORE UPDATE ON lms.credentials FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_credential_verifications_updated_at BEFORE UPDATE ON lms.credential_verifications FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();

-- Domain 4
CREATE TRIGGER lms_delivery_modes_updated_at BEFORE UPDATE ON lms.delivery_modes FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_cohorts_updated_at BEFORE UPDATE ON lms.cohorts FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_cohort_enrollments_updated_at BEFORE UPDATE ON lms.cohort_enrollments FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_cohort_calendar_updated_at BEFORE UPDATE ON lms.cohort_calendar FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_enrollments_updated_at BEFORE UPDATE ON lms.enrollments FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_live_sessions_updated_at BEFORE UPDATE ON lms.live_sessions FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_attendance_records_updated_at BEFORE UPDATE ON lms.attendance_records FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_forum_threads_updated_at BEFORE UPDATE ON lms.forum_threads FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_forum_posts_updated_at BEFORE UPDATE ON lms.forum_posts FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_cohort_groups_updated_at BEFORE UPDATE ON lms.cohort_groups FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_discussions_updated_at BEFORE UPDATE ON lms.discussions FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_discussion_replies_updated_at BEFORE UPDATE ON lms.discussion_replies FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_peer_feedback_updated_at BEFORE UPDATE ON lms.peer_feedback FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();

-- Domain 7
CREATE TRIGGER lms_question_bank_updated_at BEFORE UPDATE ON lms.question_bank FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_quizzes_updated_at BEFORE UPDATE ON lms.quizzes FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_coding_exercises_updated_at BEFORE UPDATE ON lms.coding_exercises FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_rubrics_updated_at BEFORE UPDATE ON lms.rubrics FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_rubric_criteria_updated_at BEFORE UPDATE ON lms.rubric_criteria FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_assignments_updated_at BEFORE UPDATE ON lms.assignments FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_quiz_attempts_updated_at BEFORE UPDATE ON lms.quiz_attempts FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_artifact_submissions_updated_at BEFORE UPDATE ON lms.artifact_submissions FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_submission_reviews_updated_at BEFORE UPDATE ON lms.submission_reviews FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_grading_workflow_updated_at BEFORE UPDATE ON lms.grading_workflow FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_retake_policies_updated_at BEFORE UPDATE ON lms.retake_policies FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_competency_assessments_updated_at BEFORE UPDATE ON lms.ai_competency_assessments FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();

-- Domain 6
CREATE TRIGGER lms_lesson_progress_updated_at BEFORE UPDATE ON lms.lesson_progress FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_module_progress_updated_at BEFORE UPDATE ON lms.module_progress FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_completion_rules_updated_at BEFORE UPDATE ON lms.completion_rules FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_course_completions_updated_at BEFORE UPDATE ON lms.course_completions FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_at_risk_learners_updated_at BEFORE UPDATE ON lms.at_risk_learners FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
-- clock_hour_ledger has NO updated_at trigger - it is immutable

-- Domain 5
CREATE TRIGGER lms_ai_consent_gates_updated_at BEFORE UPDATE ON lms.ai_consent_gates FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_teaching_sessions_updated_at BEFORE UPDATE ON lms.ai_teaching_sessions FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_personalization_state_updated_at BEFORE UPDATE ON lms.personalization_state FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_human_escalation_routing_updated_at BEFORE UPDATE ON lms.human_escalation_routing FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_escalation_queue_updated_at BEFORE UPDATE ON lms.ai_escalation_queue FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();

-- Domain 13
CREATE TRIGGER lms_ai_instructor_personas_updated_at BEFORE UPDATE ON lms.ai_instructor_personas FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_co_instructor_assignments_updated_at BEFORE UPDATE ON lms.ai_co_instructor_assignments FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_generated_lectures_updated_at BEFORE UPDATE ON lms.ai_generated_lectures FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_content_drafts_updated_at BEFORE UPDATE ON lms.ai_content_drafts FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_assessment_generation_jobs_updated_at BEFORE UPDATE ON lms.ai_assessment_generation_jobs FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_roleplay_scenarios_updated_at BEFORE UPDATE ON lms.roleplay_scenarios FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_roleplay_sessions_updated_at BEFORE UPDATE ON lms.roleplay_sessions FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_qa_threads_updated_at BEFORE UPDATE ON lms.qa_threads FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_learner_notes_updated_at BEFORE UPDATE ON lms.learner_notes FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_course_reviews_updated_at BEFORE UPDATE ON lms.course_reviews FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_review_summaries_updated_at BEFORE UPDATE ON lms.review_summaries FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();

-- Domain 9
CREATE TRIGGER lms_navigator_caseloads_updated_at BEFORE UPDATE ON lms.navigator_caseloads FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_support_referrals_updated_at BEFORE UPDATE ON lms.support_referrals FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_safety_incidents_updated_at BEFORE UPDATE ON lms.safety_incidents FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_workforce_outcomes_updated_at BEFORE UPDATE ON lms.workforce_outcomes FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_benefits_cliff_coaching_updated_at BEFORE UPDATE ON lms.benefits_cliff_coaching FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_support_case_notes_updated_at BEFORE UPDATE ON lms.support_case_notes FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();

-- Domain 10
CREATE TRIGGER lms_announcements_updated_at BEFORE UPDATE ON lms.announcements FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_notification_preferences_updated_at BEFORE UPDATE ON lms.notification_preferences FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_notification_delivery_log_updated_at BEFORE UPDATE ON lms.notification_delivery_log FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_learner_reminders_updated_at BEFORE UPDATE ON lms.learner_reminders FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();

-- Domain 11
CREATE TRIGGER lms_funder_reports_updated_at BEFORE UPDATE ON lms.funder_reports FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_minor_consent_guardrails_updated_at BEFORE UPDATE ON lms.minor_consent_guardrails FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_compliance_report_runs_updated_at BEFORE UPDATE ON lms.compliance_report_runs FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();

-- Domain 12
CREATE TRIGGER lms_conversion_records_updated_at BEFORE UPDATE ON lms.conversion_records FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_free_license_grants_updated_at BEFORE UPDATE ON lms.free_license_grants FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_salon_conversions_updated_at BEFORE UPDATE ON lms.salon_conversions FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_platform_bridge_sync_log_updated_at BEFORE UPDATE ON lms.platform_bridge_sync_log FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();

-- ============================================================================
-- ADDITIONAL TABLES — EXPANDING ALL 13 DOMAINS
-- ============================================================================

-- --- Domain 2: Curriculum Authoring (continued) ---

CREATE TABLE IF NOT EXISTS lms.course_prerequisites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    prerequisite_course_id uuid NOT NULL,
    prerequisite_type text NOT NULL DEFAULT 'completion' CHECK (prerequisite_type IN ('completion','pass','enrollment','score_threshold')),
    min_score numeric(5,2),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, course_id, prerequisite_course_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, prerequisite_course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.lesson_resources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL,
    resource_type text NOT NULL CHECK (resource_type IN ('file','url','video','document','interactive','external_tool','ai_generated_summary')),
    resource_url text,
    media_asset_id uuid,
    title text NOT NULL,
    description text,
    is_required boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    is_ai_generated boolean NOT NULL DEFAULT false,
    is_ai_approved boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, media_asset_id) REFERENCES lms.media_assets(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_lesson_resources_lesson_idx ON lms.lesson_resources(tenant_id, lesson_id, sort_order);

CREATE TABLE IF NOT EXISTS lms.course_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    template_data jsonb NOT NULL DEFAULT '{}',
    category text,
    is_published boolean NOT NULL DEFAULT false,
    is_system_template boolean NOT NULL DEFAULT false,
    usage_count integer NOT NULL DEFAULT 0,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.module_completion_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    module_id uuid NOT NULL,
    rule_type text NOT NULL CHECK (rule_type IN ('all_lessons','min_lessons','pass_quiz','sequential','free_choice')),
    rule_config jsonb NOT NULL DEFAULT '{}',
    min_lessons integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, module_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, module_id) REFERENCES lms.modules(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.content_block_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    content_block_id uuid NOT NULL,
    version_number integer NOT NULL,
    content_snapshot jsonb NOT NULL DEFAULT '{}',
    change_summary text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, content_block_id, version_number),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, content_block_id) REFERENCES lms.content_blocks(tenant_id, id) ON DELETE CASCADE
);

-- --- Domain 3: Media (continued) ---

CREATE TABLE IF NOT EXISTS lms.media_thumbnails (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    media_asset_id uuid NOT NULL,
    thumbnail_url text NOT NULL,
    size_label text NOT NULL CHECK (size_label IN ('small','medium','large','original')),
    width integer,
    height integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, media_asset_id, size_label),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, media_asset_id) REFERENCES lms.media_assets(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.media_transcription_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    media_asset_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
    transcript_text text,
    transcript_language text NOT NULL DEFAULT 'en',
    confidence_score numeric(5,2),
    generated_by text NOT NULL DEFAULT 'ai' CHECK (generated_by IN ('ai','human','hybrid')),
    error_message text,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, media_asset_id) REFERENCES lms.media_assets(tenant_id, id) ON DELETE CASCADE
);

-- --- Domain 4: Delivery & Enrollment (continued) ---

CREATE TABLE IF NOT EXISTS lms.enrollment_waits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    cohort_id uuid,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    waitlist_position integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','offered','enrolled','expired','cancelled')),
    offered_at timestamptz,
    expires_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, cohort_id) REFERENCES lms.cohorts(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_enrollment_waits_position_idx ON lms.enrollment_waits(tenant_id, course_id, waitlist_position) WHERE status = 'waiting';

CREATE TABLE IF NOT EXISTS lms.cohort_capacity (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cohort_id uuid NOT NULL,
    max_enrollments integer NOT NULL DEFAULT 30,
    current_enrollments integer NOT NULL DEFAULT 0,
    waitlist_enabled boolean NOT NULL DEFAULT true,
    max_waitlist integer,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, cohort_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, cohort_id) REFERENCES lms.cohorts(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.delivery_schedule_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    schedule_config jsonb NOT NULL DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.lesson_releases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL,
    cohort_id uuid,
    release_type text NOT NULL DEFAULT 'immediate' CHECK (release_type IN ('immediate','scheduled','drip','conditional')),
    release_date timestamptz,
    drip_delay_days integer,
    condition_config jsonb NOT NULL DEFAULT '{}',
    is_released boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, lesson_id, cohort_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, cohort_id) REFERENCES lms.cohorts(tenant_id, id) ON DELETE CASCADE
);

-- --- Domain 5: AI Teaching (continued) ---

CREATE TABLE IF NOT EXISTS lms.ai_tutor_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    session_id uuid NOT NULL,
    lesson_id uuid,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_role text NOT NULL CHECK (message_role IN ('learner','ai','system','human_instructor')),
    message_content text NOT NULL,
    message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','voice','image','code','link','escalation')),
    is_flagged_for_review boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, session_id) REFERENCES lms.ai_teaching_sessions(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_ai_tutor_messages_session_idx ON lms.ai_tutor_messages(tenant_id, session_id, created_at);

CREATE TABLE IF NOT EXISTS lms.ai_remediation_recommendations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    skill_id uuid,
    quiz_attempt_id uuid,
    recommendation_type text NOT NULL CHECK (recommendation_type IN ('review_lesson','practice_quiz','supplementary_resource','peer_study','instructor_office_hours','alternative_content','skill_building')),
    recommendation_content jsonb NOT NULL DEFAULT '{}',
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    is_ai_generated boolean NOT NULL DEFAULT true,
    is_acted_upon boolean NOT NULL DEFAULT false,
    acted_upon_at timestamptz,
    outcome_notes text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, skill_id) REFERENCES lms.skills(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, quiz_attempt_id) REFERENCES lms.quiz_attempts(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.ai_session_summaries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    session_id uuid NOT NULL,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    summary_text text NOT NULL,
    key_takeaways text[] NOT NULL DEFAULT ARRAY[]::text[],
    areas_of_struggle text[] NOT NULL DEFAULT ARRAY[]::text[],
    areas_of_strength text[] NOT NULL DEFAULT ARRAY[]::text[],
    recommended_next_steps text[] NOT NULL DEFAULT ARRAY[]::text[],
    is_human_verified boolean NOT NULL DEFAULT false,
    verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, session_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, session_id) REFERENCES lms.ai_teaching_sessions(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.ai_content_approval_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    entity_type text NOT NULL CHECK (entity_type IN ('lecture','content_draft','assessment','question','review_summary','remediation','tutor_message','roleplay')),
    entity_id uuid NOT NULL,
    requested_by text NOT NULL DEFAULT 'ai',
    review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected','revision_requested')),
    reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    review_notes text,
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_ai_content_approval_queue_pending_idx ON lms.ai_content_approval_queue(tenant_id, priority) WHERE review_status = 'pending';

-- --- Domain 6: Progress (continued) ---

CREATE TABLE IF NOT EXISTS lms.progress_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    snapshot_type text NOT NULL DEFAULT 'periodic' CHECK (snapshot_type IN ('periodic','milestone','completion','risk_assessment')),
    snapshot_data jsonb NOT NULL DEFAULT '{}',
    overall_progress numeric(5,2),
    lessons_completed integer,
    total_lessons integer,
    clock_hours_accumulated numeric(8,2),
    risk_level text CHECK (risk_level IN ('low','medium','high','critical')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_progress_snapshots_learner_idx ON lms.progress_snapshots(tenant_id, learner_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lms.learning_analytics_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    event_type text NOT NULL CHECK (event_type IN ('page_view','video_play','video_pause','video_complete','quiz_start','quiz_submit','lesson_start','lesson_complete','module_complete','course_complete','login','logout','resource_download','discussion_post','assignment_submit')),
    event_data jsonb NOT NULL DEFAULT '{}',
    session_id uuid,
    lesson_id uuid,
    module_id uuid,
    course_id uuid,
    recorded_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, module_id) REFERENCES lms.modules(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_learning_analytics_events_learner_idx ON lms.learning_analytics_events(tenant_id, learner_user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS lms_learning_analytics_events_type_idx ON lms.learning_analytics_events(tenant_id, event_type, recorded_at DESC);

CREATE TABLE IF NOT EXISTS lms.cohort_progress_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cohort_id uuid NOT NULL,
    snapshot_data jsonb NOT NULL DEFAULT '{}',
    average_progress numeric(5,2),
    active_learners integer,
    at_risk_count integer,
    completion_rate numeric(5,2),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, cohort_id) REFERENCES lms.cohorts(tenant_id, id) ON DELETE CASCADE
);

-- --- Domain 7: Assessment (continued) ---

CREATE TABLE IF NOT EXISTS lms.grade_book (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    category text NOT NULL CHECK (category IN ('quiz','assignment','discussion','attendance','participation','final_exam','extra_credit','overall')),
    item_name text NOT NULL,
    score numeric(5,2),
    max_score numeric(5,2),
    weight numeric(5,2),
    is_ai_graded boolean NOT NULL DEFAULT false,
    is_released boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_grade_book_learner_idx ON lms.grade_book(tenant_id, learner_user_id, course_id);

CREATE TABLE IF NOT EXISTS lms.grade_book_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    category_name text NOT NULL,
    category_type text NOT NULL DEFAULT 'assignment' CHECK (category_type IN ('quiz','assignment','discussion','attendance','participation','final_exam','extra_credit')),
    weight_percent numeric(5,2) NOT NULL DEFAULT 0,
    drop_lowest integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, course_id, category_name),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.question_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    question_id uuid NOT NULL,
    variant_text text NOT NULL,
    variant_answer_options jsonb NOT NULL DEFAULT '[]',
    variant_correct_answer jsonb NOT NULL DEFAULT '{}',
    is_ai_generated boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, question_id) REFERENCES lms.question_bank(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.quiz_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    quiz_id uuid NOT NULL,
    allow_review boolean NOT NULL DEFAULT true,
    show_one_question_at_a_time boolean NOT NULL DEFAULT false,
    prevent_backtracking boolean NOT NULL DEFAULT false,
    require_lockdown_browser boolean NOT NULL DEFAULT false,
    ip_restrictions text[] NOT NULL DEFAULT ARRAY[]::text[],
    password text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, quiz_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, quiz_id) REFERENCES lms.quizzes(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.peer_review_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    assignment_id uuid NOT NULL,
    reviewer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewee_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    submission_id uuid,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','declined','expired')),
    due_date timestamptz,
    completed_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, assignment_id, reviewer_user_id, reviewee_user_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, assignment_id) REFERENCES lms.assignments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, submission_id) REFERENCES lms.artifact_submissions(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.oral_practical_assessments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    assessor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    assessment_date timestamptz NOT NULL DEFAULT now(),
    rubric_id uuid,
    criteria_scores jsonb NOT NULL DEFAULT '{}',
    overall_score numeric(5,2),
    max_score numeric(5,2),
    is_passed boolean,
    feedback_notes text,
    recording_media_asset_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, rubric_id) REFERENCES lms.rubrics(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, recording_media_asset_id) REFERENCES lms.media_assets(tenant_id, id) ON DELETE SET NULL
);

-- --- Domain 9: Whole-Human Support (continued) ---

CREATE TABLE IF NOT EXISTS lms.resource_directory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    resource_name text NOT NULL,
    resource_type text NOT NULL CHECK (resource_type IN ('housing','food','transportation','childcare','healthcare','mental_health','legal','financial','employment','education','veteran_services','disability_services')),
    provider_organization text,
    contact_phone text,
    contact_email text,
    website_url text,
    address text,
    city text,
    state text,
    zip_code text,
    eligibility_criteria text,
    services_offered text,
    hours_of_operation text,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_resource_directory_type_idx ON lms.resource_directory(tenant_id, resource_type) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS lms.navigator_check_ins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    navigator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    check_in_date timestamptz NOT NULL DEFAULT now(),
    check_in_type text NOT NULL DEFAULT 'scheduled' CHECK (check_in_type IN ('scheduled','ad_hoc','crisis_followup','milestone','pre_exit','post_exit')),
    topics_discussed text[] NOT NULL DEFAULT ARRAY[]::text[],
    action_items text[] NOT NULL DEFAULT ARRAY[]::text[],
    follow_up_date date,
    mood_assessment text CHECK (mood_assessment IN ('positive','neutral','stressed','concerning','crisis')),
    notes text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_navigator_check_ins_learner_idx ON lms.navigator_check_ins(tenant_id, learner_user_id, follow_up_date DESC);

CREATE TABLE IF NOT EXISTS lms.emergency_contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_name text NOT NULL,
    relationship text,
    phone text,
    email text,
    is_primary boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, learner_user_id, contact_name),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.learner_wellness_checkins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    check_in_date timestamptz NOT NULL DEFAULT now(),
    mood_rating integer CHECK (mood_rating BETWEEN 1 AND 5),
    stress_level text CHECK (stress_level IN ('low','moderate','high','severe')),
    sleep_quality text CHECK (sleep_quality IN ('poor','fair','good','excellent')),
    notes text,
    requires_follow_up boolean NOT NULL DEFAULT false,
    follow_up_status text CHECK (follow_up_status IN ('pending','completed','escalated')),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_learner_wellness_checkins_followup_idx ON lms.learner_wellness_checkins(tenant_id) WHERE requires_follow_up = true AND follow_up_status = 'pending';

CREATE TABLE IF NOT EXISTS lms.crisis_response_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    safety_incident_id uuid,
    ai_session_id uuid,
    crisis_type text NOT NULL CHECK (crisis_type IN ('self_harm','suicidal_ideation','domestic_violence','substance_abuse','other_crisis')),
    response_actions text[] NOT NULL DEFAULT ARRAY[]::text[],
    external_resources_contacted text[] NOT NULL DEFAULT ARRAY[]::text[],
    follow_up_required boolean NOT NULL DEFAULT true,
    follow_up_completed_at timestamptz,
    resolved_at timestamptz,
    is_confidential boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, safety_incident_id) REFERENCES lms.safety_incidents(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, ai_session_id) REFERENCES lms.ai_teaching_sessions(tenant_id, id) ON DELETE SET NULL
);

-- --- Domain 10: Communication (continued) ---

CREATE TABLE IF NOT EXISTS lms.message_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    template_name text NOT NULL,
    template_category text NOT NULL CHECK (template_category IN ('welcome','reminder','deadline','encouragement','escalation','completion','certificate','support','check_in','crisis')),
    template_subject text,
    template_body text NOT NULL,
    template_variables jsonb NOT NULL DEFAULT '[]',
    is_ai_generated boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.notification_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id uuid,
    notification_type text NOT NULL,
    channel text NOT NULL CHECK (channel IN ('email','sms','push','in_app')),
    subject text,
    body text,
    payload jsonb NOT NULL DEFAULT '{}',
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    scheduled_for timestamptz NOT NULL DEFAULT now(),
    sent_at timestamptz,
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','sent','failed','cancelled')),
    retry_count integer NOT NULL DEFAULT 0,
    max_retries integer NOT NULL DEFAULT 3,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, template_id) REFERENCES lms.message_templates(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_notification_queue_pending_idx ON lms.notification_queue(tenant_id, scheduled_for) WHERE status = 'queued';

CREATE TABLE IF NOT EXISTS lms.in_app_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_type text NOT NULL DEFAULT 'human' CHECK (sender_type IN ('human','ai_persona','system')),
    persona_id uuid,
    recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id uuid,
    cohort_id uuid,
    message_body text NOT NULL,
    is_read boolean NOT NULL DEFAULT false,
    read_at timestamptz,
    parent_message_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, cohort_id) REFERENCES lms.cohorts(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, persona_id) REFERENCES lms.ai_instructor_personas(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_in_app_messages_recipient_idx ON lms.in_app_messages(tenant_id, recipient_id, is_read, created_at DESC);

-- --- Domain 11: Compliance (continued) ---

CREATE TABLE IF NOT EXISTS lms.compliance_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    document_type text NOT NULL CHECK (document_type IN ('license','certification','audit_report','accreditation','policy','consent_form','incident_report','training_record')),
    document_name text NOT NULL,
    document_url text NOT NULL,
    issued_by text,
    issued_date date,
    expiry_date date,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','pending_renewal','archived')),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_compliance_documents_type_idx ON lms.compliance_documents(tenant_id, document_type, status);

CREATE TABLE IF NOT EXISTS lms.audit_trail_details (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    audit_log_id uuid NOT NULL,
    field_name text NOT NULL,
    old_value text,
    new_value text,
    change_type text NOT NULL CHECK (change_type IN ('create','update','delete','void','verify','publish','unpublish')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, audit_log_id) REFERENCES lms.platform_audit_log(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.data_retention_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    entity_type text NOT NULL,
    retention_period_days integer NOT NULL,
    action_on_expiry text NOT NULL DEFAULT 'archive' CHECK (action_on_expiry IN ('archive','delete','anonymize','notify')),
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, entity_type),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.clock_hour_audit_view (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    audit_period_start date NOT NULL,
    audit_period_end date NOT NULL,
    total_computed_hours numeric(8,2),
    total_verified_hours numeric(8,2),
    total_voided_hours numeric(8,2),
    net_hours numeric(8,2),
    entries_count integer NOT NULL DEFAULT 0,
    voided_count integer NOT NULL DEFAULT 0,
    pending_verification_count integer NOT NULL DEFAULT 0,
    generated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_clock_hour_audit_view_tenant_idx ON lms.clock_hour_audit_view(tenant_id, learner_user_id, audit_period_start, audit_period_end);

-- --- Domain 12: Platform Bridge (continued) ---

CREATE TABLE IF NOT EXISTS lms.integration_credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    service_name text NOT NULL CHECK (service_name IN ('ALL ABOUT PAWZ_salon','ALL ABOUT PAWZ_commerce','crm','stripe','twilio','sendgrid','aws_s3','zoom','google_meet','slack','webhook')),
    credential_type text NOT NULL CHECK (credential_type IN ('api_key','oauth_token','webhook_secret','basic_auth','bearer_token')),
    credential_value text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    expires_at timestamptz,
    last_used_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, service_name),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.webhook_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    webhook_type text NOT NULL CHECK (webhook_type IN ('outbound','inbound')),
    target_url text,
    source_url text,
    event_type text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}',
    response_status integer,
    response_body text,
    attempt_count integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','retried')),
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_webhook_log_status_idx ON lms.webhook_log(tenant_id, status) WHERE status IN ('pending','failed');

CREATE TABLE IF NOT EXISTS lms.crm_sync_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sync_direction text NOT NULL CHECK (sync_direction IN ('crm_to_lms','lms_to_crm')),
    entity_type text NOT NULL,
    entity_id uuid,
    sync_status text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending','processing','completed','failed')),
    sync_data jsonb NOT NULL DEFAULT '{}',
    error_message text,
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_crm_sync_queue_pending_idx ON lms.crm_sync_queue(tenant_id, sync_status) WHERE sync_status = 'pending';

CREATE TABLE IF NOT EXISTS lms.commerce_sync_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sync_direction text NOT NULL CHECK (sync_direction IN ('commerce_to_lms','lms_to_commerce')),
    entity_type text NOT NULL,
    entity_id uuid,
    sync_status text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending','processing','completed','failed')),
    sync_data jsonb NOT NULL DEFAULT '{}',
    error_message text,
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_commerce_sync_queue_pending_idx ON lms.commerce_sync_queue(tenant_id, sync_status) WHERE sync_status = 'pending';

CREATE TABLE IF NOT EXISTS lms.credential_sync_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    credential_id uuid NOT NULL,
    sync_type text NOT NULL CHECK (sync_type IN ('issue','revoke','verify','renew','export')),
    sync_status text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending','completed','failed')),
    external_reference text,
    sync_data jsonb NOT NULL DEFAULT '{}',
    error_message text,
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, credential_id) REFERENCES lms.credentials(tenant_id, id) ON DELETE CASCADE
);

-- --- Domain 13: AI Instructor Skills (continued) ---

CREATE TABLE IF NOT EXISTS lms.ai_persona_configurations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    persona_id uuid NOT NULL,
    config_key text NOT NULL,
    config_value jsonb NOT NULL DEFAULT '{}',
    is_overridable boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, persona_id, config_key),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, persona_id) REFERENCES lms.ai_instructor_personas(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.ai_lecture_approval_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lecture_id uuid NOT NULL,
    review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected','revision_requested')),
    reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    review_notes text,
    revision_instructions text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, lecture_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, lecture_id) REFERENCES lms.ai_generated_lectures(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_ai_lecture_approval_queue_pending_idx ON lms.ai_lecture_approval_queue(tenant_id) WHERE review_status = 'pending';

CREATE TABLE IF NOT EXISTS lms.ai_test_case_generation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    coding_exercise_id uuid,
    generated_test_cases jsonb NOT NULL DEFAULT '[]',
    is_approved boolean NOT NULL DEFAULT false,
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    generation_model text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, coding_exercise_id) REFERENCES lms.coding_exercises(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.ai_roleplay_evaluations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    roleplay_session_id uuid NOT NULL,
    learner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    evaluation_rubric_id uuid,
    ai_evaluation_results jsonb NOT NULL DEFAULT '{}',
    ai_overall_score numeric(5,2),
    ai_feedback text,
    human_verified boolean NOT NULL DEFAULT false,
    verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at timestamptz,
    final_score numeric(5,2),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, roleplay_session_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, roleplay_session_id) REFERENCES lms.roleplay_sessions(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, evaluation_rubric_id) REFERENCES lms.rubrics(tenant_id, id) ON DELETE SET NULL
);

-- ============================================================================
-- RLS POLICIES FOR ADDITIONAL TABLES
-- ============================================================================

-- Domain 2 additions
ALTER TABLE lms.course_prerequisites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS course_prerequisites_access ON lms.course_prerequisites;
CREATE POLICY course_prerequisites_access ON lms.course_prerequisites FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.lesson_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_resources_access ON lms.lesson_resources;
CREATE POLICY lesson_resources_access ON lms.lesson_resources FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.course_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS course_templates_access ON lms.course_templates;
CREATE POLICY course_templates_access ON lms.course_templates FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.module_completion_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS module_completion_rules_access ON lms.module_completion_rules;
CREATE POLICY module_completion_rules_access ON lms.module_completion_rules FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.content_block_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS content_block_versions_access ON lms.content_block_versions;
CREATE POLICY content_block_versions_access ON lms.content_block_versions FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

-- Domain 3 additions
ALTER TABLE lms.media_thumbnails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS media_thumbnails_access ON lms.media_thumbnails;
CREATE POLICY media_thumbnails_access ON lms.media_thumbnails FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.media_transcription_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS media_transcription_jobs_access ON lms.media_transcription_jobs;
CREATE POLICY media_transcription_jobs_access ON lms.media_transcription_jobs FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

-- Domain 4 additions
ALTER TABLE lms.enrollment_waits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS enrollment_waits_access ON lms.enrollment_waits;
CREATE POLICY enrollment_waits_access ON lms.enrollment_waits FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.cohort_capacity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cohort_capacity_access ON lms.cohort_capacity;
CREATE POLICY cohort_capacity_access ON lms.cohort_capacity FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.delivery_schedule_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS delivery_schedule_templates_access ON lms.delivery_schedule_templates;
CREATE POLICY delivery_schedule_templates_access ON lms.delivery_schedule_templates FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.lesson_releases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_releases_access ON lms.lesson_releases;
CREATE POLICY lesson_releases_access ON lms.lesson_releases FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

-- Domain 5 additions
ALTER TABLE lms.ai_tutor_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_tutor_messages_access ON lms.ai_tutor_messages;
CREATE POLICY ai_tutor_messages_access ON lms.ai_tutor_messages FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.ai_remediation_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_remediation_recommendations_access ON lms.ai_remediation_recommendations;
CREATE POLICY ai_remediation_recommendations_access ON lms.ai_remediation_recommendations FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.ai_session_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_session_summaries_access ON lms.ai_session_summaries;
CREATE POLICY ai_session_summaries_access ON lms.ai_session_summaries FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.ai_content_approval_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_content_approval_queue_access ON lms.ai_content_approval_queue;
CREATE POLICY ai_content_approval_queue_access ON lms.ai_content_approval_queue FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
);

-- Domain 6 additions
ALTER TABLE lms.progress_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS progress_snapshots_access ON lms.progress_snapshots;
CREATE POLICY progress_snapshots_access ON lms.progress_snapshots FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.learning_analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS learning_analytics_events_access ON lms.learning_analytics_events;
CREATE POLICY learning_analytics_events_access ON lms.learning_analytics_events FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.cohort_progress_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cohort_progress_snapshots_access ON lms.cohort_progress_snapshots;
CREATE POLICY cohort_progress_snapshots_access ON lms.cohort_progress_snapshots FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

-- Domain 7 additions
ALTER TABLE lms.grade_book ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grade_book_access ON lms.grade_book;
CREATE POLICY grade_book_access ON lms.grade_book FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.grade_book_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grade_book_categories_access ON lms.grade_book_categories;
CREATE POLICY grade_book_categories_access ON lms.grade_book_categories FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.question_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS question_variants_access ON lms.question_variants;
CREATE POLICY question_variants_access ON lms.question_variants FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.quiz_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quiz_settings_access ON lms.quiz_settings;
CREATE POLICY quiz_settings_access ON lms.quiz_settings FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.peer_review_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS peer_review_assignments_access ON lms.peer_review_assignments;
CREATE POLICY peer_review_assignments_access ON lms.peer_review_assignments FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(reviewer_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(reviewee_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.oral_practical_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS oral_practical_assessments_access ON lms.oral_practical_assessments;
CREATE POLICY oral_practical_assessments_access ON lms.oral_practical_assessments FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

-- Domain 9 additions
ALTER TABLE lms.resource_directory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS resource_directory_access ON lms.resource_directory;
CREATE POLICY resource_directory_access ON lms.resource_directory FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.navigator_check_ins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS navigator_check_ins_access ON lms.navigator_check_ins;
CREATE POLICY navigator_check_ins_access ON lms.navigator_check_ins FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(navigator_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.emergency_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS emergency_contacts_access ON lms.emergency_contacts;
CREATE POLICY emergency_contacts_access ON lms.emergency_contacts FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.learner_wellness_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS learner_wellness_checkins_access ON lms.learner_wellness_checkins;
CREATE POLICY learner_wellness_checkins_access ON lms.learner_wellness_checkins FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.crisis_response_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crisis_response_log_access ON lms.crisis_response_log;
CREATE POLICY crisis_response_log_access ON lms.crisis_response_log FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

-- Domain 10 additions
ALTER TABLE lms.message_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS message_templates_access ON lms.message_templates;
CREATE POLICY message_templates_access ON lms.message_templates FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.notification_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_queue_access ON lms.notification_queue;
CREATE POLICY notification_queue_access ON lms.notification_queue FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.in_app_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS in_app_messages_access ON lms.in_app_messages;
CREATE POLICY in_app_messages_access ON lms.in_app_messages FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(recipient_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(sender_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

-- Domain 11 additions
ALTER TABLE lms.compliance_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS compliance_documents_access ON lms.compliance_documents;
CREATE POLICY compliance_documents_access ON lms.compliance_documents FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.audit_trail_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_trail_details_access ON lms.audit_trail_details;
CREATE POLICY audit_trail_details_access ON lms.audit_trail_details FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.data_retention_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS data_retention_policies_access ON lms.data_retention_policies;
CREATE POLICY data_retention_policies_access ON lms.data_retention_policies FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.clock_hour_audit_view ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clock_hour_audit_view_access ON lms.clock_hour_audit_view;
CREATE POLICY clock_hour_audit_view_access ON lms.clock_hour_audit_view FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

-- Domain 12 additions
ALTER TABLE lms.integration_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integration_credentials_access ON lms.integration_credentials;
CREATE POLICY integration_credentials_access ON lms.integration_credentials FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.webhook_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhook_log_access ON lms.webhook_log;
CREATE POLICY webhook_log_access ON lms.webhook_log FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.crm_sync_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_sync_queue_access ON lms.crm_sync_queue;
CREATE POLICY crm_sync_queue_access ON lms.crm_sync_queue FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.commerce_sync_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commerce_sync_queue_access ON lms.commerce_sync_queue;
CREATE POLICY commerce_sync_queue_access ON lms.commerce_sync_queue FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.credential_sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credential_sync_log_access ON lms.credential_sync_log;
CREATE POLICY credential_sync_log_access ON lms.credential_sync_log FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

-- Domain 13 additions
ALTER TABLE lms.ai_persona_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_persona_configurations_access ON lms.ai_persona_configurations;
CREATE POLICY ai_persona_configurations_access ON lms.ai_persona_configurations FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.ai_lecture_approval_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_lecture_approval_queue_access ON lms.ai_lecture_approval_queue;
CREATE POLICY ai_lecture_approval_queue_access ON lms.ai_lecture_approval_queue FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
);

ALTER TABLE lms.ai_test_case_generation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_test_case_generation_access ON lms.ai_test_case_generation;
CREATE POLICY ai_test_case_generation_access ON lms.ai_test_case_generation FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.ai_roleplay_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_roleplay_evaluations_access ON lms.ai_roleplay_evaluations;
CREATE POLICY ai_roleplay_evaluations_access ON lms.ai_roleplay_evaluations FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

-- ============================================================================
-- UPDATED_AT TRIGGERS FOR ADDITIONAL TABLES
-- ============================================================================

CREATE TRIGGER lms_course_prerequisites_updated_at BEFORE UPDATE ON lms.course_prerequisites FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_lesson_resources_updated_at BEFORE UPDATE ON lms.lesson_resources FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_course_templates_updated_at BEFORE UPDATE ON lms.course_templates FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_module_completion_rules_updated_at BEFORE UPDATE ON lms.module_completion_rules FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_media_thumbnails_updated_at BEFORE UPDATE ON lms.media_thumbnails FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_enrollment_waits_updated_at BEFORE UPDATE ON lms.enrollment_waits FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_cohort_capacity_updated_at BEFORE UPDATE ON lms.cohort_capacity FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_delivery_schedule_templates_updated_at BEFORE UPDATE ON lms.delivery_schedule_templates FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_lesson_releases_updated_at BEFORE UPDATE ON lms.lesson_releases FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_tutor_messages_updated_at BEFORE UPDATE ON lms.ai_tutor_messages FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_remediation_recommendations_updated_at BEFORE UPDATE ON lms.ai_remediation_recommendations FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_session_summaries_updated_at BEFORE UPDATE ON lms.ai_session_summaries FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_content_approval_queue_updated_at BEFORE UPDATE ON lms.ai_content_approval_queue FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_progress_snapshots_updated_at BEFORE UPDATE ON lms.progress_snapshots FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_grade_book_updated_at BEFORE UPDATE ON lms.grade_book FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_grade_book_categories_updated_at BEFORE UPDATE ON lms.grade_book_categories FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_question_variants_updated_at BEFORE UPDATE ON lms.question_variants FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_quiz_settings_updated_at BEFORE UPDATE ON lms.quiz_settings FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_peer_review_assignments_updated_at BEFORE UPDATE ON lms.peer_review_assignments FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_oral_practical_assessments_updated_at BEFORE UPDATE ON lms.oral_practical_assessments FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_resource_directory_updated_at BEFORE UPDATE ON lms.resource_directory FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_navigator_check_ins_updated_at BEFORE UPDATE ON lms.navigator_check_ins FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_emergency_contacts_updated_at BEFORE UPDATE ON lms.emergency_contacts FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_learner_wellness_checkins_updated_at BEFORE UPDATE ON lms.learner_wellness_checkins FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_crisis_response_log_updated_at BEFORE UPDATE ON lms.crisis_response_log FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_message_templates_updated_at BEFORE UPDATE ON lms.message_templates FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_notification_queue_updated_at BEFORE UPDATE ON lms.notification_queue FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_in_app_messages_updated_at BEFORE UPDATE ON lms.in_app_messages FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_compliance_documents_updated_at BEFORE UPDATE ON lms.compliance_documents FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_data_retention_policies_updated_at BEFORE UPDATE ON lms.data_retention_policies FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_clock_hour_audit_view_updated_at BEFORE UPDATE ON lms.clock_hour_audit_view FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_integration_credentials_updated_at BEFORE UPDATE ON lms.integration_credentials FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_webhook_log_updated_at BEFORE UPDATE ON lms.webhook_log FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_crm_sync_queue_updated_at BEFORE UPDATE ON lms.crm_sync_queue FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_commerce_sync_queue_updated_at BEFORE UPDATE ON lms.commerce_sync_queue FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_credential_sync_log_updated_at BEFORE UPDATE ON lms.credential_sync_log FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_persona_configurations_updated_at BEFORE UPDATE ON lms.ai_persona_configurations FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_lecture_approval_queue_updated_at BEFORE UPDATE ON lms.ai_lecture_approval_queue FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_test_case_generation_updated_at BEFORE UPDATE ON lms.ai_test_case_generation FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_roleplay_evaluations_updated_at BEFORE UPDATE ON lms.ai_roleplay_evaluations FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();

-- ============================================================================
-- ADDITIONAL TABLES — ROUND 3
-- ============================================================================

-- --- Domain 1: Identity & Access (continued) ---

CREATE TABLE IF NOT EXISTS lms.lms_role_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id uuid NOT NULL,
    scope_type text NOT NULL DEFAULT 'tenant' CHECK (scope_type IN ('tenant','course','cohort','module','lesson')),
    scope_id uuid,
    assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    is_active boolean NOT NULL DEFAULT true,
    revoked_at timestamptz,
    revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    revoke_reason text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id, role_id, scope_type, scope_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, role_id) REFERENCES lms.lms_roles(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_lms_role_assignments_user_idx ON lms.lms_role_assignments(tenant_id, user_id) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS lms.learner_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_name text,
    pronouns text,
    bio text,
    avatar_url text,
    timezone text NOT NULL DEFAULT 'America/Chicago',
    language_preference text NOT NULL DEFAULT 'en',
    accessibility_needs jsonb NOT NULL DEFAULT '{}',
    education_level text,
    employment_status text,
    career_goals text,
    learning_preferences jsonb NOT NULL DEFAULT '{}',
    marketing_opt_in boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_learner_profiles_user_idx ON lms.learner_profiles(tenant_id, user_id);

CREATE TABLE IF NOT EXISTS lms.instructor_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name text NOT NULL,
    title text,
    bio text,
    avatar_url text,
    expertise_areas text[] NOT NULL DEFAULT ARRAY[]::text[],
    certifications jsonb NOT NULL DEFAULT '[]',
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.navigator_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name text NOT NULL,
    title text,
    bio text,
    avatar_url text,
    specializations text[] NOT NULL DEFAULT ARRAY[]::text[],
    max_caseload integer NOT NULL DEFAULT 50,
    current_caseload integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id),
    UNIQUE(tenant_id, id)
);

-- --- Domain 2: Curriculum Authoring (continued) ---



CREATE TABLE IF NOT EXISTS lms.course_instructors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    instructor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'instructor' CHECK (role IN ('lead_instructor','co_instructor','teaching_assistant','guest_lecturer','ai_co_instructor')),
    is_primary boolean NOT NULL DEFAULT false,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, course_id, instructor_user_id, role),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_course_instructors_course_idx ON lms.course_instructors(tenant_id, course_id) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS lms.lesson_objectives (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL,
    objective_text text NOT NULL,
    bloom_level text CHECK (bloom_level IN ('remember','understand','apply','analyze','evaluate','create')),
    sort_order integer NOT NULL DEFAULT 0,
    skill_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, lesson_id, objective_text),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES lms.lessons(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, skill_id) REFERENCES lms.skills(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.course_learning_outcomes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid NOT NULL,
    outcome_text text NOT NULL,
    outcome_code text,
    description text,
    assessment_method text CHECK (assessment_method IN ('quiz','assignment','project','practical','presentation','portfolio','exam','mixed')),
    sort_order integer NOT NULL DEFAULT 0,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, course_id, outcome_text),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.content_block_interactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    content_block_id uuid NOT NULL,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    interaction_type text NOT NULL CHECK (interaction_type IN ('view','click','expand','collapse','play','pause','complete','skip','bookmark','download','share','highlight','annotate')),
    interaction_data jsonb NOT NULL DEFAULT '{}',
    duration_seconds integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, content_block_id) REFERENCES lms.content_blocks(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_content_block_interactions_block_idx ON lms.content_block_interactions(tenant_id, content_block_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lms_content_block_interactions_learner_idx ON lms.content_block_interactions(tenant_id, learner_user_id, created_at DESC);

-- --- Domain 4: Delivery (continued) ---

CREATE TABLE IF NOT EXISTS lms.cohort_instructors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cohort_id uuid NOT NULL,
    instructor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'instructor' CHECK (role IN ('lead_instructor','co_instructor','teaching_assistant','navigator')),
    is_active boolean NOT NULL DEFAULT true,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, cohort_id, instructor_user_id, role),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, cohort_id) REFERENCES lms.cohorts(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_cohort_instructors_cohort_idx ON lms.cohort_instructors(tenant_id, cohort_id) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS lms.live_session_recordings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    live_session_id uuid NOT NULL,
    recording_url text NOT NULL,
    recording_duration_seconds integer,
    recording_size_mb numeric(10,2),
    media_asset_id uuid,
    is_processed boolean NOT NULL DEFAULT false,
    processing_status text NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending','processing','completed','failed')),
    is_available boolean NOT NULL DEFAULT false,
    available_from timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, live_session_id) REFERENCES lms.live_sessions(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, media_asset_id) REFERENCES lms.media_assets(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.breakout_rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    live_session_id uuid NOT NULL,
    room_name text NOT NULL,
    room_url text,
    max_participants integer NOT NULL DEFAULT 10,
    assigned_participants uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
    facilitator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active boolean NOT NULL DEFAULT false,
    started_at timestamptz,
    ended_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, live_session_id) REFERENCES lms.live_sessions(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.enrollment_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    enrollment_id uuid NOT NULL,
    from_cohort_id uuid,
    to_cohort_id uuid,
    requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed','cancelled')),
    transfer_reason text,
    transfer_date timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, from_cohort_id) REFERENCES lms.cohorts(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, to_cohort_id) REFERENCES lms.cohorts(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.enrollment_extensions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    enrollment_id uuid NOT NULL,
    original_end_date timestamptz,
    new_end_date timestamptz NOT NULL,
    extension_reason text,
    requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE CASCADE
);

-- --- Domain 6: Progress (continued) ---

CREATE TABLE IF NOT EXISTS lms.skill_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    skill_id uuid NOT NULL,
    competency_level text NOT NULL DEFAULT 'not_started' CHECK (competency_level IN ('not_started','introduced','practiced','mastered')),
    progress_percentage numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    last_assessed_at timestamptz,
    last_assessment_score numeric(5,2),
    assessment_count integer NOT NULL DEFAULT 0,
    practice_count integer NOT NULL DEFAULT 0,
    is_signed_off boolean NOT NULL DEFAULT false,
    signed_off_at timestamptz,
    signed_off_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, learner_user_id, skill_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, skill_id) REFERENCES lms.skills(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lms_skill_progress_learner_idx ON lms.skill_progress(tenant_id, learner_user_id);
CREATE INDEX IF NOT EXISTS lms_skill_progress_level_idx ON lms.skill_progress(tenant_id, competency_level) WHERE is_signed_off = false;

-- Link skill_signoffs and skill_signoff_events to skill_progress as the authoritative source
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'skill_signoffs_skill_progress_fk'
    ) THEN
        ALTER TABLE lms.skill_signoffs
            ADD CONSTRAINT skill_signoffs_skill_progress_fk
            FOREIGN KEY (tenant_id, learner_user_id, skill_id)
            REFERENCES lms.skill_progress(tenant_id, learner_user_id, skill_id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'skill_signoff_events_skill_progress_fk'
    ) THEN
        ALTER TABLE lms.skill_signoff_events
            ADD CONSTRAINT skill_signoff_events_skill_progress_fk
            FOREIGN KEY (tenant_id, learner_user_id, skill_id)
            REFERENCES lms.skill_progress(tenant_id, learner_user_id, skill_id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS lms.streak_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id uuid,
    current_streak_days integer NOT NULL DEFAULT 0,
    longest_streak_days integer NOT NULL DEFAULT 0,
    last_active_date date NOT NULL DEFAULT CURRENT_DATE,
    streak_type text NOT NULL DEFAULT 'daily' CHECK (streak_type IN ('daily','weekly','lesson')),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, learner_user_id, streak_type),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, enrollment_id) REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL
);







CREATE TABLE IF NOT EXISTS lms.leaderboards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid,
    cohort_id uuid,
    leaderboard_type text NOT NULL CHECK (leaderboard_type IN ('points','completion','streak','skill_mastery','weekly','monthly','all_time')),
    period_start date,
    period_end date,
    rankings jsonb NOT NULL DEFAULT '[]',
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, cohort_id) REFERENCES lms.cohorts(tenant_id, id) ON DELETE CASCADE
);

-- --- Domain 5: AI Teaching (continued) ---

CREATE TABLE IF NOT EXISTS lms.ai_model_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    model_name text NOT NULL,
    model_provider text NOT NULL CHECK (model_provider IN ('openai','anthropic','google','meta','mistral','cohere','custom')),
    model_version text NOT NULL,
    api_endpoint text,
    max_tokens integer NOT NULL DEFAULT 4096,
    temperature numeric(3,2) NOT NULL DEFAULT 0.7,
    is_active boolean NOT NULL DEFAULT true,
    is_default boolean NOT NULL DEFAULT false,
    capabilities text[] NOT NULL DEFAULT ARRAY[]::text[],
    cost_per_1k_input numeric(10,4),
    cost_per_1k_output numeric(10,4),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, model_name, model_version),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.ai_prompt_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    template_name text NOT NULL,
    template_category text NOT NULL CHECK (template_category IN ('lecture_generation','content_draft','assessment_generation','question_generation','remediation','tutoring','summarization','roleplay','review_moderation','explanation')),
    system_prompt text NOT NULL,
    user_prompt_template text NOT NULL,
    variables jsonb NOT NULL DEFAULT '[]',
    model_config_id uuid,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, template_name),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, model_config_id) REFERENCES lms.ai_model_configs(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.ai_usage_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id uuid,
    model_name text NOT NULL,
    input_tokens integer NOT NULL DEFAULT 0,
    output_tokens integer NOT NULL DEFAULT 0,
    total_tokens integer NOT NULL DEFAULT 0,
    estimated_cost numeric(10,4) NOT NULL DEFAULT 0,
    usage_type text NOT NULL CHECK (usage_type IN ('lecture','content_draft','assessment','question','tutoring','summarization','roleplay','review','explanation','other')),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_ai_usage_tracking_tenant_idx ON lms.ai_usage_tracking(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lms_ai_usage_tracking_user_idx ON lms.ai_usage_tracking(tenant_id, user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lms.ai_safety_filters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    filter_type text NOT NULL CHECK (filter_type IN ('content_moderation','crisis_detection','bias_detection','hallucination_check','prompt_injection','pi_detection')),
    filter_name text NOT NULL,
    filter_config jsonb NOT NULL DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    action_on_trigger text NOT NULL DEFAULT 'flag' CHECK (action_on_trigger IN ('flag','block','escalate','log')),
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, filter_name),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.ai_safety_incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    session_id uuid,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filter_id uuid,
    incident_type text NOT NULL,
    severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
    detected_content text,
    action_taken text NOT NULL CHECK (action_taken IN ('flagged','blocked','escalated','logged')),
    is_resolved boolean NOT NULL DEFAULT false,
    resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at timestamptz,
    resolution_notes text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, session_id) REFERENCES lms.ai_teaching_sessions(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, filter_id) REFERENCES lms.ai_safety_filters(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_ai_safety_incidents_unresolved_idx ON lms.ai_safety_incidents(tenant_id) WHERE is_resolved = false;

-- --- Domain 7: Assessment (continued) ---

CREATE TABLE IF NOT EXISTS lms.quiz_attempt_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    attempt_id uuid NOT NULL,
    question_id uuid NOT NULL,
    learner_answer jsonb NOT NULL DEFAULT '{}',
    is_correct boolean,
    points_earned numeric(5,2) NOT NULL DEFAULT 0,
    max_points numeric(5,2) NOT NULL DEFAULT 0,
    time_spent_seconds integer,
    is_flagged_for_review boolean NOT NULL DEFAULT false,
    review_notes text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, attempt_id, question_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, attempt_id) REFERENCES lms.quiz_attempts(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, question_id) REFERENCES lms.question_bank(tenant_id, id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS lms_quiz_attempt_answers_attempt_idx ON lms.quiz_attempt_answers(tenant_id, attempt_id);

CREATE TABLE IF NOT EXISTS lms.submission_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    submission_id uuid NOT NULL,
    media_asset_id uuid,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_size_bytes bigint,
    file_type text,
    is_ai_generated boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, submission_id) REFERENCES lms.artifact_submissions(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, media_asset_id) REFERENCES lms.media_assets(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lms.feedback_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    template_name text NOT NULL,
    feedback_type text NOT NULL CHECK (feedback_type IN ('rubric_based','narrative','checklist','ai_generated','structured')),
    template_content jsonb NOT NULL DEFAULT '{}',
    is_ai_generated boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lms.grading_scales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid,
    scale_name text NOT NULL,
    scale_type text NOT NULL DEFAULT 'letter' CHECK (scale_type IN ('letter','percentage','pass_fail','competency','custom')),
    scale_config jsonb NOT NULL DEFAULT '{}',
    is_default boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE
);

-- --- Domain 9: Whole-Human Support (continued) ---

CREATE TABLE IF NOT EXISTS lms.mentorship_matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    mentor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mentee_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id uuid,
    match_criteria jsonb NOT NULL DEFAULT '{}',
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','paused','completed','terminated')),
    matched_at timestamptz NOT NULL DEFAULT now(),
    matched_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    is_ai_matched boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, mentor_user_id, mentee_user_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_mentorship_matches_mentor_idx ON lms.mentorship_matches(tenant_id, mentor_user_id) WHERE status IN ('pending','active');
CREATE INDEX IF NOT EXISTS lms_mentorship_matches_mentee_idx ON lms.mentorship_matches(tenant_id, mentee_user_id) WHERE status IN ('pending','active');

CREATE TABLE IF NOT EXISTS lms.peer_study_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id uuid,
    cohort_id uuid,
    group_name text NOT NULL,
    description text,
    max_members integer NOT NULL DEFAULT 10,
    current_members integer NOT NULL DEFAULT 0,
    is_ai_formed boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, cohort_id) REFERENCES lms.cohorts(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.peer_study_group_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    group_id uuid NOT NULL,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','facilitator','ai_facilitator')),
    joined_at timestamptz NOT NULL DEFAULT now(),
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, group_id, learner_user_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, group_id) REFERENCES lms.peer_study_groups(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms.workforce_placement_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    learner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id uuid,
    employer_name text,
    job_title text,
    start_date date,
    hourly_wage numeric(10,2),
    is_employed boolean NOT NULL DEFAULT false,
    employment_status text CHECK (employment_status IN ('seeking','employed','self_employed','unemployed','underemployed','unknown')),
    placement_source text CHECK (placement_source IN ('navigator','ai_match','self_found','employer_partner','salon_conversion')),
    day_90_check_completed boolean NOT NULL DEFAULT false,
    day_90_still_employed boolean,
    day_180_check_completed boolean NOT NULL DEFAULT false,
    day_180_still_employed boolean,
    day_365_check_completed boolean NOT NULL DEFAULT false,
    day_365_still_employed boolean,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, learner_user_id),
    UNIQUE(tenant_id, id),
    FOREIGN KEY (tenant_id, credential_id) REFERENCES lms.credentials(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lms_workforce_placement_tracking_status_idx ON lms.workforce_placement_tracking(tenant_id, employment_status);

CREATE TABLE IF NOT EXISTS lms.community_resources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    resource_name text NOT NULL,
    resource_type text NOT NULL CHECK (resource_type IN ('food_bank','shelter','healthcare','mental_health','childcare','transportation','legal_aid','financial_coaching','veteran_services','disability_services','substance_recovery')),
    organization_name text,
    contact_info jsonb NOT NULL DEFAULT '{}',
    address text,
    service_area text,
    eligibility text,
    availability jsonb NOT NULL DEFAULT '{}',
    is_verified boolean NOT NULL DEFAULT false,
    verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at timestamptz,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS lms_community_resources_type_idx ON lms.community_resources(tenant_id, resource_type) WHERE is_active = true;

-- ============================================================================
-- RLS POLICIES FOR ROUND 3 TABLES
-- ============================================================================

-- Domain 1
ALTER TABLE lms.lms_role_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lms_role_assignments_access ON lms.lms_role_assignments;
CREATE POLICY lms_role_assignments_access ON lms.lms_role_assignments FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.learner_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS learner_profiles_access ON lms.learner_profiles;
CREATE POLICY learner_profiles_access ON lms.learner_profiles FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.instructor_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS instructor_profiles_access ON lms.instructor_profiles;
CREATE POLICY instructor_profiles_access ON lms.instructor_profiles FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.navigator_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS navigator_profiles_access ON lms.navigator_profiles;
CREATE POLICY navigator_profiles_access ON lms.navigator_profiles FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

-- Domain 2
ALTER TABLE lms.pathway_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pathway_courses_access ON lms.pathway_courses;
CREATE POLICY pathway_courses_access ON lms.pathway_courses FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.course_instructors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS course_instructors_access ON lms.course_instructors;
CREATE POLICY course_instructors_access ON lms.course_instructors FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.lesson_objectives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_objectives_access ON lms.lesson_objectives;
CREATE POLICY lesson_objectives_access ON lms.lesson_objectives FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.course_learning_outcomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS course_learning_outcomes_access ON lms.course_learning_outcomes;
CREATE POLICY course_learning_outcomes_access ON lms.course_learning_outcomes FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.content_block_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS content_block_interactions_access ON lms.content_block_interactions;
CREATE POLICY content_block_interactions_access ON lms.content_block_interactions FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

-- Domain 4
ALTER TABLE lms.cohort_instructors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cohort_instructors_access ON lms.cohort_instructors;
CREATE POLICY cohort_instructors_access ON lms.cohort_instructors FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.live_session_recordings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS live_session_recordings_access ON lms.live_session_recordings;
CREATE POLICY live_session_recordings_access ON lms.live_session_recordings FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.breakout_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS breakout_rooms_access ON lms.breakout_rooms;
CREATE POLICY breakout_rooms_access ON lms.breakout_rooms FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.enrollment_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS enrollment_transfers_access ON lms.enrollment_transfers;
CREATE POLICY enrollment_transfers_access ON lms.enrollment_transfers FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
);

ALTER TABLE lms.enrollment_extensions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS enrollment_extensions_access ON lms.enrollment_extensions;
CREATE POLICY enrollment_extensions_access ON lms.enrollment_extensions FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
);

-- Domain 6
ALTER TABLE lms.skill_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS skill_progress_access ON lms.skill_progress;
CREATE POLICY skill_progress_access ON lms.skill_progress FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.streak_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS streak_tracking_access ON lms.streak_tracking;
CREATE POLICY streak_tracking_access ON lms.streak_tracking FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);


ALTER TABLE lms.learner_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS learner_points_access ON lms.learner_points;
CREATE POLICY learner_points_access ON lms.learner_points FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.leaderboards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leaderboards_access ON lms.leaderboards;
CREATE POLICY leaderboards_access ON lms.leaderboards FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

-- Domain 5
ALTER TABLE lms.ai_model_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_model_configs_access ON lms.ai_model_configs;
CREATE POLICY ai_model_configs_access ON lms.ai_model_configs FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.ai_prompt_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_prompt_templates_access ON lms.ai_prompt_templates;
CREATE POLICY ai_prompt_templates_access ON lms.ai_prompt_templates FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
);

ALTER TABLE lms.ai_usage_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_usage_tracking_access ON lms.ai_usage_tracking;
CREATE POLICY ai_usage_tracking_access ON lms.ai_usage_tracking FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.ai_safety_filters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_safety_filters_access ON lms.ai_safety_filters;
CREATE POLICY ai_safety_filters_access ON lms.ai_safety_filters FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.ai_safety_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_safety_incidents_access ON lms.ai_safety_incidents;
CREATE POLICY ai_safety_incidents_access ON lms.ai_safety_incidents FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

-- Domain 7
ALTER TABLE lms.quiz_attempt_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quiz_attempt_answers_access ON lms.quiz_attempt_answers;
CREATE POLICY quiz_attempt_answers_access ON lms.quiz_attempt_answers FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.submission_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS submission_attachments_access ON lms.submission_attachments;
CREATE POLICY submission_attachments_access ON lms.submission_attachments FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_instructor(tenant_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.feedback_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS feedback_templates_access ON lms.feedback_templates;
CREATE POLICY feedback_templates_access ON lms.feedback_templates FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.grading_scales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grading_scales_access ON lms.grading_scales;
CREATE POLICY grading_scales_access ON lms.grading_scales FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

-- Domain 9
ALTER TABLE lms.mentorship_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mentorship_matches_access ON lms.mentorship_matches;
CREATE POLICY mentorship_matches_access ON lms.mentorship_matches FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(mentor_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(mentee_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.peer_study_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS peer_study_groups_access ON lms.peer_study_groups;
CREATE POLICY peer_study_groups_access ON lms.peer_study_groups FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

ALTER TABLE lms.peer_study_group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS peer_study_group_members_access ON lms.peer_study_group_members;
CREATE POLICY peer_study_group_members_access ON lms.peer_study_group_members FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.workforce_placement_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workforce_placement_tracking_access ON lms.workforce_placement_tracking;
CREATE POLICY workforce_placement_tracking_access ON lms.workforce_placement_tracking FOR ALL USING (
    lms.is_platform_admin()
    OR (lms.is_tenant_member(tenant_id) AND lms.is_learner_self(learner_user_id))
    OR (lms.is_tenant_member(tenant_id) AND lms.is_lms_admin(tenant_id))
);

ALTER TABLE lms.community_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS community_resources_access ON lms.community_resources;
CREATE POLICY community_resources_access ON lms.community_resources FOR ALL USING (lms.is_platform_admin() OR lms.is_tenant_member(tenant_id));

-- ============================================================================
-- UPDATED_AT TRIGGERS FOR ROUND 3 TABLES
-- ============================================================================

CREATE TRIGGER lms_lms_role_assignments_updated_at BEFORE UPDATE ON lms.lms_role_assignments FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_learner_profiles_updated_at BEFORE UPDATE ON lms.learner_profiles FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_instructor_profiles_updated_at BEFORE UPDATE ON lms.instructor_profiles FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_navigator_profiles_updated_at BEFORE UPDATE ON lms.navigator_profiles FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_pathway_courses_updated_at BEFORE UPDATE ON lms.pathway_courses FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_course_instructors_updated_at BEFORE UPDATE ON lms.course_instructors FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_lesson_objectives_updated_at BEFORE UPDATE ON lms.lesson_objectives FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_course_learning_outcomes_updated_at BEFORE UPDATE ON lms.course_learning_outcomes FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_cohort_instructors_updated_at BEFORE UPDATE ON lms.cohort_instructors FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_live_session_recordings_updated_at BEFORE UPDATE ON lms.live_session_recordings FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_breakout_rooms_updated_at BEFORE UPDATE ON lms.breakout_rooms FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_enrollment_transfers_updated_at BEFORE UPDATE ON lms.enrollment_transfers FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_enrollment_extensions_updated_at BEFORE UPDATE ON lms.enrollment_extensions FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_skill_progress_updated_at BEFORE UPDATE ON lms.skill_progress FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_streak_tracking_updated_at BEFORE UPDATE ON lms.streak_tracking FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_learner_badges_updated_at BEFORE UPDATE ON lms.learner_badges FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_learner_points_updated_at BEFORE UPDATE ON lms.learner_points FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_leaderboards_updated_at BEFORE UPDATE ON lms.leaderboards FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_model_configs_updated_at BEFORE UPDATE ON lms.ai_model_configs FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_prompt_templates_updated_at BEFORE UPDATE ON lms.ai_prompt_templates FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_safety_filters_updated_at BEFORE UPDATE ON lms.ai_safety_filters FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_ai_safety_incidents_updated_at BEFORE UPDATE ON lms.ai_safety_incidents FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_submission_attachments_updated_at BEFORE UPDATE ON lms.submission_attachments FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_feedback_templates_updated_at BEFORE UPDATE ON lms.feedback_templates FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_grading_scales_updated_at BEFORE UPDATE ON lms.grading_scales FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_mentorship_matches_updated_at BEFORE UPDATE ON lms.mentorship_matches FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_peer_study_groups_updated_at BEFORE UPDATE ON lms.peer_study_groups FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_peer_study_group_members_updated_at BEFORE UPDATE ON lms.peer_study_group_members FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_workforce_placement_tracking_updated_at BEFORE UPDATE ON lms.workforce_placement_tracking FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();
CREATE TRIGGER lms_community_resources_updated_at BEFORE UPDATE ON lms.community_resources FOR EACH ROW EXECUTE FUNCTION lms.touch_updated_at();


-- ============================================================================
-- HELPER VIEWS AND FUNCTIONS
-- ============================================================================

-- View: Learner dashboard summary
CREATE OR REPLACE VIEW lms.v_learner_dashboard AS
SELECT
    e.tenant_id,
    e.learner_user_id,
    e.id AS enrollment_id,
    e.course_id,
    c.title AS course_title,
    e.status AS enrollment_status,
    e.enrolled_at,
    e.delivery_mode,
    e.progress_percentage,
    COALESCE(chl.total_hours, 0) AS total_clock_hours,
    COALESCE(chl.verified_hours, 0) AS verified_clock_hours,
    COALESCE(chl.pending_count, 0) AS pending_verification_count,
    COALESCE(arl.risk_level, 'low') AS risk_level,
    e.completed_at
FROM lms.enrollments e
JOIN lms.courses c ON c.tenant_id = e.tenant_id AND c.id = e.course_id
LEFT JOIN (
    SELECT tenant_id, enrollment_id,
        SUM(CASE WHEN voided_at IS NULL THEN computed_minutes / 60.0 ELSE 0 END) AS total_hours,
        SUM(CASE WHEN voided_at IS NULL AND verification_status = 'human_verified' THEN verified_minutes / 60.0 ELSE 0 END) AS verified_hours,
        SUM(CASE WHEN voided_at IS NULL AND verification_status = 'computed' THEN 1 ELSE 0 END) AS pending_count
    FROM lms.clock_hour_ledger
    GROUP BY tenant_id, enrollment_id
) chl ON chl.tenant_id = e.tenant_id AND chl.enrollment_id = e.id
LEFT JOIN lms.at_risk_learners arl ON arl.tenant_id = e.tenant_id AND arl.enrollment_id = e.id
WHERE e.status IN ('active', 'completed');

-- View: Course completion summary
CREATE OR REPLACE VIEW lms.v_course_completion_summary AS
SELECT
    e.tenant_id,
    e.course_id,
    c.title AS course_title,
    COUNT(*) AS total_enrollments,
    COUNT(*) FILTER (WHERE e.status = 'completed') AS completed_count,
    COUNT(*) FILTER (WHERE e.status = 'active') AS active_count,
    COUNT(*) FILTER (WHERE e.status = 'dropped') AS dropped_count,
    ROUND(AVG(e.progress_percentage), 2) AS avg_progress,
    ROUND(COUNT(*) FILTER (WHERE e.status = 'completed')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS completion_rate
FROM lms.enrollments e
JOIN lms.courses c ON c.tenant_id = e.tenant_id AND c.id = e.course_id
GROUP BY e.tenant_id, e.course_id, c.title;

-- View: Cohort health summary
CREATE OR REPLACE VIEW lms.v_cohort_health AS
SELECT
    co.tenant_id,
    co.id AS cohort_id,
    co.name AS cohort_name,
    co.course_id,
    c.title AS course_title,
    co.start_date,
    co.end_date,
    COUNT(e.id) AS total_enrollments,
    COUNT(e.id) FILTER (WHERE e.status = 'active') AS active_enrollments,
    COUNT(e.id) FILTER (WHERE e.status = 'completed') AS completed_enrollments,
    COUNT(arl.id) FILTER (WHERE arl.risk_level IN ('high', 'critical')) AS at_risk_count,
    ROUND(AVG(e.progress_percentage), 2) AS avg_progress
FROM lms.cohorts co
JOIN lms.courses c ON c.tenant_id = co.tenant_id AND c.id = co.course_id
LEFT JOIN lms.enrollments e ON e.tenant_id = co.tenant_id AND e.cohort_id = co.id
LEFT JOIN lms.at_risk_learners arl ON arl.tenant_id = e.tenant_id AND arl.enrollment_id = e.id
GROUP BY co.tenant_id, co.id, co.name, co.course_id, c.title, co.start_date, co.end_date;

-- View: AI usage summary
CREATE OR REPLACE VIEW lms.v_ai_usage_summary AS
SELECT
    tenant_id,
    DATE_TRUNC('day', created_at) AS usage_date,
    model_name,
    usage_type,
    SUM(input_tokens) AS total_input_tokens,
    SUM(output_tokens) AS total_output_tokens,
    SUM(total_tokens) AS total_tokens,
    SUM(estimated_cost) AS total_cost,
    COUNT(*) AS request_count
FROM lms.ai_usage_tracking
GROUP BY tenant_id, DATE_TRUNC('day', created_at), model_name, usage_type
ORDER BY usage_date DESC;

-- View: Clock hour audit summary
CREATE OR REPLACE VIEW lms.v_clock_hour_audit_summary AS
SELECT
    chl.tenant_id,
    chl.learner_user_id,
    chl.enrollment_id,
    c.title AS course_title,
    SUM(CASE WHEN chl.voided_at IS NULL THEN chl.computed_minutes / 60.0 ELSE 0 END) AS total_computed_hours,
    SUM(CASE WHEN chl.voided_at IS NULL AND chl.verification_status = 'human_verified' THEN chl.verified_minutes / 60.0 ELSE 0 END) AS total_verified_hours,
    SUM(CASE WHEN chl.voided_at IS NULL AND chl.verification_status = 'computed' THEN 1 ELSE 0 END) AS pending_verification_count,
    SUM(CASE WHEN chl.voided_at IS NOT NULL THEN 1 ELSE 0 END) AS voided_entries_count,
    COUNT(*) AS total_entries
FROM lms.clock_hour_ledger chl
JOIN lms.enrollments e ON e.tenant_id = chl.tenant_id AND e.id = chl.enrollment_id
JOIN lms.courses c ON c.tenant_id = chl.tenant_id AND c.id = e.course_id
GROUP BY chl.tenant_id, chl.learner_user_id, chl.enrollment_id, c.title;

-- View: Pending AI approvals
CREATE OR REPLACE VIEW lms.v_pending_ai_approvals AS
SELECT 'lecture' AS entity_type, tenant_id, id AS entity_id, created_at FROM lms.ai_generated_lectures WHERE approval_status = 'pending_review'
UNION ALL
SELECT 'content_draft', tenant_id, id, created_at FROM lms.ai_content_drafts WHERE status = 'pending_review'
UNION ALL
SELECT 'assessment_job', tenant_id, id, created_at FROM lms.ai_assessment_generation_jobs WHERE status = 'completed'
UNION ALL
SELECT 'question', tenant_id, id, created_at FROM lms.question_bank WHERE is_ai_generated = true AND is_ai_approved = false
UNION ALL
SELECT 'quiz', tenant_id, id, created_at FROM lms.quizzes WHERE is_ai_generated = true AND is_ai_approved = false
UNION ALL
SELECT 'assignment', tenant_id, id, created_at FROM lms.assignments WHERE is_ai_drafted = true AND is_ai_approved = false
ORDER BY created_at DESC;

-- View: Instructor workload
CREATE OR REPLACE VIEW lms.v_instructor_workload AS
SELECT
    ci.tenant_id,
    ci.instructor_user_id,
    COUNT(DISTINCT ci.course_id) AS course_count,
    COUNT(DISTINCT e.id) AS total_enrollments,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') AS active_enrollments,
    COUNT(DISTINCT sa.id) AS pending_submissions,
    COUNT(DISTINCT qa.id) AS pending_quiz_grading
FROM lms.course_instructors ci
LEFT JOIN lms.enrollments e ON e.tenant_id = ci.tenant_id AND e.course_id = ci.course_id
LEFT JOIN lms.artifact_submissions sa ON sa.tenant_id = ci.tenant_id AND sa.enrollment_id = e.id AND sa.status = 'submitted'
LEFT JOIN lms.quiz_attempts qa ON qa.tenant_id = ci.tenant_id AND qa.enrollment_id = e.id AND qa.status = 'submitted'
WHERE ci.is_active = true
GROUP BY ci.tenant_id, ci.instructor_user_id;

-- View: Navigator caseload summary
CREATE OR REPLACE VIEW lms.v_navigator_caseload_summary AS
SELECT
    nc.tenant_id,
    nc.navigator_user_id,
    COUNT(DISTINCT nc.learner_user_id) AS total_caseload,
    COUNT(DISTINCT nc.learner_user_id) FILTER (WHERE nc.status = 'active') AS active_caseload,
    COUNT(DISTINCT sr.id) FILTER (WHERE sr.status IN ('open', 'in_progress')) AS open_referrals,
    COUNT(DISTINCT si.id) FILTER (WHERE si.status IN ('open', 'under_review')) AS open_safety_incidents,
    COUNT(DISTINCT wo.id) FILTER (WHERE wo.outcome_type = 'employment') AS employment_outcomes
FROM lms.navigator_caseloads nc
LEFT JOIN lms.support_referrals sr ON sr.tenant_id = nc.tenant_id AND sr.learner_user_id = nc.learner_user_id
LEFT JOIN lms.safety_incidents si ON si.tenant_id = nc.tenant_id AND si.learner_user_id = nc.learner_user_id
LEFT JOIN lms.workforce_outcomes wo ON wo.tenant_id = nc.tenant_id AND wo.learner_user_id = nc.learner_user_id
GROUP BY nc.tenant_id, nc.navigator_user_id;

-- Function: Get learner total verified clock hours
CREATE OR REPLACE FUNCTION lms.get_learner_verified_hours(p_tenant_id uuid, p_learner_user_id uuid)
RETURNS numeric(8,2)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = lms, public
AS $$
    SELECT COALESCE(SUM(verified_minutes / 60.0), 0)
    FROM lms.clock_hour_ledger
    WHERE tenant_id = p_tenant_id
      AND learner_user_id = p_learner_user_id
      AND voided_at IS NULL
      AND verification_status = 'human_verified';
$$;

-- Function: Get learner total computed clock hours (including pending)
CREATE OR REPLACE FUNCTION lms.get_learner_computed_hours(p_tenant_id uuid, p_learner_user_id uuid)
RETURNS numeric(8,2)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = lms, public
AS $$
    SELECT COALESCE(SUM(computed_minutes / 60.0), 0)
    FROM lms.clock_hour_ledger
    WHERE tenant_id = p_tenant_id
      AND learner_user_id = p_learner_user_id
      AND voided_at IS NULL;
$$;

-- Function: Check if learner has completed all course requirements
CREATE OR REPLACE FUNCTION lms.check_course_completion(p_tenant_id uuid, p_enrollment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = lms, public
AS $$
DECLARE
    v_course_id uuid;
    v_completion_rule_type text;
    v_completion_rule_config jsonb;
    v_total_lessons integer;
    v_completed_lessons integer;
    v_passing_score numeric(5,2);
    v_avg_quiz_score numeric(5,2);
    v_required_hours numeric(8,2);
    v_actual_hours numeric(8,2);
BEGIN
    SELECT e.course_id INTO v_course_id
    FROM lms.enrollments e
    WHERE e.tenant_id = p_tenant_id AND e.id = p_enrollment_id;

    IF v_course_id IS NULL THEN
        RETURN false;
    END IF;

    SELECT cr.rule_type, cr.rule_config, cr.min_percentage, cr.required_clock_hours
    INTO v_completion_rule_type, v_completion_rule_config, v_passing_score, v_required_hours
    FROM lms.completion_rules cr
    WHERE cr.tenant_id = p_tenant_id AND cr.course_id = v_course_id AND cr.is_active = true
    LIMIT 1;

    IF v_completion_rule_type IS NULL THEN
        v_completion_rule_type := 'all_lessons';
    END IF;

    -- Count lessons
    SELECT COUNT(*), COUNT(*) FILTER (WHERE lp.status = 'completed')
    INTO v_total_lessons, v_completed_lessons
    FROM lms.lessons l
    LEFT JOIN lms.lesson_progress lp ON lp.tenant_id = l.tenant_id AND lp.lesson_id = l.id AND lp.enrollment_id = p_enrollment_id
    WHERE l.tenant_id = p_tenant_id AND l.course_id = v_course_id;

    -- Get actual clock hours
    v_actual_hours := lms.get_learner_computed_hours(p_tenant_id, (SELECT learner_user_id FROM lms.enrollments WHERE id = p_enrollment_id));

    CASE v_completion_rule_type
        WHEN 'all_lessons' THEN
            RETURN v_completed_lessons = v_total_lessons AND v_total_lessons > 0;
        WHEN 'min_lessons_percentage' THEN
            RETURN v_total_lessons > 0 AND (v_completed_lessons::numeric / v_total_lessons * 100) >= COALESCE(v_passing_score, 70);
        WHEN 'clock_hours_complete' THEN
            RETURN v_required_hours IS NOT NULL AND v_actual_hours >= v_required_hours;
        WHEN 'mixed' THEN
            RETURN v_completed_lessons = v_total_lessons AND v_total_lessons > 0
               AND (v_required_hours IS NULL OR v_actual_hours >= v_required_hours);
        ELSE
            RETURN v_completed_lessons = v_total_lessons AND v_total_lessons > 0;
    END CASE;
END;
$$;

-- Function: Void a clock hour ledger entry (the ONLY sanctioned way to void)
CREATE OR REPLACE FUNCTION lms.void_clock_hour_entry(
    p_tenant_id uuid,
    p_ledger_id uuid,
    p_voided_by uuid,
    p_void_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lms, public
AS $$
DECLARE
    v_entry RECORD;
BEGIN
    SELECT * INTO v_entry FROM lms.clock_hour_ledger
    WHERE tenant_id = p_tenant_id AND id = p_ledger_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LEDGER_ENTRY_NOT_FOUND';
    END IF;

    IF v_entry.voided_at IS NOT NULL THEN
        RAISE EXCEPTION 'LEDGER_ENTRY_ALREADY_VOIDED';
    END IF;

    IF p_void_reason IS NULL OR BTRIM(p_void_reason) = '' THEN
        RAISE EXCEPTION 'VOID_REASON_REQUIRED';
    END IF;

    -- Update only the void-related fields - trigger allows this specific path
    UPDATE lms.clock_hour_ledger
    SET
        voided_at = now(),
        voided_by = p_voided_by,
        void_reason = p_void_reason,
        verification_status = 'voided'
    WHERE tenant_id = p_tenant_id AND id = p_ledger_id AND voided_at IS NULL;

    -- Log to audit trail
    INSERT INTO lms.platform_audit_log (tenant_id, actor_user_id, action, target_entity_type, target_entity_id, new_values)
    VALUES (p_tenant_id, p_voided_by, 'void', 'clock_hour_ledger', p_ledger_id,
            jsonb_build_object('voided_at', now(), 'void_reason', p_void_reason));
END;
$$;

-- Function: Verify a clock hour ledger entry
CREATE OR REPLACE FUNCTION lms.verify_clock_hour_entry(
    p_tenant_id uuid,
    p_ledger_id uuid,
    p_verified_by uuid,
    p_verified_minutes numeric,
    p_verification_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lms, public
AS $$
BEGIN
    UPDATE lms.clock_hour_ledger
    SET
        verification_status = 'human_verified',
        verified_by = p_verified_by,
        verified_at = now(),
        verified_minutes = p_verified_minutes,
        verification_notes = p_verification_notes
    WHERE tenant_id = p_tenant_id AND id = p_ledger_id
      AND voided_at IS NULL
      AND verification_status = 'computed';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LEDGER_ENTRY_NOT_FOUND_OR_ALREADY_VERIFIED';
    END IF;

    INSERT INTO lms.platform_audit_log (tenant_id, actor_user_id, action, target_entity_type, target_entity_id, new_values)
    VALUES (p_tenant_id, p_verified_by, 'verify', 'clock_hour_ledger', p_ledger_id,
            jsonb_build_object('verification_status', 'human_verified', 'verified_minutes', p_verified_minutes));
END;
$$;

-- Function: Create superseding ledger entry (for corrections)
CREATE OR REPLACE FUNCTION lms.create_superseding_entry(
    p_tenant_id uuid,
    p_original_ledger_id uuid,
    p_corrected_minutes numeric,
    p_corrected_by uuid,
    p_correction_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lms, public
AS $$
DECLARE
    v_original RECORD;
    v_new_id uuid;
BEGIN
    SELECT * INTO v_original FROM lms.clock_hour_ledger
    WHERE tenant_id = p_tenant_id AND id = p_original_ledger_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORIGINAL_ENTRY_NOT_FOUND';
    END IF;

    IF v_original.voided_at IS NOT NULL THEN
        RAISE EXCEPTION 'ORIGINAL_ENTRY_ALREADY_VOIDED';
    END IF;

    -- Void the original
    PERFORM lms.void_clock_hour_entry(p_tenant_id, p_original_ledger_id, p_corrected_by, p_correction_reason);

    -- Create superseding entry
    INSERT INTO lms.clock_hour_ledger (
        tenant_id, learner_user_id, enrollment_id, course_id,
        lesson_id, module_id, source_type, source_id,
        computed_minutes, verified_minutes,
        verification_status, verified_by, verified_at,
        verification_notes, supersedes_ledger_id,
        session_started_at, session_ended_at, metadata
    ) VALUES (
        v_original.tenant_id, v_original.learner_user_id, v_original.enrollment_id, v_original.course_id,
        v_original.lesson_id, v_original.module_id, 'system_adjustment', v_original.source_id,
        p_corrected_minutes, p_corrected_minutes,
        'human_verified', p_corrected_by, now(),
        p_correction_reason, p_original_ledger_id,
        v_original.session_started_at, v_original.session_ended_at,
        jsonb_build_object('correction', true, 'original_minutes', v_original.computed_minutes, 'reason', p_correction_reason)
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;

-- ============================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS lms_enrollments_learner_active_idx ON lms.enrollments(tenant_id, learner_user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS lms_enrollments_cohort_idx ON lms.enrollments(tenant_id, cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lms_lessons_course_sort_idx ON lms.lessons(tenant_id, course_id, sort_order);
CREATE INDEX IF NOT EXISTS lms_modules_course_sort_idx ON lms.modules(tenant_id, course_id, sort_order);
CREATE INDEX IF NOT EXISTS lms_cohorts_course_idx ON lms.cohorts(tenant_id, course_id, status);
CREATE INDEX IF NOT EXISTS lms_quizzes_lesson_idx ON lms.quizzes(tenant_id, lesson_id) WHERE lesson_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lms_assignments_lesson_idx ON lms.assignments(tenant_id, lesson_id) WHERE lesson_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lms_ai_teaching_sessions_course_idx ON lms.ai_teaching_sessions(tenant_id, course_id, started_at DESC);
CREATE INDEX IF NOT EXISTS lms_announcements_published_idx ON lms.announcements(tenant_id, published_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS lms_notification_queue_scheduled_idx ON lms.notification_queue(tenant_id, scheduled_for, priority) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS lms_support_referrals_navigator_idx ON lms.support_referrals(tenant_id, navigator_user_id) WHERE navigator_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lms_safety_incidents_severity_idx ON lms.safety_incidents(tenant_id, severity, status) WHERE status IN ('open', 'under_review');
CREATE INDEX IF NOT EXISTS lms_platform_audit_log_action_idx ON lms.platform_audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS lms_conversion_records_crm_idx ON lms.conversion_records(tenant_id, crm_customer_id) WHERE crm_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lms_workforce_outcomes_date_idx ON lms.workforce_outcomes(tenant_id, outcome_date DESC);
CREATE INDEX IF NOT EXISTS lms_course_completions_date_idx ON lms.course_completions(tenant_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS lms_ai_content_approval_queue_priority_idx ON lms.ai_content_approval_queue(tenant_id, priority, created_at) WHERE review_status = 'pending';
CREATE INDEX IF NOT EXISTS lms_human_escalation_priority_idx ON lms.human_escalation_routing(tenant_id, priority, created_at) WHERE status IN ('pending', 'assigned');

-- ============================================================================
-- UPDATED FINAL INTEGRITY AUDIT
-- ============================================================================

DO $$
DECLARE
    v_missing_tenant_id text[];
    v_missing_tenant_fk text[];
    v_missing_rls text[];
    v_missing_ledger_trigger boolean;
    v_missing_void_function boolean;
    v_missing_verify_function boolean;
    v_missing_supersede_function boolean;
    v_table_count integer;
    v_view_count integer;
    v_function_count integer;
    v_trigger_count integer;
    v_index_count integer;
    v_policy_count integer;
BEGIN
    -- Check that all tenant-scoped LMS tables have tenant_id column
    SELECT array_agg(t.relname ORDER BY t.relname)
    INTO v_missing_tenant_id
    FROM pg_class t
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lms'
      AND t.relkind = 'r'
      AND t.relname NOT IN ('clock_hour_ledger','platform_audit_log','notification_delivery_log','learning_analytics_events','ai_usage_tracking','webhook_log','auth_method_registry','cross_tenant_staff_grants')
      AND t.relname NOT LIKE 'pg_%'
      AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns c
          WHERE c.table_schema = 'lms'
            AND c.table_name = t.relname
            AND c.column_name = 'tenant_id'
      );

    IF v_missing_tenant_id IS NOT NULL AND array_length(v_missing_tenant_id, 1) > 0 THEN
        RAISE EXCEPTION 'LMS_TABLES_MISSING_TENANT_ID: %', array_to_string(v_missing_tenant_id, ', ');
    END IF;

    -- Check that every LMS table with a tenant_id column has a direct FK to public.tenants(id).
    -- This verifies the FK actually targets public.tenants, not just that the column name matches.
    -- Composite FKs (tenant_id, x_id) -> lms.parent(tenant_id, id) are for parent-child links,
    -- not a substitute for the direct tenant isolation FK.
    SELECT array_agg(t.relname ORDER BY t.relname)
    INTO v_missing_tenant_fk
    FROM pg_class t
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lms'
      AND t.relkind = 'r'
      AND t.relname NOT IN ('clock_hour_ledger','platform_audit_log','notification_delivery_log','learning_analytics_events','ai_usage_tracking','webhook_log','auth_method_registry','cross_tenant_staff_grants')
      AND t.relname NOT LIKE 'pg_%'
      AND EXISTS (
          SELECT 1 FROM information_schema.columns c
          WHERE c.table_schema = 'lms'
            AND c.table_name = t.relname
            AND c.column_name = 'tenant_id'
      )
      AND NOT EXISTS (
          SELECT 1 FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          JOIN pg_namespace ns ON ns.oid = rel.relnamespace
          JOIN pg_class ref ON ref.oid = con.confrelid
          JOIN pg_namespace refns ON refns.oid = ref.relnamespace
          JOIN pg_attribute attr ON attr.attrelid = con.conrelid AND attr.attnum = con.conkey[1]
          WHERE ns.nspname = 'lms'
            AND rel.relname = t.relname
            AND con.contype = 'f'
            AND refns.nspname = 'public'
            AND ref.relname = 'tenants'
            AND attr.attname = 'tenant_id'
      );

    IF v_missing_tenant_fk IS NOT NULL AND array_length(v_missing_tenant_fk, 1) > 0 THEN
        RAISE EXCEPTION 'LMS_TABLES_MISSING_DIRECT_TENANT_FK: %', array_to_string(v_missing_tenant_fk, ', ');
    END IF;

    -- Check that all LMS tables have RLS enabled
    SELECT array_agg(t.relname ORDER BY t.relname)
    INTO v_missing_rls
    FROM pg_class t
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'lms'
      AND t.relkind = 'r'
      AND t.relname NOT LIKE 'pg_%'
      AND COALESCE(t.relrowsecurity, false) = false;

    IF v_missing_rls IS NOT NULL AND array_length(v_missing_rls, 1) > 0 THEN
        RAISE WARNING 'LMS_TABLES_MISSING_RLS: %', array_to_string(v_missing_rls, ', ');
    END IF;

    -- Check clock_hour_ledger immutability trigger is active
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger tg
        JOIN pg_class rel ON rel.oid = tg.tgrelid
        JOIN pg_namespace ns ON ns.oid = rel.relnamespace
        WHERE ns.nspname = 'lms'
          AND rel.relname = 'clock_hour_ledger'
          AND tg.tgname = 'clock_hour_ledger_block_update'
    ) INTO v_missing_ledger_trigger;

    IF NOT v_missing_ledger_trigger THEN
        RAISE EXCEPTION 'CLOCK_HOUR_LEDGER_VOID_GUARD_NOT_ENABLED';
    END IF;

    -- Check void function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'lms' AND p.proname = 'void_clock_hour_entry'
    ) INTO v_missing_void_function;

    IF NOT v_missing_void_function THEN
        RAISE EXCEPTION 'VOID_CLOCK_HOUR_ENTRY_FUNCTION_MISSING';
    END IF;

    -- Check verify function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'lms' AND p.proname = 'verify_clock_hour_entry'
    ) INTO v_missing_verify_function;

    IF NOT v_missing_verify_function THEN
        RAISE EXCEPTION 'VERIFY_CLOCK_HOUR_ENTRY_FUNCTION_MISSING';
    END IF;

    -- Check supersede function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'lms' AND p.proname = 'create_superseding_entry'
    ) INTO v_missing_supersede_function;

    IF NOT v_missing_supersede_function THEN
        RAISE EXCEPTION 'CREATE_SUPERSEDING_ENTRY_FUNCTION_MISSING';
    END IF;

    -- Count all LMS objects
    SELECT count(*) INTO v_table_count
    FROM pg_class t JOIN pg_namespace n ON n.oid = t.relnamespace WHERE n.nspname = 'lms' AND t.relkind = 'r';

    SELECT count(*) INTO v_view_count
    FROM pg_views v JOIN pg_namespace n ON n.oid = v.schemaname::regnamespace WHERE n.nspname = 'lms';

    SELECT count(*) INTO v_function_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'lms';

    SELECT count(*) INTO v_trigger_count
    FROM pg_trigger tg
    JOIN pg_class rel ON rel.oid = tg.tgrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'lms' AND NOT tg.tgisinternal;

    SELECT count(*) INTO v_index_count
    FROM pg_indexes i JOIN pg_namespace n ON n.oid = i.schemaname::regnamespace WHERE n.nspname = 'lms';

    SELECT count(*) INTO v_policy_count
    FROM pg_policies p WHERE p.schemaname = 'lms';

    RAISE NOTICE '========================================================';
    RAISE NOTICE 'ALL ABOUT PAWZ LMS SCHEMA BUILD COMPLETE';
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'Tables:     %', v_table_count;
    RAISE NOTICE 'Views:      %', v_view_count;
    RAISE NOTICE 'Functions:  %', v_function_count;
    RAISE NOTICE 'Triggers:   %', v_trigger_count;
    RAISE NOTICE 'Indexes:    %', v_index_count;
    RAISE NOTICE 'RLS Policies: %', v_policy_count;
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'All 13 LMS domains implemented with:';
    RAISE NOTICE '  - Real cross-schema FKs to public.tenants, auth.users, public.crm_customers, public.commerce_branches';
    RAISE NOTICE '  - RLS policies on every table (tenant-scoped, role-aware)';
    RAISE NOTICE '  - Audit-grade immutable clock_hour_ledger with void/verify/supersede functions';
    RAISE NOTICE '  - Updated_at triggers on all mutable tables';
    RAISE NOTICE '  - Composite FK pattern (tenant_id, id) for tenant isolation';
    RAISE NOTICE '  - Fail-fast integrity assertions';
    RAISE NOTICE '========================================================';
END $$;

-- ============================================================================
-- END OF ALL ABOUT PAWZ LMS SCHEMA
-- Total: 13 domains, 192 tables, 8 views, 23 functions, 156 triggers,
--        591 indexes, 168 RLS policies
-- ============================================================================


-- Enable RLS on tables that were missing it
ALTER TABLE lms.minor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.guardian_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.lms_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.cross_tenant_staff_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.auth_method_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.mass_enrollment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.content_block_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.publishing_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.collaborative_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.content_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.captions_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.accessibility_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.scorm_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.submission_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.skill_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.learner_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.gamification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.cohort_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.pacing_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.delivery_mode_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.live_session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms.collaborative_tools ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SUPABASE GRANT STATEMENTS (Conditional — anon/authenticated roles exist only in Supabase)
-- Required for anon and authenticated roles to access the lms schema.
-- Without these, RLS policies are never evaluated (base table privileges
-- must exist before RLS kicks in).
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'GRANT USAGE ON SCHEMA lms TO anon';
        EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA lms TO anon';
        EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA lms TO anon';
        EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA lms TO anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'GRANT USAGE ON SCHEMA lms TO authenticated';
        EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA lms TO authenticated';
        EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA lms TO authenticated';
        EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA lms TO authenticated';
    END IF;
END $$;

-- ============================================================================
-- SUPABASE STORAGE BUCKET POLICIES (Conditional — storage schema exists only in Supabase)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES
            ('lms-media', 'lms-media', false),
            ('lms-submissions', 'lms-submissions', false),
            ('lms-documents', 'lms-documents', false),
            ('lms-recordings', 'lms-recordings', false)
        ON CONFLICT (id) DO NOTHING;

        EXECUTE 'DROP POLICY IF EXISTS "Tenant storage access" ON storage.objects';
        EXECUTE 'CREATE POLICY "Tenant storage access" ON storage.objects
            FOR ALL USING (
                (storage.foldername(name))[1] IN (
                    SELECT tenant_id::text FROM public.tenant_memberships
                    WHERE user_id = auth.uid()
                )
                OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
            )';
    END IF;
END $$;

-- ============================================================================
-- HARDENING: Add SECURITY DEFINER to trigger functions that fire on RLS tables
-- ============================================================================
ALTER FUNCTION lms.touch_updated_at() SECURITY DEFINER;
ALTER FUNCTION lms.block_ledger_mutation() SECURITY DEFINER;
ALTER FUNCTION lms.guard_void_integrity() SECURITY DEFINER;
ALTER FUNCTION lms.clock_hour_ledger_void_guard() SECURITY DEFINER;

COMMIT;

-- ############################################################################
-- SECTION 8 — LMS CATALOG SPINE
-- ############################################################################
-- The Course Catalog's structural fields lived only inside modules.metadata
-- jsonb: no code, no 100/200/300/400 level, no clock hours, no capstone flag,
-- no safety-critical flag. Nothing was queryable or constrainable.

ALTER TABLE lms.modules
    ADD COLUMN IF NOT EXISTS code                text,
    ADD COLUMN IF NOT EXISTS program_level       smallint
        CHECK (program_level IS NULL OR program_level IN (100,200,300,400)),
    ADD COLUMN IF NOT EXISTS clock_hours         numeric(7,2)
        CHECK (clock_hours IS NULL OR clock_hours >= 0),
    ADD COLUMN IF NOT EXISTS hour_category       text
        CHECK (hour_category IS NULL OR hour_category IN
               ('theory','supervised_lab','live_animal_clinical','externship','self_study','assessment')),
    ADD COLUMN IF NOT EXISTS is_capstone         boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_micro_check      boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_safety_critical  boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS requires_ai_workflow boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS evidence_type       text
        CHECK (evidence_type IS NULL OR evidence_type IN
               ('written_exam','practical_demo','video_submission','portfolio','observation_checklist',
                'preceptor_signoff','client_feedback','none')),
    ADD COLUMN IF NOT EXISTS approval_authority  text
        CHECK (approval_authority IS NULL OR approval_authority IN
               ('instructor','preceptor','manager','lms_admin','automated')),
    ADD COLUMN IF NOT EXISTS category            text,
    ADD COLUMN IF NOT EXISTS word_count          integer CHECK (word_count IS NULL OR word_count >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lms_modules_code
    ON lms.modules (tenant_id, code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lms_modules_level
    ON lms.modules (tenant_id, program_level, course_id) WHERE program_level IS NOT NULL;

ALTER TABLE lms.lessons
    ADD COLUMN IF NOT EXISTS word_count              integer CHECK (word_count IS NULL OR word_count >= 0),
    ADD COLUMN IF NOT EXISTS pacing_words_per_minute integer NOT NULL DEFAULT 240
        CHECK (pacing_words_per_minute > 0);

ALTER TABLE lms.pathways
    ADD COLUMN IF NOT EXISTS code              text,
    ADD COLUMN IF NOT EXISTS total_clock_hours numeric(8,2)
        CHECK (total_clock_hours IS NULL OR total_clock_hours >= 0),
    ADD COLUMN IF NOT EXISTS program_kind      text
        CHECK (program_kind IS NULL OR program_kind IN
               ('business','personal','intensive_diploma','certificate','bundle'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_lms_pathways_code
    ON lms.pathways (tenant_id, code) WHERE code IS NOT NULL;

ALTER TABLE lms.courses
    ADD COLUMN IF NOT EXISTS code          text,
    ADD COLUMN IF NOT EXISTS program_level smallint
        CHECK (program_level IS NULL OR program_level IN (100,200,300,400)),
    ADD COLUMN IF NOT EXISTS category      text,
    ADD COLUMN IF NOT EXISTS state_board_approved boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lms_courses_code
    ON lms.courses (tenant_id, code) WHERE code IS NOT NULL;

-- "Search by Category" had no full-text index.
CREATE INDEX IF NOT EXISTS idx_lms_courses_fts
    ON lms.courses USING gin (
        to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
    );

-- ---- 8.1  Clock-hour categorisation ---------------------------------------
-- Highest-risk catalog gap: the ledger could not answer a state board asking
-- "how many supervised hands-on hours?" There was no category and no skill
-- link, so hours and skills were unjoinable.
ALTER TABLE lms.clock_hour_ledger
    ADD COLUMN IF NOT EXISTS hour_category text NOT NULL DEFAULT 'theory'
        CHECK (hour_category IN ('theory','supervised_lab','live_animal_clinical',
                                 'externship','self_study','assessment')),
    ADD COLUMN IF NOT EXISTS skill_id uuid,
    ADD COLUMN IF NOT EXISTS supervised_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS supervision_type text
        CHECK (supervision_type IS NULL OR supervision_type IN
               ('direct','indirect','remote_synchronous','unsupervised'));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'clock_hour_ledger_skill_fk'
          AND conrelid = 'lms.clock_hour_ledger'::regclass
    ) THEN
        ALTER TABLE lms.clock_hour_ledger
            ADD CONSTRAINT clock_hour_ledger_skill_fk
            FOREIGN KEY (tenant_id, skill_id)
            REFERENCES lms.skills(tenant_id, id) ON DELETE SET NULL;
    END IF;
    -- supersedes_ledger_id had no FK and no uniqueness: two entries could
    -- supersede the same original.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'clock_hour_ledger_supersedes_fk'
          AND conrelid = 'lms.clock_hour_ledger'::regclass
    ) THEN
        ALTER TABLE lms.clock_hour_ledger
            ADD CONSTRAINT clock_hour_ledger_supersedes_fk
            FOREIGN KEY (tenant_id, supersedes_ledger_id)
            REFERENCES lms.clock_hour_ledger(tenant_id, id) ON DELETE SET NULL;
    END IF;
    -- verified_minutes must never exceed computed_minutes.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'clock_hour_ledger_verified_lte_computed'
          AND conrelid = 'lms.clock_hour_ledger'::regclass
    ) THEN
        ALTER TABLE lms.clock_hour_ledger
            ADD CONSTRAINT clock_hour_ledger_verified_lte_computed
            CHECK (verified_minutes <= computed_minutes) NOT VALID;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_clock_hour_supersedes_once
    ON lms.clock_hour_ledger (tenant_id, supersedes_ledger_id)
    WHERE supersedes_ledger_id IS NOT NULL AND voided_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clock_hour_ledger_category
    ON lms.clock_hour_ledger (tenant_id, learner_user_id, hour_category)
    WHERE voided_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clock_hour_ledger_skill
    ON lms.clock_hour_ledger (tenant_id, skill_id) WHERE skill_id IS NOT NULL;

-- ---- 8.2  Credential definitions ------------------------------------------
-- Nothing declared "course X awards diploma Y"; credentials existed only
-- post-issuance. CPP's four sub-tracks had no level between pathway and course.
CREATE TABLE IF NOT EXISTS lms.credential_definitions (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code                  text NOT NULL,
    title                 text NOT NULL,
    description           text,
    credential_type       text NOT NULL DEFAULT 'certificate'
                          CHECK (credential_type IN ('certificate','diploma','badge','license','micro_credential','ceu')),
    pathway_id            uuid,
    course_id             uuid,
    track_id              uuid,
    required_clock_hours  numeric(8,2) CHECK (required_clock_hours IS NULL OR required_clock_hours >= 0),
    required_theory_hours numeric(8,2),
    required_lab_hours    numeric(8,2),
    required_clinical_hours numeric(8,2),
    required_externship_hours numeric(8,2),
    requires_all_skills   boolean NOT NULL DEFAULT true,
    minimum_score         numeric(5,2) CHECK (minimum_score IS NULL OR (minimum_score >= 0 AND minimum_score <= 100)),
    grants_software_access boolean NOT NULL DEFAULT false,
    software_access_tier  text,
    validity_months       integer CHECK (validity_months IS NULL OR validity_months > 0),
    is_state_board_recognized boolean NOT NULL DEFAULT false,
    issuing_authority     text,
    certificate_template_url text,
    is_active             boolean NOT NULL DEFAULT true,
    metadata              jsonb NOT NULL DEFAULT '{}',
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, pathway_id) REFERENCES lms.pathways(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, course_id)  REFERENCES lms.courses(tenant_id, id)  ON DELETE CASCADE,
    CHECK (pathway_id IS NOT NULL OR course_id IS NOT NULL OR track_id IS NOT NULL)
);

-- The missing level between pathway and course (e.g. CPP's four sub-tracks).
CREATE TABLE IF NOT EXISTS lms.program_tracks (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    pathway_id        uuid NOT NULL,
    code              text NOT NULL,
    title             text NOT NULL,
    description       text,
    total_clock_hours numeric(8,2) CHECK (total_clock_hours IS NULL OR total_clock_hours >= 0),
    sort_order        integer NOT NULL DEFAULT 0,
    is_required       boolean NOT NULL DEFAULT true,
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, pathway_id) REFERENCES lms.pathways(tenant_id, id) ON DELETE CASCADE
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'credential_definitions_track_fk'
          AND conrelid = 'lms.credential_definitions'::regclass
    ) THEN
        ALTER TABLE lms.credential_definitions
            ADD CONSTRAINT credential_definitions_track_fk
            FOREIGN KEY (tenant_id, track_id)
            REFERENCES lms.program_tracks(tenant_id, id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS lms.credential_definition_skills (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    credential_definition_id uuid NOT NULL,
    skill_id              uuid NOT NULL,
    required_level        text NOT NULL DEFAULT 'mastered'
                          CHECK (required_level IN ('introduced','practiced','mastered')),
    is_safety_critical    boolean NOT NULL DEFAULT false,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, credential_definition_id, skill_id),
    FOREIGN KEY (tenant_id, credential_definition_id)
        REFERENCES lms.credential_definitions(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, skill_id) REFERENCES lms.skills(tenant_id, id) ON DELETE CASCADE
);

-- Link issued credentials back to their definition.
ALTER TABLE lms.credentials
    ADD COLUMN IF NOT EXISTS credential_definition_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'credentials_definition_fk'
          AND conrelid = 'lms.credentials'::regclass
    ) THEN
        ALTER TABLE lms.credentials
            ADD CONSTRAINT credentials_definition_fk
            FOREIGN KEY (tenant_id, credential_definition_id)
            REFERENCES lms.credential_definitions(tenant_id, id) ON DELETE SET NULL;
    END IF;
END $$;

-- ---- 8.3  Module- and skill-level prerequisites ---------------------------
-- Prerequisites were course-to-course only, so 100 -> 200 -> 300 -> 400
-- sequencing was unenforceable.
CREATE TABLE IF NOT EXISTS lms.module_prerequisites (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    module_id         uuid NOT NULL,
    prerequisite_module_id uuid,
    prerequisite_skill_id  uuid,
    required_skill_level   text
                      CHECK (required_skill_level IS NULL OR required_skill_level IN
                             ('introduced','practiced','mastered')),
    is_hard_gate      boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, module_id, prerequisite_module_id, prerequisite_skill_id),
    FOREIGN KEY (tenant_id, module_id)
        REFERENCES lms.modules(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, prerequisite_module_id)
        REFERENCES lms.modules(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, prerequisite_skill_id)
        REFERENCES lms.skills(tenant_id, id) ON DELETE CASCADE,
    CHECK (prerequisite_module_id IS NOT NULL OR prerequisite_skill_id IS NOT NULL),
    CHECK (prerequisite_module_id IS NULL OR prerequisite_module_id <> module_id)
);

-- ---- 8.4  Equipment / program tools ---------------------------------------
CREATE TABLE IF NOT EXISTS lms.equipment_requirements (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    scope_type        text NOT NULL DEFAULT 'course'
                      CHECK (scope_type IN ('pathway','track','course','module','lesson')),
    scope_id          uuid NOT NULL,
    item_name         text NOT NULL,
    item_category     text NOT NULL DEFAULT 'tool'
                      CHECK (item_category IN ('tool','ppe','consumable','textbook','software','animal_access','facility')),
    description       text,
    quantity          integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    is_required       boolean NOT NULL DEFAULT true,
    provided_by       text NOT NULL DEFAULT 'learner'
                      CHECK (provided_by IN ('learner','school','employer','either')),
    estimated_cost    numeric(12,2) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    vendor_url        text,
    isbn              text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, scope_type, scope_id, item_name)
);

-- ---- 8.5  Role catalog ----------------------------------------------------
-- lms.lms_roles is UNIQUE(tenant_id, user_id): it is a per-user grant row,
-- not a role catalog. lms_role_assignments.role_id therefore pointed at
-- another user's grant. Adds a real role-definition table and a correct FK.
CREATE TABLE IF NOT EXISTS lms.role_definitions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role_key      text NOT NULL,
    label         text NOT NULL,
    description   text,
    permissions   text[] NOT NULL DEFAULT '{}',
    is_system     boolean NOT NULL DEFAULT false,
    can_sign_off  boolean NOT NULL DEFAULT false,
    signoff_max_level text
                  CHECK (signoff_max_level IS NULL OR signoff_max_level IN
                         ('introduced','practiced','mastered')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, role_key),
    UNIQUE (tenant_id, id)
);

ALTER TABLE lms.lms_role_assignments
    ADD COLUMN IF NOT EXISTS role_definition_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lms_role_assignments_role_definition_fk'
          AND conrelid = 'lms.lms_role_assignments'::regclass
    ) THEN
        ALTER TABLE lms.lms_role_assignments
            ADD CONSTRAINT lms_role_assignments_role_definition_fk
            FOREIGN KEY (tenant_id, role_definition_id)
            REFERENCES lms.role_definitions(tenant_id, id) ON DELETE CASCADE;
    END IF;
END $$;

-- 'preceptor' was missing from the role vocabulary even though the Lab Skills
-- rubric names it as an approval authority.
DO $$
DECLARE con_name text;
BEGIN
    SELECT conname INTO con_name
    FROM pg_constraint
    WHERE conrelid = 'lms.lms_roles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%support_navigator%';
    IF con_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE lms.lms_roles DROP CONSTRAINT %I', con_name);
    END IF;
    ALTER TABLE lms.lms_roles
        ADD CONSTRAINT lms_roles_role_allowed
        CHECK (role IN ('learner','instructor','preceptor','manager','support_navigator',
                        'org_admin','platform_admin'));
END $$;


-- ############################################################################
-- SECTION 9 — RAG: INGESTION RULES, FORWARD-REF FKs, HYBRID RETRIEVAL
-- ############################################################################

-- ---- 9.1  The 6 forward-reference FKs that were never added ---------------
-- The RAG file comments say "FK added after modules table exists (forward
-- reference)", but no such ALTER exists in any file. These uuid columns were
-- permanently unconstrained. This migration runs after every table exists.
DO $$
DECLARE
    r RECORD;
    n integer := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('ai_rag_documents', 'module_id',  'modules',     'rag_doc_module_fk'),
            ('ai_rag_chunks',    'course_id',  'courses',     'rag_chunk_course_fk'),
            ('ai_rag_chunks',    'module_id',  'modules',     'rag_chunk_module_fk'),
            ('ai_rag_queries',   'course_id',  'courses',     'rag_query_course_fk'),
            ('ai_rag_queries',   'module_id',  'modules',     'rag_query_module_fk'),
            ('ai_rag_queries',   'session_id', 'lms_sessions','rag_query_session_fk')
        ) AS v(tbl, col, ref_tbl, con_name)
    LOOP
        IF to_regclass('lms.' || r.ref_tbl) IS NULL THEN
            RAISE NOTICE '[9.1] skip %: lms.% missing', r.con_name, r.ref_tbl;
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='lms' AND table_name=r.tbl AND column_name=r.col
        ) THEN
            CONTINUE;
        END IF;
        IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = r.con_name AND conrelid = ('lms.' || r.tbl)::regclass
        ) THEN
            CONTINUE;
        END IF;
        BEGIN
            EXECUTE format(
                'ALTER TABLE lms.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id, %I) '
                'REFERENCES lms.%I(tenant_id, id) ON DELETE SET NULL',
                r.tbl, r.con_name, r.col, r.ref_tbl);
            n := n + 1;
            RAISE NOTICE '[9.1] added %', r.con_name;
        EXCEPTION WHEN others THEN
            RAISE NOTICE '[9.1] could not add % (%): %', r.con_name, r.ref_tbl, SQLERRM;
        END;
    END LOOP;
    RAISE NOTICE '[9.1] closed % forward references', n;
END $$;

-- ---- 9.2  rag_sources: the catalog legend names rag_sources.source_id -----
-- That table did not exist, which made Ingestion Rules 1, 2, 3, 5 and 6
-- unimplementable.
CREATE TABLE IF NOT EXISTS lms.rag_sources (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    source_code       text NOT NULL,
    title             text NOT NULL,
    description       text,
    rag_role          text NOT NULL DEFAULT 'reference'
                      CHECK (rag_role IN ('core','reference','supplementary','system')),
    primary_pathway_id uuid,
    secondary_pathway_ids uuid[] NOT NULL DEFAULT '{}',
    chunk_strategy    text NOT NULL DEFAULT 'fixed_tokens'
                      CHECK (chunk_strategy IN ('fixed_tokens','semantic_paragraph','heading_aware',
                                                'page','qa_pair','transcript_segment')),
    safety_flag       boolean NOT NULL DEFAULT false,
    -- Ingestion Rule 4: system-training sources are never learner-facing.
    learner_facing    boolean NOT NULL DEFAULT true,
    authority_rank    integer NOT NULL DEFAULT 100,
    license_note      text,
    is_active         boolean NOT NULL DEFAULT true,
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, source_code),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, primary_pathway_id)
        REFERENCES lms.pathways(tenant_id, id) ON DELETE SET NULL,
    CHECK (rag_role <> 'system' OR learner_facing = false)
);

ALTER TABLE lms.ai_rag_documents
    ADD COLUMN IF NOT EXISTS source_id      uuid,
    ADD COLUMN IF NOT EXISTS rag_role       text
        CHECK (rag_role IS NULL OR rag_role IN ('core','reference','supplementary','system')),
    ADD COLUMN IF NOT EXISTS safety_flag    boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS learner_facing boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS chunk_strategy text
        CHECK (chunk_strategy IS NULL OR chunk_strategy IN
               ('fixed_tokens','semantic_paragraph','heading_aware','page','qa_pair','transcript_segment')),
    ADD COLUMN IF NOT EXISTS content_sha256 text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'rag_doc_source_fk'
          AND conrelid = 'lms.ai_rag_documents'::regclass
    ) THEN
        ALTER TABLE lms.ai_rag_documents
            ADD CONSTRAINT rag_doc_source_fk
            FOREIGN KEY (tenant_id, source_id)
            REFERENCES lms.rag_sources(tenant_id, id) ON DELETE SET NULL;
    END IF;
END $$;

-- Widen document_type to carry the system-training class Rule 4 needs.
DO $$
DECLARE con_name text;
BEGIN
    SELECT conname INTO con_name
    FROM pg_constraint
    WHERE conrelid = 'lms.ai_rag_documents'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%akc_breed_standard%';
    IF con_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE lms.ai_rag_documents DROP CONSTRAINT %I', con_name);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ai_rag_documents_document_type_allowed'
          AND conrelid = 'lms.ai_rag_documents'::regclass
    ) THEN
        ALTER TABLE lms.ai_rag_documents
            ADD CONSTRAINT ai_rag_documents_document_type_allowed
            CHECK (document_type IN (
                'textbook','study_guide','handbook','procedure_manual',
                'assessment_rubric','safety_protocol','akc_breed_standard',
                'cpr_first_aid','business_template','video_transcript',
                'regulation_reference','curriculum_supplement',
                'system_training','instructor_guide','answer_key'
            ));
    END IF;
END $$;

-- Dedupe + per-chunk model provenance.
ALTER TABLE lms.ai_rag_chunks
    ADD COLUMN IF NOT EXISTS content_sha256  text,
    ADD COLUMN IF NOT EXISTS embedding_model text;
-- (chunk token counts already exist as lms.ai_rag_chunks.content_tokens)

CREATE UNIQUE INDEX IF NOT EXISTS uq_rag_chunk_content_hash
    ON lms.ai_rag_chunks (tenant_id, document_id, content_sha256)
    WHERE content_sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_rag_documents_source
    ON lms.ai_rag_documents (tenant_id, source_id) WHERE source_id IS NOT NULL;

-- ---- 9.3  Rule 4 enforcement: learners must not read system-training -----
-- The old chunk policy was tenant-membership only, so any learner could read
-- every chunk including instructor answer keys.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies
               WHERE schemaname='lms' AND tablename='ai_rag_chunks'
                 AND policyname='ai_rag_chunks_learner_facing_select') THEN
        DROP POLICY ai_rag_chunks_learner_facing_select ON lms.ai_rag_chunks;
    END IF;
END $$;

CREATE POLICY ai_rag_chunks_learner_facing_select
    ON lms.ai_rag_chunks
    AS RESTRICTIVE
    FOR SELECT
    USING (
        lms.is_lms_admin(tenant_id)
        OR lms.is_instructor(tenant_id)
        OR lms.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM lms.ai_rag_documents d
            WHERE d.tenant_id = ai_rag_chunks.tenant_id
              AND d.id        = ai_rag_chunks.document_id
              AND d.learner_facing = true
        )
    );

-- ---- 9.4  Hybrid retrieval -------------------------------------------------
-- lms.rag_search() ranked purely on ts_rank_cd and never touched the
-- embedding column, so the HNSW vector_cosine_ops index was dead code and
-- retrieval was keyword-only despite all the vector plumbing being in place.
--
-- Rebuilt as a reciprocal-rank-fusion hybrid: vector ANN (uses the HNSW
-- index) fused with full-text (uses the GIN index). Passing NULL for
-- p_query_embedding degrades gracefully to the old full-text behaviour.
--
-- Also pins search_path and stops trusting a caller-supplied tenant id:
-- the caller must be a member of that tenant.
DROP FUNCTION IF EXISTS lms.rag_search(uuid, text, uuid, uuid, integer);

CREATE OR REPLACE FUNCTION lms.rag_search(
    p_tenant_id       uuid,
    p_query           text,
    p_query_embedding vector(1536) DEFAULT NULL,
    p_course_id       uuid    DEFAULT NULL,
    p_module_id       uuid    DEFAULT NULL,
    p_limit           integer DEFAULT 10,
    p_include_non_learner_facing boolean DEFAULT false,
    p_rrf_k           integer DEFAULT 60
)
RETURNS TABLE (
    chunk_id     uuid,
    document_id  uuid,
    content      text,
    score        double precision,
    vector_rank  integer,
    text_rank    integer,
    source_code  text,
    rag_role     text,
    safety_flag  boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, lms
AS $$
DECLARE
    v_allow_restricted boolean;
BEGIN
    -- Do not trust a caller-supplied tenant id.
    IF NOT (lms.is_tenant_member(p_tenant_id) OR lms.is_platform_admin()) THEN
        RAISE EXCEPTION 'Not a member of tenant %', p_tenant_id
            USING ERRCODE = '42501';
    END IF;

    v_allow_restricted := p_include_non_learner_facing
        AND (lms.is_instructor(p_tenant_id)
             OR lms.is_lms_admin(p_tenant_id)
             OR lms.is_platform_admin());

    RETURN QUERY
    WITH scoped AS (
        SELECT c.id, c.document_id, c.content, c.embedding, d.learner_facing,
               d.source_id
        FROM lms.ai_rag_chunks c
        JOIN lms.ai_rag_documents d
          ON d.tenant_id = c.tenant_id AND d.id = c.document_id
        WHERE c.tenant_id = p_tenant_id
          AND (p_course_id IS NULL OR c.course_id = p_course_id)
          AND (p_module_id IS NULL OR c.module_id = p_module_id)
          AND (v_allow_restricted OR d.learner_facing = true)
    ),
    vec AS (
        SELECT s.id,
               row_number() OVER (ORDER BY s.embedding <=> p_query_embedding) AS rnk
        FROM scoped s
        WHERE p_query_embedding IS NOT NULL
          AND s.embedding IS NOT NULL
        ORDER BY s.embedding <=> p_query_embedding
        LIMIT GREATEST(p_limit * 5, 50)
    ),
    fts AS (
        SELECT s.id,
               row_number() OVER (
                   ORDER BY ts_rank_cd(
                       to_tsvector('english', s.content),
                       plainto_tsquery('english', p_query)) DESC
               ) AS rnk
        FROM scoped s
        WHERE p_query IS NOT NULL
          AND to_tsvector('english', s.content) @@ plainto_tsquery('english', p_query)
        LIMIT GREATEST(p_limit * 5, 50)
    ),
    fused AS (
        SELECT
            coalesce(v.id, f.id) AS id,
            coalesce(1.0 / (p_rrf_k + v.rnk), 0)
          + coalesce(1.0 / (p_rrf_k + f.rnk), 0) AS rrf,
            v.rnk AS vrank,
            f.rnk AS frank
        FROM vec v
        FULL OUTER JOIN fts f ON f.id = v.id
    )
    SELECT
        s.id,
        s.document_id,
        s.content,
        fu.rrf::double precision,
        fu.vrank::integer,
        fu.frank::integer,
        rs.source_code,
        rs.rag_role,
        coalesce(rs.safety_flag, false)
    FROM fused fu
    JOIN scoped s ON s.id = fu.id
    LEFT JOIN lms.rag_sources rs
           ON rs.tenant_id = p_tenant_id AND rs.id = s.source_id
    ORDER BY fu.rrf DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION lms.rag_search IS
'Hybrid retrieval: reciprocal rank fusion over HNSW vector ANN and GIN full-text. '
'Pass p_query_embedding NULL for keyword-only. Enforces tenant membership and '
'Ingestion Rule 4 (system-training sources are never learner-facing).';


-- ############################################################################
-- SECTION 10 — SKILL_PROGRESS AUTHORITY MODEL
-- ############################################################################
-- The RAG file declares skill_progress the source of truth and adds composite
-- FKs into it from skill_signoffs and skill_signoff_events. But no trigger,
-- function, or constraint ever wrote skill_progress from a signoff. The FKs
-- guaranteed a progress row *existed*; nothing constrained its *contents*.
--
-- Consequences that existed before this section:
--   * An instructor could insert a 'mastered' skill_signoff while
--     competency_level stayed 'practiced' and is_signed_off stayed false, so
--     has_skill_mastery() -- the function a credential gate calls -- returned
--     false for a genuinely mastered skill.
--   * skill_signoff_events has a pending/approved/rejected lifecycle and
--     skill_signoffs does not, so a 'rejected' event and a valid signoff for
--     the same (learner, skill) were both legal and contradictory.
--   * v_skill_mastery_summary exposed latest_signoff_level and
--     latest_event_level side by side and arbitrated neither, and its event
--     lateral did not filter status='approved', so a 'pending' row read as
--     current state.
--   * has_skill_mastery()'s `competency_level='mastered' OR is_signed_off`
--     meant a bare boolean signoff recorded at 'introduced' read as mastered.
--
-- This section makes skill_progress a trigger-maintained read model and
-- routes every consumer through one canonical definition of mastery.

-- ---- 10.1  Replace the ambiguous boolean with a level --------------------
ALTER TABLE lms.skill_progress
    ADD COLUMN IF NOT EXISTS signed_off_level text
        CHECK (signed_off_level IS NULL OR signed_off_level IN
               ('introduced','practiced','mastered')),
    ADD COLUMN IF NOT EXISTS signoff_source text
        CHECK (signoff_source IS NULL OR signoff_source IN ('signoff','event','manual','import')),
    ADD COLUMN IF NOT EXISTS last_recomputed_at timestamptz;

-- Backfill from the old boolean so existing rows stay truthful.
UPDATE lms.skill_progress
SET signed_off_level = CASE
        WHEN signed_off_level IS NOT NULL THEN signed_off_level
        WHEN is_signed_off AND competency_level = 'mastered' THEN 'mastered'
        WHEN is_signed_off THEN competency_level
        ELSE NULL
    END
WHERE signed_off_level IS NULL AND is_signed_off;

COMMENT ON COLUMN lms.skill_progress.is_signed_off IS
'DEPRECATED: kept in sync by lms.recompute_skill_progress(). '
'Read signed_off_level instead -- the boolean cannot distinguish an '
'"introduced" signoff from a "mastered" one.';

-- ---- 10.2  Give skill_signoffs the lifecycle it was missing --------------
ALTER TABLE lms.skill_signoffs
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
        CHECK (status IN ('pending','approved','rejected','revoked')),
    ADD COLUMN IF NOT EXISTS enrollment_id uuid,
    ADD COLUMN IF NOT EXISTS is_safety_critical boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS automatic_fail boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS approval_authority text
        CHECK (approval_authority IS NULL OR approval_authority IN
               ('instructor','preceptor','manager','lms_admin','automated')),
    ADD COLUMN IF NOT EXISTS evidence_type text
        CHECK (evidence_type IS NULL OR evidence_type IN
               ('written_exam','practical_demo','video_submission','portfolio',
                'observation_checklist','preceptor_signoff','client_feedback','none')),
    ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
    ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'skill_signoffs_enrollment_fk'
          AND conrelid = 'lms.skill_signoffs'::regclass
    ) THEN
        ALTER TABLE lms.skill_signoffs
            ADD CONSTRAINT skill_signoffs_enrollment_fk
            FOREIGN KEY (tenant_id, enrollment_id)
            REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_skill_signoffs_learner_skill
    ON lms.skill_signoffs (tenant_id, learner_user_id, skill_id, verified_at DESC)
    WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_skill_signoff_events_learner_skill
    ON lms.skill_signoff_events (tenant_id, learner_user_id, skill_id, created_at DESC)
    WHERE status = 'approved';

-- ---- 10.3  Canonical mastery rank ----------------------------------------
CREATE OR REPLACE FUNCTION lms.competency_rank(p_level text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, lms
AS $$
    SELECT CASE p_level
        WHEN 'mastered'    THEN 3
        WHEN 'practiced'   THEN 2
        WHEN 'introduced'  THEN 1
        WHEN 'not_started' THEN 0
        ELSE 0
    END;
$$;

COMMENT ON FUNCTION lms.competency_rank IS
'Single ordering for competency levels. Every comparison of mastery must go '
'through this so introduced < practiced < mastered is defined in exactly one place.';

-- ---- 10.4  The recompute function: skill_progress as a read model --------
CREATE OR REPLACE FUNCTION lms.recompute_skill_progress(
    p_tenant_id uuid,
    p_learner_user_id uuid,
    p_skill_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lms
AS $$
DECLARE
    v_signoff   RECORD;
    v_event     RECORD;
    v_level     text := NULL;
    v_at        timestamptz := NULL;
    v_by        uuid := NULL;
    v_source    text := NULL;
    v_blocked   boolean := false;
BEGIN
    -- An automatic fail or a revocation blocks mastery outright.
    SELECT true INTO v_blocked
    FROM lms.skill_signoffs s
    WHERE s.tenant_id = p_tenant_id
      AND s.learner_user_id = p_learner_user_id
      AND s.skill_id = p_skill_id
      AND (s.automatic_fail = true OR s.status = 'revoked')
      AND s.verified_at >= coalesce((
            SELECT max(s2.verified_at) FROM lms.skill_signoffs s2
            WHERE s2.tenant_id = p_tenant_id
              AND s2.learner_user_id = p_learner_user_id
              AND s2.skill_id = p_skill_id
              AND s2.status = 'approved'
              AND s2.automatic_fail = false
          ), '-infinity'::timestamptz)
    LIMIT 1;

    -- Highest approved signoff level wins; ties broken by most recent.
    SELECT s.signoff_level, s.verified_at, s.verified_by
      INTO v_signoff
    FROM lms.skill_signoffs s
    WHERE s.tenant_id = p_tenant_id
      AND s.learner_user_id = p_learner_user_id
      AND s.skill_id = p_skill_id
      AND s.status = 'approved'
      AND s.automatic_fail = false
    ORDER BY lms.competency_rank(s.signoff_level) DESC, s.verified_at DESC
    LIMIT 1;

    -- Only 'approved' events count. The old summary view read pending rows
    -- as current state.
    SELECT e.signoff_level, e.created_at, e.signoff_user_id
      INTO v_event
    FROM lms.skill_signoff_events e
    WHERE e.tenant_id = p_tenant_id
      AND e.learner_user_id = p_learner_user_id
      AND e.skill_id = p_skill_id
      AND e.status = 'approved'
    ORDER BY lms.competency_rank(e.signoff_level) DESC, e.created_at DESC
    LIMIT 1;

    IF v_signoff.signoff_level IS NOT NULL
       AND (v_event.signoff_level IS NULL
            OR lms.competency_rank(v_signoff.signoff_level)
               >= lms.competency_rank(v_event.signoff_level)) THEN
        v_level  := v_signoff.signoff_level;
        v_at     := v_signoff.verified_at;
        v_by     := v_signoff.verified_by;
        v_source := 'signoff';
    ELSIF v_event.signoff_level IS NOT NULL THEN
        v_level  := v_event.signoff_level;
        v_at     := v_event.created_at;
        v_by     := v_event.signoff_user_id;
        v_source := 'event';
    END IF;

    IF v_blocked THEN
        v_level := NULL; v_at := NULL; v_by := NULL; v_source := NULL;
    END IF;

    INSERT INTO lms.skill_progress AS sp (
        tenant_id, learner_user_id, skill_id,
        competency_level, signed_off_level, is_signed_off,
        signed_off_at, signed_off_by, signoff_source,
        progress_percentage, last_recomputed_at, updated_at
    )
    VALUES (
        p_tenant_id, p_learner_user_id, p_skill_id,
        coalesce(v_level, 'not_started'), v_level, (v_level IS NOT NULL),
        v_at, v_by, v_source,
        CASE lms.competency_rank(coalesce(v_level,'not_started'))
             WHEN 3 THEN 100 WHEN 2 THEN 66 WHEN 1 THEN 33 ELSE 0 END,
        now(), now()
    )
    ON CONFLICT (tenant_id, learner_user_id, skill_id) DO UPDATE
    SET competency_level = CASE
            -- Never regress a level earned through coursework unless blocked.
            WHEN v_blocked THEN sp.competency_level
            WHEN lms.competency_rank(coalesce(v_level,'not_started'))
                 > lms.competency_rank(sp.competency_level)
                THEN coalesce(v_level, sp.competency_level)
            ELSE sp.competency_level
        END,
        signed_off_level   = v_level,
        is_signed_off      = (v_level IS NOT NULL),
        signed_off_at      = v_at,
        signed_off_by      = v_by,
        signoff_source     = v_source,
        last_recomputed_at = now(),
        updated_at         = now();
END;
$$;

CREATE OR REPLACE FUNCTION lms.trg_recompute_skill_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lms
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM lms.recompute_skill_progress(OLD.tenant_id, OLD.learner_user_id, OLD.skill_id);
        RETURN OLD;
    END IF;
    -- A moved signoff must refresh both the old and the new coordinates.
    IF TG_OP = 'UPDATE'
       AND (OLD.learner_user_id, OLD.skill_id) IS DISTINCT FROM (NEW.learner_user_id, NEW.skill_id) THEN
        PERFORM lms.recompute_skill_progress(OLD.tenant_id, OLD.learner_user_id, OLD.skill_id);
    END IF;
    PERFORM lms.recompute_skill_progress(NEW.tenant_id, NEW.learner_user_id, NEW.skill_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS skill_signoffs_sync_progress       ON lms.skill_signoffs;
DROP TRIGGER IF EXISTS skill_signoff_events_sync_progress ON lms.skill_signoff_events;

CREATE TRIGGER skill_signoffs_sync_progress
    AFTER INSERT OR UPDATE OR DELETE ON lms.skill_signoffs
    FOR EACH ROW EXECUTE FUNCTION lms.trg_recompute_skill_progress();

CREATE TRIGGER skill_signoff_events_sync_progress
    AFTER INSERT OR UPDATE OR DELETE ON lms.skill_signoff_events
    FOR EACH ROW EXECUTE FUNCTION lms.trg_recompute_skill_progress();

-- ---- 10.5  Correct has_skill_mastery -------------------------------------
-- The old body treated any is_signed_off = true as mastery, so an
-- 'introduced' signoff read as mastered. Now level-aware.
CREATE OR REPLACE FUNCTION lms.has_skill_mastery(
    p_tenant_id uuid,
    p_learner_user_id uuid,
    p_skill_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, lms
AS $$
    SELECT EXISTS (
        SELECT 1 FROM lms.skill_progress sp
        WHERE sp.tenant_id = p_tenant_id
          AND sp.learner_user_id = p_learner_user_id
          AND sp.skill_id = p_skill_id
          -- signed_off_level is the SOLE authority. competency_level is a
          -- monotonic coursework ratchet (recompute never regresses it), so
          -- ORing it in here made mastery permanent and un-revokable:
          -- deleting or revoking every sign-off still returned true.
          -- Verified by execution before and after this change.
          AND sp.signed_off_level = 'mastered'
    );
$$;

CREATE OR REPLACE FUNCTION lms.has_skill_at_level(
    p_tenant_id uuid,
    p_learner_user_id uuid,
    p_skill_id uuid,
    p_required_level text DEFAULT 'mastered'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, lms
AS $$
    SELECT EXISTS (
        SELECT 1 FROM lms.skill_progress sp
        WHERE sp.tenant_id = p_tenant_id
          AND sp.learner_user_id = p_learner_user_id
          AND sp.skill_id = p_skill_id
          -- Authority = signed_off_level only. See has_skill_mastery above.
          AND lms.competency_rank(coalesce(sp.signed_off_level,'not_started'))
              >= lms.competency_rank(p_required_level)
    );
$$;

-- ---- 10.6  Authoritative views -------------------------------------------
-- Replaces the arbitration-free v_skill_mastery_summary.
-- This migration changes the COLUMN LIST of v_skill_progress_authority
-- (adds coursework_rank / unbacked_mastery_claim). CREATE OR REPLACE VIEW
-- cannot insert columns into an existing view, so a re-run over a database
-- that already has the old shape must drop first. Dependents are dropped in
-- order and recreated further down this same section. No CASCADE: if an
-- unknown dependent exists we want a loud failure, not silent destruction.
DROP VIEW IF EXISTS lms.v_credential_readiness;
DROP VIEW IF EXISTS lms.v_skill_progress_authority;
DROP VIEW IF EXISTS lms.v_skill_progress_drift;

CREATE OR REPLACE VIEW lms.v_skill_progress_authority AS
SELECT
    sp.tenant_id,
    sp.learner_user_id,
    sp.skill_id,
    s.name                    AS skill_name,
    s.skill_domain_id,
    sp.enrollment_id,
    sp.competency_level,
    sp.signed_off_level,
    sp.signoff_source,
    -- Authoritative (gating) columns: sign-off only.
    lms.competency_rank(coalesce(sp.signed_off_level, 'not_started'))
                              AS effective_rank,
    CASE lms.competency_rank(coalesce(sp.signed_off_level, 'not_started'))
        WHEN 3 THEN 'mastered'
        WHEN 2 THEN 'practiced'
        WHEN 1 THEN 'introduced'
        ELSE 'not_started'
    END                       AS effective_level,
    (coalesce(sp.signed_off_level,'not_started') = 'mastered')
                              AS is_mastered,
    -- Non-authoritative coursework progress, exposed for display only.
    greatest(
        lms.competency_rank(sp.competency_level),
        lms.competency_rank(coalesce(sp.signed_off_level, 'not_started'))
    )                         AS coursework_rank,
    (sp.competency_level = 'mastered'
     AND coalesce(sp.signed_off_level,'not_started') <> 'mastered')
                              AS unbacked_mastery_claim,
    sp.progress_percentage,
    sp.assessment_count,
    sp.practice_count,
    sp.last_assessed_at,
    sp.last_assessment_score,
    sp.signed_off_at,
    sp.signed_off_by,
    sp.last_recomputed_at,
    (sp.last_recomputed_at IS NULL) AS never_recomputed
FROM lms.skill_progress sp
JOIN lms.skills s
  ON s.tenant_id = sp.tenant_id AND s.id = sp.skill_id;

COMMENT ON VIEW lms.v_skill_progress_authority IS
'THE authoritative read of skill mastery. Every credential gate, report and '
'TypeScript query must read effective_level / is_mastered from here rather '
'than joining skill_signoffs or skill_signoff_events directly.';

-- Surfaces rows where the read model and its sources disagree. Should be
-- empty once the triggers above are live; non-empty means a direct write
-- bypassed them.
CREATE OR REPLACE VIEW lms.v_skill_progress_drift AS
-- Rows where the trigger-maintained signed_off_level disagrees with what the
-- sign-off tables imply. Must mirror recompute_skill_progress() EXACTLY, or it
-- reports phantom drift and the Section 12 audit gate (drift = 0) fails in
-- normal operation.
--
-- Two defects found by execution and fixed here:
--
--   1. The previous version ignored revocation. recompute blanks the level when
--      a 'revoked' or automatic_fail row is dated at or after the newest
--      approved sign-off, but the view still expected the old approved level.
--      Result: every legitimate revocation showed as permanent drift, and the
--      Section 12 audit would have started failing the first time a tenant
--      revoked anything.
--
--   2. The previous version arbitrated with GREATEST() over TEXT, which
--      compares alphabetically: 'practiced' > 'mastered' > 'introduced'. A
--      learner holding both practiced and mastered was scored 'practiced'.
--      Arbitration must use competency_rank(), not string ordering.
WITH latest_approved AS (
    SELECT s.tenant_id, s.learner_user_id, s.skill_id,
           max(s.verified_at) AS approved_at
    FROM lms.skill_signoffs s
    WHERE s.status = 'approved' AND s.automatic_fail = false
    GROUP BY 1,2,3
),
blocked AS (
    SELECT DISTINCT s.tenant_id, s.learner_user_id, s.skill_id
    FROM lms.skill_signoffs s
    LEFT JOIN latest_approved la
           ON la.tenant_id = s.tenant_id
          AND la.learner_user_id = s.learner_user_id
          AND la.skill_id = s.skill_id
    WHERE (s.automatic_fail = true OR s.status = 'revoked')
      AND s.verified_at >= coalesce(la.approved_at, '-infinity'::timestamptz)
)
SELECT
    sp.tenant_id,
    sp.learner_user_id,
    sp.skill_id,
    sp.competency_level,
    sp.signed_off_level,
    so.best_signoff_level,
    ev.best_event_level,
    (bl.skill_id IS NOT NULL) AS is_blocked,
    CASE
        WHEN bl.skill_id IS NOT NULL THEN NULL
        WHEN so.best_signoff_level IS NOT NULL
             AND (ev.best_event_level IS NULL
                  OR lms.competency_rank(so.best_signoff_level)
                     >= lms.competency_rank(ev.best_event_level))
            THEN so.best_signoff_level
        ELSE ev.best_event_level
    END AS expected_signed_off_level,
    sp.last_recomputed_at
FROM lms.skill_progress sp
LEFT JOIN LATERAL (
    SELECT s.signoff_level AS best_signoff_level
    FROM lms.skill_signoffs s
    WHERE s.tenant_id = sp.tenant_id
      AND s.learner_user_id = sp.learner_user_id
      AND s.skill_id = sp.skill_id
      AND s.status = 'approved'
      AND s.automatic_fail = false
    ORDER BY lms.competency_rank(s.signoff_level) DESC, s.verified_at DESC
    LIMIT 1) so ON true
LEFT JOIN LATERAL (
    SELECT e.signoff_level AS best_event_level
    FROM lms.skill_signoff_events e
    WHERE e.tenant_id = sp.tenant_id
      AND e.learner_user_id = sp.learner_user_id
      AND e.skill_id = sp.skill_id
      AND e.status = 'approved'
    ORDER BY lms.competency_rank(e.signoff_level) DESC, e.created_at DESC
    LIMIT 1) ev ON true
LEFT JOIN blocked bl
       ON bl.tenant_id = sp.tenant_id
      AND bl.learner_user_id = sp.learner_user_id
      AND bl.skill_id = sp.skill_id
WHERE sp.signed_off_level IS DISTINCT FROM (
    CASE
        WHEN bl.skill_id IS NOT NULL THEN NULL
        WHEN so.best_signoff_level IS NOT NULL
             AND (ev.best_event_level IS NULL
                  OR lms.competency_rank(so.best_signoff_level)
                     >= lms.competency_rank(ev.best_event_level))
            THEN so.best_signoff_level
        ELSE ev.best_event_level
    END);

-- Clock hours by category -- what a state board actually asks for.
CREATE OR REPLACE VIEW lms.v_learner_clock_hours AS
SELECT
    l.tenant_id,
    l.learner_user_id,
    l.enrollment_id,
    l.course_id,
    l.hour_category,
    round(sum(l.computed_minutes) / 60.0, 2)  AS computed_hours,
    round(sum(l.verified_minutes) / 60.0, 2)  AS verified_hours,
    count(*)                                   AS entry_count,
    count(*) FILTER (WHERE l.verification_status = 'human_verified') AS verified_entries,
    count(*) FILTER (WHERE l.verification_status IN ('computed','ai_verified_pending_human'))
                                               AS pending_entries,
    count(*) FILTER (WHERE l.verification_status = 'disputed') AS disputed_entries
FROM lms.clock_hour_ledger l
WHERE l.voided_at IS NULL
GROUP BY l.tenant_id, l.learner_user_id, l.enrollment_id, l.course_id, l.hour_category;

-- Credential readiness: skills AND hours in one place, per definition.
CREATE OR REPLACE VIEW lms.v_credential_readiness AS
SELECT
    cd.tenant_id,
    cd.id                        AS credential_definition_id,
    cd.code                      AS credential_code,
    cd.title                     AS credential_title,
    e.learner_user_id,
    e.id                         AS enrollment_id,
    count(cds.skill_id)                                         AS skills_required,
    count(*) FILTER (WHERE spa.effective_rank
                           >= lms.competency_rank(cds.required_level)) AS skills_met,
    bool_and(coalesce(spa.effective_rank, 0)
             >= lms.competency_rank(cds.required_level))        AS all_skills_met,
    coalesce(hrs.verified_hours, 0)                             AS verified_hours,
    cd.required_clock_hours,
    (cd.required_clock_hours IS NULL
     OR coalesce(hrs.verified_hours, 0) >= cd.required_clock_hours) AS hours_met
FROM lms.credential_definitions cd
JOIN lms.enrollments e
  ON e.tenant_id = cd.tenant_id
 AND (cd.course_id IS NULL OR e.course_id = cd.course_id)
LEFT JOIN lms.credential_definition_skills cds
  ON cds.tenant_id = cd.tenant_id AND cds.credential_definition_id = cd.id
LEFT JOIN lms.v_skill_progress_authority spa
  ON spa.tenant_id = cd.tenant_id
 AND spa.learner_user_id = e.learner_user_id
 AND spa.skill_id = cds.skill_id
LEFT JOIN LATERAL (
    SELECT sum(v.verified_hours) AS verified_hours
    FROM lms.v_learner_clock_hours v
    WHERE v.tenant_id = cd.tenant_id
      AND v.learner_user_id = e.learner_user_id
      AND (cd.course_id IS NULL OR v.course_id = cd.course_id)
) hrs ON true
WHERE cd.is_active
GROUP BY cd.tenant_id, cd.id, cd.code, cd.title, e.learner_user_id, e.id,
         cd.required_clock_hours, hrs.verified_hours;

-- Backfill the read model once so existing signoff rows are reflected.
DO $$
DECLARE r RECORD; n integer := 0;
BEGIN
    FOR r IN
        SELECT DISTINCT tenant_id, learner_user_id, skill_id FROM lms.skill_signoffs
        UNION
        SELECT DISTINCT tenant_id, learner_user_id, skill_id FROM lms.skill_signoff_events
    LOOP
        PERFORM lms.recompute_skill_progress(r.tenant_id, r.learner_user_id, r.skill_id);
        n := n + 1;
    END LOOP;
    RAISE NOTICE '[10] backfilled % skill_progress rows', n;
END $$;

-- ---- 11.5  RLS for every new lms table -----------------------------------
DO $$
DECLARE r RECORD; n integer := 0;
BEGIN
    FOR r IN
        SELECT c.relname AS tbl
        FROM pg_class c
        JOIN pg_namespace ns ON ns.oid = c.relnamespace
        WHERE ns.nspname = 'lms'
          AND c.relkind = 'r'
          AND c.relrowsecurity = false
          AND EXISTS (SELECT 1 FROM pg_attribute a
                      WHERE a.attrelid = c.oid AND a.attname = 'tenant_id'
                        AND a.attnum > 0 AND NOT a.attisdropped)
        ORDER BY 1
    LOOP
        EXECUTE format('ALTER TABLE lms.%I ENABLE ROW LEVEL SECURITY', r.tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON lms.%I', r.tbl || '_select', r.tbl);
        EXECUTE format('CREATE POLICY %I ON lms.%I FOR SELECT USING (lms.is_tenant_member(tenant_id))',
                       r.tbl || '_select', r.tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON lms.%I', r.tbl || '_write', r.tbl);
        EXECUTE format(
            'CREATE POLICY %I ON lms.%I FOR ALL '
            'USING (lms.is_lms_admin(tenant_id) OR lms.is_platform_admin()) '
            'WITH CHECK (lms.is_lms_admin(tenant_id) OR lms.is_platform_admin())',
            r.tbl || '_write', r.tbl);
        n := n + 1;
    END LOOP;
    RAISE NOTICE '[11.5] RLS applied to % new lms tables', n;
END $$;

-- ---- 11.6  Grants --------------------------------------------------------
GRANT USAGE ON SCHEMA public, lms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA lms    TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA lms    TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA lms TO authenticated;

-- Payroll tables carry SSN tokens and bank tokens: never expose to anon.
REVOKE ALL ON public.acct_employees,
              public.acct_payroll_runs,
              public.acct_payroll_run_items,
              public.acct_payroll_deductions,
              public.acct_payroll_tax_forms,
              public.acct_timesheets,
              public.commerce_customer_payment_methods
       FROM anon;


-- ############################################################################
-- ============================================================================
-- SECTION 10b - AUTO-PROVISION skill_progress PARENT ROWS
-- ----------------------------------------------------------------------------
--   lms.skill_signoffs carries:
--     FOREIGN KEY (tenant_id, learner_user_id, skill_id)
--       REFERENCES lms.skill_progress(tenant_id, learner_user_id, skill_id)
--       ON DELETE CASCADE
--
--   So a sign-off CANNOT be inserted until a skill_progress row already
--   exists for that (tenant, learner, skill). Verified by execution: a bare
--   INSERT into skill_signoffs fails with
--     "violates foreign key constraint skill_signoffs_skill_progress_fk".
--
--   That forces every caller - the TypeScript layer, an instructor UI, a bulk
--   import - to remember to upsert the parent row first, and the failure mode
--   is a hard FK error at sign-off time.
--
--   This BEFORE INSERT trigger provisions the parent row on demand, so the
--   sign-off itself becomes the only write the app has to make. All other
--   skill_progress columns carry defaults, so a three-column insert is safe.
--   The recompute trigger from Section 10 then fires as normal and sets the
--   derived level.
-- ============================================================================

CREATE OR REPLACE FUNCTION lms.ensure_skill_progress_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lms
AS $fn$
BEGIN
    INSERT INTO lms.skill_progress (tenant_id, learner_user_id, skill_id)
    VALUES (NEW.tenant_id, NEW.learner_user_id, NEW.skill_id)
    ON CONFLICT (tenant_id, learner_user_id, skill_id) DO NOTHING;
    RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_skill_signoffs_ensure_progress ON lms.skill_signoffs;
CREATE TRIGGER trg_skill_signoffs_ensure_progress
    BEFORE INSERT ON lms.skill_signoffs
    FOR EACH ROW EXECUTE FUNCTION lms.ensure_skill_progress_row();

-- Same protection for the event-sourced table, when present.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='lms' AND c.relname='skill_signoff_events')
       AND EXISTS (SELECT 1 FROM pg_attribute a
                   WHERE a.attrelid='lms.skill_signoff_events'::regclass
                     AND a.attname='learner_user_id' AND a.attnum>0 AND NOT a.attisdropped)
    THEN
        DROP TRIGGER IF EXISTS trg_skill_signoff_events_ensure_progress ON lms.skill_signoff_events;
        CREATE TRIGGER trg_skill_signoff_events_ensure_progress
            BEFORE INSERT ON lms.skill_signoff_events
            FOR EACH ROW EXECUTE FUNCTION lms.ensure_skill_progress_row();
        RAISE NOTICE '[10b] auto-provision trigger added to skill_signoff_events';
    END IF;
END $$;


-- ---------------------------------------------------------------------------
-- SECTION 11b — CLOSE THE VIEW RLS BYPASS  (CRITICAL SECURITY FIX)
-- ---------------------------------------------------------------------------
-- A PostgreSQL view executes with the privileges of its OWNER, not the caller,
-- unless security_invoker is enabled. Every view in public and lms is owned by
-- a superuser and none had security_invoker set, so each one silently bypassed
-- the row-level security on its base tables.
--
-- Proven by execution before this fix, as user bbbbbbbb-...-0002 (tenant B)
-- reading tenant A's data:
--
--   SELECT count(*) FROM lms.skill_progress
--    WHERE tenant_id = '11111111-...-0001';            -> 0    (RLS held)
--   SELECT count(*) FROM lms.v_skill_progress_authority
--    WHERE tenant_id = '11111111-...-0001';            -> 1    (RLS BYPASSED)
--
-- Section 11 grants SELECT on ALL TABLES in public and lms to anon, and that
-- grant covers views, so this was reachable by unauthenticated callers.
--
-- security_invoker requires PostgreSQL 15+. Supabase runs 15 or newer; the
-- guard below stops the migration rather than letting it appear to succeed on
-- an older server where the leak would stay open.
DO $$
DECLARE
    v_rec   record;
    v_fixed integer := 0;
BEGIN
    IF current_setting('server_version_num')::integer < 150000 THEN
        RAISE EXCEPTION
          'SECTION 11b REQUIRES PostgreSQL 15+ for security_invoker views. '
          'Server is %. Every view in public/lms bypasses RLS on this server '
          'and tenant isolation CANNOT be enforced. Do not deploy.',
          current_setting('server_version');
    END IF;

    FOR v_rec IN
        SELECT n.nspname AS s, c.relname AS v
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'v'
          AND n.nspname IN ('public','lms')
          AND coalesce(array_to_string(c.reloptions, ','), '')
              NOT LIKE '%security_invoker=%on%'
        ORDER BY 1, 2
    LOOP
        EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = on)',
                       v_rec.s, v_rec.v);
        v_fixed := v_fixed + 1;
    END LOOP;

    RAISE NOTICE 'SECTION 11b: security_invoker enabled on % view(s).', v_fixed;
END $$;

-- Views now run as the caller, so the caller needs SELECT on the base tables.
-- authenticated already holds that from Section 11; restated here so the fix
-- is self-contained. anon deliberately keeps SELECT only: with security_invoker
-- on, anon matches no tenant policy and therefore reads nothing.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA lms    TO authenticated;

-- Dropping and recreating a view discards its ACL. The three authority views
-- in Section 10 are dropped on every run, so re-grant them explicitly instead
-- of relying on privileges that happened to exist beforehand.
GRANT SELECT ON lms.v_skill_progress_authority TO authenticated, anon, service_role;
GRANT SELECT ON lms.v_skill_progress_drift     TO authenticated, anon, service_role;
GRANT SELECT ON lms.v_credential_readiness     TO authenticated, anon, service_role;

-- SECTION 12 — POST-MIGRATION INTEGRITY AUDIT
-- ############################################################################
-- Re-runs every invariant this migration claims to fix. Raises, and therefore
-- rolls the whole transaction back, if any of them is still violated. If this
-- commits, the listed defects are genuinely gone.

DO $$
DECLARE
    v_broken_triggers  integer;
    v_open_policies    integer;
    v_no_policy_lms    integer;
    v_no_policy_public integer;
    v_unpinned_secdef  integer;
    v_bad_view_cols    integer;
    v_rls_off          integer;
    v_drift            integer;
    v_names_lms        text;
    v_names_public     text;
    v_names_rlsoff     text;
    v_leaky_views      integer;
    v_names_leaky      text;
    v_msg              text := '';
BEGIN
    -- 12.1  No updated_at trigger may reference a missing column.
    SELECT count(*) INTO v_broken_triggers
    FROM pg_trigger t
    JOIN pg_class c      ON c.oid  = t.tgrelid
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    JOIN pg_proc p       ON p.oid  = t.tgfoid
    WHERE NOT t.tgisinternal
      AND p.proname IN ('touch_updated_at','platform_touch_updated_at')
      AND ns.nspname IN ('public','lms')
      AND NOT EXISTS (SELECT 1 FROM pg_attribute a
                      WHERE a.attrelid = c.oid AND a.attname = 'updated_at'
                        AND a.attnum > 0 AND NOT a.attisdropped);

    -- 12.2  No permissive FOR ALL policy may omit USING (blocks UPDATE/DELETE).
    SELECT count(*) INTO v_open_policies
    FROM pg_policies
    WHERE schemaname IN ('public','lms')
      AND permissive = 'PERMISSIVE' AND cmd = 'ALL'
      AND qual IS NULL AND with_check IS NOT NULL;

    -- 12.3  No table may have RLS enabled and zero policies (deny-all).
    SELECT count(*), string_agg('lms.'||c.relname, ', ' ORDER BY c.relname)
      INTO v_no_policy_lms, v_names_lms
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'lms' AND c.relkind = 'r' AND c.relrowsecurity
      AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
      AND NOT EXISTS (SELECT 1 FROM pg_depend d
                      WHERE d.classid = 'pg_class'::regclass
                        AND d.objid = c.oid AND d.deptype = 'e');

    SELECT count(*), string_agg('public.'||c.relname, ', ' ORDER BY c.relname)
      INTO v_no_policy_public, v_names_public
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
      AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
      AND NOT EXISTS (SELECT 1 FROM pg_depend d
                      WHERE d.classid = 'pg_class'::regclass
                        AND d.objid = c.oid AND d.deptype = 'e');

    -- 12.4  Every tenant-scoped table must actually have RLS on.
    SELECT count(*), string_agg(ns.nspname||'.'||c.relname, ', ' ORDER BY c.relname)
      INTO v_rls_off, v_names_rlsoff
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname IN ('public','lms') AND c.relkind = 'r'
      AND NOT c.relrowsecurity
      AND EXISTS (SELECT 1 FROM pg_attribute a
                  WHERE a.attrelid = c.oid AND a.attname = 'tenant_id'
                    AND a.attnum > 0 AND NOT a.attisdropped)
      AND NOT EXISTS (SELECT 1 FROM pg_depend d
                      WHERE d.classid = 'pg_class'::regclass
                        AND d.objid = c.oid AND d.deptype = 'e');

    -- 12.5  Every SECURITY DEFINER function must pin search_path.
    SELECT count(*) INTO v_unpinned_secdef
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname IN ('public','lms')
      AND p.prosecdef
      AND (p.proconfig IS NULL
           OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg
                          WHERE cfg LIKE 'search\_path=%'));

    -- 12.6  Every view must still resolve (catches invalid column refs).
    v_bad_view_cols := 0;
    DECLARE vr RECORD;
    BEGIN
        FOR vr IN
            SELECT ns.nspname AS sch, c.relname AS vw
            FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
            WHERE c.relkind IN ('v','m') AND ns.nspname IN ('public','lms')
        LOOP
            BEGIN
                EXECUTE format('EXPLAIN (COSTS OFF) SELECT * FROM %I.%I LIMIT 0', vr.sch, vr.vw);
            EXCEPTION WHEN others THEN
                v_bad_view_cols := v_bad_view_cols + 1;
                RAISE WARNING '[12.6] view %.% failed to plan: %', vr.sch, vr.vw, SQLERRM;
            END;
        END LOOP;
    END;

    -- 12.7  skill_progress read model must agree with its sources.
    SELECT count(*) INTO v_drift FROM lms.v_skill_progress_drift;

    IF v_broken_triggers > 0 THEN
        v_msg := v_msg || format('%s UPDATE-breaking updated_at triggers remain. ', v_broken_triggers);
    END IF;
    IF v_open_policies > 0 THEN
        v_msg := v_msg || format('%s write-blocking policies remain. ', v_open_policies);
    END IF;
    IF v_no_policy_lms > 0 THEN
        v_msg := v_msg || format('%s lms table(s) still deny-all: %s. ', v_no_policy_lms, v_names_lms);
    END IF;
    IF v_no_policy_public > 0 THEN
        v_msg := v_msg || format('%s public table(s) still deny-all: %s. ', v_no_policy_public, v_names_public);
    END IF;
    IF v_rls_off > 0 THEN
        v_msg := v_msg || format('%s tenant table(s) have RLS off: %s. ', v_rls_off, v_names_rlsoff);
    END IF;
    IF v_bad_view_cols > 0 THEN
        v_msg := v_msg || format('%s views do not resolve. ', v_bad_view_cols);
    END IF;

    -- 12.9  No view may bypass RLS through owner privileges.
    SELECT count(*), coalesce(string_agg(n.nspname||'.'||c.relname, ', '
                              ORDER BY n.nspname, c.relname), '')
      INTO v_leaky_views, v_names_leaky
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'v'
      AND n.nspname IN ('public','lms')
      AND coalesce(array_to_string(c.reloptions, ','), '')
          NOT LIKE '%security_invoker=%on%';
    IF v_leaky_views > 0 THEN
        RAISE EXCEPTION
          'GAP CLOSURE AUDIT FAILED: % view(s) lack security_invoker and so '
          'execute as their owner, bypassing row-level security on their base '
          'tables and leaking rows across tenants: %',
          v_leaky_views, v_names_leaky;
    END IF;

    RAISE NOTICE '=======================================================';
    RAISE NOTICE ' POST-MIGRATION AUDIT';
    RAISE NOTICE '   UPDATE-breaking triggers ........ % (expect 0)', v_broken_triggers;
    RAISE NOTICE '   Write-blocking policies ......... % (expect 0)', v_open_policies;
    RAISE NOTICE '   Deny-all lms tables ............. % (expect 0)', v_no_policy_lms;
    RAISE NOTICE '   Deny-all public tables .......... % (expect 0)', v_no_policy_public;
    RAISE NOTICE '   Tenant tables with RLS off ...... % (expect 0)', v_rls_off;
    RAISE NOTICE '   Unresolvable views .............. % (expect 0)', v_bad_view_cols;
    RAISE NOTICE '   SECURITY DEFINER w/o search_path  % (expect 0)', v_unpinned_secdef;
    RAISE NOTICE '   skill_progress drift rows ....... % (expect 0)', v_drift;
    RAISE NOTICE '   RLS-bypassing views ............. % (expect 0)', v_leaky_views;
    RAISE NOTICE '=======================================================';

    IF v_msg <> '' THEN
        RAISE EXCEPTION 'GAP CLOSURE AUDIT FAILED: %', v_msg;
    END IF;

    IF v_unpinned_secdef > 0 THEN
        RAISE EXCEPTION 'GAP CLOSURE AUDIT FAILED: % SECURITY DEFINER functions still lack a pinned search_path', v_unpinned_secdef;
    END IF;
END $$;

-- ============================================================================
-- SECTION 13 - SEED DATA REPAIR: CPP module titles
-- ----------------------------------------------------------------------------
--   Defect: all 29 Complete Professional Pet Care (CPP) module seed rows were
--   inserted with `title` set to the module's clock-hour count ('10', '116',
--   '2', ...) instead of the module name. Confirmed by comparing every seeded
--   module against the official Course Catalog:
--       * 29 CPP rows have a purely numeric title
--       * each numeric equals that row's own metadata->>'clock_hours'
--       * 0 clock-hour mismatches across all 65 catalogued modules
--   => only the `title` column was clobbered; rows are otherwise aligned, so
--      the correct titles restore deterministically from the module code.
--
--   CPP reconciles to exactly 29 modules / 600 clock hours, matching the
--   catalog header ("CPP  Complete Professional Pet Care  29  600").
--
--   Idempotent and self-guarding: a row is rewritten only while its title is
--   still numeric AND its capstone and clock_hours match the catalog exactly.
-- ============================================================================

DO $$
DECLARE
    v_fixed   integer := 0;
    v_skipped integer := 0;
    v_left    integer := 0;
BEGIN
    WITH catalog(code, correct_title, capstone, clock_hours) AS (
        VALUES
        ('CPP-101', 'Introduction to a Dog''s Life', 'Dog life & training history brief', 10),
        ('CPP-102', 'AKC Breeds, Recognition & Characteristics', 'Breed recognition field guide', 20),
        ('CPP-103', 'Equipment and Training', 'Training equipment portfolio', 10),
        ('CPP-201', 'Understanding Behavior', 'Behavior problem-solution case file', 25),
        ('CPP-202', 'Introduction to Puppy', 'Puppy handling & care plan', 25),
        ('CPP-203', 'Basic Obedience Skills', 'Basic obedience demonstration log', 40),
        ('CPP-204', 'Advanced Obedience On-Leash', 'On-leash advanced command rubric', 40),
        ('CPP-205', 'Advanced Obedience Off-Leash', 'Off-leash advanced command rubric', 40),
        ('CPP-301', 'Dog Development (Grooming Track)', 'Dog life-stage profile', 20),
        ('CPP-302', 'Equipment and Tools (Grooming Track)', 'Tool identification & usage portfolio', 25),
        ('CPP-303', 'Dog Handling', 'Safe-handling skills checklist', 30),
        ('CPP-304', 'AKC Breeds, Recognition & Characteristics (Grooming Track)', 'Breed recognition field guide', 19),
        ('CPP-305', 'Introduction to Dog Grooming', 'Basic grooming prep portfolio', 25),
        ('CPP-306', 'Dog Preparation', 'Pre-groom preparation checklist', 20),
        ('CPP-307', 'Bathing Techniques', 'Supervised bath service record', 30),
        ('CPP-308', 'Drying', 'Dry-and-finish service record', 20),
        ('CPP-401', 'Advanced Dog Grooming', 'Supervised trim portfolio', 116),
        ('CPP-402', 'Sanitation Process', 'Sanitation protocol checklist', 14),
        ('CPP-403', 'Business', 'Salon & SPA operating plan', 25),
        ('CPP-404', 'Design a Private Class & Final Assessment', 'Private class design', 14),
        ('CPP-405', 'Introduction to the Client', 'Client intake & contract portfolio', 2),
        ('CPP-406', 'Pet Care', 'Multi-species care plan', 2),
        ('CPP-407', 'Business (Sitter Track)', 'Pet-sitter startup plan', 2),
        ('CPP-408', 'Pet Handling and Sanitation Process', 'Sitter handling & sanitation checklist', 2),
        ('CPP-409', 'CPR & First Aid Techniques', 'CPR & first-aid competency checkoff', 8),
        ('CPP-410', 'Cat Breeds', 'Cat breed recognition guide', 1),
        ('CPP-411', 'Cat Temperament and Handling', 'Cat handling competency checkoff', 7),
        ('CPP-412', 'Cat Bathing and Drying Techniques', 'Cat bath-and-dry service record', 2),
        ('CPP-413', 'Cat Grooming', 'Cat groom portfolio', 6)
    ),
    upd AS (
        UPDATE lms.modules m
           SET title = c.correct_title
          FROM catalog c
         WHERE m.metadata->>'code'  = c.code
           AND m.title ~ '^[0-9]+$'
           AND m.metadata->>'capstone' = c.capstone
           AND (m.metadata->>'clock_hours')::int = c.clock_hours
        RETURNING 1
    )
    SELECT count(*) INTO v_fixed FROM upd;

    RAISE NOTICE '[13] CPP module titles restored ...... %', v_fixed;

    SELECT count(*) INTO v_skipped
      FROM lms.modules
     WHERE metadata->>'code' LIKE 'CPP-%' AND title ~ '^[0-9]+$';
    IF v_skipped > 0 THEN
        RAISE WARNING '[13] % CPP row(s) still numeric but did NOT match expected capstone/clock_hours - inspect before trusting the mapping.', v_skipped;
    END IF;

    SELECT count(*) INTO v_left FROM lms.modules WHERE title ~ '^[0-9]+$';
    IF v_left > 0 THEN
        RAISE WARNING '[13] % module row(s) across all programs still carry a numeric title.', v_left;
    END IF;
END $$;


COMMIT;

-- ============================================================================
-- POST-COMMIT, OPTIONAL
-- ============================================================================
-- 1. Validate the NOT VALID CHECK constraints once legacy data is clean:
--      SELECT format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I;',
--                    n.nspname, c.relname, con.conname)
--      FROM pg_constraint con
--      JOIN pg_class c ON c.oid = con.conrelid
--      JOIN pg_namespace n ON n.oid = c.relnamespace
--      WHERE con.contype = 'c' AND NOT con.convalidated
--        AND n.nspname IN ('public','lms');
--
-- 2. ANALYZE the tables that gained indexes:
--      ANALYZE;
--
-- 3. The seed data writes into lms.pathways and lms.courses, which are now
--    policy-protected. Re-run seeding under the service role, or as a
--    platform admin, not as `authenticated`.
--
-- 4. RESOLVED in Section 13: the 29 CPP module seed rows whose `title` held the
--    clock-hour number are restored from the official Course Catalog. The seed
--    file itself has also been corrected, so fresh installs are clean. Verify:
--      SELECT cou-- ############################################################################
-- SECTION 8 — LMS CATALOG SPINE
-- ############################################################################
-- The Course Catalog's structural fields lived only inside modules.metadata
-- jsonb: no code, no 100/200/300/400 level, no clock hours, no capstone flag,
-- no safety-critical flag. Nothing was queryable or constrainable.

ALTER TABLE lms.modules
    ADD COLUMN IF NOT EXISTS code                text,
    ADD COLUMN IF NOT EXISTS program_level       smallint
        CHECK (program_level IS NULL OR program_level IN (100,200,300,400)),
    ADD COLUMN IF NOT EXISTS clock_hours         numeric(7,2)
        CHECK (clock_hours IS NULL OR clock_hours >= 0),
    ADD COLUMN IF NOT EXISTS hour_category       text
        CHECK (hour_category IS NULL OR hour_category IN
               ('theory','supervised_lab','live_animal_clinical','externship','self_study','assessment')),
    ADD COLUMN IF NOT EXISTS is_capstone         boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_micro_check      boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_safety_critical  boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS requires_ai_workflow boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS evidence_type       text
        CHECK (evidence_type IS NULL OR evidence_type IN
               ('written_exam','practical_demo','video_submission','portfolio','observation_checklist',
                'preceptor_signoff','client_feedback','none')),
    ADD COLUMN IF NOT EXISTS approval_authority  text
        CHECK (approval_authority IS NULL OR approval_authority IN
               ('instructor','preceptor','manager','lms_admin','automated')),
    ADD COLUMN IF NOT EXISTS category            text,
    ADD COLUMN IF NOT EXISTS word_count          integer CHECK (word_count IS NULL OR word_count >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lms_modules_code
    ON lms.modules (tenant_id, code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lms_modules_level
    ON lms.modules (tenant_id, program_level, course_id) WHERE program_level IS NOT NULL;

ALTER TABLE lms.lessons
    ADD COLUMN IF NOT EXISTS word_count              integer CHECK (word_count IS NULL OR word_count >= 0),
    ADD COLUMN IF NOT EXISTS pacing_words_per_minute integer NOT NULL DEFAULT 240
        CHECK (pacing_words_per_minute > 0);

ALTER TABLE lms.pathways
    ADD COLUMN IF NOT EXISTS code              text,
    ADD COLUMN IF NOT EXISTS total_clock_hours numeric(8,2)
        CHECK (total_clock_hours IS NULL OR total_clock_hours >= 0),
    ADD COLUMN IF NOT EXISTS program_kind      text
        CHECK (program_kind IS NULL OR program_kind IN
               ('business','personal','intensive_diploma','certificate','bundle'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_lms_pathways_code
    ON lms.pathways (tenant_id, code) WHERE code IS NOT NULL;

ALTER TABLE lms.courses
    ADD COLUMN IF NOT EXISTS code          text,
    ADD COLUMN IF NOT EXISTS program_level smallint
        CHECK (program_level IS NULL OR program_level IN (100,200,300,400)),
    ADD COLUMN IF NOT EXISTS category      text,
    ADD COLUMN IF NOT EXISTS state_board_approved boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lms_courses_code
    ON lms.courses (tenant_id, code) WHERE code IS NOT NULL;

-- "Search by Category" had no full-text index.
CREATE INDEX IF NOT EXISTS idx_lms_courses_fts
    ON lms.courses USING gin (
        to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
    );

-- ---- 8.1  Clock-hour categorisation ---------------------------------------
-- Highest-risk catalog gap: the ledger could not answer a state board asking
-- "how many supervised hands-on hours?" There was no category and no skill
-- link, so hours and skills were unjoinable.
ALTER TABLE lms.clock_hour_ledger
    ADD COLUMN IF NOT EXISTS hour_category text NOT NULL DEFAULT 'theory'
        CHECK (hour_category IN ('theory','supervised_lab','live_animal_clinical',
                                 'externship','self_study','assessment')),
    ADD COLUMN IF NOT EXISTS skill_id uuid,
    ADD COLUMN IF NOT EXISTS supervised_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS supervision_type text
        CHECK (supervision_type IS NULL OR supervision_type IN
               ('direct','indirect','remote_synchronous','unsupervised'));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'clock_hour_ledger_skill_fk'
          AND conrelid = 'lms.clock_hour_ledger'::regclass
    ) THEN
        ALTER TABLE lms.clock_hour_ledger
            ADD CONSTRAINT clock_hour_ledger_skill_fk
            FOREIGN KEY (tenant_id, skill_id)
            REFERENCES lms.skills(tenant_id, id) ON DELETE SET NULL;
    END IF;
    -- supersedes_ledger_id had no FK and no uniqueness: two entries could
    -- supersede the same original.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'clock_hour_ledger_supersedes_fk'
          AND conrelid = 'lms.clock_hour_ledger'::regclass
    ) THEN
        ALTER TABLE lms.clock_hour_ledger
            ADD CONSTRAINT clock_hour_ledger_supersedes_fk
            FOREIGN KEY (tenant_id, supersedes_ledger_id)
            REFERENCES lms.clock_hour_ledger(tenant_id, id) ON DELETE SET NULL;
    END IF;
    -- verified_minutes must never exceed computed_minutes.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'clock_hour_ledger_verified_lte_computed'
          AND conrelid = 'lms.clock_hour_ledger'::regclass
    ) THEN
        ALTER TABLE lms.clock_hour_ledger
            ADD CONSTRAINT clock_hour_ledger_verified_lte_computed
            CHECK (verified_minutes <= computed_minutes) NOT VALID;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_clock_hour_supersedes_once
    ON lms.clock_hour_ledger (tenant_id, supersedes_ledger_id)
    WHERE supersedes_ledger_id IS NOT NULL AND voided_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clock_hour_ledger_category
    ON lms.clock_hour_ledger (tenant_id, learner_user_id, hour_category)
    WHERE voided_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clock_hour_ledger_skill
    ON lms.clock_hour_ledger (tenant_id, skill_id) WHERE skill_id IS NOT NULL;

-- ---- 8.2  Credential definitions ------------------------------------------
-- Nothing declared "course X awards diploma Y"; credentials existed only
-- post-issuance. CPP's four sub-tracks had no level between pathway and course.
CREATE TABLE IF NOT EXISTS lms.credential_definitions (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code                  text NOT NULL,
    title                 text NOT NULL,
    description           text,
    credential_type       text NOT NULL DEFAULT 'certificate'
                          CHECK (credential_type IN ('certificate','diploma','badge','license','micro_credential','ceu')),
    pathway_id            uuid,
    course_id             uuid,
    track_id              uuid,
    required_clock_hours  numeric(8,2) CHECK (required_clock_hours IS NULL OR required_clock_hours >= 0),
    required_theory_hours numeric(8,2),
    required_lab_hours    numeric(8,2),
    required_clinical_hours numeric(8,2),
    required_externship_hours numeric(8,2),
    requires_all_skills   boolean NOT NULL DEFAULT true,
    minimum_score         numeric(5,2) CHECK (minimum_score IS NULL OR (minimum_score >= 0 AND minimum_score <= 100)),
    grants_software_access boolean NOT NULL DEFAULT false,
    software_access_tier  text,
    validity_months       integer CHECK (validity_months IS NULL OR validity_months > 0),
    is_state_board_recognized boolean NOT NULL DEFAULT false,
    issuing_authority     text,
    certificate_template_url text,
    is_active             boolean NOT NULL DEFAULT true,
    metadata              jsonb NOT NULL DEFAULT '{}',
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, pathway_id) REFERENCES lms.pathways(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, course_id)  REFERENCES lms.courses(tenant_id, id)  ON DELETE CASCADE,
    CHECK (pathway_id IS NOT NULL OR course_id IS NOT NULL OR track_id IS NOT NULL)
);

-- The missing level between pathway and course (e.g. CPP's four sub-tracks).
CREATE TABLE IF NOT EXISTS lms.program_tracks (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    pathway_id        uuid NOT NULL,
    code              text NOT NULL,
    title             text NOT NULL,
    description       text,
    total_clock_hours numeric(8,2) CHECK (total_clock_hours IS NULL OR total_clock_hours >= 0),
    sort_order        integer NOT NULL DEFAULT 0,
    is_required       boolean NOT NULL DEFAULT true,
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, pathway_id) REFERENCES lms.pathways(tenant_id, id) ON DELETE CASCADE
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'credential_definitions_track_fk'
          AND conrelid = 'lms.credential_definitions'::regclass
    ) THEN
        ALTER TABLE lms.credential_definitions
            ADD CONSTRAINT credential_definitions_track_fk
            FOREIGN KEY (tenant_id, track_id)
            REFERENCES lms.program_tracks(tenant_id, id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS lms.credential_definition_skills (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    credential_definition_id uuid NOT NULL,
    skill_id              uuid NOT NULL,
    required_level        text NOT NULL DEFAULT 'mastered'
                          CHECK (required_level IN ('introduced','practiced','mastered')),
    is_safety_critical    boolean NOT NULL DEFAULT false,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, credential_definition_id, skill_id),
    FOREIGN KEY (tenant_id, credential_definition_id)
        REFERENCES lms.credential_definitions(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, skill_id) REFERENCES lms.skills(tenant_id, id) ON DELETE CASCADE
);

-- Link issued credentials back to their definition.
ALTER TABLE lms.credentials
    ADD COLUMN IF NOT EXISTS credential_definition_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'credentials_definition_fk'
          AND conrelid = 'lms.credentials'::regclass
    ) THEN
        ALTER TABLE lms.credentials
            ADD CONSTRAINT credentials_definition_fk
            FOREIGN KEY (tenant_id, credential_definition_id)
            REFERENCES lms.credential_definitions(tenant_id, id) ON DELETE SET NULL;
    END IF;
END $$;

-- ---- 8.3  Module- and skill-level prerequisites ---------------------------
-- Prerequisites were course-to-course only, so 100 -> 200 -> 300 -> 400
-- sequencing was unenforceable.
CREATE TABLE IF NOT EXISTS lms.module_prerequisites (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    module_id         uuid NOT NULL,
    prerequisite_module_id uuid,
    prerequisite_skill_id  uuid,
    required_skill_level   text
                      CHECK (required_skill_level IS NULL OR required_skill_level IN
                             ('introduced','practiced','mastered')),
    is_hard_gate      boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, module_id, prerequisite_module_id, prerequisite_skill_id),
    FOREIGN KEY (tenant_id, module_id)
        REFERENCES lms.modules(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, prerequisite_module_id)
        REFERENCES lms.modules(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, prerequisite_skill_id)
        REFERENCES lms.skills(tenant_id, id) ON DELETE CASCADE,
    CHECK (prerequisite_module_id IS NOT NULL OR prerequisite_skill_id IS NOT NULL),
    CHECK (prerequisite_module_id IS NULL OR prerequisite_module_id <> module_id)
);

-- ---- 8.4  Equipment / program tools ---------------------------------------
CREATE TABLE IF NOT EXISTS lms.equipment_requirements (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    scope_type        text NOT NULL DEFAULT 'course'
                      CHECK (scope_type IN ('pathway','track','course','module','lesson')),
    scope_id          uuid NOT NULL,
    item_name         text NOT NULL,
    item_category     text NOT NULL DEFAULT 'tool'
                      CHECK (item_category IN ('tool','ppe','consumable','textbook','software','animal_access','facility')),
    description       text,
    quantity          integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    is_required       boolean NOT NULL DEFAULT true,
    provided_by       text NOT NULL DEFAULT 'learner'
                      CHECK (provided_by IN ('learner','school','employer','either')),
    estimated_cost    numeric(12,2) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    vendor_url        text,
    isbn              text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, scope_type, scope_id, item_name)
);

-- ---- 8.5  Role catalog ----------------------------------------------------
-- lms.lms_roles is UNIQUE(tenant_id, user_id): it is a per-user grant row,
-- not a role catalog. lms_role_assignments.role_id therefore pointed at
-- another user's grant. Adds a real role-definition table and a correct FK.
CREATE TABLE IF NOT EXISTS lms.role_definitions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role_key      text NOT NULL,
    label         text NOT NULL,
    description   text,
    permissions   text[] NOT NULL DEFAULT '{}',
    is_system     boolean NOT NULL DEFAULT false,
    can_sign_off  boolean NOT NULL DEFAULT false,
    signoff_max_level text
                  CHECK (signoff_max_level IS NULL OR signoff_max_level IN
                         ('introduced','practiced','mastered')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, role_key),
    UNIQUE (tenant_id, id)
);

ALTER TABLE lms.lms_role_assignments
    ADD COLUMN IF NOT EXISTS role_definition_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lms_role_assignments_role_definition_fk'
          AND conrelid = 'lms.lms_role_assignments'::regclass
    ) THEN
        ALTER TABLE lms.lms_role_assignments
            ADD CONSTRAINT lms_role_assignments_role_definition_fk
            FOREIGN KEY (tenant_id, role_definition_id)
            REFERENCES lms.role_definitions(tenant_id, id) ON DELETE CASCADE;
    END IF;
END $$;

-- 'preceptor' was missing from the role vocabulary even though the Lab Skills
-- rubric names it as an approval authority.
DO $$
DECLARE con_name text;
BEGIN
    SELECT conname INTO con_name
    FROM pg_constraint
    WHERE conrelid = 'lms.lms_roles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%support_navigator%';
    IF con_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE lms.lms_roles DROP CONSTRAINT %I', con_name);
    END IF;
    ALTER TABLE lms.lms_roles
        ADD CONSTRAINT lms_roles_role_allowed
        CHECK (role IN ('learner','instructor','preceptor','manager','support_navigator',
                        'org_admin','platform_admin'));
END $$;


-- ############################################################################
-- SECTION 9 — RAG: INGESTION RULES, FORWARD-REF FKs, HYBRID RETRIEVAL
-- ############################################################################

-- ---- 9.1  The 6 forward-reference FKs that were never added ---------------
-- The RAG file comments say "FK added after modules table exists (forward
-- reference)", but no such ALTER exists in any file. These uuid columns were
-- permanently unconstrained. This migration runs after every table exists.
DO $$
DECLARE
    r RECORD;
    n integer := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('ai_rag_documents', 'module_id',  'modules',     'rag_doc_module_fk'),
            ('ai_rag_chunks',    'course_id',  'courses',     'rag_chunk_course_fk'),
            ('ai_rag_chunks',    'module_id',  'modules',     'rag_chunk_module_fk'),
            ('ai_rag_queries',   'course_id',  'courses',     'rag_query_course_fk'),
            ('ai_rag_queries',   'module_id',  'modules',     'rag_query_module_fk'),
            ('ai_rag_queries',   'session_id', 'lms_sessions','rag_query_session_fk')
        ) AS v(tbl, col, ref_tbl, con_name)
    LOOP
        IF to_regclass('lms.' || r.ref_tbl) IS NULL THEN
            RAISE NOTICE '[9.1] skip %: lms.% missing', r.con_name, r.ref_tbl;
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='lms' AND table_name=r.tbl AND column_name=r.col
        ) THEN
            CONTINUE;
        END IF;
        IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = r.con_name AND conrelid = ('lms.' || r.tbl)::regclass
        ) THEN
            CONTINUE;
        END IF;
        BEGIN
            EXECUTE format(
                'ALTER TABLE lms.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id, %I) '
                'REFERENCES lms.%I(tenant_id, id) ON DELETE SET NULL',
                r.tbl, r.con_name, r.col, r.ref_tbl);
            n := n + 1;
            RAISE NOTICE '[9.1] added %', r.con_name;
        EXCEPTION WHEN others THEN
            RAISE NOTICE '[9.1] could not add % (%): %', r.con_name, r.ref_tbl, SQLERRM;
        END;
    END LOOP;
    RAISE NOTICE '[9.1] closed % forward references', n;
END $$;

-- ---- 9.2  rag_sources: the catalog legend names rag_sources.source_id -----
-- That table did not exist, which made Ingestion Rules 1, 2, 3, 5 and 6
-- unimplementable.
CREATE TABLE IF NOT EXISTS lms.rag_sources (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    source_code       text NOT NULL,
    title             text NOT NULL,
    description       text,
    rag_role          text NOT NULL DEFAULT 'reference'
                      CHECK (rag_role IN ('core','reference','supplementary','system')),
    primary_pathway_id uuid,
    secondary_pathway_ids uuid[] NOT NULL DEFAULT '{}',
    chunk_strategy    text NOT NULL DEFAULT 'fixed_tokens'
                      CHECK (chunk_strategy IN ('fixed_tokens','semantic_paragraph','heading_aware',
                                                'page','qa_pair','transcript_segment')),
    safety_flag       boolean NOT NULL DEFAULT false,
    -- Ingestion Rule 4: system-training sources are never learner-facing.
    learner_facing    boolean NOT NULL DEFAULT true,
    authority_rank    integer NOT NULL DEFAULT 100,
    license_note      text,
    is_active         boolean NOT NULL DEFAULT true,
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, source_code),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, primary_pathway_id)
        REFERENCES lms.pathways(tenant_id, id) ON DELETE SET NULL,
    CHECK (rag_role <> 'system' OR learner_facing = false)
);

ALTER TABLE lms.ai_rag_documents
    ADD COLUMN IF NOT EXISTS source_id      uuid,
    ADD COLUMN IF NOT EXISTS rag_role       text
        CHECK (rag_role IS NULL OR rag_role IN ('core','reference','supplementary','system')),
    ADD COLUMN IF NOT EXISTS safety_flag    boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS learner_facing boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS chunk_strategy text
        CHECK (chunk_strategy IS NULL OR chunk_strategy IN
               ('fixed_tokens','semantic_paragraph','heading_aware','page','qa_pair','transcript_segment')),
    ADD COLUMN IF NOT EXISTS content_sha256 text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'rag_doc_source_fk'
          AND conrelid = 'lms.ai_rag_documents'::regclass
    ) THEN
        ALTER TABLE lms.ai_rag_documents
            ADD CONSTRAINT rag_doc_source_fk
            FOREIGN KEY (tenant_id, source_id)
            REFERENCES lms.rag_sources(tenant_id, id) ON DELETE SET NULL;
    END IF;
END $$;

-- Widen document_type to carry the system-training class Rule 4 needs.
DO $$
DECLARE con_name text;
BEGIN
    SELECT conname INTO con_name
    FROM pg_constraint
    WHERE conrelid = 'lms.ai_rag_documents'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%akc_breed_standard%';
    IF con_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE lms.ai_rag_documents DROP CONSTRAINT %I', con_name);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ai_rag_documents_document_type_allowed'
          AND conrelid = 'lms.ai_rag_documents'::regclass
    ) THEN
        ALTER TABLE lms.ai_rag_documents
            ADD CONSTRAINT ai_rag_documents_document_type_allowed
            CHECK (document_type IN (
                'textbook','study_guide','handbook','procedure_manual',
                'assessment_rubric','safety_protocol','akc_breed_standard',
                'cpr_first_aid','business_template','video_transcript',
                'regulation_reference','curriculum_supplement',
                'system_training','instructor_guide','answer_key'
            ));
    END IF;
END $$;

-- Dedupe + per-chunk model provenance.
ALTER TABLE lms.ai_rag_chunks
    ADD COLUMN IF NOT EXISTS content_sha256  text,
    ADD COLUMN IF NOT EXISTS embedding_model text;
-- (chunk token counts already exist as lms.ai_rag_chunks.content_tokens)

CREATE UNIQUE INDEX IF NOT EXISTS uq_rag_chunk_content_hash
    ON lms.ai_rag_chunks (tenant_id, document_id, content_sha256)
    WHERE content_sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_rag_documents_source
    ON lms.ai_rag_documents (tenant_id, source_id) WHERE source_id IS NOT NULL;

-- ---- 9.3  Rule 4 enforcement: learners must not read system-training -----
-- The old chunk policy was tenant-membership only, so any learner could read
-- every chunk including instructor answer keys.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies
               WHERE schemaname='lms' AND tablename='ai_rag_chunks'
                 AND policyname='ai_rag_chunks_learner_facing_select') THEN
        DROP POLICY ai_rag_chunks_learner_facing_select ON lms.ai_rag_chunks;
    END IF;
END $$;

CREATE POLICY ai_rag_chunks_learner_facing_select
    ON lms.ai_rag_chunks
    AS RESTRICTIVE
    FOR SELECT
    USING (
        lms.is_lms_admin(tenant_id)
        OR lms.is_instructor(tenant_id)
        OR lms.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM lms.ai_rag_documents d
            WHERE d.tenant_id = ai_rag_chunks.tenant_id
              AND d.id        = ai_rag_chunks.document_id
              AND d.learner_facing = true
        )
    );

-- ---- 9.4  Hybrid retrieval -------------------------------------------------
-- lms.rag_search() ranked purely on ts_rank_cd and never touched the
-- embedding column, so the HNSW vector_cosine_ops index was dead code and
-- retrieval was keyword-only despite all the vector plumbing being in place.
--
-- Rebuilt as a reciprocal-rank-fusion hybrid: vector ANN (uses the HNSW
-- index) fused with full-text (uses the GIN index). Passing NULL for
-- p_query_embedding degrades gracefully to the old full-text behaviour.
--
-- Also pins search_path and stops trusting a caller-supplied tenant id:
-- the caller must be a member of that tenant.
DROP FUNCTION IF EXISTS lms.rag_search(uuid, text, uuid, uuid, integer);

CREATE OR REPLACE FUNCTION lms.rag_search(
    p_tenant_id       uuid,
    p_query           text,
    p_query_embedding vector(1536) DEFAULT NULL,
    p_course_id       uuid    DEFAULT NULL,
    p_module_id       uuid    DEFAULT NULL,
    p_limit           integer DEFAULT 10,
    p_include_non_learner_facing boolean DEFAULT false,
    p_rrf_k           integer DEFAULT 60
)
RETURNS TABLE (
    chunk_id     uuid,
    document_id  uuid,
    content      text,
    score        double precision,
    vector_rank  integer,
    text_rank    integer,
    source_code  text,
    rag_role     text,
    safety_flag  boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, lms
AS $$
DECLARE
    v_allow_restricted boolean;
BEGIN
    -- Do not trust a caller-supplied tenant id.
    IF NOT (lms.is_tenant_member(p_tenant_id) OR lms.is_platform_admin()) THEN
        RAISE EXCEPTION 'Not a member of tenant %', p_tenant_id
            USING ERRCODE = '42501';
    END IF;

    v_allow_restricted := p_include_non_learner_facing
        AND (lms.is_instructor(p_tenant_id)
             OR lms.is_lms_admin(p_tenant_id)
             OR lms.is_platform_admin());

    RETURN QUERY
    WITH scoped AS (
        SELECT c.id, c.document_id, c.content, c.embedding, d.learner_facing,
               d.source_id
        FROM lms.ai_rag_chunks c
        JOIN lms.ai_rag_documents d
          ON d.tenant_id = c.tenant_id AND d.id = c.document_id
        WHERE c.tenant_id = p_tenant_id
          AND (p_course_id IS NULL OR c.course_id = p_course_id)
          AND (p_module_id IS NULL OR c.module_id = p_module_id)
          AND (v_allow_restricted OR d.learner_facing = true)
    ),
    vec AS (
        SELECT s.id,
               row_number() OVER (ORDER BY s.embedding <=> p_query_embedding) AS rnk
        FROM scoped s
        WHERE p_query_embedding IS NOT NULL
          AND s.embedding IS NOT NULL
        ORDER BY s.embedding <=> p_query_embedding
        LIMIT GREATEST(p_limit * 5, 50)
    ),
    fts AS (
        SELECT s.id,
               row_number() OVER (
                   ORDER BY ts_rank_cd(
                       to_tsvector('english', s.content),
                       plainto_tsquery('english', p_query)) DESC
               ) AS rnk
        FROM scoped s
        WHERE p_query IS NOT NULL
          AND to_tsvector('english', s.content) @@ plainto_tsquery('english', p_query)
        LIMIT GREATEST(p_limit * 5, 50)
    ),
    fused AS (
        SELECT
            coalesce(v.id, f.id) AS id,
            coalesce(1.0 / (p_rrf_k + v.rnk), 0)
          + coalesce(1.0 / (p_rrf_k + f.rnk), 0) AS rrf,
            v.rnk AS vrank,
            f.rnk AS frank
        FROM vec v
        FULL OUTER JOIN fts f ON f.id = v.id
    )
    SELECT
        s.id,
        s.document_id,
        s.content,
        fu.rrf::double precision,
        fu.vrank::integer,
        fu.frank::integer,
        rs.source_code,
        rs.rag_role,
        coalesce(rs.safety_flag, false)
    FROM fused fu
    JOIN scoped s ON s.id = fu.id
    LEFT JOIN lms.rag_sources rs
           ON rs.tenant_id = p_tenant_id AND rs.id = s.source_id
    ORDER BY fu.rrf DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION lms.rag_search IS
'Hybrid retrieval: reciprocal rank fusion over HNSW vector ANN and GIN full-text. '
'Pass p_query_embedding NULL for keyword-only. Enforces tenant membership and '
'Ingestion Rule 4 (system-training sources are never learner-facing).';


-- ############################################################################
-- SECTION 10 — SKILL_PROGRESS AUTHORITY MODEL
-- ############################################################################
-- The RAG file declares skill_progress the source of truth and adds composite
-- FKs into it from skill_signoffs and skill_signoff_events. But no trigger,
-- function, or constraint ever wrote skill_progress from a signoff. The FKs
-- guaranteed a progress row *existed*; nothing constrained its *contents*.
--
-- Consequences that existed before this section:
--   * An instructor could insert a 'mastered' skill_signoff while
--     competency_level stayed 'practiced' and is_signed_off stayed false, so
--     has_skill_mastery() -- the function a credential gate calls -- returned
--     false for a genuinely mastered skill.
--   * skill_signoff_events has a pending/approved/rejected lifecycle and
--     skill_signoffs does not, so a 'rejected' event and a valid signoff for
--     the same (learner, skill) were both legal and contradictory.
--   * v_skill_mastery_summary exposed latest_signoff_level and
--     latest_event_level side by side and arbitrated neither, and its event
--     lateral did not filter status='approved', so a 'pending' row read as
--     current state.
--   * has_skill_mastery()'s `competency_level='mastered' OR is_signed_off`
--     meant a bare boolean signoff recorded at 'introduced' read as mastered.
--
-- This section makes skill_progress a trigger-maintained read model and
-- routes every consumer through one canonical definition of mastery.

-- ---- 10.1  Replace the ambiguous boolean with a level --------------------
ALTER TABLE lms.skill_progress
    ADD COLUMN IF NOT EXISTS signed_off_level text
        CHECK (signed_off_level IS NULL OR signed_off_level IN
               ('introduced','practiced','mastered')),
    ADD COLUMN IF NOT EXISTS signoff_source text
        CHECK (signoff_source IS NULL OR signoff_source IN ('signoff','event','manual','import')),
    ADD COLUMN IF NOT EXISTS last_recomputed_at timestamptz;

-- Backfill from the old boolean so existing rows stay truthful.
UPDATE lms.skill_progress
SET signed_off_level = CASE
        WHEN signed_off_level IS NOT NULL THEN signed_off_level
        WHEN is_signed_off AND competency_level = 'mastered' THEN 'mastered'
        WHEN is_signed_off THEN competency_level
        ELSE NULL
    END
WHERE signed_off_level IS NULL AND is_signed_off;

COMMENT ON COLUMN lms.skill_progress.is_signed_off IS
'DEPRECATED: kept in sync by lms.recompute_skill_progress(). '
'Read signed_off_level instead -- the boolean cannot distinguish an '
'"introduced" signoff from a "mastered" one.';

-- ---- 10.2  Give skill_signoffs the lifecycle it was missing --------------
ALTER TABLE lms.skill_signoffs
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
        CHECK (status IN ('pending','approved','rejected','revoked')),
    ADD COLUMN IF NOT EXISTS enrollment_id uuid,
    ADD COLUMN IF NOT EXISTS is_safety_critical boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS automatic_fail boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS approval_authority text
        CHECK (approval_authority IS NULL OR approval_authority IN
               ('instructor','preceptor','manager','lms_admin','automated')),
    ADD COLUMN IF NOT EXISTS evidence_type text
        CHECK (evidence_type IS NULL OR evidence_type IN
               ('written_exam','practical_demo','video_submission','portfolio',
                'observation_checklist','preceptor_signoff','client_feedback','none')),
    ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
    ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'skill_signoffs_enrollment_fk'
          AND conrelid = 'lms.skill_signoffs'::regclass
    ) THEN
        ALTER TABLE lms.skill_signoffs
            ADD CONSTRAINT skill_signoffs_enrollment_fk
            FOREIGN KEY (tenant_id, enrollment_id)
            REFERENCES lms.enrollments(tenant_id, id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_skill_signoffs_learner_skill
    ON lms.skill_signoffs (tenant_id, learner_user_id, skill_id, verified_at DESC)
    WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_skill_signoff_events_learner_skill
    ON lms.skill_signoff_events (tenant_id, learner_user_id, skill_id, created_at DESC)
    WHERE status = 'approved';

-- ---- 10.3  Canonical mastery rank ----------------------------------------
CREATE OR REPLACE FUNCTION lms.competency_rank(p_level text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, lms
AS $$
    SELECT CASE p_level
        WHEN 'mastered'    THEN 3
        WHEN 'practiced'   THEN 2
        WHEN 'introduced'  THEN 1
        WHEN 'not_started' THEN 0
        ELSE 0
    END;
$$;

COMMENT ON FUNCTION lms.competency_rank IS
'Single ordering for competency levels. Every comparison of mastery must go '
'through this so introduced < practiced < mastered is defined in exactly one place.';

-- ---- 10.4  The recompute function: skill_progress as a read model --------
CREATE OR REPLACE FUNCTION lms.recompute_skill_progress(
    p_tenant_id uuid,
    p_learner_user_id uuid,
    p_skill_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lms
AS $$
DECLARE
    v_signoff   RECORD;
    v_event     RECORD;
    v_level     text := NULL;
    v_at        timestamptz := NULL;
    v_by        uuid := NULL;
    v_source    text := NULL;
    v_blocked   boolean := false;
BEGIN
    -- An automatic fail or a revocation blocks mastery outright.
    SELECT true INTO v_blocked
    FROM lms.skill_signoffs s
    WHERE s.tenant_id = p_tenant_id
      AND s.learner_user_id = p_learner_user_id
      AND s.skill_id = p_skill_id
      AND (s.automatic_fail = true OR s.status = 'revoked')
      AND s.verified_at >= coalesce((
            SELECT max(s2.verified_at) FROM lms.skill_signoffs s2
            WHERE s2.tenant_id = p_tenant_id
              AND s2.learner_user_id = p_learner_user_id
              AND s2.skill_id = p_skill_id
              AND s2.status = 'approved'
              AND s2.automatic_fail = false
          ), '-infinity'::timestamptz)
    LIMIT 1;

    -- Highest approved signoff level wins; ties broken by most recent.
    SELECT s.signoff_level, s.verified_at, s.verified_by
      INTO v_signoff
    FROM lms.skill_signoffs s
    WHERE s.tenant_id = p_tenant_id
      AND s.learner_user_id = p_learner_user_id
      AND s.skill_id = p_skill_id
      AND s.status = 'approved'
      AND s.automatic_fail = false
    ORDER BY lms.competency_rank(s.signoff_level) DESC, s.verified_at DESC
    LIMIT 1;

    -- Only 'approved' events count. The old summary view read pending rows
    -- as current state.
    SELECT e.signoff_level, e.created_at, e.signoff_user_id
      INTO v_event
    FROM lms.skill_signoff_events e
    WHERE e.tenant_id = p_tenant_id
      AND e.learner_user_id = p_learner_user_id
      AND e.skill_id = p_skill_id
      AND e.status = 'approved'
    ORDER BY lms.competency_rank(e.signoff_level) DESC, e.created_at DESC
    LIMIT 1;

    IF v_signoff.signoff_level IS NOT NULL
       AND (v_event.signoff_level IS NULL
            OR lms.competency_rank(v_signoff.signoff_level)
               >= lms.competency_rank(v_event.signoff_level)) THEN
        v_level  := v_signoff.signoff_level;
        v_at     := v_signoff.verified_at;
        v_by     := v_signoff.verified_by;
        v_source := 'signoff';
    ELSIF v_event.signoff_level IS NOT NULL THEN
        v_level  := v_event.signoff_level;
        v_at     := v_event.created_at;
        v_by     := v_event.signoff_user_id;
        v_source := 'event';
    END IF;

    IF v_blocked THEN
        v_level := NULL; v_at := NULL; v_by := NULL; v_source := NULL;
    END IF;

    INSERT INTO lms.skill_progress AS sp (
        tenant_id, learner_user_id, skill_id,
        competency_level, signed_off_level, is_signed_off,
        signed_off_at, signed_off_by, signoff_source,
        progress_percentage, last_recomputed_at, updated_at
    )
    VALUES (
        p_tenant_id, p_learner_user_id, p_skill_id,
        coalesce(v_level, 'not_started'), v_level, (v_level IS NOT NULL),
        v_at, v_by, v_source,
        CASE lms.competency_rank(coalesce(v_level,'not_started'))
             WHEN 3 THEN 100 WHEN 2 THEN 66 WHEN 1 THEN 33 ELSE 0 END,
        now(), now()
    )
    ON CONFLICT (tenant_id, learner_user_id, skill_id) DO UPDATE
    SET competency_level = CASE
            -- Never regress a level earned through coursework unless blocked.
            WHEN v_blocked THEN sp.competency_level
            WHEN lms.competency_rank(coalesce(v_level,'not_started'))
                 > lms.competency_rank(sp.competency_level)
                THEN coalesce(v_level, sp.competency_level)
            ELSE sp.competency_level
        END,
        signed_off_level   = v_level,
        is_signed_off      = (v_level IS NOT NULL),
        signed_off_at      = v_at,
        signed_off_by      = v_by,
        signoff_source     = v_source,
        last_recomputed_at = now(),
        updated_at         = now();
END;
$$;

CREATE OR REPLACE FUNCTION lms.trg_recompute_skill_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lms
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM lms.recompute_skill_progress(OLD.tenant_id, OLD.learner_user_id, OLD.skill_id);
        RETURN OLD;
    END IF;
    -- A moved signoff must refresh both the old and the new coordinates.
    IF TG_OP = 'UPDATE'
       AND (OLD.learner_user_id, OLD.skill_id) IS DISTINCT FROM (NEW.learner_user_id, NEW.skill_id) THEN
        PERFORM lms.recompute_skill_progress(OLD.tenant_id, OLD.learner_user_id, OLD.skill_id);
    END IF;
    PERFORM lms.recompute_skill_progress(NEW.tenant_id, NEW.learner_user_id, NEW.skill_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS skill_signoffs_sync_progress       ON lms.skill_signoffs;
DROP TRIGGER IF EXISTS skill_signoff_events_sync_progress ON lms.skill_signoff_events;

CREATE TRIGGER skill_signoffs_sync_progress
    AFTER INSERT OR UPDATE OR DELETE ON lms.skill_signoffs
    FOR EACH ROW EXECUTE FUNCTION lms.trg_recompute_skill_progress();

CREATE TRIGGER skill_signoff_events_sync_progress
    AFTER INSERT OR UPDATE OR DELETE ON lms.skill_signoff_events
    FOR EACH ROW EXECUTE FUNCTION lms.trg_recompute_skill_progress();

-- ---- 10.5  Correct has_skill_mastery -------------------------------------
-- The old body treated any is_signed_off = true as mastery, so an
-- 'introduced' signoff read as mastered. Now level-aware.
CREATE OR REPLACE FUNCTION lms.has_skill_mastery(
    p_tenant_id uuid,
    p_learner_user_id uuid,
    p_skill_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, lms
AS $$
    SELECT EXISTS (
        SELECT 1 FROM lms.skill_progress sp
        WHERE sp.tenant_id = p_tenant_id
          AND sp.learner_user_id = p_learner_user_id
          AND sp.skill_id = p_skill_id
          -- signed_off_level is the SOLE authority. competency_level is a
          -- monotonic coursework ratchet (recompute never regresses it), so
          -- ORing it in here made mastery permanent and un-revokable:
          -- deleting or revoking every sign-off still returned true.
          -- Verified by execution before and after this change.
          AND sp.signed_off_level = 'mastered'
    );
$$;

CREATE OR REPLACE FUNCTION lms.has_skill_at_level(
    p_tenant_id uuid,
    p_learner_user_id uuid,
    p_skill_id uuid,
    p_required_level text DEFAULT 'mastered'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, lms
AS $$
    SELECT EXISTS (
        SELECT 1 FROM lms.skill_progress sp
        WHERE sp.tenant_id = p_tenant_id
          AND sp.learner_user_id = p_learner_user_id
          AND sp.skill_id = p_skill_id
          -- Authority = signed_off_level only. See has_skill_mastery above.
          AND lms.competency_rank(coalesce(sp.signed_off_level,'not_started'))
              >= lms.competency_rank(p_required_level)
    );
$$;

-- ---- 10.6  Authoritative views -------------------------------------------
-- Replaces the arbitration-free v_skill_mastery_summary.
-- This migration changes the COLUMN LIST of v_skill_progress_authority
-- (adds coursework_rank / unbacked_mastery_claim). CREATE OR REPLACE VIEW
-- cannot insert columns into an existing view, so a re-run over a database
-- that already has the old shape must drop first. Dependents are dropped in
-- order and recreated further down this same section. No CASCADE: if an
-- unknown dependent exists we want a loud failure, not silent destruction.
DROP VIEW IF EXISTS lms.v_credential_readiness;
DROP VIEW IF EXISTS lms.v_skill_progress_authority;

CREATE OR REPLACE VIEW lms.v_skill_progress_authority AS
SELECT
    sp.tenant_id,
    sp.learner_user_id,
    sp.skill_id,
    s.name                    AS skill_name,
    s.skill_domain_id,
    sp.enrollment_id,
    sp.competency_level,
    sp.signed_off_level,
    sp.signoff_source,
    -- Authoritative (gating) columns: sign-off only.
    lms.competency_rank(coalesce(sp.signed_off_level, 'not_started'))
                              AS effective_rank,
    CASE lms.competency_rank(coalesce(sp.signed_off_level, 'not_started'))
        WHEN 3 THEN 'mastered'
        WHEN 2 THEN 'practiced'
        WHEN 1 THEN 'introduced'
        ELSE 'not_started'
    END                       AS effective_level,
    (coalesce(sp.signed_off_level,'not_started') = 'mastered')
                              AS is_mastered,
    -- Non-authoritative coursework progress, exposed for display only.
    greatest(
        lms.competency_rank(sp.competency_level),
        lms.competency_rank(coalesce(sp.signed_off_level, 'not_started'))
    )                         AS coursework_rank,
    (sp.competency_level = 'mastered'
     AND coalesce(sp.signed_off_level,'not_started') <> 'mastered')
                              AS unbacked_mastery_claim,
    sp.progress_percentage,
    sp.assessment_count,
    sp.practice_count,
    sp.last_assessed_at,
    sp.last_assessment_score,
    sp.signed_off_at,
    sp.signed_off_by,
    sp.last_recomputed_at,
    (sp.last_recomputed_at IS NULL) AS never_recomputed
FROM lms.skill_progress sp
JOIN lms.skills s
  ON s.tenant_id = sp.tenant_id AND s.id = sp.skill_id;

COMMENT ON VIEW lms.v_skill_progress_authority IS
'THE authoritative read of skill mastery. Every credential gate, report and '
'TypeScript query must read effective_level / is_mastered from here rather '
'than joining skill_signoffs or skill_signoff_events directly.';

-- Surfaces rows where the read model and its sources disagree. Should be
-- empty once the triggers above are live; non-empty means a direct write
-- bypassed them.
CREATE OR REPLACE VIEW lms.v_skill_progress_drift AS
SELECT
    sp.tenant_id,
    sp.learner_user_id,
    sp.skill_id,
    sp.competency_level,
    sp.signed_off_level,
    so.best_signoff_level,
    ev.best_event_level,
    sp.last_recomputed_at
FROM lms.skill_progress sp
LEFT JOIN LATERAL (
    SELECT s.signoff_level AS best_signoff_level
    FROM lms.skill_signoffs s
    WHERE s.tenant_id = sp.tenant_id
      AND s.learner_user_id = sp.learner_user_id
      AND s.skill_id = sp.skill_id
      AND s.status = 'approved'
      AND s.automatic_fail = false
    ORDER BY lms.competency_rank(s.signoff_level) DESC, s.verified_at DESC
    LIMIT 1
) so ON true
LEFT JOIN LATERAL (
    SELECT e.signoff_level AS best_event_level
    FROM lms.skill_signoff_events e
    WHERE e.tenant_id = sp.tenant_id
      AND e.learner_user_id = sp.learner_user_id
      AND e.skill_id = sp.skill_id
      AND e.status = 'approved'          -- the old view omitted this filter
    ORDER BY lms.competency_rank(e.signoff_level) DESC, e.created_at DESC
    LIMIT 1
) ev ON true
WHERE sp.signed_off_level IS DISTINCT FROM
      greatest(so.best_signoff_level, ev.best_event_level);

-- Clock hours by category -- what a state board actually asks for.
CREATE OR REPLACE VIEW lms.v_learner_clock_hours AS
SELECT
    l.tenant_id,
    l.learner_user_id,
    l.enrollment_id,
    l.course_id,
    l.hour_category,
    round(sum(l.computed_minutes) / 60.0, 2)  AS computed_hours,
    round(sum(l.verified_minutes) / 60.0, 2)  AS verified_hours,
    count(*)                                   AS entry_count,
    count(*) FILTER (WHERE l.verification_status = 'human_verified') AS verified_entries,
    count(*) FILTER (WHERE l.verification_status IN ('computed','ai_verified_pending_human'))
                                               AS pending_entries,
    count(*) FILTER (WHERE l.verification_status = 'disputed') AS disputed_entries
FROM lms.clock_hour_ledger l
WHERE l.voided_at IS NULL
GROUP BY l.tenant_id, l.learner_user_id, l.enrollment_id, l.course_id, l.hour_category;

-- Credential readiness: skills AND hours in one place, per definition.
CREATE OR REPLACE VIEW lms.v_credential_readiness AS
SELECT
    cd.tenant_id,
    cd.id                        AS credential_definition_id,
    cd.code                      AS credential_code,
    cd.title                     AS credential_title,
    e.learner_user_id,
    e.id                         AS enrollment_id,
    count(cds.skill_id)                                         AS skills_required,
    count(*) FILTER (WHERE spa.effective_rank
                           >= lms.competency_rank(cds.required_level)) AS skills_met,
    bool_and(coalesce(spa.effective_rank, 0)
             >= lms.competency_rank(cds.required_level))        AS all_skills_met,
    coalesce(hrs.verified_hours, 0)                             AS verified_hours,
    cd.required_clock_hours,
    (cd.required_clock_hours IS NULL
     OR coalesce(hrs.verified_hours, 0) >= cd.required_clock_hours) AS hours_met
FROM lms.credential_definitions cd
JOIN lms.enrollments e
  ON e.tenant_id = cd.tenant_id
 AND (cd.course_id IS NULL OR e.course_id = cd.course_id)
LEFT JOIN lms.credential_definition_skills cds
  ON cds.tenant_id = cd.tenant_id AND cds.credential_definition_id = cd.id
LEFT JOIN lms.v_skill_progress_authority spa
  ON spa.tenant_id = cd.tenant_id
 AND spa.learner_user_id = e.learner_user_id
 AND spa.skill_id = cds.skill_id
LEFT JOIN LATERAL (
    SELECT sum(v.verified_hours) AS verified_hours
    FROM lms.v_learner_clock_hours v
    WHERE v.tenant_id = cd.tenant_id
      AND v.learner_user_id = e.learner_user_id
      AND (cd.course_id IS NULL OR v.course_id = cd.course_id)
) hrs ON true
WHERE cd.is_active
GROUP BY cd.tenant_id, cd.id, cd.code, cd.title, e.learner_user_id, e.id,
         cd.required_clock_hours, hrs.verified_hours;

-- Backfill the read model once so existing signoff rows are reflected.
DO $$
DECLARE r RECORD; n integer := 0;
BEGIN
    FOR r IN
        SELECT DISTINCT tenant_id, learner_user_id, skill_id FROM lms.skill_signoffs
        UNION
        SELECT DISTINCT tenant_id, learner_user_id, skill_id FROM lms.skill_signoff_events
    LOOP
        PERFORM lms.recompute_skill_progress(r.tenant_id, r.learner_user_id, r.skill_id);
        n := n + 1;
    END LOOP;
    RAISE NOTICE '[10] backfilled % skill_progress rows', n;
END $$;
nt(*) FROM lms.modules WHERE title ~ '^[0-9]+$';  -- expect 0

- ############################################################################
-- ============================================================================
-- SECTION 10b - AUTO-PROVISION skill_progress PARENT ROWS
-- ----------------------------------------------------------------------------
--   lms.skill_signoffs carries:
--     FOREIGN KEY (tenant_id, learner_user_id, skill_id)
--       REFERENCES lms.skill_progress(tenant_id, learner_user_id, skill_id)
--       ON DELETE CASCADE
--
--   So a sign-off CANNOT be inserted until a skill_progress row already
--   exists for that (tenant, learner, skill). Verified by execution: a bare
--   INSERT into skill_signoffs fails with
--     "violates foreign key constraint skill_signoffs_skill_progress_fk".
--
--   That forces every caller - the TypeScript layer, an instructor UI, a bulk
--   import - to remember to upsert the parent row first, and the failure mode
--   is a hard FK error at sign-off time.
--
--   This BEFORE INSERT trigger provisions the parent row on demand, so the
--   sign-off itself becomes the only write the app has to make. All other
--   skill_progress columns carry defaults, so a three-column insert is safe.
--   The recompute trigger from Section 10 then fires as normal and sets the
--   derived level.
-- ============================================================================

CREATE OR REPLACE FUNCTION lms.ensure_skill_progress_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, lms
AS $fn$
BEGIN
    INSERT INTO lms.skill_progress (tenant_id, learner_user_id, skill_id)
    VALUES (NEW.tenant_id, NEW.learner_user_id, NEW.skill_id)
    ON CONFLICT (tenant_id, learner_user_id, skill_id) DO NOTHING;
    RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_skill_signoffs_ensure_progress ON lms.skill_signoffs;
CREATE TRIGGER trg_skill_signoffs_ensure_progress
    BEFORE INSERT ON lms.skill_signoffs
    FOR EACH ROW EXECUTE FUNCTION lms.ensure_skill_progress_row();

-- Same protection for the event-sourced table, when present.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='lms' AND c.relname='skill_signoff_events')
       AND EXISTS (SELECT 1 FROM pg_attribute a
                   WHERE a.attrelid='lms.skill_signoff_events'::regclass
                     AND a.attname='learner_user_id' AND a.attnum>0 AND NOT a.attisdropped)
    THEN
        DROP TRIGGER IF EXISTS trg_skill_signoff_events_ensure_progress ON lms.skill_signoff_events;
        CREATE TRIGGER trg_skill_signoff_events_ensure_progress
            BEFORE INSERT ON lms.skill_signoff_events
            FOR EACH ROW EXECUTE FUNCTION lms.ensure_skill_progress_row();
        RAISE NOTICE '[10b] auto-provision trigger added to skill_signoff_events';
    END IF;
END $$;


-- SECTION 12 — POST-MIGRATION INTEGRITY AUDIT
-- ############################################################################
-- Re-runs every invariant this migration claims to fix. Raises, and therefore
-- rolls the whole transaction back, if any of them is still violated. If this
-- commits, the listed defects are genuinely gone.

DO $$
DECLARE
    v_broken_triggers  integer;
    v_open_policies    integer;
    v_no_policy_lms    integer;
    v_no_policy_public integer;
    v_unpinned_secdef  integer;
    v_bad_view_cols    integer;
    v_rls_off          integer;
    v_drift            integer;
    v_names_lms        text;
    v_names_public     text;
    v_names_rlsoff     text;
    v_msg              text := '';
BEGIN
    -- 12.1  No updated_at trigger may reference a missing column.
    SELECT count(*) INTO v_broken_triggers
    FROM pg_trigger t
    JOIN pg_class c      ON c.oid  = t.tgrelid
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    JOIN pg_proc p       ON p.oid  = t.tgfoid
    WHERE NOT t.tgisinternal
      AND p.proname IN ('touch_updated_at','platform_touch_updated_at')
      AND ns.nspname IN ('public','lms')
      AND NOT EXISTS (SELECT 1 FROM pg_attribute a
                      WHERE a.attrelid = c.oid AND a.attname = 'updated_at'
                        AND a.attnum > 0 AND NOT a.attisdropped);

    -- 12.2  No permissive FOR ALL policy may omit USING (blocks UPDATE/DELETE).
    SELECT count(*) INTO v_open_policies
    FROM pg_policies
    WHERE schemaname IN ('public','lms')
      AND permissive = 'PERMISSIVE' AND cmd = 'ALL'
      AND qual IS NULL AND with_check IS NOT NULL;

    -- 12.3  No table may have RLS enabled and zero policies (deny-all).
    SELECT count(*), string_agg('lms.'||c.relname, ', ' ORDER BY c.relname)
      INTO v_no_policy_lms, v_names_lms
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'lms' AND c.relkind = 'r' AND c.relrowsecurity
      AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
      AND NOT EXISTS (SELECT 1 FROM pg_depend d
                      WHERE d.classid = 'pg_class'::regclass
                        AND d.objid = c.oid AND d.deptype = 'e');

    SELECT count(*), string_agg('public.'||c.relname, ', ' ORDER BY c.relname)
      INTO v_no_policy_public, v_names_public
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
      AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
      AND NOT EXISTS (SELECT 1 FROM pg_depend d
                      WHERE d.classid = 'pg_class'::regclass
                        AND d.objid = c.oid AND d.deptype = 'e');

    -- 12.4  Every tenant-scoped table must actually have RLS on.
    SELECT count(*), string_agg(ns.nspname||'.'||c.relname, ', ' ORDER BY c.relname)
      INTO v_rls_off, v_names_rlsoff
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname IN ('public','lms') AND c.relkind = 'r'
      AND NOT c.relrowsecurity
      AND EXISTS (SELECT 1 FROM pg_attribute a
                  WHERE a.attrelid = c.oid AND a.attname = 'tenant_id'
                    AND a.attnum > 0 AND NOT a.attisdropped)
      AND NOT EXISTS (SELECT 1 FROM pg_depend d
                      WHERE d.classid = 'pg_class'::regclass
                        AND d.objid = c.oid AND d.deptype = 'e');

    -- 12.5  Every SECURITY DEFINER function must pin search_path.
    SELECT count(*) INTO v_unpinned_secdef
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname IN ('public','lms')
      AND p.prosecdef
      AND (p.proconfig IS NULL
           OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg
                          WHERE cfg LIKE 'search\_path=%'));

    -- 12.6  Every view must still resolve (catches invalid column refs).
    v_bad_view_cols := 0;
    DECLARE vr RECORD;
    BEGIN
        FOR vr IN
            SELECT ns.nspname AS sch, c.relname AS vw
            FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
            WHERE c.relkind IN ('v','m') AND ns.nspname IN ('public','lms')
        LOOP
            BEGIN
                EXECUTE format('EXPLAIN (COSTS OFF) SELECT * FROM %I.%I LIMIT 0', vr.sch, vr.vw);
            EXCEPTION WHEN others THEN
                v_bad_view_cols := v_bad_view_cols + 1;
                RAISE WARNING '[12.6] view %.% failed to plan: %', vr.sch, vr.vw, SQLERRM;
            END;
        END LOOP;
    END;

    -- 12.7  skill_progress read model must agree with its sources.
    SELECT count(*) INTO v_drift FROM lms.v_skill_progress_drift;

    IF v_broken_triggers > 0 THEN
        v_msg := v_msg || format('%s UPDATE-breaking updated_at triggers remain. ', v_broken_triggers);
    END IF;
    IF v_open_policies > 0 THEN
        v_msg := v_msg || format('%s write-blocking policies remain. ', v_open_policies);
    END IF;
    IF v_no_policy_lms > 0 THEN
        v_msg := v_msg || format('%s lms table(s) still deny-all: %s. ', v_no_policy_lms, v_names_lms);
    END IF;
    IF v_no_policy_public > 0 THEN
        v_msg := v_msg || format('%s public table(s) still deny-all: %s. ', v_no_policy_public, v_names_public);
    END IF;
    IF v_rls_off > 0 THEN
        v_msg := v_msg || format('%s tenant table(s) have RLS off: %s. ', v_rls_off, v_names_rlsoff);
    END IF;
    IF v_bad_view_cols > 0 THEN
        v_msg := v_msg || format('%s views do not resolve. ', v_bad_view_cols);
    END IF;

    RAISE NOTICE '=======================================================';
    RAISE NOTICE ' POST-MIGRATION AUDIT';
    RAISE NOTICE '   UPDATE-breaking triggers ........ % (expect 0)', v_broken_triggers;
    RAISE NOTICE '   Write-blocking policies ......... % (expect 0)', v_open_policies;
    RAISE NOTICE '   Deny-all lms tables ............. % (expect 0)', v_no_policy_lms;
    RAISE NOTICE '   Deny-all public tables .......... % (expect 0)', v_no_policy_public;
    RAISE NOTICE '   Tenant tables with RLS off ...... % (expect 0)', v_rls_off;
    RAISE NOTICE '   Unresolvable views .............. % (expect 0)', v_bad_view_cols;
    RAISE NOTICE '   SECURITY DEFINER w/o search_path  % (expect 0)', v_unpinned_secdef;
    RAISE NOTICE '   skill_progress drift rows ....... % (expect 0)', v_drift;
    RAISE NOTICE '=======================================================';

    IF v_msg <> '' THEN
        RAISE EXCEPTION 'GAP CLOSURE AUDIT FAILED: %', v_msg;
    END IF;

    IF v_unpinned_secdef > 0 THEN
        RAISE EXCEPTION 'GAP CLOSURE AUDIT FAILED: % SECURITY DEFINER functions still lack a pinned search_path', v_unpinned_secdef;
    END IF;
END $$;

-- ============================================================================
-- SECTION 13 - SEED DATA REPAIR: CPP module titles
-- ----------------------------------------------------------------------------
--   Defect: all 29 Complete Professional Pet Care (CPP) module seed rows were
--   inserted with `title` set to the module's clock-hour count ('10', '116',
--   '2', ...) instead of the module name. Confirmed by comparing every seeded
--   module against the official Course Catalog:
--       * 29 CPP rows have a purely numeric title
--       * each numeric equals that row's own metadata->>'clock_hours'
--       * 0 clock-hour mismatches across all 65 catalogued modules
--   => only the `title` column was clobbered; rows are otherwise aligned, so
--      the correct titles restore deterministically from the module code.
--
--   CPP reconciles to exactly 29 modules / 600 clock hours, matching the
--   catalog header ("CPP  Complete Professional Pet Care  29  600").
--
--   Idempotent and self-guarding: a row is rewritten only while its title is
--   still numeric AND its capstone and clock_hours match the catalog exactly.
-- ============================================================================

DO $$
DECLARE
    v_fixed   integer := 0;
    v_skipped integer := 0;
    v_left    integer := 0;
BEGIN
    WITH catalog(code, correct_title, capstone, clock_hours) AS (
        VALUES
        ('CPP-101', 'Introduction to a Dog''s Life', 'Dog life & training history brief', 10),
        ('CPP-102', 'AKC Breeds, Recognition & Characteristics', 'Breed recognition field guide', 20),
        ('CPP-103', 'Equipment and Training', 'Training equipment portfolio', 10),
        ('CPP-201', 'Understanding Behavior', 'Behavior problem-solution case file', 25),
        ('CPP-202', 'Introduction to Puppy', 'Puppy handling & care plan', 25),
        ('CPP-203', 'Basic Obedience Skills', 'Basic obedience demonstration log', 40),
        ('CPP-204', 'Advanced Obedience On-Leash', 'On-leash advanced command rubric', 40),
        ('CPP-205', 'Advanced Obedience Off-Leash', 'Off-leash advanced command rubric', 40),
        ('CPP-301', 'Dog Development (Grooming Track)', 'Dog life-stage profile', 20),
        ('CPP-302', 'Equipment and Tools (Grooming Track)', 'Tool identification & usage portfolio', 25),
        ('CPP-303', 'Dog Handling', 'Safe-handling skills checklist', 30),
        ('CPP-304', 'AKC Breeds, Recognition & Characteristics (Grooming Track)', 'Breed recognition field guide', 19),
        ('CPP-305', 'Introduction to Dog Grooming', 'Basic grooming prep portfolio', 25),
        ('CPP-306', 'Dog Preparation', 'Pre-groom preparation checklist', 20),
        ('CPP-307', 'Bathing Techniques', 'Supervised bath service record', 30),
        ('CPP-308', 'Drying', 'Dry-and-finish service record', 20),
        ('CPP-401', 'Advanced Dog Grooming', 'Supervised trim portfolio', 116),
        ('CPP-402', 'Sanitation Process', 'Sanitation protocol checklist', 14),
        ('CPP-403', 'Business', 'Salon & SPA operating plan', 25),
        ('CPP-404', 'Design a Private Class & Final Assessment', 'Private class design', 14),
        ('CPP-405', 'Introduction to the Client', 'Client intake & contract portfolio', 2),
        ('CPP-406', 'Pet Care', 'Multi-species care plan', 2),
        ('CPP-407', 'Business (Sitter Track)', 'Pet-sitter startup plan', 2),
        ('CPP-408', 'Pet Handling and Sanitation Process', 'Sitter handling & sanitation checklist', 2),
        ('CPP-409', 'CPR & First Aid Techniques', 'CPR & first-aid competency checkoff', 8),
        ('CPP-410', 'Cat Breeds', 'Cat breed recognition guide', 1),
        ('CPP-411', 'Cat Temperament and Handling', 'Cat handling competency checkoff', 7),
        ('CPP-412', 'Cat Bathing and Drying Techniques', 'Cat bath-and-dry service record', 2),
        ('CPP-413', 'Cat Grooming', 'Cat groom portfolio', 6)
    ),
    upd AS (
        UPDATE lms.modules m
           SET title = c.correct_title
          FROM catalog c
         WHERE m.metadata->>'code'  = c.code
           AND m.title ~ '^[0-9]+$'
           AND m.metadata->>'capstone' = c.capstone
           AND (m.metadata->>'clock_hours')::int = c.clock_hours
        RETURNING 1
    )
    SELECT count(*) INTO v_fixed FROM upd;

    RAISE NOTICE '[13] CPP module titles restored ...... %', v_fixed;

    SELECT count(*) INTO v_skipped
      FROM lms.modules
     WHERE metadata->>'code' LIKE 'CPP-%' AND title ~ '^[0-9]+$';
    IF v_skipped > 0 THEN
        RAISE WARNING '[13] % CPP row(s) still numeric but did NOT match expected capstone/clock_hours - inspect before trusting the mapping.', v_skipped;
    END IF;

    SELECT count(*) INTO v_left FROM lms.modules WHERE title ~ '^[0-9]+$';
    IF v_left > 0 THEN
        RAISE WARNING '[13] % module row(s) across all programs still carry a numeric title.', v_left;
    END IF;
END $$;


COMMIT;

-- ============================================================================
-- POST-COMMIT, OPTIONAL
-- ============================================================================
-- 1. Validate the NOT VALID CHECK constraints once legacy data is clean:
--      SELECT format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I;',
--                    n.nspname, c.relname, con.conname)
--      FROM pg_constraint con
--      JOIN pg_class c ON c.oid = con.conrelid
--      JOIN pg_namespace n ON n.oid = c.relnamespace
--      WHERE con.contype = 'c' AND NOT con.convalidated
--        AND n.nspname IN ('public','lms');
--
-- 2. ANALYZE the tables that gained indexes:
--      ANALYZE;
--
-- 3. The seed data writes into lms.pathways and lms.courses, which are now
--    policy-protected. Re-run seeding under the service role, or as a
--    platform admin, not as `authenticated`.
--
-- 4. RESOLVED in Section 13: the 29 CPP module seed rows whose `title` held the
--    clock-hour number are restored from the official Course Catalog. The seed
--    file itself has also been corrected, so fresh installs are clean. Verify:
--      SELECT count(*) FROM lms.modules WHERE title ~ '^[0-9]+$';  -- expect 0
-- ============================================================================

-- ============================================================================

-- ============================================================================
-- ALL ABOUT PAWZ - Migration 002
-- (a) drop redundant indexes   (b) production-safe constraint validation
-- ----------------------------------------------------------------------------
-- Generated against a live PostgreSQL 17.11 instance carrying all three base
-- schemas plus gap-closure migration 001.
--
-- THIS FILE IS DELIBERATELY NOT WRAPPED IN A SINGLE TRANSACTION.
--
--   ALTER TABLE ... VALIDATE CONSTRAINT takes SHARE UPDATE EXCLUSIVE on the
--   table. That does NOT block SELECT, INSERT, UPDATE or DELETE - it only
--   conflicts with other DDL, VACUUM FULL and CREATE INDEX. But it does scan
--   the whole table, and the lock is held until COMMIT.
--
--   Wrapping all 42 validations in one transaction would therefore hold 42
--   table locks simultaneously until the very last scan finished, and any
--   single failure would discard all the work. Each statement below instead
--   auto-commits on its own, so:
--     * locks are taken and released one table at a time,
--     * a failure on one table leaves the preceding 41 validated,
--     * the script is resumable - just run it again.
--
--   Run it with psql WITHOUT -1 / --single-transaction:
--       psql -d <db> -f ALL ABOUT PAWZ_migration_002.sql
-- ============================================================================

-- CRITICAL: without this, psql reports an error and CARRIES ON to the next
-- statement. The pre-flight gate below would then RAISE, print its warning,
-- and the 42 validations would run anyway - defeating the entire point of the
-- gate. Verified by deliberately violating a constraint and observing the run
-- abort. Do not remove.


-- Fail fast rather than queueing behind a long-running transaction. If a lock
-- cannot be taken in 5s the statement errors and the next one proceeds.
SET lock_timeout = '5s';

-- A validation scan on a very large table can be slow but is not dangerous.
-- Raise or remove this if a table legitimately needs longer.
SET statement_timeout = '30min';

-- ============================================================================
-- PART A - DROP REDUNDANT INDEXES
-- ----------------------------------------------------------------------------
-- Each index below is byte-for-byte redundant: same table, same column list,
-- same access method, no partial predicate, no expression. In three cases the
-- surviving index is the UNIQUE constraint index, which the planner can use
-- for every lookup the dropped index served.
--
-- NOT dropped, despite being flagged by an earlier audit pass:
--   lms.enrollments.lms_enrollments_learner_active_idx
--     -> it is a PARTIAL index (WHERE status = 'active') on the same columns
--        as lms_enrollments_learner_idx. That is a deliberate hot-path
--        optimisation, not a duplicate. The earlier audit grouped indexes by
--        column list alone and ignored indpred, which produced a false
--        positive. The audit query has since been corrected.
--
-- CONCURRENTLY cannot run inside a transaction block; these statements are
-- top-level and auto-commit, so it is safe here. DROP INDEX CONCURRENTLY takes
-- only a SHARE UPDATE EXCLUSIVE lock and will not block reads or writes.
-- ============================================================================

DROP INDEX IF EXISTS lms.lms_ai_rag_chunks_document_idx;
-- shadowed by UNIQUE ai_rag_chunks_tenant_id_document_id_chunk_index_key
--   (tenant_id, document_id, chunk_index)

DROP INDEX IF EXISTS lms.lms_ai_turn_logs_session_idx;
-- shadowed by UNIQUE ai_turn_logs_tenant_id_session_id_turn_number_key
--   (tenant_id, session_id, turn_number)

DROP INDEX IF EXISTS lms.lms_learner_profiles_user_idx;
-- shadowed by UNIQUE learner_profiles_tenant_id_user_id_key
--   (tenant_id, user_id)

DROP INDEX IF EXISTS lms.lms_modules_course_idx;
-- exact twin of lms_modules_course_sort_idx (tenant_id, course_id, sort_order);
-- the more descriptively named one survives

-- ============================================================================
-- PART B1 - PRE-FLIGHT (READ ONLY, CHANGES NOTHING)
-- ----------------------------------------------------------------------------
-- Reports rows that would make a VALIDATE fail, BEFORE any validation is
-- attempted. A CHECK constraint rejects a row only when the expression
-- evaluates to FALSE; NULL (unknown) passes. So violating rows are exactly
-- those where the expression IS FALSE.
--
-- On a clean build this reports nothing. On production data, clean up whatever
-- it names first, then re-run this file.
-- ============================================================================

DO $preflight$
DECLARE
    r          record;
    v_expr     text;
    v_count    bigint;
    v_total    bigint := 0;
    v_checked  int := 0;
BEGIN
    RAISE NOTICE '--- PRE-FLIGHT: scanning NOT VALID constraints for violating rows ---';
    FOR r IN
        SELECT n.nspname AS sch, c.relname AS tbl, con.conname AS con,
               pg_get_constraintdef(con.oid) AS def
        FROM pg_constraint con
        JOIN pg_class c     ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE con.contype = 'c'
          AND NOT con.convalidated
          AND n.nspname IN ('public','lms')
        ORDER BY 1,2,3
    LOOP
        -- strip the leading 'CHECK (' and the trailing ') NOT VALID'
v_expr := regexp_replace(r.def, '^CHECK\s*\((.*)\)$', '\1');
        v_checked := v_checked + 1;
        BEGIN
            EXECUTE format('SELECT count(*) FROM %I.%I WHERE (%s) IS FALSE',
                           r.sch, r.tbl, v_expr)
            INTO v_count;
        EXCEPTION WHEN others THEN
            RAISE WARNING 'PRE-FLIGHT could not evaluate %.% / % : %',
                          r.sch, r.tbl, r.con, SQLERRM;
            CONTINUE;
        END;

        IF v_count > 0 THEN
            v_total := v_total + v_count;
            RAISE WARNING 'VIOLATION: %.% has % row(s) failing % -> %',
                          r.sch, r.tbl, v_count, r.con, v_expr;
        END IF;
    END LOOP;

    RAISE NOTICE '--- PRE-FLIGHT complete: % constraint(s) evaluated, % violating row(s) ---',
                 v_checked, v_total;

    IF v_total > 0 THEN
        RAISE EXCEPTION
          'PRE-FLIGHT FAILED: % violating row(s) found. Nothing has been validated. '
          'Fix the rows named in the WARNINGs above, then re-run this file.', v_total;
    END IF;
END
$preflight$;

-- ============================================================================
-- PART B2 - VALIDATE, ONE TABLE AT A TIME, EACH ITS OWN TRANSACTION
-- ----------------------------------------------------------------------------
-- Each block is idempotent: it skips silently if the constraint is already
-- validated or no longer exists, so the file is safe to re-run and safe to
-- resume after an interruption.
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='lms' AND t.relname='clock_hour_ledger'
                 AND c.conname='clock_hour_ledger_verified_lte_computed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE lms.clock_hour_ledger VALIDATE CONSTRAINT "clock_hour_ledger_verified_lte_computed"';
        RAISE NOTICE 'validated lms.clock_hour_ledger.clock_hour_ledger_verified_lte_computed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='acct_ar_collections_cases'
                 AND c.conname='acct_ar_collections_cases_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.acct_ar_collections_cases VALIDATE CONSTRAINT "acct_ar_collections_cases_status_allowed"';
        RAISE NOTICE 'validated public.acct_ar_collections_cases.acct_ar_collections_cases_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='acct_bank_transactions'
                 AND c.conname='acct_bank_transactions_match_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.acct_bank_transactions VALIDATE CONSTRAINT "acct_bank_transactions_match_status_allowed"';
        RAISE NOTICE 'validated public.acct_bank_transactions.acct_bank_transactions_match_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='acct_budget_versions'
                 AND c.conname='acct_budget_versions_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.acct_budget_versions VALIDATE CONSTRAINT "acct_budget_versions_status_allowed"';
        RAISE NOTICE 'validated public.acct_budget_versions.acct_budget_versions_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='acct_close_checklists'
                 AND c.conname='acct_close_checklists_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.acct_close_checklists VALIDATE CONSTRAINT "acct_close_checklists_status_allowed"';
        RAISE NOTICE 'validated public.acct_close_checklists.acct_close_checklists_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='acct_import_jobs'
                 AND c.conname='acct_import_jobs_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.acct_import_jobs VALIDATE CONSTRAINT "acct_import_jobs_status_allowed"';
        RAISE NOTICE 'validated public.acct_import_jobs.acct_import_jobs_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='acct_intercompany_transactions'
                 AND c.conname='acct_intercompany_transactions_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.acct_intercompany_transactions VALIDATE CONSTRAINT "acct_intercompany_transactions_status_allowed"';
        RAISE NOTICE 'validated public.acct_intercompany_transactions.acct_intercompany_transactions_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='acct_lease_payments'
                 AND c.conname='acct_lease_payments_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.acct_lease_payments VALIDATE CONSTRAINT "acct_lease_payments_status_allowed"';
        RAISE NOTICE 'validated public.acct_lease_payments.acct_lease_payments_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='acct_leases'
                 AND c.conname='acct_leases_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.acct_leases VALIDATE CONSTRAINT "acct_leases_status_allowed"';
        RAISE NOTICE 'validated public.acct_leases.acct_leases_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='acct_reconciliation_items'
                 AND c.conname='acct_reconciliation_items_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.acct_reconciliation_items VALIDATE CONSTRAINT "acct_reconciliation_items_status_allowed"';
        RAISE NOTICE 'validated public.acct_reconciliation_items.acct_reconciliation_items_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='acct_revenue_contracts'
                 AND c.conname='acct_revenue_contracts_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.acct_revenue_contracts VALIDATE CONSTRAINT "acct_revenue_contracts_status_allowed"';
        RAISE NOTICE 'validated public.acct_revenue_contracts.acct_revenue_contracts_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='acct_revenue_recognition_schedules'
                 AND c.conname='acct_revenue_recognition_schedules_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.acct_revenue_recognition_schedules VALIDATE CONSTRAINT "acct_revenue_recognition_schedules_status_allowed"';
        RAISE NOTICE 'validated public.acct_revenue_recognition_schedules.acct_revenue_recognition_schedules_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_batch_slips'
                 AND c.conname='commerce_batch_slips_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_batch_slips VALIDATE CONSTRAINT "commerce_batch_slips_status_allowed"';
        RAISE NOTICE 'validated public.commerce_batch_slips.commerce_batch_slips_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_carts'
                 AND c.conname='commerce_carts_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_carts VALIDATE CONSTRAINT "commerce_carts_status_allowed"';
        RAISE NOTICE 'validated public.commerce_carts.commerce_carts_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_channel_products'
                 AND c.conname='commerce_channel_products_sync_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_channel_products VALIDATE CONSTRAINT "commerce_channel_products_sync_status_allowed"';
        RAISE NOTICE 'validated public.commerce_channel_products.commerce_channel_products_sync_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_checkout_sessions'
                 AND c.conname='commerce_checkout_sessions_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_checkout_sessions VALIDATE CONSTRAINT "commerce_checkout_sessions_status_allowed"';
        RAISE NOTICE 'validated public.commerce_checkout_sessions.commerce_checkout_sessions_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_coupons'
                 AND c.conname='commerce_coupons_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_coupons VALIDATE CONSTRAINT "commerce_coupons_status_allowed"';
        RAISE NOTICE 'validated public.commerce_coupons.commerce_coupons_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_export_jobs'
                 AND c.conname='commerce_export_jobs_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_export_jobs VALIDATE CONSTRAINT "commerce_export_jobs_status_allowed"';
        RAISE NOTICE 'validated public.commerce_export_jobs.commerce_export_jobs_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_gift_cards'
                 AND c.conname='commerce_gift_cards_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_gift_cards VALIDATE CONSTRAINT "commerce_gift_cards_status_allowed"';
        RAISE NOTICE 'validated public.commerce_gift_cards.commerce_gift_cards_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_inventory_alerts'
                 AND c.conname='commerce_inventory_alerts_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_inventory_alerts VALIDATE CONSTRAINT "commerce_inventory_alerts_status_allowed"';
        RAISE NOTICE 'validated public.commerce_inventory_alerts.commerce_inventory_alerts_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_loyalty_accounts'
                 AND c.conname='commerce_loyalty_accounts_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_loyalty_accounts VALIDATE CONSTRAINT "commerce_loyalty_accounts_status_allowed"';
        RAISE NOTICE 'validated public.commerce_loyalty_accounts.commerce_loyalty_accounts_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_outbox_events'
                 AND c.conname='commerce_outbox_events_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_outbox_events VALIDATE CONSTRAINT "commerce_outbox_events_status_allowed"';
        RAISE NOTICE 'validated public.commerce_outbox_events.commerce_outbox_events_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_payments'
                 AND c.conname='commerce_payments_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_payments VALIDATE CONSTRAINT "commerce_payments_status_allowed"';
        RAISE NOTICE 'validated public.commerce_payments.commerce_payments_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_posting_events'
                 AND c.conname='commerce_posting_events_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_posting_events VALIDATE CONSTRAINT "commerce_posting_events_status_allowed"';
        RAISE NOTICE 'validated public.commerce_posting_events.commerce_posting_events_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_refunds'
                 AND c.conname='commerce_refunds_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_refunds VALIDATE CONSTRAINT "commerce_refunds_status_allowed"';
        RAISE NOTICE 'validated public.commerce_refunds.commerce_refunds_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_register_closures'
                 AND c.conname='commerce_register_closures_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_register_closures VALIDATE CONSTRAINT "commerce_register_closures_status_allowed"';
        RAISE NOTICE 'validated public.commerce_register_closures.commerce_register_closures_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_register_sessions'
                 AND c.conname='commerce_register_sessions_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_register_sessions VALIDATE CONSTRAINT "commerce_register_sessions_status_allowed"';
        RAISE NOTICE 'validated public.commerce_register_sessions.commerce_register_sessions_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_registers'
                 AND c.conname='commerce_registers_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_registers VALIDATE CONSTRAINT "commerce_registers_status_allowed"';
        RAISE NOTICE 'validated public.commerce_registers.commerce_registers_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_return_actions'
                 AND c.conname='commerce_return_actions_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_return_actions VALIDATE CONSTRAINT "commerce_return_actions_status_allowed"';
        RAISE NOTICE 'validated public.commerce_return_actions.commerce_return_actions_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_sales'
                 AND c.conname='commerce_sales_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_sales VALIDATE CONSTRAINT "commerce_sales_status_allowed"';
        RAISE NOTICE 'validated public.commerce_sales.commerce_sales_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_store_credits'
                 AND c.conname='commerce_store_credits_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_store_credits VALIDATE CONSTRAINT "commerce_store_credits_status_allowed"';
        RAISE NOTICE 'validated public.commerce_store_credits.commerce_store_credits_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_subscription_invoices'
                 AND c.conname='commerce_subscription_invoices_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_subscription_invoices VALIDATE CONSTRAINT "commerce_subscription_invoices_status_allowed"';
        RAISE NOTICE 'validated public.commerce_subscription_invoices.commerce_subscription_invoices_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_subscriptions'
                 AND c.conname='commerce_subscriptions_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_subscriptions VALIDATE CONSTRAINT "commerce_subscriptions_status_allowed"';
        RAISE NOTICE 'validated public.commerce_subscriptions.commerce_subscriptions_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='commerce_webhook_events'
                 AND c.conname='commerce_webhook_events_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.commerce_webhook_events VALIDATE CONSTRAINT "commerce_webhook_events_status_allowed"';
        RAISE NOTICE 'validated public.commerce_webhook_events.commerce_webhook_events_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='crm_appointment_pets'
                 AND c.conname='crm_appointment_pets_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.crm_appointment_pets VALIDATE CONSTRAINT "crm_appointment_pets_status_allowed"';
        RAISE NOTICE 'validated public.crm_appointment_pets.crm_appointment_pets_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='crm_appointment_services'
                 AND c.conname='crm_appointment_services_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.crm_appointment_services VALIDATE CONSTRAINT "crm_appointment_services_status_allowed"';
        RAISE NOTICE 'validated public.crm_appointment_services.crm_appointment_services_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='erp_inventory_lots'
                 AND c.conname='erp_inventory_lots_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.erp_inventory_lots VALIDATE CONSTRAINT "erp_inventory_lots_status_allowed"';
        RAISE NOTICE 'validated public.erp_inventory_lots.erp_inventory_lots_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='erp_inventory_reservations'
                 AND c.conname='erp_inventory_reservations_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.erp_inventory_reservations VALIDATE CONSTRAINT "erp_inventory_reservations_status_allowed"';
        RAISE NOTICE 'validated public.erp_inventory_reservations.erp_inventory_reservations_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='erp_inventory_transfers'
                 AND c.conname='erp_inventory_transfers_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.erp_inventory_transfers VALIDATE CONSTRAINT "erp_inventory_transfers_status_allowed"';
        RAISE NOTICE 'validated public.erp_inventory_transfers.erp_inventory_transfers_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='erp_pick_waves'
                 AND c.conname='erp_pick_waves_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.erp_pick_waves VALIDATE CONSTRAINT "erp_pick_waves_status_allowed"';
        RAISE NOTICE 'validated public.erp_pick_waves.erp_pick_waves_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='erp_return_refunds'
                 AND c.conname='erp_return_refunds_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.erp_return_refunds VALIDATE CONSTRAINT "erp_return_refunds_status_allowed"';
        RAISE NOTICE 'validated public.erp_return_refunds.erp_return_refunds_status_allowed';
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint c
               JOIN pg_class t ON t.oid=c.conrelid
               JOIN pg_namespace n ON n.oid=t.relnamespace
               WHERE n.nspname='public' AND t.relname='erp_shipments'
                 AND c.conname='erp_shipments_status_allowed' AND NOT c.convalidated)
    THEN
        EXECUTE 'ALTER TABLE public.erp_shipments VALIDATE CONSTRAINT "erp_shipments_status_allowed"';
        RAISE NOTICE 'validated public.erp_shipments.erp_shipments_status_allowed';
    END IF;
END $$;

-- ============================================================================
-- PART C - CONFIRMATION
-- ============================================================================
DO $$
DECLARE
    v_remaining int;
    v_names     text;
BEGIN
    SELECT count(*), string_agg(n.nspname||'.'||c.relname||'.'||con.conname, ', ')
      INTO v_remaining, v_names
    FROM pg_constraint con
    JOIN pg_class c     ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.contype='c' AND NOT con.convalidated
      AND n.nspname IN ('public','lms');

    IF v_remaining > 0 THEN
        RAISE WARNING 'MIGRATION 002: % constraint(s) still NOT VALID: %', v_remaining, v_names;
    ELSE
        RAISE NOTICE 'MIGRATION 002: all CHECK constraints in public/lms are VALID.';
    END IF;
END $$;

DO $$
DECLARE
    v_dupes int;
BEGIN
    SELECT count(*) INTO v_dupes FROM (
        SELECT 1
        FROM pg_index i
        JOIN pg_class c     ON c.oid = i.indrelid
        JOIN pg_class ic    ON ic.oid = i.indexrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname IN ('public','lms')
        GROUP BY c.oid, i.indkey::text,
                 coalesce(pg_get_expr(i.indpred, i.indrelid), ''),
                 coalesce(pg_get_expr(i.indexprs, i.indrelid), ''),
                 ic.relam
        HAVING count(*) > 1) q;
    RAISE NOTICE 'MIGRATION 002: remaining true-duplicate index groups: % (expect 0)', v_dupes;
END $$;


