// Server-side raw pg client for the LMS data layer.
// The Supabase REST API (supabase-js) only exposes the `public` schema by
// default; the LMS enterprise schema lives in `lms`. Rather than wait for
// PostgREST config changes, we connect to the session pooler with the `pg`
// package and run parameterized SQL directly against `lms.*` tables.
//
// Uses a Pool (not a single Client) so concurrent queries from the classroom
// (which fires Promise.all for /api/courses + /api/workspace + /api/school)
// can run in parallel instead of serializing onto one connection.

import { Pool, type PoolClient } from "pg";

const connectionString = process.env.SUPABASE_SESSION_POOLER ?? "";

if (!connectionString) {
  console.error(
    "[pg] Missing SUPABASE_SESSION_POOLER env var — LMS data layer will return empty results.",
  );
}

// Pool is lazy — connections are created on demand up to max. Reused across
// requests via process-global cache.
let _pool: Pool | null = null;

function getPool(): Pool {
  if (_pool) return _pool;
  _pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    // Supabase session pooler limits to 15 concurrent connections per user.
    // Keep our pool small (3) so we stay well under the limit even with
    // the Next.js dev server's own connections. Connections are released
    // back to the pool after each query, so 3 is enough for parallelism.
    max: 3,
    idleTimeoutMillis: 10000, // close idle connections after 10s
    // Don't keep the pool alive between requests — let it shrink to 0
    // when idle to free connections for other processes.
  });
  // Surface pool errors so they don't silently swallow
  _pool.on("error", (err) => {
    console.error("[pg] pool error:", err.message);
  });
  return _pool;
}

// Acquire a client from the pool for a single query. Released automatically.
async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

// Run a parameterized query and return rows; never throws (logs + returns []).
export async function pgQuery<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  try {
    return await withClient(async (client) => {
      const { rows } = await client.query(text, params);
      return rows as T[];
    });
  } catch (e) {
    console.error("[pg] query failed:", e instanceof Error ? e.message : String(e));
    return [];
  }
}

// Run a parameterized write (INSERT/UPDATE/DELETE); returns rows affected; never throws.
export async function pgExec(
  text: string,
  params: unknown[] = [],
): Promise<number> {
  try {
    return await withClient(async (client) => {
      const { rowCount } = await client.query(text, params);
      return rowCount ?? 0;
    });
  } catch (e) {
    console.error("[pg] exec failed:", e instanceof Error ? e.message : String(e));
    return 0;
  }
}
