-- Add referral_source to applications to track where applications originate
-- (e.g. 'whatsapp', 'linkedin', 'copy', 'email', 'native', 'direct')
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS referral_source text;

COMMENT ON COLUMN public.applications.referral_source IS 'Share channel that led to this application (whatsapp | linkedin | copy | email | native | direct)';
