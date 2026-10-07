// Migration fixer round 2 — handles the remaining 5 failing sections by:
//   1. Dropping colliding triggers + policies
//   2. Pre-creating customer_memberships with TEXT customer_id (matching live)
//   3. Running each failing section statement-by-statement (catches per-stmt errors)
//
// Usage: bun /home/z/my-project/run_migration_fix2.cjs

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require('pg');

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

// Pre-migration cleanup: drop colliding triggers + policies
const PRE_CLEANUP = [
  // Triggers that already exist on purchase_orders
  "DROP TRIGGER IF EXISTS po_status_before ON purchase_orders",
  "DROP TRIGGER IF EXISTS po_revoke_after ON purchase_orders",
  "DROP TRIGGER IF EXISTS purchase_orders_touch_updated_at ON purchase_orders",
  "DROP TRIGGER IF EXISTS trg_purchase_orders_updated ON purchase_orders",
  // Triggers that might exist on other tables
  "DROP TRIGGER IF EXISTS trg_fill_tenant ON tenants",
  "DROP TRIGGER IF EXISTS taxonomy_node_before ON taxonomy_nodes",
  "DROP TRIGGER IF EXISTS taxonomy_node_after ON taxonomy_nodes",
  "DROP TRIGGER IF EXISTS brand_before ON brands",
  "DROP TRIGGER IF EXISTS brand_after ON brands",
  "DROP TRIGGER IF EXISTS brand_placement_before ON brand_placements",
  "DROP TRIGGER IF EXISTS brand_placement_after ON brand_placements",
  "DROP TRIGGER IF EXISTS product_before ON products",
  "DROP TRIGGER IF EXISTS product_after ON products",
  "DROP TRIGGER IF EXISTS offer_before ON offers",
  "DROP TRIGGER IF EXISTS authorization_revoke ON seller_brand_authorizations",
  "DROP TRIGGER IF EXISTS seller_status ON sellers",
  "DROP TRIGGER IF EXISTS register_attributes ON product_attribute_values",
  "DROP TRIGGER IF EXISTS goods_receipt_line_after ON goods_receipt_lines",
];

// Pre-create customer_memberships with TEXT customer_id (live customers.id is TEXT, not UUID)
const PRE_CREATE = [
  `CREATE TABLE IF NOT EXISTS customer_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    author_name TEXT,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title TEXT,
    body TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
];

// Naive statement splitter — splits on ; at end of line, respects $$ blocks.
// Good enough for the failing sections (mostly CREATE TABLE/TRIGGER/POLICY/VIEW).
function splitNaive(sqlText) {
  const statements = [];
  let current = '';
  let inDollar = false;
  let inString = false;
  const lines = sqlText.split('\n');
  for (const line of lines) {
    // Track $$ state
    const dollarCount = (line.match(/\$\$/g) || []).length;
    const hasDollar = dollarCount > 0;
    // Track string state (simple — doesn't handle multiline strings)
    if (!inDollar) {
      const sq = (line.match(/'/g) || []).length;
      if (sq % 2 === 1) inString = !inString;
    }
    current += line + '\n';
    // Split on ; if not in $$ block and not in string
    if (!inDollar && !inString && line.trim().endsWith(';')) {
      const trimmed = current.trim();
      if (trimmed.length > 5) statements.push(trimmed);
      current = '';
    }
    // Update $$ state after processing the line
    if (hasDollar && !inString) {
      inDollar = (dollarCount % 2 === 1) ? !inDollar : inDollar;
    }
  }
  const trimmed = current.trim();
  if (trimmed.length > 5) statements.push(trimmed);
  return statements;
}

(async () => {
  const client = await pool.connect();
  try {
    // Step 1: Cleanup colliding triggers + policies
    console.log('=== STEP 1: Drop colliding triggers ===');
    for (const s of PRE_CLEANUP) {
      try { await client.query(s); } catch (e) { /* ignore */ }
    }
    console.log('  ✓ Triggers dropped (if they existed)');

    // Step 2: Pre-create tables with TEXT customer_id
    console.log('\n=== STEP 2: Pre-create tables with TEXT customer_id ===');
    for (const s of PRE_CREATE) {
      try {
        await client.query(s);
        const m = s.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
        console.log(`  ✓ ${m?.[1] || 'table'} (with TEXT customer_id)`);
      } catch (e) {
        console.log(`  ✗ ${e.message.slice(0, 100)}`);
      }
    }

    // Step 3: Re-run migration sections 7-11 statement-by-statement
    console.log('\n=== STEP 3: Re-run failing sections (7-11) statement-by-statement ===');

    // Pre-process: add IF NOT EXISTS
    let processedSql = sql
      .replace(/CREATE TABLE (?!IF NOT EXISTS)/g, 'CREATE TABLE IF NOT EXISTS ')
      .replace(/CREATE UNIQUE INDEX (?!IF NOT EXISTS)/g, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
      .replace(/CREATE INDEX (?!IF NOT EXISTS)/g, 'CREATE INDEX IF NOT EXISTS ')
      .replace(/CREATE VIEW (?!IF NOT EXISTS)/g, 'CREATE OR REPLACE VIEW ')
      .replace(/CREATE POLICY (?!IF NOT EXISTS)/g, 'CREATE OR REPLACE POLICY ');

    // Also drop tenant_isolation policies before the migration recreates them
    // The taxonomy SQL section 10 creates tenant_isolation on many tables.
    // Add DROP POLICY IF EXISTS before each CREATE POLICY.
    processedSql = processedSql.replace(
      /CREATE OR REPLACE POLICY tenant_isolation ON (\w+)/g,
      'DROP POLICY IF EXISTS tenant_isolation ON $1; CREATE OR REPLACE POLICY tenant_isolation ON $1'
    );

    const chunks = processedSql.split(/^-- >>> sql/m);
    const failingSections = [7, 8, 9, 10, 11]; // 0-indexed: chunks[7] through chunks[11]

    for (const secIdx of failingSections) {
      let chunk = chunks[secIdx]?.trim();
      if (!chunk) continue;
      const lines = chunk.split('\n');
      const sectionName = lines[0].replace(/^\//, '').trim();
      chunk = lines.slice(1).join('\n').trim();

      console.log(`\n--- Section ${secIdx}: ${sectionName} ---`);
      const stmts = splitNaive(chunk);
      let ok = 0, fail = 0;
      for (const stmt of stmts) {
        const label = stmt.slice(0, 80).replace(/\n/g, ' ').trim();
        try {
          await client.query(stmt);
          ok++;
          if (label.match(/CREATE|ALTER|INSERT|DO/i)) {
            console.log(`  ✓ ${label.slice(0, 70)}`);
          }
        } catch (e) {
          fail++;
          const err = e.message.slice(0, 80);
          // Skip "already exists" and "duplicate" errors silently
          if (!err.match(/already exists|duplicate|conflict/i)) {
            console.log(`  ✗ ${label.slice(0, 50)} — ${err}`);
          }
        }
      }
      console.log(`  Section ${secIdx} result: ${ok} ok, ${fail} failed`);
    }

    // Step 4: Final verification
    console.log('\n=== STEP 4: Final verification ===');
    const keyTables = ['taxonomy_nodes','attributes','node_filters','sellers','brands','brand_placements','products','product_nodes','product_variants','product_attribute_values','product_media','offers','inventory_levels','purchase_order_lines','goods_receipt_lines','vendor_invoices','vendor_invoice_lines','seo_overrides','related_search_pages','related_search_page_products','cms_slots','cms_slot_items','page_components','grooming_services','location_grooming_services','supply_service_map','membership_plans','customer_memberships','reviews','merchandising_modules','node_associations','product_relations','seo_templates','vendors'];
    const ph = keyTables.map((_, i) => `$${i + 1}`).join(',');
    const r = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN (${ph})`, keyTables);
    const found = new Set(r.rows.map(row => row.table_name));
    console.log(`Key tables: ${found.size}/${keyTables.length}`);
    const missing = keyTables.filter(t => !found.has(t));
    if (missing.length > 0) {
      console.log(`Still missing: ${missing.join(', ')}`);
    } else {
      console.log('ALL KEY TABLES CREATED ✓');
    }

    const keyViews = ['v_routes','v_sitemap','v_node_breadcrumbs','v_node_children','v_node_filter_spec','v_brand_pages','v_brand_facets','v_related_search_links','v_variant_stock','v_variant_availability','v_buy_box','v_pickup_availability','v_product_rating','v_product_cards','v_po_three_way_match','v_brand_publish_status','v_new_filter_values_review','v_supply_service_links','v_orphan_pages','v_cms_product_form'];
    const vph = keyViews.map((_, i) => `$${i + 1}`).join(',');
    const vR = await client.query(`SELECT table_name FROM information_schema.views WHERE table_schema='public' AND table_name IN (${vph})`, keyViews);
    const foundViews = new Set(vR.rows.map(row => row.table_name));
    console.log(`\nKey views: ${foundViews.size}/${keyViews.length}`);
    const missingViews = keyViews.filter(v => !foundViews.has(v));
    if (missingViews.length > 0) {
      console.log(`Still missing: ${missingViews.join(', ')}`);
    } else {
      console.log('ALL KEY VIEWS CREATED ✓');
    }

    const tc = await client.query("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'");
    const vc = await client.query("SELECT count(*) FROM information_schema.views WHERE table_schema='public'");
    const fc = await client.query("SELECT count(*) FROM information_schema.routines WHERE routine_schema='public' AND routine_type='FUNCTION'");
    const ic = await client.query("SELECT count(*) FROM pg_indexes WHERE schemaname='public'");
    console.log(`\nLive DB totals: ${tc.rows[0].count} tables, ${vc.rows[0].count} views, ${fc.rows[0].count} functions, ${ic.rows[0].count} indexes`);

  } finally {
    client.release();
    await pool.end();
  }
})();
