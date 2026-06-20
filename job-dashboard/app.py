#!/usr/bin/env python3
"""LinkedIn Auto Apply Dashboard Backend"""
import json
import subprocess
import sys
import threading
import time
import urllib.request
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

WORKSPACE = Path('/Users/gagandeep/.openclaw/workspace')
DASHBOARD_DIR = WORKSPACE / 'job-dashboard'
STATUS_FILE = DASHBOARD_DIR / 'status.json'
LOG_FILE = DASHBOARD_DIR / 'run.log'
LINKEDIN_SCRIPT = WORKSPACE / 'linkedin_click_then_apply.py'
SPECIFIC_SCRIPT = WORKSPACE / 'linkedin_apply_specific_jobs.py'

state = {
    'running': False,
    'logs': [],
    'jobs': [],
    'startedAt': None,
    'finishedAt': None,
    'appliedCount': 0,
}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path in ['/', '/index.html']:
            self.serve_file('dashboard.html', 'text/html')
        elif self.path == '/api/status':
            self.serve_status()
        elif self.path == '/api/chrome-status':
            self.serve_chrome_status()
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == '/api/run/linkedin':
            self.handle_run_linkedin()
        elif self.path == '/api/run/linkedin-specific':
            self.handle_run_linkedin_specific()
        else:
            self.send_error(404)

    def serve_file(self, filename, content_type):
        try:
            path = DASHBOARD_DIR / filename
            with open(path, 'r') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content.encode())
        except Exception as e:
            self.send_error(500, str(e))

    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def serve_status(self):
        self.send_json({
            'running': state['running'],
            'jobs': state['jobs'],
            'logs': state['logs'],
            'startedAt': state['startedAt'],
            'finishedAt': state['finishedAt'],
            'appliedCount': state['appliedCount'],
        })

    def serve_chrome_status(self):
        try:
            req = urllib.request.Request(
                'http://localhost:9222/json/list',
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                pages = json.loads(resp.read().decode())
            linkedin_pages = [p for p in pages if 'linkedin.com/jobs' in p.get('url', '')]
            self.send_json({
                'ready': len(linkedin_pages) > 0,
                'pages': len(pages),
                'linkedinPages': len(linkedin_pages)
            })
        except Exception:
            self.send_json({'ready': False, 'pages': 0, 'linkedinPages': 0})

    def handle_run_linkedin(self):
        if state['running']:
            self.send_json({'error': 'Already running'})
            return
        thread = threading.Thread(target=run_linkedin, daemon=True)
        thread.start()
        self.send_json({'success': True, 'status': 'started'})

    def handle_run_linkedin_specific(self):
        if state['running']:
            self.send_json({'error': 'Already running'})
            return
        thread = threading.Thread(target=run_linkedin_specific, daemon=True)
        thread.start()
        self.send_json({'success': True, 'status': 'started'})


def add_log(message, msg_type='info'):
    entry = {
        'time': datetime.now().strftime('%H:%M:%S'),
        'message': message,
        'type': msg_type
    }
    state['logs'].append(entry)
    state['logs'] = state['logs'][-300:]
    with open(LOG_FILE, 'a') as f:
        f.write(f"[{entry['time']}] [{msg_type}] {message}\n")
    save_state()


def save_state():
    try:
        with open(STATUS_FILE, 'w') as f:
            json.dump(state, f)
    except Exception:
        pass


def reset_state_for_run():
    state['running'] = True
    state['logs'] = []
    state['jobs'] = []
    state['startedAt'] = time.time() * 1000
    state['finishedAt'] = None
    state['appliedCount'] = 0
    save_state()


def mark_done():
    state['running'] = False
    state['finishedAt'] = time.time() * 1000
    save_state()


def parse_linkedin_output(output):
    """Parse live output lines into job queue + status updates."""
    jobs = []
    current_job = None

    for raw in output.split('\n'):
        line = raw.strip()
        if not line:
            continue

        # Job lines: [1/4] Job Title
        m = re.match(r"\[(\d+)/(\d+)\]\s+(.+)", line)
        if m and not line.startswith('Step'):
            if current_job:
                jobs.append(current_job)
            title = m.group(3).strip()
            current_job = {
                'index': int(m.group(1)) - 1,
                'title': title,
                'company': '',
                'status': 'working',
                'startedAt': time.time() * 1000,
                'finishedAt': None
            }
            state['jobs'] = jobs + ([current_job] if current_job else [])
            add_log(f"Applying: {title}", 'info')
            save_state()
            continue

        # Found jobs list lines: [0] Job Title
        m2 = re.match(r"\[(\d+)\]\s+(.+)", line)
        if m2 and current_job is None:
            idx = int(m2.group(1))
            if len(state['jobs']) <= idx:
                state['jobs'].append({
                    'index': idx,
                    'title': m2.group(2).strip(),
                    'company': '',
                    'status': 'pending',
                    'startedAt': None,
                    'finishedAt': None
                })
                save_state()
            continue

        if current_job:
            if 'Applied!' in line or 'Application sent' in line or 'already applied' in line.lower():
                current_job['status'] = 'applied'
                current_job['finishedAt'] = time.time() * 1000
                jobs.append(current_job)
                current_job = None
                state['jobs'] = jobs
                state['appliedCount'] = len([j for j in jobs if j['status'] == 'applied'])
                add_log(line, 'success')
                save_state()
                continue
            if 'No Easy Apply' in line or 'SKIP' in line or 'skipped' in line.lower() or 'No Easy Apply in detail' in line:
                current_job['status'] = 'skipped'
                current_job['finishedAt'] = time.time() * 1000
                jobs.append(current_job)
                current_job = None
                state['jobs'] = jobs
                add_log(line, 'warn')
                save_state()
                continue
            if 'FAIL' in line or 'Error' in line or '❌' in line or 'Uncertain' in line or 'not found' in line.lower():
                current_job['status'] = 'failed'
                current_job['finishedAt'] = time.time() * 1000
                jobs.append(current_job)
                current_job = None
                state['jobs'] = jobs
                add_log(line, 'error')
                save_state()
                continue

        if line.startswith('✅') or line.startswith('❌') or line.startswith('🎉') or line.startswith('Found'):
            add_log(line, 'info')

    if current_job:
        if current_job.get('status') == 'working':
            current_job['status'] = 'failed'
            current_job['finishedAt'] = time.time() * 1000
        jobs.append(current_job)
        state['jobs'] = jobs
        save_state()

    return jobs


import re  # imported here to keep module top clean


def run_linkedin():
    reset_state_for_run()
    add_log('LinkedIn run started', 'info')

    if not LINKEDIN_SCRIPT.exists():
        add_log(f'Script not found: {LINKEDIN_SCRIPT}', 'error')
        mark_done()
        return

    add_log(f'Running {LINKEDIN_SCRIPT.name}...', 'info')

    try:
        proc = subprocess.Popen(
            [sys.executable, str(LINKEDIN_SCRIPT)],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            cwd=str(WORKSPACE)
        )

        full_output = []
        for line in proc.stdout:
            line_text = line.rstrip('\n')
            full_output.append(line_text)
            parse_linkedin_output('\n'.join(full_output))

        proc.wait(timeout=300)
        add_log(f'Script exited with code {proc.returncode}', 'info')
    except subprocess.TimeoutExpired:
        proc.kill()
        add_log('LinkedIn run timed out after 5 minutes', 'error')
    except Exception as e:
        add_log(f'Run failed: {e}', 'error')
    finally:
        # Mark any still-pending jobs as failed
        for job in state['jobs']:
            if job.get('status') == 'working':
                job['status'] = 'failed'
                job['finishedAt'] = time.time() * 1000
        state['appliedCount'] = len([j for j in state['jobs'] if j['status'] == 'applied'])
        mark_done()
        save_daily_log()


def run_linkedin_specific():
    reset_state_for_run()
    add_log('LinkedIn specific jobs run started', 'info')

    if not SPECIFIC_SCRIPT.exists():
        add_log(f'Script not found: {SPECIFIC_SCRIPT}', 'error')
        mark_done()
        return

    add_log(f'Running {SPECIFIC_SCRIPT.name}...', 'info')

    try:
        proc = subprocess.Popen(
            [sys.executable, str(SPECIFIC_SCRIPT)],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            cwd=str(WORKSPACE)
        )

        full_output = []
        for line in proc.stdout:
            line_text = line.rstrip('\n')
            full_output.append(line_text)
            parse_linkedin_output('\n'.join(full_output))

        proc.wait(timeout=600)
        add_log(f'Script exited with code {proc.returncode}', 'info')
    except subprocess.TimeoutExpired:
        proc.kill()
        add_log('LinkedIn specific jobs run timed out after 10 minutes', 'error')
    except Exception as e:
        add_log(f'Run failed: {e}', 'error')
    finally:
        for job in state['jobs']:
            if job.get('status') == 'working':
                job['status'] = 'failed'
                job['finishedAt'] = time.time() * 1000
        state['appliedCount'] = len([j for j in state['jobs'] if j['status'] == 'applied'])
        mark_done()
        save_daily_log()


def save_daily_log():
    try:
        daily_log = WORKSPACE / 'job-apply-log.md'
        applied = len([j for j in state['jobs'] if j['status'] == 'applied'])
        skipped = len([j for j in state['jobs'] if j['status'] == 'skipped'])
        failed = len([j for j in state['jobs'] if j['status'] == 'failed'])
        with open(daily_log, 'a', encoding='utf-8') as f:
            f.write(f"\n\n## {datetime.now().strftime('%Y-%m-%d %H:%M')} - LinkedIn Dashboard Run\n\n")
            f.write(f"**Applied:** {applied}  **Skipped:** {skipped}  **Failed:** {failed}\n\n")
            for job in state['jobs']:
                icon = '✅' if job['status'] == 'applied' else '⏭️' if job['status'] == 'skipped' else '❌'
                elapsed = ''
                if job.get('startedAt') and job.get('finishedAt'):
                    sec = int((job['finishedAt'] - job['startedAt']) / 1000)
                    elapsed = f" ({sec}s)"
                f.write(f"{icon} {job.get('title', 'Unknown')}{elapsed}\n")
    except Exception as e:
        add_log(f'Log save error: {e}', 'error')


def run_server(port=8765):
    if STATUS_FILE.exists():
        STATUS_FILE.unlink()
    server = HTTPServer(('localhost', port), Handler)
    print(f"🚀 LinkedIn Auto Apply Dashboard")
    print(f"📊 URL: http://localhost:{port}")
    print(f"📁 Directory: {DASHBOARD_DIR}")
    print(f"\nPress Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped")


if __name__ == '__main__':
    run_server()
