#!/usr/bin/env python3
"""Instahyre applier — simple and direct."""
import asyncio, websockets, json, time
from datetime import datetime

WS_URL = 'ws://localhost:9222/devtools/page/579380F947CEFDCB356E222E52F92E39'

async def send_cmd(ws, method, params):
    msg_id = int(time.time() * 1000000) % 1000000000
    payload = json.dumps({'id': msg_id, 'method': method, 'params': params})
    await ws.send(payload)
    resp = json.loads(await ws.recv())
    return resp

async def eval_js(ws, expr):
    resp = await send_cmd(ws, 'Runtime.evaluate', {
        'expression': expr, 'returnByValue': True, 'awaitPromise': True
    })
    result = resp.get('result', {})
    if 'exceptionDetails' in result:
        desc = result['exceptionDetails'].get('exception', {}).get('description', 'Unknown error')
        raise Exception(f"JS Error: {desc}")
    return result.get('result', {}).get('value')

async def main():
    async with websockets.connect(WS_URL) as ws:
        print("=" * 60)
        print("INSTAHYRE APPLICATION BOT")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        # Get list of jobs
        jobs_data = await eval_js(ws, '''
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
                        hasBtn: !!btn,
                        btnText: btn ? btn.textContent.trim() : 'none'
                    });
                }
                return results;
            })();
        ''')
        
        print(f"\nFound {len(jobs_data)} jobs:")
        for j in jobs_data:
            print(f"  [{j['index']}] {j['text']}")
        
        # Filter matching jobs
        matching = []
        for j in jobs_data:
            text = j.get('text', '').lower()
            if any(k in text for k in ['java', '.net']) and not any(k in text for k in ['python', 'golang', 'go engineer', 'genai', 'llm']):
                print(f"  ⏭️  SKIP (Java/.NET): {j['text']}")
            elif j.get('hasBtn'):
                matching.append(j)
        
        print(f"\n🎯 Applying to {len(matching)} matching jobs\n")
        
        results = []
        
        for i, job in enumerate(matching, 1):
            idx = job['index']
            text = job['text']
            company = text.split(' - ')[0] if ' - ' in text else text
            title = text.split(' - ')[1] if ' - ' in text else text
            
            print(f"[{i}/{len(matching)}] {title} @ {company}")
            
            # Click View button
            try:
                clicked = await eval_js(ws, f'''
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
                        return {{success: true, text: btn.textContent.trim()}};
                    }})();
                ''')
                print(f"   ✅ Clicked: {clicked}")
            except Exception as e:
                print(f"   ❌ Click error: {e}")
                results.append({'job': text, 'status': 'error', 'detail': str(e)})
                continue
            
            # Wait for detail page
            time.sleep(3)
            url = await eval_js(ws, 'window.location.href')
            print(f"   📍 URL: {url}")
            
            # Check for apply button
            try:
                btn_info = await eval_js(ws, '''
                    (() => {
                        const all = document.querySelectorAll('button, a');
                        for (let b of all) {
                            const t = b.textContent.trim().toLowerCase();
                            if ((t.includes('apply') && !t.includes('not')) || t.includes('interest') || t.includes('send')) {
                                return {found: true, text: b.textContent.trim()};
                            }
                        }
                        return {found: false};
                    })();
                ''')
            except Exception as e:
                btn_info = {'found': False, 'error': str(e)}
            
            print(f"   🔍 Apply button: {btn_info}")
            
            if btn_info and btn_info.get('found'):
                btn_text = btn_info.get('text', '')
                print(f"   🎯 Clicking: '{btn_text}'")
                
                try:
                    applied = await eval_js(ws, '''
                        (async () => {
                            const all = document.querySelectorAll('button, a');
                            let target = null;
                            for (let b of all) {
                                const t = b.textContent.trim().toLowerCase();
                                if ((t.includes('apply') && !t.includes('not')) || t.includes('interest') || t.includes('send')) {
                                    target = b; break;
                                }
                            }
                            if (!target) return {error: 'button gone'};
                            
                            target.scrollIntoView({block: 'center'});
                            await new Promise(r => setTimeout(r, 500));
                            target.click();
                            await new Promise(r => setTimeout(r, 2000));
                            
                            return {success: true, text: document.body.innerText.includes('Applied')};
                        })();
                    ''')
                    print(f"   ✅ Applied: {applied}")
                    results.append({'job': text, 'status': 'applied'})
                except Exception as e:
                    print(f"   ❌ Apply error: {e}")
                    results.append({'job': text, 'status': 'error', 'detail': str(e)})
            else:
                print(f"   ⚠️ No apply button")
                results.append({'job': text, 'status': 'error', 'detail': 'no button'})
            
            # Go back
            print("   ↩️  Going back...")
            try:
                await eval_js(ws, 'window.history.back()')
            except:
                pass
            time.sleep(2)
            
            # Wait for list page
            for _ in range(10):
                try:
                    has_list = await eval_js(ws, 'document.querySelector(".candidate-opportunities") !== null')
                    if has_list:
                        break
                except:
                    pass
                time.sleep(0.5)
            
            time.sleep(2)
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        applied = [r for r in results if r['status'] == 'applied']
        errors = [r for r in results if r['status'] == 'error']
        print(f"Total:   {len(results)}")
        print(f"Applied: {len(applied)}")
        print(f"Errors:  {len(errors)}")
        for r in results:
            status = "✅" if r['status'] == 'applied' else "❌"
            print(f"  {status} {r['job']}")
        
        with open('/Users/gagandeep/.openclaw/workspace/temp-applied.json', 'w') as f:
            json.dump(results, f, indent=2)
        print("\n💾 Results saved.")

asyncio.run(main())
