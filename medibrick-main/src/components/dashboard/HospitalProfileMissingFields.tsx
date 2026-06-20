import { getMissingHospitalProfileFields, type HospitalProfileRecord } from "@/lib/hospital-profile-readiness";
import { cn } from "@/lib/utils";
import { Circle } from "lucide-react";

export function HospitalProfileMissingFields({
  profile,
  postingOnly = true,
  className,
}: {
  profile: HospitalProfileRecord | null | undefined;
  postingOnly?: boolean;
  className?: string;
}) {
  const missing = getMissingHospitalProfileFields(profile, { postingOnly });

  if (missing.length === 0) return null;

  const displayLabels = missing.map((field) => {
    if (field.key === "latitude" || field.key === "longitude") {
      return "Verified map location (pick address from dropdown)";
    }
    return field.label;
  });
  const uniqueLabels = Array.from(new Set(displayLabels));

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-foreground">Missing fields:</p>
      <ul className="space-y-1.5">
        {uniqueLabels.map((label) => (
          <li key={label} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Circle className="h-4 w-4 mt-0.5 flex-shrink-0 text-warning" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HospitalProfileCompletionSummary({
  profile,
  className,
}: {
  profile: HospitalProfileRecord | null | undefined;
  className?: string;
}) {
  const missing = getMissingHospitalProfileFields(profile, { postingOnly: false });
  const complete = HOSPITAL_PROFILE_FIELDS_COUNT - missing.length;

  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {complete} of {HOSPITAL_PROFILE_FIELDS_COUNT} profile fields complete
    </p>
  );
}

const HOSPITAL_PROFILE_FIELDS_COUNT = 7;

export function HospitalProfileReadyBadge({ ready }: { ready: boolean }) {
  if (!ready) return null;
  return (
    <p className="text-sm text-success flex items-center gap-1.5">
      <CheckCircle2 className="h-4 w-4" />
      Profile ready to post shifts
    </p>
  );
}
