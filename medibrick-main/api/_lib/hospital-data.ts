import { getSupabase } from "./supabase.js";
import {
  HospitalPublicJob,
  HospitalPublicProfilePayload,
  HospitalReview,
  PublicHospitalProfile,
  parseHospitalProfilePayload,
} from "../../src/lib/hospital-types.js";

export async function fetchHospitalProfileBySlug(
  slug: string
): Promise<HospitalPublicProfilePayload | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_hospital_public_profile", { p_slug: slug });
  if (error) throw error;
  if (!data) return null;
  return parseHospitalProfilePayload(data as Record<string, unknown>);
}

/** @deprecated Use fetchHospitalProfileBySlug */
export async function fetchHospitalBySlug(slug: string): Promise<PublicHospitalProfile | null> {
  const payload = await fetchHospitalProfileBySlug(slug);
  return payload?.profile ?? null;
}

export async function fetchHospitalOpenJobs(hospitalId: string): Promise<HospitalPublicJob[]> {
  const payload = await fetchHospitalProfileBySlug(hospitalId);
  if (payload) return payload.openJobs;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("job_posts")
    .select("id, slug, title, department, description, shift_date, shift_start_time, shift_end_time, required_specialization, compensation")
    .eq("hospital_id", hospitalId)
    .eq("status", "open")
    .eq("is_seed_data", false)
    .order("shift_date", { ascending: true });
  if (error) throw error;
  return (data || []) as HospitalPublicJob[];
}

export async function fetchHospitalReviews(hospitalId: string): Promise<HospitalReview[]> {
  const payload = await fetchHospitalProfileBySlug(hospitalId);
  if (payload) return payload.reviews;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("hospital_reviews")
    .select("id, rating, review_text, role_title, specialty, shift_completed_date, created_at")
    .eq("hospital_id", hospitalId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data || []) as HospitalReview[];
}

export async function fetchHospitalStats(hospitalId: string, reviews: HospitalReview[]) {
  const payload = await fetchHospitalProfileBySlug(hospitalId);
  if (payload) return payload.stats;
  return {
    openJobs: 0,
    completedShifts: 0,
    reviewCount: reviews.length,
    averageRating: reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null,
    activeProfessionals: 0,
    professionalsWorkedWith: 0,
    repeatProfessionalRate: null,
    averageFillTimeHours: null,
    avgPaymentDays: null,
    avgResponseHours: null,
    noShowRatePct: null,
    followerCount: 0,
  };
}

export async function fetchHospitalSlugs(): Promise<string[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("hospital_profiles")
    .select("slug")
    .eq("is_seed_data", false)
    .not("slug", "is", null);
  return (data || []).map((row) => row.slug as string).filter(Boolean);
}
