import pg from "pg"
async function main() {
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION
  if (!cs) { console.log("NO PG CONN"); process.exit(0) }
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='email_messages' ORDER BY ordinal_position`)
    cols.rows.forEach((r: any) => console.log(`${r.column_name} :: ${r.data_type}`))
  } finally { await client.end().catch(() => {}); process.exit(0) }
}
main()
