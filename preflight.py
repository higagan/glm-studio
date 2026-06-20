#!/usr/bin/env python3
"""Pre-flight check: Ensure Chrome is running with remote debugging."""
import json
import sys
import urllib.request


def check_chrome_debug():
    """Check if Chrome is running with remote debugging on port 9222."""
    try:
        req = urllib.request.Request('http://localhost:9222/json/list', method='GET')
        with urllib.request.urlopen(req, timeout=3) as resp:
            pages = json.loads(resp.read())
            linkedin_pages = [p for p in pages if 'linkedin.com' in p.get('url', '')]
            return True, len(linkedin_pages), pages
    except Exception as e:
        return False, 0, []


def main():
    print("=" * 60)
    print("JOB APPLICATION PRE-FLIGHT CHECK")
    print("=" * 60)
    print()

    success, count, pages = check_chrome_debug()

    if success and count > 0:
        print(f"✅ Chrome debug ready ({count} LinkedIn pages)")
        for p in pages:
            if 'linkedin.com' in p.get('url', ''):
                print(f"   Page: {p['url'][:80]}")
        return 0
    elif success and count == 0:
        print("⚠️  Chrome running but no LinkedIn page")
        print("   Please open LinkedIn jobs in the Chrome debug profile:")
        print("   https://www.linkedin.com/jobs/search/?f_AL=true")
        return 1
    else:
        print("❌ Chrome not running with remote debugging")
        print()
        print("To start Chrome with debugging, run:")
        print('  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\")
        print('    --remote-debugging-port=9222 \\")
        print('    --user-data-dir=$HOME/.openclaw/chrome-debug-profile \\")
        print('    https://www.linkedin.com/jobs/search/?f_AL=true')
        return 1


if __name__ == '__main__':
    sys.exit(main())
