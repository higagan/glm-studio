#!/usr/bin/env python3
"""Click external apply and follow to new tab."""
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
        print("FOLLOWING EXTERNAL APPLY LINK")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        # Get current page info
        targets = await send_cmd('Target.getTargets')
        print(f"\nTotal targets: {len(targets.get('result', {}).get('targetInfos', []))}")
        
        # Enable target discovery
        await send_cmd('Target.setDiscoverTargets', {'discover': True})
        
        # Listen for new targets
        print("\nListening for new tabs...")
        start_time = time.time()
        new_target = None
        
        # Click external apply
        print("\nClicking external apply button...")
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
        
        # Wait and check for new targets
        time.sleep(3)
        
        # Check targets again
        targets_after = await send_cmd('Target.getTargets')
        all_targets = targets_after.get('result', {}).get('targetInfos', [])
        print(f"\nTargets after click: {len(all_targets)}")
        
        for t in all_targets:
            print(f"  [{t.get('type')}] {t.get('url', '')[:100]} (attached: {t.get('attached')})")
        
        # Find unattached targets (new tabs)
        new_targets = [t for t in all_targets if not t.get('attached') and t.get('type') == 'page']
        print(f"\nNew unattached pages: {len(new_targets)}")
        
        if new_targets:
            new_target = new_targets[0]
            print(f"\n🎯 New tab: {new_target['url']}")
            
            # Attach to new target
            target_id = new_target['targetId']
            attach_resp = await send_cmd('Target.attachToTarget', {'targetId': target_id, 'flatten': True})
            session_id = attach_resp.get('result', {}).get('sessionId')
            
            if session_id:
                print(f"Attached with session: {session_id}")
                
                # Get URL via new session
                await ws.send(json.dumps({
                    'id': int(time.time() * 1000000) % 1000000000,
                    'method': 'Runtime.evaluate',
                    'params': {'expression': 'window.location.href'},
                    'sessionId': session_id
                }))
                resp = json.loads(await ws.recv())
                print(f"New page URL: {resp}")
        
        # Alternative: check current page for URL changes in iframes or redirects
        print("\n--- Alternative: Checking page for redirect info ---")
        
        # Get performance entries (might show navigation)
        perf = await eval_js('''
            (() => {
                const entries = performance.getEntriesByType('navigation');
                return entries.map(e => ({
                    type: e.type,
                    name: e.name
                }));
            })();
        ''')
        print(f"Navigation entries: {perf}")

asyncio.run(main())
