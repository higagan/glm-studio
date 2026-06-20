import { SITE_URL } from "./job-constants.js";
import {
  HospitalPublicStats,
  HospitalReview,
  PublicHospitalProfile,
  formatHospitalType,
  hospitalPublicPath,
} from "./hospital-types.js";

export interface HospitalPageSEO {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  jsonLd: object[];
}

export function buildHospitalOgImageUrl(
  hospital: PublicHospitalProfile,
  openJobs: number
): string {
  const params = new URLSearchParams({
    type: "hospital",
    name: hospital.hospital_name.slice(0, 60),
    city: (hospital.city || "India").slice(0, 40),
    openings: String(openJobs),
  });
  return `${SITE_URL}/api/og?${params.toString()}`;
}

function buildAggregateRating(
  stats: HospitalPublicStats,
  reviews: HospitalReview[]
): object | null {
  if (stats.reviewCount === 0 || stats.averageRating === null) return null;
  return {
    "@type": "AggregateRating",
    ratingValue: stats.averageRating.toFixed(1),
    reviewCount: stats.reviewCount,
    bestRating: "5",
    worstRating: "1",
  };
}

function buildReviewJsonLd(reviews: HospitalReview[]): object[] {
  return reviews.slice(0, 5).map((r) => ({
    "@type": "Review",
    reviewRating: {
      "@type": "Rating",
      ratingValue: r.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: r.review_text,
    author: {
      "@type": "Person",
      jobTitle: r.role_title,
    },
    datePublished: r.shift_completed_date || r.created_at,
  }));
}

export function buildHospitalSEO(
  hospital: PublicHospitalProfile,
  stats: HospitalPublicStats,
  reviews: HospitalReview[]
): HospitalPageSEO {
  const city = hospital.city || "India";
  const typeLabel = formatHospitalType(hospital.hospital_type);
  const openings = stats.openJobs;
  const slug = hospital.slug || hospital.id;

  const title = `${hospital.hospital_name} — Healthcare Shifts in ${city} | MediBricks`;
  const description = [
    `Find open healthcare shifts at ${hospital.hospital_name} in ${city}.`,
    openings > 0 ? `${openings} active opening${openings === 1 ? "" : "s"}.` : "",
    stats.averageRating
      ? `Rated ${stats.averageRating.toFixed(1)}/5 by healthcare professionals.`
      : "",
    "Verified shifts, transparent pay. Apply on MediBricks.",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 160);

  const path = hospitalPublicPath(slug);
  const url = `${SITE_URL}${path}`;

  const aggregateRating = buildAggregateRating(stats, reviews);

  const medicalOrg: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["Organization", "MedicalOrganization", "Hospital"],
    "@id": `${url}#organization`,
    name: hospital.hospital_name,
    description: hospital.description || description,
    url,
    medicalSpecialty: hospital.specialties.length > 0 ? hospital.specialties : undefined,
  };

  if (hospital.logo_url) medicalOrg.logo = hospital.logo_url;
  if (hospital.website) medicalOrg.sameAs = [hospital.website];
  if (aggregateRating) medicalOrg.aggregateRating = aggregateRating;

  const localBusiness: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${url}#localbusiness`,
    name: hospital.hospital_name,
    url,
    telephone: hospital.phone || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: hospital.address || undefined,
      addressLocality: hospital.city || undefined,
      addressRegion: hospital.state || undefined,
      addressCountry: "IN",
    },
  };

  if (hospital.latitude && hospital.longitude) {
    localBusiness.geo = {
      "@type": "GeoCoordinates",
      latitude: hospital.latitude,
      longitude: hospital.longitude,
    };
  }
  if (aggregateRating) localBusiness.aggregateRating = aggregateRating;

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How are professionals selected at ${hospital.hospital_name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "MediBricks verifies professional credentials before applications reach the hospital. Facilities review verified profiles and select candidates based on specialty, experience, and shift availability.",
        },
      },
      {
        "@type": "Question",
        name: "How is payment handled for shifts?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Compensation is agreed upfront on each shift listing. Professionals receive payment as per the hospital's agreed terms after shift completion.",
        },
      },
      {
        "@type": "Question",
        name: "What verification is required?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Healthcare professionals must complete MediBricks profile verification including medical registration and identity checks before applying to shifts.",
        },
      },
    ],
  };

  const jsonLd: object[] = [medicalOrg, localBusiness, faqPage];
  jsonLd.push(...buildReviewJsonLd(reviews));

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Jobs", item: `${SITE_URL}/jobs` },
      {
        "@type": "ListItem",
        position: 3,
        name: city,
        item: `${SITE_URL}/jobs?city=${encodeURIComponent(city)}`,
      },
      { "@type": "ListItem", position: 4, name: hospital.hospital_name, item: url },
    ],
  };
  jsonLd.unshift(breadcrumb);

  if (hospital.bed_count) {
    medicalOrg.numberOfBeds = hospital.bed_count;
  }

  return {
    title,
    description,
    path,
    ogImage: buildHospitalOgImageUrl(hospital, openings),
    jsonLd,
  };
}

export function getHospitalFaqItems(hospitalName: string) {
  return [
    {
      question: `How are professionals selected at ${hospitalName}?`,
      answer:
        "MediBricks verifies professional credentials before applications reach the hospital. Facilities review verified profiles and select candidates based on specialty, experience, and shift availability.",
    },
    {
      question: "How is payment handled for shifts?",
      answer:
        "Compensation is agreed upfront on each shift listing. Professionals receive payment as per the hospital's agreed terms after shift completion.",
    },
    {
      question: "What verification is required?",
      answer:
        "Healthcare professionals must complete MediBricks profile verification including medical registration and identity checks before applying to shifts.",
    },
    {
      question: "How quickly are applications reviewed?",
      answer:
        "Most hospitals review applications within 24–48 hours. Urgent shifts may be filled faster — apply early for the best chance.",
    },
  ];
}
