import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { captureSupabaseError } from "@/lib/sentry";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import JobListItem from "@/components/dashboard/JobListItem";
import { Badge } from "@/components/ui/badge";
import { Loader2, Briefcase } from "lucide-react";
import { PUBLIC_JOB_SELECT, PUBLIC_MARKETPLACE_ONLY, PublicJobPost } from "@/lib/job-types";
import {
  getLandingMeta,
  isLandingSlug,
  LandingSlug,
} from "@/lib/job-constants";
import { filterJobsByLanding } from "@/lib/job-filters";
import { buildJobsListSEO } from "@/lib/job-seo";

export default function JobsLanding() {
  const { segment } = useParams<{ segment: string }>();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<PublicJobPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect to /jobs if segment is not a known landing slug
  useEffect(() => {
    if (segment && !isLandingSlug(segment)) {
      navigate("/jobs", { replace: true });
    }
  }, [segment, navigate]);

  useEffect(() => {
    if (!segment || !isLandingSlug(segment)) return;

    async function load() {
      const { data, error } = await supabase
        .from("job_posts")
        .select(PUBLIC_JOB_SELECT)
        .eq("status", "open")
        .eq("is_seed_data", PUBLIC_MARKETPLACE_ONLY.is_seed_data)
        .order("created_at", { ascending: false });

      if (error) {
        captureSupabaseError(
          { message: error.message, code: error.code },
          { fn: "JobsLanding.load", segment }
        );
      } else if (data) {
        const filtered = filterJobsByLanding(
          data as PublicJobPost[],
          segment as LandingSlug
        );
        setJobs(filtered);
      }
      setLoading(false);
    }

    load();
  }, [segment]);

  if (!segment || !isLandingSlug(segment)) return null;

  const meta = getLandingMeta(segment as LandingSlug);
  const seo = buildJobsListSEO(jobs.length, meta.heading);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={meta.title}
        description={meta.description}
        path={`/jobs/${segment}`}
        jsonLd={seo.jsonLd}
      />
      <Navigation />

      <div className="border-b border-border bg-background">
        <div className="max-w-3xl mx-auto px-6 py-10 text-center space-y-3">
          <Badge variant="secondary" className="mx-auto w-fit">Jobs</Badge>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {meta.heading}
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            {meta.subheading}
          </p>
          {!loading && (
            <p className="text-xs text-muted-foreground">
              {jobs.length} open {jobs.length === 1 ? "shift" : "shifts"}
            </p>
          )}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Finding shifts…</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-24">
            <Briefcase className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" strokeWidth={1.5} />
            <h2 className="text-lg font-semibold mb-2">No open shifts right now</h2>
            <p className="text-sm text-muted-foreground mb-6">
              New shifts are posted daily.{" "}
              <Link to="/jobs" className="text-primary underline-offset-4 hover:underline">
                Browse all shifts
              </Link>
              {" "}or check back soon.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link to={`/jobs/${job.slug}`} className="block hover:bg-muted/50 transition-colors">
                  <JobListItem
                    job={job}
                    isSelected={false}
                    onClick={() => {}}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
