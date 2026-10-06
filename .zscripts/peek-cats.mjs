import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const url = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const H = { apikey: key, Authorization: `Bearer ${key}` }
for (const t of ["services", "service_items"]) {
  const rows = await (await fetch(`${url}/rest/v1/${t}?select=*&limit=20`, { headers: H })).json()
  console.log(`=== ${t} (${rows.length}) ===`)
  for (const r of rows) console.log(JSON.stringify({ id: r.id, title: r.title, name: r.name, category: r.category, visible: r.visible, price: r.price }))
}
