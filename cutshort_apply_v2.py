#!/usr/bin/env python3
"""Cutshort applier — clean version."""
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
        print("CUTSHORT APPLICATION")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        # Scroll to load
        print("\nLoading jobs...")
        for _ in range(3):
            await eval_js('window.scrollBy(0, 1000)')
            time.sleep(2)
        
        # Get jobs by finding "Apply now" buttons and their parent containers
        jobs = await eval_js('''
            (() => {
                const btns = document.querySelectorAll('button, a');
                let results = [];
                let seen = new Set();
                
                for (let btn of btns) {
                    if (btn.textContent.trim() === 'Apply now') {
                        // Walk up to find the job card container
                        let card = btn;
                        for (let i = 0; i < 6; i++) {
                            if (!card.parentElement) break;
                            card = card.parentElement;
                            // Check if this container has job info
                            const text = card.textContent.trim();
                            if (text.length > 100 && (text.includes('years') || text.includes('₹'))) {
                                // Found the card
                                const lines = text.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
                                const key = lines.slice(0, 3).join('|');
                                if (!seen.has(key)) {
                                    seen.add(key);
                                    const title = lines.find(l => l.includes('Head') || l.includes('Lead') || l.includes('Senior') || l.includes('Engineer') || l.includes('Developer') || l.includes('Manager') || l.includes('Architect')) || lines[0];
                                    const company = lines.find(l => l.includes('at ') || l.includes('Company')) || '';
                                    const postedBy = lines.find(l => l.includes('Posted by')) || '';
                                    const salary = lines.find(l => l.includes('₹')) || '';
                                    const exp = lines.find(l => l.includes('years') || l.includes('yr')) || '';
                                    
                                    results.push({
                                        title: title,
                                        company: company,
                                        postedBy: postedBy,
                                        salary: salary,
                                        experience: exp,
                                        fullText: text.substring(0, 300)
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
            print(f"    {j['salary']} | {j['experience']}")
            print()
        
        # Filter: skip agencies
        skip_agencies = ['HyrHub', 'Vikash Technologies', 'Peak Hire', 'People Impact', 'Talentojcom', 'Fx31labs', 'Redfoxa', 'Supersourcing']
        matching = []
        
        for j in jobs:
            posted_by = j.get('postedBy', '').lower()
            is_agency = any(agency.lower() in posted_by for agency in skip_agencies)
            
            if is_agency:
                print(f"⏭️  SKIP (agency): {j['title']} — {j['postedBy']}")
            else:
                matching.append(j)
        
        print(f"\n🎯 Will apply to {len(matching)} jobs\n")
        
        results = []
        
        for i, job in enumerate(matching[:10], 1):  # Max 10/day
            print(f"[{i}/{len(matching)}] {job['title']}")
            
            try:
                # Click Apply now
                clicked = await eval_js(f'''
                    (async () => {{
                        const btns = document.querySelectorAll('button, a');
                        let targetBtn = null;
                        for (let btn of btns) {{
                            if (btn.textContent.trim() === 'Apply now') {{
                                const card = btn.closest('[class*="sc-"]') || btn.parentElement?.parentElement?.parentElement;
                                if (card && card.textContent.includes("{job['title'][:20]}")) {{
                                    targetBtn = btn;
                                    break;
                                }}
                            }}
                        }}
                        if (!targetBtn) {{
                            // Fallback: click first Apply now with matching title
                            for (let btn of btns) {{
                                if (btn.textContent.trim() === 'Apply now') {{
                                    const card = btn.closest('[class*="sc-"]') || btn.parentElement?.parentElement?.parentElement;
                                    if (card && card.textContent.includes("{job['title'][:20]}")) {{
                                        targetBtn = btn;
                                        break;
                                    }}
                                }}
                            }}
                        }}
                        if (!targetBtn) return {{error: 'button not found'}};
                        
                        targetBtn.scrollIntoView({{behavior: 'smooth', block: 'center'}});
                        await new Promise(r => setTimeout(r, 600));
                        targetBtn.click();
                        return {{success: true}};
                    }})();
                ''')
                print(f"   ✅ Clicked: {clicked}")
                
                # Wait for modal
                time.sleep(3)
                
                # Check for confirmation
                confirmation = await eval_js('''
                    (() => {
                        const bodyText = document.body.innerText;
                        return {
                            hasSuccess: bodyText.includes('Application sent') || bodyText.includes('applied successfully') || bodyText.includes('success'),
                            hasModal: document.querySelector('[class*="modal"], [class*="dialog"]') !== null,
                            preview: bodyText.substring(0, 200)
                        };
                    })();
                ''')
                print(f"   📋 Confirmation: {confirmation}")
                
                if confirmation and confirmation.get('hasSuccess'):
                    results.append({'job': job, 'status': 'applied'})
                    print(f"   🎉 Applied!")
                else:
                    results.append({'job': job, 'status': 'uncertain'})
                    print(f"   ⚠️ Uncertain")
                
                # Close any modal
                await eval_js('document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", keyCode: 27}))')
                time.sleep(1)
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)[:100]}")
                results.append({'job': job, 'status': 'error', 'detail': str(e)})
            
            time.sleep(2)
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        applied = [r for r in results if r['status'] == 'applied']
        print(f"Applied:   {len(applied)}")
        print(f"Uncertain: {len([r for r in results if r['status'] == 'uncertain'])}")
        print(f"Errors:    {len([r for r in results if r['status'] == 'error'])}")
        for r in results:
            status = "✅" if r['status'] == 'applied' else ("⚠️" if r['status'] == 'uncertain' else "❌")
            print(f"  {status} {r['job']['title']}")
        
        with open('/Users/gagandeep/.openclaw/workspace/temp-applied.json', 'w') as f:
            json.dump(results, f, indent=2)

asyncio.run(main())
