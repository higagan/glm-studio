
-- 1. Prevent duplicate applications (unique constraint on job_id + professional_id)
ALTER TABLE public.applications 
ADD CONSTRAINT applications_job_professional_unique UNIQUE (job_id, professional_id);

-- 2. Prevent posting shifts in the past (validation trigger)
CREATE OR REPLACE FUNCTION public.validate_shift_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.shift_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Shift date cannot be in the past';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_job_shift_date
BEFORE INSERT OR UPDATE ON public.job_posts
FOR EACH ROW
EXECUTE FUNCTION public.validate_shift_date();

-- 3. Allow professionals to withdraw (delete) their own PENDING applications
CREATE POLICY "Professionals can withdraw pending applications"
ON public.applications
FOR DELETE
USING (
  status = 'pending' AND
  EXISTS (
    SELECT 1 FROM professional_profiles
    WHERE professional_profiles.user_id = auth.uid()
    AND professional_profiles.id = applications.professional_id
  )
);
