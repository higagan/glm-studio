#!/usr/bin/env python3
"""
Naukri Job Apply - Apply to 10 jobs now
Uses Playwright CDP with Chrome debug profile
"""

import asyncio
import random
from playwright.async_api import async_playwright
from datetime import datetime

GAGAN = {
    "name": "Gagan Deep",
    "email": "gagan.ping@gmail.com",
    "phone": "+917795374024",
    "location": "Bengaluru",
    "experience": "11",
    "resume_path": "/Users/gagandeep/.openclaw/workspace/resume.pdf"
}

SKIP_COMPANIES = ["Supersourcing", "Fx31labs", "Redfoxa", "Recruiting Bond", "People Impact", "Talentojcom", "Peak Hire", "HyrHub"]

log = []
def log_msg(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    line = f"[{ts}] {msg}"
    log.append(line)
    print(line, flush=True)

async def apply_to_naukri_job(page, job_card, index):
    """Apply to a single Naukri job"""
    try:
        # Click job card
        await job_card.click()
        await asyncio.sleep(random.uniform(2, 3))
        
        # Get job details
        title = await page.locator('.styles_jd-header-title__rZwM1, .jd-header-title').first.inner_text().catch(lambda: "Unknown")
        company = await page.locator('.styles_jd-header-comp-name__MvqAI, .jd-header-comp-name').first.inner_text().catch(lambda: "Unknown")
        
        log_msg(f"Job {index+1}: {title[:60]} at {company[:40]}")
        
        # Check blacklist
        if any(skip.lower() in company.lower() for skip in SKIP_COMPANIES):
            return False, "blacklisted"
        
        # Check salary
        salary_text = await page.locator('.styles_salary-range__HjG98, .salary-range').first.inner_text().catch(lambda: "")
        if salary_text:
            digits = [int(d) for d in salary_text.replace(',', '').split() if d.isdigit()]
            if digits and max(digits) < 30:
                return False, "low_salary"
        
        # Find Apply button
        apply_btn = await page.query_selector('button:has-text("Apply"), .apply-button, [data-testid="apply-button"]')
        if not apply_btn:
            # Check if already applied
            content = await page.content()
            if "applied" in content.lower():
                return False, "already_applied"
            return False, "no_apply_button"
        
        # Click Apply
        await apply_btn.click()
        log_msg("Clicked Apply")
        await asyncio.sleep(random.uniform(3, 5))
        
        # Check for success
        content = await page.content()
        if "successfully applied" in content.lower() or "application sent" in content.lower():
            log_msg(f"✅ SUCCESS: Applied to {company}")
            return True, "success"
        
        # Handle form if opened
        return await handle_naukri_form(page, company)
        
    except Exception as e:
        log_msg(f"Error: {e}")
        return False, f"error:{str(e)[:30]}"

async def handle_naukri_form(page, company):
    """Handle Naukri application form"""
    try:
        # Fill any missing fields
        # Name
        name_input = await page.query_selector('input[name="name"], input[placeholder*="Name"]')
        if name_input:
            await name_input.fill(GAGAN["name"])
        
        # Email
        email_input = await page.query_selector('input[type="email"]')
        if email_input:
            value = await email_input.input_value()
            if not value:
                await email_input.fill(GAGAN["email"])
        
        # Phone
        phone_input = await page.query_selector('input[type="tel"], input[name="mobile"]')
        if phone_input:
            value = await phone_input.input_value()
            if not value:
                await phone_input.fill(GAGAN["phone"])
        
        # Upload resume if asked
        file_input = await page.query_selector('input[type="file"]')
        if file_input:
            await file_input.set_input_files(GAGAN["resume_path"])
            await asyncio.sleep(1)
        
        # Submit
        submit_btn = await page.query_selector('button[type="submit"]:has-text("Apply"), button:has-text("Submit")')
        if submit_btn:
            await submit_btn.click()
            await asyncio.sleep(3)
            
            content = await page.content()
            if "success" in content.lower():
                log_msg(f"✅ SUCCESS: Applied to {company}")
                return True, "success"
        
        return False, "form_incomplete"
        
    except Exception as e:
        log_msg(f"Form error: {e}")
        return False, "form_error"

async def main():
    log_msg("=" * 60)
    log_msg("NAUKRI JOB APPLY - 10 Jobs")
    log_msg("=" * 60)
    
    async with async_playwright() as p:
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            context = browser.contexts[0] if browser.contexts else await browser.new_context()
            log_msg("Connected to Chrome")
        except:
            log_msg("Chrome not running - start with: ~/.openclaw/bin/chrome-debug")
            return
        
        # Find or create Naukri page
        page = None
        for pg in context.pages:
            if 'naukri.com' in pg.url:
                page = pg
                break
        
        if not page:
            page = await context.new_page()
            await page.goto("https://www.naukri.com/mnjuser/recommendedjobs")
            await asyncio.sleep(5)
        
        log_msg(f"Page: {page.url}")
        
        # Navigate to recommended jobs if not there
        if 'recommendedjobs' not in page.url:
            await page.goto("https://www.naukri.com/mnjuser/recommendedjobs")
            await asyncio.sleep(5)
        
        # Apply loop
        applied = 0
        skipped = 0
        max_jobs = 10
        
        for i in range(max_jobs + 20):  # Try extra to get 10
            if applied >= max_jobs:
                break
            
            # Get job cards
            job_cards = await page.query_selector_all('.jobTuple, .styles_job-tuple__H82J3, [data-job-id]')
            if i >= len(job_cards):
                log_msg("No more jobs found")
                break
            
            # Scroll into view
            await job_cards[i].evaluate('el => el.scrollIntoView({block: "center"})')
            await asyncio.sleep(random.uniform(1, 2))
            
            success, reason = await apply_to_naukri_job(page, job_cards[i], i)
            
            if success:
                applied += 1
                log_msg(f"Progress: {applied}/10")
            else:
                skipped += 1
                log_msg(f"Skipped: {reason}")
            
            # Delay between jobs
            if applied < max_jobs:
                delay = random.uniform(5, 10)
                log_msg(f"Waiting {delay:.1f}s...")
                await asyncio.sleep(delay)
        
        log_msg("\n" + "=" * 60)
        log_msg(f"RESULTS: {applied} applied, {skipped} skipped")
        log_msg("=" * 60)
        
        # Save log
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        with open('/Users/gagandeep/.openclaw/workspace/job-apply-log.md', 'a') as f:
            f.write(f"\n\n## Naukri Apply - {timestamp}\n")
            f.write(f"- Applied: {applied}\n")
            f.write(f"- Skipped: {skipped}\n")
            for line in log:
                f.write(f"  {line}\n")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
