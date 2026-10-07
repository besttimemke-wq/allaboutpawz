import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const KEY = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const URL = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
// delete the synthetic booking
const b = await fetch(`${URL}/rest/v1/bookings?id=eq.29d4915d-51c6-4e0f-b8a3-e620a9cb708c`, { method: "DELETE", headers: H })
console.log("booking deleted:", b.status)
// delete the 4 seeded/hook test notifications
const n = await fetch(`${URL}/rest/v1/customer_notifications?customerId=eq.15a39451-f3a9-4087-aee2-f26a1e078285`, { method: "DELETE", headers: H })
console.log("notifications deleted:", n.status)
// keep email_messages (delivery evidence for the owner's consecutive-email check)
const e = await fetch(`${URL}/rest/v1/email_messages?toEmail=eq.booking@aapawz.com&select=id,template,subject,status,createdAt&order=createdAt.desc&limit=4`, { headers: H })
const rows = await e.json()
console.log("email audit rows kept for the owner:", rows.map(r => `${r.template}/${r.status}`).join(", "))
