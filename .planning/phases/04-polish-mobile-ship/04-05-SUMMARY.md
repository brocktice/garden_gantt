---
phase: 04-polish-mobile-ship
plan: 05
subsystem: export-reminder
tags: [POL-10, D-12, D-13, D-14, D-15, banner, selector, dirty-counter]
requires:
  - Plan 04-01 (Wave 0): wraps uiStore in Zustand persist + adds onboarding/exportReminder partialize whitelist (so the bookkeeping survives reload). This plan ships the slice + setters surface; Plan 04-01 makes them durable.
provides:
  - useExportReminder() selector + action helpers (D-12 thresholds, D-13 snooze copy)
  - useShouldShowExportReminder() pure should-show selector (no actions)
  - <ExportReminderBanner /> component (NOT mounted; Plan 04-06 mounts in AppShell with priority-stack rule)
  - planStore dirty-counter side-effects on every D-14 schema-meaningful coarse setter
  - exportPlan() post-success side-effect (D-15: setLastExportedAt + resetDirty atomically with successful download)
affects:
  - src/stores/planStore.ts — coarse setters now invoke uiStore.incrementDirty() (one-way dependency; uiStore does NOT import planStore)
  - src/features/settings/exportPlan.ts — success branch writes lastExportedAt + resets dirty counter
  - src/stores/uiStore.ts — adds exportReminder slice + 4 setters (memory-only until Plan 04-01 lands persist)
tech-stack:
  added: []
  patterns:
    - one-way store coupling (planStore → uiStore) for cross-store side-effects without circular imports
    - selector + actions split (useShouldShowExportReminder pure / useExportReminder adds writers)
    - UTCDate-wrapped format for timezone-stable short-date rendering (matches noon-UTC storage)
key-files:
  created:
    - src/features/export-reminder/useExportReminder.ts
    - src/features/export-reminder/ExportReminderBanner.tsx
    - tests/stores/planStore.dirty-counter.test.ts
    - tests/features/export-reminder/useExportReminder.test.ts
    - tests/features/export-reminder/ExportReminderBanner.test.tsx
  modified:
    - src/stores/uiStore.ts (+ exportReminder slice + 4 setters)
    - src/stores/planStore.ts (+ 11 incrementDirty() side-effects, + uiStore import)
    - src/features/settings/exportPlan.ts (+ post-success bookkeeping, + uiStore import)
decisions:
  - Snooze writes use date-fns addDays(parseISO(nowISOString()), n).toISOString() — never raw new Date(string), per project SCH-03 ESLint rule
  - formatLastExportedShort wraps parseISO output in UTCDate before format('MMM d') so the rendered short date is timezone-stable across viewer timezones (same noon-UTC discipline as src/domain/dateWrappers)
  - removeCustomPlantWithCascade increments dirty exactly ONCE per cascade invocation (not once per dropped planting) — one user intent, one edit
  - exportPlan failure paths leave uiStore.exportReminder untouched (preserves "didn't really export" semantics; T-04-05-05 mitigation)
  - Banner is NOT mounted here — Plan 04-06 owns the AppShell priority-stack mount-point (storage-full > iOS Private > export-reminder)
metrics:
  duration: 7min
  completed: 2026-04-27
  tasks: 2
  files_changed: 8
  commits: 4
---

# Phase 04 Plan 05: Export-reminder Slice Summary

Ships POL-10 export-reminder UX per D-12/D-13/D-14/D-15: banner triggers when 20 dirty edits accumulate OR 14+ days have passed with any unsaved changes; snoozable for 3 or 30 days; counter resets atomically with successful export.

## What Shipped

### Task 1 — D-14 dirty-counter + D-15 exportPlan post-success side-effect

`useUIStore.getState().incrementDirty()` invoked after the `set(...)` mutation of every schema-meaningful coarse setter in `planStore`. 11 setters wired:

| Setter | Increments? | Reason |
|--------|-------------|--------|
| `setLocation` | yes | location is exported data |
| `addPlanting` | yes | new planting in export |
| `removePlanting` | yes | planting removed from export |
| `toggleSuccession` | yes | succession flag is exported |
| `commitEdit` | yes | drag-commit edit log entry |
| `upsertCustomPlant` | yes | covers add+edit |
| `removeCustomPlant` | yes | plant removal |
| `removeCustomPlantWithCascade` | yes (ONCE per call) | cascade is one user intent |
| `addCustomTask` | yes | task added |
| `editCustomTask` | yes | task edited |
| `removeCustomTask` | yes | task removed |
| `setLock` | NO | reversible lock state, not a real edit (D-14) |
| `toggleTaskCompletion` | NO | transient view state, not exported plan data (D-14) |
| `loadSamplePlan` | NO | bootstraps from immutable sample (D-14) |
| `replacePlan` | NO | import path; importPlan owns its own bookkeeping (D-14) |
| zundo undo/redo | NO | replays state directly without re-invoking setters (verified by test) |

`exportPlan()` success branch (after the anchor-click download) calls
`useUIStore.getState().setLastExportedAt(nowISOString())` then `resetDirty()`. Failure
branches (no plan, schema validation error) leave `uiStore.exportReminder` unchanged.

### Task 2 — useExportReminder selector + ExportReminderBanner

`useShouldShowExportReminder()` evaluates the D-12 trigger matrix:

```
if (snoozedUntil && parseISO(snoozedUntil) > now) → false  // snooze takes precedence
if (dirtySinceExport === 0) → false                         // no edits = no nagging
if (dirtySinceExport >= 20) → true                          // Trigger A
if (lastExportedAt && daysSince(lastExportedAt, now) >= 14) → true  // Trigger B
otherwise → false
```

`useExportReminder()` adds `snooze3Days()` / `snooze30Days()` writers (write
`addDays(parseISO(nowISOString()), n).toISOString()` to `uiStore.setSnoozedUntil`)
and a `formatLastExportedShort()` helper that returns `"Apr 15"` for noon-UTC ISOs
(via `format(new UTCDate(parseISO(...)), 'MMM d')` — timezone-stable) or
`"you started"` when never exported.

`<ExportReminderBanner />` renders an `<aside role="status" aria-live="polite">` with
`bg-stone-100 text-stone-900 border-stone-200` (UI-SPEC banner color contract: calmer
than amber to avoid alarm). Three buttons: `Export plan` (green-700 CTA, calls
`exportPlan()`), `Remind me later` (stone-600, snooze3Days), `Don't remind for 30
days` (stone-600, snooze30Days). Returns `null` when `shouldShow=false`.

The banner is NOT mounted in this plan. Plan 04-06 owns the AppShell mount with the
banner-stack priority rule (storage-full > iOS Private > export-reminder — only one
visible at a time).

## Files Modified

### Created

- `src/features/export-reminder/useExportReminder.ts` — D-12 selector + D-13 snooze actions + UTCDate-wrapped formatLastExportedShort
- `src/features/export-reminder/ExportReminderBanner.tsx` — D-13 banner with 3-button action row, stone palette, sticky-top z-30
- `tests/stores/planStore.dirty-counter.test.ts` — 18 tests covering D-14 wiring + D-15 exportPlan side-effect (success + failure)
- `tests/features/export-reminder/useExportReminder.test.ts` — 15 tests covering D-12 trigger matrix, snooze actions, format helper
- `tests/features/export-reminder/ExportReminderBanner.test.tsx` — 8 tests covering shouldShow gating, copy, button wiring, a11y attributes

### Modified

- `src/stores/uiStore.ts` — adds `exportReminder` slice (`lastExportedAt | dirtySinceExport | snoozedUntil`) + 4 setters (`setLastExportedAt`, `incrementDirty`, `resetDirty`, `setSnoozedUntil`). Memory-only here; Plan 04-01 (Wave 0) wraps in `persist` with `partialize: (s) => ({ exportReminder: s.exportReminder, ... })`.
- `src/stores/planStore.ts` — imports `useUIStore`; appends `useUIStore.getState().incrementDirty()` to the 11 D-14 coarse setters listed above. Excluded setters explicitly do NOT call it (test-pinned).
- `src/features/settings/exportPlan.ts` — imports `useUIStore`; the success branch (just before `return { ok: true, filename }`) calls `setLastExportedAt(nowISOString())` then `resetDirty()`.

## Commits

- `a32ce08` — test(04-05): add failing dirty-counter + exportPlan post-success tests (RED)
- `232cdbc` — feat(04-05): wire D-14 dirty-counter + D-15 exportPlan post-success side-effect (GREEN)
- `996e170` — test(04-05): add failing useExportReminder + ExportReminderBanner tests (RED)
- `a929343` — feat(04-05): add useExportReminder selector + ExportReminderBanner component (GREEN)

## TDD Gate Compliance

Both tasks followed RED → GREEN gates. Each task committed a `test(...)` commit with
failing tests before the corresponding `feat(...)` implementation commit. No REFACTOR
phase needed — implementations were straightforward.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] uiStore exportReminder slice not yet present**

- **Found during:** Task 1 RED setup
- **Issue:** This plan's `depends_on: [01]` declares Plan 04-01 (Wave 0) as a hard
  prerequisite. Plan 04-01 is being executed in parallel by another worktree and has
  NOT yet merged into the base commit (`3cba789`). Without `useUIStore.exportReminder`
  + `incrementDirty/resetDirty/setLastExportedAt/setSnoozedUntil` setters, neither
  Task 1 nor Task 2 can compile.
- **Fix:** Added the slice + 4 setters to `src/stores/uiStore.ts` as memory-only state
  (no `persist` wrapping). Plan 04-01 will add the persist+partialize wrapping when
  it merges; the slice surface is API-compatible and additive. Documented this
  expectation as a comment block in `uiStore.ts`.
- **Files modified:** `src/stores/uiStore.ts`
- **Commits:** `a32ce08`

**2. [Rule 1 — API drift] Plan listed setters that don't exist as discrete functions**

- **Found during:** Task 1 GREEN
- **Issue:** Plan's `must_haves.truths` and acceptance criteria reference
  `editPlanting`, `setLastFrostOverride`, `setFirstFrostOverride` and require
  `incrementDirty()` count >= 13. The codebase merges these into existing setters:
  - `editPlanting` does not exist; planting edits flow through `commitEdit` (drag) and `toggleSuccession` (succession flag).
  - `setLastFrostOverride` / `setFirstFrostOverride` do not exist; frost overrides ride along with `setLocation`.
- **Fix:** Wired all D-14 schema-meaningful coarse setters that DO exist (11 calls).
  All exclusions (`setLock`, `toggleTaskCompletion`, `loadSamplePlan`, `replacePlan`)
  remain unwired and pinned by tests. The literal threshold of 13 was lowered to 11
  pragmatically; the spirit of D-14 ("count every coarse mutation that exists")
  is fully met.
- **Files modified:** `src/stores/planStore.ts`
- **Commits:** `232cdbc`

**3. [Rule 1 — Test infrastructure] vi.mock hoisting + ESLint no-restricted-syntax in test mocks**

- **Found during:** Task 2 GREEN test run
- **Issue:** `tests/features/export-reminder/ExportReminderBanner.test.tsx` initially
  used `const exportPlanMock = vi.fn()` referenced inside `vi.mock(..., () => ({ exportPlan: exportPlanMock }))` — Vitest hoists `vi.mock` to the top of the file, so the var reference threw `Cannot access 'exportPlanMock' before initialization`. The mocked
  `formatLastExportedShort` also used raw `new Date(state.lastExportedAt).toLocaleDateString(...)` which the project's `no-restricted-syntax` rule rejects.
- **Fix:** Used `vi.hoisted(() => ({ ... }))` to declare the mock fns in a hoisted-safe
  block, and replaced the `new Date()` formatter in the mock with the same
  UTCDate-wrapped `format(parseISO, 'MMM d')` the real hook uses.
- **Files modified:** `tests/features/export-reminder/ExportReminderBanner.test.tsx`
- **Commits:** `a929343`

## Verification

### Tests

- `tests/stores/planStore.dirty-counter.test.ts` — 18/18 pass
- `tests/features/export-reminder/useExportReminder.test.ts` — 15/15 pass
- `tests/features/export-reminder/ExportReminderBanner.test.tsx` — 8/8 pass
- Full suite: `323 passed, 1 failed` — the one failure (`tests/features/calendar/CalendarView.test.tsx > Test 4 — recurring custom task adds task entries`) is **pre-existing** and unrelated to this plan (date-dependent test asserting `>= 7 occurrences` of a recurring task in a 60-day window relative to "today"; verified failing on the unmodified base via `git stash` round-trip). Logged as out-of-scope per executor scope-boundary rule.

### Lint + build

- `npm run lint` — 0 errors, 4 pre-existing warnings (unused eslint-disable directives in `src/domain/dateWrappers.ts` from a prior project change unrelated to this plan).
- `npm run build` — passes; TypeScript clean across all new files.

### Acceptance criteria spot-checks

```
incrementDirty() count in planStore: 11
setLock has incrementDirty: 0 (D-14 exclusion confirmed)
toggleTaskCompletion has incrementDirty: 0 (D-14 exclusion confirmed)
exportPlan setLastExportedAt(nowISOString call: 1
exportPlan resetDirty() call: 1
DIRTY_THRESHOLD = 20: 1
AGE_THRESHOLD_DAYS = 14: 1
SNOOZE_LATER_DAYS or 3-day variants: 5
SNOOZE_LONG_DAYS or 30-day variants: 3
'Export plan' in banner: 1
'Remind me later' in banner: 1
"remind for 30 days" in banner: 1
bg-stone-100 in banner: 1
aria-live in banner: 1
raw new Date() in useExportReminder.ts: 0 (only comments mention it)
```

## Threat Surface Scan

No new threat surface introduced beyond the plan's `<threat_model>` register. T-04-05-02
(zundo replay double-count) and T-04-05-05 (exportPlan failure spurious reset) both
have explicit test coverage. T-04-05-04 (malformed snoozedUntil) accepts the documented
graceful-degradation behavior (Invalid Date comparison returns false → banner shows).

## Known Stubs

None. The dirty-counter wiring is fully data-driven (every increment is sourced from a
real user action through a real setter). The banner reads live state from `uiStore` —
no placeholder data anywhere.

## Self-Check: PASSED

- src/features/export-reminder/useExportReminder.ts: FOUND
- src/features/export-reminder/ExportReminderBanner.tsx: FOUND
- tests/stores/planStore.dirty-counter.test.ts: FOUND
- tests/features/export-reminder/useExportReminder.test.ts: FOUND
- tests/features/export-reminder/ExportReminderBanner.test.tsx: FOUND
- Commit a32ce08: FOUND
- Commit 232cdbc: FOUND
- Commit 996e170: FOUND
- Commit a929343: FOUND

## Hand-off to Plan 04-06

Plan 04-06 should:

1. `import { ExportReminderBanner } from '../features/export-reminder/ExportReminderBanner';`
2. Mount inside `AppShell` with the priority-stack rule:
   ```tsx
   {isStorageFull ? <StorageFullBanner /> :
    !isStorageAvailable ? <Banner /> :
    <ExportReminderBanner />}
   ```
   (`<ExportReminderBanner />` self-gates via `useShouldShowExportReminder()` returning
   `null` when `shouldShow=false`, so it's safe to always render at the lowest priority.)
3. Verify the banner-h spacing token (`--spacing-banner-h: 48px`) lands in
   `src/index.css` from Plan 04-01; this banner reads it via inline `style.minHeight`
   with a `48px` fallback.
