#!/usr/bin/env python3
"""Search for LinkedIn jobs that require external application (no Easy Apply)."""
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
        
        print("=" * 70)
        print("FINDING EXTERNAL-APPLY ONLY JOBS")
        print("=" * 70)
        
        # Navigate to LinkedIn jobs WITHOUT Easy Apply filter
        print("\n📍 Navigating to LinkedIn jobs (no Easy Apply filter)...")
        await ws.send(json.dumps({
            'id': 1,
            'method': 'Page.navigate',
            'params': {'url': 'https://www.linkedin.com/jobs/search/?keywords=python%20genai%20golang%20backend%20engineer&location=India'}
        }))
        await ws.recv()
        time.sleep(6)
        
        # Scroll to load more
        print("\nScrolling to load more jobs...")
        for _ in range(5):
            await eval_js('window.scrollBy(0, 1500)')
            time.sleep(2)
        
        # Get job cards
        jobs = await eval_js('''
            (() => {
                const cards = document.querySelectorAll('[data-occludable-job-id]');
                return Array.from(cards).map(c => ({
                    jobId: c.getAttribute('data-occludable-job-id'),
                    title: c.querySelector('strong')?.textContent?.trim() || ''
                }));
            })();
        ''')
        
        print(f"\nFound {len(jobs)} job cards")
        
        # For each job, click and check apply type
        external_jobs = []
        easy_apply_jobs = []
        
        for i, job in enumerate(jobs[:10]):
            job_id = job.get('jobId')
            title = job.get('title', 'Unknown')
            if not title:
                continue
                
            print(f"\n[{i+1}] {title[:60]}")
            
            try:
                # Click job card
                await eval_js(f'''
                    (async () => {{
                        const cards = document.querySelectorAll('[data-occludable-job-id]');
                        let target = null;
                        for (let c of cards) {{
                            if (c.getAttribute('data-occludable-job-id') === "{job_id}") {{
                                target = c;
                                break;
                            }}
                        }}
                        if (!target) return {{error: "not found"}};
                        target.scrollIntoView({{block: "center"}});
                        await new Promise(r => setTimeout(r, 500));
                        target.click();
                        return {{clicked: true}};
                    }})();
                ''')
                
                time.sleep(2)
                
                # Check for apply buttons
                apply_info = await eval_js('''
                    (() => {
                        const btns = document.querySelectorAll('button, a');
                        let results = [];
                        for (let btn of btns) {
                            const aria = btn.getAttribute('aria-label') || '';
                            const text = btn.textContent.trim().toLowerCase();
                            const className = btn.className.toLowerCase();
                            
                            if (aria.includes('company website')) {
                                results.push({
                                    type: 'external',
                                    text: btn.textContent.trim(),
                                    ariaLabel: aria,
                                    href: btn.href || '',
                                    className: className.substring(0, 50)
                                });
                            } else if ((text === 'easy apply' || aria.includes('easy apply')) && 
                                       !className.includes('pill') && !aria.includes('filter')) {
                                results.push({
                                    type: 'easy',
                                    text: btn.textContent.trim(),
                                    ariaLabel: aria
                                });
                            }
                        }
                        return results;
                    })();
                ''')
                
                if apply_info:
                    for info in apply_info:
                        if info.get('type') == 'external':
                            print(f"   🌐 EXTERNAL APPLY!")
                            print(f"      Href: {info.get('href', 'none')[:80]}")
                            external_jobs.append({
                                'title': title,
                                'jobId': job_id,
                                'href': info.get('href', '')
                            })
                            break
                        elif info.get('type') == 'easy':
                            print(f"   ✅ Easy Apply")
                            easy_apply_jobs.append({'title': title, 'jobId': job_id})
                            break
                else:
                    print(f"   ⚠️ No apply options found")
                    
            except Exception as e:
                print(f"   ❌ Error: {str(e)[:100]}")
            
            time.sleep(1)
        
        # Summary
        print("\n" + "=" * 70)
        print("RESULTS")
        print("=" * 70)
        print(f"\n✅ Easy Apply jobs: {len(easy_apply_jobs)}")
        print(f"🌐 External Apply jobs: {len(external_jobs)}")
        
        if external_jobs:
            print("\nExternal apply jobs found:")
            for j in external_jobs:
                print(f"  📌 {j['title']}")
                print(f"     URL: {j.get('href', 'none')[:80]}")
        else:
            print("\n❌ No external apply jobs found.")
            print("\nPossible reasons:")
            print("  1. LinkedIn's UI uses dynamic buttons that load after interaction")
            print("  2. The external URL is loaded via JavaScript after click")
            print("  3. Need to intercept the actual click event/redirect")
            print("\nAlternative approach: Search for company career pages directly")
        
        # Save results
        with open('/Users/gagandeep/.openclaw/workspace/linkedin_external_jobs.json', 'w') as f:
            json.dump({'external': external_jobs, 'easy': easy_apply_jobs}, f, indent=2)

asyncio.run(main())
