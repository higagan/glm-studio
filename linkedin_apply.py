#!/usr/bin/env python3
"""LinkedIn Easy Apply applier."""
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
        
        # Get all visible jobs with Easy Apply buttons
        jobs = await eval_js('''
            (() => {
                const cards = document.querySelectorAll('[data-job-id]');
                let results = [];
                for (let card of cards) {
                    const jobId = card.getAttribute('data-job-id');
                    const titleEl = card.querySelector('a strong, h3 a, h4 a, [class*="job-card-list__title"]');
                    const companyEl = card.querySelector('[class*="company-name"], [class*="subtitle"]');
                    const applyBtn = card.querySelector('button[aria-label*="Easy Apply"]');
                    
                    if (applyBtn) {
                        const ariaLabel = applyBtn.getAttribute('aria-label') || '';
                        const titleMatch = ariaLabel.match(/Easy Apply to (.+?) at/);
                        const companyMatch = ariaLabel.match(/at (.+)$/);
                        
                        results.push({
                            jobId: jobId,
                            title: titleMatch ? titleMatch[1] : (titleEl ? titleEl.textContent.trim() : 'Unknown'),
                            company: companyMatch ? companyMatch[1] : (companyEl ? companyEl.textContent.trim() : 'Unknown'),
                            ariaLabel: ariaLabel.substring(0, 100)
                        });
                    }
                }
                return results;
            })();
        ''')
        
        print(f"\nFound {len(jobs)} Easy Apply jobs:\n")
        for j in jobs:
            print(f"  • {j['title']}")
            print(f"    @ {j['company']}")
            print(f"    ID: {j['jobId']}")
        
        if not jobs:
            print("\n❌ No Easy Apply jobs found")
            return
        
        # Filter: skip agencies and non-matching roles
        skip_keywords = ['tcs', 'tata consultancy', 'infosys', 'wipro', 'cognizant', 'accenture']
        matching = []
        for j in jobs:
            company_lower = j.get('company', '').lower()
            if any(k in company_lower for k in skip_keywords):
                print(f"\n⏭️  SKIP (agency/large consult): {j['title']} @ {j['company']}")
            else:
                matching.append(j)
        
        print(f"\n🎯 Will apply to {len(matching)} jobs\n")
        
        results = []
        
        for i, job in enumerate(matching, 1):
            print(f"[{i}/{len(matching)}] {job['title']} @ {job['company']}")
            
            try:
                # Click Easy Apply button
                clicked = await eval_js(f'''
                    (async () => {{
                        const cards = document.querySelectorAll('[data-job-id]');
                        let targetCard = null;
                        for (let card of cards) {{
                            if (card.getAttribute('data-job-id') === '{job['jobId']}') {{
                                targetCard = card;
                                break;
                            }}
                        }}
                        if (!targetCard) return {{error: 'card not found'}};
                        
                        const btn = targetCard.querySelector('button[aria-label*="Easy Apply"]');
                        if (!btn) return {{error: 'no Easy Apply button'}};
                        
                        btn.scrollIntoView({{behavior: 'smooth', block: 'center'}});
                        await new Promise(r => setTimeout(r, 600));
                        btn.click();
                        return {{success: true}};
                    }})();
                ''')
                print(f"   ✅ Clicked Easy Apply: {clicked}")
                
                # Wait for modal to open
                time.sleep(3)
                
                # Check if application modal is open
                modal_info = await eval_js('''
                    (() => {
                        const modal = document.querySelector('.jobs-easy-apply-content, [class*="apply-form"], [class*="application-modal"]');
                        const submitBtn = document.querySelector('button[aria-label="Submit application"], button[type="submit"]');
                        const nextBtn = document.querySelector('button[aria-label="Continue to next step"]');
                        return {
                            hasModal: !!modal,
                            hasSubmit: !!submitBtn,
                            hasNext: !!nextBtn,
                            submitText: submitBtn ? submitBtn.textContent.trim() : '',
                            nextText: nextBtn ? nextBtn.textContent.trim() : ''
                        };
                    })();
                ''')
                print(f"   📋 Modal state: {modal_info}")
                
                if modal_info and modal_info.get('hasSubmit'):
                    # Single-step application — click Submit
                    print("   🎯 Single-step application — submitting...")
                    submitted = await eval_js('''
                        (async () => {
                            const submitBtn = document.querySelector('button[aria-label="Submit application"]');
                            if (!submitBtn) return {error: 'submit button gone'};
                            submitBtn.scrollIntoView({block: 'center'});
                            await new Promise(r => setTimeout(r, 500));
                            submitBtn.click();
                            await new Promise(r => setTimeout(r, 3000));
                            return {success: true};
                        })();
                    ''')
                    print(f"   ✅ Submitted: {submitted}")
                    results.append({'job': job, 'status': 'applied'})
                    
                elif modal_info and modal_info.get('hasNext'):
                    # Multi-step application — handle steps
                    print("   📄 Multi-step application...")
                    steps = 0
                    max_steps = 5
                    
                    while steps < max_steps:
                        time.sleep(2)
                        
                        # Check current state
                        state = await eval_js('''
                            (() => {
                                const submitBtn = document.querySelector('button[aria-label="Submit application"]');
                                const nextBtn = document.querySelector('button[aria-label="Continue to next step"]');
                                const reviewBtn = document.querySelector('button[aria-label="Review your application"]');
                                return {
                                    hasSubmit: !!submitBtn,
                                    hasNext: !!nextBtn,
                                    hasReview: !!reviewBtn
                                };
                            })();
                        ''')
                        
                        if state.get('hasSubmit'):
                            print("   🎯 Submitting application...")
                            await eval_js('''
                                (async () => {
                                    const btn = document.querySelector('button[aria-label="Submit application"]');
                                    btn.scrollIntoView({block: 'center'});
                                    await new Promise(r => setTimeout(r, 500));
                                    btn.click();
                                })();
                            ''')
                            time.sleep(3)
                            results.append({'job': job, 'status': 'applied'})
                            print("   ✅ Submitted!")
                            break
                            
                        elif state.get('hasNext'):
                            print(f"   ➡️  Step {steps + 1}: Clicking Next...")
                            await eval_js('''
                                (async () => {
                                    const btn = document.querySelector('button[aria-label="Continue to next step"]');
                                    btn.scrollIntoView({block: 'center'});
                                    await new Promise(r => setTimeout(r, 500));
                                    btn.click();
                                })();
                            ''')
                            
                        elif state.get('hasReview'):
                            print("   📝 Review step — clicking Review...")
                            await eval_js('''
                                (async () => {
                                    const btn = document.querySelector('button[aria-label="Review your application"]');
                                    btn.scrollIntoView({block: 'center'});
                                    await new Promise(r => setTimeout(r, 500));
                                    btn.click();
                                })();
                            ''')
                        else:
                            print("   ⚠️ No navigation buttons found")
                            break
                        
                        steps += 1
                    
                    if steps >= max_steps:
                        print("   ⚠️ Too many steps — aborting")
                        results.append({'job': job, 'status': 'error', 'detail': 'too many steps'})
                        
                else:
                    print("   ⚠️ No submit/next buttons found")
                    results.append({'job': job, 'status': 'error', 'detail': 'no action buttons'})
                
                # Close any modal
                print("   🔒 Closing modal...")
                await eval_js('''
                    (() => {
                        const closeBtns = document.querySelectorAll('button[aria-label="Dismiss"]');
                        closeBtns.forEach(btn => { if (btn.offsetParent !== null) btn.click(); });
                        // Also press Escape
                        document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', keyCode: 27}));
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
        print(f"Applied: {len(applied)}")
        print(f"Errors:  {len(errors)}")
        for r in results:
            status = "✅" if r['status'] == 'applied' else "❌"
            print(f"  {status} {r['job']['title']} @ {r['job']['company']}")
        
        with open('/Users/gagandeep/.openclaw/workspace/temp-applied.json', 'w') as f:
            json.dump(results, f, indent=2)

asyncio.run(main())
