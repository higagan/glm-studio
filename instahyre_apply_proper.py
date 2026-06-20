#!/usr/bin/env python3
"""Proper Instahyre applier with modal handling."""
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
        
        # Close any open modal first
        print("Closing any open modals...")
        await eval_js('''
            (() => {
                const closeBtns = document.querySelectorAll('.application-modal-close, .back-button-modal-close');
                closeBtns.forEach(btn => { if (btn.offsetParent !== null) btn.click(); });
                return 'closed';
            })();
        ''')
        time.sleep(1)
        
        # Get job list
        jobs_data = await eval_js('''
            (() => {
                const jobNames = document.querySelectorAll('.employer-job-name');
                let results = [];
                for (let i = 0; i < jobNames.length; i += 2) {
                    const jobName = jobNames[i];
                    const parent = jobName.closest('.row') || jobName.parentElement?.parentElement?.parentElement;
                    const btn = parent ? parent.querySelector('#interested-btn') : null;
                    results.push({
                        index: i/2,
                        text: jobName.textContent.trim(),
                        hasBtn: !!btn
                    });
                }
                return results;
            })();
        ''')
        
        print("=" * 60)
        print("INSTAHYRE APPLICATION")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        print(f"\nFound {len(jobs_data)} jobs:")
        for j in jobs_data:
            print(f"  [{j['index']}] {j['text']}")
        
        # Filter matching jobs
        matching = []
        for j in jobs_data:
            text = j.get('text', '').lower()
            # Skip Java-only and .NET
            if any(k in text for k in ['java lead', 'java developer', '.net', 'dotnet']):
                print(f"  ⏭️  SKIP: {j['text']}")
            elif j.get('hasBtn'):
                matching.append(j)
        
        print(f"\n🎯 Will apply to {len(matching)} matching jobs\n")
        
        results = []
        
        for i, job in enumerate(matching, 1):
            idx = job['index']
            text = job['text']
            company = text.split(' - ')[0] if ' - ' in text else text
            title = text.split(' - ')[1] if ' - ' in text else text
            
            print(f"[{i}/{len(matching)}] {title} @ {company}")
            
            try:
                # Step 1: Click the specific View button
                clicked = await eval_js(f'''
                    (async () => {{
                        const jobNames = document.querySelectorAll('.employer-job-name');
                        const jobName = jobNames[{idx * 2}];
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
                print(f"   ✅ Opened modal: {clicked}")
                
                # Step 2: Wait for modal to load
                time.sleep(3)
                
                # Step 3: Verify modal has the right job
                modal_job = await eval_js('''
                    (() => {
                        const modal = document.querySelector('.application-modal.candidate-apply-modal');
                        if (!modal) return {error: 'no modal'};
                        const title = modal.querySelector('.right-section-modal h3, .right-section-modal .job-title');
                        const company = modal.querySelector('.right-section-modal h4, .right-section-modal .company-name');
                        return {
                            title: title ? title.textContent.trim() : 'unknown',
                            company: company ? company.textContent.trim() : 'unknown'
                        };
                    })();
                ''')
                print(f"   📋 Modal shows: {modal_job}")
                
                # Step 4: Find and click Apply button in modal
                apply_result = await eval_js('''
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
                        
                        if (!applyBtn) return {error: 'no Apply button', buttons: Array.from(btns).map(b => b.textContent.trim()).filter(Boolean)};
                        
                        applyBtn.scrollIntoView({block: 'center'});
                        await new Promise(r => setTimeout(r, 500));
                        applyBtn.click();
                        await new Promise(r => setTimeout(r, 3000));
                        
                        // Check for success
                        const bodyText = document.body.innerText;
                        const success = bodyText.includes('Application successful') || bodyText.includes('applied successfully');
                        
                        return {success: true, applied: success};
                    })();
                ''')
                print(f"   ✅ Apply result: {apply_result}")
                
                if apply_result and apply_result.get('applied'):
                    results.append({'job': text, 'status': 'applied'})
                    print(f"   🎉 Successfully applied!")
                else:
                    results.append({'job': text, 'status': 'uncertain'})
                    print(f"   ⚠️ Applied but no success confirmation")
                
                # Step 5: Close modal
                print("   🔒 Closing modal...")
                await eval_js('''
                    (() => {
                        const closeBtns = document.querySelectorAll('.application-modal-close, .back-button-modal-close');
                        closeBtns.forEach(btn => { if (btn.offsetParent !== null) btn.click(); });
                        return 'closed';
                    })();
                ''')
                time.sleep(1)
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)[:100]}")
                results.append({'job': text, 'status': 'error', 'detail': str(e)})
                # Try to close modal
                try:
                    await eval_js('document.querySelector(".application-modal-close")?.click()')
                except:
                    pass
            
            time.sleep(2)
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        applied = [r for r in results if r['status'] == 'applied']
        uncertain = [r for r in results if r['status'] == 'uncertain']
        errors = [r for r in results if r['status'] == 'error']
        
        print(f"Applied:     {len(applied)}")
        print(f"Uncertain:   {len(uncertain)}")
        print(f"Errors:      {len(errors)}")
        
        for r in results:
            status = "✅" if r['status'] == 'applied' else ("⚠️" if r['status'] == 'uncertain' else "❌")
            print(f"  {status} {r['job']}")
        
        with open('/Users/gagandeep/.openclaw/workspace/temp-applied.json', 'w') as f:
            json.dump(results, f, indent=2)
        print("\n💾 Results saved.")

asyncio.run(main())
