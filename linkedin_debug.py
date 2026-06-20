#!/usr/bin/env python3
import asyncio, websockets, json, time

async def debug():
    uri = 'ws://localhost:9222/devtools/page/579380F947CEFDCB356E222E52F92E39'
    async with websockets.connect(uri) as ws:
        async def eval_js(expr):
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp.get('result', {}).get('result', {}).get('value')
        
        # Click on a specific job
        print('Clicking job...')
        result = await eval_js('''
            (async () => {
                const cards = document.querySelectorAll('[data-occludable-job-id]');
                for (let card of cards) {
                    const title = card.querySelector('a strong, h3 a, strong');
                    if (title && title.textContent.includes('Cloudnaut')) {
                        card.scrollIntoView({block: "center"});
                        await new Promise(r => setTimeout(r, 500));
                        card.click();
                        return {clicked: title.textContent.trim()};
                    }
                }
                return {error: "Cloudnaut not found"};
            })();
        ''')
        print('Click result:', result)
        
        time.sleep(3)
        
        # Look for apply buttons everywhere
        btns = await eval_js('''
            (() => {
                const allBtns = document.querySelectorAll('button, a');
                return Array.from(allBtns)
                    .filter(b => {
                        const text = b.textContent.toLowerCase();
                        return text.includes('apply');
                    })
                    .map(b => ({
                        text: b.textContent.trim(),
                        className: b.className.substring(0, 60),
                        parentTag: b.parentElement ? b.parentElement.tagName : 'none'
                    }));
            })();
        ''')
        
        print('All apply buttons:', btns)
        
        # Check if there's a jobs-apply-button
        jobBtn = await eval_js('''
            (() => {
                const btn = document.querySelector('.jobs-apply-button');
                return btn ? {
                    found: true,
                    text: btn.textContent.trim(),
                    ariaLabel: btn.getAttribute('aria-label')
                } : {found: false};
            })();
        ''')
        
        print('Jobs apply button:', jobBtn)

asyncio.run(debug())
