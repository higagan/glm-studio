export type HospitalProfileRecord = {
  hospital_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  hospital_type?: string | null;
};

export type HospitalProfileFieldKey =
  | "hospital_name"
  | "address"
  | "latitude"
  | "longitude"
  | "city"
  | "state"
  | "description";

type FieldDef = {
  key: HospitalProfileFieldKey;
  label: string;
  requiredForPosting: boolean;
  countsTowardCompletion: boolean;
};

/** Single source of truth for hospital profile readiness. */
export const HOSPITAL_PROFILE_FIELDS: FieldDef[] = [
  { key: "hospital_name", label: "Hospital name", requiredForPosting: true, countsTowardCompletion: true },
  { key: "address", label: "Hospital address", requiredForPosting: true, countsTowardCompletion: true },
  { key: "latitude", label: "Map location (latitude)", requiredForPosting: true, countsTowardCompletion: true },
  { key: "longitude", label: "Map location (longitude)", requiredForPosting: true, countsTowardCompletion: true },
  { key: "city", label: "City", requiredForPosting: false, countsTowardCompletion: true },
  { key: "state", label: "State", requiredForPosting: false, countsTowardCompletion: true },
  { key: "description", label: "About your hospital", requiredForPosting: false, countsTowardCompletion: true },
];

function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "number") return Number.isFinite(value);
  return String(value).trim() !== "";
}

function fieldValue(profile: HospitalProfileRecord | null | undefined, key: HospitalProfileFieldKey): unknown {
  if (!profile) return null;
  return profile[key];
}

/** Required to post shifts and clear dashboard gating banners. */
export function isHospitalProfileReadyForPosting(
  profile: HospitalProfileRecord | null | undefined
): boolean {
  if (!profile) return false;
  return HOSPITAL_PROFILE_FIELDS.filter((f) => f.requiredForPosting).every((f) =>
    isFilled(fieldValue(profile, f.key))
  );
}

/** Profile strength for progress UI (optional fields included). */
export function getHospitalProfileCompletionPercent(
  profile: HospitalProfileRecord | null | undefined
): number {
  if (!profile) return 0;
  const counted = HOSPITAL_PROFILE_FIELDS.filter((f) => f.countsTowardCompletion);
  const filled = counted.filter((f) => isFilled(fieldValue(profile, f.key))).length;
  return Math.round((filled / counted.length) * 100);
}

export type MissingHospitalProfileField = {
  key: HospitalProfileFieldKey;
  label: string;
  requiredForPosting: boolean;
};

export function getMissingHospitalProfileFields(
  profile: HospitalProfileRecord | null | undefined,
  { postingOnly = false }: { postingOnly?: boolean } = {}
): MissingHospitalProfileField[] {
  return HOSPITAL_PROFILE_FIELDS.filter((f) => {
    if (postingOnly && !f.requiredForPosting) return false;
    return !isFilled(fieldValue(profile, f.key));
  }).map((f) => ({
    key: f.key,
    label: f.label,
    requiredForPosting: f.requiredForPosting,
  }));
}

/** Human-readable labels for posting blockers (collapse lat/lng into one line). */
export function getPostingBlockerLabels(
  profile: HospitalProfileRecord | null | undefined
): string[] {
  const missing = getMissingHospitalProfileFields(profile, { postingOnly: true });
  const labels = new Set<string>();

  for (const field of missing) {
    if (field.key === "latitude" || field.key === "longitude") {
      labels.add("Verified map location — pick your address from the dropdown");
    } else {
      labels.add(field.label);
    }
  }

  return Array.from(labels);
}
