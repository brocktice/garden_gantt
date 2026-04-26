# Permapeople CORS Spike — Evidence Record

**Performed:** 2026-04-26 (during Phase 2 research; re-probed during Plan 02-03 execution)
**Performed by:** RESEARCH.md investigation + planner cross-check + live curl probe at execute-time.

## (a) Endpoint hit

- `OPTIONS https://permapeople.org/api/search` (CORS preflight probe)
  - Origin: `https://garden-gantt.pages.dev`
  - Access-Control-Request-Method: `POST`
  - Access-Control-Request-Headers: `content-type,x-permapeople-key-id,x-permapeople-key-secret`
- `POST https://permapeople.org/api/search` with `x-permapeople-key-id` / `x-permapeople-key-secret`
  headers (not re-probed in execution because the OPTIONS preflight already settles the question
  for any browser-direct call: a 404 on the preflight is terminal — the browser never issues the
  POST).

## (b) Response status

- **OPTIONS:** HTTP **404** (Cloudflare-fronted; `cf-ray` present). Body is the Permapeople 404
  HTML page ("Permapeople - We can't find this page... 404"). No preflight handler at all.
- **POST direct from a non-permapeople origin:** browser would block before the request leaves,
  because the failed preflight provides no ACAO header to satisfy the SOP check.

## (c) Access-Control-Allow-Origin header

- **OPTIONS response:** **absent**. The 404 response carries `cf-ray`, `strict-transport-security`,
  `nel`, `report-to`, `alt-svc`, `x-request-id`, `x-runtime`, `content-type`, `date`, `server`,
  but NO `Access-Control-Allow-*` headers.
- **POST direct:** would not reflect ACAO either, since the preflight failed.

Raw response headers from the live OPTIONS probe (2026-04-26 23:16 UTC):

```
HTTP/2 404
date: Sun, 26 Apr 2026 23:16:39 GMT
content-type: text/html; charset=UTF-8
cf-ray: 9f294be4df0761d2-ORD
cf-cache-status: DYNAMIC
server: cloudflare
strict-transport-security: max-age=63072000; includeSubDomains
```

## (d) Decision

**Worker proxy required.** RESEARCH.md §Pitfall A advised pre-budgeting the Worker; this plan
ships the Worker source under `cors-proxy/`. Browser-direct calls to `permapeople.org` will
fail with `TypeError: Failed to fetch` (CORS) per current evidence — this is the canonical
indicator captured by `searchPlant()`'s `'unreachable' / 'cors'` branch.

Production wiring (default): `VITE_PERMAPEOPLE_BASE_URL` points at the deployed Worker URL
(or `/permapeople-proxy` when same-origin-routed). Direct mode remains available for dev via
`.env.local` overrides.

## Re-verification trigger

Re-run this probe before deploying the Worker to production:

```bash
curl -sS -i -X OPTIONS 'https://permapeople.org/api/search' \
  -H 'Origin: https://garden-gantt.pages.dev' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type,x-permapeople-key-id,x-permapeople-key-secret' \
  --max-time 8 | head -20
```

If Permapeople adds CORS headers server-side (HTTP 200/204 + `Access-Control-Allow-Origin`
reflecting the request origin), the Worker becomes optional and `data/permapeople.ts` can be
pointed direct via `VITE_PERMAPEOPLE_BASE_URL=https://permapeople.org/api`. Until then, the
Worker is the default path.
