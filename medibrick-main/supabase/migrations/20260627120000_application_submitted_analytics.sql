-- Application submitted analytics: DB trigger (source of truth) + backfill historical rows.

CREATE OR REPLACE FUNCTION public.track_application_submitted_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_job_slug TEXT;
BEGIN
  IF COALESCE(NEW.is_seed_data, FALSE) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.product_events pe
    WHERE pe.event_name = 'application_submitted'
      AND pe.properties->>'applicationId' = NEW.id::text
  ) THEN
    RETURN NEW;
  END IF;

  SELECT pp.user_id INTO v_user_id
  FROM public.professional_profiles pp
  WHERE pp.id = NEW.professional_id;

  SELECT jp.slug INTO v_job_slug
  FROM public.job_posts jp
  WHERE jp.id = NEW.job_id;

  INSERT INTO public.product_events (
    event_name,
    properties,
    user_id,
    job_id,
    source,
    created_at
  ) VALUES (
    'application_submitted',
    jsonb_build_object(
      'applicationId', NEW.id::text,
      'jobId', NEW.job_id::text,
      'jobSlug', COALESCE(v_job_slug, NEW.job_id::text),
      'source', 'db_trigger'
    ),
    v_user_id,
    COALESCE(v_job_slug, NEW.job_id::text),
    'marketplace',
    COALESCE(NEW.created_at, now())
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_submitted_analytics ON public.applications;

CREATE TRIGGER trg_application_submitted_analytics
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.track_application_submitted_event();

-- Backfill real applications that predate client analytics instrumentation.
INSERT INTO public.product_events (event_name, properties, user_id, job_id, source, created_at)
SELECT
  'application_submitted',
  jsonb_build_object(
    'applicationId', a.id::text,
    'jobId', a.job_id::text,
    'jobSlug', COALESCE(jp.slug, a.job_id::text),
    'source', 'backfill'
  ),
  pp.user_id,
  COALESCE(jp.slug, a.job_id::text),
  'marketplace',
  a.created_at
FROM public.applications a
JOIN public.professional_profiles pp ON pp.id = a.professional_id
LEFT JOIN public.job_posts jp ON jp.id = a.job_id
WHERE COALESCE(a.is_seed_data, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_events pe
    WHERE pe.event_name = 'application_submitted'
      AND pe.properties->>'applicationId' = a.id::text
  );
