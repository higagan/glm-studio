#!/usr/bin/env python3
"""Job Application Dashboard - Main Controller

This script starts the dashboard and handles real application execution.
Usage:
    python3 dashboard.py              # Start dashboard server
    python3 dashboard.py --apply-all    # Run all platforms immediately
    python3 dashboard.py --apply linkedin,cutshort  # Run specific platforms
"""
import argparse
import json
import os
import subprocess
import sys
import threading
import time
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Configuration
WORKSPACE = Path('/Users/gagandeep/.openclaw/workspace')
DASHBOARD_DIR = WORKSPACE / 'job-dashboard'
STATUS_FILE = DASHBOARD_DIR / 'status.json'
LOG_FILE = DASHBOARD_DIR / 'run.log'

# Platform configurations
PLATFORMS = {
    'linkedin': {
        'script': WORKSPACE / 'linkedin_click_then_apply.py',
        'max_jobs': 4,
        'color': '#0077b5'
    },
    'cutshort': {
        'script': WORKSPACE / 'cutshort_apply_10.py',
        'max_jobs': 5,
        'color': '#ff6b35'
    },
    'instahyre': {
        'script': WORKSPACE / 'instahyre_apply_proper.py',
        'max_jobs': 3,
        'color': '#6c5ce7'
    },
    'naukri': {
        'script': None,  # Not yet implemented
        'max_jobs': 8,
        'color': '#00a8ff'
    }
}

class DashboardServer(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
    
    def do_GET(self):
        if self.path in ['/', '/index.html']:
            self.serve_dashboard()
        elif self.path == '/api/status':
            self.serve_status()
        elif self.path == '/api/apply-all':
            self.handle_apply_all_sse()
        elif self.path.startswith('/api/apply/'):
            platform = self.path.split('/')[-1]
            self.handle_apply_platform_sse(platform)
        else:
            self.send_error(404)
    
    def do_POST(self):
        if self.path == '/api/trigger':
            self.handle_trigger()
        else:
            self.send_error(404)
    
    def serve_dashboard(self):
        try:
            html_path = DASHBOARD_DIR / 'index.html'
            with open(html_path, 'r') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(content.encode())
        except Exception as e:
            self.send_error(500, str(e))
    
    def serve_status(self):
        try:
            if STATUS_FILE.exists():
                with open(STATUS_FILE, 'r') as f:
                    status = json.load(f)
            else:
                status = {'running': False, 'last_run': None}
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(status).encode())
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_apply_all_sse(self):
        """Server-Sent Events for real-time apply-all updates."""
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Connection', 'keep-alive')
        self.end_headers()
        
        # Run actual applications and stream results
        runner = JobRunner(self)
        runner.run_all()
    
    def handle_apply_platform_sse(self, platform):
        """SSE for single platform updates."""
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        
        runner = JobRunner(self)
        runner.run_platform(platform)
    
    def handle_trigger(self):
        """Handle manual trigger from dashboard."""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body.decode())
        
        platform = data.get('platform', 'all')
        
        # Start background thread to run applications
        def run_in_background():
            runner = JobRunner()
            if platform == 'all':
                runner.run_all()
            else:
                runner.run_platform(platform)
        
        thread = threading.Thread(target=run_in_background)
        thread.daemon = True
        thread.start()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'success': True, 'status': 'started'}).encode())
    
    def send_sse(self, data):
        """Send SSE event."""
        try:
            self.wfile.write(f"data: {json.dumps(data)}\n\n".encode())
            self.wfile.flush()
        except:
            pass


class JobRunner:
    def __init__(self, handler=None):
        self.handler = handler
        self.results = {}
    
    def emit(self, data):
        """Emit status update."""
        # Update status file
        status = {
            'timestamp': datetime.now().isoformat(),
            'data': data
        }
        with open(STATUS_FILE, 'w') as f:
            json.dump(status, f)
        
        # Send via SSE if handler available
        if self.handler:
            self.handler.send_sse(data)
        
        # Also log
        with open(LOG_FILE, 'a') as f:
            f.write(f"[{datetime.now().strftime('%H:%M:%S')}] {json.dumps(data)}\n")
    
    def run_all(self):
        """Run all platforms."""
        self.emit({'type': 'log', 'message': '🚀 Starting batch application...', 'level': 'info'})
        
        all_jobs = []
        total_applied = 0
        total_failed = 0
        
        platforms = ['linkedin', 'cutshort', 'instahyre']
        
        for i, platform in enumerate(platforms):
            progress = int((i / len(platforms)) * 100)
            self.emit({'type': 'progress', 'percent': progress, 'title': f'Starting {platform}...'})
            
            result = self.run_platform_internal(platform)
            all_jobs.extend(result.get('jobs', []))
            total_applied += result.get('applied', 0)
            total_failed += result.get('failed', 0)
        
        # Final report
        report = {
            'applied': total_applied,
            'skipped': len([j for j in all_jobs if j.get('status') == 'skipped']),
            'failed': total_failed,
            'jobs': all_jobs
        }
        
        self.emit({'type': 'progress', 'percent': 100, 'title': 'Complete!'})
        self.emit({'type': 'complete', 'report': report})
        
        # Save to daily log
        self.save_to_daily_log(report)
        
        return report
    
    def run_platform(self, platform):
        """Run single platform."""
        self.emit({'type': 'log', 'message': f'🚀 Starting {platform}...', 'level': 'info'})
        
        result = self.run_platform_internal(platform)
        
        report = {
            'applied': result.get('applied', 0),
            'skipped': len([j for j in result.get('jobs', []) if j.get('status') == 'skipped']),
            'failed': result.get('failed', 0),
            'jobs': result.get('jobs', [])
        }
        
        self.emit({'type': 'progress', 'percent': 100, 'title': f'{platform} complete'})
        self.emit({'type': 'complete', 'report': report})
        
        return report
    
    def run_platform_internal(self, platform):
        """Internal method to run a platform script."""
        config = PLATFORMS.get(platform)
        if not config or not config['script'] or not config['script'].exists():
            self.emit({'type': 'log', 'message': f'❌ Script not found for {platform}', 'level': 'error'})
            return {'applied': 0, 'failed': 0, 'jobs': []}
        
        self.emit({'type': 'status', 'platform': platform, 'status': 'running', 'text': 'Running...'})
        
        try:
            # Run the script
            result = subprocess.run(
                [sys.executable, str(config['script'])],
                capture_output=True,
                text=True,
                timeout=300,
                cwd=str(WORKSPACE)
            )
            
            output = result.stdout + result.stderr
            
            # Parse results
            jobs = self.parse_output(platform, output)
            applied = len([j for j in jobs if j['status'] == 'applied'])
            failed = len([j for j in jobs if j['status'] == 'failed'])
            
            self.emit({'type': 'status', 'platform': platform, 'status': 'done', 'text': f'Done ({applied} applied)'})
            
            return {'applied': applied, 'failed': failed, 'jobs': jobs}
            
        except subprocess.TimeoutExpired:
            self.emit({'type': 'log', 'message': f'⏱ {platform} timed out', 'level': 'error'})
            self.emit({'type': 'status', 'platform': platform, 'status': 'error', 'text': 'Timeout'})
            return {'applied': 0, 'failed': 0, 'jobs': []}
            
        except Exception as e:
            self.emit({'type': 'log', 'message': f'❌ Error in {platform}: {str(e)}', 'level': 'error'})
            self.emit({'type': 'status', 'platform': platform, 'status': 'error', 'text': 'Error'})
            return {'applied': 0, 'failed': 0, 'jobs': []}
    
    def parse_output(self, platform, output):
        """Parse script output to extract job results."""
        jobs = []
        lines = output.split('\n')
        
        # Different parsing for each platform
        if platform == 'linkedin':
            jobs = self.parse_linkedin_output(lines)
        elif platform == 'cutshort':
            jobs = self.parse_cutshort_output(lines)
        elif platform == 'instahyre':
            jobs = self.parse_instahyre_output(lines)
        
        return jobs
    
    def parse_linkedin_output(self, lines):
        """Parse LinkedIn script output."""
        jobs = []
        current_job = None
        
        for line in lines:
            if 'Applying to:' in line or 'Job:' in line:
                current_job = {'platform': 'linkedin', 'status': 'pending'}
                title = line.split(':', 1)[-1].strip()
                current_job['title'] = title
            elif 'Company:' in line and current_job:
                current_job['company'] = line.split(':', 1)[-1].strip()
            elif 'Applied successfully' in line and current_job:
                current_job['status'] = 'applied'
                jobs.append(current_job)
                current_job = None
            elif 'Failed' in line and current_job:
                current_job['status'] = 'failed'
                jobs.append(current_job)
                current_job = None
        
        return jobs
    
    def parse_cutshort_output(self, lines):
        """Parse Cutshort script output."""
        jobs = []
        # Similar parsing logic
        return jobs
    
    def parse_instahyre_output(self, lines):
        """Parse Instahyre script output."""
        jobs = []
        # Similar parsing logic
        return jobs
    
    def save_to_daily_log(self, report):
        """Save results to daily log."""
        daily_log = WORKSPACE / 'job-apply-log.md'
        with open(daily_log, 'a') as f:
            f.write(f"\n\n## {datetime.now().strftime('%Y-%m-%d %H:%M')} - Dashboard Run\n\n")
            f.write(f"**Applied:** {report['applied']}\n")
            f.write(f"**Skipped:** {report['skipped']}\n")
            f.write(f"**Failed:** {report['failed']}\n\n")
            for job in report['jobs']:
                icon = '✅' if job['status'] == 'applied' else '⏭️' if job['status'] == 'skipped' else '❌'
                f.write(f"{icon} [{job['platform']}] {job.get('title', 'Unknown')} @ {job.get('company', 'Unknown')}\n")


def start_server(port=8765):
    """Start the dashboard server."""
    server = HTTPServer(('localhost', port), DashboardServer)
    print(f"🚀 Job Application Dashboard")
    print(f"📊 URL: http://localhost:{port}")
    print(f"📁 Workspace: {WORKSPACE}")
    print(f"\nPress Ctrl+C to stop")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped")


def run_cli():
    """Run applications from command line."""
    parser = argparse.ArgumentParser(description='Job Application Dashboard')
    parser.add_argument('--server', action='store_true', help='Start dashboard server')
    parser.add_argument('--apply', type=str, help='Apply to platforms (comma-separated or "all")')
    parser.add_argument('--port', type=int, default=8765, help='Server port')
    
    args = parser.parse_args()
    
    if args.server:
        start_server(args.port)
    elif args.apply:
        platforms = args.apply.split(',') if args.apply != 'all' else ['linkedin', 'cutshort', 'instahyre']
        runner = JobRunner()
        report = runner.run_all() if args.apply == 'all' else {p: runner.run_platform(p) for p in platforms}
        print(json.dumps(report, indent=2))
    else:
        # Default: start server
        start_server(args.port)


if __name__ == '__main__':
    run_cli()
