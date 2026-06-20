#!/usr/bin/env python3
"""Open LinkedIn job detail and extract/click external apply options."""
import asyncio, aiohttp, websockets, json, time
from datetime import datetime

async def main():
    async with aiohttp.ClientSession() as session:
        async with session.get('http://localhost:9222/json/list') as resp:
            pages = await resp.json()
            page = next((p for p in pages if p.get('type')=='page' and 'linkedin.com/jobs' in p.get('url','')), None)
    if not page:
        print("No LinkedIn page")
        return

    ws_url = page['webSocketDebuggerUrl']
    print(f"Connected to {page['url'][:80]}")

    async with websockets.connect(ws_url) as ws:
        async def eval_js(expr):
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp.get('result', {}).get('result', {}).get('value')

        print("=" * 60)
        print("LINKEDIN EXTERNAL APPLY EXTRACTOR")
        print("=" * 60)

        time.sleep(5)

        url = await eval_js('window.location.href')
        print(f"Current URL: {url}")

        # Get all buttons with full text
        all_buttons = await eval_js('''
            (() => {
                const btns = document.querySelectorAll('button, a');
                return Array.from(btns).map(b => ({
                    text: b.textContent.trim(),
                    ariaLabel: b.getAttribute('aria-label'),
                    className: b.className
                })).filter(b => b.text.length > 0 || b.ariaLabel);
            })();
        ''')

        print(f"\nAll buttons/links ({len(all_buttons)}):")
        for b in all_buttons:
            print(f"  - text='{b['text']}' aria='{b['ariaLabel']}' class='{b['className'][:50]}'")

asyncio.run(main())
