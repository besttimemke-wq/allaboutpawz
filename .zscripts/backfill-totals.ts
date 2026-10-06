import pg from "pg"

async function main() {
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    // Legacy rows (old 9-step flow): no totalCents. Backfill honest money
    // columns from servicePrice at the salon's configured tax rate (8.25%).
    // Old flow was ALWAYS a $25 deposit → paidCents 2500 on CONFIRMED rows.
    const res = await client.query(`
      UPDATE public.bookings
      SET "subtotalCents" = round(p.price_cents),
          "taxCents"      = round(p.price_cents * 0.0825),
          "totalCents"    = round(p.price_cents * 1.0825),
          "payMode"       = COALESCE("payMode", 'DEPOSIT'),
          "paidCents"     = CASE WHEN upper(COALESCE("status","")) = 'CONFIRMED' THEN 2500 ELSE COALESCE("paidCents", 0) END,
          "balanceDue"    = '$' || to_char(round(p.price_cents * 1.0825) / 100.0
                              - CASE WHEN upper(COALESCE("status","")) = 'CONFIRMED' THEN 25.0 ELSE 0.0 END, 'FM999999.00')
      FROM (
        SELECT id,
          COALESCE(
            NULLIF(regexp_replace("servicePrice", '[^0-9.]', '', 'g'), ''),
            '95')::numeric * 100 AS price_cents
        FROM public.bookings WHERE "totalCents" IS NULL
      ) p
      WHERE public.bookings.id = p.id
      RETURNING public.bookings.id
    `)
    console.log("BACKFILLED rows:", res.rowCount)
    const check = await client.query(`SELECT count(*)::int AS nulls FROM public.bookings WHERE "totalCents" IS NULL`)
    console.log("Remaining null-total rows:", check.rows[0].nulls)
  } finally { await client.end().catch(() => {}); process.exit(0) }
}
main()
