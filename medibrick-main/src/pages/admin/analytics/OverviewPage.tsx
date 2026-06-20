import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatPct,
  HealthBanner,
  MetricCard,
  TrackedMetricCard,
} from "@/components/admin/founder/FounderSections";
import { useFounderMetrics } from "./analytics-hooks";
import { KpiDrillCard, TabPageHeader } from "./TabChrome";

/** Phase 15 — 10-second executive summary (8 KPIs only) */
export default function OverviewPage() {
  const { metrics, loading, error, refresh } = useFounderMetrics();

  return (
    <div className="space-y-6">
      <TabPageHeader title="Executive Summary" question="Is Medibrick healthier this week than last week?">
        <Button variant="outline" size="icon" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </TabPageHeader>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && !metrics ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : metrics ? (
        <>
          <HealthBanner healthier={metrics.executiveSummary.healthierThanLastWeek} />
          <p className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(new Date(metrics.fetchedAt), { addSuffix: true })}
          </p>

          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <KpiDrillCard
              label="Open Jobs"
              value={metrics.executiveSummary.openJobs.value}
              to="/admin/analytics/debug?metric=open_jobs"
            />
            <KpiDrillCard
              label="New Shifts (7d)"
              value={metrics.executiveSummary.newShiftPosts7d.value}
              trend={metrics.executiveSummary.newShiftPosts7d.trend}
              previous={metrics.executiveSummary.newShiftPosts7d.previous}
              sublabel="Posted this week vs prior week"
              to="/admin/analytics/debug?metric=new_shifts_7d"
            />
            <KpiDrillCard
              label="Fill Rate"
              value={`${metrics.executiveSummary.fillRatePct.value}%`}
              trend={metrics.executiveSummary.fillRatePct.trend}
              previous={metrics.executiveSummary.fillRatePct.previous}
              to="/admin/analytics/debug?metric=fill_rate"
            />
            <Link to="/admin/analytics/debug?metric=no_show_rate" className="block">
              <TrackedMetricCard label="No-Show Rate" metric={metrics.executiveSummary.noShowRatePct} />
            </Link>
            <KpiDrillCard
              label="Applications"
              value={metrics.executiveSummary.applications7d.value}
              trend={metrics.executiveSummary.applications7d.trend}
              previous={metrics.executiveSummary.applications7d.previous}
              sublabel="Last 7 days"
              to="/admin/analytics/debug?metric=applications_7d"
            />
            <KpiDrillCard
              label="Repeat Hospitals"
              value={metrics.executiveSummary.repeatHospitals.value}
              trend={metrics.executiveSummary.repeatHospitals.trend}
              previous={metrics.executiveSummary.repeatHospitals.previous}
              to="/admin/analytics/debug?metric=repeat_hospitals"
            />
            <Link to="/admin/analytics/debug?metric=applications_per_job" className="block">
              <MetricCard label="Applications / Job" value={metrics.executiveSummary.applicationsPerJob.label} />
            </Link>
            <KpiDrillCard
              label="Top City"
              value={metrics.executiveSummary.topCity}
              sublabel="By open shifts"
              to="/admin/analytics/marketplace#geography"
            />
            <KpiDrillCard
              label="Top Specialty"
              value={metrics.executiveSummary.topSpecialty}
              sublabel="By job volume"
              to="/admin/analytics/marketplace#specialty"
            />
          </div>

          <div className="flex flex-wrap gap-4 text-sm pt-2">
            <Button variant="link" className="h-auto p-0" asChild>
              <Link to="/admin/analytics/marketplace">Full marketplace health →</Link>
            </Button>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link to="/admin/analytics/funnels">Funnel drop-offs →</Link>
            </Button>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link to="/admin/analytics/debug">Verify all metrics →</Link>
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
