#!/usr/bin/env python3
"""Simple HTTP server to serve the dashboard and handle application triggers."""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import subprocess
import threading
import os

class DashboardHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress default logging
    
    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            self.serve_file('/Users/gagandeep/.openclaw/workspace/job-dashboard/index.html', 'text/html')
        elif self.path == '/api/apply-all':
            self.handle_apply_all()
        elif self.path.startswith('/api/status'):
            self.handle_status()
        else:
            self.send_error(404)
    
    def do_POST(self):
        if self.path == '/api/apply':
            self.handle_apply()
        else:
            self.send_error(404)
    
    def serve_file(self, path, content_type):
        try:
            with open(path, 'r') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content.encode())
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_apply_all(self):
        """SSE endpoint for real-time updates."""
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Connection', 'keep-alive')
        self.end_headers()
        
        # Mock data for now - in real implementation, this would run the scripts
        stages = [
            {'type': 'log', 'message': '🚀 Starting batch application...', 'level': 'info'},
            {'type': 'status', 'platform': 'linkedin', 'status': 'running', 'text': 'Running...'},
            {'type': 'progress', 'percent': 10, 'title': 'LinkedIn: Finding jobs...'},
            {'type': 'log', 'message': 'LinkedIn: Scrolling to load jobs...', 'level': 'info'},
            {'type': 'job', 'platform': 'linkedin', 'title': 'Senior Backend Developer', 'company': 'Cloudnaut', 'status': 'applied'},
            {'type': 'job', 'platform': 'linkedin', 'title': 'GenAI Engineer', 'company': '9NEXUS', 'status': 'applied'},
            {'type': 'job', 'platform': 'linkedin', 'title': 'GenAI & Agentic AI', 'company': 'Altysys', 'status': 'skipped'},
            {'type': 'progress', 'percent': 30, 'title': 'LinkedIn: 2 applied, 1 skipped'},
            {'type': 'status', 'platform': 'linkedin', 'status': 'done', 'text': 'Done'},
            {'type': 'status', 'platform': 'cutshort', 'status': 'running', 'text': 'Running...'},
            {'type': 'progress', 'percent': 40, 'title': 'Cutshort: Applying...'},
            {'type': 'job', 'platform': 'cutshort', 'title': 'Head Of Engineering (AI)', 'company': 'Company 1', 'status': 'applied'},
            {'type': 'job', 'platform': 'cutshort', 'title': 'Lead Python Developer', 'company': 'Company 2', 'status': 'applied'},
            {'type': 'job', 'platform': 'cutshort', 'title': 'Sr. Full-Stack Developer', 'company': 'Company 3', 'status': 'applied'},
            {'type': 'progress', 'percent': 70, 'title': 'Cutshort: 3 applied'},
            {'type': 'status', 'platform': 'cutshort', 'status': 'done', 'text': 'Done'},
            {'type': 'status', 'platform': 'instahyre', 'status': 'running', 'text': 'Running...'},
            {'type': 'progress', 'percent': 80, 'title': 'Instahyre: Applying...'},
            {'type': 'job', 'platform': 'instahyre', 'title': 'AI Security Architect', 'company': 'NTT Data', 'status': 'applied'},
            {'type': 'job', 'platform': 'instahyre', 'title': 'Staff Engineer', 'company': 'Imagine Learning', 'status': 'applied'},
            {'type': 'job', 'platform': 'instahyre', 'title': 'Golang Engineer', 'company': 'Walmart', 'status': 'applied'},
            {'type': 'progress', 'percent': 95, 'title': 'Instahyre: 3 applied'},
            {'type': 'status', 'platform': 'instahyre', 'status': 'done', 'text': 'Done'},
            {'type': 'complete', 'report': {
                'applied': 8,
                'skipped': 1,
                'failed': 0,
                'jobs': [
                    {'title': 'Senior Backend Developer', 'company': 'Cloudnaut', 'platform': 'linkedin', 'status': 'Applied'},
                    {'title': 'GenAI Engineer', 'company': '9NEXUS', 'platform': 'linkedin', 'status': 'Applied'},
                    {'title': 'GenAI & Agentic AI', 'company': 'Altysys', 'platform': 'linkedin', 'status': 'Skipped'},
                    {'title': 'Head Of Engineering (AI)', 'company': 'Company 1', 'platform': 'cutshort', 'status': 'Applied'},
                    {'title': 'Lead Python Developer', 'company': 'Company 2', 'platform': 'cutshort', 'status': 'Applied'},
                    {'title': 'Sr. Full-Stack Developer', 'company': 'Company 3', 'platform': 'cutshort', 'status': 'Applied'},
                    {'title': 'AI Security Architect', 'company': 'NTT Data', 'platform': 'instahyre', 'status': 'Applied'},
                    {'title': 'Staff Engineer', 'company': 'Imagine Learning', 'platform': 'instahyre', 'status': 'Applied'},
                    {'title': 'Golang Engineer', 'company': 'Walmart', 'platform': 'instahyre', 'status': 'Applied'},
                ]
            }},
            {'type': 'progress', 'percent': 100, 'title': 'Complete! 8 applied, 1 skipped, 0 failed'},
        ]
        
        for stage in stages:
            self.wfile.write(f"data: {json.dumps(stage)}\n\n".encode())
            self.wfile.flush()
            import time
            time.sleep(0.5)
    
    def handle_status(self):
        """Return current application status."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'idle', 'running': False}).encode())
    
    def handle_apply(self):
        """Handle apply trigger."""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body.decode())
        
        platform = data.get('platform', 'all')
        
        # Trigger the actual application scripts
        # This would run: python3 linkedin_apply.py, etc.
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'success': True, 'platform': platform, 'status': 'started'}).encode())


def run_server(port=8765):
    server = HTTPServer(('localhost', port), DashboardHandler)
    print(f"Dashboard server running at http://localhost:{port}")
    server.serve_forever()

if __name__ == '__main__':
    run_server()
