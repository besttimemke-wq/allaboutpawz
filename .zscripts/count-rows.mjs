import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const url = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const H = { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", "Range-headers": "0" }
for (const t of ["commerce_orders","orders","customers","crm_customers","dogs","bookings","invoices","commerce_products","lms_courses","lms_enrollments","crm_customer_preferences","stripe_customers","payment_methods"]) {
  try {
    const r = await fetch(`${url}/rest/v1/${t}?select=*`, { headers: { ...H, Range: "0-0" } })
    const cnt = r.headers.get("content-range")?.split("/")[1]
    console.log(`${t}: ${r.ok ? cnt : "MISSING/" + r.status}`)
  } catch (e) { console.log(`${t}: ERR`) }
}
