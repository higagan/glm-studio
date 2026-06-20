# Apply Flow E2E Checklist

**Run:** 2026-06-16T19:39:34.362Z  
**Base:** https://medibrick.com  
**Job:** intensivist (`intensivist-bengaluru-5e561d2d`)  
**Score:** 10/15 passed

## A. Pass/Fail Checklist

| Case | Viewport | Step | Pass | Analytics |
|------|----------|------|------|-----------|
| Case 1 | desktop | Browse Jobs | ✅ | page_view, job_viewed |
| Case 1 | desktop | Open Job Detail | ✅ | page_view, job_viewed, job_viewed |
| Case 1 | desktop | Click Apply → Auth | ✅ | page_view, job_viewed, job_viewed, apply_clicked |
| Case 1 | desktop | Auth shows job context card | ✅ | — |
| Case 1 | desktop | Login with Google | ❌ | — |
| Back button | desktop | Browser back after Apply→Auth | ✅ | — |
| Case 1 | mobile | Browse Jobs | ✅ | page_view |
| Case 1 | mobile | Open Job Detail | ✅ | page_view, job_viewed, job_viewed |
| Case 1 | mobile | Click Apply → Auth | ✅ | page_view, job_viewed, job_viewed, apply_clicked |
| Case 1 | mobile | Auth shows job context card | ✅ | — |
| Case 1 | mobile | Login with Google | ❌ | — |
| Back button | mobile | Browser back after Apply→Auth | ✅ | — |
| Case 1 (email path) | desktop | Email signup after Apply | ❌ | page_view, auth_started, auth_started_from_job |
| Case 1 (email path) | desktop | Return to same job after onboarding | ❌ | page_view, auth_started, auth_started_from_job |
| Case 2 | all | Case 2 existing user login | ❌ | — |

## B. Screenshots

See `docs/apply-flow-review/screenshots/`

## C. Bugs Found

- **P0** — Case 1 / Login with Google: NOT AUTOMATED — requires manual Google OAuth in browser
- **P0** — Case 1 / Login with Google: NOT AUTOMATED — requires manual Google OAuth in browser
- **P1** — Case 1 (email path) / Email signup after Apply: https://medibrick.com/auth
- **P0** — Case 1 (email path) / Return to same job after onboarding: https://medibrick.com/auth
- **P1** — Case 2 / Case 2 existing user login: Could not sign in — set E2E_PRO_EMAIL / E2E_PRO_PASSWORD

## D. Recommended Fixes

- Manually verify Google OAuth return path with `?apply=resume` on staging before merge.

## E. Severity Summary

- P0: 3
- P1: 2