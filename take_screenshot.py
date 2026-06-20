from playwright.sync_api import sync_playwright
import time

url = "https://medibrick-outreach.streamlit.app/"
screenshot_path = "/Users/gagandeep/Desktop/medibrick-ui-screenshot.png"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    
    print("Loading Streamlit app...")
    page.goto(url, wait_until="networkidle", timeout=60000)
    
    # Wait for Streamlit to render
    time.sleep(5)
    
    # Take screenshot
    page.screenshot(path=screenshot_path, full_page=True)
    print(f"Screenshot saved: {screenshot_path}")
    
    browser.close()
