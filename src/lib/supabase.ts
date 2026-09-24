// Server-side Supabase clients.
// Uses the project's existing SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars
// (no anon key, no RLS — service role bypasses RLS for trusted server use).
//
// Two clients are exported:
//   - `supabase`     → default `public` schema (CRM/ERP tables, the platform
//                      enterprise schema)
//   - `supabaseLms`  → `lms` schema (LMS enterprise tables: courses,
//                      enrollments, learner_profiles, meeting_records, etc.)
// supabase-js v2 pins the PostgREST schema at client-creation time, so a
// separate client is the clean way to query a non-default schema.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars — LMS data layer will return empty results.",
  );
}

let _publicClient: SupabaseClient | null = null;
let _lmsClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_publicClient) return _publicClient;
  _publicClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _publicClient;
}

export function getSupabaseLms(): SupabaseClient {
  if (_lmsClient) return _lmsClient;
  _lmsClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "lms" },
  });
  return _lmsClient;
}

export const supabase = getSupabase();
export const supabaseLms = getSupabaseLms();
