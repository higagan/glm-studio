import { shouldResumeApply } from "@/lib/auth-redirect";

const APPLY_READY_KEY = "mb_apply_onboarding_ready";

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

/** User finished /complete-profile after Apply → Auth; skip optional profile % gate. */
export function markApplyOnboardingReady() {
  setPersisted(APPLY_READY_KEY, "1");
}

export function isApplyOnboardingReady(): boolean {
  return getPersisted(APPLY_READY_KEY) === "1";
}

export function clearApplyOnboardingReady() {
  removePersisted(APPLY_READY_KEY);
}

/**
 * Apply → Auth → Complete Profile users are application-ready.
 * Also true while resuming a pending apply (?apply=resume or stored intent).
 */
export function shouldBypassProfileGateForApply(
  jobId: string,
  applyParam: string | null,
): boolean {
  if (shouldResumeApply(jobId, applyParam)) return true;
  if (isApplyOnboardingReady()) return true;
  return false;
}

export function canOpenApplyDialog(
  profileCompletion: number,
  jobId: string,
  applyParam: string | null,
): boolean {
  return profileCompletion >= 70 || shouldBypassProfileGateForApply(jobId, applyParam);
}
