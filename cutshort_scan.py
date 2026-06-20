#!/usr/bin/env python3
import asyncio, websockets, json, time

async def check():
    uri = 'ws://localhost:9222/devtools/page/579380F947CEFDCB356E222E52F92E39'
    async with websockets.connect(uri) as ws:
        async def eval_js(expr):
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp.get('result', {}).get('result', {}).get('value')
        
        url = await eval_js('window.location.href')
        print('URL:', url)
        
        # Check page text
        text = await eval_js('document.body.innerText.substring(0, 500)')
        print('Page text:', text)
        
        # Check various selectors
        selectors = [
            'document.querySelectorAll("div").length',
            'document.querySelectorAll("[class*=\\"job\\"]").length',
            'document.querySelectorAll("[class*=\\"card\\"]").length',
            'document.querySelectorAll("a").length',
        ]
        
        for sel in selectors:
            result = await eval_js(sel)
            print(f'{sel}: {result}')

asyncio.run(check())
