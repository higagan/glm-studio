import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdminGate } from "./_lib/admin-gate.js";
import { fetchFounderMetrics } from "./_lib/founder-metrics-data.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    requireAdminGate(req);
    const metrics = await fetchFounderMetrics();
    res.setHeader("Cache-Control", "private, max-age=60");
    return res.status(200).json(metrics);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    const status = e.status ?? 500;
    return res.status(status).json({ error: e.message || "Internal error" });
  }
}
