import { track as vercelTrack } from "@vercel/analytics";
import { supabase } from "@/integrations/supabase/client";
import { getTrafficSource } from "@/lib/traffic-source";

type EventProps = Record<string, string | number | boolean | null | undefined>;

export type TrackContext = {
  jobId?: string | null;
  hospitalId?: string | null;
};

const SESSION_KEY = "mb_analytics_session_id";
const ANONYMOUS_KEY = "mb_anonymous_id";

function getAnonymousId(): string {
  if (typeof window !== "undefined") {
    const existing = localStorage.getItem(ANONYMOUS_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(ANONYMOUS_KEY, id);
    return id;
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getSessionId(): string {
  if (typeof window !== "undefined") {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getPage(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname;
}

/** Mirror events to Vercel Analytics + product_events table for founder dashboard. */
export function trackProductEvent(
  eventName: string,
  properties?: EventProps,
  context?: TrackContext,
) {
  const clean: Record<string, string | number | boolean> = {};
  if (properties) {
    for (const [k, v] of Object.entries(properties)) {
      if (v !== undefined && v !== null) clean[k] = v;
    }
  }

  vercelTrack(eventName, clean);

  const jobId =
    context?.jobId ??
    (typeof clean.jobSlug === "string" ? clean.jobSlug : undefined) ??
    (typeof clean.jobId === "string" ? clean.jobId : undefined) ??
    null;

  const hospitalId =
    context?.hospitalId ??
    (typeof clean.hospitalSlug === "string" ? clean.hospitalSlug : undefined) ??
    (typeof clean.hospitalId === "string" ? clean.hospitalId : undefined) ??
    null;

  const payload = JSON.stringify({
    event_name: eventName,
    properties: clean,
    session_id: getSessionId(),
    anonymous_id: getAnonymousId(),
    page: getPage(),
    job_id: jobId,
    hospital_id: hospitalId,
    source: getTrafficSource(),
  });

  void (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      const res = await fetch("/api/product-events", {
        method: "POST",
        headers,
        body: payload,
        keepalive: true,
      });
      if (!res.ok && import.meta.env.DEV) {
        console.warn(`[analytics] ${eventName} failed: HTTP ${res.status}`);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn(`[analytics] ${eventName} failed:`, err);
      }
    }
  })();
}

/** Drop-in alias for existing track() calls. */
export const track = trackProductEvent;
