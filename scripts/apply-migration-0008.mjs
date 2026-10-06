// Apply supabase/migrations/0008_get_auth_user_by_email.sql to the live DB.
import { readFileSync } from "fs";
import pg from "pg";

const env = readFileSync("/home/z/my-project/.env", "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim() || "";
// Prefer the remote session pooler (DATABASE_URL here is a local file: DSN).
const conn = get("SUPABASE_SESSION_POOLER") || (get("DATABASE_URL").startsWith("postgres") ? get("DATABASE_URL") : "");
if (!conn) { console.error("No DATABASE_URL / pooler in .env"); process.exit(1); }

const sql = readFileSync("/home/z/my-project/supabase/migrations/0008_get_auth_user_by_email.sql", "utf8");
const client = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log("0008 applied OK");
  const { rows } = await client.query(
    "select proname from pg_proc where proname = 'get_auth_user_by_email'"
  );
  console.log("rpc present:", rows.length > 0);
} catch (e) {
  console.error("apply failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
