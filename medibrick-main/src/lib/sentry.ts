import * as Sentry from "@sentry/react";

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
  });
}

/**
 * Attach user identity to all subsequent Sentry events.
 * Call after every successful auth (OTP, Google, email).
 */
export function setSentryUser(user: {
  id: string;
  role: "professional" | "hospital" | "admin" | null;
  profileId?: string;
  jobSlug?: string;
}) {
  Sentry.setUser({ id: user.id });
  Sentry.setTag("role", user.role ?? "unknown");
  Sentry.setTag("route", window.location.pathname);
  if (user.profileId) Sentry.setTag("profile_id", user.profileId);
  if (user.jobSlug) Sentry.setTag("job_slug", user.jobSlug);
}

/** Call on sign-out to clear PII from subsequent Sentry events. */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Capture a Supabase error in Sentry with structured context.
 * Wraps the raw error string so it appears as a distinct issue.
 */
export function captureSupabaseError(
  error: { message: string; code?: string },
  context: Record<string, unknown>
) {
  Sentry.captureException(new Error(`Supabase: ${error.message}`), {
    extra: { ...context, supabaseCode: error.code },
  });
}
