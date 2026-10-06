import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const url = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const H = { apikey: key, Authorization: `Bearer ${key}` }
const rows = await (await fetch(`${url}/rest/v1/bookings?select=id,email,dogName,date,time,status,paidCents&order=createdAt.desc&limit=14`, { headers: H })).json()
for (const b of rows) console.log(`${b.id.slice(0,8)} ${b.email} ${b.dogName} ${b.date} ${b.time} ${b.status} paid=${b.paidCents}`)
