import pg from "pg"
import { readFileSync } from "node:fs"
const env = readFileSync(".env", "utf8")
const line = env.split("\n").find((l) => l.startsWith("SUPABASE_DIRECT_CONNECTION="))
const cs = line.slice("SUPABASE_DIRECT_CONNECTION=".length).trim()
const { hostname } = new URL(cs)
import dns from "node:dns"
const v4 = dns.promises.lookup(hostname, { family: 4 })
const ip = await v4
const cs4 = cs.replace(hostname, ip.address)
const pool = new pg.Pool({ connectionString: cs4, max: 1, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 })
try {
  const { rows: before } = await pool.query(
    `SELECT count(*)::int AS n, state FROM pg_stat_activity WHERE application_name ILIKE '%supavisor%' OR usename NOT IN ('supabase_admin','postgres') GROUP BY state`)
  console.log("pooler sessions:", JSON.stringify(before))
  const { rowCount } = await pool.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
      WHERE pid <> pg_backend_pid()
        AND (application_name ILIKE '%supavisor%' OR client_addr IS NOT NULL)
        AND usename NOT IN ('supabase_admin')`)
  console.log("terminated:", rowCount)
} catch (e) { console.error("ERR:", e.message); process.exit(1) } finally { await pool.end() }
