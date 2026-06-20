import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RecoveryPayload, RecoveryUser } from "@/lib/founder-analytics-types";
import { formatSecondsAgo } from "@/lib/recovery-outreach";
import { cn } from "@/lib/utils";
import { PeriodSelect, useAnalyticsFetch } from "./AnalyticsShell";
import { Panel, TabPageHeader } from "./TabChrome";
import { RecoveryUserPanel } from "./RecoveryUserPanel";

const SEGMENT_FILTERS = [
  { key: "all", label: "All" },
  { key: "job_view", label: "Job View" },
  { key: "apply_click", label: "Apply Click" },
  { key: "otp", label: "OTP" },
  { key: "profile", label: "Profile" },
  { key: "application", label: "Application" },
  { key: "hospital_signup", label: "Hospital Signup" },
  { key: "job_creation", label: "Job Creation" },
] as const;

export default function RecoveryPage() {
  const [searchParams] = useSearchParams();
  const [days, setDays] = useState(7);
  const [segment, setSegment] = useState(() => searchParams.get("segment") ?? "all");
  const [selected, setSelected] = useState<RecoveryUser | null>(null);
  const { data, loading, error, refresh } = useAnalyticsFetch<RecoveryPayload>("recovery", days, {
    segment,
    limit: "100",
  });

  useEffect(() => {
    const urlSegment = searchParams.get("segment");
    if (urlSegment) setSegment(urlSegment);
  }, [searchParams]);

  useEffect(() => {
    const userId = searchParams.get("userId");
    if (!userId || !data) return;
    const match = data.users.find((u) => u.user_id === userId) ?? data.highIntent.find((u) => u.user_id === userId);
    if (match) setSelected(match);
  }, [searchParams, data]);

  return (
    <div className="space-y-6">
      <TabPageHeader title="User Recovery" question="Who dropped off — and can I contact them?">
        <PeriodSelect days={days} onChange={setDays} />
        <Button variant="outline" size="icon" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </TabPageHeader>

      <p className="text-sm text-muted-foreground">
        Only users who provided phone, email, or completed OTP. Anonymous visitors are excluded.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {SEGMENT_FILTERS.map((s) => {
          const count = data?.segments.find((x) => x.key === s.key)?.count;
          return (
            <Button
              key={s.key}
              size="sm"
              variant={segment === s.key ? "default" : "outline"}
              onClick={() => setSegment(s.key)}
              className="h-8"
            >
              {s.label}
              {count != null && count > 0 && (
                <span className="ml-1.5 rounded-full bg-background/20 px-1.5 text-xs tabular-nums">{count}</span>
              )}
            </Button>
          );
        })}
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          {data.highIntent.length > 0 && segment === "all" && (
            <Panel title={`High-intent recovery (${data.highIntent.length})`}>
              <p className="text-xs text-muted-foreground mb-3">
                Viewed same job 2+ times, completed OTP, started profile — abandoned in last 72h.
              </p>
              <div className="space-y-2">
                {data.highIntent.map((u) => (
                  <button
                    key={u.session_id}
                    type="button"
                    onClick={() => setSelected(u)}
                    className="flex w-full items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-left text-sm hover:bg-amber-500/10 transition-colors"
                  >
                    <span className="font-medium">{u.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {u.dropoff_stage} · {formatSecondsAgo(u.seconds_since_activity)}
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
          )}

          <Panel title={`${data.users.length} recoverable user${data.users.length === 1 ? "" : "s"}`}>
            {data.users.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No contactable drop-offs in this period for the selected segment.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 pr-3 font-medium">Name</th>
                      <th className="pb-3 pr-3 font-medium">Phone</th>
                      <th className="pb-3 pr-3 font-medium">Email</th>
                      <th className="pb-3 pr-3 font-medium">Source</th>
                      <th className="pb-3 pr-3 font-medium">Drop-off</th>
                      <th className="pb-3 font-medium">Last activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr
                        key={u.session_id}
                        className={cn(
                          "border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors",
                          u.high_intent && "bg-amber-500/5",
                        )}
                        onClick={() => setSelected(u)}
                      >
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{u.name}</span>
                            {u.user_role && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">
                                {u.user_role}
                              </Badge>
                            )}
                            {u.high_intent && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500/40">
                                Hot
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-muted-foreground tabular-nums">
                          {u.phone_masked ?? "—"}
                        </td>
                        <td className="py-3 pr-3 text-muted-foreground max-w-[140px] truncate">
                          {u.email ?? "—"}
                        </td>
                        <td className="py-3 pr-3 capitalize text-muted-foreground">{u.source}</td>
                        <td className="py-3 pr-3">{u.dropoff_stage}</td>
                        <td className="py-3 text-muted-foreground whitespace-nowrap">
                          {formatSecondsAgo(u.seconds_since_activity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      ) : null}

      {selected && <RecoveryUserPanel user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
