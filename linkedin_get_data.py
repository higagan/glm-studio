#!/usr/bin/env python3
"""Extract external apply URL directly from LinkedIn job data."""
import asyncio, websockets, json, time

WS_URL = 'ws://localhost:9222/devtools/page/579380F947CEFDCB356E222E52F92E39'

async def main():
    async with websockets.connect(WS_URL) as ws:
        async def eval_js(expr):
            msg_id = int(time.time() * 1000000) % 1000000000
            payload = json.dumps({'id': msg_id, 'method': 'Runtime.evaluate',
                'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': True}})
            await ws.send(payload)
            resp = json.loads(await ws.recv())
            return resp.get('result', {}).get('result', {}).get('value')
        
        print("=" * 60)
        print("EXTRACTING APPLY URL FROM PAGE DATA")
        print("=" * 60)
        
        # Get all job-related data from window
        data = await eval_js('''
            (() => {
                let results = {};
                
                // Check for LinkedIn's appState or dashAppData
                if (window.__INITIAL_STATE__) {
                    results.initialState = window.__INITIAL_STATE__;
                }
                if (window.dashAppData) {
                    results.dashAppData = window.dashAppData;
                }
                if (window.__data) {
                    results.data = window.__data;
                }
                
                // Check for application URL in meta tags
                const metas = document.querySelectorAll('meta[property*="url"], meta[name*="url"]');
                let metaUrls = [];
                for (let meta of metas) {
                    metaUrls.push({
                        property: meta.getAttribute('property'),
                        name: meta.getAttribute('name'),
                        content: meta.getAttribute('content')
                    });
                }
                results.metaUrls = metaUrls;
                
                // Check all links in job detail
                const detailPanel = document.querySelector('.jobs-search__job-details--container');
                if (detailPanel) {
                    const links = detailPanel.querySelectorAll('a[href]');
                    let linkInfo = [];
                    for (let link of links) {
                        const href = link.href;
                        if (href.includes('greenhouse') || href.includes('lever') || 
                            href.includes('workday') || href.includes('careers') ||
                            href.includes('jobs') || href.includes('apply')) {
                            linkInfo.push({
                                href: href,
                                text: link.textContent.trim()
                            });
                        }
                    }
                    results.detailLinks = linkInfo;
                }
                
                return results;
            })();
        ''')
        
        print(json.dumps(data, indent=2)[:2000])
        
        # Also check if there's a script tag with job data
        scripts = await eval_js('''
            (() => {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                let results = [];
                for (let script of scripts) {
                    try {
                        const data = JSON.parse(script.textContent);
                        if (data['@type'] === 'JobPosting') {
                            results.push(data);
                        }
                    } catch(e) {}
                }
                return results;
            })();
        ''')
        
        print("\nJobPosting schema:")
        for s in scripts:
            print(f"  Title: {s.get('title')}")
            print(f"  Apply URL: {s.get('url')}")
            print(f"  Company: {s.get('hiringOrganization', {}).get('name')}")

asyncio.run(main())
