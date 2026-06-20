-- Phase 17: Founder Action Center — daily actionable tasks for founders.

CREATE OR REPLACE FUNCTION public._founder_action_row(
  p_id TEXT,
  p_severity TEXT,
  p_category TEXT,
  p_title TEXT,
  p_impact TEXT,
  p_suggested_action TEXT,
  p_investigate_href TEXT,
  p_priority INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'id', p_id,
    'severity', p_severity,
    'category', p_category,
    'title', p_title,
    'impact', p_impact,
    'suggestedAction', p_suggested_action,
    'investigateHref', p_investigate_href,
    'priority', p_priority
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_get_founder_actions(
  p_hours INT DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_hours INT := GREATEST(1, LEAST(COALESCE(p_hours, 24), 168));
  v_since TIMESTAMPTZ := now() - (v_hours || ' hours')::interval;
  v_actions JSONB := '[]'::jsonb;
  v_cnt INT;
  v_name TEXT;
  v_session TEXT;
  v_user_id UUID;
  v_city TEXT;
  v_prev_rate NUMERIC;
  v_curr_rate NUMERIC;
  v_drop_pp NUMERIC;
  v_hospital TEXT;
  v_job_cnt INT;
  v_nurse_apps INT;
  v_doctor_apps INT;
  v_ratio NUMERIC;
  v_leak JSONB;
  v_steps JSONB;
  v_i INT;
  v_prev_step JSONB;
  v_step JSONB;
  v_from_count INT;
  v_to_count INT;
  v_lost INT;
  v_high_intent INT;
  v_lead_cat TEXT;
  v_lag_cat TEXT;
BEGIN
  -- 1) Profile completion drop-offs (contactable, apply funnel)
  SELECT COUNT(*)::int
  INTO v_cnt
  FROM (
    SELECT
      public._analytics_session_key(e.session_id, e.id) AS session_key,
      array_agg(DISTINCT e.event_name) AS event_names,
      (array_agg(e.user_id ORDER BY e.created_at DESC) FILTER (WHERE e.user_id IS NOT NULL))[1] AS user_id
    FROM public.product_events e
    WHERE e.created_at >= v_since
      AND e.session_id IS NOT NULL
    GROUP BY 1
  ) s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  LEFT JOIN auth.users au ON au.id = s.user_id
  WHERE public._recovery_dropoff_stage(s.event_names) = 'Profile Completion'
    AND 'apply_clicked' = ANY (s.event_names)
    AND s.user_id IS NOT NULL
    AND (
      COALESCE(NULLIF(TRIM(p.phone), ''), NULLIF(TRIM(au.phone), '')) IS NOT NULL
      OR COALESCE(NULLIF(TRIM(p.email), ''), NULLIF(TRIM(au.email), '')) IS NOT NULL
      OR 'auth_completed' = ANY (s.event_names)
    );

  IF v_cnt > 0 THEN
    v_actions := v_actions || public._founder_action_row(
      'profile_dropoff_' || v_hours || 'h',
      CASE WHEN v_cnt >= 5 THEN 'high' WHEN v_cnt >= 2 THEN 'medium' ELSE 'low' END,
      'funnel',
      v_cnt || ' user' || CASE WHEN v_cnt = 1 THEN '' ELSE 's' END
        || ' dropped at profile completion in the last ' || v_hours || ' hours',
      'Qualified professionals are stalling before they can apply — likely onboarding friction.',
      'Review profile flow',
      '/admin/analytics/recovery?segment=profile',
      CASE WHEN v_cnt >= 5 THEN 320 WHEN v_cnt >= 2 THEN 220 ELSE 120 END
    );
  END IF;

  -- 2) Named OTP → application abandoner (spotlight)
  SELECT
    COALESCE(NULLIF(TRIM(p.full_name), ''), 'A professional'),
    s.session_key,
    s.user_id
  INTO v_name, v_session, v_user_id
  FROM (
    SELECT
      public._analytics_session_key(e.session_id, e.id) AS session_key,
      array_agg(DISTINCT e.event_name) AS event_names,
      (array_agg(e.user_id ORDER BY e.created_at DESC) FILTER (WHERE e.user_id IS NOT NULL))[1] AS user_id,
      MAX(e.created_at) AS last_activity
    FROM public.product_events e
    WHERE e.created_at >= v_since
      AND e.session_id IS NOT NULL
    GROUP BY 1
  ) s
  JOIN public.profiles p ON p.id = s.user_id
  LEFT JOIN auth.users au ON au.id = s.user_id
  WHERE 'auth_completed' = ANY (s.event_names)
    AND 'apply_clicked' = ANY (s.event_names)
    AND NOT ('application_submitted' = ANY (s.event_names))
    AND (
      COALESCE(NULLIF(TRIM(p.phone), ''), NULLIF(TRIM(au.phone), '')) IS NOT NULL
      OR COALESCE(NULLIF(TRIM(p.email), ''), NULLIF(TRIM(au.email), '')) IS NOT NULL
    )
  ORDER BY s.last_activity DESC
  LIMIT 1;

  IF v_name IS NOT NULL THEN
    v_actions := v_actions || public._founder_action_row(
      'otp_abandon_' || COALESCE(v_session, 'latest'),
      'high',
      'recovery',
      v_name || ' completed OTP but abandoned application',
      'High-intent professional with verified contact — direct outreach can recover the hire.',
      'Contact via WhatsApp',
      CASE
        WHEN v_user_id IS NOT NULL THEN '/admin/analytics/recovery?userId=' || v_user_id::text
        ELSE '/admin/analytics/recovery?segment=otp'
      END,
      310
    );
  END IF;

  -- 3) City fill-rate drop (7d vs prior 7d)
  SELECT
    city,
    prev_rate,
    curr_rate,
    prev_rate - curr_rate
  INTO v_city, v_prev_rate, v_curr_rate, v_drop_pp
  FROM (
    SELECT
      COALESCE(NULLIF(TRIM(hp.city), ''), 'Unknown') AS city,
      ROUND(
        COUNT(*) FILTER (WHERE jp.created_at >= now() - interval '7 days' AND jp.status = 'filled')::numeric
        / NULLIF(COUNT(*) FILTER (WHERE jp.created_at >= now() - interval '7 days'), 0) * 100,
        1
      ) AS curr_rate,
      ROUND(
        COUNT(*) FILTER (
          WHERE jp.created_at >= now() - interval '14 days'
            AND jp.created_at < now() - interval '7 days'
            AND jp.status = 'filled'
        )::numeric
        / NULLIF(
          COUNT(*) FILTER (
            WHERE jp.created_at >= now() - interval '14 days'
              AND jp.created_at < now() - interval '7 days'
          ),
          0
        ) * 100,
        1
      ) AS prev_rate
    FROM public.job_posts jp
    JOIN public.hospital_profiles hp ON hp.id = jp.hospital_id
    WHERE jp.is_seed_data = FALSE
      AND jp.created_at >= now() - interval '14 days'
      AND COALESCE(NULLIF(TRIM(hp.city), ''), '') <> ''
    GROUP BY 1
    HAVING COUNT(*) FILTER (WHERE jp.created_at >= now() - interval '7 days') >= 3
       AND COUNT(*) FILTER (
         WHERE jp.created_at >= now() - interval '14 days'
           AND jp.created_at < now() - interval '7 days'
       ) >= 3
  ) g
  WHERE prev_rate IS NOT NULL
    AND curr_rate IS NOT NULL
    AND prev_rate - curr_rate >= 10
  ORDER BY prev_rate - curr_rate DESC
  LIMIT 1;

  IF v_city IS NOT NULL THEN
    v_actions := v_actions || public._founder_action_row(
      'fill_rate_' || lower(replace(v_city, ' ', '_')),
      CASE WHEN v_drop_pp >= 20 THEN 'high' WHEN v_drop_pp >= 15 THEN 'medium' ELSE 'low' END,
      'marketplace',
      initcap(v_city) || ' fill rate dropped from ' || v_prev_rate || '% to ' || v_curr_rate || '%',
      'Local supply may not be matching open shifts — unfilled jobs risk hospital churn.',
      'Review supply availability',
      '/admin/analytics/marketplace#geography',
      CASE WHEN v_drop_pp >= 20 THEN 280 WHEN v_drop_pp >= 15 THEN 210 ELSE 150 END
    );
  END IF;

  -- 4) Specialty application imbalance (30d)
  SELECT
    MAX(apps) FILTER (WHERE category = 'nurses'),
    MAX(apps) FILTER (WHERE category = 'doctors')
  INTO v_nurse_apps, v_doctor_apps
  FROM (
    SELECT
      public.founder_specialty_bucket(jp.department, jp.required_specialization) AS category,
      COUNT(a.id)::int AS apps
    FROM public.applications a
    JOIN public.job_posts jp ON jp.id = a.job_id
    WHERE a.is_seed_data = FALSE
      AND jp.is_seed_data = FALSE
      AND a.created_at >= now() - interval '30 days'
      AND public.founder_specialty_bucket(jp.department, jp.required_specialization) IN ('nurses', 'doctors')
    GROUP BY 1
  ) s;

  IF COALESCE(v_nurse_apps, 0) > 0 AND COALESCE(v_doctor_apps, 0) > 0 THEN
    IF v_nurse_apps >= v_doctor_apps * 2 THEN
      v_ratio := ROUND(v_nurse_apps::numeric / v_doctor_apps, 1);
      v_lead_cat := 'Nurse';
      v_lag_cat := 'doctor';
    ELSIF v_doctor_apps >= v_nurse_apps * 2 THEN
      v_ratio := ROUND(v_doctor_apps::numeric / v_nurse_apps, 1);
      v_lead_cat := 'Doctor';
      v_lag_cat := 'nurse';
    END IF;

    IF v_ratio IS NOT NULL AND v_ratio >= 2 THEN
      v_actions := v_actions || public._founder_action_row(
        'specialty_imbalance',
        CASE WHEN v_ratio >= 3 THEN 'high' WHEN v_ratio >= 2.5 THEN 'medium' ELSE 'low' END,
        'marketplace',
        v_lead_cat || ' category has ' || v_ratio || 'x more applications than ' || v_lag_cat || ' category',
        'Acquisition and supply may be misaligned with hospital demand by specialty.',
        'Focus acquisition on ' || lower(v_lag_cat) || 's',
        '/admin/analytics/marketplace#specialty',
        CASE WHEN v_ratio >= 3 THEN 260 ELSE 180 END
      );
    END IF;
  END IF;

  -- 5) Hospital posted jobs but zero applications (14d)
  SELECT hp.hospital_name, COUNT(jp.id)::int
  INTO v_hospital, v_job_cnt
  FROM public.job_posts jp
  JOIN public.hospital_profiles hp ON hp.id = jp.hospital_id
  LEFT JOIN public.applications a ON a.job_id = jp.id AND a.is_seed_data = FALSE
  WHERE jp.is_seed_data = FALSE
    AND hp.is_seed_data = FALSE
    AND jp.created_at >= now() - interval '14 days'
    AND jp.status = 'open'
  GROUP BY hp.id, hp.hospital_name
  HAVING COUNT(a.id) = 0 AND COUNT(jp.id) >= 3
  ORDER BY COUNT(jp.id) DESC
  LIMIT 1;

  IF v_hospital IS NOT NULL THEN
    v_actions := v_actions || public._founder_action_row(
      'hospital_zero_apps',
      CASE WHEN v_job_cnt >= 8 THEN 'high' WHEN v_job_cnt >= 5 THEN 'medium' ELSE 'low' END,
      'marketplace',
      v_hospital || ' posted ' || v_job_cnt || ' jobs but received 0 applications',
      'Hospital may churn if listings do not attract professionals — listing quality or pricing issue.',
      'Review listing quality',
      '/admin/manage',
      CASE WHEN v_job_cnt >= 8 THEN 270 WHEN v_job_cnt >= 5 THEN 200 ELSE 140 END
    );
  END IF;

  -- 6) Biggest application funnel leak (7d, minimum volume)
  v_steps := public._analytics_funnel_steps(
    now() - interval '7 days',
    now(),
    '[
      ["job_viewed"],
      ["apply_clicked"],
      ["auth_started"],
      ["auth_completed"],
      ["profile_started"],
      ["profile_completed"],
      ["application_started", "application_dialog_opened"],
      ["application_submitted"]
    ]'::jsonb
  );
  v_leak := public._analytics_biggest_leak(v_steps);
  v_from_count := NULL;
  v_to_count := NULL;

  IF v_leak IS NOT NULL AND jsonb_array_length(v_steps) >= 2 THEN
    FOR v_i IN 1 .. jsonb_array_length(v_steps) - 1 LOOP
      v_prev_step := v_steps -> (v_i - 1);
      v_step := v_steps -> v_i;
      IF (v_prev_step ->> 'label') = (v_leak ->> 'from')
         AND (v_step ->> 'label') = (v_leak ->> 'to') THEN
        v_from_count := (v_prev_step ->> 'count')::int;
        v_to_count := (v_step ->> 'count')::int;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  v_lost := GREATEST(COALESCE(v_from_count, 0) - COALESCE(v_to_count, 0), 0);

  IF v_leak IS NOT NULL
     AND (v_leak ->> 'dropOffPct')::numeric >= 35
     AND COALESCE(v_from_count, 0) >= 5
     AND v_lost >= 2
  THEN
    v_actions := v_actions || public._founder_action_row(
      'funnel_leak_7d',
      CASE WHEN (v_leak ->> 'dropOffPct')::numeric >= 55 THEN 'high' ELSE 'medium' END,
      'funnel',
      v_lost || ' user' || CASE WHEN v_lost = 1 THEN '' ELSE 's' END
        || ' dropped between ' || (v_leak ->> 'from') || ' and ' || (v_leak ->> 'to')
        || ' (' || (v_leak ->> 'dropOffPct') || '% of ' || v_from_count || ')',
      'This step loses the most applicants over the last 7 days.',
      'Investigate drop-off at this step',
      '/admin/analytics/funnels',
      CASE WHEN (v_leak ->> 'dropOffPct')::numeric >= 55 THEN 300 ELSE 190 END
    );
  END IF;

  -- 7) High-intent recovery queue
  SELECT jsonb_array_length(COALESCE(payload -> 'highIntent', '[]'::jsonb))::int
  INTO v_high_intent
  FROM (
    SELECT public.admin_get_founder_recovery(
      GREATEST(1, CEIL(v_hours / 24.0)::int),
      'all',
      200
    ) AS payload
  ) q;

  IF COALESCE(v_high_intent, 0) > 0 THEN
    v_actions := v_actions || public._founder_action_row(
      'high_intent_recovery',
      CASE WHEN v_high_intent >= 3 THEN 'high' ELSE 'medium' END,
      'recovery',
      v_high_intent || ' high-intent user' || CASE WHEN v_high_intent = 1 THEN '' ELSE 's' END
        || ' ready for outreach',
      'Repeated job views + OTP completed — these users are closest to converting.',
      'Open recovery queue',
      '/admin/analytics/recovery',
      CASE WHEN v_high_intent >= 3 THEN 290 ELSE 170 END
    );
  END IF;

  RETURN jsonb_build_object(
    'generatedAt', now(),
    'periodHours', v_hours,
    'summary', jsonb_build_object(
      'high', (
        SELECT COUNT(*)::int
        FROM jsonb_array_elements(v_actions) a
        WHERE a ->> 'severity' = 'high'
      ),
      'medium', (
        SELECT COUNT(*)::int
        FROM jsonb_array_elements(v_actions) a
        WHERE a ->> 'severity' = 'medium'
      ),
      'low', (
        SELECT COUNT(*)::int
        FROM jsonb_array_elements(v_actions) a
        WHERE a ->> 'severity' = 'low'
      ),
      'total', jsonb_array_length(v_actions)
    ),
    'actions', COALESCE(
      (
        SELECT jsonb_agg(elem ORDER BY (elem ->> 'priority')::int DESC, elem ->> 'title')
        FROM jsonb_array_elements(v_actions) elem
      ),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_founder_actions(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_founder_actions(INT) TO service_role;
