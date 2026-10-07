import { Pool } from "pg"
const cs = process.env.SUPABASE_SESSION_POOLER ?? ""
const pool = new Pool({ connectionString: cs, max: 2, ssl: cs.includes("supabase.com") ? { rejectUnauthorized: false } : undefined })
const c = await pool.query(`select column_name from information_schema.columns where table_schema='public' and table_name='customers' and (column_name ilike '%user%' or column_name ilike '%auth%' or column_name ilike '%email%' or column_name ilike '%id%')`)
console.log("customers id/email/user cols:", c.rows.map(x => x.column_name).join(", "))
await pool.end()
