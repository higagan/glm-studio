/**
 * India-first healthcare role taxonomy — single source of truth for
 * Post Shift, job browse filters, landing pages, and search.
 */

export const HEALTHCARE_ROLE_CATEGORIES = [
  "Doctor",
  "Nurse",
  "AYUSH Practitioner",
  "Technician",
  "Physiotherapist",
  "Pharmacist",
  "Other Healthcare Professional",
] as const;

export type HealthcareRoleCategory = (typeof HEALTHCARE_ROLE_CATEGORIES)[number];

/** Clinical units / departments hospitals staff by coverage need. */
export const CLINICAL_DEPARTMENTS = [
  "Emergency",
  "ICU",
  "OT (Operation Theatre)",
  "General Ward",
  "Cardiology",
  "Neurology",
  "Pediatrics",
  "Obstetrics & Gynecology",
  "Orthopedics",
  "Surgery",
  "Anesthesiology",
  "Radiology",
  "Pathology",
  "General Medicine",
  "Psychiatry",
  "Dermatology",
  "Oncology",
  "Dialysis",
  "NICU",
  "Other",
] as const;

export type ClinicalDepartment = (typeof CLINICAL_DEPARTMENTS)[number];

export const SPECIALTIES_BY_ROLE: Record<HealthcareRoleCategory, readonly string[]> = {
  Doctor: [
    "General Physician",
    "Emergency Medicine",
    "ICU",
    "Anesthesiology",
    "Pediatrics",
    "Orthopedics",
    "Radiology",
    "Cardiology",
    "Neurology",
    "General Surgery",
    "Other",
  ],
  Nurse: ["Staff Nurse", "ICU Nurse", "OT Nurse", "ER Nurse", "Pediatric Nurse", "Other"],
  "AYUSH Practitioner": ["Ayurveda", "Homeopathy", "Unani", "Siddha", "Other"],
  Technician: [
    "Lab Technician",
    "Radiology Technician",
    "OT Technician",
    "Dialysis Technician",
    "ECG Technician",
    "Other",
  ],
  Physiotherapist: ["General Physiotherapy", "Sports Rehab", "Neuro Rehab", "Other"],
  Pharmacist: ["Clinical Pharmacist", "Hospital Pharmacist", "Other"],
  "Other Healthcare Professional": ["Other"],
};

/** Flat list for browse filters (all specialties). */
export const ALL_SPECIALTIES: string[] = [
  ...new Set(Object.values(SPECIALTIES_BY_ROLE).flat()),
].sort();

const DEPARTMENT_TITLE_LABELS: Record<string, string> = {
  "OT (Operation Theatre)": "OT",
  "Obstetrics & Gynecology": "OBGYN",
  "Intensive Care Unit (ICU)": "ICU",
};

export function departmentLabelForTitle(department: string): string {
  return DEPARTMENT_TITLE_LABELS[department] ?? department;
}

/**
 * Auto-generate shift title from role + department (operations-manager mental model).
 * Examples: ICU + Doctor → "ICU Duty Doctor"; OT + Nurse → "OT Staff Nurse".
 */
export function generateShiftTitle(
  role: HealthcareRoleCategory | string,
  department: string,
  specialty?: string | null
): string {
  const dept = departmentLabelForTitle(department);

  switch (role) {
    case "Doctor":
      return `${dept} Duty Doctor`;
    case "Nurse":
      return `${dept} Staff Nurse`;
    case "AYUSH Practitioner":
      return specialty && specialty !== "Other"
        ? `${dept} ${specialty} Practitioner`
        : `${dept} AYUSH Practitioner`;
    case "Technician":
      return specialty && specialty !== "Other" ? `${dept} ${specialty}` : `${dept} Technician`;
    case "Physiotherapist":
      return `${dept} Physiotherapist`;
    case "Pharmacist":
      return `${dept} Pharmacist`;
    case "Other Healthcare Professional":
      return specialty && specialty !== "Other"
        ? `${dept} ${specialty}`
        : `${dept} Healthcare Professional`;
    default:
      return specialty ? `${dept} ${specialty}` : `${dept} Shift`;
  }
}

/** Map legacy US-centric stored values to India-first role categories. */
const LEGACY_ROLE_KEYWORDS: Array<{ role: HealthcareRoleCategory; keywords: string[] }> = [
  { role: "Doctor", keywords: ["doctor", "physician", "md", "cardiologist", "surgeon", "anesthesiologist"] },
  { role: "Nurse", keywords: ["nurse", "rn", "lpn", "np", "cna", "nursing"] },
  { role: "AYUSH Practitioner", keywords: ["ayurved", "ayush", "homeopath", "unani", "siddha"] },
  { role: "Technician", keywords: ["technician", "technologist", "lab"] },
  { role: "Physiotherapist", keywords: ["physiotherapist", "physical therapist"] },
  { role: "Pharmacist", keywords: ["pharmacist"] },
];

export function resolveJobRoleCategory(job: {
  required_specialization: string;
  title?: string;
  specialty?: string | null;
}): HealthcareRoleCategory | string {
  const stored = job.required_specialization?.trim();
  if (stored && (HEALTHCARE_ROLE_CATEGORIES as readonly string[]).includes(stored)) {
    return stored as HealthcareRoleCategory;
  }

  const haystack = [stored, job.title, job.specialty].filter(Boolean).join(" ").toLowerCase();
  for (const { role, keywords } of LEGACY_ROLE_KEYWORDS) {
    if (keywords.some((kw) => haystack.includes(kw))) return role;
  }
  return stored || "Other Healthcare Professional";
}

export function jobMatchesRoleCategories(
  job: { required_specialization: string; title?: string; specialty?: string | null },
  selectedRoles: string[]
): boolean {
  if (selectedRoles.length === 0) return true;
  const role = resolveJobRoleCategory(job);
  return selectedRoles.includes(role);
}

export function isHealthcareRoleCategory(value: string): value is HealthcareRoleCategory {
  return (HEALTHCARE_ROLE_CATEGORIES as readonly string[]).includes(value);
}

export function defaultSpecialtyForRole(role: HealthcareRoleCategory | string): string {
  const list = SPECIALTIES_BY_ROLE[role as HealthcareRoleCategory];
  return list?.[0] ?? "Other";
}
