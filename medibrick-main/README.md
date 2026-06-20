# MediBricks

Healthcare staffing marketplace connecting hospitals with doctors, nurses, technicians, and allied health professionals for flexible shift work.

**Production:** [medibrick.com](https://medibrick.com)

---

## Overview

MediBricks is a mobile-first web app where:

- **Healthcare professionals** discover shifts, apply in seconds, and manage applications
- **Hospitals** post shifts, review applicants, and manage their facility profile
- **Public visitors** browse SEO-optimized job and hospital pages (Google, WhatsApp, direct links)

The product is optimized for **95%+ mobile web** usage, with WhatsApp as a primary acquisition channel.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Routing | React Router v6 |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions, pg_cron) |
| Hosting | Vercel (SPA + serverless API routes) |
| Analytics | Vercel Analytics |
| Error monitoring | Sentry |
| SEO | Hybrid head injection (`api/render.ts`, `api/render-hospital.ts`) |

---

## Key features

### Jobs marketplace
- `/jobs` — searchable, filterable shift listings (mobile-first)
- `/jobs/:slug` — job detail with apply flow, sharing, and JSON-LD `JobPosting` schema
- `/jobs/doctors`, `/jobs/nurses`, `/jobs/bangalore`, etc. — SEO landing pages
- Mobile: full-screen job detail; desktop: split-panel master–detail
- Job sharing via WhatsApp, LinkedIn, copy link, email, native share

### Hospital profiles
- `/hospitals/:slug` — public hospital profile (trust signals, open shifts, reviews, map, FAQ)
- `/facility/:slug` — permanent redirect to `/hospitals/:slug`
- Hospital name on job detail links to the public profile

### Authentication
- OTP (phone), Google OAuth, email signup/login
- Return URL preserved through auth and profile completion (`sessionStorage`)
- Role-based access: professional, hospital, admin

### Observability
- Product analytics events (funnel, sharing, search, filters)
- Sentry error boundaries and Supabase error capture
- Business metrics SQL view (`business_metrics`)

### SEO & crawling
- Server-side meta injection for `/jobs` and `/hospitals` routes
- Dynamic sitemap at `/sitemap.xml`
- Dynamic OG images at `/api/og`
- Canonical URLs and structured data (JobPosting, MedicalOrganization, FAQPage)

---

## Getting started

### Prerequisites

- Node.js 18+
- npm
- Supabase project (URL + anon key)

### Install & run

```sh
git clone https://github.com/higagan/pronto-med-jobs.git
cd pronto-med-jobs
npm install
cp .env.example .env   # fill in your Supabase credentials
npm run dev
```

App runs at `http://localhost:8080` by default.

### Environment variables

See [`.env.example`](.env.example). Minimum for local dev:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

Optional but recommended:

- `VITE_SENTRY_DSN` — error monitoring
- `VITE_GOOGLE_MAPS_API_KEY` — geocoding / maps
- `SENTRY_AUTH_TOKEN` — source map upload on production builds

---

## Database

Migrations live in `supabase/migrations/`. Apply with:

```sh
supabase db push
```

### Seed data (local / demo)

Run `supabase/seed.sql` in the Supabase SQL Editor to populate 15 hospitals, 20 professionals, 20 jobs, and sample applications. All seed records use `is_seed_data = true` for easy cleanup.

**Seed login password:** `Seed@2026!`

### Hospital public profile schema

If adding hospital profiles manually, run the migration `20260615120000_add_hospital_public_profile.sql` (or the combined script from project docs). This adds:

- Extended `hospital_profiles` columns (`is_verified`, `specialties`, `nabh_accredited`, etc.)
- `hospital_reviews` table (anonymous professional reviews)

---

## Project structure

```
src/
  pages/           # Route-level pages (Jobs, HospitalProfile, Auth, Dashboard…)
  components/      # UI components (dashboard, SEO, sharing…)
  lib/             # Shared logic (job-seo, hospital-seo, job-types, sentry…)
api/
  render.ts        # SSR head injection for /jobs routes
  render-hospital.ts
  og.tsx           # Dynamic Open Graph images
  sitemap.xml.ts   # Dynamic sitemap
  _lib/            # Server-side Supabase data helpers
supabase/
  migrations/      # PostgreSQL schema migrations
  seed.sql         # Demo seed data
  functions/       # Supabase Edge Functions
```

---

## Public routes

| Route | Description |
|-------|-------------|
| `/` | Marketing homepage |
| `/jobs` | Shift discovery |
| `/jobs/:slug` | Job detail |
| `/jobs/landing/:segment` | Profession/city landing pages |
| `/hospitals/:slug` | Hospital public profile |
| `/for-hospitals` | Hospital marketing |
| `/for-professionals` | Professional marketing |
| `/how-it-works` | Product explainer |
| `/verification-process` | Trust & verification info |
| `/blog`, `/blog/:slug` | Content marketing |

Authenticated routes: `/dashboard`, `/auth`, `/complete-profile`, `/admin`, `/profile`.

---

## Deployment

Deployed on **Vercel** from the `main` branch. The `dev` branch is used for active development.

```sh
npm run build    # production build
```

Vercel rewrites (see `vercel.json`):

- `/jobs`, `/jobs/*` → `api/render` (SEO head injection)
- `/hospitals/*` → `api/render-hospital`
- `/sitemap.xml` → `api/sitemap.xml`
- `/facility/:slug` → 301 redirect to `/hospitals/:slug`

Set all env vars from `.env.example` in the Vercel project settings before deploying.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint |

---

## Contributing

1. Branch from `dev`
2. Make changes; keep mobile UX in mind for any jobs/hospital flows
3. Open a PR to `main` when ready for production

---

## License

Private — all rights reserved.
