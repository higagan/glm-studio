-- Performance indexes for Medibrick Phase 1
-- Prevents sequential table scans on the three most-queried paths.

-- 1. Main job list: every public page load filters by status and orders by date.
--    Without this index, a full table scan runs on every visit.
CREATE INDEX IF NOT EXISTS idx_job_posts_status_created
  ON public.job_posts(status, created_at DESC);

-- 2. Professional dashboard + apply-check in JobDetailsView:
--    both query applications filtered by professional_id.
CREATE INDEX IF NOT EXISTS idx_applications_professional_id
  ON public.applications(professional_id);

-- 3. Hospital dashboard: filters job_posts by hospital_id and status.
CREATE INDEX IF NOT EXISTS idx_job_posts_hospital_status
  ON public.job_posts(hospital_id, status);

-- ── Verification queries (run in Supabase SQL editor to confirm) ──
--
-- SELECT indexname, indexdef
-- FROM   pg_indexes
-- WHERE  tablename IN ('job_posts', 'applications')
--   AND  indexname IN (
--          'idx_job_posts_status_created',
--          'idx_applications_professional_id',
--          'idx_job_posts_hospital_status'
--        );
--
-- Expected: 3 rows returned.
--
-- ── Rollback ──
-- DROP INDEX IF EXISTS public.idx_job_posts_status_created;
-- DROP INDEX IF EXISTS public.idx_applications_professional_id;
-- DROP INDEX IF EXISTS public.idx_job_posts_hospital_status;
