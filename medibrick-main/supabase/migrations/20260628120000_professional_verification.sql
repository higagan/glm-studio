-- ════════════════════════════════════════════════════════════════════════
-- Professional verification: submission → review queue → decision
--
-- The verification_status column already exists (unverified/pending/verified/
-- rejected). What was missing: (1) a way for professionals to submit credentials,
-- (2) document storage, (3) an admin review queue, and (4) protection so a
-- professional cannot self-promote to "verified" via a direct row UPDATE
-- (the existing FOR ALL RLS policy permits writing any column).
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Credential columns ────────────────────────────────────────────────
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS verification_document_url TEXT,
  ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- ── 2. Private storage bucket for credential documents ───────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', FALSE)
ON CONFLICT (id) DO NOTHING;

-- A professional may write/read only files under their own user-id prefix:
--   verification-docs/<auth.uid()>/<filename>
DROP POLICY IF EXISTS "Professionals manage own verification docs" ON storage.objects;
CREATE POLICY "Professionals manage own verification docs"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Admins read all verification docs" ON storage.objects;
CREATE POLICY "Admins read all verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND public.has_role(auth.uid(), 'admin')
  );

-- ── 3. Integrity guard ───────────────────────────────────────────────────
-- Non-admins may move their own status to 'pending' (submit) or back to
-- 'unverified', and may not touch reviewer-only fields. Only an admin (via the
-- SECURITY DEFINER RPC below, which runs as table owner and bypasses this) can
-- reach 'verified' / 'rejected'.
CREATE OR REPLACE FUNCTION public.guard_professional_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Owner bypass is handled by SECURITY DEFINER RPCs (they run as the function
  -- owner, for which auth.uid() is NULL). Real end-user writes always have a uid.
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NEW.verification_status NOT IN ('pending', 'unverified') THEN
      RAISE EXCEPTION 'Only admins can set verification_status to %', NEW.verification_status
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.verification_status = 'pending' THEN
      NEW.verification_submitted_at := now();
    END IF;
  END IF;

  -- Reviewer-only fields are immutable for non-admins.
  NEW.verification_reviewed_at := OLD.verification_reviewed_at;
  NEW.verification_notes := OLD.verification_notes;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_professional_verification ON public.professional_profiles;
CREATE TRIGGER trg_guard_professional_verification
  BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_professional_verification();

-- ── 4. Admin: list pending submissions ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_pending_verifications()
RETURNS TABLE (
  profile_id UUID,
  user_id UUID,
  full_name TEXT,
  specialization TEXT,
  experience_years INTEGER,
  license_number TEXT,
  verification_document_url TEXT,
  verification_submitted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT pp.id, pp.user_id, pr.full_name, pp.specialization, pp.experience_years,
         pp.license_number, pp.verification_document_url, pp.verification_submitted_at
  FROM public.professional_profiles pp
  LEFT JOIN public.profiles pr ON pr.id = pp.user_id
  WHERE pp.verification_status = 'pending'
    AND COALESCE(pp.is_seed_data, FALSE) = FALSE
  ORDER BY pp.verification_submitted_at ASC NULLS LAST;
END;
$$;

-- ── 5. Admin: approve / reject a submission ──────────────────────────────
CREATE OR REPLACE FUNCTION public.review_professional_verification(
  p_profile_id UUID,
  p_approve BOOLEAN,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.professional_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.professional_profiles;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.professional_profiles
  SET verification_status   = CASE WHEN p_approve THEN 'verified' ELSE 'rejected' END,
      verification_reviewed_at = now(),
      verification_notes    = p_notes
  WHERE id = p_profile_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Professional profile % not found', p_profile_id;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_pending_verifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_professional_verification(UUID, BOOLEAN, TEXT) TO authenticated;
