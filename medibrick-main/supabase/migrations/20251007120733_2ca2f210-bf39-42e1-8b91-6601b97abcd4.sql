-- Allow hospitals to view profiles of professionals who applied to their jobs
CREATE POLICY "Hospitals can view applicant profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.applications app
    JOIN public.professional_profiles pp ON pp.id = app.professional_id
    JOIN public.job_posts jp ON jp.id = app.job_id
    JOIN public.hospital_profiles hp ON hp.id = jp.hospital_id
    WHERE pp.user_id = profiles.id
      AND hp.user_id = auth.uid()
  )
);

-- Also allow viewing profiles when directly viewing professional profile pages
CREATE POLICY "Anyone can view professional profiles for public viewing"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.professional_profiles
    WHERE professional_profiles.user_id = profiles.id
  )
);