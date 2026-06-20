#!/usr/bin/env python3
"""
LinkedIn Job Apply - Anti-Detection Version
Uses Playwright CDP with human-like behavior
"""

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

SKIP_COMPANIES = ["Recruiting Bond", "People Impact", "Talentojcom", "Peak Hire", "HyrHub", "Fx31labs", "Redfoxa", "Supersourcing"]

log = []

def log_msg(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    line = f"[{ts}] {msg}"
    log.append(line)
    print(line, flush=True)

async def human_like_delay(min_sec=1, max_sec=3):
    """Random delay to mimic human behavior"""
    await asyncio.sleep(random.uniform(min_sec, max_sec))

async def move_mouse_randomly(page):
    """Move mouse to random position"""
    try:
        await page.mouse.move(random.randint(100, 800), random.randint(200, 600))
    except:
        pass

async def apply_to_job(page, job_index, is_easy_apply=True):
    """Apply to a single job with anti-detection measures"""
    try:
        # Scroll job into view with smooth scrolling
        await page.evaluate(f'''
            () => {{
                const cards = document.querySelectorAll('.jobs-search-results__list-item, [data-job-id]');
                if (cards[{job_index}]) {{
                    cards[{job_index}].scrollIntoView({{behavior: 'smooth', block: 'center'}});
                }}
            }}
        ''')
        await human_like_delay(1, 2)
        
        # Click job card
        cards = await page.query_selector_all('.jobs-search-results__list-item, [data-job-id]')
        if job_index >= len(cards):
            return None, "no_more_jobs"
        
        await cards[job_index].click()
        await human_like_delay(2, 3)
        
        # Get job details
        title = "Unknown"
        company = "Unknown"
        try:
            title_el = await page.wait_for_selector('.job-details-jobs-unified-top-card__job-title h1 a, .job-details-jobs-unified-top-card__job-title', timeout=3000)
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
        
        # Check blacklist
        if any(skip.lower() in company.lower() for skip in SKIP_COMPANIES):
            return False, f"blacklisted:{company}"
        
        # Check salary range if visible
        try:
            salary_el = await page.query_selector('.job-details-jobs-unified-top-card__job-insight-text')
            if salary_el:
                salary_text = await salary_el.inner_text()
                # Skip if salary mentioned and below 40L
                if any(x in salary_text.lower() for x in ['₹', 'rs.', 'lpa']):
                    digits = re.findall(r'\d+', salary_text)
                    if digits and int(digits[0]) < 30:  # Below 30L skip
                        return False, f"low_salary:{salary_text}"
        except:
            pass
        
        # Find Apply button (not Save)
        if is_easy_apply:
            # Look for Easy Apply
            apply_btn = await page.query_selector('button:has-text("Easy Apply"), button[aria-label*="Easy Apply"], .jobs-apply-button--top')
        else:
            # Look for regular Apply (opens external)
            apply_btn = await page.query_selector('button:has-text("Apply"):not(:has-text("Save")), button[aria-label*="Apply"]:not([aria-label*="Save"])')
        
        if not apply_btn:
            # Check if already applied
            content = await page.content()
            if "already applied" in content.lower():
                return False, "already_applied"
            return False, "no_apply_button"
        
        # Human-like: move mouse around before clicking
        await move_mouse_randomly(page)
        await human_like_delay(0.5, 1.5)
        
        # Click Apply
        await apply_btn.click()
        log_msg("Clicked Apply button")
        await human_like_delay(2, 4)

        # Check if it's Easy Apply modal or external site
        content = await page.content()
        
        if "jobs-easy-apply-modal" in content or "artdeco-modal" in content:
            # Easy Apply modal - fill form
            return await handle_easy_apply_modal(page, title, company)
        else:
            # External site opened
            log_msg(f"External site opened for {company}")
            # For now, log and skip (would need separate handling)
            return False, "external_site"
        
    except Exception as e:
        log_msg(f"Error applying: {e}")
        return False, f"error:{str(e)[:50]}"

async def handle_easy_apply_modal(page, title, company):
    """Handle the Easy Apply multi-step form"""
    for step in range(10):  # Max 10 steps
        await human_like_delay(1.5, 3)
        
        # Check for success
        content = await page.content()
        if "application was submitted" in content.lower() or "successfully applied" in content.lower():
            log_msg(f"✅ SUCCESS: Applied to {title} at {company}")
            # Close modal
            try:
                dismiss = await page.query_selector('button[aria-label="Dismiss"], .artdeco-modal__dismiss, button:has-text("Done")')
                if dismiss:
                    await dismiss.click()
                    await human_like_delay(1, 2)
            except:
                pass
            return True, "success"
        
        # Check for error
        if "there was an error" in content.lower():
            log_msg("❌ Error submitting application")
            return False, "submit_error"
        
        # Check for CAPTCHA
        if "recaptcha" in content.lower() or "captcha" in content.lower():
            log_msg("⚠️ CAPTCHA detected - stopping to avoid account lock")
            return False, "captcha"
        
        # Fill fields
        try:
            # Resume upload
            file_input = await page.query_selector('input[type="file"]')
            if file_input:
                await file_input.set_input_files(GAGAN["resume_path"])
                await human_like_delay(1, 2)
                log_msg("Uploaded resume")
        except:
            pass
        
        try:
            # Email
            email_input = await page.query_selector('input[type="email"]')
            if email_input:
                value = await email_input.input_value()
                if not value:
                    await email_input.click()
                    await human_like_delay(0.5, 1)
                    await email_input.fill(GAGAN["email"])
                    log_msg("Filled email")
        except:
            pass
        
        try:
            # Phone
            phone_input = await page.query_selector('input[type="tel"], input[name*="phone"], input[id*="phone"]')
            if phone_input:
                value = await phone_input.input_value()
                if not value:
                    await phone_input.click()
                    await human_like_delay(0.5, 1)
                    await phone_input.fill(GAGAN["phone"])
                    log_msg("Filled phone")
        except:
            pass
        
        try:
            # Text inputs (name, etc.)
            text_inputs = await page.query_selector_all('input[type="text"]')
            for inp in text_inputs:
                placeholder = await inp.get_attribute('placeholder') or ""
                name_attr = await inp.get_attribute('name') or ""
                if 'name' in placeholder.lower() or 'name' in name_attr.lower():
                    value = await inp.input_value()
                    if not value:
                        await inp.click()
                        await human_like_delay(0.5, 1)
                        await inp.fill(GAGAN["name"])
                        log_msg("Filled name")
        except:
            pass
        
        # Find next/submit button
        buttons = await page.query_selector_all('button')
        action_clicked = False
        for btn in buttons:
            try:
                text = await btn.inner_text()
                disabled = await btn.evaluate('el => el.disabled || el.getAttribute("aria-disabled") === "true"')
                if not disabled and any(t in text.lower() for t in ["submit application", "review", "next", "continue"]):
                    await btn.click()
                    log_msg(f"Clicked: {text.strip()}")
                    action_clicked = True
                    await human_like_delay(2, 4)
                    break
            except:
                continue
        
        if not action_clicked:
            log_msg("No action button found - may be stuck")
            break
    
    return False, "incomplete"

async def main():
    log_msg("=" * 60)
    log_msg("LINKEDIN JOB APPLY - Anti-Detection")
    log_msg("=" * 60)
    
    async with async_playwright() as p:
        # Connect to existing Chrome
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            context = browser.contexts[0] if browser.contexts else await browser.new_context()
            log_msg("Connected to Chrome on port 9222")
        except Exception as e:
            log_msg(f"Failed to connect to Chrome: {e}")
            log_msg("Please run: ~/.openclaw/bin/chrome-debug")
            return
        
        # Get or create LinkedIn page
        page = None
        for pg in context.pages:
            if 'linkedin.com' in pg.url:
                page = pg
                break
        
        if not page:
            page = await context.new_page()
            log_msg("Created new page")
        
        # Navigate to Easy Apply search
        search_url = "https://www.linkedin.com/jobs/search/?f_AL=true&keywords=python%20genai%20golang%20backend&location=India"
        await page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
        await human_like_delay(3, 5)
        
        log_msg(f"Loaded: {page.url}")
        
        # Check if logged in
        content = await page.content()
        if "login" in content.lower() and "password" in content.lower():
            log_msg("❌ Not logged in to LinkedIn!")
            return
        
        log_msg("✅ Logged in confirmed")
        
        # Apply loop
        applied = 0
        skipped = 0
        job_index = 0
        max_easy_apply = 15
        max_total = 25
        
        while applied < max_easy_apply and job_index < max_total:
            # Scroll to load more if needed
            if job_index > 0 and job_index % 5 == 0:
                await page.evaluate('window.scrollBy(0, 500)')
                await human_like_delay(2, 3)
            
            # Random mouse movement
            await move_mouse_randomly(page)
            
            success, reason = await apply_to_job(page, job_index, is_easy_apply=True)
            
            if success is None:
                log_msg("No more jobs found")
                break
            elif success:
                applied += 1
                log_msg(f"Progress: {applied}/{max_easy_apply} Easy Apply complete")
            else:
                skipped += 1
                log_msg(f"Skipped: {reason}")
                if reason == "captcha":
                    log_msg("⚠️ CAPTCHA hit - stopping to protect account")
                    break
            
            job_index += 1
            
            # Variable delay between jobs (10-30 seconds)
            if applied < max_easy_apply:
                delay = random.uniform(10, 30)
                log_msg(f"Waiting {delay:.1f}s before next job...")
                await asyncio.sleep(delay)
        
        log_msg("\n" + "=" * 60)
        log_msg(f"RESULTS: {applied} applied, {skipped} skipped")
        log_msg("=" * 60)
        
        # Save log
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"\n\n## LinkedIn Apply - {timestamp}\n"
        log_entry += f"- Easy Apply Applied: {applied}\n"
        log_entry += f"- Skipped: {skipped}\n"
        log_entry += "- Log:\n"
        for line in log:
            log_entry += f"  {line}\n"
        
        with open('/Users/gagandeep/.openclaw/workspace/job-apply-log.md', 'a') as f:
            f.write(log_entry)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
