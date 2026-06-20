-- Public hospital profile fields + professional reviews

CREATE TYPE public.hospital_type AS ENUM (
  'hospital',
  'clinic',
  'diagnostic_centre',
  'wellness_centre'
);

ALTER TABLE public.hospital_profiles
  ADD COLUMN IF NOT EXISTS hospital_type public.hospital_type NOT NULL DEFAULT 'hospital',
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS mission TEXT,
  ADD COLUMN IF NOT EXISTS specialties TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS departments TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nabh_accredited BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS certifications TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS years_in_operation INTEGER,
  ADD COLUMN IF NOT EXISTS awards TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.hospital_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospital_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  role_title TEXT NOT NULL,
  specialty TEXT,
  shift_completed_date DATE,
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  data_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospital_reviews_hospital
  ON public.hospital_reviews(hospital_id);

CREATE INDEX IF NOT EXISTS idx_hospital_profiles_slug_public
  ON public.hospital_profiles(slug) WHERE slug IS NOT NULL;

ALTER TABLE public.hospital_reviews ENABLE ROW LEVEL SECURITY;

-- Public read for reviews (no PII — role titles only)
CREATE POLICY "Anyone can view hospital reviews"
  ON public.hospital_reviews FOR SELECT
  USING (true);

-- Hospitals manage their own reviews (future use)
CREATE POLICY "Hospitals can insert reviews for own facility"
  ON public.hospital_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hospital_profiles hp
      WHERE hp.id = hospital_id AND hp.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.hospital_reviews IS
  'Anonymous professional reviews for public hospital profiles. No personal identifiers.';
