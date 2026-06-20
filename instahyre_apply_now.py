#!/usr/bin/env python3
import asyncio, websockets, json, time

WS = 'ws://localhost:9222/devtools/page/579380F947CEFDCB356E222E52F92E39'

async def ws_send(method, params=None):
    payload = json.dumps({'id': int(time.time()*1000), 'method': method, 'params': params or {}})
    async with websockets.connect(WS) as ws:
        await ws.send(payload)
        return json.loads(await ws.recv())

async def eval_js(expr):
    r = await ws_send('Runtime.evaluate', {'expression': expr, 'returnByValue': True, 'awaitPromise': True})
    return r.get('result', {}).get('result', {}).get('value')

async def main():
    # Jobs to apply to (matching stack) - even indices have company name
    jobs = [
        (2,  'Nexthink',  'Engineering Manager'),
        (4,  'NTT Data',  'AI Security Architect'),
        (6,  'Disney',    'Sr. Product Software Engineering Manager'),
        (8,  'Imagine Learning', 'Staff Engineer'),
        (10, 'Alation',   'Senior Software Engineer'),
        (12, 'Walmart',   'Golang Engineer - T1 Proxy'),
    ]

    print("="*60)
    print("INSTAHYRE APPLICATION - Quick Mode")
    print("="*60)
    print(f"\nApplying to {len(jobs)} matching jobs:\n")
    for idx, co, ti in jobs:
        print(f"  • {ti} @ {co}")

    results = []

    for i, (idx, company, title) in enumerate(jobs, 1):
        print(f"\n[{i}/{len(jobs)}] {title} @ {company}")
        
        # Click View button
        clicked = await eval_js(f'''(async () => {{
            const cards = document.querySelectorAll('.candidate-opportunities > div.ng-scope');
            const card = cards[{idx}];
            if (!card) return {{error: 'card not found'}};
            const btn = card.querySelector('#interested-btn');
            if (!btn) return {{error: 'no button'}};
            btn.scrollIntoView({{block:'center'}});
            await new Promise(r => setTimeout(r, 500));
            btn.click();
            return {{success: true}};
        }})();''')
        print(f"   Clicked View: {clicked}")
        
        # Wait for navigation
        time.sleep(3)
        url = await eval_js('window.location.href')
        print(f"   URL: {url}")
        
        # Look for apply/interest button
        btn_info = await eval_js('''(() => {
            const btns = document.querySelectorAll('button, a');
            for (let b of btns) {
                const t = b.textContent.trim().toLowerCase();
                if (t.includes('apply') || t.includes('interest') || t.includes("i'm interested")) {
                    return {found: true, text: b.textContent.trim()};
                }
            }
            return {found: false};
        })();''')
        print(f"   Button found: {btn_info}")
        
        if btn_info and btn_info.get('found'):
            # Click apply
            clicked2 = await eval_js('''(async () => {
                const btns = document.querySelectorAll('button, a');
                let target = null;
                for (let b of btns) {
                    const t = b.textContent.trim().toLowerCase();
                    if (t.includes('apply') || t.includes('interest')) { target = b; break; }
                }
                if (!target) return {error: 'button gone'};
                target.scrollIntoView({block:'center'});
                await new Promise(r => setTimeout(r, 500));
                target.click();
                await new Promise(r => setTimeout(r, 2000));
                return {success: true};
            })();''')
            print(f"   Applied: {clicked2}")
            results.append({'company': company, 'title': title, 'status': 'applied'})
        else:
            print("   ⚠️ No apply button found")
            results.append({'company': company, 'title': title, 'status': 'error', 'error': 'no button'})
        
        # Go back
        await eval_js('window.history.back()')
        time.sleep(2)
        # Wait for list
        for _ in range(10):
            has_list = await eval_js('document.querySelector(".candidate-opportunities") !== null')
            if has_list: break
            time.sleep(0.5)
        
        time.sleep(2)  # Human-like delay

    print("\n" + "="*60)
    print("DONE")
    print("="*60)
    for r in results:
        print(f"{r['status'].upper()}: {r['title']} @ {r['company']}")

    # Save
    with open('/Users/gagandeep/.openclaw/workspace/temp-applied.json', 'w') as f:
        json.dump(results, f, indent=2)

asyncio.run(main())