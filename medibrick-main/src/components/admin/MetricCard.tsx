import { cn } from "@/lib/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

type Trend = "up" | "down" | "flat" | null;

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: Trend;
  previous?: number;
  highlight?: "default" | "warning" | "success";
  className?: string;
}

export default function MetricCard({
  label,
  value,
  sublabel,
  trend,
  previous,
  highlight = "default",
  className,
}: MetricCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const trendColor =
    trend === "up"
      ? "text-secondary"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  const borderAccent =
    highlight === "warning"
      ? "border-amber-500/30"
      : highlight === "success"
        ? "border-secondary/30"
        : "border-border";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 sm:p-5 shadow-sm",
        borderAccent,
        className
      )}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums leading-none">
          {value}
        </p>
        {trend && previous !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span>vs {previous}</span>
          </div>
        )}
      </div>
      {sublabel && (
        <p className="mt-2 text-xs text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}
