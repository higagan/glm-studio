#!/usr/bin/env python3
"""Job Application Dashboard Backend — Fixed Version"""
import json
import subprocess
import sys
import threading
import time
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

WORKSPACE = Path('/Users/gagandeep/.openclaw/workspace')
DASHBOARD_DIR = WORKSPACE / 'job-dashboard'
STATUS_FILE = DASHBOARD_DIR / 'status.json'
LOG_FILE = DASHBOARD_DIR / 'run.log'

# Runner state
state = {
    'running': False,
    'logs': [],
    'progress': 0,
    'title': '',
    'report': None,
    'platforms': {
        'linkedin': {'status': 'ready', 'text': 'Ready'},
        'cutshort': {'status': 'ready', 'text': 'Ready'},
        'instahyre': {'status': 'ready', 'text': 'Ready'}
    }
}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path in ['/', '/index.html']:
            self.serve_file('dashboard.html', 'text/html')
        elif self.path == '/api/status':
            self.serve_status()
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == '/api/run':
            self.handle_run_all()
        elif self.path.startswith('/api/run/'):
            platform = self.path.split('/')[-1]
            self.handle_run_platform(platform)
        else:
            self.send_error(404)

    def serve_file(self, filename, content_type):
        try:
            path = DASHBOARD_DIR / filename
            with open(path, 'r') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.end_headers()
            self.wfile.write(content.encode())
        except Exception as e:
            self.send_error(500, str(e))

    def serve_status(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(state).encode())

    def handle_run_all(self):
        if state['running']:
            self.send_json({'error': 'Already running'})
            return
        
        thread = threading.Thread(target=run_all_platforms)
        thread.daemon = True
        thread.start()
        
        self.send_json({'success': True, 'status': 'started'})

    def handle_run_platform(self, platform):
        if state['running']:
            self.send_json({'error': 'Already running'})
            return
        
        thread = threading.Thread(target=run_single_platform, args=(platform,))
        thread.daemon = True
        thread.start()
        
        self.send_json({'success': True, 'status': 'started', 'platform': platform})

    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())


def add_log(message, msg_type='info'):
    entry = {
        'time': datetime.now().strftime('%H:%M:%S'),
        'message': message,
        'type': msg_type
    }
    state['logs'].append(entry)
    state['logs'] = state['logs'][-100:]
    with open(LOG_FILE, 'a') as f:
        f.write(f"[{entry['time']}] [{msg_type}] {message}\n")


def update_progress(percent, title=''):
    state['progress'] = percent
    if title:
        state['title'] = title


def update_platform(platform, status, text=''):
    state['platforms'][platform] = {'status': status, 'text': text or status.title()}


def check_chrome_debug():
    """Check if Chrome debugging is available."""
    try:
        import urllib.request
        req = urllib.request.Request('http://localhost:9222/json/list', method='GET')
        with urllib.request.urlopen(req, timeout=3) as resp:
            pages = json.loads(resp.read())
            linkedin_pages = [p for p in pages if 'linkedin.com' in p.get('url', '')]
            return len(linkedin_pages) > 0
    except Exception as e:
        add_log(f'Chrome debug check failed: {e}', 'error')
        return False


def run_all_platforms():
    state['running'] = True
    state['logs'] = []
    state['progress'] = 0
    state['title'] = 'Starting...'
    state['report'] = None
    
    for p in state['platforms']:
        state['platforms'][p] = {'status': 'ready', 'text': 'Ready'}
    
    all_jobs = []
    total_applied = 0
    
    platforms = ['linkedin', 'cutshort', 'instahyre']
    
    for i, platform in enumerate(platforms):
        progress = int((i / len(platforms)) * 100)
        update_progress(progress, f'Starting {platform}...')
        update_platform(platform, 'running', 'Running...')
        add_log(f'🚀 Starting {platform}...', 'info')
        
        result = run_platform_script(platform)
        
        if result:
            jobs = result.get('jobs', [])
            applied = result.get('applied', 0)
            total_applied += applied
            all_jobs.extend(jobs)
            update_platform(platform, 'done', f'Done ({applied} applied)')
            add_log(f'✅ {platform}: {applied} applied', 'success')
        else:
            update_platform(platform, 'error', 'Failed')
            add_log(f'❌ {platform} failed', 'error')
    
    report = {
        'applied': total_applied,
        'skipped': len([j for j in all_jobs if j.get('status') == 'skipped']),
        'failed': len([j for j in all_jobs if j.get('status') == 'failed']),
        'jobs': all_jobs
    }
    
    state['report'] = report
    state['progress'] = 100
    state['title'] = 'Complete!'
    add_log(f'🎉 All done! {total_applied} jobs applied', 'success')
    state['running'] = False
    save_daily_log(report)


def run_single_platform(platform):
    state['running'] = True
    state['logs'] = []
    state['progress'] = 0
    state['title'] = f'Starting {platform}...'
    state['report'] = None
    
    update_platform(platform, 'running', 'Running...')
    add_log(f'🚀 Starting {platform}...', 'info')
    
    result = run_platform_script(platform)
    
    if result:
        jobs = result.get('jobs', [])
        applied = result.get('applied', 0)
        report = {
            'applied': applied,
            'skipped': len([j for j in jobs if j.get('status') == 'skipped']),
            'failed': len([j for j in jobs if j.get('status') == 'failed']),
            'jobs': jobs
        }
        state['report'] = report
        state['progress'] = 100
        state['title'] = 'Complete!'
        update_platform(platform, 'done', f'Done ({applied} applied)')
        add_log(f'✅ {platform}: {applied} applied', 'success')
        save_daily_log(report)
    else:
        update_platform(platform, 'error', 'Failed')
        add_log(f'❌ {platform} failed', 'error')
    
    state['running'] = False


def run_platform_script(platform):
    scripts = {
        'linkedin': WORKSPACE / 'linkedin_click_then_apply.py',
        'cutshort': WORKSPACE / 'cutshort_apply_10.py',
        'instahyre': WORKSPACE / 'instahyre_apply_proper.py'
    }
    
    script = scripts.get(platform)
    if not script or not script.exists():
        add_log(f'Script not found: {script}', 'error')
        return None
    
    add_log(f'Running: {script.name}', 'info')
    
    try:
        result = subprocess.run(
            [sys.executable, str(script)],
            capture_output=True,
            text=True,
            timeout=300,
            cwd=str(WORKSPACE)
        )
        
        output = result.stdout + result.stderr
        
        # Parse results
        jobs = parse_output(platform, output)
        applied = len([j for j in jobs if j['status'] == 'applied'])
        
        # Add log lines
        for line in output.split('\n')[:30]:
            if line.strip() and not line.startswith('  '):
                add_log(line.strip()[:100], 'info')
        
        if result.returncode != 0 and not jobs:
            add_log(f'Script exited with code {result.returncode}', 'error')
            add_log(output[-500:], 'error')  # Last 500 chars
        
        return {'applied': applied, 'jobs': jobs}
        
    except subprocess.TimeoutExpired:
        add_log(f'{platform} timed out after 5 minutes', 'error')
        return None
    except Exception as e:
        add_log(f'Error: {str(e)}', 'error')
        return None


def parse_output(platform, output):
    jobs = []
    lines = output.split('\n')
    
    if platform == 'linkedin':
        current_job = None
        for line in lines:
            if ']' in line and ('@' in line or any(kw in line for kw in ['Senior', 'Engineer', 'Developer', 'GenAI'])):
                title = line.split(']', 1)[-1].strip() if ']' in line else line.strip()
                if title and len(title) > 5 and len(title) < 100:
                    current_job = {'platform': 'linkedin', 'status': 'pending', 'title': title, 'company': ''}
            
            if current_job:
                if 'Applied!' in line or 'applied successfully' in line.lower():
                    current_job['status'] = 'applied'
                    jobs.append(current_job)
                    current_job = None
                elif 'No Easy Apply' in line or 'skipped' in line.lower():
                    current_job['status'] = 'skipped'
                    jobs.append(current_job)
                    current_job = None
                elif 'Error' in line and 'HTTP 500' not in line:
                    current_job['status'] = 'failed'
                    jobs.append(current_job)
                    current_job = None
    
    elif platform == 'cutshort':
        for line in lines:
            if 'Applied!' in line or 'successfully' in line.lower():
                jobs.append({'platform': 'cutshort', 'status': 'applied', 'title': 'Job', 'company': ''})
            elif 'Error' in line and 'button not found' in line.lower():
                jobs.append({'platform': 'cutshort', 'status': 'failed', 'title': 'Job', 'company': ''})
    
    elif platform == 'instahyre':
        for line in lines:
            if 'Applied successfully' in line or 'Application sent' in line:
                jobs.append({'platform': 'instahyre', 'status': 'applied', 'title': 'Job', 'company': ''})
    
    return jobs


def save_daily_log(report):
    try:
        daily_log = WORKSPACE / 'job-apply-log.md'
        with open(daily_log, 'a') as f:
            f.write(f"\n\n## {datetime.now().strftime('%Y-%m-%d %H:%M')} - Dashboard Run\n\n")
            f.write(f"**Applied:** {report.get('applied', 0)}\n")
            f.write(f"**Skipped:** {report.get('skipped', 0)}\n")
            f.write(f"**Failed:** {report.get('failed', 0)}\n\n")
            for job in report.get('jobs', []):
                icon = '✅' if job.get('status') == 'applied' else '⏭️' if job.get('status') == 'skipped' else '❌'
                f.write(f"{icon} [{job.get('platform', 'unknown')}] {job.get('title', 'Unknown')}\n")
    except Exception as e:
        print(f"Log save error: {e}")


def run_server(port=8765):
    server = HTTPServer(('localhost', port), Handler)
    print(f"🚀 Job Application Dashboard")
    print(f"📊 URL: http://localhost:{port}")
    print(f"📁 Directory: {DASHBOARD_DIR}")
    print(f"\nPress Ctrl+C to stop")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped")


if __name__ == '__main__':
    run_server()
