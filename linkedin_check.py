#!/usr/bin/env python3
import asyncio, websockets, json, time

async def check():
    uri = 'ws://localhost:9222/devtools/page/579380F947CEFDCB356E222E52F92E39'
    async with websockets.connect(uri) as ws:
        async def eval_js(expr):
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp.get('result', {}).get('result', {}).get('value')
        
        # Check the detail view (right panel)
        detail = await eval_js('''
            (() => {
                const panel = document.querySelector('.jobs-search__job-details--container, [class*="job-details"]');
                if (!panel) return {error: 'no detail panel'};
                
                const title = panel.querySelector('h1, h2, [class*="job-title"]');
                const company = panel.querySelector('[class*="company-name"], a[href*="company"]');
                const applyBtn = panel.querySelector('button[aria-label*="Easy Apply"], .jobs-apply-button');
                
                return {
                    title: title ? title.textContent.trim().substring(0, 60) : 'no title',
                    company: company ? company.textContent.trim().substring(0, 40) : 'no company',
                    hasEasyApply: !!applyBtn,
                    btnText: applyBtn ? applyBtn.textContent.trim() : 'none',
                    btnAria: applyBtn ? applyBtn.getAttribute('aria-label') : 'none'
                };
            })();
        ''')
        
        print('Detail panel:')
        print(json.dumps(detail, indent=2))

asyncio.run(check())
