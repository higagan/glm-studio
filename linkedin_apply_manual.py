#!/usr/bin/env python3
"""LinkedIn helper: find and click Easy Apply button after user opens detail view."""
import asyncio, aiohttp, websockets, json, time
from datetime import datetime

async def main():
    async with aiohttp.ClientSession() as session:
        async with session.get('http://localhost:9222/json/list') as resp:
            pages = await resp.json()
            linkedin_page = next((p for p in pages if 'linkedin.com/jobs' in p.get('url', '')), None)
    if not linkedin_page:
        print("❌ No LinkedIn jobs page found")
        return

    ws_url = linkedin_page['webSocketDebuggerUrl']
    async with websockets.connect(ws_url) as ws:
        async def eval_js(expr):
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp.get('result', {}).get('result', {}).get('value')

        # Try multiple button-finding strategies
        for attempt in range(3):
            time.sleep(2)
            
            # Get page body text
            body_text = await eval_js('document.body.textContent.substring(0, 800)')
            print(f"\nAttempt {attempt+1}")
            print(f"Page preview: {body_text[:200]}")
            
            # Try clicking using text match on any button
            result = await eval_js('''
                (async () => {
                    const all = document.querySelectorAll('button, a, [role="button"]');
                    let candidates = [];
                    for (let el of all) {
                        const text = el.textContent.trim().toLowerCase();
                        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                        if (text.includes('easy apply') || aria.includes('easy apply')) {
                            candidates.push({
                                tag: el.tagName,
                                text: el.textContent.trim(),
                                aria: el.getAttribute('aria-label'),
                                className: el.className.substring(0, 40),
                                disabled: el.disabled
                            });
                        }
                    }
                    
                    if (candidates.length > 0) {
                        // Try first candidate
                        const el = all[0];
                        const target = Array.from(all).find(e => 
                            e.textContent.trim().toLowerCase().includes('easy apply') ||
                            (e.getAttribute('aria-label') || '').toLowerCase().includes('easy apply')
                        );
                        if (target) {
                            target.scrollIntoView({block: "center"});
                            await new Promise(r => setTimeout(r, 500));
                            target.click();
                            return {found: candidates.length, clicked: target.textContent.trim()};
                        }
                    }
                    return {found: candidates.length, clicked: null};
                })();
            ''')
            print(f"Easy Apply search: {result}")
            
            if result and result.get('clicked'):
                print("Clicked! Check browser for application modal.")
                return

        print("No clickable Easy Apply button found")

asyncio.run(main())
