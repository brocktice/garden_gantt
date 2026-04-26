// cors-proxy/src/index.ts — Cloudflare Worker proxy for Permapeople API.
// Stateless. No user data crosses this Worker — only generic plant lookups (D-17).
// Source: [CITED: .planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md §Pattern 5 lines 829-877]
//         [VERIFIED: live OPTIONS probe of permapeople.org/api/search returned HTTP 404 with
//                    no Access-Control-Allow-Origin header — see 02-CORS-SPIKE.md]

interface Env {
  PERMAPEOPLE_KEY_ID: string;
  PERMAPEOPLE_KEY_SECRET: string;
  ALLOWED_ORIGIN: string;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') ?? '';
    const allow = origin === env.ALLOWED_ORIGIN ? origin : env.ALLOWED_ORIGIN;
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': allow,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    // Map our path → Permapeople path
    //   /search      → POST https://permapeople.org/api/search
    //   /plants/:id  → GET  https://permapeople.org/api/plants/:id
    const target =
      url.pathname === '/search'
        ? 'https://permapeople.org/api/search'
        : url.pathname.startsWith('/plants/')
          ? `https://permapeople.org/api${url.pathname}`
          : null;
    if (!target) return new Response('Not Found', { status: 404, headers: corsHeaders });

    const upstreamHeaders = new Headers(req.headers);
    upstreamHeaders.set('x-permapeople-key-id', env.PERMAPEOPLE_KEY_ID);
    upstreamHeaders.set('x-permapeople-key-secret', env.PERMAPEOPLE_KEY_SECRET);
    upstreamHeaders.delete('Origin'); // upstream may reject with CORS otherwise

    const upstream = await fetch(target, {
      method: req.method,
      headers: upstreamHeaders,
      body: req.method === 'POST' ? await req.text() : undefined,
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      },
    });
  },
};
