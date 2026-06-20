import asyncio
import random
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

log = []

def log_msg(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    line = f"[{ts}] {msg}"
    log.append(line)
    print(line, flush=True)

async def apply_single_job(page, job_index):
    """Apply to one job using browser automation with anti-detection"""
    try:
        # Get job cards fresh each time
        cards = await page.query_selector_all('.jobs-search-results__list-item, [data-job-id]')
        if job_index >= len(cards):
            return None, "no_more_jobs"
        
        # Scroll to card
        await cards[job_index].evaluate('el => { el.scrollIntoView({block: "center"}); }')
        await asyncio.sleep(random.uniform(1, 2))
        
        # Click job card
        await cards[job_index].click()
        await asyncio.sleep(random.uniform(2, 3))
        
        # Get job info
        title = "Unknown"
        company = "Unknown"
        try:
            title_el = await page.wait_for_selector('.job-details-jobs-unified-top-card__job-title', timeout=2000)
            if title_el:
                title = await title_el.inner_text()
                title = title.strip()
        except:
            pass
        
        try:
            company_el = await page.query_selector('.job-details-jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__primary-description a')
            if company_el:
                company = await company_el.inner_text()
                company = company.strip()
        except:
            pass
        
        log_msg(f"Job {job_index+1}: {title} at {company}")
        
        # Skip blacklisted
        skip_list = ["Recruiting Bond", "People Impact", "Talentojcom", "Peak Hire", "HyrHub", "Fx31labs", "Redfoxa", "Supersourcing"]
        if any(s.lower() in company.lower() for s in skip_list):
            return False, f"blacklisted:{company}"
        
        # Check for Easy Apply
        easy_btn = await page.query_selector('button:has-text("Easy Apply")')
        if not easy_btn:
            return False, "no_easy_apply"
        
        # Check if already applied
        page_text = await page.content()
        if "already applied" in page_text.lower():
            return False, "already_applied"
        
        # Human-like: Move mouse around before clicking
        await page.mouse.move(random.randint(100, 500), random.randint(200, 600))
        await asyncio.sleep(random.uniform(0.5, 1.5))
        
        # Click Easy Apply
        await easy_btn.click()
        await asyncio.sleep(random.uniform(2, 4))
        
        # Handle multi-step form
        for step in range(8):
            await asyncio.sleep(random.uniform(1.5, 3))
            
            # Check for success
            content = await page.content()
            if "application was submitted" in content.lower() or "successfully applied" in content.lower():
                log_msg(f"✅ SUCCESS: Applied to {title} at {company}")
                
                # Close success modal
                try:
                    dismiss = await page.query_selector('button[aria-label="Dismiss"], .artdeco-modal__dismiss, button:has-text("Done")')
                    if dismiss:
                        await dismiss.click()
                        await asyncio.sleep(1)
                except:
                    pass
                return True, "success"
            
            # Check for CAPTCHA
            if "recaptcha" in content.lower():
                log_msg("⚠️ CAPTCHA detected - backing off")
                # Close modal and wait longer
                try:
                    dismiss = await page.query_selector('button[aria-label="Dismiss"]')
                    if dismiss:
                        await dismiss.click()
                except:
                    pass
                await asyncio.sleep(60)  # Wait 1 minute
                return False, "captcha"
            
            # Fill fields if present
            try:
                # Resume
                file_input = await page.query_selector('input[type="file"]')
                if file_input:
                    await file_input.set_input_files(GAGAN["resume_path"])
                    await asyncio.sleep(1)
            except:
                pass
            
            try:
                email = await page.query_selector('input[type="email"]')
                if email and not await email.input_value():
                    await email.fill(GAGAN["email"])
            except:
                pass
            
            try:
                phone = await page.query_selector('input[type="tel"]')
                if phone and not await phone.input_value():
                    await phone.fill(GAGAN["phone"])
            except:
                pass
            
            # Find and click action button
            buttons = await page.query_selector_all('button')
            clicked = False
            for btn in buttons:
                try:
                    text = await btn.inner_text()
                    disabled = await btn.evaluate('el => el.disabled')
                    if not disabled and any(t in text.lower() for t in ["submit application", "review", "next", "continue"]):
                        await btn.click()
                        log_msg(f"Clicked: {text.strip()}")
                        clicked = True
                        await asyncio.sleep(random.uniform(2, 4))
                        break
                except:
                    continue
            
            if not clicked:
                log_msg("No action button found - form might be stuck")
                break
        
        return False, "incomplete"
        
    except Exception as e:
        log_msg(f"Error: {e}")
        return False, f"error:{str(e)}"

async def main():
    log_msg("=" * 60)
    log_msg("LINKEDIN EASY APPLY - Anti-Detection Mode")
    log_msg("=" * 60)
    
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://localhost:9222")
        context = browser.contexts[0]
        
        # Find or create LinkedIn page
        page = None
        for pg in context.pages:
            if 'linkedin.com/jobs' in pg.url:
                page = pg
                break
        
        if not page:
            page = await context.new_page()
            await page.goto("https://www.linkedin.com/jobs/search/?f_AL=true&keywords=python%20genai%20golang%20backend&location=India",
                          wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(5)
        
        log_msg(f"Connected to LinkedIn: {page.url}")
        
        applied = 0
        skipped = 0
        job_index = 0
        max_jobs = 25
        
        while applied < 15 and job_index < max_jobs:
            # Check if we need to scroll to load more
            if job_index > 0 and job_index % 5 == 0:
                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                await asyncio.sleep(3)
            
            # Random mouse movement before each action
            await page.mouse.move(random.randint(100, 800), random.randint(200, 600))
            
            success, reason = await apply_single_job(page, job_index)
            
            if success is None:
                log_msg("No more jobs available")
                break
            elif success:
                applied += 1
                log_msg(f"Progress: {applied}/15 Easy Apply complete")
            else:
                skipped += 1
                log_msg(f"Skipped ({reason})")
            
            job_index += 1
            
            # Variable delay between applications
            if applied < 15:
                delay = random.uniform(10, 20)  # 10-20 seconds
                log_msg(f"Waiting {delay:.1f}s before next job...")
                await asyncio.sleep(delay)
        
        log_msg("\n" + "=" * 60)
        log_msg(f"FINISHED: {applied} applied, {skipped} skipped")
        
        # Save log
        with open('/Users/gagandeep/.openclaw/workspace/job-apply-log.md', 'a') as f:
            f.write(f"\n\n## Run {datetime.now().strftime('%H:%M:%S')}\n")
            f.write(f"- Applied: {applied}\n")
            f.write(f"- Skipped: {skipped}\n")
            f.write("\n".join(log))
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
