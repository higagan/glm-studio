#!/usr/bin/env python3
"""LinkedIn — click job card first, then find Easy Apply in detail view (improved)."""
import asyncio, aiohttp, websockets, json, time, sys
from datetime import datetime

LOG_FILE = '/Users/gagandeep/.openclaw/workspace/job-apply-log.md'

async def main():
    async with aiohttp.ClientSession() as session:
        async with session.get('http://localhost:9222/json/list') as resp:
            pages = await resp.json()
    
    linkedin_page = next((p for p in pages if 'linkedin.com/jobs' in p.get('url', '')), None)
    if not linkedin_page:
        print("❌ No LinkedIn jobs page found in Chrome")
        return
    
    ws_url = linkedin_page['webSocketDebuggerUrl']
    print(f"✅ Connected to LinkedIn page: {linkedin_page['url'][:80]}")
    
    async with websockets.connect(ws_url) as ws:
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
        
        print(f"\nFound {len(jobs)} jobs:\n")
        for i, j in enumerate(jobs[:10]):
            print(f"[{i}] {j['title']}")
        
        results = []
        max_jobs = min(4, len(jobs))
        
        for i in range(max_jobs):
            job = jobs[i]
            job_id = job['jobId']
            title = job['title']
            print(f"\n[{i+1}/{max_jobs}] {title}")
            
            try:
                # Click the job card using querySelector with the specific data attribute
                click_result = await eval_js(f'''
                    (async () => {{
                        const card = document.querySelector('[data-occludable-job-id="{job_id}"]');
                        if (!card) return {{error: "card not found"}};
                        card.scrollIntoView({{behavior: "smooth", block: "center"}});
                        await new Promise(r => setTimeout(r, 700));
                        const link = card.querySelector('a, strong');
                        if (link) {{ link.click(); return {{clicked: "link"}}; }}
                        card.click();
                        return {{clicked: "card"}};
                    }})();
                ''')
                print(f"   Clicked card: {click_result}")
                time.sleep(3)
                
                # Wait for detail panel to load
                time.sleep(2)
                
                # Find Easy Apply button — try multiple strategies
                apply_btn = await eval_js('''
                    (() => {
                        // Strategy 1: Look in detail panel first
                        const panel = document.querySelector('.jobs-search__job-details--container') 
                            || document.querySelector('.job-view-layout') 
                            || document.querySelector('[class*="job-details"]');
                        
                        let selectors = [
                            'button[aria-label*="Easy Apply"]',
                            '.jobs-apply-button',
                            '.jobs-s-apply__actions-button',
                            'button.artdeco-button--primary',
                            '[class*="jobs-apply-button"] button',
                            '[class*="jobs-apply-button"]'
                        ];
                        
                        let searchRoot = panel || document;
                        for (let sel of selectors) {
                            const btns = searchRoot.querySelectorAll(sel);
                            for (let btn of btns) {
                                const text = btn.textContent.trim().toLowerCase();
                                const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                                if ((text.includes('easy apply') || aria.includes('easy apply')) &&
                                    !text.includes('filter') && !aria.includes('filter')) {
                                    return {found: true, text: btn.textContent.trim(), ariaLabel: btn.getAttribute('aria-label'), selector: sel};
                                }
                            }
                        }
                        
                        // Strategy 2: Search entire document
                        const allBtns = document.querySelectorAll('button, a, [role="button"]');
                        for (let btn of allBtns) {
                            const text = btn.textContent.trim().toLowerCase();
                            const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                            const className = (btn.className || '').toLowerCase();
                            if ((text.includes('easy apply') || aria.includes('easy apply')) &&
                                !className.includes('pill') && 
                                !className.includes('choice') &&
                                !text.includes('filter') && 
                                !aria.includes('filter')) {
                                return {found: true, text: btn.textContent.trim(), ariaLabel: btn.getAttribute('aria-label'), selector: 'global'};
                            }
                        }
                        return {found: false};
                    })();
                ''')
                print(f"   Apply button: {apply_btn}")
                
                if not apply_btn or not apply_btn.get('found'):
                    print("   No Easy Apply in detail view")
                    results.append({'job': job, 'status': 'no_easy_apply'})
                    continue
                
                # Click Easy Apply
                print("   Clicking Easy Apply...")
                await eval_js('''
                    (async () => {
                        const allBtns = document.querySelectorAll('button, a, [role="button"]');
                        let target = null;
                        for (let btn of allBtns) {
                            const text = btn.textContent.trim().toLowerCase();
                            const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                            const className = (btn.className || '').toLowerCase();
                            if ((text.includes('easy apply') || aria.includes('easy apply')) && 
                                !className.includes('pill') && 
                                !className.includes('choice') &&
                                !aria.includes('filter')) {
                                target = btn;
                                break;
                            }
                        }
                        if (!target) return {error: "not found"};
                        target.scrollIntoView({block: "center"});
                        await new Promise(r => setTimeout(r, 500));
                        target.click();
                        return {success: true, text: target.textContent.trim()};
                    })();
                ''')
                
                time.sleep(3)
                
                # Handle application flow
                steps = 0
                applied = False
                stuck_counter = 0
                while steps < 8 and stuck_counter < 3:
                    time.sleep(2)
                    
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
                    print(f"   Step {steps+1}: submit={state.get('hasSubmit')} next={state.get('hasNext')} review={state.get('hasReview')} applied={state.get('alreadyApplied')} modal={state.get('modalOpen')}")
                    
                    if state.get('errorText'):
                        print(f"   ⚠️ Error: {state['errorText']}")
                    
                    if state.get('alreadyApplied'):
                        applied = True
                        break
                    elif state.get('hasSubmit'):
                        print("   Submitting...")
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
                        time.sleep(3)
                        applied = True
                        break
                    elif state.get('hasReview'):
                        print("   Review...")
                        await eval_js('document.querySelector("button[aria-label=\"Review your application\"]").click()')
                        stuck_counter += 1
                    elif state.get('hasNext'):
                        print("   Next...")
                        await eval_js('document.querySelector("button[aria-label=\"Continue to next step\"]").click()')
                        stuck_counter = 0
                    else:
                        print("   No buttons found")
                        if not state.get('modalOpen'):
                            print("   Modal closed")
                            break
                        stuck_counter += 1
                    steps += 1
                
                if applied:
                    results.append({'job': job, 'status': 'applied'})
                    print("   ✅ Applied!")
                else:
                    results.append({'job': job, 'status': 'uncertain'})
                    print("   ❓ Uncertain")
                
                # Close modal
                await eval_js('document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", keyCode: 27}))')
                time.sleep(1)
                
            except Exception as e:
                print(f"   Error: {str(e)[:100]}")
                results.append({'job': job, 'status': 'error', 'detail': str(e)})
            
            time.sleep(3)
        
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        applied_count = len([r for r in results if r['status'] == 'applied'])
        uncertain_count = len([r for r in results if r['status'] == 'uncertain'])
        skipped_count = len([r for r in results if r['status'] == 'no_easy_apply'])
        print(f"Applied: {applied_count}/{max_jobs}")
        print(f"Uncertain: {uncertain_count}/{max_jobs}")
        print(f"No Easy Apply: {skipped_count}/{max_jobs}")
        for r in results:
            if r['status'] == 'applied':
                status = "OK"
            elif r['status'] == 'no_easy_apply':
                status = "SKIP"
            elif r['status'] == 'uncertain':
                status = "?"
            else:
                status = "FAIL"
            print(f"  {status} {r['job']['title']}")
        
        # Append to log
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(f"\n## LinkedIn run {datetime.now():%Y-%m-%d %H:%M}\n")
            for r in results:
                f.write(f"- [{r['status']}] {r['job']['title']}\n")
            f.write(f"- Summary: Applied {applied_count}/{max_jobs}, Uncertain {uncertain_count}, Skipped {skipped_count}\n")
        
        save_data = {
            'platform': 'linkedin',
            'timestamp': datetime.now().isoformat(),
            'total_attempted': max_jobs,
            'total_applied': applied_count,
            'results': results
        }
        with open('/Users/gagandeep/.openclaw/workspace/last_run_linkedin.json', 'w') as f:
            json.dump(save_data, f, indent=2)

asyncio.run(main())
