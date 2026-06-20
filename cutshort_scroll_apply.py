#!/usr/bin/env python3
"""Cutshort — scroll and apply to all visible jobs."""
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
        print("CUTSHORT — SCROLL & APPLY")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        # Scroll multiple times to load all jobs
        print("\nScrolling to load jobs...")
        for scroll_num in range(8):
            await eval_js('window.scrollBy(0, 1500)')
            time.sleep(2)
            print(f"  Scroll {scroll_num + 1}/8")
        
        # Get all "Apply now" buttons
        jobs = await eval_js('''
            (() => {
                const btns = document.querySelectorAll('button, a');
                let results = [];
                let seen = new Set();
                
                for (let btn of btns) {
                    if (btn.textContent.trim() === 'Apply now') {
                        let card = btn;
                        for (let i = 0; i < 8; i++) {
                            if (!card.parentElement) break;
                            card = card.parentElement;
                            const text = card.textContent.trim();
                            if (text.length > 100 && text.includes('₹')) {
                                const lines = text.split('\\n')
                                    .map(l => l.trim())
                                    .filter(l => l.length > 0 && l.length < 100);
                                
                                const key = lines.slice(0, 3).join('|');
                                if (!seen.has(key)) {
                                    seen.add(key);
                                    
                                    // Extract job title
                                    const title = lines.find(l => 
                                        l.includes('Head') || l.includes('Lead') || l.includes('Senior') || 
                                        l.includes('Engineer') || l.includes('Developer') || l.includes('Manager') || 
                                        l.includes('Architect') || l.includes('Director') || l.includes('VP')
                                    ) || lines[0];
                                    
                                    // Extract company
                                    const companyLine = lines.find(l => l.includes('at ') || l.includes('@'));
                                    const company = companyLine ? companyLine.replace(/^at /, '') : '';
                                    
                                    // Extract posted by
                                    const postedBy = lines.find(l => l.includes('Posted by')) || '';
                                    
                                    // Extract salary
                                    const salary = lines.find(l => l.includes('₹')) || '';
                                    
                                    results.push({
                                        title: title,
                                        company: company,
                                        postedBy: postedBy,
                                        salary: salary,
                                        applyBtn: true
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
        
        print(f"\nFound {len(jobs)} unique jobs:\n")
        for i, j in enumerate(jobs):
            print(f"[{i}] {j['title']}")
            print(f"    {j['company']}")
            print(f"    {j['postedBy']}")
            print(f"    {j['salary']}")
            print()
        
        # Apply to ALL jobs (including agency)
        targets = jobs
        print(f"🎯 Will apply to ALL {len(targets)} jobs\n")
        
        results = []
        
        for i, job in enumerate(targets, 1):
            print(f"[{i}/{len(targets)}] {job['title']}")
            
            try:
                # Click Apply now
                job_title_snippet = job['title'][:20].replace("'", "\\'")
                js_code = f"""
                    (async () => {{
                        const btns = document.querySelectorAll('button, a');
                        let targetBtn = null;
                        for (let btn of btns) {{
                            if (btn.textContent.trim() === "Apply now") {{
                                const card = btn.closest('[class*="sc-"]') || btn.parentElement?.parentElement?.parentElement;
                                if (card && card.textContent.includes("{job_title_snippet}")) {{
                                    targetBtn = btn;
                                    break;
                                }}
                            }}
                        }}
                        if (!targetBtn) {{
                            for (let btn of btns) {{
                                if (btn.textContent.trim() === "Apply now") {{
                                    const card = btn.closest('[class*="sc-"]') || btn.parentElement?.parentElement?.parentElement;
                                    if (card && card.textContent.includes("{job_title_snippet}")) {{
                                        targetBtn = btn;
                                        break;
                                    }}
                                }}
                            }}
                        }}
                        if (!targetBtn) return {{error: "button not found"}};
                        
                        targetBtn.scrollIntoView({{behavior: "smooth", block: "center"}});
                        await new Promise(r => setTimeout(r, 600));
                        targetBtn.click();
                        return {{success: true}};
                    }})();
                """
                clicked = await eval_js(js_code)
                print(f"   ✅ Clicked: {clicked}")
                
                # Wait for modal
                time.sleep(3)
                
                # Check for success
                confirmation = await eval_js('''
                    (() => {
                        const bodyText = document.body.innerText;
                        return {
                            hasSuccess: bodyText.includes("Application sent") || bodyText.includes("applied successfully") || bodyText.includes("successfully"),
                            preview: bodyText.substring(0, 200)
                        };
                    })();
                ''')
                print(f"   📋 Confirmation: {confirmation}")
                
                if confirmation and confirmation.get("hasSuccess"):
                    results.append({"job": job, "status": "applied"})
                    print(f"   🎉 Applied!")
                else:
                    results.append({"job": job, "status": "uncertain"})
                    print(f"   ⚠️ Uncertain")
                
                # Close modal
                await eval_js('document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", keyCode: 27}))')
                time.sleep(1)
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)[:100]}")
                results.append({"job": job, "status": "error", "detail": str(e)})
            
            time.sleep(2)
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        applied = [r for r in results if r["status"] == "applied"]
        print(f"Applied:   {len(applied)}")
        print(f"Uncertain: {len([r for r in results if r['status'] == 'uncertain'])}")
        print(f"Errors:    {len([r for r in results if r['status'] == 'error'])}")
        for r in results:
            status = "✅" if r["status"] == "applied" else ("⚠️" if r["status"] == "uncertain" else "❌")
            print(f"  {status} {r['job']['title']}")
        
        with open("/Users/gagandeep/.openclaw/workspace/temp-applied.json", "w") as f:
            json.dump(results, f, indent=2)

asyncio.run(main())
