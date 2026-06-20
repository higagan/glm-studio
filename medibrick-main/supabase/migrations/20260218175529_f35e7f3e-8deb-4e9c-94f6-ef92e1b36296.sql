
-- Add slug column to hospital_profiles
ALTER TABLE public.hospital_profiles
  ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Function to generate a URL-friendly slug from hospital name
CREATE OR REPLACE FUNCTION public.generate_hospital_slug(name text, hospital_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  -- Convert to lowercase, replace spaces/special chars with hyphens, strip extras
  base_slug := regexp_replace(
    regexp_replace(
      lower(trim(name)),
      '[^a-z0-9\s-]', '', 'g'
    ),
    '[\s-]+', '-', 'g'
  );
  base_slug := trim(both '-' from base_slug);
  
  -- Try base slug first, then append counter if taken
  final_slug := base_slug;
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.hospital_profiles
      WHERE slug = final_slug AND id != hospital_id
    ) THEN
      RETURN final_slug;
    END IF;
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
END;
$$;

-- Backfill slugs for all existing hospitals
UPDATE public.hospital_profiles
SET slug = public.generate_hospital_slug(hospital_name, id)
WHERE slug IS NULL;

-- Trigger to auto-set slug on insert or when hospital_name changes
CREATE OR REPLACE FUNCTION public.set_hospital_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR (TG_OP = 'UPDATE' AND NEW.hospital_name != OLD.hospital_name AND (OLD.slug IS NULL OR OLD.slug = '')) THEN
    NEW.slug := public.generate_hospital_slug(NEW.hospital_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_hospital_slug ON public.hospital_profiles;
CREATE TRIGGER trigger_set_hospital_slug
  BEFORE INSERT OR UPDATE ON public.hospital_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_hospital_slug();
