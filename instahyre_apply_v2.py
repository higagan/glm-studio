#!/usr/bin/env python3
"""Instahyre applier with persistent websocket connection."""
import asyncio, websockets, json, time
from datetime import datetime

WS = 'ws://localhost:9222/devtools/page/579380F947CEFDCB356E222E52F92E39'

class CDPClient:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.ws = None
        self.msg_id = 0
        
    async def connect(self):
        self.ws = await websockets.connect(self.ws_url)
        
    async def close(self):
        if self.ws:
            await self.ws.close()
            
    async def send(self, method, params=None):
        self.msg_id += 1
        payload = json.dumps({'id': self.msg_id, 'method': method, 'params': params or {}})
        await self.ws.send(payload)
        
    async def recv(self):
        return json.loads(await self.ws.recv())
        
    async def eval_js(self, expr):
        await self.send('Runtime.evaluate', {
            'expression': expr,
            'returnByValue': True,
            'awaitPromise': True
        })
        r = await self.recv()
        return r.get('result', {}).get('result', {}).get('value')

async def main():
    cdp = CDPClient(WS)
    await cdp.connect()
    
    try:
        jobs = [
            (2,  'Nexthink',         'Engineering Manager'),
            (4,  'NTT Data',          'AI Security Architect'),
            (6,  'Disney',            'Sr. Product Software Engineering Manager'),
            (8,  'Imagine Learning',  'Staff Engineer'),
            (10, 'Alation',           'Senior Software Engineer'),
            (12, 'Walmart',           'Golang Engineer - T1 Proxy'),
        ]

        print("="*60)
        print("INSTAHYRE APPLICATION")
        print("="*60)
        
        results = []
        
        for i, (idx, company, title) in enumerate(jobs, 1):
            print(f"\n[{i}/{len(jobs)}] {title} @ {company}")
            
            # Click View button
            clicked = await cdp.eval_js(f'''(async () => {{
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
            url = await cdp.eval_js('window.location.href')
            print(f"   URL: {url}")
            
            # Look for apply/interest button
            btn_info = await cdp.eval_js('''(() => {
                const btns = document.querySelectorAll('button, a');
                for (let b of btns) {
                    const t = b.textContent.trim().toLowerCase();
                    if (t.includes('apply') || t.includes('interest') || t.includes("i'm interested")) {
                        return {found: true, text: b.textContent.trim()};
                    }
                }
                return {found: false, pageText: document.body.innerText.substring(0,300)};
            })();''')
            print(f"   Button found: {btn_info}")
            
            if btn_info and btn_info.get('found'):
                # Click apply
                clicked2 = await cdp.eval_js('''(async () => {
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
                print(f"   ⚠️ No apply button found")
                if btn_info and 'pageText' in btn_info:
                    print(f"   Page text: {btn_info['pageText'][:100]}...")
                results.append({'company': company, 'title': title, 'status': 'error', 'error': 'no button'})
            
            # Go back
            await cdp.eval_js('window.history.back()')
            time.sleep(2)
            for _ in range(10):
                has_list = await cdp.eval_js('document.querySelector(".candidate-opportunities") !== null')
                if has_list: break
                time.sleep(0.5)
            time.sleep(2)

        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        applied = [r for r in results if r['status'] == 'applied']
        errors = [r for r in results if r['status'] == 'error']
        print(f"Applied: {len(applied)}/{len(jobs)}")
        print(f"Errors:  {len(errors)}")
        for r in results:
            print(f"  {r['status'].upper()}: {r['title']} @ {r['company']}")
        
        with open('/Users/gagandeep/.openclaw/workspace/temp-applied.json', 'w') as f:
            json.dump(results, f, indent=2)
            
    finally:
        await cdp.close()

asyncio.run(main())