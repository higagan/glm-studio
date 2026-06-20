import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ConfidencePayload } from "@/lib/founder-analytics-types";
import { Panel } from "./TabChrome";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

export function IntegrityStatusBadge({
  status,
}: {
  status: "OK" | "WARNING" | "ERROR" | "PASS" | "FAIL";
}) {
  const variant =
    status === "OK" || status === "PASS"
      ? "default"
      : status === "WARNING"
        ? "secondary"
        : "destructive";
  const className =
    status === "OK" || status === "PASS"
      ? "bg-emerald-600 hover:bg-emerald-600"
      : status === "WARNING"
        ? "bg-amber-500/90 text-amber-950 hover:bg-amber-500/90"
        : undefined;

  return (
    <Badge variant={variant} className={cn("font-mono text-xs", className)}>
      {status}
    </Badge>
  );
}

export function ConfidenceBanner({ data }: { data: ConfidencePayload | null }) {
  if (!data) return null;

  const Icon =
    data.score >= 90 ? ShieldCheck : data.score >= 70 ? ShieldAlert : ShieldX;
  const tone =
    data.score >= 90
      ? "border-emerald-500/40 bg-emerald-500/10"
      : data.score >= 70
        ? "border-amber-500/40 bg-amber-500/10"
        : "border-red-500/40 bg-red-500/10";

  return (
    <Panel className={tone}>
      <div className="flex flex-wrap items-start gap-4">
        <Icon
          className={cn(
            "h-8 w-8 shrink-0",
            data.score >= 90 ? "text-emerald-600" : data.score >= 70 ? "text-amber-600" : "text-red-600",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tabular-nums">{data.score}% Analytics Confidence</p>
          <p className="text-sm text-muted-foreground mt-0.5">{data.label}</p>
          {data.deductions.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {data.deductions.map((d, i) => (
                <li key={i}>
                  −{d.points} pts: {d.reason}
                  {d.detail ? ` (${d.detail})` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}
