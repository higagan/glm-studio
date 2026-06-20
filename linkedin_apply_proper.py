#!/usr/bin/env python3
"""LinkedIn Easy Apply — proper flow: click job in list → apply in detail panel."""
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
        print("LINKEDIN EASY APPLY")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        # Get all job cards in the left panel
        jobs = await eval_js('''
            (() => {
                const cards = document.querySelectorAll('.jobs-search-results__list-item, [data-occludable-job-id], [class*="job-card-list"]');
                let results = [];
                for (let card of cards) {
                    const titleEl = card.querySelector('a strong, h3 a, [class*="job-card-list__title"]');
                    const companyEl = card.querySelector('[class*="company-name"], [class*="subtitle"]');
                    const jobId = card.getAttribute('data-occludable-job-id') || card.getAttribute('data-job-id');
                    
                    if (titleEl) {
                        results.push({
                            jobId: jobId || 'unknown',
                            title: titleEl.textContent.trim().substring(0, 60),
                            company: companyEl ? companyEl.textContent.trim().substring(0, 40) : 'Unknown'
                        });
                    }
                }
                return results;
            })();
        ''')
        
        print(f"\nFound {len(jobs)} jobs in list:\n")
        for j in jobs:
            print(f"  • {j['title']} @ {j['company']}")
        
        # Filter: skip agencies and non-matching
        skip_companies = ['tcs', 'tata consultancy', 'infosys', 'wipro', 'cognizant', 'accenture']
        matching = []
        for j in jobs:
            company_lower = j.get('company', '').lower()
            if any(k in company_lower for k in skip_companies):
                print(f"\n⏭️  SKIP: {j['title']} @ {j['company']}")
            else:
                matching.append(j)
        
        print(f"\n🎯 Will try {len(matching)} jobs\n")
        
        results = []
        
        for i, job in enumerate(matching[:5], 1):  # Max 5 for LinkedIn daily limit
            print(f"[{i}/{min(len(matching), 5)}] {job['title']} @ {job['company']}")
            
            try:
                # Step 1: Click on job card to open detail view
                clicked = await eval_js(f'''
                    (async () => {{
                        const cards = document.querySelectorAll('.jobs-search-results__list-item, [data-occludable-job-id]');
                        let targetCard = null;
                        for (let card of cards) {{
                            const title = card.querySelector('a strong, h3 a');
                            if (title && title.textContent.trim().includes("{job['title'][:30]}")) {{
                                targetCard = card;
                                break;
                            }}
                        }}
                        if (!targetCard) return {{error: 'card not found'}};
                        
                        targetCard.scrollIntoView({{behavior: 'smooth', block: 'center'}});
                        await new Promise(r => setTimeout(r, 500));
                        targetCard.click();
                        return {{success: true}};
                    }})();
                ''')
                print(f"   ✅ Opened detail: {clicked}")
                
                # Wait for detail to load
                time.sleep(2)
                
                # Step 2: Check for Easy Apply button in detail panel
                detail = await eval_js('''
                    (() => {
                        const panel = document.querySelector('.jobs-search__job-details--container');
                        if (!panel) return {error: 'no panel'};
                        
                        const applyBtn = panel.querySelector('button[aria-label*="Easy Apply"], .jobs-apply-button');
                        return {
                            hasEasyApply: !!applyBtn,
                            btnText: applyBtn ? applyBtn.textContent.trim() : 'none',
                            ariaLabel: applyBtn ? applyBtn.getAttribute('aria-label') : 'none'
                        };
                    })();
                ''')
                print(f"   📋 Detail check: {detail}")
                
                if not detail or not detail.get('hasEasyApply'):
                    print(f"   ⏭️  No Easy Apply — skipping")
                    results.append({'job': job, 'status': 'skipped', 'reason': 'no Easy Apply'})
                    continue
                
                # Step 3: Click Easy Apply
                print(f"   🎯 Clicking Easy Apply...")
                apply_clicked = await eval_js('''
                    (async () => {
                        const panel = document.querySelector('.jobs-search__job-details--container');
                        const btn = panel.querySelector('button[aria-label*="Easy Apply"], .jobs-apply-button');
                        if (!btn) return {error: 'button gone'};
                        
                        btn.scrollIntoView({block: 'center'});
                        await new Promise(r => setTimeout(r, 500));
                        btn.click();
                        return {success: true};
                    })();
                ''')
                print(f"   ✅ Clicked: {apply_clicked}")
                
                # Wait for application modal
                time.sleep(3)
                
                # Step 4: Handle application modal
                steps = 0
                max_steps = 5
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
                                hasDismiss: !!dismissBtn,
                                submitText: submitBtn ? submitBtn.textContent.trim() : '',
                                bodyText: document.body.innerText.substring(0, 200)
                            };
                        })();
                    ''')
                    
                    print(f"   Step {steps + 1}: {state}")
                    
                    if state.get('hasSubmit'):
                        print("   🎯 Submitting...")
                        await eval_js('''
                            (async () => {
                                const btn = document.querySelector('button[aria-label="Submit application"]');
                                btn.scrollIntoView({block: 'center'});
                                await new Promise(r => setTimeout(r, 500));
                                btn.click();
                            })();
                        ''')
                        time.sleep(3)
                        applied = True
                        break
                        
                    elif state.get('hasNext'):
                        print(f"   ➡️  Next step...")
                        await eval_js('''
                            (async () => {
                                const btn = document.querySelector('button[aria-label="Continue to next step"]');
                                btn.scrollIntoView({block: 'center'});
                                await new Promise(r => setTimeout(r, 500));
                                btn.click();
                            })();
                        ''')
                        
                    elif state.get('hasReview'):
                        print("   📝 Review step...")
                        await eval_js('''
                            (async () => {
                                const btn = document.querySelector('button[aria-label="Review your application"]');
                                btn.scrollIntoView({block: 'center'});
                                await new Promise(r => setTimeout(r, 500));
                                btn.click();
                            })();
                        ''')
                    elif state.get('hasDismiss'):
                        print("   ℹ️  Dismiss button found — may need to close modal")
                        break
                    else:
                        print("   ⚠️ No action buttons — breaking")
                        break
                    
                    steps += 1
                
                if applied:
                    results.append({'job': job, 'status': 'applied'})
                    print(f"   🎉 Successfully applied!")
                else:
                    results.append({'job': job, 'status': 'uncertain'})
                    print(f"   ⚠️ Application uncertain")
                
                # Close modal
                await eval_js('''
                    (() => {
                        document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', keyCode: 27}));
                        const dismiss = document.querySelector('button[aria-label="Dismiss"]');
                        if (dismiss) dismiss.click();
                        return 'done';
                    })();
                ''')
                time.sleep(2)
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)[:100]}")
                results.append({'job': job, 'status': 'error', 'detail': str(e)})
            
            time.sleep(3)
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        applied = [r for r in results if r['status'] == 'applied']
        errors = [r for r in results if r['status'] == 'error']
        skipped = [r for r in results if r['status'] == 'skipped']
        uncertain = [r for r in results if r['status'] == 'uncertain']
        
        print(f"Applied:   {len(applied)}")
        print(f"Skipped:   {len(skipped)}")
        print(f"Uncertain: {len(uncertain)}")
        print(f"Errors:    {len(errors)}")
        
        for r in results:
            status = {"applied": "✅", "skipped": "⏭️", "uncertain": "⚠️", "error": "❌"}.get(r['status'], "❓")
            print(f"  {status} {r['job']['title']} @ {r['job']['company']}")
        
        # Save
        with open('/Users/gagandeep/.openclaw/workspace/temp-applied.json', 'w') as f:
            json.dump(results, f, indent=2)
        print("\n💾 Results saved.")

asyncio.run(main())
