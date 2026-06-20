-- Secondary specialty within role category (e.g. ICU Nurse, General Physician).
-- required_specialization stores primary role: Doctor, Nurse, AYUSH Practitioner, etc.
ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS specialty TEXT;

COMMENT ON COLUMN public.job_posts.specialty IS
  'Secondary specialty within role category. Primary role stored in required_specialization.';
