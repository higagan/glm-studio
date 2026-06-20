import asyncio
import time
import random
import json
from datetime import datetime
from playwright.async_api import async_playwright

GAGAN_INFO = {
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

SKIP_COMPANIES = [
    "Recruiting Bond", "People Impact", "Talentojcom", "Peak Hire",
    "HyrHub", "Fx31labs", "Redfoxa", "Supersourcing"
]

log_entries = []

async def log_entry(entry):
    timestamp = datetime.now().strftime('%H:%M:%S')
    line = f"[{timestamp}] {entry}"
    log_entries.append(line)
    print(line, flush=True)

async def take_screenshot(page, name):
    try:
        await page.screenshot(path=f'/Users/gagandeep/.openclaw/workspace/screenshots/{name}.png')
    except:
        pass

async def find_jobs_on_page(page):
    """Extract job listings from current LinkedIn page"""
    jobs = []
    try:
        # Try to get job cards
        cards = await page.query_selector_all('.jobs-search-results__list-item, [data-job-id]')
        
        for card in cards:
            try:
                # Extract job info
                title_elem = await card.query_selector('.job-card-list__title, [data-test-job-card-title]')
                title = await title_elem.inner_text() if title_elem else "Unknown"
                
                company_elem = await card.query_selector('.job-card-container__company-name, [data-test-job-card-company-name]')
                company = await company_elem.inner_text() if company_elem else "Unknown"
                
                location_elem = await card.query_selector('.job-card-container__metadata-item, [data-test-job-card-location]')
                location = await location_elem.inner_text() if location_elem else "Unknown"
                
                # Check for Easy Apply
                has_easy_apply = await card.query_selector('.job-card-container__apply-method') is not None
                
                jobs.append({
                    'title': title.strip(),
                    'company': company.strip(),
                    'location': location.strip(),
                    'has_easy_apply': has_easy_apply,
                    'element': card
                })
            except:
                continue
    except Exception as e:
        await log_entry(f"Error finding jobs: {e}")
    
    return jobs

async def apply_to_job_with_retry(page, job, max_retries=2):
    """Try to apply to a single job with human-like delays"""
    company = job['company']
    title = job['title']
    
    # Skip blacklisted companies
    if any(skip.lower() in company.lower() for skip in SKIP_COMPANIES):
        await log_entry(f"⏭️ Skipping (blacklisted): {company} - {title}")
        return False, "blacklisted"
    
    for attempt in range(max_retries):
        try:
            # Click on job card
            await job['element'].click()
            await asyncio.sleep(random.uniform(2, 4))
            
            # Check if Easy Apply is available
            if not job['has_easy_apply']:
                await log_entry(f"No Easy Apply for: {title} at {company}")
                return False, "no_easy_apply"
            
            # Look for Easy Apply button in detail view
            easy_apply = await page.wait_for_selector('button:has-text("Easy Apply")', timeout=5000)
            if not easy_apply:
                await log_entry(f"Easy Apply button not found: {title}")
                return False, "button_not_found"
            
            # Click Easy Apply
            await easy_apply.click()
            await asyncio.sleep(random.uniform(2, 4))
            
            # Multi-step form handling
            steps = 0
            while steps < 8:
                steps += 1
                await asyncio.sleep(random.uniform(1, 3))
                
                # Check for success
                page_text = await page.content()
                if "application was submitted" in page_text.lower() or "successfully applied" in page_text.lower():
                    await log_entry(f"✅ SUCCESS: Applied to {title} at {company}")
                    
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
                if "recaptcha" in page_text.lower() or "captcha" in page_text.lower():
                    await log_entry(f"⚠️ CAPTCHA detected for {title} - skipping")
                    return False, "captcha"
                
                # Upload resume if needed
                try:
                    file_input = await page.query_selector('input[type="file"]')
                    if file_input:
                        await file_input.set_input_files(GAGAN_INFO["resume_path"])
                        await asyncio.sleep(1)
                except:
                    pass
                
                # Fill email if needed
                try:
                    email_input = await page.query_selector('input[type="email"]')
                    if email_input:
                        await email_input.fill(GAGAN_INFO["email"])
                except:
                    pass
                
                # Fill phone if needed
                try:
                    phone_input = await page.query_selector('input[type="tel"]')
                    if phone_input:
                        await phone_input.fill(GAGAN_INFO["phone"])
                except:
                    pass
                
                # Try clicking Next/Review/Submit
                action_taken = False
                for btn_text in ["Submit application", "Review", "Next", "Continue"]:
                    try:
                        buttons = await page.query_selector_all('button')
                        for btn in buttons:
                            text = await btn.inner_text()
                            if btn_text.lower() in text.lower():
                                disabled = await btn.evaluate('el => el.disabled')
                                if not disabled:
                                    await btn.click()
                                    await log_entry(f"Clicked: {btn_text}")
                                    action_taken = True
                                    await asyncio.sleep(random.uniform(2, 4))
                                    break
                        if action_taken:
                            break
                    except:
                        continue
                
                if not action_taken:
                    break
            
            return False, "incomplete_form"
            
        except Exception as e:
            await log_entry(f"Attempt {attempt+1} failed for {title}: {e}")
            await asyncio.sleep(3)
    
    return False, "max_retries"

async def main():
    await log_entry("=" * 60)
    await log_entry("LINKEDIN BOT - Retry with Random Delays")
    await log_entry("=" * 60)
    
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://localhost:9222")
        context = browser.contexts[0] if browser.contexts else await browser.new_context()
        
        # Find LinkedIn jobs tab or create new
        page = None
        for pg in context.pages:
            if 'linkedin.com/jobs' in pg.url:
                page = pg
                break
        
        if not page:
            page = await context.new_page()
        
        # Navigate to Easy Apply search
        search_url = "https://www.linkedin.com/jobs/search/?f_AL=true&keywords=python%20genai%20golang%20backend&location=India"
        await page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(5)
        
        await log_entry("Loaded LinkedIn Easy Apply search")
        
        # Scroll to load more jobs
        for _ in range(3):
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            await asyncio.sleep(2)
        
        # Find all jobs
        jobs = await find_jobs_on_page(page)
        await log_entry(f"Found {len(jobs)} jobs on page")
        
        applied_count = 0
        skipped_count = 0
        
        for i, job in enumerate(jobs):
            if applied_count >= 15:
                break
            
            await log_entry(f"\n--- Job {i+1}/{len(jobs)} ---")
            await log_entry(f"{job['title']} at {job['company']} ({job['location']})")
            
            success, reason = await apply_to_job_with_retry(page, job)
            
            if success:
                applied_count += 1
                await log_entry(f"Progress: {applied_count}/15 Easy Apply done")
            else:
                skipped_count += 1
                await log_entry(f"Skipped ({reason}): {job['title']}")
            
            # Human-like delay between jobs
            if applied_count < 15:
                delay = random.uniform(150, 240)
                await log_entry(f"Waiting {delay:.0f}s before next job...")
                await asyncio.sleep(delay)
        
        await log_entry("\n" + "=" * 60)
        await log_entry(f"Easy Apply Complete: {applied_count} applied, {skipped_count} skipped")
        
        await browser.close()
        
        return {"applied": applied_count, "skipped": skipped_count}

if __name__ == "__main__":
    result = asyncio.run(main())
    print("\n" + json.dumps(result, indent=2))
