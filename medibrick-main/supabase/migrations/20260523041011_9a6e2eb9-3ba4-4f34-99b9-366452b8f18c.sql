
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_shift_date() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_hospital_slug() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_hospital_slug(text, uuid) FROM PUBLIC, anon, authenticated;
