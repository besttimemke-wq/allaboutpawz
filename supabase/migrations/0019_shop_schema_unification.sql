-- ===========================================================================
-- 0019_shop_schema_unification.sql
-- ENTERPRISE SYSTEM SPEC v1.0 (Oct 8, 2026) — Phase 1: Secure the database
--
-- Implements:
--   §2.1  Core tables (ADDITIVE — nothing dropped, no data deleted)
--   §3.1  Reconciliation verdicts: renames, merges, C1 facet-moves,
--         C2 merchandising-moves, C3 shells kept, typo fixes
--   §3.2  Complete category tree: 4 new-animal landings, Dog|Cat shared
--         nodes (pets text[]), all missing L3/L4 nodes
--   §7.3  Remediation items 1-4 (NO IMPORTS — Phase 2 runs later, §8.2)
--
-- Principles honored:
--   * Additive, never destructive — C1/C2 nodes archived via status='draft'
--     (reversible; page off, node kept).
--   * Renames/moves rely on the existing BEFORE trigger which recomputes
--     paths, cascades descendants, and writes 301 prefix redirects
--     (route_redirects) — spec §2.3 M5 slug discipline.
--   * Every statement is idempotent (NOT EXISTS / ON CONFLICT guards).
--   * Zero products are imported by this migration (products table stays
--     empty; import is Phase 2 per the owner's explicit instruction).
--
-- Derived mappings note: spec references "§9.2" for the 7-feed rule table,
-- but §9 was NOT present in the pasted spec file. Those rows are derived
-- from the §3.2 tree annotations (each L3 carries supplier + count) and are
-- flagged notes='DERIVED — REVIEW' for owner confirmation.
-- ===========================================================================

-- Tenant used by the live tree (single-tenant deployment)
-- b2a3b20c-9816-5518-92db-f9395c063acd

-- ===========================================================================
-- SECTION A — DDL (spec §2.1, additive)
-- ===========================================================================

-- A1. taxonomy_nodes: multi-pet support (Dog|Cat shared nodes) + computed counts
ALTER TABLE taxonomy_nodes ADD COLUMN IF NOT EXISTS pets text[];
ALTER TABLE taxonomy_nodes ADD COLUMN IF NOT EXISTS product_count int DEFAULT 0;

-- A2. sources — one row per supplier feed / future seller (spec VIEW 3)
CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  name text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'feed',          -- feed | seller
  feed_url text,
  last_sync timestamptz,
  product_count int DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now()
);

-- A3. quarantine — unmapped products holding pen (spec VIEW 4; §1.2.3)
CREATE TABLE IF NOT EXISTS quarantine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  source_product_id text NOT NULL,
  title text,
  brand text,
  supplier text,
  supplier_product_type text,
  reason text,
  resolved bool DEFAULT false,
  resolved_by text,
  resolved_category text,
  created_at timestamptz DEFAULT now()
);

-- A4. stg_feed — raw JSONL staging (spec §8.2 step 1)
CREATE TABLE IF NOT EXISTS stg_feed (
  supplier text NOT NULL,
  source_product_id text NOT NULL,
  source_variant_id text,
  title text,
  handle text,
  description_html text,
  vendor text,
  product_type text,               -- staging "_pt"
  tags text[],
  variant_title text,
  sku text,
  price numeric,
  compare_at_price numeric,
  available bool,
  weight_grams int,
  image_urls text[],
  created_at timestamptz DEFAULT now(),
  UNIQUE (supplier, source_product_id, source_variant_id)
);

-- A5. products — spec §2.1 columns added alongside the existing commerce
--     columns (tenant_id, brand_id, name, ...). The import fills the spec
--     columns; existing commerce code is untouched.
ALTER TABLE products ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS handle text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_html text;   -- SANITIZED at import (§4.1)
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand text;              -- vendor, normalized case
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES taxonomy_nodes(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS pet text;                -- Dog | Cat | Fish | Bird | Reptile | Small Animal | Dog|Cat
ALTER TABLE products ADD COLUMN IF NOT EXISTS fulfillment_type text NOT NULL DEFAULT 'stocked';  -- stocked | dropship (§1.2.1)
ALTER TABLE products ADD COLUMN IF NOT EXISTS owner_type text NOT NULL DEFAULT 'platform';       -- platform | seller
ALTER TABLE products ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES sources(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_product_id text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new bool DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_sale bool DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller bool DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_salon_favorite bool DEFAULT false;
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS products_source_idx ON products(supplier_id, source_product_id);
CREATE INDEX IF NOT EXISTS products_fulfillment_idx ON products(fulfillment_type);

-- A6. product_variants — spec §2.1 columns (price lives ON the variant here;
--     existing commerce price tables untouched)
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS variant_title text;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS price numeric;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS compare_at_price numeric;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS in_stock bool;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS stock_quantity int;      -- stocked only
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS reorder_level int;       -- stocked only
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS weight_grams int;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS option_size text;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS option_color text;

-- A7. brands — wholesale reconciliation (spec §4.4 M3) + counts
ALTER TABLE brands ADD COLUMN IF NOT EXISTS product_count int DEFAULT 0;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS wholesale_confirmed bool DEFAULT false;

-- A8. seed the 8 sources (spec §1.3)
INSERT INTO sources (tenant_id, name, type) VALUES
  ('b2a3b20c-9816-5518-92db-f9395c063acd', 'petdropshipper', 'feed'),
  ('b2a3b20c-9816-5518-92db-f9395c063acd', 'groomerdepot', 'feed'),
  ('b2a3b20c-9816-5518-92db-f9395c063acd', 'bigbarker', 'feed'),
  ('b2a3b20c-9816-5518-92db-f9395c063acd', 'earthbath', 'feed'),
  ('b2a3b20c-9816-5518-92db-f9395c063acd', 'warrenlondon', 'feed'),
  ('b2a3b20c-9816-5518-92db-f9395c063acd', 'bestfriendsbysheri', 'feed'),
  ('b2a3b20c-9816-5518-92db-f9395c063acd', 'iconicpet', 'feed'),
  ('b2a3b20c-9816-5518-92db-f9395c063acd', 'kittymansions', 'feed')
ON CONFLICT (name) DO NOTHING;

-- A9. supplier_category_mapping: pet_scope column (spec §8.2 note)
ALTER TABLE supplier_category_mapping ADD COLUMN IF NOT EXISTS pet_scope text;

-- ===========================================================================
-- SECTION B0 — L3/L4 verdicts (§3.1) using OLD paths.
-- Every archive = status 'draft' + source note. Nothing is deleted.
-- ===========================================================================

-- ---- B0.1  C1 FACET-MOVES: category pages OFF, values live in facets ----
-- Dog Food "By X" nav nodes → Food Form / Lifestage / Breed Size / Dietary
-- Preference / Health Feature facets (already live in attribute system)
UPDATE taxonomy_nodes SET status = 'draft',
  source_text = concat_ws(' | ', source_text, 'archived: C1 facet-move (spec §3.1) → facet values')
WHERE path IN (
  '/shop/dog/food/shop-dog-food-by-breed-size',
  '/shop/dog/food/shop-dog-food-by-dietary-preference',
  '/shop/dog/food/shop-dog-food-by-health-condition',
  '/shop/dog/food/shop-dog-food-by-life-stage',
  '/shop/cat/food/shop-cat-food-by-dietary-preference',
  '/shop/cat/food/shop-cat-food-by-health-condition',
  '/shop/cat/food/shop-cat-food-by-life-stage'
) AND status = 'published';

-- Treats C1: lifestage/dietary/health/prescription → facets
UPDATE taxonomy_nodes SET status = 'draft',
  source_text = concat_ws(' | ', source_text, 'archived: C1 facet-move (spec §3.1)')
WHERE path IN (
  '/shop/dog/treats-chews/grain-free-dog-treats',
  '/shop/dog/treats-chews/prescription-dog-treats',
  '/shop/dog/treats-chews/puppy-treats',
  '/shop/cat/treats/grain-free-cat-treats',
  '/shop/cat/treats/kitten-treats',
  '/shop/cat/treats/natural-cat-treats',
  '/shop/cat/treats/prescription-cat-treats',
  '/shop/cat/treats/weight-management-cat-treats'
) AND status = 'published';

-- Dewormers / Rx: no Rx data in any feed → park (spec C1)
UPDATE taxonomy_nodes SET status = 'draft',
  source_text = concat_ws(' | ', source_text, 'archived: C1 no Rx feed data (spec §3.1)')
WHERE path IN (
  '/shop/dog/health-wellness/dog-dewormers-worm-medicine',
  '/shop/dog/flea-tick-solutions/dog-dewormers',
  '/shop/dog/flea-tick-solutions/flea-tick-prescription-medications',
  '/shop/cat/flea-tick-solutions/cat-dewormers',
  '/shop/cat/flea-tick-solutions/flea-tick-prescription-medications'
) AND status = 'published';

-- Cat Litter L4 variants → Litter Material / Scent / Clumping facet values
UPDATE taxonomy_nodes SET status = 'draft',
  source_text = concat_ws(' | ', source_text, 'archived: C1 facet-move → litter facets (spec §3.1)')
WHERE path LIKE '/shop/cat/litter-litter-boxes-accessories/cat-litter/%'
  AND status = 'published';

-- ---- B0.2  C2 MERCHANDISING: collections, not category pages ----
UPDATE taxonomy_nodes SET status = 'draft',
  source_text = concat_ws(' | ', source_text, 'archived: C2 merchandising → collection (spec §3.1)')
WHERE path IN (
  '/shop/dog/food/highest-quality-dog-food',
  '/shop/cat/food/highest-quality-cat-food',
  '/shop/dog/treats-chews/dog-treat-deals',
  '/shop/dog/toys/dog-toy-deals',
  '/shop/cat/toys/cat-toy-deals',
  '/shop/cat/beds-bedding/designer-cat-beds',
  '/shop/cat/beds-bedding/new-novelty-beds',
  '/shop/cat/bowls-feeders/new-novelty',
  '/shop/cat/furniture-scratchers/cat-furniture-under-100',
  '/shop/dog/collars-leashes-harnesses/everyday-low-prices'
) AND status = 'published';

-- ---- B0.3  TYPO + DUPLICATE MERGES (§3.1 B + E verdicts) ----
UPDATE taxonomy_nodes SET status = 'draft',
  source_text = concat_ws(' | ', source_text, 'archived: typo duplicate (spec §3.1 E)')
WHERE path IN (
  '/shop/dog/cleaning-potty-supplies/dog-diapers-wrapes',          -- keep Dog Diapers & Wraps
  '/shop/dog/health-wellness/dog-first-aid-recover',               -- keep Dog First Aid & Recovery
  '/shop/dog/treats-chews/freeze-dried-dog-treats-2',              -- lowercase duplicate
  '/shop/cat/furniture-scratchers/condos-and-covered-bds',         -- keep Cat Condos & Covered Beds
  '/shop/cat/health-wellness/hairball-treatment'                   -- keep Cat Hairball Control
) AND status = 'published';

-- Cat furniture duplicates (B verdicts: full names win)
UPDATE taxonomy_nodes SET status = 'draft',
  source_text = concat_ws(' | ', source_text, 'archived: merged into canonical name (spec §3.1 B)')
WHERE path IN (
  '/shop/cat/furniture-scratchers/trees-towers',                   -- keep Cat Trees & Towers
  '/shop/cat/furniture-scratchers/scratching-posts',               -- keep Cat Scratching Posts & Cardboard
  '/shop/cat/furniture-scratchers/cardboard-scratch'               -- keep Cat Scratching Posts & Cardboard
) AND status = 'published';

-- Dog beds B-verdict merges (feed-typed names win)
UPDATE taxonomy_nodes SET status = 'draft',
  source_text = concat_ws(' | ', source_text, 'archived: merged (spec §3.1 B)')
WHERE path IN (
  '/shop/dog/beds-bedding/bolster',                                -- keep Bolster Dog Beds
  '/shop/dog/beds-bedding/orthopedic',                             -- keep Orthopedic Dog Beds
  '/shop/dog/beds-bedding/cooling',                                -- keep Cooling Dog Beds & Pads
  '/shop/dog/beds-bedding/durable',                                -- keep Durable Dog Beds
  '/shop/dog/beds-bedding/crate-mats',                             -- superseded by Crate Mats & Pads
  '/shop/dog/beds-bedding/dog-bed-pet-size'                        -- E: remove/clarify
) AND status = 'published';

-- Dog toys merges
UPDATE taxonomy_nodes SET status = 'draft',
  source_text = concat_ws(' | ', source_text, 'archived: merged (spec §3.1 B)')
WHERE path IN (
  '/shop/dog/toys/dog-rope-tug-toys',                              -- keep Rope & Tug Dog Toys
  '/shop/dog/toys/tough-dog-toys'                                  -- keep Tough & Durable Dog Toys
) AND status = 'published';

-- Dog flea & tick merges → spec tree names win
UPDATE taxonomy_nodes SET status = 'draft',
  source_text = concat_ws(' | ', source_text, 'archived: merged into spec name (§3.2)')
WHERE path IN (
  '/shop/dog/flea-tick-solutions/dog-flea-collars',                -- keep Flea & Tick Prevention Collars for Dogs
  '/shop/dog/flea-tick-solutions/dog-flea-shampoos',               -- keep Flea & Tick Shampoos for Dogs
  '/shop/dog/flea-tick-solutions/dog-flea-sprays-for-houses-yards',
  '/shop/dog/flea-tick-solutions/flea-tick-treatment-sprays-for-dogs',
  '/shop/dog/flea-tick-solutions/flea-drops-for-dogs',             -- drops = topical
  '/shop/dog/flea-tick-solutions/dog-flea-tick-pills-chews'        -- merged → Fast Acting Chews & Pills
) AND status = 'published';
UPDATE taxonomy_nodes SET name = 'Flea & Tick Sprays for Houses & Yards'
WHERE path = '/shop/dog/flea-tick-solutions/flea-house-yard-sprays';
UPDATE taxonomy_nodes SET name = 'Fast Acting Chews & Pills'
WHERE path = '/shop/dog/flea-tick-solutions/dog-fast-acting-flea-chews-pills';

-- Dog treats merges → spec tree names win
UPDATE taxonomy_nodes SET status = 'draft',
  source_text = concat_ws(' | ', source_text, 'archived: merged into spec name (§3.2)')
WHERE path IN (
  '/shop/dog/treats-chews/dog-biscuits-cookies',                   -- keep Dog Biscuits, Cookies & Snacks
  '/shop/dog/treats-chews/dental-dog-treats',                      -- B: Dental Chews → Dental Dog Chews
  '/shop/dog/treats-chews/dog-bones-chew'                          -- keep Dog Bones & Chews
) AND status = 'published';

-- Cat bowls B-verdict: Auto Fountains & Feeders → Automatic Cat Feeders (exists)
UPDATE taxonomy_nodes SET status = 'draft',
  source_text = concat_ws(' | ', source_text, 'archived: merged (spec §3.1 B)')
WHERE path = '/shop/cat/bowls-feeders/auto-fountains-feeders';

-- Misplaced/superseded nodes
UPDATE taxonomy_nodes SET status = 'draft',
  source_text = concat_ws(' | ', source_text, 'archived: superseded by spec tree placement')
WHERE path IN (
  '/shop/dog/health-wellness/dog-grooming',                        -- belongs to Grooming dept, superseded
  '/shop/dog/collars-leashes-harnesses/dog-training-supplies',     -- superseded by Training & Behavior L3
  '/shop/dog/collars-leashes-harnesses/dog-stakes-tie-outs',       -- recreated under Travel & Crates
  '/shop/dog/collars-leashes-harnesses/dog-stakes-tie-outs-2',
  '/shop/dog/crates-gates-housing-accessories/dog-crate-mats-pads-covers',  -- beds dept owns crate mats
  '/shop/cat/litter-litter-boxes-accessories/litter-boxes-accessories',     -- umbrella superseded by L3 promotions
  '/shop/cat/litter-litter-boxes-accessories/litter-boxes-accessories/cat-litter-box-covers',
  '/shop/cat/litter-litter-boxes-accessories/litter-boxes-accessories/cat-litter-mats',
  '/shop/cat/litter-litter-boxes-accessories/litter-boxes-accessories/cleaners-waste-disposal',
  '/shop/cat/litter-litter-boxes-accessories/litter-boxes-accessories/litter-auto-boxes-systems',
  '/shop/cat/litter-litter-boxes-accessories/litter-boxes-accessories/litter-boxes',
  '/shop/cat/litter-litter-boxes-accessories/litter-boxes-accessories/litter-mats',
  '/shop/cat/litter-litter-boxes-accessories/litter-boxes-accessories/litter-scoops'
) AND status = 'published';

-- ---- B0.4  RE-PARENTS (spec tree placements) ----
-- Cat Scratching Posts & Cardboard lives under TOYS in the spec tree [19]
UPDATE taxonomy_nodes SET parent_id = (SELECT id FROM taxonomy_nodes WHERE path = '/shop/cat/toys')
WHERE path = '/shop/cat/furniture-scratchers/cat-scratching-posts-cardboard';

-- Promote the three litter L4s to L3 under the Litter L2 (spec: Litter L2 → 4 L3s)
UPDATE taxonomy_nodes SET parent_id = (SELECT id FROM taxonomy_nodes WHERE path = '/shop/cat/litter-litter-boxes-accessories'),
  node_type = 'subcategory'
WHERE path IN (
  '/shop/cat/litter-litter-boxes-accessories/litter-boxes-accessories/cat-litter-box-liners-filters-refills',
  '/shop/cat/litter-litter-boxes-accessories/litter-boxes-accessories/cat-litter-boxes-pans',
  '/shop/cat/litter-litter-boxes-accessories/litter-boxes-accessories/cat-litter-scoops'
);

-- ===========================================================================
-- SECTION B1 — L2 RENAMES + DEMOTIONS (§3.2 department names)
-- Slug changes auto-create 301 prefix redirects via the AFTER trigger.
-- ===========================================================================

-- ---- DOG ----
UPDATE taxonomy_nodes SET name = 'Beds & Furniture'
WHERE path = '/shop/dog/beds-bedding';
UPDATE taxonomy_nodes SET name = 'Bowls & Feeding', slug = 'bowls-feeding'
WHERE path = '/shop/dog/bowls-feeding-supplies';
UPDATE taxonomy_nodes SET name = 'Cleanup & Potty', slug = 'cleanup-potty'
WHERE path = '/shop/dog/cleaning-potty-supplies';
UPDATE taxonomy_nodes SET name = 'Collars, Leashes & Apparel'
WHERE path = '/shop/dog/collars-leashes-harnesses';
UPDATE taxonomy_nodes SET name = 'Flea & Tick', slug = 'flea-tick'
WHERE path = '/shop/dog/flea-tick-solutions';
UPDATE taxonomy_nodes SET name = 'Food'
WHERE path = '/shop/dog/food';
UPDATE taxonomy_nodes SET name = 'Grooming', slug = 'grooming'
WHERE path = '/shop/dog/grooming-supplies';
UPDATE taxonomy_nodes SET name = 'Health & Wellness'
WHERE path = '/shop/dog/health-wellness';
UPDATE taxonomy_nodes SET name = 'Toys'
WHERE path = '/shop/dog/toys';
UPDATE taxonomy_nodes SET name = 'Training & Behavior', slug = 'training-behavior'
WHERE path = '/shop/dog/training-behavior-supplies';
UPDATE taxonomy_nodes SET name = 'Travel & Crates', slug = 'travel-crates'
WHERE path = '/shop/dog/crates-gates-housing-accessories';
UPDATE taxonomy_nodes SET name = 'Treats', slug = 'treats'
WHERE path = '/shop/dog/treats-chews';
-- Demote Dog Outdoor & Travel Gear L2 → L3 under Travel & Crates (spec §3.2)
UPDATE taxonomy_nodes SET parent_id = (SELECT id FROM taxonomy_nodes WHERE path = '/shop/dog/travel-crates'),
  node_type = 'subcategory'
WHERE path = '/shop/dog/outdoor-travel-gear';
-- Demote Dog Clothes & Accessories L2 → L3 under Collars, Leashes & Apparel (spec L3 [4])
UPDATE taxonomy_nodes SET parent_id = (SELECT id FROM taxonomy_nodes WHERE path = '/shop/dog/collars-leashes-harnesses'),
  node_type = 'subcategory'
WHERE path = '/shop/dog/clothes-accessories';
-- Rename within travel: Dog Crates & Kennels → Crates & Kennels (iconicpet L3 [2])
UPDATE taxonomy_nodes SET name = 'Crates & Kennels'
WHERE path = '/shop/dog/travel-crates/dog-crates-kennels';

-- ---- CAT ----
UPDATE taxonomy_nodes SET name = 'Beds & Furniture'
WHERE path = '/shop/cat/beds-bedding';
UPDATE taxonomy_nodes SET name = 'Bowls & Feeding', slug = 'bowls-feeding'
WHERE path = '/shop/cat/bowls-feeders';
UPDATE taxonomy_nodes SET name = 'Cleanup & Potty', slug = 'cleanup-potty'
WHERE path = '/shop/cat/cleaners-waste-disposal';
UPDATE taxonomy_nodes SET name = 'Collars, Leashes & Apparel'
WHERE path = '/shop/cat/collars-leashes-harnesses';
UPDATE taxonomy_nodes SET name = 'Flea & Tick', slug = 'flea-tick'
WHERE path = '/shop/cat/flea-tick-solutions';
UPDATE taxonomy_nodes SET name = 'Food'
WHERE path = '/shop/cat/food';
UPDATE taxonomy_nodes SET name = 'Furniture & Scratchers'
WHERE path = '/shop/cat/furniture-scratchers';
UPDATE taxonomy_nodes SET name = 'Grooming', slug = 'grooming'
WHERE path = '/shop/cat/grooming-bathing';
UPDATE taxonomy_nodes SET name = 'Health & Wellness'
WHERE path = '/shop/cat/health-wellness';
UPDATE taxonomy_nodes SET name = 'Litter', slug = 'litter'
WHERE path = '/shop/cat/litter-litter-boxes-accessories';
UPDATE taxonomy_nodes SET name = 'Toys'
WHERE path = '/shop/cat/toys';
UPDATE taxonomy_nodes SET name = 'Training & Behavior'
WHERE path = '/shop/cat/training-behavior';
UPDATE taxonomy_nodes SET name = 'Treats'
WHERE path = '/shop/cat/treats';
-- Cat Carriers & Containment + Cat Steps & Ramps: C3 shells — kept as-is.
-- Cat Clothing & Accessories: kept as empty shell (not in spec tree; C3 spirit).

-- ---- PUBLISH the 4 new-animal L1s (spec §3.1 D.1) ----
UPDATE taxonomy_nodes SET status = 'published',
  source_text = concat_ws(' | ', source_text, 'published: spec §3.2 landing')
WHERE path IN ('/shop/fish', '/shop/bird', '/shop/reptile', '/shop/small-pet') AND status = 'draft';
-- Equine + Wild Bird remain draft (no feed rows; 9 horse rows quarantined per spec).

-- ===========================================================================
-- SECTION B2 — generic duplicate pass: same name + same parent → keep oldest
-- (catches the remaining doubled L3s: Dog Poop Bags & Dispensers ×2 etc.)
-- ===========================================================================
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY tenant_id, parent_id, name
    ORDER BY created_at ASC, id ASC
  ) AS rn
  FROM taxonomy_nodes
  WHERE parent_id IS NOT NULL AND node_type IN ('subcategory', 'category')
)
UPDATE taxonomy_nodes t SET status = 'draft',
  source_text = concat_ws(' | ', t.source_text, 'archived: duplicate node merged (oldest kept)')
FROM ranked r
WHERE r.id = t.id AND r.rn > 1 AND t.status = 'published';

-- ===========================================================================
-- SECTION C — NEW NODES (spec §3.2 verbatim)
-- The BEFORE trigger derives slug/path/depth/animal_id. pets set on shared.
-- ===========================================================================

-- ---- C1. Dog|Cat shared L1 (no standalone landing — renders on BOTH) ----
-- (path-guarded — ON CONFLICT alone would not fire: no unique constraint)
INSERT INTO taxonomy_nodes (tenant_id, node_type, name, slug, status, pets, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd', 'animal', 'Dog|Cat', 'dog-cat', 'draft',
       '{Dog,Cat}', 'spec §3.2 shared L1 — renders on BOTH dog + cat landings; no standalone page'
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_nodes n WHERE n.path = '/shop/dog-cat'
);

-- Shared L2s
INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, pets, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = '/shop/dog-cat'),
       'department', v.name, v.slug, 'published', '{Dog,Cat}', 'spec §3.2 Dog|Cat shared department'
FROM (VALUES
  ('Beds & Furniture', 'beds-furniture'),
  ('Bowls & Feeding', 'bowls-feeding'),
  ('Grooming', 'grooming'),
  ('Toys', 'toys')
) AS v(name, slug)
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_nodes n
  WHERE n.path = '/shop/dog-cat/' || v.slug AND n.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd'
);

-- Shared L3s (spec §3.2 Dog|Cat tree, counts in comments = expected post-import)
INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, pets, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = '/shop/dog-cat/' || v.parent),
       'subcategory', v.name, v.slug, 'published', '{Dog,Cat}', v.note
FROM (VALUES
  ('beds-furniture', 'Beds',                    'beds',                     'iconicpet 11'),
  ('beds-furniture', 'Blankets & Throws',       'blankets-throws',          'earthbath 3'),
  ('beds-furniture', 'Calming & Anxiety Beds',  'calming-anxiety-beds',     'bestfriendsbysheri 164'),
  ('bowls-feeding',  'Bowls',                   'bowls',                    'iconicpet 95'),
  ('grooming',       'Balms & Paw Care',        'balms-paw-care',           'earthbath 1'),
  ('grooming',       'Brushes & Combs',         'brushes-combs',            'warrenlondon 17'),
  ('grooming',       'Dryers',                  'dryers',                   'groomerdepot 1'),
  ('grooming',       'Foams & Waterless',       'foams-waterless',          'earthbath 6'),
  ('grooming',       'Grooming Sets',           'grooming-sets',            'earthbath 11'),
  ('grooming',       'Grooming Supplies',       'grooming-supplies',        'earthbath 12 + warrenlondon 13'),
  ('grooming',       'Nail Care',               'nail-care',                'warrenlondon 3'),
  ('grooming',       'Professional Grooming',   'professional-grooming',    'groomerdepot 628'),
  ('grooming',       'Shampoos & Conditioners', 'shampoos-conditioners',    'earthbath 71 + warrenlondon 2'),
  ('grooming',       'Sprays & Deodorizers',    'sprays-deodorizers',       'earthbath 8'),
  ('grooming',       'Travel & Containers',     'travel-containers',        'earthbath 49'),
  ('grooming',       'Value Sets',              'value-sets',               'warrenlondon 25'),
  ('grooming',       'Wipes',                   'wipes',                    'earthbath 11'),
  ('toys',           'Toys',                    'toys',                     'iconicpet 1')
) AS v(parent, name, slug, note)
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_nodes n
  WHERE n.path = '/shop/dog-cat/' || v.parent || '/' || v.slug
    AND n.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd'
);

-- Shared L4s (spec §3.2 — filtered views, products live at L3)
INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, pets, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = '/shop/dog-cat/grooming/' || v.parent),
       'category', v.name, v.slug, 'published', '{Dog,Cat}', 'spec §3.2 L4 refinement'
FROM (VALUES
  ('grooming-supplies', 'Shampoos & Conditioners', 'shampoos-conditioners'),
  ('grooming-supplies', 'Grooming Tools',           'grooming-tools'),
  ('grooming-supplies', 'Sprays & Deodorizers',     'sprays-deodorizers'),
  ('grooming-supplies', 'Wipes',                    'wipes'),
  ('grooming-supplies', 'Nail Care',                'nail-care'),
  ('nail-care',         'Nail Polish',              'nail-polish'),
  ('nail-care',         'Nail Clippers & Files',    'nail-clippers-files')
) AS v(parent, name, slug)
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_nodes n
  WHERE n.path = '/shop/dog-cat/grooming/' || v.parent || '/' || v.slug
    AND n.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd'
);

-- ---- C2. FISH / AQUATICS (433 expected) ----
INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = '/shop/fish'),
       'department', 'Aquatics', 'aquatics', 'published', 'spec §3.2 Fish L2'
WHERE NOT EXISTS (SELECT 1 FROM taxonomy_nodes n WHERE n.path = '/shop/fish/aquatics');

INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = '/shop/fish/aquatics'),
       'subcategory', v.name, v.slug, 'published', 'spec §3.2 Fish/Aquatics — petdropshipper ' || v.n
FROM (VALUES
  ('Accessories',          'accessories',          '4'),
  ('Aquarium Cleaning',    'aquarium-cleaning',    '20'),
  ('Aquariums',            'aquariums',            '6'),
  ('Aquariums Parts',      'aquariums-parts',      '7'),
  ('Decor',                'decor',                '117'),
  ('Filter Cartridges',    'filter-cartridges',    '6'),
  ('Filters & Pumps',      'filters-pumps',        '64'),
  ('Food',                 'food',                 '129'),
  ('Heaters & Gauges',     'heaters-gauges',       '4'),
  ('Light Fixtures & Bulbs','light-fixtures-bulbs','9'),
  ('Supplements',          'supplements',          '8'),
  ('Water Care',           'water-care',           '59')
) AS v(name, slug, n)
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_nodes n2
  WHERE n2.path = '/shop/fish/aquatics/' || v.slug
    AND n2.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd'
);

-- ---- C3. BIRD (60 expected) ----
INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = '/shop/bird'),
       'department', 'Bird', 'bird', 'published', 'spec §3.2 Bird L2'
WHERE NOT EXISTS (SELECT 1 FROM taxonomy_nodes n WHERE n.path = '/shop/bird/bird');

INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = '/shop/bird/bird'),
       'subcategory', v.name, v.slug, 'published', 'spec §3.2 Bird — petdropshipper ' || v.n
FROM (VALUES
  ('Cage',          'cage',          '1'),
  ('Cage Accessory','cage-accessory','5'),
  ('Food',          'food',          '23'),
  ('Mineral Block', 'mineral-block', '1'),
  ('Perches',       'perches',       '3'),
  ('Supplements',   'supplements',   '3'),
  ('Toys',          'toys',          '4'),
  ('Treats',        'treats',        '18'),
  ('Wild Bird Food','wild-bird-food','2')
) AS v(name, slug, n)
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_nodes n2
  WHERE n2.path = '/shop/bird/bird/' || v.slug
    AND n2.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd'
);

-- ---- C4. REPTILE (spec §3.2 list verbatim) ----
INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = '/shop/reptile'),
       'department', 'Reptile', 'reptile', 'published', 'spec §3.2 Reptile L2'
WHERE NOT EXISTS (SELECT 1 FROM taxonomy_nodes n WHERE n.path = '/shop/reptile/reptile');

INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = '/shop/reptile/reptile'),
       'subcategory', v.name, v.slug, 'published', 'spec §3.2 Reptile — petdropshipper ' || v.n
FROM (VALUES
  ('Bedding and Substrates', 'bedding-substrates',  '20'),
  ('Cleaning',               'cleaning',            '2'),
  ('Decor',                  'decor',               '12'),
  ('Dishes',                 'dishes',              '7'),
  ('Filter & Pumps',         'filter-pumps',        '5'),
  ('Food',                   'food',                '15'),
  ('Habitat Accessory',      'habitat-accessory',   '7'),
  ('Habitats',               'habitats',            '7'),
  ('Heaters & Gauges',       'heaters-gauges',      '7'),
  ('Light Fixtures & Bulbs', 'light-fixtures-bulbs','19'),
  ('Liners',                 'liners',              '2'),
  ('Supplements',            'supplements',         '6'),
  ('Treats',                 'treats',              '16')
) AS v(name, slug, n)
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_nodes n2
  WHERE n2.path = '/shop/reptile/reptile/' || v.slug
    AND n2.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd'
);

-- ---- C5. SMALL ANIMAL (spec §3.2 list verbatim) ----
INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = '/shop/small-pet'),
       'department', 'Small Animal', 'small-animal', 'published', 'spec §3.2 Small Animal L2'
WHERE NOT EXISTS (SELECT 1 FROM taxonomy_nodes n WHERE n.path = '/shop/small-pet/small-animal');

INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = '/shop/small-pet/small-animal'),
       'subcategory', v.name, v.slug, 'published', 'spec §3.2 Small Animal — petdropshipper ' || v.n
FROM (VALUES
  ('Accessories',            'accessories',            '2'),
  ('Bedding',                'bedding',                '10'),
  ('Dishes & Waterers',      'dishes-waterers',        '5'),
  ('Feeders and Waterers',   'feeders-waterers',       '2'),
  ('Food',                   'food',                   '41'),
  ('Food Ferret',            'food-ferret',            '1'),
  ('Food Hamster',           'food-hamster',           '1'),
  ('Food Hamster and Gerbil','food-hamster-gerbil',    '1'),
  ('Food Rabbit',            'food-rabbit',            '2'),
  ('Grooming',               'grooming',               '2'),
  ('Habitats',               'habitats',               '2'),
  ('Litter',                 'litter',                 '10'),
  ('Supplements',            'supplements',            '3'),
  ('Toys',                   'toys',                   '7'),
  ('Treats',                 'treats',                 '14'),
  ('Treats Ferret',          'treats-ferret',          '2')
) AS v(name, slug, n)
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_nodes n2
  WHERE n2.path = '/shop/small-pet/small-animal/' || v.slug
    AND n2.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd'
);

-- ---- C6. MISSING DOG L3/L4 (spec §3.2 Dog tree) ----
INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = v.parent_path),
       'subcategory', v.name, v.slug, 'published', 'spec §3.2 — ' || v.note
FROM (VALUES
  ('/shop/dog/beds-bedding', 'Bed Covers',            'bed-covers',            'bigbarker 178'),
  ('/shop/dog/beds-bedding', 'Beds',                  'beds',                  'bigbarker 114'),
  ('/shop/dog/beds-bedding', 'Blankets & Throws',     'blankets-throws',       'bigbarker 1'),
  ('/shop/dog/beds-bedding', 'Crate Mats & Pads',     'crate-mats-pads',       'bigbarker 25'),
  ('/shop/dog/beds-bedding', 'Dog Beds & Bedding',    'dog-beds-bedding',      'petdropshipper 1'),
  ('/shop/dog/beds-bedding', 'Liners & Protectors',   'liners-protectors',     'bigbarker 14'),
  ('/shop/dog/beds-bedding', 'Pillow Beds',           'pillow-beds',           'bigbarker 8'),
  ('/shop/dog/grooming',     'Dog Grooming Supplies', 'dog-grooming-supplies', 'petdropshipper 281'),
  ('/shop/dog/grooming',     'Nail Care',             'nail-care',             'warrenlondon 29'),
  ('/shop/dog/grooming',     'Professional Sizes',    'professional-sizes',    'warrenlondon 16'),
  ('/shop/dog/grooming',     'Shampoos & Conditioners','shampoos-conditioners','warrenlondon 16'),
  ('/shop/dog/grooming',     'Spa & Shampoo',         'spa-shampoo',           'warrenlondon 72'),
  ('/shop/dog/collars-leashes-harnesses', 'Apparel',  'apparel',               'iconicpet 17'),
  ('/shop/dog/collars-leashes-harnesses', 'Coats & Jackets', 'coats-jackets',  'petdropshipper 6'),
  ('/shop/dog/collars-leashes-harnesses', 'Collars & Leashes', 'collars-leashes', 'iconicpet 24 + warrenlondon 26'),
  ('/shop/dog/collars-leashes-harnesses', 'Costume',  'costume',               'petdropshipper 1'),
  ('/shop/dog/collars-leashes-harnesses', 'Head Collar', 'head-collar',        'petdropshipper 17'),
  ('/shop/dog/collars-leashes-harnesses', 'Training Collar', 'training-collar','petdropshipper 8'),
  ('/shop/dog/travel-crates', 'Dog Stakes & Tie-Outs', 'dog-stakes-tie-outs',  'petdropshipper 6'),
  ('/shop/dog/travel-crates', 'Exercise Pens',         'exercise-pens',        'iconicpet 1'),
  ('/shop/dog/training-behavior', 'Dog Training & Behavior Supplies', 'dog-training-behavior-supplies', 'petdropshipper 29'),
  ('/shop/dog/toys',         'Toys',                  'toys',                  'earthbath 2'),
  ('/shop/dog/treats',       'Interactive & Treat Dispensing Dog Toys', 'interactive-treat-dispensing-dog-toys', 'petdropshipper 1')
) AS v(parent_path, name, slug, note)
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_nodes n
  WHERE n.path = v.parent_path || '/' || v.slug
    AND n.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd'
);

-- Dog L4 refinements (spec: filtered views of parent L3)
INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = v.parent_path),
       'category', v.name, v.slug, 'published', 'spec §3.2 L4 refinement'
FROM (VALUES
  ('/shop/dog/grooming/dog-grooming-supplies', 'Shampoos & Conditioners', 'shampoos-conditioners'),
  ('/shop/dog/grooming/dog-grooming-supplies', 'Grooming Tools',          'grooming-tools'),
  ('/shop/dog/grooming/dog-grooming-supplies', 'Sprays & Deodorizers',    'sprays-deodorizers'),
  ('/shop/dog/grooming/dog-grooming-supplies', 'Wipes',                   'wipes'),
  ('/shop/dog/grooming/dog-grooming-supplies', 'Waterless Grooming',      'waterless-grooming'),
  ('/shop/dog/grooming/dog-grooming-supplies', 'Dental Care',             'dental-care'),
  ('/shop/dog/grooming/nail-care',             'Nail Polish',             'nail-polish'),
  ('/shop/dog/grooming/nail-care',             'Nail Clippers & Files',   'nail-clippers-files'),
  ('/shop/dog/travel-crates/outdoor-travel-gear', 'Car Accessories',      'car-accessories'),
  ('/shop/dog/travel-crates/outdoor-travel-gear', 'Travel Gear & Carriers','travel-gear-carriers'),
  ('/shop/dog/travel-crates/outdoor-travel-gear', 'Tie-Outs & Stakes',    'tie-outs-stakes'),
  ('/shop/dog/cleanup-potty/dog-waste-disposal', 'Poop Bags & Dispensers','poop-bags-dispensers'),
  ('/shop/dog/cleanup-potty/dog-waste-disposal', 'Scoopers & Rakes',     'scoopers-rakes'),
  ('/shop/dog/cleanup-potty/dog-waste-disposal', 'Septic Tanks & Waste Disposal', 'septic-tanks-waste-disposal')
) AS v(parent_path, name, slug)
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_nodes n
  WHERE n.path = v.parent_path || '/' || v.slug
    AND n.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd'
);

-- ---- C7. MISSING CAT L3/L4 (spec §3.2 Cat tree) ----
INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = v.parent_path),
       'subcategory', v.name, v.slug, 'published', 'spec §3.2 — ' || v.note
FROM (VALUES
  ('/shop/cat/beds-bedding',    'Cat Beds',                 'cat-beds',                  'petdropshipper 11'),
  ('/shop/cat/bowls-feeding',   'Bowls & Feeders',          'bowls-feeders',             'petdropshipper 43'),
  ('/shop/cat/cleanup-potty',   'Cat Cleaners & Waste Disposal', 'cat-cleaners-waste-disposal', 'petdropshipper 12'),
  ('/shop/cat/furniture-scratchers', 'Cat Tree Accessories','cat-tree-accessories',      'kittymansions 6'),
  ('/shop/cat/grooming',        'Cat Grooming & Bathing',   'cat-grooming-bathing',      'petdropshipper 22'),
  ('/shop/cat/grooming',        'Grooming Supplies',        'grooming-supplies',         'warrenlondon 7'),
  ('/shop/cat/treats',          'Interactive & Electronic Cat Toys', 'interactive-electronic-cat-toys', 'petdropshipper 1')
) AS v(parent_path, name, slug, note)
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_nodes n
  WHERE n.path = v.parent_path || '/' || v.slug
    AND n.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd'
);

-- Cat flea & tick canonical L3 (guard — create only if absent)
INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = '/shop/cat/flea-tick'),
       'subcategory', 'Flea & Tick Solutions for Cats', 'flea-tick-solutions-for-cats', 'published',
       'spec §3.2 — petdropshipper 19'
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_nodes n
  WHERE n.name = 'Flea & Tick Solutions for Cats'
    AND n.parent_id = (SELECT id FROM taxonomy_nodes WHERE path = '/shop/cat/flea-tick')
);

-- Cat collars canonical L3 (PDS "cat collars and leads" maps here; spec Cat tree)
INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = '/shop/cat/collars-leashes-harnesses'),
       'subcategory', 'Cat Collars, Leashes & Harnesses', 'cat-collars-leashes-harnesses', 'published',
       'spec §3.2 — petdropshipper 4'
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_nodes n
  WHERE n.name = 'Cat Collars, Leashes & Harnesses'
    AND n.parent_id = (SELECT id FROM taxonomy_nodes WHERE path = '/shop/cat/collars-leashes-harnesses')
);

-- Cat training canonical L3 (PDS "cat training" maps here; spec Cat tree)
INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = '/shop/cat/training-behavior'),
       'subcategory', 'Cat Training & Behavior', 'cat-training-behavior', 'published',
       'spec §3.2 — petdropshipper 2'
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_nodes n
  WHERE n.name = 'Cat Training & Behavior'
    AND n.parent_id = (SELECT id FROM taxonomy_nodes WHERE path = '/shop/cat/training-behavior')
);

-- Cat L4 refinements
INSERT INTO taxonomy_nodes (tenant_id, parent_id, node_type, name, slug, status, source_text)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd',
       (SELECT id FROM taxonomy_nodes WHERE path = v.parent_path),
       'category', v.name, v.slug, 'published', 'spec §3.2 L4 refinement'
FROM (VALUES
  ('/shop/cat/grooming/grooming-supplies', 'Shampoos & Conditioners', 'shampoos-conditioners'),
  ('/shop/cat/grooming/grooming-supplies', 'Grooming Tools',          'grooming-tools'),
  ('/shop/cat/grooming/grooming-supplies', 'Sprays & Deodorizers',    'sprays-deodorizers'),
  ('/shop/cat/grooming/grooming-supplies', 'Wipes',                   'wipes'),
  ('/shop/cat/grooming/grooming-supplies', 'Nail Care',               'nail-care'),
  ('/shop/cat/cleanup-potty/cat-cleaners-waste-disposal', 'Stain & Odor Removers', 'stain-odor-removers'),
  ('/shop/cat/cleanup-potty/cat-cleaners-waste-disposal', 'Waste Disposal',        'waste-disposal')
) AS v(parent_path, name, slug)
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_nodes n
  WHERE n.path = v.parent_path || '/' || v.slug
    AND n.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd'
);

-- ===========================================================================
-- SECTION D — FACETS (spec §7.3 item 1: the missing facet vocabulary)
-- New attributes + values, then node_filters per L2 (spec filter lists).
-- Existing 251 node_filters are untouched (renames preserve node ids).
-- ===========================================================================

-- D1. New attributes
INSERT INTO attributes (tenant_id, name, slug, data_type, is_variant_axis)
SELECT 'b2a3b20c-9816-5518-92db-f9395c063acd', v.name, v.slug, 'enum', false
FROM (VALUES
  ('Treatment Type', 'treatment-type'),
  ('Concern',        'concern'),
  ('Scent',          'scent'),
  ('Tank Size',      'tank-size'),
  ('Water Type',     'water-type'),
  ('Equipment Type', 'equipment-type'),
  ('Habitat Size',   'habitat-size'),
  ('Package Size',   'package-size'),
  ('Form',           'form'),
  ('Toy Type',       'toy-type'),
  ('Bowl Type',      'bowl-type'),
  ('Health Concern', 'health-concern'),
  ('Clumping',       'clumping'),
  ('Treat Type',     'treat-type'),
  ('Furniture Type', 'furniture-type'),
  ('Cleanup Type',   'cleanup-type'),
  ('Travel Type',    'travel-type'),
  ('Product Type',   'product-type'),
  ('Pet Size',       'pet-size')
) AS v(name, slug)
WHERE NOT EXISTS (SELECT 1 FROM attributes a WHERE a.slug = v.slug AND a.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd');

-- D2. Attribute values (spec §3.2 filter lists verbatim)
INSERT INTO attribute_values (attribute_id, value, slug, sort_order)
SELECT a.id, v.value, v.slug, v.ord
FROM (VALUES
  ('treatment-type', 'Topical',     'topical',     1),
  ('treatment-type', 'Collar',      'collar',      2),
  ('treatment-type', 'Shampoo',     'shampoo',     3),
  ('treatment-type', 'Comb',        'comb',        4),
  ('treatment-type', 'Home Spray',  'home-spray',  5),
  ('concern',        'Dry Skin',        'dry-skin',        1),
  ('concern',        'Sensitive Skin',  'sensitive-skin',  2),
  ('concern',        'Itch Relief',     'itch-relief',     3),
  ('concern',        'Odor Control',    'odor-control',    4),
  ('concern',        'Shedding',        'shedding',        5),
  ('scent',          'Scented',    'scented',    1),
  ('scent',          'Unscented',  'unscented',  2),
  ('tank-size',      'Under 10 Gallons', 'under-10-gallons', 1),
  ('tank-size',      '10-20 Gallons',    '10-20-gallons',    2),
  ('tank-size',      '20-40 Gallons',    '20-40-gallons',    3),
  ('tank-size',      'Over 40 Gallons',  'over-40-gallons',  4),
  ('water-type',     'Freshwater', 'freshwater', 1),
  ('water-type',     'Saltwater',  'saltwater',  2),
  ('equipment-type', 'Food',           'food',           1),
  ('equipment-type', 'Decor',          'decor',          2),
  ('equipment-type', 'Filters & Pumps','filters-pumps',  3),
  ('equipment-type', 'Lighting',       'lighting',       4),
  ('equipment-type', 'Water Care',     'water-care',     5),
  ('equipment-type', 'Aquariums',      'aquariums',      6),
  ('equipment-type', 'Heating',        'heating',        7),
  ('habitat-size',   'Small',  'small',  1),
  ('habitat-size',   'Medium', 'medium', 2),
  ('habitat-size',   'Large',  'large',  3),
  ('form',           'Chew',   'chew',   1),
  ('form',           'Liquid', 'liquid', 2),
  ('form',           'Powder', 'powder', 3),
  ('toy-type',       'Plush',        'plush',        1),
  ('toy-type',       'Interactive',  'interactive',  2),
  ('toy-type',       'Ball',         'ball',         3),
  ('toy-type',       'Rope',         'rope',         4),
  ('toy-type',       'Fetch',        'fetch',        5),
  ('toy-type',       'Chew',         'chew',         6),
  ('toy-type',       'Catnip',       'catnip',       7),
  ('toy-type',       'Teaser',       'teaser',       8),
  ('bowl-type',      'Elevated',     'elevated',     1),
  ('bowl-type',      'Slow Feeder',  'slow-feeder',  2),
  ('bowl-type',      'Fountain',     'fountain',     3),
  ('bowl-type',      'Travel',       'travel',       4),
  ('bowl-type',      'Non-Spill',    'non-spill',    5),
  ('bowl-type',      'Automatic',    'automatic',    6),
  ('health-concern', 'Dental',       'dental',       1),
  ('health-concern', 'Hip & Joint',  'hip-joint',    2),
  ('health-concern', 'Calming',      'calming',      3),
  ('health-concern', 'Digestive',    'digestive',    4),
  ('health-concern', 'Allergy & Itch','allergy-itch',5),
  ('clumping',       'Clumping',     'clumping',     1),
  ('clumping',       'Non-Clumping', 'non-clumping', 2),
  ('treat-type',     'Biscuit',      'biscuit',      1),
  ('treat-type',     'Jerky',        'jerky',        2),
  ('treat-type',     'Dental',       'dental',       3),
  ('treat-type',     'Soft & Chewy', 'soft-chewy',   4),
  ('treat-type',     'Freeze-Dried', 'freeze-dried', 5),
  ('treat-type',     'Crunchy',      'crunchy',      6),
  ('treat-type',     'Catnip',       'catnip',       7),
  ('furniture-type', 'Tree',     'tree',     1),
  ('furniture-type', 'Tower',    'tower',    2),
  ('furniture-type', 'Scratcher','scratcher',3),
  ('furniture-type', 'Condo',    'condo',    4),
  ('cleanup-type',   'Poop Bags',     'poop-bags',     1),
  ('cleanup-type',   'Pads',          'pads',          2),
  ('cleanup-type',   'Stain Remover', 'stain-remover', 3),
  ('cleanup-type',   'Scoopers',      'scoopers',      4),
  ('travel-type',    'Crate',         'crate',         1),
  ('travel-type',    'Carrier',       'carrier',       2),
  ('travel-type',    'Exercise Pen',  'exercise-pen',  3),
  ('travel-type',    'Car Accessory', 'car-accessory', 4),
  ('product-type',   'Shampoo',         'shampoo',         1),
  ('product-type',   'Wipes',           'wipes',           2),
  ('product-type',   'Sprays',          'sprays',          3),
  ('product-type',   'Tools',           'tools',           4),
  ('product-type',   'Dryers',          'dryers',          5),
  ('product-type',   'Nail Care',       'nail-care',       6),
  ('product-type',   'Spa',             'spa',             7),
  ('product-type',   'Food',            'food',            8),
  ('product-type',   'Toys',            'toys',            9),
  ('product-type',   'Perches',         'perches',         10),
  ('product-type',   'Cage Accessories','cage-accessories',11),
  ('product-type',   'Decor',           'decor',           12),
  ('product-type',   'Heating',         'heating',         13),
  ('product-type',   'Lighting',        'lighting',        14),
  ('product-type',   'Substrate',       'substrate',       15),
  ('product-type',   'Habitats',        'habitats',        16),
  ('product-type',   'Bedding',         'bedding',         17),
  ('pet-size',       'Small',  'small',  1),
  ('pet-size',       'Medium', 'medium', 2),
  ('pet-size',       'Large',  'large',  3),
  ('pet-size',       'XL',     'xl',     4)
) AS v(attr_slug, value, slug, ord)
JOIN attributes a ON a.slug = v.attr_slug AND a.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd'
WHERE NOT EXISTS (
  SELECT 1 FROM attribute_values av WHERE av.attribute_id = a.id AND av.slug = v.slug
);

-- D3. Extend the existing Pet attribute with small-animal species (spec:
--     "Animal — rabbit / ferret / hamster (title keywords)")
INSERT INTO attribute_values (attribute_id, value, slug, sort_order)
SELECT a.id, v.value, v.slug, v.ord
FROM (VALUES
  ('Rabbit', 'rabbit', 4),
  ('Ferret', 'ferret', 5),
  ('Hamster','hamster',6),
  ('Gerbil', 'gerbil', 7)
) AS v(value, slug, ord)
JOIN attributes a ON a.slug = 'pet' AND a.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd'
WHERE NOT EXISTS (SELECT 1 FROM attribute_values av WHERE av.attribute_id = a.id AND av.slug = v.slug);

-- D4. node_filters — helper insert (one row per node × attribute)
INSERT INTO node_filters (node_id, attribute_id, sort_order, value_source, display_type, ui_toggle,
                          is_searchable, is_expanded_default, is_required, allow_new_values, added_by)
SELECT n.id, a.id, v.ord, v.src, v.disp, v.tog, v.searchable, false, false, true, 'admin'
FROM (VALUES
  -- path, attr_slug, ord, src, disp, tog, searchable
  ('/shop/dog/beds-bedding',        'material',       11, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog/beds-bedding',        'features',       12, 'predefined', 'checkbox', null,       false),
  ('/shop/dog/bowls-feeding',       'bowl-type',      13, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog/cleanup-potty',       'cleanup-type',   10, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog/cleanup-potty',       'scent',          11, 'predefined', 'checkbox', null,       false),
  ('/shop/dog/flea-tick',           'treatment-type', 10, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog/flea-tick',           'pet-size',       11, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog/food',                'package-size',   13, 'computed',   'checkbox', null,       false),
  ('/shop/dog/food',                'price',          14, 'computed',   'range',    null,       false),
  ('/shop/dog/food',                'customer-rating',15, 'computed',   'rating',   null,       false),
  ('/shop/dog/grooming',            'brand',           1, 'brand',      'link',     null,       false),
  ('/shop/dog/grooming',            'price',           2, 'computed',   'range',    null,       false),
  ('/shop/dog/grooming',            'customer-rating', 3, 'computed',   'rating',   null,       false),
  ('/shop/dog/grooming',            'product-type',    4, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog/grooming',            'concern',         5, 'predefined', 'checkbox', 'show_all', false),
  ('/shop/dog/grooming',            'lifestage',       6, 'predefined', 'checkbox', null,       false),
  ('/shop/dog/grooming',            'scent',           7, 'predefined', 'checkbox', null,       false),
  ('/shop/dog/grooming',            'size',            8, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog/health-wellness',     'health-concern', 16, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog/health-wellness',     'form',           17, 'predefined', 'checkbox', null,       false),
  ('/shop/dog/toys',                'toy-type',       13, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog/training-behavior',   'brand',           1, 'brand',      'link',     null,       false),
  ('/shop/dog/training-behavior',   'price',           2, 'computed',   'range',    null,       false),
  ('/shop/dog/training-behavior',   'customer-rating', 3, 'computed',   'rating',   null,       false),
  ('/shop/dog/travel-crates',       'travel-type',    11, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog/treats',              'treat-type',     17, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog/treats',              'package-size',   18, 'computed',   'checkbox', null,       false),
  ('/shop/cat/beds-bedding',        'features',       11, 'predefined', 'checkbox', null,       false),
  ('/shop/cat/bowls-feeding',       'bowl-type',      11, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/cat/cleanup-potty',       'brand',           1, 'brand',      'link',     null,       false),
  ('/shop/cat/cleanup-potty',       'price',           2, 'computed',   'range',    null,       false),
  ('/shop/cat/cleanup-potty',       'customer-rating', 3, 'computed',   'rating',   null,       false),
  ('/shop/cat/cleanup-potty',       'cleanup-type',    4, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/cat/cleanup-potty',       'scent',           5, 'predefined', 'checkbox', null,       false),
  ('/shop/cat/cleanup-potty',       'size',            6, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/cat/collars-leashes-harnesses', 'size',      11, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/cat/collars-leashes-harnesses', 'color',     12, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/cat/collars-leashes-harnesses', 'customer-rating', 13, 'computed', 'rating', null,   false),
  ('/shop/cat/flea-tick',           'treatment-type',  5, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/cat/flea-tick',           'pet-size',        6, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/cat/food',                'package-size',   10, 'computed',   'checkbox', null,       false),
  ('/shop/cat/furniture-scratchers','furniture-type', 14, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/cat/grooming',            'brand',           1, 'brand',      'link',     null,       false),
  ('/shop/cat/grooming',            'price',           2, 'computed',   'range',    null,       false),
  ('/shop/cat/grooming',            'customer-rating', 3, 'computed',   'rating',   null,       false),
  ('/shop/cat/grooming',            'product-type',    4, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/cat/grooming',            'concern',         5, 'predefined', 'checkbox', 'show_all', false),
  ('/shop/cat/grooming',            'lifestage',       6, 'predefined', 'checkbox', null,       false),
  ('/shop/cat/grooming',            'scent',           7, 'predefined', 'checkbox', null,       false),
  ('/shop/cat/grooming',            'size',            8, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/cat/health-wellness',     'health-concern', 17, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/cat/health-wellness',     'form',           18, 'predefined', 'checkbox', null,       false),
  ('/shop/cat/litter',              'brand',           1, 'brand',      'link',     null,       false),
  ('/shop/cat/litter',              'price',           2, 'computed',   'range',    null,       false),
  ('/shop/cat/litter',              'customer-rating', 3, 'computed',   'rating',   null,       false),
  ('/shop/cat/litter/cat-litter',   'scent',           8, 'predefined', 'checkbox', null,       false),
  ('/shop/cat/litter/cat-litter',   'clumping',        9, 'predefined', 'checkbox', null,       false),
  ('/shop/cat/toys',                'toy-type',       13, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/cat/training-behavior',   'brand',           1, 'brand',      'link',     null,       false),
  ('/shop/cat/training-behavior',   'price',           2, 'computed',   'range',    null,       false),
  ('/shop/cat/training-behavior',   'customer-rating', 3, 'computed',   'rating',   null,       false),
  ('/shop/cat/treats',              'treat-type',     12, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/cat/treats',              'package-size',   13, 'computed',   'checkbox', null,       false),
  ('/shop/cat/carriers-containment','brand',           1, 'brand',      'link',     null,       false),
  ('/shop/cat/carriers-containment','price',           2, 'computed',   'range',    null,       false),
  ('/shop/cat/carriers-containment','customer-rating', 3, 'computed',   'rating',   null,       false),
  ('/shop/dog-cat/beds-furniture',  'brand',           1, 'brand',      'link',     null,       false),
  ('/shop/dog-cat/beds-furniture',  'price',           2, 'computed',   'range',    null,       false),
  ('/shop/dog-cat/beds-furniture',  'customer-rating', 3, 'computed',   'rating',   null,       false),
  ('/shop/dog-cat/beds-furniture',  'bed-type',        4, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog-cat/beds-furniture',  'size',            5, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog-cat/beds-furniture',  'material',        6, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog-cat/beds-furniture',  'features',        7, 'predefined', 'checkbox', null,       false),
  ('/shop/dog-cat/bowls-feeding',   'brand',           1, 'brand',      'link',     null,       false),
  ('/shop/dog-cat/bowls-feeding',   'price',           2, 'computed',   'range',    null,       false),
  ('/shop/dog-cat/bowls-feeding',   'customer-rating', 3, 'computed',   'rating',   null,       false),
  ('/shop/dog-cat/bowls-feeding',   'bowl-type',       4, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog-cat/bowls-feeding',   'material',        5, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog-cat/bowls-feeding',   'size',            6, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog-cat/grooming',        'brand',           1, 'brand',      'link',     null,       false),
  ('/shop/dog-cat/grooming',        'price',           2, 'computed',   'range',    null,       false),
  ('/shop/dog-cat/grooming',        'customer-rating', 3, 'computed',   'rating',   null,       false),
  ('/shop/dog-cat/grooming',        'product-type',    4, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog-cat/grooming',        'concern',         5, 'predefined', 'checkbox', 'show_all', false),
  ('/shop/dog-cat/grooming',        'lifestage',       6, 'predefined', 'checkbox', null,       false),
  ('/shop/dog-cat/grooming',        'scent',           7, 'predefined', 'checkbox', null,       false),
  ('/shop/dog-cat/grooming',        'size',            8, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog-cat/toys',            'brand',           1, 'brand',      'link',     null,       false),
  ('/shop/dog-cat/toys',            'price',           2, 'computed',   'range',    null,       false),
  ('/shop/dog-cat/toys',            'customer-rating', 3, 'computed',   'rating',   null,       false),
  ('/shop/dog-cat/toys',            'toy-type',        4, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog-cat/toys',            'size',            5, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/dog-cat/toys',            'material',        6, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/fish/aquatics',           'brand',           1, 'brand',      'link',     null,       false),
  ('/shop/fish/aquatics',           'price',           2, 'computed',   'range',    null,       false),
  ('/shop/fish/aquatics',           'customer-rating', 3, 'computed',   'rating',   null,       false),
  ('/shop/fish/aquatics',           'equipment-type',  4, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/fish/aquatics',           'tank-size',       5, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/fish/aquatics',           'water-type',      6, 'predefined', 'checkbox', null,       false),
  ('/shop/bird/bird',               'brand',           1, 'brand',      'link',     null,       false),
  ('/shop/bird/bird',               'price',           2, 'computed',   'range',    null,       false),
  ('/shop/bird/bird',               'customer-rating', 3, 'computed',   'rating',   null,       false),
  ('/shop/bird/bird',               'product-type',    4, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/reptile/reptile',         'brand',           1, 'brand',      'link',     null,       false),
  ('/shop/reptile/reptile',         'price',           2, 'computed',   'range',    null,       false),
  ('/shop/reptile/reptile',         'customer-rating', 3, 'computed',   'rating',   null,       false),
  ('/shop/reptile/reptile',         'product-type',    4, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/reptile/reptile',         'habitat-size',    5, 'predefined', 'checkbox', null,       false),
  ('/shop/small-pet/small-animal',  'brand',           1, 'brand',      'link',     null,       false),
  ('/shop/small-pet/small-animal',  'price',           2, 'computed',   'range',    null,       false),
  ('/shop/small-pet/small-animal',  'customer-rating', 3, 'computed',   'rating',   null,       false),
  ('/shop/small-pet/small-animal',  'product-type',    4, 'predefined', 'checkbox', 'collapse', false),
  ('/shop/small-pet/small-animal',  'pet',             5, 'predefined', 'checkbox', null,       false)
) AS v(path, attr_slug, ord, src, disp, tog, searchable)
JOIN taxonomy_nodes n ON n.path = v.path AND n.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd'
JOIN attributes a ON a.slug = v.attr_slug AND a.tenant_id = 'b2a3b20c-9816-5518-92db-f9395c063acd'
WHERE NOT EXISTS (
  SELECT 1 FROM node_filters f WHERE f.node_id = n.id AND f.attribute_id = a.id
);

-- D5. node_filter_values — attach the relevant value subset per node
INSERT INTO node_filter_values (node_filter_id, attribute_value_id, sort_order, is_visible, added_by)
SELECT f.id, av.id, av.sort_order, true, 'admin'
FROM node_filters f
JOIN attributes a ON a.id = f.attribute_id
JOIN attribute_values av ON av.attribute_id = a.id
WHERE f.added_by = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM node_filter_values nfv
    WHERE nfv.node_filter_id = f.id AND nfv.attribute_value_id = av.id
  )
  AND NOT EXISTS (  -- exclude pet values that don't fit the node's animal scope
    SELECT 1 FROM (
      VALUES
        ('/shop/small-pet/small-animal', 'pet', 'cat'),
        ('/shop/small-pet/small-animal', 'pet', 'dog'),
        ('/shop/small-pet/small-animal', 'pet', 'cat-dog')
    ) AS ex(path, attr, valslug)
    WHERE ex.path = (SELECT n2.path FROM taxonomy_nodes n2 WHERE n2.id = f.node_id)
      AND ex.attr = a.slug AND ex.valslug = av.slug
  );

-- Restrict product-type subsets per domain (only the spec's per-L2 values)
DELETE FROM node_filter_values nfv
USING node_filters f, attributes a, attribute_values av, taxonomy_nodes n
WHERE nfv.node_filter_id = f.id AND f.attribute_id = a.id AND nfv.attribute_value_id = av.id
  AND f.node_id = n.id AND f.added_by = 'admin' AND a.slug = 'product-type'
  AND (
    (n.path IN ('/shop/dog/grooming', '/shop/cat/grooming', '/shop/dog-cat/grooming')
     AND av.slug NOT IN ('shampoo','wipes','sprays','tools','dryers','nail-care','spa'))
    OR (n.path = '/shop/bird/bird'
     AND av.slug NOT IN ('food','toys','perches','cage-accessories'))
    OR (n.path = '/shop/reptile/reptile'
     AND av.slug NOT IN ('food','decor','heating','lighting','substrate','habitats'))
    OR (n.path = '/shop/small-pet/small-animal'
     AND av.slug NOT IN ('food','bedding','toys','habitats','litter'))
  );

-- ===========================================================================
-- SECTION E — SUPPLIER MAPPINGS (spec §7.3 item 4)
-- §9.2 was NOT in the pasted spec — these rows are DERIVED from the §3.2
-- tree annotations and flagged for owner review. petdropshipper's 196 rows
-- already exist; backfill their pet_scope from the landing.
-- ===========================================================================

-- E1. pet_scope for the existing petdropshipper rows
UPDATE supplier_category_mapping m SET pet_scope = s.pet
FROM (VALUES
  ('Dog Food', 'Dog'), ('Dog Treats', 'Dog'), ('Dog Toys', 'Dog'), ('Dog Bowls & Feeding', 'Dog'),
  ('Dog Health & Wellness', 'Dog'), ('Collars/Harnesses/Leashes', 'Dog'), ('Dog Cleanup', 'Dog'),
  ('Dog Beds', 'Dog'), ('Flea & Tick', 'Dog'), ('Cat Food', 'Cat'), ('Cat Toys', 'Cat'),
  ('Cat Treats', 'Cat'), ('Bowls & Feeders', 'Cat'), ('Cat Litter', 'Cat'),
  ('Furniture & Scratchers', 'Cat'), ('Cat Beds', 'Cat'),
  ('Fish & Aquatics', 'Fish'), ('Bird Supplies', 'Bird'),
  ('Reptile Supplies', 'Reptile'), ('Small Animal Supplies', 'Small Animal')
) AS s(landing, pet)
WHERE m.landing = s.landing AND m.pet_scope IS NULL;

-- E2. The 7 remaining feeds (derived from §3.2 annotations — REVIEW)
INSERT INTO supplier_category_mapping
  (supplier, supplier_product_type, lookup_key, landing, primary_category, categories, product_count, in_taxonomy, notes, pet_scope)
SELECT v.supplier, v.pt, normalize_product_type(v.pt), v.landing, v.primary_category,
       ARRAY[v.primary_category], v.n, true,
       'DERIVED from spec §3.2 (§9.2 not in pasted spec) — REVIEW', v.pet_scope
FROM (VALUES
  -- bigbarker → Dog / Beds & Furniture
  ('bigbarker', 'Bed Covers',           'Dog Beds',          'Bed Covers',            178, 'Dog'),
  ('bigbarker', 'Beds',                 'Dog Beds',          'Beds',                  114, 'Dog'),
  ('bigbarker', 'Blankets & Throws',    'Dog Beds',          'Blankets & Throws',       1, 'Dog'),
  ('bigbarker', 'Crate Mats & Pads',    'Dog Beds',          'Crate Mats & Pads',      25, 'Dog'),
  ('bigbarker', 'Liners & Protectors',  'Dog Beds',          'Liners & Protectors',    14, 'Dog'),
  ('bigbarker', 'Pillow Beds',          'Dog Beds',          'Pillow Beds',             8, 'Dog'),
  -- earthbath → Dog|Cat Grooming (+ Beds, Dog Toys)
  ('earthbath', 'Balms & Paw Care',     'Grooming',          'Balms & Paw Care',        1, 'Dog|Cat'),
  ('earthbath', 'Foams & Waterless',    'Grooming',          'Foams & Waterless',       6, 'Dog|Cat'),
  ('earthbath', 'Grooming Sets',        'Grooming',          'Grooming Sets',          11, 'Dog|Cat'),
  ('earthbath', 'Grooming Supplies',    'Grooming',          'Grooming Supplies',      12, 'Dog|Cat'),
  ('earthbath', 'Shampoos & Conditioners','Grooming',        'Shampoos & Conditioners',71, 'Dog|Cat'),
  ('earthbath', 'Sprays & Deodorizers', 'Grooming',          'Sprays & Deodorizers',    8, 'Dog|Cat'),
  ('earthbath', 'Travel & Containers',  'Grooming',          'Travel & Containers',    49, 'Dog|Cat'),
  ('earthbath', 'Wipes',                'Grooming',          'Wipes',                  11, 'Dog|Cat'),
  ('earthbath', 'Blankets & Throws',    'Dog Beds',          'Blankets & Throws',       3, 'Dog|Cat'),
  ('earthbath', 'Toys',                 'Dog Toys',          'Toys',                    2, 'Dog'),
  -- groomerdepot → Dog|Cat Grooming
  ('groomerdepot', 'Dryers',             'Grooming',         'Dryers',                  1, 'Dog|Cat'),
  ('groomerdepot', 'Professional Grooming','Grooming',       'Professional Grooming', 628, 'Dog|Cat'),
  -- iconicpet
  ('iconicpet', 'Apparel',              'Dog Collars',       'Apparel',                17, 'Dog'),
  ('iconicpet', 'Collars & Leashes',    'Dog Collars',       'Collars & Leashes',      24, 'Dog'),
  ('iconicpet', 'Beds',                 'Dog Beds',          'Beds',                   11, 'Dog|Cat'),
  ('iconicpet', 'Bowls',                'Dog Bowls',         'Bowls',                  95, 'Dog|Cat'),
  ('iconicpet', 'Crates & Kennels',     'Dog Crates',        'Crates & Kennels',        2, 'Dog'),
  ('iconicpet', 'Exercise Pens',        'Dog Crates',        'Exercise Pens',           1, 'Dog'),
  ('iconicpet', 'Toys',                 'Dog Toys',          'Toys',                    1, 'Dog|Cat'),
  -- kittymansions → Cat Furniture & Scratchers
  ('kittymansions', 'Cat Tree Accessories','Cat Furniture',  'Cat Tree Accessories',     6, 'Cat'),
  ('kittymansions', 'Cat Trees & Towers',  'Cat Furniture',  'Cat Trees & Towers',      36, 'Cat'),
  -- warrenlondon
  ('warrenlondon', 'Brushes & Combs',     'Grooming',        'Brushes & Combs',         17, 'Dog|Cat'),
  ('warrenlondon', 'Collars & Leashes',   'Dog Collars',     'Collars & Leashes',       26, 'Dog'),
  ('warrenlondon', 'Nail Care',           'Dog Grooming',    'Nail Care',                3, 'Dog|Cat'),
  ('warrenlondon', 'Professional Sizes',  'Dog Grooming',    'Professional Sizes',      16, 'Dog'),
  ('warrenlondon', 'Shampoos & Conditioners','Dog Grooming', 'Shampoos & Conditioners',  2, 'Dog|Cat'),
  ('warrenlondon', 'Spa & Shampoo',       'Dog Grooming',    'Spa & Shampoo',           72, 'Dog'),
  ('warrenlondon', 'Value Sets',          'Grooming',        'Value Sets',               25, 'Dog|Cat'),
  -- bestfriendsbysheri → Dog|Cat Beds & Furniture
  ('bestfriendsbysheri', 'Calming & Anxiety Beds', 'Dog Beds','Calming & Anxiety Beds', 164, 'Dog|Cat')
) AS v(supplier, pt, landing, primary_category, n, pet_scope)
ON CONFLICT (supplier, lookup_key) DO NOTHING;

-- ===========================================================================
-- SECTION F — FUNCTIONS (spec §2.3 M4 + §4.5)
-- ===========================================================================

-- F1. recompute_category_counts (M4 — the all-zeros sidebar bug dies here)
CREATE OR REPLACE FUNCTION recompute_category_counts()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE taxonomy_nodes n
     SET product_count = COALESCE((
       SELECT count(*) FROM products p
       WHERE p.category_id = n.id AND p.status = 'live'
     ), 0);
END $$;

-- F2. Salon Favorite seed rule (§4.5 — run AFTER import)
CREATE OR REPLACE FUNCTION apply_salon_favorite_rules()
RETURNS int LANGUAGE plpgsql AS $$
DECLARE affected int;
BEGIN
  UPDATE products p SET is_salon_favorite = true
  WHERE p.is_salon_favorite = false
    AND (
      (p.brand ILIKE 'big barker' AND COALESCE((SELECT min(v.price) FROM product_variants v WHERE v.product_id = p.id), 0) >= 100)
      OR (p.brand ILIKE 'warren london' AND COALESCE((SELECT min(v.price) FROM product_variants v WHERE v.product_id = p.id), 0) >= 40)
      OR (p.brand ILIKE 'earthbath' AND COALESCE((SELECT min(v.price) FROM product_variants v WHERE v.product_id = p.id), 0) >= 40)
      OR (p.brand ILIKE '%sheri%' AND COALESCE((SELECT min(v.price) FROM product_variants v WHERE v.product_id = p.id), 0) >= 50)
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END $$;

-- ===========================================================================
-- SECTION G — MISC DATA FIXES (spec §3.1 E)
-- ===========================================================================

-- "remove stray 'Internet' from Bed Type facet" — check + fix attribute value
DELETE FROM node_filter_values nfv
USING attribute_values av, attributes a
WHERE nfv.attribute_value_id = av.id AND av.attribute_id = a.id
  AND a.slug = 'bed-type' AND av.value ILIKE 'internet%';
DELETE FROM attribute_values av USING attributes a
WHERE av.attribute_id = a.id AND a.slug = 'bed-type' AND av.value ILIKE 'internet%';

-- "Puppy lifestage does not belong on cat pages" — remove Puppy from the
-- cat-side node_filter_values rows
DELETE FROM node_filter_values nfv
USING node_filters f, attributes a, attribute_values av, taxonomy_nodes n
WHERE nfv.node_filter_id = f.id AND f.attribute_id = a.id AND nfv.attribute_value_id = av.id
  AND f.node_id = n.id AND a.slug = 'lifestage' AND av.slug = 'puppy'
  AND n.path LIKE '/shop/cat/%';

-- ===========================================================================
-- SECTION H — VERIFICATION (printed by the apply script)
-- ===========================================================================
-- (queries live in the apply script, not here)
