import asyncio
import time
import random
import json
from datetime import datetime
from playwright.async_api import async_playwright

GAGAN_INFO = {
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

SKIP_COMPANIES = [
    "Recruiting Bond", "People Impact", "Talentojcom", "Peak Hire",
    "HyrHub", "Fx31labs", "Redfoxa", "Supersourcing"
]

log_entries = []

async def log_entry(entry):
    timestamp = datetime.now().strftime('%H:%M:%S')
    line = f"[{timestamp}] {entry}"
    log_entries.append(line)
    print(line, flush=True)

async def main():
    await log_entry("=" * 60)
    await log_entry("LINKEDIN JOB CRAWLER - List jobs for manual application")
    await log_entry("=" * 60)
    
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://localhost:9222")
        context = browser.contexts[0] if browser.contexts else await browser.new_context()
        
        page = await context.new_page()
        
        # Navigate to Easy Apply search
        search_url = "https://www.linkedin.com/jobs/search/?f_AL=true&keywords=python%20genai%20golang%20backend&location=India"
        await page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(5)
        
        await log_entry("Loaded LinkedIn Easy Apply search")
        
        # Scroll multiple times to load jobs
        for scroll in range(5):
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            await asyncio.sleep(2)
        
        # Extract job listings
        jobs = []
        job_cards = await page.query_selector_all('.jobs-search-results__list-item, [data-job-id]')
        
        await log_entry(f"Found {len(job_cards)} job cards")
        
        for i, card in enumerate(job_cards[:25]):  # Get first 25
            try:
                # Click to load details
                await card.click()
                await asyncio.sleep(2)
                
                # Get title
                title_elem = await page.query_selector('.job-details-jobs-unified-top-card__job-title h1 a, .job-details-jobs-unified-top-card__job-title')
                title = await title_elem.inner_text() if title_elem else "Unknown"
                
                # Get company
                company_elem = await page.query_selector('.job-details-jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__primary-description a')
                company = await company_elem.inner_text() if company_elem else "Unknown"
                
                # Get location
                location_elem = await page.query_selector('.job-details-jobs-unified-top-card__bullet')
                location = await location_elem.inner_text() if location_elem else "Unknown"
                
                # Check Easy Apply
                easy_apply = await page.query_selector('button:has-text("Easy Apply")')
                has_easy_apply = easy_apply is not None
                
                # Check external apply
                external_apply = await page.query_selector('button:has-text("Apply"):not(:has-text("Easy Apply"))')
                has_external = external_apply is not None
                
                # Skip check
                should_skip = any(skip.lower() in company.lower() for skip in SKIP_COMPANIES)
                
                job_info = {
                    'index': i+1,
                    'title': title.strip(),
                    'company': company.strip(),
                    'location': location.strip(),
                    'has_easy_apply': has_easy_apply,
                    'has_external': has_external,
                    'skip': should_skip,
                    'url': page.url
                }
                
                jobs.append(job_info)
                
                status = "✅" if has_easy_apply else ("🔗" if has_external else "❓")
                skip_note = " [SKIP - Blacklisted]" if should_skip else ""
                await log_entry(f"{status} {i+1}. {title.strip()} at {company.strip()}{skip_note}")
                
                await asyncio.sleep(1)
                
            except Exception as e:
                await log_entry(f"Error on job {i+1}: {e}")
                continue
        
        # Save to file
        output = {
            'timestamp': datetime.now().isoformat(),
            'candidate': GAGAN_INFO['name'],
            'search_url': search_url,
            'jobs': jobs
        }
        
        with open('/Users/gagandeep/.openclaw/workspace/jobs_found.json', 'w') as f:
            json.dump(output, f, indent=2)
        
        # Create markdown summary
        easy_apply_jobs = [j for j in jobs if j['has_easy_apply'] and not j['skip']]
        external_jobs = [j for j in jobs if j['has_external'] and not j['skip']]
        
        md = f"""# LinkedIn Jobs Found - {datetime.now().strftime('%Y-%m-%d %H:%M')}

## Quick Apply List (Easy Apply)

"""
        for j in easy_apply_jobs[:15]:
            md += f"- **{j['title']}** at {j['company']} - {j['location']}\n"
        
        md += f"\n## External Apply List (Company Sites)\n\n"
        for j in external_jobs[:10]:
            md += f"- **{j['title']}** at {j['company']} - {j['location']}\n"
        
        md += f"\n## Full Details\n\n```json\n{json.dumps(jobs, indent=2)}\n```\n"
        
        with open('/Users/gagandeep/.openclaw/workspace/jobs_list.md', 'w') as f:
            f.write(md)
        
        await log_entry(f"\n{'='*60}")
        await log_entry(f"Found {len(easy_apply_jobs)} Easy Apply jobs")
        await log_entry(f"Found {len(external_jobs)} External Apply jobs")
        await log_entry(f"Saved to jobs_found.json and jobs_list.md")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
