-- ===========================================================================
-- 0005 — Service items for the services-page accordion (CMS-manageable).
-- Drives the accordion rows: category → items with either a single price or
-- package pricing by dog size. Managed from the admin (Services Items).
-- Applied to live Supabase via Management API.
-- ===========================================================================

create table if not exists service_items (
  id text primary key default gen_random_uuid()::text,
  "category" text not null,              -- matches services.title (GROOMING, BATH & SPA, …)
  "name" text not null,
  "price" text,                          -- single price, e.g. "$15" / "$15 – $35"
  "isPackage" boolean default false,     -- true → render size price columns
  "smallPrice" text,
  "mediumPrice" text,
  "largePrice" text,
  "xlargePrice" text,
  "order" int default 0,
  "visible" boolean default true,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

-- Seed from the owner's content spec (idempotent: only when table is empty).
insert into service_items ("category", "name", "price", "isPackage", "smallPrice", "mediumPrice", "largePrice", "xlargePrice", "order", "visible")
select * from (values
  ('GROOMING',        'Full Groom',   null,  true, '$95',  '$115', '$135', '$155', 0, true),
  ('GROOMING',        'Haircuts',     null,  false, null,   null,   null,   null,   1, true),
  ('GROOMING',        'Styling',      null,  false, null,   null,   null,   null,   2, true),
  ('GROOMING',        'Bath & Brush', null,  true, '$75',  '$95',  '$115', '$135', 3, true),
  ('BATH & SPA',      'Bath & Brush', null,  true, '$75',  '$95',  '$115', '$135', 0, true),
  ('BATH & SPA',      'Deluxe Spa',   null,  true, '$125', '$145', '$165', '$185', 1, true),
  ('BATH & SPA',      'De-shedding',  '$15 – $35', false, null, null, null, null,  2, true),
  ('BATH & SPA',      'Flea Bath',    '$10', false, null,   null,   null,   null,   3, true),
  ('NAIL & PAW CARE', 'Nail Trim',    '$15', false, null,   null,   null,   null,   0, true),
  ('NAIL & PAW CARE', 'Paw Treatment','$15', false, null,   null,   null,   null,   1, true),
  ('ADD-ON SERVICES', 'Teeth Brushing','$15',false, null,   null,   null,   null,   0, true),
  ('ADD-ON SERVICES', 'De-shedding',  '$15 – $35', false, null, null, null, null,  1, true),
  ('ADD-ON SERVICES', 'Paw Treatment','$15', false, null,   null,   null,   null,   2, true),
  ('ADD-ON SERVICES', 'Nail Trim',    '$15', false, null,   null,   null,   null,   3, true),
  ('ADD-ON SERVICES', 'Flea Bath',    '$10', false, null,   null,   null,   null,   4, true),
  ('ADD-ON SERVICES', 'De-tangling',  null,  false, null,   null,   null,   null,   5, true),
  ('ADD-ON SERVICES', 'Fragrance',    null,  false, null,   null,   null,   null,   6, true)
) as seed
where not exists (select 1 from service_items);
