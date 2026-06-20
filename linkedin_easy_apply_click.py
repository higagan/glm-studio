#!/usr/bin/env python3
"""LinkedIn — robust Easy Apply clicker with multiple strategies."""
import asyncio, aiohttp, websockets, json, time
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
    print(f"✅ Connected to LinkedIn page")

    async with websockets.connect(ws_url) as ws:
        async def eval_js(expr):
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp.get('result', {}).get('result', {}).get('value')

        print("=" * 60)
        print("LINKEDIN EASY APPLY TEST")
        print("=" * 60)

        # Get jobs
        jobs = await eval_js('''
            (() => {
                const cards = document.querySelectorAll('[data-occludable-job-id]');
                let results = [];
                for (let card of cards) {
                    const titleEl = card.querySelector('strong');
                    if (titleEl) {
                        results.push({
                            jobId: card.getAttribute('data-occludable-job-id'),
                            title: titleEl.textContent.trim()
                        });
                    }
                }
                return results;
            })();
        ''')

        print(f"\nFound {len(jobs)} jobs\n")
        for i, j in enumerate(jobs[:10]):
            print(f"[{i}] {j['title']}")

        # Target the Senior Backend Developer job
        target_job = None
        for j in jobs:
            if 'Senior Backend Developer' in j['title']:
                target_job = j
                break

        if not target_job:
            print("\n❌ Senior Backend Developer job not found")
            return

        job_id = target_job['jobId']
        title = target_job['title']
        print(f"\n🎯 Targeting: {title}")

        # Click the job card
        result = await eval_js(f'''
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
        print(f"Click result: {result}")

        time.sleep(3)

        # Strategy 1: Try clicking the job title directly in the left panel
        print("\n🔍 Strategy 1: Look for apply button in detail panel")
        
        # Wait and scroll detail panel
        await eval_js('''
            (() => {
                const detail = document.querySelector('.jobs-search__job-details--container');
                if (detail) detail.scrollIntoView({block: "start"});
            })();
        ''')
        time.sleep(2)

        # Strategy 2: Use querySelectorAll to find apply buttons with various selectors
        for attempt in range(5):
            time.sleep(2)
            print(f"\n--- Attempt {attempt + 1} ---")
            
            # Try multiple selectors
            apply_btn = await eval_js('''
                (() => {
                    const selectors = [
                        'button[aria-label*="Easy Apply"]',
                        'button[aria-label*="company website"]',
                        '.jobs-apply-button',
                        '.jobs-s-apply__actions-button',
                        'button.artdeco-button--primary',
                        '[class*="jobs-apply-button"]',
                        'button[type="button"]'
                    ];
                    
                    for (let sel of selectors) {
                        const btns = document.querySelectorAll(sel);
                        for (let btn of btns) {
                            const text = btn.textContent.trim().toLowerCase();
                            const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                            const className = btn.className.toLowerCase();
                            
                            if ((text.includes('easy apply') || aria.includes('easy apply') || 
                                 aria.includes('company website') || text.includes('apply')) &&
                                !text.includes('filter') && !aria.includes('filter') &&
                                !className.includes('pill') && !className.includes('filter')) {
                                return {
                                    found: true,
                                    selector: sel,
                                    text: btn.textContent.trim(),
                                    ariaLabel: btn.getAttribute('aria-label'),
                                    className: btn.className.substring(0, 80),
                                    disabled: btn.disabled
                                };
                            }
                        }
                    }
                    return {found: false};
                })();
            ''')
            
            print(f"Apply button search: {apply_btn}")
            
            if apply_btn and apply_btn.get('found'):
                print(f"\n✅ FOUND: '{apply_btn['text']}' via selector {apply_btn['selector']}")
                print(f"   aria-label: {apply_btn['ariaLabel']}")
                print(f"   className: {apply_btn['className']}")
                print(f"   disabled: {apply_btn['disabled']}")
                
                # Try to click it
                click_result = await eval_js(f'''
                    (async () => {{
                        const selectors = [
                            'button[aria-label*="Easy Apply"]',
                            'button[aria-label*="company website"]',
                            '.jobs-apply-button',
                            '.jobs-s-apply__actions-button',
                            'button.artdeco-button--primary',
                            '[class*="jobs-apply-button"]'
                        ];
                        
                        for (let sel of selectors) {{
                            const btns = document.querySelectorAll(sel);
                            for (let btn of btns) {{
                                const text = btn.textContent.trim().toLowerCase();
                                const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                                const className = btn.className.toLowerCase();
                                
                                if ((text.includes('easy apply') || aria.includes('easy apply') || 
                                     aria.includes('company website') || text.includes('apply')) &&
                                    !text.includes('filter') && !aria.includes('filter') &&
                                    !className.includes('pill') && !className.includes('filter')) {{
                                    btn.scrollIntoView({{block: "center"}});
                                    await new Promise(r => setTimeout(r, 500));
                                    btn.click();
                                    return {{clicked: true, selector: sel, text: btn.textContent.trim()}};
                                }}
                            }}
                        }}
                        return {{clicked: false}};
                    }})();
                ''')
                print(f"Click result: {click_result}")
                
                if click_result and click_result.get('clicked'):
                    time.sleep(3)
                    
                    # Check for application flow
                    flow = await eval_js('''
                        (() => {
                            const s = document.querySelector('button[aria-label="Submit application"]');
                            const n = document.querySelector('button[aria-label="Continue to next step"]');
                            const r = document.querySelector('button[aria-label="Review your application"]');
                            return {hasSubmit: !!s, hasNext: !!n, hasReview: !!r};
                        })();
                    ''')
                    print(f"Application flow: {flow}")
                    
                    if flow.get('hasSubmit') or flow.get('hasNext') or flow.get('hasReview'):
                        print("\n🎉 Successfully opened application flow!")
                        return
                break
        
        print("\n❌ Could not find or click apply button for this job")
        print("This job likely requires external application via company website")

asyncio.run(main())
