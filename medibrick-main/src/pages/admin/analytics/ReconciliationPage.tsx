import { formatDistanceToNow } from "date-fns";
import { GitCompare, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConfidencePayload, ReconciliationPayload } from "@/lib/founder-analytics-types";
import { useAnalyticsFetch } from "./AnalyticsShell";
import { TabPageHeader, Panel } from "./TabChrome";
import { ConfidenceBanner, IntegrityStatusBadge } from "./IntegrityShared";
import { useEffect, useState } from "react";
import { getFounderGateToken } from "@/lib/founder-gate";

export default function ReconciliationPage() {
  const { data, loading, error, refresh } = useAnalyticsFetch<ReconciliationPayload>("reconciliation", 7);
  const [confidence, setConfidence] = useState<ConfidencePayload | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const token = getFounderGateToken();
        if (!token) return;
        const res = await fetch("/api/founder-analytics?section=confidence", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setConfidence(await res.json());
      } catch {
        /* ignore */
      }
    })();
  }, [data?.generatedAt]);

  return (
    <div className="space-y-6">
      <TabPageHeader
        title="Analytics Reconciliation"
        question="Do independent data sources agree on every major metric?"
      >
        <Button variant="outline" size="icon" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </TabPageHeader>

      <ConfidenceBanner data={confidence} />

      <Panel>
        <div className="flex items-start gap-3 text-sm">
          <GitCompare className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <p className="text-muted-foreground">
            Each row compares two independent calculations. OK means exact match; WARNING allows a
            difference of 1; ERROR means metrics disagree and need investigation.
          </p>
        </div>
      </Panel>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          <p className="text-xs text-muted-foreground">
            Generated {formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })}
          </p>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Metric</th>
                  <th className="px-4 py-3 text-right font-medium">Source A</th>
                  <th className="px-4 py-3 text-right font-medium">Source B</th>
                  <th className="px-4 py-3 text-right font-medium">Difference</th>
                  <th className="px-4 py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.comparisons.map((row) => (
                  <tr key={row.key} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="text-xs text-muted-foreground block">{row.sourceA.label}</span>
                      {row.sourceA.value ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="text-xs text-muted-foreground block">{row.sourceB.label}</span>
                      {row.sourceB.value ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{row.difference}</td>
                    <td className="px-4 py-3 text-right">
                      <IntegrityStatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
