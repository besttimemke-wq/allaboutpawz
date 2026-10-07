// Migration fixer round 3 — fix the 8 remaining view failures by:
//   1. Adding missing columns to reviews (status) + purchase_orders (po_number)
//   2. Re-running the views section (section 9) statement-by-statement
//
// Usage: bun /home/z/my-project/run_migration_fix3.cjs

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

// Add missing columns to fix view dependencies
const FIX_ALTERS = [
  // reviews table — missing status column (taxonomy SQL expects it for moderation)
  "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('pending','published','rejected'))",
  // purchase_orders — taxonomy SQL uses po_number, live has number
  "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS po_number TEXT",
  "UPDATE purchase_orders SET po_number = number WHERE po_number IS NULL AND number IS NOT NULL",
];

function splitNaive(sqlText) {
  const statements = [];
  let current = '';
  let inDollar = false;
  let inString = false;
  const lines = sqlText.split('\n');
  for (const line of lines) {
    const dollarCount = (line.match(/\$\$/g) || []).length;
    const hasDollar = dollarCount > 0;
    if (!inDollar) {
      const sq = (line.match(/'/g) || []).length;
      if (sq % 2 === 1) inString = !inString;
    }
    current += line + '\n';
    if (!inDollar && !inString && line.trim().endsWith(';')) {
      const trimmed = current.trim();
      if (trimmed.length > 5) statements.push(trimmed);
      current = '';
    }
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
    // Step 1: Fix missing columns
    console.log('=== STEP 1: Add missing columns ===');
    for (const s of FIX_ALTERS) {
      try {
        await client.query(s);
        console.log(`  ✓ ${s.slice(0, 80)}...`);
      } catch (e) {
        console.log(`  ✗ ${e.message.slice(0, 100)}`);
      }
    }

    // Step 2: Re-run views section (section 9) statement-by-statement
    console.log('\n=== STEP 2: Re-run views (section 9) ===');
    let processedSql = sql
      .replace(/CREATE VIEW (?!IF NOT EXISTS)/g, 'CREATE OR REPLACE VIEW ');

    const chunks = processedSql.split(/^-- >>> sql/m);
    const section9 = chunks[9]?.trim();
    if (section9) {
      const lines = section9.split('\n');
      const chunk = lines.slice(1).join('\n').trim();
      const stmts = splitNaive(chunk);
      let ok = 0, fail = 0;
      for (const stmt of stmts) {
        const label = stmt.replace(/--.*$/gm, '').trim().slice(0, 80);
        try {
          await client.query(stmt);
          ok++;
          console.log(`  ✓ ${label}`);
        } catch (e) {
          fail++;
          console.log(`  ✗ ${label.slice(0, 60)} — ${e.message.slice(0, 80)}`);
        }
      }
      console.log(`  Views: ${ok} ok, ${fail} failed`);
    }

    // Step 3: Final verification
    console.log('\n=== STEP 3: Final verification ===');
    const keyViews = ['v_routes','v_sitemap','v_node_breadcrumbs','v_node_children','v_node_filter_spec','v_brand_pages','v_brand_facets','v_related_search_links','v_variant_stock','v_variant_availability','v_buy_box','v_pickup_availability','v_product_rating','v_product_cards','v_po_three_way_match','v_brand_publish_status','v_new_filter_values_review','v_supply_service_links','v_orphan_pages','v_cms_product_form'];
    const vph = keyViews.map((_, i) => `$${i + 1}`).join(',');
    const vR = await client.query(`SELECT table_name FROM information_schema.views WHERE table_schema='public' AND table_name IN (${vph})`, keyViews);
    const foundViews = new Set(vR.rows.map(row => row.table_name));
    console.log(`Key views: ${foundViews.size}/${keyViews.length}`);
    const missingViews = keyViews.filter(v => !foundViews.has(v));
    if (missingViews.length > 0) {
      console.log(`Still missing: ${missingViews.join(', ')}`);
    } else {
      console.log('ALL KEY VIEWS CREATED ✓');
    }

    // Check v_sitemap specifically (the one we need for the sitemap route)
    const sm = await client.query("SELECT count(*) as cnt FROM v_sitemap");
    console.log(`\nv_sitemap row count: ${sm.rows[0].cnt} (should be > 0 when products are seeded)`);

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
