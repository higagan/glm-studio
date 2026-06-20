#!/usr/bin/env python3
"""Check iframe content on Stripe apply page."""
import asyncio, websockets, json, time

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
        print("CHECKING IFRAMES")
        print("=" * 60)
        
        # Get iframe info
        frames = await eval_js('''
            (() => {
                const iframes = document.querySelectorAll('iframe');
                return Array.from(iframes).map(f => ({
                    src: f.src,
                    name: f.name,
                    id: f.id,
                    width: f.width,
                    height: f.height
                }));
            })();
        ''')
        
        print(f"Found {len(frames)} iframes:\n")
        for i, f in enumerate(frames):
            print(f"[{i}] src: {f.get('src', 'none')}")
            print(f"     id: {f.get('id', 'none')}, name: {f.get('name', 'none')}")
        
        # Access first iframe content
        if frames:
            print("\n--- Checking first iframe content ---")
            
            iframe_content = await eval_js('''
                (() => {
                    const iframe = document.querySelector('iframe');
                    if (!iframe) return {error: "no iframe"};
                    try {
                        const doc = iframe.contentDocument || iframe.contentWindow?.document;
                        if (!doc) return {error: "cannot access"};
                        return {
                            url: doc.location?.href,
                            title: doc.title,
                            hasForm: !!doc.querySelector('form'),
                            bodyText: doc.body?.textContent?.substring(0, 200) || 'empty'
                        };
                    } catch(e) {
                        return {error: e.message};
                    }
                })();
            ''')
            
            print(f"Iframe content: {iframe_content}")

asyncio.run(main())
