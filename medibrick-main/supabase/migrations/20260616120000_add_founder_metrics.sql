-- Founder Metrics Dashboard: event storage, notification logs, verification status, admin RPCs.

-- ── Product events (mirrors Vercel Analytics for founder funnel queries) ─────
CREATE TABLE IF NOT EXISTS public.product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_events_name_day
  ON public.product_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_created
  ON public.product_events (created_at DESC);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (API) can read/write.

-- ── Notification delivery log (edge function failures) ───────────────────────
CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  recipient TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_status_created
  ON public.notification_delivery_log (status, created_at DESC);

ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- ── Professional verification status (hospitals already have is_verified) ──
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- ── Admin-only RPC: cron job health ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_cron_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  job_id BIGINT;
  result JSON;
BEGIN
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'expire-past-jobs' LIMIT 1;
  IF job_id IS NULL THEN
    RETURN json_build_object('status', 'not_configured', 'active', false);
  END IF;

  SELECT json_build_object(
    'status', CASE
      WHEN last_run IS NULL THEN 'never_run'
      WHEN last_message IN ('ok', 'UPDATE 0', 'UPDATE 1') OR last_message LIKE 'UPDATE %' THEN 'healthy'
      ELSE 'error'
    END,
    'active', (SELECT active FROM cron.job WHERE jobid = job_id),
    'last_run', last_run,
    'last_message', last_message,
    'failures_24h', failures_24h
  ) INTO result
  FROM (
    SELECT
      (SELECT run_time FROM cron.job_run_details WHERE jobid = job_id ORDER BY run_time DESC LIMIT 1) AS last_run,
      (SELECT return_message FROM cron.job_run_details WHERE jobid = job_id ORDER BY run_time DESC LIMIT 1) AS last_message,
      (SELECT COUNT(*)::int FROM cron.job_run_details
       WHERE jobid = job_id
         AND run_time > now() - interval '24 hours'
         AND return_message NOT IN ('ok', 'UPDATE 0')
         AND return_message NOT LIKE 'UPDATE %') AS failures_24h
  ) s;

  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('status', 'unavailable', 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_cron_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_cron_status() TO service_role;

-- ── Admin-only RPC: slow query count (pg_stat_statements) ────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_slow_query_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*)::int INTO cnt
  FROM pg_stat_statements
  WHERE mean_exec_time > 1000;
  RETURN cnt;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_slow_query_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_slow_query_count() TO service_role;

-- ── Admin-only RPC: funnel event counts for a date range ─────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_event_counts(
  p_since TIMESTAMPTZ,
  p_until TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE(event_name TEXT, event_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT event_name, COUNT(*)::bigint AS event_count
  FROM public.product_events
  WHERE created_at >= p_since AND created_at < p_until
  GROUP BY event_name
  ORDER BY event_count DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_get_event_counts(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_event_counts(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
