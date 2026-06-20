import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest } from "@vercel/node";
import { requireServiceRoleConfig } from "./supabase-env.js";

export function getServiceSupabase(): SupabaseClient {
  const { url, key } = requireServiceRoleConfig();
  return createClient(url, key, { auth: { persistSession: false } });
}

export function getBearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

/** Verify JWT and confirm admin role. Returns user id or throws with status code. */
export async function requireAdmin(req: VercelRequest): Promise<string> {
  const token = getBearerToken(req);
  if (!token) {
    const err = new Error("Unauthorized") as Error & { status: number };
    err.status = 401;
    throw err;
  }

  const supabase = getServiceSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    const err = new Error("Invalid session") as Error & { status: number };
    err.status = 401;
    throw err;
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleRow) {
    const err = new Error("Admin access required") as Error & { status: number };
    err.status = 403;
    throw err;
  }

  return user.id;
}
