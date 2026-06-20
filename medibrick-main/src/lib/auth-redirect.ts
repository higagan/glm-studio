import {
  clearJobApplyContext,
  jobToApplyContext,
  saveJobApplyContext,
} from "./job-apply-context";

export type { JobApplyContext } from "./job-apply-context";
export { getJobApplyContext, hasJobApplyContext, clearJobApplyContext } from "./job-apply-context";

export type ApplyIntent = {
  returnUrl: string;
  jobId: string;
  action: "apply";
  savedAt: number;
};

export type PostShiftIntent = {
  returnUrl: string;
  action: "post_shift";
  savedAt: number;
};

const AUTH_REDIRECT_KEY = "mb_auth_redirect";
const PENDING_APPLY_KEY = "mb_pending_apply";
const APPLY_INTENT_KEY = "mb_apply_intent";
const POST_SHIFT_INTENT_KEY = "mb_post_shift_intent";

/** OAuth full-page redirects can clear sessionStorage — mirror critical keys in localStorage. */
function setPersisted(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
  sessionStorage.setItem(key, value);
}

function getPersisted(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return sessionStorage.getItem(key);
  }
}

function removePersisted(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  sessionStorage.removeItem(key);
}

/** Validates post-auth redirect paths. Prevents open redirects. */
export function safeRedirect(path: string | null): string {
  if (!path) return "/dashboard";
  const pathname = path.split("?")[0];
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return "/dashboard";
  if (/^\/(jobs|dashboard|profile|admin|complete-profile|nearby|hospitals)(\/|$)/.test(pathname)) {
    return path;
  }
  return "/dashboard";
}

export function saveAuthRedirect(path?: string) {
  const target = path ?? window.location.pathname + window.location.search;
  setPersisted(AUTH_REDIRECT_KEY, target);
}

export function getAuthRedirect(): string | null {
  return getPersisted(AUTH_REDIRECT_KEY);
}

/** Canonical post-auth path: redirect key, then structured apply intent, then post-shift intent. */
export function resolveReturnPath(): string | null {
  return getAuthRedirect() ?? getApplyIntent()?.returnUrl ?? getPostShiftIntent()?.returnUrl ?? null;
}

export function clearAuthRedirect() {
  removePersisted(AUTH_REDIRECT_KEY);
}

export function getApplyIntent(): ApplyIntent | null {
  try {
    const raw = getPersisted(APPLY_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApplyIntent;
    if (parsed?.action !== "apply" || !parsed.jobId || !parsed.returnUrl) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveApplyIntent(intent: ApplyIntent) {
  setPersisted(APPLY_INTENT_KEY, JSON.stringify(intent));
}

export function clearApplyIntent() {
  removePersisted(APPLY_INTENT_KEY);
}

function savePostShiftIntentRecord(intent: PostShiftIntent) {
  setPersisted(POST_SHIFT_INTENT_KEY, JSON.stringify(intent));
}

export function savePostShiftIntent(returnUrl = "/dashboard?action=post-shift") {
  setPersisted(AUTH_REDIRECT_KEY, returnUrl);
  savePostShiftIntentRecord({
    returnUrl,
    action: "post_shift",
    savedAt: Date.now(),
  });
}

export function getPostShiftIntent(): PostShiftIntent | null {
  try {
    const raw = getPersisted(POST_SHIFT_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PostShiftIntent;
    if (parsed?.action !== "post_shift" || !parsed.returnUrl) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasPendingPostShift(): boolean {
  return !!getPostShiftIntent();
}

export function clearPostShiftIntent() {
  removePersisted(POST_SHIFT_INTENT_KEY);
}

export function hasTaskIntent(): boolean {
  return hasPendingApply() || hasPendingPostShift();
}

/** Remember return path by job slug so auth lands back on the same shift. */
export function saveJobApplyRedirect(job: {
  slug?: string | null;
  id: string;
  title: string;
  hospital_profiles?: { hospital_name?: string } | null;
  compensation?: number | null;
  shift_date: string;
}) {
  const query = window.location.search;
  const path = job.slug ? `/jobs/${job.slug}${query}` : `/jobs/${job.id}${query}`;

  setPersisted(AUTH_REDIRECT_KEY, path);
  setPersisted(PENDING_APPLY_KEY, job.id);
  saveApplyIntent({
    returnUrl: path,
    jobId: job.id,
    action: "apply",
    savedAt: Date.now(),
  });
  saveJobApplyContext(jobToApplyContext(job));
}

export function hasPendingApply(): boolean {
  return !!getPersisted(PENDING_APPLY_KEY) || !!getApplyIntent();
}

export function peekPendingApplyJobId(): string | null {
  const intent = getApplyIntent();
  if (intent?.jobId) return intent.jobId;
  return getPersisted(PENDING_APPLY_KEY);
}

export function clearPendingApply() {
  removePersisted(PENDING_APPLY_KEY);
  clearApplyIntent();
}

/** Append query flag so job detail can reopen apply after auth navigation. */
export function buildPostAuthReturnUrl(path?: string | null): string {
  const safe = safeRedirect(path ?? resolveReturnPath());

  if (peekPendingApplyJobId()) {
    const url = new URL(safe, window.location.origin);
    url.searchParams.set("apply", "resume");
    return `${url.pathname}${url.search}`;
  }

  if (hasPendingPostShift()) {
    const url = new URL(safe, window.location.origin);
    if (!url.searchParams.has("action")) {
      url.searchParams.set("action", "post-shift");
    }
    return `${url.pathname}${url.search}`;
  }

  return safe;
}

/** Re-open apply dialog after login when user originally tapped Apply. */
export function consumePendingApply(jobId: string): boolean {
  const pending = peekPendingApplyJobId();
  if (pending !== jobId) return false;
  removePersisted(PENDING_APPLY_KEY);
  clearApplyIntent();
  return true;
}

export function shouldResumeApply(jobId: string, applyParam: string | null): boolean {
  if (applyParam === "resume") return true;
  return peekPendingApplyJobId() === jobId;
}
