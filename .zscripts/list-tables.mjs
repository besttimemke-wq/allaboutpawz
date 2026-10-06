import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const url = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const r = await fetch(`${url}/rest/v1/?apikey=${key}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
const swagger = await r.json()
const tables = Object.entries(swagger.definitions || {}).filter(([k]) => !k.startsWith("_"))
console.log("TABLES (" + tables.length + "):")
for (const [name, def] of tables) {
  const cols = Object.keys(def.properties || {}).join(", ")
  console.log(`- ${name}: ${cols}`)
}
