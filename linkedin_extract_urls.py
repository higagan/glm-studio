#!/usr/bin/env python3
"""Extract external apply URLs from LinkedIn job postings."""
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
        print("EXTRACTING EXTERNAL APPLY URLS")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)
        
        # Get all job cards
        jobs = await eval_js('''
            (() => {
                const cards = document.querySelectorAll('[data-occludable-job-id]');
                let results = [];
                for (let card of cards) {
                    const titleEl = card.querySelector('strong');
                    if (titleEl) {
                        results.push({
                            jobId: card.getAttribute('data-occludable-job-id'),
                            title: titleEl.textContent.trim()
                        });
                    }
                }
                return results;
            })();
        ''')
        
        print(f"\nFound {len(jobs)} jobs")
        
        # For each job, click it and look for external apply URL
        results = []
        
        for i, job in enumerate(jobs):
            job_id = job['jobId']
            print(f"\n[{i+1}] Checking: {job['title']}")
            
            try:
                # Click the job card
                click_result = await eval_js(f'''
                    (async () => {{
                        const cards = document.querySelectorAll('[data-occludable-job-id]');
                        let target = null;
                        for (let card of cards) {{
                            if (card.getAttribute('data-occludable-job-id') === "{job_id}") {{
                                target = card;
                                break;
                            }}
                        }}
                        if (!target) return {{error: "not found"}};
                        target.scrollIntoView({{block: "center"}});
                        await new Promise(r => setTimeout(r, 500));
                        target.click();
                        return {{success: true}};
                    }})();
                ''')
                print(f"   Clicked: {click_result}")
                
                time.sleep(3)
                
                # Look for any apply-related links/buttons
                detail = await eval_js('''
                    (() => {
                        const allElements = document.querySelectorAll('button, a');
                        let applyInfo = [];
                        
                        for (let el of allElements) {
                            const text = el.textContent.trim().toLowerCase();
                            const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                            const href = el.href || '';
                            const className = el.className || '';
                            
                            // Check for any apply-related element
                            if (text.includes('apply') || aria.includes('apply')) {
                                applyInfo.push({
                                    text: el.textContent.trim(),
                                    ariaLabel: el.getAttribute('aria-label'),
                                    href: href,
                                    className: className.substring(0, 80),
                                    tagName: el.tagName
                                });
                            }
                        }
                        
                        return applyInfo;
                    })();
                ''')
                
                if detail and len(detail) > 0:
                    print(f"   Found {len(detail)} apply elements:")
                    for el in detail[:3]:
                        print(f"     - {el.get('tagName')}: '{el.get('text', '')}' | href: {el.get('href', 'none')}")
                else:
                    print("   No apply elements found")
                
                # Also look for any links that might be career sites
                links = await eval_js('''
                    (() => {
                        const allLinks = document.querySelectorAll('a[href]');
                        let interesting = [];
                        for (let link of allLinks) {
                            const href = link.href.toLowerCase();
                            if (href.includes('greenhouse') || href.includes('lever.co') || 
                                href.includes('workday') || href.includes('careers') ||
                                href.includes('jobs') || href.includes('apply')) {
                                interesting.push({
                                    text: link.textContent.trim(),
                                    href: link.href
                                });
                            }
                        }
                        return interesting;
                    })();
                ''')
                
                if links and len(links) > 0:
                    print(f"   Interesting links ({len(links)}):")
                    for link in links[:3]:
                        print(f"     → {link.get('text', '')}: {link.get('href', '')}")
                
                results.append({
                    'title': job['title'],
                    'jobId': job_id,
                    'apply_elements': detail,
                    'interesting_links': links
                })
                
            except Exception as e:
                print(f"   Error: {str(e)[:100]}")
                results.append({'title': job['title'], 'jobId': job_id, 'error': str(e)})
            
            time.sleep(1)
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        
        for r in results:
            print(f"\n{r['title']}:")
            
            elements = r.get('apply_elements') or []
            links = r.get('interesting_links') or []
            
            has_easy = False
            has_external = False
            external_url = None
            
            for el in elements:
                text = (el.get('text') or '').lower()
                href = el.get('href') or ''
                if 'easy apply' in text:
                    has_easy = True
                elif 'apply' in text and href:
                    has_external = True
                    external_url = href
            
            if has_easy:
                print("  ✅ Has Easy Apply")
            if has_external and external_url:
                print(f"  🔗 External: {external_url}")
            if not has_easy and not has_external:
                print("  ❌ No apply option")
        
        # Save results
        with open('/Users/gagandeep/.openclaw/workspace/linkedin_external_urls.json', 'w') as f:
            json.dump(results, f, indent=2)

asyncio.run(main())
