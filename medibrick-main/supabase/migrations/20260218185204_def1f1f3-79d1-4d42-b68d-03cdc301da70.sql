
DO $$
DECLARE
  h1_uid uuid := gen_random_uuid();
  h2_uid uuid := gen_random_uuid();
  h3_uid uuid := gen_random_uuid();
  h4_uid uuid := gen_random_uuid();
  h5_uid uuid := gen_random_uuid();
  h1_id uuid := gen_random_uuid();
  h2_id uuid := gen_random_uuid();
  h3_id uuid := gen_random_uuid();
  h4_id uuid := gen_random_uuid();
  h5_id uuid := gen_random_uuid();
BEGIN

  -- ── Hospital Auth Users (no role in metadata to avoid trigger bug) ──
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  VALUES
    (h1_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'apollo.mumbai@testhospital.com', crypt('Hospital@1234', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Apollo Hospital Mumbai"}', now(), now(), '', '', '', '', '', '', '', ''),
    (h2_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fortis.delhi@testhospital.com', crypt('Hospital@1234', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Fortis Hospital Delhi"}', now(), now(), '', '', '', '', '', '', '', ''),
    (h3_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manipal.bangalore@testhospital.com', crypt('Hospital@1234', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Manipal Hospital Bangalore"}', now(), now(), '', '', '', '', '', '', '', ''),
    (h4_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'miot.chennai@testhospital.com', crypt('Hospital@1234', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"MIOT International Chennai"}', now(), now(), '', '', '', '', '', '', '', ''),
    (h5_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'yashoda.hyderabad@testhospital.com', crypt('Hospital@1234', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Yashoda Hospital Hyderabad"}', now(), now(), '', '', '', '', '', '', '', '');

  -- ── Roles ──
  INSERT INTO public.user_roles (user_id, role) VALUES
    (h1_uid, 'hospital'), (h2_uid, 'hospital'), (h3_uid, 'hospital'), (h4_uid, 'hospital'), (h5_uid, 'hospital');

  -- ── Hospital Profiles ──
  INSERT INTO public.hospital_profiles (id, user_id, hospital_name, city, state, address, latitude, longitude, description, slug)
  VALUES
    (h1_id, h1_uid, 'Apollo Hospital Mumbai', 'Mumbai', 'Maharashtra', 'Parsik Hill Road, Sector 23, CBD Belapur, Navi Mumbai, Maharashtra 400614', 19.0219, 73.0366, 'Apollo Hospitals is one of India''s premier multi-specialty hospital groups. Our Mumbai facility offers 24/7 emergency, ICU, cardiology, and surgical services.', 'apollo-hospital-mumbai'),
    (h2_id, h2_uid, 'Fortis Hospital Delhi', 'New Delhi', 'Delhi', 'Sector B, Pocket 1, Aruna Asaf Ali Marg, Vasant Kunj, New Delhi, Delhi 110070', 28.5250, 77.1567, 'Fortis Delhi is a leading tertiary care hospital providing excellence in cardiac sciences, oncology, neurology and orthopedics.', 'fortis-hospital-delhi'),
    (h3_id, h3_uid, 'Manipal Hospital Bangalore', 'Bengaluru', 'Karnataka', '98, HAL Airport Road, Kodihalli, Bengaluru, Karnataka 560017', 12.9607, 77.6477, 'Manipal Hospitals is a NABH-accredited multi-specialty hospital known for advanced surgical procedures and critical care in South India.', 'manipal-hospital-bangalore'),
    (h4_id, h4_uid, 'MIOT International Chennai', 'Chennai', 'Tamil Nadu', '4/112, Mount Poonamallee Road, Manapakkam, Chennai, Tamil Nadu 600089', 13.0159, 80.1681, 'MIOT International is a JCI-accredited hospital specializing in orthopedics, cardiac surgery, and organ transplants.', 'miot-international-chennai'),
    (h5_id, h5_uid, 'Yashoda Hospital Hyderabad', 'Hyderabad', 'Telangana', 'Raj Bhavan Road, Somajiguda, Hyderabad, Telangana 500082', 17.4239, 78.4738, 'Yashoda Hospitals is a 1000+ bed multi-specialty hospital with centers of excellence in cardiology, neurology and gastroenterology.', 'yashoda-hospital-hyderabad');

  -- ════════════════════════════════
  -- ── Apollo Mumbai — 5 Jobs ──
  -- ════════════════════════════════
  INSERT INTO public.job_posts (hospital_id, title, department, required_specialization, description, shift_date, shift_start_time, shift_end_time, compensation, status) VALUES
    (h1_id, 'Emergency Medicine Cover', 'Emergency', 'Emergency Medicine Physician', 'Seeking an experienced emergency medicine physician for weekend cover in our Level 1 trauma center. Must be comfortable with high-volume, fast-paced ED.', CURRENT_DATE + 2, '08:00', '20:00', 3500, 'open'),
    (h1_id, 'ICU Night Shift Physician', 'Intensive Care Unit (ICU)', 'Medical Doctor (MD)', 'Intensivist required for overnight ICU coverage. 20-bed medical ICU. Ventilator management and CRRT experience preferred.', CURRENT_DATE + 3, '20:00', '08:00', 4500, 'open'),
    (h1_id, 'Pediatric OPD Doctor', 'Pediatrics', 'Pediatrician', 'Pediatrician for busy OPD session. Approximately 30–40 patients expected. Comfortable with vaccinations and growth assessments.', CURRENT_DATE + 4, '09:00', '14:00', 2000, 'open'),
    (h1_id, 'Senior Staff Nurse – ICU', 'Intensive Care Unit (ICU)', 'Registered Nurse (RN)', 'ICU-trained senior nurse required for day shift. Experience with invasive monitoring, ventilators, and vasoactive drugs essential.', CURRENT_DATE + 1, '07:00', '19:00', 1200, 'open'),
    (h1_id, 'Anesthesia Cover – OT', 'Anesthesiology', 'Anesthesiologist', 'Anesthesiologist required for elective OT list (4 cases). GA and spinal experience required. OT team and equipment provided.', CURRENT_DATE + 5, '07:30', '15:30', 5000, 'open');

  -- ════════════════════════════════
  -- ── Fortis Delhi — 5 Jobs ──
  -- ════════════════════════════════
  INSERT INTO public.job_posts (hospital_id, title, department, required_specialization, description, shift_date, shift_start_time, shift_end_time, compensation, status) VALUES
    (h2_id, 'Cardiologist – Cath Lab', 'Cardiology', 'Medical Doctor (MD)', 'Interventional cardiologist needed for cath lab sessions. PTCA and stenting experience mandatory. Weekend availability preferred.', CURRENT_DATE + 3, '08:00', '16:00', 7000, 'open'),
    (h2_id, 'Neurology Ward Round Cover', 'Neurology', 'Neurologist', 'Neurologist required for morning ward rounds in 30-bed neurology unit. Stroke protocol experience essential.', CURRENT_DATE + 2, '07:00', '13:00', 3000, 'open'),
    (h2_id, 'General Surgery Assist', 'Surgery', 'Surgeon', 'Surgical assistant needed for laparoscopic general surgery list. 3–5 cases expected. Fellowship in MIS preferred.', CURRENT_DATE + 6, '09:00', '17:00', 4000, 'open'),
    (h2_id, 'Night Duty Nurse – Oncology', 'Oncology', 'Registered Nurse (RN)', 'Experienced oncology nurse for 12-hour night shift. Chemo administration certification required.', CURRENT_DATE + 1, '19:00', '07:00', 1400, 'open'),
    (h2_id, 'Radiology Reporting', 'Radiology', 'Radiologist', 'Radiologist required for CT and MRI reporting session (approx. 40 studies). Neuroradiology subspecialty a plus.', CURRENT_DATE + 4, '10:00', '18:00', 5500, 'open');

  -- ════════════════════════════════
  -- ── Manipal Bangalore — 5 Jobs ──
  -- ════════════════════════════════
  INSERT INTO public.job_posts (hospital_id, title, department, required_specialization, description, shift_date, shift_start_time, shift_end_time, compensation, status) VALUES
    (h3_id, 'Orthopedic Surgery Cover', 'Orthopedics', 'Surgeon', 'Orthopedic surgeon for trauma OT cover. Hip, knee and spine cases. Must be able to operate independently.', CURRENT_DATE + 2, '08:00', '20:00', 6000, 'open'),
    (h3_id, 'NICU Staff Nurse', 'Pediatrics', 'Registered Nurse (RN)', 'NICU-trained nurse for 12-hour day shift. Experience with premature infants and neonatal ventilation required.', CURRENT_DATE + 3, '07:00', '19:00', 1300, 'open'),
    (h3_id, 'Psychiatry Consult Physician', 'Psychiatry', 'Medical Doctor (MD)', 'Psychiatrist needed for inpatient consultation liaison service. Comfortable handling delirium, capacity assessments and crisis intervention.', CURRENT_DATE + 5, '09:00', '17:00', 4500, 'open'),
    (h3_id, 'Emergency Night Physician', 'Emergency', 'Emergency Medicine Physician', 'MBBS/MD doctor for emergency night shift. Trauma resuscitation and procedural skills (intubation, chest drain) essential.', CURRENT_DATE + 1, '20:00', '08:00', 3800, 'open'),
    (h3_id, 'Physiotherapy – Post-Op', 'General Medicine', 'Physical Therapist', 'Physiotherapist for post-operative rehabilitation sessions across orthopedic and cardiac units. 6-hour shift.', CURRENT_DATE + 4, '08:00', '14:00', 1500, 'open');

  -- ════════════════════════════════
  -- ── MIOT Chennai — 5 Jobs ──
  -- ════════════════════════════════
  INSERT INTO public.job_posts (hospital_id, title, department, required_specialization, description, shift_date, shift_start_time, shift_end_time, compensation, status) VALUES
    (h4_id, 'Cardiac Anesthesia', 'Anesthesiology', 'Anesthesiologist', 'Cardiac anesthesiologist for CABG and valve replacement cases. TEE certification required. Premium pay.', CURRENT_DATE + 3, '07:00', '19:00', 8000, 'open'),
    (h4_id, 'ICU Staff Nurse – Cardiac', 'Intensive Care Unit (ICU)', 'Registered Nurse (RN)', 'CCU nurse experienced with post-cardiac surgery monitoring. IABP and pacing wire management experience preferred.', CURRENT_DATE + 2, '07:00', '19:00', 1500, 'open'),
    (h4_id, 'Obstetrics & Gynecology Cover', 'Obstetrics & Gynecology', 'Medical Doctor (MD)', 'Obs & Gynae doctor for labor ward and OT cover. LSCS and assisted delivery experience essential.', CURRENT_DATE + 1, '08:00', '20:00', 4000, 'open'),
    (h4_id, 'Dermatology OPD', 'Dermatology', 'Medical Doctor (MD)', 'Dermatologist for Saturday OPD clinic (approx 25 patients). Aesthetic and medical dermatology experience welcome.', CURRENT_DATE + 6, '10:00', '15:00', 2500, 'open'),
    (h4_id, 'Pathology Lab Physician', 'Pathology', 'Medical Doctor (MD)', 'Pathologist needed for histopathology and FNAC reporting. AP and CP board certification preferred.', CURRENT_DATE + 5, '09:00', '17:00', 4200, 'open');

  -- ════════════════════════════════
  -- ── Yashoda Hyderabad — 5 Jobs ──
  -- ════════════════════════════════
  INSERT INTO public.job_posts (hospital_id, title, department, required_specialization, description, shift_date, shift_start_time, shift_end_time, compensation, status) VALUES
    (h5_id, 'Gastroenterology Consult', 'General Medicine', 'Medical Doctor (MD)', 'Gastroenterologist for inpatient consultations and endoscopy procedures (UGIE & colonoscopy). High-volume unit.', CURRENT_DATE + 2, '09:00', '17:00', 5000, 'open'),
    (h5_id, 'General Medicine Night Cover', 'General Medicine', 'Medical Doctor (MD)', 'General physician for overnight ward cover across medicine floors. Comfortable with admissions, reviews and emergencies.', CURRENT_DATE + 1, '20:00', '08:00', 2800, 'open'),
    (h5_id, 'OT Scrub Nurse', 'Surgery', 'Registered Nurse (RN)', 'Scrub nurse for general surgery and laparoscopy OT. Instrument knowledge and sterile technique essential. 10-hour shift.', CURRENT_DATE + 3, '07:00', '17:00', 1400, 'open'),
    (h5_id, 'Respiratory Therapist – ICU', 'Intensive Care Unit (ICU)', 'Respiratory Therapist', 'Respiratory therapist for ventilator management in 25-bed MICU. ACLS certified. Night shift available.', CURRENT_DATE + 4, '20:00', '08:00', 2200, 'open'),
    (h5_id, 'Oncology Physician', 'Oncology', 'Medical Doctor (MD)', 'Medical oncologist for chemotherapy administration, day-care supervision and inpatient reviews. DM Oncology preferred.', CURRENT_DATE + 6, '08:00', '16:00', 6500, 'open');

END;
$$;
