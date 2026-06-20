#!/usr/bin/env python3
"""Apply to remaining LinkedIn Easy Apply jobs, including the Senior Backend Developer."""
import asyncio, aiohttp, websockets, json, time, re, os
from datetime import datetime

LOG_FILE = '/Users/gagandeep/.openclaw/workspace/job-apply-log.md'

async def main():
    async with aiohttp.ClientSession() as session:
        async with session.get('http://localhost:9222/json/list') as resp:
            pages = await resp.json()
            linkedin_page = next((p for p in pages if 'linkedin.com/jobs' in p.get('url', '')), None)
    if not linkedin_page:
        print("❌ No LinkedIn jobs page found")
        return

    ws_url = linkedin_page['webSocketDebuggerUrl']
    print(f"✅ Connected to LinkedIn jobs page")

    async with websockets.connect(ws_url) as ws:
        async def eval_js(expr, timeout=5):
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True, 'timeout': timeout * 1000}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp.get('result', {}).get('result', {}).get('value')

        def log(title, company, status, detail=''):
            line = f"- [{datetime.now():%Y-%m-%d %H:%M}] [linkedin] {title} at {company}: {status}"
            if detail:
                line += f" — {detail}"
            with open(LOG_FILE, 'a', encoding='utf-8') as f:
                f.write(line + '\n')
            print(line)

        print("=" * 60)
        print("LINKEDIN EASY APPLY — APPLY ALL RELEVANT")
        print("=" * 60)

        # Get all job cards
        jobs = await eval_js('''
            (() => {
                const cards = document.querySelectorAll('[data-occludable-job-id]');
                let results = [];
                for (let card of cards) {
                    const titleEl = card.querySelector('strong');
                    const companyEl = card.querySelector('.job-card-container__company-name, [class*="company-name"]');
                    if (titleEl) {
                        results.push({
                            jobId: card.getAttribute('data-occludable-job-id'),
                            title: titleEl.textContent.trim(),
                            company: companyEl ? companyEl.textContent.trim() : ''
                        });
                    }
                }
                return results;
            })();
        ''')

        print(f"\nFound {len(jobs)} jobs\n")
        for i, j in enumerate(jobs):
            print(f"[{i}] {j['title']} — {j['company']}")

        applied_count = 0
        skipped_count = 0
        failed_count = 0

        for job in jobs:
            job_id = job['jobId']
            title = job['title']
            company = job['company']

            print(f"\n🎯 Processing: {title} at {company}")

            # Click the job card
            click_result = await eval_js(f'''
                (async () => {{
                    const cards = document.querySelectorAll('[data-occludable-job-id]');
                    let targetCard = null;
                    for (let c of cards) {{
                        if (c.getAttribute('data-occludable-job-id') === "{job_id}") {{
                            targetCard = c;
                            break;
                        }}
                    }}
                    if (!targetCard) return {{error: "card not found"}};
                    targetCard.scrollIntoView({{behavior: "smooth", block: "center"}});
                    await new Promise(r => setTimeout(r, 600));
                    const link = targetCard.querySelector('a');
                    if (link) {{ link.click(); return {{clicked: "link"}}; }}
                    targetCard.click();
                    return {{clicked: "card"}};
                }})();
            ''')
            time.sleep(2)

            # Find Easy Apply button in detail panel
            apply_buttons = await eval_js('''
                (() => {
                    const panel = document.querySelector('.jobs-search__job-details--container') || document.body;
                    const buttons = panel.querySelectorAll('button, a');
                    let results = [];
                    for (let b of buttons) {
                        const text = b.textContent.trim().toLowerCase();
                        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                        if (text.includes('easy apply') || aria.includes('easy apply') ||
                            text.includes('company website') || aria.includes('company website') ||
                            text === 'apply') {
                            results.push({
                                tag: b.tagName,
                                text: b.textContent.trim(),
                                ariaLabel: b.getAttribute('aria-label'),
                                href: b.href || '',
                                className: b.className.substring(0, 60)
                            });
                        }
                    }
                    return results;
                })();
            ''')

            easy_apply = next((b for b in apply_buttons if 'easy apply' in (b['ariaLabel'] or '').lower() or 'easy apply' in b['text'].lower()), None)
            external = next((b for b in apply_buttons if 'company website' in (b['ariaLabel'] or '').lower() or 'company website' in b['text'].lower()), None)

            if not easy_apply and not external:
                log(title, company, 'skipped', 'no apply button found')
                skipped_count += 1
                continue

            if external:
                log(title, company, 'external', 'company website apply — not handled')
                skipped_count += 1
                continue

            # Click Easy Apply
            print(f"🚀 Clicking Easy Apply: {easy_apply['text']}")
            click_result = await eval_js('''
                (async () => {
                    const panel = document.querySelector('.jobs-search__job-details--container') || document.body;
                    const buttons = panel.querySelectorAll('button');
                    for (let b of buttons) {
                        const text = b.textContent.trim().toLowerCase();
                        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                        if (text.includes('easy apply') || aria.includes('easy apply')) {
                            b.scrollIntoView({block: "center"});
                            await new Promise(r => setTimeout(r, 500));
                            b.click();
                            return {clicked: true, text: b.textContent.trim()};
                        }
                    }
                    return {clicked: false};
                })();
            ''')
            time.sleep(3)

            # Try to handle the application flow
            max_steps = 8
            applied = False
            for step in range(max_steps):
                flow = await eval_js('''
                    (() => {
                        const s = document.querySelector('button[aria-label="Submit application"]');
                        const n = document.querySelector('button[aria-label="Continue to next step"]');
                        const r = document.querySelector('button[aria-label="Review your application"]');
                        const error = document.querySelector('.artdeco-inline-feedback__message, [role="alert"]');
                        return {
                            hasSubmit: !!s,
                            hasNext: !!n,
                            hasReview: !!r,
                            errorText: error ? error.textContent.trim() : ''
                        };
                    })();
                ''')
                print(f"  Step {step+1}: {flow}")

                if flow.get('errorText'):
                    print(f"⚠️ Error: {flow['errorText']}")

                if flow.get('hasSubmit'):
                    # Click submit
                    submit_result = await eval_js('''
                        (async () => {
                            const s = document.querySelector('button[aria-label="Submit application"]');
                            if (s) {
                                s.scrollIntoView({block: "center"});
                                await new Promise(r => setTimeout(r, 500));
                                s.click();
                                return {submitted: true};
                            }
                            return {submitted: false};
                        })();
                    ''')
                    print(f"Submit result: {submit_result}")
                    time.sleep(2)
                    applied = True
                    break
                elif flow.get('hasReview'):
                    await eval_js('''
                        (async () => {
                            const r = document.querySelector('button[aria-label="Review your application"]');
                            if (r) {
                                r.scrollIntoView({block: "center"});
                                await new Promise(r => setTimeout(r, 500));
                                r.click();
                                return {clicked: true};
                            }
                            return {clicked: false};
                        })();
                    ''')
                    time.sleep(2)
                elif flow.get('hasNext'):
                    # Check if it's a resume upload step or contact info
                    current_url = await eval_js('window.location.href')
                    print(f"  Current URL: {current_url}")
                    
                    # Try to continue
                    await eval_js('''
                        (async () => {
                            const n = document.querySelector('button[aria-label="Continue to next step"]');
                            if (n) {
                                n.scrollIntoView({block: "center"});
                                await new Promise(r => setTimeout(r, 500));
                                n.click();
                                return {clicked: true};
                            }
                            return {clicked: false};
                        })();
                    ''')
                    time.sleep(2)
                else:
                    # No buttons found, check if already applied
                    success = await eval_js('''
                        (() => {
                            const text = document.body.textContent.toLowerCase();
                            return {
                                applied: text.includes('application sent') || text.includes('already applied') || text.includes('you applied'),
                                modalOpen: !!document.querySelector('.artdeco-modal, [role="dialog"]')
                            };
                        })();
                    ''')
                    print(f"  Success check: {success}")
                    if success.get('applied'):
                        applied = True
                        break
                    if not success.get('modalOpen'):
                        print("  Modal closed unexpectedly")
                        break
                    time.sleep(2)

            if applied:
                log(title, company, 'applied')
                applied_count += 1
            else:
                log(title, company, 'failed', 'could not complete Easy Apply flow')
                failed_count += 1

            # Close any open modal
            await eval_js('''
                (() => {
                    const closeBtn = document.querySelector('button[aria-label="Dismiss"]');
                    if (closeBtn) closeBtn.click();
                })();
            ''')
            time.sleep(1)

        summary = f"\nSUMMARY: Applied={applied_count}, Skipped={skipped_count}, Failed={failed_count}"
        print(summary)
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(summary + '\n')

asyncio.run(main())
