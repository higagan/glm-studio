import asyncio
import json
from playwright.async_api import async_playwright

async def inject_and_run():
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://localhost:9222")
        context = browser.contexts[0]
        
        # Find LinkedIn tab
        page = None
        for pg in context.pages:
            if 'linkedin.com/jobs' in pg.url:
                page = pg
                break
        
        if not page:
            print("LinkedIn jobs tab not found!")
            return
        
        print(f"Found LinkedIn tab: {page.url}")
        
        # Read the JS file
        with open('/Users/gagandeep/.openclaw/workspace/linkedin_inject.js', 'r') as f:
            js_code = f.read()
        
        # Inject and run
        try:
            await page.evaluate(js_code)
            print("Script injected successfully!")
            print("Check browser console for progress...")
        except Exception as e:
            print(f"Error injecting script: {e}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(inject_and_run())
