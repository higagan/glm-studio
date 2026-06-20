-- Founder Analytics V2: enriched events + journey/funnel RPCs.

ALTER TABLE public.product_events
  ADD COLUMN IF NOT EXISTS page TEXT,
  ADD COLUMN IF NOT EXISTS job_id TEXT,
  ADD COLUMN IF NOT EXISTS hospital_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT;

CREATE INDEX IF NOT EXISTS idx_product_events_session_created
  ON public.product_events (session_id, created_at)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_events_user_created
  ON public.product_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_events_source_created
  ON public.product_events (source, created_at DESC)
  WHERE source IS NOT NULL;

-- ── Helpers ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._analytics_session_key(p_session_id TEXT, p_id UUID)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(NULLIF(TRIM(p_session_id), ''), p_id::text);
$$;

CREATE OR REPLACE FUNCTION public._analytics_norm_source(p_source TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_source IS NULL OR TRIM(p_source) = '' THEN 'direct'
    WHEN LOWER(p_source) IN ('google', 'gclid', 'google_ads') THEN 'google'
    WHEN LOWER(p_source) IN ('whatsapp', 'wa', 'whats_app') THEN 'whatsapp'
    WHEN LOWER(p_source) IN ('linkedin', 'li') THEN 'linkedin'
    WHEN LOWER(p_source) IN ('referral', 'ref', 'invite') THEN 'referral'
    ELSE LOWER(TRIM(p_source))
  END;
$$;

CREATE OR REPLACE FUNCTION public._analytics_funnel_steps(
  p_since TIMESTAMPTZ,
  p_until TIMESTAMPTZ,
  p_event_groups JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counts JSONB := '{}'::jsonb;
  v_group JSONB;
  v_events TEXT[];
  v_key TEXT;
  v_cnt BIGINT;
  v_first BIGINT := 0;
  v_prev BIGINT := 0;
  v_steps JSONB := '[]'::jsonb;
  v_conv NUMERIC;
  v_drop NUMERIC;
  v_step JSONB;
  v_label TEXT;
  v_i INT;
BEGIN
  IF p_event_groups IS NULL OR jsonb_typeof(p_event_groups) <> 'array' THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR v_i IN 0 .. jsonb_array_length(p_event_groups) - 1 LOOP
    v_group := p_event_groups -> v_i;
    SELECT COALESCE(array_agg(elem ORDER BY ord), ARRAY[]::TEXT[])
    INTO v_events
    FROM jsonb_array_elements_text(v_group) WITH ORDINALITY AS t(elem, ord);

    IF array_length(v_events, 1) IS NULL THEN
      CONTINUE;
    END IF;

    v_key := v_events[1];
    SELECT COUNT(DISTINCT public._analytics_session_key(session_id, id))
    INTO v_cnt
    FROM public.product_events
    WHERE created_at >= p_since
      AND created_at < p_until
      AND event_name = ANY (v_events);

    v_counts := v_counts || jsonb_build_object(v_key, v_cnt);
  END LOOP;

  FOR v_i IN 0 .. jsonb_array_length(p_event_groups) - 1 LOOP
    v_group := p_event_groups -> v_i;
    SELECT COALESCE(array_agg(elem ORDER BY ord), ARRAY[]::TEXT[])
    INTO v_events
    FROM jsonb_array_elements_text(v_group) WITH ORDINALITY AS t(elem, ord);

    IF array_length(v_events, 1) IS NULL THEN
      CONTINUE;
    END IF;

    v_key := v_events[1];
    v_label := initcap(replace(v_key, '_', ' '));
    v_cnt := COALESCE((v_counts ->> v_key)::bigint, 0);
    IF v_first = 0 AND v_cnt > 0 THEN
      v_first := v_cnt;
    END IF;

    v_conv := CASE WHEN v_first > 0 THEN ROUND(100.0 * v_cnt / v_first, 1) ELSE 0 END;
    v_drop := CASE WHEN v_prev > 0 THEN ROUND(100.0 * (v_prev - v_cnt) / v_prev, 1) ELSE NULL END;

    v_step := jsonb_build_object(
      'event', v_key,
      'label', v_label,
      'count', v_cnt,
      'conversionPct', v_conv,
      'dropOffPct', v_drop
    );
    v_steps := v_steps || jsonb_build_array(v_step);
    v_prev := v_cnt;
  END LOOP;

  RETURN v_steps;
END;
$$;

CREATE OR REPLACE FUNCTION public._analytics_biggest_leak(p_steps JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_i INT;
  v_from TEXT;
  v_to TEXT;
  v_drop NUMERIC;
  v_max NUMERIC := -1;
  v_result JSONB := NULL;
  v_step JSONB;
  v_prev_step JSONB;
BEGIN
  IF jsonb_array_length(p_steps) < 2 THEN
    RETURN NULL;
  END IF;

  FOR v_i IN 1 .. jsonb_array_length(p_steps) - 1 LOOP
    v_prev_step := p_steps -> (v_i - 1);
    v_step := p_steps -> v_i;
    v_drop := (v_prev_step ->> 'dropOffPct')::numeric;
    IF v_drop IS NOT NULL AND v_drop > v_max THEN
      v_max := v_drop;
      v_from := v_prev_step ->> 'label';
      v_to := v_step ->> 'label';
      v_result := jsonb_build_object(
        'from', v_from,
        'to', v_to,
        'dropOffPct', v_drop
      );
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public._analytics_period_delta(p_current NUMERIC, p_previous NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_previous IS NULL OR p_previous = 0 THEN NULL
    ELSE ROUND(100.0 * (p_current - p_previous) / p_previous, 1)
  END;
$$;

-- ── Application funnel ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_application_funnel(p_days INT DEFAULT 7)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_groups JSONB := '[
    ["job_viewed"],
    ["apply_clicked"],
    ["auth_started"],
    ["auth_completed"],
    ["profile_started"],
    ["profile_completed"],
    ["application_started", "application_dialog_opened"],
    ["application_submitted"]
  ]'::jsonb;
  v_since TIMESTAMPTZ := now() - (p_days || ' days')::interval;
  v_prev_since TIMESTAMPTZ := now() - (2 * p_days || ' days')::interval;
  v_prev_until TIMESTAMPTZ := v_since;
  v_current JSONB;
  v_previous JSONB;
  v_merged JSONB := '[]'::jsonb;
  v_i INT;
  v_cur JSONB;
  v_prev JSONB;
  v_step JSONB;
BEGIN
  v_current := public._analytics_funnel_steps(v_since, now(), v_groups);
  v_previous := public._analytics_funnel_steps(v_prev_since, v_prev_until, v_groups);

  FOR v_i IN 0 .. jsonb_array_length(v_current) - 1 LOOP
    v_cur := v_current -> v_i;
    v_prev := v_previous -> v_i;
    v_step := v_cur || jsonb_build_object(
      'changeVsPreviousPct',
      public._analytics_period_delta(
        (v_cur ->> 'count')::numeric,
        (v_prev ->> 'count')::numeric
      )
    );
    v_merged := v_merged || jsonb_build_array(v_step);
  END LOOP;

  RETURN jsonb_build_object(
    'periodDays', p_days,
    'steps', v_merged,
    'biggestLeak', public._analytics_biggest_leak(v_merged)
  );
END;
$$;

-- ── Hospital funnel ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_hospital_funnel(p_days INT DEFAULT 7)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_groups JSONB := '[
    ["hospital_signup_started"],
    ["hospital_signup_completed"],
    ["job_created"],
    ["job_published"]
  ]'::jsonb;
  v_since TIMESTAMPTZ := now() - (p_days || ' days')::interval;
  v_prev_since TIMESTAMPTZ := now() - (2 * p_days || ' days')::interval;
  v_steps JSONB;
  v_prev JSONB;
  v_merged JSONB := '[]'::jsonb;
  v_i INT;
  v_cur JSONB;
  v_prev_step JSONB;
  v_step JSONB;
BEGIN
  v_steps := public._analytics_funnel_steps(v_since, now(), v_groups);
  v_prev := public._analytics_funnel_steps(v_prev_since, v_since, v_groups);

  FOR v_i IN 0 .. jsonb_array_length(v_steps) - 1 LOOP
    v_cur := v_steps -> v_i;
    v_prev_step := v_prev -> v_i;
    v_step := v_cur || jsonb_build_object(
      'changeVsPreviousPct',
      public._analytics_period_delta(
        (v_cur ->> 'count')::numeric,
        (v_prev_step ->> 'count')::numeric
      )
    );
    v_merged := v_merged || jsonb_build_array(v_step);
  END LOOP;

  RETURN jsonb_build_object(
    'periodDays', p_days,
    'steps', v_merged,
    'biggestLeak', public._analytics_biggest_leak(v_merged)
  );
END;
$$;

-- ── Drop-off analysis ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._analytics_session_dropoff_stage(p_events TEXT[])
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF 'application_submitted' = ANY (p_events) THEN
    RETURN NULL;
  END IF;

  -- Deepest funnel progress without submit (mutually exclusive buckets)
  IF 'profile_completed' = ANY (p_events)
     OR 'application_started' = ANY (p_events)
     OR 'application_dialog_opened' = ANY (p_events) THEN
    RETURN 'Application Submit';
  END IF;

  IF 'auth_completed' = ANY (p_events) OR 'profile_started' = ANY (p_events) THEN
    RETURN 'Profile Completion';
  END IF;

  IF 'auth_started' = ANY (p_events) OR 'apply_clicked' = ANY (p_events) THEN
    RETURN 'OTP / Auth Verification';
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public._analytics_dropoff_counts(p_since TIMESTAMPTZ, p_until TIMESTAMPTZ)
RETURNS TABLE(stage TEXT, cnt BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sessions AS (
    SELECT
      public._analytics_session_key(session_id, id) AS sk,
      array_agg(DISTINCT event_name) AS event_names
    FROM public.product_events
    WHERE created_at >= p_since
      AND created_at < p_until
      AND session_id IS NOT NULL
    GROUP BY public._analytics_session_key(session_id, id)
  ),
  classified AS (
    SELECT public._analytics_session_dropoff_stage(event_names) AS stage
    FROM sessions
  )
  SELECT stage, COUNT(*)::bigint
  FROM classified
  WHERE stage IS NOT NULL
  GROUP BY stage;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_dropoff_analysis(p_days INT DEFAULT 7)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since TIMESTAMPTZ := now() - (p_days || ' days')::interval;
  v_prev_since TIMESTAMPTZ := now() - (2 * p_days || ' days')::interval;
  v_auth_drop BIGINT := 0;
  v_profile_drop BIGINT := 0;
  v_apply_drop BIGINT := 0;
  v_total BIGINT;
  v_prev_auth BIGINT := 0;
  v_prev_profile BIGINT := 0;
  v_prev_apply BIGINT := 0;
  v_rows JSONB := '[]'::jsonb;
  r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM public._analytics_dropoff_counts(v_since, now())
  LOOP
    IF r.stage = 'OTP / Auth Verification' THEN v_auth_drop := r.cnt; END IF;
    IF r.stage = 'Profile Completion' THEN v_profile_drop := r.cnt; END IF;
    IF r.stage = 'Application Submit' THEN v_apply_drop := r.cnt; END IF;
  END LOOP;

  v_total := v_auth_drop + v_profile_drop + v_apply_drop;

  FOR r IN
    SELECT * FROM public._analytics_dropoff_counts(v_prev_since, v_since)
  LOOP
    IF r.stage = 'OTP / Auth Verification' THEN v_prev_auth := r.cnt; END IF;
    IF r.stage = 'Profile Completion' THEN v_prev_profile := r.cnt; END IF;
    IF r.stage = 'Application Submit' THEN v_prev_apply := r.cnt; END IF;
  END LOOP;

  v_rows := v_rows || jsonb_build_array(jsonb_build_object(
    'stage', 'OTP / Auth Verification',
    'count', v_auth_drop,
    'pct', CASE WHEN v_total > 0 THEN ROUND(100.0 * v_auth_drop / v_total, 1) ELSE 0 END,
    'trendPct', public._analytics_period_delta(v_auth_drop, v_prev_auth)
  ));

  v_rows := v_rows || jsonb_build_array(jsonb_build_object(
    'stage', 'Profile Completion',
    'count', v_profile_drop,
    'pct', CASE WHEN v_total > 0 THEN ROUND(100.0 * v_profile_drop / v_total, 1) ELSE 0 END,
    'trendPct', public._analytics_period_delta(v_profile_drop, v_prev_profile)
  ));

  v_rows := v_rows || jsonb_build_array(jsonb_build_object(
    'stage', 'Application Submit',
    'count', v_apply_drop,
    'pct', CASE WHEN v_total > 0 THEN ROUND(100.0 * v_apply_drop / v_total, 1) ELSE 0 END,
    'trendPct', public._analytics_period_delta(v_apply_drop, v_prev_apply)
  ));

  RETURN jsonb_build_object('periodDays', p_days, 'stages', v_rows, 'totalDropoffs', v_total);
END;
$$;

-- ── Acquisition ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_acquisition_breakdown(p_days INT DEFAULT 7)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since TIMESTAMPTZ := now() - (p_days || ' days')::interval;
  v_rows JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.applications DESC, t.visitors DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      public._analytics_norm_source(src) AS source,
      COUNT(DISTINCT sk) FILTER (WHERE has_page OR has_any) AS visitors,
      COUNT(DISTINCT sk) FILTER (WHERE has_job_view) AS job_views,
      COUNT(DISTINCT sk) FILTER (WHERE has_apply) AS apply_clicks,
      COUNT(DISTINCT sk) FILTER (WHERE has_application) AS applications,
      CASE
        WHEN COUNT(DISTINCT sk) FILTER (WHERE has_page OR has_any) > 0
        THEN ROUND(
          100.0 * COUNT(DISTINCT sk) FILTER (WHERE has_application)
          / COUNT(DISTINCT sk) FILTER (WHERE has_page OR has_any),
          1
        )
        ELSE 0
      END AS conversion_pct
    FROM (
      SELECT
        public._analytics_session_key(session_id, id) AS sk,
        public._analytics_norm_source(COALESCE(source, properties->>'source', properties->>'via')) AS src,
        BOOL_OR(event_name = 'page_view') AS has_page,
        BOOL_OR(event_name = 'job_viewed') AS has_job_view,
        BOOL_OR(event_name = 'apply_clicked') AS has_apply,
        BOOL_OR(event_name = 'application_submitted') AS has_application,
        TRUE AS has_any
      FROM public.product_events
      WHERE created_at >= v_since
      GROUP BY public._analytics_session_key(session_id, id),
        public._analytics_norm_source(COALESCE(source, properties->>'source', properties->>'via'))
    ) s
    GROUP BY public._analytics_norm_source(src)
  ) t;

  RETURN jsonb_build_object('periodDays', p_days, 'sources', v_rows);
END;
$$;

-- ── Journey status inference ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._analytics_journey_status(p_events TEXT[])
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF 'application_submitted' = ANY (p_events) THEN
    RETURN 'Applied Successfully';
  ELSIF 'application_started' = ANY (p_events) OR 'application_dialog_opened' = ANY (p_events) THEN
    RETURN 'Dropped at Application';
  ELSIF 'profile_started' = ANY (p_events) AND NOT ('profile_completed' = ANY (p_events)) THEN
    RETURN 'Dropped at Profile';
  ELSIF 'auth_started' = ANY (p_events) AND NOT ('auth_completed' = ANY (p_events)) THEN
    RETURN 'Dropped at Auth';
  ELSIF 'apply_clicked' = ANY (p_events) THEN
    RETURN 'Dropped after Apply';
  ELSIF 'job_viewed' = ANY (p_events) THEN
    RETURN 'Viewed Only';
  ELSE
    RETURN 'Browsing';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_user_journeys(p_days INT DEFAULT 7, p_limit INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since TIMESTAMPTZ := now() - (p_days || ' days')::interval;
  v_rows JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.last_activity DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      j.session_id,
      j.user_id,
      CASE
        WHEN j.user_id IS NOT NULL THEN 'User ' || LEFT(j.user_id::text, 8)
        ELSE 'Session ' || LEFT(j.session_id, 8)
      END AS display_name,
      public._analytics_norm_source(j.source) AS source,
      j.last_activity,
      public._analytics_journey_status(j.event_names) AS journey_status,
      j.event_count
    FROM (
      SELECT
        public._analytics_session_key(session_id, id) AS session_id,
        (array_agg(user_id ORDER BY created_at DESC) FILTER (WHERE user_id IS NOT NULL))[1] AS user_id,
        MAX(created_at) AS last_activity,
        (array_agg(source ORDER BY created_at DESC) FILTER (WHERE source IS NOT NULL AND source <> ''))[1] AS source,
        array_agg(DISTINCT event_name) AS event_names,
        COUNT(*)::int AS event_count
      FROM public.product_events
      WHERE created_at >= v_since
        AND session_id IS NOT NULL
      GROUP BY public._analytics_session_key(session_id, id)
      ORDER BY MAX(created_at) DESC
      LIMIT GREATEST(1, LEAST(p_limit, 200))
    ) j
  ) t;

  RETURN jsonb_build_object('periodDays', p_days, 'journeys', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_session_timeline(p_session_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'event', event_name,
      'label', initcap(replace(event_name, '_', ' ')),
      'at', created_at,
      'page', page,
      'jobId', job_id,
      'hospitalId', hospital_id,
      'source', source,
      'properties', properties
    )
    ORDER BY created_at
  ), '[]'::jsonb)
  INTO v_rows
  FROM public.product_events
  WHERE public._analytics_session_key(session_id, id) = p_session_id
     OR session_id = p_session_id;

  RETURN jsonb_build_object('sessionId', p_session_id, 'events', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_application_funnel(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_hospital_funnel(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_dropoff_analysis(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_acquisition_breakdown(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_user_journeys(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_session_timeline(TEXT) FROM PUBLIC;
