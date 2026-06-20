import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getServiceSupabase, getBearerToken } from "./_lib/admin-auth.js";
import { ALLOWED_PRODUCT_EVENTS } from "./_lib/founder-constants.js";

function asNullableString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t.slice(0, 500) : null;
}

async function stitchAnonymousIdentity(
  supabase: ReturnType<typeof getServiceSupabase>,
  anonymousId: string | null,
  userId: string | null,
) {
  if (!anonymousId || !userId) return;
  await supabase.rpc("link_anonymous_to_user", {
    p_anonymous_id: anonymousId,
    p_user_id: userId,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let body: {
      event_name?: string;
      properties?: Record<string, unknown>;
      session_id?: string;
      anonymous_id?: string;
      page?: string;
      job_id?: string;
      hospital_id?: string;
      source?: string;
    };
    if (typeof req.body === "string") {
      body = JSON.parse(req.body);
    } else {
      body = req.body ?? {};
    }

    const eventName = body.event_name?.trim();
    if (!eventName || !ALLOWED_PRODUCT_EVENTS.has(eventName)) {
      return res.status(400).json({ error: "Invalid event" });
    }

    const properties = body.properties && typeof body.properties === "object" ? body.properties : {};
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(properties)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        sanitized[k] = v;
      }
    }

    let userId: string | null = null;
    const token = getBearerToken(req);
    const supabase = getServiceSupabase();
    if (token) {
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const anonymousId = asNullableString(body.anonymous_id);

    const { error } = await supabase.from("product_events").insert({
      event_name: eventName,
      properties: sanitized,
      user_id: userId,
      session_id: asNullableString(body.session_id),
      anonymous_id: anonymousId,
      page: asNullableString(body.page),
      job_id: asNullableString(body.job_id),
      hospital_id: asNullableString(body.hospital_id),
      source: asNullableString(body.source),
    });

    if (error) {
      console.error("[product-events]", error.message);
      return res.status(500).json({ error: "Failed to record event" });
    }

    if (userId && anonymousId) {
      await stitchAnonymousIdentity(supabase, anonymousId, userId);
    }

    return res.status(204).end();
  } catch (err) {
    console.error("[product-events]", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
