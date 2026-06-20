#!/usr/bin/env python3
"""Extract external apply URL from LinkedIn job detail via Network monitoring."""
import asyncio, websockets, json, time
from datetime import datetime

WS_URL = 'ws://localhost:9222/devtools/page/579380F947CEFDCB356E222E52F92E39'

async def main():
    async with websockets.connect(WS_URL) as ws:
        async def send_cmd(method, params=None):
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({'id': msg_id, 'method': method, 'params': params or {}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp
        
        async def eval_js(expr):
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp.get('result', {}).get('result', {}).get('value')
        
        print("=" * 60)
        print("MONITORING NETWORK FOR EXTERNAL URL")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        # Enable network monitoring
        await send_cmd('Network.enable')
        
        # Clear previous entries
        await send_cmd('Network.clearBrowserCache')
        
        # Click external apply
        print("\nClicking external apply...")
        await eval_js('''
            (async () => {
                const btns = document.querySelectorAll('button');
                for (let btn of btns) {
                    const aria = btn.getAttribute('aria-label') || '';
                    if (aria.includes('company website')) {
                        btn.scrollIntoView({block: "center"});
                        await new Promise(r => setTimeout(r, 500));
                        btn.click();
                        return {clicked: true, label: aria};
                    }
                }
                return {clicked: false};
            })();
        ''')
        
        # Wait and collect network requests
        print("\nCollecting network requests...")
        time.sleep(5)
        
        # Check network log
        network_log = await send_cmd('Network.getResponseBody', {'requestId': 'dummy'})
        print(f"Network: {network_log}")
        
        # Get current URL
        current = await eval_js('window.location.href')
        print(f"\nCurrent URL: {current}")

asyncio.run(main())
