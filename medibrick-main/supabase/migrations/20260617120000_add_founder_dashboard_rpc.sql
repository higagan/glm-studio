-- Founder dashboard RPCs (Phases 8–15): marketplace health, retention, trust, geo, specialty.

ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS filled_at TIMESTAMPTZ;

UPDATE public.job_posts
SET filled_at = updated_at
WHERE status = 'filled' AND filled_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_job_filled_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'filled' AND (OLD.status IS DISTINCT FROM 'filled') THEN
    NEW.filled_at := COALESCE(NEW.filled_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_posts_filled_at ON public.job_posts;
CREATE TRIGGER trg_job_posts_filled_at
  BEFORE UPDATE ON public.job_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_job_filled_at();

CREATE OR REPLACE FUNCTION public.founder_specialty_bucket(dept TEXT, spec TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(dept, '') ILIKE '%nurs%' OR COALESCE(spec, '') ILIKE '%nurs%' THEN 'nurses'
    WHEN COALESCE(dept, '') ILIKE '%ayush%' OR COALESCE(spec, '') ILIKE '%ayush%' THEN 'ayush'
    WHEN COALESCE(dept, '') ILIKE '%physio%' OR COALESCE(spec, '') ILIKE '%physio%' THEN 'physiotherapists'
    WHEN COALESCE(dept, '') ILIKE '%lab%' OR COALESCE(spec, '') ILIKE '%lab%'
      OR COALESCE(dept, '') ILIKE '%biochem%' OR COALESCE(spec, '') ILIKE '%biochem%' THEN 'lab_staff'
    WHEN COALESCE(dept, '') ILIKE '%tech%' OR COALESCE(spec, '') ILIKE '%tech%'
      OR COALESCE(dept, '') ILIKE '%ot %' OR COALESCE(dept, '') ILIKE '%ot/%' THEN 'technicians'
    WHEN COALESCE(dept, '') ILIKE '%doctor%' OR COALESCE(spec, '') ILIKE '%doctor%'
      OR COALESCE(dept, '') ILIKE '%surgeon%' OR COALESCE(spec, '') ILIKE '%surgeon%'
      OR COALESCE(dept, '') ILIKE '%physician%' OR COALESCE(dept, '') ILIKE '%ortho%'
      OR COALESCE(dept, '') ILIKE '%cardio%' OR COALESCE(dept, '') ILIKE '%emergency%' THEN 'doctors'
    ELSE 'other'
  END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_founder_dashboard()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  month_start TIMESTAMPTZ := date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
  week_start TIMESTAMPTZ := now() - interval '7 days';
  prev_week_start TIMESTAMPTZ := now() - interval '14 days';
  open_shifts INT;
  filled_shifts INT;
  closed_shifts INT;
  fill_rate NUMERIC;
  avg_hours_to_fill NUMERIC;
  j_marketplace JSON;
  j_retention JSON;
  j_quality JSON;
  j_trust JSON;
  j_geo JSON;
  j_specialty JSON;
  j_attribution JSON;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status = 'open'),
    COUNT(*) FILTER (WHERE status = 'filled'),
    COUNT(*) FILTER (WHERE status = 'closed')
  INTO open_shifts, filled_shifts, closed_shifts
  FROM job_posts
  WHERE is_seed_data = FALSE;

  IF (open_shifts + filled_shifts + closed_shifts) = 0 THEN
    fill_rate := NULL;
  ELSE
    fill_rate := ROUND(filled_shifts::numeric / (open_shifts + filled_shifts + closed_shifts) * 100, 1);
  END IF;

  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (filled_at - created_at)) / 3600.0)::numeric, 1)
  INTO avg_hours_to_fill
  FROM job_posts
  WHERE status = 'filled' AND filled_at IS NOT NULL AND is_seed_data = FALSE;

  j_marketplace := json_build_object(
    'openShifts', open_shifts,
    'filledShifts', filled_shifts,
    'closedShifts', closed_shifts,
    'fillRatePct', fill_rate,
    'avgHoursToFill', avg_hours_to_fill,
    'noShowRatePct', NULL,
    'noShowTracked', FALSE
  );

  WITH hospital_jobs AS (
    SELECT
      hospital_id,
      COUNT(*) AS job_count,
      MIN(created_at) AS first_post,
      COUNT(*) FILTER (WHERE created_at >= month_start) AS jobs_this_month
    FROM job_posts
    WHERE is_seed_data = FALSE
    GROUP BY hospital_id
  ),
  posted_this_month AS (
    SELECT COUNT(DISTINCT hospital_id)::int AS cnt
    FROM job_posts
    WHERE is_seed_data = FALSE AND created_at >= month_start
  ),
  returning_hospitals AS (
    SELECT COUNT(*)::int AS cnt
    FROM hospital_jobs hj
    WHERE hj.jobs_this_month > 0 AND hj.first_post < month_start
  ),
  repeat_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE job_count >= 2)::int AS repeat_hospitals,
      COUNT(*)::int AS total_posting_hospitals,
      ROUND(AVG(job_count)::numeric, 1) AS jobs_per_hospital
    FROM hospital_jobs
  )
  SELECT json_build_object(
    'hospitalsPostedThisMonth', (SELECT cnt FROM posted_this_month),
    'returningHospitals', (SELECT cnt FROM returning_hospitals),
    'repeatPostingRatePct', CASE
      WHEN (SELECT total_posting_hospitals FROM repeat_stats) = 0 THEN NULL
      ELSE ROUND(
        (SELECT repeat_hospitals FROM repeat_stats)::numeric /
        (SELECT total_posting_hospitals FROM repeat_stats) * 100, 1)
    END,
    'jobsPerHospital', (SELECT jobs_per_hospital FROM repeat_stats)
  )
  INTO j_retention;

  WITH prof AS (
    SELECT
      pp.verification_status,
      (
        (CASE WHEN pr.full_name IS NOT NULL AND trim(pr.full_name) <> '' THEN 1 ELSE 0 END) +
        (CASE WHEN pr.phone IS NOT NULL AND trim(pr.phone) <> '' THEN 1 ELSE 0 END) +
        (CASE WHEN pp.specialization IS NOT NULL AND trim(pp.specialization) <> '' THEN 1 ELSE 0 END) +
        (CASE WHEN pp.experience_years IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN pp.qualifications IS NOT NULL AND trim(pp.qualifications) <> '' THEN 1 ELSE 0 END) +
        (CASE WHEN pp.bio IS NOT NULL AND trim(pp.bio) <> '' THEN 1 ELSE 0 END)
      )::numeric / 6.0 * 100 AS completion_pct
    FROM professional_profiles pp
    JOIN profiles pr ON pr.id = pp.user_id
    WHERE pp.is_seed_data = FALSE
  ),
  app_stats AS (
    SELECT
      COUNT(*)::int AS total_apps,
      COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted_apps
    FROM applications
    WHERE is_seed_data = FALSE
  ),
  job_count AS (
    SELECT GREATEST(COUNT(*), 1)::numeric AS cnt FROM job_posts WHERE is_seed_data = FALSE
  )
  SELECT json_build_object(
    'verifiedProfessionals', (SELECT COUNT(*)::int FROM prof WHERE verification_status = 'verified'),
    'profileCompletionRatePct', (SELECT ROUND(AVG(completion_pct)::numeric, 1) FROM prof),
    'applicationsPerJob', (SELECT ROUND((SELECT total_apps FROM app_stats) / (SELECT cnt FROM job_count), 2)),
    'acceptanceRatePct', CASE
      WHEN (SELECT total_apps FROM app_stats) = 0 THEN NULL
      ELSE ROUND((SELECT accepted_apps FROM app_stats)::numeric / (SELECT total_apps FROM app_stats) * 100, 1)
    END,
    'applicationToHireRatePct', CASE
      WHEN (SELECT total_apps FROM app_stats) = 0 THEN NULL
      ELSE ROUND((SELECT accepted_apps FROM app_stats)::numeric / (SELECT total_apps FROM app_stats) * 100, 1)
    END,
    'verifiedProfessionalsPrev7d', (
      SELECT COUNT(*)::int FROM professional_profiles
      WHERE verification_status = 'verified' AND is_seed_data = FALSE AND updated_at < week_start
    ),
    'applicationsLast7d', (
      SELECT COUNT(*)::int FROM applications
      WHERE is_seed_data = FALSE AND created_at >= week_start
    ),
    'applicationsPrev7d', (
      SELECT COUNT(*)::int FROM applications
      WHERE is_seed_data = FALSE AND created_at >= prev_week_start AND created_at < week_start
    )
  )
  INTO j_quality;

  SELECT json_build_object(
    'verifiedHospitals', (
      SELECT COUNT(*)::int FROM hospital_profiles WHERE is_verified = TRUE AND is_seed_data = FALSE
    ),
    'verifiedProfessionals', (
      SELECT COUNT(*)::int FROM professional_profiles
      WHERE verification_status = 'verified' AND is_seed_data = FALSE
    ),
    'avgHospitalRating', (
      SELECT ROUND(AVG(rating)::numeric, 1) FROM hospital_reviews WHERE is_seed_data = FALSE
    ),
    'avgProfessionalRating', NULL,
    'professionalRatingTracked', FALSE,
    'noShowRatePct', NULL,
    'noShowTracked', FALSE,
    'paymentSlaHours', NULL,
    'paymentTracked', FALSE,
    'avgTimeToPaymentHours', NULL,
    'disputesReported', NULL,
    'disputesResolved', NULL,
    'disputesTracked', FALSE
  )
  INTO j_trust;

  SELECT COALESCE(
    (
      SELECT json_agg(row_to_json(g) ORDER BY g.jobs DESC)
      FROM (
        SELECT
          COALESCE(NULLIF(trim(hp.city), ''), 'Unknown') AS city,
          COUNT(DISTINCT jp.id)::int AS jobs,
          COUNT(DISTINCT a.id)::int AS applications,
          COUNT(DISTINCT pp.id)::int AS active_professionals,
          COUNT(DISTINCT hp.id)::int AS active_hospitals
        FROM hospital_profiles hp
        LEFT JOIN job_posts jp ON jp.hospital_id = hp.id AND jp.is_seed_data = FALSE
        LEFT JOIN applications a ON a.job_id = jp.id AND a.is_seed_data = FALSE
        LEFT JOIN professional_profiles pp ON pp.is_seed_data = FALSE
          AND pp.id IN (
            SELECT a2.professional_id
            FROM applications a2
            JOIN job_posts j2 ON j2.id = a2.job_id
            WHERE j2.hospital_id = hp.id AND a2.is_seed_data = FALSE
          )
        WHERE hp.is_seed_data = FALSE
        GROUP BY COALESCE(NULLIF(trim(hp.city), ''), 'Unknown')
        ORDER BY COUNT(DISTINCT jp.id) DESC
        LIMIT 10
      ) g
    ),
    '[]'::json
  )
  INTO j_geo;

  SELECT COALESCE(
    (
      SELECT json_agg(row_to_json(s))
      FROM (
        SELECT
          founder_specialty_bucket(jp.department, jp.required_specialization) AS category,
          COUNT(DISTINCT jp.id)::int AS jobs,
          COUNT(DISTINCT a.id)::int AS applications,
          CASE
            WHEN COUNT(DISTINCT jp.id) = 0 THEN NULL
            ELSE ROUND(
              COUNT(DISTINCT jp.id) FILTER (WHERE jp.status = 'filled')::numeric /
              COUNT(DISTINCT jp.id) * 100, 1)
          END AS fill_rate_pct,
          CASE
            WHEN COUNT(DISTINCT jp.id) = 0 THEN NULL
            ELSE ROUND(COUNT(DISTINCT a.id)::numeric / COUNT(DISTINCT jp.id) * 100, 1)
          END AS conversion_rate_pct
        FROM job_posts jp
        LEFT JOIN applications a ON a.job_id = jp.id AND a.is_seed_data = FALSE
        WHERE jp.is_seed_data = FALSE
        GROUP BY founder_specialty_bucket(jp.department, jp.required_specialization)
        ORDER BY COUNT(DISTINCT jp.id) DESC
      ) s
    ),
    '[]'::json
  )
  INTO j_specialty;

  SELECT COALESCE(
    (
      SELECT json_object_agg(src.source, src.cnt)
      FROM (
        SELECT COALESCE(NULLIF(referral_source, ''), 'direct') AS source, COUNT(*)::int AS cnt
        FROM applications
        WHERE is_seed_data = FALSE
        GROUP BY COALESCE(NULLIF(referral_source, ''), 'direct')
      ) src
    ),
    '{}'::json
  )
  INTO j_attribution;

  RETURN json_build_object(
    'marketplaceHealth', j_marketplace,
    'hospitalRetention', j_retention,
    'professionalQuality', j_quality,
    'trust', j_trust,
    'geography', j_geo,
    'specialty', j_specialty,
    'attribution', j_attribution
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_founder_dashboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_founder_dashboard() TO service_role;
