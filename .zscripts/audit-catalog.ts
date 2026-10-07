import { pgQuery } from "../src/lib/pg"

async function main() {
  const tables: [string, string][] = [
    ["subscription_plans", `select size_tier, weight_range, monthly_price_cents, visits_per_month, active, sort_order from public.subscription_plans order by sort_order`],
    ["service_items", `select category, name, price, small_price, medium_price, large_price, xlarge_price, is_package, is_treatment, member_price, member_small_price, member_medium_price, member_large_price, member_xlarge_price, visible, sort_order from public.service_items order by sort_order`],
    ["packages", `select name, small_price, medium_price, large_price, xlarge_price, visible, sort_order from public.packages order by sort_order`],
    ["addons", `select title, price, visible, sort_order from public.addons order by sort_order`],
  ]
  for (const [t, q] of tables) {
    try {
      const rows = await pgQuery<any>(q)
      console.log(`\n=== ${t} (${rows.length} rows) ===`)
      for (const r of rows) console.log(JSON.stringify(r))
    } catch (e: any) {
      console.log(`\n=== ${t} ERROR: ${e.message} ===`)
    }
  }
  process.exit(0)
}
main()
