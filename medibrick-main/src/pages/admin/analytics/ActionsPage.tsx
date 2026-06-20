import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Loader2, RefreshCw, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActionsPayload, FounderAction, FounderActionSeverity } from "@/lib/founder-analytics-types";
import { cn } from "@/lib/utils";
import { useAnalyticsFetch } from "./AnalyticsShell";
import { Panel, TabPageHeader } from "./TabChrome";

const SEVERITY_ORDER: FounderActionSeverity[] = ["high", "medium", "low"];

const SEVERITY_META: Record<
  FounderActionSeverity,
  { label: string; badge: string; border: string; icon: string }
> = {
  high: {
    label: "High priority",
    badge: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
    border: "border-red-500/35",
    icon: "text-red-600",
  },
  medium: {
    label: "Medium priority",
    badge: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
    border: "border-amber-500/35",
    icon: "text-amber-600",
  },
  low: {
    label: "Low priority",
    badge: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30",
    border: "border-sky-500/35",
    icon: "text-sky-600",
  },
};

function ActionCard({ action }: { action: FounderAction }) {
  const meta = SEVERITY_META[action.severity];

  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm", meta.border)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className={cn("mt-0.5 text-lg leading-none", meta.icon)} aria-hidden>
            ⚠
          </span>
          <div className="min-w-0 space-y-2">
            <p className="font-medium leading-snug">{action.title}</p>
            <p className="text-sm text-muted-foreground">{action.impact}</p>
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <span className="font-medium text-foreground">Recommended action: </span>
              <span className="text-muted-foreground">{action.suggestedAction}</span>
            </div>
          </div>
        </div>
        <Badge variant="outline" className={cn("shrink-0 font-normal capitalize", meta.badge)}>
          {action.severity}
        </Badge>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link to={action.investigateHref}>
            Investigate
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function ActionsPage() {
  const [hours, setHours] = useState(24);
  const { data, loading, error, refresh } = useAnalyticsFetch<ActionsPayload>("actions", 7, {
    hours: String(hours),
  });

  const grouped = SEVERITY_ORDER.map((severity) => ({
    severity,
    items: (data?.actions ?? []).filter((a) => a.severity === severity),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <TabPageHeader title="Action Center" question="What should I work on today?">
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
        >
          <option value={24}>Last 24 hours</option>
          <option value={48}>Last 48 hours</option>
          <option value={72}>Last 72 hours</option>
        </select>
        <Button variant="outline" size="icon" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </TabPageHeader>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-primary" />
            <span>
              Briefing generated {formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })}
            </span>
            {data.summary.total > 0 ? (
              <>
                <span className="text-border">·</span>
                <span>
                  {data.summary.high} high · {data.summary.medium} medium · {data.summary.low} low
                </span>
              </>
            ) : null}
          </div>

          {data.summary.total === 0 ? (
            <Panel>
              <div className="py-10 text-center">
                <p className="text-lg font-medium">All clear for now</p>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                  No actionable issues in the last {data.periodHours} hours. Check Marketplace Health
                  or Recovery when traffic picks up.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin/analytics/marketplace">Marketplace Health</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin/analytics/recovery">Recovery</Link>
                  </Button>
                </div>
              </div>
            </Panel>
          ) : (
            <div className="space-y-8">
              {grouped.map(({ severity, items }) => (
                <section key={severity} className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {SEVERITY_META[severity].label}
                  </h3>
                  <div className="space-y-3">
                    {items.map((action) => (
                      <ActionCard key={action.id} action={action} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
