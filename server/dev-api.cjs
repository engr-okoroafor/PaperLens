const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const { proxyCore } = require('../api/lib/proxy-core.cjs');

function loadEnv() {
  const file = path.join(process.cwd(), '.env');
  if (!fs.existsSync(file)) {
    return;
  }
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1] in process.env) {
      continue;
    }
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(null);
      }
    });
    req.on('error', reject);
  });
}

loadEnv();

const port = Number(process.env.PAPERLENS_API_PORT || 8787);
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith('/api/core')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: 'Not found' }));
      return;
    }
    const body = req.method === 'POST' ? await readBody(req) : null;
    const result = await proxyCore({ method: req.method, searchParams: url.searchParams, body });
    res.writeHead(result.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(result.body));
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, code: 'upstream', message: 'Local CORE proxy failed.' }));
  }
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`PaperLens CORE proxy listening on http://127.0.0.1:${port}\n`);
});
