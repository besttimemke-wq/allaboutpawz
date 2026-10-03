-- ============================================================================
-- 0013_commerce_tracking_brands_and_crm_trigger.sql
-- All About Pawz — Phase 1/2/3 schema gap closure.
--
-- Idempotent. Safe to re-run. Uses ADD COLUMN IF NOT EXISTS / CREATE TABLE
-- IF NOT EXISTS so it adapts to whatever the live Supabase already has.
--
-- Adds:
--   1. commerce_orders: tracking_status, coupon_id, payment_status, email,
--      subtotal (tracking_number + carrier already existed)
--   2. commerce_brands (NEW table)
--   3. commerce_products: brand_id, visible, stock
--   4. pet_product_categories: mega-menu control fields
--   5. CRM identity sync trigger on crm_customers
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. commerce_orders — add the missing tracking + checkout columns. The table
--    already exists in live Supabase with 17 cols; this only adds what's
--    missing.
-- ----------------------------------------------------------------------------
ALTER TABLE public.commerce_orders
  ADD COLUMN IF NOT EXISTS tracking_status text DEFAULT 'PRE_TRANSIT',
  ADD COLUMN IF NOT EXISTS coupon_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS subtotal text;

CREATE INDEX IF NOT EXISTS commerce_orders_created_at_idx
  ON public.commerce_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS commerce_orders_customer_email_idx
  ON public.commerce_orders (customer_email);
CREATE INDEX IF NOT EXISTS commerce_orders_status_idx
  ON public.commerce_orders (status);
CREATE INDEX IF NOT EXISTS commerce_orders_fulfillment_status_idx
  ON public.commerce_orders (fulfillment_status);

-- ----------------------------------------------------------------------------
-- 2. commerce_order_items — table already exists with snake_case columns
--    (order_id, unit_price). Just ensure the index is present.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS commerce_order_items_order_id_idx
  ON public.commerce_order_items (order_id);

-- ----------------------------------------------------------------------------
-- 3. commerce_brands — dedicated brand CRUD surface (with logo upload).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commerce_brands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001',
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    logo_url text,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commerce_brands_slug_idx
  ON public.commerce_brands (slug);
CREATE INDEX IF NOT EXISTS commerce_brands_active_idx
  ON public.commerce_brands (is_active, sort_order);

-- ----------------------------------------------------------------------------
-- 4. commerce_products — add the few columns the live table is missing.
-- ----------------------------------------------------------------------------
ALTER TABLE public.commerce_products
  ADD COLUMN IF NOT EXISTS brand_id uuid,
  ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stock integer;

CREATE INDEX IF NOT EXISTS commerce_products_brand_idx
  ON public.commerce_products (brand_id);
CREATE INDEX IF NOT EXISTS commerce_products_visible_idx
  ON public.commerce_products (visible);
CREATE INDEX IF NOT EXISTS commerce_products_is_hidden_idx
  ON public.commerce_products (is_hidden);
CREATE INDEX IF NOT EXISTS commerce_products_featured_idx
  ON public.commerce_products (featured);

-- ----------------------------------------------------------------------------
-- 5. pet_product_categories — mega-menu control fields.
-- ----------------------------------------------------------------------------
ALTER TABLE public.pet_product_categories
  ADD COLUMN IF NOT EXISTS hero_image text,
  ADD COLUMN IF NOT EXISTS promo_blurb text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured_in_mega_menu boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS pet_product_categories_featured_idx
  ON public.pet_product_categories (featured_in_mega_menu);
CREATE INDEX IF NOT EXISTS pet_product_categories_sort_idx
  ON public.pet_product_categories (sort_order);

-- ----------------------------------------------------------------------------
-- 6. CRM identity sync trigger — fires after a crm_customers INSERT, links
--    the new CRM record to an existing salon `customers` row by email match.
--    Uses the REAL column names on platform_customer_identity_links
--    (crm_customer_id, acct_customer_id — NOT shop_customer_id which doesn't
--    exist).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_crm_to_auth_sync()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.platform_customer_identity_links
    (id, tenant_id, crm_customer_id, acct_customer_id, created_at)
  VALUES (
    gen_random_uuid(),
    COALESCE(NEW.tenant_id, '00000000-0000-0000-0000-000000000001'),
    NEW.id,
    (SELECT id FROM public.customers WHERE lower(email) = lower(NEW.email) LIMIT 1),
    now()
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_crm_sync ON public.crm_customers;
CREATE TRIGGER trigger_crm_sync
  AFTER INSERT ON public.crm_customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_crm_to_auth_sync();

-- ----------------------------------------------------------------------------
-- 7. Seed one default brand so the admin Brands page has a starting point.
-- ----------------------------------------------------------------------------
INSERT INTO public.commerce_brands (name, slug, description, is_active, sort_order)
SELECT 'PawLuxury', 'pawluxury', 'Premium grooming essentials for discerning pets.', true, 0
WHERE NOT EXISTS (SELECT 1 FROM public.commerce_brands WHERE slug = 'pawluxury');

COMMIT;
