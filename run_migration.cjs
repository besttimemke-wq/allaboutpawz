// Migration runner — executes Pet_Supply_Taxonomy_SQL__2.sql against
// the live Supabase database. Splits the file into statements respecting
// $$ function delimiters and single-quote strings. Continues on error
// (logs each statement's success/failure). Produces a summary report.
//
// Usage: bun /home/z/my-project/run_migration.cjs

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

// Split SQL into statements, respecting:
//   - $$ ... $$ blocks (PostgreSQL function bodies)
//   - $function$ ... $function$ blocks (tagged dollar-quotes)
//   - Single-quoted strings (with '' escape)
//   - -- line comments
//   - /* */ block comments
function splitStatements(sqlText) {
  const statements = [];
  let current = '';
  let i = 0;
  let inString = false;
  let inDollarQuote = false;
  let dollarTag = '';

  while (i < sqlText.length) {
    const ch = sqlText[i];
    const rest = sqlText.slice(i);

    // Check for dollar-quote start/end
    if (!inString) {
      const dollarMatch = rest.match(/^\$([a-zA-Z_]\w*)?\$/);
      if (dollarMatch) {
        const tag = dollarMatch[0];
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = tag;
          current += tag;
          i += tag.length;
          continue;
        } else if (tag === dollarTag) {
          inDollarQuote = false;
          dollarTag = '';
          current += tag;
          i += tag.length;
          continue;
        }
      }
    }

    if (inDollarQuote) {
      current += ch;
      i++;
      continue;
    }

    // Single-quote strings
    if (ch === "'" && !inDollarQuote) {
      inString = !inString;
      current += ch;
      i++;
      continue;
    }

    // Inside a string — skip everything until closing quote
    if (inString) {
      current += ch;
      i++;
      continue;
    }

    // Line comments (-- to end of line)
    if (ch === '-' && sqlText[i + 1] === '-') {
      while (i < sqlText.length && sqlText[i] !== '\n') {
        current += sqlText[i];
        i++;
      }
      continue;
    }

    // Statement separator (semicolon, not inside string/dollar-quote)
    if (ch === ';') {
      current += ch;
      // Trim and check if this is a real statement (not just whitespace/comment)
      const trimmed = current.trim();
      if (trimmed && !trimmed.match(/^--/) && !trimmed.match(/^\/\*/)) {
        statements.push(trimmed);
      }
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  // Handle trailing content (no final semicolon)
  const trimmed = current.trim();
  if (trimmed && !trimmed.match(/^--/) && !trimmed.match(/^\/\*/)) {
    statements.push(trimmed);
  }

  return statements;
}

(async () => {
  console.log(`=== Migration runner — executing full SQL file as multi-statement query ===\n`);

  const pool = new Pool({
    connectionString: process.env.SUPABASE_SESSION_POOLER,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  // Get a dedicated client (not from the pool's auto-release) so we can
  // execute the entire SQL file as one multi-statement query using the
  // simple query protocol (no params → simple protocol → PostgreSQL handles
  // the statement splitting natively, including $$ function bodies).
  const client = await pool.connect();

  try {
    // Pre-process: add IF NOT EXISTS to CREATE TABLE/INDEX statements
    let processedSql = sql
      .replace(/CREATE TABLE (?!IF NOT EXISTS)/g, 'CREATE TABLE IF NOT EXISTS ')
      .replace(/CREATE UNIQUE INDEX (?!IF NOT EXISTS)/g, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
      .replace(/CREATE INDEX (?!IF NOT EXISTS)/g, 'CREATE INDEX IF NOT EXISTS ')
      .replace(/CREATE VIEW (?!IF NOT EXISTS)/g, 'CREATE OR REPLACE VIEW ');

    // Split the SQL into chunks on the -- >>> section markers. Each chunk
    // is a logical group of statements (foundation, taxonomy, catalog, etc.)
    // that can be executed as a multi-statement batch. If one chunk fails,
    // the next chunk still runs — giving us per-section error isolation.
    const chunks = processedSql.split(/^-- >>> sql/m);
    console.log(`Split into ${chunks.length} sections (by -- >>> markers)\n`);

    let succeeded = 0;
    let failed = 0;
    const failures = [];

    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i].trim();
      if (!chunk || chunk.length < 20) continue;
      // Strip the section header line — the split leaves "/01_foundation.sql\n"
      // at the start of each chunk, which PostgreSQL can't parse.
      const lines = chunk.split('\n');
      const sectionName = lines[0].replace(/^\//, '').trim();
      // Remove the first line (the /filename.sql remnant)
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

    console.log(`\n========================================`);
    console.log(`MIGRATION SUMMARY`);
    console.log(`========================================`);
    console.log(`Sections executed: ${succeeded + failed}`);
    console.log(`Succeeded: ${succeeded}`);
    console.log(`Failed: ${failed}`);

    if (failures.length > 0) {
      console.log(`\n--- FAILED SECTIONS ---`);
      for (const f of failures) {
        console.log(`  Section ${f.section} (${f.name}): ${f.error}`);
      }
    }

    // Count what got created
    const tableCount = await client.query("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'");
    const viewCount = await client.query("SELECT count(*) FROM information_schema.views WHERE table_schema='public'");
    const funcCount = await client.query("SELECT count(*) FROM information_schema.routines WHERE routine_schema='public' AND routine_type='FUNCTION'");
    const idxCount = await client.query("SELECT count(*) FROM pg_indexes WHERE schemaname='public'");
    console.log(`\n  Live DB now has: ${tableCount.rows[0].count} tables, ${viewCount.rows[0].count} views, ${funcCount.rows[0].count} functions, ${idxCount.rows[0].count} indexes`);

  } catch (e) {
    console.log(`\n  ⚠ Migration runner error: ${e.message.slice(0, 200)}`);
  } finally {
    client.release();
    await pool.end();
  }

  // Now verify which key tables exist
  const verifyPool = new Pool({
    connectionString: process.env.SUPABASE_SESSION_POOLER,
    ssl: { rejectUnauthorized: false },
  });
  try {
    const keyTables = ['taxonomy_nodes', 'attributes', 'node_filters', 'sellers', 'brands', 'brand_placements', 'products', 'product_nodes', 'product_variants', 'product_attribute_values', 'product_media', 'offers', 'inventory_levels', 'purchase_order_lines', 'goods_receipt_lines', 'vendor_invoices', 'vendor_invoice_lines', 'seo_overrides', 'related_search_pages', 'related_search_page_products', 'cms_slots', 'cms_slot_items', 'page_components', 'grooming_services', 'location_grooming_services', 'supply_service_map', 'membership_plans', 'customer_memberships', 'reviews', 'merchandising_modules', 'node_associations', 'product_relations', 'seo_templates', 'vendors'];
    const placeholders = keyTables.map((_, i) => `$${i + 1}`).join(',');
    const r = await verifyPool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN (${placeholders}) ORDER BY table_name`, keyTables);
    console.log(`\n=== KEY TABLES VERIFICATION ===`);
    console.log(`Expected: ${keyTables.length}, Found: ${r.rows.length}`);
    const found = new Set(r.rows.map(row => row.table_name));
    for (const t of keyTables) {
      console.log(`  ${found.has(t) ? '✓' : '✗'} ${t}`);
    }

    // Check key views
    const keyViews = ['v_routes', 'v_sitemap', 'v_brand_pages', 'v_orphan_pages', 'v_product_cards', 'v_buy_box'];
    const vR = await verifyPool.query(`SELECT table_name FROM information_schema.views WHERE table_schema='public' AND table_name IN (${keyViews.map((_, i) => `$${i + 1}`).join(',')})`, keyViews);
    console.log(`\n=== KEY VIEWS ===`);
    const foundViews = new Set(vR.rows.map(row => row.table_name));
    for (const v of keyViews) {
      console.log(`  ${foundViews.has(v) ? '✓' : '✗'} ${v}`);
    }
  } catch (e) {
    console.log('Verification query failed:', e.message);
  } finally {
    await verifyPool.end();
  }
})();
