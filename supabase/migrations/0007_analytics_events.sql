-- ============================================================================
-- All About Pawz — custom analytics event log
--
-- Backs /api/analytics/events: the client-side `track` library mirrors every
-- booking + ecommerce event here (only while the visitor granted the
-- Performance & Analytics cookie category) via navigator.sendBeacon. The
-- admin portal reads the log for the salon's own analytics (live event
-- stream + funnel counts) independent of Google's console.
--
-- Applied via the Supabase session pooler (RLS-safe path per owner).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_name  TEXT NOT NULL,
  event_data  JSONB NOT NULL DEFAULT '{}'::jsonb,
  page_path   TEXT NOT NULL DEFAULT '',
  session_id  TEXT NOT NULL DEFAULT '',
  value       NUMERIC(12,2),
  currency    TEXT NOT NULL DEFAULT 'USD'
);

CREATE INDEX IF NOT EXISTS analytics_events_created_idx  ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_name_idx     ON public.analytics_events (event_name);
CREATE INDEX IF NOT EXISTS analytics_events_session_idx  ON public.analytics_events (session_id);

-- Only the service role (server-side routes) needs access.
GRANT SELECT, INSERT ON public.analytics_events TO service_role;
REVOKE ALL ON public.analytics_events FROM anon, authenticated;

-- Housekeeping: drop events older than 400 days (safe to re-run).
DELETE FROM public.analytics_events WHERE created_at < NOW() - INTERVAL '400 days';
