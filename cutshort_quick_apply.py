#!/usr/bin/env python3
"""Cutshort quick apply — find and click Apply now buttons directly."""
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
        print("CUTSHORT QUICK APPLY")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        # Scroll to load jobs
        print("\nScrolling...")
        for _ in range(5):
            await eval_js('window.scrollBy(0, 1500)')
            time.sleep(2)
        
        # Get all Apply now buttons with their job info
        jobs = await eval_js('''
            (() => {
                const allBtns = document.querySelectorAll('button, a');
                let results = [];
                let seen = new Set();
                
                for (let btn of allBtns) {
                    if (btn.textContent.trim() === 'Apply now') {
                        // Walk up to find job container
                        let card = btn;
                        for (let i = 0; i < 8; i++) {
                            if (!card.parentElement) break;
                            card = card.parentElement;
                            const text = card.textContent.trim();
                            
                            // Identify job card by salary symbol
                            if (text.includes('₹') && text.length > 100) {
                                // Create unique key
                                const firstLines = text.split('\\n').filter(l => l.trim()).slice(0, 3).join('|');
                                if (!seen.has(firstLines)) {
                                    seen.add(firstLines);
                                    results.push({
                                        preview: text.substring(0, 250),
                                        hasBtn: true
                                    });
                                }
                                break;
                            }
                        }
                    }
                }
                return results;
            })();
        ''')
        
        print(f"\nFound {len(jobs)} unique jobs with Apply buttons\n")
        for i, j in enumerate(jobs):
            print(f"[{i}] {j['preview'][:100]}...")
            print()
        
        # Apply to each
        results = []
        
        for i, job in enumerate(jobs, 1):
            print(f"[{i}/{len(jobs)}] Applying...")
            
            try:
                # Click the nth Apply now button
                clicked = await eval_js(f'''
                    (async () => {{
                        const allBtns = document.querySelectorAll('button, a');
                        let applyBtns = [];
                        for (let btn of allBtns) {{
                            if (btn.textContent.trim() === 'Apply now') {{
                                applyBtns.push(btn);
                            }}
                        }}
                        
                        const btn = applyBtns[{i - 1}];
                        if (!btn) return {{error: 'button {i} not found'}};
                        
                        btn.scrollIntoView({{behavior: 'smooth', block: 'center'}});
                        await new Promise(r => setTimeout(r, 600));
                        btn.click();
                        return {{success: true}};
                    }})();
                ''')
                print(f"   ✅ Clicked: {clicked}")
                
                # Wait for modal
                time.sleep(3)
                
                # Check for success
                check = await eval_js('''
                    (() => {
                        const text = document.body.innerText;
                        return {
                            success: text.includes('Application sent') || text.includes('applied successfully'),
                            text: text.substring(0, 200)
                        };
                    })();
                ''')
                print(f"   📋 Result: {check}")
                
                if check and check.get('success'):
                    results.append({"status": "applied", "job": job['preview'][:50]})
                    print("   🎉 Applied!")
                else:
                    results.append({"status": "uncertain", "job": job['preview'][:50]})
                    print("   ⚠️ Uncertain")
                
                # Close modal
                await eval_js('document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", keyCode: 27}))')
                time.sleep(1)
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)[:100]}")
                results.append({"status": "error", "job": job['preview'][:50]})
            
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
