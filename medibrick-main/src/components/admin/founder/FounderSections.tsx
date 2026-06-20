import { cn } from "@/lib/utils";
import { Minus, TrendingDown, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import type { Trend, TrackedMetric } from "@/lib/founder-metrics-types";

export function formatPct(value: number | null | undefined, suffix = "%") {
  if (value === null || value === undefined) return "—";
  return `${value}${suffix}`;
}

export function formatHours(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${value}h`;
}

export function specialtyLabel(category: string) {
  const labels: Record<string, string> = {
    doctors: "Doctors",
    nurses: "Nurses",
    ayush: "AYUSH",
    technicians: "Technicians",
    physiotherapists: "Physiotherapists",
    lab_staff: "Lab Staff",
    other: "Other",
  };
  return labels[category] ?? category;
}

export function Section({
  title,
  subtitle,
  children,
  id,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-24">
      <div>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  sublabel,
  trend,
  previous,
  highlight = "default",
  className,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: Trend;
  previous?: number;
  highlight?: "default" | "warning" | "success";
  className?: string;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "text-secondary" : trend === "down" ? "text-destructive" : "text-muted-foreground";
  const borderAccent =
    highlight === "warning" ? "border-amber-500/30" : highlight === "success" ? "border-secondary/30" : "border-border";

  return (
    <div className={cn("rounded-xl border bg-card p-4 sm:p-5 shadow-sm", borderAccent, className)}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums leading-none">{value}</p>
        {trend && previous !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span>vs {previous}</span>
          </div>
        )}
      </div>
      {sublabel && <p className="mt-2 text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

export function TrackedMetricCard({ label, metric }: { label: string; metric: TrackedMetric }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl sm:text-3xl font-bold text-foreground tabular-nums">{metric.label}</p>
      {!metric.tracked && metric.note && (
        <p className="mt-2 text-xs text-muted-foreground">{metric.note}</p>
      )}
    </div>
  );
}

export function HealthBanner({ healthier }: { healthier: boolean | null }) {
  if (healthier === null) return null;
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 flex items-center gap-2 text-sm font-medium",
        healthier
          ? "border-secondary/30 bg-secondary/10 text-secondary"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      )}
    >
      {healthier ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {healthier
        ? "Marketplace looks healthier this week than last week"
        : "Marketplace activity is softer than last week — review fill rate and applications"}
    </div>
  );
}

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={cn(i > 0 && "border-t border-border")}>
              {row.map((cell, j) => (
                <td key={j} className={cn("px-4 py-3 tabular-nums", j === 0 && "font-medium text-foreground")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BarRow({
  label,
  value,
  max,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm gap-2">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums shrink-0">
          {value}
          {suffix ? ` · ${suffix}` : ""}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
