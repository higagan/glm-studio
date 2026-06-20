import { Clock, RefreshCw, Star, Timer, TrendingUp } from "lucide-react";
import { HospitalSection } from "@/components/hospital/HospitalSection";
import type { HospitalPublicStats } from "@/lib/hospital-types";

function MetricRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-3">
      <Icon className="h-4 w-4 text-primary/70 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function HospitalWorkingExperience({ stats }: { stats: HospitalPublicStats }) {
  const hasData =
    stats.avgPaymentDays != null ||
    stats.repeatProfessionalRate != null ||
    stats.averageRating != null ||
    stats.avgResponseHours != null ||
    stats.averageFillTimeHours != null;

  if (!hasData) return null;

  return (
    <HospitalSection title="Working experience">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <MetricRow
          icon={Clock}
          label="Avg payment time"
          value={stats.avgPaymentDays != null ? `${stats.avgPaymentDays} days` : "Coming soon"}
        />
        <MetricRow
          icon={RefreshCw}
          label="Repeat professionals"
          value={stats.repeatProfessionalRate != null ? `${stats.repeatProfessionalRate}%` : "—"}
        />
        <MetricRow
          icon={Star}
          label="Average rating"
          value={stats.averageRating != null ? `${stats.averageRating.toFixed(1)} / 5` : "—"}
        />
        <MetricRow
          icon={Timer}
          label="Avg response time"
          value={stats.avgResponseHours != null ? `${stats.avgResponseHours}h` : "Coming soon"}
        />
        {stats.averageFillTimeHours != null && (
          <MetricRow icon={TrendingUp} label="Avg hours to fill shifts" value={`${stats.averageFillTimeHours}h`} />
        )}
      </div>
    </HospitalSection>
  );
}
