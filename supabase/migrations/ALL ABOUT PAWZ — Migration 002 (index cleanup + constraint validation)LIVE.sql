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
