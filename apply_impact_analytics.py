#!/usr/bin/env python3
"""Apply to the Impact Analytics Keka job directly using Playwright."""
import time, sys
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

JOB_URL = 'https://impactanalytics.keka.com/careers/jobdetails/75704'
RESUME_PATH = Path('/Users/gagandeep/.openclaw/workspace/resume.pdf')
CDP_URL = 'http://localhost:9222'

PROFILE = {
    'firstName': 'Gagan',
    'lastName': 'Deep',
    'email': 'gagan.ping@gmail.com',
    'phone': '+917795374024',
    'location': 'Bengaluru, Karnataka, India',
    'linkedin': 'https://www.linkedin.com/in/higagan',
    'github': 'https://github.com/gagandeep',
    'noticeDays': '30',
    'currentSalary': '42',
    'expectedSalary': '45',
    'experienceYears': '11',
}


def log(msg, kind='info'):
    pfx = {'success':'✅ ', 'error':'❌ ', 'warn':'⚠️ ', 'info':''}[kind]
    print(f"{pfx}{msg}")
    sys.stdout.flush()


def find_linkedin_context(browser):
    for ctx in browser.contexts:
        for page in ctx.pages:
            if 'linkedin.com' in page.url or page.url == 'chrome://new-tab-page/':
                return ctx
    # Fallback: first context with any page
    for ctx in browser.contexts:
        if ctx.pages:
            return ctx
    return None


def apply_impact_analytics(browser):
    ctx = find_linkedin_context(browser)
    if not ctx:
        log("No browser context found", 'error')
        return False

    page = ctx.new_page()
    log(f"Opening {JOB_URL}")

    try:
        page.goto(JOB_URL, timeout=60000, wait_until='domcontentloaded')
        time.sleep(4)
        log(f"Loaded: {page.url}")
        log(f"Title: {page.title()}")

        # Look for Apply button
        apply_btn = None
        for sel in [
            'button:has-text("Apply")',
            'a:has-text("Apply")',
            '[role="button"]:has-text("Apply")',
            'button:has-text("Apply Now")',
            'button:has-text("Submit Application")',
        ]:
            try:
                btn = page.locator(sel).first
                if btn.is_visible(timeout=2000):
                    apply_btn = btn
                    log(f"Found apply button: {sel}")
                    break
            except Exception:
                continue

        if not apply_btn:
            # Try generic: any button near the word Apply
            all_btns = page.locator('button, a, [role="button"]').all()
            for btn in all_btns:
                try:
                    txt = btn.inner_text(timeout=500).strip().lower()
                    if 'apply' in txt and len(txt) < 30:
                        if btn.is_visible():
                            apply_btn = btn
                            log(f"Found apply button by text: {txt}")
                            break
                except Exception:
                    continue

        if not apply_btn:
            log("No Apply button found — page may require scroll or different structure", 'error')
            # Save screenshot for debugging
            page.screenshot(path='/tmp/impactanalytics_screenshot.png')
            log("Screenshot saved to /tmp/impactanalytics_screenshot.png")
            page.close()
            return False

        apply_btn.scroll_into_view_if_needed(timeout=3000)
        time.sleep(1)
        apply_btn.click()
        time.sleep(3)
        log("Clicked Apply")

        # Form handling
        filled_any = False

        # Fill text inputs
        inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"], textarea').all()
        log(f"Found {len(inputs)} text inputs")
        for inp in inputs:
            try:
                if not inp.is_visible(timeout=500):
                    continue
                # Get field identifier
                name = (inp.get_attribute('name') or '').lower()
                id_attr = (inp.get_attribute('id') or '').lower()
                aria = (inp.get_attribute('aria-label') or '').lower()
                ph = (inp.get_attribute('placeholder') or '').lower()
                label = ''
                try:
                    # Try preceding label
                    label = inp.locator('xpath=preceding::label[1]').inner_text(timeout=500).strip().lower()
                except Exception:
                    pass
                combined = f"{name} {id_attr} {aria} {ph} {label}"
                val = inp.input_value().strip()
                if val:
                    continue

                if any(k in combined for k in ['first name', 'firstname', 'first_name']):
                    inp.fill(PROFILE['firstName'])
                    filled_any = True
                    log(f"Filled first name: {PROFILE['firstName']}")
                elif any(k in combined for k in ['last name', 'lastname', 'last_name', 'surname']):
                    inp.fill(PROFILE['lastName'])
                    filled_any = True
                    log(f"Filled last name: {PROFILE['lastName']}")
                elif any(k in combined for k in ['email', 'e-mail']):
                    inp.fill(PROFILE['email'])
                    filled_any = True
                    log(f"Filled email: {PROFILE['email']}")
                elif any(k in combined for k in ['phone', 'mobile', 'contact']):
                    inp.fill(PROFILE['phone'])
                    filled_any = True
                    log(f"Filled phone: {PROFILE['phone']}")
                elif any(k in combined for k in ['location', 'city', 'address']):
                    inp.fill(PROFILE['location'])
                    filled_any = True
                    log(f"Filled location: {PROFILE['location']}")
                elif any(k in combined for k in ['linkedin', 'linked in']):
                    inp.fill(PROFILE['linkedin'])
                    filled_any = True
                    log(f"Filled LinkedIn: {PROFILE['linkedin']}")
                elif any(k in combined for k in ['github', 'git hub']):
                    inp.fill(PROFILE['github'])
                    filled_any = True
                    log(f"Filled GitHub: {PROFILE['github']}")
                elif any(k in combined for k in ['notice', 'join', 'days']):
                    inp.fill(PROFILE['noticeDays'])
                    filled_any = True
                    log(f"Filled notice: {PROFILE['noticeDays']}")
                elif any(k in combined for k in ['expected salary', 'expected ctc']):
                    inp.fill(PROFILE['expectedSalary'])
                    filled_any = True
                    log(f"Filled expected salary: {PROFILE['expectedSalary']}")
                elif any(k in combined for k in ['current salary', 'current ctc']):
                    inp.fill(PROFILE['currentSalary'])
                    filled_any = True
                    log(f"Filled current salary: {PROFILE['currentSalary']}")
                elif any(k in combined for k in ['experience', 'years']):
                    inp.fill(PROFILE['experienceYears'])
                    filled_any = True
                    log(f"Filled experience: {PROFILE['experienceYears']}")
                else:
                    log(f"Unknown field: {combined[:60]}", 'warn')
            except Exception as e:
                log(f"Input error: {e}", 'warn')

        # Handle selects
        selects = page.locator('select').all()
        log(f"Found {len(selects)} selects")
        for sel in selects:
            try:
                if not sel.is_visible(timeout=500):
                    continue
                label = ''
                try:
                    label = sel.locator('xpath=preceding::label[1]').inner_text(timeout=500).strip().lower()
                except Exception:
                    pass
                name = (sel.get_attribute('name') or '').lower()
                combined = f"{label} {name}"
                if any(k in combined for k in ['notice', 'join', 'period']):
                    try:
                        sel.select_option('30 Days' if '30' in PROFILE['noticeDays'] else 'Immediate')
                        filled_any = True
                        log("Selected notice period")
                    except Exception:
                        pass
                elif any(k in combined for k in ['experience', 'years']):
                    try:
                        sel.select_option('10+ years')
                        filled_any = True
                        log("Selected experience")
                    except Exception:
                        pass
            except Exception as e:
                log(f"Select error: {e}", 'warn')

        # File upload
        file_inputs = page.locator('input[type="file"]').all()
        log(f"Found {len(file_inputs)} file inputs")
        for finp in file_inputs:
            try:
                if not finp.is_visible(timeout=500):
                    continue
                label = ''
                try:
                    label = finp.locator('xpath=ancestor::div[2]').inner_text(timeout=500).lower()
                except Exception:
                    pass
                if 'resume' in label or 'cv' in label or 'attachment' in label:
                    if RESUME_PATH.exists():
                        finp.set_input_files(str(RESUME_PATH))
                        filled_any = True
                        log(f"Uploaded resume: {RESUME_PATH.name}")
            except Exception as e:
                log(f"Upload error: {e}", 'warn')

        # Check for checkbox/radio
        checkboxes = page.locator('input[type="checkbox"]').all()
        for cb in checkboxes:
            try:
                if not cb.is_visible(timeout=500):
                    continue
                label = ''
                try:
                    label = cb.locator('xpath=following::label[1]').inner_text(timeout=500).strip().lower()
                except Exception:
                    pass
                if 'agree' in label or 'terms' in label or 'privacy' in label:
                    if not cb.is_checked():
                        cb.check()
                        filled_any = True
                        log("Checked terms checkbox")
            except Exception:
                pass

        # Try to submit
        submit_found = False
        for sel in [
            'button[type="submit"]',
            'button:has-text("Submit")',
            'button:has-text("Apply")',
            'button:has-text("Send")',
            'input[type="submit"]',
        ]:
            try:
                btn = page.locator(sel).first
                if btn.is_visible(timeout=2000):
                    btn.scroll_into_view_if_needed(timeout=3000)
                    time.sleep(1)
                    btn.click()
                    time.sleep(4)
                    submit_found = True
                    log("Clicked submit", 'success')
                    break
            except Exception:
                continue

        if not submit_found:
            log("Submit button not found or not clickable", 'error')
            page.screenshot(path='/tmp/impactanalytics_form.png')
            log("Screenshot saved to /tmp/impactanalytics_form.png")
            page.close()
            return False

        # Check confirmation
        body_text = page.locator('body').inner_text().lower()
        if any(k in body_text for k in ['thank you', 'application submitted', 'success', 'received', 'we have received']):
            log("Application submitted successfully!", 'success')
            page.close()
            return True
        else:
            log("Unclear if submitted — check manually", 'warn')
            page.screenshot(path='/tmp/impactanalytics_after_submit.png')
            page.close()
            return False

    except Exception as e:
        log(f"Fatal error: {e}", 'error')
        try:
            page.screenshot(path='/tmp/impactanalytics_error.png')
        except Exception:
            pass
        try:
            page.close()
        except Exception:
            pass
        return False


def main():
    log("=" * 50)
    log("IMPACT ANALYTICS KEKA APPLICATION")
    log("=" * 50)

    with sync_playwright() as p:
        try:
            browser = p.chromium.connect_over_cdp(CDP_URL)
        except Exception as e:
            log(f"Cannot connect to Chrome on {CDP_URL}: {e}", 'error')
            return

        apply_impact_analytics(browser)


if __name__ == '__main__':
    main()
