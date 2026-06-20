#!/usr/bin/env python3
"""Apply to a specific LinkedIn job via external site or Easy Apply."""
import asyncio, aiohttp, websockets, json, time, re
from datetime import datetime
from pathlib import Path

JOB_TITLE_KEYWORD = "Senior Backend Developer"
RESUME_PATH = "/Users/gagandeep/.openclaw/workspace/resume.pdf"

async def get_linkedin_page():
    async with aiohttp.ClientSession() as session:
        async with session.get('http://localhost:9222/json/list') as resp:
            pages = await resp.json()
            for p in pages:
                if 'linkedin.com/jobs' in p.get('url', ''):
                    return p
    return None

async def main():
    page = await get_linkedin_page()
    if not page:
        print("❌ No LinkedIn jobs page found")
        return
    
    ws_url = page['webSocketDebuggerUrl']
    async with websockets.connect(ws_url) as ws:
        async def eval_js(expr):
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp.get('result', {}).get('result', {}).get('value')
        
        print("=" * 60)
        print(f"TARGETING: {JOB_TITLE_KEYWORD}")
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
        
        target_job = None
        for j in jobs:
            if JOB_TITLE_KEYWORD.lower() in j['title'].lower():
                target_job = j
                break
        
        if not target_job:
            print(f"❌ Job '{JOB_TITLE_KEYWORD}' not found on current page")
            return
        
        job_id = target_job['jobId']
        title = target_job['title']
        print(f"\n🎯 Found: {title}")
        
        # Click the job
        await eval_js(f'''
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
                target.scrollIntoView({{behavior: "smooth", block: "center"}});
                await new Promise(r => setTimeout(r, 600));
                const link = target.querySelector('a, strong');
                if (link) link.click();
                else target.click();
                return {{success: true}};
            }})();
        ''')
        
        time.sleep(3)
        
        # Wait for detail to load and scroll it into view
        await eval_js('''
            (() => {
                const detail = document.querySelector('.jobs-search__job-details--container, .job-details-jobs-unified-top-card__container, [class*="job-details"]');
                if (detail) detail.scrollIntoView({block: "start"});
            })();
        ''')
        time.sleep(2)
        
        # Check for all apply-related buttons in detail panel specifically
        detail_buttons = await eval_js('''
            (() => {
                const detailPanel = document.querySelector('.jobs-search__job-details--container, .job-details-jobs-unified-top-card__container, [class*="job-details"]');
                let results = [];
                if (detailPanel) {
                    const btns = detailPanel.querySelectorAll('button, a');
                    for (let btn of btns) {
                        const text = btn.textContent.trim();
                        const aria = btn.getAttribute('aria-label') || '';
                        if (text.toLowerCase().includes('apply') || aria.toLowerCase().includes('apply')) {
                            results.push({
                                tag: btn.tagName,
                                text: text,
                                ariaLabel: aria,
                                className: btn.className.substring(0, 50),
                                href: btn.href || '',
                                dataUrl: btn.getAttribute('data-url') || ''
                            });
                        }
                    }
                }
                return results;
            })();
        ''')
        
        print(f"\nDetail panel buttons ({len(detail_buttons)}):")
        for b in detail_buttons:
            print(f"  [{b['tag']}] '{b['text']}' | aria: {b['ariaLabel']} | href: {b['href'][:50] if b['href'] else 'none'}")
        
        # Check for Easy Apply
        easy_apply = await eval_js('''
            (() => {
                const allBtns = document.querySelectorAll('button, a');
                for (let btn of allBtns) {
                    const text = btn.textContent.trim().toLowerCase();
                    const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                    const className = btn.className.toLowerCase();
                    if ((text === 'easy apply' || aria.includes('easy apply')) && 
                        !className.includes('pill') && 
                        !className.includes('choice') &&
                        !aria.includes('filter')) {
                        return {found: true, text: btn.textContent.trim(), ariaLabel: btn.getAttribute('aria-label')};
                    }
                }
                return {found: false};
            })();
        ''')
        
        print(f"\nEasy Apply: {easy_apply}")
        
        if easy_apply and easy_apply.get('found'):
            print("✅ Easy Apply available — applying now...")
            await eval_js('''
                (async () => {
                    const allBtns = document.querySelectorAll('button, a');
                    let target = null;
                    for (let btn of allBtns) {
                        const text = btn.textContent.trim().toLowerCase();
                        const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                        const className = btn.className.toLowerCase();
                        if ((text === 'easy apply' || aria.includes('easy apply')) && 
                            !className.includes('pill') && 
                            !className.includes('choice') &&
                            !aria.includes('filter')) {
                            target = btn;
                            break;
                        }
                    }
                    if (!target) return {error: "not found"};
                    target.scrollIntoView({block: "center"});
                    await new Promise(r => setTimeout(r, 500));
                    target.click();
                    return {success: true};
                })();
            ''')
            
            time.sleep(3)
            
            # Handle flow
            steps = 0
            applied = False
            while steps < 6:
                time.sleep(2)
                state = await eval_js('''
                    (() => {
                        const s = document.querySelector('button[aria-label="Submit application"]');
                        const n = document.querySelector('button[aria-label="Continue to next step"]');
                        const r = document.querySelector('button[aria-label="Review your application"]');
                        return {hasSubmit: !!s, hasNext: !!n, hasReview: !!r};
                    })();
                ''')
                print(f"Step {steps+1}: submit={state.get('hasSubmit')} next={state.get('hasNext')} review={state.get('hasReview')}")
                
                if state.get('hasSubmit'):
                    await eval_js('document.querySelector("button[aria-label=\\\"Submit application\\\"]").click()')
                    time.sleep(3)
                    applied = True
                    break
                elif state.get('hasNext'):
                    await eval_js('document.querySelector("button[aria-label=\\\"Continue to next step\\\"]").click()')
                elif state.get('hasReview'):
                    await eval_js('document.querySelector("button[aria-label=\\\"Review your application\\\"]").click()')
                else:
                    break
                steps += 1
            
            if applied:
                print(f"\n🎉 APPLIED to {title} via Easy Apply!")
            else:
                print(f"\n⚠️ Uncertain if application went through")
            return
        
        # No Easy Apply — look for external apply button and URL
        print("\n🌐 No Easy Apply — checking external apply options...")
        
        external_info = await eval_js('''
            (() => {
                const btns = document.querySelectorAll('button, a');
                for (let btn of btns) {
                    const aria = btn.getAttribute('aria-label') || '';
                    const text = btn.textContent.trim().toLowerCase();
                    if (aria.includes('company website') || (text.includes('apply') && !text.includes('easy'))) {
                        return {
                            found: true,
                            text: btn.textContent.trim(),
                            ariaLabel: aria,
                            href: btn.href || '',
                            dataUrl: btn.getAttribute('data-url') || ''
                        };
                    }
                }
                return {found: false};
            })();
        ''')
        
        print(f"External button: {external_info}")
        
        if external_info and external_info.get('found'):
            print("\n✅ External apply button found")
            print(f"   Text: {external_info.get('text')}")
            print(f"   Href: {external_info.get('href')[:80] if external_info.get('href') else 'none'}")
            print(f"   Data URL: {external_info.get('dataUrl')[:80] if external_info.get('dataUrl') else 'none'}")
            print("\n⚠️ Applying on company website requires navigating to external ATS")
            print(f"   Resume ready: {RESUME_PATH}")
        else:
            print("\n❌ No apply option found for this job")

asyncio.run(main())
