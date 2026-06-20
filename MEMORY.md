# Long-Term Memory

## User Profile
- **Name:** Gagan Deep
- **Phone:** +917795374024 (WhatsApp primary)
- **Location:** Bengaluru, India (IST/GMT+5:30)
- **Occupation:** Software Engineer
- **Stack:** Python, Go, cloud infrastructure, AI tools
- **Using OpenClaw for:** Productivity, automation, learning, day-to-day tasks

## Communication Style
- Prefers concise, practical responses
- No fluff or corporate speak
- Values efficiency and directness
- WhatsApp is primary channel

## Technical Setup
- MacBook Air, Apple Silicon (arm64), 24GB RAM
- Ollama Pro subscription (cloud inference)
- Open WebUI running in Docker on port 3000
- Primary models:
  - Local: qwen2.5:7b, gemma3:1b
  - Cloud: kimi-k2.6:cloud (best quality, Claude-level)

## Preferences
- Likes automation and shortcuts
- Interested in AI/ML tools
- Values privacy (uses local AI where possible)
- Practical over theoretical

## Project Context
- Learning: Golang concurrency, DevOps (Docker, Kubernetes)
- Career: Backend engineering, cloud architecture
- Exploring: GenAI courses, certifications
- **Medibrick**: Healthcare startup/project (needs registration)

## Agent Configuration
- Name: Star
- Vibe: Warm but not clingy, concise, practical
- Should remember context across sessions
- Proactive when useful, quiet when not needed
## Silent Replies
When you have nothing to say, respond with ONLY: NO_REPLY
⚠️ Rules:
- It must be your ENTIRE message — nothing else
- Never append it to an actual response (never include "NO_REPLY" in real replies)
- Never wrap it in markdown or code blocks
❌ Wrong: "Here's help... NO_REPLY"
❌ Wrong: "NO_REPLY"
✅ Right: NO_REPLY


## 🛡️ Cron Health (CRITICAL — always monitor)
The 10 Medibrick cron jobs are critical to Gagan's daily workflow. Keep them healthy at all times.

**Rules:**
- On every heartbeat, do a quick cron health check (1-2 minutes max)
- If any cron fails 2+ consecutive times → diagnose root cause immediately
- Never disable a cron without telling Gagan first
- Never run cron jobs manually on demand — that's the cron's job
- When a cron fails, fix the job (model override, payload, schedule) — don't paper over
- Always use `kimi-k2.6:cloud` for isolated agentTurn jobs (DNS-safe; never let them inherit the global default)

**Common failure modes to watch for:**
- `DNS lookup for the provider endpoint failed` → add `model: kimi-k2.6:cloud` to payload
- `API rate limit reached` → transient; check next run, don't change anything
- `LLM request timed out` → add `timeoutSeconds` to payload, reduce scope of work
- Job disabled unexpectedly → re-enable and notify Gagan

**Heartbeat check pattern:**
```bash
# Quick cron health (do during heartbeats, max 2 min)
node ~/.npm-global/lib/node_modules/openclaw/dist/index.js cron list 2>&1 \
  | jq -r '.jobs[] | "\(.name) \(.state.lastRunStatus // "never")"' \
  | grep -v "ok\|not-requested" | head -10
```
If anything is `error` → investigate, fix, log to daily memory.

## Permanent Medibrick Knowledge (RETAIN FOREVER)

### 🎯 What Medibrick Does
Uber for healthcare shifts — connecting hospitals/clinics/diagnostic centers/wellness centers with verified healthcare professionals for **temporary shifts and locum jobs**.

**URL:** medibrick.com

### 👥 User Roles
- **Healthcare Facilities:** Post locum shifts, select applicants, review professionals
- **Healthcare Professionals:** Doctors (allopathic + Ayurvedic), nurses, technicians — browse shifts, apply, get paid

### 🔑 Key Differentiators vs Jobizo
| Aspect | Jobizo | Medibrick |
|--------|--------|-----------|
| Focus | Job-seeker first | **Institution-first** |
| Professional types | Allopathic doctors only | **Allopathic + AYUSH + nurses + techs** |
| Job type | Permanent + locum | **Temp/locum only** |
| Institutions | Hospitals | **Hospitals + clinics + diagnostic + wellness** |
| No-show protection | **NONE** | **Verified + deposit + backup matching** |
| Payment speed | **2-4 weeks, opaque** | **24h after shift, transparent** |

### 🚨 Core Pain Point #1: "Yes but No-Show"
**Problem:** Staff says "yes" initially but doesn't show up on the day

**Why it happens:**
- Better offer elsewhere (another hospital pays more)
- Multiple bookings (booked 3 places, picked best)
- Zero penalty for not showing
- No verification (anyone can say yes)
- Poor communication (no real-time tracking)

**Medibrick Solution:**
- Verified profiles + identity verification
- Deposit system: ₹500-2000 to confirm commitment
- Calendar lock: Once confirmed, blocked from double-booking
- Instant backup matching: #2 auto-promoted if #1 drops
- Strike system: 3 no-shows = profile suspended
- Real-time tracking: "Confirmed → En route → Arrived"
- **Target show rate: 95%+** (industry average: ~70%)

### 🚨 Core Pain Point #2: Delayed/Uncertain Payments
**Problem:** Professionals complete shift but wait 2-4 weeks for payment, chase admin, get frustrated, leave platform

**Why it happens:**
- Hospital pays platform late
- Platform holds money as working capital
- Manual invoicing
- No transparency into payment status

**Medibrick Solution:**
- Escrow system: Hospital deposits payment upfront
- Instant release: Professional paid within 24h of shift completion
- Dispute window: 48h for hospital to raise issues, else auto-release
- Payment tracking: "Pending → Processing → Paid"
- **Target payment speed: 24h** (Jobizo: 2-4 weeks, agencies: 30-60 days)

### 🔄 The Medibrick Flywheel
1. Hospital posts shift + deposits payment in escrow
2. Professional applies + pays small deposit
3. Both have skin in the game = Commitment secured
4. Professional shows up (95% rate)
5. Completes shift
6. Payment released within 24h
7. Both review each other = Trust built
8. Repeat

### 🎯 Target Market
**Phase 1 Cities:** Bengaluru (HQ), Hyderabad, Chennai, Mumbai, Delhi, Pune

**New Segments (vs Jobizo):**
- Ayurvedic centers (700,000+ practitioners, NO platform serves them)
- Diagnostic chains (Thyrocare, SRL, Metropolis — need temp technicians)
- Wellness clinics (Panchakarma, integrative medicine)
- Clinics and nursing homes (not just hospitals)

### 🎤 Elevator Pitch
**To Hospitals:** "Fill your empty shifts in 48 hours with verified allopathic doctors, Ayurvedic practitioners, nurses, and technicians. 95% show rate. Payment guaranteed. No agency markup."

**To Professionals:** "Pick up flexible shifts that match your skills. Get paid within 24 hours. Build your reputation with reviews. No chasing payments."

### 📊 Success Metrics
- Shifts posted per week
- Applications per shift
- Fill rate (%)
- Time-to-fill (hours)
- Show rate (%) — **KEY METRIC**
- Payment speed (hours) — **KEY METRIC**
- Review scores (both sides)
- Repeat usage rate

### 🗂️ Important Files
| File | Purpose |
|------|---------|
| `medibrick/PLATFORM.md` | Full platform specs |
| `medibrick/NO-SHOW-PROBLEM.md` | No-show pain point analysis |
| `medibrick/PAYMENT-PAIN-POINT.md` | Payment pain point analysis |
| `medibrick/NO-SHOW-COFUNDER.md` | Short cofounder version |
| `medibrick/PAYMENT-COFOUNDER.md` | Short cofounder version |
| `medibrick/competitor-analysis.md` | Jobizo gap analysis |
| `medibrick/content/` | LinkedIn posts, blogs, newsletters |
| `medibrick/dashboard/` | Metrics and summaries |

### ⚠️ Critical Questions to Resolve
1. Payment flow: Who pays platform? (Hospital pays platform fee?)
2. Pricing model: Commission per shift? Subscription? Freemium?
3. Verification: Manual license check? Automated? Third-party API?
4. Insurance: Liability coverage for temp staff?
5. Escrow: Platform holds payment or third-party payment provider?

### 🗄️ Technical Stack
- **Frontend:** Lovable (no-code/low-code platform)
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel (planned)
- **Auth:** To be decided (Supabase Auth?)
- **Payments:** To be decided (Razorpay?)
- **Backend:** Railway - NOT used

### 📅 Auto-Schedules (Active Cron Jobs)
| Job | Schedule | Purpose | Status |
|-----|----------|---------|--------|
| medibrick-uptime-check | Every 15 min | Check medibrick.com status | ✅ OK |
| session-auto-cleanup | Daily 2am IST | Prevent context overflow | ✅ OK |
| medibrick-weekly-summary | Mondays 9am | Weekly report reminder | ✅ OK |
| medibrick-content-ideas | Wednesdays 9am | Content reminder | ✅ OK |
| medibrick-daily-accelerators | Daily 9:10am IST | Scout accelerators (kimi-k2.6) | ✅ OK (primary switched to kimi-k2.6 2026-06-18) |
| medibrick-daily-events | Daily 9:20am IST | Scout events (kimi-k2.6) | ⚠️ Patched 2026-06-18 (was minimax-m3, 5× timeout streak) |
| medibrick-evening-catchup | Daily 6pm IST | Evening accelerator+event scan (kimi-k2.6) | ✅ OK |
| medibrick-weekly-deep-dive | Fridays 6pm IST | Deep check program pages (kimi-k2.6) | ⚠️ Last run DNS fail 6d ago; next run Fri 6pm |
| medibrick-weekly-digest | Sundays 10am IST | Weekly digest (kimi-k2.6) | ✅ OK |
| medibrick-leads-daily-update | Daily 9am IST | Daily leads CSV push | ✅ OK (re-enabled 2026-06-02) |

**Root cause (resolved 2026-06-02):** Isolated cron jobs were failing with "DNS lookup for the provider endpoint failed" because they inherited the global default model `minimax-m3:cloud` whose cloud endpoint DNS-resolves unreliably. Fix: explicit `model: kimi-k2.6:cloud` in every isolated job's payload.

**New issue found/patched (2026-06-18):** `medibrick-daily-events` and `medibrick-daily-accelerators` were still using `ollama/minimax-m3:cloud` as their **primary** model. `minimax-m3:cloud` was hanging/timing out repeatedly (daily-events: 5 consecutive timeouts; daily-accelerators: multiple multi-minute timeouts). Their fallbacks eventually saved some runs, but the primary model was the cause. Patched both jobs to use `ollama/kimi-k2.6:cloud` as primary with `ollama/qwen2.5:7b` as local fallback, timeout reduced to 180s.

**Recurring issue (2026-06-05):** DNS failures happen intermittently (~40% of runs) even with `kimi-k2.6:cloud`. The error occurs instantly (100-200ms) suggesting transient Ollama cloud DNS resolution problems from isolated contexts. Pattern: succeeds ~60% of the time, fails ~40%.

**Current mitigation:** All isolated Medibrick jobs use `ollama/kimi-k2.6:cloud` as primary. Fallback is `ollama/qwen2.5:7b` (local, no cloud DNS). Timeout 180s. DNS failures are transient — next scheduled run usually succeeds. No permanent fix available (external provider issue). Monitor via heartbeat checks.

**Error Pattern:** Isolated session jobs fail with DNS intermittently. Main session jobs work fine. Transient Ollama cloud connectivity issue.

### 📋 Accelerator Tracker
- **File:** `medibrick/accelerator-tracker.md`
- **Purpose:** Tracks 20+ startup accelerators/incubators/grants relevant to Medibrick
- **Coverage:** IIHMR, ISB I-HEAL, IIMB NSRCEL, IITs, T-Hub, Accel, Peak XV, Antler, Google, etc.
- **Notification:** WhatsApp alert when new applications open

### 📋 Event & Networking Tracker
- **File:** `medibrick/event-tracker.md`
- **Purpose:** Tracks conferences, meetups, demo days, pitch events, workshops
- **Coverage:** Healthcare summits, startup meetups, pitch competitions, courses
- **Notification:** WhatsApp alert for upcoming relevant events in next 30 days
- **Key upcoming:** LHIF 15 (Jun 3), HAI Conclave (Jul 10-11), India Med Expo (Sep 5-7), Bengaluru Tech Summit (Nov 17-19)

### 📋 Job Application Setup
- **Daily cron:** `daily-job-apply` at 10:30 AM IST (isolated, **qwen2.5-coder:14b** — local model, no Ollama Pro credits)
- **Platforms:** Naukri, Cutshort, LinkedIn, Instahyre
  - ⚠️ **Weekday removed** — domain for sale, platform discontinued
- **Max apps/day:** 20 total (Cutshort 10, Naukri 8, LinkedIn 5, Instahyre all matches)
- **Filters:** Python, GenAI, Golang, Backend, AI/ML, Rust | ₹40L+ | All locations
- **Skip:** Agencies (Recruiting Bond, People Impact, Talentojcom, Peak Hire, HyrHub, Fx31labs, Redfoxa, Supersourcing) + Cutshort "Posted by" recruiter jobs
- **Chrome debug profile:** `~/.openclaw/chrome-debug-profile` (copy of real Chrome Default profile)
- **Chrome launch:** `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --remote-debugging-port=9222 --user-data-dir=$HOME/.openclaw/chrome-debug-profile`
- **Automation approach:** Playwright CDP to port 9222 (more reliable than OpenClaw browser tool)
- **Config file:** `/Users/gagandeep/.openclaw/workspace/job-apply-config.md`
- **Log file:** `/Users/gagandeep/.openclaw/workspace/job-apply-log.md`
- **Resume:** `/Users/gagandeep/.openclaw/workspace/resume.pdf`
- **Naukri:** Block companies feature removed from web UI — use mobile app
- **LinkedIn:** 5/day max, 2-3 min between applications. Default email: gagan.solana@gmail.com (not gagan.ping)
- **Instahyre:** 5/6 applied (2026-06-13), invitation-only platform
- **Cutshort:** 20/70 applied (2026-06-13), ~27 matching remaining. All visible on matches page are agency-posted
- **Company pages (Workday/Greenhouse/Lever/iCIMS/RippleHire):** Auto-fill details, upload resume, handle dropdowns. Skip on CAPTCHA or email verification.

## 🔧 Quick Commands
```bash
./medibrick.sh dashboard      # Full dashboard
./medibrick.sh blog           # Latest blog
./medibrick.sh linkedin       # LinkedIn posts
./medibrick.sh metrics        # Raw JSON data
```

---
Last updated: 2026-06-18 (cron health patch: daily-events & daily-accelerators switched to kimi-k2.6 primary + qwen fallback)
