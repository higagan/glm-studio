#!/usr/bin/env python3
"""Check Stripe jobs page for apply options."""
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
        print("CHECKING STRIPE JOBS PAGE")
        print("=" * 60)
        
        time.sleep(3)
        
        # Get job listings
        jobs = await eval_js('''
            (() => {
                const links = document.querySelectorAll('a[href*="jobs"]');
                let results = [];
                for (let link of links) {
                    const text = link.textContent.trim();
                    if (text.length > 5 && text.includes('Engineer') || text.includes('Developer') || text.includes('Software')) {
                        results.push({
                            text: text,
                            href: link.href
                        });
                    }
                }
                return results.slice(0, 5);
            })();
        ''')
        
        print(f"\nFound {len(jobs)} relevant jobs:\n")
        for i, j in enumerate(jobs):
            print(f"[{i}] {j['text']}")
            print(f"    URL: {j['href']}")
        
        if jobs:
            # Click first job
            print(f"\nClicking first job: {jobs[0]['text']}")
            await eval_js(f'''
                (() => {{
                    const links = document.querySelectorAll('a[href*="jobs"]');
                    for (let link of links) {{
                        if (link.textContent.trim() === "{jobs[0]['text']}") {{
                            link.scrollIntoView({{block: "center"}});
                            link.click();
                            return {{clicked: true}};
                        }}
                    }}
                    return {{clicked: false}};
                }})();
            ''')
            
            time.sleep(3)
            
            # Check for apply button
            apply_btn = await eval_js('''
                (() => {
                    const btns = document.querySelectorAll('button, a');
                    for (let btn of btns) {
                        const text = btn.textContent.trim().toLowerCase();
                        if (text.includes('apply') || text.includes('application')) {
                            return {
                                found: true,
                                text: btn.textContent.trim(),
                                href: btn.href || 'no href',
                                className: btn.className.substring(0, 50)
                            };
                        }
                    }
                    return {found: false};
                })();
            ''')
            
            print(f"\nApply button: {apply_btn}")
            
            if apply_btn and apply_btn.get('found'):
                print("\n✅ Can apply to this job!")
                print(f"Apply URL: {apply_btn.get('href')}")

asyncio.run(main())
