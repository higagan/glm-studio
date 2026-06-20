#!/usr/bin/env python3
"""Look for external apply buttons on LinkedIn job details."""
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
        print("FINDING EXTERNAL APPLY BUTTONS")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        # Click on the first job to see detail structure
        print("\nOpening first job detail...")
        await eval_js('''
            (async () => {
                const cards = document.querySelectorAll('[data-occludable-job-id]');
                if (cards.length > 0) {
                    cards[0].scrollIntoView({block: "center"});
                    await new Promise(r => setTimeout(r, 500));
                    cards[0].click();
                }
            })();
        ''')
        
        time.sleep(3)
        
        # Get full HTML of apply section
        detail_html = await eval_js('''
            (() => {
                // Find the apply section in job details
                const detailPanel = document.querySelector('.jobs-search__job-details--container');
                if (detailPanel) {
                    // Look for the footer/actions area
                    const footer = detailPanel.querySelector('.jobs-details-top-card__actions-container, [class*="actions"]');
                    if (footer) {
                        return footer.outerHTML.substring(0, 2000);
                    }
                    // Get all buttons in detail panel
                    const btns = detailPanel.querySelectorAll('button');
                    let html = '';
                    for (let btn of btns) {
                        html += btn.outerHTML + '\n';
                    }
                    return html.substring(0, 2000);
                }
                return 'No detail panel found';
            })();
        ''')
        
        print("Detail HTML:")
        print(detail_html)
        
        # Also get all aria-labels in detail panel
        labels = await eval_js('''
            (() => {
                const detailPanel = document.querySelector('.jobs-search__job-details--container');
                if (!detailPanel) return [];
                const btns = detailPanel.querySelectorAll('button, a');
                let results = [];
                for (let btn of btns) {
                    results.push({
                        tag: btn.tagName,
                        text: btn.textContent.trim(),
                        ariaLabel: btn.getAttribute('aria-label'),
                        className: btn.className.substring(0, 50)
                    });
                }
                return results;
            })();
        ''')
        
        print("\nButtons in detail panel:")
        for btn in labels:
            print(f"  [{btn['tag']}] '{btn['text']}' | aria: {btn['ariaLabel']} | class: {btn['className']}")

asyncio.run(main())
