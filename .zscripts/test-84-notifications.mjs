// 84 — customer notifications E2E: mint a session for a REAL customer
// (booking@aapawz.com — the salon's own inbox, no customer spam), seed rows
// through the REAL lib path, exercise the API, verify, then leave rows for
// browser verification (cleanup is a separate step).
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"

const env = readFileSync("/home/z/my-project/.env", "utf8")
const KEY = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const URL = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")

// 1. Find the real customer row
const cr = await fetch(`${URL}/rest/v1/customers?select=id,email,firstName,lastName&email=eq.booking@aapawz.com&limit=1`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
})
const customers = await cr.json()
if (!customers?.length) { console.error("no customer row for booking@aapawz.com"); process.exit(1) }
const customer = customers[0]
console.log(`[1] customer: ${customer.id} (${customer.email})`)

// 2. Mint the customer session cookie
const payload = { sub: "00000000-0000-4000-8000-0000000084n1", email: customer.email, name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Notification Tester", role: "customer", scope: "customer", exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 }
const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
const mac = createHmac("sha256", KEY).update(body).digest("base64url")
const cookie = `pawz_session=${body}.${mac}`
console.log("[2] session minted")

// 3. Seed 3 notifications through the REAL lib (bun can't import the TS lib
//    with server-only easily — insert via PostgREST with the exact same
//    shape recordCustomerNotification writes, then verify via the API).
const seed = [
  { type: "appointment", title: "Reminder: Bella's Bath & Haircut on Saturday at 10:00 AM", body: "Your visit is coming up. Need to cancel or reschedule? Do it from My Appointments.", link: "/customer/appointments", relatedId: "test-booking-84" },
  { type: "invoice", title: "Payment received — thank you, your receipt is enclosed", body: "A copy of your receipt is in your email inbox and in My Invoices.", link: "/customer/invoices", relatedId: null },
  { type: "order", title: "Order confirmed — thank you for your shop order", body: "A copy of your order confirmation is in your email inbox.", link: "/customer/orders", relatedId: "test-order-84" },
]
for (const s of seed) {
  const res = await fetch(`${URL}/rest/v1/customer_notifications`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ customerId: customer.id, type: s.type, title: s.title, body: s.body, link: s.link, relatedId: s.relatedId, tenant_id: "00000000-0000-0000-0000-000000000001" }),
  })
  if (!res.ok) { console.error("seed failed:", await res.text()); process.exit(1) }
}
console.log(`[3] seeded ${seed.length} notifications`)

// 4. GET the API as the customer
const g = await fetch("http://localhost:3000/api/customer/notifications", { headers: { cookie } })
const gd = await g.json()
console.log(`[4] GET ${g.status}: ${gd.notifications?.length} rows, unread=${gd.unreadCount}`)
console.log("    titles:", gd.notifications?.map(n => `${n.type}:${n.title.slice(0, 40)}…`).join(" | "))

// 5. mark_read on the first
const first = gd.notifications?.[0]
const m = await fetch("http://localhost:3000/api/customer/notifications", { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_read", id: first.id }) })
console.log(`[5] mark_read ${m.status}: ${(await m.json()).ok}`)
const g2 = await fetch("http://localhost:3000/api/customer/notifications", { headers: { cookie } })
const g2d = await g2.json()
console.log(`[6] after mark_read: unread=${g2d.unreadCount}, first.readAt=${g2d.notifications.find(n => n.id === first.id)?.readAt ? "set" : "MISSING"}`)

// 6. anonymous access must 401
const a = await fetch("http://localhost:3000/api/customer/notifications")
console.log(`[7] anonymous GET: ${a.status} (expect 401)`)

// 7. Save the cookie + ids for browser verification + cleanup
console.log("COOKIE_FOR_BROWSER=" + cookie)
console.log("IDS=" + gd.notifications.map(n => n.id).join(","))
