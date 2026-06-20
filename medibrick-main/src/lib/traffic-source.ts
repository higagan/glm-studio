import type { TrafficSource } from "@/lib/analytics-events";

const STORAGE_KEY = "mb_traffic_source";

function normalizeSource(raw: string | null | undefined): TrafficSource | string {
  if (!raw || !raw.trim()) return "direct";
  const v = raw.trim().toLowerCase();
  if (v === "google" || v === "gclid" || v === "google_ads") return "google";
  if (v === "whatsapp" || v === "wa" || v === "whats_app") return "whatsapp";
  if (v === "linkedin" || v === "li") return "linkedin";
  if (v === "referral" || v === "ref" || v === "invite") return "referral";
  if (v === "direct") return "direct";
  return v;
}

function inferFromReferrer(): TrafficSource | string {
  if (typeof document === "undefined") return "direct";
  const ref = document.referrer;
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname.toLowerCase();
    if (host.includes("google.")) return "google";
    if (host.includes("linkedin.")) return "linkedin";
    if (host.includes("whatsapp") || host.includes("wa.me")) return "whatsapp";
    return "referral";
  } catch {
    return "direct";
  }
}

/** Persist first-touch source for the session (URL param > stored > referrer). */
export function getTrafficSource(): string {
  if (typeof window === "undefined") return "direct";

  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) return stored;

  const params = new URLSearchParams(window.location.search);
  const via = params.get("via") || params.get("utm_source") || params.get("source");
  const resolved = normalizeSource(via ?? inferFromReferrer());
  sessionStorage.setItem(STORAGE_KEY, resolved);
  return resolved;
}
