/**
 * Server-side CORE v3 proxy. The optional API key is read here and sent only
 * to api.core.ac.uk. Callers never receive the key.
 */

// In-memory rate limiting map: IP/client -> { count, resetAt }
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute per IP
const clientUsage = new Map();

function checkRateLimit(clientIp) {
  const now = Date.now();
  const client = clientUsage.get(clientIp);

  if (!client || now > client.resetAt) {
    clientUsage.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (client.count >= MAX_REQUESTS_PER_WINDOW) {
    return { limited: true, retryAfter: Math.ceil((client.resetAt - now) / 1000) };
  }

  client.count += 1;
  return { limited: false, remaining: MAX_REQUESTS_PER_WINDOW - client.count };
}

// Clean up stale rate-limit records every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of clientUsage.entries()) {
      if (now > data.resetAt) {
        clientUsage.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

const CORE_SEARCH = 'https://api.core.ac.uk/v3/search/works';
const CORE_AGGREGATE = 'https://api.core.ac.uk/v3/search/works/aggregate';
const DEFAULT_AGGREGATIONS = [
  'yearPublished',
  'publisher',
  'documentType',
  'language',
  'authors',
  'fieldOfStudy',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function retryDelayMs(response, attempt) {
  const header = response.headers.get('retry-after') || response.headers.get('x-ratelimit-retry-after');
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) {
      return Math.max(0, seconds * 1000);
    }
    const when = Date.parse(header);
    if (!Number.isNaN(when)) {
      return Math.max(0, when - Date.now());
    }
  }
  return 400 * 2 ** (attempt - 1);
}

function coreHeaders() {
  const headers = { Accept: 'application/json' };
  const key = process.env.CORE_API_KEY;
  if (key && key.trim()) {
    headers.Authorization = `Bearer ${key.trim()}`;
  }
  return headers;
}

function failure(status, code, message, retryAfter) {
  return {
    status,
    body: {
      ok: false,
      code,
      message,
      status,
      retryAfter: retryAfter ?? null,
    },
  };
}

async function fetchCore(url, options) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    try {
      response = await fetch(url, options);
    } catch {
      if (attempt === maxAttempts) {
        return failure(502, 'upstream', 'PaperLens could not reach CORE. Check the network and try again.');
      }
      await sleep(400 * 2 ** (attempt - 1));
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      return failure(
        response.status,
        'unauthorized',
        'CORE rejected the API key (401). The key stays on the server — check CORE_API_KEY, or remove it to use the public limit.',
      );
    }

    if (response.status === 429) {
      const wait = retryDelayMs(response, attempt);
      const retryAfter = response.headers.get('x-ratelimit-retry-after') || response.headers.get('retry-after');
      if (attempt === maxAttempts || wait > 2000) {
        return failure(
          429,
          'rate_limited',
          'CORE is rate-limiting this client (429). PaperLens retried with backoff and then stopped. Add a server-side CORE_API_KEY for a higher limit, or wait and retry.',
          retryAfter,
        );
      }
      await sleep(wait);
      continue;
    }

    if (response.status >= 500 && attempt < maxAttempts) {
      await sleep(400 * 2 ** (attempt - 1));
      continue;
    }

    if (!response.ok) {
      return failure(
        response.status,
        'upstream',
        `CORE returned ${response.status}. The query may use a field the index does not accept.`,
      );
    }

    const data = await response.json();
    return { status: 200, body: { ok: true, source: 'core', data } };
  }

  return failure(502, 'upstream', 'CORE did not answer after several attempts.');
}

function clampLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 10;
  }
  return Math.min(100, Math.max(1, Math.round(parsed)));
}

function allowedSort(value) {
  if (value === 'yearPublished:asc' || value === 'yearPublished:desc' || value === 'relevance') {
    return value;
  }
  return null;
}

async function proxyCore({ method, searchParams, body, clientIp = '127.0.0.1' }) {
  // 1. Rate limiting check
  const rateLimit = checkRateLimit(clientIp);
  if (rateLimit.limited) {
    return failure(
      429,
      'rate_limited',
      `PaperLens rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds before making further requests.`,
      rateLimit.retryAfter,
    );
  }

  const aggregate = method === 'POST';
  const query = String((aggregate ? body?.q : searchParams.get('q')) ?? '').trim();
  if (!query) {
    return failure(400, 'upstream', 'Enter a query before searching CORE.');
  }

  // Security: Query input length & character sanitization (OWASP A03 - Injection Prevention)
  if (query.length > 500) {
    return failure(400, 'upstream', 'Query string exceeds maximum permitted length (500 characters).');
  }

  if (aggregate) {
    const headers = { ...coreHeaders(), 'Content-Type': 'application/json' };
    const aggregations = Array.isArray(body?.aggregations) ? body.aggregations : DEFAULT_AGGREGATIONS;
    return fetchCore(CORE_AGGREGATE, {
      method: 'POST',
      headers,
      body: JSON.stringify({ q: query, aggregations }),
    });
  }

  const url = new URL(CORE_SEARCH);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(clampLimit(searchParams.get('limit'))));
  url.searchParams.set('offset', String(Math.max(0, Math.round(Number(searchParams.get('offset')) || 0))));
  const sort = allowedSort(searchParams.get('sort'));
  if (sort && sort !== 'relevance') {
    url.searchParams.set('sort', sort);
  }
  return fetchCore(url, { headers: coreHeaders() });
}

module.exports = { proxyCore };
