// 84 — sendEmail→notification hook E2E: create an upcoming booking for the
// REAL customer (booking@aapawz.com — the salon's own inbox), then complete
// the pre check-in questionnaire through the REAL API, which fires
// sendPreCheckIn → sendEmail(customerId, "precheckin_received") → the hook
// should write a customer_notifications row. Verify via the API.
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"

const env = readFileSync("/home/z/my-project/.env", "utf8")
const KEY = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const URL = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" }
const EMAIL = "booking@aapawz.com"

// customer id
const cr = await fetch(`${URL}/rest/v1/customers?select=id,email&email=eq.${EMAIL}&limit=1`, { headers: H })
const customer = (await cr.json())[0]

// create an upcoming booking owned by the real customer
const date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
const br = await fetch(`${URL}/rest/v1/bookings`, {
  method: "POST", headers: H,
  body: JSON.stringify({
    customerId: customer.id, ownerName: "Zoe Ztest", dogName: "Bella", breed: "Goldendoodle",
    service: "Bath & Haircut", date, time: "10:00 AM",
    notes: "Task 84 hook E2E (synthetic — safe to delete)",
    phone: "901-722-1114", email: EMAIL, status: "CONFIRMED", paymentStatus: "DEPOSIT_PAID",
    servicePrice: "$95.00", payMode: "FULL",
    itemsJson: JSON.stringify([{ id: "pkg", name: "Bath & Haircut", isPackage: true, unitCents: 9500, qty: 1, lineCents: 9500 }]),
    subtotalCents: 9500, taxCents: 878, totalCents: 10378, paidCents: 2500,
    tenant_id: "00000000-0000-0000-0000-000000000001",
  }),
})
const booking = (await br.json())[0]
console.log(`[1] booking created: ${booking.id} for ${date}`)

// mint session
const payload = { sub: "00000000-0000-4000-8000-0000000084n1", email: EMAIL, name: "Zoe Ztest", role: "customer", scope: "customer", exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 }
const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url")
const mac = createHmac("sha256", KEY).update(b64).digest("base64url")
const cookie = `pawz_session=${b64}.${mac}`

// count notifications BEFORE
const n0 = await fetch(`${URL}/rest/v1/customer_notifications?customerId=eq.${customer.id}&select=id`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
const before = (await n0.json()).length
console.log(`[2] notifications before: ${before}`)

// complete the pre check-in questionnaire through the REAL route
const qr = await fetch("http://localhost:3000/api/customer/appointments", {
  method: "POST", headers: { cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "questionnaire", bookingId: booking.id,
    answers: {
      vaccinationsCurrent: "yes", sameDayShots: "no", muzzle: "no", sedation: "no",
      healthNotes: "No matting — keep her teddy trim", groomingGoals: "Fluffy and tidy for family photos",
      behaviorNotes: "A little wiggly for nail trims", emergencyName: "Salon Front Desk", emergencyPhone: "901-722-1114",
      vetName: "Bayou Vet", vetPhone: "901-555-0100", authorize: true,
    },
  }),
})
console.log(`[3] questionnaire POST: ${qr.status}`)
if (!qr.ok) { console.error(await qr.text()); process.exit(1) }

// wait for the fire-and-forget email+notification to land
await new Promise(r => setTimeout(r, 4000))
const n1 = await fetch(`${URL}/rest/v1/customer_notifications?customerId=eq.${customer.id}&select=id,type,title,readAt&order=createdAt.desc&limit=3`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
const after = await n1.json()
console.log(`[4] notifications after: ${before + after.length - Math.min(before, after.length) + after.length - (after.length)} ... newest:`, JSON.stringify(after[0]))
console.log(`[5] count went ${before} → ${before + after.length} rows total (newest first: ${after[0]?.type} / ${after[0]?.title?.slice(0, 60)})`)
console.log("BOOKING_ID=" + booking.id)
console.log("COOKIE=" + cookie)
