import { SITE_URL } from "./job-constants.js";
import { PublicJobPost } from "./job-types.js";

export interface PageSEO {
  title: string;
  description: string;
  path: string;
  ogType?: string;
  ogImage?: string;
  jsonLd?: object | object[];
}

export function buildOgImageUrl(job: PublicJobPost): string {
  const params = new URLSearchParams({
    title: job.title,
    hospital: job.hospital_profiles?.hospital_name || "Hospital",
    city: job.hospital_profiles?.city || "India",
    date: job.shift_date,
  });
  if (job.compensation != null && job.compensation > 0) {
    params.set("pay", String(job.compensation));
  }
  return `${SITE_URL}/api/og?${params.toString()}`;
}

export function buildJobPostingJsonLd(job: PublicJobPost): object {
  const hospital = job.hospital_profiles;
  const location = hospital?.city || "India";
  const url = `${SITE_URL}/jobs/${job.slug}`;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.created_at || new Date().toISOString(),
    // Per-shift gig work; "OTHER" is the most accurate Google enum value
    // (PER_DIEM implies daily rate; TEMPORARY implies multi-week engagement)
    employmentType: "OTHER",
    hiringOrganization: {
      "@type": "Organization",
      name: hospital?.hospital_name || "Healthcare Facility",
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: location,
        addressCountry: "IN",
        ...(hospital?.address ? { streetAddress: hospital.address } : {}),
      },
    },
    // The shift date is the last day the listing is valid
    validThrough: `${job.shift_date}T23:59:59`,
    url,
    identifier: {
      "@type": "PropertyValue",
      name: "MediBricks",
      value: job.id,
    },
    occupationalCategory: job.required_specialization,
    industry: job.department,
  };

  if (job.compensation != null && job.compensation > 0) {
    jsonLd.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "INR",
      value: {
        "@type": "QuantitativeValue",
        value: job.compensation,
        unitText: "SHIFT",
      },
    };
  }

  return jsonLd;
}

export function buildJobDetailSEO(job: PublicJobPost): PageSEO {
  const hospital = job.hospital_profiles;
  const location = hospital?.city || "India";
  const pay =
    job.compensation != null && job.compensation > 0
      ? ` ₹${job.compensation.toLocaleString("en-IN")} per shift.`
      : "";

  return {
    title: `${job.title} at ${hospital?.hospital_name || "Hospital"} — ${location} | MediBricks`,
    description: `${job.title} shift in ${location}. ${job.required_specialization}, ${job.department}.${pay} Apply on MediBricks.`,
    path: `/jobs/${job.slug}`,
    ogType: "website",
    ogImage: buildOgImageUrl(job),
    jsonLd: buildJobPostingJsonLd(job),
  };
}

export function buildJobsListSEO(count: number, filterLabel?: string): PageSEO {
  const label = filterLabel ? ` — ${filterLabel}` : "";
  return {
    title: `Healthcare Jobs${label} | MediBricks`,
    description: `Browse ${count} open healthcare shifts${filterLabel ? ` for ${filterLabel}` : ""}. Doctors, nurses, AYUSH practitioners and technicians — verified hospitals across India.`,
    path: filterLabel ? `/jobs` : "/jobs",
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `Healthcare Jobs${label}`,
      description: `Open healthcare job listings on MediBricks`,
      url: `${SITE_URL}/jobs`,
    },
  };
}
