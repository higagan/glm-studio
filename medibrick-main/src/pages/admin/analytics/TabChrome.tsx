import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { Trend } from "@/lib/founder-metrics-types";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/admin/founder/FounderSections";

export function TabPageHeader({
  title,
  question,
  children,
}: {
  title: string;
  question: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{question}</p>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function KpiDrillCard({
  label,
  value,
  sublabel,
  trend,
  previous,
  to,
  highlight,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: Trend;
  previous?: number;
  to: string;
  highlight?: "default" | "warning" | "success";
}) {
  return (
    <Link to={to} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
      <MetricCard
        label={label}
        value={value}
        sublabel={sublabel}
        trend={trend}
        previous={previous}
        highlight={highlight}
        className="transition-shadow group-hover:shadow-md group-hover:border-primary/30 h-full"
      />
      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 px-1">
        View details <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

export function Panel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card shadow-sm", className)}>
      {title && (
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
