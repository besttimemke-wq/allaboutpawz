import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const KEY = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const URL = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const r = await fetch(`${URL}/rest/v1/customer_notifications?select=id,type,title,readAt&order=createdAt.desc`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
const rows = await r.json()
console.log("total:", rows.length, "| unread:", rows.filter(x => !x.readAt).length)
rows.forEach(x => console.log(`  ${x.readAt ? "read  " : "UNREAD"} ${x.type}: ${x.title.slice(0, 55)}`))
