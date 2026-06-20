#!/usr/bin/env python3
"""Apply to specific LinkedIn jobs using Playwright connected to existing Chrome CDP.
Uses the already-authenticated LinkedIn page from Chrome to ensure Easy Apply is visible."""
import json, time, sys
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

JOBS_FILE = Path('/Users/gagandeep/.openclaw/workspace/gagan_job_matches.json')
LOG_FILE = Path('/Users/gagandeep/.openclaw/workspace/job-apply-log.md')
JSON_LOG = Path('/Users/gagandeep/.openclaw/workspace/last_run_specific_jobs.json')
RESUME_PATH = Path('/Users/gagandeep/.openclaw/workspace/resume.pdf')
CDP_URL = 'http://localhost:9222'

USER_PROFILE = {
    'email': 'gagan.ping@gmail.com',
    'phone': '+917795374024',
    'fullName': 'Gagan Deep',
    'location': 'Bengaluru, Karnataka, India',
    'linkedin': 'https://www.linkedin.com/in/higagan',
    'noticeDays': '30',
    'currentSalary': '42',
    'expectedSalary': '45',
}


def log_print(msg, msg_type='info'):
    prefix = {'info': '', 'success': '✅ ', 'error': '❌ ', 'warn': '⚠️ ', 'skip': '⏭️ '}.get(msg_type, '')
    line = f"{prefix}{msg}"
    print(line)
    sys.stdout.flush()


def load_jobs():
    with open(JOBS_FILE) as f:
        return json.load(f)


def find_linkedin_context(browser):
    for ctx in browser.contexts:
        for page in ctx.pages:
            if 'linkedin.com' in page.url:
                return ctx
    return None


def wait_for_ready(page, extra=4):
    try:
        page.wait_for_load_state('load', timeout=15000)
        page.wait_for_load_state('networkidle', timeout=15000)
    except PlaywrightTimeout:
        pass
    time.sleep(extra)


def fill_common_fields(page):
    """Auto-fill known fields. Returns True if any field was filled."""
    filled = False
    try:
        # Email
        for inp in page.locator('input[type="email"]').all():
            if inp.is_visible(timeout=500) and not inp.input_value().strip():
                inp.fill(USER_PROFILE['email'])
                filled = True
                log_print(f"Filled email: {USER_PROFILE['email']}")

        # Phone
        for inp in page.locator('input[type="tel"], input[aria-label*="phone" i], input[name*="phone" i]').all():
            if inp.is_visible(timeout=500) and not inp.input_value().strip():
                inp.fill(USER_PROFILE['phone'])
                filled = True
                log_print(f"Filled phone: {USER_PROFILE['phone']}")

        # Resume file upload
        for inp in page.locator('input[type="file"]').all():
            if inp.is_visible(timeout=500):
                try:
                    parent_text = inp.locator('xpath=ancestor::div[2]').inner_text(timeout=500).lower()
                except Exception:
                    parent_text = ''
                if 'resume' in parent_text or 'cv' in parent_text:
                    if RESUME_PATH.exists():
                        inp.set_input_files(str(RESUME_PATH))
                        filled = True
                        log_print(f"Uploaded resume: {RESUME_PATH.name}")

        # Common custom questions
        for inp in page.locator('.artdeco-modal input[type="text"], .artdeco-modal textarea').all():
            if not inp.is_visible(timeout=500):
                continue
            aria = (inp.get_attribute('aria-label') or '').lower()
            ph = (inp.get_attribute('placeholder') or '').lower()
            name = (inp.get_attribute('name') or '').lower()
            label = ''
            try:
                label = inp.locator('xpath=preceding::label[1]').inner_text(timeout=500).strip().lower()
            except Exception:
                pass
            combined = f"{aria} {ph} {name} {label}"
            val = inp.input_value().strip()
            if val:
                continue

            if any(k in combined for k in ['notice', 'join', 'days', 'how soon', 'available']):
                inp.fill(USER_PROFILE['noticeDays'])
                filled = True
                log_print(f"Filled notice period: {USER_PROFILE['noticeDays']} days")
            elif any(k in combined for k in ['expected salary', 'expected ctc', 'salary expected']):
                inp.fill(USER_PROFILE['expectedSalary'])
                filled = True
                log_print(f"Filled expected salary: {USER_PROFILE['expectedSalary']} LPA")
            elif any(k in combined for k in ['current salary', 'current ctc']):
                inp.fill(USER_PROFILE['currentSalary'])
                filled = True
                log_print(f"Filled current salary: {USER_PROFILE['currentSalary']} LPA")
            elif any(k in combined for k in ['experience', 'total experience', 'years of experience']):
                inp.fill('11')
                filled = True
                log_print("Filled experience: 11 years")
            elif any(k in combined for k in ['location', 'current location', 'city']):
                inp.fill(USER_PROFILE['location'])
                filled = True

        # Radio/checkbox: work authorization / willing to relocate — select first yes if required
        for group in page.locator('.artdeco-modal fieldset, .artdeco-modal [role="radiogroup"]').all():
            if not group.is_visible(timeout=500):
                continue
            try:
                legend = group.locator('legend, .t-14').first.inner_text(timeout=500).strip().lower()
            except Exception:
                legend = ''
            if any(k in legend for k in ['authorized', 'legally', 'work permit', 'citizen']):
                try:
                    group.get_by_text('Yes', exact=False).first.click(timeout=1000)
                    filled = True
                    log_print("Selected Yes for work authorization")
                except Exception:
                    pass

    except Exception as e:
        log_print(f"Fill fields error: {e}", 'warn')
    return filled


def handle_custom_questions(page):
    """Detect custom questions. Returns list of question texts if any unknown required fields exist."""
    questions = []
    try:
        for inp in page.locator('.artdeco-modal input[type="text"], .artdeco-modal textarea').all():
            if not inp.is_visible(timeout=500):
                continue
            aria = (inp.get_attribute('aria-label') or '').lower()
            ph = (inp.get_attribute('placeholder') or '').lower()
            val = inp.input_value().strip()
            if 'email' in aria or 'email' in ph or 'phone' in aria or 'phone' in ph:
                continue
            if not val:
                label_text = ''
                try:
                    label_text = inp.locator('xpath=preceding::label[1]').inner_text(timeout=500).strip().lower()[:120]
                except Exception:
                    pass
                # Skip current salary now that it's filled
                if any(k in label_text for k in ['current salary', 'current ctc']):
                    continue
                if not label_text:
                    label_text = ph or aria or 'Unknown question'
                questions.append(label_text)

        for group in page.locator('.artdeco-modal fieldset, .artdeco-modal [role="radiogroup"]').all():
            if group.is_visible(timeout=500):
                legend = ''
                try:
                    legend = group.locator('legend, [role="legend"], .t-14').first.inner_text(timeout=500).strip()[:120]
                except Exception:
                    pass
                if legend:
                    questions.append(f"[choice] {legend}")
    except Exception as e:
        log_print(f"Custom question detection error: {e}", 'warn')
    return questions


def check_already_applied(page):
    body_text = page.locator('body').inner_text().lower()
    return 'application sent' in body_text or 'already applied' in body_text or 'you applied' in body_text


def apply_to_job(context, job):
    job_id = job['jobId']
    title = job['title']
    company = job['company']
    started = time.time()
    result = {'jobId': job_id, 'title': title, 'company': company, 'status': 'failed', 'detail': '', 'elapsedSec': 0}

    log_print(f"[{job['rank']}/20] {title} @ {company}")

    page = None
    try:
        page = context.new_page()
        url = f"https://www.linkedin.com/jobs/view/{job_id}"
        log_print(f"Navigating to {url}")
        page.goto(url, timeout=60000)
        wait_for_ready(page, extra=5)

        if 'login' in page.url or 'auth' in page.url:
            result['detail'] = 'LinkedIn login required'
            log_print(result['detail'], 'error')
            page.close()
            return result

        # Dismiss sign-in modal if present
        try:
            page.locator('button[aria-label="Dismiss"]').first.click(timeout=2000)
            time.sleep(1)
        except Exception:
            pass

        # Scroll primary detail area into view
        detail = page.locator('.jobs-search__job-details--container, .job-view-layout, [class*="job-details"]').first
        if detail.is_visible(timeout=2000):
            detail.scroll_into_view_if_needed(timeout=3000)
            time.sleep(1)

        # Find exact Easy Apply in primary detail area
        easy_apply = None
        try:
            primary = page.locator('.jobs-search__job-details--container, .job-view-layout').first
            candidates = primary.locator('button, a, [role="button"]').filter(has_text='Easy Apply').all()
            for b in candidates:
                try:
                    txt = b.inner_text(timeout=500).strip().lower()
                    if txt == 'easy apply' and b.is_visible():
                        easy_apply = b
                        break
                except Exception:
                    continue
        except Exception:
            pass

        if not easy_apply:
            try:
                b = page.get_by_text('Easy Apply', exact=True).first
                if b.is_visible(timeout=2000):
                    easy_apply = b
            except Exception:
                easy_apply = None

        if not easy_apply:
            result['status'] = 'skipped'
            result['detail'] = 'No Easy Apply button'
            log_print("No Easy Apply — skipped", 'skip')
            page.close()
            return result

        log_print("Clicking Easy Apply...")
        easy_apply.scroll_into_view_if_needed(timeout=3000)
        time.sleep(1)
        easy_apply.click()
        time.sleep(5)

        # Check immediate success / one-step apply
        if check_already_applied(page):
            result['status'] = 'applied'
            result['detail'] = 'Application submitted (one-step)'
            log_print("Applied! (one-step)", 'success')
            page.close()
            return result

        # Handle application modal
        applied = False
        steps = 0
        stuck = 0
        while steps < 14 and stuck < 5:
            page.wait_for_timeout(2000)

            if check_already_applied(page):
                applied = True
                break

            # Fill known fields first
            fill_common_fields(page)

            # Check for any remaining custom questions
            custom_qs = handle_custom_questions(page)
            if custom_qs:
                log_print(f"Custom questions found: {custom_qs}", 'warn')
                result['detail'] = f"Custom questions require manual answer: {custom_qs[:2]}"
                result['status'] = 'skipped'
                log_print("Skipping — custom questions need manual answers", 'skip')
                page.close()
                return result

            # Find action buttons by aria-label OR text content
            submit_btn = (page.locator('button[aria-label="Submit application"]').first
                          if page.locator('button[aria-label="Submit application"]').count() > 0
                          else page.get_by_role('button', name='Submit application', exact=False).first)
            next_btn = (page.locator('button[aria-label="Continue to next step"]').first
                        if page.locator('button[aria-label="Continue to next step"]').count() > 0
                        else page.get_by_role('button', name='Next', exact=False).first)
            review_btn = (page.locator('button[aria-label="Review your application"]').first
                          if page.locator('button[aria-label="Review your application"]').count() > 0
                          else page.get_by_role('button', name='Review', exact=False).first)

            if submit_btn.is_visible(timeout=2000):
                log_print("Submitting application...")
                submit_btn.click()
                page.wait_for_timeout(3000)
                applied = True
                break
            elif next_btn.is_visible(timeout=1500):
                log_print("Next step...")
                next_btn.click()
                stuck = 0
            elif review_btn.is_visible(timeout=1500):
                log_print("Review step...")
                review_btn.click()
                stuck += 1
            else:
                log_print("No buttons found, checking if done...")
                try:
                    modal_open = page.locator('.artdeco-modal, [role="dialog"]').first.is_visible(timeout=1500)
                except Exception:
                    modal_open = False
                if not modal_open:
                    break
                stuck += 1
            steps += 1

        if applied:
            result['status'] = 'applied'
            result['detail'] = 'Application submitted'
            log_print("Applied!", 'success')
        else:
            result['detail'] = 'Application flow did not complete'
            log_print("Application flow incomplete", 'error')

        try:
            page.keyboard.press('Escape')
        except Exception:
            pass

    except Exception as e:
        result['detail'] = str(e)[:200]
        log_print(f"Error: {str(e)[:120]}", 'error')
    finally:
        if page:
            try:
                page.close()
            except Exception:
                pass

    result['elapsedSec'] = round(time.time() - started, 1)
    return result


def main():
    log_print("=" * 60)
    log_print("LINKEDIN SPECIFIC JOBS APPLY — Playwright/CDP")
    log_print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
    log_print("=" * 60)

    jobs = load_jobs()
    log_print(f"Loaded {len(jobs)} jobs from {JOBS_FILE}")

    with sync_playwright() as p:
        try:
            browser = p.chromium.connect_over_cdp(CDP_URL)
        except Exception as e:
            log_print(f"Could not connect to Chrome on {CDP_URL}: {e}", 'error')
            return

        context = find_linkedin_context(browser)
        if not context:
            log_print("No authenticated LinkedIn context found in connected Chrome.", 'error')
            return

        log_print(f"Using authenticated LinkedIn context with {len(context.pages)} page(s)")

        results = []
        for job in jobs:
            res = apply_to_job(context, job)
            results.append(res)
            time.sleep(3)

        total = len(results)
        applied = len([r for r in results if r['status'] == 'applied'])
        skipped = len([r for r in results if r['status'] == 'skipped'])
        failed = len([r for r in results if r['status'] == 'failed'])

        log_print("=" * 60)
        log_print("SUMMARY")
        log_print("=" * 60)
        log_print(f"Applied: {applied}/{total}")
        log_print(f"Skipped: {skipped}/{total}")
        log_print(f"Failed:  {failed}/{total}")

        final = {
            'platform': 'linkedin_specific',
            'timestamp': datetime.now().isoformat(),
            'total': total,
            'applied': applied,
            'skipped': skipped,
            'failed': failed,
            'results': results
        }
        with open(JSON_LOG, 'w') as f:
            json.dump(final, f, indent=2)

        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(f"\n## LinkedIn Specific Jobs — {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")
            f.write(f"**Applied:** {applied}  **Skipped:** {skipped}  **Failed:** {failed}\n\n")
            for r in results:
                icon = '✅' if r['status'] == 'applied' else '⏭️' if r['status'] == 'skipped' else '❌'
                elapsed = r.get('elapsedSec', 0)
                f.write(f"{icon} [{r['rank'] if 'rank' in r else '-'}] {r['title']} @ {r['company']} — {r['status']} ({elapsed}s)\n")
                if r.get('detail'):
                    f.write(f"   {r['detail']}\n")

        log_print(f"Saved results to {JSON_LOG}")


if __name__ == '__main__':
    main()
