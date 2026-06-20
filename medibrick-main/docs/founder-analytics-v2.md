# Founder Analytics V2 — Design & Architecture

Actionable journey analytics: funnels, drop-offs, paths, and acquisition quality — not vanity aggregates.

---

## 1. Database schema

### `product_events` (extended)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | PK |
| `event_name` | TEXT | Canonical event from catalog |
| `user_id` | UUID | Authenticated user (nullable) |
| `session_id` | TEXT | Browser session (persisted in sessionStorage) |
| `page` | TEXT | `window.location.pathname` at emit time |
| `job_id` | TEXT | Job slug or UUID when relevant |
| `hospital_id` | TEXT | Hospital slug or UUID when relevant |
| `source` | TEXT | Traffic source: `google`, `whatsapp`, `direct`, `referral`, `linkedin` |
| `properties` | JSONB | Extra metadata (channel, method, term, etc.) |
| `created_at` | TIMESTAMPTZ | Event timestamp |

**Indexes**

- `(event_name, created_at DESC)` — funnel counts
- `(session_id, created_at)` — journey timelines
- `(user_id, created_at DESC)` — user history
- `(source, created_at DESC)` — acquisition
- `(created_at DESC)` — recent events

**Retention:** No TTL in v2. Recommend partitioning or archival after ~90 days at scale (see Storage).

### RPCs (service role only)

| Function | Returns |
|----------|---------|
| `admin_get_application_funnel(days)` | Steps with count, conversion %, drop-off %, vs previous period |
| `admin_get_hospital_funnel(days)` | Hospital signup → publish funnel |
| `admin_get_dropoff_analysis(days)` | Counts by friction stage + trend |
| `admin_get_acquisition_breakdown(days)` | Per-source visitors → applications |
| `admin_get_user_journeys(days, limit)` | Recent sessions + inferred status |
| `admin_get_session_timeline(session_id)` | Ordered events for drill-down |

---

## 2. Event catalog

### Discovery

| Event | When | Key properties |
|-------|------|----------------|
| `page_view` | Route change | `path` |
| `job_viewed` | Job detail shown | `jobSlug`, `jobTitle` |
| `hospital_profile_viewed` | Hospital profile page | `hospitalSlug` |
| `hospital_jobs_viewed` | Shifts/jobs CTA on hospital page | `hospitalSlug` |
| `search_performed` | Search submit | `term`, `resultCount` |
| `filter_applied` | Filter change | `resultCount` |

### Engagement

| Event | When |
|-------|------|
| `job_shared` | Share job (channel in properties) |
| `hospital_shared` | Share hospital |
| `maps_opened` | Google Maps link clicked |

### Application funnel

| Event | When |
|-------|------|
| `apply_clicked` | Apply CTA |
| `auth_started` | Login/signup/OTP/Google start (`method`) |
| `auth_completed` | Auth success |
| `profile_started` | Profile form opened |
| `profile_completed` | Profile saved |
| `application_started` | Apply dialog opened |
| `application_submitted` | Application sent |

Legacy aliases kept: `hospital_viewed` → same as `hospital_profile_viewed`; `application_dialog_opened` → `application_started`.

### Hospital funnel

| Event | When |
|-------|------|
| `hospital_signup_started` | Hospital signup form |
| `hospital_signup_completed` | Signup done |
| `job_created` | Job draft saved |
| `job_published` | Job live |

### Standard envelope (every event)

`user_id`, `session_id`, `timestamp`, `page`, `job_id`, `hospital_id`, `source`, `properties`

---

## 3. Dashboard wireframes

### `/admin/analytics/funnels`

```
┌─────────────────────────────────────────────────────────────┐
│ Founder Analytics › Funnels          [7d ▼] [Refresh]       │
├─────────────────────────────────────────────────────────────┤
│ ⚠ Biggest leak: Apply Clicked → Auth Started  37.5% drop-off │
├─────────────────────────────────────────────────────────────┤
│ JOB APPLICATION FUNNEL                                       │
│ Job Viewed              100  100%   —      ▲ +12% vs prev    │
│ Apply Clicked            40   40%  60%    ▼ -5%              │
│ Auth Started             25   25%  37.5%  ▲ +3%              │
│ Auth Completed           20   20%  20%    —                  │
│ Profile Completed        15   15%  25%    ▼ -8%              │
│ Application Submitted    10   10%  33%    ▲ +2%              │
└─────────────────────────────────────────────────────────────┘
```

### `/admin/analytics/journeys`

```
┌──────────────────────────────────────────────────────────────┐
│ User          Source     Last Activity    Journey Status      │
│ User #184     Google     2m ago          Dropped at Profile   │
│ User #185     WhatsApp   5m ago          Applied Successfully  │
│ User #186     Direct     1h ago          Viewed Only         │
├──────────────────────────────────────────────────────────────┤
│ USER TIMELINE (session abc-123)                              │
│ 10:15  job_viewed        /jobs/cardiology-registrar          │
│ 10:16  apply_clicked                                         │
│ 10:17  auth_started        method: otp                         │
│ 10:18  auth_completed                                        │
│ 10:19  profile_started                                       │
│ 10:21  (last event — left site)                              │
└──────────────────────────────────────────────────────────────┘
```

### `/admin/analytics/dropoffs`

```
Dropped At              Count   % of drop-offs   Trend vs prev
OTP / Auth              23      49%              ▲ +4
Profile Completion      18      38%              ▼ -2
Application Submit       6      13%              — 0
```

### `/admin/analytics/acquisition`

```
Source     Visitors  Job Views  Apply Clicks  Applications  Conv %
WhatsApp        300        180           55            40    13.3%
Google          600        420           80            20     3.3%
Direct          150         90           20             8     5.3%
```

### `/admin/analytics/hospital`

Hospital Signup Started → Completed → Job Created → Job Published (same funnel UI).

---

## 4. Analytics architecture

```
┌─────────────┐     track()      ┌──────────────────┐
│  React SPA  │ ───────────────► │ Vercel Analytics │
└──────┬──────┘                  └──────────────────┘
       │ POST /api/product-events
       ▼
┌──────────────────┐     insert     ┌─────────────────┐
│ Vercel API       │ ─────────────► │ product_events  │
│ (service role)   │                │ (Supabase)      │
└────────┬─────────┘                └────────┬────────┘
         │ GET /api/founder-analytics       │ RPCs
         ▼                                  ▼
┌──────────────────┐                ┌─────────────────┐
│ Admin UI         │ ◄───────────── │ SQL aggregations│
│ /admin/analytics │                │ (SECURITY DEFINER)│
└──────────────────┘                └─────────────────┘
```

- **Ingest:** Client `track()` → whitelist API → enriched columns + JSONB.
- **Query:** Admin-gated API → Supabase RPCs (no client direct DB read).
- **Auth:** Same founder password gate as `/admin/metrics`.

---

## 5. Performance impact

| Area | Impact | Mitigation |
|------|--------|------------|
| Client `track()` | +1 async POST per event (keepalive) | Already non-blocking; batch not needed yet |
| `page_view` per route | ~1 event/navigation | Debounced via React Router listener |
| Funnel RPCs | Full table scan on `product_events` for window | Indexes on `(event_name, created_at)`; OK to ~500k rows |
| Journey list | `GROUP BY session_id` on recent window | Limit 50; 7-day default window |
| Admin API | 60s private cache | Same as founder-metrics |

At current Medibrick scale (<100k events), sub-second RPC latency expected.

---

## 6. Storage impact

| Assumption | Estimate |
|------------|----------|
| ~15 events/session | |
| 500 sessions/day | 7,500 rows/day |
| ~400 bytes/row | ~3 MB/day, ~90 MB/month |

**Recommendations at growth:**

- 90-day retention policy (cron delete or partition drop)
- Aggregate daily funnel snapshots table if >1M rows
- Avoid high-cardinality properties in JSONB

---

## 7. Privacy implications

| Data | Risk | Mitigation |
|------|------|------------|
| `user_id` | PII linkage | Admin-only RPCs; no RLS policies for anon |
| Session timelines | Behavioral profiling | Founder-only; not exposed to hospitals |
| IP | Not stored in v2 | — |
| Auth `method` | Low sensitivity | Stored in properties only |
| GDPR | Lawful basis = legitimate interest (product improvement) | Document in privacy policy; add retention limits |

**Session replay (Phase 7):** Do not enable without consent banner if EU users are in scope.

---

## 8. Phase 7 — Session replay readiness (recommendations only)

| Tool | Role today | Recommendation |
|------|------------|----------------|
| **Sentry** | Errors + performance | Enable **Sentry Session Replay** on `/jobs`, `/auth`, profile flows first (~5% sample). Lowest lift; ties replay to errors. |
| **Vercel Analytics** | Page views, Web Vitals | Keep for speed; no replay. Use for traffic, not journeys. |
| **Supabase** | `product_events` + auth logs | Source of truth for **structured funnels**; not replay. |
| **Heatmaps / rage clicks** | Not present | **PostHog** (self-host or cloud) or **Microsoft Clarity** (free heatmaps) if budget-sensitive. Clarity = fastest heatmaps; PostHog = funnels + replay in one. |

**Suggested path:** (1) Structured events in Supabase (this v2), (2) Sentry replay on auth/apply, (3) Clarity or PostHog for heatmaps when monthly sessions >5k.

---

## Implementation map

| Route | API `section` |
|-------|----------------|
| `/admin/analytics/funnels` | `funnels` |
| `/admin/analytics/journeys` | `journeys` + `timeline` |
| `/admin/analytics/dropoffs` | `dropoffs` |
| `/admin/analytics/acquisition` | `acquisition` |
| `/admin/analytics/hospital` | `hospital` |

Migration: `supabase/migrations/20260618120000_founder_analytics_v2.sql`
