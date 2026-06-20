-- Founder Analytics Verification Mode: auditable metrics with SQL + raw record drill-down.

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
  p_note TEXT DEFAULT NULL
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
    'note', p_note
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
  v_metrics JSONB := '[]'::jsonb;
BEGIN
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

  SELECT COUNT(*)::int
  INTO v_apps_7d
  FROM public.applications a
  JOIN public.job_posts jp ON jp.id = a.job_id
  WHERE a.is_seed_data = FALSE
    AND jp.is_seed_data = FALSE
    AND a.created_at >= v_week_start;

  SELECT COUNT(*)::int
  INTO v_total_apps
  FROM public.applications a
  JOIN public.job_posts jp ON jp.id = a.job_id
  WHERE a.is_seed_data = FALSE
    AND jp.is_seed_data = FALSE;

  SELECT COUNT(*)::int
  INTO v_total_job_posts
  FROM public.job_posts
  WHERE is_seed_data = FALSE;

  v_apps_per_job := CASE
    WHEN v_total_job_posts = 0 THEN NULL
    ELSE ROUND(v_total_apps::numeric / v_total_job_posts, 2)
  END;

  WITH hospital_jobs AS (
    SELECT
      hospital_id,
      MIN(created_at) AS first_post,
      COUNT(*) FILTER (WHERE created_at >= v_month_start) AS jobs_this_month
    FROM public.job_posts
    WHERE is_seed_data = FALSE
    GROUP BY hospital_id
  )
  SELECT COUNT(*)::int
  INTO v_repeat_hospitals
  FROM hospital_jobs
  WHERE jobs_this_month > 0
    AND first_post < v_month_start;

  v_metrics := v_metrics || public._verification_metric(
    'open_jobs',
    'Open Jobs',
    v_open_jobs::text,
    v_open_jobs,
    v_open_jobs,
    ARRAY['job_posts'],
    ARRAY[]::TEXT[],
    $sql$SELECT COUNT(*)::int
FROM public.job_posts
WHERE is_seed_data = FALSE
  AND status = 'open'$sql$,
    v_generated_at
  );

  v_metrics := v_metrics || public._verification_metric(
    'applications_7d',
    'Applications (7d)',
    v_apps_7d::text,
    v_apps_7d,
    v_apps_7d,
    ARRAY['applications', 'job_posts'],
    ARRAY['application_submitted'],
    $sql$SELECT COUNT(*)::int
FROM public.applications a
JOIN public.job_posts jp ON jp.id = a.job_id
WHERE a.is_seed_data = FALSE
  AND jp.is_seed_data = FALSE
  AND a.created_at >= now() - interval '7 days'$sql$,
    v_generated_at
  );

  v_metrics := v_metrics || public._verification_metric(
    'fill_rate',
    'Fill Rate',
    COALESCE(v_fill_rate::text || '%', '—'),
    v_fill_rate,
    v_total_jobs,
    ARRAY['job_posts'],
    ARRAY[]::TEXT[],
    $sql$SELECT
  ROUND(
    COUNT(*) FILTER (WHERE status = 'filled')::numeric
    / NULLIF(COUNT(*), 0) * 100,
    1
  ) AS fill_rate_pct,
  COUNT(*) FILTER (WHERE status = 'filled') AS filled_jobs,
  COUNT(*) AS total_jobs
FROM public.job_posts
WHERE is_seed_data = FALSE$sql$,
    v_generated_at
  );

  v_metrics := v_metrics || public._verification_metric(
    'no_show_rate',
    'No-Show Rate',
    '—',
    NULL,
    0,
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    $sql$-- Not tracked yet: requires shift attendance / check-in events
SELECT NULL::numeric AS no_show_rate_pct$sql$,
    v_generated_at,
    FALSE,
    'Shift attendance tracking not enabled yet'
  );

  v_metrics := v_metrics || public._verification_metric(
    'repeat_hospitals',
    'Repeat Hospitals',
    v_repeat_hospitals::text,
    v_repeat_hospitals,
    v_repeat_hospitals,
    ARRAY['job_posts', 'hospital_profiles'],
    ARRAY[]::TEXT[],
    $sql$WITH hospital_jobs AS (
  SELECT
    hospital_id,
    MIN(created_at) AS first_post,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AS jobs_this_month
  FROM public.job_posts
  WHERE is_seed_data = FALSE
  GROUP BY hospital_id
)
SELECT COUNT(*)::int
FROM hospital_jobs
WHERE jobs_this_month > 0
  AND first_post < date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'$sql$,
    v_generated_at
  );

  v_metrics := v_metrics || public._verification_metric(
    'applications_per_job',
    'Applications Per Job',
    COALESCE(v_apps_per_job::text, '—'),
    v_apps_per_job,
    v_total_job_posts,
    ARRAY['applications', 'job_posts'],
    ARRAY[]::TEXT[],
    $sql$SELECT
  ROUND(
    (
      SELECT COUNT(*)::numeric
      FROM public.applications a
      JOIN public.job_posts jp ON jp.id = a.job_id
      WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE
    )
    / NULLIF((SELECT COUNT(*)::numeric FROM public.job_posts WHERE is_seed_data = FALSE), 0),
    2
  ) AS applications_per_job$sql$,
    v_generated_at
  );

  RETURN jsonb_build_object(
    'generatedAt', v_generated_at,
    'metrics', v_metrics
  );
END;
$$;

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
      SELECT COUNT(*)::int INTO v_total
      FROM public.job_posts
      WHERE is_seed_data = FALSE AND status = 'open';

      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC), '[]'::jsonb)
      INTO v_records
      FROM (
        SELECT
          jp.id,
          jp.title,
          jp.status,
          jp.department,
          jp.shift_date,
          jp.created_at,
          hp.hospital_name,
          hp.city
        FROM public.job_posts jp
        JOIN public.hospital_profiles hp ON hp.id = jp.hospital_id
        WHERE jp.is_seed_data = FALSE
          AND jp.status = 'open'
        ORDER BY jp.created_at DESC
        LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'applications_7d' THEN
      SELECT COUNT(*)::int INTO v_total
      FROM public.applications a
      JOIN public.job_posts jp ON jp.id = a.job_id
      WHERE a.is_seed_data = FALSE
        AND jp.is_seed_data = FALSE
        AND a.created_at >= v_week_start;

      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC), '[]'::jsonb)
      INTO v_records
      FROM (
        SELECT
          a.id,
          a.status,
          a.created_at,
          jp.title AS job_title,
          jp.department,
          jp.is_seed_data AS job_is_seed,
          hp.hospital_name,
          pr.full_name AS professional_name
        FROM public.applications a
        JOIN public.job_posts jp ON jp.id = a.job_id
        JOIN public.hospital_profiles hp ON hp.id = jp.hospital_id
        LEFT JOIN public.professional_profiles pp ON pp.id = a.professional_id
        LEFT JOIN public.profiles pr ON pr.id = pp.user_id
        WHERE a.is_seed_data = FALSE
          AND jp.is_seed_data = FALSE
          AND a.created_at >= v_week_start
        ORDER BY a.created_at DESC
        LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'fill_rate' THEN
      SELECT COUNT(*)::int INTO v_total
      FROM public.job_posts
      WHERE is_seed_data = FALSE;

      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC), '[]'::jsonb)
      INTO v_records
      FROM (
        SELECT
          jp.id,
          jp.title,
          jp.status,
          jp.shift_date,
          jp.filled_at,
          jp.created_at,
          hp.hospital_name,
          hp.city
        FROM public.job_posts jp
        JOIN public.hospital_profiles hp ON hp.id = jp.hospital_id
        WHERE jp.is_seed_data = FALSE
        ORDER BY jp.created_at DESC
        LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'no_show_rate' THEN
      v_total := 0;
      v_records := '[]'::jsonb;

    WHEN 'repeat_hospitals' THEN
      WITH hospital_jobs AS (
        SELECT
          hospital_id,
          MIN(created_at) AS first_post,
          COUNT(*) AS total_jobs,
          COUNT(*) FILTER (WHERE created_at >= v_month_start) AS jobs_this_month
        FROM public.job_posts
        WHERE is_seed_data = FALSE
        GROUP BY hospital_id
      ),
      repeat_hospital_set AS (
        SELECT *
        FROM hospital_jobs
        WHERE jobs_this_month > 0
          AND first_post < v_month_start
      )
      SELECT COUNT(*)::int INTO v_total FROM repeat_hospital_set;

      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.jobs_this_month DESC), '[]'::jsonb)
      INTO v_records
      FROM (
        SELECT
          hp.id AS hospital_id,
          hp.hospital_name,
          hp.city,
          hj.first_post,
          hj.total_jobs,
          hj.jobs_this_month
        FROM (
          SELECT
            hospital_id,
            MIN(created_at) AS first_post,
            COUNT(*) AS total_jobs,
            COUNT(*) FILTER (WHERE created_at >= v_month_start) AS jobs_this_month
          FROM public.job_posts
          WHERE is_seed_data = FALSE
          GROUP BY hospital_id
        ) hj
        JOIN public.hospital_profiles hp ON hp.id = hj.hospital_id
        WHERE hj.jobs_this_month > 0
          AND hj.first_post < v_month_start
        ORDER BY hj.jobs_this_month DESC
        LIMIT v_limit OFFSET v_offset
      ) r;

    WHEN 'applications_per_job' THEN
      SELECT COUNT(*)::int INTO v_total
      FROM public.job_posts
      WHERE is_seed_data = FALSE;

      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.application_count DESC, r.created_at DESC), '[]'::jsonb)
      INTO v_records
      FROM (
        SELECT
          jp.id,
          jp.title,
          jp.status,
          jp.department,
          jp.created_at,
          hp.hospital_name,
          COUNT(a.id)::int AS application_count
        FROM public.job_posts jp
        JOIN public.hospital_profiles hp ON hp.id = jp.hospital_id
        LEFT JOIN public.applications a ON a.job_id = jp.id AND a.is_seed_data = FALSE
        WHERE jp.is_seed_data = FALSE
        GROUP BY jp.id, jp.title, jp.status, jp.department, jp.created_at, hp.hospital_name
        ORDER BY COUNT(a.id) DESC, jp.created_at DESC
        LIMIT v_limit OFFSET v_offset
      ) r;

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
