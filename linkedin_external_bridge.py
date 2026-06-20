#!/usr/bin/env python3
"""LinkedIn External Apply Bridge — captures redirect URLs and fills company ATS forms."""
import asyncio, websockets, json, time, re
from datetime import datetime

WS_URL = 'ws://localhost:9222/devtools/page/579380F947CEFDCB356E222E52F92E39'

async def intercept_network(ws, timeout_sec=10):
    """Enable Fetch domain and collect URLs."""
    urls = []
    
    async def listen():
        while True:
            try:
                msg = json.loads(await ws.recv())
                if msg.get('method') == 'Network.responseReceived':
                    url = msg.get('params', {}).get('response', {}).get('url', '')
                    if url and not 'linkedin.com' in url and not 'doubleclick' in url and not 'google' in url:
                        urls.append(url)
                        print(f"  🌐 Response: {url[:100]}")
                elif msg.get('method') == 'Network.requestWillBeSent':
                    url = msg.get('params', {}).get('request', {}).get('url', '')
                    if url and ('greenhouse' in url or 'lever' in url or 'workday' in url or 'careers' in url):
                        urls.append(url)
                        print(f"  🎯 Request: {url[:100]}")
            except:
                break
    
    # Enable network monitoring
    await ws.send(json.dumps({'id': 1, 'method': 'Network.enable'}))
    await ws.recv()  # ack
    
    await ws.send(json.dumps({'id': 2, 'method': 'Network.setCacheDisabled', 'params': {'cacheDisabled': True}}))
    await ws.recv()  # ack
    
    listen_task = asyncio.create_task(listen())
    await asyncio.sleep(timeout_sec)
    listen_task.cancel()
    
    return urls

async def get_page_urls(ws):
    """Get all current page URLs and iframe sources."""
    msg_id = int(time.time() * 1000000) % 1000000000
    await ws.send(json.dumps({
        'id': msg_id,
        'method': 'Runtime.evaluate',
        'params': {
            'expression': '''
                (() => {
                    const results = [];
                    results.push({type: 'main', url: window.location.href});
                    const iframes = document.querySelectorAll('iframe');
                    for (let f of iframes) {
                        if (f.src && !f.src.includes('linkedin.com') && !f.src.includes('doubleclick') && !f.src.includes('google')) {
                            results.push({type: 'iframe', src: f.src});
                        }
                    }
                    const links = document.querySelectorAll('a[href]');
                    for (let a of links) {
                        const href = a.href;
                        if (href.includes('greenhouse') || href.includes('lever') || href.includes('workday') || href.includes('careers')) {
                            results.push({type: 'link', href: href, text: a.textContent.trim().substring(0, 50)});
                        }
                    }
                    return results;
                })();
            ''',
            'returnByValue': True
        }
    }))
    resp = json.loads(await ws.recv())
    return resp.get('result', {}).get('result', {}).get('value', [])

async def click_external_apply(ws):
    """Click the external apply button and capture what happens."""
    msg_id = int(time.time() * 1000000) % 1000000000
    await ws.send(json.dumps({
        'id': msg_id,
        'method': 'Runtime.evaluate',
        'params': {
            'expression': '''
                (async () => {
                    // Find the "Apply on company website" button
                    const btns = document.querySelectorAll('button, a');
                    let target = null;
                    for (let btn of btns) {
                        const aria = btn.getAttribute('aria-label') || '';
                        const text = btn.textContent.trim().toLowerCase();
                        if (aria.includes('company website') || (text.includes('apply') && !text.includes('easy'))) {
                            target = btn;
                            break;
                        }
                    }
                    if (!target) return {error: "no button found"};
                    
                    // Try to get any href/URL before clicking
                    let preClickUrl = target.href || target.getAttribute('data-url') || '';
                    
                    target.scrollIntoView({block: "center"});
                    await new Promise(r => setTimeout(r, 500));
                    
                    // Click
                    target.click();
                    
                    return {
                        clicked: true,
                        preClickUrl: preClickUrl,
                        buttonText: target.textContent.trim(),
                        ariaLabel: target.getAttribute('aria-label')
                    };
                })();
            ''',
            'returnByValue': True,
            'awaitPromise': True
        }
    }))
    resp = json.loads(await ws.recv())
    return resp.get('result', {}).get('result', {}).get('value', {})

async def main():
    async with websockets.connect(WS_URL) as ws:
        print("=" * 70)
        print("LINKEDIN EXTERNAL APPLY BRIDGE")
        print(f"Started: {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 70)
        
        # Step 1: Navigate back to LinkedIn job search
        print("\n📍 Step 1: Navigating to LinkedIn jobs...")
        await ws.send(json.dumps({
            'id': 1,
            'method': 'Page.navigate',
            'params': {'url': 'https://www.linkedin.com/jobs/search/?currentJobId=4198104701&f_AL=true&keywords=python%20genai%20golang%20backend&location=India'}
        }))
        await ws.recv()  # navigation ack
        time.sleep(5)
        
        # Step 2: Get all job IDs
        print("\n📋 Step 2: Finding jobs with external apply...")
        jobs = await get_page_urls(ws)
        
        # Get job cards info
        msg_id = int(time.time() * 1000000) % 1000000000
        await ws.send(json.dumps({
            'id': msg_id,
            'method': 'Runtime.evaluate',
            'params': {
                'expression': '''
                    (() => {
                        const cards = document.querySelectorAll('[data-occludable-job-id]');
                        return Array.from(cards).slice(0, 8).map(c => ({
                            jobId: c.getAttribute('data-occludable-job-id'),
                            title: c.querySelector('strong')?.textContent?.trim() || ''
                        }));
                    })();
                ''',
                'returnByValue': True
            }
        }))
        resp = json.loads(await ws.recv())
        job_cards = resp.get('result', {}).get('result', {}).get('value', [])
        
        print(f"Found {len(job_cards)} job cards")
        
        # Step 3: For each job, click and check for external apply
        external_jobs = []
        
        for i, job in enumerate(job_cards[:5]):
            job_id = job.get('jobId')
            title = job.get('title', 'Unknown')
            
            print(f"\n[{i+1}] Checking: {title[:60]}")
            
            # Click the job card
            msg_id = int(time.time() * 1000000) % 1000000000
            await ws.send(json.dumps({
                'id': msg_id,
                'method': 'Runtime.evaluate',
                'params': {
                    'expression': f'''
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
                    ''',
                    'returnByValue': True,
                    'awaitPromise': True
                }
            }))
            await ws.recv()
            
            time.sleep(2)
            
            # Check for external apply button
            msg_id = int(time.time() * 1000000) % 1000000000
            await ws.send(json.dumps({
                'id': msg_id,
                'method': 'Runtime.evaluate',
                'params': {
                    'expression': '''
                        (() => {
                            const btns = document.querySelectorAll('button, a');
                            for (let btn of btns) {
                                const aria = btn.getAttribute('aria-label') || '';
                                const text = btn.textContent.trim().toLowerCase();
                                if (aria.includes('company website') || 
                                    (text.includes('apply') && !text.includes('easy') && !text.includes('filter'))) {
                                    return {
                                        found: true,
                                        text: btn.textContent.trim(),
                                        ariaLabel: aria,
                                        href: btn.href || '',
                                        dataUrl: btn.getAttribute('data-url') || '',
                                        dataControlId: btn.getAttribute('data-control-id') || ''
                                    };
                                }
                            }
                            return {found: false};
                        })();
                    ''',
                    'returnByValue': True
                }
            }))
            resp = json.loads(await ws.recv())
            btn_info = resp.get('result', {}).get('result', {}).get('value', {})
            
            if btn_info.get('found'):
                print(f"   🌐 External apply found!")
                print(f"      Text: {btn_info.get('text')}")
                print(f"      Href: {btn_info.get('href', 'none')[:80]}")
                print(f"      Data-URL: {btn_info.get('dataUrl', 'none')[:80]}")
                
                # Store for later
                external_jobs.append({
                    'title': title,
                    'jobId': job_id,
                    'buttonInfo': btn_info
                })
            else:
                # Check if Easy Apply only
                msg_id = int(time.time() * 1000000) % 1000000000
                await ws.send(json.dumps({
                    'id': msg_id,
                    'method': 'Runtime.evaluate',
                    'params': {
                        'expression': '''
                            (() => {
                                const btns = document.querySelectorAll('button');
                                for (let btn of btns) {
                                    const aria = btn.getAttribute('aria-label') || '';
                                    if (aria.includes('Easy Apply') && !aria.includes('filter')) {
                                        return {hasEasyApply: true, label: aria};
                                    }
                                }
                                return {hasEasyApply: false};
                            })();
                        ''',
                        'returnByValue': True
                    }
                }))
                resp = json.loads(await ws.recv())
                easy = resp.get('result', {}).get('result', {}).get('value', {})
                if easy.get('hasEasyApply'):
                    print(f"   ✅ Easy Apply only")
                else:
                    print(f"   ⚠️ No apply option found")
        
        # Step 4: Summarize external jobs
        print("\n" + "=" * 70)
        print("EXTERNAL APPLY JOBS FOUND")
        print("=" * 70)
        
        if not external_jobs:
            print("\n❌ No external apply jobs found on this page.")
            print("All jobs have Easy Apply only.")
            print("\nNext: Need to search for jobs WITHOUT Easy Apply filter,")
            print("or search specifically for 'Apply on company website' jobs.")
        else:
            for j in external_jobs:
                print(f"\n📌 {j['title']}")
                print(f"   Job ID: {j['jobId']}")
                print(f"   URL: {j['buttonInfo'].get('href') or j['buttonInfo'].get('dataUrl') or 'needs click interception'}")
        
        # Save results
        with open('/Users/gagandeep/.openclaw/workspace/linkedin_external_jobs.json', 'w') as f:
            json.dump(external_jobs, f, indent=2)
        
        return external_jobs

asyncio.run(main())
