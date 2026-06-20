#!/usr/bin/env python3
"""Cutshort — apply to jobs with fresh Chrome session detection."""
import asyncio, aiohttp, websockets, json, time
from datetime import datetime

async def get_cutshort_page():
    """Find Cutshort page in Chrome and return websocket URL."""
    async with aiohttp.ClientSession() as session:
        async with session.get('http://localhost:9222/json/list') as resp:
            pages = await resp.json()
            for p in pages:
                if 'cutshort' in p.get('url', ''):
                    return p['webSocketDebuggerUrl']
    return None

async def main():
    ws_url = await get_cutshort_page()
    
    if not ws_url:
        print("❌ No Cutshort page found in Chrome")
        print("Please navigate to Cutshort jobs page first")
        return
    
    async with websockets.connect(ws_url) as ws:
        async def eval_js(expr):
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp.get('result', {}).get('result', {}).get('value')
        
        print("=" * 60)
        print("CUTSHORT APPLY")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        # Check current URL
        current_url = await eval_js('window.location.href')
        print(f"Current URL: {current_url}")
        
        if 'cutshort.io' not in current_url:
            print("⚠️ Not on Cutshort. Navigating...")
            await ws.send(json.dumps({
                'id': 1, 'method': 'Page.navigate',
                'params': {'url': 'https://cutshort.io/profile/all-jobs?matchesfor=56a5ee3ac38a97570a55d98a'}
            }))
            await ws.recv()
            time.sleep(5)
        
        # Scroll to load jobs
        print("\nScrolling to load jobs...")
        for _ in range(8):
            await eval_js('window.scrollBy(0, 1500)')
            time.sleep(2)
        
        # Count Apply now buttons
        count = await eval_js('''
            (() => {
                const btns = document.querySelectorAll('button, a');
                let count = 0;
                for (let btn of btns) {
                    if (btn.textContent.trim() === 'Apply now') count++;
                }
                return count;
            })();
        ''')
        
        print(f"\nFound {count} jobs with Apply buttons")
        
        to_apply = min(10, count)
        print(f"Will apply to {to_apply} jobs\n")
        
        results = []
        
        for i in range(to_apply):
            print(f"[{i+1}/{to_apply}] Applying to job {i+1}...")
            
            try:
                # Click the nth Apply now button
                clicked = await eval_js(f'''
                    (async () => {{
                        const allBtns = document.querySelectorAll("button, a");
                        let applyBtns = [];
                        for (let btn of allBtns) {{
                            if (btn.textContent.trim() === "Apply now") {{
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
                print(f"   Clicked Apply now: {clicked}")
                
                time.sleep(2)
                
                # Click Send in modal
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
                print(f"   Clicked Send: {sent}")
                
                time.sleep(2)
                
                confirmation = await eval_js('''
                    (() => {
                        const text = document.body.innerText;
                        return {
                            applied: text.includes("Application sent") || text.includes("applied successfully") || text.includes("successfully"),
                            preview: text.substring(0, 150)
                        };
                    })();
                ''')
                print(f"   Confirmation: {confirmation}")
                
                if confirmation and confirmation.get("applied"):
                    results.append({"job": f"Job {i+1}", "status": "applied"})
                    print("   Applied!")
                else:
                    results.append({"job": f"Job {i+1}", "status": "uncertain"})
                    print("   Uncertain")
                
                # Close modal
                await eval_js('document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", keyCode: 27}))')
                time.sleep(1)
                
            except Exception as e:
                print(f"   Error: {str(e)[:100]}")
                results.append({"job": f"Job {i+1}", "status": "error"})
            
            time.sleep(2)
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        applied = [r for r in results if r["status"] == "applied"]
        print(f"Applied:   {len(applied)}/{to_apply}")
        print(f"Uncertain: {len([r for r in results if r['status'] == 'uncertain'])}")
        print(f"Errors:    {len([r for r in results if r['status'] == 'error'])}")
        
        with open("/Users/gagandeep/.openclaw/workspace/temp-applied.json", "w") as f:
            json.dump(results, f, indent=2)

asyncio.run(main())
