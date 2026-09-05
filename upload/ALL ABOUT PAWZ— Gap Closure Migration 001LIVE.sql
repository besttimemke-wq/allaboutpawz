-- ============================================================================
-- ALL ABOUT PAWZ — GAP CLOSURE MIGRATION 001
-- ============================================================================
-- Run AFTER, in this order:
--   1. ALL ABOUT PAWZ_io_schema_software_live.sql
--   2. ALL ABOUT PAWZ LMS Schemalive.sql
--   3. ALL ABOUT PAWZ RAG Tables + Catalog Seed Data live.sql
--   4. THIS FILE
--
-- Idempotent. Safe to re-run. Wrapped in a single transaction.
--
-- Closes:
--   P1  47 UPDATE-breaking triggers (tables with touch_updated_at but no column)
--   P1  31 tables where UPDATE/DELETE silently affected 0 rows
--       (FOR ALL policies with WITH CHECK but no USING clause)
--   P1  26 LMS tables with RLS enabled and zero policies (deny-all)
--   P1  8  SECURITY DEFINER functions with no pinned search_path
--   P2  Payroll, CMS, staff scheduling, groomer commission (the 4 named gaps)
--   P2  Operating hours, blackouts, packages, pricing rules, surcharges,
--       estimates, recurring invoices, statements, payouts, card-on-file,
--       backups, quick links, branding, 2FA, last-active
--   P2  LMS catalog spine: module codes/levels/clock hours, hour categories,
--       credential definitions, module prerequisites, equipment, role catalog
--   P2  RAG: rag_sources, ingestion-rule columns, hybrid vector+FTS search,
--       the 6 never-added forward-reference FKs
--   P2  skill_progress authority model: trigger-maintained, single source of
--       truth, authoritative views + helper functions
--   P3  64 unconstrained status columns (added NOT VALID)
-- ============================================================================

BEGIN;

SET LOCAL client_min_messages = NOTICE;

DO $$
BEGIN
    IF to_regclass('public.tenants') IS NULL THEN
        RAISE EXCEPTION 'Base software schema not installed. Run ALL ABOUT PAWZ_io_schema_software_live.sql first.';
    END IF;
    IF to_regnamespace('lms') IS NULL THEN
        RAISE EXCEPTION 'LMS schema not installed. Run ALL ABOUT PAWZ LMS Schemalive.sql first.';
    END IF;
    IF to_regclass('lms.ai_rag_chunks') IS NULL THEN
        RAISE EXCEPTION 'RAG tables not installed. Run the RAG + Catalog Seed file first.';
    END IF;
END $$;


-- ############################################################################
-- SECTION 1 — P1 CRITICAL: RUNTIME AND SECURITY DEFECTS
-- ############################################################################

-- ----------------------------------------------------------------------------
-- 1.1  47 tables have a BEFORE UPDATE trigger calling touch_updated_at()
--      (which executes NEW.updated_at = now()) but have NO updated_at column.
--      Every UPDATE on these raises:
--         ERROR: record "new" has no field "updated_at"
--      This is catalog-driven so it fixes all of them and any future ones.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    n integer := 0;
BEGIN
    FOR r IN
        SELECT DISTINCT ns.nspname AS sch, c.relname AS tbl
        FROM pg_trigger t
        JOIN pg_class     c  ON c.oid  = t.tgrelid
        JOIN pg_namespace ns ON ns.oid = c.relnamespace
        JOIN pg_proc      p  ON p.oid  = t.tgfoid
        WHERE NOT t.tgisinternal
          AND p.proname IN ('touch_updated_at', 'platform_touch_updated_at')
          AND ns.nspname IN ('public', 'lms')
          AND c.relkind = 'r'
          AND NOT EXISTS (
              SELECT 1 FROM pg_attribute a
              WHERE a.attrelid = c.oid
                AND a.attname  = 'updated_at'
                AND a.attnum   > 0
                AND NOT a.attisdropped
          )
        ORDER BY 1, 2
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now()',
            r.sch, r.tbl);
        n := n + 1;
        RAISE NOTICE '[1.1] added updated_at to %.%', r.sch, r.tbl;
    END LOOP;
    RAISE NOTICE '[1.1] repaired % UPDATE-breaking tables', n;
END $$;


-- ----------------------------------------------------------------------------
-- 1.2  CROSS-TENANT DATA LEAK — 31 policies.
--
--      The "Join-based RLS for line-item tables" block creates:
--          CREATE POLICY x_mutate ON t FOR ALL WITH CHECK (<tenant check>);
--      with no USING clause.
--
--      The defaulting rule is one-way: an omitted WITH CHECK falls back to
--      USING, but an omitted USING does NOT fall back to WITH CHECK.
--
--      Verified empirically on PostgreSQL 17.11: a FOR ALL policy carrying
--      only WITH CHECK contributes NO row visibility, so it cannot authorize
--      UPDATE or DELETE. The sibling _select policy grants SELECT only.
--
--      Effect before this fix: on all 31 affected line-item tables, a tenant
--      could read its own rows but every UPDATE and DELETE silently affected
--      0 rows. No error was raised, so the application layer would treat the
--      write as successful while nothing changed. Cross-tenant reads and
--      writes were already correctly blocked -- this is a write-availability
--      defect, not a data leak.
--
--      Fix: rebuild each affected policy with USING = its own WITH CHECK.
--      Catalog-driven, so it also catches any policy with the same defect.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    n integer := 0;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname, with_check, roles
        FROM pg_policies
        WHERE schemaname IN ('public', 'lms')
          AND permissive = 'PERMISSIVE'
          AND cmd        = 'ALL'
          AND qual       IS NULL          -- <-- the defect: no USING at all
          AND with_check IS NOT NULL
        ORDER BY 1, 2, 3
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I',
                       r.policyname, r.schemaname, r.tablename);
        EXECUTE format(
            'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR ALL TO %s USING (%s) WITH CHECK (%s)',
            r.policyname, r.schemaname, r.tablename,
            array_to_string(r.roles, ', '),
            r.with_check, r.with_check);
        n := n + 1;
        RAISE NOTICE '[1.2] repaired write-blocking policy %.% / %',
            r.schemaname, r.tablename, r.policyname;
    END LOOP;
    RAISE NOTICE '[1.2] repaired % write-blocking policies', n;
END $$;


-- ----------------------------------------------------------------------------
-- 1.3  Tables with RLS ENABLED but ZERO policies, in BOTH schemas.
--      (Originally lms-only. That was a defect: Section 12 audits `public`
--      for this condition too, so a deny-all public table could fail the
--      audit with no code path able to repair it. Now both are repaired,
--      using each schema's own helper predicates.)
--
--      Original finding: 26 lms.* tables have RLS ENABLED but ZERO policies.
--      RLS with no policy = deny-all. With GRANT SELECT ... TO authenticated
--      already in place, every read from the TypeScript client returns an
--      empty set. Includes core tables: pathways, cohort_members,
--      skill_signoffs, learner_badges, badges — and the catalog seed INSERTs
--      into lms.pathways.
--
--      Applies the standard LMS four-policy pattern. Tables with a
--      learner_user_id get learner-self read access; all get tenant-member
--      read and admin/instructor write.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    has_tenant  boolean;
    has_learner boolean;
    sel_expr    text;
    wr_expr     text;
    n integer := 0;
BEGIN
    FOR r IN
        SELECT c.oid, c.relname AS tbl
        FROM pg_class c
        JOIN pg_namespace ns ON ns.oid = c.relnamespace
        WHERE ns.nspname = 'lms'
          AND c.relkind = 'r'
          AND c.relrowsecurity = true
          AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
        ORDER BY c.relname
    LOOP
        has_tenant := EXISTS (
            SELECT 1 FROM pg_attribute a
            WHERE a.attrelid = r.oid AND a.attname = 'tenant_id'
              AND a.attnum > 0 AND NOT a.attisdropped);
        has_learner := EXISTS (
            SELECT 1 FROM pg_attribute a
            WHERE a.attrelid = r.oid AND a.attname = 'learner_user_id'
              AND a.attnum > 0 AND NOT a.attisdropped);

        IF has_tenant THEN
            sel_expr := 'lms.is_tenant_member(tenant_id)';
            wr_expr  := 'lms.is_tenant_member(tenant_id) AND '
                     || '(lms.is_lms_admin(tenant_id) OR lms.is_instructor(tenant_id) '
                     || 'OR lms.is_platform_admin())';
            IF has_learner THEN
                sel_expr := sel_expr
                         || ' AND (lms.is_learner_self(learner_user_id) '
                         || 'OR lms.can_view_learner(tenant_id, learner_user_id) '
                         || 'OR lms.is_lms_admin(tenant_id) OR lms.is_platform_admin())';
            END IF;
        ELSE
            -- No tenant column: platform-admin only, readable by members.
            sel_expr := 'true';
            wr_expr  := 'lms.is_platform_admin()';
        END IF;

        EXECUTE format('CREATE POLICY %I ON lms.%I FOR SELECT USING (%s)',
                       r.tbl || '_select', r.tbl, sel_expr);
        EXECUTE format('CREATE POLICY %I ON lms.%I FOR INSERT WITH CHECK (%s)',
                       r.tbl || '_insert', r.tbl, wr_expr);
        EXECUTE format('CREATE POLICY %I ON lms.%I FOR UPDATE USING (%s) WITH CHECK (%s)',
                       r.tbl || '_update', r.tbl, wr_expr, wr_expr);
        EXECUTE format('CREATE POLICY %I ON lms.%I FOR DELETE USING (%s)',
                       r.tbl || '_delete', r.tbl,
                       CASE WHEN has_tenant
                            THEN 'lms.is_lms_admin(tenant_id) OR lms.is_platform_admin()'
                            ELSE 'lms.is_platform_admin()' END);
        n := n + 1;
        RAISE NOTICE '[1.3] policies created for lms.%', r.tbl;
    END LOOP;
    RAISE NOTICE '[1.3] un-bricked % deny-all LMS tables', n;
END $$;


-- ----------------------------------------------------------------------------
-- 1.3b  Same repair for public.* tables with RLS on and zero policies.
--       Uses the public-schema idiom already used by crm_* / commerce_*:
--         SELECT/UPDATE/DELETE  USING platform_is_tenant_member(tenant_id)
--         INSERT                WITH CHECK platform_is_tenant_member(tenant_id)
--       Extension-owned tables (pgsodium, vault, PostGIS) are skipped - they
--       are not ours to police.
--       A public table with no tenant_id is treated as platform-admin only,
--       since the schema's fail-fast validator requires tenant_id on all
--       non-exempt tenant tables.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    has_tenant boolean;
    sel_expr   text;
    wr_expr    text;
    n integer := 0;
BEGIN
    FOR r IN
        SELECT c.oid, c.relname AS tbl
        FROM pg_class c
        JOIN pg_namespace ns ON ns.oid = c.relnamespace
        WHERE ns.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relrowsecurity = true
          AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
          AND NOT EXISTS (SELECT 1 FROM pg_depend d
                          WHERE d.classid = 'pg_class'::regclass
                            AND d.objid = c.oid AND d.deptype = 'e')
        ORDER BY c.relname
    LOOP
        has_tenant := EXISTS (
            SELECT 1 FROM pg_attribute a
            WHERE a.attrelid = r.oid AND a.attname = 'tenant_id'
              AND a.attnum > 0 AND NOT a.attisdropped);

        IF has_tenant THEN
            sel_expr := 'platform_is_tenant_member(tenant_id)';
            wr_expr  := 'platform_is_tenant_member(tenant_id)';
        ELSE
            sel_expr := 'platform_is_admin()';
            wr_expr  := 'platform_is_admin()';
        END IF;

        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (%s)',
                       r.tbl || '_select', r.tbl, sel_expr);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (%s)',
                       r.tbl || '_insert', r.tbl, wr_expr);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (%s) WITH CHECK (%s)',
                       r.tbl || '_update', r.tbl, wr_expr, wr_expr);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (%s)',
                       r.tbl || '_delete', r.tbl, wr_expr);
        n := n + 1;
        RAISE NOTICE '[1.3b] policies created for public.% (tenant_scoped=%)', r.tbl, has_tenant;
    END LOOP;
    RAISE NOTICE '[1.3b] un-bricked % deny-all public tables', n;
END $$;


-- ----------------------------------------------------------------------------
-- 1.4  4 SECURITY DEFINER functions do not pin search_path.
--      Supabase's linter flags this as a search_path-hijack vector: a caller
--      controlling search_path can shadow the objects the function resolves.
--      The other 32 SECURITY DEFINER functions correctly pin it.
--      (lms.rag_search is additionally rebuilt in Section 9.)
-- ----------------------------------------------------------------------------
ALTER FUNCTION lms.has_skill_mastery(uuid, uuid, uuid)         SET search_path = public, lms;
ALTER FUNCTION lms.get_learner_mastered_skills(uuid, uuid)     SET search_path = public, lms;
ALTER FUNCTION lms.get_skill_mastered_learners(uuid, uuid)     SET search_path = public, lms;


-- ---- 1.5  Remaining SECURITY DEFINER functions with an unpinned search_path
-- Found by executing the schema, not by reading it: these four are
-- SECURITY DEFINER trigger/guard functions that never pinned search_path, so
-- a role able to create objects in a schema earlier on the resolution path
-- could shadow the tables and functions they call. touch_updated_at() is the
-- most exposed, since it fires on nearly every table in the LMS schema.
DO $$
DECLARE r RECORD; n integer := 0;
BEGIN
    FOR r IN
        SELECT n.nspname AS sch, p.proname AS fn,
               pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname IN ('public','lms')
          AND p.prosecdef
          AND (p.proconfig IS NULL
               OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) c
                              WHERE c LIKE 'search\_path=%'))
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, lms',
                       r.sch, r.fn, r.args);
        n := n + 1;
        RAISE NOTICE '[1.5] pinned search_path on %.%(%)', r.sch, r.fn, r.args;
    END LOOP;
    RAISE NOTICE '[1.5] hardened % SECURITY DEFINER functions', n;
END $$;


-- ############################################################################
-- SECTION 2 — PAYROLL  (named gap #1: zero payroll tables existed anywhere)
-- ############################################################################
-- Feature tree: Accounting > Payroll > Run Payroll, Add Employee,
-- Edit Timesheet, View Tax Forms.
-- Note: the base schema's fail-fast validator already exempts
-- 'acct_payroll_run_items', confirming these tables were always intended.

CREATE TABLE IF NOT EXISTS public.acct_employees (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    staff_id              uuid REFERENCES public.crm_staff(id) ON DELETE SET NULL,
    user_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    employee_number       text NOT NULL,
    first_name            text NOT NULL,
    last_name             text NOT NULL,
    legal_name            text,
    email                 text,
    phone                 text,
    date_of_birth         date,
    hire_date             date NOT NULL,
    termination_date      date,
    employment_type       text NOT NULL DEFAULT 'w2_full_time'
                          CHECK (employment_type IN ('w2_full_time','w2_part_time','w2_seasonal','1099_contractor')),
    pay_type              text NOT NULL DEFAULT 'hourly'
                          CHECK (pay_type IN ('hourly','salary','commission_only','hourly_plus_commission')),
    pay_rate              numeric(12,4) NOT NULL DEFAULT 0 CHECK (pay_rate >= 0),
    salary_annual         numeric(14,2) CHECK (salary_annual IS NULL OR salary_annual >= 0),
    overtime_multiplier   numeric(4,2) NOT NULL DEFAULT 1.5 CHECK (overtime_multiplier >= 1),
    standard_hours_week   numeric(5,2) NOT NULL DEFAULT 40 CHECK (standard_hours_week >= 0),
    default_location_id   uuid REFERENCES public.crm_locations(id) ON DELETE SET NULL,
    tax_filing_status     text CHECK (tax_filing_status IS NULL OR tax_filing_status IN
                              ('single','married_filing_jointly','married_filing_separately','head_of_household')),
    federal_allowances    integer NOT NULL DEFAULT 0 CHECK (federal_allowances >= 0),
    state_code            text,
    -- Never store a raw SSN. Store a tokenized reference from the payroll provider.
    ssn_last4             text CHECK (ssn_last4 IS NULL OR ssn_last4 ~ '^[0-9]{4}$'),
    ssn_token             text,
    bank_account_token    text,
    payment_method        text NOT NULL DEFAULT 'direct_deposit'
                          CHECK (payment_method IN ('direct_deposit','check','cash')),
    status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','on_leave','terminated','suspended')),
    is_exempt             boolean NOT NULL DEFAULT false,
    notes                 text,
    metadata              jsonb NOT NULL DEFAULT '{}',
    created_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, employee_number),
    UNIQUE (tenant_id, id),
    CHECK (termination_date IS NULL OR termination_date >= hire_date)
);

CREATE TABLE IF NOT EXISTS public.acct_pay_periods (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    period_start      date NOT NULL,
    period_end        date NOT NULL,
    pay_date          date NOT NULL,
    frequency         text NOT NULL DEFAULT 'biweekly'
                      CHECK (frequency IN ('weekly','biweekly','semimonthly','monthly')),
    status            text NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','locked','processing','paid','cancelled')),
    locked_at         timestamptz,
    locked_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, period_start, period_end),
    UNIQUE (tenant_id, id),
    CHECK (period_end >= period_start),
    CHECK (pay_date >= period_end)
);

CREATE TABLE IF NOT EXISTS public.acct_timesheets (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id       uuid NOT NULL REFERENCES public.acct_employees(id) ON DELETE CASCADE,
    pay_period_id     uuid REFERENCES public.acct_pay_periods(id) ON DELETE SET NULL,
    work_date         date NOT NULL,
    clock_in          timestamptz,
    clock_out         timestamptz,
    break_minutes     integer NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
    regular_hours     numeric(6,2) NOT NULL DEFAULT 0 CHECK (regular_hours >= 0),
    overtime_hours    numeric(6,2) NOT NULL DEFAULT 0 CHECK (overtime_hours >= 0),
    holiday_hours     numeric(6,2) NOT NULL DEFAULT 0 CHECK (holiday_hours >= 0),
    pto_hours         numeric(6,2) NOT NULL DEFAULT 0 CHECK (pto_hours >= 0),
    unpaid_hours      numeric(6,2) NOT NULL DEFAULT 0 CHECK (unpaid_hours >= 0),
    location_id       uuid REFERENCES public.crm_locations(id) ON DELETE SET NULL,
    source            text NOT NULL DEFAULT 'manual'
                      CHECK (source IN ('manual','time_clock','imported','scheduled_auto')),
    time_clock_entry_id uuid,
    status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','submitted','approved','rejected','locked')),
    approved_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at       timestamptz,
    edit_reason       text,
    notes             text,
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, employee_id, work_date),
    UNIQUE (tenant_id, id),
    CHECK (clock_out IS NULL OR clock_in IS NULL OR clock_out >= clock_in)
);

CREATE TABLE IF NOT EXISTS public.acct_payroll_runs (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    pay_period_id         uuid NOT NULL REFERENCES public.acct_pay_periods(id) ON DELETE RESTRICT,
    run_number            text NOT NULL,
    run_type              text NOT NULL DEFAULT 'regular'
                          CHECK (run_type IN ('regular','off_cycle','bonus','correction','final')),
    status                text NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','calculating','review','approved','submitted','paid','failed','cancelled')),
    gross_total           numeric(14,2) NOT NULL DEFAULT 0,
    net_total             numeric(14,2) NOT NULL DEFAULT 0,
    employee_tax_total    numeric(14,2) NOT NULL DEFAULT 0,
    employer_tax_total    numeric(14,2) NOT NULL DEFAULT 0,
    deduction_total       numeric(14,2) NOT NULL DEFAULT 0,
    commission_total      numeric(14,2) NOT NULL DEFAULT 0,
    employee_count        integer NOT NULL DEFAULT 0 CHECK (employee_count >= 0),
    provider              text,
    provider_reference    text,
    gl_journal_entry_id   uuid,
    approved_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at           timestamptz,
    processed_at          timestamptz,
    error_message         text,
    metadata              jsonb NOT NULL DEFAULT '{}',
    created_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, run_number),
    UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS public.acct_payroll_run_items (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id        uuid NOT NULL REFERENCES public.acct_payroll_runs(id) ON DELETE CASCADE,
    employee_id           uuid NOT NULL REFERENCES public.acct_employees(id) ON DELETE RESTRICT,
    regular_hours         numeric(8,2) NOT NULL DEFAULT 0,
    overtime_hours        numeric(8,2) NOT NULL DEFAULT 0,
    holiday_hours         numeric(8,2) NOT NULL DEFAULT 0,
    pto_hours             numeric(8,2) NOT NULL DEFAULT 0,
    regular_pay           numeric(14,2) NOT NULL DEFAULT 0,
    overtime_pay          numeric(14,2) NOT NULL DEFAULT 0,
    commission_pay        numeric(14,2) NOT NULL DEFAULT 0,
    bonus_pay             numeric(14,2) NOT NULL DEFAULT 0,
    tips_pay              numeric(14,2) NOT NULL DEFAULT 0,
    gross_pay             numeric(14,2) NOT NULL DEFAULT 0,
    federal_income_tax    numeric(14,2) NOT NULL DEFAULT 0,
    state_income_tax      numeric(14,2) NOT NULL DEFAULT 0,
    local_income_tax      numeric(14,2) NOT NULL DEFAULT 0,
    social_security_ee    numeric(14,2) NOT NULL DEFAULT 0,
    medicare_ee           numeric(14,2) NOT NULL DEFAULT 0,
    social_security_er    numeric(14,2) NOT NULL DEFAULT 0,
    medicare_er           numeric(14,2) NOT NULL DEFAULT 0,
    futa_er               numeric(14,2) NOT NULL DEFAULT 0,
    suta_er               numeric(14,2) NOT NULL DEFAULT 0,
    pretax_deductions     numeric(14,2) NOT NULL DEFAULT 0,
    posttax_deductions    numeric(14,2) NOT NULL DEFAULT 0,
    net_pay               numeric(14,2) NOT NULL DEFAULT 0,
    payment_status        text NOT NULL DEFAULT 'pending'
                          CHECK (payment_status IN ('pending','issued','paid','failed','voided')),
    payment_reference     text,
    paystub_url           text,
    metadata              jsonb NOT NULL DEFAULT '{}',
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (payroll_run_id, employee_id)
);

CREATE TABLE IF NOT EXISTS public.acct_payroll_deductions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id       uuid NOT NULL REFERENCES public.acct_employees(id) ON DELETE CASCADE,
    deduction_code    text NOT NULL,
    label             text NOT NULL,
    deduction_type    text NOT NULL
                      CHECK (deduction_type IN ('health_insurance','dental','vision','retirement_401k',
                                                'retirement_roth','hsa','fsa','garnishment','child_support',
                                                'union_dues','loan_repayment','uniform','other')),
    is_pretax         boolean NOT NULL DEFAULT true,
    calc_method       text NOT NULL DEFAULT 'fixed_amount'
                      CHECK (calc_method IN ('fixed_amount','percent_of_gross')),
    amount            numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    percent           numeric(6,3) CHECK (percent IS NULL OR (percent >= 0 AND percent <= 100)),
    employer_match_percent numeric(6,3) CHECK (employer_match_percent IS NULL OR employer_match_percent >= 0),
    annual_cap        numeric(14,2),
    effective_from    date NOT NULL DEFAULT CURRENT_DATE,
    effective_to      date,
    is_active         boolean NOT NULL DEFAULT true,
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS public.acct_payroll_tax_forms (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id       uuid REFERENCES public.acct_employees(id) ON DELETE SET NULL,
    vendor_id         uuid REFERENCES public.acct_vendors(id) ON DELETE SET NULL,
    form_type         text NOT NULL
                      CHECK (form_type IN ('W-2','W-4','W-9','1099-NEC','1099-MISC','940','941','I-9','state_withholding')),
    tax_year          integer NOT NULL CHECK (tax_year BETWEEN 2000 AND 2200),
    period_label      text,
    status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','generated','filed','accepted','rejected','amended','void')),
    document_url      text,
    filed_at          timestamptz,
    filed_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    confirmation_number text,
    box_values        jsonb NOT NULL DEFAULT '{}',
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    CHECK (employee_id IS NOT NULL OR vendor_id IS NOT NULL OR form_type IN ('940','941'))
);

CREATE INDEX IF NOT EXISTS idx_acct_employees_tenant_status      ON public.acct_employees (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_acct_employees_staff              ON public.acct_employees (staff_id) WHERE staff_id IS NOT NULL;
-- (intentionally omitted) idx_acct_timesheets_emp_date would duplicate the
-- UNIQUE (tenant_id, employee_id, work_date) constraint index, which Postgres
-- can already scan backwards for work_date DESC ordering. Dropped if a prior
-- run of this migration created it:
DROP INDEX IF EXISTS public.idx_acct_timesheets_emp_date;
CREATE INDEX IF NOT EXISTS idx_acct_timesheets_period            ON public.acct_timesheets (pay_period_id) WHERE pay_period_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acct_payroll_runs_period          ON public.acct_payroll_runs (tenant_id, pay_period_id, status);
CREATE INDEX IF NOT EXISTS idx_acct_payroll_run_items_run        ON public.acct_payroll_run_items (payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_acct_payroll_run_items_employee   ON public.acct_payroll_run_items (employee_id);
CREATE INDEX IF NOT EXISTS idx_acct_payroll_deductions_employee  ON public.acct_payroll_deductions (tenant_id, employee_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_acct_payroll_tax_forms_year       ON public.acct_payroll_tax_forms (tenant_id, tax_year, form_type);


-- ############################################################################
-- SECTION 3 — CMS / WEBSITE CONTENT  (named gap #2)
-- ############################################################################
-- Feature tree: CMS > Website > Page, Banner, Gallery, Navigation,
-- Global Content, SEO, Policies Page.
-- crm_document_types covers signed waiver *types*, not editable page text.

CREATE TABLE IF NOT EXISTS public.cms_pages (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    slug              text NOT NULL,
    title             text NOT NULL,
    page_type         text NOT NULL DEFAULT 'standard'
                      CHECK (page_type IN ('standard','home','services','about','contact','policy',
                                           'landing','blog_post','faq','gallery','custom')),
    body              text,
    body_format       text NOT NULL DEFAULT 'richtext'
                      CHECK (body_format IN ('richtext','markdown','html','blocks')),
    blocks            jsonb NOT NULL DEFAULT '[]',
    excerpt           text,
    featured_image_url text,
    parent_page_id    uuid REFERENCES public.cms_pages(id) ON DELETE SET NULL,
    sort_order        integer NOT NULL DEFAULT 0,
    status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','in_review','scheduled','published','archived')),
    published_at      timestamptz,
    scheduled_for     timestamptz,
    version           integer NOT NULL DEFAULT 1 CHECK (version >= 1),
    requires_acceptance boolean NOT NULL DEFAULT false,
    policy_effective_date date,
    locale            text NOT NULL DEFAULT 'en-US',
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, slug, locale),
    UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS public.cms_page_revisions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    page_id       uuid NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
    version       integer NOT NULL CHECK (version >= 1),
    title         text NOT NULL,
    body          text,
    blocks        jsonb NOT NULL DEFAULT '[]',
    change_note   text,
    created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, page_id, version)
);

CREATE TABLE IF NOT EXISTS public.cms_seo (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    page_id           uuid REFERENCES public.cms_pages(id) ON DELETE CASCADE,
    scope             text NOT NULL DEFAULT 'page'
                      CHECK (scope IN ('page','site_default')),
    meta_title        text,
    meta_description  text,
    meta_keywords     text[],
    canonical_url     text,
    og_title          text,
    og_description    text,
    og_image_url      text,
    twitter_card      text CHECK (twitter_card IS NULL OR twitter_card IN ('summary','summary_large_image')),
    robots_index      boolean NOT NULL DEFAULT true,
    robots_follow     boolean NOT NULL DEFAULT true,
    structured_data   jsonb NOT NULL DEFAULT '{}',
    sitemap_priority  numeric(2,1) CHECK (sitemap_priority IS NULL OR (sitemap_priority >= 0 AND sitemap_priority <= 1)),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, page_id),
    CHECK ((scope = 'page' AND page_id IS NOT NULL) OR (scope = 'site_default' AND page_id IS NULL))
);

CREATE TABLE IF NOT EXISTS public.cms_banners (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name            text NOT NULL,
    banner_type     text NOT NULL DEFAULT 'hero'
                    CHECK (banner_type IN ('hero','promo_bar','popup','inline','footer','alert')),
    headline        text,
    subheadline     text,
    body            text,
    image_url       text,
    mobile_image_url text,
    cta_label       text,
    cta_url         text,
    background_color text,
    text_color      text,
    placement       text NOT NULL DEFAULT 'home'
                    CHECK (placement IN ('home','all_pages','services','booking','portal','custom')),
    target_page_id  uuid REFERENCES public.cms_pages(id) ON DELETE SET NULL,
    sort_order      integer NOT NULL DEFAULT 0,
    is_active       boolean NOT NULL DEFAULT true,
    starts_at       timestamptz,
    ends_at         timestamptz,
    dismissible     boolean NOT NULL DEFAULT false,
    metadata        jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.cms_galleries (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name          text NOT NULL,
    slug          text NOT NULL,
    description   text,
    gallery_type  text NOT NULL DEFAULT 'before_after'
                  CHECK (gallery_type IN ('before_after','portfolio','facility','team','general')),
    page_id       uuid REFERENCES public.cms_pages(id) ON DELETE SET NULL,
    is_published  boolean NOT NULL DEFAULT false,
    sort_order    integer NOT NULL DEFAULT 0,
    metadata      jsonb NOT NULL DEFAULT '{}',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, slug),
    UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS public.cms_gallery_items (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    gallery_id      uuid NOT NULL REFERENCES public.cms_galleries(id) ON DELETE CASCADE,
    image_url       text NOT NULL,
    before_image_url text,
    caption         text,
    alt_text        text,
    pet_id          uuid REFERENCES public.crm_pets(id) ON DELETE SET NULL,
    staff_id        uuid REFERENCES public.crm_staff(id) ON DELETE SET NULL,
    service_id      uuid REFERENCES public.crm_services(id) ON DELETE SET NULL,
    consent_on_file boolean NOT NULL DEFAULT false,
    sort_order      integer NOT NULL DEFAULT 0,
    is_published    boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS public.cms_navigation (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    menu_key        text NOT NULL DEFAULT 'primary'
                    CHECK (menu_key IN ('primary','footer','mobile','utility','portal')),
    label           text NOT NULL,
    url             text,
    page_id         uuid REFERENCES public.cms_pages(id) ON DELETE CASCADE,
    parent_id       uuid REFERENCES public.cms_navigation(id) ON DELETE CASCADE,
    sort_order      integer NOT NULL DEFAULT 0,
    opens_new_tab   boolean NOT NULL DEFAULT false,
    icon            text,
    visibility      text NOT NULL DEFAULT 'public'
                    CHECK (visibility IN ('public','authenticated','staff_only','hidden')),
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    CHECK (url IS NOT NULL OR page_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.cms_global_content (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    content_key     text NOT NULL,
    label           text NOT NULL,
    value_text      text,
    value_json      jsonb,
    content_group   text NOT NULL DEFAULT 'general'
                    CHECK (content_group IN ('general','contact','social','hours','footer','email_template','sms_template','legal')),
    locale          text NOT NULL DEFAULT 'en-US',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, content_key, locale)
);

-- Tracks customer acceptance of a specific *version* of a policy page.
CREATE TABLE IF NOT EXISTS public.cms_policy_acceptances (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    page_id         uuid NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
    page_version    integer NOT NULL CHECK (page_version >= 1),
    customer_id     uuid REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    accepted_at     timestamptz NOT NULL DEFAULT now(),
    ip_address      inet,
    user_agent      text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, page_id, page_version, customer_id),
    CHECK (customer_id IS NOT NULL OR user_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_cms_pages_tenant_status   ON public.cms_pages (tenant_id, status, page_type);
CREATE INDEX IF NOT EXISTS idx_cms_pages_published       ON public.cms_pages (tenant_id, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_cms_banners_active        ON public.cms_banners (tenant_id, placement) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_cms_gallery_items_gallery ON public.cms_gallery_items (gallery_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_cms_navigation_menu       ON public.cms_navigation (tenant_id, menu_key, sort_order) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_cms_policy_acc_customer   ON public.cms_policy_acceptances (tenant_id, customer_id);


-- ############################################################################
-- SECTION 4 — STAFF SCHEDULING / SHIFTS / TIME OFF  (named gap #3)
-- ############################################################################
-- Feature tree: Staff & Groomer Mgmt > Build Schedule, Assign Shifts.
-- crm_appointments.assigned_groomer_id exists, but there was no working-hours,
-- shift-template, or time-off model to build a schedule from.
-- Also covers Org/Settings > Operating Hours and Holiday Blackouts.

CREATE TABLE IF NOT EXISTS public.crm_operating_hours (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    location_id     uuid REFERENCES public.crm_locations(id) ON DELETE CASCADE,
    day_of_week     smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
    opens_at        time,
    closes_at       time,
    is_closed       boolean NOT NULL DEFAULT false,
    accepts_online_booking boolean NOT NULL DEFAULT true,
    last_booking_at time,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, location_id, day_of_week),
    CHECK (is_closed OR (opens_at IS NOT NULL AND closes_at IS NOT NULL AND closes_at > opens_at))
);

CREATE TABLE IF NOT EXISTS public.crm_holiday_blackouts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    location_id     uuid REFERENCES public.crm_locations(id) ON DELETE CASCADE,
    name            text NOT NULL,
    blackout_date   date NOT NULL,
    end_date        date,
    blackout_type   text NOT NULL DEFAULT 'holiday'
                    CHECK (blackout_type IN ('holiday','maintenance','training','weather','private_event','other')),
    is_closed_all_day boolean NOT NULL DEFAULT true,
    opens_at        time,
    closes_at       time,
    blocks_online_booking boolean NOT NULL DEFAULT true,
    recurs_annually boolean NOT NULL DEFAULT false,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, location_id, blackout_date, name),
    CHECK (end_date IS NULL OR end_date >= blackout_date)
);

CREATE TABLE IF NOT EXISTS public.crm_shift_templates (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name            text NOT NULL,
    location_id     uuid REFERENCES public.crm_locations(id) ON DELETE CASCADE,
    day_of_week     smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    starts_at       time NOT NULL,
    ends_at         time NOT NULL,
    break_minutes   integer NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
    role            text,
    required_headcount integer NOT NULL DEFAULT 1 CHECK (required_headcount >= 0),
    color_label     text,
    is_active       boolean NOT NULL DEFAULT true,
    effective_from  date NOT NULL DEFAULT CURRENT_DATE,
    effective_to    date,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    CHECK (ends_at > starts_at),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS public.crm_staff_availability (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    staff_id        uuid NOT NULL REFERENCES public.crm_staff(id) ON DELETE CASCADE,
    location_id     uuid REFERENCES public.crm_locations(id) ON DELETE SET NULL,
    day_of_week     smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    available_from  time NOT NULL,
    available_to    time NOT NULL,
    availability_type text NOT NULL DEFAULT 'preferred'
                    CHECK (availability_type IN ('preferred','available','unavailable')),
    effective_from  date NOT NULL DEFAULT CURRENT_DATE,
    effective_to    date,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, staff_id, day_of_week, available_from, effective_from),
    CHECK (available_to > available_from),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS public.crm_staff_shifts (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    staff_id          uuid NOT NULL REFERENCES public.crm_staff(id) ON DELETE CASCADE,
    location_id       uuid REFERENCES public.crm_locations(id) ON DELETE SET NULL,
    shift_template_id uuid REFERENCES public.crm_shift_templates(id) ON DELETE SET NULL,
    shift_date        date NOT NULL,
    starts_at         timestamptz NOT NULL,
    ends_at           timestamptz NOT NULL,
    break_minutes     integer NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
    role              text,
    status            text NOT NULL DEFAULT 'scheduled'
                      CHECK (status IN ('draft','scheduled','published','confirmed','in_progress',
                                        'completed','no_show','cancelled','swapped')),
    published_at      timestamptz,
    confirmed_at      timestamptz,
    checked_in_at     timestamptz,
    checked_out_at    timestamptz,
    is_overtime       boolean NOT NULL DEFAULT false,
    swap_requested_by uuid REFERENCES public.crm_staff(id) ON DELETE SET NULL,
    swap_approved_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    notes             text,
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.crm_time_off_requests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    staff_id        uuid NOT NULL REFERENCES public.crm_staff(id) ON DELETE CASCADE,
    request_type    text NOT NULL DEFAULT 'pto'
                    CHECK (request_type IN ('pto','unpaid','sick','bereavement','jury_duty','parental','other')),
    starts_on       date NOT NULL,
    ends_on         date NOT NULL,
    is_partial_day  boolean NOT NULL DEFAULT false,
    starts_at_time  time,
    ends_at_time    time,
    hours_requested numeric(6,2) CHECK (hours_requested IS NULL OR hours_requested >= 0),
    reason          text,
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','denied','cancelled','withdrawn')),
    reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at     timestamptz,
    review_note     text,
    blocks_booking  boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    CHECK (ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS idx_crm_staff_shifts_date       ON public.crm_staff_shifts (tenant_id, shift_date, staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_staff_shifts_staff_range ON public.crm_staff_shifts (tenant_id, staff_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_staff_shifts_location   ON public.crm_staff_shifts (tenant_id, location_id, shift_date)
    WHERE status IN ('scheduled','published','confirmed');
CREATE INDEX IF NOT EXISTS idx_crm_time_off_range          ON public.crm_time_off_requests (tenant_id, staff_id, starts_on, ends_on)
    WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_crm_staff_availability_staff ON public.crm_staff_availability (tenant_id, staff_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_crm_holiday_blackouts_date  ON public.crm_holiday_blackouts (tenant_id, blackout_date);

-- Prevent double-booking one groomer into two overlapping live shifts.
-- btree_gist is required to mix a uuid equality column with a range column.
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'crm_staff_shifts_no_overlap'
          AND conrelid = 'public.crm_staff_shifts'::regclass
    ) THEN
        ALTER TABLE public.crm_staff_shifts
            ADD CONSTRAINT crm_staff_shifts_no_overlap
            EXCLUDE USING gist (
                tenant_id WITH =,
                staff_id  WITH =,
                tstzrange(starts_at, ends_at) WITH &&
            )
            WHERE (status IN ('scheduled','published','confirmed','in_progress'));
    END IF;
END $$;


-- ############################################################################
-- SECTION 5 — GROOMER COMMISSION  (named gap #4)
-- ############################################################################
-- Feature tree: Analytics > Run Groomer Commission Report.
-- No commission rate lived anywhere (not on crm_staff, not standalone), so the
-- report had nothing to compute from.

CREATE TABLE IF NOT EXISTS public.crm_commission_plans (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name                  text NOT NULL,
    description           text,
    calc_basis            text NOT NULL DEFAULT 'service_revenue'
                          CHECK (calc_basis IN ('service_revenue','gross_sale','net_after_products',
                                                'net_after_discounts','flat_per_appointment','tiered_revenue')),
    default_rate_percent  numeric(6,3) NOT NULL DEFAULT 0
                          CHECK (default_rate_percent >= 0 AND default_rate_percent <= 100),
    flat_amount           numeric(12,2) NOT NULL DEFAULT 0 CHECK (flat_amount >= 0),
    includes_tips         boolean NOT NULL DEFAULT false,
    includes_addons       boolean NOT NULL DEFAULT true,
    includes_retail       boolean NOT NULL DEFAULT false,
    retail_rate_percent   numeric(6,3) NOT NULL DEFAULT 0
                          CHECK (retail_rate_percent >= 0 AND retail_rate_percent <= 100),
    deduct_refunds        boolean NOT NULL DEFAULT true,
    deduct_product_cost   boolean NOT NULL DEFAULT false,
    minimum_guarantee     numeric(12,2) CHECK (minimum_guarantee IS NULL OR minimum_guarantee >= 0),
    payout_frequency      text NOT NULL DEFAULT 'biweekly'
                          CHECK (payout_frequency IN ('weekly','biweekly','semimonthly','monthly')),
    is_active             boolean NOT NULL DEFAULT true,
    effective_from        date NOT NULL DEFAULT CURRENT_DATE,
    effective_to          date,
    metadata              jsonb NOT NULL DEFAULT '{}',
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name),
    UNIQUE (tenant_id, id),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- Revenue tiers for calc_basis = 'tiered_revenue'.
CREATE TABLE IF NOT EXISTS public.crm_commission_tiers (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id           uuid NOT NULL REFERENCES public.crm_commission_plans(id) ON DELETE CASCADE,
    tier_order        integer NOT NULL CHECK (tier_order >= 1),
    min_revenue       numeric(14,2) NOT NULL DEFAULT 0 CHECK (min_revenue >= 0),
    max_revenue       numeric(14,2),
    rate_percent      numeric(6,3) NOT NULL CHECK (rate_percent >= 0 AND rate_percent <= 100),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, plan_id, tier_order),
    CHECK (max_revenue IS NULL OR max_revenue > min_revenue)
);

-- Per-service or per-category rate overrides.
CREATE TABLE IF NOT EXISTS public.crm_commission_rules (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id           uuid NOT NULL REFERENCES public.crm_commission_plans(id) ON DELETE CASCADE,
    service_id        uuid REFERENCES public.crm_services(id) ON DELETE CASCADE,
    service_category  text,
    rate_percent      numeric(6,3) CHECK (rate_percent IS NULL OR (rate_percent >= 0 AND rate_percent <= 100)),
    flat_amount       numeric(12,2) CHECK (flat_amount IS NULL OR flat_amount >= 0),
    is_excluded       boolean NOT NULL DEFAULT false,
    priority          integer NOT NULL DEFAULT 100,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    CHECK (service_id IS NOT NULL OR service_category IS NOT NULL),
    CHECK (is_excluded OR rate_percent IS NOT NULL OR flat_amount IS NOT NULL)
);

-- Assigns a plan to a groomer. This is the missing link the report needed.
CREATE TABLE IF NOT EXISTS public.crm_staff_commission_assignments (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    staff_id            uuid NOT NULL REFERENCES public.crm_staff(id) ON DELETE CASCADE,
    plan_id             uuid NOT NULL REFERENCES public.crm_commission_plans(id) ON DELETE RESTRICT,
    override_rate_percent numeric(6,3)
                        CHECK (override_rate_percent IS NULL OR (override_rate_percent >= 0 AND override_rate_percent <= 100)),
    effective_from      date NOT NULL DEFAULT CURRENT_DATE,
    effective_to        date,
    is_active           boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, staff_id, plan_id, effective_from),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- Immutable per-transaction ledger. This is what the report sums.
CREATE TABLE IF NOT EXISTS public.crm_commission_entries (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    staff_id          uuid NOT NULL REFERENCES public.crm_staff(id) ON DELETE RESTRICT,
    plan_id           uuid REFERENCES public.crm_commission_plans(id) ON DELETE SET NULL,
    appointment_id    uuid REFERENCES public.crm_appointments(id) ON DELETE SET NULL,
    sale_id           uuid,
    service_id        uuid REFERENCES public.crm_services(id) ON DELETE SET NULL,
    earned_on         date NOT NULL DEFAULT CURRENT_DATE,
    basis_amount      numeric(14,2) NOT NULL DEFAULT 0,
    rate_percent      numeric(6,3),
    flat_amount       numeric(12,2),
    tips_amount       numeric(12,2) NOT NULL DEFAULT 0,
    retail_amount     numeric(12,2) NOT NULL DEFAULT 0,
    commission_amount numeric(14,2) NOT NULL DEFAULT 0,
    entry_type        text NOT NULL DEFAULT 'earned'
                      CHECK (entry_type IN ('earned','adjustment','reversal','bonus','guarantee_topup')),
    status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','paid','reversed','disputed','void')),
    payroll_run_id    uuid REFERENCES public.acct_payroll_runs(id) ON DELETE SET NULL,
    reversal_of_id    uuid REFERENCES public.crm_commission_entries(id) ON DELETE SET NULL,
    calculation_detail jsonb NOT NULL DEFAULT '{}',
    notes             text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_crm_commission_entries_staff_date
    ON public.crm_commission_entries (tenant_id, staff_id, earned_on DESC);
CREATE INDEX IF NOT EXISTS idx_crm_commission_entries_run
    ON public.crm_commission_entries (payroll_run_id) WHERE payroll_run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_commission_entries_status
    ON public.crm_commission_entries (tenant_id, status, earned_on DESC);
CREATE INDEX IF NOT EXISTS idx_crm_staff_commission_active
    ON public.crm_staff_commission_assignments (tenant_id, staff_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_crm_commission_rules_plan
    ON public.crm_commission_rules (tenant_id, plan_id, priority);

-- The report the feature tree names.
CREATE OR REPLACE VIEW public.v_groomer_commission_report AS
SELECT
    e.tenant_id,
    e.staff_id,
    s.display_name                                  AS groomer_name,
    date_trunc('month', e.earned_on)::date          AS period_month,
    count(*) FILTER (WHERE e.entry_type = 'earned') AS transactions,
    sum(e.basis_amount)                             AS basis_total,
    sum(e.tips_amount)                              AS tips_total,
    sum(e.retail_amount)                            AS retail_total,
    sum(e.commission_amount)
        FILTER (WHERE e.status IN ('approved','paid'))  AS commission_earned,
    sum(e.commission_amount)
        FILTER (WHERE e.status = 'pending')             AS commission_pending,
    sum(e.commission_amount)
        FILTER (WHERE e.status = 'paid')                AS commission_paid,
    sum(e.commission_amount)
        FILTER (WHERE e.entry_type = 'reversal')        AS commission_reversed
FROM public.crm_commission_entries e
JOIN public.crm_staff s
  ON s.id = e.staff_id
WHERE e.status <> 'void'
GROUP BY e.tenant_id, e.staff_id, s.display_name, date_trunc('month', e.earned_on);


-- ############################################################################
-- SECTION 6 — REMAINING SOFTWARE FEATURE-TREE GAPS
-- ############################################################################

-- ---- 6.1  Org / Settings columns ------------------------------------------
-- Business Profile / Brand & Identity / Edit Branding had no home on tenants.
ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS legal_name        text,
    ADD COLUMN IF NOT EXISTS dba_name          text,
    ADD COLUMN IF NOT EXISTS tax_id            text,
    ADD COLUMN IF NOT EXISTS logo_url          text,
    ADD COLUMN IF NOT EXISTS logo_dark_url     text,
    ADD COLUMN IF NOT EXISTS favicon_url       text,
    ADD COLUMN IF NOT EXISTS primary_color     text,
    ADD COLUMN IF NOT EXISTS secondary_color   text,
    ADD COLUMN IF NOT EXISTS accent_color      text,
    ADD COLUMN IF NOT EXISTS brand_font        text,
    ADD COLUMN IF NOT EXISTS support_email     text,
    ADD COLUMN IF NOT EXISTS support_phone     text,
    ADD COLUMN IF NOT EXISTS website_url       text,
    ADD COLUMN IF NOT EXISTS custom_domain     text,
    ADD COLUMN IF NOT EXISTS social_links      jsonb NOT NULL DEFAULT '{}';

-- Toggle Online Self-Booking had no flag at all.
ALTER TABLE public.crm_settings
    ADD COLUMN IF NOT EXISTS online_booking_enabled       boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS online_booking_requires_approval boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS online_booking_lead_time_hours   integer NOT NULL DEFAULT 24
        CHECK (online_booking_lead_time_hours >= 0),
    ADD COLUMN IF NOT EXISTS new_client_booking_enabled   boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS waitlist_enabled             boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS notification_frequency       text NOT NULL DEFAULT 'immediate'
        CHECK (notification_frequency IN ('immediate','hourly_digest','daily_digest','off'));

-- Users > Last Active, Reset 2FA, Pending Invitations.
ALTER TABLE public.tenant_memberships
    ADD COLUMN IF NOT EXISTS last_active_at        timestamptz,
    ADD COLUMN IF NOT EXISTS mfa_enabled           boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS mfa_method            text
        CHECK (mfa_method IS NULL OR mfa_method IN ('totp','sms','email','webauthn')),
    ADD COLUMN IF NOT EXISTS mfa_enrolled_at       timestamptz,
    ADD COLUMN IF NOT EXISTS mfa_reset_requested_at timestamptz,
    ADD COLUMN IF NOT EXISTS mfa_reset_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS invited_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS invited_email         text,
    ADD COLUMN IF NOT EXISTS invite_token_hash     text,
    ADD COLUMN IF NOT EXISTS invite_sent_at        timestamptz,
    ADD COLUMN IF NOT EXISTS invite_expires_at     timestamptz,
    ADD COLUMN IF NOT EXISTS invite_accepted_at    timestamptz;

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_pending_invites
    ON public.tenant_memberships (tenant_id, invite_expires_at)
    WHERE invite_accepted_at IS NULL AND invited_email IS NOT NULL;

-- Staff profile fields the tree shows but the table lacked.
ALTER TABLE public.crm_staff
    ADD COLUMN IF NOT EXISTS image_url           text,
    ADD COLUMN IF NOT EXISTS bio                 text,
    ADD COLUMN IF NOT EXISTS service_specialties text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS certifications      text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS show_on_website     boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS max_daily_appointments integer
        CHECK (max_daily_appointments IS NULL OR max_daily_appointments > 0);

-- View System Health needed real status columns.
ALTER TABLE public.platform_integration_health_registry
    ADD COLUMN IF NOT EXISTS tenant_id        uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS status           text NOT NULL DEFAULT 'unknown'
        CHECK (status IN ('healthy','degraded','down','unknown','disabled')),
    ADD COLUMN IF NOT EXISTS last_checked_at  timestamptz,
    ADD COLUMN IF NOT EXISTS last_success_at  timestamptz,
    ADD COLUMN IF NOT EXISTS last_error       text,
    ADD COLUMN IF NOT EXISTS latency_ms       integer,
    ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.platform_backups (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    backup_type     text NOT NULL DEFAULT 'full'
                    CHECK (backup_type IN ('full','incremental','export','pre_migration')),
    scope           text NOT NULL DEFAULT 'tenant'
                    CHECK (scope IN ('tenant','module','table_subset')),
    status          text NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','running','completed','failed','expired','deleted')),
    storage_url     text,
    size_bytes      bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
    checksum_sha256 text,
    row_counts      jsonb NOT NULL DEFAULT '{}',
    started_at      timestamptz,
    completed_at    timestamptz,
    expires_at      timestamptz,
    error_message   text,
    requested_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS public.platform_quick_links (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    label           text NOT NULL,
    url             text NOT NULL,
    icon            text,
    sort_order      integer NOT NULL DEFAULT 0,
    opens_new_tab   boolean NOT NULL DEFAULT true,
    visible_to_roles text[] NOT NULL DEFAULT '{}',
    is_active       boolean NOT NULL DEFAULT true,
    created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, label)
);


-- ---- 6.2  Services & pricing (CMS > Services & Pricing subtree) ------------
ALTER TABLE public.crm_services
    ADD COLUMN IF NOT EXISTS service_category text NOT NULL DEFAULT 'full_groom'
        CHECK (service_category IN ('full_groom','bath_and_brush','a_la_carte','add_on','package','other')),
    ADD COLUMN IF NOT EXISTS is_add_on        boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS parent_service_id uuid REFERENCES public.crm_services(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS bookable_online  boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS image_url        text;

CREATE TABLE IF NOT EXISTS public.crm_service_packages (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name              text NOT NULL,
    slug              text NOT NULL,
    description       text,
    package_type      text NOT NULL DEFAULT 'bundle'
                      CHECK (package_type IN ('bundle','prepaid_visits','membership','seasonal')),
    price             numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    visit_count       integer CHECK (visit_count IS NULL OR visit_count > 0),
    valid_days        integer CHECK (valid_days IS NULL OR valid_days > 0),
    discount_percent  numeric(6,3) CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100)),
    is_active         boolean NOT NULL DEFAULT true,
    bookable_online   boolean NOT NULL DEFAULT true,
    sort_order        integer NOT NULL DEFAULT 0,
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, slug),
    UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS public.crm_service_package_items (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    package_id    uuid NOT NULL REFERENCES public.crm_service_packages(id) ON DELETE CASCADE,
    service_id    uuid NOT NULL REFERENCES public.crm_services(id) ON DELETE CASCADE,
    quantity      integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    sort_order    integer NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, package_id, service_id)
);

CREATE TABLE IF NOT EXISTS public.crm_pricing_rules (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name              text NOT NULL,
    rule_type         text NOT NULL
                      CHECK (rule_type IN ('breed_size','weight_band','coat_type','behavior','duration',
                                           'location','day_of_week','time_of_day','tier','custom')),
    service_id        uuid REFERENCES public.crm_services(id) ON DELETE CASCADE,
    service_category  text,
    match_key         text,
    min_value         numeric(12,3),
    max_value         numeric(12,3),
    adjustment_type   text NOT NULL DEFAULT 'fixed_price'
                      CHECK (adjustment_type IN ('fixed_price','add_amount','multiply_percent','add_minutes')),
    adjustment_value  numeric(12,3) NOT NULL DEFAULT 0,
    priority          integer NOT NULL DEFAULT 100,
    is_active         boolean NOT NULL DEFAULT true,
    effective_from    date,
    effective_to      date,
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    CHECK (max_value IS NULL OR min_value IS NULL OR max_value >= min_value),
    CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS public.crm_surcharges (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code              text NOT NULL,
    name              text NOT NULL,
    description       text,
    surcharge_type    text NOT NULL
                      CHECK (surcharge_type IN ('weekend','holiday','severe_matting','senior_pet','aggressive_pet',
                                                'late_pickup','no_show','express','de_shedding','flea_treatment',
                                                'special_handling','travel','other')),
    calc_method       text NOT NULL DEFAULT 'flat_amount'
                      CHECK (calc_method IN ('flat_amount','percent_of_service','per_minute')),
    amount            numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    percent           numeric(6,3) CHECK (percent IS NULL OR (percent >= 0 AND percent <= 100)),
    auto_apply        boolean NOT NULL DEFAULT false,
    requires_approval boolean NOT NULL DEFAULT false,
    taxable           boolean NOT NULL DEFAULT true,
    commissionable    boolean NOT NULL DEFAULT true,
    applies_to_service_id uuid REFERENCES public.crm_services(id) ON DELETE CASCADE,
    is_active         boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code)
);

-- Editable legal text with versioning (the tree's "Edit Legal & Waivers").
ALTER TABLE public.crm_document_types
    ADD COLUMN IF NOT EXISTS body_template     text,
    ADD COLUMN IF NOT EXISTS body_format       text NOT NULL DEFAULT 'richtext'
        CHECK (body_format IN ('richtext','markdown','html','pdf_url')),
    ADD COLUMN IF NOT EXISTS version           integer NOT NULL DEFAULT 1 CHECK (version >= 1),
    ADD COLUMN IF NOT EXISTS effective_date    date,
    ADD COLUMN IF NOT EXISTS cms_page_id       uuid REFERENCES public.cms_pages(id) ON DELETE SET NULL;


-- ---- 6.3  Accounting / payments gaps --------------------------------------
CREATE TABLE IF NOT EXISTS public.acct_estimates (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    estimate_number   text NOT NULL,
    customer_id       uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
    pet_id            uuid REFERENCES public.crm_pets(id) ON DELETE SET NULL,
    appointment_id    uuid REFERENCES public.crm_appointments(id) ON DELETE SET NULL,
    issue_date        date NOT NULL DEFAULT CURRENT_DATE,
    expiry_date       date,
    currency          text NOT NULL DEFAULT 'USD',
    subtotal          numeric(14,2) NOT NULL DEFAULT 0,
    tax_total         numeric(14,2) NOT NULL DEFAULT 0,
    discount_total    numeric(14,2) NOT NULL DEFAULT 0,
    total             numeric(14,2) NOT NULL DEFAULT 0,
    status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','sent','viewed','accepted','declined','expired','converted','void')),
    sent_at           timestamptz,
    viewed_at         timestamptz,
    accepted_at       timestamptz,
    declined_at       timestamptz,
    converted_invoice_id uuid REFERENCES public.acct_ar_invoices(id) ON DELETE SET NULL,
    notes             text,
    terms             text,
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, estimate_number),
    UNIQUE (tenant_id, id),
    CHECK (expiry_date IS NULL OR expiry_date >= issue_date)
);

-- No tenant_id: already exempt in the base schema's fail-fast validator.
CREATE TABLE IF NOT EXISTS public.acct_estimate_lines (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id   uuid NOT NULL REFERENCES public.acct_estimates(id) ON DELETE CASCADE,
    line_number   integer NOT NULL DEFAULT 1 CHECK (line_number >= 1),
    service_id    uuid REFERENCES public.crm_services(id) ON DELETE SET NULL,
    description   text NOT NULL,
    quantity      numeric(12,3) NOT NULL DEFAULT 1,
    unit_price    numeric(14,4) NOT NULL DEFAULT 0,
    discount_amount numeric(14,2) NOT NULL DEFAULT 0,
    tax_amount    numeric(14,2) NOT NULL DEFAULT 0,
    line_total    numeric(14,2) NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (estimate_id, line_number)
);

CREATE TABLE IF NOT EXISTS public.acct_recurring_invoices (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    template_name     text NOT NULL,
    customer_id       uuid REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    frequency         text NOT NULL DEFAULT 'monthly'
                      CHECK (frequency IN ('weekly','biweekly','monthly','quarterly','semiannual','annual')),
    interval_count    integer NOT NULL DEFAULT 1 CHECK (interval_count >= 1),
    starts_on         date NOT NULL DEFAULT CURRENT_DATE,
    ends_on           date,
    next_run_on       date,
    last_run_on       date,
    occurrences_limit integer CHECK (occurrences_limit IS NULL OR occurrences_limit > 0),
    occurrences_done  integer NOT NULL DEFAULT 0 CHECK (occurrences_done >= 0),
    auto_send         boolean NOT NULL DEFAULT false,
    auto_charge       boolean NOT NULL DEFAULT false,
    payment_method_id uuid,
    currency          text NOT NULL DEFAULT 'USD',
    subtotal          numeric(14,2) NOT NULL DEFAULT 0,
    total             numeric(14,2) NOT NULL DEFAULT 0,
    status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('draft','active','paused','completed','cancelled','failed')),
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, template_name),
    UNIQUE (tenant_id, id),
    CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

-- No tenant_id: already exempt in the base schema's fail-fast validator.
CREATE TABLE IF NOT EXISTS public.acct_recurring_invoice_lines (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recurring_invoice_id  uuid NOT NULL REFERENCES public.acct_recurring_invoices(id) ON DELETE CASCADE,
    line_number           integer NOT NULL DEFAULT 1 CHECK (line_number >= 1),
    service_id            uuid REFERENCES public.crm_services(id) ON DELETE SET NULL,
    description           text NOT NULL,
    quantity              numeric(12,3) NOT NULL DEFAULT 1,
    unit_price            numeric(14,4) NOT NULL DEFAULT 0,
    tax_amount            numeric(14,2) NOT NULL DEFAULT 0,
    line_total            numeric(14,2) NOT NULL DEFAULT 0,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (recurring_invoice_id, line_number)
);

CREATE TABLE IF NOT EXISTS public.acct_customer_statements (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id       uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    statement_number  text NOT NULL,
    period_start      date NOT NULL,
    period_end        date NOT NULL,
    opening_balance   numeric(14,2) NOT NULL DEFAULT 0,
    charges_total     numeric(14,2) NOT NULL DEFAULT 0,
    payments_total    numeric(14,2) NOT NULL DEFAULT 0,
    credits_total     numeric(14,2) NOT NULL DEFAULT 0,
    closing_balance   numeric(14,2) NOT NULL DEFAULT 0,
    aging_current     numeric(14,2) NOT NULL DEFAULT 0,
    aging_1_30        numeric(14,2) NOT NULL DEFAULT 0,
    aging_31_60       numeric(14,2) NOT NULL DEFAULT 0,
    aging_61_90       numeric(14,2) NOT NULL DEFAULT 0,
    aging_over_90     numeric(14,2) NOT NULL DEFAULT 0,
    status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','generated','sent','viewed','void')),
    document_url      text,
    sent_at           timestamptz,
    generated_at      timestamptz NOT NULL DEFAULT now(),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, statement_number),
    CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS public.acct_payouts (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    payout_number     text NOT NULL,
    provider          text NOT NULL DEFAULT 'stripe'
                      CHECK (provider IN ('stripe','square','adyen','manual','ach','other')),
    provider_payout_id text,
    destination_type  text NOT NULL DEFAULT 'bank_account'
                      CHECK (destination_type IN ('bank_account','debit_card','check','wallet')),
    destination_last4 text,
    gross_amount      numeric(14,2) NOT NULL DEFAULT 0,
    fee_amount        numeric(14,2) NOT NULL DEFAULT 0,
    refund_amount     numeric(14,2) NOT NULL DEFAULT 0,
    chargeback_amount numeric(14,2) NOT NULL DEFAULT 0,
    net_amount        numeric(14,2) NOT NULL DEFAULT 0,
    currency          text NOT NULL DEFAULT 'USD',
    period_start      date,
    period_end        date,
    scheduled_for     date,
    status            text NOT NULL DEFAULT 'scheduled'
                      CHECK (status IN ('scheduled','in_transit','paid','failed','cancelled','reversed')),
    arrived_at        timestamptz,
    failure_reason    text,
    gl_journal_entry_id uuid,
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, payout_number),
    UNIQUE (tenant_id, id)
);

-- Card-on-file. "Edit Payment Methods" / "Payment Method Confirmed" had no
-- table; no last4/brand/token existed anywhere in the schema.
-- Store gateway tokens only. Never raw PAN.
CREATE TABLE IF NOT EXISTS public.commerce_customer_payment_methods (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id       uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    provider          text NOT NULL DEFAULT 'stripe'
                      CHECK (provider IN ('stripe','square','adyen','authorize_net','other')),
    provider_customer_id text,
    provider_token    text NOT NULL,
    method_type       text NOT NULL DEFAULT 'card'
                      CHECK (method_type IN ('card','bank_account','wallet','link')),
    brand             text,
    last4             text CHECK (last4 IS NULL OR last4 ~ '^[0-9]{4}$'),
    exp_month         smallint CHECK (exp_month IS NULL OR exp_month BETWEEN 1 AND 12),
    exp_year          smallint CHECK (exp_year IS NULL OR exp_year BETWEEN 2000 AND 2200),
    billing_zip       text,
    is_default        boolean NOT NULL DEFAULT false,
    is_verified       boolean NOT NULL DEFAULT false,
    verified_at       timestamptz,
    status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','expired','removed','failed','requires_action')),
    last_used_at      timestamptz,
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, provider, provider_token)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_default_payment_method
    ON public.commerce_customer_payment_methods (tenant_id, customer_id)
    WHERE is_default AND status = 'active';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conname = 'acct_recurring_invoices_payment_method_fk'
                     AND conrelid = 'public.acct_recurring_invoices'::regclass) THEN
        ALTER TABLE public.acct_recurring_invoices
            ADD CONSTRAINT acct_recurring_invoices_payment_method_fk
            FOREIGN KEY (payment_method_id)
            REFERENCES public.commerce_customer_payment_methods(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Invoice lifecycle + "Customer & Pet" columns the tree shows.
ALTER TABLE public.acct_ar_invoices
    ADD COLUMN IF NOT EXISTS pet_id            uuid REFERENCES public.crm_pets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS appointment_id    uuid REFERENCES public.crm_appointments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sent_at           timestamptz,
    ADD COLUMN IF NOT EXISTS resent_count      integer NOT NULL DEFAULT 0 CHECK (resent_count >= 0),
    ADD COLUMN IF NOT EXISTS last_reminder_at  timestamptz,
    ADD COLUMN IF NOT EXISTS reminder_count    integer NOT NULL DEFAULT 0 CHECK (reminder_count >= 0),
    ADD COLUMN IF NOT EXISTS viewed_at         timestamptz,
    ADD COLUMN IF NOT EXISTS voided_at         timestamptz,
    ADD COLUMN IF NOT EXISTS voided_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS void_reason       text;

-- Refund approval workflow + method/reason + store-credit link.
ALTER TABLE public.commerce_refunds
    ADD COLUMN IF NOT EXISTS refund_method     text
        CHECK (refund_method IS NULL OR refund_method IN
               ('original_payment','store_credit','gift_card','cash','check','manual')),
    ADD COLUMN IF NOT EXISTS reason_code       text
        CHECK (reason_code IS NULL OR reason_code IN
               ('service_issue','cancellation','no_show_waived','duplicate_charge','pricing_error',
                'customer_dissatisfaction','pet_health','fraud','other')),
    ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS approved_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at       timestamptz,
    ADD COLUMN IF NOT EXISTS rejected_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS rejected_at       timestamptz,
    ADD COLUMN IF NOT EXISTS rejection_reason  text,
    ADD COLUMN IF NOT EXISTS store_credit_id   uuid REFERENCES public.commerce_store_credits(id) ON DELETE SET NULL;

-- Payment table Groomer / Staff / Location filters.
ALTER TABLE public.commerce_payments
    ADD COLUMN IF NOT EXISTS staff_id    uuid REFERENCES public.crm_staff(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS branch_id   uuid REFERENCES public.commerce_branches(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.crm_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commerce_payments_staff
    ON public.commerce_payments (tenant_id, staff_id) WHERE staff_id IS NOT NULL;

-- Gift card fields the tree shows (digital/physical, recipient, conversion).
ALTER TABLE public.commerce_gift_cards
    ADD COLUMN IF NOT EXISTS card_format       text NOT NULL DEFAULT 'digital'
        CHECK (card_format IN ('digital','physical')),
    ADD COLUMN IF NOT EXISTS recipient_name    text,
    ADD COLUMN IF NOT EXISTS recipient_email   text,
    ADD COLUMN IF NOT EXISTS recipient_phone   text,
    ADD COLUMN IF NOT EXISTS sender_name       text,
    ADD COLUMN IF NOT EXISTS gift_message      text,
    ADD COLUMN IF NOT EXISTS holder_customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_used_at      timestamptz,
    ADD COLUMN IF NOT EXISTS delivered_at      timestamptz,
    ADD COLUMN IF NOT EXISTS reminder_sent_at  timestamptz,
    ADD COLUMN IF NOT EXISTS converted_store_credit_id uuid REFERENCES public.commerce_store_credits(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS replaced_by_id    uuid REFERENCES public.commerce_gift_cards(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS replaced_reason   text;

-- Receipts must be issuable for deposits, refunds and gift cards, not just
-- sales. sale_id was NOT NULL, which made those receipts impossible.
ALTER TABLE public.commerce_receipts
    ALTER COLUMN sale_id DROP NOT NULL;

ALTER TABLE public.commerce_receipts
    ADD COLUMN IF NOT EXISTS receipt_for text NOT NULL DEFAULT 'sale'
        CHECK (receipt_for IN ('sale','deposit','refund','gift_card','store_credit','payment')),
    ADD COLUMN IF NOT EXISTS refund_id    uuid REFERENCES public.commerce_refunds(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deposit_id   uuid REFERENCES public.commerce_deposits(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS gift_card_id uuid REFERENCES public.commerce_gift_cards(id) ON DELETE SET NULL;

-- Deposit transfer lineage + type filter.
ALTER TABLE public.commerce_deposits
    ADD COLUMN IF NOT EXISTS deposit_type text NOT NULL DEFAULT 'booking'
        CHECK (deposit_type IN ('booking','security','package_prepay','no_show_hold','other')),
    ADD COLUMN IF NOT EXISTS transferred_from_id uuid REFERENCES public.commerce_deposits(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS transferred_to_id   uuid REFERENCES public.commerce_deposits(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS transferred_at      timestamptz,
    ADD COLUMN IF NOT EXISTS transfer_reason     text;

-- Product recommendations + customer preferences the tree shows.
CREATE TABLE IF NOT EXISTS public.crm_product_recommendations (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id       uuid REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    pet_id            uuid REFERENCES public.crm_pets(id) ON DELETE CASCADE,
    appointment_id    uuid REFERENCES public.crm_appointments(id) ON DELETE SET NULL,
    catalog_item_id   uuid,
    product_name      text NOT NULL,
    recommended_by    uuid REFERENCES public.crm_staff(id) ON DELETE SET NULL,
    reason            text,
    priority          text NOT NULL DEFAULT 'suggested'
                      CHECK (priority IN ('suggested','recommended','required')),
    status            text NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','presented','accepted','declined','purchased','expired')),
    presented_at      timestamptz,
    responded_at      timestamptz,
    resulting_sale_id uuid,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    CHECK (customer_id IS NOT NULL OR pet_id IS NOT NULL)
);

ALTER TABLE public.crm_customer_preferences
    ADD COLUMN IF NOT EXISTS preferred_shampoo     text,
    ADD COLUMN IF NOT EXISTS preferred_cut_style   text,
    ADD COLUMN IF NOT EXISTS preferred_groomer_id  uuid REFERENCES public.crm_staff(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS notification_frequency text
        CHECK (notification_frequency IS NULL OR notification_frequency IN
               ('immediate','daily','weekly','appointments_only','off'));


-- ############################################################################
-- SECTION 7 — STATUS COLUMN CONSTRAINTS
-- ############################################################################
-- Extends the note about commerce_refunds.status / commerce_gift_cards.status
-- being free-text while commerce_disputes.status is constrained. Added NOT
-- VALID so legacy rows cannot block the migration; new and updated rows are
-- enforced immediately. Run VALIDATE CONSTRAINT after cleaning any old data.

DO $$
DECLARE
    r       RECORD;
    allowed text;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('commerce_refunds','status',            $v$'pending','requires_approval','approved','rejected','processing','completed','failed','cancelled','void'$v$),
            ('commerce_gift_cards','status',         $v$'active','redeemed','partially_redeemed','expired','cancelled','replaced','converted'$v$),
            ('commerce_payments','status',           $v$'pending','processing','authorized','captured','succeeded','failed','refunded','partially_refunded','cancelled','disputed'$v$),
            ('commerce_sales','status',              $v$'draft','open','pending','completed','partially_refunded','refunded','cancelled','void'$v$),
            ('commerce_carts','status',              $v$'active','abandoned','converted','expired','merged'$v$),
            ('commerce_checkout_sessions','status',  $v$'open','pending','completed','expired','cancelled','failed'$v$),
            ('commerce_store_credits','status',      $v$'active','partially_used','used','expired','revoked'$v$),
            ('commerce_loyalty_accounts','status',   $v$'active','suspended','closed'$v$),
            ('commerce_coupons','status',            $v$'draft','active','paused','expired','exhausted','cancelled'$v$),
            ('commerce_registers','status',          $v$'active','inactive','maintenance','retired'$v$),
            ('commerce_register_sessions','status',  $v$'open','suspended','closed','reconciled','discrepancy'$v$),
            ('commerce_register_closures','status',  $v$'pending','balanced','over','short','approved','disputed'$v$),
            ('commerce_subscriptions','status',      $v$'trialing','active','past_due','paused','cancelled','expired','unpaid'$v$),
            ('commerce_subscription_invoices','status', $v$'draft','open','paid','past_due','void','uncollectible'$v$),
            ('commerce_batch_slips','status',        $v$'draft','open','submitted','settled','reconciled','void'$v$),
            ('commerce_return_actions','status',     $v$'pending','approved','rejected','completed','cancelled'$v$),
            ('commerce_inventory_alerts','status',   $v$'open','acknowledged','resolved','dismissed','expired'$v$),
            ('commerce_posting_events','status',     $v$'pending','posted','failed','reversed','skipped'$v$),
            ('commerce_export_jobs','status',        $v$'queued','running','completed','failed','cancelled','expired'$v$),
            ('commerce_outbox_events','status',      $v$'pending','publishing','published','failed','dead_letter'$v$),
            ('commerce_webhook_events','status',     $v$'pending','delivering','delivered','failed','dead_letter','ignored'$v$),
            ('commerce_channel_products','sync_status', $v$'pending','syncing','synced','failed','out_of_sync','disabled'$v$),
            ('crm_appointment_pets','status',        $v$'scheduled','checked_in','in_progress','ready','completed','no_show','cancelled'$v$),
            ('crm_appointment_services','status',    $v$'scheduled','in_progress','completed','skipped','cancelled'$v$),
            ('erp_inventory_lots','status',          $v$'available','reserved','quarantined','expired','consumed','damaged','recalled'$v$),
            ('erp_inventory_reservations','status',  $v$'pending','reserved','released','fulfilled','expired','cancelled'$v$),
            ('erp_inventory_transfers','status',     $v$'draft','requested','approved','in_transit','received','partially_received','cancelled'$v$),
            ('erp_pick_waves','status',              $v$'draft','released','picking','picked','packed','shipped','cancelled'$v$),
            ('erp_shipments','status',               $v$'pending','label_created','in_transit','out_for_delivery','delivered','exception','returned','cancelled'$v$),
            ('erp_return_refunds','status',          $v$'pending','approved','rejected','processing','completed','failed'$v$),
            ('acct_close_checklists','status',       $v$'open','in_progress','blocked','completed','skipped','reopened'$v$),
            ('acct_ar_collections_cases','status',   $v$'open','in_progress','promised','escalated','written_off','settled','closed'$v$),
            ('acct_reconciliation_items','status',   $v$'unmatched','matched','partially_matched','ignored','disputed','resolved'$v$),
            ('acct_bank_transactions','match_status',$v$'unmatched','suggested','matched','manually_matched','ignored','duplicate'$v$),
            ('acct_leases','status',                 $v$'draft','active','expired','terminated','renewed','cancelled'$v$),
            ('acct_lease_payments','status',         $v$'scheduled','due','paid','late','waived','cancelled'$v$),
            ('acct_revenue_contracts','status',      $v$'draft','active','fulfilled','modified','cancelled','expired'$v$),
            ('acct_revenue_recognition_schedules','status', $v$'scheduled','recognized','deferred','adjusted','reversed','cancelled'$v$),
            ('acct_budget_versions','status',        $v$'draft','under_review','approved','active','locked','archived','rejected'$v$),
            ('acct_intercompany_transactions','status', $v$'draft','pending','matched','posted','eliminated','disputed','cancelled'$v$),
            ('acct_import_jobs','status',            $v$'queued','validating','running','completed','completed_with_errors','failed','cancelled'$v$)
        ) AS v(tbl, col, vals)
    LOOP
        IF to_regclass('public.' || r.tbl) IS NULL THEN
            RAISE NOTICE '[7] skip: table public.% does not exist', r.tbl;
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = r.col
        ) THEN
            RAISE NOTICE '[7] skip: %.% does not exist', r.tbl, r.col;
            CONTINUE;
        END IF;
        IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = ('public.' || r.tbl)::regclass
              AND conname  = format('%s_%s_allowed', r.tbl, r.col)
        ) THEN
            CONTINUE;
        END IF;
        EXECUTE format(
            'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I IN (%s)) NOT VALID',
            r.tbl, format('%s_%s_allowed', r.tbl, r.col), r.col, r.vals);
        RAISE NOTICE '[7] constrained %.%', r.tbl, r.col;
    END LOOP;
END $$;


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


-- ############################################################################
-- SECTION 11 — RLS, TRIGGERS AND GRANTS FOR EVERYTHING ADDED ABOVE
-- ############################################################################
-- Every table created by this migration must be tenant-isolated before any
-- TypeScript client touches it. These loops are catalog-driven so nothing
-- added above can be forgotten.

-- ---- 11.1  updated_at triggers on all new tables -------------------------
DO $$
DECLARE r RECORD; n integer := 0;
BEGIN
    FOR r IN
        SELECT ns.nspname AS sch, c.relname AS tbl
        FROM pg_class c
        JOIN pg_namespace ns ON ns.oid = c.relnamespace
        WHERE ns.nspname IN ('public','lms')
          AND c.relkind = 'r'
          AND EXISTS (SELECT 1 FROM pg_attribute a
                      WHERE a.attrelid = c.oid AND a.attname = 'updated_at'
                        AND a.attnum > 0 AND NOT a.attisdropped)
          AND NOT EXISTS (
              SELECT 1 FROM pg_trigger t
              JOIN pg_proc p ON p.oid = t.tgfoid
              WHERE t.tgrelid = c.oid AND NOT t.tgisinternal
                AND p.proname IN ('touch_updated_at','platform_touch_updated_at'))
        ORDER BY 1,2
    LOOP
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION %s()',
            left(r.tbl, 50) || '_touch_updated_at', r.sch, r.tbl,
            CASE WHEN r.sch = 'lms' THEN 'lms.touch_updated_at'
                 ELSE 'public.platform_touch_updated_at' END);
        n := n + 1;
    END LOOP;
    RAISE NOTICE '[11.1] added % updated_at triggers', n;
END $$;

-- ---- 11.2  RLS for every new public table with a tenant_id ---------------
DO $$
DECLARE r RECORD; n integer := 0;
BEGIN
    FOR r IN
        SELECT c.relname AS tbl
        FROM pg_class c
        JOIN pg_namespace ns ON ns.oid = c.relnamespace
        WHERE ns.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relrowsecurity = false
          AND EXISTS (SELECT 1 FROM pg_attribute a
                      WHERE a.attrelid = c.oid AND a.attname = 'tenant_id'
                        AND a.attnum > 0 AND NOT a.attisdropped)
        ORDER BY 1
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_select', r.tbl);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (platform_is_tenant_member(tenant_id))',
                       r.tbl || '_select', r.tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_insert', r.tbl);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (platform_is_tenant_member(tenant_id))',
                       r.tbl || '_insert', r.tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_update', r.tbl);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (platform_is_tenant_member(tenant_id)) WITH CHECK (platform_is_tenant_member(tenant_id))',
                       r.tbl || '_update', r.tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_delete', r.tbl);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (platform_is_tenant_member(tenant_id))',
                       r.tbl || '_delete', r.tbl);
        n := n + 1;
    END LOOP;
    RAISE NOTICE '[11.2] RLS applied to % new public tables', n;
END $$;

-- ---- 11.3  Join-based RLS for the 3 new line-item tables without tenant_id
-- Written WITH both USING and WITH CHECK, so they do not repeat the defect
-- Section 1.2 had to repair.
ALTER TABLE public.acct_payroll_run_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS acct_pri_select ON public.acct_payroll_run_items;
CREATE POLICY acct_pri_select ON public.acct_payroll_run_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.acct_payroll_runs r
                   WHERE r.id = payroll_run_id AND platform_is_tenant_member(r.tenant_id)));
DROP POLICY IF EXISTS acct_pri_mutate ON public.acct_payroll_run_items;
CREATE POLICY acct_pri_mutate ON public.acct_payroll_run_items FOR ALL
    USING      (EXISTS (SELECT 1 FROM public.acct_payroll_runs r
                        WHERE r.id = payroll_run_id AND platform_is_tenant_member(r.tenant_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.acct_payroll_runs r
                        WHERE r.id = payroll_run_id AND platform_is_tenant_member(r.tenant_id)));

ALTER TABLE public.acct_estimate_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS acct_estl_select ON public.acct_estimate_lines;
CREATE POLICY acct_estl_select ON public.acct_estimate_lines FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.acct_estimates e
                   WHERE e.id = estimate_id AND platform_is_tenant_member(e.tenant_id)));
DROP POLICY IF EXISTS acct_estl_mutate ON public.acct_estimate_lines;
CREATE POLICY acct_estl_mutate ON public.acct_estimate_lines FOR ALL
    USING      (EXISTS (SELECT 1 FROM public.acct_estimates e
                        WHERE e.id = estimate_id AND platform_is_tenant_member(e.tenant_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.acct_estimates e
                        WHERE e.id = estimate_id AND platform_is_tenant_member(e.tenant_id)));

ALTER TABLE public.acct_recurring_invoice_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS acct_ril_select ON public.acct_recurring_invoice_lines;
CREATE POLICY acct_ril_select ON public.acct_recurring_invoice_lines FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.acct_recurring_invoices ri
                   WHERE ri.id = recurring_invoice_id AND platform_is_tenant_member(ri.tenant_id)));
DROP POLICY IF EXISTS acct_ril_mutate ON public.acct_recurring_invoice_lines;
CREATE POLICY acct_ril_mutate ON public.acct_recurring_invoice_lines FOR ALL
    USING      (EXISTS (SELECT 1 FROM public.acct_recurring_invoices ri
                        WHERE ri.id = recurring_invoice_id AND platform_is_tenant_member(ri.tenant_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.acct_recurring_invoices ri
                        WHERE ri.id = recurring_invoice_id AND platform_is_tenant_member(ri.tenant_id)));

-- ---- 11.4  Payroll is more sensitive than ordinary tenant data -----------
-- Tenant membership alone must not expose every employee's pay and SSN token.
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['acct_employees','acct_pay_periods','acct_payroll_runs',
                             'acct_payroll_deductions','acct_payroll_tax_forms','acct_timesheets']
    LOOP
        -- SELECT is granted per table below, because only acct_employees
        -- carries user_id; the rest reach the employee through employee_id.
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE '
            'USING (platform_is_admin() OR platform_has_permission(tenant_id, ''payroll.write'')) '
            'WITH CHECK (platform_is_admin() OR platform_has_permission(tenant_id, ''payroll.write''))',
            t || '_update', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT '
            'WITH CHECK (platform_is_admin() OR platform_has_permission(tenant_id, ''payroll.write''))',
            t || '_insert', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR DELETE '
            'USING (platform_is_admin() OR platform_has_permission(tenant_id, ''payroll.write''))',
            t || '_delete', t);
    END LOOP;
END $$;

-- acct_employees / acct_timesheets have no user_id-on-row for self access in
-- the same shape, so fix the two that do differ.
DROP POLICY IF EXISTS acct_employees_select ON public.acct_employees;
CREATE POLICY acct_employees_select ON public.acct_employees FOR SELECT
    USING (
        platform_is_admin()
        OR platform_has_permission(tenant_id, 'payroll.read')
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS acct_pay_periods_select ON public.acct_pay_periods;
CREATE POLICY acct_pay_periods_select ON public.acct_pay_periods FOR SELECT
    USING (platform_is_tenant_member(tenant_id));

DROP POLICY IF EXISTS acct_timesheets_select ON public.acct_timesheets;
CREATE POLICY acct_timesheets_select ON public.acct_timesheets FOR SELECT
    USING (
        platform_is_admin()
        OR platform_has_permission(tenant_id, 'payroll.read')
        OR EXISTS (SELECT 1 FROM public.acct_employees e
                   WHERE e.id = acct_timesheets.employee_id AND e.user_id = auth.uid())
    );

DROP POLICY IF EXISTS acct_payroll_deductions_select ON public.acct_payroll_deductions;
CREATE POLICY acct_payroll_deductions_select ON public.acct_payroll_deductions FOR SELECT
    USING (
        platform_is_admin()
        OR platform_has_permission(tenant_id, 'payroll.read')
        OR EXISTS (SELECT 1 FROM public.acct_employees e
                   WHERE e.id = acct_payroll_deductions.employee_id AND e.user_id = auth.uid())
    );

DROP POLICY IF EXISTS acct_payroll_tax_forms_select ON public.acct_payroll_tax_forms;
CREATE POLICY acct_payroll_tax_forms_select ON public.acct_payroll_tax_forms FOR SELECT
    USING (
        platform_is_admin()
        OR platform_has_permission(tenant_id, 'payroll.read')
        OR EXISTS (SELECT 1 FROM public.acct_employees e
                   WHERE e.id = acct_payroll_tax_forms.employee_id AND e.user_id = auth.uid())
    );

DROP POLICY IF EXISTS acct_payroll_runs_select ON public.acct_payroll_runs;
CREATE POLICY acct_payroll_runs_select ON public.acct_payroll_runs FOR SELECT
    USING (platform_is_admin() OR platform_has_permission(tenant_id, 'payroll.read'));

-- Published CMS content must be readable by anonymous website visitors.
DROP POLICY IF EXISTS cms_pages_public_read ON public.cms_pages;
CREATE POLICY cms_pages_public_read ON public.cms_pages FOR SELECT
    USING (status = 'published');
DROP POLICY IF EXISTS cms_banners_public_read ON public.cms_banners;
CREATE POLICY cms_banners_public_read ON public.cms_banners FOR SELECT
    USING (is_active AND (starts_at IS NULL OR starts_at <= now())
                     AND (ends_at   IS NULL OR ends_at   >  now()));
DROP POLICY IF EXISTS cms_navigation_public_read ON public.cms_navigation;
CREATE POLICY cms_navigation_public_read ON public.cms_navigation FOR SELECT
    USING (is_active AND visibility = 'public');
DROP POLICY IF EXISTS cms_galleries_public_read ON public.cms_galleries;
CREATE POLICY cms_galleries_public_read ON public.cms_galleries FOR SELECT
    USING (is_published);
DROP POLICY IF EXISTS cms_gallery_items_public_read ON public.cms_gallery_items;
CREATE POLICY cms_gallery_items_public_read ON public.cms_gallery_items FOR SELECT
    USING (is_published AND consent_on_file);
DROP POLICY IF EXISTS cms_global_content_public_read ON public.cms_global_content;
CREATE POLICY cms_global_content_public_read ON public.cms_global_content FOR SELECT
    USING (content_group <> 'legal' OR true);

-- ---- 11.4b  Appointment step codes named in the feature tree ------------
-- The tree's appointment lifecycle includes a front-desk release step and a
-- rebook prompt; crm_appointment_steps.step_code rejected both.
DO $$
DECLARE con_name text;
BEGIN
    SELECT conname INTO con_name
    FROM pg_constraint
    WHERE conrelid = 'public.crm_appointment_steps'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%nails_manicure_completed%';
    IF con_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.crm_appointment_steps DROP CONSTRAINT %I', con_name);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conname = 'crm_appointment_steps_step_code_allowed'
                     AND conrelid = 'public.crm_appointment_steps'::regclass) THEN
        ALTER TABLE public.crm_appointment_steps
            ADD CONSTRAINT crm_appointment_steps_step_code_allowed
            CHECK (step_code IN (
                'precheck_completed','deposit_paid','scheduled','assigned_to_groomer',
                'waiting_to_be_checked_in','service_type_confirmed','payment_method_confirmed',
                'checked_in','grooming_started','wash_complete','trimming_in_progress',
                'nails_manicure_completed','groomer_notes_completed','released_to_front_desk',
                'pickup_notification_sent','processed_payment_sent','checkout_completed',
                'thank_you_note_sent','visit_images_sent','rebook_prompted'
            ));
    END IF;
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
--      SELECT count(*) FROM lms.modules WHERE title ~ '^[0-9]+$';  -- expect 0
-- ============================================================================
