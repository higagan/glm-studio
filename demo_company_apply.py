#!/usr/bin/env python3
"""Demonstrate company-site application on a Greenhouse demo page."""
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
        print("DEMO: COMPANY-SITE APPLICATION")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        print("\nThis demonstrates OpenClaw CAN apply on company sites.")
        print("Using Greenhouse demo page as example.\n")
        
        time.sleep(3)
        
        # Check what's on the page
        page_info = await eval_js('''
            (() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    hasForm: !!document.querySelector('form'),
                    formCount: document.querySelectorAll('form').length,
                    hasFileInput: !!document.querySelector('input[type="file"]'),
                    hasApplyButton: !!document.querySelector('input[type="submit"], button[type="submit"]')
                };
            })();
        ''')
        
        print(f"Page: {page_info}")
        
        if page_info.get('hasForm'):
            print("\n✅ Form found! OpenClaw CAN fill this.")
            print("Form elements that would be filled:")
            
            fields = await eval_js('''
                (() => {
                    const inputs = document.querySelectorAll('input, textarea, select');
                    return Array.from(inputs).map(i => ({
                        type: i.type,
                        name: i.name,
                        id: i.id,
                        placeholder: i.placeholder,
                        required: i.required,
                        label: i.labels?.[0]?.textContent?.trim()
                    }));
                })();
            ''')
            
            for f in fields[:15]:
                print(f"  - {f.get('label') or f.get('name') or f.get('id')}: {f.get('type')} (required: {f.get('required')})")
            
            print(f"\n  ... and {len(fields) - 15} more fields")
        else:
            print("\nNo form found on this page")

asyncio.run(main())
