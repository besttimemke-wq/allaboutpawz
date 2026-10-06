import { repo } from "@/lib/repo"
import pg from "pg"

async function main() {
  // full booking row keys
  const bookings = (await repo.list("bookings").catch(e => [])) as any[]
  if (bookings.length) console.log("BOOKING COLS:", Object.keys(bookings[0]).join(", "))
  const custs = (await repo.list("customers").catch(e => [])) as any[]
  if (custs.length) console.log("CUSTOMER COLS:", Object.keys(custs[0]).join(", "))
  const dogs = (await repo.list("dogs").catch(e => [])) as any[]
  if (dogs.length) console.log("DOG COLS:", Object.keys(dogs[0]).join(", "))

  // DDL check via pooler
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION
  if (!cs) { console.log("NO DIRECT PG CONN"); process.exit(0) }
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' ORDER BY ordinal_position`)
    console.log("BOOKINGS DDL:")
    cols.rows.forEach(r => console.log(`  ${r.column_name} :: ${r.data_type}`))
    const si = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='service_items'`)
    console.log("SERVICE_ITEMS cols:", si.rows.map((r: any) => r.column_name).join(", "))
    const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`)
    console.log("TABLES:", tables.rows.map((r: any) => r.table_name).join(", "))
  } finally { await client.end().catch(() => {}); process.exit(0) }
}
main()
