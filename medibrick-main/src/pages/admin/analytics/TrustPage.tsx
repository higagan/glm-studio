import { formatDistanceToNow } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatHours, formatPct, MetricCard, TrackedMetricCard } from "@/components/admin/founder/FounderSections";
import { useFounderMetrics } from "./analytics-hooks";
import { TabPageHeader } from "./TabChrome";

export default function TrustPage() {
  const { metrics, loading, error, refresh } = useFounderMetrics();

  return (
    <div className="space-y-8">
      <TabPageHeader title="Trust Dashboard" question="Is Medibrick earning marketplace trust?">
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Verified Hospitals" value={metrics.trust.verifiedHospitals} highlight="success" />
            <MetricCard label="Verified Professionals" value={metrics.trust.verifiedProfessionals} highlight="success" />
            <MetricCard
              label="Avg Hospital Rating"
              value={metrics.trust.avgHospitalRating ?? "—"}
              sublabel="From shift reviews"
            />
            <TrackedMetricCard label="Avg Professional Rating" metric={metrics.trust.avgProfessionalRating} />
            <TrackedMetricCard label="No-Show Rate" metric={metrics.trust.noShowRatePct} />
            <TrackedMetricCard label="Payment SLA" metric={metrics.trust.paymentSlaHours} />
            <TrackedMetricCard label="Avg Time To Payment" metric={metrics.trust.avgTimeToPaymentHours} />
            <TrackedMetricCard label="Disputes Reported" metric={metrics.trust.disputesReported} />
            <TrackedMetricCard label="Disputes Resolved" metric={metrics.trust.disputesResolved} />
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Why this matters</p>
            <p className="mt-1">
              Verification, ratings, and payment reliability are Medibrick&apos;s moat. Track these before optimizing
              growth — trust converts hospitals and professionals into repeat users.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              label="Marketplace fill rate"
              value={formatPct(metrics.marketplaceHealth.fillRatePct)}
              sublabel="Staffing reliability signal"
            />
            <MetricCard
              label="Profile completion"
              value={formatPct(metrics.professionalQuality.profileCompletionRatePct)}
              sublabel="Supply quality signal"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
