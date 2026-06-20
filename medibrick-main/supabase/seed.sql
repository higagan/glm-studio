-- ============================================================
-- Medibrick Demo Seed Data
-- ============================================================
-- Run via Supabase SQL Editor (service_role) or:
--   psql "$DATABASE_URL" < supabase/seed.sql
--
-- IMPORTANT: Requires service_role — NOT safe with anon key.
-- REPEAT-SAFE: deletes all prior seed data before inserting.
--
-- Test credentials (all accounts):
--   password = Seed@2026!
--
-- Hospital emails:  <slug>@medibrick-seed.internal
-- Professional emails: <slug>@medibrick-seed.internal
--
-- All jobs use shift_date = 2026-07-01 through 2026-09-30
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.hospital_type AS ENUM (
    'hospital', 'clinic', 'diagnostic_centre', 'wellness_centre'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add tracking columns if they don't exist yet
-- (idempotent — safe to run even after 20260614200000 migration)
ALTER TABLE public.profiles             ADD COLUMN IF NOT EXISTS data_source  TEXT;
ALTER TABLE public.profiles             ADD COLUMN IF NOT EXISTS is_seed_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.hospital_profiles    ADD COLUMN IF NOT EXISTS data_source  TEXT;
ALTER TABLE public.hospital_profiles    ADD COLUMN IF NOT EXISTS is_seed_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.hospital_profiles    ADD COLUMN IF NOT EXISTS hospital_type public.hospital_type NOT NULL DEFAULT 'hospital';
ALTER TABLE public.hospital_profiles    ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.hospital_profiles    ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.hospital_profiles    ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.hospital_profiles    ADD COLUMN IF NOT EXISTS mission TEXT;
ALTER TABLE public.hospital_profiles    ADD COLUMN IF NOT EXISTS specialties TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.hospital_profiles    ADD COLUMN IF NOT EXISTS departments TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.hospital_profiles    ADD COLUMN IF NOT EXISTS nabh_accredited BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.hospital_profiles    ADD COLUMN IF NOT EXISTS certifications TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.hospital_profiles    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.hospital_profiles    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.hospital_profiles    ADD COLUMN IF NOT EXISTS years_in_operation INTEGER;
ALTER TABLE public.hospital_profiles    ADD COLUMN IF NOT EXISTS awards TEXT[] NOT NULL DEFAULT '{}';

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
ALTER TABLE public.professional_profiles ADD COLUMN IF NOT EXISTS data_source TEXT;
ALTER TABLE public.professional_profiles ADD COLUMN IF NOT EXISTS is_seed_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.job_posts            ADD COLUMN IF NOT EXISTS data_source  TEXT;
ALTER TABLE public.job_posts            ADD COLUMN IF NOT EXISTS is_seed_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.applications         ADD COLUMN IF NOT EXISTS data_source  TEXT;
ALTER TABLE public.applications         ADD COLUMN IF NOT EXISTS is_seed_data BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
DECLARE
  -- ── Hospital auth.users UUIDs ──────────────────────────────
  h01 UUID := 'a0000000-0000-0000-0000-000000000001'; -- Apollo Jayanagar BLR
  h02 UUID := 'a0000000-0000-0000-0000-000000000002'; -- Fortis Bannerghatta BLR
  h03 UUID := 'a0000000-0000-0000-0000-000000000003'; -- Manipal Old Airport BLR
  h04 UUID := 'a0000000-0000-0000-0000-000000000004'; -- Narayana Health City BLR
  h05 UUID := 'a0000000-0000-0000-0000-000000000005'; -- Aster CMI Hebbal BLR
  h06 UUID := 'a0000000-0000-0000-0000-000000000006'; -- Sakra World Marathahalli BLR
  h07 UUID := 'a0000000-0000-0000-0000-000000000007'; -- Columbia Asia Whitefield BLR
  h08 UUID := 'a0000000-0000-0000-0000-000000000008'; -- Cloudnine Jayanagar BLR
  h09 UUID := 'a0000000-0000-0000-0000-000000000009'; -- Vikram Hospital BLR
  h10 UUID := 'a0000000-0000-0000-0000-000000000010'; -- Kokilaben Mumbai
  h11 UUID := 'a0000000-0000-0000-0000-000000000011'; -- Lilavati Mumbai
  h12 UUID := 'a0000000-0000-0000-0000-000000000012'; -- Max Saket Delhi
  h13 UUID := 'a0000000-0000-0000-0000-000000000013'; -- KIMS Secunderabad HYD
  h14 UUID := 'a0000000-0000-0000-0000-000000000014'; -- Apollo Greams Chennai
  h15 UUID := 'a0000000-0000-0000-0000-000000000015'; -- Ruby Hall Pune

  -- ── hospital_profiles UUIDs ────────────────────────────────
  hp01 UUID := 'c0000000-0000-0000-0000-000000000001';
  hp02 UUID := 'c0000000-0000-0000-0000-000000000002';
  hp03 UUID := 'c0000000-0000-0000-0000-000000000003';
  hp04 UUID := 'c0000000-0000-0000-0000-000000000004';
  hp05 UUID := 'c0000000-0000-0000-0000-000000000005';
  hp06 UUID := 'c0000000-0000-0000-0000-000000000006';
  hp07 UUID := 'c0000000-0000-0000-0000-000000000007';
  hp08 UUID := 'c0000000-0000-0000-0000-000000000008';
  hp09 UUID := 'c0000000-0000-0000-0000-000000000009';
  hp10 UUID := 'c0000000-0000-0000-0000-000000000010';
  hp11 UUID := 'c0000000-0000-0000-0000-000000000011';
  hp12 UUID := 'c0000000-0000-0000-0000-000000000012';
  hp13 UUID := 'c0000000-0000-0000-0000-000000000013';
  hp14 UUID := 'c0000000-0000-0000-0000-000000000014';
  hp15 UUID := 'c0000000-0000-0000-0000-000000000015';

  -- ── Professional auth.users UUIDs ─────────────────────────
  p01 UUID := 'b0000000-0000-0000-0000-000000000001'; -- Dr. Arjun Sharma (Gen Physician)
  p02 UUID := 'b0000000-0000-0000-0000-000000000002'; -- Dr. Priya Nair (Cardiologist)
  p03 UUID := 'b0000000-0000-0000-0000-000000000003'; -- Dr. Suresh Kumar (Ortho)
  p04 UUID := 'b0000000-0000-0000-0000-000000000004'; -- Dr. Deepa Menon (Pediatrician)
  p05 UUID := 'b0000000-0000-0000-0000-000000000005'; -- Dr. Rajesh Verma (Emergency)
  p06 UUID := 'b0000000-0000-0000-0000-000000000006'; -- Dr. Sanjay Reddy (ICU)
  p07 UUID := 'b0000000-0000-0000-0000-000000000007'; -- Nurse Kavitha Sharma (Staff Nurse)
  p08 UUID := 'b0000000-0000-0000-0000-000000000008'; -- Nurse Preethi B (ICU Nurse)
  p09 UUID := 'b0000000-0000-0000-0000-000000000009'; -- Rohan Nair (OT Tech)
  p10 UUID := 'b0000000-0000-0000-0000-000000000010'; -- Arun Kumar (Lab Tech)
  p11 UUID := 'b0000000-0000-0000-0000-000000000011'; -- Dr. Sunita Rao (Physio)
  p12 UUID := 'b0000000-0000-0000-0000-000000000012'; -- Dr. Mahesh Iyer (Ayurveda)
  p13 UUID := 'b0000000-0000-0000-0000-000000000013'; -- Dr. Vinitha Menon (Gen Physician)
  p14 UUID := 'b0000000-0000-0000-0000-000000000014'; -- Nurse Swati Patil (Staff Nurse)
  p15 UUID := 'b0000000-0000-0000-0000-000000000015'; -- Dr. Kiran Joshi (Cardiologist)
  p16 UUID := 'b0000000-0000-0000-0000-000000000016'; -- Dr. Ananya Singh (Ortho)
  p17 UUID := 'b0000000-0000-0000-0000-000000000017'; -- Nurse Meena Babu (ICU Nurse)
  p18 UUID := 'b0000000-0000-0000-0000-000000000018'; -- Dr. Prakash Nair (Emergency)
  p19 UUID := 'b0000000-0000-0000-0000-000000000019'; -- Vijay Thomas (Lab Tech)
  p20 UUID := 'b0000000-0000-0000-0000-000000000020'; -- Dr. Nandini Agarwal (Physio)

  -- ── professional_profiles UUIDs ───────────────────────────
  pp01 UUID := 'd0000000-0000-0000-0000-000000000001';
  pp02 UUID := 'd0000000-0000-0000-0000-000000000002';
  pp03 UUID := 'd0000000-0000-0000-0000-000000000003';
  pp04 UUID := 'd0000000-0000-0000-0000-000000000004';
  pp05 UUID := 'd0000000-0000-0000-0000-000000000005';
  pp06 UUID := 'd0000000-0000-0000-0000-000000000006';
  pp07 UUID := 'd0000000-0000-0000-0000-000000000007';
  pp08 UUID := 'd0000000-0000-0000-0000-000000000008';
  pp09 UUID := 'd0000000-0000-0000-0000-000000000009';
  pp10 UUID := 'd0000000-0000-0000-0000-000000000010';
  pp11 UUID := 'd0000000-0000-0000-0000-000000000011';
  pp12 UUID := 'd0000000-0000-0000-0000-000000000012';
  pp13 UUID := 'd0000000-0000-0000-0000-000000000013';
  pp14 UUID := 'd0000000-0000-0000-0000-000000000014';
  pp15 UUID := 'd0000000-0000-0000-0000-000000000015';
  pp16 UUID := 'd0000000-0000-0000-0000-000000000016';
  pp17 UUID := 'd0000000-0000-0000-0000-000000000017';
  pp18 UUID := 'd0000000-0000-0000-0000-000000000018';
  pp19 UUID := 'd0000000-0000-0000-0000-000000000019';
  pp20 UUID := 'd0000000-0000-0000-0000-000000000020';

  -- ── job_posts UUIDs ───────────────────────────────────────
  j01 UUID := 'e0000000-0000-0000-0000-000000000001'; -- Emergency → Apollo BLR
  j02 UUID := 'e0000000-0000-0000-0000-000000000002'; -- ICU → Fortis BLR
  j03 UUID := 'e0000000-0000-0000-0000-000000000003'; -- Gen Physician → Manipal BLR
  j04 UUID := 'e0000000-0000-0000-0000-000000000004'; -- Cardiologist → Narayana BLR
  j05 UUID := 'e0000000-0000-0000-0000-000000000005'; -- Staff Nurse → Aster BLR
  j06 UUID := 'e0000000-0000-0000-0000-000000000006'; -- ICU Nurse → Sakra BLR
  j07 UUID := 'e0000000-0000-0000-0000-000000000007'; -- Pediatrician → Cloudnine BLR
  j08 UUID := 'e0000000-0000-0000-0000-000000000008'; -- Ortho Surgeon → Columbia Asia BLR
  j09 UUID := 'e0000000-0000-0000-0000-000000000009'; -- OT Technician → Manipal BLR
  j10 UUID := 'e0000000-0000-0000-0000-000000000010'; -- Lab Technician → Vikram BLR
  j11 UUID := 'e0000000-0000-0000-0000-000000000011'; -- Emergency → Kokilaben MUM
  j12 UUID := 'e0000000-0000-0000-0000-000000000012'; -- Cardiologist → Lilavati MUM
  j13 UUID := 'e0000000-0000-0000-0000-000000000013'; -- Staff Nurse → Max Delhi
  j14 UUID := 'e0000000-0000-0000-0000-000000000014'; -- ICU Specialist → KIMS HYD
  j15 UUID := 'e0000000-0000-0000-0000-000000000015'; -- Gen Physician → Apollo Chennai
  j16 UUID := 'e0000000-0000-0000-0000-000000000016'; -- Physiotherapist → Ruby Hall Pune
  j17 UUID := 'e0000000-0000-0000-0000-000000000017'; -- Ayurvedic Doctor → Vikram BLR
  j18 UUID := 'e0000000-0000-0000-0000-000000000018'; -- Ortho Surgeon → Fortis BLR
  j19 UUID := 'e0000000-0000-0000-0000-000000000019'; -- ICU Nurse → Narayana BLR
  j20 UUID := 'e0000000-0000-0000-0000-000000000020'; -- Emergency → Aster CMI BLR

  -- ── application UUIDs ─────────────────────────────────────
  ap01 UUID := 'f0000000-0000-0000-0000-000000000001';
  ap02 UUID := 'f0000000-0000-0000-0000-000000000002';
  ap03 UUID := 'f0000000-0000-0000-0000-000000000003';
  ap04 UUID := 'f0000000-0000-0000-0000-000000000004';
  ap05 UUID := 'f0000000-0000-0000-0000-000000000005';
  ap06 UUID := 'f0000000-0000-0000-0000-000000000006';
  ap07 UUID := 'f0000000-0000-0000-0000-000000000007';
  ap08 UUID := 'f0000000-0000-0000-0000-000000000008';
  ap09 UUID := 'f0000000-0000-0000-0000-000000000009';
  ap10 UUID := 'f0000000-0000-0000-0000-000000000010';
  ap11 UUID := 'f0000000-0000-0000-0000-000000000011';
  ap12 UUID := 'f0000000-0000-0000-0000-000000000012';
  ap13 UUID := 'f0000000-0000-0000-0000-000000000013';
  ap14 UUID := 'f0000000-0000-0000-0000-000000000014';
  ap15 UUID := 'f0000000-0000-0000-0000-000000000015';
  ap16 UUID := 'f0000000-0000-0000-0000-000000000016';
  ap17 UUID := 'f0000000-0000-0000-0000-000000000017';
  ap18 UUID := 'f0000000-0000-0000-0000-000000000018';
  ap19 UUID := 'f0000000-0000-0000-0000-000000000019';
  ap20 UUID := 'f0000000-0000-0000-0000-000000000020';
  ap21 UUID := 'f0000000-0000-0000-0000-000000000021';

  seed_pw TEXT;

BEGIN
  seed_pw := crypt('Seed@2026!', gen_salt('bf'));

  -- ══════════════════════════════════════════════════════════
  -- CLEANUP — removes all previous seed data (safe to re-run)
  -- ══════════════════════════════════════════════════════════
  DELETE FROM public.applications       WHERE is_seed_data = TRUE;
  DELETE FROM public.hospital_reviews   WHERE is_seed_data = TRUE;
  DELETE FROM public.job_posts          WHERE is_seed_data = TRUE;
  DELETE FROM public.professional_profiles WHERE is_seed_data = TRUE;
  DELETE FROM public.hospital_profiles  WHERE is_seed_data = TRUE;
  DELETE FROM public.user_roles         WHERE user_id IN (SELECT id FROM public.profiles WHERE is_seed_data = TRUE);
  DELETE FROM auth.users                WHERE id IN (SELECT id FROM public.profiles WHERE is_seed_data = TRUE);
  DELETE FROM public.profiles           WHERE is_seed_data = TRUE;

  -- ══════════════════════════════════════════════════════════
  -- HOSPITAL AUTH USERS (15)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO auth.users
    (instance_id, id, aud, role, email, encrypted_password,
     email_confirmed_at, created_at, updated_at,
     raw_app_meta_data, raw_user_meta_data, is_super_admin)
  VALUES
    ('00000000-0000-0000-0000-000000000000', h01, 'authenticated', 'authenticated',
     'apollo.jayanagar@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', h02, 'authenticated', 'authenticated',
     'fortis.bannerghatta@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', h03, 'authenticated', 'authenticated',
     'manipal.oldairport@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', h04, 'authenticated', 'authenticated',
     'narayana.health@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', h05, 'authenticated', 'authenticated',
     'aster.cmi@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', h06, 'authenticated', 'authenticated',
     'sakra.world@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', h07, 'authenticated', 'authenticated',
     'columbia.asia@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', h08, 'authenticated', 'authenticated',
     'cloudnine.jayanagar@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', h09, 'authenticated', 'authenticated',
     'vikram.hospital@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', h10, 'authenticated', 'authenticated',
     'kokilaben.mumbai@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', h11, 'authenticated', 'authenticated',
     'lilavati.bandra@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', h12, 'authenticated', 'authenticated',
     'max.saket@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', h13, 'authenticated', 'authenticated',
     'kims.secunderabad@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', h14, 'authenticated', 'authenticated',
     'apollo.chennai@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', h15, 'authenticated', 'authenticated',
     'rubyhall.pune@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false)
  ON CONFLICT (id) DO NOTHING;

  -- ── Hospital profiles ──────────────────────────────────────
  INSERT INTO public.profiles (id, full_name, email, is_seed_data, data_source) VALUES
    (h01, 'Apollo Hospitals Jayanagar',          'apollo.jayanagar@medibrick-seed.internal',   true, 'seed'),
    (h02, 'Fortis Hospital Bannerghatta Road',   'fortis.bannerghatta@medibrick-seed.internal', true, 'seed'),
    (h03, 'Manipal Hospital Old Airport Road',   'manipal.oldairport@medibrick-seed.internal',  true, 'seed'),
    (h04, 'Narayana Health City',                'narayana.health@medibrick-seed.internal',      true, 'seed'),
    (h05, 'Aster CMI Hospital Hebbal',           'aster.cmi@medibrick-seed.internal',           true, 'seed'),
    (h06, 'Sakra World Hospital Marathahalli',   'sakra.world@medibrick-seed.internal',         true, 'seed'),
    (h07, 'Columbia Asia Hospital Whitefield',   'columbia.asia@medibrick-seed.internal',       true, 'seed'),
    (h08, 'Cloudnine Hospital Jayanagar',        'cloudnine.jayanagar@medibrick-seed.internal', true, 'seed'),
    (h09, 'Vikram Hospital Millers Road',        'vikram.hospital@medibrick-seed.internal',     true, 'seed'),
    (h10, 'Kokilaben Dhirubhai Ambani Hospital', 'kokilaben.mumbai@medibrick-seed.internal',    true, 'seed'),
    (h11, 'Lilavati Hospital and Research Centre','lilavati.bandra@medibrick-seed.internal',   true, 'seed'),
    (h12, 'Max Super Speciality Hospital Saket', 'max.saket@medibrick-seed.internal',           true, 'seed'),
    (h13, 'KIMS Hospitals Secunderabad',         'kims.secunderabad@medibrick-seed.internal',   true, 'seed'),
    (h14, 'Apollo Hospitals Greams Road',        'apollo.chennai@medibrick-seed.internal',      true, 'seed'),
    (h15, 'Ruby Hall Clinic',                    'rubyhall.pune@medibrick-seed.internal',       true, 'seed')
  ON CONFLICT (id) DO UPDATE SET
    full_name    = EXCLUDED.full_name,
    is_seed_data = TRUE,
    data_source  = 'seed';

  INSERT INTO public.user_roles (user_id, role) VALUES
    (h01,'hospital'),(h02,'hospital'),(h03,'hospital'),(h04,'hospital'),(h05,'hospital'),
    (h06,'hospital'),(h07,'hospital'),(h08,'hospital'),(h09,'hospital'),(h10,'hospital'),
    (h11,'hospital'),(h12,'hospital'),(h13,'hospital'),(h14,'hospital'),(h15,'hospital')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.hospital_profiles
    (id, user_id, hospital_name, address, city, state, description, latitude, longitude, is_seed_data, data_source)
  VALUES
    (hp01, h01, 'Apollo Hospitals Jayanagar',
     '154/11, Opp. IIM-B, Bannerghatta Road, Jayanagar', 'Bengaluru', 'Karnataka',
     'Quaternary care hospital with India''s first da Vinci robotic surgery programme. 300-bed facility serving south Bangalore.',
     12.9308, 77.5839, true, 'seed'),
    (hp02, h02, 'Fortis Hospital Bannerghatta Road',
     '154/9, Bannerghatta Road, Opp. IIM-B', 'Bengaluru', 'Karnataka',
     'NABH-accredited 276-bed multi-specialty hospital with centres of excellence in cardiac sciences, neurology, and oncology.',
     12.8977, 77.5996, true, 'seed'),
    (hp03, h03, 'Manipal Hospital Old Airport Road',
     '98, HAL Old Airport Road, Kodihalli', 'Bengaluru', 'Karnataka',
     '600-bed tertiary care hospital. Asia''s leading multi-organ transplant centre with advanced robotics and minimal invasive surgery.',
     12.9599, 77.6488, true, 'seed'),
    (hp04, h04, 'Narayana Health City',
     'No.258/A, Bommasandra Industrial Area, Anekal Taluk', 'Bengaluru', 'Karnataka',
     'Asia''s largest heart hospital complex. Specialises in paediatric cardiac surgery, organ transplants, and oncology.',
     12.8384, 77.6783, true, 'seed'),
    (hp05, h05, 'Aster CMI Hospital',
     '43/2, New Airport Road, NH-7, Sahakara Nagar, Hebbal', 'Bengaluru', 'Karnataka',
     'JCI-accredited 514-bed hospital. Known for emergency care, intensive care, and minimally invasive surgery.',
     13.0475, 77.5946, true, 'seed'),
    (hp06, h06, 'Sakra World Hospital',
     '52/2, 1, Devarabisanahalli, Marathahalli', 'Bengaluru', 'Karnataka',
     'Joint venture with Japan''s Secom Medical. 350-bed hospital specialising in orthopaedics, neurology, and cardiology.',
     12.9577, 77.7015, true, 'seed'),
    (hp07, h07, 'Columbia Asia Hospital Whitefield',
     'ITPL Main Road, Brookefield, Whitefield', 'Bengaluru', 'Karnataka',
     '200-bed multi-specialty hospital serving East Bangalore''s IT corridor. Strong emergency and critical care departments.',
     12.9698, 77.7499, true, 'seed'),
    (hp08, h08, 'Cloudnine Hospital Jayanagar',
     'No. 12, First Main Road, Jayanagar 3rd Block', 'Bengaluru', 'Karnataka',
     'Specialised maternity and paediatric hospital. 60 beds, 3 NICUs, and 4 operation theatres. India''s leading chain for mother & child care.',
     12.9284, 77.5985, true, 'seed'),
    (hp09, h09, 'Vikram Hospital Millers Road',
     'Millers Road, Vasanthnagar', 'Bengaluru', 'Karnataka',
     '150-bed multi-specialty hospital with state-of-the-art diagnostics, AYUSH wing, and 24/7 emergency services.',
     13.0097, 77.5800, true, 'seed'),
    (hp10, h10, 'Kokilaben Dhirubhai Ambani Hospital',
     'Rao Saheb Achutrao Patwardhan Marg, Four Bungalows, Andheri West', 'Mumbai', 'Maharashtra',
     '750-bed NABH & JCI-accredited quaternary care hospital. Pioneers of proton therapy and robotic surgery in India.',
     19.1187, 72.8258, true, 'seed'),
    (hp11, h11, 'Lilavati Hospital and Research Centre',
     'A-791, Bandra Reclamation, Bandra West', 'Mumbai', 'Maharashtra',
     '323-bed multi-specialty private hospital. Well-regarded for cardiac care, neurosurgery, and transplantation services.',
     19.0534, 72.8239, true, 'seed'),
    (hp12, h12, 'Max Super Speciality Hospital Saket',
     '1, 2, Press Enclave Road, Saket Institutional Area, Saket', 'New Delhi', 'Delhi',
     '500-bed flagship hospital. Renowned for bone marrow transplants, liver transplantation, and advanced cardiac procedures.',
     28.5268, 77.2159, true, 'seed'),
    (hp13, h13, 'KIMS Hospitals Secunderabad',
     '1-8-31/1, Minister Road, Secunderabad', 'Hyderabad', 'Telangana',
     'NABH-accredited 1000-bed tertiary care hospital. Leading provider of cardiac, neuro, and trauma care in Hyderabad.',
     17.4239, 78.4987, true, 'seed'),
    (hp14, h14, 'Apollo Hospitals Greams Road',
     '21, Greams Lane, Off Greams Road, Thousand Lights', 'Chennai', 'Tamil Nadu',
     'Apollo''s flagship 700-bed hospital and the birthplace of corporate healthcare in India. Centres of excellence in 52 specialties.',
     13.0604, 80.2494, true, 'seed'),
    (hp15, h15, 'Ruby Hall Clinic',
     '40, Sassoon Road', 'Pune', 'Maharashtra',
     '450-bed multi-specialty hospital and one of Pune''s most trusted healthcare brands. Strong cardiac and renal transplant programmes.',
     18.5278, 73.8784, true, 'seed')
  ON CONFLICT (user_id) DO UPDATE SET
    hospital_name = EXCLUDED.hospital_name,
    address       = EXCLUDED.address,
    city          = EXCLUDED.city,
    state         = EXCLUDED.state,
    description   = EXCLUDED.description,
    latitude      = EXCLUDED.latitude,
    longitude     = EXCLUDED.longitude,
    is_seed_data  = TRUE,
    data_source   = 'seed';

  -- ══════════════════════════════════════════════════════════
  -- PROFESSIONAL AUTH USERS (20)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO auth.users
    (instance_id, id, aud, role, email, encrypted_password,
     email_confirmed_at, created_at, updated_at,
     raw_app_meta_data, raw_user_meta_data, is_super_admin)
  VALUES
    ('00000000-0000-0000-0000-000000000000', p01, 'authenticated', 'authenticated',
     'dr.arjun.sharma@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p02, 'authenticated', 'authenticated',
     'dr.priya.nair@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p03, 'authenticated', 'authenticated',
     'dr.suresh.kumar@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p04, 'authenticated', 'authenticated',
     'dr.deepa.menon@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p05, 'authenticated', 'authenticated',
     'dr.rajesh.verma@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p06, 'authenticated', 'authenticated',
     'dr.sanjay.reddy@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p07, 'authenticated', 'authenticated',
     'nurse.kavitha.sharma@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p08, 'authenticated', 'authenticated',
     'nurse.preethi.b@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p09, 'authenticated', 'authenticated',
     'rohan.nair.ot@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p10, 'authenticated', 'authenticated',
     'arun.kumar.lab@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p11, 'authenticated', 'authenticated',
     'dr.sunita.rao@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p12, 'authenticated', 'authenticated',
     'dr.mahesh.iyer@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p13, 'authenticated', 'authenticated',
     'dr.vinitha.menon@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p14, 'authenticated', 'authenticated',
     'nurse.swati.patil@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p15, 'authenticated', 'authenticated',
     'dr.kiran.joshi@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p16, 'authenticated', 'authenticated',
     'dr.ananya.singh@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p17, 'authenticated', 'authenticated',
     'nurse.meena.babu@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p18, 'authenticated', 'authenticated',
     'dr.prakash.nair@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p19, 'authenticated', 'authenticated',
     'vijay.thomas.lab@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false),
    ('00000000-0000-0000-0000-000000000000', p20, 'authenticated', 'authenticated',
     'dr.nandini.agarwal@medibrick-seed.internal', seed_pw, NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}', '{}', false)
  ON CONFLICT (id) DO NOTHING;

  -- ── Professional public profiles ───────────────────────────
  INSERT INTO public.profiles (id, full_name, email, phone, is_seed_data, data_source) VALUES
    (p01, 'Dr. Arjun Sharma',    'dr.arjun.sharma@medibrick-seed.internal',      '+91 98450 11001', true, 'seed'),
    (p02, 'Dr. Priya Nair',      'dr.priya.nair@medibrick-seed.internal',        '+91 98450 11002', true, 'seed'),
    (p03, 'Dr. Suresh Kumar',    'dr.suresh.kumar@medibrick-seed.internal',      '+91 98450 11003', true, 'seed'),
    (p04, 'Dr. Deepa Menon',     'dr.deepa.menon@medibrick-seed.internal',       '+91 98450 11004', true, 'seed'),
    (p05, 'Dr. Rajesh Verma',    'dr.rajesh.verma@medibrick-seed.internal',      '+91 98450 11005', true, 'seed'),
    (p06, 'Dr. Sanjay Reddy',    'dr.sanjay.reddy@medibrick-seed.internal',      '+91 98450 11006', true, 'seed'),
    (p07, 'Kavitha Sharma',      'nurse.kavitha.sharma@medibrick-seed.internal', '+91 98450 11007', true, 'seed'),
    (p08, 'Preethi B',           'nurse.preethi.b@medibrick-seed.internal',      '+91 98450 11008', true, 'seed'),
    (p09, 'Rohan Nair',          'rohan.nair.ot@medibrick-seed.internal',        '+91 98450 11009', true, 'seed'),
    (p10, 'Arun Kumar',          'arun.kumar.lab@medibrick-seed.internal',       '+91 98450 11010', true, 'seed'),
    (p11, 'Dr. Sunita Rao',      'dr.sunita.rao@medibrick-seed.internal',        '+91 98450 11011', true, 'seed'),
    (p12, 'Dr. Mahesh Iyer',     'dr.mahesh.iyer@medibrick-seed.internal',       '+91 98450 11012', true, 'seed'),
    (p13, 'Dr. Vinitha Menon',   'dr.vinitha.menon@medibrick-seed.internal',     '+91 98450 11013', true, 'seed'),
    (p14, 'Swati Patil',         'nurse.swati.patil@medibrick-seed.internal',    '+91 98450 11014', true, 'seed'),
    (p15, 'Dr. Kiran Joshi',     'dr.kiran.joshi@medibrick-seed.internal',       '+91 98450 11015', true, 'seed'),
    (p16, 'Dr. Ananya Singh',    'dr.ananya.singh@medibrick-seed.internal',      '+91 98450 11016', true, 'seed'),
    (p17, 'Meena Babu',          'nurse.meena.babu@medibrick-seed.internal',     '+91 98450 11017', true, 'seed'),
    (p18, 'Dr. Prakash Nair',    'dr.prakash.nair@medibrick-seed.internal',      '+91 98450 11018', true, 'seed'),
    (p19, 'Vijay Thomas',        'vijay.thomas.lab@medibrick-seed.internal',     '+91 98450 11019', true, 'seed'),
    (p20, 'Dr. Nandini Agarwal', 'dr.nandini.agarwal@medibrick-seed.internal',  '+91 98450 11020', true, 'seed')
  ON CONFLICT (id) DO UPDATE SET
    full_name    = EXCLUDED.full_name,
    is_seed_data = TRUE,
    data_source  = 'seed';

  INSERT INTO public.user_roles (user_id, role) VALUES
    (p01,'professional'),(p02,'professional'),(p03,'professional'),(p04,'professional'),
    (p05,'professional'),(p06,'professional'),(p07,'professional'),(p08,'professional'),
    (p09,'professional'),(p10,'professional'),(p11,'professional'),(p12,'professional'),
    (p13,'professional'),(p14,'professional'),(p15,'professional'),(p16,'professional'),
    (p17,'professional'),(p18,'professional'),(p19,'professional'),(p20,'professional')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- ── professional_profiles ──────────────────────────────────
  -- specialization values must match the SPECIALIZATIONS enum in PostJobDialog.tsx
  INSERT INTO public.professional_profiles
    (id, user_id, specialization, experience_years, qualifications, bio, available, is_seed_data, data_source)
  VALUES
    (pp01, p01, 'Medical Doctor (MD)', 8, 'MBBS (AFMC Pune), MD General Medicine (AIIMS)',
     'Eight years of post-residency experience in internal medicine across tertiary care centres. Strong interest in metabolic and lifestyle disorders.',
     true, true, 'seed'),
    (pp02, p02, 'Cardiologist', 12, 'MBBS (Grant Medical), MD, DM Cardiology (KEM Mumbai)',
     'Interventional cardiologist with 12 years of experience. Performed 1,200+ PCI procedures. Special interest in structural heart disease.',
     true, true, 'seed'),
    (pp03, p03, 'Surgeon', 10, 'MBBS (Mysore University), MS Orthopaedics (NIMHANS)',
     'Orthopaedic surgeon specialising in joint replacement and sports injuries. Trained at AIIMS Delhi under Dr R K Sharma.',
     true, true, 'seed'),
    (pp04, p04, 'Pediatrician', 7, 'MBBS (CMC Vellore), DCH, MD Paediatrics',
     'Consultant paediatrician with expertise in neonatal care and childhood developmental disorders. Fluent in Tamil, Malayalam, and Hindi.',
     true, true, 'seed'),
    (pp05, p05, 'Emergency Medicine Physician', 5, 'MBBS (Maulana Azad Medical), DEMS',
     'Emergency medicine specialist with experience across level-1 trauma centres. Certified ATLS, ACLS, and PALS provider.',
     true, true, 'seed'),
    (pp06, p06, 'Medical Doctor (MD)', 9, 'MBBS, MD (Internal Medicine), IDCCM Fellowship',
     'Critical care intensivist. Experienced in managing complex multi-organ failures, post-cardiac surgery ICU, and ventilator weaning.',
     true, true, 'seed'),
    (pp07, p07, 'Registered Nurse (RN)', 4, 'B.Sc Nursing (Rajiv Gandhi University)',
     'Staff nurse with 4 years of general ward experience in a 300-bed hospital. Skilled in IV therapy, wound care, and patient education.',
     true, true, 'seed'),
    (pp08, p08, 'Registered Nurse (RN)', 6, 'B.Sc Nursing (Manipal University), CCRN Certification',
     'ICU nurse with 6 years of critical care experience. Expert in haemodynamic monitoring, ventilator management, and CVVHDF.',
     true, true, 'seed'),
    (pp09, p09, 'Other', 3, 'B.Sc OT Technology (JSS University)',
     'Qualified OT technician experienced in setting up and assisting in general, orthopaedic, and laparoscopic surgical procedures.',
     true, true, 'seed'),
    (pp10, p10, 'Medical Technologist', 5, 'B.Sc DMLT (Bangalore University)',
     'Lab technician with 5 years of experience in biochemistry, haematology, and microbiology sections of a NABL-accredited lab.',
     true, true, 'seed'),
    (pp11, p11, 'Physical Therapist', 4, 'B.Sc Physiotherapy (Manipal), MPT Neurology',
     'Physiotherapist specialising in neuro rehabilitation and post-stroke recovery. Uses evidence-based approaches including Bobath and PNF.',
     true, true, 'seed'),
    (pp12, p12, 'Ayurvedic Practitioner', 6, 'BAMS (Rajiv Gandhi University of Health Sciences)',
     'Ayurvedic physician with expertise in Panchakarma, Ksharasutra, and management of lifestyle diseases through classical Ayurvedic protocols.',
     true, true, 'seed'),
    (pp13, p13, 'Medical Doctor (MD)', 3, 'MBBS (St. John''s Medical College, Bangalore)',
     'Junior physician with 3 years of post-residency practice. Experienced in primary care, OPD consultations, and acute ward management.',
     false, true, 'seed'),
    (pp14, p14, 'Registered Nurse (RN)', 2, 'B.Sc Nursing (Symbiosis)',
     'Newly registered nurse with 2 years of ward experience in a 200-bed hospital in Pune. Enthusiastic and dedicated to patient-centred care.',
     true, true, 'seed'),
    (pp15, p15, 'Cardiologist', 15, 'MBBS, MD (Cardiology), FACC, FSCAI (USA)',
     'Senior interventional cardiologist with fellowship training at Cleveland Clinic. 15 years of experience; 2,800+ PCI and 40+ TAVI procedures.',
     true, true, 'seed'),
    (pp16, p16, 'Surgeon', 8, 'MBBS (MAMC Delhi), MS (Ortho), FNB (Joint Replacement)',
     'Orthopaedic surgeon with fellowship in joint replacement surgery from Germany. Special interest in hip and knee arthroplasty.',
     true, true, 'seed'),
    (pp17, p17, 'Registered Nurse (RN)', 4, 'B.Sc Nursing (NTR University), CCRN',
     'ICU nurse with 4 years of MICU and SICU experience at a 500-bed corporate hospital. Proficient in arterial lines, IABP monitoring.',
     true, true, 'seed'),
    (pp18, p18, 'Emergency Medicine Physician', 11, 'MBBS (JIPMER), MD Emergency Medicine, FCEM (UK)',
     'Emergency medicine consultant trained in the UK. Leads resuscitation teams and trauma response. Special interest in POCUS and toxicology.',
     true, true, 'seed'),
    (pp19, p19, 'Medical Technologist', 7, 'B.Sc DMLT, M.Sc Medical Biochemistry',
     'Senior lab technician with 7 years in clinical biochemistry. Experienced in LIS integration, QC management, and NABL audit preparation.',
     false, true, 'seed'),
    (pp20, p20, 'Physical Therapist', 2, 'B.Sc Physiotherapy (Pune University)',
     'Physiotherapist with 2 years of experience in musculoskeletal rehabilitation and post-surgical recovery. Certified Kinesio Taping practitioner.',
     true, true, 'seed')
  ON CONFLICT (user_id) DO UPDATE SET
    specialization   = EXCLUDED.specialization,
    experience_years = EXCLUDED.experience_years,
    qualifications   = EXCLUDED.qualifications,
    bio              = EXCLUDED.bio,
    available        = EXCLUDED.available,
    is_seed_data     = TRUE,
    data_source      = 'seed';

  -- ══════════════════════════════════════════════════════════
  -- JOB POSTS (20)
  -- All shift_date values are in the future; validate_shift_date trigger will pass.
  -- department + required_specialization must match the enums in PostJobDialog.tsx.
  -- ══════════════════════════════════════════════════════════
  INSERT INTO public.job_posts
    (id, hospital_id, title, department, description,
     shift_date, shift_start_time, shift_end_time,
     required_specialization, compensation, status, is_seed_data, data_source)
  VALUES
    -- ── Bengaluru ──
    (j01, hp01, 'Emergency Medicine Physician',
     'Emergency', '8-hour Emergency Department shift at Apollo Jayanagar. The ED sees 200+ patients per day. Candidate must be ATLS certified and comfortable managing polytrauma, MI, and stroke. Team includes 3 nurses and 1 senior resident.',
     '2026-07-15', '08:00', '16:00', 'Emergency Medicine Physician', 15000.00, 'open', true, 'seed'),

    (j02, hp02, 'ICU Specialist – Cardiac Surgery ICU',
     'Intensive Care Unit (ICU)', 'Overnight shift in the Cardiac Surgery ICU at Fortis Bannerghatta. Manage post-CABG and valve replacement patients. Candidate must have IDCCM fellowship or equivalent ICU experience (min 3 years). Familiarity with IABP and ECMO preferred.',
     '2026-07-20', '20:00', '08:00', 'Medical Doctor (MD)', 18000.00, 'open', true, 'seed'),

    (j03, hp03, 'General Physician – OPD',
     'General Medicine', 'Day OPD shift managing 60–80 outpatient consultations. Mix of follow-up and new cases covering diabetes, hypertension, and respiratory conditions. Prescription writing in Manipal''s EMR system required.',
     '2026-07-10', '09:00', '17:00', 'Medical Doctor (MD)', 8000.00, 'open', true, 'seed'),

    (j04, hp04, 'Consultant Cardiologist – Cath Lab',
     'Cardiology', 'Full-day cath lab shift at Narayana Health City. Duties include diagnostic coronary angiography and elective PCI. Candidate should be DM Cardiology with minimum 2 years of independent cath lab experience. 6–8 cases per shift expected.',
     '2026-07-25', '08:00', '17:00', 'Cardiologist', 20000.00, 'open', true, 'seed'),

    (j05, hp05, 'Staff Nurse – General Ward',
     'General Medicine', 'Day shift in the 40-bed general medicine ward at Aster CMI. Responsibilities include IV administration, wound dressing, vital monitoring, and documentation in HIS. NABH compliance required.',
     '2026-08-01', '07:00', '15:00', 'Registered Nurse (RN)', 3500.00, 'open', true, 'seed'),

    (j06, hp06, 'ICU Nurse – MICU',
     'Intensive Care Unit (ICU)', 'Night shift in the 20-bed Medical ICU at Sakra World Hospital. Responsibilities include haemodynamic monitoring, ventilator management, and CVVHDF care. CCRN preferred.',
     '2026-07-28', '20:00', '08:00', 'Registered Nurse (RN)', 4500.00, 'open', true, 'seed'),

    (j07, hp08, 'Consultant Pediatrician – NICU & OPD',
     'Pediatrics', 'Day shift covering NICU rounds and paediatric OPD at Cloudnine Jayanagar. Candidate should be DCH/MD Paediatrics with NICU experience. Expected patient load: 8 NICU patients + 20 OPD consultations.',
     '2026-08-05', '08:00', '16:00', 'Pediatrician', 12000.00, 'open', true, 'seed'),

    (j08, hp07, 'Orthopaedic Surgeon – Joint Replacement',
     'Orthopedics', 'Elective operating list at Columbia Asia Whitefield: 2 primary total knee replacements and 1 revision hip surgery. Implants provided. Candidate must be MS Ortho with FNB or equivalent fellowship in joint replacement.',
     '2026-07-30', '08:00', '16:00', 'Surgeon', 16000.00, 'open', true, 'seed'),

    (j09, hp03, 'OT Technician – General Surgery OT',
     'Surgery', 'Day shift assisting in laparoscopic cholecystectomy and hernia repair cases at Manipal. Responsibilities include instrument count, trolley setup, positioning, and sterile field maintenance.',
     '2026-08-10', '07:30', '15:30', 'Other', 2500.00, 'open', true, 'seed'),

    (j10, hp09, 'Lab Technician – Biochemistry',
     'Pathology', 'Morning shift in the biochemistry section of Vikram Hospital''s NABL-accredited central laboratory. Process 300+ samples per shift. Experience with Beckman Coulter AU5800 or equivalent analyser preferred.',
     '2026-08-15', '06:00', '14:00', 'Medical Technologist', 2000.00, 'open', true, 'seed'),

    (j17, hp09, 'Ayurvedic Physician – AYUSH OPD',
     'Other', 'OPD and inpatient consultation shift in Vikram Hospital''s AYUSH wing. Duties include Panchakarma assessments, classical Ayurvedic prescriptions, and follow-up of chronic patients enrolled in the wellness programme.',
     '2026-08-08', '09:00', '17:00', 'Ayurvedic Practitioner', 7000.00, 'open', true, 'seed'),

    (j18, hp02, 'Orthopaedic Surgeon – Trauma List',
     'Orthopedics', 'Trauma operating session at Fortis Bannerghatta. Cases include closed femur nailing, tibial ORIF, and DHS for hip fractures. Candidate must be comfortable with polytrauma and have their own surgical identity card.',
     '2026-07-22', '09:00', '17:00', 'Surgeon', 18000.00, 'open', true, 'seed'),

    (j19, hp04, 'ICU Nurse – Paediatric ICU',
     'Intensive Care Unit (ICU)', 'Evening shift in the 12-bed Paediatric ICU at Narayana Health City. Candidate must have PICU experience. Responsibilities include neonatal ventilator care, total parenteral nutrition management, and PICC line care.',
     '2026-08-12', '14:00', '22:00', 'Registered Nurse (RN)', 4000.00, 'open', true, 'seed'),

    (j20, hp05, 'Emergency Medicine Physician – Night',
     'Emergency', '12-hour night Emergency shift at Aster CMI Hebbal. High footfall ED; candidate must be comfortable managing chest pain protocols, sepsis bundles, and paediatric emergencies. ACLS mandatory.',
     '2026-09-20', '20:00', '08:00', 'Emergency Medicine Physician', 16000.00, 'open', true, 'seed'),

    -- ── Mumbai ──
    (j11, hp10, 'Emergency Medicine Physician',
     'Emergency', 'Day Emergency shift at Kokilaben Hospital Andheri. Level-1 trauma centre with helipad. Candidate must be comfortable with mass casualty incident protocols. Works alongside Emergency Medicine residents and nursing staff.',
     '2026-08-20', '08:00', '20:00', 'Emergency Medicine Physician', 18000.00, 'open', true, 'seed'),

    (j12, hp11, 'Interventional Cardiologist',
     'Cardiology', 'Cath lab and CCU shift at Lilavati Hospital Bandra. Morning list includes 4–5 diagnostic angiograms and 1–2 PCIs. Afternoon CCU rounds with 15-bed capacity. DM Cardiology required; FACC preferred.',
     '2026-08-25', '08:00', '18:00', 'Cardiologist', 22000.00, 'open', true, 'seed'),

    -- ── Delhi ──
    (j13, hp12, 'Staff Nurse – Bone Marrow Transplant Unit',
     'General Medicine', 'Day shift in the 18-bed BMT unit at Max Saket. Candidate must be experienced in managing immunocompromised patients, central line care, and graft-versus-host disease (GvHD) monitoring. BMT nursing experience preferred.',
     '2026-09-01', '07:00', '15:00', 'Registered Nurse (RN)', 4000.00, 'open', true, 'seed'),

    -- ── Hyderabad ──
    (j14, hp13, 'ICU Intensivist',
     'Intensive Care Unit (ICU)', 'Day shift in the 30-bed mixed MICU/SICU at KIMS Secunderabad. Candidate must have IDCCM or equivalent with experience managing post-operative cardiac and neuro cases. Independent decision-making required.',
     '2026-09-05', '08:00', '20:00', 'Medical Doctor (MD)', 16000.00, 'open', true, 'seed'),

    -- ── Chennai ──
    (j15, hp14, 'General Physician – Ward Rounds',
     'General Medicine', 'Day ward round shift at Apollo Chennai covering 30 inpatients in the general medicine block. Mix of post-operative monitoring and medical admissions. EMR documentation in Apollo''s proprietary HIS.',
     '2026-09-10', '08:00', '16:00', 'Medical Doctor (MD)', 9000.00, 'open', true, 'seed'),

    -- ── Pune ──
    (j16, hp15, 'Physiotherapist – Cardiac Rehab',
     'Other', 'Morning shift in the cardiac rehabilitation programme at Ruby Hall Clinic. Sessions include post-CABG mobilisation, supervised exercise therapy, and patient education. MPT Cardiopulmonary preferred.',
     '2026-09-15', '07:00', '13:00', 'Physical Therapist', 5000.00, 'open', true, 'seed')

  ON CONFLICT (id) DO UPDATE SET
    title                  = EXCLUDED.title,
    department             = EXCLUDED.department,
    description            = EXCLUDED.description,
    shift_date             = EXCLUDED.shift_date,
    shift_start_time       = EXCLUDED.shift_start_time,
    shift_end_time         = EXCLUDED.shift_end_time,
    required_specialization= EXCLUDED.required_specialization,
    compensation           = EXCLUDED.compensation,
    status                 = EXCLUDED.status,
    is_seed_data           = TRUE,
    data_source            = 'seed';

  -- ══════════════════════════════════════════════════════════
  -- APPLICATIONS (21)
  -- Distribution:
  --   j01 Emergency Apollo BLR     → 3 applicants (high demand)
  --   j03 Gen Physician Manipal    → 3 applicants (high demand)
  --   j04 Cardiologist Narayana    → 2 applicants
  --   j05 Staff Nurse Aster        → 3 applicants (high demand; 1 accepted, 1 rejected)
  --   j06 ICU Nurse Sakra          → 1 applicant
  --   j07 Pediatrician Cloudnine   → 1 applicant
  --   j08 Ortho Columbia Asia      → 2 applicants
  --   j11 Emergency Kokilaben MUM  → 2 applicants
  --   j12 Cardiologist Lilavati    → 1 applicant (accepted)
  --   j15 Gen Physician Apollo CHN → 1 applicant
  --   j18 Ortho Fortis BLR         → 1 applicant
  --   j19 ICU Nurse Narayana       → 1 applicant
  --   j02,j09,j10,j13,j14,j16,j17,j20 → 0 applicants (helps test empty state)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO public.applications
    (id, job_id, professional_id, cover_letter, status, is_seed_data, data_source)
  VALUES
    -- j01: Emergency Apollo BLR (3 applicants)
    (ap01, j01, pp05,
     'I am an ATLS and ACLS-certified emergency physician with 5 years of ED experience at a 400-bed trauma centre. Available for the 15 July shift.',
     'pending', true, 'seed'),
    (ap02, j01, pp18,
     'Senior emergency medicine consultant trained at Aintree University Hospital, UK. Well-versed in POCUS and mass casualty protocols. Happy to discuss further.',
     'accepted', true, 'seed'),
    (ap03, j01, pp13,
     'I have managed emergency OPD at St. John''s during my residency. Looking to build EM experience; am comfortable with triage and acute presentations.',
     'pending', true, 'seed'),

    -- j03: Gen Physician Manipal BLR (3 applicants)
    (ap04, j03, pp01,
     'Eight years of general medicine experience. Comfortable with Manipal''s EMR from a previous locum engagement at their Malleshwaram branch.',
     'pending', true, 'seed'),
    (ap05, j03, pp13,
     'Seeking additional OPD exposure alongside my primary posting. Available on 10 July and can manage the full 80-patient load.',
     'pending', true, 'seed'),
    (ap06, j03, pp06,
     'ICU specialist interested in expanding outpatient practice. Available for one-off OPD shifts. Comfortable with internal medicine consultations.',
     'pending', true, 'seed'),

    -- j04: Cardiologist Narayana BLR (2 applicants)
    (ap07, j04, pp02,
     'Interventional cardiologist with 12 years of cath lab experience. Performed independent PCIs at KEM and Apollo. Available 25 July.',
     'pending', true, 'seed'),
    (ap08, j04, pp15,
     'Senior interventional cardiologist with FACC. Experienced in complex bifurcation PCI and TAVI. Can handle 8+ cases per shift comfortably.',
     'pending', true, 'seed'),

    -- j05: Staff Nurse Aster BLR (3 applicants; 1 accepted, 1 rejected)
    (ap09, j05, pp07,
     'Four years of general ward nursing at a NABH-accredited hospital. Trained in NABH documentation protocols. Immediately available.',
     'accepted', true, 'seed'),
    (ap10, j05, pp14,
     'Registered nurse with 2 years of ward experience at Ruby Hall Pune. Relocating to Bengaluru. Looking for a trial shift to demonstrate capabilities.',
     'rejected', true, 'seed'),
    (ap11, j05, pp08,
     'ICU nurse with ward rotation experience. Flexible to work general ward shifts when ICU census is low. NABH-compliant documentation.',
     'pending', true, 'seed'),

    -- j06: ICU Nurse Sakra BLR (1 applicant)
    (ap12, j06, pp08,
     'Six years of MICU experience at a 500-bed corporate hospital in Bengaluru. Expert in CVVHDF setup and haemodynamic monitoring. Night shifts preferred.',
     'pending', true, 'seed'),

    -- j07: Pediatrician Cloudnine BLR (1 applicant)
    (ap13, j07, pp04,
     'MD Paediatrician with NICU experience at CMC Vellore. Comfortable with NICU rounds and high-volume OPD. Available 5 August.',
     'pending', true, 'seed'),

    -- j08: Ortho Surgeon Columbia Asia BLR (2 applicants)
    (ap14, j08, pp03,
     'Orthopaedic surgeon with 10 years'' experience in joint replacement. Trained at AIIMS. Happy to use Columbia Asia''s preferred Zimmer implants.',
     'pending', true, 'seed'),
    (ap15, j08, pp16,
     'FNB-trained joint replacement surgeon. Experienced in primary and revision arthroplasty. Can handle the TKR and revision hip on the list.',
     'pending', true, 'seed'),

    -- j11: Emergency Kokilaben Mumbai (2 applicants)
    (ap16, j11, pp05,
     'Emergency physician available for Mumbai shift. Comfortable with level-1 trauma protocols and MCI response. Can travel.',
     'pending', true, 'seed'),
    (ap17, j11, pp18,
     'Willing to cover the Mumbai ED. FCEM-trained with experience in UK level-1 centre. Well-versed in Kokilaben''s JCI protocols.',
     'pending', true, 'seed'),

    -- j12: Cardiologist Lilavati Mumbai (1 applicant; accepted)
    (ap18, j12, pp15,
     'Senior interventional cardiologist with FACC. Familiar with Lilavati''s cath lab setup from a previous visiting consultant engagement.',
     'accepted', true, 'seed'),

    -- j15: Gen Physician Apollo Chennai (1 applicant)
    (ap19, j15, pp01,
     'General physician with EMR experience from Apollo Jayanagar. Comfortable with Apollo HIS system. Available for the 10 September shift in Chennai.',
     'pending', true, 'seed'),

    -- j18: Ortho Trauma Fortis BLR (1 applicant)
    (ap20, j18, pp03,
     'Experienced in polytrauma orthopaedic surgery. Have performed femur nailing and tibial ORIF independently. Available 22 July.',
     'pending', true, 'seed'),

    -- j19: ICU Nurse Narayana PICU BLR (1 applicant)
    (ap21, j19, pp17,
     'ICU nurse with PICU rotation experience at a 1000-bed corporate hospital. Comfortable with neonatal ventilators and TPN management. Evening shifts preferred.',
     'pending', true, 'seed')

  ON CONFLICT (id) DO UPDATE SET
    cover_letter = EXCLUDED.cover_letter,
    status       = EXCLUDED.status,
    is_seed_data = TRUE,
    data_source  = 'seed';

  -- Enrich hospital public profile fields for demo/testing
  UPDATE public.hospital_profiles SET
    hospital_type = 'hospital',
    is_verified = TRUE,
    verified_at = NOW(),
    nabh_accredited = TRUE,
    years_in_operation = 25,
    phone = '+91 80 2222 1000',
    website = 'https://www.manipalhospitals.com',
    mission = 'Delivering affordable, accessible healthcare with clinical excellence.',
    specialties = ARRAY['Cardiology', 'Orthopedics', 'Emergency Medicine', 'Neurology', 'Oncology'],
    departments = ARRAY['Emergency', 'ICU', 'Cardiology', 'Orthopedics', 'Pediatrics'],
    certifications = ARRAY['NABH', 'JCI'],
    awards = ARRAY['Best Multi-Speciality Hospital — Karnataka 2024']
  WHERE id = hp03;

  UPDATE public.hospital_profiles SET
    hospital_type = 'hospital',
    is_verified = TRUE,
    verified_at = NOW(),
    nabh_accredited = TRUE,
    years_in_operation = 18,
    phone = '+91 80 2222 2000',
    mission = 'Excellence in patient care through innovation and compassion.',
    specialties = ARRAY['Cardiology', 'Neurology', 'Oncology', 'Emergency Medicine'],
    departments = ARRAY['Emergency', 'ICU', 'Cardiology', 'Surgery'],
    certifications = ARRAY['NABH']
  WHERE id = hp02;

  UPDATE public.hospital_profiles SET
    hospital_type = 'hospital',
    is_verified = TRUE,
    verified_at = NOW(),
    years_in_operation = 12,
    mission = 'Quality healthcare for the IT corridor of Bangalore.',
    specialties = ARRAY['Emergency Medicine', 'Orthopedics', 'General Medicine'],
    departments = ARRAY['Emergency', 'ICU', 'Orthopedics']
  WHERE id = hp06;

  UPDATE public.hospital_profiles SET
    hospital_type = 'hospital',
    is_verified = TRUE,
    nabh_accredited = TRUE,
    years_in_operation = 30,
    certifications = ARRAY['NABH', 'JCI']
  WHERE id IN (hp01, hp10, hp13, hp14);

  INSERT INTO public.hospital_reviews
    (hospital_id, rating, review_text, role_title, specialty, shift_completed_date, is_seed_data, data_source)
  VALUES
    (hp03, 5, 'Well organized shifts. Payments received on time. ICU team was supportive throughout the night shift.', 'ICU Nurse', 'Critical Care', DATE '2026-05-15', TRUE, 'seed'),
    (hp03, 5, 'Good support staff and clear handover process. Would work here again.', 'General Physician', 'Internal Medicine', DATE '2026-04-20', TRUE, 'seed'),
    (hp03, 4, 'Professional environment. Shift timings were as advertised.', 'Staff Nurse', 'General Nursing', DATE '2026-03-10', TRUE, 'seed'),
    (hp02, 5, 'Smooth onboarding for locum shift. Hospital admin was responsive.', 'Emergency Physician', 'Emergency Medicine', DATE '2026-05-01', TRUE, 'seed'),
    (hp02, 4, 'Busy emergency department but well-staffed. Compensation was fair.', 'Staff Nurse', 'Emergency Nursing', DATE '2026-04-12', TRUE, 'seed'),
    (hp06, 5, 'Excellent coordination for orthopaedic OT shift. Highly recommend.', 'OT Technician', 'Operation Theatre', DATE '2026-06-01', TRUE, 'seed'),
    (hp06, 5, 'Payments on time. Clear shift expectations communicated upfront.', 'ICU Nurse', 'Critical Care', DATE '2026-05-22', TRUE, 'seed');

  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Seed complete.';
  RAISE NOTICE '  Hospitals    : 15';
  RAISE NOTICE '  Professionals: 20';
  RAISE NOTICE '  Jobs         : 20';
  RAISE NOTICE '  Applications : 21';
  RAISE NOTICE '  Password     : Seed@2026!';
  RAISE NOTICE '====================================================';
END $$;

-- ── Quick verification queries ─────────────────────────────
-- Run these after seeding to confirm all rows were inserted:
--
-- SELECT COUNT(*) FROM public.hospital_profiles WHERE is_seed_data = TRUE;   -- 15
-- SELECT COUNT(*) FROM public.professional_profiles WHERE is_seed_data = TRUE; -- 20
-- SELECT COUNT(*) FROM public.job_posts WHERE is_seed_data = TRUE;             -- 20
-- SELECT COUNT(*) FROM public.applications WHERE is_seed_data = TRUE;          -- 21
--
-- ── Full rollback ──────────────────────────────────────────
-- DELETE FROM public.applications       WHERE is_seed_data = TRUE;
-- DELETE FROM public.job_posts          WHERE is_seed_data = TRUE;
-- DELETE FROM public.professional_profiles WHERE is_seed_data = TRUE;
-- DELETE FROM public.hospital_profiles  WHERE is_seed_data = TRUE;
-- DELETE FROM public.user_roles         WHERE user_id IN (SELECT id FROM public.profiles WHERE is_seed_data = TRUE);
-- DELETE FROM auth.users                WHERE id IN (SELECT id FROM public.profiles WHERE is_seed_data = TRUE);
-- DELETE FROM public.profiles           WHERE is_seed_data = TRUE;
