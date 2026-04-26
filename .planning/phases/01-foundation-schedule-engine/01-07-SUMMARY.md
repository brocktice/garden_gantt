---
phase: 01-foundation-schedule-engine
plan: 07
subsystem: ui-shell
tags: [react-router, hash-router, app-shell, banner, error-boundary, ios-private-mode, deep-links, lucide-react, tailwind-v4]

# Dependency graph
requires:
  - phase: 01-foundation-schedule-engine
    plan: 01
    provides: Vite + React + TS scaffold; PlaceholderRoute reusable component; lucide-react and react-router@^7.14.2 deps locked; public/_redirects SPA fallback
  - phase: 01-foundation-schedule-engine
    plan: 06
    provides: probeStorage(), withStorageDOMEvents(), usePlanStore (persist machinery), useUIStore (in-memory bannerDismissed + isStorageAvailable + their setters)
provides:
  - Hash router shell — <HashRouter> + <Routes> with #/, #/setup, #/plan, #/tasks, #/settings, and a catch-all (DEPLOY-02)
  - AppShell layout — sticky 60px header with app name + tagline + 4 nav links, hashchange-driven active-link state, banner slot, max-w-7xl main content
  - Banner component — amber palette, role=status + aria-live=polite, lucide-react X dismiss with aria-label="Dismiss banner" (DATA-03 visible side)
  - ErrorBoundary class component — getDerivedStateFromError + componentDidCatch, renders UI-SPEC error template
  - Boot sequence in main.tsx — probeStorage → setStorageAvailable → withStorageDOMEvents(usePlanStore) → render <StrictMode><HashRouter><App/></HashRouter></StrictMode>
affects: [01-08 GanttView (mounts inside AppShell at #/plan), 02-* setup wizard (replaces Setup placeholder), 03-* tasks dashboard (replaces Tasks placeholder), 04-* settings panel (replaces Settings placeholder)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hash routing via <HashRouter> declarative API (D-08, RESEARCH.md Q1 recommendation): smaller surface than createHashRouter; data-router APIs (loaders/actions) deferred to Phase 2 if needed."
    - "Active-nav-link via window.hashchange listener instead of react-router's NavLink: AppShell uses a useCurrentHash() hook (state + hashchange listener) to read window.location.hash and apply the green-700 underline. Plain <a href=#/...> anchors handle navigation; HashRouter's <Routes> resolves them."
    - "Banner reads useUIStore selector-by-selector: 3 separate useUIStore((s) => s.field) calls, not one bulk read. Each call subscribes to a single field, so the dismiss button only re-renders when bannerDismissed flips."
    - "ErrorBoundary as class component (no functional alternative in React 19 yet): static getDerivedStateFromError sets state; componentDidCatch logs to console (Phase 4 will pipe to a logger)."
    - "Boot sequence ordering pinned: probeStorage() runs BEFORE rendering, setStorageAvailable() updates uiStore BEFORE <App/> mounts → no flash-of-banner during initial paint."

key-files:
  created:
    - src/app/AppShell.tsx
    - src/app/Banner.tsx
    - src/app/ErrorBoundary.tsx
    - src/app/App.tsx
  modified:
    - src/main.tsx (replaced Wave-1 stub with full boot sequence)

key-decisions:
  - "Hash routes use plain <a href=#/...> anchors (not react-router's <NavLink>): HashRouter resolves the hash on click without needing react-router hooks; the active-link state derives from window.location.hash via a hashchange listener. Simpler than coupling AppShell to react-router context for an effect that's just CSS class conditional rendering."
  - "Catch-all route (path='*') renders the same Plan-loading placeholder as #/plan: any unknown hash (typo, stale link) lands on the gantt placeholder, eliminating any 404 perception on a single-user static site."
  - "ErrorBoundary placed OUTSIDE AppShell (wraps it): a render error inside the header or banner gets caught by the outer boundary. If it were inside the shell, an error in AppShell itself would bubble unhandled."
  - "main.tsx never stores the cleanup returned by withStorageDOMEvents(): the listener is process-lifetime; React StrictMode in dev double-invokes the import side effects but the listener is keyed on the same callback identity, so duplicate addEventListener calls are deduped by the browser. In production this is a single attach."

patterns-established:
  - "App.tsx is the route-table owner: the only file that imports from 'react-router' for routing primitives (Routes, Route). Plan 08 will modify this same file to swap the #/plan placeholder for <GanttView/>."
  - "AppShell layout contract: Banner above header, header sticky-top, main with id='main' for future Phase 4 skip-link target. Phase 2/3/4 features mount inside AppShell as route children — never replace the shell."
  - "id='main' on the <main> element is the canonical skip-link anchor for future a11y work (UI-SPEC §Accessibility Baselines): future <a href='#main'>Skip to main content</a> just works."

requirements-completed: [DEPLOY-02, DATA-03]

# Metrics
duration: 2min
completed: 2026-04-26
---

# Phase 1 Plan 07: Hash Router Shell + AppShell + Banner + ErrorBoundary Summary

**React Router 7 hash-router shell wired into a sticky-header AppShell with iOS Private Mode amber banner, lucide-react X dismiss icon, and a top-level ErrorBoundary; main.tsx executes the canonical probeStorage → setStorageAvailable → withStorageDOMEvents → render boot sequence so DEPLOY-02 (deep-link survival on static hosts) and DATA-03 (non-blocking banner UX) both light up.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-26T20:24:05Z
- **Completed:** 2026-04-26T20:26:37Z
- **Tasks:** 2
- **Files created:** 4 (AppShell, Banner, ErrorBoundary, App)
- **Files modified:** 1 (main.tsx — replaced stub with full boot sequence)

## Accomplishments

- **Hash router shell live:** all 6 hash paths (`#/`, `#/setup`, `#/plan`, `#/tasks`, `#/settings`, `#/anything-else`) resolve to `dist/index.html` on the static preview server. Verified end-to-end with `npm run preview` + curl: every path returns HTTP 200 with `id="root"` present in the HTML, confirming DEPLOY-02 deep-link survival on a static host.
- **AppShell layout matches UI-SPEC §Layout Shell exactly:** sticky 60px white header with `border-b border-stone-200`, app name "Garden Gantt" in `text-xl font-semibold text-stone-900`, tagline "Plug in your ZIP and your plants. Get a season schedule." in `text-sm font-normal text-stone-600` with `hidden md:inline` collapse on narrow viewports, 4 nav links (Setup, Plan, Tasks, Settings) in `text-sm font-medium`, active-link state styled with the UI-SPEC accent (`text-green-700 underline underline-offset-4 decoration-2`).
- **Banner contract exact:** amber-100 bg + amber-800 text + amber-200 border, sticky top-0 z-30 above the header, `role="status"` + `aria-live="polite"` (non-blocking advisory per UI-SPEC §Decisions), lucide-react `<X size={16} />` dismiss icon inside a button with `aria-label="Dismiss banner"` and the green-700 focus ring per UI-SPEC §Accessibility Baselines. Banner returns `null` when `isStorageAvailable === true` OR `bannerDismissed === true`.
- **Boot sequence pinned:** `main.tsx` runs `probeStorage()` first, immediately calls `useUIStore.getState().setStorageAvailable(...)`, then `withStorageDOMEvents(usePlanStore)` to wire the multi-tab listener (DATA-06 contract — inert in Phase 1 since no plan data persists, hot in Phase 2+), then mounts `<StrictMode><HashRouter><App/></HashRouter></StrictMode>` into `#root`. Order matches RESEARCH.md §Code Examples lines 631–660 verbatim.
- **ErrorBoundary catches render errors:** class component with `static getDerivedStateFromError` sets `state.error`, `componentDidCatch` logs to console. Render branch outputs the UI-SPEC §Copywriting error template ("Something went wrong" + error.message + "Refresh to try again."). Wraps the entire AppShell, so a render error inside the header/banner falls back to the themed error state.
- **No regressions:** all 30 prior tests still pass (5 storage + 3 planStore + 12 dateWrappers + 7 schedule snapshots + 3 SCH-04 constraint tests). `npx tsc --noEmit` exits 0. `npm run build` produces `dist/index.html` (0.46 KB) + `dist/assets/index-*.js` (241 KB / 77 KB gzip) cleanly.

## Task Commits

Each task was committed atomically:

1. **Task 1: AppShell + Banner + ErrorBoundary (UI-SPEC layout)** — `fb3b044` (feat)
2. **Task 2: App.tsx route table + main.tsx full boot sequence** — `e44e7ed` (feat)

Plan metadata commit follows after this SUMMARY.

## Files Created/Modified

### Created

- `src/app/AppShell.tsx` (74 lines) — Layout shell. `<Banner/>` + sticky 60px header (app name + tagline + 4 nav links) + `<main id="main">`. `useCurrentHash()` hook reads `window.location.hash` and listens for `hashchange` to update the active-link state.
- `src/app/Banner.tsx` (40 lines) — iOS Private Mode banner. Reads 3 selectors from `useUIStore`. Returns `null` when storage is available OR user has dismissed. Uses lucide-react `<X size={16} />` for the dismiss button.
- `src/app/ErrorBoundary.tsx` (37 lines) — Class component with `state: { error: Error | null }`, `static getDerivedStateFromError` for state derivation, `componentDidCatch` for console logging.
- `src/app/App.tsx` (75 lines) — Route table inside `<ErrorBoundary><AppShell><Routes/>`. 6 routes (5 explicit + catch-all `*`). All copy strings match UI-SPEC §Placeholder Route Copy table verbatim.

### Modified

- `src/main.tsx` — Replaced Wave-1 stub (10-line `<h1>boot OK</h1>` placeholder) with the full boot sequence: 9 imports, probe, setStorageAvailable, withStorageDOMEvents, render `<StrictMode><HashRouter><App/></HashRouter></StrictMode>`. 26 lines.

## Decisions Made

- **Plain `<a href="#/...">` anchors instead of react-router's `<NavLink>`:** the active-link styling is purely a CSS class conditional, and HashRouter resolves anchor clicks without needing react-router hooks. Coupling AppShell to react-router context (e.g. `useLocation()`) just to compute "is this the active link" would be heavier than a 4-line `useCurrentHash()` hook. The hashchange-listener approach also makes AppShell trivially testable in isolation (no MemoryRouter wrapping needed).
- **Catch-all `path="*"` route renders the Plan-loading placeholder, not a 404:** on a single-user static site, any unknown hash is more likely a typo or stale bookmark than a hostile probe. Landing on the gantt placeholder gives a recoverable UX. The catch-all is a deliberate UX call — DEPLOY-02 says "deep links work after refresh" and that means even mis-typed deep links don't dead-end.
- **ErrorBoundary wraps AppShell (outer-most position):** if the boundary lived inside AppShell, an error in the header or banner would bubble past it and crash the app. Outer placement guarantees ANY render error falls back to the themed error state.
- **No reset/recovery in the ErrorBoundary error UI:** the UI-SPEC error template specifies "Refresh to try again." as the recovery action. A "Try again" button that called `setState({ error: null })` would re-trigger the same error in most cases (the error is in the render tree below; clearing the boundary's state doesn't fix the underlying bug). Refresh is the honest recovery.
- **`withStorageDOMEvents(usePlanStore)` cleanup intentionally NOT stored:** the listener attaches at module-init time (top-level main.tsx code) and lives for the page lifetime. React StrictMode's double-invocation in dev affects component effects, not module-level imports — so this attaches exactly once per page load.
- **Anchor route `#/` and `#/plan` both render the same placeholder:** redundant on the surface, but RESEARCH.md §Code Examples used this pattern (line 755 vs 756) and it makes Plan 08's swap mechanical — Plan 08 just changes both `path="/"` and `path="/plan"` element to `<GanttView/>`.

## Deviations from Plan

None — plan executed exactly as written. The plan-body code listings for Banner.tsx, ErrorBoundary.tsx, AppShell.tsx, App.tsx, and main.tsx all compiled, type-checked, and passed lint cleanly on first commit.

## Issues Encountered

None.

## Verification Run

- `npx tsc --noEmit` → exits 0 ✓
- `npm run build` → exits 0 (dist/index.html 0.46 kB; dist/assets/index-*.js 241.17 kB / 77.50 kB gzip; dist/assets/index-*.css 14.98 kB / 3.86 kB gzip) ✓
- `npm test -- --run` → 5 test files, 30 tests, 30 passed ✓
- `grep -rn 'localStorage\.' src/app/` → empty (Banner/AppShell/ErrorBoundary do not touch localStorage; only read from useUIStore) ✓
- `grep -rn "from 'react-router-dom'" src/` → empty (we use react-router v7, not react-router-dom) ✓
- DEPLOY-02 static-host smoke test (npm run preview + curl):
  - `GET /` → HTTP 200, `id="root"` present
  - `GET /#/setup` → HTTP 200, `id="root"` present
  - `GET /#/plan` → HTTP 200, `id="root"` present
  - `GET /#/tasks` → HTTP 200, `id="root"` present
  - `GET /#/settings` → HTTP 200, `id="root"` present
  - `GET /#/anything-else` → HTTP 200, `id="root"` present
- Pre-existing lint issues (logged in deferred-items.md from Plan 01-05): 1 error in `src/domain/constraints.ts:28` (`_plant` unused), 1 warning in `src/domain/dateWrappers.ts:25` (stale eslint-disable). Both out-of-scope for this plan; not touched.

## Threat Model Verification

Plan §threat_model dispositions confirmed:
- **T-01-28 (XSS via hash):** ACCEPTED. AppShell's `useCurrentHash()` compares strings with `===`, never injects into HTML. Banner/ErrorBoundary do not read the hash at all.
- **T-01-29 (catch-all wrong content):** MITIGATED. `path="*"` route renders the Plan-loading placeholder, identical to `path="/plan"`. No 404 on any hash.
- **T-01-30 (info disclosure via console.error):** ACCEPTED. ErrorBoundary's `componentDidCatch` logs error + info via `console.error`. Phase 1 has no plan data, no PII; Phase 4 will pipe to a real logger.
- **T-01-31 (banner dismiss keyboard accessibility):** MITIGATED. Native `<button type="button">` with `aria-label="Dismiss banner"` and the green-700 `focus-visible:outline` ring per UI-SPEC. Tab order: header app name → 4 nav links → main content; banner sits before header, so its dismiss button is first in tab order when present.
- **T-01-32 (DoS via repeated hashchange renders):** ACCEPTED. `useCurrentHash` only calls `setHash` when the new hash differs from the previous; React deduplicates same-value setState calls.
- **T-01-33 (repudiation):** N/A. Single-user app.

## TDD Gate Compliance

This is an `execute` plan (not `tdd`), and neither task was marked `tdd="true"`. Both tasks committed as single `feat` commits per the task_commit_protocol. Gate enforcement does not apply.

## Self-Check: PASSED

All claimed files exist on disk:
- `src/app/AppShell.tsx` FOUND
- `src/app/Banner.tsx` FOUND
- `src/app/ErrorBoundary.tsx` FOUND
- `src/app/App.tsx` FOUND
- `src/main.tsx` FOUND (modified)

All claimed commits exist in `git log`:
- `fb3b044` FOUND (feat(01-07): add AppShell + Banner + ErrorBoundary (UI-SPEC layout))
- `e44e7ed` FOUND (feat(01-07): wire HashRouter shell + boot sequence (DEPLOY-02, DATA-03))

## User Setup Required

None — pure-frontend modules, no external services or runtime config.

## Next Phase Readiness

- **Plan 08 (GanttView):** Mechanical swap of two `<PlaceholderRoute heading="Plan — Loading…" .../>` elements in `src/app/App.tsx` to `<GanttView/>` (the `path="/"` route and the `path="/plan"` route). Optionally also the `path="*"` catch-all if Plan 08 wants unknown hashes to land on the gantt — currently catch-all also renders the Plan-loading placeholder so a single edit covers it. AppShell, Banner, ErrorBoundary, and main.tsx are all fixed contracts; Plan 08 does not touch them.
- **Phase 2 (Setup Wizard, Tasks, Settings):** Each phase replaces ONE PlaceholderRoute element in App.tsx with its real route component. Header/banner/error-boundary/boot-sequence are stable across phases.
- **Phase 4 (a11y polish):** `<main id="main">` is the skip-link target; adding `<a href="#main" className="sr-only focus:not-sr-only">Skip to main content</a>` at the top of AppShell will satisfy the WCAG-AA skip-link requirement with no shell restructuring.

---
*Phase: 01-foundation-schedule-engine*
*Plan: 07*
*Completed: 2026-04-26*
