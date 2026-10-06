import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const url = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" }
const rr = await fetch(`${url}/rest/v1/bookings`, {
  method: "POST", headers: H,
  body: JSON.stringify({
    ownerName: "Zoe Ztest", dogName: "Mochi", breed: "Beagle", service: "Full Groom",
    date: "2026-11-05", time: "10:30 AM", notes: "ICS attachment verification",
    phone: "901-722-1114", email: "booking@aapawz.com", status: "PENDING_PAYMENT",
    paymentStatus: "UNPAID", servicePrice: "$115.00", payMode: "FULL",
    itemsJson: JSON.stringify([{ id: "t1", name: "Full Groom", isPackage: true, unitCents: 11500, qty: 1, lineCents: 11500 }]),
    subtotalCents: 11500, taxCents: 1064, totalCents: 12564, paidCents: 0,
    stripeCheckoutSessionId: "cs_test_ics_" + Date.now(),
    tenant_id: "00000000-0000-0000-0000-000000000001",
  }),
})
const body = await rr.json()
console.log("STATUS", rr.status)
console.log("BOOKING_ID=" + (Array.isArray(body) ? body[0]?.id : JSON.stringify(body).slice(0, 300)))
