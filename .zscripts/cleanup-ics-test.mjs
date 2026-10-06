import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const url = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const H = { apikey: key, Authorization: `Bearer ${key}`, Prefer: "return=representation" }
const b = await fetch(`${url}/rest/v1/bookings?id=eq.5f7042c7-85c0-4228-a264-2786d1a2ba8c`, { method: "DELETE", headers: H })
console.log("booking deleted:", b.status)
const e = await fetch(`${url}/rest/v1/email_messages?relatedBookingId=eq.5f7042c7-85c0-4228-a264-2786d1a2ba8c`, { method: "DELETE", headers: H })
console.log("email rows deleted:", e.status)
const c = await fetch(`${url}/rest/v1/communications?relatedBookingId=eq.5f7042c7-85c0-4228-a264-2786d1a2ba8c`, { method: "DELETE", headers: H })
console.log("communications deleted:", c.status)
