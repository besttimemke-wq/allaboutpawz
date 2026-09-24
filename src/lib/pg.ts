// Server-side raw pg client for the LMS data layer.
// The Supabase REST API (supabase-js) only exposes the `public` schema by
// default; the LMS enterprise schema lives in `lms`. Rather than wait for
// PostgREST config changes, we connect to the session pooler with the `pg`
// package and run parameterized SQL directly against `lms.*` tables.
//
// The client is lazy — only connected on first query. Reused across requests
// via process-global cache.

import { Client } from "pg";

const connectionString = process.env.SUPABASE_SESSION_POOLER ?? "";

if (!connectionString) {
  console.error(
    "[pg] Missing SUPABASE_SESSION_POOLER env var — LMS data layer will return empty results.",
  );
}

let _client: Client | null = null;

export async function getPg(): Promise<Client> {
  if (_client) return _client;
  _client = new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
  });
  await _client.connect();
  return _client;
}

// Run a parameterized query and return rows; never throws (logs + returns []).
export async function pgQuery<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  try {
    const client = await getPg();
    const { rows } = await client.query(text, params);
    return rows as T[];
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
    const client = await getPg();
    const { rowCount } = await client.query(text, params);
    return rowCount ?? 0;
  } catch (e) {
    console.error("[pg] exec failed:", e instanceof Error ? e.message : String(e));
    return 0;
  }
}
