import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  BarChart3,
  ExternalLink,
  Loader2,
  LogOut,
  RefreshCw,
  Route as RouteIcon,
  Settings,
  Shield,
} from "lucide-react";
import {
  BarRow,
  DataTable,
  formatHours,
  formatPct,
  HealthBanner,
  MetricCard,
  Section,
  specialtyLabel,
  TrackedMetricCard,
} from "@/components/admin/founder/FounderSections";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminGate } from "@/hooks/useAdminGate";
import { getFounderGateToken } from "@/lib/founder-gate";
import type { FounderMetricsPayload } from "@/lib/founder-metrics-types";
import { cn } from "@/lib/utils";

function StatusBadge({ status, label }: { status: string; label: string }) {
  const variant =
    status === "ok" || status === "healthy"
      ? "secondary"
      : status === "warning" || status === "error"
        ? "destructive"
        : "outline";
  return (
    <Badge variant={variant} className="font-normal">
      {label}
    </Badge>
  );
}

function formatEventName(name: string) {
  return name.replace(/_/g, " ");
}

export default function AdminMetrics() {
  const { loading: authLoading, isAuthed, logout } = useAdminGate();
  const [metrics, setMetrics] = useState<FounderMetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getFounderGateToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }
      const res = await fetch("/api/founder-metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setMetrics(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthed) fetchMetrics();
  }, [isAuthed, fetchMetrics]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthed) return null;

  const maxCityJobs = Math.max(...(metrics?.geography.map((g) => g.jobs) ?? [1]), 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Founder Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Marketplace health · IST boundaries · real production data
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button asChild variant="default" size="sm" className="gap-2">
              <Link to="/admin/analytics/funnels">
                <RouteIcon className="h-4 w-4" />
                Journeys
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/admin/manage">
                <Settings className="h-4 w-4" />
                Manage
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Lock
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8 space-y-10 max-w-6xl">
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
            <p className="mt-2 text-xs text-muted-foreground">
              Apply migrations <code>20260616120000</code> and <code>20260617120000</code> in Supabase.
              Set <code>SUPABASE_SERVICE_ROLE_KEY</code> + <code>SUPABASE_URL</code> in Vercel Production, then redeploy.
            </p>
          </div>
        )}

        {loading && !metrics ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : metrics ? (
          <>
            <p className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(new Date(metrics.fetchedAt), { addSuffix: true })}
            </p>

            {/* Phase 15 — Executive Summary */}
            <Section title="Executive Summary" subtitle="Is MediBricks healthier this week? (10-second view)">
              <HealthBanner healthier={metrics.executiveSummary.healthierThanLastWeek} />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <MetricCard label="Open Jobs" value={metrics.executiveSummary.openJobs.value} />
                <MetricCard label="New Shifts (7d)" value={metrics.executiveSummary.newShiftPosts7d.value} trend={metrics.executiveSummary.newShiftPosts7d.trend} previous={metrics.executiveSummary.newShiftPosts7d.previous} sublabel="Posted this week vs prior week" />
                <MetricCard label="Fill Rate" value={formatPct(metrics.marketplaceHealth.fillRatePct)} sublabel="filled ÷ all shifts" />
                <TrackedMetricCard label="No-Show Rate" metric={metrics.executiveSummary.noShowRatePct} />
                <MetricCard label="Applications (7d)" value={metrics.executiveSummary.applications7d.value} trend={metrics.executiveSummary.applications7d.trend} previous={metrics.executiveSummary.applications7d.previous} />
                <MetricCard label="Returning Hospitals" value={metrics.executiveSummary.repeatHospitals.value} trend={metrics.executiveSummary.repeatHospitals.trend} previous={metrics.executiveSummary.repeatHospitals.previous} />
                <MetricCard label="Applications / Job" value={metrics.executiveSummary.applicationsPerJob.label} />
                <MetricCard label="Top City" value={metrics.executiveSummary.topCity} sublabel="by open shifts" />
                <MetricCard label="Top Specialty" value={metrics.executiveSummary.topSpecialty} sublabel="by job volume" />
              </div>
            </Section>

            {/* Phase 8 */}
            <Section title="Marketplace Health" subtitle="Staffing reliability — the core business proof" id="marketplace">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <MetricCard label="Open Shifts" value={metrics.marketplaceHealth.openShifts} />
                <MetricCard label="Filled Shifts" value={metrics.marketplaceHealth.filledShifts} highlight="success" />
                <MetricCard label="Fill Rate" value={formatPct(metrics.marketplaceHealth.fillRatePct)} />
                <MetricCard label="Avg Time To Fill" value={formatHours(metrics.marketplaceHealth.avgHoursToFill)} sublabel="created → filled" />
                <TrackedMetricCard label="No-Show Rate" metric={metrics.marketplaceHealth.noShowRatePct} />
              </div>
            </Section>

            {/* Phase 9 */}
            <Section title="Hospital Retention" subtitle="Repeat posting matters more than total hospital count" id="retention">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <MetricCard label="Hospitals Posted (month)" value={metrics.hospitalRetention.hospitalsPostedThisMonth} />
                <MetricCard label="Returning Hospitals" value={metrics.hospitalRetention.returningHospitals} sublabel="posted before + again this month" />
                <MetricCard label="Repeat Posting Rate" value={formatPct(metrics.hospitalRetention.repeatPostingRatePct)} />
                <MetricCard label="Jobs / Hospital" value={metrics.hospitalRetention.jobsPerHospital ?? "—"} />
              </div>
            </Section>

            {/* Phase 10 */}
            <Section title="Professional Quality" subtitle="Supply-side health with week-over-week trends" id="professionals">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <MetricCard label="Verified Professionals" value={metrics.professionalQuality.verifiedProfessionals.value} trend={metrics.professionalQuality.verifiedProfessionals.trend} previous={metrics.professionalQuality.verifiedProfessionals.previous} />
                <MetricCard label="Profile Completion" value={formatPct(metrics.professionalQuality.profileCompletionRatePct)} />
                <MetricCard label="Applications / Job" value={metrics.professionalQuality.applicationsPerJob ?? "—"} />
                <MetricCard label="Acceptance Rate" value={formatPct(metrics.professionalQuality.acceptanceRatePct)} />
                <MetricCard label="Application → Hire" value={formatPct(metrics.professionalQuality.applicationToHireRatePct)} />
              </div>
            </Section>

            {/* Phase 11 — Trust */}
            <Section title="Trust Dashboard" subtitle="MediBricks moat — verification, ratings, reliability" id="trust">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <MetricCard label="Verified Hospitals" value={metrics.trust.verifiedHospitals} />
                <MetricCard label="Verified Professionals" value={metrics.trust.verifiedProfessionals} />
                <MetricCard label="Avg Hospital Rating" value={metrics.trust.avgHospitalRating ?? "—"} sublabel="from shift reviews" />
                <TrackedMetricCard label="Avg Pro Rating" metric={metrics.trust.avgProfessionalRating} />
                <TrackedMetricCard label="No-Show Rate" metric={metrics.trust.noShowRatePct} />
                <TrackedMetricCard label="Payment SLA" metric={metrics.trust.paymentSlaHours} />
                <TrackedMetricCard label="Avg Time To Payment" metric={metrics.trust.avgTimeToPaymentHours} />
                <TrackedMetricCard label="Disputes Reported" metric={metrics.trust.disputesReported} />
                <TrackedMetricCard label="Disputes Resolved" metric={metrics.trust.disputesResolved} />
              </div>
            </Section>

            {/* Phase 12 — Geography */}
            <Section title="Geography" subtitle="Top cities by jobs, applications, and supply" id="geography">
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Jobs by city</p>
                  {metrics.geography.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No city data yet</p>
                  ) : (
                    metrics.geography.map((g) => (
                      <BarRow key={g.city} label={g.city} value={g.jobs} max={maxCityJobs} />
                    ))
                  )}
                </div>
                <DataTable
                  headers={["City", "Jobs", "Applications", "Hospitals", "Professionals"]}
                  rows={metrics.geography.map((g) => [
                    g.city,
                    g.jobs,
                    g.applications,
                    g.activeHospitals,
                    g.activeProfessionals,
                  ])}
                />
              </div>
            </Section>

            {/* Phase 13 — Specialty */}
            <Section title="Specialty Analytics" subtitle="Where marketplace liquidity is forming" id="specialty">
              <DataTable
                headers={["Specialty", "Jobs", "Applications", "Conversion", "Fill Rate"]}
                rows={metrics.specialty.map((s) => [
                  specialtyLabel(s.category),
                  s.jobs,
                  s.applications,
                  formatPct(s.conversionRatePct),
                  formatPct(s.fillRatePct),
                ])}
              />
            </Section>

            {/* Phase 14 — Virality */}
            <Section title="Virality & Sharing" subtitle="Is WhatsApp becoming a growth channel?" id="virality">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <MetricCard label="Jobs Shared (7d)" value={metrics.virality.jobsShared.value} trend={metrics.virality.jobsShared.trend} previous={metrics.virality.jobsShared.previous} />
                <MetricCard label="Hospital Profiles Shared" value={metrics.virality.hospitalProfilesShared.value} trend={metrics.virality.hospitalProfilesShared.trend} previous={metrics.virality.hospitalProfilesShared.previous} />
                <MetricCard label="WhatsApp Shares" value={metrics.virality.whatsappShares.value} trend={metrics.virality.whatsappShares.trend} previous={metrics.virality.whatsappShares.previous} />
                <MetricCard label="Share → View Rate" value={formatPct(metrics.virality.shareToViewRatePct)} sublabel="views per share (7d)" />
                <MetricCard label="Share → Application" value={formatPct(metrics.virality.shareToApplicationRatePct)} sublabel="apps per share (7d)" />
              </div>
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Application source attribution</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(metrics.virality.attribution).length === 0 ? (
                    <span className="text-sm text-muted-foreground">No referral data yet</span>
                  ) : (
                    Object.entries(metrics.virality.attribution).map(([source, count]) => (
                      <Badge key={source} variant="secondary" className="capitalize">
                        {source}: {count}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </Section>

            {/* Daily growth (existing) */}
            <Section title="Daily Growth" subtitle="Today vs yesterday (IST)">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <MetricCard label="Job Views" value={metrics.growth.jobViewsToday.value} trend={metrics.growth.jobViewsToday.trend} previous={metrics.growth.jobViewsToday.previous} />
                <MetricCard label="Apply Clicks" value={metrics.growth.applyClicksToday.value} trend={metrics.growth.applyClicksToday.trend} previous={metrics.growth.applyClicksToday.previous} />
                <MetricCard label="Applications" value={metrics.growth.applicationsSubmittedToday.value} trend={metrics.growth.applicationsSubmittedToday.trend} previous={metrics.growth.applicationsSubmittedToday.previous} />
                <MetricCard label="Conversion Rate" value={metrics.growth.conversionRate.label} sublabel="applications ÷ views" />
              </div>
            </Section>

            <Section title="Funnel (today vs yesterday)">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {metrics.funnel.map((step, i) => (
                  <div key={step.event} className={cn("flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4", i > 0 && "border-t border-border")}>
                    <div>
                      <p className="text-sm font-medium capitalize">{formatEventName(step.event)}</p>
                      <p className="text-xs text-muted-foreground">yesterday: {step.yesterday}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold tabular-nums">{step.today}</span>
                      {step.trend === "up" && <Badge variant="secondary" className="text-xs">↑</Badge>}
                      {step.trend === "down" && <Badge variant="destructive" className="text-xs">↓</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Operations">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <MetricCard label="Pending Hospital Verifications" value={metrics.operations.pendingHospitalVerifications} highlight={metrics.operations.pendingHospitalVerifications > 0 ? "warning" : "default"} />
                <MetricCard label="Pending Pro Verifications" value={metrics.operations.pendingProfessionalVerifications} highlight={metrics.operations.pendingProfessionalVerifications > 0 ? "warning" : "default"} />
                <MetricCard label="Failed Notifications (24h)" value={metrics.operations.failedNotifications24h} />
                <MetricCard label="Expired Jobs (stuck)" value={metrics.operations.expiredJobsPending} />
                <MetricCard label="Jobs Closed (24h)" value={metrics.operations.jobsExpiredLast24h} sublabel="cron" />
              </div>
            </Section>

            <Section title="System Health">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Shield className="h-3.5 w-3.5" /> Sentry
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums">{metrics.systemHealth.sentry.unresolved24h ?? "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{metrics.systemHealth.sentry.message}</p>
                  <div className="mt-2"><StatusBadge status={metrics.systemHealth.sentry.status} label={metrics.systemHealth.sentry.status} /></div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Activity className="h-3.5 w-3.5" /> Cron
                  </div>
                  <p className="mt-2 text-lg font-bold capitalize">{metrics.systemHealth.cron.status}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.systemHealth.cron.lastRun
                      ? `Last ${formatDistanceToNow(new Date(metrics.systemHealth.cron.lastRun), { addSuffix: true })}`
                      : "No runs"}
                  </p>
                </div>
                <MetricCard label="Edge Failures (24h)" value={metrics.systemHealth.edgeFunctionFailures24h} />
                <MetricCard label="Slow Queries" value={metrics.systemHealth.slowQueryCount ?? "—"} />
              </div>
            </Section>

            <Section title="Quick Links">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[
                  { label: "Vercel Analytics", href: metrics.quickLinks.vercelAnalytics },
                  { label: "Sentry", href: metrics.quickLinks.sentry },
                  { label: "Supabase SQL", href: metrics.quickLinks.supabaseSql },
                  { label: "User & Job Management", href: "/admin/manage", internal: true },
                ].map((link) =>
                  link.internal ? (
                    <Link key={link.label} to={link.href} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/50">
                      {link.label}
                    </Link>
                  ) : (
                    <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/50">
                      {link.label}
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  )
                )}
              </div>
            </Section>
          </>
        ) : null}
      </main>
    </div>
  );
}
