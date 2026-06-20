-- Delete all data from tables in correct order (respecting foreign keys)
DELETE FROM applications;
DELETE FROM job_posts;
DELETE FROM professional_profiles;
DELETE FROM hospital_profiles;
DELETE FROM user_roles;
DELETE FROM profiles;