
DO $$
DECLARE
  u1 uuid := gen_random_uuid();
  u2 uuid := gen_random_uuid();
  u3 uuid := gen_random_uuid();
  u4 uuid := gen_random_uuid();
  u5 uuid := gen_random_uuid();
BEGIN

  -- ── User 1: Dr. Priya Sharma ──
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES (u1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya.sharma@testdoc.com', crypt('Doctor@1234', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Priya Sharma"}', now(), now(), '', '');
  INSERT INTO public.user_roles (user_id, role) VALUES (u1, 'professional');
  INSERT INTO public.professional_profiles (user_id, specialization, experience_years, bio, qualifications, available)
  VALUES (u1, 'Emergency Medicine Physician', 7, 'Experienced emergency physician with expertise in trauma and critical care.', 'MBBS - AIIMS Delhi, MD Emergency Medicine', true);

  -- ── User 2: Dr. Arjun Mehta ──
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES (u2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'arjun.mehta@testdoc.com', crypt('Doctor@1234', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Arjun Mehta"}', now(), now(), '', '');
  INSERT INTO public.user_roles (user_id, role) VALUES (u2, 'professional');
  INSERT INTO public.professional_profiles (user_id, specialization, experience_years, bio, qualifications, available)
  VALUES (u2, 'Anesthesiologist', 10, 'Senior anesthesiologist with 10 years of OT experience. Proficient in regional and general anesthesia.', 'MBBS - KEM Mumbai, MD Anaesthesiology', true);

  -- ── User 3: Dr. Neha Kapoor ──
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES (u3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'neha.kapoor@testdoc.com', crypt('Doctor@1234', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Neha Kapoor"}', now(), now(), '', '');
  INSERT INTO public.user_roles (user_id, role) VALUES (u3, 'professional');
  INSERT INTO public.professional_profiles (user_id, specialization, experience_years, bio, qualifications, available)
  VALUES (u3, 'Pediatrician', 5, 'Compassionate pediatrician specializing in neonatal and childhood care.', 'MBBS - Manipal, MD Pediatrics', true);

  -- ── User 4: Dr. Rahul Verma ──
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES (u4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rahul.verma@testdoc.com', crypt('Doctor@1234', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Rahul Verma"}', now(), now(), '', '');
  INSERT INTO public.user_roles (user_id, role) VALUES (u4, 'professional');
  INSERT INTO public.professional_profiles (user_id, specialization, experience_years, bio, qualifications, available)
  VALUES (u4, 'Surgeon', 12, 'General and laparoscopic surgeon with extensive OT experience.', 'MBBS - CMC Vellore, MS General Surgery', false);

  -- ── User 5: Dr. Sunita Rao ──
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES (u5, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sunita.rao@testdoc.com', crypt('Doctor@1234', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Sunita Rao"}', now(), now(), '', '');
  INSERT INTO public.user_roles (user_id, role) VALUES (u5, 'professional');
  INSERT INTO public.professional_profiles (user_id, specialization, experience_years, bio, qualifications, available)
  VALUES (u5, 'Registered Nurse (RN)', 6, 'Senior RN with ICU and CCU experience. ACLS certified. Flexible with shift timings.', 'BSc Nursing - NIMHANS, ICU Certification', true);

END;
$$;
