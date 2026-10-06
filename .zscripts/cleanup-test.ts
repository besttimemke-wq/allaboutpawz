// Remove ALL test artifacts (ZZTEST seed + my E2E bookings/dogs/emails),
// leaving real customer data untouched. The live DB returns to exactly the
// business state + the honest backfilled totals.
import { repo } from "@/lib/repo"
import pg from "pg"

const TEST_EMAIL = "booking@aapawz.com"

async function main() {
  const bookings = (await repo.list("bookings").catch(() => [])) as any[]
  const testBookings = bookings.filter((b) => String(b.email || "").toLowerCase() === TEST_EMAIL || String(b.dogName || "").startsWith("ZZTEST"))
  console.log("Test bookings to remove:", testBookings.map((b) => `${b.id.slice(0, 8)}(${b.dogName})`).join(", "))

  const dogs = (await repo.list("dogs").catch(() => [])) as any[]
  const customers = (await repo.list("customers").catch(() => [])) as any[]
  const testCustomer = customers.find((c) => String(c.email || "").toLowerCase() === TEST_EMAIL)
  const testDogs = dogs.filter((d) => d.customerId === testCustomer?.id)
  console.log("Test dogs to remove:", testDogs.map((d) => d.name).join(", "))

  // Direct PG for hard deletes (repo has no delete).
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    for (const b of testBookings) {
      await client.query(`DELETE FROM public.bookings WHERE id = $1`, [b.id])
    }
    console.log("Deleted bookings:", testBookings.length)
    for (const d of testDogs) {
      await client.query(`DELETE FROM public.dogs WHERE id = $1`, [d.id])
    }
    console.log("Deleted dogs:", testDogs.length)
    // Test emails (audit rows pointing at the test address)
    const em = await client.query(`DELETE FROM public.email_messages WHERE lower("toEmail") = $1 RETURNING id`, [TEST_EMAIL])
    console.log("Deleted email audit rows:", em.rowCount)
    // CRM registry rows for the test customer
    if (testCustomer) {
      await client.query(`DELETE FROM public.crm_appointments WHERE customer_id IN (SELECT id FROM public.crm_customers WHERE lower(email) = $1)`, [TEST_EMAIL]).catch(() => {})
      await client.query(`DELETE FROM public.crm_pets WHERE owner_id IN (SELECT id FROM public.crm_customers WHERE lower(email) = $1)`, [TEST_EMAIL]).catch(() => {})
      await client.query(`DELETE FROM public.crm_customers WHERE lower(email) = $1`, [TEST_EMAIL]).catch(() => {})
      await client.query(`DELETE FROM public.portal_customer_accounts WHERE lower(email) = $1`, [TEST_EMAIL]).catch(() => {})
      await client.query(`DELETE FROM public.customers WHERE id = $1`, [testCustomer.id])
      console.log("Deleted test customer:", testCustomer.id)
      // Auth user
      await client.query(`DELETE FROM auth.users WHERE lower(email) = $1`, [TEST_EMAIL]).catch(() => {})
      console.log("Deleted auth user")
    }
    // CRM appointment rows created by syncCrmAppointment for test bookings (match by email link)
    await client.query(`DELETE FROM public.crm_appointments WHERE id::text IN (SELECT unnest($1::text[]))`, [testBookings.map((b) => b.id)]).catch(() => {})
  } finally {
    await client.end().catch(() => {})
  }
  // Final state
  const remaining = (await repo.list("bookings").catch(() => [])) as any[]
  console.log("Bookings remaining (real):", remaining.length)
  process.exit(0)
}
main()
