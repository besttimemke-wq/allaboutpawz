-- ===========================================================================
-- 0002 — Shop catalog upgrade (applied to live Supabase via Management API)
-- Enterprise product detail fields, product reviews, order enrichment.
-- ===========================================================================

-- Detail fields for the public product page + admin product editor.
alter table products
  add column if not exists "slug" text,
  add column if not exists "shortDescription" text,
  add column if not exists "materials" text,
  add column if not exists "ingredients" text,
  add column if not exists "directions" text,
  add column if not exists "warranty" text,
  add column if not exists "specs" text,
  add column if not exists "stock" int default 25,
  add column if not exists "stripeProductId" text;

update products set "slug" = btrim(lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')), '-')
  where "slug" is null or "slug" = '';
create unique index if not exists products_slug_uniq on products ("slug");

-- Reviews on the public product page (moderated: visible=false until approved).
create table if not exists product_reviews (
  id text primary key default gen_random_uuid()::text,
  "productId" text not null references products(id) on delete cascade,
  "author" text not null,
  "rating" int not null default 5,
  "title" text,
  "body" text not null,
  "verified" boolean default true,
  "visible" boolean default false,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

-- Order enrichment so admins see the full context without Stripe round-trips.
alter table orders
  add column if not exists "email" text,
  add column if not exists "deliveryMethod" text,
  add column if not exists "shippingAddress" text,
  add column if not exists "notes" text;

-- Product images live in the public "cms-media" storage bucket:
--   products/<slug>.jpg  (uploaded from the admin product editor or scripts)
