#!/usr/bin/env python3
"""Find LinkedIn Easy Apply jobs and click external 'Apply on company website' links."""
import asyncio, aiohttp, websockets, json, time, re
from datetime import datetime

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
        async def eval_js(expr):
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp.get('result', {}).get('result', {}).get('value')

        print("=" * 60)
        print("LINKEDIN EXTERNAL APPLY BRIDGE")
        print("=" * 60)

        # Get all job cards with apply button status
        jobs = await eval_js('''
            (() => {
                const cards = document.querySelectorAll('[data-occludable-job-id]');
                let results = [];
                for (let card of cards) {
                    const titleEl = card.querySelector('strong');
                    if (titleEl) {
                        const allButtons = card.querySelectorAll('button, li-icon');
                        const text = card.textContent.toLowerCase();
                        const hasEasyApply = text.includes('easy apply');
                        const hasExternal = text.includes('company website') || text.includes('external');
                        results.push({
                            jobId: card.getAttribute('data-occludable-job-id'),
                            title: titleEl.textContent.trim(),
                            hasEasyApply: hasEasyApply,
                            hasExternal: hasExternal
                        });
                    }
                }
                return results;
            })();
        ''')

        print(f"\nFound {len(jobs)} jobs\n")
        for i, j in enumerate(jobs):
            status = "EA" if j['hasEasyApply'] else "EXT" if j['hasExternal'] else "?"
            print(f"[{i}] [{status}] {j['title']}")

        # Target first job that has external or unknown apply type
        target_jobs = [j for j in jobs if not j['hasEasyApply']]
        
        if not target_jobs:
            print("\nNo external apply jobs found in current view")
            return

        for target_job in target_jobs[:3]:
            job_id = target_job['jobId']
            title = target_job['title']
            print(f"\n🎯 Targeting: {title}")

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
            print(f"Click result: {click_result}")
            time.sleep(3)

            # Look for apply buttons in detail panel
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

            print(f"Apply buttons in detail panel: {len(apply_buttons)}")
            for b in apply_buttons:
                print(f"  - [{b['tag']}] '{b['text']}' href={b['href'][:50] if b['href'] else 'none'}")

            # Click Easy Apply or external apply
            easy_apply = next((b for b in apply_buttons if 'easy apply' in (b['ariaLabel'] or '').lower() or 'easy apply' in b['text'].lower()), None)
            external = next((b for b in apply_buttons if 'company website' in (b['ariaLabel'] or '').lower() or 'company website' in b['text'].lower()), None)
            
            if easy_apply:
                print(f"\n🚀 Clicking Easy Apply: {easy_apply['text']}")
                click_result = await eval_js(f'''
                    (async () => {{
                        const panel = document.querySelector('.jobs-search__job-details--container') || document.body;
                        const buttons = panel.querySelectorAll('button');
                        for (let b of buttons) {{
                            const text = b.textContent.trim().toLowerCase();
                            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                            if (text.includes('easy apply') || aria.includes('easy apply')) {{
                                b.scrollIntoView({{block: "center"}});
                                await new Promise(r => setTimeout(r, 500));
                                b.click();
                                return {{clicked: true, text: b.textContent.trim()}};
                            }}
                        }}
                        return {{clicked: false}};
                    }})();
                ''')
                print(f"Easy Apply click result: {click_result}")
                time.sleep(3)
                
                # Check for modal and submit
                flow = await eval_js('''
                    (() => {
                        const s = document.querySelector('button[aria-label="Submit application"]');
                        const n = document.querySelector('button[aria-label="Continue to next step"]');
                        const r = document.querySelector('button[aria-label="Review your application"]');
                        return {hasSubmit: !!s, hasNext: !!n, hasReview: !!r};
                    })();
                ''')
                print(f"Application flow: {flow}")
                
                if flow.get('hasSubmit'):
                    await eval_js('''
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
                    print("✅ Submitted application!")
                    time.sleep(2)

            if external:
                print(f"\n🌐 Clicking external apply: {external['text']}")
                click_ext = await eval_js(f'''
                    (async () => {{
                        const panel = document.querySelector('.jobs-search__job-details--container') || document.body;
                        const buttons = panel.querySelectorAll('button, a');
                        for (let b of buttons) {{
                            const text = b.textContent.trim().toLowerCase();
                            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                            if (text.includes('company website') || aria.includes('company website')) {{
                                b.scrollIntoView({{block: "center"}});
                                await new Promise(r => setTimeout(r, 500));
                                b.click();
                                return {{clicked: true, text: b.textContent.trim()}};
                            }}
                        }}
                        return {{clicked: false}};
                    }})();
                ''')
                print(f"External click result: {click_ext}")
                time.sleep(5)
                new_url = await eval_js('window.location.href')
                print(f"URL after external click: {new_url}")

asyncio.run(main())
