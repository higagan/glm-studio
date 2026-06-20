-- Phase 16: User recovery, anonymous stitching, founder outreach queue.

ALTER TABLE public.product_events
  ADD COLUMN IF NOT EXISTS anonymous_id TEXT;

CREATE INDEX IF NOT EXISTS idx_product_events_anonymous_created
  ON public.product_events (anonymous_id, created_at DESC)
  WHERE anonymous_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.user_anonymous_links (
  anonymous_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_anonymous_links_user
  ON public.user_anonymous_links (user_id);

ALTER TABLE public.user_anonymous_links ENABLE ROW LEVEL SECURITY;

-- ── Identity stitching ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.link_anonymous_to_user(p_anonymous_id TEXT, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_anonymous_id IS NULL OR TRIM(p_anonymous_id) = '' OR p_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_anonymous_links (anonymous_id, user_id)
  VALUES (TRIM(p_anonymous_id), p_user_id)
  ON CONFLICT (anonymous_id) DO UPDATE SET user_id = EXCLUDED.user_id, linked_at = now();

  UPDATE public.product_events
  SET user_id = p_user_id
  WHERE anonymous_id = TRIM(p_anonymous_id)
    AND user_id IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.link_anonymous_to_user(TEXT, UUID) FROM PUBLIC;

-- ── Recovery drop-off stage (founder-facing labels) ───────────────────────────

CREATE OR REPLACE FUNCTION public._recovery_dropoff_stage(p_events TEXT[])
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_events IS NULL OR array_length(p_events, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  IF 'application_submitted' = ANY (p_events) OR 'job_published' = ANY (p_events) THEN
    RETURN NULL;
  END IF;

  IF 'job_created' = ANY (p_events) AND NOT ('job_published' = ANY (p_events)) THEN
    RETURN 'Job Creation';
  END IF;

  IF 'hospital_signup_started' = ANY (p_events)
     AND NOT ('hospital_signup_completed' = ANY (p_events)) THEN
    RETURN 'Hospital Signup';
  END IF;

  IF 'hospital_signup_completed' = ANY (p_events)
     AND NOT ('job_created' = ANY (p_events)) THEN
    RETURN 'Job Creation';
  END IF;

  IF ('profile_completed' = ANY (p_events)
      OR 'application_started' = ANY (p_events)
      OR 'application_dialog_opened' = ANY (p_events))
     AND NOT ('application_submitted' = ANY (p_events)) THEN
    RETURN 'Application Submission';
  END IF;

  IF ('auth_completed' = ANY (p_events) OR 'profile_started' = ANY (p_events))
     AND NOT ('profile_completed' = ANY (p_events)) THEN
    RETURN 'Profile Completion';
  END IF;

  IF 'auth_started' = ANY (p_events) AND NOT ('auth_completed' = ANY (p_events)) THEN
    RETURN 'OTP';
  END IF;

  IF 'apply_clicked' = ANY (p_events) THEN
    RETURN 'Apply Click';
  END IF;

  IF 'job_viewed' = ANY (p_events) THEN
    RETURN 'Job View';
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public._recovery_segment_key(p_stage TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_stage
    WHEN 'Job View' THEN 'job_view'
    WHEN 'Apply Click' THEN 'apply_click'
    WHEN 'OTP' THEN 'otp'
    WHEN 'Profile Completion' THEN 'profile'
    WHEN 'Application Submission' THEN 'application'
    WHEN 'Hospital Signup' THEN 'hospital_signup'
    WHEN 'Job Creation' THEN 'job_creation'
    ELSE 'all'
  END;
$$;

CREATE OR REPLACE FUNCTION public._recovery_high_intent(
  p_events TEXT[],
  p_last_activity TIMESTAMPTZ,
  p_top_job_views INT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_last_activity >= now() - interval '72 hours'
    AND 'apply_clicked' = ANY (p_events)
    AND 'auth_completed' = ANY (p_events)
    AND 'profile_started' = ANY (p_events)
    AND NOT ('application_submitted' = ANY (p_events))
    AND COALESCE(p_top_job_views, 0) >= 2;
$$;

CREATE OR REPLACE FUNCTION public._mask_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_phone IS NULL OR LENGTH(TRIM(p_phone)) < 6 THEN NULL
    WHEN TRIM(p_phone) LIKE '+%' THEN
      LEFT(TRIM(p_phone), 5) || 'XXXXXXX' || RIGHT(TRIM(p_phone), 3)
    ELSE
      LEFT(TRIM(p_phone), 4) || 'XXXXXXX' || RIGHT(TRIM(p_phone), 3)
  END;
$$;

CREATE OR REPLACE FUNCTION public._event_job_ref(p_job_id TEXT, p_properties JSONB)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(p_job_id), ''),
    NULLIF(TRIM(p_properties->>'jobSlug'), ''),
    NULLIF(TRIM(p_properties->>'jobId'), '')
  );
$$;

-- ── Founder recovery queue ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_founder_recovery(
  p_days INT DEFAULT 7,
  p_segment TEXT DEFAULT 'all',
  p_limit INT DEFAULT 100
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH bounds AS (
    SELECT now() - (p_days || ' days')::interval AS since
  ),
  session_events AS (
    SELECT
      public._analytics_session_key(e.session_id, e.id) AS session_key,
      (array_agg(e.user_id ORDER BY e.created_at DESC) FILTER (WHERE e.user_id IS NOT NULL))[1] AS user_id,
      (array_agg(e.anonymous_id ORDER BY e.created_at DESC) FILTER (WHERE e.anonymous_id IS NOT NULL AND e.anonymous_id <> ''))[1] AS anonymous_id,
      MAX(e.created_at) AS last_activity,
      (array_agg(e.source ORDER BY e.created_at DESC) FILTER (WHERE e.source IS NOT NULL AND e.source <> ''))[1] AS source,
      array_agg(DISTINCT e.event_name) AS event_names
    FROM public.product_events e
    CROSS JOIN bounds b
    WHERE e.created_at >= b.since
      AND e.session_id IS NOT NULL
    GROUP BY public._analytics_session_key(e.session_id, e.id)
  ),
  job_view_counts AS (
    SELECT
      public._analytics_session_key(e.session_id, e.id) AS session_key,
      public._event_job_ref(e.job_id, e.properties) AS job_id,
      COUNT(*)::int AS view_count
    FROM public.product_events e
    CROSS JOIN bounds b
    WHERE e.created_at >= b.since
      AND e.event_name = 'job_viewed'
      AND public._event_job_ref(e.job_id, e.properties) IS NOT NULL
      AND e.session_id IS NOT NULL
    GROUP BY public._analytics_session_key(e.session_id, e.id), public._event_job_ref(e.job_id, e.properties)
  ),
  top_job_per_session AS (
    SELECT DISTINCT ON (session_key)
      session_key,
      job_id AS top_job_id,
      view_count AS top_job_views
    FROM job_view_counts
    ORDER BY session_key, view_count DESC, job_id
  ),
  enriched AS (
    SELECT
      s.*,
      t.top_job_id,
      COALESCE(t.top_job_views, 0) AS top_job_views,
      COALESCE(s.user_id, l.user_id) AS resolved_user_id,
      public._recovery_dropoff_stage(s.event_names) AS dropoff_stage
    FROM session_events s
    LEFT JOIN top_job_per_session t ON t.session_key = s.session_key
    LEFT JOIN public.user_anonymous_links l ON l.anonymous_id = s.anonymous_id
    WHERE public._recovery_dropoff_stage(s.event_names) IS NOT NULL
  ),
  with_contact AS (
    SELECT
      e.session_key,
      e.resolved_user_id AS user_id,
      e.anonymous_id,
      e.last_activity,
      public._analytics_norm_source(e.source) AS source,
      e.dropoff_stage,
      e.event_names,
      COALESCE(e.top_job_views, 0) AS top_job_views,
      e.top_job_id,
      p.full_name,
      ur.role AS user_role,
      COALESCE(NULLIF(TRIM(p.phone), ''), NULLIF(TRIM(au.phone), '')) AS phone_raw,
      COALESCE(NULLIF(TRIM(p.email), ''), NULLIF(TRIM(au.email), '')) AS email_raw,
      public._recovery_high_intent(e.event_names, e.last_activity, COALESCE(e.top_job_views, 0)) AS high_intent,
      (
        e.resolved_user_id IS NOT NULL
        AND (
          COALESCE(NULLIF(TRIM(p.phone), ''), NULLIF(TRIM(au.phone), '')) IS NOT NULL
          OR COALESCE(NULLIF(TRIM(p.email), ''), NULLIF(TRIM(au.email), '')) IS NOT NULL
          OR 'auth_completed' = ANY (e.event_names)
        )
      ) AS contactable,
      (
        e.dropoff_stage = 'Job View'
        AND NOT ('apply_clicked' = ANY (e.event_names))
      ) AS low_intent_browse_only
    FROM enriched e
    LEFT JOIN public.profiles p ON p.id = e.resolved_user_id
    LEFT JOIN auth.users au ON au.id = e.resolved_user_id
    LEFT JOIN public.user_roles ur ON ur.user_id = e.resolved_user_id
  ),
  filtered AS (
    SELECT *
    FROM with_contact
    WHERE contactable
      AND NOT low_intent_browse_only
      AND (
        p_segment = 'all'
        OR public._recovery_segment_key(dropoff_stage) = p_segment
      )
  ),
  user_rows AS (
    SELECT
      session_key AS session_id,
      user_id,
      anonymous_id,
      COALESCE(NULLIF(TRIM(full_name), ''), 'User ' || LEFT(COALESCE(user_id::text, session_key), 8)) AS name,
      user_role,
      public._mask_phone(phone_raw) AS phone_masked,
      phone_raw IS NOT NULL AS has_phone,
      email_raw AS email,
      email_raw IS NOT NULL AS has_email,
      source,
      dropoff_stage,
      last_activity,
      EXTRACT(EPOCH FROM (now() - last_activity))::bigint AS seconds_since_activity,
      high_intent,
      top_job_id AS primary_job_id,
      top_job_views::int AS primary_job_views
    FROM filtered
    ORDER BY high_intent DESC, last_activity DESC
    LIMIT GREATEST(1, LEAST(p_limit, 200))
  ),
  segment_rows AS (
    SELECT dropoff_stage AS seg, COUNT(*)::int AS cnt
    FROM with_contact
    WHERE contactable
      AND NOT low_intent_browse_only
    GROUP BY dropoff_stage
  )
  SELECT jsonb_build_object(
    'periodDays', p_days,
    'segment', p_segment,
    'segments', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'segment', seg,
            'key', public._recovery_segment_key(seg),
            'count', cnt
          )
          ORDER BY cnt DESC
        )
        FROM segment_rows
      ),
      '[]'::jsonb
    ),
    'highIntent', COALESCE(
      (
        SELECT jsonb_agg(row_to_json(h)::jsonb ORDER BY h.last_activity DESC)
        FROM user_rows h
        WHERE h.high_intent IS TRUE
      ),
      '[]'::jsonb
    ),
    'users', COALESCE(
      (SELECT jsonb_agg(row_to_json(u)::jsonb ORDER BY u.high_intent DESC, u.last_activity DESC) FROM user_rows u),
      '[]'::jsonb
    )
  );
$$;

-- ── Recovery detail (stitched timeline + context) ─────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_recovery_detail(
  p_session_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID := p_user_id;
  v_anonymous_id TEXT;
  v_session_id TEXT := NULLIF(TRIM(p_session_id), '');
  v_events JSONB;
  v_context JSONB;
  v_contact JSONB;
BEGIN
  IF v_user_id IS NULL AND v_session_id IS NOT NULL THEN
    SELECT (array_agg(user_id ORDER BY created_at DESC) FILTER (WHERE user_id IS NOT NULL))[1],
           (array_agg(anonymous_id ORDER BY created_at DESC) FILTER (WHERE anonymous_id IS NOT NULL AND anonymous_id <> ''))[1]
    INTO v_user_id, v_anonymous_id
    FROM public.product_events
    WHERE public._analytics_session_key(session_id, id) = v_session_id
       OR session_id = v_session_id
    LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL AND v_anonymous_id IS NULL THEN
    SELECT anonymous_id INTO v_anonymous_id
    FROM public.user_anonymous_links
    WHERE user_id = v_user_id
    ORDER BY linked_at DESC
    LIMIT 1;
  END IF;

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
  INTO v_events
  FROM public.product_events
  WHERE (v_session_id IS NOT NULL AND public._analytics_session_key(session_id, id) = v_session_id)
     OR (v_user_id IS NOT NULL AND user_id = v_user_id)
     OR (v_anonymous_id IS NOT NULL AND anonymous_id = v_anonymous_id);

  SELECT jsonb_build_object(
    'jobsViewed', (
      SELECT COALESCE(jsonb_agg(DISTINCT job_id), '[]'::jsonb)
      FROM public.product_events pe
      WHERE pe.event_name = 'job_viewed'
        AND pe.job_id IS NOT NULL
        AND (
          (v_session_id IS NOT NULL AND public._analytics_session_key(pe.session_id, pe.id) = v_session_id)
          OR (v_user_id IS NOT NULL AND pe.user_id = v_user_id)
          OR (v_anonymous_id IS NOT NULL AND pe.anonymous_id = v_anonymous_id)
        )
    ),
    'hospitalsViewed', (
      SELECT COALESCE(jsonb_agg(DISTINCT hospital_id), '[]'::jsonb)
      FROM public.product_events pe
      WHERE pe.event_name IN ('hospital_viewed', 'hospital_profile_viewed')
        AND pe.hospital_id IS NOT NULL
        AND (
          (v_session_id IS NOT NULL AND public._analytics_session_key(pe.session_id, pe.id) = v_session_id)
          OR (v_user_id IS NOT NULL AND pe.user_id = v_user_id)
          OR (v_anonymous_id IS NOT NULL AND pe.anonymous_id = v_anonymous_id)
        )
    ),
    'searchTerms', (
      SELECT COALESCE(jsonb_agg(DISTINCT pe.properties->>'term'), '[]'::jsonb)
      FROM public.product_events pe
      WHERE pe.event_name = 'search_performed'
        AND pe.properties->>'term' IS NOT NULL
        AND (
          (v_session_id IS NOT NULL AND public._analytics_session_key(pe.session_id, pe.id) = v_session_id)
          OR (v_user_id IS NOT NULL AND pe.user_id = v_user_id)
          OR (v_anonymous_id IS NOT NULL AND pe.anonymous_id = v_anonymous_id)
        )
    ),
    'filtersApplied', (
      SELECT COUNT(*)::int
      FROM public.product_events pe
      WHERE pe.event_name = 'filter_applied'
        AND (
          (v_session_id IS NOT NULL AND public._analytics_session_key(pe.session_id, pe.id) = v_session_id)
          OR (v_user_id IS NOT NULL AND pe.user_id = v_user_id)
          OR (v_anonymous_id IS NOT NULL AND pe.anonymous_id = v_anonymous_id)
        )
    ),
    'applicationSubmitted', (
      SELECT BOOL_OR(pe.event_name = 'application_submitted')
      FROM public.product_events pe
      WHERE (
          (v_session_id IS NOT NULL AND public._analytics_session_key(pe.session_id, pe.id) = v_session_id)
          OR (v_user_id IS NOT NULL AND pe.user_id = v_user_id)
          OR (v_anonymous_id IS NOT NULL AND pe.anonymous_id = v_anonymous_id)
        )
    ),
    'dropoffStage', (
      SELECT public._recovery_dropoff_stage(array_agg(DISTINCT pe.event_name))
      FROM public.product_events pe
      WHERE (
          (v_session_id IS NOT NULL AND public._analytics_session_key(pe.session_id, pe.id) = v_session_id)
          OR (v_user_id IS NOT NULL AND pe.user_id = v_user_id)
          OR (v_anonymous_id IS NOT NULL AND pe.anonymous_id = v_anonymous_id)
        )
    )
  )
  INTO v_context;

  SELECT jsonb_build_object(
    'name', COALESCE(NULLIF(TRIM(p.full_name), ''), 'Unknown'),
    'phone', COALESCE(NULLIF(TRIM(p.phone), ''), NULLIF(TRIM(au.phone), '')),
    'phoneMasked', public._mask_phone(COALESCE(NULLIF(TRIM(p.phone), ''), NULLIF(TRIM(au.phone), ''))),
    'email', COALESCE(NULLIF(TRIM(p.email), ''), NULLIF(TRIM(au.email), ''))
  )
  INTO v_contact
  FROM (SELECT v_user_id AS uid) x
  LEFT JOIN public.profiles p ON p.id = x.uid
  LEFT JOIN auth.users au ON au.id = x.uid;

  RETURN jsonb_build_object(
    'sessionId', v_session_id,
    'userId', v_user_id,
    'anonymousId', v_anonymous_id,
    'contact', v_contact,
    'context', v_context,
    'events', v_events
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_founder_recovery(INT, TEXT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_recovery_detail(TEXT, UUID) FROM PUBLIC;
