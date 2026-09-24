-- ============================================================================
-- AAPAWZ Auth System — OAuth state store (single-use, server-side)
--
-- Backs /api/auth/google/start and /api/auth/google/callback: the signed
-- `state` value sent to Google maps to a row here. The row records which
-- portal initiated the request and where to return the user; it expires
-- after 10 minutes and is marked used on first consumption (replay-proof).
--
-- Applied via the Supabase session pooler (RLS-safe path per owner).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.oauth_states (
  nonce        TEXT PRIMARY KEY,
  portal       TEXT NOT NULL,
  redirect_to  TEXT NOT NULL DEFAULT '/customer/dashboard',
  expires_at   TIMESTAMPTZ NOT NULL,
  used         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only the service role (server-side routes) needs access.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_states TO service_role;
REVOKE ALL ON public.oauth_states FROM anon, authenticated;

-- Housekeeping: drop states older than 1 day (safe to re-run).
DELETE FROM public.oauth_states WHERE created_at < NOW() - INTERVAL '1 day';

CREATE INDEX IF NOT EXISTS oauth_states_expires_idx ON public.oauth_states (expires_at);
