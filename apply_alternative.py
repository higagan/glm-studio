import asyncio
import random
import json
from datetime import datetime
from playwright.async_api import async_playwright

GAGAN = {
    "name": "Gagan Deep",
    "email": "gagan.ping@gmail.com",
    "phone": "+917795374024",
    "location": "Bengaluru, Karnataka, India",
    "company": "High Noon Consulting (HNCPL)",
    "title": "Tech Lead",
    "experience": "11+ years",
    "education": "B.Tech CSE, Amrita School of Engineering, Coimbatore (2012)",
    "linkedin": "https://www.linkedin.com/in/higagan",
    "github": "https://github.com/higagan",
    "resume_path": "/Users/gagandeep/.openclaw/workspace/resume.pdf"
}

SKIP_COMPANIES = ["Recruiting Bond", "People Impact", "Talentojcom", "Peak Hire",
                   "HyrHub", "Fx31labs", "Redfoxa", "Supersourcing"]

log_entries = []

def log(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    line = f"[{ts}] {msg}"
    log_entries.append(line)
    print(line, flush=True)

async def apply_naukri(page):
    log("=== NAUKRI APPLICATIONS ===")
    applied = 0
    skipped = 0
    
    try:
        await page.goto("https://www.naukri.com/mnjuser/recommendedjobs", 
                       wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(5)
        
        log("Loaded Naukri recommended jobs")
        
        for i in range(10):
            try:
                apply_btns = await page.query_selector_all('button:has-text("Apply"), .apply-button, [data-testid="apply-button"]')
                
                if i >= len(apply_btns):
                    break
                
                await apply_btns[i].click()
                await asyncio.sleep(3)
                
                content = await page.content()
                if "applied successfully" in content.lower() or "success" in content.lower():
                    applied += 1
                    log(f"Applied on Naukri: Job {i+1}")
                else:
                    skipped += 1
                    log(f"Could not confirm application for job {i+1}")
                
                await asyncio.sleep(5)
                
            except Exception as e:
                log(f"Error on Naukri job {i+1}: {e}")
                skipped += 1
                
    except Exception as e:
        log(f"Naukri error: {e}")
    
    return applied, skipped

async def apply_cutshort(page):
    log("=== CUTSHORT APPLICATIONS ===")
    applied = 0
    skipped = 0
    
    try:
        await page.goto("https://cutshort.io/job-search", 
                       wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(5)
        
        log("Loaded Cutshort job search")
        
        for i in range(10):
            try:
                apply_btns = await page.query_selector_all('button:has-text("Apply"), .btn-apply, [data-testid="apply"]')
                
                if i >= len(apply_btns):
                    break
                
                company_elem = await page.query_selector('.company-name, [data-testid="company-name"]')
                if company_elem:
                    company = await company_elem.inner_text()
                    if any(s.lower() in company.lower() for s in SKIP_COMPANIES):
                        log(f"Skipping blacklisted: {company}")
                        skipped += 1
                        continue
                
                await apply_btns[i].click()
                await asyncio.sleep(3)
                
                applied += 1
                log(f"Applied on Cutshort: Job {i+1}")
                
                await asyncio.sleep(5)
                
            except Exception as e:
                log(f"Error on Cutshort job {i+1}: {e}")
                skipped += 1
                
    except Exception as e:
        log(f"Cutshort error: {e}")
    
    return applied, skipped

async def apply_instahyre(page):
    log("=== INSTAHYRE APPLICATIONS ===")
    applied = 0
    skipped = 0
    
    try:
        await page.goto("https://www.instahyre.com/candidate/opportunities/?matching=true",
                       wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(5)
        
        log("Loaded Instahyre matching opportunities")
        
        for i in range(10):
            try:
                apply_btns = await page.query_selector_all('button:has-text("Apply"), button:has-text("Show Interest"), .apply-btn')
                
                if i >= len(apply_btns):
                    break
                
                await apply_btns[i].click()
                await asyncio.sleep(3)
                
                applied += 1
                log(f"Applied on Instahyre: Job {i+1}")
                
                await asyncio.sleep(5)
                
            except Exception as e:
                log(f"Error on Instahyre job {i+1}: {e}")
                skipped += 1
                
    except Exception as e:
        log(f"Instahyre error: {e}")
    
    return applied, skipped

async def main():
    log("=" * 60)
    log("ALTERNATIVE PLATFORM APPLICATIONS")
    log("=" * 60)
    
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://localhost:9222")
        context = browser.contexts[0]
        
        page = await context.new_page()
        
        naukri_applied, naukri_skipped = await apply_naukri(page)
        await asyncio.sleep(5)
        
        cutshort_applied, cutshort_skipped = await apply_cutshort(page)
        await asyncio.sleep(5)
        
        instahyre_applied, instahyre_skipped = await apply_instahyre(page)
        
        total_applied = naukri_applied + cutshort_applied + instahyre_applied
        total_skipped = naukri_skipped + cutshort_skipped + instahyre_skipped
        
        log("\n" + "=" * 60)
        log("SUMMARY")
        log("=" * 60)
        log(f"Naukri: {naukri_applied} applied, {naukri_skipped} skipped")
        log(f"Cutshort: {cutshort_applied} applied, {cutshort_skipped} skipped")
        log(f"Instahyre: {instahyre_applied} applied, {instahyre_skipped} skipped")
        log(f"TOTAL: {total_applied} applied, {total_skipped} skipped")
        
        with open('/Users/gagandeep/.openclaw/workspace/alternative_applications.json', 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "naukri": {"applied": naukri_applied, "skipped": naukri_skipped},
                "cutshort": {"applied": cutshort_applied, "skipped": cutshort_skipped},
                "instahyre": {"applied": instahyre_applied, "skipped": instahyre_skipped},
                "total_applied": total_applied,
                "total_skipped": total_skipped,
                "log": log_entries
            }, f, indent=2)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
