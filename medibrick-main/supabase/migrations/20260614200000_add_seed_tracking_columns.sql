-- Adds data_source and is_seed_data tracking columns to all user-facing tables.
-- Used to:
--   • identify and clean up seed / demo data
--   • track origin of imported records (scraper_import, seed, manual)
--   • allow bulk rollback: DELETE WHERE is_seed_data = TRUE

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS data_source   TEXT,
  ADD COLUMN IF NOT EXISTS is_seed_data  BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.hospital_profiles
  ADD COLUMN IF NOT EXISTS data_source   TEXT,
  ADD COLUMN IF NOT EXISTS is_seed_data  BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS data_source   TEXT,
  ADD COLUMN IF NOT EXISTS is_seed_data  BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS data_source   TEXT,
  ADD COLUMN IF NOT EXISTS is_seed_data  BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS data_source   TEXT,
  ADD COLUMN IF NOT EXISTS is_seed_data  BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial indexes for fast seed cleanup queries
CREATE INDEX IF NOT EXISTS idx_profiles_seed
  ON public.profiles(is_seed_data) WHERE is_seed_data = TRUE;

CREATE INDEX IF NOT EXISTS idx_hospital_profiles_seed
  ON public.hospital_profiles(is_seed_data) WHERE is_seed_data = TRUE;

CREATE INDEX IF NOT EXISTS idx_professional_profiles_seed
  ON public.professional_profiles(is_seed_data) WHERE is_seed_data = TRUE;

CREATE INDEX IF NOT EXISTS idx_job_posts_seed
  ON public.job_posts(is_seed_data) WHERE is_seed_data = TRUE;

CREATE INDEX IF NOT EXISTS idx_applications_seed
  ON public.applications(is_seed_data) WHERE is_seed_data = TRUE;

-- ── Verification ──
-- SELECT COUNT(*) FROM public.job_posts WHERE is_seed_data = TRUE;
-- SELECT DISTINCT data_source FROM public.job_posts;
