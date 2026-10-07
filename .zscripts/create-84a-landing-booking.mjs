// Create / clean up the synthetic bookings used by the Task 84-a landing
// modal E2E. `node create-84a-landing-booking.mjs create` inserts a CONFIRMED
// (signal "booked") future appointment for landing-e2e-84a@aapawz.com;
// `node create-84a-landing-booking.mjs cleanup` removes the test bookings and
// their email_messages audit rows.
import { readFileSync } from "node:fs"

const env = readFileSync("/home/z/my-project/.env", "utf8")
const url = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" }
const EMAIL = "landing-e2e-84a@aapawz.com"
const mode = process.argv[2] || "create"

if (mode === "create") {
  const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const rr = await fetch(`${url}/rest/v1/bookings`, {
    method: "POST", headers: H,
    body: JSON.stringify({
      ownerName: "Landing E2E Tester", dogName: "Biscuit", breed: "Golden Retriever",
      service: "Bath & Haircut", date, time: "10:30 AM",
      notes: "Task 84-a landing modal E2E (synthetic — safe to delete)",
      phone: "901-722-1114", email: EMAIL, status: "CONFIRMED",
      paymentStatus: "DEPOSIT_PAID", servicePrice: "$95.00", payMode: "FULL",
      itemsJson: JSON.stringify([{ id: "pkg", name: "Bath & Haircut", isPackage: true, unitCents: 9500, qty: 1, lineCents: 9500 }]),
      subtotalCents: 9500, taxCents: 878, totalCents: 10378, paidCents: 2500,
      tenant_id: "00000000-0000-0000-0000-000000000001",
    }),
  })
  const body = await rr.json()
  console.log("CREATE STATUS", rr.status)
  console.log("BOOKING_ID=" + (Array.isArray(body) ? body[0]?.id : JSON.stringify(body).slice(0, 300)))
  console.log("DATE=" + date)
} else if (mode === "cleanup") {
  // bookings for the test email
  const rr = await fetch(`${url}/rest/v1/bookings?email=eq.${EMAIL}&select=id`, { headers: H })
  const rows = await rr.json()
  const ids = (Array.isArray(rows) ? rows : []).map((r) => r.id)
  console.log("BOOKINGS FOUND", ids.length)
  if (ids.length > 0) {
    const q = ids.map((id) => `relatedBookingId=eq.${id}`).join("&")
    const delEmails = await fetch(`${url}/rest/v1/email_messages?or=(${q},toEmail=eq.${EMAIL})`, { method: "DELETE", headers: H })
    console.log("EMAIL ROWS DELETED", delEmails.status)
    const delBookings = await fetch(`${url}/rest/v1/bookings?email=eq.${EMAIL}`, { method: "DELETE", headers: H })
    console.log("BOOKINGS DELETED", delBookings.status)
  }
} else {
  console.log("usage: node create-84a-landing-booking.mjs [create|cleanup]")
}
