// Diagnostic: list triggers/functions on booking golden-path tables (live DB)
// Per migration 0014's diagnostic notes — find any trigger causing 42804.
import pg from "pg"

const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION

async function main() {
  const client = new pg.Client({ connectionString: cs })
  await client.connect()

  // 1. All triggers on golden-path tables
  const trig = await client.query(`
    SELECT event_object_table, trigger_name, action_timing, event_manipulation
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name;
  `)
  console.log("=== ALL public TRIGGERS (live) ===")
  for (const r of trig.rows) {
    console.log(`${r.event_object_table.padEnd(28)} ${r.trigger_name}  [${r.action_timing} ${r.event_manipulation}]`)
  }

  // 2. Does the broken function exist again?
  const fn = await client.query(`
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE '%crm%sync%';
  `)
  console.log("\n=== crm sync functions ===")
  console.log(fn.rows.length ? JSON.stringify(fn.rows, null, 2) : "(none)")

  // 3. Column types that previously collided (acct_customer_id uuid vs customers.id text)
  const types = await client.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('customers','crm_customers','platform_customer_identity_links','acct_customers')
    ORDER BY table_name, ordinal_position;
  `)
  console.log("\n=== column types (customers / crm_customers / identity links / acct) ===")
  for (const r of types.rows) {
    console.log(`${r.table_name.padEnd(34)} ${r.column_name.padEnd(28)} ${r.data_type}`)
  }

  await client.end()
}

main().catch((e) => { console.error("DIAG FAIL:", e.message); process.exit(1) })
