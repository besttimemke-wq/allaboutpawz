// Ad-hoc remote DB query tool — prints rows as JSON lines.
// Usage: node scripts/dbq.mjs "SELECT ..."
import pg from "pg"
import { readFileSync } from "node:fs"

// Pull SUPABASE_SESSION_POOLER out of .env (script runs outside Next).
const env = readFileSync(new URL("../.env", import.meta.url), "utf8")
const line = env.split("\n").find((l) => l.startsWith("SUPABASE_SESSION_POOLER="))
const cs = line ? line.slice("SUPABASE_SESSION_POOLER=".length).trim() : ""
if (!cs) {
  console.error("no SUPABASE_SESSION_POOLER in .env")
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: cs,
  max: 2,
  ssl: cs.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 8000,
  query_timeout: 20000,
})

const sql = process.argv[2]
if (!sql) {
  console.error("usage: node scripts/dbq.mjs \"<sql>\"")
  process.exit(1)
}

try {
  const { rows } = await pool.query(sql)
  console.log(JSON.stringify(rows, null, 1))
} catch (e) {
  console.error("ERR:", e.message)
  process.exit(1)
} finally {
  await pool.end()
}
