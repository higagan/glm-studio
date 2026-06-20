-- Fix validate_shift_date() so it does NOT block status-only UPDATEs.
--
-- Problem: the original trigger fires on every INSERT OR UPDATE and rejects
-- any row where shift_date < CURRENT_DATE, regardless of which column changed.
-- This prevents the pg_cron job (and any admin action) from closing expired
-- shifts by setting status = 'closed'.
--
-- Fix: only enforce the check when:
--   a) the operation is INSERT, OR
--   b) the operation is UPDATE and shift_date is actually being changed.
--
-- This is safe — a hospital cannot set a new job to a past date, and cannot
-- move an existing job's date backwards. Status changes are unaffected.

CREATE OR REPLACE FUNCTION public.validate_shift_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Only validate when shift_date is newly set or changed, not on status-only updates
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.shift_date IS DISTINCT FROM OLD.shift_date) THEN
    IF NEW.shift_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Shift date cannot be in the past';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Verification: confirm the function body was updated
-- SELECT prosrc FROM pg_proc WHERE proname = 'validate_shift_date';
-- Expected: contains "TG_OP = 'INSERT' OR"
