#!/usr/bin/env python3
"""Apply to specific LinkedIn jobs by searching and clicking job cards (mimics real browsing)."""
import json, time, sys, urllib.parse
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


def wait_for_ready(page, extra=3):
    try:
        page.wait_for_load_state('load', timeout=15000)
        page.wait_for_load_state('networkidle', timeout=15000)
    except PlaywrightTimeout:
        pass
    time.sleep(extra)


def search_for_job(page, title, company):
    """Search LinkedIn jobs for title+company and click the matching job card."""
    query = f"{title} {company}"
    encoded = urllib.parse.quote(query)
    search_url = f"https://www.linkedin.com/jobs/search/?keywords={encoded}&f_AL=true&origin=JOB_SEARCH_PAGE_JOB_FILTER"
    log_print(f"Searching: {query}")
    page.goto(search_url, timeout=120000, wait_until='domcontentloaded')
    wait_for_ready(page, extra=5)

    # Wait for job cards
    try:
        page.locator('[data-occludable-job-id]').first.wait_for(timeout=10000)
    except PlaywrightTimeout:
        log_print("No job cards loaded", 'warn')
        return False

    cards = page.locator('[data-occludable-job-id]').all()
    log_print(f"Found {len(cards)} job cards")

    for card in cards:
        try:
            card_text = card.inner_text(timeout=1000).lower()
            card_company = company.lower()
            card_title_words = title.lower().split()[:3]
            title_match = any(w in card_text for w in card_title_words)
            company_match = card_company in card_text
            if title_match and company_match:
                log_print(f"Match found: {company} card")
                card.scroll_into_view_if_needed(timeout=3000)
                time.sleep(1)
                card.click()
                time.sleep(4)
                return True
        except Exception:
            continue

    # Fallback: click first card if company appears anywhere
    for card in cards:
        try:
            if company.lower() in card.inner_text(timeout=1000).lower():
                card.scroll_into_view_if_needed(timeout=3000)
                time.sleep(1)
                card.click()
                time.sleep(4)
                log_print(f"Fuzzy match (company only): {company}")
                return True
        except Exception:
            continue

    log_print(f"Could not find card for {company}", 'warn')
    return False


def find_easy_apply_in_detail(page):
    """Find the primary Easy Apply button inside the job detail panel."""
    try:
        panel = page.locator('.jobs-search__job-details--container, .job-view-layout').first
        if panel.is_visible(timeout=2000):
            candidates = panel.locator('button, a, [role="button"]').filter(has_text='Easy Apply').all()
            for b in candidates:
                try:
                    txt = b.inner_text(timeout=500).strip().lower()
                    if txt == 'easy apply' and b.is_visible():
                        return b
                except Exception:
                    continue
    except Exception:
        pass

    # Fallback: any visible Easy Apply that is a primary button
    all_btns = page.locator('button, a, [role="button"]').all()
    for b in all_btns:
        try:
            txt = b.inner_text(timeout=500).strip().lower()
            if txt == 'easy apply' and b.is_visible():
                # Make sure it's not a recommended job card (too much text)
                if len(b.inner_text(timeout=500)) < 60:
                    return b
        except Exception:
            continue
    return None


def fill_common_fields(page):
    filled = False
    try:
        for inp in page.locator('input[type="email"]').all():
            if inp.is_visible(timeout=500) and not inp.input_value().strip():
                inp.fill(USER_PROFILE['email'])
                filled = True
                log_print(f"Filled email: {USER_PROFILE['email']}")

        for inp in page.locator('input[type="tel"], input[aria-label*="phone" i], input[name*="phone" i]').all():
            if inp.is_visible(timeout=500) and not inp.input_value().strip():
                inp.fill(USER_PROFILE['phone'])
                filled = True
                log_print(f"Filled phone: {USER_PROFILE['phone']}")

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

    except Exception as e:
        log_print(f"Fill fields error: {e}", 'warn')
    return filled


def handle_custom_questions(page):
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
                    label_text = inp.locator('xpath=preceding::label[1]').inner_text(timeout=500).strip()[:120]
                except Exception:
                    pass
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


def run_application_flow(page):
    applied = False
    steps = 0
    stuck = 0
    while steps < 14 and stuck < 5:
        page.wait_for_timeout(2000)

        if check_already_applied(page):
            applied = True
            break

        fill_common_fields(page)

        custom_qs = handle_custom_questions(page)
        if custom_qs:
            log_print(f"Custom questions require manual answer: {custom_qs[:2]}", 'warn')
            return 'custom_questions', custom_qs

        submit_btn = page.locator('button[aria-label="Submit application"]').first
        next_btn = page.locator('button[aria-label="Continue to next step"]').first
        review_btn = page.locator('button[aria-label="Review your application"]').first

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

    return ('applied', None) if applied else ('incomplete', None)


def apply_to_job(context, job):
    title = job['title']
    company = job['company']
    started = time.time()
    result = {'jobId': job['jobId'], 'title': title, 'company': company, 'status': 'failed', 'detail': '', 'elapsedSec': 0}

    log_print(f"[{job['rank']}/20] {title} @ {company}")

    page = None
    try:
        page = context.new_page()

        found = search_for_job(page, title, company)
        if not found:
            result['status'] = 'skipped'
            result['detail'] = 'Job not found in search results'
            log_print("Job card not found — skipped", 'skip')
            page.close()
            return result

        easy_apply = find_easy_apply_in_detail(page)
        if not easy_apply:
            result['status'] = 'skipped'
            result['detail'] = 'No Easy Apply in detail panel'
            log_print("No Easy Apply in detail — skipped", 'skip')
            page.close()
            return result

        log_print("Clicking Easy Apply...")
        easy_apply.scroll_into_view_if_needed(timeout=3000)
        time.sleep(1)
        easy_apply.click()
        time.sleep(5)

        if check_already_applied(page):
            result['status'] = 'applied'
            result['detail'] = 'Application submitted (one-step)'
            log_print("Applied! (one-step)", 'success')
            page.close()
            return result

        status, detail = run_application_flow(page)
        if status == 'applied':
            result['status'] = 'applied'
            result['detail'] = 'Application submitted'
            log_print("Applied!", 'success')
        elif status == 'custom_questions':
            result['status'] = 'skipped'
            result['detail'] = f"Custom questions: {detail[:2]}"
            log_print("Skipped — custom questions need manual answers", 'skip')
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
    log_print("LINKEDIN SPECIFIC JOBS APPLY — Search & Click")
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
    # Close extra LinkedIn pages to avoid resource issues
    for ctx in browser.contexts:
        linkedin_pages = [pg for pg in ctx.pages if 'linkedin.com' in pg.url]
        for pg in linkedin_pages[1:]:
            try:
                pg.close()
            except Exception:
                pass

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
