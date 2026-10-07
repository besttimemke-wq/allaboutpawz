import { Pool } from "pg"
const connectionString = process.env.SUPABASE_SESSION_POOLER ?? ""
const pool = new Pool({ connectionString, max: 2, ssl: connectionString.includes("supabase.com") ? { rejectUnauthorized: false } : undefined })
const r = await pool.query(`select table_name from information_schema.tables where table_schema='public' and table_name in ('email_messages','customer_notifications','customers','bookings')`)
console.log("tables:", r.rows.map(x => x.table_name).join(", "))
const c = await pool.query(`select column_name, data_type from information_schema.columns where table_schema='public' and table_name='email_messages' order by ordinal_position`)
console.log("email_messages cols:", c.rows.map(x => `${x.column_name}:${x.data_type}`).join("\n  "))
await pool.end()
