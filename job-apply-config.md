# Job Apply Configuration

## Platforms (all logged in via Chrome debug profile on port 9222)
| Platform | URL | Status |
|----------|-----|--------|
| Naukri | https://www.naukri.com/mnjuser/homepage | ✅ Logged in (Gagan Deep) |
| Cutshort | https://cutshort.io/profile/all-jobs?matchesfor=56a5ee3ac38a97570a55d98a | ✅ Logged in |
| LinkedIn | https://www.linkedin.com/jobs/ | ✅ Logged in (Gagan Deep) |
| Weekday | https://jobs.weekday.works/applied | ✅ Logged in |
| Instahyre | https://www.instahyre.com/candidate/opportunities/?matching=true | ✅ Logged in |

## Resume
- `/Users/gagandeep/.openclaw/workspace/resume.pdf`

## Filters
- **Roles:** Python, GenAI, Golang, Backend, AI/ML, Rust
- **Locations:** All (Bengaluru, Remote, Mumbai, Pune, Hyderabad, etc.)
- **Salary:** ₹40L+ (skip anything below)
- **Max applications per day:** 25
- **Skip:** Agencies (Recruiting Bond, People Impact, Talentojcom, Peak Hire, HyrHub, Fx31labs, Redfoxa), Supersourcing

## Chrome Setup
- Chrome must be running with `--remote-debugging-port=9222 --user-data-dir=~/.openclaw/chrome-debug-profile`
- Profile is a copy of `~/Library/Application Support/Google/Chrome/Default`
- Need to re-login after Chrome restart (cookies are in the debug profile)

## Instahyre Status (2026-06-13)
- 5 of 6 matching jobs applied (FirstClub, Walmart, SpotOn, Capital One, Disney)
- Skipped: Wissen Technology (Java Lead)
- Instahyre is invitation-only — can only apply to matched jobs

## Cutshort Status (2026-06-13)
- Applied to ~18 jobs out of 70 (47 matching filter)
- Remaining: ~29 matching jobs still to apply
- API: `https://cutshort.io/findjobs/q?page=N&matchesfor=56a5ee3ac38a97570a55d98a`
- Apply flow: Click "Apply now" → Click "Send" in modal

## Naukri Notes
- Block companies feature removed from web UI
- Must use Naukri mobile app for: Profile → Settings → Privacy & Visibility → Block companies
- Need to block: Supersourcing

## LinkedIn Notes
- **Easy Apply URL**: `https://www.linkedin.com/jobs/search/?f_AL=true&keywords=python%20genai%20golang&location=India`
- **CDP selector**: `button[aria-label="Easy Apply"]` or `.jobs-apply-button--top`
- **Rate limit**: 2-3 min between applications, max 5/day
- **Bot detection**: Very aggressive — use human-like delays
- **Fallback**: If Easy Apply fails, use company page applications (Workday/Greenhouse)

## Cutshort Notes
- **Agency filter**: Skip ANY job with "Posted by" or "via" in title
- **Direct apply only**: Check for `.company-hiring` vs `.recruiter-hiring`
- **API endpoint**: `https://cutshort.io/findjobs/q?page=N&matchesfor=56a5ee3ac38a97570a55d98a`
- **Max**: 10/day

## Naukri Notes
- **Deduplicate**: Jobs appear multiple times — check title + company before applying
- **Block**: Supersourcing (via mobile app: Profile → Settings → Privacy & Visibility → Block companies)
- **Max**: 8/day

## Instahyre Notes
- **Low volume**: Only ~2-6 matching jobs at any time
- **Check daily**: Invitation-only, apply to ALL matching jobs
- **Skipped**: Java/.NET roles (not matching stack)

## Weekday
- **Status**: ❌ REMOVED — Platform discontinued (domain for sale)
- Remove from rotation

## Company-Specific Application Pages
External application sites (Workday, Greenhouse, Lever, iCIMS, etc.)

### What works
- Auto-fill name, email, phone, location from resume
- Upload resume PDF from `/Users/gagandeep/.openclaw/workspace/resume.pdf`
- Select dropdowns (experience, location preference, etc.)
- Click through multi-step forms
- Create accounts on application sites if needed (use Gmail + common password)

### Personal details for auto-fill
- **Full Name:** Gagan Deep
- **Email:** gagan.ping@gmail.com
- **Phone:** +917795374024
- **Location:** Bengaluru, Karnataka, India
- **Current Company:** High Noon Consulting (HNCPL)
- **Current Title:** Tech Lead
- **Experience:** 11+ years
- **Education:** B.Tech CSE, Amrita School of Engineering, Coimbatore (2012)
- **LinkedIn:** https://www.linkedin.com/in/higagan
- **GitHub:** https://github.com/higagan

### Known limitations
- **CAPTCHAs:** Skip jobs that require image captcha; log and move on
- **Workday forms:** Long (15+ pages) — fill carefully, expect 5-8 min per app
- **Email verification:** If site sends verification link mid-apply, log the URL and skip
- **Custom essays:** Generate concise answers from resume context
- **Account creation:** Use gagan.ping@gmail.com + consistent password

### Application flow for external sites
1. Click "Apply" on LinkedIn → opens external site
2. Detect the ATS type (Workday/Greenhouse/Lever/iCIMS/etc.)
3. Auto-fill personal details
4. Upload resume
5. Handle dropdowns and custom questions
6. If CAPTCHA hit → log and skip
7. If email verification needed → log URL, skip for now
8. Record result in job-apply-log.md