#!/usr/bin/env python3
"""LinkedIn Easy Apply scanner and applier."""
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
        print("LINKEDIN EASY APPLY SCANNER")
        print("=" * 60)
        
        # Look for apply buttons
        result = await eval_js('''
            (() => {
                const cards = document.querySelectorAll('[data-job-id]');
                let info = [];
                for (let card of cards.slice(0, 5)) {
                    const btns = card.querySelectorAll('button');
                    const btnInfo = Array.from(btns).map(b => ({
                        text: b.textContent.trim().substring(0, 30),
                        ariaLabel: b.getAttribute('aria-label'),
                        className: b.className.substring(0, 50)
                    }));
                    info.push({
                        jobId: card.getAttribute('data-job-id'),
                        buttons: btnInfo
                    });
                }
                return info;
            })();
        ''')
        
        print("\nButton info from first 5 cards:")
        print(json.dumps(result, indent=2))
        
        # Search for apply buttons
        btns = await eval_js('''
            (() => {
                const allBtns = document.querySelectorAll('button');
                return Array.from(allBtns).filter(b => {
                    const t = b.textContent.toLowerCase();
                    return t.includes('apply') || t.includes('easy');
                }).map(b => ({
                    text: b.textContent.trim().substring(0, 40),
                    className: b.className.substring(0, 80)
                })).slice(0, 15);
            })();
        ''')
        
        print("\nApply-related buttons:")
        print(json.dumps(btns, indent=2))
        
        # Also check aria-labels
        aria_btns = await eval_js('''
            (() => {
                const allBtns = document.querySelectorAll('button[aria-label]');
                return Array.from(allBtns).filter(b => {
                    const label = (b.getAttribute('aria-label') || '').toLowerCase();
                    return label.includes('apply');
                }).map(b => ({
                    text: b.textContent.trim().substring(0, 30),
                    ariaLabel: b.getAttribute('aria-label'),
                    className: b.className.substring(0, 80)
                })).slice(0, 15);
            })();
        ''')
        
        print("\nButtons with 'apply' aria-label:")
        print(json.dumps(aria_btns, indent=2))

asyncio.run(main())
