const http = require('http');
const httpProxy = require('http-proxy');

const PROXY_PORT = 3456;
const TARGET_URL = 'http://127.0.0.1:3000';

const proxy = httpProxy.createProxyServer({
  target: TARGET_URL,
  changeOrigin: true,
  ws: true
});

const ALLOWED_MODELS = ['kimi-k2.6:cloud'];

const server = http.createServer((req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Intercept /api/models and filter
  if (req.url === '/api/models' || req.url.startsWith('/api/models?')) {
    console.log('[PROXY] Intercepting models request');
    
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: req.url,
      method: req.method,
      headers: req.headers
    };

    const upstreamReq = http.request(options, (upstreamRes) => {
      let body = '';
      upstreamRes.on('data', chunk => body += chunk);
      upstreamRes.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.data && Array.isArray(data.data)) {
            // Filter to only allowed models
            data.data = data.data.filter(m => ALLOWED_MODELS.includes(m.id));
            console.log(`[PROXY] Filtered ${data.data.length} models`);
          }
          res.writeHead(upstreamRes.statusCode, upstreamRes.headers);
          res.end(JSON.stringify(data));
        } catch (e) {
          console.error('[PROXY] Parse error:', e.message);
          res.writeHead(upstreamRes.statusCode, upstreamRes.headers);
          res.end(body);
        }
      });
    });

    upstreamReq.on('error', (err) => {
      console.error('[PROXY] Upstream error:', err.message);
      res.writeHead(502);
      res.end(JSON.stringify({ error: 'Upstream error' }));
    });

    req.pipe(upstreamReq);
    return;
  }

  // Pass through everything else
  console.log(`[PROXY] ${req.method} ${req.url}`);
  proxy.web(req, res, {}, (err) => {
    if (err) {
      console.error('[PROXY] Error:', err.message);
      if (!res.headersSent) {
        res.writeHead(502);
        res.end('Proxy error');
      }
    }
  });
});

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head, { target: TARGET_URL });
});

server.listen(PROXY_PORT, () => {
  console.log(`[PROXY] Model filter proxy running on http://127.0.0.1:${PROXY_PORT}`);
  console.log(`[PROXY] Forwarding to ${TARGET_URL}`);
  console.log(`[PROXY] Allowed models: ${ALLOWED_MODELS.join(', ')}`);
});

process.on('SIGINT', () => {
  console.log('\n[PROXY] Shutting down...');
  server.close(() => process.exit(0));
});
