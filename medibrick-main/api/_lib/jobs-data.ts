import { getSupabase } from "./supabase.js";
import { PUBLIC_JOB_SELECT, PUBLIC_MARKETPLACE_ONLY, PublicJobPost } from "../../src/lib/job-types.js";
import { filterJobsByLanding, resolveLandingSlug } from "../../src/lib/job-filters.js";
import { LandingSlug } from "../../src/lib/job-constants.js";

export async function fetchOpenJobs(): Promise<PublicJobPost[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("job_posts")
    .select(PUBLIC_JOB_SELECT)
    .eq("status", "open")
    .eq("is_seed_data", PUBLIC_MARKETPLACE_ONLY.is_seed_data)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as PublicJobPost[];
}

export async function fetchJobBySlug(slug: string): Promise<PublicJobPost | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("job_posts")
    .select(PUBLIC_JOB_SELECT)
    .eq("slug", slug)
    .eq("status", "open")
    .eq("is_seed_data", PUBLIC_MARKETPLACE_ONLY.is_seed_data)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as PublicJobPost | null) ?? null;
}

export async function fetchJobsForLanding(slug: LandingSlug): Promise<PublicJobPost[]> {
  const jobs = await fetchOpenJobs();
  return filterJobsByLanding(jobs, slug);
}

export function parseJobsPath(pathname: string): {
  type: "list" | "landing" | "detail";
  slug?: string;
  landingSlug?: LandingSlug;
} {
  if (pathname === "/jobs" || pathname === "/jobs/") {
    return { type: "list" };
  }

  const match = pathname.match(/^\/jobs\/([^/]+)\/?$/);
  if (!match) return { type: "list" };

  const slug = decodeURIComponent(match[1]);
  const landingSlug = resolveLandingSlug(slug);
  if (landingSlug) {
    return { type: "landing", slug, landingSlug };
  }

  return { type: "detail", slug };
}

export async function fetchBlogSlugs(): Promise<string[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("status", "published");

  return (data || []).map((row) => row.slug as string);
}

export async function fetchFacilitySlugs(): Promise<string[]> {
  const supabase = getSupabase();
  const { data } = await supabase.from("hospital_profiles").select("slug");
  return (data || []).map((row) => row.slug as string).filter(Boolean);
}
