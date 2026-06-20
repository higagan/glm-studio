-- Public hospital profile v2: trust fields, follows, enriched reviews, profile RPC, leaderboards.

-- Expand hospital_type enum
DO $$ BEGIN ALTER TYPE public.hospital_type ADD VALUE 'multi_speciality_hospital';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.hospital_type ADD VALUE 'corporate_hospital';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.hospital_type ADD VALUE 'teaching_hospital';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.hospital_profiles
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS bed_count INTEGER,
  ADD COLUMN IF NOT EXISTS emergency_available BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS established_year INTEGER,
  ADD COLUMN IF NOT EXISTS gst_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS license_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS address_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS avg_payment_days NUMERIC,
  ADD COLUMN IF NOT EXISTS avg_response_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS follower_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.hospital_reviews
  ADD COLUMN IF NOT EXISTS would_work_again BOOLEAN,
  ADD COLUMN IF NOT EXISTS payment_rating SMALLINT CHECK (payment_rating IS NULL OR (payment_rating >= 1 AND payment_rating <= 5)),
  ADD COLUMN IF NOT EXISTS management_rating SMALLINT CHECK (management_rating IS NULL OR (management_rating >= 1 AND management_rating <= 5)),
  ADD COLUMN IF NOT EXISTS environment_rating SMALLINT CHECK (environment_rating IS NULL OR (environment_rating >= 1 AND environment_rating <= 5)),
  ADD COLUMN IF NOT EXISTS shift_organization_rating SMALLINT CHECK (shift_organization_rating IS NULL OR (shift_organization_rating >= 1 AND shift_organization_rating <= 5)),
  ADD COLUMN IF NOT EXISTS professional_role TEXT;

-- Backfill address verified where coordinates exist
UPDATE public.hospital_profiles
SET address_verified = TRUE
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND address_verified = FALSE;

CREATE TABLE IF NOT EXISTS public.hospital_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospital_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hospital_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hospital_follows_hospital ON public.hospital_follows(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_follows_user ON public.hospital_follows(user_id);

ALTER TABLE public.hospital_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own hospital follows" ON public.hospital_follows;
CREATE POLICY "Users manage own hospital follows"
  ON public.hospital_follows FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public._hospital_follower_count_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hospital_profiles SET follower_count = follower_count + 1 WHERE id = NEW.hospital_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hospital_profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.hospital_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS hospital_follows_count ON public.hospital_follows;
CREATE TRIGGER hospital_follows_count
  AFTER INSERT OR DELETE ON public.hospital_follows
  FOR EACH ROW EXECUTE FUNCTION public._hospital_follower_count_sync();

CREATE OR REPLACE FUNCTION public.get_hospital_public_profile(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hospital hospital_profiles%ROWTYPE;
  v_reviews JSONB;
  v_jobs JSONB;
  v_stats JSONB;
  v_trust JSONB;
  v_review_summary JSONB;
  v_hiring JSONB;
  v_following BOOLEAN := FALSE;
  v_open_jobs INT;
  v_completed_shifts INT;
  v_review_count INT;
  v_avg_rating NUMERIC;
  v_professionals_worked INT;
  v_repeat_rate NUMERIC;
  v_avg_fill NUMERIC;
  v_jobs_30d INT;
  v_hired_30d INT;
  v_top_specs JSONB;
BEGIN
  SELECT * INTO v_hospital FROM hospital_profiles hp
  WHERE hp.is_seed_data = FALSE
    AND (
      (p_slug ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND (hp.id::text = p_slug OR hp.slug = p_slug))
      OR hp.slug = p_slug
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM hospital_follows WHERE hospital_id = v_hospital.id AND user_id = auth.uid()
    ) INTO v_following;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO v_reviews
  FROM (
    SELECT id, rating, review_text, role_title, specialty, shift_completed_date, created_at,
      would_work_again, payment_rating, management_rating, environment_rating,
      shift_organization_rating, professional_role
    FROM hospital_reviews
    WHERE hospital_id = v_hospital.id AND is_seed_data = FALSE
    ORDER BY created_at DESC
    LIMIT 20
  ) r;

  SELECT COALESCE(jsonb_agg(row_to_json(j)::jsonb ORDER BY j.shift_date ASC), '[]'::jsonb)
  INTO v_jobs
  FROM (
    SELECT id, slug, title, department, description, shift_date, shift_start_time,
      shift_end_time, required_specialization, compensation, status, created_at
    FROM job_posts
    WHERE hospital_id = v_hospital.id AND status = 'open' AND is_seed_data = FALSE
    ORDER BY shift_date ASC
  ) j;

  v_open_jobs := jsonb_array_length(v_jobs);

  SELECT COUNT(*)::int INTO v_completed_shifts
  FROM job_posts WHERE hospital_id = v_hospital.id AND status IN ('filled', 'closed') AND is_seed_data = FALSE;

  SELECT COUNT(*)::int,
    ROUND(AVG(rating)::numeric, 1)
  INTO v_review_count, v_avg_rating
  FROM hospital_reviews WHERE hospital_id = v_hospital.id AND is_seed_data = FALSE;

  WITH apps AS (
    SELECT a.professional_id, a.status
    FROM applications a
    JOIN job_posts jp ON jp.id = a.job_id
    WHERE jp.hospital_id = v_hospital.id AND a.is_seed_data = FALSE AND jp.is_seed_data = FALSE
  ),
  accepted AS (
    SELECT professional_id, COUNT(*)::int AS cnt FROM apps WHERE status = 'accepted' GROUP BY professional_id
  )
  SELECT
    (SELECT COUNT(DISTINCT professional_id)::int FROM apps),
    CASE WHEN (SELECT COUNT(*) FROM accepted) = 0 THEN NULL
      ELSE ROUND((SELECT COUNT(*)::numeric FROM accepted WHERE cnt > 1) / NULLIF((SELECT COUNT(*) FROM accepted), 0) * 100, 0)
    END
  INTO v_professionals_worked, v_repeat_rate;

  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (filled_at - created_at)) / 3600.0)::numeric, 1)
  INTO v_avg_fill
  FROM job_posts
  WHERE hospital_id = v_hospital.id AND status = 'filled' AND filled_at IS NOT NULL AND is_seed_data = FALSE;

  v_stats := jsonb_build_object(
    'openJobs', v_open_jobs,
    'completedShifts', v_completed_shifts,
    'reviewCount', v_review_count,
    'averageRating', v_avg_rating,
    'professionalsWorkedWith', v_professionals_worked,
    'repeatProfessionalRate', v_repeat_rate,
    'averageFillTimeHours', v_avg_fill,
    'avgPaymentDays', v_hospital.avg_payment_days,
    'avgResponseHours', v_hospital.avg_response_hours,
    'noShowRatePct', NULL,
    'followerCount', v_hospital.follower_count
  );

  v_trust := jsonb_build_object(
    'isVerified', v_hospital.is_verified,
    'licenseVerified', v_hospital.license_verified,
    'gstVerified', v_hospital.gst_verified,
    'addressVerified', v_hospital.address_verified,
    'nabhAccredited', v_hospital.nabh_accredited
  );

  SELECT jsonb_build_object(
    'paymentAvg', ROUND(AVG(payment_rating)::numeric, 1),
    'managementAvg', ROUND(AVG(management_rating)::numeric, 1),
    'environmentAvg', ROUND(AVG(environment_rating)::numeric, 1),
    'shiftOrgAvg', ROUND(AVG(shift_organization_rating)::numeric, 1),
    'wouldWorkAgainPct', CASE
      WHEN COUNT(*) FILTER (WHERE would_work_again IS NOT NULL) = 0 THEN NULL
      ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE would_work_again = TRUE)
        / NULLIF(COUNT(*) FILTER (WHERE would_work_again IS NOT NULL), 0), 0)
    END
  ) INTO v_review_summary
  FROM hospital_reviews WHERE hospital_id = v_hospital.id AND is_seed_data = FALSE;

  SELECT COUNT(*)::int INTO v_jobs_30d
  FROM job_posts
  WHERE hospital_id = v_hospital.id AND is_seed_data = FALSE
    AND created_at >= now() - interval '30 days';

  SELECT COUNT(*)::int INTO v_hired_30d
  FROM applications a
  JOIN job_posts jp ON jp.id = a.job_id
  WHERE jp.hospital_id = v_hospital.id AND a.status = 'accepted'
    AND a.is_seed_data = FALSE AND jp.is_seed_data = FALSE
    AND a.created_at >= now() - interval '30 days';

  SELECT COALESCE(jsonb_agg(row_to_json(s)::jsonb), '[]'::jsonb) INTO v_top_specs
  FROM (
    SELECT required_specialization AS specialty, COUNT(*)::int AS hires
    FROM applications a
    JOIN job_posts jp ON jp.id = a.job_id
    WHERE jp.hospital_id = v_hospital.id AND a.status = 'accepted'
      AND a.is_seed_data = FALSE AND jp.is_seed_data = FALSE
    GROUP BY required_specialization
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ) s;

  v_hiring := jsonb_build_object(
    'jobsPosted30d', v_jobs_30d,
    'professionalsHired30d', v_hired_30d,
    'topSpecialties', v_top_specs
  );

  RETURN jsonb_build_object(
    'profile', to_jsonb(v_hospital),
    'stats', v_stats,
    'trust', v_trust,
    'reviews', v_reviews,
    'reviewSummary', v_review_summary,
    'hiringActivity', v_hiring,
    'openJobs', v_jobs,
    'isFollowing', v_following
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_hospital_leaderboards(p_days INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since TIMESTAMPTZ := now() - (GREATEST(1, LEAST(COALESCE(p_days, 30), 90)) || ' days')::interval;
  v_most_viewed JSONB;
  v_best_rated JSONB;
  v_most_converted JSONB;
  v_most_repeat JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.views DESC), '[]'::jsonb)
  INTO v_most_viewed
  FROM (
    SELECT
      COALESCE(pe.properties->>'hospitalSlug', pe.properties->>'hospital_slug', 'unknown') AS slug,
      COALESCE(pe.properties->>'hospitalName', pe.properties->>'hospital_name', slug) AS name,
      COUNT(DISTINCT public._analytics_session_key(pe.session_id, pe.id))::int AS views
    FROM product_events pe
    WHERE pe.event_name = 'hospital_profile_viewed' AND pe.created_at >= v_since
    GROUP BY 1, 2
    ORDER BY views DESC
    LIMIT 10
  ) x;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.rating DESC), '[]'::jsonb)
  INTO v_best_rated
  FROM (
    SELECT hp.slug, hp.hospital_name AS name,
      ROUND(AVG(hr.rating)::numeric, 1) AS rating,
      COUNT(hr.id)::int AS review_count
    FROM hospital_reviews hr
    JOIN hospital_profiles hp ON hp.id = hr.hospital_id
    WHERE hr.is_seed_data = FALSE AND hp.is_seed_data = FALSE
    GROUP BY hp.id, hp.slug, hp.hospital_name
    HAVING COUNT(hr.id) >= 1
    ORDER BY rating DESC, review_count DESC
    LIMIT 10
  ) x;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.conversion_pct DESC NULLS LAST), '[]'::jsonb)
  INTO v_most_converted
  FROM (
    SELECT
      v.slug,
      v.name,
      v.views,
      COALESCE(a.applies, 0) AS applies,
      CASE WHEN v.views = 0 THEN NULL
        ELSE ROUND(100.0 * COALESCE(a.applies, 0) / v.views, 1) END AS conversion_pct
    FROM (
      SELECT
        COALESCE(pe.properties->>'hospitalSlug', 'unknown') AS slug,
        COALESCE(pe.properties->>'hospitalName', slug) AS name,
        COUNT(DISTINCT public._analytics_session_key(pe.session_id, pe.id))::int AS views
      FROM product_events pe
      WHERE pe.event_name = 'hospital_profile_viewed' AND pe.created_at >= v_since
      GROUP BY 1, 2
    ) v
    LEFT JOIN (
      SELECT
        COALESCE(properties->>'hospitalSlug', 'unknown') AS slug,
        COUNT(*)::int AS applies
      FROM product_events
      WHERE event_name = 'hospital_apply_started' AND created_at >= v_since
      GROUP BY 1
    ) a ON a.slug = v.slug
    WHERE v.views > 0
    ORDER BY conversion_pct DESC NULLS LAST
    LIMIT 10
  ) x;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.repeat_rate DESC NULLS LAST), '[]'::jsonb)
  INTO v_most_repeat
  FROM (
    SELECT hp.slug, hp.hospital_name AS name,
      CASE WHEN COUNT(DISTINCT a.professional_id) = 0 THEN NULL
        ELSE ROUND(
          100.0 * COUNT(DISTINCT a.professional_id) FILTER (
            WHERE (SELECT COUNT(*) FROM applications a2
              JOIN job_posts jp2 ON jp2.id = a2.job_id
              WHERE jp2.hospital_id = hp.id AND a2.professional_id = a.professional_id
                AND a2.status = 'accepted' AND a2.is_seed_data = FALSE) > 1
          ) / NULLIF(COUNT(DISTINCT a.professional_id), 0), 0)
      END AS repeat_rate
    FROM hospital_profiles hp
    LEFT JOIN applications a ON a.status = 'accepted' AND a.is_seed_data = FALSE
      AND EXISTS (SELECT 1 FROM job_posts jp WHERE jp.id = a.job_id AND jp.hospital_id = hp.id)
    WHERE hp.is_seed_data = FALSE
    GROUP BY hp.id, hp.slug, hp.hospital_name
    HAVING COUNT(DISTINCT a.professional_id) > 0
    ORDER BY repeat_rate DESC NULLS LAST
    LIMIT 10
  ) x;

  RETURN jsonb_build_object(
    'periodDays', GREATEST(1, LEAST(COALESCE(p_days, 30), 90)),
    'mostViewed', v_most_viewed,
    'bestRated', v_best_rated,
    'highestConversion', v_most_converted,
    'highestRepeat', v_most_repeat
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_hospital_public_profile(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hospital_public_profile(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_get_hospital_leaderboards(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_hospital_leaderboards(INT) TO service_role;
