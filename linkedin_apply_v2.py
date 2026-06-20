import asyncio
import time
import random
import json
import os
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

async def wait_random(min_sec=120, max_sec=180):
    delay = random.uniform(min_sec, max_sec)
    await log_entry(f"Waiting {delay:.0f}s...")
    await asyncio.sleep(delay)

async def activate_linkedIn_tab(browser):
    """Find and activate the LinkedIn jobs tab"""
    context = browser.contexts[0]
    pages = context.pages
    
    for page in pages:
        if 'linkedin.com/jobs' in page.url:
            return page
    
    # If not found, create new page
    page = await context.new_page()
    return page

async def click_easy_apply_button(page, max_retries=3):
    """Try to find and click the Easy Apply button with retries"""
    for attempt in range(max_retries):
        try:
            # Try multiple selectors for Easy Apply button
            selectors = [
                'button:has-text("Easy Apply")',
                '.jobs-apply-button--top-card button',
                'button.artdeco-button--primary:has-text("Easy Apply")',
                'button[aria-label*="Easy Apply"]',
                '.jobs-details-top-card__apply-button button'
            ]
            
            for selector in selectors:
                try:
                    btn = await page.wait_for_selector(selector, timeout=3000)
                    if btn:
                        await btn.click()
                        await asyncio.sleep(2)
                        return True
                except:
                    continue
                    
            # Try finding by text content
            btns = await page.query_selector_all('button')
            for btn in btns:
                text = await btn.inner_text()
                if 'easy apply' in text.lower():
                    await btn.click()
                    await asyncio.sleep(2)
                    return True
                    
        except Exception as e:
            print(f"Easy Apply click attempt {attempt+1} failed: {e}")
            await asyncio.sleep(2)
    
    return False

async def fill_easy_apply_form(page):
    """Fill out the Easy Apply multi-step form"""
    steps = 0
    max_steps = 10
    
    while steps < max_steps:
        steps += 1
        await asyncio.sleep(1.5)
        
        # Check for resume upload
        try:
            file_input = await page.query_selector('input[type="file"]')
            if file_input:
                await file_input.set_input_files(GAGAN_INFO["resume_path"])
                await log_entry("Uploaded resume")
                await asyncio.sleep(2)
        except:
            pass
        
        # Check for contact info fields
        try:
            email_input = await page.query_selector('input[type="email"], input[name*="email"], input[id*="email"]')
            if email_input:
                await email_input.fill(GAGAN_INFO["email"])
        except:
            pass
        
        try:
            phone_input = await page.query_selector('input[type="tel"], input[name*="phone"], input[id*="phone"], input[placeholder*="phone"]')
            if phone_input:
                await phone_input.fill(GAGAN_INFO["phone"])
        except:
            pass
        
        # Try to click Next/Review/Submit buttons
        action_taken = False
        
        for btn_text in ["Submit application", "Review", "Next", "Continue", "Save"]:
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
                            await asyncio.sleep(2)
                            break
                if action_taken:
                    break
            except:
                continue
        
        # Check if application was submitted (success modal)
        try:
            success_texts = await page.query_selector_all('*')
            for elem in success_texts:
                text = await elem.inner_text()
                if any(phrase in text.lower() for phrase in ["application was submitted", "successfully applied", "your application has been"]):
                    await log_entry("✅ Application submitted successfully!")
                    try:
                        close_btn = await page.query_selector('button[aria-label="Dismiss"], button:has-text("Done"), .artdeco-modal__dismiss')
                        if close_btn:
                            await close_btn.click()
                            await asyncio.sleep(1)
                    except:
                        pass
                    return True
        except:
            pass
        
        # Check for "Apply anyway" or similar prompts
        try:
            apply_anyway = await page.query_selector('button:has-text("Apply anyway")')
            if apply_anyway:
                await apply_anyway.click()
                await asyncio.sleep(2)
        except:
            pass
        
        # Check for CAPTCHA
        try:
            captcha = await page.query_selector('iframe[src*="recaptcha"], .recaptcha, #captcha')
            if captcha:
                await log_entry("⚠️ CAPTCHA detected - skipping this application")
                return False
        except:
            pass
        
        if not action_taken:
            await log_entry("No action button found - might be stuck")
            return False
    
    await log_entry("Reached max steps in Easy Apply form")
    return False

async def apply_to_easy_apply_jobs(browser):
    """Phase 1: Apply to Easy Apply jobs"""
    await log_entry("=== PHASE 1: Easy Apply Jobs ===")
    
    page = await activate_linkedIn_tab(browser)
    
    # Navigate to LinkedIn Easy Apply search
    search_url = "https://www.linkedin.com/jobs/search/?f_AL=true&keywords=python%20genai%20golang%20backend&location=India"
    try:
        await page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
    except:
        await page.goto(search_url, timeout=60000)
    
    await asyncio.sleep(5)
    await log_entry("Navigated to LinkedIn Easy Apply search")
    
    applied = 0
    skipped = 0
    job_index = 0
    max_jobs = 40
    
    while applied < 15 and job_index < max_jobs:
        try:
            # Scroll to ensure jobs are loaded
            await page.evaluate('window.scrollTo(0, 0)')
            await asyncio.sleep(1)
            
            # Get all job cards
            job_cards = await page.query_selector_all('.jobs-search-results__list-item, [data-job-id]')
            
            if job_index >= len(job_cards):
                # Scroll to load more
                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                await asyncio.sleep(3)
                job_cards = await page.query_selector_all('.jobs-search-results__list-item, [data-job-id]')
                
                if job_index >= len(job_cards):
                    await log_entry("No more jobs found")
                    break
            
            # Click on job card to see details
            try:
                await job_cards[job_index].click()
                await asyncio.sleep(3)
            except Exception as e:
                await log_entry(f"Could not click job card {job_index}: {e}")
                job_index += 1
                continue
            
            # Get job details
            company_name = "Unknown"
            job_title = "Unknown"
            try:
                company_elem = await page.query_selector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__primary-description a')
                if company_elem:
                    company_name = await company_elem.inner_text()
                    company_name = company_name.strip()
                
                title_elem = await page.query_selector('.job-details-jobs-unified-top-card__job-title h1 a, .jobs-unified-top-card__job-title, .job-details-jobs-unified-top-card__job-title a')
                if title_elem:
                    job_title = await title_elem.inner_text()
                    job_title = job_title.strip()
            except:
                pass
            
            await log_entry(f"Job {job_index+1}: {job_title} at {company_name}")
            
            # Check skip companies
            if any(skip.lower() in company_name.lower() for skip in SKIP_COMPANIES):
                await log_entry(f"⏭️ Skipping (blacklisted): {company_name}")
                skipped += 1
                job_index += 1
                continue
            
            # Check for Easy Apply button
            has_easy_apply = False
            try:
                easy_apply_btn = await page.wait_for_selector('button:has-text("Easy Apply")', timeout=3000)
                has_easy_apply = easy_apply_btn is not None
            except:
                pass
            
            if not has_easy_apply:
                await log_entry("No Easy Apply button - skipping")
                skipped += 1
                job_index += 1
                continue
            
            # Check if already applied
            try:
                applied_text = await page.query_selector('.jobs-details-top-card__apply-error, .jobs-unified-top-card__applied-badge')
                if applied_text:
                    await log_entry("Already applied to this job - skipping")
                    skipped += 1
                    job_index += 1
                    continue
            except:
                pass
            
            # Click Easy Apply
            if await click_easy_apply_button(page):
                # Fill the form
                if await fill_easy_apply_form(page):
                    applied += 1
                    await log_entry(f"✅ Applied {applied}/15: {job_title} at {company_name}")
                else:
                    await log_entry(f"❌ Failed to complete application")
                    skipped += 1
                    
                    # Try to close any modal
                    for _ in range(3):
                        try:
                            dismiss = await page.query_selector('button[aria-label="Dismiss"], .artdeco-modal__dismiss, button:has-text("Discard")')
                            if dismiss:
                                await dismiss.click()
                                await asyncio.sleep(1)
                        except:
                            break
            else:
                await log_entry("Could not click Easy Apply button")
                skipped += 1
            
            job_index += 1
            
            # Random delay between applications
            if applied < 15:
                await wait_random(120, 180)
            
        except Exception as e:
            await log_entry(f"Error processing job: {e}")
            job_index += 1
            await asyncio.sleep(5)
    
    await log_entry(f"Phase 1 Complete: {applied} applied, {skipped} skipped")
    return applied, skipped

async def fill_external_form(page):
    """Generic form filling for external ATS"""
    try:
        await asyncio.sleep(5)
        
        # Fill name
        try:
            name_inputs = await page.query_selector_all('input[name*="name" i], input[id*="name" i], input[placeholder*="name" i]')
            for inp in name_inputs:
                input_type = await inp.get_attribute('type')
                if input_type != 'hidden':
                    await inp.fill(GAGAN_INFO["name"])
        except:
            pass
        
        # Fill first/last name separately
        try:
            first_name = await page.query_selector('input[name*="first" i], input[id*="first" i], input[placeholder*="first" i]')
            if first_name:
                await first_name.fill("Gagan")
            
            last_name = await page.query_selector('input[name*="last" i], input[id*="last" i], input[placeholder*="last" i]')
            if last_name:
                await last_name.fill("Deep")
        except:
            pass
        
        # Email
        try:
            email_input = await page.query_selector('input[type="email"], input[name*="email" i], input[id*="email" i]')
            if email_input:
                await email_input.fill(GAGAN_INFO["email"])
        except:
            pass
        
        # Phone
        try:
            phone_input = await page.query_selector('input[type="tel"], input[name*="phone" i], input[id*="phone" i], input[placeholder*="phone" i]')
            if phone_input:
                await phone_input.fill(GAGAN_INFO["phone"])
        except:
            pass
        
        # Resume upload
        try:
            file_input = await page.query_selector('input[type="file"]')
            if file_input:
                await file_input.set_input_files(GAGAN_INFO["resume_path"])
                await asyncio.sleep(3)
        except:
            pass
        
        # LinkedIn URL
        try:
            li_input = await page.query_selector('input[name*="linkedin" i], input[id*="linkedin" i], input[placeholder*="linkedin" i]')
            if li_input:
                await li_input.fill(GAGAN_INFO["linkedin"])
        except:
            pass
        
        # Website/Portfolio
        try:
            web_input = await page.query_selector('input[name*="website" i], input[id*="website" i], input[name*="portfolio" i]')
            if web_input:
                await web_input.fill(GAGAN_INFO["github"])
        except:
            pass
        
        # Location
        try:
            loc_input = await page.query_selector('input[name*="location" i], input[id*="location" i], input[placeholder*="location" i]')
            if loc_input:
                await loc_input.fill(GAGAN_INFO["location"])
        except:
            pass
        
        # Try to find and click submit
        await asyncio.sleep(2)
        
        submit_selectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Submit")',
            'button:has-text("Apply")',
            'button:has-text("Send")',
            'a:has-text("Submit")',
            '[data-test="submit"]'  # Greenhouse
        ]
        
        for selector in submit_selectors:
            try:
                submit = await page.query_selector(selector)
                if submit:
                    is_visible = await submit.is_visible()
                    if is_visible:
                        await submit.click()
                        await asyncio.sleep(3)
                        await log_entry("Submitted external form")
                        return True
            except:
                continue
        
        await log_entry("Could not find submit button")
        return False
        
    except Exception as e:
        await log_entry(f"Error in external form: {e}")
        return False

async def apply_to_company_jobs(browser):
    """Phase 2: Apply to company-specific jobs (external sites)"""
    await log_entry("=== PHASE 2: Company-Specific Jobs ===")
    
    context = browser.contexts[0]
    pages = context.pages
    page = None
    
    for p in pages:
        if 'linkedin.com/jobs' in p.url and 'f_AL' not in p.url:
            page = p
            break
    
    if not page:
        page = await context.new_page()
    
    # Navigate to regular job search (without Easy Apply filter)
    search_url = "https://www.linkedin.com/jobs/search/?keywords=python%20genai%20golang%20backend&location=India"
    try:
        await page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
    except:
        await page.goto(search_url, timeout=60000)
    
    await asyncio.sleep(5)
    await log_entry("Navigated to LinkedIn job search (no Easy Apply filter)")
    
    applied = 0
    skipped = 0
    job_index = 0
    max_jobs = 40
    
    while applied < 10 and job_index < max_jobs:
        try:
            await page.evaluate('window.scrollTo(0, 0)')
            await asyncio.sleep(1)
            
            job_cards = await page.query_selector_all('.jobs-search-results__list-item, [data-job-id]')
            
            if job_index >= len(job_cards):
                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                await asyncio.sleep(3)
                job_cards = await page.query_selector_all('.jobs-search-results__list-item, [data-job-id]')
                
                if job_index >= len(job_cards):
                    break
            
            await job_cards[job_index].click()
            await asyncio.sleep(3)
            
            # Get job details
            company_name = "Unknown"
            job_title = "Unknown"
            try:
                company_elem = await page.query_selector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__primary-description a')
                if company_elem:
                    company_name = await company_elem.inner_text()
                    company_name = company_name.strip()
                
                title_elem = await page.query_selector('.job-details-jobs-unified-top-card__job-title h1 a, .jobs-unified-top-card__job-title, .job-details-jobs-unified-top-card__job-title a')
                if title_elem:
                    job_title = await title_elem.inner_text()
                    job_title = job_title.strip()
            except:
                pass
            
            await log_entry(f"Job {job_index+1}: {job_title} at {company_name}")
            
            # Check skip companies
            if any(skip.lower() in company_name.lower() for skip in SKIP_COMPANIES):
                await log_entry(f"⏭️ Skipping (blacklisted): {company_name}")
                skipped += 1
                job_index += 1
                continue
            
            # Look for external "Apply" button (not Easy Apply)
            apply_btn = None
            try:
                # First check if it's Easy Apply - skip those (we did them in Phase 1)
                easy_apply = await page.query_selector('button:has-text("Easy Apply")')
                if easy_apply:
                    await log_entry("Easy Apply job - skipping (already handled in Phase 1)")
                    skipped += 1
                    job_index += 1
                    continue
                
                # Look for external apply button
                apply_btn = await page.wait_for_selector('button:has-text("Apply"):not(:has-text("Easy Apply"))', timeout=3000)
            except:
                pass
            
            if not apply_btn:
                # Try other selectors
                try:
                    apply_btn = await page.query_selector('.jobs-apply-button--external button, a[href*="apply"], a[href*="jobs"], .jobs-details-top-card__apply-error + button')
                except:
                    pass
            
            if not apply_btn:
                await log_entry("No external Apply button - skipping")
                skipped += 1
                job_index += 1
                continue
            
            # Click Apply - opens external site
            try:
                await apply_btn.click()
                await asyncio.sleep(5)
            except Exception as e:
                await log_entry(f"Could not click Apply: {e}")
                skipped += 1
                job_index += 1
                continue
            
            # Wait for new page/tab to open
            await asyncio.sleep(5)
            
            # Get all pages and find the new one
            all_pages = context.pages
            new_page = None
            for pg in all_pages:
                url = pg.url
                if url and 'linkedin.com' not in url and len(url) > 10 and 'doubleclick' not in url and 'demdex' not in url:
                    new_page = pg
                    break
            
            if not new_page:
                await log_entry("No external page opened - skipping")
                skipped += 1
                job_index += 1
                continue
            
            await log_entry(f"Opened external: {new_page.url[:70]}...")
            
            # Check for CAPTCHA
            try:
                captcha = await new_page.query_selector('iframe[src*="recaptcha"], .recaptcha, #captcha, text=CAPTCHA')
                if captcha:
                    await log_entry("⚠️ CAPTCHA on external site - skipping")
                    await new_page.close()
                    skipped += 1
                    job_index += 1
                    continue
            except:
                pass
            
            # Fill the external form
            if await fill_external_form(new_page):
                applied += 1
                await log_entry(f"✅ Applied {applied}/10: {job_title} at {company_name}")
            else:
                await log_entry(f"❌ Could not complete external application")
                skipped += 1
            
            # Close external tab
            try:
                if new_page:
                    await new_page.close()
            except:
                pass
            
            job_index += 1
            
            if applied < 10:
                await wait_random(120, 180)
            
        except Exception as e:
            await log_entry(f"Error in company job: {e}")
            job_index += 1
            await asyncio.sleep(5)
    
    await log_entry(f"Phase 2 Complete: {applied} applied, {skipped} skipped")
    return applied, skipped

async def save_log():
    """Save application log to file"""
    log_text = "\n".join(log_entries)
    
    # Count applications
    easy_applied = sum(1 for line in log_entries if "✅ Applied" in line and "/15" in line)
    easy_skipped = sum(1 for line in log_entries if "Phase 1 Complete" in line)
    company_applied = sum(1 for line in log_entries if "✅ Applied" in line and "/10" in line)
    company_skipped = sum(1 for line in log_entries if "Phase 2 Complete" in line)
    
    # Extract numbers from summary lines
    for line in log_entries:
        if "Phase 1 Complete" in line:
            try:
                parts = line.split(":")
                if len(parts) > 1:
                    nums = parts[1].split(",")
                    easy_applied = int(nums[0].split()[0])
                    easy_skipped = int(nums[1].split()[0])
            except:
                pass
        elif "Phase 2 Complete" in line:
            try:
                parts = line.split(":")
                if len(parts) > 1:
                    nums = parts[1].split(",")
                    company_applied = int(nums[0].split()[0])
                    company_skipped = int(nums[1].split()[0])
            except:
                pass
    
    markdown = f"""# LinkedIn Job Application Log

**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Candidate:** {GAGAN_INFO['name']} ({GAGAN_INFO['email']})

## Summary
- Easy Apply: {easy_applied} applied, {easy_skipped} skipped
- Company-specific: {company_applied} applied, {company_skipped} skipped
- **Total: {easy_applied + company_applied} applied, {easy_skipped + company_skipped} skipped**

## Detailed Log

```
{log_text}
```

---
Generated by LinkedIn Job Application Bot
"""
    
    with open('/Users/gagandeep/.openclaw/workspace/job-apply-log.md', 'w') as f:
        f.write(markdown)
    
    await log_entry("Log saved to job-apply-log.md")

async def main():
    await log_entry("=" * 60)
    await log_entry("LINKEDIN JOB APPLICATION BOT STARTED")
    await log_entry(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    await log_entry("=" * 60)
    
    async with async_playwright() as p:
        # Connect to existing Chrome
        browser = await p.chromium.connect_over_cdp("http://localhost:9222")
        
        # Phase 1: Easy Apply
        easy_applied, easy_skipped = await apply_to_easy_apply_jobs(browser)
        
        # Phase 2: Company-specific
        company_applied, company_skipped = await apply_to_company_jobs(browser)
        
        # Summary
        await log_entry("=" * 60)
        await log_entry("FINAL SUMMARY")
        await log_entry("=" * 60)
        await log_entry(f"Easy Apply: {easy_applied} applied, {easy_skipped} skipped")
        await log_entry(f"Company-specific: {company_applied} applied, {company_skipped} skipped")
        await log_entry(f"Total: {easy_applied + company_applied} applied, {easy_skipped + company_skipped} skipped")
        
        # Save log
        await save_log()
        
        # Keep browser open
        await browser.close()
    
    return {
        "easy_applied": easy_applied,
        "easy_skipped": easy_skipped,
        "company_applied": company_applied,
        "company_skipped": company_skipped
    }

if __name__ == "__main__":
    result = asyncio.run(main())
    print("\n" + "="*60)
    print("FINAL RESULT:")
    print(json.dumps(result, indent=2))
    print("="*60)
