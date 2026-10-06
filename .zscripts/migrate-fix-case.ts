import pg from "pg"

async function main() {
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const renames: [string, string][] = [
      ["items_json", '"itemsJson"'],
      ["subtotal_cents", '"subtotalCents"'],
      ["tax_cents", '"taxCents"'],
      ["total_cents", '"totalCents"'],
      ["paid_cents", '"paidCents"'],
      ["pay_mode", '"payMode"'],
      ["weight_lbs", '"weightLbs"'],
      ["breed_id", '"breedId"'],
      ["birth_date", '"birthDate"'],
      ["questionnaire_json", '"questionnaireJson"'],
      ["abandoned_at", '"abandonedAt"'],
    ]
    for (const [from, to] of renames) {
      await client.query(`ALTER TABLE public.bookings RENAME COLUMN "${from}" TO ${to}`)
      console.log(`RENAMED ${from} -> ${to}`)
    }
    const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' ORDER BY ordinal_position`)
    console.log("FINAL:", cols.rows.map((r: any) => r.column_name).join(", "))
  } finally { await client.end().catch(() => {}); process.exit(0) }
}
main()
