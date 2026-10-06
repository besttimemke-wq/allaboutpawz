import pg from "pg"

async function main() {
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION
  if (!cs) { console.log("NO PG CONN"); process.exit(1) }
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const ddl = [
      `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS items_json text`,
      `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS subtotal_cents integer`,
      `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tax_cents integer`,
      `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_cents integer`,
      `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paid_cents integer DEFAULT 0`,
      `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pay_mode text`,
      `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS weight_lbs text`,
      `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS breed_id text`,
      `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS birth_date text`,
      `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS questionnaire_json text`,
      `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS abandoned_at timestamptz`,
    ]
    for (const stmt of ddl) {
      await client.query(stmt)
      console.log("OK:", stmt.slice(0, 80))
    }
    // Booking view for admin ops list (uses new columns defensively)
    const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' ORDER BY ordinal_position`)
    console.log("BOOKINGS NOW:", cols.rows.map((r: any) => r.column_name).join(", "))
  } finally { await client.end().catch(() => {}); process.exit(0) }
}
main()
