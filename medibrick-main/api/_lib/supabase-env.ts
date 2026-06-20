/** Server-side Supabase env resolution for Vercel API routes. */

export function resolveSupabaseUrl(): string | null {
  const direct =
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim();
  if (direct) return direct;

  const projectId =
    process.env.SUPABASE_PROJECT_ID?.trim() ||
    process.env.VITE_SUPABASE_PROJECT_ID?.trim();
  if (projectId) return `https://${projectId}.supabase.co`;

  return null;
}

export function resolveServiceRoleKey(): string | null {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    null
  );
}

export function requireServiceRoleConfig(): { url: string; key: string } {
  const url = resolveSupabaseUrl();
  const key = resolveServiceRoleKey();

  if (!url && !key) {
    throw new Error(
      "Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. In Vercel → Settings → Environment Variables, add both for Production, then redeploy."
    );
  }
  if (!url) {
    throw new Error(
      "Missing SUPABASE_URL. Add SUPABASE_URL=https://YOUR_PROJECT.supabase.co to Vercel (Production), then redeploy."
    );
  }
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it in Vercel (Production — not only Preview). Name must be exactly SUPABASE_SERVICE_ROLE_KEY, then redeploy."
    );
  }

  return { url, key };
}

/** Safe diagnostics for admin UI (no secret values). */
export function serviceRoleEnvStatus() {
  return {
    hasUrl: !!resolveSupabaseUrl(),
    hasServiceRoleKey: !!resolveServiceRoleKey(),
  };
}
