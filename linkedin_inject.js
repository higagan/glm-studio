const GAGAN_INFO = {
    name: "Gagan Deep",
    email: "gagan.ping@gmail.com",
    phone: "+917795374024",
    location: "Bengaluru, Karnataka, India",
    company: "High Noon Consulting (HNCPL)",
    title: "Tech Lead",
    experience: "11+ years",
    education: "B.Tech CSE, Amrita School of Engineering, Coimbatore (2012)",
    linkedin: "https://www.linkedin.com/in/higagan",
    github: "https://github.com/higagan",
    resume_path: "/Users/gagandeep/.openclaw/workspace/resume.pdf"
};

const SKIP_COMPANIES = [
    "Recruiting Bond", "People Impact", "Talentojcom", "Peak Hire",
    "HyrHub", "Fx31labs", "Redfoxa", "Supersourcing"
];

let applied = 0;
let skipped = 0;
let log = [];

function logEntry(msg) {
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${msg}`;
    log.push(line);
    console.log(line);
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function randomWait(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    logEntry(`Waiting ${delay}ms...`);
    await wait(delay);
}

async function findEasyApplyButton() {
    const selectors = [
        'button:has-text("Easy Apply")',
        '.jobs-apply-button--top-card button',
        'button.artdeco-button--primary:has-text("Easy Apply")',
        'button[aria-label*="Easy Apply"]'
    ];
    
    for (const selector of selectors) {
        const btn = document.querySelector(selector);
        if (btn && btn.offsetParent !== null) return btn;
    }
    
    // Fallback: search all buttons
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
        if (btn.innerText.toLowerCase().includes('easy apply')) {
            if (btn.offsetParent !== null) return btn;
        }
    }
    
    return null;
}

async function clickEasyApply() {
    const btn = await findEasyApplyButton();
    if (!btn) return false;
    
    btn.click();
    await wait(2000);
    return true;
}

async function fillForm() {
    const maxSteps = 10;
    let steps = 0;
    
    while (steps < maxSteps) {
        steps++;
        await wait(1500);
        
        // Check for success
        const pageText = document.body.innerText.toLowerCase();
        if (pageText.includes('application was submitted') || 
            pageText.includes('successfully applied') ||
            pageText.includes('your application has been')) {
            logEntry('✅ Application submitted successfully!');
            
            // Close modal
            const dismissBtns = document.querySelectorAll('button[aria-label="Dismiss"], .artdeco-modal__dismiss, button');
            for (const btn of dismissBtns) {
                if (btn.innerText.includes('Done') || btn.innerText.includes('Dismiss') || btn.getAttribute('aria-label')?.includes('Dismiss')) {
                    btn.click();
                    await wait(1000);
                    break;
                }
            }
            return true;
        }
        
        // Check for CAPTCHA
        if (document.querySelector('iframe[src*="recaptcha"], .recaptcha, #captcha') ||
            pageText.includes('captcha')) {
            logEntry('⚠️ CAPTCHA detected - skipping');
            return false;
        }
        
        // Fill resume upload
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput && !fileInput.value) {
            // Can't easily set file via JS, but LinkedIn usually pre-fills this
            logEntry('File upload field found (should be pre-filled from profile)');
        }
        
        // Fill email
        const emailInput = document.querySelector('input[type="email"]');
        if (emailInput && !emailInput.value) {
            emailInput.value = GAGAN_INFO.email;
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Fill phone
        const phoneInput = document.querySelector('input[type="tel"]');
        if (phoneInput && !phoneInput.value) {
            phoneInput.value = GAGAN_INFO.phone;
            phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Try clicking buttons
        const buttonTexts = ["Submit application", "Review", "Next", "Continue", "Save"];
        let actionTaken = false;
        
        for (const btnText of buttonTexts) {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                if (btn.innerText.toLowerCase().includes(btnText.toLowerCase()) && !btn.disabled) {
                    btn.click();
                    logEntry(`Clicked: ${btn.innerText.trim()}`);
                    actionTaken = true;
                    await wait(2000);
                    break;
                }
            }
            if (actionTaken) break;
        }
        
        if (!actionTaken) {
            logEntry('No action button found');
            return false;
        }
    }
    
    return false;
}

async function applyToCurrentJob() {
    // Get job details
    let title = "Unknown";
    let company = "Unknown";
    
    try {
        const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title h1 a, .job-details-jobs-unified-top-card__job-title');
        if (titleEl) title = titleEl.innerText.trim();
        
        const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__primary-description a');
        if (companyEl) company = companyEl.innerText.trim();
    } catch (e) {}
    
    logEntry(`\n--- ${title} at ${company} ---`);
    
    // Check skip companies
    if (SKIP_COMPANIES.some(skip => company.toLowerCase().includes(skip.toLowerCase()))) {
        logEntry(`⏭️ Skipping blacklisted company: ${company}`);
        skipped++;
        return false;
    }
    
    // Click Easy Apply
    if (!await clickEasyApply()) {
        logEntry('No Easy Apply button found');
        skipped++;
        return false;
    }
    
    // Fill form
    if (await fillForm()) {
        applied++;
        logEntry(`✅ Applied ${applied}/15: ${title} at ${company}`);
        return true;
    } else {
        logEntry(`❌ Failed to apply: ${title}`);
        skipped++;
        
        // Try to close modal
        for (let i = 0; i < 3; i++) {
            const dismissBtns = document.querySelectorAll('button[aria-label="Dismiss"], .artdeco-modal__dismiss, button');
            for (const btn of dismissBtns) {
                if (btn.innerText.includes('Discard') || btn.getAttribute('aria-label')?.includes('Dismiss')) {
                    btn.click();
                    await wait(500);
                    break;
                }
            }
        }
        return false;
    }
}

async function getJobCards() {
    return document.querySelectorAll('.jobs-search-results__list-item, [data-job-id]');
}

async function scrollToJob(index) {
    const cards = await getJobCards();
    if (index < cards.length) {
        cards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        await wait(1000);
        cards[index].click();
        await wait(2000);
        return true;
    }
    return false;
}

async function runApplications() {
    logEntry('🚀 STARTING EASY APPLY BOT');
    logEntry('==========================');
    
    const maxJobs = 20;
    let jobIndex = 0;
    
    while (applied < 15 && jobIndex < maxJobs) {
        // Scroll to load more jobs if needed
        if (jobIndex > 0 && jobIndex % 5 === 0) {
            window.scrollTo(0, document.body.scrollHeight);
            await wait(2000);
        }
        
        const cards = await getJobCards();
        if (jobIndex >= cards.length) {
            logEntry('No more jobs found');
            break;
        }
        
        logEntry(`\nJob ${jobIndex + 1}/${cards.length}`);
        
        // Click on job to see details
        if (!await scrollToJob(jobIndex)) {
            jobIndex++;
            continue;
        }
        
        // Apply
        await applyToCurrentJob();
        jobIndex++;
        
        // Wait between applications (human-like delay)
        if (applied < 15) {
            await randomWait(8000, 15000);  // 8-15 seconds
        }
    }
    
    logEntry('\n==========================');
    logEntry(`FINISHED: ${applied} applied, ${skipped} skipped`);
    
    // Save log
    const logText = log.join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linkedin_apply_log.txt';
    a.click();
}

// Run
runApplications().catch(e => console.error('Error:', e));
