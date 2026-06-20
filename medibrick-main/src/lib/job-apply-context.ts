/** Job context preserved when user taps Apply while logged out. */

export type JobApplyContext = {
  id: string;
  slug: string | null;
  title: string;
  hospitalName: string;
  compensation: number | null;
  shiftDate: string;
};

const JOB_APPLY_CONTEXT_KEY = "mb_job_apply_context";

function setPersisted(value: string) {
  try {
    localStorage.setItem(JOB_APPLY_CONTEXT_KEY, value);
  } catch {
    /* private mode */
  }
  sessionStorage.setItem(JOB_APPLY_CONTEXT_KEY, value);
}

function getPersisted(): string | null {
  try {
    return localStorage.getItem(JOB_APPLY_CONTEXT_KEY) ?? sessionStorage.getItem(JOB_APPLY_CONTEXT_KEY);
  } catch {
    return sessionStorage.getItem(JOB_APPLY_CONTEXT_KEY);
  }
}

function removePersisted() {
  try {
    localStorage.removeItem(JOB_APPLY_CONTEXT_KEY);
  } catch {
    /* ignore */
  }
  sessionStorage.removeItem(JOB_APPLY_CONTEXT_KEY);
}

export function jobToApplyContext(job: {
  id: string;
  slug?: string | null;
  title: string;
  hospital_profiles?: { hospital_name?: string } | null;
  compensation?: number | null;
  shift_date: string;
}): JobApplyContext {
  return {
    id: job.id,
    slug: job.slug ?? null,
    title: job.title,
    hospitalName: job.hospital_profiles?.hospital_name ?? "Hospital",
    compensation: job.compensation ?? null,
    shiftDate: job.shift_date,
  };
}

export function saveJobApplyContext(job: JobApplyContext) {
  setPersisted(JSON.stringify(job));
}

export function getJobApplyContext(): JobApplyContext | null {
  try {
    const raw = getPersisted();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JobApplyContext;
    if (!parsed?.id || !parsed?.title) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearJobApplyContext() {
  removePersisted();
}

export function hasJobApplyContext(): boolean {
  return getJobApplyContext() !== null;
}
