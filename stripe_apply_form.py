#!/usr/bin/env python3
"""Analyze Stripe application form."""
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
        print("STRIPE APPLICATION FORM ANALYSIS")
        print("=" * 60)
        
        time.sleep(3)
        
        # Check page
        info = await eval_js('''
            (() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    hasForm: !!document.querySelector('form'),
                    formCount: document.querySelectorAll('form').length,
                    hasFileInput: !!document.querySelector('input[type="file"]'),
                    hasSubmit: !!document.querySelector('button[type="submit"], input[type="submit"]')
                };
            })();
        ''')
        
        print(f"\nPage: {info}")
        
        if info.get('hasForm'):
            print("\n✅ APPLICATION FORM DETECTED!")
            print("\nForm fields:")
            
            fields = await eval_js('''
                (() => {
                    const form = document.querySelector('form');
                    const inputs = form.querySelectorAll('input, textarea, select');
                    return Array.from(inputs).map(i => ({
                        type: i.type || i.tagName.toLowerCase(),
                        name: i.name,
                        id: i.id,
                        placeholder: i.placeholder,
                        required: i.required,
                        label: i.labels?.[0]?.textContent?.trim() || 
                               form.querySelector(`label[for="${i.id}"]`)?.textContent?.trim()
                    }));
                })();
            ''')
            
            for f in fields:
                label = f.get('label') or f.get('name') or f.get('id') or 'unnamed'
                req = "*" if f.get('required') else ""
                print(f"  - {label}{req} ({f.get('type')})")
            
            print(f"\nTotal fields: {len(fields)}")
            print("\nOpenClaw CAN fill this form with:")
            print("  - Name, email, phone from profile")
            print("  - Resume upload from file")
            print("  - Cover letter (if needed)")
            print("  - Custom answers from saved data")
        else:
            print("\nNo form found - might be loading or different structure")
            
            # Check page content
            content = await eval_js('document.body.textContent.substring(0, 500)')
            print(f"Page content: {content}")

asyncio.run(main())
