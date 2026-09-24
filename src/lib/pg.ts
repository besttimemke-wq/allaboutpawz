// Server-side raw pg client for the LMS data layer.
// The Supabase REST API (supabase-js) only exposes the `public` schema by
// default; the LMS enterprise schema lives in `lms`. Rather than wait for
// PostgREST config changes, we connect to the session pooler with the `pg`
// package and run parameterized SQL directly against `lms.*` tables.
//
// Uses a Pool (not a single Client) so concurrent queries from the classroom
// (which fires Promise.all for /api/courses + /api/workspace + /api/school)
// can run in parallel instead of serializing onto one connection.
//
// Retry logic: Supabase's session pooler limits to 15 concurrent connections
// per user. When that limit is hit, queries fail with EMAXCONNSESSION. The
// pgQuery/pgExec helpers retry with exponential backoff (3 attempts) so
// transient pool exhaustion doesn't surface as empty results to the UI.

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
    connectionTimeoutMillis: 15000, // wait up to 15s for a connection
    query_timeout: 15000,
    // Supabase session pooler limits to 15 concurrent connections per user.
    // Use max:1 so we NEVER exceed the pooler limit from our own pool — the
    // session pooler handles multiplexing internally. The retry logic below
    // (5 attempts, 200ms/400ms/800ms/1600ms backoff) handles transient
    // exhaustion from OTHER processes holding pooler connections.
    max: 1,
    idleTimeoutMillis: 5000, // close idle connections after 5s to free pooler slots
  });
  // Surface pool errors so they don't silently swallow
  _pool.on("error", (err) => {
    console.error("[pg] pool error:", err.message);
  });
  return _pool;
}

// Check whether an error is a transient connection-pool exhaustion that
// is safe to retry (EMAXCONNSESSION, connection terminated, etc.).
function isRetryable(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("EMAXCONNSESSION") ||
    msg.includes("max clients reached") ||
    msg.includes("Connection terminated") ||
    msg.includes("terminating connection") ||
    msg.includes("connection") && msg.includes("closed")
  );
}

// Sleep helper for backoff.
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Acquire a client from the pool for a single query. Released automatically.
// Retries on transient pool exhaustion with exponential backoff.
async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const maxAttempts = 5;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let client: PoolClient | null = null;
    try {
      client = await pool.connect();
      const result = await fn(client);
      return result;
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts && isRetryable(e)) {
        // Exponential backoff: 200ms, 400ms, 800ms, 1600ms
        const delay = 200 * Math.pow(2, attempt - 1);
        await sleep(delay);
        continue;
      }
      throw e;
    } finally {
      if (client) client.release();
    }
  }
  throw lastErr;
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
