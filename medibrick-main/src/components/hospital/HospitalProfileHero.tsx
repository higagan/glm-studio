import { Building2, CheckCircle2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareHospitalButton from "@/components/ShareHospitalButton";
import { HospitalStatCard } from "@/components/hospital/HospitalSection";
import type { HospitalPublicStats, PublicHospitalProfile } from "@/lib/hospital-types";
import { formatHospitalType } from "@/lib/hospital-types";

export function HospitalProfileHero({
  hospital,
  stats,
  pageSlug,
  onViewShifts,
  followControl,
  shareControl,
}: {
  hospital: PublicHospitalProfile;
  stats: HospitalPublicStats;
  pageSlug: string;
  onViewShifts: () => void;
  followControl?: React.ReactNode;
  shareControl?: React.ReactNode;
}) {
  const locationParts = [hospital.city, hospital.state].filter(Boolean).join(", ");
  const established =
    hospital.established_year ??
    (hospital.years_in_operation
      ? new Date().getFullYear() - hospital.years_in_operation
      : null);

  const metaChips: string[] = [];
  if (hospital.bed_count) metaChips.push(`${hospital.bed_count} beds`);
  if (hospital.emergency_available) metaChips.push("24×7 Emergency");
  if (established) metaChips.push(`Est. ${established}`);

  return (
    <header className="border-b border-border bg-card">
      <div
        className="h-28 sm:h-32 lg:h-36 bg-gradient-to-br from-primary/90 to-primary/60 relative overflow-hidden"
        style={
          hospital.cover_image_url
            ? { backgroundImage: `url(${hospital.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-card" />
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 pb-5 lg:pb-7">
        <div className="flex gap-3.5 lg:gap-5 -mt-12 sm:-mt-14 relative z-10">
          {hospital.logo_url ? (
            <img
              src={hospital.logo_url}
              alt=""
              className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl object-cover border-4 border-card shadow-md flex-shrink-0 self-start"
            />
          ) : (
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-card border-4 border-card shadow-md flex items-center justify-center flex-shrink-0 self-start">
              <Building2 className="h-8 w-8 text-primary/70" />
            </div>
          )}

          <div className="flex-1 min-w-0 pt-10 sm:pt-12 lg:pt-14">
            <h1 className="text-xl lg:text-3xl font-bold text-foreground leading-tight tracking-tight">
              {hospital.hospital_name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-sm text-muted-foreground">
              {hospital.is_verified && (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified
                </span>
              )}
              {hospital.is_verified && <span className="text-border">·</span>}
              <span>{formatHospitalType(hospital.hospital_type)}</span>
              {locationParts && (
                <>
                  <span className="text-border">·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {locationParts}
                  </span>
                </>
              )}
            </div>
            {metaChips.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{metaChips.join(" · ")}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-5">
          <HospitalStatCard
            label="Rating"
            value={stats.averageRating != null ? stats.averageRating.toFixed(1) : "—"}
          />
          <HospitalStatCard label="Reviews" value={String(stats.reviewCount)} />
          <HospitalStatCard label="Worked here" value={String(stats.professionalsWorkedWith)} />
          <HospitalStatCard label="Shifts done" value={String(stats.completedShifts)} />
          <HospitalStatCard
            label="Repeat rate"
            value={stats.repeatProfessionalRate != null ? `${stats.repeatProfessionalRate}%` : "—"}
          />
          <HospitalStatCard label="Open shifts" value={String(stats.openJobs)} />
        </div>

        <div className="flex flex-wrap gap-2 mt-4 lg:hidden">
          <Button onClick={onViewShifts} className="flex-1 min-w-[140px]">
            {stats.openJobs > 0 ? `View ${stats.openJobs} open shift${stats.openJobs === 1 ? "" : "s"}` : "View shifts"}
          </Button>
          {followControl}
          {shareControl ?? (
            <ShareHospitalButton
              hospitalName={hospital.hospital_name}
              slug={pageSlug}
              city={hospital.city}
              variant="outline"
            />
          )}
        </div>
      </div>
    </header>
  );
}
