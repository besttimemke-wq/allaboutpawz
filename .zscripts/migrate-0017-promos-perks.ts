// ============================================================================
// 0017 — Promos, Perks & PAWfection Bath Club (owner spec, 2026-10-07).
//
// Applies to the live Supabase via the session pooler. EVERYTHING is
// idempotent: columns use IF NOT EXISTS, tables use IF NOT EXISTS, seeds
// insert only when the natural key is absent.
//
//   service_items  + memberPrice / memberSmall..XlargePrice / isTreatment /
//                   treatmentNote columns (Bath Club member pricing +
//                   Premium Treatments live in the TENANT CATALOG)
//   promos         + promo_redemptions   (cause + standing codes, placements)
//   perk_rules     + perk_ledger         (points accrual, one ledger per user)
//   subscription_plans + subscriptions   (PAWfection Bath Club tiers)
//
// Run: bun .zscripts/migrate-0017-promos-perks.ts
// ============================================================================

import pg from "pg"

const TENANT_ID = process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001"

async function main() {
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION
  if (!cs) throw new Error("Missing SUPABASE_SESSION_POOLER / SUPABASE_DIRECT_CONNECTION")
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()
  const q = (sql: string, params?: any[]) => client.query(sql, params)

  try {
    console.log("== 0017: promos / perks / bath club ==")

    // ------------------------------------------------------------------
    // 1. service_items — member pricing + premium treatment columns
    // ------------------------------------------------------------------
    const itemCols = [
      ["memberPrice", "text"],
      ["memberSmallPrice", "text"],
      ["memberMediumPrice", "text"],
      ["memberLargePrice", "text"],
      ["memberXlargePrice", "text"],
      ["isTreatment", "boolean default false"],
      ["treatmentNote", "text"],
    ] as const
    for (const [col, typ] of itemCols) {
      await q(`alter table public.service_items add column if not exists "${col}" ${typ}`)
    }
    console.log("[1] service_items columns ensured")

    // ------------------------------------------------------------------
    // 2. promos
    // ------------------------------------------------------------------
    await q(`
      create table if not exists public.promos (
        id uuid primary key default gen_random_uuid(),
        tenant_id uuid not null references public.tenants(id),
        name text not null,
        code text not null,
        kind text not null default 'standard' check (kind in ('standard','cause')),
        promo_type text not null check (promo_type in ('percent_off','dollars_off','free_addon')),
        value text not null default '0',
        applies_to jsonb not null default '["services"]'::jsonb,
        eligibility text not null default 'all' check (eligibility in ('new','existing','all')),
        starts_at timestamptz,
        ends_at timestamptz,
        max_total_uses int,
        max_uses_per_user int not null default 1,
        one_per_pet boolean not null default false,
        stackable boolean not null default false,
        placements jsonb not null default '[]'::jsonb,
        status text not null default 'draft' check (status in ('draft','published')),
        qualifying_names jsonb,
        min_subtotal_cents int,
        requires_recent_booking boolean not null default false,
        requires_birthday_month boolean not null default false,
        description text,
        fine_print text,
        cta_label text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (tenant_id, code)
      )`)
    await q(`create index if not exists promos_tenant_status on public.promos (tenant_id, status)`)
    // free_addon promos carry the add-on NAME as the value → value is text.
    // (Fresh installs create it text; live installs that already ran 0017
    // once get the in-place cast — every existing value is numeric-safe.)
    await q(`alter table public.promos alter column value type text using value::text`)
    // Enforcement columns for catalog-driven rules (added in-place on re-run).
    await q(`alter table public.promos add column if not exists qualifying_names jsonb`)
    await q(`alter table public.promos add column if not exists min_subtotal_cents int`)
    await q(`alter table public.promos add column if not exists requires_recent_booking boolean not null default false`)
    await q(`alter table public.promos add column if not exists requires_birthday_month boolean not null default false`)
    console.log("[2] promos table ensured")

    await q(`
      create table if not exists public.promo_redemptions (
        id uuid primary key default gen_random_uuid(),
        tenant_id uuid not null references public.tenants(id),
        promo_id uuid not null references public.promos(id),
        user_id uuid,
        email text,
        dog_id text,
        booking_id text,
        order_id text,
        subscription_id text,
        discount_cents int not null default 0,
        created_at timestamptz not null default now()
      )`)
    await q(`create index if not exists promo_redemptions_lookup on public.promo_redemptions (tenant_id, promo_id, email)`)
    console.log("[3] promo_redemptions table ensured")

    // ------------------------------------------------------------------
    // 3. perk_rules + perk_ledger (points — one ledger per user, balance
    //    is SUM(points), never a mutable column)
    // ------------------------------------------------------------------
    await q(`
      create table if not exists public.perk_rules (
        id uuid primary key default gen_random_uuid(),
        tenant_id uuid not null references public.tenants(id),
        event text not null check (event in
          ('order_completed','booking_completed','subscription_purchased','subscription_renewed')),
        points_per_dollar numeric not null default 1,
        multiplier numeric not null default 1,
        active boolean not null default true,
        created_at timestamptz not null default now(),
        unique (tenant_id, event)
      )`)
    await q(`
      create table if not exists public.perk_ledger (
        id uuid primary key default gen_random_uuid(),
        tenant_id uuid not null references public.tenants(id),
        user_id uuid not null,
        points integer not null,
        source text not null check (source in ('order','booking','subscription','redemption','manual')),
        source_id text,
        note text,
        created_at timestamptz not null default now()
      )`)
    await q(`create index if not exists perk_ledger_user on public.perk_ledger (tenant_id, user_id, created_at desc)`)
    await q(`create unique index if not exists perk_ledger_idem on public.perk_ledger (tenant_id, source, source_id) where source_id is not null and source <> 'manual'`)
    // RLS — writes only via service role (API routes); user may read own rows.
    await q(`alter table public.perk_rules enable row level security`)
    await q(`alter table public.perk_ledger enable row level security`)
    console.log("[4] perk tables ensured")

    // ------------------------------------------------------------------
    // 4. subscription_plans + subscriptions (PAWfection Bath Club)
    // ------------------------------------------------------------------
    await q(`
      create table if not exists public.subscription_plans (
        id text primary key default gen_random_uuid()::text,
        name text not null,
        size_tier text not null check (size_tier in ('SMALL','MEDIUM','LARGE','XLARGE')),
        weight_range text not null,
        monthly_price_cents int,
        visits_per_month int not null default 4,
        annual_prepay_months int not null default 12,
        annual_prepay_charge_months int not null default 10,
        multi_pet_discount_percent numeric not null default 10,
        includes jsonb not null default '[]'::jsonb,
        excludes jsonb not null default '[]'::jsonb,
        terms jsonb not null default '[]'::jsonb,
        active boolean not null default true,
        sort_order int not null default 0
      )`)
    await q(`
      create table if not exists public.subscriptions (
        id text primary key default gen_random_uuid()::text,
        plan_id text not null references public.subscription_plans(id),
        email text not null,
        user_id uuid,
        customer_id text,
        dog_id text,
        dog_name text,
        status text not null default 'PENDING' check (status in ('PENDING','ACTIVE','PAUSED','CANCELLED','PAST_DUE')),
        billing_interval text not null default 'monthly' check (billing_interval in ('monthly','annual')),
        price_cents int not null default 0,
        visits_included int not null default 4,
        visits_used int not null default 0,
        stripe_subscription_id text,
        stripe_checkout_session_id text,
        current_period_start timestamptz,
        current_period_end timestamptz,
        cancel_at_period_end boolean not null default false,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`)
    await q(`create index if not exists subscriptions_email on public.subscriptions (email, status)`)
    console.log("[5] subscription tables ensured")

    // ------------------------------------------------------------------
    // 5b. bookings — promo + perks columns (discount lines on the record).
    //     The bookings table's convention is QUOTED camelCase columns
    //     (subtotalCents, taxCents, …) — these four follow it.
    // ------------------------------------------------------------------
    for (const [col, typ] of [
      ["promoCode", "text"],
      ["promoDiscountCents", "int not null default 0"],
      ["pointsRedeemed", "int not null default 0"],
      ["pointsDiscountCents", "int not null default 0"],
    ] as const) {
      await q(`alter table public.bookings add column if not exists "${col}" ${typ}`)
    }
    // Retire the snake_case first attempt (added before the convention was
    // spotted) — move any values over, then drop.
    await q(`
      update public.bookings set
        "promoCode" = coalesce("promoCode", promo_code),
        "promoDiscountCents" = coalesce(nullif("promoDiscountCents", 0), coalesce(promo_discount_cents, 0)),
        "pointsRedeemed" = coalesce(nullif("pointsRedeemed", 0), coalesce(points_redeemed, 0)),
        "pointsDiscountCents" = coalesce(nullif("pointsDiscountCents", 0), coalesce(points_discount_cents, 0))
      where promo_code is not null or promo_discount_cents is not null
         or points_redeemed is not null or points_discount_cents is not null
    `).catch(() => {})
    await q(`alter table public.bookings drop column if exists promo_code`)
    await q(`alter table public.bookings drop column if exists promo_discount_cents`)
    await q(`alter table public.bookings drop column if exists points_redeemed`)
    await q(`alter table public.bookings drop column if exists points_discount_cents`)
    console.log("[5b] bookings promo/points columns ensured")

    // ==================================================================
    // SEEDS (idempotent)
    // ==================================================================

    // ---- service_items: the spec's menu ----
    // Bath Only + Bath & Haircut join the catalog; the duplicate "Bath &
    // Brush" rows are retired (visible=false) — Bath Only IS the bath, and
    // Bath & Haircut carries the same tier ladder Bath & Brush had.
    const upsertItem = async (
      category: string, name: string, fields: Record<string, any>,
    ) => {
      const r = await q(
        `select id from public.service_items where tenant_id = $3 and category = $1 and name = $2 limit 1`,
        [category, name, TENANT_ID],
      )
      if (r.rows[0]) {
        const keys = Object.keys(fields)
        if (keys.length === 0) return "no-fields"
        const sets = keys.map((k, i) => `"${k}" = $${i + 2}`).join(", ")
        await q(
          `update public.service_items set ${sets} where id = $1::text`,
          [r.rows[0].id, ...Object.values(fields)],
        )
        return "updated"
      }
      const cols = ["tenant_id", "category", "name", ...Object.keys(fields)]
      const vals = [TENANT_ID, category, name, ...Object.values(fields)]
      const ph = cols.map((_, i) => `$${i + 1}`).join(", ")
      await q(
        `insert into public.service_items (${cols.map((c) => `"${c}"`).join(", ")}) values (${ph})`,
        vals,
      )
      return "inserted"
    }

    // The spec's services (member prices = Bath Club member ladder).
    await upsertItem("BATH & SPA", "Bath Only", {
      isPackage: true, price: null,
      smallPrice: "$45", mediumPrice: "$55", largePrice: "$65", xlargePrice: "$75",
      memberSmallPrice: "$39", memberMediumPrice: "$49", memberLargePrice: "$59", memberXlargePrice: "$69",
      visible: true, order: 0,
    })
    await upsertItem("GROOMING", "Bath & Haircut", {
      isPackage: true, price: null,
      smallPrice: "$75", mediumPrice: "$95", largePrice: "$115", xlargePrice: "$135",
      memberSmallPrice: "$69", memberMediumPrice: "$89", memberLargePrice: "$109", memberXlargePrice: "$129",
      visible: true, order: 0,
    })
    // Retire the now-duplicated Bath & Brush rows (catalog keeps them).
    await q(`update public.service_items set visible = false where name = 'Bath & Brush'`)

    // Premium Treatments — size-tiered, XL = custom quote (xlargePrice NULL).
    await upsertItem("PREMIUM TREATMENTS", "Oatmeal Soothe Treatment", {
      isPackage: false, isTreatment: true, price: null,
      smallPrice: "$12", mediumPrice: "$15", largePrice: "$18", xlargePrice: null,
      visible: true, order: 0,
    })
    await upsertItem("PREMIUM TREATMENTS", "Benzoyl Peroxide Clarifying Treatment", {
      isPackage: false, isTreatment: true, price: null,
      smallPrice: "$15", mediumPrice: "$18", largePrice: "$22", xlargePrice: null,
      visible: true, order: 1,
    })
    await upsertItem("PREMIUM TREATMENTS", "Deshed Treatment", {
      isPackage: false, isTreatment: true, price: null,
      smallPrice: "$20", mediumPrice: "$30", largePrice: "$40", xlargePrice: null,
      treatmentNote: "Heavy shedding, impacted undercoat, matting, or unusually time-intensive coats may require an additional charge.",
      visible: true, order: 2,
    })

    // Member prices for the remaining packages (Full Groom, Deluxe Spa).
    await upsertItem("GROOMING", "Full Groom", {
      memberSmallPrice: "$85", memberMediumPrice: "$105", memberLargePrice: "$125", memberXlargePrice: "$145",
    })
    await upsertItem("BATH & SPA", "Deluxe Spa", {
      memberSmallPrice: "$113", memberMediumPrice: "$131", memberLargePrice: "$149", memberXlargePrice: "$167",
    })
    // Member prices for the add-ons the spec lists.
    await upsertItem("ADD-ON SERVICES", "Teeth Brushing", { memberPrice: "$13" })
    await upsertItem("ADD-ON SERVICES", "Paw Treatment", { memberPrice: "$13" })
    await upsertItem("ADD-ON SERVICES", "Flea Bath", { memberPrice: "$9" })
    // Same services live under other categories too (NAIL & PAW CARE,
    // BATH & SPA) — the booking menu dedupes by name and may render either
    // row, so every same-name row carries the member price.
    await q(
      `update public.service_items set "memberPrice" = $2
       where "name" = $1 and "memberPrice" is null and visible = true`,
      ["Paw Treatment", "$13"],
    )
    await q(
      `update public.service_items set "memberPrice" = $2
       where "name" = $1 and "memberPrice" is null and visible = true`,
      ["Flea Bath", "$9"],
    )
    await q(
      `update public.service_items set "memberPrice" = $2
       where "name" = $1 and "memberPrice" is null and visible = true`,
      ["Teeth Brushing", "$13"],
    )
    console.log("[6] service_items seeded (bath only, bath & haircut, treatments, member prices)")

    // ---- subscription_plans: PAWfection Bath Club tiers ----
    const plans: [string, string, number | null, number][] = [
      ["SMALL", "up to 20 lbs", 12900, 0],
      ["MEDIUM", "21–45 lbs", 15900, 1],
      ["LARGE", "46–70 lbs", 19900, 2],
      ["XLARGE", "71+ lbs", null, 3], // custom quote
    ]
    for (const [tier, range, cents, order] of plans) {
      const r = await q(`select id from public.subscription_plans where size_tier = $1 limit 1`, [tier])
      if (!r.rows[0]) {
        await q(
          `insert into public.subscription_plans
             (name, size_tier, weight_range, monthly_price_cents, sort_order, includes, excludes, terms)
           values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb)`,
          [
            "PAWfection Bath Club", tier, range, cents, order,
            JSON.stringify([
              "Shampoo + conditioner", "Blow-dry", "Brush-out",
              "Ear cleaning", "Finishing spray",
            ]),
            JSON.stringify([
              "Haircuts", "Nail grinding", "Medicated / specialty treatments",
              "Deshedding", "Dematting",
            ]),
            JSON.stringify([
              "One dog per membership; memberships are non-transferable.",
              "Unused visits don't roll over.",
              "Heavy matting or excessive labor may add a charge.",
            ]),
          ],
        )
      }
    }
    console.log("[7] subscription_plans seeded (4 Bath Club tiers)")

    // ---- perk_rules: 1 pt / $1 on every completion event ----
    for (const event of ["order_completed", "booking_completed", "subscription_purchased", "subscription_renewed"]) {
      await q(
        `insert into public.perk_rules (tenant_id, event, points_per_dollar, multiplier, active)
         values ($1,$2,1,1,true) on conflict (tenant_id, event) do nothing`,
        [TENANT_ID, event],
      )
    }
    console.log("[8] perk_rules seeded (1 pt per $1, multiplier 1)")

    // ---- perks redemption rate: settings row (100 points = $1) ----
    {
      const r = await q(
        `select count(*)::int as n from public.cms_global_content
         where tenant_id = $1 and content_key = 'perks_points_per_dollar'`,
        [TENANT_ID],
      )
      if (r.rows[0].n === 0) {
        await q(
          `insert into public.cms_global_content (tenant_id, locale, content_group, content_key, label, value_text)
           values ($1,'en-US','general','perks_points_per_dollar','Perks Points Per Dollar','100')`,
          [TENANT_ID],
        )
      }
    }
    console.log("[9] perks_points_per_dollar setting seeded (100 pts = $1)")

    // ---- promos: October cause codes + standing codes ----
    const OCT_START = "2026-10-01T00:00:00Z"
    const OCT_END = "2026-11-01T00:00:00Z"
    const upsertPromo = async (p: Record<string, any>) => {
      const r = await q(`select id from public.promos where tenant_id = $1 and code = $2 limit 1`, [TENANT_ID, p.code])
      if (r.rows[0]) return "exists"
      await q(
        `insert into public.promos
           (tenant_id, name, code, kind, promo_type, value, applies_to, eligibility,
            starts_at, ends_at, max_total_uses, max_uses_per_user, one_per_pet, stackable,
            placements, status, description, fine_print, cta_label,
            qualifying_names, min_subtotal_cents, requires_recent_booking, requires_birthday_month)
         values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18,$19,$20::jsonb,$21,$22,$23)`,
        [
          TENANT_ID, p.name, p.code, p.kind, p.promo_type, p.value,
          JSON.stringify(p.applies_to), p.eligibility, p.starts_at ?? null, p.ends_at ?? null,
          p.max_total_uses ?? null, p.max_uses_per_user ?? 1, p.one_per_pet ?? false,
          p.stackable ?? false, JSON.stringify(p.placements), p.status, p.description ?? null,
          p.fine_print ?? null, p.cta_label ?? null,
          p.qualifying_names ? JSON.stringify(p.qualifying_names) : null,
          p.min_subtotal_cents ?? null, p.requires_recent_booking ?? false, p.requires_birthday_month ?? false,
        ],
      )
      return "inserted"
    }

    await upsertPromo({
      name: "Pretty in Pink — Breast Cancer Awareness", code: "PINKPAW", kind: "cause",
      promo_type: "percent_off", value: 15, applies_to: ["services"], eligibility: "all",
      starts_at: OCT_START, ends_at: OCT_END, max_uses_per_user: 1, one_per_pet: true,
      qualifying_names: ["Bath & Haircut"],
      placements: ["services", "pricing", "book", "portal", "checkout"], status: "published",
      description: "All October — 15% off any Bath & Haircut.",
      fine_print: "Pink bandana + pink finishing spray included while supplies last. One per pet, not combinable with other promos.",
      cta_label: "Book",
    })
    await upsertPromo({
      name: "Purple Paw Promise — Domestic Violence Awareness", code: "PURPLEPAW", kind: "cause",
      promo_type: "percent_off", value: 15, applies_to: ["services"], eligibility: "all",
      starts_at: OCT_START, ends_at: OCT_END, max_uses_per_user: 1, one_per_pet: true,
      qualifying_names: ["Bath Only", "Bath & Haircut", "Full Groom", "Deluxe Spa"],
      placements: ["services", "pricing", "book", "portal", "checkout"], status: "published",
      description: "All October — 15% off any bath service.",
      fine_print: "One per pet, not combinable with other promos.",
      cta_label: "Book",
    })
    await upsertPromo({
      name: "Welcome 10", code: "WELCOME10", kind: "standard",
      promo_type: "percent_off", value: 10, applies_to: ["services", "addons"], eligibility: "new",
      max_uses_per_user: 1,
      placements: ["book", "portal", "checkout"], status: "published",
      description: "10% off your first booking.",
      fine_print: "New accounts only.",
      cta_label: "Book",
    })
    await upsertPromo({
      name: "Referral Rewards", code: "REFER10", kind: "standard",
      promo_type: "dollars_off", value: 10, applies_to: ["services"], eligibility: "all",
      max_uses_per_user: 1,
      placements: ["portal"], status: "published",
      description: "Give $10, get $10.",
      fine_print: "Applies when a referred friend books.",
      cta_label: "Book",
    })
    await upsertPromo({
      name: "Multi-Pet", code: "MULTIPET", kind: "standard",
      promo_type: "percent_off", value: 15, applies_to: ["services"], eligibility: "all",
      max_uses_per_user: 99, requires_recent_booking: true,
      placements: ["portal", "book"], status: "published",
      description: "15% off the second pet.",
      fine_print: "Same booking.",
      cta_label: "Book",
    })
    await upsertPromo({
      name: "Birthday Bone", code: "BDAYBONE", kind: "standard",
      promo_type: "free_addon", value: "Teeth Brushing", applies_to: ["addons"], eligibility: "all",
      max_uses_per_user: 99, requires_birthday_month: true,
      placements: ["portal", "book", "checkout"], status: "published",
      description: "Free teeth brushing.",
      fine_print: "During your pet's birthday month.",
      cta_label: "Book",
    })
    await upsertPromo({
      name: "Review Rewards", code: "REVIEW10", kind: "standard",
      promo_type: "percent_off", value: 10, applies_to: ["services"], eligibility: "existing",
      max_uses_per_user: 1,
      placements: ["portal"], status: "published",
      description: "10% off your next visit.",
      fine_print: "For leaving a review.",
      cta_label: "Book",
    })
    console.log("[10] promos seeded (2 cause + 5 standing codes)")

    // Backfill rule columns on promos seeded by an earlier 0017 run (the
    // upsert above skips existing rows, so first-run rows lack the flags).
    {
      const backfills: [string, string, any[]][] = [
        ["PINKPAW", `qualifying_names = $3::jsonb`, [JSON.stringify(["Bath & Haircut"])]],
        ["PURPLEPAW", `qualifying_names = $3::jsonb`, [JSON.stringify(["Bath Only", "Bath & Haircut", "Full Groom", "Deluxe Spa"])]],
        ["MULTIPET", `requires_recent_booking = true`, []],
        ["BDAYBONE", `requires_birthday_month = true`, []],
      ]
      for (const [code, setClause, params] of backfills) {
        const col = setClause.split(" =")[0]
        const guard = params.length > 0 ? `${col} is null` : `(${col} is null or ${col} = false)`
        await q(
          `update public.promos set ${setClause} where tenant_id = $1 and code = $2 and ${guard}`,
          [TENANT_ID, code, ...params],
        )
      }
    }

    // ---- verification ----
    for (const t of ["promos", "promo_redemptions", "perk_rules", "perk_ledger", "subscription_plans", "subscriptions"]) {
      const r = await q(`select count(*)::int as n from public.${t}`)
      console.log(`   ${t}: ${r.rows[0].n} rows`)
    }
    const items = await q(`select category, name, "isTreatment", "memberSmallPrice" from public.service_items where visible = true order by category, "order"`)
    console.log("   visible service_items:")
    for (const r of items.rows) {
      console.log(`     [${r.category}] ${r.name}${r.isTreatment ? " (treatment)" : ""}${r.memberSmallPrice ? ` member-from:${r.memberSmallPrice}` : ""}`)
    }
    console.log("== 0017 DONE ==")
  } finally {
    await client.end().catch(() => {})
  }
}

main().catch((e) => {
  console.error("MIGRATION FAILED:", e)
  process.exit(1)
})
