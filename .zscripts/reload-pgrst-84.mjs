import { Pool } from "pg"
const cs = process.env.SUPABASE_SESSION_POOLER ?? ""
const pool = new Pool({ connectionString: cs, max: 1, ssl: cs.includes("supabase.com") ? { rejectUnauthorized: false } : undefined })
await pool.query(`NOTIFY pgrst, 'reload schema'`)
console.log("pgrst schema cache reload notified")
await pool.end()
