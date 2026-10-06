import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const url = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const H = { apikey: key, Authorization: `Bearer ${key}` }
const r = await fetch(`${url}/rest/v1/serviceItems?select=*&limit=3`, { headers: H })
console.log("status:", r.status)
const t = await r.text()
console.log(t.slice(0, 500))
