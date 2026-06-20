import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFounderGateToken } from "@/lib/founder-gate";
import type { JourneysPayload, TimelinePayload } from "@/lib/founder-analytics-types";
import {
  formatEventTime,
  formatRelativeTime,
  PeriodSelect,
  StatusBadge,
  useAnalyticsFetch,
} from "./AnalyticsShell";

import { TabPageHeader } from "./TabChrome";

export default function AnalyticsJourneysPage() {
  const [days, setDays] = useState(7);
  const { data, loading, error, refresh } = useAnalyticsFetch<JourneysPayload>("journeys", days);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelinePayload | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const loadTimeline = useCallback(async (sessionId: string) => {
    setSelectedSession(sessionId);
    setTimelineLoading(true);
    try {
      const token = getFounderGateToken();
      if (!token) return;
      const params = new URLSearchParams({ section: "timeline", sessionId });
      const res = await fetch(`/api/founder-analytics?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTimeline(await res.json());
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  useEffect(() => {
    setSelectedSession(null);
    setTimeline(null);
  }, [days]);

  return (
    <div className="space-y-6">
      <TabPageHeader title="User Journeys" question="What exactly happened?">
        <PeriodSelect days={days} onChange={setDays} />
        <Button variant="outline" size="icon" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </TabPageHeader>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-lg border">
          {loading && !data ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Source</th>
                  <th className="px-4 py-3 text-left font-medium">Last activity</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {!data?.journeys.length ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No journeys recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.journeys.map((j) => (
                    <tr
                      key={j.session_id}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                      onClick={() => void loadTimeline(j.session_id)}
                    >
                      <td className="px-4 py-3 font-medium">{j.display_name}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{j.source}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(j.last_activity)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={j.journey_status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-4 font-semibold">Session timeline</h3>
          {!selectedSession && (
            <p className="text-sm text-muted-foreground">Select a user row to inspect their path.</p>
          )}
          {timelineLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {timeline && !timelineLoading && (
            <ol className="space-y-3">
              {timeline.events.map((ev, i) => (
                <li key={`${ev.at}-${i}`} className="flex gap-3 text-sm">
                  <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{formatEventTime(ev.at)}</span>
                  <div>
                    <p className="font-medium">{ev.label}</p>
                    {ev.page && <p className="text-xs text-muted-foreground">{ev.page}</p>}
                    {ev.jobId && <p className="text-xs text-muted-foreground">Job: {ev.jobId}</p>}
                  </div>
                </li>
              ))}
              {timeline.events.length === 0 && (
                <p className="text-sm text-muted-foreground">No events for this session.</p>
              )}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
