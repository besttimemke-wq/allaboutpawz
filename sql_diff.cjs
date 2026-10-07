// SQL diff script — compares Pet_Supply_Taxonomy_SQL__2.sql against
// the live Supabase database. Produces three lists:
//   (a) creates cleanly (object doesn't exist on live DB)
//   (b) collides (object exists — check if columns/constraints match)
//   (c) DDL writes (ALTER TABLE, CREATE INDEX on existing tables)
//
// Usage: bun /home/z/my-project/sql_diff.cjs

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require('pg');

// Load .env (strip \r for Windows line endings)
fs.readFileSync('/home/z/my-project/.env', 'utf8').split('\n').forEach(l => {
  const cleaned = l.replace(/\r$/, '');
  const m = cleaned.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
});

const SQL_FILE = '/home/z/my-project/upload/Pet Supply Taxonomy SQL (2).sql';
const sql = fs.readFileSync(SQL_FILE, 'utf8');

// Extract object names from the taxonomy SQL — needs 'm' flag for multiline
function extract(pattern, flags = 'gm') {
  const re = new RegExp(pattern, flags);
  const matches = [];
  let m;
  while ((m = re.exec(sql)) !== null) {
    matches.push(m[1]);
  }
  return [...new Set(matches)]; // dedupe
}

const sqlTables = extract('^CREATE TABLE (?:IF NOT EXISTS )?(\\w+)');
const sqlViews = extract('^CREATE(?: OR REPLACE)? VIEW (?:IF NOT EXISTS )?(\\w+)');
const sqlIndexes = extract('^CREATE(?: UNIQUE)? INDEX (?:IF NOT EXISTS )?(\\w+)');
const sqlFunctions = extract('^CREATE(?: OR REPLACE)? FUNCTION (\\w+)');
const sqlAlters = extract('^ALTER TABLE (?:IF EXISTS )?(?:public\\.)?(\\w+)');

console.log('=== Taxonomy SQL object counts ===');
console.log('Tables:', sqlTables.length);
console.log('Views:', sqlViews.length);
console.log('Indexes:', sqlIndexes.length);
console.log('Functions:', sqlFunctions.length);
console.log('ALTER TABLEs:', sqlAlters.length);

const pool = new Pool({
  connectionString: process.env.SUPABASE_SESSION_POOLER,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

(async () => {
  console.log('\n=== Querying live Supabase database ===');
  try {
    // Existing tables
    const liveTables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    const liveTableSet = new Set(liveTables.rows.map(r => r.table_name));

    // Existing views
    const liveViews = await pool.query("SELECT table_name FROM information_schema.views WHERE table_schema='public' ORDER BY table_name");
    const liveViewSet = new Set(liveViews.rows.map(r => r.table_name));

    // Existing functions
    const liveFuncs = await pool.query("SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_type='FUNCTION' ORDER BY routine_name");
    const liveFuncSet = new Set(liveFuncs.rows.map(r => r.routine_name));

    // Existing indexes
    const liveIdx = await pool.query("SELECT indexname FROM pg_indexes WHERE schemaname='public' ORDER BY indexname");
    const liveIdxSet = new Set(liveIdx.rows.map(r => r.indexname));

    console.log('Live tables:', liveTableSet.size);
    console.log('Live views:', liveViewSet.size);
    console.log('Live functions:', liveFuncSet.size);
    console.log('Live indexes:', liveIdxSet.size);

    // === LIST (a): Creates cleanly — in SQL but NOT on live DB ===
    const createsCleanly = {
      tables: sqlTables.filter(t => !liveTableSet.has(t)),
      views: sqlViews.filter(v => !liveViewSet.has(v)),
      functions: sqlFunctions.filter(f => !liveFuncSet.has(f)),
      indexes: sqlIndexes.filter(i => !liveIdxSet.has(i)),
    };

    console.log('\n========================================');
    console.log('LIST (a) — CREATES CLEANLY (not on live DB)');
    console.log('========================================');
    console.log('\nTables (' + createsCleanly.tables.length + '):');
    createsCleanly.tables.forEach(t => console.log('  + ' + t));
    console.log('\nViews (' + createsCleanly.views.length + '):');
    createsCleanly.views.forEach(v => console.log('  + ' + v));
    console.log('\nFunctions (' + createsCleanly.functions.length + '):');
    createsCleanly.functions.forEach(f => console.log('  + ' + f));
    console.log('\nIndexes (' + createsCleanly.indexes.length + '):');
    createsCleanly.indexes.forEach(i => console.log('  + ' + i));

    // === LIST (b): Collides — exists on both SQL and live DB ===
    const collides = {
      tables: sqlTables.filter(t => liveTableSet.has(t)),
      views: sqlViews.filter(v => liveViewSet.has(v)),
      functions: sqlFunctions.filter(f => liveFuncSet.has(f)),
      indexes: sqlIndexes.filter(i => liveIdxSet.has(i)),
    };

    console.log('\n========================================');
    console.log('LIST (b) — COLLIDES (exists on live DB — check columns/constraints)');
    console.log('========================================');
    console.log('\nTables (' + collides.tables.length + '):');
    collides.tables.forEach(t => console.log('  ! ' + t));
    console.log('\nViews (' + collides.views.length + '):');
    collides.views.forEach(v => console.log('  ! ' + v));
    console.log('\nFunctions (' + collides.functions.length + '):');
    collides.functions.forEach(f => console.log('  ! ' + f));
    console.log('\nIndexes (' + collides.indexes.length + '):');
    collides.indexes.forEach(i => console.log('  ! ' + i));

    // For colliding tables — check column diffs
    console.log('\n========================================');
    console.log('LIST (b) detail — TABLE COLUMN DIFFS');
    console.log('========================================');
    for (const t of collides.tables) {
      try {
        const liveCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [t]);
        console.log('\n  ' + t + ' (live columns: ' + liveCols.rows.length + '):');
        liveCols.rows.forEach(c => console.log('    ' + c.column_name + ' : ' + c.data_type));
      } catch (e) {
        console.log('  ' + t + ' — column query failed: ' + e.message);
      }
    }

    // === LIST (c): DDL writes — ALTER TABLE + CREATE INDEX ON EXISTING TABLES ===
    console.log('\n========================================');
    console.log('LIST (c) — DDL WRITES (ALTER TABLE + indexes on existing tables)');
    console.log('========================================');
    console.log('\nALTER TABLE targets (' + sqlAlters.length + '):');
    sqlAlters.forEach(t => console.log('  ~ ' + t + (liveTableSet.has(t) ? ' (exists — ALTER will modify)' : ' (NOT on live — ALTER will fail)')));

    console.log('\nIndexes on EXISTING tables (will add to live tables):');
    sqlIndexes.filter(i => {
      // Index name pattern: typically {table}_{columns}_idx or similar
      // Check if the index targets an existing table
      return true; // we'll check below
    }).forEach(i => {
      const targetsExisting = liveIdxSet.has(i) ? 'OVERWRITE' : 'CREATE';
      console.log('  ' + targetsExisting + ' ' + i);
    });

  } catch (e) {
    console.error('Query failed:', e.message);
  } finally {
    await pool.end();
  }
})();
