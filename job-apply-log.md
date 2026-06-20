# Job Application Log — 2026-06-18

## Session 1 (Afternoon)

### Instahyre Applications

#### Applied (3/6)
1. ✅ **NTT Data** — AI Security Architect
2. ✅ **Imagine Learning** — Staff Engineer  
3. ✅ **Walmart Global Tech India** — Golang Engineer - T1 Proxy

#### Not Applied (3)
4. 🔍 **Nexthink** — Engineering Manager (disappeared from list after other applications)
5. 🔍 **The Walt Disney Company** — Sr. Product Software Engineering Manager (disappeared from list)
6. 🔍 **Alation** — Senior Software Engineer (disappeared from list)

#### Skipped (2)
- ⏭️ Wissen Technology — Java Lead Developer (Java-only, not matching stack)
- ⏭️ Wissen Technology — Lead .NET Developer (.NET, not matching stack)

#### Notes
- Instahyre is invitation-only — only matched jobs can be applied to
- Jobs disappeared from "Undecided" list after applying to others — possibly moved to "Interested" or page refreshed
- The 3 remaining matching jobs may have been auto-marked as interested when the modal opened
- Need to check "Interested" filter next time to see if those 3 are there

#### Next Steps
- Check "Interested" tab on Instahyre to see if Nexthink, Disney, Alation are there
- If yes, they may need a follow-up action (different apply flow)
- Total Instahyre matching jobs: ~6-8 at any time

---

### Cutshort Applications (First Batch — Afternoon)

#### Applied (3/6)
1. ✅ **Company 1** — Head Of Engineering (AI)
2. ✅ **Company 2** — Lead Python Developer
3. ✅ **Company 3** — Sr. Full-Stack Developer/Tech Lead

#### Not Applied (3)
- Agency-posted or non-matching positions were skipped

---

## Session 2 (Evening — ~19:20 IST)

### LinkedIn Applications

#### Applied (2/4)
1. ✅ **Cloudnaut Technologies** — Senior Backend Developer (Python, Serverless & GenAI)
2. ✅ **9NEXUS** — GenAI Engineer

#### Not Applied (2)
3. ❌ **Altysys** — GenAI & Agentic AI (No Easy Apply found in detail view)
4. ❌ **Persistent Systems** — GenAI Engineer (No Easy Apply found in detail view)

#### Notes
- Both "no Easy Apply" jobs had external application options that required navigating to company websites
- LinkedIn Easy Apply modal flow worked correctly for the 2 successful applications
- Applications went through: Click card → Click Easy Apply → Next → Next → Review → Submit

---

### Cutshort Applications (Second Batch — Evening)

#### Applied (3/5)
4. ✅ **Job 5** — Details not captured ("Message sent successfully")
5. ✅ **Job 6** — Details not captured
6. ✅ **Job 7** — Details not captured

#### Failed (2/5)
7. ❌ **Job 8** — Button not found after scrolling
8. ❌ **Job 9** — Button not found after scrolling

#### Notes
- Only 5 jobs total had "Apply now" buttons after scrolling
- 3 successfully applied, 2 failed due to dynamic loading issues
- Cutshort uses a simple modal: Click "Apply now" → Click "Send" → "Message sent successfully"

---

## Today's Totals

| Platform | Applied | Attempted | Success Rate |
|----------|---------|-----------|-------------|
| Instahyre | 3 | 6 | 50% |
| LinkedIn | 2 | 4 | 50% |
| Cutshort | 6 | 11 | 55% |
| **Total** | **11** | **21** | **52%** |

---

## Session 3 (Evening — ~19:45 IST)

### LinkedIn External Apply Investigation
- **Goal:** Extract external apply URLs for company-specific applications
- **Result:** LinkedIn "Apply on company website" buttons use complex redirect chains
- **Finding:** Buttons have aria-label "Apply to {:jobTitle} on company website" but navigation is intercepted
- **Challenge:** URLs loaded dynamically via JavaScript, not directly accessible via DOM
- **Solution needed:** Network request interception or LinkedIn API calls

### Company-Site Application Demonstration
- **Platform:** Stripe (Greenhouse ATS)
- **Proof of concept:** Successfully detected and analyzed Greenhouse form
- **Fields found:** 58 total (first name, last name, email, phone, resume upload, visa status, etc.)
- **Conclusion:** OpenClaw CAN apply on company-specific sites when navigated directly

### Dashboard Created
- **Location:** `job-dashboard/`
- **Server:** `app.py` (running on port 8765)
- **Features:** Real-time progress, platform status, application logs, final report
- **URL:** http://localhost:8765

---

## Tomorrow's Plan

1. **Instahyre** — Check "Interested" tab for Nexthink, Disney, Alation
2. **LinkedIn** — Look for company-site applications (Altysys, Persistent Systems)
3. **Naukri** — Update profile and apply to 8 more jobs
4. **Cutshort** — Continue scrolling to find more non-agency jobs

## Configuration Notes

- LinkedIn Easy Apply filter: `python genai golang backend` in India
- Chrome debug profile: `~/.openclaw/chrome-debug-profile`
- Resume: `/Users/gagandeep/.openclaw/workspace/resume.pdf`
- Daily limit: 20 total applications


## 2026-06-18 19:52 - Dashboard Run

**Applied:** 0
**Skipped:** 0
**Failed:** 0



## 2026-06-18 19:57 - Dashboard Run

**Applied:** 0
**Skipped:** 0
**Failed:** 0



## 2026-06-18 21:40 - Dashboard Run

**Applied:** 1
**Skipped:** 1
**Failed:** 1

⏭️ [linkedin] Senior Backend Developer (Python, Serverless & GenAI)
✅ [linkedin] Engineering Manager - GenAI Studios
❌ [linkedin] AI Engineer (3+ Years) – Python, ML, GenAI & Agentic AI - Immediate Joiners
- [2026-06-18 22:07] [linkedin] Freelance GenAI Engineer (Python | LLM | AI Agents) at : failed — could not complete Easy Apply flow
- [2026-06-18 22:07] [linkedin] Senior Backend Developer (Python, Serverless & GenAI) at : failed — could not complete Easy Apply flow
- [2026-06-18 22:07] [linkedin] AI Engineer (3+ Years) – Python, ML, GenAI & Agentic AI - Immediate Joiners at : failed — could not complete Easy Apply flow
- [2026-06-18 22:07] [linkedin] GenAI & Agentic AI at : failed — could not complete Easy Apply flow
- [2026-06-18 22:07] [linkedin] Python GenAI with GCP at : failed — could not complete Easy Apply flow
- [2026-06-18 22:07] [linkedin] GenAI Developer at : failed — could not complete Easy Apply flow
- [2026-06-18 22:07] [linkedin] Junior GenAI Developer at : failed — could not complete Easy Apply flow

SUMMARY: Applied=0, Skipped=0, Failed=7

## LinkedIn run 2026-06-18 22:09
- [no_easy_apply] Freelance GenAI Engineer (Python | LLM | AI Agents)
- [no_easy_apply] Senior Backend Developer (Python, Serverless & GenAI)
- [no_easy_apply] AI Engineer (3+ Years) – Python, ML, GenAI & Agentic AI - Immediate Joiners
- [no_easy_apply] GenAI & Agentic AI
- Summary: Applied 0/4, Uncertain 0, Skipped 4

## LinkedIn Specific Jobs — 2026-06-19 15:20

**Applied:** 0  **Skipped:** 0  **Failed:** 20

❌ [-] Lead AI Scientist / Engineer @ SecPod — failed (11.8s)
   Application flow did not complete
❌ [-] Senior Agentic AI Engineer @ Interactly.ai — failed (14.8s)
   Application flow did not complete
❌ [-] Agentic AI Engineer @ Tata Consultancy Services — failed (10.8s)
   Application flow did not complete
❌ [-] GenAI / Agentic AI Engineer @ Persistent Systems — failed (16.8s)
   Application flow did not complete
❌ [-] AI Systems Engineer (Agentic Development) @ Soar — failed (14.8s)
   Application flow did not complete
❌ [-] Gen AI – Manager @ PwC Acceleration Center India — failed (20.9s)
   Application flow did not complete
❌ [-] Lead AI Engineer @ Figr — failed (10.8s)
   Application flow did not complete
❌ [-] Generative AI Engineer @ Accion Labs — failed (14.9s)
   Application flow did not complete
❌ [-] Applied AI Engineer @ HackerRank — failed (10.8s)
   Application flow did not complete
❌ [-] Applied AI Engineer @ Cognite — failed (12.9s)
   Application flow did not complete
❌ [-] Senior Development Manager – AI Engineering @ PepsiCo — failed (10.8s)
   Application flow did not complete
❌ [-] AES – Generative AI @ Zensar Technologies — failed (16.8s)
   Application flow did not complete
❌ [-] GEN AI Engineer @ Johnson Electric — failed (14.9s)
   Application flow did not complete
❌ [-] AI Engineer @ PepsiCo — failed (15.8s)
   Application flow did not complete
❌ [-] AI / ML Engineer @ Accenture in India — failed (10.8s)
   Application flow did not complete
❌ [-] Generative AI Engineer @ Recro — failed (15.9s)
   Application flow did not complete
❌ [-] AI Engineer @ Ecolab — failed (14.9s)
   Application flow did not complete
❌ [-] AI Engineer II @ RealPage India — failed (10.8s)
   Application flow did not complete
❌ [-] AI Engineer @ Clinisys — failed (14.9s)
   Application flow did not complete
❌ [-] AI Engineer @ Blumetra Solutions — failed (14.8s)
   Application flow did not complete

## LinkedIn Specific Jobs — 2026-06-19 15:29

**Applied:** 0  **Skipped:** 0  **Failed:** 20

❌ [-] Lead AI Scientist / Engineer @ SecPod — failed (1.0s)
   no close frame received or sent
❌ [-] Senior Agentic AI Engineer @ Interactly.ai — failed (0.0s)
   no close frame received or sent
❌ [-] Agentic AI Engineer @ Tata Consultancy Services — failed (0.0s)
   no close frame received or sent
❌ [-] GenAI / Agentic AI Engineer @ Persistent Systems — failed (0.0s)
   no close frame received or sent
❌ [-] AI Systems Engineer (Agentic Development) @ Soar — failed (0.0s)
   no close frame received or sent
❌ [-] Gen AI – Manager @ PwC Acceleration Center India — failed (0.0s)
   no close frame received or sent
❌ [-] Lead AI Engineer @ Figr — failed (0.0s)
   no close frame received or sent
❌ [-] Generative AI Engineer @ Accion Labs — failed (0.0s)
   no close frame received or sent
❌ [-] Applied AI Engineer @ HackerRank — failed (0.0s)
   no close frame received or sent
❌ [-] Applied AI Engineer @ Cognite — failed (0.0s)
   no close frame received or sent
❌ [-] Senior Development Manager – AI Engineering @ PepsiCo — failed (0.0s)
   no close frame received or sent
❌ [-] AES – Generative AI @ Zensar Technologies — failed (0.0s)
   no close frame received or sent
❌ [-] GEN AI Engineer @ Johnson Electric — failed (0.0s)
   no close frame received or sent
❌ [-] AI Engineer @ PepsiCo — failed (0.0s)
   no close frame received or sent
❌ [-] AI / ML Engineer @ Accenture in India — failed (0.0s)
   no close frame received or sent
❌ [-] Generative AI Engineer @ Recro — failed (0.0s)
   no close frame received or sent
❌ [-] AI Engineer @ Ecolab — failed (0.0s)
   no close frame received or sent
❌ [-] AI Engineer II @ RealPage India — failed (0.0s)
   no close frame received or sent
❌ [-] AI Engineer @ Clinisys — failed (0.0s)
   no close frame received or sent
❌ [-] AI Engineer @ Blumetra Solutions — failed (0.0s)
   no close frame received or sent

## LinkedIn Specific Jobs — 2026-06-19 15:30

**Applied:** 0  **Skipped:** 0  **Failed:** 20

❌ [-] Lead AI Scientist / Engineer @ SecPod — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] Senior Agentic AI Engineer @ Interactly.ai — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] Agentic AI Engineer @ Tata Consultancy Services — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] GenAI / Agentic AI Engineer @ Persistent Systems — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] AI Systems Engineer (Agentic Development) @ Soar — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] Gen AI – Manager @ PwC Acceleration Center India — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] Lead AI Engineer @ Figr — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] Generative AI Engineer @ Accion Labs — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] Applied AI Engineer @ HackerRank — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] Applied AI Engineer @ Cognite — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] Senior Development Manager – AI Engineering @ PepsiCo — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] AES – Generative AI @ Zensar Technologies — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] GEN AI Engineer @ Johnson Electric — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] AI Engineer @ PepsiCo — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] AI / ML Engineer @ Accenture in India — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] Generative AI Engineer @ Recro — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] AI Engineer @ Ecolab — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] AI Engineer II @ RealPage India — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] AI Engineer @ Clinisys — failed (0.0s)
   name 'eval_js' is not defined
❌ [-] AI Engineer @ Blumetra Solutions — failed (0.0s)
   name 'eval_js' is not defined

## LinkedIn Specific Jobs — 2026-06-19 15:34

**Applied:** 0  **Skipped:** 13  **Failed:** 7

❌ [-] Lead AI Scientist / Engineer @ SecPod — failed (23.9s)
   Application flow did not complete
⏭️ [-] Senior Agentic AI Engineer @ Interactly.ai — skipped (0s)
   No Easy Apply button
❌ [-] Agentic AI Engineer @ Tata Consultancy Services — failed (21.2s)
   Application flow did not complete
⏭️ [-] GenAI / Agentic AI Engineer @ Persistent Systems — skipped (0s)
   No Easy Apply button
⏭️ [-] AI Systems Engineer (Agentic Development) @ Soar — skipped (0s)
   No Easy Apply button
⏭️ [-] Gen AI – Manager @ PwC Acceleration Center India — skipped (0s)
   No Easy Apply button
⏭️ [-] Lead AI Engineer @ Figr — skipped (0s)
   No Easy Apply button
❌ [-] Generative AI Engineer @ Accion Labs — failed (6.0s)
   no close frame received or sent
❌ [-] Applied AI Engineer @ HackerRank — failed (6.0s)
   no close frame received or sent
⏭️ [-] Applied AI Engineer @ Cognite — skipped (0s)
   No Easy Apply button
⏭️ [-] Senior Development Manager – AI Engineering @ PepsiCo — skipped (0s)
   No Easy Apply button
⏭️ [-] AES – Generative AI @ Zensar Technologies — skipped (0s)
   No Easy Apply button
❌ [-] GEN AI Engineer @ Johnson Electric — failed (6.2s)
   no close frame received or sent
⏭️ [-] AI Engineer @ PepsiCo — skipped (0s)
   No Easy Apply button
⏭️ [-] AI / ML Engineer @ Accenture in India — skipped (0s)
   No Easy Apply button
❌ [-] Generative AI Engineer @ Recro — failed (1.0s)
   no close frame received or sent
⏭️ [-] AI Engineer @ Ecolab — skipped (0s)
   No Easy Apply button
⏭️ [-] AI Engineer II @ RealPage India — skipped (0s)
   No Easy Apply button
❌ [-] AI Engineer @ Clinisys — failed (6.5s)
   no close frame received or sent
⏭️ [-] AI Engineer @ Blumetra Solutions — skipped (0s)
   No Easy Apply button

## LinkedIn Specific Jobs — 2026-06-19 15:37

**Applied:** 0  **Skipped:** 20  **Failed:** 0

⏭️ [-] Lead AI Scientist / Engineer @ SecPod — skipped (0s)
   No Easy Apply button
⏭️ [-] Senior Agentic AI Engineer @ Interactly.ai — skipped (0s)
   No Easy Apply button
⏭️ [-] Agentic AI Engineer @ Tata Consultancy Services — skipped (0s)
   No Easy Apply button
⏭️ [-] GenAI / Agentic AI Engineer @ Persistent Systems — skipped (0s)
   No Easy Apply button
⏭️ [-] AI Systems Engineer (Agentic Development) @ Soar — skipped (0s)
   No Easy Apply button
⏭️ [-] Gen AI – Manager @ PwC Acceleration Center India — skipped (0s)
   No Easy Apply button
⏭️ [-] Lead AI Engineer @ Figr — skipped (0s)
   No Easy Apply button
⏭️ [-] Generative AI Engineer @ Accion Labs — skipped (0s)
   No Easy Apply button
⏭️ [-] Applied AI Engineer @ HackerRank — skipped (0s)
   No Easy Apply button
⏭️ [-] Applied AI Engineer @ Cognite — skipped (0s)
   No Easy Apply button
⏭️ [-] Senior Development Manager – AI Engineering @ PepsiCo — skipped (0s)
   No Easy Apply button
⏭️ [-] AES – Generative AI @ Zensar Technologies — skipped (0s)
   No Easy Apply button
⏭️ [-] GEN AI Engineer @ Johnson Electric — skipped (0s)
   No Easy Apply button
⏭️ [-] AI Engineer @ PepsiCo — skipped (0s)
   No Easy Apply button
⏭️ [-] AI / ML Engineer @ Accenture in India — skipped (0s)
   No Easy Apply button
⏭️ [-] Generative AI Engineer @ Recro — skipped (0s)
   No Easy Apply button
⏭️ [-] AI Engineer @ Ecolab — skipped (0s)
   No Easy Apply button
⏭️ [-] AI Engineer II @ RealPage India — skipped (0s)
   No Easy Apply button
⏭️ [-] AI Engineer @ Clinisys — skipped (0s)
   No Easy Apply button
⏭️ [-] AI Engineer @ Blumetra Solutions — skipped (0s)
   No Easy Apply button

## LinkedIn Specific Jobs — 2026-06-19 15:38

**Applied:** 0  **Skipped:** 0  **Failed:** 20

❌ [-] Lead AI Scientist / Engineer @ SecPod — failed (1.8s)
   Page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "https://www.linkedin.com/jobs/view/4429010932", waiting until "load"

❌ [-] Senior Agentic AI Engineer @ Interactly.ai — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] Agentic AI Engineer @ Tata Consultancy Services — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] GenAI / Agentic AI Engineer @ Persistent Systems — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] AI Systems Engineer (Agentic Development) @ Soar — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] Gen AI – Manager @ PwC Acceleration Center India — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] Lead AI Engineer @ Figr — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] Generative AI Engineer @ Accion Labs — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] Applied AI Engineer @ HackerRank — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] Applied AI Engineer @ Cognite — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] Senior Development Manager – AI Engineering @ PepsiCo — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] AES – Generative AI @ Zensar Technologies — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] GEN AI Engineer @ Johnson Electric — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] AI Engineer @ PepsiCo — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] AI / ML Engineer @ Accenture in India — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] Generative AI Engineer @ Recro — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] AI Engineer @ Ecolab — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] AI Engineer II @ RealPage India — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] AI Engineer @ Clinisys — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] AI Engineer @ Blumetra Solutions — failed (0.0s)
   Page.goto: Target page, context or browser has been closed

## LinkedIn Specific Jobs — 2026-06-19 15:46

**Applied:** 2  **Skipped:** 0  **Failed:** 18

❌ [-] Lead AI Scientist / Engineer @ SecPod — failed (46.0s)
   Application flow did not complete
❌ [-] Senior Agentic AI Engineer @ Interactly.ai — failed (38.8s)
   Application flow did not complete
❌ [-] Agentic AI Engineer @ Tata Consultancy Services — failed (43.5s)
   Application flow did not complete
❌ [-] GenAI / Agentic AI Engineer @ Persistent Systems — failed (42.4s)
   Application flow did not complete
❌ [-] AI Systems Engineer (Agentic Development) @ Soar — failed (41.1s)
   Application flow did not complete
❌ [-] Gen AI – Manager @ PwC Acceleration Center India — failed (40.0s)
   Application flow did not complete
❌ [-] Lead AI Engineer @ Figr — failed (42.3s)
   Application flow did not complete
✅ [-] Generative AI Engineer @ Accion Labs — applied (42.8s)
   Application submitted
❌ [-] Applied AI Engineer @ HackerRank — failed (41.7s)
   Application flow did not complete
❌ [-] Applied AI Engineer @ Cognite — failed (42.3s)
   Application flow did not complete
❌ [-] Senior Development Manager – AI Engineering @ PepsiCo — failed (43.1s)
   Application flow did not complete
❌ [-] AES – Generative AI @ Zensar Technologies — failed (42.3s)
   Application flow did not complete
✅ [-] GEN AI Engineer @ Johnson Electric — applied (48.6s)
   Application submitted
❌ [-] AI Engineer @ PepsiCo — failed (38.9s)
   Application flow did not complete
❌ [-] AI / ML Engineer @ Accenture in India — failed (15.7s)
   Target page, context or browser has been closed
❌ [-] Generative AI Engineer @ Recro — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] AI Engineer @ Ecolab — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] AI Engineer II @ RealPage India — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] AI Engineer @ Clinisys — failed (0.0s)
   Page.goto: Target page, context or browser has been closed
❌ [-] AI Engineer @ Blumetra Solutions — failed (0.0s)
   Page.goto: Target page, context or browser has been closed

## LinkedIn Specific Jobs — 2026-06-19 15:52

**Applied:** 0  **Skipped:** 3  **Failed:** 17

⏭️ [-] Lead AI Scientist / Engineer @ SecPod — skipped (0s)
   Custom questions require manual answer: ['How Soon you can join us in days?', 'Current Salary Per annum in INR?']
❌ [-] Senior Agentic AI Engineer @ Interactly.ai — failed (41.4s)
   Application flow did not complete
⏭️ [-] Agentic AI Engineer @ Tata Consultancy Services — skipped (0s)
   Custom questions require manual answer: ['What are your total years of experience?', 'What is your Notice Period (in days)?']
❌ [-] GenAI / Agentic AI Engineer @ Persistent Systems — failed (42.2s)
   Application flow did not complete
❌ [-] AI Systems Engineer (Agentic Development) @ Soar — failed (42.6s)
   Application flow did not complete
❌ [-] Gen AI – Manager @ PwC Acceleration Center India — failed (41.4s)
   Application flow did not complete
❌ [-] Lead AI Engineer @ Figr — failed (40.7s)
   Application flow did not complete
❌ [-] Generative AI Engineer @ Accion Labs — failed (41.8s)
   Application flow did not complete
❌ [-] Applied AI Engineer @ HackerRank — failed (41.3s)
   Application flow did not complete
❌ [-] Applied AI Engineer @ Cognite — failed (45.7s)
   Application flow did not complete
❌ [-] Senior Development Manager – AI Engineering @ PepsiCo — failed (23.2s)
   Locator.is_visible: Target page, context or browser has been closed
❌ [-] AES – Generative AI @ Zensar Technologies — failed (50.8s)
   Application flow did not complete
❌ [-] GEN AI Engineer @ Johnson Electric — failed (42.0s)
   Application flow did not complete
❌ [-] AI Engineer @ PepsiCo — failed (42.1s)
   Application flow did not complete
❌ [-] AI / ML Engineer @ Accenture in India — failed (41.1s)
   Application flow did not complete
⏭️ [-] Generative AI Engineer @ Recro — skipped (0s)
   Custom questions require manual answer: ['Total years of experience Gen AI?', 'What is your CTC?']
❌ [-] AI Engineer @ Ecolab — failed (41.0s)
   Application flow did not complete
❌ [-] AI Engineer II @ RealPage India — failed (42.0s)
   Application flow did not complete
❌ [-] AI Engineer @ Clinisys — failed (41.5s)
   Application flow did not complete
❌ [-] AI Engineer @ Blumetra Solutions — failed (6.1s)
   Target page, context or browser has been closed

## LinkedIn Specific Jobs — 2026-06-19 15:53

**Applied:** 0  **Skipped:** 0  **Failed:** 20

❌ [-] Lead AI Scientist / Engineer @ SecPod — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] Senior Agentic AI Engineer @ Interactly.ai — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] Agentic AI Engineer @ Tata Consultancy Services — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] GenAI / Agentic AI Engineer @ Persistent Systems — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] AI Systems Engineer (Agentic Development) @ Soar — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] Gen AI – Manager @ PwC Acceleration Center India — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] Lead AI Engineer @ Figr — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] Generative AI Engineer @ Accion Labs — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] Applied AI Engineer @ HackerRank — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] Applied AI Engineer @ Cognite — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] Senior Development Manager – AI Engineering @ PepsiCo — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] AES – Generative AI @ Zensar Technologies — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] GEN AI Engineer @ Johnson Electric — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] AI Engineer @ PepsiCo — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] AI / ML Engineer @ Accenture in India — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] Generative AI Engineer @ Recro — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] AI Engineer @ Ecolab — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] AI Engineer II @ RealPage India — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] AI Engineer @ Clinisys — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?
❌ [-] AI Engineer @ Blumetra Solutions — failed (0.0s)
   Event loop is closed! Is Playwright already stopped?

## LinkedIn Specific Jobs — 2026-06-19 15:55

**Applied:** 0  **Skipped:** 4  **Failed:** 16

⏭️ [-] Lead AI Scientist / Engineer @ SecPod — skipped (0s)
   Custom questions require manual answer: ['Current Salary Per annum in INR?']
❌ [-] Senior Agentic AI Engineer @ Interactly.ai — failed (43.0s)
   Application flow did not complete
⏭️ [-] Agentic AI Engineer @ Tata Consultancy Services — skipped (0s)
   Custom questions require manual answer: ['What is your Current CTC?']
❌ [-] GenAI / Agentic AI Engineer @ Persistent Systems — failed (40.6s)
   Application flow did not complete
❌ [-] AI Systems Engineer (Agentic Development) @ Soar — failed (43.0s)
   Application flow did not complete
❌ [-] Gen AI – Manager @ PwC Acceleration Center India — failed (49.6s)
   Application flow did not complete
❌ [-] Lead AI Engineer @ Figr — failed (35.0s)
   Locator.inner_text: Target page, context or browser has been closed
❌ [-] Generative AI Engineer @ Accion Labs — failed (42.9s)
   Application flow did not complete
❌ [-] Applied AI Engineer @ HackerRank — failed (42.0s)
   Application flow did not complete
❌ [-] Applied AI Engineer @ Cognite — failed (42.5s)
   Application flow did not complete
❌ [-] Senior Development Manager – AI Engineering @ PepsiCo — failed (41.2s)
   Application flow did not complete
❌ [-] AES – Generative AI @ Zensar Technologies — failed (57.2s)
   Application flow did not complete
❌ [-] GEN AI Engineer @ Johnson Electric — failed (42.1s)
   Application flow did not complete
❌ [-] AI Engineer @ PepsiCo — failed (46.0s)
   Application flow did not complete
❌ [-] AI / ML Engineer @ Accenture in India — failed (36.9s)
   Page.wait_for_timeout: Target page, context or browser has been closed
⏭️ [-] Generative AI Engineer @ Recro — skipped (0s)
   Custom questions require manual answer: ['What is your CTC?']
❌ [-] AI Engineer @ Ecolab — failed (40.6s)
   Application flow did not complete
❌ [-] AI Engineer II @ RealPage India — failed (34.1s)
   Application flow did not complete
❌ [-] AI Engineer @ Clinisys — failed (33.7s)
   Application flow did not complete
⏭️ [-] AI Engineer @ Blumetra Solutions — skipped (0s)
   Custom questions require manual answer: ['Please enter your current ctc in INR']

## LinkedIn Specific Jobs — 2026-06-19 15:56

**Applied:** 0  **Skipped:** 0  **Failed:** 20

❌ [-] Lead AI Scientist / Engineer @ SecPod — failed (48.7s)
   Application flow did not complete
❌ [-] Senior Agentic AI Engineer @ Interactly.ai — failed (42.3s)
   Application flow did not complete
❌ [-] Agentic AI Engineer @ Tata Consultancy Services — failed (54.0s)
   Application flow did not complete
❌ [-] GenAI / Agentic AI Engineer @ Persistent Systems — failed (47.9s)
   Application flow did not complete
❌ [-] AI Systems Engineer (Agentic Development) @ Soar — failed (32.2s)
   Locator.inner_text: Target page, context or browser has been closed
❌ [-] Gen AI – Manager @ PwC Acceleration Center India — failed (41.1s)
   Application flow did not complete
❌ [-] Lead AI Engineer @ Figr — failed (43.2s)
   Application flow did not complete
❌ [-] Generative AI Engineer @ Accion Labs — failed (43.4s)
   Application flow did not complete
❌ [-] Applied AI Engineer @ HackerRank — failed (44.7s)
   Application flow did not complete
❌ [-] Applied AI Engineer @ Cognite — failed (40.9s)
   Application flow did not complete
❌ [-] Senior Development Manager – AI Engineering @ PepsiCo — failed (42.9s)
   Application flow did not complete
❌ [-] AES – Generative AI @ Zensar Technologies — failed (46.9s)
   Application flow did not complete
❌ [-] GEN AI Engineer @ Johnson Electric — failed (41.7s)
   Application flow did not complete
❌ [-] AI Engineer @ PepsiCo — failed (6.3s)
   Target page, context or browser has been closed
❌ [-] AI / ML Engineer @ Accenture in India — failed (47.4s)
   Application flow did not complete
❌ [-] Generative AI Engineer @ Recro — failed (36.8s)
   Application flow did not complete
❌ [-] AI Engineer @ Ecolab — failed (33.5s)
   Application flow did not complete
❌ [-] AI Engineer II @ RealPage India — failed (32.5s)
   Application flow did not complete
❌ [-] AI Engineer @ Clinisys — failed (33.3s)
   Application flow did not complete
❌ [-] AI Engineer @ Blumetra Solutions — failed (54.7s)
   Application flow did not complete

## LinkedIn Specific Jobs — 2026-06-19 15:58

**Applied:** 0  **Skipped:** 1  **Failed:** 19

❌ [-] Lead AI Scientist / Engineer @ SecPod — failed (47.2s)
   Application flow did not complete
❌ [-] Senior Agentic AI Engineer @ Interactly.ai — failed (44.1s)
   Application flow did not complete
❌ [-] Agentic AI Engineer @ Tata Consultancy Services — failed (34.2s)
   Page.wait_for_timeout: Target page, context or browser has been closed
❌ [-] GenAI / Agentic AI Engineer @ Persistent Systems — failed (46.1s)
   Application flow did not complete
❌ [-] AI Systems Engineer (Agentic Development) @ Soar — failed (47.9s)
   Application flow did not complete
❌ [-] Gen AI – Manager @ PwC Acceleration Center India — failed (51.8s)
   Application flow did not complete
❌ [-] Lead AI Engineer @ Figr — failed (42.5s)
   Application flow did not complete
❌ [-] Generative AI Engineer @ Accion Labs — failed (63.3s)
   Application flow did not complete
❌ [-] Applied AI Engineer @ HackerRank — failed (43.7s)
   Application flow did not complete
❌ [-] Applied AI Engineer @ Cognite — failed (41.2s)
   Application flow did not complete
❌ [-] Senior Development Manager – AI Engineering @ PepsiCo — failed (23.6s)
   Locator.is_visible: Target page, context or browser has been closed
❌ [-] AES – Generative AI @ Zensar Technologies — failed (41.5s)
   Application flow did not complete
❌ [-] GEN AI Engineer @ Johnson Electric — failed (35.9s)
   Application flow did not complete
❌ [-] AI Engineer @ PepsiCo — failed (43.2s)
   Application flow did not complete
❌ [-] AI / ML Engineer @ Accenture in India — failed (32.3s)
   Application flow did not complete
⏭️ [-] Generative AI Engineer @ Recro — skipped (0s)
   Custom questions require manual answer: ['what is your ctc?']
❌ [-] AI Engineer @ Ecolab — failed (33.0s)
   Application flow did not complete
❌ [-] AI Engineer II @ RealPage India — failed (32.5s)
   Application flow did not complete
❌ [-] AI Engineer @ Clinisys — failed (1.6s)
   Target page, context or browser has been closed
❌ [-] AI Engineer @ Blumetra Solutions — failed (60.6s)
   Application flow did not complete

## LinkedIn Specific Jobs — 2026-06-19 15:59

**Applied:** 0  **Skipped:** 1  **Failed:** 19

❌ [-] Lead AI Scientist / Engineer @ SecPod — failed (50.4s)
   Application flow did not complete
❌ [-] Senior Agentic AI Engineer @ Interactly.ai — failed (93.2s)
   Application flow did not complete
❌ [-] Agentic AI Engineer @ Tata Consultancy Services — failed (73.9s)
   Locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for get_by_role("button", name="Next").first
    - locator resolved to <button type="button" aria-label="Next" data-testid="carousel-inli
❌ [-] GenAI / Agentic AI Engineer @ Persistent Systems — failed (82.9s)
   Application flow did not complete
❌ [-] AI Systems Engineer (Agentic Development) @ Soar — failed (50.2s)
   Locator.click: Target page, context or browser has been closed
Call log:
  - waiting for get_by_role("button", name="Next").first

❌ [-] Gen AI – Manager @ PwC Acceleration Center India — failed (60.5s)
   Application flow did not complete
⏭️ [-] Lead AI Engineer @ Figr — skipped (0s)
   No Easy Apply button
❌ [-] Generative AI Engineer @ Accion Labs — failed (83.7s)
   Application flow did not complete
❌ [-] Applied AI Engineer @ HackerRank — failed (77.6s)
   Application flow did not complete
❌ [-] Applied AI Engineer @ Cognite — failed (73.5s)
   Application flow did not complete
❌ [-] Senior Development Manager – AI Engineering @ PepsiCo — failed (60.7s)
   Application flow did not complete
❌ [-] AES – Generative AI @ Zensar Technologies — failed (12.7s)
   Target page, context or browser has been closed
❌ [-] GEN AI Engineer @ Johnson Electric — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] AI Engineer @ PepsiCo — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] AI / ML Engineer @ Accenture in India — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] Generative AI Engineer @ Recro — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] AI Engineer @ Ecolab — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] AI Engineer II @ RealPage India — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] AI Engineer @ Clinisys — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] AI Engineer @ Blumetra Solutions — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed

## LinkedIn Specific Jobs — 2026-06-19 15:59

**Applied:** 1  **Skipped:** 2  **Failed:** 17

❌ [-] Lead AI Scientist / Engineer @ SecPod — failed (90.2s)
   Page.goto: Timeout 90000ms exceeded.
Call log:
  - navigating to "https://www.linkedin.com/jobs/search/?keywords=Lead%20AI%20Scientist%20/%20Engineer%20SecPod&f_AL=true&origin=JOB_SEARCH_PAGE_JOB_FILT
❌ [-] Senior Agentic AI Engineer @ Interactly.ai — failed (25.6s)
   Page.goto: Target page, context or browser has been closed
Call log:
  - navigating to "https://www.linkedin.com/jobs/search/?keywords=Senior%20Agentic%20AI%20Engineer%20Interactly.ai&f_AL=true&origin
✅ [-] Agentic AI Engineer @ Tata Consultancy Services — applied (63.8s)
   Application submitted
❌ [-] GenAI / Agentic AI Engineer @ Persistent Systems — failed (90.1s)
   Page.goto: Timeout 90000ms exceeded.
Call log:
  - navigating to "https://www.linkedin.com/jobs/search/?keywords=GenAI%20/%20Agentic%20AI%20Engineer%20Persistent%20Systems&f_AL=true&origin=JOB_SEARCH_
⏭️ [-] AI Systems Engineer (Agentic Development) @ Soar — skipped (0s)
   Job not found in search results
⏭️ [-] Gen AI – Manager @ PwC Acceleration Center India — skipped (0s)
   Job not found in search results
❌ [-] Lead AI Engineer @ Figr — failed (90.1s)
   Page.goto: Timeout 90000ms exceeded.
Call log:
  - navigating to "https://www.linkedin.com/jobs/search/?keywords=Lead%20AI%20Engineer%20Figr&f_AL=true&origin=JOB_SEARCH_PAGE_JOB_FILTER", waiting until
❌ [-] Generative AI Engineer @ Accion Labs — failed (69.4s)
   Target page, context or browser has been closed
❌ [-] Applied AI Engineer @ HackerRank — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] Applied AI Engineer @ Cognite — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] Senior Development Manager – AI Engineering @ PepsiCo — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] AES – Generative AI @ Zensar Technologies — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] GEN AI Engineer @ Johnson Electric — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] AI Engineer @ PepsiCo — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] AI / ML Engineer @ Accenture in India — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] Generative AI Engineer @ Recro — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] AI Engineer @ Ecolab — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] AI Engineer II @ RealPage India — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] AI Engineer @ Clinisys — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
❌ [-] AI Engineer @ Blumetra Solutions — failed (0.0s)
   BrowserContext.new_page: Target page, context or browser has been closed
