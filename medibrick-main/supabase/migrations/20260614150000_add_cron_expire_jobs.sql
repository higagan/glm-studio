-- Auto-close expired job posts using pg_cron (Supabase paid plan).
--
-- PREREQUISITE: pg_cron must be enabled in your Supabase project BEFORE running
-- this migration. Enable it via:
--   Dashboard → Database → Extensions → search "pg_cron" → Enable
-- Available on Pro and Team plans.
--
-- This migration is self-contained: it also applies the validate_shift_date()
-- fix so that status-only UPDATEs on past-dated rows are not rejected.
-- The fix is also present in 20260614170000 (idempotent CREATE OR REPLACE).

-- Step 1: Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA cron;
GRANT USAGE ON SCHEMA cron TO postgres;

-- Step 2: Fix validate_shift_date() so the cron UPDATE is not blocked.
-- The original trigger rejects ANY update where shift_date < CURRENT_DATE,
-- even status-only changes. We tighten it to only validate when shift_date
-- itself is being set or changed.
CREATE OR REPLACE FUNCTION public.validate_shift_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Only enforce past-date check when shift_date is newly set or changed
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.shift_date IS DISTINCT FROM OLD.shift_date) THEN
    IF NEW.shift_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Shift date cannot be in the past';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 3: Remove any existing schedule with this name (idempotent re-runs)
DO $$
BEGIN
  PERFORM cron.unschedule('expire-past-jobs');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Step 4: Schedule the hourly expiry job
-- Runs every hour at :00 UTC (5:30 AM IST and then hourly).
SELECT cron.schedule(
  'expire-past-jobs',
  '0 * * * *',
  $$
    UPDATE public.job_posts
    SET    status     = 'closed',
           updated_at = now()
    WHERE  shift_date < CURRENT_DATE
      AND  status     = 'open';
  $$
);

-- ── Verification ──
--
-- Confirm extension is enabled:
--   SELECT extname FROM pg_extension WHERE extname = 'pg_cron';
--
-- Confirm job is scheduled:
--   SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'expire-past-jobs';
--
-- Manual immediate run (closes already-expired jobs right now):
--   UPDATE public.job_posts
--   SET    status = 'closed', updated_at = now()
--   WHERE  shift_date < CURRENT_DATE AND status = 'open';
--
-- Check run history (after the next :00 UTC boundary):
--   SELECT run_time, return_message
--   FROM   cron.job_run_details
--   WHERE  jobid = (SELECT jobid FROM cron.job WHERE jobname = 'expire-past-jobs')
--   ORDER  BY run_time DESC LIMIT 5;
--
-- ── Rollback ──
--   SELECT cron.unschedule('expire-past-jobs');
