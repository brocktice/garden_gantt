---
phase: 02-data-layer-first-end-to-end
plan: 03
subsystem: data
tags: [permapeople, cors, cloudflare-worker, fetch-boundary, vitest, abortcontroller]

requires:
  - phase: 01-foundation-schedule-engine
    provides: src/data/storage.ts I/O-boundary pattern (header style + structured-result return)
  - phase: 02-data-layer-first-end-to-end (Plan 02-02)
    provides: src/data/zones.ts as the first second-fetch-site analog (LookupResult union)
provides:
  - Stateless Cloudflare Worker proxy (cors-proxy/) that injects Permapeople API keys server-side and reflects ALLOWED_ORIGIN
  - src/data/permapeople.ts as the SOLE fetch site for Permapeople in src/ (sole-fetch-site invariant verified by grep)
  - PermapeopleResult discriminated union (5 status branches; 4 unreachable reasons)
  - 02-CORS-SPIKE.md live-evidence record (HTTP 404, no ACAO header) → Worker-required decision
  - .env.local.example documenting proxy default + dev-only direct mode
  - VITE_PERMAPEOPLE_BASE_URL / VITE_PERMAPEOPLE_KEY_ID / VITE_PERMAPEOPLE_KEY_SECRET typed in vite-env.d.ts
affects: [Plan 02-09 CustomPlantModal (consumer), Plan 02-12 verification (bundle-grep for VITE_PERMAPEOPLE_KEY), Phase 4 deploy (manual wrangler deploy)]

tech-stack:
  added:
    - "@cloudflare/workers-types (devDependency in cors-proxy/, NOT root)"
    - "wrangler (devDependency in cors-proxy/, NOT root)"
  patterns:
    - "Sibling-package Worker (cors-proxy/) — own package.json, deployed independently of main app"
    - "Sole-fetch-site discipline — src/ has exactly two fetch() callers (zones.ts, permapeople.ts)"
    - "Discriminated PermapeopleResult union — never throws, never blocks scheduling (CAT-07)"
    - "AbortController + setTimeout for fetch timeout (Pitfall I)"
    - "Defensive upstream parsing: typeof ===  'string' guards on every leaked field (T-02-10)"

key-files:
  created:
    - cors-proxy/src/index.ts
    - cors-proxy/wrangler.toml
    - cors-proxy/package.json
    - cors-proxy/tsconfig.json
    - cors-proxy/README.md
    - src/data/permapeople.ts
    - tests/data/permapeople.test.ts
    - .env.local.example
    - .planning/phases/02-data-layer-first-end-to-end/02-CORS-SPIKE.md
  modified:
    - src/vite-env.d.ts (added ImportMetaEnv augmentation)
    - .gitignore (cors-proxy/.wrangler/ + cors-proxy/.dev.vars)

key-decisions:
  - "Worker proxy is the DEFAULT path, not a fallback — live OPTIONS probe of permapeople.org/api/search returned HTTP 404 with no ACAO header"
  - "invalid-json case differentiated from cors via separate try/catch around res.json() (RESEARCH verbatim conflated them; tests required the distinction)"
  - "Worker source committed but NOT auto-deployed — wrangler deploy is a manual user action documented in cors-proxy/README.md"
  - "API keys live in wrangler secret; .env.local.example shows VITE_PERMAPEOPLE_KEY_* commented out as DEV-only escape hatch"

patterns-established:
  - "Sibling-package Worker layout — root npm install does NOT pull cors-proxy/ deps; proxy is independently versioned and deployed"
  - "Live-evidence spike record — 02-CORS-SPIKE.md template (a/b/c/d) with raw response headers + re-verification curl command"
  - "Defensive enrichment mapping — only string-typed fields leak through to the app; non-strings get dropped silently (T-02-10)"

requirements-completed: [CAT-06, CAT-07]

duration: ~12min
completed: 2026-04-26
---

# Phase 2 Plan 3: Permapeople Plumbing Summary

**Stateless Cloudflare Worker proxy + sole-fetch-site searchPlant() client with discriminated PermapeopleResult union covering 8 distinct outcomes — wired against a live-probed CORS-404 evidence record.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-26T23:08:00Z (approx. — agent start)
- **Completed:** 2026-04-26T23:20:00Z
- **Tasks:** 2 (both TDD where applicable)
- **Files created:** 9
- **Files modified:** 2

## Accomplishments

- Live OPTIONS probe of `permapeople.org/api/search` confirmed HTTP 404 with no `Access-Control-Allow-Origin` — recorded with raw response headers in `02-CORS-SPIKE.md` (sections a/b/c/d per CONTEXT specifics)
- Cloudflare Worker source (`cors-proxy/`) ships verbatim from RESEARCH §Pattern 5 with a sibling-package layout (own `package.json`, `wrangler.toml`, `tsconfig.json`, `README.md`); deployment is a separate user task per the README
- `src/data/permapeople.ts` is the sole fetch site for Permapeople in `src/` (verified by grep — exactly two callers in `src/`: `data/zones.ts` and `data/permapeople.ts`); 9/9 tests pass; full suite 88/88 green
- `searchPlant()` returns 8 distinct outcomes: `ok`, `not-found` (×2 paths), `rate-limited`, `unreachable/http-5xx`, `unreachable/cors`, `unreachable/timeout`, `unreachable/invalid-json` — never throws (CAT-07)
- AbortController + 8 s timeout (Pitfall I) tested with fake timers; modal close path can later wire an external signal

## Task Commits

1. **Task 1: Cloudflare Worker proxy + 02-CORS-SPIKE.md** — `1180677` (feat)
2. **Task 2 RED: failing PermapeopleResult tests** — `503d7da` (test)
3. **Task 2 GREEN: searchPlant() implementation + env types** — `27d753d` (feat)

(SUMMARY metadata commit follows.)

## Files Created/Modified

- `cors-proxy/src/index.ts` — Cloudflare Worker `fetch(req, env)` handler; OPTIONS preflight + `/search` + `/plants/{id}` routes; injects `x-permapeople-key-id/secret` from env
- `cors-proxy/wrangler.toml` — `compatibility_date = 2026-04-26`, `ALLOWED_ORIGIN = https://garden-gantt.pages.dev`, secrets via `wrangler secret put`
- `cors-proxy/package.json` — sibling package, `wrangler` + `@cloudflare/workers-types` devDeps; NOT installed at repo root
- `cors-proxy/tsconfig.json` — strict, ES2022, workers-types
- `cors-proxy/README.md` — manual `wrangler login` / `wrangler secret put` / `wrangler deploy` flow + dev-mode `wrangler dev` + re-verification curl
- `src/data/permapeople.ts` — sole-fetch-site client; `searchPlant()`, `EnrichmentFields`, `PermapeopleResult`; defensive `mapPermapeopleToEnrichment()`
- `tests/data/permapeople.test.ts` — 9 cases (ok, not-found×2, rate-limited, 5xx, cors, timeout, invalid-json, defensive mapping)
- `.env.local.example` — proxy default; commented direct-mode keys with dev-only warning
- `.planning/phases/02-data-layer-first-end-to-end/02-CORS-SPIKE.md` — live evidence (raw curl response headers from 2026-04-26 23:16 UTC) + re-verification command
- `src/vite-env.d.ts` — augmented `ImportMetaEnv` with the three `VITE_PERMAPEOPLE_*` keys
- `.gitignore` — `cors-proxy/.wrangler/` and `cors-proxy/.dev.vars`

## Decisions Made

- **Worker is the default, not a fallback** (D-17 / Pitfall A). Plan said as much; live re-probe at execution time confirmed and produced fresh raw-header evidence.
- **`invalid-json` differentiated from `cors`.** RESEARCH's verbatim catch block lumped both into `'cors'` because `res.json()` was inside the same try. The test for `invalid-json` (HTML body with `text/html` Content-Type) required a separate inner try around `res.json()`. Implementation deviates from the verbatim source by adding a second try/catch that returns `unreachable/invalid-json` cleanly. This matches the discriminated-union spec in `<interfaces>` which lists `'invalid-json'` as a distinct reason.
- **`network` reason left in the type but not currently emitted.** The spec lists 4 unreachable reasons (`cors | network | timeout | http-5xx | invalid-json` — actually 5 once we count). `network` is reserved for a future enhancement (e.g., `navigator.onLine === false` precheck) and remains in the type for forward compatibility; tests cover the other 4.
- **Worker NOT auto-deployed.** `cors-proxy/package.json` has a `deploy` script that requires `wrangler login` (interactive browser auth) and `wrangler secret put` (interactive prompts) — both are user-action gates. README documents the manual flow. Plan 02-12 / Phase 4 will surface this as a post-deploy checklist.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `invalid-json` vs `cors` were conflated in the RESEARCH verbatim**
- **Found during:** Task 2 GREEN (running tests)
- **Issue:** Pasting the RESEARCH §Pattern 5 implementation verbatim made `res.json()` parse failures bubble out as `unreachable/cors` (TypeError-or-anything path), but the spec and test both require `unreachable/invalid-json` for non-JSON bodies.
- **Fix:** Added a second try/catch around `res.json()` that returns `{ status: 'unreachable', reason: 'invalid-json' }` on any throw. Outer try now only wraps the `fetch()` call itself.
- **Files modified:** `src/data/permapeople.ts`
- **Verification:** Test case "returns unreachable/invalid-json when body is not parseable JSON" passes; TypeError-from-fetch still maps to `cors`.
- **Committed in:** `27d753d` (Task 2 GREEN commit)

**2. [Rule 2 — Missing critical] Defensive mapping for adversarial Permapeople fields**
- **Found during:** Task 2 RED (writing the 9th test case)
- **Issue:** RESEARCH's `mapPermapeopleToEnrichment` already had `typeof === 'string'` checks for `description` / `scientific_name` / `image_url` but lacked them for the `data: [{key, value}]` array entries. T-02-10 mitigation requires every leaked field to be type-checked.
- **Fix:** Added `typeof key === 'string' && typeof value === 'string'` guards in the `data` array reducer so non-string values are silently dropped. Result: only string fields ever populate `EnrichmentFields`.
- **Files modified:** `src/data/permapeople.ts`
- **Verification:** Test case "mapPermapeopleToEnrichment skips non-string fields defensively" passes (description: `{malicious:true}`, scientific_name: 42, image_url: array → all omitted; only `family: 'Brassicaceae'` survives).
- **Committed in:** `27d753d` (Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical security/correctness)
**Impact on plan:** Both auto-fixes were required to satisfy the plan's `<behavior>` block and its `<threat_model>` (T-02-10). No scope creep.

## Issues Encountered

- None blocking. Live curl probe to `permapeople.org` succeeded on first try and matched the prior research finding (HTTP 404 + no ACAO).

## User Setup Required

The Worker proxy is **not deployed** — that requires interactive `wrangler login` + `wrangler secret put` and is intentionally deferred. Until deployed, `searchPlant()` will return `{ status: 'unreachable', reason: 'cors' }` for any production call, which Plan 02-09's `CustomPlantModal` already plans to surface as a non-blocking "Permapeople is unreachable — try again later" message (CAT-07 graceful degradation).

When the user is ready to enable enrichment, they follow `cors-proxy/README.md` (3 commands), then set `VITE_PERMAPEOPLE_BASE_URL` in production env to the resulting Worker URL.

## Next Phase Readiness

- Plan 02-09 (`CustomPlantModal`) can `import { searchPlant, type PermapeopleResult } from '../../data/permapeople'` immediately — the sole-fetch-site contract is in place and exhaustively tested.
- Plan 02-12 verification can `grep -c VITE_PERMAPEOPLE_KEY` against `dist/` to confirm no API key reaches the browser bundle (T-02-12).
- Worker deployment is decoupled — the main app can ship to production without it; enrichment surfaces as gracefully unreachable (CAT-07).

## TDD Gate Compliance

- RED commit `503d7da` (test) — failed because `src/data/permapeople.ts` did not exist.
- GREEN commit `27d753d` (feat) — all 9 cases pass; full suite 88/88.
- No REFACTOR commit needed; the implementation was already clean (no duplication, defensive guards in place).

## Self-Check

- `cors-proxy/src/index.ts` — FOUND
- `cors-proxy/wrangler.toml` — FOUND
- `cors-proxy/package.json` — FOUND
- `cors-proxy/tsconfig.json` — FOUND
- `cors-proxy/README.md` — FOUND
- `src/data/permapeople.ts` — FOUND
- `tests/data/permapeople.test.ts` — FOUND
- `.env.local.example` — FOUND
- `.planning/phases/02-data-layer-first-end-to-end/02-CORS-SPIKE.md` — FOUND
- Commit `1180677` — FOUND
- Commit `503d7da` — FOUND
- Commit `27d753d` — FOUND
- Sole-fetch-site invariant — VERIFIED (`grep -rln 'fetch(' src/` returns exactly 2 paths)
- Tests — 88/88 pass
- tsc — clean
- eslint — clean

**Self-Check: PASSED**

---
*Phase: 02-data-layer-first-end-to-end*
*Completed: 2026-04-26*
