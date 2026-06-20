-- Add slug column to job_posts for SEO-friendly URLs
ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Generate URL-friendly slug: title-city-shortid (e.g. cardiologist-bangalore-a1b2c3d4)
CREATE OR REPLACE FUNCTION public.generate_job_slug(
  job_title text,
  city text,
  job_id uuid
)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  title_slug text;
  city_slug text;
  short_id text;
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  title_slug := regexp_replace(
    regexp_replace(lower(trim(coalesce(job_title, 'job'))), '[^a-z0-9\s-]', '', 'g'),
    '[\s-]+', '-', 'g'
  );
  title_slug := trim(both '-' from title_slug);

  city_slug := regexp_replace(
    regexp_replace(lower(trim(coalesce(city, 'india'))), '[^a-z0-9\s-]', '', 'g'),
    '[\s-]+', '-', 'g'
  );
  city_slug := trim(both '-' from city_slug);

  short_id := left(replace(job_id::text, '-', ''), 8);
  base_slug := title_slug || '-' || city_slug || '-' || short_id;
  final_slug := base_slug;

  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.job_posts
      WHERE slug = final_slug AND id != job_id
    ) THEN
      RETURN final_slug;
    END IF;
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
END;
$$;

-- Disable triggers during backfill so validate_shift_date() does not
-- reject historical rows (past shift dates are expected in old records).
ALTER TABLE public.job_posts DISABLE TRIGGER USER;

-- Backfill slugs for existing jobs
UPDATE public.job_posts jp
SET slug = public.generate_job_slug(
  jp.title,
  COALESCE(hp.city, 'india'),
  jp.id
)
FROM public.hospital_profiles hp
WHERE jp.hospital_id = hp.id
  AND jp.slug IS NULL;

-- Jobs without hospital join fallback
UPDATE public.job_posts
SET slug = public.generate_job_slug(title, 'india', id)
WHERE slug IS NULL;

-- Re-enable all triggers
ALTER TABLE public.job_posts ENABLE TRIGGER USER;

CREATE OR REPLACE FUNCTION public.set_job_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  hospital_city text;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR (
    TG_OP = 'UPDATE' AND (
      NEW.title != OLD.title OR NEW.hospital_id != OLD.hospital_id
    )
  ) THEN
    SELECT city INTO hospital_city
    FROM public.hospital_profiles
    WHERE id = NEW.hospital_id;

    NEW.slug := public.generate_job_slug(
      NEW.title,
      COALESCE(hospital_city, 'india'),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_job_slug ON public.job_posts;
CREATE TRIGGER trigger_set_job_slug
  BEFORE INSERT OR UPDATE ON public.job_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_job_slug();

CREATE INDEX IF NOT EXISTS idx_job_posts_slug ON public.job_posts(slug);

REVOKE EXECUTE ON FUNCTION public.set_job_slug() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_job_slug(text, text, uuid) FROM PUBLIC, anon, authenticated;
