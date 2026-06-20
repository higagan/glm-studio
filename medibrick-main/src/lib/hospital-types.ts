import { SITE_URL } from "./job-constants.js";

export type HospitalType =
  | "hospital"
  | "clinic"
  | "diagnostic_centre"
  | "wellness_centre"
  | "multi_speciality_hospital"
  | "corporate_hospital"
  | "teaching_hospital";

export const HOSPITAL_TYPE_LABELS: Record<HospitalType, string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  diagnostic_centre: "Diagnostic Centre",
  wellness_centre: "Wellness Centre",
  multi_speciality_hospital: "Multi-speciality Hospital",
  corporate_hospital: "Corporate Hospital",
  teaching_hospital: "Teaching Hospital",
};

export interface PublicHospitalProfile {
  id: string;
  slug: string | null;
  hospital_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  hospital_type: HospitalType;
  logo_url: string | null;
  cover_image_url: string | null;
  website: string | null;
  phone: string | null;
  mission: string | null;
  specialties: string[];
  departments: string[];
  nabh_accredited: boolean;
  certifications: string[];
  is_verified: boolean;
  years_in_operation: number | null;
  established_year: number | null;
  bed_count: number | null;
  emergency_available: boolean;
  awards: string[];
  created_at: string | null;
  follower_count?: number;
}

export interface HospitalTrustFlags {
  isVerified: boolean;
  licenseVerified: boolean;
  gstVerified: boolean;
  addressVerified: boolean;
  nabhAccredited: boolean;
}

export interface HospitalReview {
  id: string;
  rating: number;
  review_text: string;
  role_title: string;
  specialty: string | null;
  shift_completed_date: string | null;
  created_at: string;
  would_work_again?: boolean | null;
  payment_rating?: number | null;
  management_rating?: number | null;
  environment_rating?: number | null;
  shift_organization_rating?: number | null;
  professional_role?: string | null;
}

export interface HospitalReviewSummary {
  paymentAvg: number | null;
  managementAvg: number | null;
  environmentAvg: number | null;
  shiftOrgAvg: number | null;
  wouldWorkAgainPct: number | null;
}

export interface HospitalPublicJob {
  id: string;
  slug: string | null;
  title: string;
  department: string;
  description: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  required_specialization: string;
  compensation: number | null;
  status?: string;
  created_at?: string | null;
}

export interface HospitalPublicStats {
  openJobs: number;
  completedShifts: number;
  reviewCount: number;
  averageRating: number | null;
  activeProfessionals: number;
  professionalsWorkedWith: number;
  repeatProfessionalRate: number | null;
  averageFillTimeHours: number | null;
  avgPaymentDays: number | null;
  avgResponseHours: number | null;
  noShowRatePct: number | null;
  followerCount: number;
}

export interface HospitalHiringActivity {
  jobsPosted30d: number;
  professionalsHired30d: number;
  topSpecialties: Array<{ specialty: string; hires: number }>;
}

export interface HospitalPublicProfilePayload {
  profile: PublicHospitalProfile;
  stats: HospitalPublicStats;
  trust: HospitalTrustFlags;
  reviews: HospitalReview[];
  reviewSummary: HospitalReviewSummary;
  hiringActivity: HospitalHiringActivity;
  openJobs: HospitalPublicJob[];
  isFollowing: boolean;
}

export const PUBLIC_HOSPITAL_SELECT = `
  id,
  slug,
  hospital_name,
  address,
  city,
  state,
  description,
  latitude,
  longitude,
  hospital_type,
  logo_url,
  cover_image_url,
  website,
  phone,
  mission,
  specialties,
  departments,
  nabh_accredited,
  certifications,
  is_verified,
  years_in_operation,
  established_year,
  bed_count,
  emergency_available,
  awards,
  follower_count,
  created_at
`;

export const HOSPITAL_JOB_SELECT = `
  id,
  slug,
  title,
  department,
  description,
  shift_date,
  shift_start_time,
  shift_end_time,
  required_specialization,
  compensation
`;

export function hospitalPublicPath(slug: string): string {
  return `/hospitals/${slug}`;
}

export function hospitalPublicUrl(slug: string): string {
  return `${SITE_URL}${hospitalPublicPath(slug)}`;
}

export function formatHospitalType(type: HospitalType | string): string {
  return HOSPITAL_TYPE_LABELS[type as HospitalType] ?? "Hospital";
}

export function hospitalProfilePath(hospital: { slug?: string | null; id: string }): string {
  return `/hospitals/${hospital.slug || hospital.id}`;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function parseHospitalProfilePayload(raw: Record<string, unknown>): HospitalPublicProfilePayload {
  const stats = (raw.stats ?? {}) as Record<string, unknown>;
  const trust = (raw.trust ?? {}) as Record<string, unknown>;
  const reviewSummary = (raw.reviewSummary ?? {}) as Record<string, unknown>;
  const hiring = (raw.hiringActivity ?? {}) as Record<string, unknown>;

  return {
    profile: raw.profile as PublicHospitalProfile,
    stats: {
      openJobs: Number(stats.openJobs ?? 0),
      completedShifts: Number(stats.completedShifts ?? 0),
      reviewCount: Number(stats.reviewCount ?? 0),
      averageRating: stats.averageRating != null ? Number(stats.averageRating) : null,
      activeProfessionals: Number(stats.activeProfessionals ?? stats.professionalsWorkedWith ?? 0),
      professionalsWorkedWith: Number(stats.professionalsWorkedWith ?? 0),
      repeatProfessionalRate: stats.repeatProfessionalRate != null ? Number(stats.repeatProfessionalRate) : null,
      averageFillTimeHours: stats.averageFillTimeHours != null ? Number(stats.averageFillTimeHours) : null,
      avgPaymentDays: stats.avgPaymentDays != null ? Number(stats.avgPaymentDays) : null,
      avgResponseHours: stats.avgResponseHours != null ? Number(stats.avgResponseHours) : null,
      noShowRatePct: stats.noShowRatePct != null ? Number(stats.noShowRatePct) : null,
      followerCount: Number(stats.followerCount ?? 0),
    },
    trust: {
      isVerified: Boolean(trust.isVerified),
      licenseVerified: Boolean(trust.licenseVerified),
      gstVerified: Boolean(trust.gstVerified),
      addressVerified: Boolean(trust.addressVerified),
      nabhAccredited: Boolean(trust.nabhAccredited),
    },
    reviews: (raw.reviews ?? []) as HospitalReview[],
    reviewSummary: {
      paymentAvg: reviewSummary.paymentAvg != null ? Number(reviewSummary.paymentAvg) : null,
      managementAvg: reviewSummary.managementAvg != null ? Number(reviewSummary.managementAvg) : null,
      environmentAvg: reviewSummary.environmentAvg != null ? Number(reviewSummary.environmentAvg) : null,
      shiftOrgAvg: reviewSummary.shiftOrgAvg != null ? Number(reviewSummary.shiftOrgAvg) : null,
      wouldWorkAgainPct: reviewSummary.wouldWorkAgainPct != null ? Number(reviewSummary.wouldWorkAgainPct) : null,
    },
    hiringActivity: {
      jobsPosted30d: Number(hiring.jobsPosted30d ?? 0),
      professionalsHired30d: Number(hiring.professionalsHired30d ?? 0),
      topSpecialties: (hiring.topSpecialties ?? []) as HospitalHiringActivity["topSpecialties"],
    },
    openJobs: (raw.openJobs ?? []) as HospitalPublicJob[],
    isFollowing: Boolean(raw.isFollowing),
  };
}
