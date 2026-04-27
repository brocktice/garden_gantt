---
phase: 02-data-layer-first-end-to-end
plan: 12
subsystem: testing-and-final-verification
status: automated-tasks-complete; manual-checkpoint-pending
tags: [testing, react-testing-library, integration-test, phase-2-gate]
requires:
  - 02-01 (catalog), 02-02 (zone data), 02-03 (Permapeople), 02-04 (UI primitives)
  - 02-05 (planStore), 02-06 (settings + filters), 02-07 (catalogStore + UI store)
  - 02-08 (SetupWizard), 02-09 (CustomPlantModal), 02-10 (CatalogBrowser route)
  - 02-11 (SettingsPanel + export/import)
provides:
  - "Component-test infrastructure: @testing-library/react + happy-dom + @vitest-environment pragma pattern"
  - "Phase 2 success criteria coverage at component-test level (SC-1, SC-2, SC-5 + Phase 1 SC-4 inheritance)"
  - "Flow A integration test as canonical happy-path regression guard"
affects:
  - "src/stores/catalogStore.ts (Rule 1 fix: memoized selectMerged)"
tech-stack:
  added:
    - "@testing-library/react@16.3.2"
    - "@testing-library/jest-dom@6.10.0"
    - "@testing-library/user-event@14.7.1"
  patterns:
    - "Per-file `@vitest-environment happy-dom` JSDoc pragma (Vitest 4 removed environmentMatchGlobs)"
    - "vi.spyOn(globalThis, 'fetch').mockImplementation(...) for static-asset and Permapeople mocks (no MSW)"
    - "MemoryRouter + dynamic import('../src/...') for module-isolation-friendly component tests"
key-files:
  created:
    - tests/features/setup/SetupWizard.test.tsx
    - tests/features/catalog/CatalogBrowser.test.tsx
    - tests/features/catalog/CustomPlantModal.test.tsx
    - tests/integration/happy-path.test.tsx
  modified:
    - vite.config.ts (include `.tsx` test glob)
    - package.json (testing-library devDeps)
    - src/stores/catalogStore.ts (memoize selectMerged — Rule 1)
decisions:
  - "Use @vitest-environment happy-dom file pragma (Vitest 4 removed environmentMatchGlobs); matches existing tests/stores/** + tests/data/** pattern"
  - "vi.spyOn fetch instead of MSW — no new dependency, mocks scoped per-test, mirrors tests/data/permapeople.test.ts pattern"
  - "Cache selectMerged by customPlants array reference (Rule 1 deviation, see Deviations)"
metrics:
  duration: "~1 minute (2 commits, 4 new test files, ~620 lines added)"
  completed: 2026-04-26
  tests-added: 12
  tests-total-before: 141
  tests-total-after: 153
---

# Phase 2 Plan 12: Phase 2 Verification Gate Summary

Component-test layer + Flow A integration test now cover the full Phase 2 wizard
→ catalog → gantt happy path. React Testing Library + happy-dom pragma + dynamic
imports unlock DOM-aware testing without changing the existing tests/domain/**
node-environment baseline.

## What landed

**3 component tests:**

1. `tests/features/setup/SetupWizard.test.tsx` — 4 tests
   - Step 1 hero copy ("Let's set up your garden") renders when `plan === null`
   - "Try with sample plan →" link visible only when plan is null (D-03)
   - Next button stays disabled until ZIP lookup succeeds
   - Unrecognized ZIP shows "ZIP not recognized" manual-entry block (D-06)

2. `tests/features/catalog/CatalogBrowser.test.tsx` — 4 tests
   - Renders search bar + 8 filter chips + pinned add-custom card
   - Search filters cards (Tomato + em-dash variants)
   - Clicking a chip toggles `aria-checked`
   - "Add to plan" button creates a planting in `usePlanStore`

3. `tests/features/catalog/CustomPlantModal.test.tsx` — 3 tests
   - Save button disabled until plant name is non-empty
   - Permapeople enrich populates "Permapeople found" preview block
   - Permapeople unreachable shows amber warning, Save stays enabled (CAT-07)

**1 integration test:**

4. `tests/integration/happy-path.test.tsx` — 1 test (Flow A)
   - `<App/>` at `/setup` with `plan === null`
   - Type ZIP `20001` → derived block shows zone `7a`
   - Click Next → catalog browser
   - Click 5 "Add to plan" buttons → 5 plantings in store
   - Verify `localStorage['garden-gantt:plan']` contains 5 plantings
   - Unmount, wipe in-memory state, `persist.rehydrate()` → 5 plantings restored
   - Render `/plan` → no "No plants in your plan yet" empty state

**Tests delta:** 16 files / 141 tests → 20 files / 153 tests (+4 files, +12 tests).

## Programmatic Phase 2 verification

| Gate | Status | Evidence |
| ---- | ------ | -------- |
| `npm test -- --run` | passing | 20 files, 153 tests, 0 failures |
| `npx tsc --noEmit` | clean | no errors |
| `npx eslint .` | 1 error / 4 warnings — all pre-existing | tracked in `.planning/phases/02-data-layer-first-end-to-end/deferred-items.md` (constraints.ts `_plant`, dateWrappers.ts unused-disables) |
| `npm run build` | success | 539 kB JS, 32 kB CSS, gzip 161 kB |
| dist contents | complete | `dist/_redirects`, `dist/data/zones.{0..9}.json`, `dist/index.html` all present |
| `npm run preview` | all 6 routes 200 | `/`, `/setup`, `/plan`, `/catalog`, `/tasks`, `/settings` — `<div id="root">` present in each |
| `grep VITE_PERMAPEOPLE_KEY dist/` | 0 hits | T-02-39 mitigated (no key set in environment) |
| Phase 1 engine snapshot suite | byte-identical | `tests/domain/scheduler.snapshot.test.ts` 100% pass, no snapshot diff |

## Phase 2 Success Criteria — Programmatic Coverage

| SC | Description | Coverage |
| -- | ----------- | -------- |
| SC-1 | ZIP entry → derived zone+frost with override path | `SetupWizard.test.tsx` (Next-disabled-until-valid + D-06 fallback) + `tests/data/zones.test.ts` |
| SC-2 | 5 plants in catalog → gantt with one row per planting | `happy-path.test.tsx` (5-plantings end state + /plan rendered without empty state) |
| SC-3 | Succession toggle on lettuce/radish → extra rows in gantt | covered by Plan 02-08 store tests (`toggleSuccession`) + manual checkpoint visual confirmation |
| SC-4 | Export → Import round-trip restores the same gantt | covered by `tests/features/settings/exportPlan.test.ts` + `importPlan.test.ts` (Plan 02-11) |
| SC-5 | Reload preserves state; Permapeople unreachable doesn't block any core flow | `happy-path.test.tsx` (rehydrate proves state persist) + `CustomPlantModal.test.tsx` ("unreachable" path leaves Save enabled) |

SC-3 has partial programmatic coverage at the store layer (toggleSuccession setter
flips the boolean and the engine produces the additional rows in snapshot tests).
The visual gantt confirmation requires the manual checkpoint Task 3.

## Deviations from Plan

### Rule 1 — Bug fix during testing

**1. [Rule 1 - Bug] Memoize `selectMerged` to satisfy React 19's getSnapshot cache invariant**

- **Found during:** Task 1 — first render of `<CatalogBrowser/>` from a test
  triggered `Maximum update depth exceeded` and `The result of getSnapshot
  should be cached to avoid an infinite loop`.
- **Issue:** `src/stores/catalogStore.ts` exported a `selectMerged` selector
  that built a fresh `new Map()` on every call. Zustand's `useSyncExternalStore`
  uses `Object.is` to compare snapshot results — a new Map every call → constant
  re-render → infinite loop in React 19. The bug was masked in dev/preview
  because no component was actively re-rendering on every animation frame; the
  test harness (with userEvent driving rapid state changes) exposed it.
- **Fix:** Cache the merged Map by the `customPlants` array reference identity
  (Zustand replaces the array only on writes, so the cache invalidates correctly
  on add/remove/edit of a custom plant).
- **Files modified:** `src/stores/catalogStore.ts`
- **Commit:** `c4ad760`

### Rule 3 — Blocking-issue fixes

**2. [Rule 3 - Build] vite.config.ts environmentMatchGlobs is removed in Vitest 4**

- **Found during:** Task 1 Step 2.
- **Issue:** Plan called for `environmentMatchGlobs` to switch tests to happy-dom
  by glob; that option was deprecated in Vitest v3 and removed in v4.
- **Fix:** Rely on the `@vitest-environment happy-dom` file-pragma pattern that
  the existing tests/stores/** and tests/data/** already use. Updated
  vite.config.ts to include `*.test.{ts,tsx}` (was `*.test.ts`) and added a
  comment explaining the choice.
- **Files modified:** `vite.config.ts`
- **Commit:** `c4ad760`

**3. [Rule 3 - Build] Stale store state across happy-path test segments**

- **Found during:** Task 2 first run.
- **Issue:** After unmounting the wizard render, calling
  `usePlanStore.setState({ plan: null })` to "simulate a fresh tab" wiped not
  only the in-memory state but also the localStorage payload (persist
  middleware persists every setState). Subsequent `App` re-render saw
  `plan === null`.
- **Fix:** Read the persisted blob from localStorage before resetting, then
  re-write it after the in-memory wipe and call `persist.rehydrate()` to force
  a real rehydrate. Documents and exercises the actual rehydrate path that runs
  on a fresh tab open.
- **Files modified:** `tests/integration/happy-path.test.tsx`
- **Commit:** `1d9725c`

## Auth Gates

None.

## Known Stubs

None for this plan. Wizard, catalog, modal, and gantt are all wired to real
stores; no placeholder data flows to the UI.

## Threat Model

T-02-38 (test fixtures don't leak into prod):
- Component tests scope `vi.spyOn(globalThis, 'fetch')` per `beforeEach` and
  call `vi.restoreAllMocks()` in `afterEach`. No leakage between tests.

T-02-39 (API key in dist/):
- `grep -rn "VITE_PERMAPEOPLE_KEY" dist/` returns zero hits with no `.env.local`
  set. Confirmed via test step.

## Manual Checkpoint — PENDING

Task 3 of the plan is a `checkpoint:human-verify` BLOCKING gate. The 5 Phase 2
success criteria still require human visual confirmation in a real browser
(Flow A walk-through, custom-plant + Permapeople flow, export/import round
trip, multi-tab sync). See the CHECKPOINT REACHED message returned by the
executor for full step-by-step instructions.

The plan is **NOT** marked complete in STATE.md / ROADMAP.md until the
human verifier returns "approved" on the checkpoint.

## Self-Check: PASSED

- [x] tests/features/setup/SetupWizard.test.tsx exists (verified)
- [x] tests/features/catalog/CatalogBrowser.test.tsx exists (verified)
- [x] tests/features/catalog/CustomPlantModal.test.tsx exists (verified)
- [x] tests/integration/happy-path.test.tsx exists (verified)
- [x] vite.config.ts updated (verified)
- [x] src/stores/catalogStore.ts memoization fix in place (verified)
- [x] Commit c4ad760 in `git log --oneline` (verified — Task 1)
- [x] Commit 1d9725c in `git log --oneline` (verified — Task 2)
- [ ] Manual checkpoint approval — PENDING (does not block this SUMMARY.md;
      tracked separately)
