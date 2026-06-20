import { formatDistanceToNow } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  formatHours,
  formatPct,
  MetricCard,
  Section,
  specialtyLabel,
  TrackedMetricCard,
} from "@/components/admin/founder/FounderSections";
import { useFounderMetrics } from "./analytics-hooks";
import { TabPageHeader } from "./TabChrome";
import { GeographyPanel } from "./GeographyPanel";
import { cn } from "@/lib/utils";

const SUB_NAV = [
  { id: "reliability", label: "Reliability" },
  { id: "retention", label: "Retention" },
  { id: "professionals", label: "Professionals" },
  { id: "geography", label: "Geography" },
  { id: "specialty", label: "Specialty" },
] as const;

export default function MarketplacePage() {
  const { metrics, loading, error, refresh } = useFounderMetrics();

  return (
    <div className="space-y-8">
      <TabPageHeader title="Marketplace Health" question="Is the marketplace solving staffing reliability?">
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
          <p className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(new Date(metrics.fetchedAt), { addSuffix: true })}
          </p>

          <nav className="flex flex-wrap gap-1 rounded-lg border bg-card p-1 sticky top-[7.5rem] z-20">
            {SUB_NAV.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                )}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Phase 8 — core reliability */}
          <Section
            id="reliability"
            title="Staffing reliability"
            subtitle="Core proof that Medibrick fills shifts"
          >
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
              <MetricCard label="Open Shifts" value={metrics.marketplaceHealth.openShifts} />
              <MetricCard
                label="Filled Shifts"
                value={metrics.marketplaceHealth.filledShifts}
                highlight="success"
                sublabel={`${metrics.marketplaceHealth.closedShifts} closed total`}
              />
              <MetricCard label="Fill Rate" value={formatPct(metrics.marketplaceHealth.fillRatePct)} />
              <MetricCard
                label="Avg Time To Fill"
                value={formatHours(metrics.marketplaceHealth.avgHoursToFill)}
                sublabel="Created → filled"
              />
              <TrackedMetricCard label="No-Show Rate" metric={metrics.marketplaceHealth.noShowRatePct} />
            </div>
          </Section>

          {/* Phase 9 — hospital retention */}
          <Section
            id="retention"
            title="Hospital retention"
            subtitle="Repeat posting matters more than total hospital count"
          >
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Hospitals Posted"
                value={metrics.hospitalRetention.hospitalsPostedThisMonth}
                sublabel="This month"
              />
              <MetricCard
                label="Returning Hospitals"
                value={metrics.hospitalRetention.returningHospitals}
                sublabel="Posted before + again"
              />
              <MetricCard
                label="Repeat Rate"
                value={formatPct(metrics.hospitalRetention.repeatPostingRatePct)}
              />
              <MetricCard label="Jobs / Hospital" value={metrics.hospitalRetention.jobsPerHospital ?? "—"} />
            </div>
          </Section>

          {/* Phase 10 — professional quality */}
          <Section
            id="professionals"
            title="Professional quality"
            subtitle="Supply-side health with week-over-week trends"
          >
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
              <MetricCard
                label="Verified Professionals"
                value={metrics.professionalQuality.verifiedProfessionals.value}
                trend={metrics.professionalQuality.verifiedProfessionals.trend}
                previous={metrics.professionalQuality.verifiedProfessionals.previous}
              />
              <MetricCard
                label="Profile Completion"
                value={formatPct(metrics.professionalQuality.profileCompletionRatePct)}
              />
              <MetricCard
                label="Applications / Job"
                value={metrics.professionalQuality.applicationsPerJob ?? "—"}
              />
              <MetricCard
                label="Acceptance Rate"
                value={formatPct(metrics.professionalQuality.acceptanceRatePct)}
              />
              <MetricCard
                label="Application → Hire"
                value={formatPct(metrics.professionalQuality.applicationToHireRatePct)}
              />
            </div>
          </Section>

          {/* Phase 12 — geography */}
          <Section id="geography" title="Geography" subtitle="Top cities by jobs, applications, and supply">
            <GeographyPanel geography={metrics.geography} />
          </Section>

          {/* Phase 13 — specialty */}
          <Section
            id="specialty"
            title="Specialty analytics"
            subtitle="Where marketplace liquidity is forming"
          >
            <DataTable
              headers={["Specialty", "Jobs", "Applications", "Conversion", "Fill Rate"]}
              rows={
                metrics.specialty.length === 0
                  ? [["—", "—", "—", "—", "—"]]
                  : metrics.specialty.map((s) => [
                      specialtyLabel(s.category),
                      s.jobs,
                      s.applications,
                      formatPct(s.conversionRatePct),
                      formatPct(s.fillRatePct),
                    ])
              }
            />
          </Section>
        </>
      ) : null}
    </div>
  );
}
