import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const token = env.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m)?.[1]?.trim().replace(/^"|"$/g, "") || ""
const url = env.match(/^SUPABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^"|"$/g, "") || ""
const ref = url.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1]
if (!token || !ref) { console.log("no token/ref:", { token: !!token, ref }); process.exit(0) }
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
if (!res.ok) { console.log("config GET failed:", res.status, (await res.text()).slice(0, 200)); process.exit(0) }
const raw = await res.json()
const config = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toUpperCase(), v]))
const contentKeys = Object.keys(config).filter(k => /^MAILER_TEMPLATES_(.+)_CONTENT$/.test(k))
console.log(`live auth templates: ${contentKeys.length}`)
let oldPhone = 0, brown = 0, good = 0
for (const k of contentKeys) {
  const html = String(config[k] || "")
  if (html.includes("901-800-7182") || html.includes("9018007182")) { oldPhone++; console.log(`  OLD PHONE: ${k}`) }
  if (html.includes("#4a443c")) { brown++; console.log(`  BROWN BODY: ${k}`) }
  if (html.includes("901-722-1114")) good++
}
console.log(`summary: ${oldPhone} with old phone, ${brown} with brown body, ${good} with the correct 901-722-1114`)
