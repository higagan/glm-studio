#!/usr/bin/env python3
"""Simple HTTP server to serve the GLM Studio UI with Ollama proxy."""
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request, urllib.error
import json
import time
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
        # Don't let the browser cache a stale index.html — always revalidate so
        # edits show up on refresh instead of being served from disk cache.
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def _proxy_to_ollama(self, path):
        """Forward request to Ollama API, retrying transient upstream failures."""
        target_url = f"{OLLAMA_HOST}{path}"
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        req = urllib.request.Request(
            target_url,
            data=body,
            headers={'Content-Type': 'application/json'},
            method=self.command
        )

        max_attempts = 3
        last_err = None
        for attempt in range(1, max_attempts + 1):
            try:
                with urllib.request.urlopen(req, timeout=180) as resp:
                    # Got a clean upstream response — stream it straight through.
                    self.send_response(resp.status)
                    for key, val in resp.headers.items():
                        if key.lower() not in ('transfer-encoding', 'content-encoding'):
                            self.send_header(key, val)
                    self.end_headers()
                    try:
                        while True:
                            chunk = resp.read(8192)
                            if not chunk:
                                break
                            self.wfile.write(chunk)
                            self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        # Client disconnected mid-stream (e.g. user hit Stop) — stop quietly.
                        pass
                return
            except urllib.error.HTTPError as e:
                # Capture Ollama's own error body so we surface the real reason.
                upstream_body = ''
                try:
                    upstream_body = e.read().decode('utf-8', 'replace').strip()
                except Exception:
                    pass
                last_err = f'upstream returned HTTP {e.code}: {upstream_body[:300]}'
                # 5xx: upstream cloud hiccup — retry. 400: cloud models sometimes
                # 400 transiently too, so give it one cheap retry before surfacing.
                retryable = e.code >= 500 or e.code == 400
                if retryable and attempt < max_attempts:
                    time.sleep(attempt)  # 1s, 2s backoff
                    continue
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                if e.code == 400:
                    hint = ' — usually a bad request or a one-off cloud rejection'
                elif e.code == 404:
                    hint = ' — model not found, check the model name in Settings'
                elif e.code >= 500:
                    hint = ' — transient cloud-model error, please retry'
                else:
                    hint = ' — check Settings'
                self.wfile.write(json.dumps({'error': f'Ollama {last_err}{hint}'}).encode())
                return
            except (urllib.error.URLError, TimeoutError, OSError) as e:
                # Connection refused / timeout / network blip — retry.
                last_err = str(e.reason if hasattr(e, 'reason') else e)
                if attempt < max_attempts:
                    time.sleep(attempt)
                    continue
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': f'Cannot reach Ollama at {OLLAMA_HOST}: {last_err}. Is it running?'}).encode())
                return

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
