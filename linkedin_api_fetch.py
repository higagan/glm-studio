#!/usr/bin/env python3
"""Fetch job details via LinkedIn internal API through Chrome's authenticated session."""
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
        
        print("Fetching job details via LinkedIn API...")
        
        # Use fetch to call LinkedIn's job details API
        job_id = "4198104701"  # The job ID currently shown
        
        result = await eval_js(f'''
            (async () => {{
                try {{
                    const resp = await fetch('https://www.linkedin.com/voyager/api/jobs/jobPostings/{job_id}?decorationId=com.linkedin.voyager.deco.jobs.web.shared.WebLightweightJobPostingWithCompanyName-2&topN=1&topNRequestedFlavors=List(TOP_APPLICANT,IN_NETWORK,COMPANY_RECRUITERS,SCHOOL_RECRUITERS,HIRING_MANAGER,RECRUITER_OUT_OF_NETWORK,OUT_OF_NETWORK_3RD_DEGREE,OUT_OF_NETWORK_2ND_DEGREE,OUT_OF_NETWORK,HEVO_AWARENESS,ENTERTAINMENT,ACTIVELY_HIRING_COMPANY,ALL_JOB_SEEKERS,APPLYING_AND_INTERVIEWING,TALENT_COMMUNITY,RECENTLY_POSTED,CONNECTIONS_OF_CONNECTIONS)', {{
                        headers: {{
                            'accept': 'application/vnd.linkedin.normalized+json+2.1',
                            'csrf-token': document.cookie.match(/JSESSIONID=\\"?([^;]+)/)?.[1]?.replace(/\\"/g, '') || '',
                            'x-li-lang': 'en_US',
                            'x-li-track': '{{"clientVersion":"1.13.18638","mpVersion":"0","osName":"web","timezoneOffset":5.5,"timezone":"Asia/Calcutta","deviceFormFactor":"DESKTOP","mpName":"voyager-web","displayDensity":1,"displayWidth":1440,"displayHeight":900}}',
                            'x-restli-protocol-version': '2.0.0'
                        }},
                        credentials: 'include'
                    }});
                    const data = await resp.json();
                    return {{
                        success: true,
                        data: data
                    }};
                }} catch(e) {{
                    return {{
                        success: false,
                        error: e.message
                    }};
                }}
            }})();
        ''')
        
        print(json.dumps(result, indent=2)[:3000])

asyncio.run(main())
