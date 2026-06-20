import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Mail, MessageCircle, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getFounderGateToken } from "@/lib/founder-gate";
import type { RecoveryDetailPayload, RecoveryUser } from "@/lib/founder-analytics-types";
import { buildRecoveryMessage, whatsAppUrl } from "@/lib/recovery-outreach";
import { formatEventTime } from "./AnalyticsShell";
import { Panel } from "./TabChrome";

export function RecoveryUserPanel({
  user,
  onClose,
}: {
  user: RecoveryUser;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<RecoveryDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = getFounderGateToken();
      if (!token) return;
      const params = new URLSearchParams({ section: "recovery_detail", sessionId: user.session_id });
      if (user.user_id) params.set("userId", user.user_id);
      const res = await fetch(`/api/founder-analytics?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDetail(await res.json());
    } finally {
      setLoading(false);
    }
  }, [user.session_id, user.user_id]);

  useEffect(() => {
    void load();
  }, [load]);

  const contact = detail?.contact;
  const message = buildRecoveryMessage({
    name: user.name,
    dropoffStage: user.dropoff_stage,
    jobId: user.primary_job_id,
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="font-semibold">{user.name}</h3>
            <p className="text-xs text-muted-foreground capitalize">{user.source} · {user.dropoff_stage}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {user.high_intent && (
            <Badge className="bg-amber-500/15 text-amber-800 border-amber-500/30 hover:bg-amber-500/15">
              High-intent — likely to convert if contacted
            </Badge>
          )}

          <Panel title="Contact recovery">
            <div className="space-y-3 text-sm">
              {user.phone_masked && <p>Phone: {user.phone_masked}</p>}
              {user.email && <p>Email: {user.email}</p>}
              <p className="text-muted-foreground rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">
                {message}
              </p>
              <div className="flex flex-wrap gap-2">
                {contact?.phone && (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${contact.phone}`}>
                        <Phone className="mr-1 h-4 w-4" /> Call
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={whatsAppUrl(contact.phone, message)} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
                      </a>
                    </Button>
                  </>
                )}
                {contact?.email && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`mailto:${contact.email}?subject=${encodeURIComponent("Your Medibrick application")}&body=${encodeURIComponent(message)}`}>
                      <Mail className="mr-1 h-4 w-4" /> Email
                    </a>
                  </Button>
                )}
                {!contact?.phone && !contact?.email && (
                  <p className="text-xs text-muted-foreground">No direct contact on file — user verified via OTP only.</p>
                )}
              </div>
            </div>
          </Panel>

          {detail?.context && (
            <Panel title="Journey context">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Drop-off</dt>
                  <dd className="font-medium">{detail.context.dropoffStage ?? user.dropoff_stage}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Application</dt>
                  <dd>{detail.context.applicationSubmitted ? "Submitted" : "Not submitted"}</dd>
                </div>
                {detail.context.jobsViewed?.length > 0 && (
                  <div>
                    <dt className="text-muted-foreground mb-1">Jobs viewed</dt>
                    <dd className="flex flex-wrap gap-1">
                      {detail.context.jobsViewed.map((j) => (
                        <Badge key={j} variant="secondary" className="font-normal">{j}</Badge>
                      ))}
                    </dd>
                  </div>
                )}
                {detail.context.hospitalsViewed?.length > 0 && (
                  <div>
                    <dt className="text-muted-foreground mb-1">Hospitals viewed</dt>
                    <dd className="flex flex-wrap gap-1">
                      {detail.context.hospitalsViewed.map((h) => (
                        <Badge key={h} variant="outline" className="font-normal">{h}</Badge>
                      ))}
                    </dd>
                  </div>
                )}
                {detail.context.searchTerms?.length > 0 && (
                  <div>
                    <dt className="text-muted-foreground mb-1">Searches</dt>
                    <dd>{detail.context.searchTerms.join(", ")}</dd>
                  </div>
                )}
                {detail.context.filtersApplied > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Filters applied</dt>
                    <dd>{detail.context.filtersApplied}</dd>
                  </div>
                )}
              </dl>
            </Panel>
          )}

          <Panel title="Timeline">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ol className="space-y-3">
                {detail?.events.map((ev, i) => (
                  <li key={`${ev.at}-${i}`} className="flex gap-3 text-sm">
                    <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{formatEventTime(ev.at)}</span>
                    <div>
                      <p className="font-medium">{ev.label}</p>
                      {ev.page && <p className="text-xs text-muted-foreground">{ev.page}</p>}
                      {ev.jobId && <p className="text-xs text-muted-foreground">Job: {ev.jobId}</p>}
                      {ev.event === "search_performed" && ev.properties?.term != null && (
                        <p className="text-xs text-muted-foreground">Search: {String(ev.properties.term)}</p>
                      )}
                    </div>
                  </li>
                ))}
                {detail?.events.length === 0 && (
                  <p className="text-sm text-muted-foreground">No events recorded.</p>
                )}
                {detail && detail.events.length > 0 && (
                  <li className="flex gap-3 text-sm text-muted-foreground italic">
                    <span className="w-12 shrink-0" />
                    <span>Abandoned {formatDistanceToNow(new Date(user.last_activity), { addSuffix: true })}</span>
                  </li>
                )}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
