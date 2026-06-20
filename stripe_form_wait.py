#!/usr/bin/env python3
"""Check Stripe application form with longer wait."""
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
        print("WAITING FOR FORM TO LOAD")
        print("=" * 60)
        
        # Wait longer for form
        for i in range(10):
            time.sleep(2)
            
            has_form = await eval_js('!!document.querySelector("form")')
            
            if has_form:
                print(f"\n✅ Form found after {i+1} checks!\n")
                break
            else:
                print(f"  Check {i+1}/10: No form yet...")
        
        # Now analyze
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
        
        print(f"\nFinal state: {info}")
        
        if info.get('hasForm'):
            print("\n✅ APPLICATION FORM DETECTED!")
            
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
                               document.querySelector(`label[for="${i.id}"]`)?.textContent?.trim() ||
                               i.getAttribute('aria-label')
                    }));
                })();
            ''')
            
            print(f"\nFields ({len(fields)} total):")
            for f in fields:
                label = f.get('label') or f.get('name') or f.get('id') or 'unnamed'
                req = "*" if f.get('required') else ""
                print(f"  - {label}{req} ({f.get('type')})")
        else:
            # Check if there's an iframe
            frames = await eval_js('document.querySelectorAll("iframe").length')
            print(f"\nIframes: {frames}")
            
            if frames > 0:
                print("Form might be in an iframe")
            else:
                # Show page structure
                print("\nPage structure (first 1000 chars):")
                content = await eval_js('document.body.innerHTML.substring(0, 1000)')
                print(content)

asyncio.run(main())
