#!/usr/bin/env python3
"""LinkedIn batch applier — 4 Easy Apply + 3 external site applications."""
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
        print("LINKEDIN BATCH APPLY")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        # Scroll to load more jobs
        print("\nScrolling to load jobs...")
        for _ in range(5):
            await eval_js('window.scrollBy(0, 1000)')
            time.sleep(2)
        
        # Get all job cards in left panel
        jobs = await eval_js('''
            (() => {
                const cards = document.querySelectorAll('[data-occludable-job-id]');
                let results = [];
                for (let card of cards) {
                    const jobId = card.getAttribute('data-occludable-job-id');
                    const titleEl = card.querySelector('a strong, h3 a, [class*="job-card-list__title"]');
                    const companyEl = card.querySelector('[class*="company-name"], [class*="subtitle"]');
                    const locEl = card.querySelector('[class*="location"]');
                    
                    if (titleEl && companyEl) {
                        results.push({
                            jobId: jobId,
                            title: titleEl.textContent.trim(),
                            company: companyEl.textContent.trim(),
                            location: locEl ? locEl.textContent.trim() : ''
                        });
                    }
                }
                return results;
            })();
        ''')
        
        print(f"\nFound {len(jobs)} jobs:\n")
        for i, j in enumerate(jobs[:10]):
            print(f"[{i}] {j['title']}")
            print(f"    {j['company']} | {j['location']}")
        
        if not jobs:
            print("No jobs found!")
            return
        
        # Phase 1: Easy Apply (first 4)
        easy_apply_limit = min(4, len(jobs))
        print(f"\n\n{'='*60}")
        print(f"PHASE 1: EASY APPLY ({easy_apply_limit} jobs)")
        print('='*60)
        
        easy_results = []
        
        for i in range(easy_apply_limit):
            job = jobs[i]
            print(f"\n[{i+1}/{easy_apply_limit}] {job['title']} @ {job['company']}")
            
            try:
                # Click on job card to open detail
                clicked = await eval_js(f'''
                    (async () => {{
                        const cards = document.querySelectorAll('[data-occludable-job-id]');
                        let targetCard = null;
                        for (let card of cards) {{
                            if (card.getAttribute('data-occludable-job-id') === "{job['jobId']}") {{
                                targetCard = card;
                                break;
                            }}
                        }}
                        if (!targetCard) return {{error: "card not found"}};
                        
                        targetCard.scrollIntoView({{behavior: "smooth", block: "center"}});
                        await new Promise(r => setTimeout(r, 600));
                        targetCard.click();
                        return {{success: true}};
                    }})();
                ''')
                print(f"   ✅ Opened detail: {clicked}")
                
                time.sleep(2)
                
                # Check for Easy Apply
                detail = await eval_js('''
                    (() => {
                        const panel = document.querySelector('.jobs-search__job-details--container');
                        if (!panel) return {error: "no panel"};
                        const applyBtn = panel.querySelector('button[aria-label*="Easy Apply"], .jobs-apply-button');
                        return {
                            hasEasyApply: !!applyBtn,
                            btnText: applyBtn ? applyBtn.textContent.trim() : 'none',
                            ariaLabel: applyBtn ? applyBtn.getAttribute('aria-label') : 'none'
                        };
                    })();
                ''')
                print(f"   📋 Detail: {detail}")
                
                if not detail or not detail.get('hasEasyApply'):
                    print(f"   ⏭️  No Easy Apply — will try external later")
                    easy_results.append({'job': job, 'status': 'no_easy_apply'})
                    continue
                
                # Click Easy Apply
                print(f"   🎯 Clicking Easy Apply...")
                await eval_js('''
                    (async () => {
                        const panel = document.querySelector('.jobs-search__job-details--container');
                        const btn = panel.querySelector('button[aria-label*="Easy Apply"], .jobs-apply-button');
                        btn.scrollIntoView({block: "center"});
                        await new Promise(r => setTimeout(r, 500));
                        btn.click();
                        return {success: true};
                    })();
                ''')
                
                time.sleep(3)
                
                # Handle multi-step application
                steps = 0
                max_steps = 6
                applied = False
                
                while steps < max_steps:
                    time.sleep(2)
                    
                    state = await eval_js('''
                        (() => {
                            const submitBtn = document.querySelector('button[aria-label="Submit application"]');
                            const nextBtn = document.querySelector('button[aria-label="Continue to next step"]');
                            const reviewBtn = document.querySelector('button[aria-label="Review your application"]');
                            const dismissBtn = document.querySelector('button[aria-label="Dismiss"]');
                            return {
                                hasSubmit: !!submitBtn,
                                hasNext: !!nextBtn,
                                hasReview: !!reviewBtn,
                                hasDismiss: !!dismissBtn
                            };
                        })();
                    ''')
                    print(f"   Step {steps + 1}: submit={state.get('hasSubmit')} next={state.get('hasNext')} review={state.get('hasReview')}")
                    
                    if state.get('hasSubmit'):
                        print("   🎯 Submitting...")
                        await eval_js('''
                            (async () => {
                                const btn = document.querySelector('button[aria-label="Submit application"]');
                                btn.scrollIntoView({block: "center"});
                                await new Promise(r => setTimeout(r, 500));
                                btn.click();
                            })();
                        ''')
                        time.sleep(3)
                        applied = True
                        break
                    elif state.get('hasNext'):
                        print("   ➡️  Next step...")
                        await eval_js('''
                            (async () => {
                                const btn = document.querySelector('button[aria-label="Continue to next step"]');
                                btn.scrollIntoView({block: "center"});
                                await new Promise(r => setTimeout(r, 500));
                                btn.click();
                            })();
                        ''')
                    elif state.get('hasReview'):
                        print("   📝 Review step...")
                        await eval_js('''
                            (async () => {
                                const btn = document.querySelector('button[aria-label="Review your application"]');
                                btn.scrollIntoView({block: "center"});
                                await new Promise(r => setTimeout(r, 500));
                                btn.click();
                            })();
                        ''')
                    elif state.get('hasDismiss'):
                        print("   ℹ️  Dismiss found — closing...")
                        await eval_js('document.querySelector("button[aria-label=\\\"Dismiss\\\"]")?.click()')
                        break
                    else:
                        print("   ⚠️ No action buttons")
                        break
                    
                    steps += 1
                
                if applied:
                    easy_results.append({'job': job, 'status': 'applied'})
                    print(f"   🎉 Applied!")
                else:
                    easy_results.append({'job': job, 'status': 'uncertain'})
                    print(f"   ⚠️ Uncertain")
                
                # Close modal
                await eval_js('document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", keyCode: 27}))')
                time.sleep(1)
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)[:100]}")
                easy_results.append({'job': job, 'status': 'error', 'detail': str(e)})
            
            time.sleep(3)
        
        # Phase 2: External Site Applications (3 jobs)
        print(f"\n\n{'='*60}")
        print("PHASE 2: EXTERNAL SITE APPLICATIONS (3 jobs)")
        print("="*60)
        
        external_results = []
        
        # Get jobs without Easy Apply from phase 1 + next jobs
        for i in range(easy_apply_limit, min(easy_apply_limit + 3, len(jobs))):
            job = jobs[i]
            print(f"\n[{i+1 - easy_apply_limit}/3] {job['title']} @ {job['company']}")
            
            try:
                # Click on job card
                clicked = await eval_js(f'''
                    (async () => {{
                        const cards = document.querySelectorAll('[data-occludable-job-id]');
                        let targetCard = null;
                        for (let card of cards) {{
                            if (card.getAttribute('data-occludable-job-id') === "{job['jobId']}") {{
                                targetCard = card;
                                break;
                            }}
                        }}
                        if (!targetCard) return {{error: "card not found"}};
                        
                        targetCard.scrollIntoView({{behavior: "smooth", block: "center"}});
                        await new Promise(r => setTimeout(r, 600));
                        targetCard.click();
                        return {{success: true}};
                    }})();
                ''')
                print(f"   ✅ Opened detail: {clicked}")
                
                time.sleep(2)
                
                # Look for external apply button (not Easy Apply)
                detail = await eval_js('''
                    (() => {
                        const panel = document.querySelector('.jobs-search__job-details--container');
                        if (!panel) return {error: "no panel"};
                        
                        const allBtns = panel.querySelectorAll('button, a');
                        let externalBtn = null;
                        for (let btn of allBtns) {
                            const text = btn.textContent.trim().toLowerCase();
                            if (text.includes('apply') && !text.includes('easy')) {
                                externalBtn = btn;
                                break;
                            }
                        }
                        
                        return {
                            hasExternalApply: !!externalBtn,
                            btnText: externalBtn ? externalBtn.textContent.trim() : 'none',
                            href: externalBtn ? (externalBtn.href || '') : ''
                        };
                    })();
                ''')
                print(f"   📋 External apply: {detail}")
                
                if not detail or not detail.get('hasExternalApply'):
                    print(f"   ⏭️  No external apply button")
                    external_results.append({'job': job, 'status': 'no_external_button'})
                    continue
                
                # Click external apply button
                print(f"   🎯 Clicking external apply...")
                await eval_js('''
                    (async () => {
                        const panel = document.querySelector('.jobs-search__job-details--container');
                        const allBtns = panel.querySelectorAll('button, a');
                        let externalBtn = null;
                        for (let btn of allBtns) {
                            const text = btn.textContent.trim().toLowerCase();
                            if (text.includes('apply') && !text.includes('easy')) {
                                externalBtn = btn;
                                break;
                            }
                        }
                        if (!externalBtn) return {error: "button gone"};
                        
                        externalBtn.scrollIntoView({block: "center"});
                        await new Promise(r => setTimeout(r, 500));
                        externalBtn.click();
                        return {success: true};
                    })();
                ''')
                
                time.sleep(4)
                
                # Check if new tab/window opened
                url = await eval_js('window.location.href')
                print(f"   📍 Current URL: {url}")
                
                external_results.append({'job': job, 'status': 'external_opened', 'url': url})
                print(f"   🌐 External site opened")
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)[:100]}")
                external_results.append({'job': job, 'status': 'error', 'detail': str(e)})
            
            time.sleep(3)
        
        # Summary
        print(f"\n\n{'='*60}")
        print("FINAL SUMMARY")
        print("="*60)
        
        easy_applied = [r for r in easy_results if r['status'] == 'applied']
        easy_uncertain = [r for r in easy_results if r['status'] == 'uncertain']
        easy_errors = [r for r in easy_results if r['status'] == 'error']
        
        external_opened = [r for r in external_results if r['status'] == 'external_opened']
        external_failed = [r for r in external_results if r['status'] != 'external_opened']
        
        print(f"\nEasy Apply:")
        print(f"  Applied:   {len(easy_applied)}")
        print(f"  Uncertain: {len(easy_uncertain)}")
        print(f"  Errors:    {len(easy_errors)}")
        
        print(f"\nExternal Site:")
        print(f"  Opened: {len(external_opened)}")
        print(f"  Failed: {len(external_failed)}")
        
        print(f"\nTotal Progress:")
        print(f"  Easy Apply Applied: {len(easy_applied)}/4")
        print(f"  External Attempted: {len(external_results)}/3")
        
        for r in easy_results:
            status = "✅" if r['status'] == 'applied' else ("⚠️" if r['status'] == 'uncertain' else "❌")
            print(f"  {status} [EA] {r['job']['title']} @ {r['job']['company']}")
        
        for r in external_results:
            status = "🌐" if r['status'] == 'external_opened' else "❌"
            print(f"  {status} [EXT] {r['job']['title']} @ {r['job']['company']}")
        
        # Save results
        all_results = {
            'easy_apply': easy_results,
            'external': external_results,
            'timestamp': datetime.now().isoformat()
        }
        
        with open("/Users/gagandeep/.openclaw/workspace/temp-applied.json", "w") as f:
            json.dump(all_results, f, indent=2)

asyncio.run(main())
