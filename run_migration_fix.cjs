// Migration fixer — adds missing columns to existing tables (locations, tenants,
// purchase_orders) then re-runs the full taxonomy SQL migration. Iterates
// until all tables are created or we hit a non-schema error.
//
// Usage: bun /home/z/my-project/run_migration_fix.cjs

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require('pg');

// Load .env (strip \r)
fs.readFileSync('/home/z/my-project/.env', 'utf8').split('\n').forEach(l => {
  const cleaned = l.replace(/\r$/, '');
  const m = cleaned.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
});

const SQL_FILE = '/home/z/my-project/upload/Pet Supply Taxonomy SQL (2).sql';
const sql = fs.readFileSync(SQL_FILE, 'utf8');

const pool = new Pool({
  connectionString: process.env.SUPABASE_SESSION_POOLER,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

// Pre-migration: add missing columns to existing tables so the FKs and
// seed data in the taxonomy SQL can succeed.
const PRE_MIGRATION_ALTERS = [
  // locations — missing seller_id + rich location columns
  "ALTER TABLE locations ADD COLUMN IF NOT EXISTS seller_id UUID",
  "ALTER TABLE locations ADD COLUMN IF NOT EXISTS location_type TEXT",
  "ALTER TABLE locations ADD COLUMN IF NOT EXISTS slug TEXT",
  "ALTER TABLE locations ADD COLUMN IF NOT EXISTS address_line1 TEXT",
  "ALTER TABLE locations ADD COLUMN IF NOT EXISTS address_line2 TEXT",
  "ALTER TABLE locations ADD COLUMN IF NOT EXISTS region TEXT",
  "ALTER TABLE locations ADD COLUMN IF NOT EXISTS postal_code TEXT",
  "ALTER TABLE locations ADD COLUMN IF NOT EXISTS country CHAR(2) DEFAULT 'US'",
  "ALTER TABLE locations ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6)",
  "ALTER TABLE locations ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6)",
  "ALTER TABLE locations ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Chicago'",
  "ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_pickup_enabled BOOLEAN DEFAULT FALSE",
  "ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_grooming_enabled BOOLEAN DEFAULT FALSE",
  "ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_ship_from BOOLEAN DEFAULT FALSE",
  // tenants — missing primary_domain, seo_identity, default_currency
  "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_domain TEXT",
  "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS seo_identity TEXT",
  "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_currency CHAR(3) DEFAULT 'USD'",
  "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb",
  // purchase_orders — missing brand_id (for ix_po_brand_status index)
  "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS brand_id UUID",
  // faqs — add snake_case columns the taxonomy SQL expects
  "ALTER TABLE faqs ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE faqs ADD COLUMN IF NOT EXISTS node_id UUID",
  "ALTER TABLE faqs ADD COLUMN IF NOT EXISTS slug TEXT",
  "ALTER TABLE faqs ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE",
  "ALTER TABLE faqs ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0",
];

async function runMigration() {
  const client = await pool.connect();
  try {
    // Step 1: Run pre-migration ALTERs
    console.log('=== STEP 1: Pre-migration ALTERs (add missing columns) ===');
    for (const alter of PRE_MIGRATION_ALTERS) {
      try {
        await client.query(alter);
        const colMatch = alter.match(/ADD COLUMN IF NOT EXISTS (\w+)/);
        const tableMatch = alter.match(/ALTER TABLE (\w+)/);
        console.log(`  ✓ ${tableMatch?.[1] || '?'}.${colMatch?.[1] || '?'}`);
      } catch (e) {
        console.log(`  ✗ ${e.message.slice(0, 100)}`);
      }
    }

    // Step 2: Pre-process SQL (add IF NOT EXISTS) and split into sections
    console.log('\n=== STEP 2: Run taxonomy SQL migration ===');
    let processedSql = sql
      .replace(/CREATE TABLE (?!IF NOT EXISTS)/g, 'CREATE TABLE IF NOT EXISTS ')
      .replace(/CREATE UNIQUE INDEX (?!IF NOT EXISTS)/g, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
      .replace(/CREATE INDEX (?!IF NOT EXISTS)/g, 'CREATE INDEX IF NOT EXISTS ')
      .replace(/CREATE VIEW (?!IF NOT EXISTS)/g, 'CREATE OR REPLACE VIEW ');

    const chunks = processedSql.split(/^-- >>> sql/m);
    console.log(`Split into ${chunks.length} sections\n`);

    let succeeded = 0;
    let failed = 0;
    const failures = [];

    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i].trim();
      if (!chunk || chunk.length < 20) continue;
      const lines = chunk.split('\n');
      const sectionName = lines[0].replace(/^\//, '').trim();
      chunk = lines.slice(1).join('\n').trim();
      if (!chunk || chunk.length < 20) continue;
      try {
        await client.query(chunk);
        succeeded++;
        console.log(`  ✓ Section ${i}: ${sectionName}`);
      } catch (e) {
        failed++;
        const err = e.message.slice(0, 150);
        failures.push({ section: i, name: sectionName, error: err });
        console.log(`  ✗ Section ${i}: ${sectionName} — ${err}`);
      }
    }

    console.log(`\n=== MIGRATION SUMMARY ===`);
    console.log(`Sections succeeded: ${succeeded}`);
    console.log(`Sections failed: ${failed}`);

    if (failures.length > 0) {
      console.log(`\n--- FAILED SECTIONS ---`);
      for (const f of failures) {
        console.log(`  ${f.name}: ${f.error}`);
      }
    }

    // Step 3: Verify key tables + views
    console.log('\n=== STEP 3: Verification ===');
    const keyTables = ['taxonomy_nodes','attributes','node_filters','sellers','brands','brand_placements','products','product_nodes','product_variants','product_attribute_values','product_media','offers','inventory_levels','purchase_order_lines','goods_receipt_lines','vendor_invoices','vendor_invoice_lines','seo_overrides','related_search_pages','related_search_page_products','cms_slots','cms_slot_items','page_components','grooming_services','location_grooming_services','supply_service_map','membership_plans','customer_memberships','reviews','merchandising_modules','node_associations','product_relations','seo_templates','vendors'];
    const ph = keyTables.map((_, i) => `$${i + 1}`).join(',');
    const r = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN (${ph})`, keyTables);
    const found = new Set(r.rows.map(row => row.table_name));
    console.log(`Key tables: ${found.size}/${keyTables.length}`);
    for (const t of keyTables) {
      console.log(`  ${found.has(t) ? '✓' : '✗'} ${t}`);
    }

    const keyViews = ['v_routes','v_sitemap','v_node_breadcrumbs','v_node_children','v_node_filter_spec','v_brand_pages','v_brand_facets','v_related_search_links','v_variant_stock','v_variant_availability','v_buy_box','v_pickup_availability','v_product_rating','v_product_cards','v_po_three_way_match','v_brand_publish_status','v_new_filter_values_review','v_supply_service_links','v_orphan_pages','v_cms_product_form'];
    const vph = keyViews.map((_, i) => `$${i + 1}`).join(',');
    const vR = await client.query(`SELECT table_name FROM information_schema.views WHERE table_schema='public' AND table_name IN (${vph})`, keyViews);
    const foundViews = new Set(vR.rows.map(row => row.table_name));
    console.log(`\nKey views: ${foundViews.size}/${keyViews.length}`);
    for (const v of keyViews) {
      console.log(`  ${foundViews.has(v) ? '✓' : '✗'} ${v}`);
    }

    // Overall DB counts
    const tc = await client.query("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'");
    const vc = await client.query("SELECT count(*) FROM information_schema.views WHERE table_schema='public'");
    const fc = await client.query("SELECT count(*) FROM information_schema.routines WHERE routine_schema='public' AND routine_type='FUNCTION'");
    const ic = await client.query("SELECT count(*) FROM pg_indexes WHERE schemaname='public'");
    console.log(`\nLive DB totals: ${tc.rows[0].count} tables, ${vc.rows[0].count} views, ${fc.rows[0].count} functions, ${ic.rows[0].count} indexes`);

  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
