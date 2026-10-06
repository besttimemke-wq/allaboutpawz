import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const url = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const H = { apikey: key, Authorization: `Bearer ${key}` }
const rows = await (await fetch(`${url}/rest/v1/bookings?select=id,stripeCheckoutSessionId,createdAt&email=eq.booking@aapawz.com`, { headers: H })).json()
const mine = rows.filter((r) => /cs_test_ics/.test(r.stripeCheckoutSessionId || ""))
console.log("test bookings found:", mine.length)
const HD = { ...H, Prefer: "return=representation" }
for (const m of mine) {
  await fetch(`${url}/rest/v1/email_messages?relatedBookingId=eq.${m.id}`, { method: "DELETE", headers: HD })
  await fetch(`${url}/rest/v1/communications?relatedBookingId=eq.${m.id}`, { method: "DELETE", headers: HD })
  const r = await fetch(`${url}/rest/v1/bookings?id=eq.${m.id}`, { method: "DELETE", headers: HD })
  console.log("deleted", m.id.slice(0, 8), r.status)
}
