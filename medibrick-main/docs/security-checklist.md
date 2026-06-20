# MediBricks Security Checklist

**Date:** 2026-03-10

| # | Check | Status |
|---|-------|--------|
| 1 | No hardcoded API keys/secrets in source code | ✅ PASS |
| 2 | All DB queries use parameterized Supabase SDK | ✅ PASS |
| 3 | RLS enabled on all tables | ✅ PASS |
| 4 | Admin access validated via DB role (not client-side) | ✅ PASS |
| 5 | No `dangerouslySetInnerHTML` with user input | ✅ PASS |
| 6 | No PII/sensitive data in console logs | ✅ PASS |
| 7 | Password strength enforced (8+ chars, uppercase, number, special) | ✅ PASS |
| 8 | Security headers present (X-Frame-Options, nosniff, referrer) | ✅ PASS |
| 9 | OAuth redirect uses `window.location.origin` | ✅ PASS |
| 10 | Password reset flow has dedicated `/reset-password` page | ✅ PASS |
| 11 | Duplicate application prevention (DB constraint) | ✅ PASS |
| 12 | Past shift date prevention (client + DB trigger) | ✅ PASS |
| 13 | Application withdrawal restricted to pending only (RLS) | ✅ PASS |
| 14 | No vulnerable npm dependencies | ✅ PASS |
| 15 | Edge Function CORS headers properly configured | ✅ PASS |
| 16 | Supabase anon key is publishable (not a secret) | ✅ PASS |
| 17 | Google Maps API key in env var (restrict in GCP Console) | ⚠️ MANUAL — restrict to domain |
| 18 | `APP_URL` secret set in Supabase | ⚠️ MANUAL |
| 19 | CSP header at hosting level | ⚠️ MANUAL |
| 20 | Leaked password protection enabled in Supabase | ⚠️ MANUAL |

**Automated checks: 16/20 PASS | 4 require manual action**
