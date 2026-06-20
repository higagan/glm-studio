#!/usr/bin/env python3
"""LinkedIn applier — scroll to find jobs, click Easy Apply filter pill first, then find jobs."""
import asyncio, websockets, json, time
from datetime import datetime

WS_URL = 'ws://localhost:9222/devtools/page/579380F947CEFDCB356E222E52F92E39'

async def main():
    async with websockets.connect(WS_URL) as ws:
        async def eval_js(expr):
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp.get('result', {}).get('result', {}).get('value')
        
        print("=" * 60)
        print("LINKEDIN DIRECT APPLY")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        # Scroll to load jobs
        print("\nScrolling to load jobs...")
        for _ in range(5):
            await eval_js('window.scrollBy(0, 1000)')
            time.sleep(2)
        
        # Get all job cards
        jobs = await eval_js('''
            (() => {
                const cards = document.querySelectorAll('[data-occludable-job-id]');
                let results = [];
                for (let card of cards) {
                    const titleEl = card.querySelector('strong');
                    if (titleEl) {
                        const title = titleEl.textContent.trim();
                        const companyEl = card.querySelector('[class*="base-search-unit__subTitle"]');
                        const company = companyEl ? companyEl.textContent.trim() : '';
                        const jobId = card.getAttribute('data-occludable-job-id');
                        results.push({jobId, title, company});
                    }
                }
                return results;
            })();
        ''')
        
        print(f"\nFound {len(jobs)} jobs:\n")
        for i, j in enumerate(jobs[:10]):
            print(f"[{i}] {j['title']}")
            print(f"    {j['company']}")
        
        # Click first 4 and apply via Easy Apply
        results = []
        
        for i in range(min(4, len(jobs))):
            job = jobs[i]
            print(f"\n[{i+1}/4] {job['title']}")
            
            try:
                # Click job card
                await eval_js(f'''
                    (async () => {{
                        const cards = document.querySelectorAll('[data-occludable-job-id]');
                        let target = null;
                        for (let card of cards) {{
                            if (card.getAttribute('data-occludable-job-id') === "{job['jobId']}") {{
                                target = card;
                                break;
                            }}
                        }}
                        if (target) {{
                            target.scrollIntoView({{block: "center"}});
                            await new Promise(r => setTimeout(r, 500));
                            target.click();
                        }}
                    }})();
                ''')
                
                time.sleep(2)
                
                # Look for apply button using broader selector
                apply_info = await eval_js('''
                    (() => {
                        const btns = document.querySelectorAll('button');
                        for (let btn of btns) {
                            const text = btn.textContent.trim().toLowerCase();
                            const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                            if (text === 'easy apply' || aria.includes('easy apply')) {
                                return {
                                    found: true,
                                    text: btn.textContent.trim(),
                                    ariaLabel: btn.getAttribute('aria-label'),
                                    className: btn.className.substring(0, 50)
                                };
                            }
                        }
                        return {found: false};
                    })();
                ''')
                print(f"   Apply button: {apply_info}")
                
                if not apply_info or not apply_info.get('found'):
                    print("   ⏭️  No Easy Apply")
                    results.append({'job': job, 'status': 'no_easy_apply'})
                    continue
                
                # Click Easy Apply
                print("   🎯 Clicking Easy Apply...")
                await eval_js('''
                    (async () => {
                        const btns = document.querySelectorAll('button');
                        let target = null;
                        for (let btn of btns) {
                            const text = btn.textContent.trim().toLowerCase();
                            const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                            if (text === 'easy apply' || aria.includes('easy apply')) {
                                target = btn;
                                break;
                            }
                        }
                        if (target) {
                            target.scrollIntoView({block: "center"});
                            await new Promise(r => setTimeout(r, 500));
                            target.click();
                            return {success: true};
                        }
                        return {error: "not found"};
                    })();
                ''')
                
                time.sleep(3)
                
                # Handle multi-step
                steps = 0
                applied = False
                while steps < 5:
                    time.sleep(2)
                    
                    state = await eval_js('''
                        (() => {
                            const s = document.querySelector('button[aria-label="Submit application"]');
                            const n = document.querySelector('button[aria-label="Continue to next step"]');
                            const r = document.querySelector('button[aria-label="Review your application"]');
                            return {hasSubmit: !!s, hasNext: !!n, hasReview: !!r};
                        })();
                    ''')
                    
                    if state.get('hasSubmit'):
                        print("   🎯 Submitting...")
                        await eval_js('document.querySelector("button[aria-label=\\\"Submit application\\\"]").click()')
                        time.sleep(3)
                        applied = True
                        break
                    elif state.get('hasNext'):
                        print("   ➡️  Next...")
                        await eval_js('document.querySelector("button[aria-label=\\\"Continue to next step\\\"]").click()')
                    elif state.get('hasReview'):
                        print("   📝 Review...")
                        await eval_js('document.querySelector("button[aria-label=\\\"Review your application\\\"]").click()')
                    else:
                        break
                    steps += 1
                
                if applied:
                    results.append({'job': job, 'status': 'applied'})
                    print("   🎉 Applied!")
                else:
                    results.append({'job': job, 'status': 'uncertain'})
                
                # Close modal
                await eval_js('document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", keyCode: 27}))')
                time.sleep(1)
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)[:100]}")
                results.append({'job': job, 'status': 'error'})
            
            time.sleep(3)
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        applied = [r for r in results if r['status'] == 'applied']
        print(f"Applied: {len(applied)}/4")
        for r in results:
            status = "✅" if r['status'] == 'applied' else ("⏭️" if r['status'] == 'no_easy_apply' else "❌")
            print(f"  {status} {r['job']['title']}")

asyncio.run(main())
