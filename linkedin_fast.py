import asyncio
import random
import json
from playwright.async_api import async_playwright
from datetime import datetime

GAGAN = {
    "name": "Gagan Deep",
    "email": "gagan.ping@gmail.com",
    "phone": "+917795374024",
    "location": "Bengaluru, Karnataka, India",
    "company": "High Noon Consulting (HNCPL)",
    "title": "Tech Lead",
    "experience": "11+ years",
    "education": "B.Tech CSE, Amrita School of Engineering, Coimbatore (2012)",
    "linkedin": "https://www.linkedin.com/in/higagan",
    "github": "https://github.com/higagan",
    "resume_path": "/Users/gagandeep/.openclaw/workspace/resume.pdf"
}

log_entries = []

def log(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    line = f"[{ts}] {msg}"
    log_entries.append(line)
    print(line, flush=True)

async def try_apply_with_profile_prefill(page, max_attempts=1):
    """Try Easy Apply but stop if CAPTCHA appears"""
    for attempt in range(max_attempts):
        try:
            # Get job info
            title = "Unknown"
            company = "Unknown"
            try:
                title_el = await page.query_selector('.job-details-jobs-unified-top-card__job-title')
                if title_el:
                    title = await title_el.inner_text()
                    title = title.strip()
                
                company_el = await page.query_selector('.job-details-jobs-unified-top-card__company-name a')
                if company_el:
                    company = await company_el.inner_text()
                    company = company.strip()
            except:
                pass
            
            # Skip blacklisted
            skip_list = ["Recruiting Bond", "People Impact", "Talentojcom", "Peak Hire", 
                        "HyrHub", "Fx31labs", "Redfoxa", "Supersourcing"]
            if any(s.lower() in company.lower() for s in skip_list):
                log(f"⏭️ Skipping blacklisted: {company}")
                return False, "blacklisted"
            
            # Check Easy Apply
            easy_btn = await page.query_selector('button:has-text("Easy Apply")')
            if not easy_btn:
                return False, "no_easy_apply"
            
            # Check if already applied
            page_text = await page.content()
            if "already applied" in page_text.lower():
                return False, "already_applied"
            
            # Click Easy Apply
            await easy_btn.click()
            await asyncio.sleep(3)
            
            # Quick check for CAPTCHA
            content = await page.content()
            if "recaptcha" in content.lower() or "captcha" in content.lower():
                log("⚠️ CAPTCHA - closing modal")
                try:
                    dismiss = await page.query_selector('button[aria-label="Dismiss"]')
                    if dismiss:
                        await dismiss.click()
                except:
                    pass
                return False, "captcha"
            
            # Fill any empty fields
            try:
                email = await page.query_selector('input[type="email"]')
                if email:
                    val = await email.input_value()
                    if not val:
                        await email.fill(GAGAN["email"])
            except:
                pass
            
            try:
                phone = await page.query_selector('input[type="tel"]')
                if phone:
                    val = await phone.input_value()
                    if not val:
                        await phone.fill(GAGAN["phone"])
            except:
                pass
            
            # Try to submit
            buttons = await page.query_selector_all('button')
            for btn in buttons:
                try:
                    text = await btn.inner_text()
                    disabled = await btn.evaluate('el => el.disabled')
                    if not disabled:
                        if "submit application" in text.lower():
                            await btn.click()
                            await asyncio.sleep(3)
                            
                            # Check success
                            post_content = await page.content()
                            if "submitted" in post_content.lower() or "success" in post_content.lower():
                                log(f"✅ Applied: {title} at {company}")
                                return True, "success"
                        elif "next" in text.lower() or "continue" in text.lower():
                            await btn.click()
                            await asyncio.sleep(2)
                except:
                    continue
            
            return False, "incomplete"
            
        except Exception as e:
            log(f"Error: {e}")
            return False, f"error: {e}"
    
    return False, "failed"

async def find_more_jobs(page):
    """Scroll and find all available jobs"""
    jobs = []
    
    # Scroll to load more
    for _ in range(5):
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        await asyncio.sleep(2)
    
    # Get all job cards
    cards = await page.query_selector_all('.jobs-search-results__list-item')
    
    for i, card in enumerate(cards):
        try:
            await card.click()
            await asyncio.sleep(2)
            
            title = "Unknown"
            company = "Unknown"
            
            try:
                title_el = await page.query_selector('.job-details-jobs-unified-top-card__job-title')
                if title_el:
                    title = await title_el.inner_text()
            except:
                pass
            
            try:
                company_el = await page.query_selector('.job-details-jobs-unified-top-card__company-name a')
                if company_el:
                    company = await company_el.inner_text()
            except:
                pass
            
            has_easy = await page.query_selector('button:has-text("Easy Apply")') is not None
            
            jobs.append({
                'index': i,
                'title': title.strip(),
                'company': company.strip(),
                'has_easy_apply': has_easy_apply
            })
        except:
            pass
    
    return jobs

async def main():
    log("=" * 60)
    log("LINKEDIN - Fast Apply Attempt")
    log("=" * 60)
    
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://localhost:9222")
        context = browser.contexts[0]
        
        page = None
        for pg in context.pages:
            if 'linkedin.com/jobs' in pg.url:
                page = pg
                break
        
        if not page:
            log("LinkedIn tab not found!")
            return
        
        log(f"Using tab: {page.url[:80]}")
        
        applied = 0
        skipped = 0
        
        # Try first few jobs quickly
        for job_index in range(7):
            log(f"\n--- Job {job_index + 1} ---")
            
            # Get fresh job cards
            cards = await page.query_selector_all('.jobs-search-results__list-item')
            if job_index >= len(cards):
                log("No more jobs")
                break
            
            # Click job
            await cards[job_index].evaluate('el => el.scrollIntoView({block: "center"})')
            await asyncio.sleep(1)
            await cards[job_index].click()
            await asyncio.sleep(2)
            
            # Try apply
            success, reason = await try_apply_with_profile_prefill(page)
            
            if success:
                applied += 1
                log(f"✅ Applied {applied}/15")
            else:
                skipped += 1
                log(f"❌ {reason}")
            
            if reason == "captcha":
                log("CAPTCHA hit - stopping to protect account")
                break
            
            # Short wait
            await asyncio.sleep(5)
        
        log(f"\n{'='*60}")
        log(f"Applied: {applied}, Skipped: {skipped}")
        
        # Save results
        with open('/Users/gagandeep/.openclaw/workspace/apply_result.json', 'w') as f:
            json.dump({"applied": applied, "skipped": skipped, "log": log_entries}, f, indent=2)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
