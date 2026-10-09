import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const get = (k) => (env.split("\n").find(l => l.startsWith(k + "=")) || "").slice(k.length + 1).trim()
const admin = createClient(get("SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), { auth: { autoRefreshToken: false, persistSession: false } })
const email = process.argv[2]
const next = process.argv[3] || "/shop/bag"
const origin = process.argv[4] || "http://localhost:3000"
const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: `${origin}${next}` } })
if (error || !data?.properties?.hashed_token) { console.error("ERR", error?.message || "no token"); process.exit(1) }
console.log(`${origin}/auth/link?token_hash=${encodeURIComponent(data.properties.hashed_token)}&next=${encodeURIComponent(next)}`)
