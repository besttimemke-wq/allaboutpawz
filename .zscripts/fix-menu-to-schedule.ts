// ============================================================================
// 82-prep — align the tenant catalog to the owner's Pawz Service Menu.
// Retire legacy packages (Full Groom, Deluxe Spa, Bath & Brush) from the
// customer menu; verify member ladders, treatments, Bath Club, add-ons.
// Idempotent. Run: bun .zscripts/fix-menu-to-schedule.ts
// ============================================================================
import { pgQuery, pgExec } from "../src/lib/pg"

const TENANT = process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001"

async function main() {
  const n = await pgExec(
    `update public.service_items
     set visible = false, "updatedAt" = now()
     where tenant_id = $1 and "isPackage" = true and "isTreatment" = false
       and name in ('Full Groom', 'Deluxe Spa', 'Bath & Brush')`,
    [TENANT],
  )
  console.log(`[1] legacy packages retired from menu: ${n} row(s)`)

  const menu = await pgQuery<any>(
    `select name, category, "smallPrice", "mediumPrice", "largePrice", "xlargePrice",
            "memberSmallPrice", "memberMediumPrice", "memberLargePrice", "memberXlargePrice",
            "isTreatment", "treatmentNote"
     from public.service_items
     where tenant_id = $1 and visible = true and ("isPackage" = true or "isTreatment" = true)
     order by "isTreatment" asc, "order" asc`,
    [TENANT],
  )
  console.log(`\n[2] customer-facing services + treatments (${menu.length}):`)
  for (const r of menu) {
    console.log(
      `  ${r.isTreatment ? "TREATMENT" : "SERVICE  "} ${r.name}  std ${r.smallPrice}/${r.mediumPrice}/${r.largePrice}/${r.xlargePrice ?? "custom"}  member ${r.memberSmallPrice ?? "—"}/${r.memberMediumPrice ?? "—"}/${r.memberLargePrice ?? "—"}/${r.memberXlargePrice ?? "—"}`,
    )
  }

  const plans = await pgQuery<any>(
    `select size_tier, monthly_price_cents, weight_range from public.subscription_plans where active = true order by sort_order`,
  )
  console.log(`\n[3] Bath Club plans:`)
  for (const p of plans) console.log(`  ${p.size_tier}: ${p.monthly_price_cents == null ? "Custom quote" : "$" + p.monthly_price_cents / 100} (${p.weight_range})`)

  process.exit(0)
}
main()
