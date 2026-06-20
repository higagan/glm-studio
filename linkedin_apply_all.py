#!/usr/bin/env python3
"""
LinkedIn Easy Apply for specific jobs.
Approach: reuse ONE authenticated page, navigate by direct URL, use JS evaluation
for robust button detection. Report which jobs applied and which need manual action.
"""
import json, time, sys, re
from datetime import datetime
from pathlib import Path

JOBS_FILE = Path('/Users/gagandeep/.openclaw/workspace/gagan_job_matches.json')
LOG_FILE = Path('/Users/gagandeep/.openclaw/workspace/job-apply-log.md')
JSON_LOG = Path('/Users/gagandeep/.openclaw/workspace/last_run_specific_jobs.json')
RESUME_PATH = Path('/Users/gagandeep/.openclaw/workspace/resume.pdf')
CDP_URL = 'http://localhost:9222'

PROFILE = {
    'email': 'gagan.ping@gmail.com',
    'phone': '+917795374024',
    'noticeDays': '30',
    'currentSalary': '42',
    'expectedSalary': '45',
}


def log(msg, kind='info'):
    pfx = {'success':'✅ ', 'error':'❌ ', 'warn':'⚠️ ', 'skip':'⏭️ ', 'info':''}[kind]
    line = f"{pfx}{msg}"
    print(line)
    sys.stdout.flush()


def load_jobs():
    with open(JOBS_FILE) as f:
        return json.load(f)


# ─── CDP helpers ──────────────────────────────────────────────────────────
import urllib.request

def cdp_get_tabs():
    req = urllib.request.Request(f'{CDP_URL}/json/list', headers={'User-Agent':'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode())


def cdp_find_linkedin_tab():
    tabs = cdp_get_tabs()
    for t in tabs:
        if t.get('type') == 'page' and 'linkedin.com' in t.get('url', ''):
            return t
    return None


def cdp_eval(tab, expr, await_promise=True):
    import websockets, asyncio
    async def _eval():
        ws_url = tab['webSocketDebuggerUrl']
        async with websockets.connect(ws_url) as ws:
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({
                'id': msg_id,
                'method': 'Runtime.evaluate',
                'params': {
                    'expression': expr,
                    'returnByValue': True,
                    'awaitPromise': await_promise,
                    'timeout': 5000,
                }
            })
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            result = resp.get('result', {}).get('result', {})
            return result.get('value'), result.get('type')
    return asyncio.get_event_loop().run_until_complete(_eval())


# ─── Application flow ─────────────────────────────────────────────────────
def apply_to_job(tab, job):
    job_id = job['jobId']
    title = job['title']
    company = job['company']
    started = time.time()
    result = {'jobId': job_id, 'title': title, 'company': company,
              'status': 'failed', 'detail': '', 'elapsedSec': 0}

    log(f"[{job['rank']}/20] {title} @ {company}")

    try:
        # Navigate
        url = f"https://www.linkedin.com/jobs/view/{job_id}"
        cdp_eval(tab, f"window.location.href = '{url}'")
        log(f"Navigating to {url}")
        for _ in range(45):
            time.sleep(1)
            ready, _ = cdp_eval(tab, "document.readyState")
            if ready == 'complete':
                time.sleep(4)
                break
        else:
            result['detail'] = 'Page load timeout'
            log("Page load timeout", 'error')
            return result

        # Check login
        cur_url, _ = cdp_eval(tab, "window.location.href")
        if 'login' in cur_url or 'auth' in cur_url:
            result['detail'] = 'Login required'
            log("Login required", 'error')
            return result

        # Dismiss sign-in prompt
        cdp_eval(tab, '''
            (()=>{
                const b=document.querySelector('button[aria-label="Dismiss"]');
                if(b){b.click(); return 1;} return 0;
            })();
        ''')
        time.sleep(1)

        # Find and click Easy Apply
        found, btn_type = cdp_eval(tab, '''
            (()=>{
                const panel=document.querySelector('.jobs-search__job-details--container')
                    ||document.querySelector('.job-view-layout')
                    ||document.querySelector('[class*="job-details"]')
                    ||document;
                const all=panel.querySelectorAll('button,a,[role="button"]');
                let best=null, bestScore=0;
                for(let btn of all){
                    const txt=btn.textContent.trim().toLowerCase();
                    const aria=(btn.getAttribute('aria-label')||'').toLowerCase();
                    if(txt==='easy apply'||aria.includes('easy apply to this job')){
                        let score=10;
                        const cls=(btn.className||'').toLowerCase();
                        if(cls.includes('artdeco-button--primary')||cls.includes('jobs-apply-button')||cls.includes('_85d78919')) score+=5;
                        if(txt.length>40) score=-100;
                        if(score>bestScore){bestScore=score; best=btn;}
                    }
                }
                if(!best) return {found:false};
                best.scrollIntoView({block:"center",behavior:"smooth"});
                return {found:true, text:best.textContent.trim(), aria:best.getAttribute('aria-label'), tag:best.tagName};
            })();
        ''')
        if not found or not found.get('found'):
            result['status'] = 'skipped'
            result['detail'] = 'No Easy Apply button'
            log("No Easy Apply — skipped", 'skip')
            return result

        log(f"Easy Apply found: {found.get('text','')}")

        # Click using JS dispatch + native click
        click_res, _ = cdp_eval(tab, '''
            (async ()=>{
                const panel=document.querySelector('.jobs-search__job-details--container')
                    ||document.querySelector('.job-view-layout')
                    ||document.querySelector('[class*="job-details"]')
                    ||document;
                const all=panel.querySelectorAll('button,a,[role="button"]');
                let best=null, bestScore=0;
                for(let btn of all){
                    const txt=btn.textContent.trim().toLowerCase();
                    const aria=(btn.getAttribute('aria-label')||'').toLowerCase();
                    if(txt==='easy apply'||aria.includes('easy apply to this job')){
                        let score=10;
                        const cls=(btn.className||'').toLowerCase();
                        if(cls.includes('artdeco-button--primary')||cls.includes('jobs-apply-button')||cls.includes('_85d78919')) score+=5;
                        if(txt.length>40) score=-100;
                        if(score>bestScore){bestScore=score; best=btn;}
                    }
                }
                if(!best) return {clicked:false, reason:'not found'};
                best.scrollIntoView({block:"center",behavior:"smooth"});
                await new Promise(r=>setTimeout(r,1200));
                const rect=best.getBoundingClientRect();
                best.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2}));
                await new Promise(r=>setTimeout(r,300));
                best.click();
                return {clicked:true, text:best.textContent.trim()};
            })();
        ''')
        if not click_res or not click_res.get('clicked'):
            result['detail'] = f"Click failed: {click_res.get('reason','unknown')}"
            log("Could not click Easy Apply", 'error')
            return result

        time.sleep(5)

        # Application flow loop
        applied = False
        steps = 0
        stuck = 0
        while steps < 14 and stuck < 5:
            time.sleep(2)

            state, _ = cdp_eval(tab, '''
                (()=>{
                    const s=document.querySelector('button[aria-label="Submit application"]');
                    const n=document.querySelector('button[aria-label="Continue to next step"]');
                    const r=document.querySelector('button[aria-label="Review your application"]');
                    const err=document.querySelector('.artdeco-inline-feedback__message,[role="alert"]');
                    const body=document.body.textContent.toLowerCase();
                    return {
                        hasSubmit:!!s, hasNext:!!n, hasReview:!!r,
                        errorText: err?err.textContent.trim():'',
                        alreadyApplied: body.includes('application sent')||body.includes('already applied')||body.includes('you applied'),
                        modalOpen:!!document.querySelector('.artdeco-modal,[role="dialog"]')
                    };
                })();
            ''')

            if state.get('errorText'):
                log(f"Form error: {state['errorText']}", 'warn')

            if state.get('alreadyApplied'):
                applied = True
                break

            # Auto-fill known fields
            cdp_eval(tab, f'''
                (()=>{{
                    const fill=(sel,val)=>{{
                        const el=document.querySelector(sel);
                        if(el&&el.value===''){{el.focus();el.value=val;el.dispatchEvent(new Event('input',{{bubbles:true}}));el.dispatchEvent(new Event('change',{{bubbles:true}}));return 1;}}
                        return 0;
                    }};
                    let n=0;
                    // notice period
                    document.querySelectorAll('input[type="text"],textarea').forEach(inp=>{{
                        const lbl=(inp.closest('label')?.textContent||inp.previousElementSibling?.textContent||'').toLowerCase();
                        const aria=(inp.getAttribute('aria-label')||'').toLowerCase();
                        const ph=(inp.getAttribute('placeholder')||'').toLowerCase();
                        const comb=lbl+' '+aria+' '+ph;
                        if(comb.includes('notice')||comb.includes('join')||comb.includes('days')||comb.includes('how soon')){{
                            if(inp.value===''){{inp.focus();inp.value='{PROFILE['noticeDays']}';inp.dispatchEvent(new Event('input',{{bubbles:true}}));n++;}}
                        }}
                        if(comb.includes('expected salary')||comb.includes('expected ctc')){{
                            if(inp.value===''){{inp.focus();inp.value='{PROFILE['expectedSalary']}';inp.dispatchEvent(new Event('input',{{bubbles:true}}));n++;}}
                        }}
                        if(comb.includes('current salary')||comb.includes('current ctc')){{
                            if(inp.value===''){{inp.focus();inp.value='{PROFILE['currentSalary']}';inp.dispatchEvent(new Event('input',{{bubbles:true}}));n++;}}
                        }}
                    }});
                    return n;
                }})();
            ''')

            if state.get('hasSubmit'):
                log("Submitting application...")
                cdp_eval(tab, '''
                    (async ()=>{
                        const s=document.querySelector('button[aria-label="Submit application"]');
                        if(s){s.scrollIntoView({block:"center"}); await new Promise(r=>setTimeout(r,500)); s.click();}
                    })();
                ''')
                time.sleep(3)
                applied = True
                break
            elif state.get('hasNext'):
                log("Next step...")
                cdp_eval(tab, 'document.querySelector("button[aria-label=\"Continue to next step\"]").click()')
                stuck = 0
            elif state.get('hasReview'):
                log("Review step...")
                cdp_eval(tab, 'document.querySelector("button[aria-label=\"Review your application\"]").click()')
                stuck += 1
            else:
                log("No buttons found, checking if done...")
                if not state.get('modalOpen'):
                    break
                stuck += 1
            steps += 1

        if applied:
            result['status'] = 'applied'
            result['detail'] = 'Application submitted'
            log("Applied!", 'success')
        else:
            result['detail'] = 'Application flow did not complete'
            log("Application flow incomplete", 'error')

        # Close modal
        cdp_eval(tab, 'document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",keyCode:27}))')
        time.sleep(1)

    except Exception as e:
        result['detail'] = str(e)[:200]
        log(f"Error: {str(e)[:120]}", 'error')

    result['elapsedSec'] = round(time.time() - started, 1)
    return result


# ─── Main ─────────────────────────────────────────────────────────────────
def main():
    log("=" * 60)
    log("LINKEDIN SPECIFIC JOBS APPLY — CDP Direct")
    log(f"Started: {datetime.now().strftime('%H:%M:%S')}")
    log("=" * 60)

    jobs = load_jobs()
    log(f"Loaded {len(jobs)} jobs")

    tab = cdp_find_linkedin_tab()
    if not tab:
        log("No LinkedIn tab found in Chrome. Start Chrome with --remote-debugging-port=9222", 'error')
        return
    log(f"Using tab: {tab['url'][:80]}")

    results = []
    for job in jobs:
        res = apply_to_job(tab, job)
        results.append(res)
        time.sleep(3)

    total = len(results)
    applied = sum(1 for r in results if r['status'] == 'applied')
    skipped = sum(1 for r in results if r['status'] == 'skipped')
    failed = sum(1 for r in results if r['status'] == 'failed')

    log("=" * 60)
    log("SUMMARY")
    log(f"Applied: {applied}/{total}")
    log(f"Skipped: {skipped}/{total}")
    log(f"Failed:  {failed}/{total}")

    final = {
        'timestamp': datetime.now().isoformat(),
        'total': total, 'applied': applied, 'skipped': skipped, 'failed': failed,
        'results': results
    }
    with open(JSON_LOG, 'w') as f:
        json.dump(final, f, indent=2)

    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(f"\n## LinkedIn Specific Jobs — {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")
        f.write(f"**Applied:** {applied}  **Skipped:** {skipped}  **Failed:** {failed}\n\n")
        for r in results:
            icon = '✅' if r['status'] == 'applied' else '⏭️' if r['status'] == 'skipped' else '❌'
            f.write(f"{icon} {r['title']} @ {r['company']} — {r['status']} ({r['elapsedSec']}s)\n")
            if r.get('detail'):
                f.write(f"   {r['detail']}\n")

    log(f"Saved results to {JSON_LOG}")


if __name__ == '__main__':
    main()
