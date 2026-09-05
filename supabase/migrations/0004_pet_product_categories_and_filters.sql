-- 0004 — Pet product category taxonomy + filter framework
-- Source: user-provided DDL (upload/pet_product_categories_and_filters.sql),
-- executed against the live project via the Supabase Management API
-- (PAT) on 2026-01-19.
--
-- EXECUTION NOTES (important):
-- 1. The original child INSERT joins pet_product_categories by parent NAME in the
--    same statement that inserts the roots (data-modifying CTE). Postgres statement
--    snapshots hide the CTE's own inserts, so each run only materializes ONE more
--    tree level. Run the script three times to fully populate a fresh database.
-- 2. UNIQUE(parent_id, slug) treats NULL parent_ids as distinct, so re-running
--    duplicates the 10 root rows (and children fan out per duplicate). The live
--    tree was rebuilt cleanly after execution (88 categories, 122 filter mappings,
--    246 filter values) with a level-aware re-insert.
-- 3. Post-run alignment (live): products."categoryId" BIGINT -> pet_product_categories(id)
--    ON DELETE SET NULL, backfilled for the 8 catalog products; products.category
--    text synced to the leaf category name.
-- On a fresh database, prefer fixing UNIQUE to `UNIQUE NULLS NOT DISTINCT` before running.

-- 4. Slug disambiguation (post-run): 'Backpacks' existed under both
--    Apparel & Accessories and Carriers & Travel Products with the same slug.
--    The carrier one was renamed slug -> 'backpack-carriers' so every category
--    slug is globally unique (required by /shop/category/[slug] routing).

BEGIN;

CREATE TABLE IF NOT EXISTS pet_product_categories (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id   BIGINT REFERENCES pet_product_categories(id)
                ON DELETE CASCADE,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL,
    source_url  TEXT,
    UNIQUE (parent_id, slug)
);

WITH category_data (parent_name, name, source_url) AS (
    VALUES
        (NULL, 'Pet Supplies', NULL),
        (NULL, 'Dog Feeding & Watering Supplies', NULL),
        (NULL, 'Dog Grooming Supplies', NULL),
        (NULL, 'Dog Beds & Furniture', NULL),
        (NULL, 'Dog Treat Cookies, Biscuits & Snacks', NULL),
        (NULL, 'Dog Apparel & Accessories', NULL),
        (NULL, 'Dog Chew Toys', NULL),
        (NULL, 'Collars, Harnesses & Leashes', NULL),
        (NULL, 'Carriers & Travel Products', NULL),
        (NULL, 'Health Supplies', NULL),

        ('Dog Feeding & Watering Supplies', 'Feeding & Watering Supplies', NULL),
        ('Feeding & Watering Supplies', 'Automatic Feeders', NULL),
        ('Feeding & Watering Supplies', 'Bowls & Dishes', NULL),
        ('Feeding & Watering Supplies', 'Feeding Mats', NULL),
        ('Feeding & Watering Supplies', 'Food Storage', NULL),
        ('Feeding & Watering Supplies', 'Fountains', NULL),
        ('Feeding & Watering Supplies', 'Lick Mats', NULL),
        ('Feeding & Watering Supplies', 'Nursing Supplies', NULL),
        ('Feeding & Watering Supplies', 'Water Bottles', NULL),

        ('Dog Grooming Supplies', 'Grooming', NULL),
        ('Grooming', 'Brushes', NULL),
        ('Grooming', 'Claw Care', NULL),
        ('Grooming', 'Colognes', NULL),
        ('Grooming', 'Combs', NULL),
        ('Grooming', 'Dander Remover Sprays', NULL),
        ('Grooming', 'Dematting Tools', NULL),
        ('Grooming', 'Deodorizers', NULL),
        ('Grooming', 'Electric Clippers & Blades', NULL),
        ('Grooming', 'Grooming Wipes', NULL),
        ('Grooming', 'Hair Removal Mitts & Rollers', NULL),
        ('Grooming', 'Scissors', NULL),
        ('Grooming', 'Shampoos & Conditioners', NULL),
        ('Grooming', 'Shedding Tools', NULL),
        ('Grooming', 'Shower & Bath Supplies', NULL),
        ('Grooming', 'Styptic Gels & Powders', NULL),

        ('Dog Beds & Furniture', 'Beds & Furniture', NULL),
        ('Beds & Furniture', 'Bed Blankets', NULL),
        ('Beds & Furniture', 'Bed Covers', NULL),
        ('Beds & Furniture', 'Bed Liners', NULL),
        ('Beds & Furniture', 'Bed Mats', NULL),
        ('Beds & Furniture', 'Bed Pillows', NULL),
        ('Beds & Furniture', 'Beds', NULL),
        ('Beds & Furniture', 'Furniture-Style Crates', NULL),
        ('Beds & Furniture', 'Sofas & Chairs', NULL),
        ('Beds & Furniture', 'Stairs & Steps', NULL),

        ('Dog Treat Cookies, Biscuits & Snacks', 'Cookies', NULL),
        ('Dog Treat Cookies, Biscuits & Snacks', 'Biscuits', NULL),
        ('Dog Treat Cookies, Biscuits & Snacks', 'Snacks', NULL),

        ('Dog Apparel & Accessories', 'Apparel & Accessories', NULL),
        ('Apparel & Accessories', 'Backpacks', NULL),
        ('Apparel & Accessories', 'Bandanas', NULL),
        ('Apparel & Accessories', 'Boots & Paw Protectors', NULL),
        ('Apparel & Accessories', 'Cold Weather Coats', NULL),
        ('Apparel & Accessories', 'Costumes', NULL),
        ('Apparel & Accessories', 'Dresses', NULL),
        ('Apparel & Accessories', 'Hair Accessories', NULL),
        ('Apparel & Accessories', 'Hats', NULL),
        ('Apparel & Accessories', 'Hoodies', NULL),
        ('Apparel & Accessories', 'Lifejackets', NULL),
        ('Apparel & Accessories', 'Necklaces & Pendants', NULL),
        ('Apparel & Accessories', 'Raincoats', NULL),
        ('Apparel & Accessories', 'Shirts', NULL),
        ('Apparel & Accessories', 'Sunglasses', NULL),
        ('Apparel & Accessories', 'Sweaters', NULL),

        ('Collars, Harnesses & Leashes', 'Collars', NULL),
        ('Collars, Harnesses & Leashes', 'Harnesses', NULL),
        ('Collars, Harnesses & Leashes', 'Leashes', NULL),
        ('Collars, Harnesses & Leashes', 'Muzzles', NULL),
        ('Collars, Harnesses & Leashes', 'ID Tags & Collar Accessories', NULL),
        ('Collars, Harnesses & Leashes', 'Location Trackers', NULL),
        ('Collars, Harnesses & Leashes', 'Activity Trackers', NULL),

        ('Carriers & Travel Products', 'Backpacks', NULL),
        ('Carriers & Travel Products', 'Bicycle Carriers', NULL),
        ('Carriers & Travel Products', 'Bicycle Trailers', NULL),
        ('Carriers & Travel Products', 'Car Travel Accessories', NULL),
        ('Carriers & Travel Products', 'Carriers', NULL),
        ('Carriers & Travel Products', 'Purses', NULL),
        ('Carriers & Travel Products', 'Slings', NULL),
        ('Carriers & Travel Products', 'Strollers', NULL),

        ('Health Supplies', 'Dental Care', NULL),
        ('Health Supplies', 'Digestive Remedies', NULL),
        ('Health Supplies', 'DNA Tests', NULL),
        ('Health Supplies', 'Ear Care', NULL),
        ('Health Supplies', 'Eye Care', NULL),
        ('Health Supplies', 'Hip & Joint Care', NULL),
        ('Health Supplies', 'Itch Remedies', NULL),
        ('Health Supplies', 'Supplements & Vitamins', NULL),

        ('Dog Chew Toys', 'Chew Toys', NULL)
),
normalized AS (
    SELECT
        parent_name,
        name,
        source_url,
        lower(
            regexp_replace(
                regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'),
                '(^-|-$)', '', 'g'
            )
        ) AS slug
    FROM category_data
),
inserted_roots AS (
    INSERT INTO pet_product_categories (parent_id, name, slug, source_url)
    SELECT NULL, name, slug, source_url
    FROM normalized
    WHERE parent_name IS NULL
    ON CONFLICT (parent_id, slug)
    DO UPDATE SET
        name = EXCLUDED.name,
        source_url = COALESCE(EXCLUDED.source_url,
                              pet_product_categories.source_url)
    RETURNING id, name
)
INSERT INTO pet_product_categories (parent_id, name, slug, source_url)
SELECT
    parent.id,
    child.name,
    child.slug,
    child.source_url
FROM normalized child
JOIN pet_product_categories parent
    ON parent.name = child.parent_name
WHERE child.parent_name IS NOT NULL
ON CONFLICT (parent_id, slug)
DO UPDATE SET
    name = EXCLUDED.name,
    source_url = COALESCE(EXCLUDED.source_url,
                          pet_product_categories.source_url);


-- ============================================================
-- PET PRODUCT FILTER TAXONOMY
-- Designed to accompany pet_product_categories.
-- ============================================================

CREATE TABLE IF NOT EXISTS pet_product_filters (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    filter_type     TEXT NOT NULL,
    display_order   INTEGER NOT NULL DEFAULT 0,
    is_global       BOOLEAN NOT NULL DEFAULT FALSE,
    is_searchable   BOOLEAN NOT NULL DEFAULT TRUE,
    is_multiselect  BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS pet_product_filter_values (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    filter_id       BIGINT NOT NULL REFERENCES pet_product_filters(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    display_order   INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (filter_id, slug)
);

CREATE TABLE IF NOT EXISTS pet_category_filters (
    category_id     BIGINT NOT NULL REFERENCES pet_product_categories(id) ON DELETE CASCADE,
    filter_id       BIGINT NOT NULL REFERENCES pet_product_filters(id) ON DELETE CASCADE,
    display_order   INTEGER NOT NULL DEFAULT 0,
    is_required     BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (category_id, filter_id)
);

WITH filter_data(name, slug, filter_type, display_order, is_global, is_multiselect) AS (
    VALUES
    ('Brand','brand','select',10,TRUE,FALSE),
    ('Price','price','range',20,TRUE,FALSE),
    ('Rating','rating','range',30,TRUE,FALSE),
    ('Color','color','select',40,TRUE,TRUE),
    ('Material','material','select',50,TRUE,TRUE),
    ('Size','size','select',60,TRUE,TRUE),
    ('Availability','availability','select',70,TRUE,FALSE),

    ('Capacity','capacity','select',100,FALSE,FALSE),
    ('Bowl Type','bowl-type','select',110,FALSE,TRUE),
    ('Food Type','food-type','select',120,FALSE,TRUE),
    ('Automatic','automatic','boolean',130,FALSE,FALSE),
    ('Portion Control','portion-control','boolean',140,FALSE,FALSE),
    ('Dishwasher Safe','dishwasher-safe','boolean',150,FALSE,FALSE),
    ('Slow Feeder','slow-feeder','boolean',160,FALSE,FALSE),
    ('Elevated','elevated','boolean',170,FALSE,FALSE),
    ('Travel Friendly','travel-friendly','boolean',180,FALSE,FALSE),

    ('Coat Type','coat-type','select',200,FALSE,TRUE),
    ('Grooming Function','grooming-function','select',210,FALSE,TRUE),
    ('Tool Type','tool-type','select',220,FALSE,TRUE),
    ('Blade Size','blade-size','select',230,FALSE,TRUE),
    ('Hair Length','hair-length','select',240,FALSE,TRUE),
    ('Scent','scent','select',250,FALSE,TRUE),
    ('Corded / Cordless','power-type','select',260,FALSE,FALSE),
    ('Waterproof','waterproof','boolean',270,FALSE,FALSE),

    ('Bed Type','bed-type','select',300,FALSE,TRUE),
    ('Bed Size','bed-size','select',310,FALSE,TRUE),
    ('Shape','shape','select',320,FALSE,TRUE),
    ('Fill Material','fill-material','select',330,FALSE,TRUE),
    ('Cover Material','cover-material','select',340,FALSE,TRUE),
    ('Washable','washable','boolean',350,FALSE,FALSE),
    ('Waterproof','bed-waterproof','boolean',360,FALSE,FALSE),
    ('Orthopedic','orthopedic','boolean',370,FALSE,FALSE),
    ('Cooling','cooling','boolean',380,FALSE,FALSE),
    ('Heated','heated','boolean',390,FALSE,FALSE),
    ('Indoor / Outdoor','environment','select',400,FALSE,TRUE),

    ('Treat Type','treat-type','select',500,FALSE,TRUE),
    ('Flavor','flavor','select',510,FALSE,TRUE),
    ('Protein','protein','select',520,FALSE,TRUE),
    ('Life Stage','life-stage','select',530,FALSE,TRUE),
    ('Breed Size','breed-size','select',540,FALSE,TRUE),
    ('Dietary Needs','dietary-needs','select',550,FALSE,TRUE),
    ('Ingredient Type','ingredient-type','select',560,FALSE,TRUE),
    ('Grain Free','grain-free','boolean',570,FALSE,FALSE),
    ('Organic','organic','boolean',580,FALSE,FALSE),
    ('Rawhide Free','rawhide-free','boolean',590,FALSE,FALSE),

    ('Apparel Type','apparel-type','select',600,FALSE,TRUE),
    ('Apparel Size','apparel-size','select',610,FALSE,TRUE),
    ('Season','season','select',620,FALSE,TRUE),
    ('Weather Protection','weather-protection','select',630,FALSE,TRUE),
    ('Adjustable','adjustable','boolean',640,FALSE,FALSE),
    ('Reflective','reflective','boolean',650,FALSE,FALSE),
    ('Insulated','insulated','boolean',660,FALSE,FALSE),
    ('Water Resistant','water-resistant','boolean',670,FALSE,FALSE),

    ('Product Type','product-type','select',700,FALSE,TRUE),
    ('Width','width','select',710,FALSE,TRUE),
    ('Length','length','select',720,FALSE,TRUE),
    ('Closure Type','closure-type','select',730,FALSE,TRUE),
    ('Padded','padded','boolean',740,FALSE,FALSE),
    ('GPS Compatible','gps-compatible','boolean',750,FALSE,FALSE),
    ('Personalized','personalized','boolean',760,FALSE,FALSE),
    ('Pull Strength','pull-strength','select',770,FALSE,FALSE),

    ('Carrier Size','carrier-size','select',800,FALSE,TRUE),
    ('Pet Weight Capacity','pet-weight-capacity','select',810,FALSE,TRUE),
    ('Airline Approved','airline-approved','boolean',820,FALSE,FALSE),
    ('Vehicle Compatible','vehicle-compatible','boolean',830,FALSE,TRUE),
    ('Foldable','foldable','boolean',840,FALSE,FALSE),
    ('Crash Tested','crash-tested','boolean',850,FALSE,FALSE),
    ('Ventilation','ventilation','select',860,FALSE,FALSE),
    ('Travel Type','travel-type','select',870,FALSE,TRUE),

    ('Health Product Type','health-product-type','select',900,FALSE,TRUE),
    ('Form','form','select',910,FALSE,TRUE),
    ('Intended Use','intended-use','select',920,FALSE,TRUE),
    ('Ingredients','ingredients','select',930,FALSE,TRUE),
    ('Administration','administration','select',940,FALSE,TRUE),
    ('Dietary Restriction','dietary-restriction','select',950,FALSE,TRUE),
    ('Target Area','target-area','select',960,FALSE,TRUE),
    ('Life Stage','health-life-stage','select',970,FALSE,TRUE)
),
upsert_filters AS (
    INSERT INTO pet_product_filters
        (name, slug, filter_type, display_order, is_global, is_multiselect)
    SELECT name, slug, filter_type, display_order, is_global, is_multiselect
    FROM filter_data
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        filter_type = EXCLUDED.filter_type,
        display_order = EXCLUDED.display_order,
        is_global = EXCLUDED.is_global,
        is_multiselect = EXCLUDED.is_multiselect,
        is_active = TRUE
    RETURNING id
)
SELECT 1;

-- ============================================================
-- FILTER VALUES
-- ============================================================

WITH value_data(filter_slug, name, slug, display_order) AS (
    VALUES
    ('color','Black','black',10),('color','Blue','blue',20),('color','Brown','brown',30),
    ('color','Gray','gray',40),('color','Green','green',50),('color','Orange','orange',60),
    ('color','Pink','pink',70),('color','Purple','purple',80),('color','Red','red',90),
    ('color','White','white',100),('color','Yellow','yellow',110),('color','Multicolor','multicolor',120),

    ('size','XXS','xxs',10),('size','XS','xs',20),('size','S','s',30),
    ('size','M','m',40),('size','L','l',50),('size','XL','xl',60),('size','XXL','xxl',70),

    ('availability','In Stock','in-stock',10),
    ('availability','Out of Stock','out-of-stock',20),

    ('capacity','Under 2 Cups','under-2-cups',10),('capacity','2–4 Cups','2-4-cups',20),
    ('capacity','4–8 Cups','4-8-cups',30),('capacity','8+ Cups','8-plus-cups',40),

    ('bowl-type','Standard','standard',10),('bowl-type','Slow Feeder','slow-feeder',20),
    ('bowl-type','Elevated','elevated',30),('bowl-type','Travel','travel',40),
    ('bowl-type','Stainless Steel','stainless-steel',50),('bowl-type','Ceramic','ceramic',60),
    ('bowl-type','Plastic','plastic',70),

    ('food-type','Dry Food','dry-food',10),('food-type','Wet Food','wet-food',20),
    ('food-type','Treats','treats',30),('food-type','Mixed','mixed',40),

    ('coat-type','Short','short',10),('coat-type','Medium','medium',20),
    ('coat-type','Long','long',30),('coat-type','Curly','curly',40),
    ('coat-type','Double Coat','double-coat',50),('coat-type','Wire Coat','wire-coat',60),

    ('grooming-function','Bathing','bathing',10),('grooming-function','Brushing','brushing',20),
    ('grooming-function','Dematting','dematting',30),('grooming-function','Deshedding','deshedding',40),
    ('grooming-function','Claw Care','claw-care',50),('grooming-function','Hair Removal','hair-removal',60),

    ('tool-type','Brush','brush',10),('tool-type','Comb','comb',20),
    ('tool-type','Rake','rake',30),('tool-type','Clipper','clipper',40),
    ('tool-type','Scissors','scissors',50),('tool-type','Mitt','mitt',60),

    ('hair-length','Short','short',10),('hair-length','Medium','medium',20),
    ('hair-length','Long','long',30),

    ('scent','Unscented','unscented',10),('scent','Fresh','fresh',20),
    ('scent','Lavender','lavender',30),('scent','Oatmeal','oatmeal',40),

    ('power-type','Corded','corded',10),('power-type','Cordless','cordless',20),
    ('power-type','Battery Powered','battery-powered',30),

    ('bed-type','Bolster','bolster',10),('bed-type','Donut','donut',20),
    ('bed-type','Mat','mat',30),('bed-type','Cushion','cushion',40),
    ('bed-type','Nest','nest',50),('bed-type','Elevated','elevated',60),
    ('bed-type','Orthopedic','orthopedic',70),('bed-type','Heated','heated',80),
    ('bed-type','Cooling','cooling',90),

    ('bed-size','Small','small',10),('bed-size','Medium','medium',20),
    ('bed-size','Large','large',30),('bed-size','Extra Large','extra-large',40),

    ('shape','Round','round',10),('shape','Oval','oval',20),
    ('shape','Rectangular','rectangular',30),('shape','Square','square',40),

    ('fill-material','Memory Foam','memory-foam',10),('fill-material','Foam','foam',20),
    ('fill-material','Polyester Fiber','polyester-fiber',30),('fill-material','Cotton','cotton',40),
    ('fill-material','Gel','gel',50),

    ('cover-material','Cotton','cotton',10),('cover-material','Polyester','polyester',20),
    ('cover-material','Microfiber','microfiber',30),('cover-material','Fleece','fleece',40),
    ('cover-material','Canvas','canvas',50),

    ('environment','Indoor','indoor',10),('environment','Outdoor','outdoor',20),
    ('environment','Indoor / Outdoor','indoor-outdoor',30),

    ('treat-type','Cookies','cookies',10),('treat-type','Biscuits','biscuits',20),
    ('treat-type','Training Treats','training-treats',30),('treat-type','Dental Treats','dental-treats',40),
    ('treat-type','Jerky','jerky',50),('treat-type','Chews','chews',60),

    ('flavor','Beef','beef',10),('flavor','Chicken','chicken',20),('flavor','Turkey','turkey',30),
    ('flavor','Lamb','lamb',40),('flavor','Salmon','salmon',50),('flavor','Peanut Butter','peanut-butter',60),
    ('flavor','Cheese','cheese',70),('flavor','Vegetable','vegetable',80),

    ('protein','Beef','beef',10),('protein','Chicken','chicken',20),('protein','Turkey','turkey',30),
    ('protein','Lamb','lamb',40),('protein','Salmon','salmon',50),('protein','Duck','duck',60),
    ('protein','Venison','venison',70),('protein','Rabbit','rabbit',80),

    ('life-stage','Puppy','puppy',10),('life-stage','Adult','adult',20),
    ('life-stage','Senior','senior',30),('life-stage','All Life Stages','all-life-stages',40),

    ('breed-size','Toy','toy',10),('breed-size','Small','small',20),
    ('breed-size','Medium','medium',30),('breed-size','Large','large',40),
    ('breed-size','Giant','giant',50),('breed-size','All Sizes','all-sizes',60),

    ('dietary-needs','Weight Management','weight-management',10),
    ('dietary-needs','Sensitive Stomach','sensitive-stomach',20),
    ('dietary-needs','Skin & Coat','skin-coat',30),
    ('dietary-needs','Limited Ingredient','limited-ingredient',40),
    ('dietary-needs','High Protein','high-protein',50),

    ('ingredient-type','Single Protein','single-protein',10),
    ('ingredient-type','Limited Ingredient','limited-ingredient',20),
    ('ingredient-type','Natural','natural',30),
    ('ingredient-type','Freeze Dried','freeze-dried',40),

    ('apparel-type','Coat','coat',10),('apparel-type','Jacket','jacket',20),
    ('apparel-type','Sweater','sweater',30),('apparel-type','Hoodie','hoodie',40),
    ('apparel-type','Shirt','shirt',50),('apparel-type','Dress','dress',60),
    ('apparel-type','Raincoat','raincoat',70),('apparel-type','Costume','costume',80),
    ('apparel-type','Boots','boots',90),

    ('apparel-size','XXS','xxs',10),('apparel-size','XS','xs',20),
    ('apparel-size','S','s',30),('apparel-size','M','m',40),
    ('apparel-size','L','l',50),('apparel-size','XL','xl',60),
    ('apparel-size','XXL','xxl',70),

    ('season','Spring','spring',10),('season','Summer','summer',20),
    ('season','Fall','fall',30),('season','Winter','winter',40),
    ('season','All Season','all-season',50),

    ('weather-protection','Cold Weather','cold-weather',10),
    ('weather-protection','Rain','rain',20),('weather-protection','Snow','snow',30),
    ('weather-protection','Wind','wind',40),('weather-protection','Sun','sun',50),

    ('product-type','Collar','collar',10),('product-type','Harness','harness',20),
    ('product-type','Leash','leash',30),('product-type','Muzzle','muzzle',40),
    ('product-type','ID Tag','id-tag',50),('product-type','Tracker','tracker',60),

    ('width','Narrow','narrow',10),('width','Standard','standard',20),('width','Wide','wide',30),

    ('length','Under 4 ft','under-4-ft',10),('length','4–6 ft','4-6-ft',20),
    ('length','6–10 ft','6-10-ft',30),('length','10+ ft','10-plus-ft',40),

    ('closure-type','Buckle','buckle',10),('closure-type','Quick Release','quick-release',20),
    ('closure-type','Martingale','martingale',30),('closure-type','Step In','step-in',40),

    ('pull-strength','Light Duty','light-duty',10),('pull-strength','Standard','standard',20),
    ('pull-strength','Heavy Duty','heavy-duty',30),

    ('carrier-size','Small','small',10),('carrier-size','Medium','medium',20),
    ('carrier-size','Large','large',30),('carrier-size','Extra Large','extra-large',40),

    ('pet-weight-capacity','Under 10 lb','under-10-lb',10),
    ('pet-weight-capacity','10–20 lb','10-20-lb',20),
    ('pet-weight-capacity','21–40 lb','21-40-lb',30),
    ('pet-weight-capacity','41–60 lb','41-60-lb',40),
    ('pet-weight-capacity','61–80 lb','61-80-lb',50),
    ('pet-weight-capacity','81+ lb','81-plus-lb',60),

    ('vehicle-compatible','Car','car',10),('vehicle-compatible','SUV','suv',20),
    ('vehicle-compatible','Truck','truck',30),('vehicle-compatible','Bicycle','bicycle',40),
    ('vehicle-compatible','Air Travel','air-travel',50),

    ('ventilation','Low','low',10),('ventilation','Standard','standard',20),
    ('ventilation','High','high',30),

    ('travel-type','Air Travel','air-travel',10),('travel-type','Car Travel','car-travel',20),
    ('travel-type','Bicycle','bicycle',30),('travel-type','Walking','walking',40),

    ('health-product-type','Dental Care','dental-care',10),
    ('health-product-type','Digestive Care','digestive-care',20),
    ('health-product-type','DNA Test','dna-test',30),
    ('health-product-type','Ear Care','ear-care',40),
    ('health-product-type','Eye Care','eye-care',50),
    ('health-product-type','Hip & Joint','hip-joint',60),
    ('health-product-type','Itch Relief','itch-relief',70),
    ('health-product-type','Supplement','supplement',80),

    ('form','Chew','chew',10),('form','Tablet','tablet',20),
    ('form','Capsule','capsule',30),('form','Powder','powder',40),
    ('form','Liquid','liquid',50),('form','Soft Chew','soft-chew',60),
    ('form','Topical','topical',70),('form','Wipe','wipe',80),

    ('intended-use','Dental Health','dental-health',10),
    ('intended-use','Digestive Health','digestive-health',20),
    ('intended-use','Joint Health','joint-health',30),
    ('intended-use','Skin Health','skin-health',40),
    ('intended-use','Ear Health','ear-health',50),
    ('intended-use','Eye Health','eye-health',60),

    ('administration','Oral','oral',10),('administration','Topical','topical',20),
    ('administration','Chewable','chewable',30),('administration','Mixed With Food','mixed-with-food',40),

    ('dietary-restriction','Grain Free','grain-free',10),
    ('dietary-restriction','Gluten Free','gluten-free',20),
    ('dietary-restriction','Limited Ingredient','limited-ingredient',30),
    ('dietary-restriction','Vegetarian','vegetarian',40),

    ('target-area','Teeth','teeth',10),('target-area','Gums','gums',20),
    ('target-area','Ears','ears',30),('target-area','Eyes','eyes',40),
    ('target-area','Skin','skin',50),('target-area','Coat','coat',60),
    ('target-area','Hips','hips',70),('target-area','Joints','joints',80),
    ('target-area','Digestive System','digestive-system',90),

    ('health-life-stage','Puppy','puppy',10),('health-life-stage','Adult','adult',20),
    ('health-life-stage','Senior','senior',30),('health-life-stage','All Life Stages','all-life-stages',40)
),
insert_values AS (
    INSERT INTO pet_product_filter_values
        (filter_id, name, slug, display_order)
    SELECT f.id, v.name, v.slug, v.display_order
    FROM value_data v
    JOIN pet_product_filters f ON f.slug = v.filter_slug
    ON CONFLICT (filter_id, slug) DO UPDATE SET
        name = EXCLUDED.name,
        display_order = EXCLUDED.display_order,
        is_active = TRUE
    RETURNING id
)
SELECT 1;

-- ============================================================
-- CATEGORY → FILTER MAPPINGS
-- ============================================================

WITH mappings(category_name, filter_slug, display_order) AS (
    VALUES
    ('Pet Supplies','brand',10),
    ('Pet Supplies','price',20),
    ('Pet Supplies','rating',30),
    ('Pet Supplies','color',40),
    ('Pet Supplies','material',50),
    ('Pet Supplies','availability',60),

    ('Dog Feeding & Watering Supplies','brand',10),
    ('Dog Feeding & Watering Supplies','price',20),
    ('Dog Feeding & Watering Supplies','rating',30),
    ('Dog Feeding & Watering Supplies','color',40),
    ('Dog Feeding & Watering Supplies','material',50),
    ('Dog Feeding & Watering Supplies','capacity',60),
    ('Dog Feeding & Watering Supplies','bowl-type',70),
    ('Dog Feeding & Watering Supplies','food-type',80),
    ('Dog Feeding & Watering Supplies','automatic',90),
    ('Dog Feeding & Watering Supplies','portion-control',100),
    ('Dog Feeding & Watering Supplies','dishwasher-safe',110),
    ('Dog Feeding & Watering Supplies','slow-feeder',120),
    ('Dog Feeding & Watering Supplies','elevated',130),
    ('Dog Feeding & Watering Supplies','travel-friendly',140),

    ('Dog Grooming Supplies','brand',10),
    ('Dog Grooming Supplies','price',20),
    ('Dog Grooming Supplies','rating',30),
    ('Dog Grooming Supplies','material',40),
    ('Dog Grooming Supplies','coat-type',50),
    ('Dog Grooming Supplies','grooming-function',60),
    ('Dog Grooming Supplies','tool-type',70),
    ('Dog Grooming Supplies','hair-length',80),
    ('Dog Grooming Supplies','scent',90),
    ('Dog Grooming Supplies','power-type',100),
    ('Dog Grooming Supplies','waterproof',110),

    ('Dog Beds & Furniture','brand',10),
    ('Dog Beds & Furniture','price',20),
    ('Dog Beds & Furniture','rating',30),
    ('Dog Beds & Furniture','color',40),
    ('Dog Beds & Furniture','material',50),
    ('Dog Beds & Furniture','bed-type',60),
    ('Dog Beds & Furniture','bed-size',70),
    ('Dog Beds & Furniture','shape',80),
    ('Dog Beds & Furniture','fill-material',90),
    ('Dog Beds & Furniture','cover-material',100),
    ('Dog Beds & Furniture','washable',110),
    ('Dog Beds & Furniture','bed-waterproof',120),
    ('Dog Beds & Furniture','orthopedic',130),
    ('Dog Beds & Furniture','cooling',140),
    ('Dog Beds & Furniture','heated',150),
    ('Dog Beds & Furniture','environment',160),

    ('Dog Treat Cookies, Biscuits & Snacks','brand',10),
    ('Dog Treat Cookies, Biscuits & Snacks','price',20),
    ('Dog Treat Cookies, Biscuits & Snacks','rating',30),
    ('Dog Treat Cookies, Biscuits & Snacks','treat-type',40),
    ('Dog Treat Cookies, Biscuits & Snacks','flavor',50),
    ('Dog Treat Cookies, Biscuits & Snacks','protein',60),
    ('Dog Treat Cookies, Biscuits & Snacks','life-stage',70),
    ('Dog Treat Cookies, Biscuits & Snacks','breed-size',80),
    ('Dog Treat Cookies, Biscuits & Snacks','dietary-needs',90),
    ('Dog Treat Cookies, Biscuits & Snacks','ingredient-type',100),
    ('Dog Treat Cookies, Biscuits & Snacks','grain-free',110),
    ('Dog Treat Cookies, Biscuits & Snacks','organic',120),
    ('Dog Treat Cookies, Biscuits & Snacks','rawhide-free',130),

    ('Dog Apparel & Accessories','brand',10),
    ('Dog Apparel & Accessories','price',20),
    ('Dog Apparel & Accessories','rating',30),
    ('Dog Apparel & Accessories','color',40),
    ('Dog Apparel & Accessories','material',50),
    ('Dog Apparel & Accessories','apparel-type',60),
    ('Dog Apparel & Accessories','apparel-size',70),
    ('Dog Apparel & Accessories','breed-size',80),
    ('Dog Apparel & Accessories','season',90),
    ('Dog Apparel & Accessories','weather-protection',100),
    ('Dog Apparel & Accessories','adjustable',110),
    ('Dog Apparel & Accessories','reflective',120),
    ('Dog Apparel & Accessories','insulated',130),
    ('Dog Apparel & Accessories','water-resistant',140),

    ('Dog Chew Toys','brand',10),
    ('Dog Chew Toys','price',20),
    ('Dog Chew Toys','rating',30),
    ('Dog Chew Toys','color',40),
    ('Dog Chew Toys','material',50),
    ('Dog Chew Toys','size',60),

    ('Collars, Harnesses & Leashes','brand',10),
    ('Collars, Harnesses & Leashes','price',20),
    ('Collars, Harnesses & Leashes','rating',30),
    ('Collars, Harnesses & Leashes','color',40),
    ('Collars, Harnesses & Leashes','material',50),
    ('Collars, Harnesses & Leashes','product-type',60),
    ('Collars, Harnesses & Leashes','size',70),
    ('Collars, Harnesses & Leashes','width',80),
    ('Collars, Harnesses & Leashes','length',90),
    ('Collars, Harnesses & Leashes','closure-type',100),
    ('Collars, Harnesses & Leashes','adjustable',110),
    ('Collars, Harnesses & Leashes','reflective',120),
    ('Collars, Harnesses & Leashes','padded',130),
    ('Collars, Harnesses & Leashes','waterproof',140),
    ('Collars, Harnesses & Leashes','gps-compatible',150),
    ('Collars, Harnesses & Leashes','personalized',160),
    ('Collars, Harnesses & Leashes','pull-strength',170),

    ('Carriers & Travel Products','brand',10),
    ('Carriers & Travel Products','price',20),
    ('Carriers & Travel Products','rating',30),
    ('Carriers & Travel Products','color',40),
    ('Carriers & Travel Products','material',50),
    ('Carriers & Travel Products','product-type',60),
    ('Carriers & Travel Products','carrier-size',70),
    ('Carriers & Travel Products','pet-weight-capacity',80),
    ('Carriers & Travel Products','airline-approved',90),
    ('Carriers & Travel Products','vehicle-compatible',100),
    ('Carriers & Travel Products','foldable',110),
    ('Carriers & Travel Products','crash-tested',120),
    ('Carriers & Travel Products','ventilation',130),
    ('Carriers & Travel Products','travel-type',140),

    ('Health Supplies','brand',10),
    ('Health Supplies','price',20),
    ('Health Supplies','rating',30),
    ('Health Supplies','health-product-type',40),
    ('Health Supplies','form',50),
    ('Health Supplies','intended-use',60),
    ('Health Supplies','ingredients',70),
    ('Health Supplies','administration',80),
    ('Health Supplies','dietary-restriction',90),
    ('Health Supplies','target-area',100),
    ('Health Supplies','health-life-stage',110)
),
insert_mappings AS (
    INSERT INTO pet_category_filters (category_id, filter_id, display_order)
    SELECT c.id, f.id, m.display_order
    FROM mappings m
    JOIN pet_product_categories c ON c.name = m.category_name
    JOIN pet_product_filters f ON f.slug = m.filter_slug
    ON CONFLICT (category_id, filter_id) DO UPDATE SET
        display_order = EXCLUDED.display_order
    RETURNING category_id
)
SELECT 1;

COMMIT;
