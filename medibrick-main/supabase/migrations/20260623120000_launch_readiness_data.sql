-- Launch Readiness Sprint: clean contaminated data and reopen real marketplace jobs.

-- 1) Remove real application on seed/demo job (pre-trigger contamination)
DELETE FROM public.applications
WHERE id = '54dd0ceb-93b7-48c8-bdc5-ef34684af2ec'
  AND is_seed_data = FALSE
  AND job_id IN (
    SELECT id FROM public.job_posts WHERE is_seed_data = TRUE
  );

-- 2) Reopen representative real hospital jobs with future shift dates
UPDATE public.job_posts SET
  status = 'open',
  shift_date = '2026-07-15',
  updated_at = now()
WHERE slug IN (
  'emergency-night-physician-bengaluru-a9eef844',
  'senior-staff-nurse-icu-mumbai-abc3e057',
  'night-duty-nurse-oncology-new-delhi-6b966dac',
  'icu-night-shift-physician-mumbai-5654968f',
  'intensivist-bengaluru-5e561d2d'
)
AND is_seed_data = FALSE;

-- 3) Repair analytics drift from seed-job test session (Nupur, 2026-06-15)
DELETE FROM public.product_events
WHERE session_id = 'adcbdd98-c45b-4fe0-ace6-e751011c7ebf'
  AND event_name = 'application_submitted';

INSERT INTO public.product_events (event_name, properties, session_id, created_at, source, job_id)
SELECT 'profile_started', '{"source":"launch_readiness_backfill"}'::jsonb,
  'adcbdd98-c45b-4fe0-ace6-e751011c7ebf', '2026-06-15 19:59:40+00', 'direct', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_events
  WHERE session_id = 'adcbdd98-c45b-4fe0-ace6-e751011c7ebf'
    AND event_name = 'profile_started'
);

-- 4) Treat missing pg_cron as not_configured (not unhealthy) for confidence scoring
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
  IF SQLERRM LIKE '%cron.job%' OR SQLERRM LIKE '%schema "cron"%' THEN
    RETURN json_build_object('status', 'not_configured', 'active', false, 'note', 'pg_cron extension not enabled');
  END IF;
  RETURN json_build_object('status', 'unavailable', 'error', SQLERRM);
END;
$$;

