# Healthcare Professional Application Flow — E2E Review

**Date:** 2026-06-16  
**Environments tested:** `https://medibrick.com` (production) + `http://localhost:8081` (local nav branch)  
**Test job:** `intensivist` (`/jobs/intensivist-bengaluru-5e561d2d`)  
**Automation:** `node scripts/product-review/validate-apply-flow.mjs --base=<url>`

---

## Executive summary

| Area | Verdict |
|------|---------|
| **Apply intent persistence (logged out → auth)** | ✅ Pass — desktop & mobile |
| **Job context on auth screen** | ✅ Pass |
| **Browser back button** | ✅ Pass — returns to same job, intent preserved |
| **Google OAuth full journey** | ⚠️ Not automated — **manual sign-off required** |
| **New user → complete profile → resume apply → submit** | ❌ **Blocked by 67% profile gate (P0)** |
| **Existing logged-in apply → My Applications** | ⚠️ Not automated (no test credentials) — code review only |
| **Founder dashboard funnel** | ⚠️ Partial — early-funnel events fire; **zero `application_submitted` events ever** |

**Recommendation:** Do **not** commit/push navigation until the **P0 profile-completion gate** is fixed and Google OAuth is manually verified once on production.

---

## A. Pass/Fail checklist

### Case 1 — New user (logged out)

| Step | Desktop | Mobile | Expected | Actual | Analytics |
|------|---------|--------|----------|--------|-----------|
| Browse Jobs | ✅ | ✅ | `/jobs` loads open shifts | Pass | `page_view` |
| Open job detail | ✅ | ✅ | Same job slug in URL | Pass | `job_viewed` |
| Click Apply | ✅ | ✅ | Redirect `/auth`, toast “Sign in required” | Pass | `apply_clicked`, `apply_requires_auth` |
| Job ID preserved | ✅ | ✅ | `mb_pending_apply` + `mb_apply_intent.jobId` match | Pass | — |
| Return URL preserved | ✅ | ✅ | `mb_auth_redirect` = `/jobs/{slug}` | Pass | — |
| Apply intent preserved | ✅ | ✅ | `mb_job_apply_context` shows title/hospital/rate | Pass | `auth_started_from_job` on email attempt |
| Auth shows job card | ✅ | ✅ | “Continue your application” + job summary | Pass | — |
| Login with Google | ⚠️ | ⚠️ | Return to same job `?apply=resume`, dialog opens | **Not tested** (OAuth) | — |
| Complete role/profile | ⚠️ | ⚠️ | `/complete-profile` → return to job | **67% completion blocks apply (P0)** | `profile_completed` exists (1 total) |
| Submit application | ❌ | ❌ | Dialog → success → “Applied” | **Not reached in automation** | **0 `application_submitted` in DB** |
| My Applications | ❌ | ❌ | Job listed on `/dashboard` | **Not reached** | — |
| Browser back after auth | ✅ | ✅ | Back → job detail, intent still in storage | Pass | — |

### Case 2 — Existing professional (logged in)

| Step | Desktop | Mobile | Expected | Actual | Analytics |
|------|---------|--------|----------|--------|-----------|
| Open job detail | ⚠️ | ⚠️ | Detail loads | **Not run** — no test login | — |
| Apply (no auth redirect) | ⚠️ | ⚠️ | Dialog opens immediately | Code path correct; **not browser-verified** | — |
| Submit application | ⚠️ | ⚠️ | Success toast + `application_submitted` | **Not run** | 0 events historically |
| My Applications updates | ⚠️ | ⚠️ | New row in dashboard | 3 real apps in DB; **not verified in UI** | — |

### Context preservation matrix

| Check | Result |
|-------|--------|
| No context lost after Apply (pre-auth) | ✅ Pass |
| Job ID in localStorage + sessionStorage mirror | ✅ Pass |
| Return URL uses slug (not UUID) | ✅ Pass |
| `?apply=resume` appended post-auth (code) | ✅ Implemented in `buildPostAuthReturnUrl()` |
| OAuth survives storage (localStorage mirror) | ✅ By design |
| Back button | ✅ Pass |

---

## B. Screenshots

Gallery: `docs/apply-flow-review/screenshots/`

| Screenshot | Description |
|------------|-------------|
| `Case 1-desktop-01-browse-jobs.png` | Jobs listing (logged out) |
| `Case 1-desktop-02-job-detail.png` | Job detail with Apply CTA |
| `Case 1-desktop-03-auth-with-context.png` | Auth with job summary card + “Sign in required” toast |
| `Case 1-mobile-03-auth-with-context.png` | Mobile auth with preserved job context |
| `case1-email-desktop-04-after-signup.png` | Email signup blocked by Supabase rate limit (test artifact) |
| `back-button-desktop.png` / `back-button-mobile.png` | Back returns to job; intent persisted |

---

## C. Bugs found

### P0 — Minimal onboarding leaves profile at 67%; apply gate requires 70%

**Impact:** New users who sign up via Apply → complete `/complete-profile` → return to job with `?apply=resume` are **redirected to `/profile`** instead of the apply dialog.

**Root cause:** `JobDetailsView` counts 6 fields; minimal onboarding only fills 4 (`full_name`, `specialization`, `experience_years`, `qualifications`). Phone and bio remain empty → **67% < 70%**.

```92:106:src/components/dashboard/JobDetailsView.tsx
    if (completion < 70) {
      saveJobApplyRedirect(job);
      track("profile_started", {
        path: "/profile",
        source: "apply_resume",
        ...
      });
      navigate("/profile");
```

**Conversion risk:** Highest-intent users (clicked Apply) hit a second wall after onboarding. Correlates with **0 `apply_resumed_after_auth`** events in `product_events`.

---

### P0 — Google OAuth journey not verified in this run

**Impact:** Primary auth method for professionals untested end-to-end.

**Code review:** Flow appears correct (`saveJobApplyRedirect` → OAuth → `/auth` callback → `buildPostAuthReturnUrl` → `?apply=resume`). **Must be manually verified once** before merge.

---

### P1 — Email signup may not grant immediate session

Supabase returns `session: false` for new email signups (confirmation required). User stays on `/auth` with “check your email” toast while apply intent remains in localStorage (good), but **no inline guidance to verify email and return**.

---

### P1 — `application_submitted` never recorded in founder analytics

| Metric | Value |
|--------|-------|
| Real applications in `applications` table | **3** |
| `application_submitted` in `product_events` | **0** |

Early-funnel events **do** land (`job_viewed`: 67, `apply_requires_auth`: 6). Founder funnel metrics for submissions will read **zero** even when applications exist. Possible causes: events predated instrumentation, API failures on submit, or users never reaching submit due to profile gate.

---

### P1 — Case 2 not browser-verified

Seed accounts (`@medibrick-seed.internal`) return auth schema errors. No `E2E_PRO_EMAIL` / `E2E_PRO_PASSWORD` provided. Logged-in apply path reviewed in code only.

---

### P2 — E2E email rate limiting

Automated signup hit Supabase “email rate limit exceeded”. Not a product bug, but blocks CI-style regression tests.

---

## D. Recommended fixes (before commit/push)

| Priority | Fix |
|----------|-----|
| **P0** | **Unblock post-onboarding apply:** Either (a) collect phone on `/complete-profile`, (b) lower gate to 65% or use weighted required fields, or (c) treat `complete-profile` submit as “apply-ready” and skip 70% check on `apply=resume`. |
| **P0** | **Manual Google OAuth test** on production: Apply → Google → complete profile if new → confirm return to same job → submit. |
| **P1** | After email signup without session, show persistent banner: “Verify your email, then we’ll return you to [job title].” |
| **P1** | Verify `application_submitted` fires on successful insert; backfill or reconcile founder funnel with `applications` table. |
| **P1** | Add `E2E_PRO_EMAIL` / `E2E_PRO_PASSWORD` (or fix seed auth users) for regression automation. |
| **P2** | Add `npm run review:validate-apply` to CI with non-seed job fixture. |

---

## E. Severity summary

| Severity | Count | Items |
|----------|-------|-------|
| **P0** | 2 | Profile 67% gate blocks resume apply; Google OAuth unverified |
| **P1** | 3 | Email confirm UX; analytics gap on submit; Case 2 not automated |
| **P2** | 1 | Supabase email rate limit in automation |

---

## Analytics & founder dashboard

### Events observed during this test run (browser intercept)

| Event | Fired? |
|-------|--------|
| `job_viewed` | ✅ |
| `apply_clicked` | ✅ |
| `apply_requires_auth` | ✅ |
| `auth_started_from_job` | ✅ (email path) |
| `apply_resumed_after_auth` | ❌ Not reached |
| `application_started` | ❌ Not reached |
| `application_submitted` | ❌ Not reached |

### `product_events` table (production, all time)

| Event | Count |
|-------|-------|
| `job_viewed` | 67 |
| `apply_clicked` | 8 |
| `apply_requires_auth` | 6 |
| `auth_started_from_job` | 2 |
| `auth_completed_from_job` | 1 |
| `profile_completed` | 1 |
| `application_submitted` | **0** |

Founder dashboard funnel will show strong top-of-funnel signal but **no submission conversions** until the profile gate and analytics gap are resolved.

---

## Manual sign-off checklist (required before merge)

- [ ] Google: Apply → Continue with Google → complete profile (new account) → land on **same job** with apply dialog
- [ ] Google: Apply → Continue with Google (existing pro) → apply dialog without losing job
- [ ] Phone OTP: same as above (if enabled for your market)
- [ ] After submit: job shows “Applied”; `/dashboard` lists application
- [ ] Founder analytics: confirm `application_submitted` appears within 5 minutes

---

*Generated by automated validation + DB/code review. Navigation changes were **not** committed or pushed.*
