export const SITE_URL = "https://medibrick.com";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon.png`;

export const PROFESSION_LANDING_SLUGS = [
  "doctors",
  "nurses",
  "ayush-practitioners",
  "technicians",
] as const;

export const CITY_LANDING_SLUGS = ["bangalore", "mumbai", "delhi"] as const;

export type ProfessionLandingSlug = (typeof PROFESSION_LANDING_SLUGS)[number];
export type CityLandingSlug = (typeof CITY_LANDING_SLUGS)[number];
export type LandingSlug = ProfessionLandingSlug | CityLandingSlug;

export const ALL_LANDING_SLUGS: readonly string[] = [
  ...PROFESSION_LANDING_SLUGS,
  ...CITY_LANDING_SLUGS,
];

export function isLandingSlug(slug: string): slug is LandingSlug {
  return (ALL_LANDING_SLUGS as readonly string[]).includes(slug);
}

export interface LandingPageMeta {
  title: string;
  description: string;
  heading: string;
  subheading: string;
}

export const PROFESSION_LANDING_META: Record<ProfessionLandingSlug, LandingPageMeta> = {
  doctors: {
    title: "Doctor Jobs in India — MediBricks Healthcare Shifts",
    description:
      "Browse open doctor and physician shifts across India. Verified hospitals, transparent pay, apply in seconds on MediBricks.",
    heading: "Doctor & Physician Shifts",
    subheading: "Open shifts for MDs, specialists and emergency physicians at verified hospitals.",
  },
  nurses: {
    title: "Nurse Jobs in India — MediBricks Healthcare Shifts",
    description:
      "Find staff nurse, ICU, OT and ER nursing shifts near you. Flexible schedules and competitive hourly pay on MediBricks.",
    heading: "Nursing Shifts",
    subheading: "Staff nurses and specialist nursing roles at verified hospitals across India.",
  },
  "ayush-practitioners": {
    title: "AYUSH Practitioner Jobs — MediBricks",
    description:
      "Discover Ayurvedic and AYUSH practitioner shifts at clinics and hospitals across India on MediBricks.",
    heading: "AYUSH Practitioner Shifts",
    subheading: "Ayurvedic and holistic care roles at verified healthcare facilities.",
  },
  technicians: {
    title: "Medical Technician Jobs — MediBricks",
    description:
      "Browse lab, radiology and medical technologist shifts. Verified facilities, fast applications on MediBricks.",
    heading: "Medical Technician Shifts",
    subheading: "Lab, radiology and allied health technician opportunities.",
  },
};

export const CITY_LANDING_META: Record<CityLandingSlug, LandingPageMeta> = {
  bangalore: {
    title: "Healthcare Jobs in Bangalore — MediBricks",
    description:
      "Find doctor, nurse and technician shifts in Bangalore. Live listings from verified hospitals and clinics.",
    heading: "Healthcare Jobs in Bangalore",
    subheading: "Open shifts at hospitals and clinics across Bengaluru.",
  },
  mumbai: {
    title: "Healthcare Jobs in Mumbai — MediBricks",
    description:
      "Browse healthcare shifts in Mumbai. Doctors, nurses and technicians — apply to verified openings fast.",
    heading: "Healthcare Jobs in Mumbai",
    subheading: "Open shifts at hospitals and clinics across Mumbai.",
  },
  delhi: {
    title: "Healthcare Jobs in Delhi — MediBricks",
    description:
      "Discover doctor, nurse and technician shifts in Delhi NCR. Verified employers on MediBricks.",
    heading: "Healthcare Jobs in Delhi",
    subheading: "Open shifts at hospitals and clinics across Delhi NCR.",
  },
};

export function getLandingMeta(slug: LandingSlug): LandingPageMeta {
  if (slug in PROFESSION_LANDING_META) {
    return PROFESSION_LANDING_META[slug as ProfessionLandingSlug];
  }
  return CITY_LANDING_META[slug as CityLandingSlug];
}

/** Keyword filters for legacy jobs + title matching on landing pages */
export const PROFESSION_FILTER_KEYWORDS: Record<ProfessionLandingSlug, string[]> = {
  doctors: [
    "doctor",
    "physician",
    "duty doctor",
    "general physician",
    "emergency medicine",
    "cardiologist",
    "surgeon",
    "anesthesiologist",
    "radiologist",
    "md",
  ],
  nurses: ["nurse", "staff nurse", "icu nurse", "ot nurse", "er nurse", "nursing"],
  "ayush-practitioners": [
    "ayurved",
    "ayush",
    "homeopath",
    "unani",
    "siddha",
    "ayush practitioner",
  ],
  technicians: [
    "technician",
    "technologist",
    "lab technician",
    "radiology technician",
    "physiotherapist",
    "pharmacist",
  ],
};

export const CITY_FILTER_ALIASES: Record<CityLandingSlug, string[]> = {
  bangalore: ["bangalore", "bengaluru"],
  mumbai: ["mumbai", "bombay"],
  delhi: ["delhi", "new delhi", "ncr", "gurgaon", "gurugram", "noida"],
};
