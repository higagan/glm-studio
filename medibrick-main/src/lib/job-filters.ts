import {
  CITY_FILTER_ALIASES,
  CityLandingSlug,
  LandingSlug,
  PROFESSION_FILTER_KEYWORDS,
  ProfessionLandingSlug,
  isLandingSlug,
} from "./job-constants.js";
import { PublicJobPost } from "./job-types.js";
import { resolveJobRoleCategory, type HealthcareRoleCategory } from "./healthcare-roles.js";

const LANDING_ROLE_MATCH: Record<ProfessionLandingSlug, HealthcareRoleCategory[]> = {
  doctors: ["Doctor"],
  nurses: ["Nurse"],
  "ayush-practitioners": ["AYUSH Practitioner"],
  technicians: ["Technician", "Physiotherapist", "Pharmacist", "Other Healthcare Professional"],
};

function matchesKeywords(job: PublicJobPost, keywords: string[]): boolean {
  const haystack = [
    job.title,
    job.department,
    job.required_specialization,
    job.specialty,
    job.description,
  ]
    .join(" ")
    .toLowerCase();

  return keywords.some((kw) => haystack.includes(kw));
}

export function filterJobsByLanding(jobs: PublicJobPost[], slug: LandingSlug): PublicJobPost[] {
  if (slug in PROFESSION_FILTER_KEYWORDS) {
    const professionSlug = slug as ProfessionLandingSlug;
    const keywords = PROFESSION_FILTER_KEYWORDS[professionSlug];
    const roleMatches = LANDING_ROLE_MATCH[professionSlug];
    return jobs.filter((job) => {
      const role = resolveJobRoleCategory(job);
      if (roleMatches.includes(role as HealthcareRoleCategory)) return true;
      return matchesKeywords(job, keywords);
    });
  }

  const aliases = CITY_FILTER_ALIASES[slug as CityLandingSlug];
  return jobs.filter((job) => {
    const city = (job.hospital_profiles?.city || "").toLowerCase();
    const address = (job.hospital_profiles?.address || "").toLowerCase();
    return aliases.some((alias) => city.includes(alias) || address.includes(alias));
  });
}

export function resolveLandingSlug(slug: string): LandingSlug | null {
  return isLandingSlug(slug) ? slug : null;
}
