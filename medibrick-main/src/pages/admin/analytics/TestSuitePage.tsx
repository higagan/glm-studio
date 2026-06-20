import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, FlaskConical, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TestSuitePayload } from "@/lib/founder-analytics-types";
import { useAnalyticsFetch } from "./AnalyticsShell";
import { TabPageHeader, Panel } from "./TabChrome";
import { IntegrityStatusBadge } from "./IntegrityShared";
import { cn } from "@/lib/utils";

export default function TestSuitePage() {
  const { data, loading, error, refresh } = useAnalyticsFetch<TestSuitePayload>("test_suite", 7);

  return (
    <div className="space-y-6">
      <TabPageHeader
        title="Analytics Test Suite"
        question="Are analytics passing automated integrity checks?"
      >
        <Button variant="outline" size="icon" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </TabPageHeader>

      <Panel>
        <div className="flex items-start gap-3 text-sm">
          <FlaskConical className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <p className="text-muted-foreground">
            Automated validation checks run against live data. Run after migrations or when numbers
            look suspicious.
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
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryCard label="Pass" value={data.summary.pass} tone="pass" />
            <SummaryCard label="Warning" value={data.summary.warning} tone="warning" />
            <SummaryCard label="Fail" value={data.summary.fail} tone="fail" />
            <SummaryCard label="Total" value={data.summary.total} tone="neutral" />
          </div>

          <p className="text-xs text-muted-foreground">
            Run {formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })}
          </p>

          <div className="space-y-2">
            {data.tests.map((test) => (
              <div
                key={test.id}
                className={cn(
                  "flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm",
                  test.status === "FAIL" && "border-red-500/40",
                  test.status === "WARNING" && "border-amber-500/40",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{test.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{test.detail}</p>
                </div>
                <IntegrityStatusBadge status={test.status} />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "pass" | "warning" | "fail" | "neutral";
}) {
  const Icon = tone === "fail" ? XCircle : CheckCircle2;
  return (
    <Panel
      className={cn(
        tone === "pass" && "border-emerald-500/30",
        tone === "warning" && "border-amber-500/30",
        tone === "fail" && "border-red-500/30",
      )}
    >
      <div className="flex items-center gap-2">
        {tone !== "neutral" && (
          <Icon
            className={cn(
              "h-4 w-4",
              tone === "pass" && "text-emerald-600",
              tone === "warning" && "text-amber-600",
              tone === "fail" && "text-red-600",
            )}
          />
        )}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </Panel>
  );
}
