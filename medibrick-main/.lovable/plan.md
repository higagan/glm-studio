# MediBricks Landing Page Optimization Plan

Scope: Refactor `src/pages/Index.tsx`, update `Navigation.tsx`, add 4 new routes with unique SEO metadata. Keep current indigo/red palette, glassmorphism, fonts, and Cloud/Supabase wiring untouched.

## 1. Hero Section (Index.tsx)
- New headline (Option B, strongest conversion): **"Fill Healthcare Shifts Faster with Verified Medical Professionals"**
- Subhead explaining the 4-step marketplace loop: Hospitals post shifts → Professionals apply → Hospitals select → Ratings & verification build trust.
- Keep two existing CTAs ("Post a Shift" / "Find Opportunities") but rename for clarity.
- Slightly lighter heading weight (`font-semibold` instead of `font-bold` on hero h1), tighten vertical padding.

## 2. Trust Badges Row (above the fold, under hero)
Inline row of 6 badges with check icons — no fake stats:
Verified Credentials · License Verification · Hospital & Professional Ratings · Secure Platform · Multi-Specialty Coverage · Fast Shift Matching

## 3. "How MediBricks Works" — Two-column workflow
Side-by-side cards:
- **For Hospitals**: Post Shift → Receive Applications → Review Profiles → Select Professional → Complete Assignment
- **For Professionals**: Browse Opportunities → Apply → Get Selected → Complete Shift → Build Reputation

## 4. Professional Categories strip
Icon grid: Doctors · Nurses · AYUSH Practitioners · Technicians · Allied Health Professionals

## 5. Two dedicated benefit sections (keep existing, refresh copy)
- **For Hospitals** — 5 benefits + CTA "Post a Shift" → `/auth`
- **For Professionals** — 5 benefits + CTA "Find Opportunities" → `/jobs`

## 6. Verification & Trust section (new)
Explains credential verification, license validation, profile review, ratings & reviews, platform moderation.

## 7. Final CTA + Footer (keep, refresh links)

## 8. Navigation update (Navigation.tsx + Index.tsx inline nav)
Desktop links: For Hospitals · For Professionals · How It Works · Verification · Browse Jobs · Get Started
Mobile: collapse into existing hamburger if present; otherwise keep compact.

## 9. New SEO pages (each with `react-helmet-async`)
Install `react-helmet-async` (if not already), add `HelmetProvider` in `main.tsx`, then create:
- `src/pages/ForHospitals.tsx` → `/for-hospitals`
- `src/pages/ForProfessionals.tsx` → `/for-professionals`
- `src/pages/HowItWorks.tsx` → `/how-it-works`
- `src/pages/VerificationProcess.tsx` → `/verification-process`

Each gets unique `<title>`, meta description, canonical, og:url/title, and JSON-LD. Register in `App.tsx`. Add all 4 to `public/sitemap.xml`.

## 10. Visual constraints
- Keep indigo (#1E3A8A) / red (#E63946), glass cards, 12px rounding, Poppins/Inter/Roboto.
- No animation work, no palette change, no full redesign.

## Out of scope
- Backend, DB schema, auth flow.
- Visual redesign beyond copy + layout density tweaks.
- Statistics, testimonials (no fake data per request).

Approve and I'll implement.
