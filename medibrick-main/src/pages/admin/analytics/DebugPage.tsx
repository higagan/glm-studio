import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight, Copy, Database, Loader2, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getFounderGateToken } from "@/lib/founder-gate";
import type {
  ConfidencePayload,
  VerificationMetric,
  VerificationPayload,
  VerificationRecordsPayload,
} from "@/lib/founder-analytics-types";
import { useAnalyticsFetch } from "./AnalyticsShell";
import { Panel, TabPageHeader } from "./TabChrome";
import { ConfidenceBanner } from "./IntegrityShared";

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function RecordsTable({ records }: { records: Record<string, unknown>[] }) {
  const columns = useMemo(() => {
    if (records.length === 0) return [];
    return Object.keys(records[0]);
  }, [records]);

  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No underlying records.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 border-b">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((row, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {formatCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricVerificationCard({
  metric,
  expanded,
  onToggle,
}: {
  metric: VerificationMetric;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [records, setRecords] = useState<VerificationRecordsPayload | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadRecords = useCallback(async () => {
    if (!metric.tracked || metric.rawCount === 0) return;
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const token = getFounderGateToken();
      if (!token) throw new Error("Not authenticated");
      const params = new URLSearchParams({
        section: "debug_records",
        metric: metric.key,
        limit: "200",
        offset: "0",
      });
      const res = await fetch(`/api/founder-analytics?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setRecords(await res.json());
    } catch (e) {
      setRecordsError(e instanceof Error ? e.message : "Failed to load records");
    } finally {
      setRecordsLoading(false);
    }
  }, [metric.key, metric.rawCount, metric.tracked]);

  useEffect(() => {
    if (expanded && metric.tracked) {
      void loadRecords();
    }
    if (!expanded) {
      setRecords(null);
      setRecordsError(null);
    }
  }, [expanded, loadRecords, metric.tracked]);

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(metric.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="mt-1 text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{metric.label}</h3>
            {!metric.tracked && (
              <Badge variant="outline" className="font-normal text-xs">
                Not tracked
              </Badge>
            )}
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums">{metric.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {metric.rawCount} underlying record{metric.rawCount === 1 ? "" : "s"} · calculated{" "}
            {formatDistanceToNow(new Date(metric.calculatedAt), { addSuffix: true })}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 py-4 space-y-4 bg-muted/20">
          {metric.note && (
            <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              {metric.note}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Source tables
              </p>
              <div className="flex flex-wrap gap-1.5">
                {metric.sourceTables.length === 0 ? (
                  <span className="text-sm text-muted-foreground">—</span>
                ) : (
                  metric.sourceTables.map((t) => (
                    <Badge key={t} variant="secondary" className="font-mono text-xs">
                      {t}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Source events
              </p>
              <div className="flex flex-wrap gap-1.5">
                {metric.sourceEvents.length === 0 ? (
                  <span className="text-sm text-muted-foreground">—</span>
                ) : (
                  metric.sourceEvents.map((e) => (
                    <Badge key={e} variant="outline" className="font-mono text-xs">
                      {e}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Underlying SQL
              </p>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void copySql()}>
                <Copy className="mr-1 h-3 w-3" />
                {copied ? "Copied" : "Copy SQL"}
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-lg border bg-background p-3 text-xs font-mono leading-relaxed text-muted-foreground">
              {metric.sql.trim()}
            </pre>
          </div>

          {metric.tracked && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Raw records ({records?.total ?? metric.rawCount})
              </p>
              {recordsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : recordsError ? (
                <p className="text-sm text-destructive">{recordsError}</p>
              ) : records ? (
                <>
                  <RecordsTable records={records.records} />
                  {records.total > records.records.length && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Showing {records.records.length} of {records.total} records.
                    </p>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DebugPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedKey, setExpandedKey] = useState<string | null>(
    () => searchParams.get("metric") ?? null,
  );
  const [confidence, setConfidence] = useState<ConfidencePayload | null>(null);
  const { data, loading, error, refresh } = useAnalyticsFetch<VerificationPayload>("debug", 7);

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

  useEffect(() => {
    const metric = searchParams.get("metric");
    if (metric) setExpandedKey(metric);
  }, [searchParams]);

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, VerificationMetric[]>();
    for (const m of data.metrics) {
      const cat = m.category ?? "Executive Summary";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(m);
    }
    return Array.from(map.entries());
  }, [data]);

  const toggle = (key: string) => {
    const next = expandedKey === key ? null : key;
    setExpandedKey(next);
    if (next) {
      setSearchParams({ metric: next });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="space-y-6">
      <TabPageHeader
        title="Analytics Verification"
        question="Can I trust every number on the founder dashboard?"
      >
        <Button variant="outline" size="icon" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </TabPageHeader>

      <ConfidenceBanner data={confidence} />

      <Panel className="border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3 text-sm">
          <Database className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <p className="text-muted-foreground">
            Every executive KPI is backed by source tables, optional product events, the exact SQL
            used, and drill-down into raw rows. Click a metric to audit the records behind the
            number.
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
            Snapshot {formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })} ·{" "}
            {data.metrics.length} metrics across {grouped.length} categories
          </p>
          <div className="space-y-8">
            {grouped.map(([category, metrics]) => (
              <section key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {category}
                </h3>
                <div className="space-y-3">
                  {metrics.map((metric) => (
                    <MetricVerificationCard
                      key={metric.key}
                      metric={metric}
                      expanded={expandedKey === metric.key}
                      onToggle={() => toggle(metric.key)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
