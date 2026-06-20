#!/usr/bin/env python3
"""Navigate Chrome to a specific URL via CDP."""
import asyncio, aiohttp, websockets, json

async def main():
    url = sys.argv[1] if len(sys.argv) > 1 else 'https://cutshort.io'
    
    # Get first available page
    async with aiohttp.ClientSession() as session:
        async with session.get('http://localhost:9222/json/list') as resp:
            pages = await resp.json()
    
    if not pages:
        print("❌ No Chrome pages found")
        return
    
    # Use first LinkedIn page or any page
    target_page = None
    for p in pages:
        if p.get('type') == 'page' and not p.get('url', '').startswith('chrome://'):
            target_page = p
            break
    
    if not target_page:
        print("❌ No navigable page found")
        return
    
    ws_url = target_page['webSocketDebuggerUrl']
    print(f"Navigating {target_page['id'][:8]} to {url}")
    
    async with websockets.connect(ws_url) as ws:
        await ws.send(json.dumps({
            'id': 1,
            'method': 'Page.navigate',
            'params': {'url': url}
        }))
        resp = json.loads(await ws.recv())
        print(f"Navigation result: {resp}")

import sys
asyncio.run(main())
