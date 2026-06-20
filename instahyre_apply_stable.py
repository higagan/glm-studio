#!/usr/bin/env python3
"""Stable Instahyre applier — re-scans DOM after each application."""
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
        
        async def close_modals():
            await eval_js('''
                (() => {
                    const btns = document.querySelectorAll('.application-modal-close, .back-button-modal-close');
                    btns.forEach(btn => { if (btn.offsetParent !== null) btn.click(); });
                    return 'done';
                })();
            ''')
            time.sleep(0.5)
        
        async def get_jobs():
            return await eval_js('''
                (() => {
                    const jobNames = document.querySelectorAll('.employer-job-name');
                    let results = [];
                    for (let i = 0; i < jobNames.length; i += 2) {
                        const jobName = jobNames[i];
                        const text = jobName.textContent.trim();
                        const parent = jobName.closest('.row') || jobName.parentElement?.parentElement?.parentElement;
                        const btn = parent ? parent.querySelector('#interested-btn') : null;
                        results.push({index: i/2, text: text, hasBtn: !!btn});
                    }
                    return results;
                })();
            ''')
        
        async def find_job_index(jobs, company_name):
            for j in jobs:
                if company_name.lower() in j.get('text', '').lower():
                    return j.get('index')
            return None
        
        async def open_job_modal(idx):
            return await eval_js(f'''
                (async () => {{
                    const jobNames = document.querySelectorAll('.employer-job-name');
                    const jobName = jobNames[{idx} * 2];
                    if (!jobName) return {{error: 'job not found'}};
                    
                    const parent = jobName.closest('.row') || jobName.parentElement?.parentElement?.parentElement;
                    if (!parent) return {{error: 'no parent'}};
                    
                    const btn = parent.querySelector('#interested-btn');
                    if (!btn) return {{error: 'no button'}};
                    
                    btn.scrollIntoView({{behavior: 'smooth', block: 'center'}});
                    await new Promise(r => setTimeout(r, 600));
                    btn.click();
                    return {{success: true}};
                }})();
            ''')
        
        async def apply_in_modal():
            return await eval_js('''
                (async () => {
                    const modal = document.querySelector('.application-modal.candidate-apply-modal');
                    if (!modal) return {error: 'modal not found'};
                    
                    const btns = modal.querySelectorAll('button, a');
                    let applyBtn = null;
                    for (let b of btns) {
                        const t = b.textContent.trim().toLowerCase();
                        if (t === 'apply' || t === 'apply now') {
                            applyBtn = b;
                            break;
                        }
                    }
                    
                    if (!applyBtn) return {error: 'no Apply button'};
                    
                    applyBtn.scrollIntoView({block: 'center'});
                    await new Promise(r => setTimeout(r, 500));
                    applyBtn.click();
                    await new Promise(r => setTimeout(r, 3000));
                    
                    const bodyText = document.body.innerText;
                    const success = bodyText.includes('Application successful') || bodyText.includes('applied successfully');
                    return {success: true, applied: success};
                })();
            ''')
        
        # Close any open modals
        print("Closing any open modals...")
        await close_modals()
        
        print("=" * 60)
        print("INSTAHYRE APPLICATION — Stable Mode")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        # Target companies to apply to
        targets = [
            'Nexthink',
            'NTT Data', 
            'The Walt Disney Company',
            'Imagine Learning',
            'Alation',
            'Walmart Global Tech India'
        ]
        
        results = []
        
        for company in targets:
            print(f"\n🎯 Looking for: {company}")
            
            # Re-scan jobs each time
            jobs = await get_jobs()
            
            # Find the job
            idx = await find_job_index(jobs, company)
            if idx is None:
                print(f"   ❌ Not found in current list")
                results.append({'company': company, 'status': 'not_found'})
                continue
            
            job_text = [j for j in jobs if j.get('index') == idx]
            if job_text:
                print(f"   📋 Found: {job_text[0]['text']}")
            
            # Open modal
            try:
                opened = await open_job_modal(idx)
                print(f"   ✅ Opened modal: {opened}")
            except Exception as e:
                print(f"   ❌ Failed to open: {e}")
                results.append({'company': company, 'status': 'error', 'detail': str(e)})
                continue
            
            # Wait for modal
            time.sleep(3)
            
            # Apply
            try:
                result = await apply_in_modal()
                print(f"   ✅ Apply result: {result}")
                
                if result and result.get('applied'):
                    results.append({'company': company, 'status': 'applied'})
                    print(f"   🎉 Successfully applied to {company}!")
                else:
                    results.append({'company': company, 'status': 'uncertain'})
                    print(f"   ⚠️ Uncertain result for {company}")
            except Exception as e:
                print(f"   ❌ Apply error: {e}")
                results.append({'company': company, 'status': 'error', 'detail': str(e)})
            
            # Close modal and wait
            await close_modals()
            time.sleep(2)
            
            # Wait for page to settle
            for _ in range(10):
                jobs_check = await get_jobs()
                if len(jobs_check) >= 6:
                    break
                time.sleep(0.5)
            time.sleep(2)
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        applied = [r for r in results if r['status'] == 'applied']
        uncertain = [r for r in results if r['status'] == 'uncertain']
        not_found = [r for r in results if r['status'] == 'not_found']
        errors = [r for r in results if r['status'] == 'error']
        
        print(f"Applied:     {len(applied)}")
        print(f"Uncertain:   {len(uncertain)}")
        print(f"Not found:   {len(not_found)}")
        print(f"Errors:      {len(errors)}")
        
        for r in results:
            if r['status'] == 'applied':
                print(f"  ✅ {r['company']}")
            elif r['status'] == 'uncertain':
                print(f"  ⚠️ {r['company']}")
            elif r['status'] == 'not_found':
                print(f"  🔍 {r['company']}")
            else:
                print(f"  ❌ {r['company']}: {r.get('detail', '')}")
        
        with open('/Users/gagandeep/.openclaw/workspace/temp-applied.json', 'w') as f:
            json.dump(results, f, indent=2)
        print("\n💾 Results saved.")

asyncio.run(main())
