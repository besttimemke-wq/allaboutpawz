import pg from "pg"
async function main() {
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION
  if (!cs) { console.log("NO DIRECT PG CONN"); process.exit(0) }
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='dogs' ORDER BY ordinal_position`)
    console.log("DOGS DDL:")
    cols.rows.forEach((r: any) => console.log(`  ${r.column_name} :: ${r.data_type}`))
    const pref = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%preference%' OR table_name ILIKE '%communication%')`)
    console.log("PREF TABLES:", pref.rows.map((r: any) => r.table_name).join(", ") || "(none)")
  } finally { await client.end().catch(() => {}); process.exit(0) }
}
main()
