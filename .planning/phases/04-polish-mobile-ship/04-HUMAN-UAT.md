---
status: partial
phase: 04-polish-mobile-ship
source: [04-VERIFICATION.md]
started: 2026-04-27T16:10:00Z
updated: 2026-04-27T16:10:00Z
---

## Current Test

[awaiting human testing — see runbook at 04-07-DEPLOY-NOTES.md]

## Tests

### 1. POL-07 perf checkpoint — DevTools Performance trace at /plan with stress fixture
expected: Median frame time during arrow-key drag spam ≤ 20ms (50fps); zero long tasks (>50ms) on main thread; Lighthouse Performance score ≥ 80 on Slow 4G mobile profile
result: [pass — Chrome stress trace passed; production Lighthouse mobile score 92/100]
runbook: .planning/phases/04-polish-mobile-ship/04-07-DEPLOY-NOTES.md §Task 2
why_human: DevTools Performance trace requires headed Chrome (no sandbox capability). Code-side ready: stress fixture + ?stress=1 hook + smoke test all in place.

### 2. DEPLOY-01 — Cloudflare Pages git integration + first deploy
expected: Repo connected to Cloudflare Pages (production branch=main, build=npm run build, output=dist, NODE_VERSION=20); first build green at https://{project}.pages.dev
result: [pending]
runbook: .planning/phases/04-polish-mobile-ship/04-07-DEPLOY-NOTES.md §Task 3
why_human: Cloudflare Pages git integration requires user GitHub OAuth from the Cloudflare dashboard — not CLI-automatable.

### 3. DEPLOY-03 — Cache headers verified on live deployed URL + functional/a11y/propagation smoke
expected: curl -I {deployed}/index.html returns "cache-control: no-cache, no-store, must-revalidate"; curl -I on /assets/*.js returns "cache-control: public, max-age=31536000, immutable". Functional smoke 9/9 + a11y smoke 4/4 + propagation round-trip pass.
result: [pending]
runbook: .planning/phases/04-polish-mobile-ship/04-07-DEPLOY-NOTES.md §Task 4
why_human: Requires a live deployed URL from §2.

## Summary

total: 3
passed: 1
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

[none for POL-07 — keyboard-drag trace passed and production Lighthouse scored 92/100. Dev-server Lighthouse score was discarded because it measured Vite dev tooling instead of the production bundle.]
