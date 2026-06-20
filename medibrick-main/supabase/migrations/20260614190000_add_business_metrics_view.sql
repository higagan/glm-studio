-- Business metrics view for founder dashboards and marketplace health checks.
-- Query: SELECT * FROM public.business_metrics;
--
-- NOTE: verified_professionals and verified_hospitals are intentionally omitted.
-- They will be added in Sprint 2 when the verification schema is implemented.

CREATE OR REPLACE VIEW public.business_metrics AS
SELECT
  -- ── Job supply ───────────────────────────────────────────────────────────
  (SELECT COUNT(*) FROM public.job_posts)                                          AS total_jobs,
  (SELECT COUNT(*) FROM public.job_posts WHERE status = 'open')                    AS open_jobs,
  (SELECT COUNT(*) FROM public.job_posts WHERE status = 'closed')                  AS closed_jobs,
  (SELECT COUNT(*) FROM public.job_posts WHERE status = 'filled')                  AS filled_jobs,
  (SELECT COUNT(*) FROM public.job_posts
   WHERE created_at > now() - interval '7 days')                                   AS jobs_posted_last_7d,

  -- ── Application demand ───────────────────────────────────────────────────
  (SELECT COUNT(*) FROM public.applications)                                        AS total_applications,
  (SELECT COUNT(*) FROM public.applications WHERE status = 'accepted')              AS accepted_applications,
  (SELECT COUNT(*) FROM public.applications WHERE status = 'pending')               AS pending_applications,
  (SELECT COUNT(*) FROM public.applications
   WHERE created_at > now() - interval '7 days')                                    AS applications_last_7d,

  -- ── Marketplace health ───────────────────────────────────────────────────
  -- applications_per_open_job: < 1 = low demand, > 3 = healthy demand
  CASE
    WHEN (SELECT COUNT(*) FROM public.job_posts WHERE status = 'open') = 0 THEN NULL
    ELSE ROUND(
      (SELECT COUNT(*) FROM public.applications)::numeric /
      (SELECT COUNT(*) FROM public.job_posts WHERE status = 'open'),
      2
    )
  END                                                                                AS applications_per_open_job,

  -- accepted_application_rate_pct: < 5% = hospitals not responding, > 20% = healthy
  CASE
    WHEN (SELECT COUNT(*) FROM public.applications) = 0 THEN NULL
    ELSE ROUND(
      (SELECT COUNT(*) FROM public.applications WHERE status = 'accepted')::numeric /
      (SELECT COUNT(*) FROM public.applications) * 100,
      1
    )
  END                                                                                AS accepted_application_rate_pct,

  -- ── User supply ──────────────────────────────────────────────────────────
  (SELECT COUNT(*) FROM public.professional_profiles)                               AS total_professionals,
  (SELECT COUNT(*) FROM public.hospital_profiles)                                   AS total_hospitals;

-- Restrict to service_role only — not exposed to browser clients via anon key
REVOKE ALL ON public.business_metrics FROM anon, authenticated;
GRANT SELECT ON public.business_metrics TO service_role;
