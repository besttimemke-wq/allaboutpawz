import { pgQuery } from "../src/lib/pg"

async function main() {
  for (const t of ["pricing_packages", "add_ons", "service_items", "cms_global_content"]) {
    try {
      const rows = await pgQuery<any>(`select * from public.${t} limit 50`)
      console.log(`\n=== ${t} (${rows.length} rows) — columns: ${rows[0] ? Object.keys(rows[0]).join(", ") : "none"} ===`)
      for (const r of rows) console.log(JSON.stringify(r))
    } catch (e: any) {
      console.log(`\n=== ${t} ERROR: ${e.message} ===`)
    }
  }
  process.exit(0)
}
main()
