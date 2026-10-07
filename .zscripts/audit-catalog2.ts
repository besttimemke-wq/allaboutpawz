import { pgQuery } from "../src/lib/pg"

async function main() {
  const tables: [string, string][] = [
    ["pricing_packages", `select * from public.pricing_packages order by sort_order limit 20`],
    ["add_ons", `select * from public.add_ons order by sort_order limit 20`],
    ["service_items", `select * from public.service_items order by sort_order limit 40`],
  ]
  for (const [t, q] of tables) {
    try {
      const rows = await pgQuery<any>(q)
      console.log(`\n=== ${t} (${rows.length} rows) — columns: ${rows[0] ? Object.keys(rows[0]).join(", ") : "none"} ===`)
      for (const r of rows) console.log(JSON.stringify(r))
    } catch (e: any) {
      console.log(`\n=== ${t} ERROR: ${e.message} ===`)
    }
  }
  process.exit(0)
}
main()
