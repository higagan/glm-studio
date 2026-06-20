/**
 * Quick verification for hospital profile readiness rules.
 * Run: node scripts/product-review/test-hospital-profile-readiness.mjs
 */

const HOSPITAL_PROFILE_FIELDS = [
  { key: "hospital_name", label: "Hospital name", requiredForPosting: true, countsTowardCompletion: true },
  { key: "address", label: "Hospital address", requiredForPosting: true, countsTowardCompletion: true },
  { key: "latitude", label: "Map location (latitude)", requiredForPosting: true, countsTowardCompletion: true },
  { key: "longitude", label: "Map location (longitude)", requiredForPosting: true, countsTowardCompletion: true },
  { key: "city", label: "City", requiredForPosting: false, countsTowardCompletion: true },
  { key: "state", label: "State", requiredForPosting: false, countsTowardCompletion: true },
  { key: "description", label: "About your hospital", requiredForPosting: false, countsTowardCompletion: true },
];

function isFilled(value) {
  if (value == null) return false;
  if (typeof value === "number") return Number.isFinite(value);
  return String(value).trim() !== "";
}

function isReady(profile) {
  return HOSPITAL_PROFILE_FIELDS.filter((f) => f.requiredForPosting).every((f) =>
    isFilled(profile[f.key])
  );
}

function completion(profile) {
  const counted = HOSPITAL_PROFILE_FIELDS.filter((f) => f.countsTowardCompletion);
  const filled = counted.filter((f) => isFilled(profile[f.key])).length;
  return Math.round((filled / counted.length) * 100);
}

const cases = [
  {
    name: "empty profile",
    profile: {},
    ready: false,
    pct: 0,
  },
  {
    name: "name only (onboarding)",
    profile: { hospital_name: "Kauvery" },
    ready: false,
    pct: 14,
  },
  {
    name: "posting-ready minimum",
    profile: {
      hospital_name: "Kauvery",
      address: "123 Main St",
      latitude: 12.97,
      longitude: 77.59,
    },
    ready: true,
    pct: 57,
  },
  {
    name: "full profile",
    profile: {
      hospital_name: "Kauvery",
      address: "123 Main St",
      latitude: 12.97,
      longitude: 77.59,
      city: "Bengaluru",
      state: "Karnataka",
      description: "Multi-speciality hospital",
    },
    ready: true,
    pct: 100,
  },
];

let failed = 0;
for (const c of cases) {
  const ready = isReady(c.profile);
  const pct = completion(c.profile);
  const ok = ready === c.ready && pct === c.pct;
  console.log(`${ok ? "PASS" : "FAIL"} ${c.name} ready=${ready} pct=${pct}`);
  if (!ok) failed++;
}

process.exit(failed > 0 ? 1 : 0);
