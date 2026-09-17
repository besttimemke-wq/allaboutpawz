-- ============================================================================
-- AAPAWZ Customer Identity — the three-table join spec (§3 of the owner's
-- design). Formalizes what the code already does by email match:
--
--   admin_users     = auth.users                 (the single login identity)
--   salon_customers = public.customers           (pet/appointment-side; nullable FK "userId" -> auth.users.id)
--   order_customers = THIS MIGRATION             (shop-side; nullable FK auth_user_id -> auth.users.id)
--
-- admin_users is the JOIN TARGET. Both domain tables point at it; it doesn't
-- point at them. A person who only buys a product exists solely in
-- order_customers; a person who only books grooming exists solely in
-- salon_customers (customers); a person who does both is ONE row in
-- auth.users with BOTH a salon_customers row AND an order_customers row
-- attached — never two logins.
--
-- The join key is EXACT email match (enrollCustomer() does this — Section 3).
-- Idempotent: every step is find-or-create, safe to re-run on retried events.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  -- The join target. Nullable: a product-only buyer may exist here BEFORE
  -- their auth.users login is created (the Stripe webhook creates the
  -- order_customers row from the order's email, then enrollCustomer() invites
  -- the auth user and back-links this row).
  auth_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email           TEXT NOT NULL,
  first_name      TEXT,
  last_name       TEXT,
  phone           TEXT,
  -- Shop-side denormalized fields kept here (not on auth.users) so the
  -- Orders CRM is self-contained: a product-only buyer's default shipping
  -- address and saved-card token live on THIS row.
  default_shipping_address JSONB,
  saved_payment_method_token TEXT,
  -- Aggregate counters the Orders CRM dashboard reads without a join. Updated
  -- by the Stripe webhook / checkout flow.
  lifetime_order_count  INTEGER NOT NULL DEFAULT 0,
  lifetime_order_total  NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One order_customers row per (tenant, email). The webhook's upsert keys off
-- this so a retried Stripe event can never create a duplicate shop-side row.
CREATE UNIQUE INDEX IF NOT EXISTS order_customers_tenant_email_uniq
  ON public.order_customers (tenant_id, lower(email));

-- Fast lookup by the join key (the admin Users list joins on this).
CREATE INDEX IF NOT EXISTS order_customers_auth_user_idx
  ON public.order_customers (auth_user_id);

-- Service role (server-side routes / webhook) owns this table.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_customers TO service_role;
REVOKE ALL ON public.order_customers FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Backfill: create an order_customers row for every distinct email already
-- present in public.orders. A product-only buyer who never logged in still
-- gets a row here (auth_user_id NULL); when they later sign up via the
-- invite email, enrollCustomer() back-links it.
-- ---------------------------------------------------------------------------
INSERT INTO public.order_customers (tenant_id, auth_user_id, email, created_at, updated_at)
SELECT
  COALESCE(o.tenant_id, '00000000-0000-0000-0000-000000000001'::uuid),
  NULL,
  lower(o.email),
  NOW(),
  NOW()
FROM public.orders o
WHERE o.email IS NOT NULL AND o.email <> ''
GROUP BY lower(o.email)
ON CONFLICT (tenant_id, lower(email)) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Aggregate counters — seed lifetime_order_count / lifetime_order_total from
-- the existing orders rows. Idempotent (the webhook keeps these current
-- from now on; this just back-fills the historical baseline once).
-- ---------------------------------------------------------------------------
UPDATE public.order_customers oc SET
  lifetime_order_count = sub.cnt,
  lifetime_order_total = COALESCE(sub.tot, 0),
  updated_at = NOW()
FROM (
  SELECT
    COALESCE(o.tenant_id, '00000000-0000-0000-0000-000000000001'::uuid) AS tenant_id,
    lower(o.email) AS email,
    COUNT(*)::int AS cnt,
    COALESCE(SUM(COALESCE(o.total, o.subtotal, 0)), 0) AS tot
  FROM public.orders o
  WHERE o.email IS NOT NULL AND o.email <> ''
  GROUP BY 1, 2
) sub
WHERE oc.tenant_id = sub.tenant_id AND lower(oc.email) = sub.email;

-- ---------------------------------------------------------------------------
-- Audit comment so the next reader understands the join spec without
-- spelunking. (Postgres COMMENTs are metadata-only, never block anything.)
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.order_customers IS
  'Shop-side customer record (Orders CRM). Join target is auth.users (the single login). Nullable auth_user_id: a product-only buyer may exist here before their login is created. The Stripe webhook / enrollCustomer() back-links this row to the auth user by exact email match. See migration 0009.';
