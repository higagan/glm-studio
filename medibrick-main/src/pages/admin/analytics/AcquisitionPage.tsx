import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPct, MetricCard, Section } from "@/components/admin/founder/FounderSections";
import type { AcquisitionPayload } from "@/lib/founder-analytics-types";
import { useFounderMetrics } from "./analytics-hooks";
import { Panel, TabPageHeader } from "./TabChrome";
import { PeriodSelect, useAnalyticsFetch } from "./AnalyticsShell";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const ATTRIBUTION_SOURCES = ["google", "whatsapp", "direct", "referral", "linkedin"] as const;

export default function AnalyticsAcquisitionPage() {
  const [days, setDays] = useState(7);
  const { metrics, loading: metricsLoading, refresh: refreshMetrics } = useFounderMetrics();
  const { data, loading, error, refresh } = useAnalyticsFetch<AcquisitionPayload>("acquisition", days);

  const loadingAny = (metricsLoading && !metrics) || (loading && !data);

  const refreshAll = () => {
    void refreshMetrics();
    void refresh();
  };

  return (
    <div className="space-y-8">
      <TabPageHeader title="Acquisition & Virality" question="Where are users coming from — and is sharing driving growth?">
        <PeriodSelect days={days} onChange={setDays} />
        <Button variant="outline" size="icon" onClick={refreshAll} disabled={loadingAny}>
          <RefreshCw className={loadingAny ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </TabPageHeader>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Phase 14 — virality */}
      {metrics && (
        <Section title="Virality & sharing" subtitle="Is WhatsApp becoming a growth channel?">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <MetricCard
              label="Jobs Shared"
              value={metrics.virality.jobsShared.value}
              trend={metrics.virality.jobsShared.trend}
              previous={metrics.virality.jobsShared.previous}
              sublabel="Last 7 days"
            />
            <MetricCard
              label="Hospital Profiles Shared"
              value={metrics.virality.hospitalProfilesShared.value}
              trend={metrics.virality.hospitalProfilesShared.trend}
              previous={metrics.virality.hospitalProfilesShared.previous}
            />
            <MetricCard
              label="WhatsApp Shares"
              value={metrics.virality.whatsappShares.value}
              trend={metrics.virality.whatsappShares.trend}
              previous={metrics.virality.whatsappShares.previous}
            />
            <MetricCard
              label="Share → View Rate"
              value={formatPct(metrics.virality.shareToViewRatePct)}
              sublabel="Views per share"
            />
            <MetricCard
              label="Share → Application"
              value={formatPct(metrics.virality.shareToApplicationRatePct)}
              sublabel="Apps per share"
            />
          </div>

          <Panel title="Application source attribution (from referrals)">
            <div className="flex flex-wrap gap-2">
              {ATTRIBUTION_SOURCES.map((source) => {
                const count = metrics.virality.attribution[source] ?? 0;
                return (
                  <Badge key={source} variant={count > 0 ? "default" : "outline"} className="capitalize">
                    {source}: {count}
                  </Badge>
                );
              })}
              {Object.keys(metrics.virality.attribution).length === 0 && (
                <span className="text-sm text-muted-foreground">No referral data yet — use ?via= on share links</span>
              )}
            </div>
          </Panel>
        </Section>
      )}

      <Section title="Traffic by source" subtitle="Session-level acquisition quality (product events)">
        {loadingAny ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Source</th>
                  <th className="px-4 py-3 text-right font-medium">Visitors</th>
                  <th className="px-4 py-3 text-right font-medium">Job Views</th>
                  <th className="px-4 py-3 text-right font-medium">Apply Clicks</th>
                  <th className="px-4 py-3 text-right font-medium">Applications</th>
                  <th className="px-4 py-3 text-right font-medium">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No acquisition data yet — events appear with ?via= or referrer.
                    </td>
                  </tr>
                ) : (
                  data.sources.map((row) => (
                    <tr key={row.source} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{capitalize(row.source)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.visitors}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.job_views}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.apply_clicks}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.applications}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{row.conversion_pct}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </Section>
    </div>
  );
}
