-- Public marketplace snapshot for the Nearby discovery page.

CREATE OR REPLACE FUNCTION public.get_nearby_discovery()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open_shifts INT;
  v_hiring_hospitals INT;
  v_active_professionals INT;
  v_verified_hospitals INT;
  v_professionals_placed INT;
  v_avg_rating NUMERIC;
  v_hospitals JSONB;
  v_shifts JSONB;
BEGIN
  SELECT COUNT(*)::int INTO v_open_shifts
  FROM job_posts WHERE is_seed_data = FALSE AND status = 'open';

  SELECT COUNT(DISTINCT hospital_id)::int INTO v_hiring_hospitals
  FROM job_posts WHERE is_seed_data = FALSE AND status = 'open';

  SELECT COUNT(*)::int INTO v_active_professionals
  FROM professional_profiles WHERE is_seed_data = FALSE;

  SELECT COUNT(*)::int INTO v_verified_hospitals
  FROM hospital_profiles WHERE is_seed_data = FALSE AND is_verified = TRUE;

  SELECT COUNT(*)::int INTO v_professionals_placed
  FROM applications a
  JOIN job_posts jp ON jp.id = a.job_id
  WHERE a.is_seed_data = FALSE AND jp.is_seed_data = FALSE AND a.status = 'accepted';

  SELECT ROUND(AVG(rating)::numeric, 1) INTO v_avg_rating
  FROM hospital_reviews WHERE is_seed_data = FALSE;

  SELECT COALESCE(jsonb_agg(row_to_json(h)::jsonb ORDER BY h.open_shifts DESC, h.hospital_name), '[]'::jsonb)
  INTO v_hospitals
  FROM (
    SELECT
      hp.id,
      hp.hospital_name,
      hp.slug,
      COALESCE(NULLIF(trim(hp.city), ''), 'Unknown') AS city,
      COUNT(jp.id)::int AS open_shifts
    FROM job_posts jp
    JOIN hospital_profiles hp ON hp.id = jp.hospital_id
    WHERE jp.is_seed_data = FALSE AND hp.is_seed_data = FALSE AND jp.status = 'open'
    GROUP BY hp.id, hp.hospital_name, hp.slug, hp.city
    ORDER BY COUNT(jp.id) DESC, hp.hospital_name
    LIMIT 8
  ) h;

  SELECT COALESCE(jsonb_agg(row_to_json(s)::jsonb ORDER BY s.created_at DESC), '[]'::jsonb)
  INTO v_shifts
  FROM (
    SELECT
      jp.id,
      jp.slug,
      jp.title,
      jp.compensation,
      jp.shift_date,
      jp.shift_start_time,
      jp.shift_end_time,
      jp.created_at,
      hp.hospital_name,
      hp.slug AS hospital_slug,
      COALESCE(NULLIF(trim(hp.city), ''), 'Unknown') AS city
    FROM job_posts jp
    JOIN hospital_profiles hp ON hp.id = jp.hospital_id
    WHERE jp.is_seed_data = FALSE AND hp.is_seed_data = FALSE AND jp.status = 'open'
    ORDER BY jp.created_at DESC
    LIMIT 10
  ) s;

  RETURN jsonb_build_object(
    'stats', jsonb_build_object(
      'openShifts', v_open_shifts,
      'hiringHospitals', v_hiring_hospitals,
      'activeProfessionals', v_active_professionals
    ),
    'trust', jsonb_build_object(
      'verifiedHospitals', v_verified_hospitals,
      'professionalsPlaced', v_professionals_placed,
      'avgRating', v_avg_rating
    ),
    'hospitalsHiring', v_hospitals,
    'popularShifts', v_shifts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_nearby_discovery() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_nearby_discovery() TO anon, authenticated, service_role;
