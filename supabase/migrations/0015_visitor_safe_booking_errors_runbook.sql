-- ============================================================================
-- 0015 — Visitor-safe booking errors + self-healing trigger guard (runbook)
-- ============================================================================
-- INCIDENT (owner screenshot, production aapawz.com, mobile):
--   A returning customer saw this ON THE BOOKING WIZARD:
--     Supabase 400: {"code":"42804","message":"column \"acct_customer_id\"
--     is of type uuid but expression is of type text"}
--   Raw Postgres payloads must never reach a visitor.
--
-- WHAT SHIPPED IN CODE (src/lib/db-errors.ts, wired into /api/customers,
-- /api/cms/[dogs|consultations|bookings|messages|newsletter], and
-- /api/bookings/checkout):
--   1. FRIENDLY MAPPING — customers see plain language + a short ref code;
--      the raw error is logged server-side only.
--   2. SELF-HEAL — on the exact 42804/acct_customer_id signature the API
--      drops the two known-broken triggers (below) and retries the write
--      once. A schema re-run regression heals on the first booking.
--
-- THIS FILE = the manual belt-and-suspenders. Run it in the Supabase SQL
-- Editor of ANY Supabase project the production site points at. It is
-- idempotent: safe to run any number of times.
-- ============================================================================

BEGIN;

-- The two known-broken identity-sync triggers (42804 text→uuid). Installing
-- schema files from the dashboard can bring them back; this removes them.
DROP TRIGGER IF EXISTS trigger_sync_customer_identities ON public.customers;
DROP TRIGGER IF EXISTS trigger_crm_sync ON public.crm_customers;
DROP FUNCTION IF EXISTS public.handle_sync_customer_identities();
DROP FUNCTION IF EXISTS public.handle_crm_to_auth_sync();

COMMIT;

-- ----------------------------------------------------------------------------
-- VERIFICATION (run separately — expect ZERO rows):
--
--   SELECT c.relname AS table, t.tgname AS trigger
--   FROM pg_trigger t
--   JOIN pg_class c ON c.oid = t.tgrelid
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE NOT t.tgisinternal AND n.nspname = 'public'
--     AND c.relname IN ('customers','crm_customers','dogs','bookings');
--
-- Expect only touch_updated_at-style triggers (or nothing).
--
-- SANITY PROBE (safe to run, rolled back):
--
--   BEGIN;
--   INSERT INTO public.customers ("firstName","lastName",email)
--   VALUES ('Probe','Check','probe-should-rollback@example.com');
--   ROLLBACK;
--   -- If this INSERT errors with 42804, a rogue trigger is still present:
--   -- run the SELECT above, find the trigger name, and
--   --   DROP TRIGGER <name> ON public.<table>;
-- ----------------------------------------------------------------------------
