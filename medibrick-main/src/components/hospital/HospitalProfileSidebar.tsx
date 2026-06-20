import { Button } from "@/components/ui/button";
import ShareHospitalButton from "@/components/ShareHospitalButton";
import { HospitalFollowButton } from "@/components/hospital/HospitalFollowButton";
import type { HospitalPublicStats, PublicHospitalProfile } from "@/lib/hospital-types";

export function HospitalProfileSidebar({
  hospital,
  stats,
  pageSlug,
  isFollowing,
  onViewShifts,
  onFollowingChange,
}: {
  hospital: PublicHospitalProfile;
  stats: HospitalPublicStats;
  pageSlug: string;
  isFollowing: boolean;
  onViewShifts: () => void;
  onFollowingChange: (following: boolean) => void;
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm">
        <Button onClick={onViewShifts} className="w-full" size="lg">
          {stats.openJobs > 0
            ? `View ${stats.openJobs} open shift${stats.openJobs === 1 ? "" : "s"}`
            : "View shifts"}
        </Button>
        <HospitalFollowButton
          hospitalId={hospital.id}
          hospitalSlug={pageSlug}
          isFollowing={isFollowing}
          onFollowingChange={onFollowingChange}
          className="w-full"
        />
        <ShareHospitalButton
          hospitalName={hospital.hospital_name}
          slug={pageSlug}
          city={hospital.city}
          variant="outline"
          className="w-full"
        />
        <div className="pt-3 border-t border-border space-y-2 text-xs text-muted-foreground">
          {stats.avgPaymentDays != null && (
            <p>
              Avg payment: <span className="font-medium text-foreground">{stats.avgPaymentDays} days</span>
            </p>
          )}
          {stats.avgResponseHours != null && (
            <p>
              Response time: <span className="font-medium text-foreground">{stats.avgResponseHours}h</span>
            </p>
          )}
          {stats.followerCount > 0 && (
            <p>
              <span className="font-medium text-foreground">{stats.followerCount}</span> followers
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
