# garden-gantt-permapeople-proxy

Stateless Cloudflare Worker that proxies Permapeople API requests with CORS headers attached.
Lives in this sibling directory (separate `package.json`) because it is deployed independently
of the main Garden Gantt app and has its own dependencies (`wrangler`, `@cloudflare/workers-types`).

## Why does this exist?

A live OPTIONS probe of `https://permapeople.org/api/search` returned **HTTP 404** with **no
`Access-Control-Allow-Origin` header** — meaning browsers will reject any direct fetch from a
Garden Gantt page (a static SPA on Cloudflare Pages). Evidence is recorded in
`.planning/phases/02-data-layer-first-end-to-end/02-CORS-SPIKE.md`.

Per CONTEXT D-17, this Worker holds the Permapeople API keys server-side and reflects an
`Access-Control-Allow-Origin` header for the configured origin — the keys never reach the
browser bundle. No user data passes through; only generic plant search/detail queries.

## Endpoints

| Method | Path           | Forwards to                                  |
| ------ | -------------- | -------------------------------------------- |
| `OPTIONS` | (any)         | 204 + CORS preflight                         |
| `POST` | `/search`      | `POST https://permapeople.org/api/search`    |
| `GET`  | `/plants/{id}` | `GET https://permapeople.org/api/plants/{id}` |
| (other) | (any)         | 404                                          |

## Manual deployment (NOT done automatically)

Deployment requires a Cloudflare account and `wrangler login` — this is a **separate user
action** intentionally deferred from `npm run build` of the main app. Garden Gantt's main
production deployment can ship without the Worker; the client-side `searchPlant()` simply
returns `{ status: 'unreachable', reason: 'cors' }` until the Worker URL is configured.

```bash
cd cors-proxy
npm install                                  # install wrangler + workers-types
npx wrangler login                           # one-time browser auth
npx wrangler secret put PERMAPEOPLE_KEY_ID    # paste key id (from Permapeople account page)
npx wrangler secret put PERMAPEOPLE_KEY_SECRET # paste key secret
npx wrangler deploy                          # deploys to https://garden-gantt-permapeople-proxy.{your-cloudflare-user}.workers.dev
```

After deploy, set the resulting URL on the main app:

```
# .env.local (main app, NOT this directory)
VITE_PERMAPEOPLE_BASE_URL=https://garden-gantt-permapeople-proxy.YOUR-USER.workers.dev
```

If you change `ALLOWED_ORIGIN` in `wrangler.toml` (e.g. for a custom domain), redeploy.

## Local dev

```bash
cd cors-proxy
npm install
npx wrangler dev    # serves on http://localhost:8787
```

In dev, secrets default to placeholder values; use `wrangler dev --var PERMAPEOPLE_KEY_ID:...`
or a `.dev.vars` file (gitignored) to inject real keys for local testing.

## Re-verification

If Permapeople adds CORS headers server-side later, this Worker becomes optional and the main
app can point `VITE_PERMAPEOPLE_BASE_URL` directly at `https://permapeople.org/api`. Re-run the
probe documented in `02-CORS-SPIKE.md` before assuming this is safe.
