import pg from "pg"
async function main() {
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION
  if (!cs) { console.log("NO DIRECT PG CONN"); process.exit(0) }
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const r = await client.query(`SELECT id, name, "breedName", "breedId", "birthDate", "weightLbs", sex, notes FROM dogs LIMIT 8`)
    r.rows.forEach((row: any) => console.log(JSON.stringify(row)))
    const c = await client.query(`SELECT id, "firstName", "lastName", email FROM customers WHERE email='booking@aapawz.com'`)
    console.log("CUSTOMER:", JSON.stringify(c.rows))
    const d = await client.query(`SELECT id, name, "breedName", "breedId", "birthDate", "weightLbs", sex, notes FROM dogs d JOIN customers c ON d."customerId"=c.id WHERE c.email='booking@aapawz.com'`)
    console.log("ZOE DOGS:")
    d.rows.forEach((row: any) => console.log(JSON.stringify(row)))
  } finally { await client.end().catch(() => {}); process.exit(0) }
}
main()
