#!/usr/bin/env python3
"""Instahyre applier — proper card targeting."""
import asyncio, websockets, json, time
from datetime import datetime

WS = 'ws://localhost:9222/devtools/page/579380F947CEFDCB356E222E52F92E39'

async def main():
    async with websockets.connect(WS) as ws:
        async def eval_js(expr):
            msg_id = int(time.time() * 1000)
            payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate', 
                'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp.get('result', {}).get('result', {}).get('value')
        
        # Jobs to apply (indices 0-7, matching stack)
        jobs = [
            (1, 'Nexthink',         'Engineering Manager'),
            (2, 'NTT Data',          'AI Security Architect'),
            (3, 'Disney',            'Sr. Product Software Engineering Manager'),
            (4, 'Imagine Learning',  'Staff Engineer'),
            (5, 'Alation',           'Senior Software Engineer'),
            (6, 'Walmart',           'Golang Engineer - T1 Proxy'),
        ]

        print("=" * 60)
        print("INSTAHYRE APPLICATION")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        results = []
        
        for i, (idx, company, title) in enumerate(jobs, 1):
            print(f"\n[{i}/{len(jobs)}] {title} @ {company}")
            
            # Click the correct View button
            clicked = await eval_js(f'''
                (async () => {{
                    const jobNames = document.querySelectorAll('.employer-job-name');
                    const jobName = jobNames[{idx * 2}]; // desktop version
                    if (!jobName) return {{error: 'job name {idx} not found'}};
                    
                    const parent = jobName.closest('.row') || jobName.parentElement?.parentElement?.parentElement;
                    if (!parent) return {{error: 'parent not found'}};
                    
                    const btn = parent.querySelector('#interested-btn');
                    if (!btn) return {{error: 'no button in parent'}};
                    
                    btn.scrollIntoView({{behavior: 'smooth', block: 'center'}});
                    await new Promise(r => setTimeout(r, 600));
                    btn.click();
                    return {{success: true, btnText: btn.textContent.trim()}};
                }})();
            ''')
            print(f"   Clicked View: {clicked}")
            
            # Wait for navigation
            time.sleep(3)
            url = await eval_js('window.location.href')
            print(f"   URL: {url}")
            
            # If we're still on list page, the click might have been intercepted
            if 'opportunities/?matching=true' in (url or ''):
                print("   ⚠️ Still on list page — checking if Angular navigation happened...")
                # Maybe Angular changed URL without full navigation
                time.sleep(2)
                url = await eval_js('window.location.href')
                print(f"   URL after wait: {url}")
            
            # Look for apply/interest button on detail page
            btn_info = await eval_js('''
                (() => {
                    const btns = document.querySelectorAll('button, a, input[type="submit"]');
                    for (let b of btns) {
                        const t = b.textContent.trim().toLowerCase();
                        if ((t.includes('apply') && !t.includes('not')) || t.includes('interest') || t.includes("i'm interested") || t.includes('send')) {
                            return {found: true, text: b.textContent.trim(), tag: b.tagName};
                        }
                    }
                    return {found: false, pageText: document.body.innerText.substring(0,200)};
                })();
            ''')
            print(f"   Button search: {btn_info}")
            
            if btn_info and btn_info.get('found'):
                btn_text = btn_info.get('text', '')
                print(f"   🎯 Found: '{btn_text}'")
                
                # Click it
                click_result = await eval_js('''
                    (async () => {
                        const btns = document.querySelectorAll('button, a, input[type="submit"]');
                        let target = null;
                        for (let b of btns) {
                            const t = b.textContent.trim().toLowerCase();
                            if ((t.includes('apply') && !t.includes('not')) || t.includes('interest') || t.includes('send')) {
                                target = b; break;
                            }
                        }
                        if (!target) return {error: 'button disappeared'};
                        
                        target.scrollIntoView({behavior: 'smooth', block: 'center'});
                        await new Promise(r => setTimeout(r, 500));
                        target.click();
                        await new Promise(r => setTimeout(r, 2000));
                        
                        // Check for success indicators
                        const toast = document.querySelector('.toast, .notification, .alert-success, [class*="success"]');
                        const bodyText = document.body.innerText;
                        return {
                            success: true,
                            hasToast: !!toast,
                            toastText: toast ? toast.textContent.trim().substring(0,100) : '',
                            hasAppliedText: bodyText.includes('Applied') || bodyText.includes('applied')
                        };
                    })();
                ''')
                print(f"   Applied: {click_result}")
                
                if click_result and click_result.get('success'):
                    results.append({'company': company, 'title': title, 'status': 'applied'})
                else:
                    results.append({'company': company, 'title': title, 'status': 'error', 'error': 'click failed'})
            else:
                print(f"   ⚠️ No apply button found")
                page_preview = (btn_info.get('pageText', '')[:80] if btn_info else '')
                if page_preview:
                    print(f"   Page preview: {page_preview}...")
                results.append({'company': company, 'title': title, 'status': 'error', 'error': 'no apply button'})
            
            # Go back to list
            print("   ↩️  Going back to list...")
            await eval_js('window.history.back()')
            time.sleep(2)
            for _ in range(10):
                has_list = await eval_js('document.querySelector(".candidate-opportunities") !== null')
                if has_list:
                    break
                time.sleep(0.5)
            time.sleep(2)

        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        applied = [r for r in results if r['status'] == 'applied']
        errors = [r for r in results if r['status'] == 'error']
        print(f"Total matching:  {len(jobs)}")
        print(f"Applied:         {len(applied)}")
        print(f"Errors:          {len(errors)}")
        for r in results:
            emoji = "✅" if r['status'] == 'applied' else "❌"
            print(f"  {emoji} {r['title']} @ {r['company']}")
        
        with open('/Users/gagandeep/.openclaw/workspace/temp-applied.json', 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n💾 Results saved.")

asyncio.run(main())
