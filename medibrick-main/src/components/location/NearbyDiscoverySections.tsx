import { Building2, Briefcase, ShieldCheck, Star, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { NearbyDiscoveryStats, NearbyDiscoveryTrust } from "@/lib/nearby-discovery-types";

function StatCard({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
      {loading ? (
        <Skeleton className="h-7 w-10 mx-auto mb-1" />
      ) : (
        <p className="text-xl font-bold text-primary tabular-nums leading-none">{value}</p>
      )}
      <p className="text-[11px] text-muted-foreground mt-1.5 font-medium leading-tight">{label}</p>
    </div>
  );
}

function TrustChip({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-primary/5 px-2 py-2.5 text-center">
      <Icon className="h-3.5 w-3.5 text-primary/70" />
      {loading ? (
        <Skeleton className="h-4 w-8" />
      ) : (
        <span className="text-sm font-bold text-primary tabular-nums">{value}</span>
      )}
      <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}

export function NearbyMarketplaceStats({
  stats,
  trust,
  loading,
}: {
  stats: NearbyDiscoveryStats;
  trust: NearbyDiscoveryTrust;
  loading?: boolean;
}) {
  const ratingLabel = trust.avgRating != null ? `${trust.avgRating}` : "—";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        <StatCard label="Open shifts" value={String(stats.openShifts)} loading={loading} />
        <StatCard label="Hiring hospitals" value={String(stats.hiringHospitals)} loading={loading} />
        <StatCard label="Professionals" value={String(stats.activeProfessionals)} loading={loading} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <TrustChip icon={ShieldCheck} label="Verified hospitals" value={String(trust.verifiedHospitals)} loading={loading} />
        <TrustChip icon={Users} label="Professionals placed" value={String(trust.professionalsPlaced)} loading={loading} />
        <TrustChip icon={Star} label="Avg rating" value={ratingLabel} loading={loading} />
      </div>
    </div>
  );
}

export function NearbySectionHeading({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: typeof Building2;
}) {
  return (
    <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mt-5 mb-2.5">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </h2>
  );
}

export function NearbyListRow({
  title,
  meta,
  trailing,
  onClick,
}: {
  title: string;
  meta: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="min-w-0">
        <p className="font-semibold text-sm leading-snug truncate">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{meta}</p>
      </div>
      {trailing}
    </Tag>
  );
}

export function NearbyShiftBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
      {children}
    </span>
  );
}

export function NearbyDistanceBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
      {children}
    </span>
  );
}

export { Briefcase, Building2 };
