#!/usr/bin/env python3
"""Inspect the job detail panel HTML to understand why apply button is not found."""
import asyncio, aiohttp, websockets, json, time, sys

async def main():
    async with aiohttp.ClientSession() as session:
        async with session.get('http://localhost:9222/json/list') as resp:
            pages = await resp.json()
            linkedin_page = next((p for p in pages if 'linkedin.com/jobs' in p.get('url', '')), None)
    if not linkedin_page:
        print("No LinkedIn page")
        return

    async with websockets.connect(linkedin_page['webSocketDebuggerUrl']) as ws:
        async def eval_js(expr):
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp.get('result', {}).get('result', {}).get('value')

        # Get all job cards first
        all_jobs = await eval_js('''
            (() => {
                const cards = document.querySelectorAll('[data-occludable-job-id]');
                return Array.from(cards).map(c => ({
                    jobId: c.getAttribute('data-occludable-job-id'),
                    title: c.querySelector('strong')?.textContent?.trim() || ''
                }));
            })();
        ''')
        print(f"All jobs found: {len(all_jobs)}")
        for j in all_jobs[:10]:
            print(f"  - {j['title'][:60]} (ID: {j['jobId'][:8]})")

        target = await eval_js('''
            (() => {
                const cards = document.querySelectorAll('[data-occludable-job-id]');
                for (let c of cards) {
                    const t = c.querySelector('strong');
                    if (t && t.textContent.includes('Senior Backend Developer')) {
                        return {jobId: c.getAttribute('data-occludable-job-id'), title: t.textContent.trim()};
                    }
                }
                return null;
            })();
        ''')

        if not target:
            print("Target job not found in list")
            return

        print(f"\nTarget: {target['title']} (ID: {target['jobId']})")

        # Use Runtime.evaluate to click directly on the job title link
        result = await eval_js(f'''
            (async () => {{
                const cards = document.querySelectorAll('[data-occludable-job-id]');
                let targetCard = null;
                for (let c of cards) {{
                    if (c.getAttribute('data-occludable-job-id') === "{target['jobId']}") {{
                        targetCard = c;
                        break;
                    }}
                }}
                if (!targetCard) return {{error: "card not found"}};
                targetCard.scrollIntoView({{behavior: "smooth", block: "center"}});
                await new Promise(r => setTimeout(r, 600));
                const link = targetCard.querySelector('a');
                if (link) {{ link.click(); return {{clicked: "link"}}; }}
                targetCard.click();
                return {{clicked: "card"}};
            }})();
        ''')
        print(f"Click result: {result}")

        time.sleep(4)

        # Check what detail panel loaded
        check = await eval_js('''
            (() => {
                const detail = document.querySelector('.jobs-search__job-details--container');
                return {
                    detailExists: !!detail,
                    detailText: detail ? detail.textContent.substring(0, 500) : 'none',
                    currentUrl: window.location.href
                };
            })();
        ''')
        print(f"\nAfter click: {check}")

        # Look for apply buttons across entire page with broad search
        btns = await eval_js('''
            (() => {
                const all = document.querySelectorAll('button, a');
                let results = [];
                for (let el of all) {
                    const text = el.textContent ? el.textContent.trim() : '';
                    const aria = el.getAttribute('aria-label') || '';
                    if ((text.toLowerCase().includes('apply') || aria.toLowerCase().includes('apply')) && text.length < 100) {
                        results.push({
                            tag: el.tagName,
                            text: text,
                            aria: aria,
                            className: el.className ? el.className.substring(0, 60) : '',
                            href: el.href || ''
                        });
                    }
                }
                return results;
            })();
        ''')
        print(f"\nApply-related buttons ({len(btns)}):")
        for b in btns:
            print(f"  [{b['tag']}] '{b['text']}' | aria: {b['aria']} | href: {b['href'][:50] if b['href'] else 'none'}")

asyncio.run(main())
