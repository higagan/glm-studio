#!/usr/bin/env node
/**
 * Validates India-first shift title generation for Post Shift auto-titles.
 */
import {
  generateShiftTitle,
  resolveJobRoleCategory,
  jobMatchesRoleCategories,
} from "../../src/lib/healthcare-roles.ts";

const cases = [
  { role: "Doctor", dept: "ICU", specialty: "General Physician", want: "ICU Duty Doctor" },
  { role: "Nurse", dept: "OT (Operation Theatre)", specialty: "OT Nurse", want: "OT Staff Nurse" },
  { role: "Doctor", dept: "Emergency", specialty: "Emergency Medicine", want: "Emergency Duty Doctor" },
  { role: "AYUSH Practitioner", dept: "General Ward", specialty: "Ayurveda", want: "General Ward Ayurveda Practitioner" },
];

let failed = 0;
for (const c of cases) {
  const got = generateShiftTitle(c.role, c.dept, c.specialty);
  if (got !== c.want) {
    console.error(`FAIL ${c.role}+${c.dept}: got "${got}", want "${c.want}"`);
    failed++;
  } else {
    console.log(`PASS ${got}`);
  }
}

const legacy = resolveJobRoleCategory({
  required_specialization: "Registered Nurse (RN)",
  title: "ER Nurse Night Shift",
});
if (legacy !== "Nurse") {
  console.error(`FAIL legacy role resolve: ${legacy}`);
  failed++;
} else {
  console.log("PASS legacy RN → Nurse");
}

const match = jobMatchesRoleCategories(
  { required_specialization: "Doctor", title: "ICU Duty Doctor" },
  ["Doctor"]
);
if (!match) {
  console.error("FAIL role filter match");
  failed++;
} else {
  console.log("PASS role filter");
}

process.exit(failed > 0 ? 1 : 0);
