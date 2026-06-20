import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DropoffPayload, FunnelPayload } from "@/lib/founder-analytics-types";
import {
  FunnelTable,
  LeakBanner,
  PeriodSelect,
  useAnalyticsFetch,
} from "./AnalyticsShell";
import { Panel, TabPageHeader } from "./TabChrome";

function DropoffTable({ stages, total }: { stages: DropoffPayload["stages"]; total: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Dropped at</th>
            <th className="px-4 py-3 text-right font-medium">Count</th>
            <th className="px-4 py-3 text-right font-medium">Share</th>
            <th className="px-4 py-3 text-right font-medium">Trend</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((stage) => (
            <tr key={stage.stage} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium">{stage.stage}</td>
              <td className="px-4 py-3 text-right tabular-nums">{stage.count}</td>
              <td className="px-4 py-3 text-right tabular-nums">{stage.pct}%</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {stage.trendPct == null ? (
                  "—"
                ) : (
                  <span
                    className={cn(
                      stage.trendPct > 0 ? "text-red-600" : stage.trendPct < 0 ? "text-emerald-600" : "",
                    )}
                  >
                    {stage.trendPct > 0 ? "+" : ""}
                    {stage.trendPct}%
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t px-4 py-2 text-xs text-muted-foreground">
        {total} session{total === 1 ? "" : "s"} abandoned the apply funnel (each counted once)
      </p>
    </div>
  );
}

export default function AnalyticsFunnelsPage() {
  const [days, setDays] = useState(7);
  const { data: application, loading: appLoading, error: appError, refresh: refreshApp } =
    useAnalyticsFetch<FunnelPayload>("funnels", days);
  const { data: hospital, loading: hospLoading, refresh: refreshHosp } =
    useAnalyticsFetch<FunnelPayload>("hospital", days);
  const { data: dropoffs, loading: dropLoading, refresh: refreshDrop } =
    useAnalyticsFetch<DropoffPayload>("dropoffs", days);

  const loading = appLoading && !application;
  const refreshAll = () => {
    void refreshApp();
    void refreshHosp();
    void refreshDrop();
  };

  return (
    <div className="space-y-8">
      <TabPageHeader title="Funnels" question="Where are users dropping?">
        <PeriodSelect days={days} onChange={setDays} />
        <Button variant="outline" size="icon" onClick={refreshAll} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </TabPageHeader>

      {appError && <p className="text-sm text-destructive">{appError}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {application && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Job application funnel
              </h3>
              <LeakBanner leak={application.biggestLeak} />
              <FunnelTable steps={application.steps} />
            </section>
          )}

          {dropoffs && !dropLoading && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Friction by stage
              </h3>
              <Panel>
                <DropoffTable stages={dropoffs.stages} total={dropoffs.totalDropoffs} />
              </Panel>
            </section>
          )}

          {hospital && !hospLoading && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Hospital signup funnel
              </h3>
              <LeakBanner leak={hospital.biggestLeak} />
              <FunnelTable steps={hospital.steps} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
