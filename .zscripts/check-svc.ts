import { repo } from "@/lib/repo"
import pg from "pg"

async function main() {
  const items = (await repo.list("serviceItems").catch(e => ({ err: String(e) }))) as any
  console.log("SERVICE ITEMS:", Array.isArray(items) ? items.length : items)
  if (Array.isArray(items)) items.forEach(i => console.log(`  [${i.category}] ${i.name} — small:${i.smallPrice} med:${i.mediumPrice} lg:${i.largePrice} xl:${i.xlargePrice} flat:${i.price} pkg:${i.isPackage} vis:${i.visible}`))

  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    for (const t of ["customers", "dogs"]) {
      const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='${t}' ORDER BY ordinal_position`)
      console.log(`${t.toUpperCase()} COLS:`, cols.rows.map((r: any) => r.column_name).join(", "))
    }
    const cnt = await client.query(`SELECT count(*)::int AS n FROM service_items`)
    console.log("service_items count:", cnt.rows[0].n)
  } finally { await client.end().catch(() => {}); process.exit(0) }
}
main()
