# MediBricks — External UX / Product Review Package

**Prepared for:** Product advisor review  
**Product:** [medibrick.com](https://medibrick.com)  
**Date:** June 2026  
**Platform:** Mobile-first web (95%+ mobile traffic; WhatsApp is primary acquisition)

---

## What MediBricks is

MediBricks is a **two-sided healthcare staffing marketplace** in India:

| Side | Who | Core job |
|------|-----|----------|
| **Demand** | Hospitals & clinics | Post open shifts, review applicants, fill staffing gaps fast |
| **Supply** | Doctors, nurses, technicians, allied health | Discover nearby shifts, apply in seconds, build reputation |
| **Trust layer** | Platform | Credential verification, two-way ratings, secure profiles |

**Business model (current):** Marketplace connecting verified professionals with facilities; compensation shown per hour on shift listings.

---

## Who uses it

### 1. Healthcare professional (primary mobile user)
- Often arrives via **WhatsApp job link** or Google search
- Wants: see shift details fast → apply with minimal friction
- Pain points we’re solving: fragmented locum hiring, trust in credentials, distance/availability fit

### 2. Hospital / facility operator
- Posts shifts, reviews applications, manages facility profile
- Desktop + mobile; needs speed when a ward is understaffed

### 3. Anonymous visitor
- Browses SEO pages (`/jobs`, `/jobs/doctors`, hospital profiles)
- May convert to signup via Apply CTA

### 4. Founder / ops (internal)
- Password-gated `/admin` and `/admin/metrics` for user/job management and marketplace health

---

## Critical user journeys (please review these end-to-end)

### Journey A — WhatsApp → Apply (highest priority)
1. Tap shared link → `/jobs/:slug` (full-screen job on mobile)
2. Tap **Apply** → phone OTP auth (or already signed in)
3. Complete minimal profile if new user (`/complete-profile`)
4. Submit application → stay on job, see **Applied**
5. Hospital receives application notification

**Known recent fixes:** OTP auto-submit, return-to-same-job after auth, skip auth when session exists.

### Journey B — Browse & discover
1. Land on `/jobs` → search, filters, quick chips (Today, Night, ICU…)
2. Open job → read compensation, shift time, hospital link
3. Optional: view `/hospitals/:slug` for trust signals

### Journey C — Hospital posts a shift
1. Sign up / login → complete profile as **facility**
2. `/dashboard` → create job listing
3. Review incoming applications

### Journey D — Trust & conversion (marketing)
1. Homepage → understand value prop
2. `/for-professionals` or `/for-hospitals` → role-specific pitch
3. `/verification-process` → credential trust story

---

## Screenshot inventory

Screenshots are in `screenshots/desktop/` and `screenshots/mobile/` (1280×900 and iPhone 13).

| ID | Screen | Section | Auth required |
|----|--------|---------|---------------|
| 01 | Homepage | Marketing | No |
| 02 | For Hospitals | Marketing | No |
| 03 | For Professionals | Marketing | No |
| 04 | How It Works | Marketing | No |
| 05 | Verification Process | Marketing | No |
| 06 | Jobs listing | Marketplace | No |
| 07 | SEO landing (doctors) | Marketplace | No |
| 08 | Nearby jobs | Marketplace | No |
| 09 | Blog index | Content | No |
| 10 | Auth entry | Auth | No |
| 11 | Auth phone form | Auth | No |
| 12 | Complete profile | Onboarding | Redirects if logged out |
| 13 | Founder admin login | Admin | No |
| 14 | 404 | System | No |
| 15 | Job detail (live slug) | Marketplace | No |
| 16 | Hospital profile (live slug) | Marketplace | No |
| 17 | Blog post (if published) | Content | No |

### Screens not in automated capture (need live session)

Please review these manually or request a follow-up capture with test accounts:

| Screen | Route | Why omitted |
|--------|-------|-------------|
| Professional dashboard | `/dashboard` | Login required |
| Hospital dashboard | `/dashboard` | Login + hospital role |
| Professional profile edit | `/profile` | Login required |
| Apply dialog + confirmation | `/jobs/:slug` | Login + ≥70% profile |
| Application tracking | Dashboard tab | Login required |
| Admin panel | `/admin` | Founder password |
| Founder metrics | `/admin/metrics` | Founder password |
| Blog CMS | `/admin/blog` | No gate today — low traffic |

---

## Product constraints (intentional)

- **Mobile-first:** Desktop gets enhanced typography/spacing (`lg:`) but mobile is the source of truth
- **India context:** Phone OTP (+91 default), INR compensation, NMC/state license verification story
- **SEO:** Public job/hospital pages are crawlable; hybrid SSR meta via Vercel API routes
- **Trust:** 70% profile completion required before apply
- **No native app:** Progressive web experience only

---

## Review questions for the advisor

### First impressions (5 min)
1. Is the value proposition clear within 5 seconds on homepage (mobile)?
2. Does the product feel trustworthy for healthcare staffing?
3. What feels “generic template” vs purpose-built for medical shifts?

### Marketplace UX
4. Is the jobs list scannable on a phone in a hospital corridor?
5. Job detail hierarchy: compensation, shift time, location, hospital — right order?
6. Is Apply prominent enough without being aggressive?
7. Filter chips vs full filter modal — right balance?

### Auth & onboarding friction
8. Phone OTP flow — too many steps vs industry norm?
9. “You’re already signed in” on auth — confusing or helpful?
10. Complete profile form — minimal enough for first apply?
11. 70% profile gate before apply — fair or too early?

### Hospital side
12. Is it obvious how a hospital would post their first shift?
13. Application review UX (not screenshotted) — what would you expect?

### Trust & SEO pages
14. Verification process page — convincing for hospitals?
15. Hospital public profile — enough trust signals?
16. SEO landing pages — useful or thin?

### Growth & retention
17. What would make a professional return after first apply?
18. WhatsApp share flow — anything missing from job detail?
19. Blog — worth investment for this stage?

### Strategic
20. Biggest UX risk to marketplace liquidity (chicken-and-egg)?
21. Top 3 changes before scaling paid acquisition?
22. Anything that could harm credibility in healthcare?

---

## Tech context (for feasibility discussions)

| Area | Stack |
|------|--------|
| Frontend | React, TypeScript, Tailwind, shadcn/ui |
| Backend | Supabase (Postgres, Auth, Edge Functions) |
| Hosting | Vercel |
| Analytics | Vercel Analytics + custom `product_events` |
| Errors | Sentry |

---

## How to view screenshots

1. Open `PACKAGE.html` in a browser for a visual gallery
2. Or browse `screenshots/mobile/` first (primary persona)
3. Compare paired desktop shots for responsive decisions

---

## Contact / follow-up

For live walkthrough or authenticated screen capture, schedule a 30-min session with the founder. Test phone OTP works on production with any Indian mobile number.

**Repo:** `pronto-med-jobs` (private)  
**Production:** https://medibrick.com
