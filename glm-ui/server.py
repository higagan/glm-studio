#!/usr/bin/env python3
"""Simple HTTP server to serve the GLM Studio UI with Ollama proxy."""
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request
import json
import os, sys, socket

PORT = 7860
DIR = os.path.dirname(os.path.abspath(__file__))
OLLAMA_HOST = os.environ.get('OLLAMA_HOST', 'http://localhost:11434')

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def _proxy_to_ollama(self, path):
        """Forward request to Ollama API."""
        target_url = f"{OLLAMA_HOST}{path}"
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        req = urllib.request.Request(
            target_url,
            data=body,
            headers={'Content-Type': 'application/json'},
            method=self.command
        )

        try:
            with urllib.request.urlopen(req) as resp:
                self.send_response(resp.status)
                for key, val in resp.headers.items():
                    if key.lower() not in ('transfer-encoding', 'content-encoding'):
                        self.send_header(key, val)
                self.end_headers()
                while True:
                    chunk = resp.read(8192)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def do_GET(self):
        if self.path.startswith('/api/'):
            self._proxy_to_ollama(self.path)
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self._proxy_to_ollama(self.path)
        else:
            self.send_response(405)
            self.end_headers()

    def log_message(self, format, *args):
        pass

class ReusableServer(HTTPServer):
    allow_reuse_address = True
    def server_bind(self):
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        super().server_bind()

print(f"🚀 GLM-5.2 Studio starting...")
print(f"📡 URL: http://localhost:{PORT}")
print(f"📁 Serving from: {DIR}")
print(f"🔗 Ollama proxy: {OLLAMA_HOST}")
print(f"\n🔌 Make sure Ollama is running with glm-5.2:cloud loaded")
print(f"   ollama run glm-5.2:cloud")
print(f"\n⌨️  Press Ctrl+C to stop")

try:
    server = ReusableServer(('0.0.0.0', PORT), Handler)
    print(f"🚀 GLM-5.2 Studio running at http://localhost:{PORT}")
    server.serve_forever()
except KeyboardInterrupt:
    print("\n👋 GLM Studio stopped")
    sys.exit(0)
except OSError as e:
    if e.errno == 48:
        print(f"\n❌ Port {PORT} is already in use. Kill the existing process first.")
        sys.exit(1)
    raise
