import pg from "pg"

async function main() {
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION
  console.log("connecting...")
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log("connected")
  const res = await client.query(`
    UPDATE public.bookings b
    SET "subtotalCents" = round(p.price_cents),
        "taxCents"      = round(p.price_cents * 0.0825),
        "totalCents"    = round(p.price_cents * 1.0825),
        "payMode"       = COALESCE(b."payMode", 'DEPOSIT'),
        "paidCents"     = CASE WHEN upper(COALESCE(b."status","")) = 'CONFIRMED' THEN 2500 ELSE COALESCE(b."paidCents", 0) END,
        "balanceDue"    = '$' || to_char(round(p.price_cents * 1.0825) / 100.0
                            - CASE WHEN upper(COALESCE(b."status","")) = 'CONFIRMED' THEN 25.0 ELSE 0.0 END, 'FM999999.00')
    FROM (
      SELECT id,
        COALESCE(NULLIF(regexp_replace("servicePrice", '[^0-9.]', '', 'g'), ''), '95')::numeric * 100 AS price_cents
      FROM public.bookings WHERE "totalCents" IS NULL
    ) p
    WHERE b.id = p.id
    RETURNING b.id
  `)
  console.log("BACKFILLED rows:", res.rowCount)
  const check = await client.query(`SELECT count(*)::int AS nulls FROM public.bookings WHERE "totalCents" IS NULL`)
  console.log("Remaining null-total rows:", check.rows[0].nulls)
  await client.end()
}
main().then(() => process.exit(0)).catch((e) => { console.error("ERR", e); process.exit(1) })
