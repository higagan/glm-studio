import { HospitalSection } from "@/components/hospital/HospitalSection";
import type { HospitalHiringActivity } from "@/lib/hospital-types";

export function HospitalHiringActivitySection({ activity }: { activity: HospitalHiringActivity }) {
  const hasData =
    activity.jobsPosted30d > 0 ||
    activity.professionalsHired30d > 0 ||
    activity.topSpecialties.length > 0;

  if (!hasData) return null;

  const topSpecLabel =
    activity.topSpecialties.length > 0
      ? activity.topSpecialties.map((s) => `${s.specialty} (${s.hires})`).join(", ")
      : null;

  return (
    <HospitalSection title="Hiring activity">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-xl font-bold text-primary tabular-nums">{activity.jobsPosted30d}</p>
          <p className="text-xs text-muted-foreground mt-1">Jobs posted (30d)</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-xl font-bold text-primary tabular-nums">{activity.professionalsHired30d}</p>
          <p className="text-xs text-muted-foreground mt-1">Professionals hired (30d)</p>
        </div>
      </div>
      {topSpecLabel && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Most hired specialties: </span>
          {topSpecLabel}
        </p>
      )}
    </HospitalSection>
  );
}
