#!/usr/bin/env python3
"""Cutshort final applier — handles modal with Send button."""
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
        print("CUTSHORT FINAL APPLY")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        # Scroll to load
        print("\nScrolling to load jobs...")
        for _ in range(5):
            await eval_js('window.scrollBy(0, 1500)')
            time.sleep(2)
        
        # Count Apply now buttons
        job_count = await eval_js('''
            (() => {
                const btns = document.querySelectorAll('button, a');
                let count = 0;
                for (let btn of btns) {
                    if (btn.textContent.trim() === 'Apply now') count++;
                }
                return count;
            })();
        ''')
        
        print(f"\nFound {job_count} jobs with Apply buttons\n")
        
        results = []
        
        for i in range(job_count):
            print(f"[{i+1}/{job_count}] Applying to job {i+1}...")
            
            try:
                # Step 1: Click the nth Apply now button
                clicked = await eval_js(f'''
                    (async () => {{
                        const btns = document.querySelectorAll('button, a');
                        let applyBtns = [];
                        for (let btn of btns) {{
                            if (btn.textContent.trim() === 'Apply now') {{
                                applyBtns.push(btn);
                            }}
                        }}
                        
                        const btn = applyBtns[{i}];
                        if (!btn) return {{error: "button not found"}};
                        
                        btn.scrollIntoView({{behavior: "smooth", block: "center"}});
                        await new Promise(r => setTimeout(r, 600));
                        btn.click();
                        return {{success: true}};
                    }})();
                ''')
                print(f"   ✅ Clicked Apply now: {clicked}")
                
                # Step 2: Wait for modal
                time.sleep(2)
                
                # Step 3: Click Send in modal
                sent = await eval_js('''
                    (async () => {
                        const modal = document.querySelector('.modal__w, [class*="modal"]');
                        if (!modal) return {error: "no modal"};
                        
                        const sendBtn = modal.querySelector('button');
                        if (!sendBtn) return {error: "no Send button"};
                        
                        sendBtn.scrollIntoView({block: "center"});
                        await new Promise(r => setTimeout(r, 500));
                        sendBtn.click();
                        return {success: true, btnText: sendBtn.textContent.trim()};
                    })();
                ''')
                print(f"   ✅ Clicked Send: {sent}")
                
                # Step 4: Wait for confirmation
                time.sleep(2)
                
                confirmation = await eval_js('''
                    (() => {
                        const text = document.body.innerText;
                        return {
                            applied: text.includes('Application sent') || text.includes('applied successfully') || text.includes('success'),
                            preview: text.substring(0, 200)
                        };
                    })();
                ''')
                print(f"   📋 Confirmation: {confirmation}")
                
                if confirmation and confirmation.get('applied'):
                    results.append({"job": f"Job {i+1}", "status": "applied"})
                    print("   🎉 Successfully applied!")
                else:
                    results.append({"job": f"Job {i+1}", "status": "uncertain"})
                    print("   ⚠️ Uncertain")
                
                # Close modal if still open
                await eval_js('document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", keyCode: 27}))')
                time.sleep(1)
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)[:100]}")
                results.append({"job": f"Job {i+1}", "status": "error"})
            
            time.sleep(2)
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        applied = [r for r in results if r["status"] == "applied"]
        print(f"Applied:   {len(applied)}")
        print(f"Uncertain: {len([r for r in results if r['status'] == 'uncertain'])}")
        print(f"Errors:    {len([r for r in results if r['status'] == 'error'])}")
        
        with open("/Users/gagandeep/.openclaw/workspace/temp-applied.json", "w") as f:
            json.dump(results, f, indent=2)

asyncio.run(main())
