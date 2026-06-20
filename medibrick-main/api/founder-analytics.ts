import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdminGate } from "./_lib/admin-gate.js";
import { fetchFounderAnalytics } from "./_lib/founder-analytics-data.js";
import type { FounderAnalyticsSection } from "../src/lib/founder-analytics-types.js";

const SECTIONS = new Set<FounderAnalyticsSection>([
  "funnels",
  "hospital",
  "dropoffs",
  "acquisition",
  "journeys",
  "timeline",
  "recovery",
  "recovery_detail",
  "actions",
  "debug",
  "debug_records",
  "reconciliation",
  "confidence",
  "test_suite",
  "hospital_leaderboards",
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    requireAdminGate(req);
    const section = (typeof req.query.section === "string" ? req.query.section : "") as FounderAnalyticsSection;
    if (!SECTIONS.has(section)) {
      return res.status(400).json({ error: "Invalid section" });
    }

    const data = await fetchFounderAnalytics(section, req.query as Record<string, string | string[] | undefined>);
    res.setHeader("Cache-Control", "private, max-age=60");
    return res.status(200).json(data);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    const status = e.status ?? 500;
    return res.status(status).json({ error: e.message || "Internal error" });
  }
}
