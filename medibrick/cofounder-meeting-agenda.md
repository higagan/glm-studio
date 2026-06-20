# Medibrick Cofounder Meeting Agenda

**Date:** 2026-06-01
**Attendees:** Gagan (Tech/Founder) + Arpana (Medical/Healthcare)
**Objective:** Align on current state, priorities, and next steps

---

## Slide 1: Meeting Opening (2 min)

**Welcome + Context**
- Where we are today vs where we need to be
- What's working, what's blocked
- What we need to decide today

**Today's Goal:** Leave with clear action items for next 2 weeks

---

## Slide 2: Platform Status Overview (5 min)

### What We've Built
| Component | Status | Notes |
|-----------|--------|-------|
| Landing page | ✅ Live | medibrick.com |
| Database (Supabase) | ✅ Set up | Needs RLS verification |
| Basic auth | 🟡 Partial | Needs completion |
| Shift posting | 🔴 Not started | Core MVP feature |
| Application flow | 🔴 Not started | Hospital selects professional |
| Payment escrow | 🔴 Not started | Critical differentiator |
| Review system | 🔴 Not started | Post-shift bilateral |

### Key Decision Needed:
**Q:** What's the minimum viable product for first hospital pilot?
**Options:**
- A) Full platform with all features (4-6 weeks)
- B) Basic shift posting + application via WhatsApp (1-2 weeks)
- C) Landing page + manual matching via phone (this week)

**Cofounder Input Needed:** What's the fastest way to validate with 1 hospital?

---

## Slide 3: The Two Core Pain Points (10 min)

### Pain Point #1: "Yes but No-Show"

**The Problem:**
- Hospital confirms nurse for tomorrow's shift
- Nurse says "Yes, I'll be there"
- Morning comes: Nurse doesn't show, doesn't pick up
- Hospital short-staffed with 40 patients, zero backup

**Why It Happens:**
- Better offer elsewhere (another hospital pays more last minute)
- Multiple bookings (booked 2-3 places, picked best)
- Zero penalty for not showing
- No verification (anyone can say yes)
- Poor communication (no real-time tracking)

**Current Workarounds (Broken):**
- Hospital calls 10 people, hopes 1 shows
- Relies on "known" agencies (expensive, limited pool)
- Keeps internal float staff (costly idle time)
- Manager works double shift (burnout)

**Medibrick Solution:**
| Problem | Our Fix |
|---------|---------|
| No-shows | Verified profiles + deposit system (₹500-2000) |
| Last-minute drops | Instant backup matching — auto-promote #2 applicant |
| Multiple bookings | Calendar lock — once confirmed, blocked elsewhere |
| No penalty | No-show penalty — strike system + deposit forfeiture |
| No trust | Bilateral reviews + rating history visible |
| No visibility | Real-time status: "Confirmed → En route → Arrived" |

**Target Metric:** 95% show rate (industry average: ~70%)

**Cofounder Input Needed:** 
- Is ₹500-2000 deposit reasonable for nurses/technicians?
- Should we have tiered deposits (₹500 for nurses, ₹2000 for doctors)?
- What's the right strike threshold (3 no-shows = suspend)?

---

### Pain Point #2: Delayed/Uncertain Payments

**The Problem:**
- Professional completes 12-hour shift
- Week 1: "Payment is processing"
- Week 2: "Finance team is reviewing"
- Week 3: "Will be cleared next week"
- Week 4: Still no money. Professional chasing admin.
- **Result:** Professional stops using platform, goes back to word-of-mouth

**Why It Happens:**
- Hospital pays platform late
- Platform holds money as working capital
- Manual invoicing (paper bills, slow approvals)
- No transparency into payment status

**Current "Solutions" (Broken):**
- Professional calls hospital admin daily (annoying)
- Threatens to not return (burns bridge)
- Accepts partial payment (loses money)
- Switches to cash-only word-of-mouth (limits opportunities)

**Medibrick Solution:**
| Feature | How It Works |
|---------|--------------|
| Escrow system | Hospital deposits shift payment upfront |
| Instant release | Professional gets paid within 24h of shift completion |
| No hospital delay | Platform holds money, not hospital |
| Dispute window | 48h for hospital to raise issues, else auto-release |
| Payment tracking | Professional sees: "Pending → Processing → Paid" |

**Competitive Advantage:**
| Platform | Payment Speed |
|----------|--------------|
| Jobizo | 2-4 weeks (reportedly) |
| Agencies | 30-60 days |
| **Medibrick** | **24 hours** |

**Cofounder Input Needed:**
- Should hospital pay full shift amount upfront or just platform fee?
- Who handles payment processing — us or third-party (Razorpay)?
- What if hospital disputes after 48h window?

---

## Slide 4: Competitive Landscape (10 min)

### Primary Competitor: Jobizo.com

**Jobizo Stats:**
- 10M+ shifts fulfilled
- 150+ hospitals, 60K+ professionals
- Mobile app for professionals
- AI matching, transparent pay

**Jobizo's Weaknesses (Our Opportunities):**

| Gap | Medibrick Advantage |
|-----|-------------------|
| **Job-seeker focused** | Institution-first — hospital posts, pros apply |
| **Allopathic doctors only** | Allopathic + AYUSH + nurses + technicians |
| **No Ayurvedic coverage** | 700K+ Ayurvedic practitioners — NO platform serves them |
| **Hospitals only** | Clinics, diagnostic centers, wellness centers, nursing homes |
| **No no-show protection** | Verified + deposit + backup matching = 95% show rate |
| **Payment: 2-4 weeks** | 24h payment after shift completion |
| **No bilateral reviews** | Both parties review each other — trust building |

### The Medibrick Flywheel
1. Hospital posts shift + deposits payment in escrow
2. Professional applies + pays small deposit
3. Both have skin in the game = Commitment secured
4. Professional shows up (95% rate)
5. Completes shift
6. Payment released within 24h
7. Both review each other = Trust built
8. Repeat

**Cofounder Input Needed:**
- Which hospital type should we target first? (Big hospital vs small clinic)
- Should we include Ayurvedic from Day 1 or add later?
- What's Jobizo's actual payment speed? (Need verification)

---

## Slide 5: Target Market & Positioning (5 min)

### Phase 1 Cities (Next 6 Months)
1. **Bengaluru** (HQ) — Start here
2. Hyderabad
3. Chennai
4. Mumbai
5. Delhi
6. Pune

### Target Segments (vs Jobizo)

| Segment | Jobizo | Medibrick | Market Size |
|---------|--------|-----------|-------------|
| Hospitals | ✅ Yes | ✅ Yes | Large |
| Clinics | ❌ No | ✅ Yes | Very Large |
| Diagnostic Centers | ❌ No | ✅ Yes | Large |
| Wellness Centers | ❌ No | ✅ Yes | Growing |
| Ayurvedic Centers | ❌ No | ✅ Yes | 700K+ practitioners |
| Nursing Homes | ❌ No | ✅ Yes | Large |

### User Roles

**Healthcare Facilities:**
- Create profile with verification
- Post locum shifts (department, dates, requirements)
- Browse/select applicants
- Review professionals after shift

**Healthcare Professionals:**
- Create profile with qualifications, license uploads
- Browse shifts by department/date/location
- Apply with personalized messages
- Review hospitals after shift

**Cofounder Input Needed:**
- Which city has highest locum demand? (Medical insight)
- What's typical shift duration? (4h? 8h? 12h? 24h?)
- What credentials should we verify? (License? Degree? Experience?)

---

## Slide 6: Business Model & Pricing (10 min)

### Revenue Model Options

**Option A: Commission Per Shift**
- Hospital pays ₹X per filled shift
- Simple, scalable
- Risk: Hospital might negotiate down

**Option B: Subscription (Freemium)**
- Free: Post 2 shifts/month
- Paid: ₹2000/month for unlimited shifts
- Risk: Hospitals reluctant to subscribe before trying

**Option C: Hybrid (Recommended)**
- Free to post, ₹200 per filled shift
- Premium tier: ₹5000/month for priority matching + analytics
- Low barrier to entry, revenue scales with usage

### Pricing Reference

| Service | Traditional Agency | Medibrick Target |
|---------|-------------------|------------------|
| Commission | 20-30% of salary | ₹200 flat per shift |
| Subscription | N/A | ₹5000/month (premium) |
| Setup Fee | ₹5000-10000 | Free |

### Professional Side
- Free to join, free to apply
- Deposit: ₹500-2000 (refundable on completion)
- No platform fees for professionals

**Cofounder Input Needed:**
- What's the right price point for hospitals? (₹100? ₹200? ₹500?)
- Should professionals pay anything beyond deposit?
- Is deposit refundable immediately or after review period?

---

## Slide 7: Technical Architecture (5 min)

### Current Stack
| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | Lovable (no-code/low-code) | ✅ Built |
| Database | Supabase (PostgreSQL) | ✅ Set up |
| Hosting | Vercel (planned) | 🟡 Not deployed |
| Auth | To be decided | 🔴 Not started |
| Payments | To be decided (Razorpay?) | 🔴 Not started |
| Backend | Not used | N/A |

### Security Concerns (CRITICAL)
1. **RLS (Row Level Security)** — Currently unclear if ON
2. **Connection pooling** — Will hit limit at 50 users
3. **Security headers** — Missing CSP, CORS
4. **Rate limiting** — Not implemented

**Cofounder Input Needed:**
- Do we need a technical cofounder/contractor for backend?
- Can we validate without full tech stack? (WhatsApp/manual first)

---

## Slide 8: Go-to-Market & Accelerators (5 min)

### Accelerator Opportunities (Apply Now)

| Program | Deadline | Fit | Action |
|---------|----------|-----|--------|
| **Saamarthya 6.0 (IIHMR)** | Open now | ⭐⭐⭐ Perfect — healthcare staffing | **Apply this week** |
| **NSRCEL Impact Orbit (IIMB)** | Open now | ⭐⭐⭐ Strong — healthcare for ageing | **Apply this week** |
| T-Hub Healthcare | Feb 28, 2026 | ⭐⭐⭐ Strong — hospital tech | Apply |
| OJAS-MedTech (IIIT-H) | Twice/year | ⭐⭐ Good — marketplace focus | Watch |

### Why Accelerators Matter
- Funding (₹10L-₹50L grants)
- Hospital network introductions
- Mentorship from healthcare industry
- Credibility for hospital sales

### Immediate Outreach
- Target: 10 Bengaluru hospitals this month
- Channel: LinkedIn + WhatsApp + direct calls
- Message: "First 3 shifts free, 95% show rate guarantee"

**Cofounder Input Needed:**
- Do you have hospital contacts we can approach? (Warm intros)
- Which accelerator is most relevant for medical credibility?
- Should we apply to multiple or focus on one?

---

## Slide 9: Risks & Mitigations (5 min)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Jobizo adds deposit system | Medium | High | Move fast, build density first |
| Hospital won't pay upfront | Medium | High | Offer escrow via Razorpay (trust) |
| Professional won't pay deposit | Low | Medium | Start with ₹500, refundable immediately |
| Regulatory issues (medical licensing) | Medium | High | Verify licenses, partner with medical councils |
| Low initial supply (professionals) | High | High | Seed with 50 profiles before launch |
| Low initial demand (hospitals) | High | High | Pilot with 5 hospitals, case study |
| Platform tech failures | Medium | High | WhatsApp fallback, manual backup |

**Cofounder Input Needed:**
- What's the biggest risk from medical perspective?
- Are there regulatory barriers we haven't considered?
- What's Plan B if tech doesn't work?

---

## Slide 10: Next 2 Weeks — Action Plan (10 min)

### Week 1 Priorities

| Day | Task | Owner | Output |
|-----|------|-------|--------|
| Mon | Verify Supabase RLS + security | Gagan | Secure DB |
| Tue | Define minimum viable pilot | Both | Agreement on MVP scope |
| Wed | Create 50 seed professional profiles | Cofounder | Profiles ready |
| Thu | Outreach to 5 hospitals | Cofounder | Meetings booked |
| Fri | Apply to Saamarthya + NSRCEL | Gagan | Applications submitted |

### Week 2 Priorities

| Task | Owner | Output |
|------|-------|--------|
| Hospital meetings + feedback | Both | 3+ hospital interviews |
| Revise pitch based on feedback | Both | Updated battlecard |
| Set up payment flow (Razorpay) | Gagan | Escrow prototype |
| Create WhatsApp notification system | Gagan | Manual alerts working |

### Decision Matrix

| If Hospital Says | Then We Do |
|-------------------|-------------|
| "We want to try" | Manual matching via WhatsApp/phone |
| "We need tech platform" | Build basic shift posting + application |
| "We want integration" | Full platform with payment + reviews |
| "We need approval from board" | Provide case studies, offer pilot terms |

**Cofounder Input Needed:**
- Can you take lead on hospital outreach? (Medical credibility)
- Should we build tech first or validate manually?
- What's your availability for meetings next 2 weeks?

---

## Slide 11: Immediate Decisions Needed (10 min)

### Decision #1: MVP Scope
**Question:** What's the minimum to test with 1 hospital?
- [ ] Full platform (4-6 weeks)
- [ ] Basic shift posting + WhatsApp alerts (1-2 weeks)
- [ ] Pure manual (WhatsApp + phone + spreadsheet) (this week)

### Decision #2: First Target Segment
**Question:** Which segment do we approach first?
- [ ] Large hospitals (high volume, slow decisions)
- [ ] Small clinics (faster decisions, lower volume)
- [ ] Diagnostic chains (seasonal peaks, need technicians)
- [ ] Ayurvedic centers (untapped market, no competition)

### Decision #3: Cofounder Roles
**Question:** Who owns what?
- [ ] **Gagan:** Tech + Operations + Accelerators + Fundraising
- [ ] **Arpana:** Medical strategy + Hospital sales + Professional onboarding + Medical credibility
- [ ] **Both:** Strategy + Key decisions + Hospital relationship building

### How Arpana's Medical Background Helps
- **Hospital Trust:** Doctors trust doctors — Arpana's credentials open doors
- **Medical Accuracy:** Ensures platform speaks the right language (departments, certifications, shift types)
- **Professional Recruitment:** Can recruit doctors/nurses from her network
- **Clinical Validation:** Validates what actually matters vs what's nice-to-have
- **Regulatory Guidance:** Understands medical licensing, hospital admin, compliance

**Question for Arpana:** What hospitals/clinics do you have connections with for warm intros?

### Decision #4: Timeline
**Question:** When do we want first paid shift?
- [ ] This month (aggressive — manual matching)
- [ ] Next month (realistic — basic tech)
- [ ] 3 months (conservative — full platform)

---

## Slide 12: Closing & Next Steps (5 min)

### Meeting Output
- [ ] Decisions documented
- [ ] Action items assigned with owners
- [ ] Next meeting scheduled
- [ ] Immediate tasks for this week

### Resources
- Competitive analysis: `medibrick/jobizo-competitive-analysis.md`
- Sales battlecard: `medibrick/jobizo-sales-battlecard.md`
- Outreach templates: `medibrick/outreach-templates-jobizo.md`
- Launch checklist: `medibrick/launch-checklist.md`

### Next Meeting
**Date:** [To be decided]
**Agenda:** Review hospital feedback, revise MVP, accelerator updates

---

## Appendix: Quick Reference

### Key Metrics to Track
- Shifts posted per week
- Applications per shift
- Fill rate (%)
- Time-to-fill (hours)
- Show rate (%)
- Payment speed (hours)
- Review scores (both sides)
- Repeat usage rate

### Competitor Monitoring
- Jobizo feature changes
- New entrants in healthcare staffing
- Hospital partnership announcements
- Funding news in healthcare staffing

### Contact Strategy
- Day 0: Initial outreach (email + LinkedIn)
- Day 3: Follow-up #1 (WhatsApp)
- Day 7: Follow-up #2 (email with case study)
- Day 14: Final follow-up (phone call)
- Day 30: Nurture (monthly newsletter)

---

*Meeting prepared by: Star (Medibrick AI Assistant)*
*Date: 2026-06-01*
