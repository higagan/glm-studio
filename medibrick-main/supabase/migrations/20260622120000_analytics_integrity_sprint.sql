-- Analytics Integrity Sprint: data guards, seed-filtered metrics, reconciliation, confidence, tests.

-- ── 1) Block applications to seed/demo jobs ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.reject_application_to_seed_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.job_posts jp
    WHERE jp.id = NEW.job_id
      AND jp.is_seed_data = TRUE
  ) THEN
    RAISE EXCEPTION 'Cannot apply to demo or seed job listings'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_application_to_seed_job ON public.applications;
CREATE TRIGGER trg_reject_application_to_seed_job
  BEFORE INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_application_to_seed_job();

-- ── 2) Seed-filtered business_metrics view ────────────────────────────────────

CREATE OR REPLACE VIEW public.business_metrics AS
SELECT
  (SELECT COUNT(*) FROM public.job_posts WHERE is_seed_data = FALSE) AS total_jobs,
  (SELECT COUNT(*) FROM public.job_posts WHERE status = 'open' AND is_seed_data = FALSE) AS open_jobs,
  (SELECT COUNT(*) FROM public.job_posts WHERE status = 'closed' AND is_seed_data = FALSE) AS closed_jobs,
  (SELECT COUNT(*) FROM public.job_posts WHERE status = 'filled' AND is_seed_data = FALSE) AS filled_jobs,
  (SELECT COUNT(*) FROM public.job_posts
   WHERE is_seed_data = FALSE AND created_at > now() - interval '7 days') AS jobs_posted_last_7d,
  (SELECT COUNT(*) FROM public.applications a
   JOIN public.job_posts jp ON jp.id = a.job_id
   WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE) AS total_applications,
  (SELECT COUNT(*) FROM public.applications a
   JOIN public.job_posts jp ON jp.id = a.job_id
   WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE AND a.status = 'accepted') AS accepted_applications,
  (SELECT COUNT(*) FROM public.applications a
   JOIN public.job_posts jp ON jp.id = a.job_id
   WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE AND a.status = 'pending') AS pending_applications,
  (SELECT COUNT(*) FROM public.applications a
   JOIN public.job_posts jp ON jp.id = a.job_id
   WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE
     AND a.created_at > now() - interval '7 days') AS applications_last_7d,
  CASE
    WHEN (SELECT COUNT(*) FROM public.job_posts WHERE status = 'open' AND is_seed_data = FALSE) = 0 THEN NULL
    ELSE ROUND(
      (SELECT COUNT(*) FROM public.applications a
       JOIN public.job_posts jp ON jp.id = a.job_id
       WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE)::numeric
      / (SELECT COUNT(*) FROM public.job_posts WHERE status = 'open' AND is_seed_data = FALSE),
      2
    )
  END AS applications_per_open_job,
  CASE
    WHEN (SELECT COUNT(*) FROM public.applications a
          JOIN public.job_posts jp ON jp.id = a.job_id
          WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE) = 0 THEN NULL
    ELSE ROUND(
      (SELECT COUNT(*) FROM public.applications a
       JOIN public.job_posts jp ON jp.id = a.job_id
       WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE AND a.status = 'accepted')::numeric
      / (SELECT COUNT(*) FROM public.applications a
         JOIN public.job_posts jp ON jp.id = a.job_id
         WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE) * 100,
      1
    )
  END AS accepted_application_rate_pct,
  (SELECT COUNT(*) FROM public.professional_profiles WHERE is_seed_data = FALSE) AS total_professionals,
  (SELECT COUNT(*) FROM public.hospital_profiles WHERE is_seed_data = FALSE) AS total_hospitals;

REVOKE ALL ON public.business_metrics FROM anon, authenticated;
GRANT SELECT ON public.business_metrics TO service_role;

-- ── 3) Patched founder dashboard (real marketplace applications + trends) ─────

CREATE OR REPLACE FUNCTION public.admin_get_founder_dashboard()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  month_start TIMESTAMPTZ := date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
  prev_month_start TIMESTAMPTZ := (month_start - interval '1 month');
  week_start TIMESTAMPTZ := now() - interval '7 days';
  prev_week_start TIMESTAMPTZ := now() - interval '14 days';
  open_shifts INT;
  filled_shifts INT;
  closed_shifts INT;
  fill_rate NUMERIC;
  fill_rate_prev NUMERIC;
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

  SELECT ROUND(
    COUNT(*) FILTER (WHERE status = 'filled')::numeric
    / NULLIF(COUNT(*), 0) * 100,
    1
  )
  INTO fill_rate_prev
  FROM job_posts
  WHERE is_seed_data = FALSE
    AND created_at < week_start;

  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (filled_at - created_at)) / 3600.0)::numeric, 1)
  INTO avg_hours_to_fill
  FROM job_posts
  WHERE status = 'filled' AND filled_at IS NOT NULL AND is_seed_data = FALSE;

  j_marketplace := json_build_object(
    'openShifts', open_shifts,
    'filledShifts', filled_shifts,
    'closedShifts', closed_shifts,
    'fillRatePct', fill_rate,
    'fillRatePctPrev', fill_rate_prev,
    'avgHoursToFill', avg_hours_to_fill,
    'noShowRatePct', NULL,
    'noShowTracked', FALSE
  );

  WITH hospital_jobs AS (
    SELECT
      hospital_id,
      COUNT(*) AS job_count,
      MIN(created_at) AS first_post,
      COUNT(*) FILTER (WHERE created_at >= month_start) AS jobs_this_month,
      COUNT(*) FILTER (
        WHERE created_at >= prev_month_start AND created_at < month_start
      ) AS jobs_prev_month
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
  returning_prev_month AS (
    SELECT COUNT(*)::int AS cnt
    FROM hospital_jobs hj
    WHERE hj.jobs_prev_month > 0 AND hj.first_post < prev_month_start
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
    'returningHospitalsPrevMonth', (SELECT cnt FROM returning_prev_month),
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
  real_apps AS (
    SELECT a.*
    FROM applications a
    JOIN job_posts jp ON jp.id = a.job_id
    WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE
  ),
  app_stats AS (
    SELECT
      COUNT(*)::int AS total_apps,
      COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted_apps
    FROM real_apps
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
      SELECT COUNT(*)::int FROM real_apps WHERE created_at >= week_start
    ),
    'applicationsPrev7d', (
      SELECT COUNT(*)::int FROM real_apps
      WHERE created_at >= prev_week_start AND created_at < week_start
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
        LEFT JOIN applications a ON a.job_id = jp.id AND a.is_seed_data = FALSE AND jp.is_seed_data = FALSE
        LEFT JOIN professional_profiles pp ON pp.is_seed_data = FALSE
          AND pp.id IN (
            SELECT a2.professional_id
            FROM applications a2
            JOIN job_posts j2 ON j2.id = a2.job_id
            WHERE j2.hospital_id = hp.id AND a2.is_seed_data = FALSE AND j2.is_seed_data = FALSE
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
        SELECT COALESCE(NULLIF(a.referral_source, ''), 'direct') AS source, COUNT(*)::int AS cnt
        FROM applications a
        JOIN job_posts jp ON jp.id = a.job_id
        WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE
        GROUP BY COALESCE(NULLIF(a.referral_source, ''), 'direct')
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

-- ── 4) Reconciliation helpers ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._reconciliation_row(
  p_key TEXT,
  p_label TEXT,
  p_source_a_label TEXT,
  p_source_a_value NUMERIC,
  p_source_b_label TEXT,
  p_source_b_value NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_diff NUMERIC;
  v_status TEXT;
BEGIN
  v_diff := ABS(COALESCE(p_source_a_value, 0) - COALESCE(p_source_b_value, 0));
  IF v_diff = 0 THEN
    v_status := 'OK';
  ELSIF v_diff <= 1 THEN
    v_status := 'WARNING';
  ELSE
    v_status := 'ERROR';
  END IF;

  RETURN jsonb_build_object(
    'key', p_key,
    'label', p_label,
    'sourceA', jsonb_build_object('label', p_source_a_label, 'value', p_source_a_value),
    'sourceB', jsonb_build_object('label', p_source_b_label, 'value', p_source_b_value),
    'difference', v_diff,
    'status', v_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_founder_reconciliation()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week TIMESTAMPTZ := now() - interval '7 days';
  v_apps_db INT;
  v_apps_events INT;
  v_open_dashboard INT;
  v_open_direct INT;
  v_fill_dashboard NUMERIC;
  v_fill_direct NUMERIC;
  v_repeat_now INT;
  v_repeat_dashboard INT;
  v_apps_per_job_db NUMERIC;
  v_apps_per_job_view NUMERIC;
  v_rows JSONB := '[]'::jsonb;
  v_dash JSON;
BEGIN
  SELECT COUNT(*)::int
  INTO v_apps_db
  FROM applications a
  JOIN job_posts jp ON jp.id = a.job_id
  WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE
    AND a.created_at >= v_week;

  SELECT COUNT(DISTINCT public._analytics_session_key(session_id, id))::int
  INTO v_apps_events
  FROM product_events
  WHERE event_name = 'application_submitted'
    AND created_at >= v_week;

  v_rows := v_rows || public._reconciliation_row(
    'applications_7d', 'Applications (7d)',
    'Database (real marketplace)', v_apps_db,
    'Product events (sessions)', v_apps_events
  );

  SELECT public.admin_get_founder_dashboard() INTO v_dash;

  v_open_dashboard := (v_dash->'marketplaceHealth'->>'openShifts')::int;
  v_fill_dashboard := (v_dash->'marketplaceHealth'->>'fillRatePct')::numeric;
  v_repeat_dashboard := (v_dash->'hospitalRetention'->>'returningHospitals')::int;
  v_apps_per_job_db := (v_dash->'professionalQuality'->>'applicationsPerJob')::numeric;

  SELECT COUNT(*)::int INTO v_open_direct
  FROM job_posts WHERE is_seed_data = FALSE AND status = 'open';

  SELECT ROUND(
    COUNT(*) FILTER (WHERE status = 'filled')::numeric
    / NULLIF(COUNT(*), 0) * 100,
    1
  )
  INTO v_fill_direct
  FROM job_posts WHERE is_seed_data = FALSE;

  WITH hospital_jobs AS (
    SELECT
      hospital_id,
      MIN(created_at) AS first_post,
      COUNT(*) FILTER (
        WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'
      ) AS jobs_this_month
    FROM job_posts
    WHERE is_seed_data = FALSE
    GROUP BY hospital_id
  )
  SELECT COUNT(*)::int INTO v_repeat_now
  FROM hospital_jobs
  WHERE jobs_this_month > 0
    AND first_post < date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';

  SELECT ROUND(
    (SELECT COUNT(*)::numeric FROM applications a
     JOIN job_posts jp ON jp.id = a.job_id
     WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE)
    / NULLIF((SELECT COUNT(*)::numeric FROM job_posts WHERE is_seed_data = FALSE), 0),
    2
  )
  INTO v_apps_per_job_view;

  v_rows := v_rows || public._reconciliation_row(
    'open_jobs', 'Open Jobs',
    'Dashboard RPC', v_open_dashboard,
    'Direct SQL count', v_open_direct
  );

  v_rows := v_rows || public._reconciliation_row(
    'fill_rate', 'Fill Rate %',
    'Dashboard RPC', v_fill_dashboard,
    'Direct SQL calc', v_fill_direct
  );

  v_rows := v_rows || public._reconciliation_row(
    'repeat_hospitals', 'Repeat Hospitals',
    'Dashboard RPC', v_repeat_dashboard,
    'Direct SQL calc', v_repeat_now
  );

  v_rows := v_rows || public._reconciliation_row(
    'applications_per_job', 'Applications / Job',
    'Dashboard RPC', v_apps_per_job_db,
    'Direct SQL calc', v_apps_per_job_view
  );

  RETURN jsonb_build_object(
    'generatedAt', now(),
    'comparisons', v_rows
  );
END;
$$;

-- ── 5) Analytics confidence score ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_analytics_confidence()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_score INT := 100;
  v_deductions JSONB := '[]'::jsonb;
  v_week TIMESTAMPTZ := now() - interval '7 days';
  v_apps_db INT;
  v_apps_events INT;
  v_seed_apps INT;
  v_events_7d INT;
  v_cron JSON;
  v_fill_prev NUMERIC;
  v_repeat_prev INT;
  v_dash JSON;
  v_funnel_ok BOOLEAN := TRUE;
  v_step JSONB;
  v_prev_cnt INT := -1;
  v_cur_cnt INT;
  v_i INT;
  v_steps JSONB;
BEGIN
  SELECT COUNT(*)::int INTO v_apps_db
  FROM applications a
  JOIN job_posts jp ON jp.id = a.job_id
  WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE
    AND a.created_at >= v_week;

  SELECT COUNT(DISTINCT public._analytics_session_key(session_id, id))::int INTO v_apps_events
  FROM product_events
  WHERE event_name = 'application_submitted' AND created_at >= v_week;

  IF ABS(COALESCE(v_apps_db, 0) - COALESCE(v_apps_events, 0)) > 1 THEN
    v_score := v_score - 20;
    v_deductions := v_deductions || jsonb_build_array(jsonb_build_object(
      'reason', 'DB vs event application mismatch', 'points', 20,
      'detail', format('DB=%s events=%s', v_apps_db, v_apps_events)
    ));
  ELSIF ABS(COALESCE(v_apps_db, 0) - COALESCE(v_apps_events, 0)) = 1 THEN
    v_score := v_score - 8;
    v_deductions := v_deductions || jsonb_build_array(jsonb_build_object(
      'reason', 'Minor DB vs event application drift', 'points', 8,
      'detail', format('DB=%s events=%s', v_apps_db, v_apps_events)
    ));
  END IF;

  SELECT COUNT(*)::int INTO v_seed_apps
  FROM applications a
  JOIN job_posts jp ON jp.id = a.job_id
  WHERE a.is_seed_data = FALSE AND jp.is_seed_data = TRUE;

  IF v_seed_apps > 0 THEN
    v_score := v_score - 25;
    v_deductions := v_deductions || jsonb_build_array(jsonb_build_object(
      'reason', 'Seed job application contamination', 'points', 25,
      'detail', format('%s real applications on seed jobs', v_seed_apps)
    ));
  END IF;

  SELECT COUNT(*)::int INTO v_events_7d
  FROM product_events WHERE created_at >= v_week;

  IF v_events_7d = 0 THEN
    v_score := v_score - 15;
    v_deductions := v_deductions || jsonb_build_array(jsonb_build_object(
      'reason', 'No product events in last 7 days', 'points', 15,
      'detail', 'Event tracking may be offline'
    ));
  END IF;

  SELECT public.admin_get_founder_dashboard() INTO v_dash;
  v_fill_prev := (v_dash->'marketplaceHealth'->>'fillRatePctPrev')::numeric;
  v_repeat_prev := (v_dash->'hospitalRetention'->>'returningHospitalsPrevMonth')::int;

  IF (v_dash->'marketplaceHealth'->>'fillRatePct') IS NOT NULL AND v_fill_prev IS NULL THEN
    v_score := v_score - 5;
    v_deductions := v_deductions || jsonb_build_array(jsonb_build_object(
      'reason', 'Fill rate trend baseline missing', 'points', 5, 'detail', NULL
    ));
  END IF;

  IF (v_dash->'hospitalRetention'->>'returningHospitals') IS NOT NULL
     AND v_repeat_prev IS NULL
     AND (v_dash->'hospitalRetention'->>'returningHospitals')::int > 0 THEN
    v_score := v_score - 5;
    v_deductions := v_deductions || jsonb_build_array(jsonb_build_object(
      'reason', 'Repeat hospital trend baseline missing', 'points', 5, 'detail', NULL
    ));
  END IF;

  SELECT public.admin_get_cron_status() INTO v_cron;
  IF COALESCE(v_cron->>'status', '') NOT IN ('healthy', 'never_run', 'not_configured') THEN
    v_score := v_score - 10;
    v_deductions := v_deductions || jsonb_build_array(jsonb_build_object(
      'reason', 'Cron job unhealthy', 'points', 10,
      'detail', COALESCE(v_cron->>'status', 'unknown')
    ));
  END IF;

  v_steps := public._analytics_funnel_steps(
    v_week, now(),
    '[
      ["job_viewed"], ["apply_clicked"], ["auth_started"], ["auth_completed"],
      ["profile_started"], ["profile_completed"],
      ["application_started", "application_dialog_opened"], ["application_submitted"]
    ]'::jsonb
  );

  FOR v_i IN 0 .. GREATEST(jsonb_array_length(v_steps) - 1, 0) LOOP
    v_step := v_steps -> v_i;
    v_cur_cnt := (v_step ->> 'count')::int;
    IF v_prev_cnt >= 0 AND v_cur_cnt > v_prev_cnt THEN
      v_funnel_ok := FALSE;
      EXIT;
    END IF;
    v_prev_cnt := v_cur_cnt;
  END LOOP;

  IF NOT v_funnel_ok THEN
    v_score := v_score - 10;
    v_deductions := v_deductions || jsonb_build_array(jsonb_build_object(
      'reason', 'Funnel step counts not monotonic', 'points', 10,
      'detail', 'Later funnel step exceeds earlier step'
    ));
  END IF;

  v_score := GREATEST(0, LEAST(100, v_score));

  RETURN jsonb_build_object(
    'generatedAt', now(),
    'score', v_score,
    'label', CASE
      WHEN v_score >= 90 THEN 'High confidence'
      WHEN v_score >= 70 THEN 'Moderate confidence'
      ELSE 'Low confidence — verify before deciding'
    END,
    'deductions', v_deductions
  );
END;
$$;

-- ── 6) Automated analytics test suite ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public._test_row(
  p_id TEXT,
  p_name TEXT,
  p_status TEXT,
  p_detail TEXT
)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object('id', p_id, 'name', p_name, 'status', p_status, 'detail', p_detail);
$$;

CREATE OR REPLACE FUNCTION public.admin_get_analytics_test_suite()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tests JSONB := '[]'::jsonb;
  v_week TIMESTAMPTZ := now() - interval '7 days';
  v_apps_db INT;
  v_apps_events INT;
  v_diff INT;
  v_open_rpc INT;
  v_open_sql INT;
  v_fill NUMERIC;
  v_steps JSONB;
  v_i INT;
  v_prev INT := -1;
  v_cur INT;
  v_monotonic BOOLEAN := TRUE;
  v_seed_cnt INT;
  v_dash JSON;
  v_fill_prev NUMERIC;
  v_pass INT := 0;
  v_warn INT := 0;
  v_fail INT := 0;
  r JSONB;
BEGIN
  -- Test 1: DB vs event applications
  SELECT COUNT(*)::int INTO v_apps_db
  FROM applications a JOIN job_posts jp ON jp.id = a.job_id
  WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE AND a.created_at >= v_week;

  SELECT COUNT(DISTINCT public._analytics_session_key(session_id, id))::int INTO v_apps_events
  FROM product_events WHERE event_name = 'application_submitted' AND created_at >= v_week;

  v_diff := ABS(COALESCE(v_apps_db, 0) - COALESCE(v_apps_events, 0));
  v_tests := v_tests || public._test_row(
    'db_vs_events_apps',
    'DB Applications vs Event Applications (7d)',
    CASE WHEN v_diff = 0 THEN 'PASS' WHEN v_diff <= 1 THEN 'WARNING' ELSE 'FAIL' END,
    format('DB=%s events=%s diff=%s', v_apps_db, v_apps_events, v_diff)
  );

  -- Test 2: Open jobs consistency
  SELECT (public.admin_get_founder_dashboard()->'marketplaceHealth'->>'openShifts')::int INTO v_open_rpc;
  SELECT COUNT(*)::int INTO v_open_sql FROM job_posts WHERE is_seed_data = FALSE AND status = 'open';
  v_diff := ABS(v_open_rpc - v_open_sql);
  v_tests := v_tests || public._test_row(
    'open_jobs_consistency',
    'Open Jobs RPC vs Direct SQL',
    CASE WHEN v_diff = 0 THEN 'PASS' WHEN v_diff <= 1 THEN 'WARNING' ELSE 'FAIL' END,
    format('RPC=%s SQL=%s', v_open_rpc, v_open_sql)
  );

  -- Test 3: Funnel monotonicity
  v_steps := public._analytics_funnel_steps(v_week, now(),
    '[["job_viewed"],["apply_clicked"],["auth_started"],["auth_completed"],
      ["profile_started"],["profile_completed"],
      ["application_started","application_dialog_opened"],["application_submitted"]]'::jsonb);
  FOR v_i IN 0 .. GREATEST(jsonb_array_length(v_steps) - 1, 0) LOOP
    v_cur := ((v_steps -> v_i) ->> 'count')::int;
    IF v_prev >= 0 AND v_cur > v_prev THEN v_monotonic := FALSE; END IF;
    v_prev := v_cur;
  END LOOP;
  v_tests := v_tests || public._test_row(
    'funnel_monotonicity',
    'Application funnel step monotonicity',
    CASE WHEN v_monotonic THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN v_monotonic THEN 'Each step count <= previous step' ELSE 'Non-monotonic funnel detected' END
  );

  -- Test 4: Fill rate range
  SELECT (public.admin_get_founder_dashboard()->'marketplaceHealth'->>'fillRatePct')::numeric INTO v_fill;
  v_tests := v_tests || public._test_row(
    'fill_rate_range',
    'Fill Rate within 0–100%',
    CASE
      WHEN v_fill IS NULL THEN 'WARNING'
      WHEN v_fill >= 0 AND v_fill <= 100 THEN 'PASS'
      ELSE 'FAIL'
    END,
    COALESCE(v_fill::text, 'null')
  );

  -- Test 5: Trend calculations present
  SELECT public.admin_get_founder_dashboard() INTO v_dash;
  v_fill_prev := (v_dash->'marketplaceHealth'->>'fillRatePctPrev')::numeric;
  v_tests := v_tests || public._test_row(
    'trend_calculations',
    'Fill rate trend baseline computed',
    CASE
      WHEN (v_dash->'marketplaceHealth'->>'fillRatePct') IS NULL THEN 'WARNING'
      WHEN v_fill_prev IS NOT NULL THEN 'PASS'
      ELSE 'WARNING'
    END,
    format('current=%s prev=%s', v_dash->'marketplaceHealth'->>'fillRatePct', v_fill_prev)
  );

  -- Test 6: Seed contamination
  SELECT COUNT(*)::int INTO v_seed_cnt
  FROM applications a JOIN job_posts jp ON jp.id = a.job_id
  WHERE a.is_seed_data = FALSE AND jp.is_seed_data = TRUE;
  v_tests := v_tests || public._test_row(
    'seed_contamination',
    'No real applications on seed jobs',
    CASE WHEN v_seed_cnt = 0 THEN 'PASS' ELSE 'FAIL' END,
    format('%s contaminated rows', v_seed_cnt)
  );

  FOR r IN SELECT * FROM jsonb_array_elements(v_tests) LOOP
    IF r->>'status' = 'PASS' THEN v_pass := v_pass + 1;
    ELSIF r->>'status' = 'WARNING' THEN v_warn := v_warn + 1;
    ELSE v_fail := v_fail + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'generatedAt', now(),
    'summary', jsonb_build_object('pass', v_pass, 'warning', v_warn, 'fail', v_fail, 'total', v_pass + v_warn + v_fail),
    'tests', v_tests
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_founder_reconciliation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_analytics_confidence() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_analytics_test_suite() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_founder_reconciliation() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_analytics_confidence() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_analytics_test_suite() TO service_role;

-- ── 7) Expanded verification coverage (all founder dashboard KPIs) ───────────

CREATE OR REPLACE FUNCTION public._verification_metric(
  p_key TEXT,
  p_label TEXT,
  p_value TEXT,
  p_value_numeric NUMERIC,
  p_raw_count INT,
  p_source_tables TEXT[],
  p_source_events TEXT[],
  p_sql TEXT,
  p_calculated_at TIMESTAMPTZ,
  p_tracked BOOLEAN DEFAULT TRUE,
  p_note TEXT DEFAULT NULL,
  p_category TEXT DEFAULT 'Executive Summary'
)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'key', p_key,
    'label', p_label,
    'value', p_value,
    'valueNumeric', p_value_numeric,
    'rawCount', p_raw_count,
    'sourceTables', to_jsonb(p_source_tables),
    'sourceEvents', to_jsonb(p_source_events),
    'sql', p_sql,
    'calculatedAt', p_calculated_at,
    'tracked', p_tracked,
    'note', p_note,
    'category', p_category
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_get_founder_metric_verification()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_generated_at TIMESTAMPTZ := now();
  v_month_start TIMESTAMPTZ := date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
  v_week_start TIMESTAMPTZ := now() - interval '7 days';
  v_dash JSON;
  v_open_jobs INT;
  v_filled_jobs INT;
  v_closed_jobs INT;
  v_total_jobs INT;
  v_fill_rate NUMERIC;
  v_apps_7d INT;
  v_total_apps INT;
  v_total_job_posts INT;
  v_apps_per_job NUMERIC;
  v_repeat_hospitals INT;
  v_funnel_views INT;
  v_funnel_apps INT;
  v_recovery_cnt INT;
  v_acq_apps INT;
  v_action_cnt INT;
  v_geo_city TEXT;
  v_geo_jobs INT;
  v_spec_cat TEXT;
  v_spec_jobs INT;
  v_metrics JSONB := '[]'::jsonb;
BEGIN
  SELECT public.admin_get_founder_dashboard() INTO v_dash;

  SELECT
    COUNT(*) FILTER (WHERE status = 'open'),
    COUNT(*) FILTER (WHERE status = 'filled'),
    COUNT(*) FILTER (WHERE status = 'closed'),
    COUNT(*)
  INTO v_open_jobs, v_filled_jobs, v_closed_jobs, v_total_jobs
  FROM public.job_posts
  WHERE is_seed_data = FALSE;

  v_fill_rate := CASE
    WHEN v_total_jobs = 0 THEN NULL
    ELSE ROUND(v_filled_jobs::numeric / v_total_jobs * 100, 1)
  END;

  SELECT COUNT(*)::int INTO v_apps_7d
  FROM public.applications a
  JOIN public.job_posts jp ON jp.id = a.job_id
  WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE
    AND a.created_at >= v_week_start;

  SELECT COUNT(*)::int INTO v_total_apps
  FROM public.applications a
  JOIN public.job_posts jp ON jp.id = a.job_id
  WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE;

  SELECT COUNT(*)::int INTO v_total_job_posts
  FROM public.job_posts WHERE is_seed_data = FALSE;

  v_apps_per_job := CASE
    WHEN v_total_job_posts = 0 THEN NULL
    ELSE ROUND(v_total_apps::numeric / v_total_job_posts, 2)
  END;

  WITH hospital_jobs AS (
    SELECT hospital_id, MIN(created_at) AS first_post,
      COUNT(*) FILTER (WHERE created_at >= v_month_start) AS jobs_this_month
    FROM public.job_posts WHERE is_seed_data = FALSE
    GROUP BY hospital_id
  )
  SELECT COUNT(*)::int INTO v_repeat_hospitals
  FROM hospital_jobs
  WHERE jobs_this_month > 0 AND first_post < v_month_start;

  SELECT COUNT(DISTINCT public._analytics_session_key(session_id, id))::int INTO v_funnel_views
  FROM product_events WHERE event_name = 'job_viewed' AND created_at >= v_week_start;

  SELECT COUNT(DISTINCT public._analytics_session_key(session_id, id))::int INTO v_funnel_apps
  FROM product_events WHERE event_name = 'application_submitted' AND created_at >= v_week_start;

  SELECT jsonb_array_length(COALESCE((public.admin_get_founder_recovery(7, 'all', 500)->'users')::jsonb, '[]'::jsonb))::int
    INTO v_recovery_cnt;

  SELECT COALESCE(SUM(applications), 0)::int INTO v_acq_apps
  FROM jsonb_to_recordset(
    COALESCE((public.admin_get_acquisition_breakdown(7)->'sources')::jsonb, '[]'::jsonb)
  ) AS x(source text, visitors int, job_views int, apply_clicks int, applications int, conversion_pct numeric);

  SELECT COALESCE(jsonb_array_length((public.admin_get_founder_actions(24)->'actions')::jsonb), 0)::int
    INTO v_action_cnt;

  SELECT city, jobs INTO v_geo_city, v_geo_jobs
  FROM (
    SELECT COALESCE(NULLIF(trim(hp.city), ''), 'Unknown') AS city,
      COUNT(DISTINCT jp.id)::int AS jobs
    FROM job_posts jp
    JOIN hospital_profiles hp ON hp.id = jp.hospital_id
    WHERE jp.is_seed_data = FALSE AND hp.is_seed_data = FALSE
    GROUP BY COALESCE(NULLIF(trim(hp.city), ''), 'Unknown')
    ORDER BY COUNT(DISTINCT jp.id) DESC
    LIMIT 1
  ) g;

  SELECT category, jobs INTO v_spec_cat, v_spec_jobs
  FROM (
    SELECT founder_specialty_bucket(jp.department, jp.required_specialization) AS category,
      COUNT(DISTINCT jp.id)::int AS jobs
    FROM job_posts jp WHERE jp.is_seed_data = FALSE
    GROUP BY founder_specialty_bucket(jp.department, jp.required_specialization)
    ORDER BY COUNT(DISTINCT jp.id) DESC
    LIMIT 1
  ) s;

  v_metrics := '[]'::jsonb;

  v_metrics := v_metrics || public._verification_metric(
    'open_jobs', 'Open Jobs', v_open_jobs::text, v_open_jobs, v_open_jobs,
    ARRAY['job_posts'], ARRAY[]::TEXT[],
    $sql$SELECT COUNT(*)::int FROM public.job_posts WHERE is_seed_data = FALSE AND status = 'open'$sql$,
    v_generated_at, TRUE, NULL, 'Executive Summary'
  );

  v_metrics := v_metrics || public._verification_metric(
    'applications_7d', 'Applications (7d)', v_apps_7d::text, v_apps_7d, v_apps_7d,
    ARRAY['applications', 'job_posts'], ARRAY['application_submitted'],
    $sql$SELECT COUNT(*)::int FROM public.applications a
JOIN public.job_posts jp ON jp.id = a.job_id
WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE
  AND a.created_at >= now() - interval '7 days'$sql$,
    v_generated_at, TRUE, NULL, 'Executive Summary'
  );

  v_metrics := v_metrics || public._verification_metric(
    'fill_rate', 'Fill Rate',
    COALESCE(v_fill_rate::text || '%', '—'), v_fill_rate, v_total_jobs,
    ARRAY['job_posts'], ARRAY[]::TEXT[],
    $sql$SELECT ROUND(COUNT(*) FILTER (WHERE status = 'filled')::numeric / NULLIF(COUNT(*), 0) * 100, 1)
FROM public.job_posts WHERE is_seed_data = FALSE$sql$,
    v_generated_at, TRUE, NULL, 'Executive Summary'
  );

  v_metrics := v_metrics || public._verification_metric(
    'no_show_rate', 'No-Show Rate', '—', NULL, 0,
    ARRAY[]::TEXT[], ARRAY[]::TEXT[],
    $sql$SELECT NULL::numeric AS no_show_rate_pct$sql$,
    v_generated_at, FALSE, 'Shift attendance tracking not enabled yet', 'Executive Summary'
  );

  v_metrics := v_metrics || public._verification_metric(
    'repeat_hospitals', 'Repeat Hospitals', v_repeat_hospitals::text, v_repeat_hospitals, v_repeat_hospitals,
    ARRAY['job_posts', 'hospital_profiles'], ARRAY[]::TEXT[],
    $sql$WITH hospital_jobs AS (
  SELECT hospital_id, MIN(created_at) AS first_post,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AS jobs_this_month
  FROM public.job_posts WHERE is_seed_data = FALSE GROUP BY hospital_id
)
SELECT COUNT(*)::int FROM hospital_jobs
WHERE jobs_this_month > 0 AND first_post < date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'$sql$,
    v_generated_at, TRUE, NULL, 'Executive Summary'
  );

  v_metrics := v_metrics || public._verification_metric(
    'applications_per_job', 'Applications / Job',
    COALESCE(v_apps_per_job::text, '—'), v_apps_per_job, v_total_job_posts,
    ARRAY['applications', 'job_posts'], ARRAY[]::TEXT[],
    $sql$SELECT ROUND(
  (SELECT COUNT(*)::numeric FROM applications a JOIN job_posts jp ON jp.id = a.job_id
   WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE)
  / NULLIF((SELECT COUNT(*)::numeric FROM job_posts WHERE is_seed_data = FALSE), 0), 2)$sql$,
    v_generated_at, TRUE, NULL, 'Executive Summary'
  );

  v_metrics := v_metrics || public._verification_metric(
    'marketplace_filled_shifts', 'Filled Shifts',
    COALESCE((v_dash->'marketplaceHealth'->>'filledShifts'), '0'),
    (v_dash->'marketplaceHealth'->>'filledShifts')::numeric,
    v_filled_jobs, ARRAY['job_posts'], ARRAY[]::TEXT[],
    $sql$SELECT COUNT(*)::int FROM job_posts WHERE is_seed_data = FALSE AND status = 'filled'$sql$,
    v_generated_at, TRUE, NULL, 'Marketplace Health'
  );

  v_metrics := v_metrics || public._verification_metric(
    'marketplace_avg_hours_to_fill', 'Avg Hours to Fill',
    COALESCE((v_dash->'marketplaceHealth'->>'avgHoursToFill'), '—'),
    (v_dash->'marketplaceHealth'->>'avgHoursToFill')::numeric,
    v_filled_jobs, ARRAY['job_posts'], ARRAY[]::TEXT[],
    $sql$SELECT ROUND(AVG(EXTRACT(EPOCH FROM (filled_at - created_at)) / 3600.0)::numeric, 1)
FROM job_posts WHERE status = 'filled' AND filled_at IS NOT NULL AND is_seed_data = FALSE$sql$,
    v_generated_at, TRUE, NULL, 'Marketplace Health'
  );

  v_metrics := v_metrics || public._verification_metric(
    'geography_top_city', 'Top City (jobs)',
    COALESCE(v_geo_city || ' (' || v_geo_jobs || ')', '—'),
    v_geo_jobs, COALESCE(v_geo_jobs, 0),
    ARRAY['job_posts', 'hospital_profiles'], ARRAY[]::TEXT[],
    $sql$SELECT COALESCE(NULLIF(trim(hp.city), ''), 'Unknown') AS city, COUNT(DISTINCT jp.id)::int AS jobs
FROM job_posts jp JOIN hospital_profiles hp ON hp.id = jp.hospital_id
WHERE jp.is_seed_data = FALSE AND hp.is_seed_data = FALSE
GROUP BY 1 ORDER BY 2 DESC LIMIT 10$sql$,
    v_generated_at, TRUE, NULL, 'Geography'
  );

  v_metrics := v_metrics || public._verification_metric(
    'specialty_top_category', 'Top Specialty (jobs)',
    COALESCE(v_spec_cat || ' (' || v_spec_jobs || ')', '—'),
    v_spec_jobs, COALESCE(v_spec_jobs, 0),
    ARRAY['job_posts'], ARRAY[]::TEXT[],
    $sql$SELECT founder_specialty_bucket(department, required_specialization) AS category,
  COUNT(DISTINCT id)::int AS jobs
FROM job_posts WHERE is_seed_data = FALSE
GROUP BY 1 ORDER BY 2 DESC LIMIT 10$sql$,
    v_generated_at, TRUE, NULL, 'Specialty'
  );

  v_metrics := v_metrics || public._verification_metric(
    'funnel_job_viewed_7d', 'Funnel: Job Viewed (7d)',
    v_funnel_views::text, v_funnel_views, v_funnel_views,
    ARRAY['product_events'], ARRAY['job_viewed'],
    $sql$SELECT COUNT(DISTINCT public._analytics_session_key(session_id, id))::int
FROM product_events WHERE event_name = 'job_viewed' AND created_at >= now() - interval '7 days'$sql$,
    v_generated_at, TRUE, NULL, 'Funnels'
  );

  v_metrics := v_metrics || public._verification_metric(
    'funnel_application_submitted_7d', 'Funnel: Application Submitted (7d)',
    v_funnel_apps::text, v_funnel_apps, v_funnel_apps,
    ARRAY['product_events'], ARRAY['application_submitted'],
    $sql$SELECT COUNT(DISTINCT public._analytics_session_key(session_id, id))::int
FROM product_events WHERE event_name = 'application_submitted' AND created_at >= now() - interval '7 days'$sql$,
    v_generated_at, TRUE, NULL, 'Funnels'
  );

  v_metrics := v_metrics || public._verification_metric(
    'recovery_queue_count', 'Recovery Queue (7d)',
    v_recovery_cnt::text, v_recovery_cnt, v_recovery_cnt,
    ARRAY['product_events', 'profiles'], ARRAY['job_viewed', 'apply_clicked', 'application_started'],
    $sql$SELECT jsonb_array_length(COALESCE((admin_get_founder_recovery(7, 'all', 500)->'users')::jsonb, '[]'::jsonb))$sql$,
    v_generated_at, TRUE, NULL, 'Recovery'
  );

  v_metrics := v_metrics || public._verification_metric(
    'acquisition_applications_7d', 'Acquisition Applications (7d)',
    v_acq_apps::text, v_acq_apps, v_acq_apps,
    ARRAY['product_events', 'applications'], ARRAY['application_submitted'],
    $sql$SELECT COALESCE(SUM(applications), 0)::int FROM jsonb_to_recordset(
  (admin_get_acquisition_breakdown(7)->'sources')::jsonb
) AS x(source text, visitors int, job_views int, apply_clicks int, applications int, conversion_pct numeric)$sql$,
    v_generated_at, TRUE, NULL, 'Acquisition'
  );

  v_metrics := v_metrics || public._verification_metric(
    'action_center_items', 'Action Center Items (24h)',
    v_action_cnt::text, v_action_cnt, v_action_cnt,
    ARRAY['product_events', 'job_posts', 'applications'], ARRAY[]::TEXT[],
    $sql$SELECT jsonb_array_length(COALESCE((admin_get_founder_actions(24)->'actions')::jsonb, '[]'::jsonb))$sql$,
    v_generated_at, TRUE, NULL, 'Action Center'
  );

  v_metrics := v_metrics || public._verification_metric(
    'trust_verified_hospitals', 'Verified Hospitals',
    COALESCE((v_dash->'trust'->>'verifiedHospitals'), '0'),
    (v_dash->'trust'->>'verifiedHospitals')::numeric,
    (v_dash->'trust'->>'verifiedHospitals')::int,
    ARRAY['hospital_profiles'], ARRAY[]::TEXT[],
    $sql$SELECT COUNT(*)::int FROM hospital_profiles WHERE is_seed_data = FALSE AND is_verified = TRUE$sql$,
    v_generated_at, TRUE, NULL, 'Trust'
  );

  v_metrics := v_metrics || public._verification_metric(
    'trust_verified_professionals', 'Verified Professionals',
    COALESCE((v_dash->'trust'->>'verifiedProfessionals'), '0'),
    (v_dash->'trust'->>'verifiedProfessionals')::numeric,
    (v_dash->'trust'->>'verifiedProfessionals')::int,
    ARRAY['professional_profiles'], ARRAY[]::TEXT[],
    $sql$SELECT COUNT(*)::int FROM professional_profiles WHERE is_seed_data = FALSE AND verification_status = 'verified'$sql$,
    v_generated_at, TRUE, NULL, 'Trust'
  );

  RETURN jsonb_build_object('generatedAt', v_generated_at, 'metrics', v_metrics);
END;
$$;

-- Extend drill-down records for expanded metrics
CREATE OR REPLACE FUNCTION public.admin_get_founder_metric_records(
  p_metric_key TEXT,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_limit INT := GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
  v_offset INT := GREATEST(0, COALESCE(p_offset, 0));
  v_month_start TIMESTAMPTZ := date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
  v_week_start TIMESTAMPTZ := now() - interval '7 days';
  v_total INT := 0;
  v_records JSONB := '[]'::jsonb;
BEGIN
  CASE p_metric_key
    WHEN 'open_jobs' THEN
      SELECT COUNT(*)::int INTO v_total FROM public.job_posts WHERE is_seed_data = FALSE AND status = 'open';
      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC), '[]'::jsonb) INTO v_records
      FROM (
        SELECT jp.id, jp.title, jp.status, jp.department, jp.shift_date, jp.created_at, hp.hospital_name, hp.city
        FROM public.job_posts jp JOIN public.hospital_profiles hp ON hp.id = jp.hospital_id
        WHERE jp.is_seed_data = FALSE AND jp.status = 'open'
        ORDER BY jp.created_at DESC LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'applications_7d' THEN
      SELECT COUNT(*)::int INTO v_total FROM public.applications a
      JOIN public.job_posts jp ON jp.id = a.job_id
      WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE AND a.created_at >= v_week_start;
      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC), '[]'::jsonb) INTO v_records
      FROM (
        SELECT a.id, a.status, a.created_at, jp.title AS job_title, hp.hospital_name, pr.full_name AS professional_name
        FROM public.applications a
        JOIN public.job_posts jp ON jp.id = a.job_id
        JOIN public.hospital_profiles hp ON hp.id = jp.hospital_id
        LEFT JOIN public.professional_profiles pp ON pp.id = a.professional_id
        LEFT JOIN public.profiles pr ON pr.id = pp.user_id
        WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE AND a.created_at >= v_week_start
        ORDER BY a.created_at DESC LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'fill_rate', 'marketplace_filled_shifts' THEN
      SELECT COUNT(*)::int INTO v_total FROM public.job_posts WHERE is_seed_data = FALSE;
      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC), '[]'::jsonb) INTO v_records
      FROM (
        SELECT jp.id, jp.title, jp.status, jp.shift_date, jp.filled_at, jp.created_at, hp.hospital_name
        FROM public.job_posts jp JOIN public.hospital_profiles hp ON hp.id = jp.hospital_id
        WHERE jp.is_seed_data = FALSE ORDER BY jp.created_at DESC LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'repeat_hospitals' THEN
      WITH repeat_hospital_set AS (
        SELECT hospital_id, MIN(created_at) AS first_post,
          COUNT(*) FILTER (WHERE created_at >= v_month_start) AS jobs_this_month
        FROM public.job_posts WHERE is_seed_data = FALSE GROUP BY hospital_id
        HAVING COUNT(*) FILTER (WHERE created_at >= v_month_start) > 0
          AND MIN(created_at) < v_month_start
      )
      SELECT COUNT(*)::int INTO v_total FROM repeat_hospital_set;
      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.jobs_this_month DESC), '[]'::jsonb) INTO v_records
      FROM (
        SELECT hp.id AS hospital_id, hp.hospital_name, hp.city, hj.jobs_this_month, hj.first_post
        FROM (
          SELECT hospital_id, MIN(created_at) AS first_post,
            COUNT(*) FILTER (WHERE created_at >= v_month_start) AS jobs_this_month
          FROM public.job_posts WHERE is_seed_data = FALSE GROUP BY hospital_id
        ) hj
        JOIN public.hospital_profiles hp ON hp.id = hj.hospital_id
        WHERE hj.jobs_this_month > 0 AND hj.first_post < v_month_start
        ORDER BY hj.jobs_this_month DESC LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'applications_per_job' THEN
      SELECT COUNT(*)::int INTO v_total FROM public.job_posts WHERE is_seed_data = FALSE;
      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.application_count DESC), '[]'::jsonb) INTO v_records
      FROM (
        SELECT jp.id, jp.title, jp.status, hp.hospital_name,
          COUNT(a.id) FILTER (WHERE a.is_seed_data = FALSE)::int AS application_count
        FROM public.job_posts jp
        JOIN public.hospital_profiles hp ON hp.id = jp.hospital_id
        LEFT JOIN public.applications a ON a.job_id = jp.id AND a.is_seed_data = FALSE
        WHERE jp.is_seed_data = FALSE
        GROUP BY jp.id, jp.title, jp.status, hp.hospital_name
        ORDER BY COUNT(a.id) FILTER (WHERE a.is_seed_data = FALSE) DESC LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'geography_top_city' THEN
      SELECT COUNT(DISTINCT COALESCE(NULLIF(trim(hp.city), ''), 'Unknown'))::int INTO v_total
      FROM job_posts jp JOIN hospital_profiles hp ON hp.id = jp.hospital_id
      WHERE jp.is_seed_data = FALSE AND hp.is_seed_data = FALSE;
      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.jobs DESC), '[]'::jsonb) INTO v_records
      FROM (
        SELECT COALESCE(NULLIF(trim(hp.city), ''), 'Unknown') AS city,
          COUNT(DISTINCT jp.id)::int AS jobs,
          COUNT(DISTINCT a.id)::int AS applications
        FROM job_posts jp
        JOIN hospital_profiles hp ON hp.id = jp.hospital_id
        LEFT JOIN applications a ON a.job_id = jp.id AND a.is_seed_data = FALSE
        WHERE jp.is_seed_data = FALSE AND hp.is_seed_data = FALSE
        GROUP BY 1 ORDER BY 2 DESC LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'specialty_top_category' THEN
      SELECT COUNT(DISTINCT founder_specialty_bucket(department, required_specialization))::int INTO v_total
      FROM job_posts WHERE is_seed_data = FALSE;
      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.jobs DESC), '[]'::jsonb) INTO v_records
      FROM (
        SELECT founder_specialty_bucket(department, required_specialization) AS category,
          COUNT(DISTINCT id)::int AS jobs,
          COUNT(DISTINCT a.id)::int AS applications
        FROM job_posts jp
        LEFT JOIN applications a ON a.job_id = jp.id AND a.is_seed_data = FALSE
        WHERE jp.is_seed_data = FALSE
        GROUP BY 1 ORDER BY 2 DESC LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'funnel_job_viewed_7d', 'funnel_application_submitted_7d' THEN
      SELECT COUNT(DISTINCT public._analytics_session_key(session_id, id))::int INTO v_total
      FROM product_events
      WHERE event_name = CASE p_metric_key WHEN 'funnel_job_viewed_7d' THEN 'job_viewed' ELSE 'application_submitted' END
        AND created_at >= v_week_start;
      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC), '[]'::jsonb) INTO v_records
      FROM (
        SELECT id, event_name, session_id, user_id, created_at, properties
        FROM product_events
        WHERE event_name = CASE p_metric_key WHEN 'funnel_job_viewed_7d' THEN 'job_viewed' ELSE 'application_submitted' END
          AND created_at >= v_week_start
        ORDER BY created_at DESC LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'recovery_queue_count' THEN
      SELECT jsonb_array_length(COALESCE((public.admin_get_founder_recovery(7, 'all', 500)->'users')::jsonb, '[]'::jsonb))::int INTO v_total;
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_records
      FROM (
        SELECT elem FROM jsonb_array_elements(
          COALESCE((public.admin_get_founder_recovery(7, 'all', 500)->'users')::jsonb, '[]'::jsonb)
        ) WITH ORDINALITY AS t(elem, ord)
        WHERE ord > v_offset AND ord <= v_offset + v_limit
      ) sub;

    WHEN 'acquisition_applications_7d' THEN
      SELECT COALESCE(SUM(applications), 0)::int INTO v_total
      FROM jsonb_to_recordset(COALESCE((public.admin_get_acquisition_breakdown(7)->'sources')::jsonb, '[]'::jsonb))
        AS x(source text, visitors int, job_views int, apply_clicks int, applications int, conversion_pct numeric);
      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.applications DESC), '[]'::jsonb) INTO v_records
      FROM (
        SELECT * FROM jsonb_to_recordset(COALESCE((public.admin_get_acquisition_breakdown(7)->'sources')::jsonb, '[]'::jsonb))
          AS x(source text, visitors int, job_views int, apply_clicks int, applications int, conversion_pct numeric)
        ORDER BY applications DESC LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'action_center_items' THEN
      SELECT jsonb_array_length(COALESCE((public.admin_get_founder_actions(24)->'actions')::jsonb, '[]'::jsonb))::int INTO v_total;
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_records
      FROM (
        SELECT elem FROM jsonb_array_elements(
          COALESCE((public.admin_get_founder_actions(24)->'actions')::jsonb, '[]'::jsonb)
        ) WITH ORDINALITY AS t(elem, ord)
        WHERE ord > v_offset AND ord <= v_offset + v_limit
      ) sub;

    WHEN 'trust_verified_hospitals' THEN
      SELECT COUNT(*)::int INTO v_total FROM hospital_profiles WHERE is_seed_data = FALSE AND is_verified = TRUE;
      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.hospital_name), '[]'::jsonb) INTO v_records
      FROM (
        SELECT id, hospital_name, city, is_verified, created_at
        FROM hospital_profiles WHERE is_seed_data = FALSE AND is_verified = TRUE
        ORDER BY hospital_name LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'trust_verified_professionals' THEN
      SELECT COUNT(*)::int INTO v_total FROM professional_profiles WHERE is_seed_data = FALSE AND verification_status = 'verified';
      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.full_name), '[]'::jsonb) INTO v_records
      FROM (
        SELECT pp.id, pr.full_name, pp.verification_status, pp.created_at
        FROM professional_profiles pp
        LEFT JOIN profiles pr ON pr.id = pp.user_id
        WHERE pp.is_seed_data = FALSE AND pp.verification_status = 'verified'
        ORDER BY pr.full_name LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'marketplace_avg_hours_to_fill' THEN
      SELECT COUNT(*)::int INTO v_total FROM job_posts WHERE is_seed_data = FALSE AND status = 'filled' AND filled_at IS NOT NULL;
      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.hours_to_fill DESC), '[]'::jsonb) INTO v_records
      FROM (
        SELECT id, title, created_at, filled_at,
          ROUND(EXTRACT(EPOCH FROM (filled_at - created_at)) / 3600.0, 1) AS hours_to_fill
        FROM job_posts WHERE is_seed_data = FALSE AND status = 'filled' AND filled_at IS NOT NULL
        ORDER BY hours_to_fill DESC LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'no_show_rate' THEN
      v_total := 0;
      v_records := '[]'::jsonb;

    ELSE
      RAISE EXCEPTION 'Unknown metric key: %', p_metric_key;
  END CASE;

  RETURN jsonb_build_object(
    'metricKey', p_metric_key,
    'total', v_total,
    'limit', v_limit,
    'offset', v_offset,
    'calculatedAt', now(),
    'records', v_records
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_founder_metric_verification() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_founder_metric_records(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_founder_metric_verification() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_founder_metric_records(TEXT, INT, INT) TO service_role;

