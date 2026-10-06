import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const url = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const H = { apikey: key, Authorization: `Bearer ${key}` }
const o = await (await fetch(`${url}/rest/v1/commerce_orders?select=id,customer_email,email,status,payment_status,fulfillment_status,total_amount,subtotal,created_at&order=created_at.desc&limit=12`, { headers: H })).json()
console.log(JSON.stringify(o, null, 1).slice(0, 2200))
