import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT || 80);
const root = join(process.cwd(), 'dist');
const permapeopleKeyId = process.env.PERMAPEOPLE_KEY_ID || '';
const permapeopleKeySecret = process.env.PERMAPEOPLE_KEY_SECRET || '';

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
]);

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function cacheHeaders(pathname) {
  if (pathname.startsWith('/assets/')) {
    return { 'Cache-Control': 'public, max-age=31536000, immutable' };
  }
  return { 'Cache-Control': 'no-cache, no-store, must-revalidate' };
}

function safePath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const normalized = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  return join(root, normalized);
}

async function serveStatic(req, res, pathname) {
  let filePath = safePath(pathname === '/' ? '/index.html' : pathname);
  let fileStat;

  try {
    fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    filePath = join(root, 'index.html');
    fileStat = await stat(filePath);
  }

  const headers = {
    'Content-Type': mime.get(extname(filePath)) || 'application/octet-stream',
    'Content-Length': String(fileStat.size),
    ...cacheHeaders(pathname),
  };
  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
}

async function proxyPermapeople(req, res, pathname) {
  if (!permapeopleKeyId || !permapeopleKeySecret) {
    send(
      res,
      503,
      JSON.stringify({ error: 'Permapeople credentials are not configured.' }),
      { 'Content-Type': 'application/json; charset=utf-8' },
    );
    return;
  }

  const subpath = pathname.replace(/^\/permapeople-proxy/, '') || '/';
  const target =
    subpath === '/search'
      ? 'https://permapeople.org/api/search'
      : subpath.startsWith('/plants/')
        ? `https://permapeople.org/api${subpath}`
        : null;

  if (!target) {
    send(res, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  if (req.method === 'OPTIONS') {
    send(res, 204, '', {
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    });
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'x-permapeople-key-id': permapeopleKeyId,
        'x-permapeople-key-secret': permapeopleKeySecret,
      },
      body: req.method === 'GET' ? undefined : Buffer.concat(chunks),
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      Vary: 'Origin',
    });
    res.end(body);
  } catch {
    send(res, 502, JSON.stringify({ error: 'Permapeople proxy request failed.' }), {
      'Content-Type': 'application/json; charset=utf-8',
    });
  }
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/permapeople-proxy/')) {
      await proxyPermapeople(req, res, url.pathname);
      return;
    }
    await serveStatic(req, res, url.pathname);
  } catch {
    send(res, 500, 'Internal Server Error', {
      'Content-Type': 'text/plain; charset=utf-8',
    });
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`Garden Gantt listening on 0.0.0.0:${port}`);
});

