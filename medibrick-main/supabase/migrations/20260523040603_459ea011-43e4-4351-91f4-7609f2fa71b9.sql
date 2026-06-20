
-- 1. blog_posts: replace open public policies with admin-only
DROP POLICY IF EXISTS "CMS can view all posts" ON public.blog_posts;
DROP POLICY IF EXISTS "CMS can insert posts" ON public.blog_posts;
DROP POLICY IF EXISTS "CMS can update posts" ON public.blog_posts;
DROP POLICY IF EXISTS "CMS can delete posts" ON public.blog_posts;

CREATE POLICY "Admins can view all posts"
  ON public.blog_posts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert posts"
  ON public.blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update posts"
  ON public.blog_posts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete posts"
  ON public.blog_posts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. profiles: remove public exposure of email/phone via professional join
DROP POLICY IF EXISTS "Anyone can view professional profiles for public viewing" ON public.profiles;

-- Authenticated users may see basic profile rows linked to a professional profile.
CREATE POLICY "Authenticated users can view professional profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.professional_profiles
    WHERE professional_profiles.user_id = profiles.id
  ));

-- 3. user_roles: prevent self-assigning admin
DROP POLICY IF EXISTS "Users can insert their own roles on signup" ON public.user_roles;

CREATE POLICY "Users can insert their own non-admin role on signup"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND role <> 'admin'::app_role);

-- 4. Lock down SECURITY DEFINER helper/trigger functions from public API
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_shift_date() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_hospital_slug() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_hospital_slug(text, uuid) FROM anon, authenticated;
