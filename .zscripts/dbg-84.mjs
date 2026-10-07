import { readFileSync } from "node:fs"
import { Pool } from "pg"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const KEY = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const URL = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const cs = env.match(/^SUPABASE_SESSION_POOLER=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const pool = new Pool({ connectionString: cs, max: 1, ssl: { rejectUnauthorized: false } })
const c = await pool.query(`select column_name from information_schema.columns where table_schema='public' and table_name='customer_notifications' order by ordinal_position`)
console.log("PG columns:", c.rows.map(r => r.column_name).join(", "))
const o = await fetch(`${URL}/rest/v1/customer_notifications?select=*&limit=1`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
const od = await o.json()
console.log("REST * select:", o.status, JSON.stringify(od).slice(0, 200))
await pool.end()
