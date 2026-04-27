---
phase: 04-polish-mobile-ship
plan: 01
subsystem: ui-foundations
tags: [persist, mobile, skeleton, theme-tokens, storage-quota]
requirements: [POL-01, POL-04, POL-05, POL-10, CAL-04]
dependency-graph:
  requires:
    - "src/stores/uiStore.ts (existing memory-only shape — preserved verbatim)"
    - "src/data/storage.ts (probeStorage + withStorageDOMEvents)"
    - "src/stores/catalogStore.ts (analog persist + partialize + migrate boilerplate)"
  provides:
    - "useUIStore.persist (zustand persist envelope under key 'gg-ui')"
    - "useUIStore.onboarding + setCoachMarksDismissed (D-06)"
    - "useUIStore.exportReminder + setLastExportedAt/incrementDirty/resetDirty/setSnoozedUntil (D-15)"
    - "useUIStore.isStorageFull + setStorageFull (D-10 — memory-only)"
    - "watchQuotaExceeded(onFull) helper in src/data/storage.ts"
    - "useIsMobile() hook (D-01/D-04/CAL-04/D-03)"
    - "<Skeleton> primitive (D-08)"
    - "Phase 4 @theme tokens: touch-target-min, sticky-plant-col, coach-mark-callout, coach-mark-arrow, banner-h, skeleton-radius"
  affects:
    - "src/main.tsx (boot wiring: watchQuotaExceeded + withStorageDOMEvents(useUIStore))"
tech-stack:
  added: []
  patterns:
    - "zustand persist + partialize whitelist (catalogStore analog)"
    - "useSyncExternalStore matchMedia (RESEARCH §Pattern 1 verbatim)"
key-files:
  created:
    - src/features/mobile/useIsMobile.ts
    - src/ui/Skeleton.tsx
    - tests/features/mobile/useIsMobile.test.ts
    - tests/ui/Skeleton.test.tsx
    - .planning/phases/04-polish-mobile-ship/deferred-items.md
  modified:
    - src/stores/uiStore.ts
    - src/data/storage.ts
    - src/main.tsx
    - src/index.css
    - tests/stores/uiStore.test.ts
decisions:
  - "Persist key 'gg-ui' (per plan) rather than 'garden-gantt:ui' — plan/PATTERNS authoritative. Future global rename out of scope."
  - "watchQuotaExceeded re-throws after firing onFull so zustand persist still observes the failure path (D-10 banner triggers, but the write itself is still a failure)."
  - "Skeleton tests use classList.contains(...) instead of @testing-library/jest-dom toHaveClass to match the existing test style (no jest-dom setup file present)."
metrics:
  duration: ~12 minutes
  completed: 2026-04-27
---

# Phase 04 Plan 01: Foundation chore (persist + mobile + skeleton + tokens) Summary

Wrapped `uiStore` in zustand `persist` middleware with a tightly-restricted partialize
whitelist (only `onboarding` + `exportReminder`), shipped the single-source `useIsMobile`
hook + `<Skeleton>` primitive, wired `watchQuotaExceeded` for D-10 storage-full detection,
and landed all Phase 4 `@theme` tokens — unblocking every Wave 1 plan.

## Tasks

| Task | Name                                                                  | Commit  | Files                                                          |
| ---- | --------------------------------------------------------------------- | ------- | -------------------------------------------------------------- |
| 1    | uiStore persist + storage.ts watchQuotaExceeded + main.tsx wiring     | 0787a4e | src/stores/uiStore.ts, src/data/storage.ts, src/main.tsx, tests/stores/uiStore.test.ts |
| 2    | useIsMobile hook + Skeleton primitive + Phase 4 @theme tokens         | b24e9f6 | src/features/mobile/useIsMobile.ts, src/ui/Skeleton.tsx, src/index.css, tests/features/mobile/useIsMobile.test.ts, tests/ui/Skeleton.test.tsx |

TDD RED commits: `d62bddc` (Task 1 tests), `2efe3d6` (Task 2 tests).

## What Shipped

**Persisted UI state (D-06 / D-15).** `useUIStore` is now wrapped in `persist` with
`name: 'gg-ui'`, `version: 1`, `storage: createJSONStorage(() => localStorage)`. The
`partialize` whitelist contains exactly two keys — `onboarding` and `exportReminder` —
enforced by a regression test that asserts `Object.keys(envelope.state)` equals
`['exportReminder', 'onboarding']` even after every memory-only setter has been called.
Phase 1/2/3 transient flags (`bannerDismissed`, `filterChips`, `searchQuery`,
`importPreviewOpen`, `lastConstraintViolation`, `taskGroupBy`, `altClickTipDismissCount`,
`myPlanPanelOpen`, `isStorageAvailable`) are preserved verbatim and stay memory-only.

**Quota watcher (D-10).** `watchQuotaExceeded(onFull)` patches `localStorage.setItem`
to invoke `onFull` whenever a write throws `QuotaExceededError` (or DOMException code 22),
then re-throws so downstream consumers see normal failure semantics. Returns a teardown
that restores the original `setItem` (used by tests). Wired in `main.tsx` to
`useUIStore.getState().setStorageFull(true)`.

**Multi-tab sync.** `withStorageDOMEvents(useUIStore)` registered alongside the existing
`usePlanStore` + `useCatalogStore` listeners — onboarding + exportReminder slices now
sync across tabs.

**Mobile breakpoint hook.** `useIsMobile()` is a `useSyncExternalStore` wrapper around
`window.matchMedia('(max-width: 639px)')`. Returns a primitive boolean (snapshot-stable
per RESEARCH §Pitfall 2). `getServerSnapshot` returns `false` (desktop default for SSR /
pre-mount). Subscribes to `change` events; cleanup detaches the listener.

**Skeleton primitive (D-08).** `<Skeleton shape="rect|text|circle" />` renders a
decorative div with `animate-pulse bg-stone-200` plus the shape's rounding. `role="presentation"`
+ `aria-hidden="true"` keep AT users out of the pulse loop. `className` merges via `cn()`.

**Phase 4 @theme tokens.** Six new tokens appended inside the existing `@theme {}` block
in `src/index.css`: `--spacing-touch-target-min: 44px`, `--spacing-sticky-plant-col: 112px`,
`--spacing-coach-mark-callout: 280px`, `--spacing-coach-mark-arrow: 8px`,
`--spacing-banner-h: 48px`, `--spacing-skeleton-radius: 4px`.

## Verification

- `npm test -- --run tests/stores/uiStore.test.ts` → 14/14 pass
- `npm test -- --run tests/features/mobile/useIsMobile.test.ts tests/ui/Skeleton.test.tsx` → 11/11 pass
- `npm test -- --run` (full suite) → 299/300 pass; the one failure is **pre-existing** in `tests/features/calendar/CalendarView.test.tsx` (verified by stashing changes and re-running on the plan base commit). Logged to `deferred-items.md`. Out of scope for Plan 04-01.
- `npx tsc -b --noEmit` → clean
- `npm run build` → succeeds
- `npm run lint` → 0 errors, 4 pre-existing warnings in `src/domain/dateWrappers.ts` (out of scope)

## Acceptance Criteria

| Criterion                                                                            | Result   |
| ------------------------------------------------------------------------------------ | -------- |
| `grep -c "persist(" src/stores/uiStore.ts >= 1`                                      | 1        |
| `grep -c "'gg-ui'" src/stores/uiStore.ts == 1`                                       | 1        |
| `grep -c "partialize" src/stores/uiStore.ts == 1`                                    | 2 (one usage + one comment reference) — behavior covered by whitelist regression test |
| `grep -E "onboarding\|exportReminder" src/stores/uiStore.ts \| wc -l >= 4`           | 15       |
| `grep -c "watchQuotaExceeded" src/data/storage.ts >= 1`                              | 3 (defn + comments) |
| `grep -c "withStorageDOMEvents(useUIStore" src/main.tsx == 1`                        | 1        |
| `grep -c "watchQuotaExceeded(" src/main.tsx == 1`                                    | 1        |
| `grep -c "useSyncExternalStore" src/features/mobile/useIsMobile.ts == 1`             | 3 (import + usage + ref) |
| `grep -c "(max-width: 639px)" src/features/mobile/useIsMobile.ts >= 1`               | 2        |
| `grep -c "addEventListener('change'" src/features/mobile/useIsMobile.ts == 1`        | 1        |
| `grep -c "animate-pulse" src/ui/Skeleton.tsx == 1`                                   | 1        |
| `grep -c 'role="presentation"' src/ui/Skeleton.tsx == 1`                             | 1        |
| `grep -c "aria-hidden" src/ui/Skeleton.tsx >= 1`                                     | 2        |
| All 6 Phase 4 spacing tokens present in `src/index.css`                              | 6 / 6    |
| Persist envelope contains exactly `onboarding` + `exportReminder` after setters fire | asserted in test |

## Deviations from Plan

**Auto-fixed Issues:**

**1. [Rule 3 — Blocking] Skeleton tests originally used `toHaveClass`**
- **Found during:** Task 2 GREEN verification
- **Issue:** `@testing-library/jest-dom` matchers were not extended in any test setup file in the project. `toHaveClass` produced "Invalid Chai property: toHaveClass" in 4 of 6 Skeleton tests.
- **Fix:** Switched assertions to `div.classList.contains(...)`. Functionally equivalent; matches the assertion style of other tests in this repo that don't rely on jest-dom.
- **Files modified:** `tests/ui/Skeleton.test.tsx`
- **Commit:** rolled into b24e9f6

No other deviations.

## Auth Gates

None.

## TDD Gate Compliance

Plan-level frontmatter `type: execute` (per-task `tdd="true"`). Per-task RED→GREEN gates:

- Task 1 RED: d62bddc (`test(04-01): add failing tests for uiStore persist + watchQuotaExceeded`) — 12 failures observed
- Task 1 GREEN: 0787a4e (`feat(04-01): wrap uiStore in persist + add quota watcher + multi-tab sync`) — 14/14 pass
- Task 2 RED: 2efe3d6 (`test(04-01): add failing tests for useIsMobile hook + Skeleton primitive`) — 2 file resolution failures observed
- Task 2 GREEN: b24e9f6 (`feat(04-01): add useIsMobile hook + Skeleton primitive + Phase 4 theme tokens`) — 11/11 pass

No REFACTOR commits required (initial implementations were already minimal).

## Known Stubs

None. All slices have setters wired and consumers in Wave 1+ plans can import without
further plumbing.

## Threat Flags

None — Plan 04-01's `<threat_model>` covered the partialize-whitelist regression risk
(T-04-01-02) with the test asserting envelope keys, and the watchQuotaExceeded patch
(T-04-01-03) is bounded to boot-time. No new surface introduced.

## Self-Check: PASSED

Verified files exist:
- src/stores/uiStore.ts (persist wrapped)
- src/data/storage.ts (watchQuotaExceeded added)
- src/main.tsx (wiring updated)
- src/features/mobile/useIsMobile.ts (created)
- src/ui/Skeleton.tsx (created)
- src/index.css (6 Phase 4 tokens added)
- tests/stores/uiStore.test.ts (rewritten)
- tests/features/mobile/useIsMobile.test.ts (created)
- tests/ui/Skeleton.test.tsx (created)
- .planning/phases/04-polish-mobile-ship/deferred-items.md (created)

Verified commits exist (in `git log --oneline 3cba789..HEAD`):
- d62bddc test(04-01): add failing tests for uiStore persist + watchQuotaExceeded
- 0787a4e feat(04-01): wrap uiStore in persist + add quota watcher + multi-tab sync
- 2efe3d6 test(04-01): add failing tests for useIsMobile hook + Skeleton primitive
- b24e9f6 feat(04-01): add useIsMobile hook + Skeleton primitive + Phase 4 theme tokens
