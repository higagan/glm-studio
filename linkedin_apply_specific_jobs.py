#!/usr/bin/env python3
"""Apply to specific LinkedIn jobs by job ID (navigates to each job URL)."""
import asyncio, aiohttp, websockets, json, time, sys
from datetime import datetime
from pathlib import Path

JOBS_FILE = Path('/Users/gagandeep/.openclaw/workspace/gagan_job_matches.json')
LOG_FILE = Path('/Users/gagandeep/.openclaw/workspace/job-apply-log.md')
JSON_LOG = Path('/Users/gagandeep/.openclaw/workspace/last_run_specific_jobs.json')
CDP_URL = 'http://localhost:9222/json/list'


def log_print(msg, msg_type='info'):
    prefix = {'info': '', 'success': '✅ ', 'error': '❌ ', 'warn': '⚠️ ', 'skip': '⏭️ '}.get(msg_type, '')
    line = f"{prefix}{msg}"
    print(line)
    sys.stdout.flush()


def load_jobs():
    with open(JOBS_FILE) as f:
        return json.load(f)


async def get_linkedin_page(session):
    async with session.get(CDP_URL) as resp:
        pages = await resp.json()
    candidates = [p for p in pages if p.get('type') == 'page' and 'linkedin.com' in p.get('url', '')]
    return candidates[0] if candidates else None


async def navigate_to_job(ws, eval_js, job_id):
    url = f"https://www.linkedin.com/jobs/view/{job_id}"
    await eval_js(f"window.location.href = '{url}'")
    log_print(f"Navigating to {url}")
    for i in range(40):
        await asyncio.sleep(1)
        ready = await eval_js("document.readyState")
        if ready == 'complete':
            await asyncio.sleep(4)
            return True
    return False


async def find_easy_apply_button(eval_js):
    return await eval_js('''
        (() => {
            const panel = document.querySelector('.jobs-search__job-details--container')
                || document.querySelector('.job-view-layout')
                || document.querySelector('[class*="job-details"]')
                || document;
            const all = panel.querySelectorAll('button, a, [role="button"]');
            let target = null;
            let bestScore = 0;
            for (let btn of all) {
                const text = btn.textContent.trim();
                const textLower = text.toLowerCase();
                const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                const cls = (btn.className || '').toLowerCase();
                if (textLower.includes('filter')) continue;
                if (text.length > 40) continue;
                let score = 0;
                if (textLower === 'easy apply') score += 20;
                else if (textLower.includes('easy apply')) score += 8;
                if (aria.includes('easy apply to this job')) score += 20;
                else if (aria.includes('easy apply')) score += 5;
                if (cls.includes('artdeco-button--primary') || cls.includes('jobs-apply-button') || cls.includes('_85d78919')) score += 8;
                if (score > bestScore) { bestScore = score; target = btn; }
            }
            if (!target || bestScore < 10) return {found: false};
            return {found: true, text: target.textContent.trim(), ariaLabel: target.getAttribute('aria-label')};
        })();
    ''')


async def click_easy_apply(eval_js):
    return await eval_js('''
        (async () => {
            const panel = document.querySelector('.jobs-search__job-details--container')
                || document.querySelector('.job-view-layout')
                || document.querySelector('[class*="job-details"]')
                || document;
            const all = panel.querySelectorAll('button, a, [role="button"]');
            let target = null;
            let bestScore = 0;
            for (let btn of all) {
                const text = btn.textContent.trim();
                const textLower = text.toLowerCase();
                const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                const cls = (btn.className || '').toLowerCase();
                if (textLower.includes('filter')) continue;
                if (text.length > 40) continue;
                let score = 0;
                if (textLower === 'easy apply') score += 20;
                else if (textLower.includes('easy apply')) score += 8;
                if (aria.includes('easy apply to this job')) score += 20;
                else if (aria.includes('easy apply')) score += 5;
                if (cls.includes('artdeco-button--primary') || cls.includes('jobs-apply-button') || cls.includes('_85d78919')) score += 8;
                if (score > bestScore) { bestScore = score; target = btn; }
            }
            if (!target || bestScore < 10) return {clicked: false, reason: 'no primary easy apply found'};
            target.scrollIntoView({block: "center", behavior: "smooth"});
            await new Promise(r => setTimeout(r, 1500));
            const rect = target.getBoundingClientRect();
            target.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2}));
            await new Promise(r => setTimeout(r, 300));
            target.click();
            return {clicked: true, text: target.textContent.trim()};
        })();
    ''')


async def run_application_flow(eval_js):
    steps = 0
    applied = False
    stuck = 0
    while steps < 10 and stuck < 4:
        await asyncio.sleep(2)
        state = await eval_js('''
            (() => {
                const s = document.querySelector('button[aria-label="Submit application"]');
                const n = document.querySelector('button[aria-label="Continue to next step"]');
                const r = document.querySelector('button[aria-label="Review your application"]');
                const error = document.querySelector('.artdeco-inline-feedback__message, [role="alert"]');
                const bodyText = document.body.textContent.toLowerCase();
                return {
                    hasSubmit: !!s,
                    hasNext: !!n,
                    hasReview: !!r,
                    errorText: error ? error.textContent.trim() : '',
                    alreadyApplied: bodyText.includes('application sent') || bodyText.includes('already applied') || bodyText.includes('you applied'),
                    modalOpen: !!document.querySelector('.artdeco-modal, [role="dialog"]')
                };
            })();
        ''')

        if state.get('errorText'):
            log_print(f"Form error: {state['errorText']}", 'warn')

        if state.get('alreadyApplied'):
            applied = True
            break
        elif state.get('hasSubmit'):
            log_print("Submitting application...")
            await eval_js('''
                (async () => {
                    const s = document.querySelector('button[aria-label="Submit application"]');
                    if (s) { s.scrollIntoView({block: "center"}); await new Promise(r => setTimeout(r, 500)); s.click(); }
                })();
            ''')
            await asyncio.sleep(3)
            applied = True
            break
        elif state.get('hasReview'):
            log_print("Review step...")
            await eval_js('document.querySelector("button[aria-label=\"Review your application\"]").click()')
            stuck += 1
        elif state.get('hasNext'):
            log_print("Next step...")
            await eval_js('document.querySelector("button[aria-label=\"Continue to next step\"]").click()')
            stuck = 0
        else:
            log_print("No buttons found, checking if done...")
            if not state.get('modalOpen'):
                break
            stuck += 1
        steps += 1

    return applied


async def close_modal(eval_js):
    await eval_js('document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", keyCode: 27}))')
    await asyncio.sleep(1)


async def apply_to_job(session, job):
    job_id = job['jobId']
    title = job['title']
    company = job['company']
    started = time.time()
    result = {'jobId': job_id, 'title': title, 'company': company, 'status': 'failed', 'detail': '', 'elapsedSec': 0}

    log_print(f"[{job['rank']}/20] {title} @ {company}")

    try:
        page = await get_linkedin_page(session)
        if not page:
            result['detail'] = 'No LinkedIn page found in Chrome'
            log_print(result['detail'], 'error')
            return result

        async with websockets.connect(page['webSocketDebuggerUrl']) as ws:
            async def eval_js(expr):
                msg_id = int(time.time() * 1000000) % 1000000000
                payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate',
                                      'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}})
                await ws.send(payload)
                resp = json.loads(await ws.recv())
                return resp.get('result', {}).get('result', {}).get('value')

            nav_ok = await navigate_to_job(ws, eval_js, job_id)
            if not nav_ok:
                result['detail'] = 'Page did not load in 30s'
                log_print(f"Page load timeout for {job_id}", 'error')
                return result

            btn = await find_easy_apply_button(eval_js)
            if not btn or not btn.get('found'):
                result['status'] = 'skipped'
                result['detail'] = 'No Easy Apply button'
                log_print("No Easy Apply — skipped", 'skip')
                return result

            log_print(f"Easy Apply found: {btn.get('text', '')}")
            click = await click_easy_apply(eval_js)
            if not click or not click.get('clicked'):
                result['detail'] = f"Failed to click Easy Apply: {click.get('reason', '')}"
                log_print(result['detail'], 'error')
                return result

            await asyncio.sleep(5)
            applied = await run_application_flow(eval_js)
            if applied:
                result['status'] = 'applied'
                result['detail'] = 'Application submitted'
                log_print("Applied!", 'success')
            else:
                result['detail'] = 'Application flow did not complete'
                log_print("Application flow incomplete", 'error')

            await close_modal(eval_js)

    except Exception as e:
        result['detail'] = str(e)[:200]
        log_print(f"Error: {str(e)[:120]}", 'error')

    result['elapsedSec'] = round(time.time() - started, 1)
    return result


async def main():
    log_print("=" * 60)
    log_print("LINKEDIN SPECIFIC JOBS APPLY")
    log_print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
    log_print("=" * 60)

    jobs = load_jobs()
    log_print(f"Loaded {len(jobs)} jobs from {JOBS_FILE}")

    async with aiohttp.ClientSession() as session:
        results = []
        for job in jobs:
            res = await apply_to_job(session, job)
            results.append(res)
            await asyncio.sleep(3)

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


asyncio.run(main())
