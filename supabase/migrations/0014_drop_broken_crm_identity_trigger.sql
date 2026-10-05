-- ============================================================================
-- 0014 — PRODUCTION HOTFIX: drop broken CRM identity-sync trigger
-- ============================================================================
-- INCIDENT (owner-reported, customers abandoning booking flow):
--   Supabase 400 {"code":"42804","message":"column \"acct_customer_id\" is of
--   type uuid but expression is of type text"}
--
-- ROOT CAUSE: migration 0013 installed trigger_crm_sync on crm_customers.
--   handle_crm_to_auth_sync() inserts into platform_customer_identity_links:
--     acct_customer_id <- (SELECT id FROM public.customers WHERE email match)
--   The salon customers.id is TEXT, the column is UUID → 42804 on every
--   crm_customers INSERT where the email matches a salon record (and a NULL
--   → NOT NULL violation where it doesn't). Customer creation dies inside
--   booking / walk-in / webhook / OAuth enrollment paths.
--
-- The trigger is also semantically wrong: acct_customer_id has an FK to
-- acct_customers(tenant_id, id) — a proper accounting record (customer_number,
-- legal_name, ar_account_id) that must never be fabricated from a salon row.
-- platform_customer_identity_links has ZERO readers in the application — the
-- trigger writes rows nobody consumes. Accounting-side linkage belongs to the
-- accounting module's explicit create-customer flow, not an INSERT trigger.
--
-- FIX: remove trigger + function. Idempotent, transactional.
-- ============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trigger_crm_sync ON public.crm_customers;

DROP FUNCTION IF EXISTS public.handle_crm_to_auth_sync();

COMMIT;

-- ----------------------------------------------------------------------------
-- DIAGNOSTIC (run separately in the SQL editor if booking errors persist):
-- The live database is ahead of local migrations (dashboard/Management-API
-- DDL). List every trigger on the booking golden-path tables to spot any
-- other live-only trigger:
--
--   SELECT event_object_table, trigger_name, action_timing, event_manipulation
--   FROM information_schema.triggers
--   WHERE trigger_schema = 'public'
--     AND event_object_table IN (
--       'customers', 'dogs', 'bookings', 'crm_customers', 'crm_pets',
--       'crm_appointments', 'order_customers', 'commerce_orders',
--       'commerce_payments'
--     )
--   ORDER BY event_object_table, trigger_name;
--
-- Any trigger writing into acct_* / platform_* tables from salon-table
-- inserts is suspect: drop it the same way (DROP TRIGGER ... ON <table>;).
-- ----------------------------------------------------------------------------
