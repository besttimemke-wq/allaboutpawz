import pg from "pg"
import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const line = env.split("\n").find((l) => l.startsWith("SUPABASE_DIRECT_CONNECTION="))
const cs = line ? line.slice("SUPABASE_DIRECT_CONNECTION=".length).trim() : ""
if (!cs) { console.error("no DIRECT"); process.exit(1) }
const pool = new pg.Pool({ connectionString: cs, max: 1, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000, query_timeout: 20000 })
const sql = process.argv[2]
try {
  const { rows } = await pool.query(sql)
  console.log(JSON.stringify(rows, null, 1))
} catch (e) { console.error("ERR:", e.message) } finally { await pool.end() }
