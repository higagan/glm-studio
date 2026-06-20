#!/usr/bin/env python3
import requests, json, re, sys

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

url = 'https://www.linkedin.com/jobs/search/?currentJobId=4198104701'
try:
    r = requests.get(url, headers=headers, timeout=10)
    print(f'Status: {r.status_code}')
    
    if 'externalApplyUrl' in r.text:
        matches = re.findall(r'externalApplyUrl["\':\s]+([^"\s,}]+)', r.text)
        print(f'External URLs: {matches[:5]}')
    else:
        print('No externalApplyUrl found')
        
    # Look for any apply-related URLs
    all_urls = re.findall(r'https?://[^\s"<>]+(?:greenhouse|lever|workday|careers|jobs)[^\s"<>]*', r.text)
    print(f'Career URLs found: {all_urls[:10]}')
    
except Exception as e:
    print(f'Error: {e}')
