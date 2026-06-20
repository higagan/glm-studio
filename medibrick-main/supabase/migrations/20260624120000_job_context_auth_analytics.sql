-- Job-context auth analytics: verification metrics for apply → auth funnel

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
  v_auth_job_started_7d INT;
  v_auth_job_completed_7d INT;
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

  SELECT COUNT(DISTINCT public._analytics_session_key(session_id, id))::int INTO v_auth_job_started_7d
  FROM product_events WHERE event_name = 'auth_started_from_job' AND created_at >= v_week_start;

  SELECT COUNT(DISTINCT public._analytics_session_key(session_id, id))::int INTO v_auth_job_completed_7d
  FROM product_events WHERE event_name = 'auth_completed_from_job' AND created_at >= v_week_start;

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
    'funnel_auth_started_from_job_7d', 'Funnel: Auth Started (from job, 7d)',
    v_auth_job_started_7d::text, v_auth_job_started_7d, v_auth_job_started_7d,
    ARRAY['product_events'], ARRAY['auth_started_from_job'],
    $sql$SELECT COUNT(DISTINCT public._analytics_session_key(session_id, id))::int
FROM product_events WHERE event_name = 'auth_started_from_job' AND created_at >= now() - interval '7 days'$sql$,
    v_generated_at, TRUE, NULL, 'Funnels'
  );

  v_metrics := v_metrics || public._verification_metric(
    'funnel_auth_completed_from_job_7d', 'Funnel: Auth Completed (from job, 7d)',
    v_auth_job_completed_7d::text, v_auth_job_completed_7d, v_auth_job_completed_7d,
    ARRAY['product_events'], ARRAY['auth_completed_from_job'],
    $sql$SELECT COUNT(DISTINCT public._analytics_session_key(session_id, id))::int
FROM product_events WHERE event_name = 'auth_completed_from_job' AND created_at >= now() - interval '7 days'$sql$,
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
