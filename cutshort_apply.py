#!/usr/bin/env python3
"""Cutshort applier — scroll, filter, and apply."""
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
        print("CUTSHORT APPLICATION")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        # Scroll down to load more jobs
        print("\nScrolling to load jobs...")
        for _ in range(5):
            await eval_js('window.scrollBy(0, 1000)')
            time.sleep(2)
        
        # Get all job cards
        jobs = await eval_js('''
            (() => {
                // Cutshort uses styled-components with sc- prefix
                const cards = document.querySelectorAll('[class*="sc-"]');
                let results = [];
                for (let card of cards) {
                    const text = card.textContent.trim();
                    // Look for job-like cards with Apply button
                    if (text.includes('Apply now') && text.length > 100) {
                        const lines = text.split('\\n').filter(l => l.trim());
                        const title = lines.find(l => l.includes('Head') || l.includes('Lead') || l.includes('Senior') || l.includes('Engineer') || l.includes('Developer') || l.includes('Manager'));
                        const company = lines.find(l => l.includes('₹') || l.includes('years') || l.includes('Bengaluru') || l.includes('Delhi'));
                        results.push({
                            text: text.substring(0, 200),
                            lines: lines.slice(0, 10)
                        });
                    }
                }
                return results;
            })();
        ''')
        
        print(f"Found {len(jobs)} job cards\n")
        for j in jobs:
            print(f"  ---")
            for line in j.get('lines', []):
                print(f"    {line}")
        
        # Get simpler job list
        simple_jobs = await eval_js('''
            (() => {
                // Find all elements containing "Apply now"
                const applyBtns = document.querySelectorAll('button, a');
                let results = [];
                for (let btn of applyBtns) {
                    if (btn.textContent.trim().includes('Apply now')) {
                        const card = btn.closest('[class*="sc-"]') || btn.parentElement?.parentElement?.parentElement;
                        if (card) {
                            const text = card.textContent.trim();
                            const lines = text.split('\\n').filter(l => l.trim() && l.length > 3);
                            results.push({
                                applyBtn: true,
                                textPreview: text.substring(0, 150),
                                lines: lines.slice(0, 8)
                            });
                        }
                    }
                }
                return results;
            })();
        ''')
        
        print(f"\nJobs with Apply buttons: {len(simple_jobs)}\n")
        for j in simple_jobs:
            print("  ===")
            for line in j.get('lines', []):
                print(f"    {line}")

asyncio.run(main())
