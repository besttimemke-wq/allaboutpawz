// Server-side Supabase client for the LMS data layer.
// Uses the project's existing SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars
// (no anon key, no RLS — service role bypasses RLS for trusted server use).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars — LMS data layer will return empty results.",
  );
}

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export const supabase = getSupabase();
