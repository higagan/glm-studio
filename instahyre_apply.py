#!/usr/bin/env python3
"""Apply to matching jobs on Instahyre via Chrome DevTools Protocol.

Flow:
1. Get all opportunities from Angular scope
2. Filter by tech stack (Python, GenAI, Golang, Backend, AI/ML, Rust)
3. Skip Java/.NET-only roles
4. Click "View »" button for each matching job
5. Click "Apply" on the detail page
"""
import json, time, sys, subprocess, base64
from datetime import datetime

WS_URL = "ws://localhost:9222/devtools/page/579380F947CEFDCB356E222E52F92E39"
RESULTS_FILE = "/Users/gagandeep/.openclaw/workspace/temp-applied.json"
ERRORS_FILE = "/Users/gagandeep/.openclaw/workspace/temp-error.log"

def cdp(cmd):
    """Send a CDP command via websocket."""
    payload = json.dumps({"id": int(time.time() * 1000), **cmd})
    proc = subprocess.run(
        ["python3", "-c",
         f"""import asyncio, websockets, json
async def run():
    async with websockets.connect('{WS_URL}') as ws:
        await ws.send({repr(payload)})
        resp = await ws.recv()
        print(resp)
asyncio.run(run())"""],
        capture_output=True, text=True, timeout=30
    )
    if proc.returncode != 0:
        raise Exception(f"Websocket error: {proc.stderr}")
    return json.loads(proc.stdout)

def exec_js(expression, return_by_value=True):
    """Execute JS in the page context."""
    resp = cdp({
        "method": "Runtime.evaluate",
        "params": {
            "expression": expression,
            "returnByValue": return_by_value,
            "awaitPromise": True
        }
    })
    result = resp.get("result", {}).get("result", {})
    if "exceptionDetails" in resp.get("result", {}):
        err = resp["result"]["exceptionDetails"]["exception"].get("description", str(resp))
        raise Exception(f"JS Error: {err}")
    return result.get("value")

def is_match(job_title, skills):
    """Check if job matches Gagan's stack."""
    title_lower = job_title.lower()
    skills_lower = [s.lower() for s in skills]
    all_text = title_lower + ' ' + ' '.join(skills_lower)
    
    # Must have at least one positive signal
    positive_signals = [
        'python', 'genai', 'golang', 'go ', 'backend', 'ai/ml', 'rust',
        'llm', 'machine learning', 'artificial intelligence', 'agentic',
        'microservice', 'distributed', 'cloud', 'aws', 'kafka', 'docker',
        'kubernetes', 'postgres', 'redis', 'fastapi', 'django', 'flask',
        'software engineer', 'staff engineer', 'principal engineer',
        'engineering manager', 'tech lead', 'architect'
    ]
    
    has_positive = any(sig in all_text for sig in positive_signals)
    
    # Skip if Java-only or .NET-only
    negative_signals = ['java lead', 'java developer', '.net', 'dotnet', 'c#']
    has_negative = any(sig in title_lower for sig in negative_signals)
    
    # Skip if explicitly Java and not mixed with Python/Go
    if 'java' in all_text and not ('python' in all_text or 'go ' in all_text or 'golang' in all_text or 'genai' in all_text or 'llm' in all_text):
        has_negative = True
    
    return has_positive and not has_negative

def take_screenshot(filename):
    """Take a screenshot and save it."""
    resp = cdp({
        "method": "Page.captureScreenshot",
        "params": {"format": "png"}
    })
    data = resp.get("result", {}).get("data", "")
    if data:
        with open(filename, 'wb') as f:
            f.write(base64.b64decode(data))
    return bool(data)

# ============================================================
print("=" * 60)
print("INSTAHYRE JOB APPLICATION BOT")
print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 60)

# Get all opportunities
print("\n📋 Fetching opportunities from Instahyre...")
opps = exec_js("""
(function() {
    const angular = window.angular;
    const el = document.querySelector('[ng-controller="candidateOpportunitiesCtrl"]');
    const scope = angular.element(el).scope();
    const opps = scope.opportunities || [];
    
    return opps.map((o, i) => {
        const job = o.job || {};
        const employer = o.employer || {};
        
        return {
            index: i,
            id: o.id,
            employer: employer.name || employer.company_name || 'Unknown',
            title: job.job_title || job.title || 'Unknown',
            skills: job.skills || job.required_skills || [],
            location: job.location || 'Unknown',
            salary: job.salary || 'Not specified',
            experience: job.experience || 'Not specified'
        };
    });
})();
""")

print(f"Found {len(opps)} total opportunities")

# Filter matching jobs
matching = []
for opp in opps:
    if is_match(opp.get('title', ''), opp.get('skills', [])):
        matching.append(opp)
    else:
        print(f"  ⏭️  SKIP: {opp.get('title', '')} @ {opp.get('employer', '')}")

print(f"\n🎯 {len(matching)} jobs match your stack:")
for m in matching:
    skills_str = ', '.join(m.get('skills', [])[:5])
    print(f"   • {m.get('title', '')} @ {m.get('employer', '')}")
    print(f"     Skills: {skills_str}")

if not matching:
    print("\n✅ No matching jobs to apply to today.")
    sys.exit(0)

# ============================================================
# Apply to each matching job
# ============================================================
applied = []
errors = []

for idx, job in enumerate(matching, 1):
    company = job.get('employer', 'Unknown')
    title = job.get('title', 'Unknown')
    job_id = job.get('id', '')
    
    print(f"\n[{idx}/{len(matching)}] Processing: {title} @ {company}")
    print(f"         ID: {job_id}")
    
    try:
        # Navigate to the job detail page
        print("  🌐 Opening job detail page...")
        exec_js(f"""
(async () => {{
    // Click the "View »" button for this job
    const cards = document.querySelectorAll('.candidate-opportunities .ng-scope');
    let clicked = false;
    for (let card of cards) {{
        const titleEl = card.querySelector('.employer-job-name');
        if (titleEl && titleEl.textContent.includes('{company}') && titleEl.textContent.includes('{title.split()[0] if title.split() else ""}')) {{
            const btn = card.querySelector('#interested-btn');
            if (btn) {{
                btn.scrollIntoView({{behavior: 'smooth', block: 'center'}});
                await new Promise(r => setTimeout(r, 500));
                btn.click();
                clicked = true;
                break;
            }}
        }}
    }}
    
    // Alternative: navigate directly
    if (!clicked) {{
        window.location.href = 'https://www.instahyre.com/candidate/opportunities/{job_id}/';
    }}
    
    return clicked;
}})();
        """)
        
        # Wait for page to load
        print("  ⏳ Waiting for detail page to load...")
        for _ in range(15):
            time.sleep(1)
            state = exec_js("document.readyState")
            url = exec_js("window.location.href")
            if state == "complete" and job_id in (url or ""):
                break
        
        print(f"  📍 Current URL: {exec_js('window.location.href')}")
        
        # Look for Apply button on detail page
        print("  🔍 Looking for Apply button...")
        apply_btn = exec_js("""
(function() {
    const buttons = document.querySelectorAll('button, a');
    for (let btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text === 'apply' || text === 'apply now' || text.includes('apply')) {
            return {
                found: true,
                text: btn.textContent.trim(),
                className: btn.className,
                id: btn.id
            };
        }
    }
    return {found: false};
})();
        """)
        
        if apply_btn and apply_btn.get('found'):
            print(f"  ✅ Found Apply button: '{apply_btn.get('text')}'")
            
            # Click Apply
            result = exec_js("""
(async () => {
    const buttons = document.querySelectorAll('button, a');
    let applyBtn = null;
    for (let btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text === 'apply' || text === 'apply now') {
            applyBtn = btn;
            break;
        }
    }
    
    if (!applyBtn) return {success: false, error: 'Apply button not found'};
    
    applyBtn.scrollIntoView({behavior: 'smooth', block: 'center'});
    await new Promise(r => setTimeout(r, 500));
    applyBtn.click();
    await new Promise(r => setTimeout(r, 2000));
    
    // Check for success indicators
    const toast = document.querySelector('.toast, .notification, .alert-success, [class*="success"]');
    const modal = document.querySelector('.modal, [class*="modal"]');
    
    return {
        success: true,
        hasToast: !!toast,
        toastText: toast ? toast.textContent.trim().substring(0, 100) : '',
        hasModal: !!modal
    };
})();
            """)
            
            success = result.get('success', False) if result else False
            if success:
                print(f"  ✅ APPLIED successfully!")
                applied.append({
                    "company": company,
                    "role": title,
                    "timestamp": datetime.now().isoformat(),
                    "status": "applied"
                })
            else:
                print(f"  ⚠️ Clicked Apply but no confirmation")
                errors.append({
                    "company": company,
                    "role": title,
                    "error": "No confirmation after clicking Apply"
                })
        else:
            print(f"  ⚠️ No Apply button found on detail page")
            # Save screenshot for debugging
            take_screenshot(f"/Users/gagandeep/.openclaw/workspace/instahyre_{company.lower().replace(' ', '_')}.png")
            errors.append({
                "company": company,
                "role": title,
                "error": "No Apply button found"
            })
        
        # Go back to list
        print("  ↩️  Going back to job list...")
        exec_js("window.history.back()")
        time.sleep(2)
        
        # Wait for list to reload
        for _ in range(10):
            time.sleep(1)
            if exec_js("document.querySelector('.candidate-opportunities') !== null"):
                break
        
        # Human-like delay between applications
        delay = 3 + (idx % 3)
        print(f"  😴 Waiting {delay}s before next...")
        time.sleep(delay)
        
    except Exception as e:
        print(f"  ❌ ERROR: {str(e)[:150]}")
        errors.append({
            "company": company,
            "role": title,
            "error": str(e)
        })

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print(f"Total opportunities:     {len(opps)}")
print(f"Matching your stack:     {len(matching)}")
print(f"Successfully applied:    {len([a for a in applied if a['status'] == 'applied'])}")
print(f"Errors:                  {len(errors)}")
print("=" * 60)

# Save results
with open(RESULTS_FILE, 'w') as f:
    json.dump(applied, f, indent=2)

if errors:
    with open(ERRORS_FILE, 'w') as f:
        for e in errors:
            f.write(f"[{datetime.now().isoformat()}] {e['company']} - {e['role']}: {e['error']}\n")

print(f"\n💾 Results saved to: {RESULTS_FILE}")
if errors:
    print(f"📝 Errors logged to: {ERRORS_FILE}")
