-- ===========================================================================
-- 0003 — Review moderation tri-state (applied to live Supabase via Management API)
-- Distinguishes "Pending" (awaiting approval) from "Hidden" (admin hid an
-- approved review). Additive + backward compatible:
--   status = 'approved' | 'pending' | 'hidden'   (null falls back to visible)
-- ===========================================================================

alter table product_reviews add column if not exists "status" text;
update product_reviews set "status" = 'approved' where "visible" = true  and "status" is null;
update product_reviews set "status" = 'pending' where "visible" = false and "status" is null;

-- Admin moderation actions:
--   Approve -> { status: 'approved', visible: true }
--   Hide    -> { status: 'hidden',   visible: false }
--   New public submissions (no status, visible=false) render as "Pending".
