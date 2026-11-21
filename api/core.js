const { proxyCore } = require('./lib/proxy-core.cjs');

function readBody(req) {
  if (req.body != null) {
    if (typeof req.body === 'string') {
      try {
        return Promise.resolve(JSON.parse(req.body));
      } catch {
        return Promise.resolve(null);
      }
    }
    return Promise.resolve(req.body);
  }
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

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const body = req.method === 'POST' ? await readBody(req) : null;
    const result = await proxyCore({
      method: req.method,
      searchParams: url.searchParams,
      body,
    });
    res.statusCode = result.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(result.body));
  } catch {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        ok: false,
        code: 'upstream',
        message: 'The CORE proxy hit an unexpected error.',
        status: 500,
      }),
    );
  }
};
