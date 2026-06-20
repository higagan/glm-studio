# Medibrick Launch Checklist — Priority Order

**Date:** Tue May 26, 2026
**Source:** Star (OpenClaw Agent)

---

## 🔴 P0 — CRITICAL (Do Before Anything Else)

| # | Task | Why | Time |
|---|------|-----|------|
| 1 | **Verify Supabase RLS is ON** | Without this, anyone can read/write your DB. Catastrophic. | 10 min |
| 2 | **Enable connection pooling** (`:6543` port) | Hit 60 connection limit = site dies at 50 users. | 5 min |
| 3 | **Add security headers** (CSP, CORS, X-Frame) | Missing = XSS, clickjacking, API abuse. Tested today. | 30 min |
| 4 | **Set up `/api/health` endpoint** | Monitoring needs this. Uptime checks broken without it. | 15 min |

**If you do nothing else, do P0.**

---

## 🟠 P1 — BLOCKING (Needed for First User)

| # | Task | Why | Time |
|---|------|-----|------|
| 5 | **Complete authentication flow** | Sign up/login for hospitals + professionals. Currently missing. | 2-3 days |
| 6 | **License verification system** | Upload + review docs. Core differentiator vs Jobizo. | 2 days |
| 7 | **Payment flow (escrow)** | Who pays whom? Hospital deposits? Professional pays deposit? Define this. | 1-2 days |
| 8 | **Shift posting + application flow** | Hospital posts → Professional applies → Hospital selects. MVP core. | 3-4 days |
| 9 | **Database schema finalization** | Users, shifts, applications, reviews, payments tables. | 1-2 days |

---

## 🟡 P2 — IMPORTANT (Before Marketing)

| # | Task | Why | Time |
|---|------|-----|------|
| 10 | **Add rate limiting to APIs** | Prevent abuse, protect costs. | 2 hours |
| 11 | **Set up Sentry/error tracking** | You'll miss bugs without this. | 30 min |
| 12 | **Add Vercel Analytics** | See real user behavior. Currently flying blind. | 15 min |
| 13 | **Test mobile responsiveness** | 70% of India healthcare workers use mobile. | 2 hours |
| 14 | **Create 5-10 hospital profiles** | Seed data. Empty platform = no conversions. | 1 day |
| 15 | **Create 20-30 professional profiles** | Seed data for demo. | 1 day |

---

## 🟢 P3 — GROWTH (Post-Launch)

| # | Task | Why | Time |
|---|------|-----|------|
| 16 | **Upgrade Vercel to Pro** ($20/mo) | More bandwidth, better limits. Free tier risky. | 5 min |
| 17 | **WhatsApp Business API** | For notifications (India's primary channel). | 2-3 days |
| 18 | **Razorpay integration** | Escrow + instant payments. Critical trust factor. | 2-3 days |
| 19 | **Email system (Resend/SendGrid)** | Application updates, shift reminders. | 4 hours |
| 20 | **Review + dispute system** | Bilateral reviews are your trust moat. | 2 days |
| 21 | **Content: publish 3 blog posts** | SEO + credibility. Currently 0 published. | 2 days |
| 22 | **LinkedIn outreach to 10 hospitals** | You have 5 contacts, 0 outreach. Start moving. | 1 day |
| 23 | **Calendar lock / no-show system** | Deposit + backup matching = 95% show rate promise. | 3-4 days |

---

## 🔵 P4 — OPTIMIZATION (Scale)

| # | Task | Why | Time |
|---|------|-----|------|
| 24 | **Redis caching for shift listings** | Faster load, lower DB costs. | 1 day |
| 25 | **Search/filter optimization** | Full-text search for shifts by dept/location. | 2 days |
| 26 | **Analytics dashboard** | Track fill rate, time-to-fill, payment speed. | 2-3 days |
| 27 | **iOS/Android app** | React Native wrapper. Mobile-first India. | 2-3 weeks |
| 28 | **Insurance integration** | Liability for temp staff. Reduces hospital hesitation. | 1-2 weeks |

---

## 📋 This Week's Action Plan

| Day | Focus | Tasks |
|-----|-------|-------|
| **Monday** | Security + Infra | P0 #1-4 (~1 hour total) |
| **Tue-Wed** | Auth + Verification | P1 #5-6 |
| **Thu-Fri** | Payments + Core Flow | P1 #7-9 |
| **Weekend** | Monitoring + Data | P2 #10-15 |

---

## 🎯 Bottom Line

- **Minimum for soft launch:** P0 + P1 (~1 week of dev)
- **Without P0:** Vulnerable to attacks, DB limit crashes
- **Without P1:** No product, just a landing page

Everything else (P2-P4) can come after first 10 hospital signups.

---

**File location:** `/Users/gagandeep/.openclaw/workspace/medibrick/launch-checklist.md`
