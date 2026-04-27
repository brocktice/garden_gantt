---
phase: 03-drag-cascade-calendar-tasks
plan: 02
subsystem: state-foundation
tags: [zustand, zundo, persist, temporal, undo-redo, drag-state, react, typescript]

# Dependency graph
requires:
  - phase: 02-data-layer-first-end-to-end
    provides: persisted planStore (Zustand persist middleware, schemaVersion 2, migration chain)
provides:
  - planStore wrapped in persist(temporal(slice, opts)) — undo/redo across all plan mutations
  - Six new persisted setters: commitEdit, setLock, addCustomTask, editCustomTask, removeCustomTask, toggleTaskCompletion
  - getTemporal() imperative accessor for non-React callers (historyBindings, debug tools)
  - useTemporalStore(selector) reactive hook for header undo/redo button (consumed by Plan 03-03)
  - useDragStore — bare-create transient store (no middleware) for during-drag state churn
  - uiStore extended with lastConstraintViolation, taskGroupBy, altClickTipDismissCount transient slots
  - useHistoryKeybindings() hook — document-level Cmd-Z / Cmd-Shift-Z / Ctrl-Y wired to temporal API
  - Planting.locks?: Partial<Record<EventType, boolean>> additive type extension
  - GardenPlan.completedTaskIds?: string[] additive type extension
affects: [03-03 (drag layer + clamp modifier consumes dragStore + commitEdit + getTemporal), 03-04 (calendar consumes commitEdit + lastConstraintViolation), 03-05 (tasks consume addCustomTask/editCustomTask/removeCustomTask/toggleTaskCompletion + taskGroupBy), 03-06 (header undo/redo button consumes useTemporalStore), 03-07 (integration smoke exercises Cmd-Z keybinding)]

# Tech tracking
tech-stack:
  added:
    - zundo@2.3.0 (temporal middleware for Zustand)
    - "@dnd-kit/core@6.3.1 (drag primitive — wired in 03-03)"
    - "@fullcalendar/react@6.1.20 + daygrid + timegrid + interaction (calendar — wired in 03-04)"
    - "@radix-ui/react-tooltip@1.2.8 (lock toggle hint + ConstraintTooltip a11y)"
    - "use-sync-external-store (peer of zustand/traditional, required by useStoreWithEqualityFn)"
  patterns:
    - "Middleware order: persist(temporal(slice, opts), {...}) — persist OUTER, temporal INNER (Pitfall 3 — silent data loss if reversed). Verified in tests/stores/temporal.test.ts by reading the localStorage envelope shape."
    - "rAF-debounced handleSet for temporal — drag-stream pointermove updates collapse into one history entry per pointerup (D-16). Tests await rAF before asserting on pastStates."
    - "Transient drag/UI state lives in separate stores with NO middleware (dragStore + uiStore Phase 3 slots) — never persisted, never tracked by zundo."
    - "TypeScript cast pattern for accessing the zundo-augmented temporal store: `(usePlanStore as unknown as { temporal: TemporalApi }).temporal` — encapsulated in a single `temporalApi()` helper at the planStore module so the cast doesn't spread."
    - "Document-level keybinding suppression rule: `target.matches('input, textarea, [contenteditable=\"true\"], [contenteditable=\"\"]')` short-circuits Cmd-Z handling so form-text edits don't undo the plan."

key-files:
  created:
    - src/stores/dragStore.ts
    - src/stores/historyBindings.ts
    - tests/stores/dragStore.test.ts
    - tests/stores/temporal.test.ts
    - .planning/phases/03-drag-cascade-calendar-tasks/deferred-items.md
  modified:
    - src/stores/planStore.ts (zundo wrap + 6 setters + temporal accessors)
    - src/stores/uiStore.ts (3 transient slots + setters)
    - src/domain/types.ts (Planting.locks?, GardenPlan.completedTaskIds? — additive)
    - src/domain/schemas.ts (Zod opt fields for locks + completedTaskIds)
    - tests/stores/planStore.test.ts (8 new specs for Phase 3 setters)
    - package.json
    - package-lock.json

key-decisions:
  - "Held persist `version` at SCHEMA_VERSION (currently 2) — did NOT bump to 3. Plan 03-01 (parallel wave 1) owns the v2→v3 schema migration; bumping CURRENT_SCHEMA_VERSION there propagates the persist version automatically when 03-01 lands."
  - "Test 12 (v2→v3 migration through planStore rehydrate) deferred to 03-01 merge — depends on the v3 migration being registered."
  - "Test 13 (rAF debounce 5-call coalesce) implemented as `flushRAF()` helper across all temporal-touching tests — production-correct rAF coalescing means tests must await rAF to observe the materialized history entry. This validates the handleSet behavior end-to-end without trying to fake-time rAF."
  - "Added `activeEventId` to dragStore beyond PATTERNS.md spec — Plan 03-03's GhostOverlay needs to skip rendering the active event (the dragged bar lives in DragOverlay portal at full opacity). Per UI-SPEC §2."
  - "commitEdit dedupes by (plantingId, eventType) with last-write-wins — matches the engine's findEdit convention (Plan 03-01 Task 2A) so the runtime sees a single canonical edit per anchor."
  - "TypeScript cast for `usePlanStore.temporal` access centralized in a private `temporalApi()` helper, NOT spread through the codebase. getTemporal() and useTemporalStore() are the only public seams."

patterns-established:
  - "Persist OUTER / temporal INNER middleware order is the law for any future slice that wants undo (Pitfall 3 — silent data loss if reversed)."
  - "rAF-debounced handleSet is the canonical drag-stream coalescer — any future feature with high-frequency pointermove writes that need history entries should reuse this pattern."
  - "Transient drag/UI state goes in a SEPARATE store (no persist, no temporal). Drag preview churn never enters history or storage."
  - "Document-level keybindings respect form-focus suppression (input/textarea/[contenteditable]) — the only allowed exception is when a future embedded editor explicitly extends the suppress selector."

requirements-completed: [GANTT-07, GANTT-08, GANTT-09, GANTT-10, TASK-04, TASK-06]

# Metrics
duration: 12min
completed: 2026-04-27
---

# Phase 3 Plan 02: State-Store Foundation Summary

**Zundo `temporal` middleware wrapped INSIDE `persist` for plan-wide undo/redo with rAF-debounced drag stream coalescing; six new persisted setters; transient `dragStore` + extended `uiStore`; document Cmd-Z keybinding hook ready for AppShell mount in Plan 03-03.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-27T03:42:17Z
- **Completed:** 2026-04-27T03:54:35Z
- **Tasks:** 4 (all `type="auto"`, 2 of them `tdd="true"`)
- **Files modified/created:** 12 (5 created, 7 modified)

## Accomplishments

- planStore now records 20 levels of undo across every plan mutation (D-15 plan-wide scope) without any localStorage churn from drag preview state — drag stream collapses to one history entry per pointerup via rAF-debounced `handleSet`.
- Six new persisted setters land cleanly: `commitEdit` (with last-write-wins dedupe by `(plantingId, eventType)`), `setLock` (explicit boolean), `addCustomTask` / `editCustomTask` / `removeCustomTask`, and `toggleTaskCompletion` (composite-key set semantics for D-36).
- Transient `dragStore` is bare-create with no middleware, verified by an explicit no-persist invariant test (no localStorage key matching `/drag|transient/i` after exercising every setter).
- Document-level Cmd-Z / Cmd-Shift-Z / Ctrl-Y keybindings ready to mount from AppShell, with form-focus suppression so CustomTaskModal text edits don't undo the plan.
- 171/171 tests pass; TypeScript clean; new pre-existing lint error in `constraints.ts` (out of scope, logged to `deferred-items.md`).

## Task Commits

1. **Task 1: Install Phase 3 dependencies** — `f5e91b7` (chore)
2. **Task 2: Create dragStore** (RED) — `ee65090` (test) → (GREEN) `49bcc2b` (feat)
3. **Task 3: Wrap planStore with zundo temporal + Phase 3 setters** (RED) — `5384fde` (test) → (GREEN) `7e01f46` (feat)
4. **Task 4: Extend uiStore + create historyBindings** — `73d33ad` (feat)

_Note: Tasks 2 and 3 ran a strict RED→GREEN TDD cycle. Task 4 ships as a single feat commit because PATTERNS.md explicitly defers tests to Plan 03-07 (integration smoke) for the keybinding hook (thin wrapper over fully-tested `getTemporal()`)._

## Files Created/Modified

- `src/stores/dragStore.ts` — bare `create<DragState>` transient store for drag preview state. NO `persist`, NO `temporal`. Includes `activeEventId` (PATTERNS.md extension for GhostOverlay).
- `src/stores/historyBindings.ts` — `useHistoryKeybindings()` hook (D-18). Wires Cmd-Z, Cmd-Shift-Z, Ctrl-Y to `getTemporal()`. Suppresses on input/textarea/[contenteditable] focus.
- `src/stores/planStore.ts` — wrapped in `persist(temporal(slice, opts))`. Six new setters. Two new exports: `getTemporal()` + `useTemporalStore(selector)`. Single private `temporalApi()` helper centralizes the runtime-augment cast.
- `src/stores/uiStore.ts` — three new transient slots: `lastConstraintViolation`, `taskGroupBy`, `altClickTipDismissCount`.
- `src/domain/types.ts` — additive: `Planting.locks?: Partial<Record<EventType, boolean>>`, `GardenPlan.completedTaskIds?: string[]`. No literal-type changes (schemaVersion stays at 2 — see Deviations below).
- `src/domain/schemas.ts` — Zod schemas accept the two new optional fields.
- `tests/stores/dragStore.test.ts` — 6 specs including no-persist invariant.
- `tests/stores/temporal.test.ts` — 4 specs: middleware order via localStorage envelope shape, undo/redo, limit:20, useTemporalStore export.
- `tests/stores/planStore.test.ts` — 8 new specs across `commitEdit` (append + dedupe), `setLock`, `addCustomTask`, `editCustomTask`, `removeCustomTask`, `toggleTaskCompletion` (bare + composite). Existing 19 specs unchanged and still pass.
- `package.json` / `package-lock.json` — adds zundo, @dnd-kit/core, fullcalendar bundle, @radix-ui/react-tooltip, use-sync-external-store. Single `@fullcalendar/core` version (verified `npm ls`).
- `.planning/phases/03-drag-cascade-calendar-tasks/deferred-items.md` — pre-existing `_plant` unused-arg in `constraints.ts` + 4 dateWrappers disable-directive warnings.

## Decisions Made

- **Persist version held at `SCHEMA_VERSION` (currently 2), NOT bumped to 3.** Plan 03-01 (parallel wave 1) owns the v2→v3 schema migration. Bumping `CURRENT_SCHEMA_VERSION` in `migrations.ts` automatically propagates here because `version: SCHEMA_VERSION` reads from that constant. Avoids a parallel-wave merge conflict on the same file.
- **Test 12 deferred** (v2→v3 migration through planStore rehydrate) — depends on 03-01's v3 migration registration. Will be exercised in 03-01's own migration tests + integration verification after merge.
- **Test 13 (rAF debounce coalesce) implemented via `flushRAF()` helper** — production-correct rAF means tests must await rAF to observe the materialized history entry. Each setter test that asserts on `pastStates.length` does `await flushRAF()` after the setter call. This validates `handleSet` end-to-end without faking timers.
- **dragStore extends PATTERNS.md spec** with `activeEventId` (and corresponding cleanup in `endDrag`) for Plan 03-03's GhostOverlay hide-active-bar contract per UI-SPEC §2.
- **commitEdit dedupes by `(plantingId, eventType)` with last-write-wins** — matches Plan 03-01's `findEdit` engine convention so the runtime always sees one canonical edit per anchor.
- **TypeScript cast for `usePlanStore.temporal` access** is encapsulated in a single private `temporalApi()` helper. The two public seams (`getTemporal()`, `useTemporalStore()`) are the ONLY codebase-wide cast sites.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Inline-added Plan 03-01's prerequisite type fields**
- **Found during:** Task 3 (planStore zundo wrap)
- **Issue:** Plan 03-02 explicitly assumes Plan 03-01 has bumped types/schema/migrations to v3 and added `Planting.locks` + `GardenPlan.completedTaskIds`. 03-01 is wave 1 in parallel and has not yet landed. Without the type fields, the `setLock` and `toggleTaskCompletion` setters do not type-check.
- **Fix:** Added `Planting.locks?: Partial<Record<EventType, boolean>>` and `GardenPlan.completedTaskIds?: string[]` to `src/domain/types.ts` (additive — coexists with whatever 03-01 lands). Made both fields optional in Zod (`PlantingSchema.locks` and `GardenPlanSchema.completedTaskIds`) so v2-shaped persisted data still validates. Did NOT bump `schemaVersion` literal to 3 (that is 03-01's territory).
- **Files modified:** `src/domain/types.ts`, `src/domain/schemas.ts`
- **Verification:** All 171 tests pass including the 6 existing `tests/domain/schemas.test.ts` specs that pin schema invariants. `npx tsc --noEmit` clean.
- **Committed in:** `5384fde` (RED-test commit; types/schema landed alongside the tests because the tests need the types to compile)

**2. [Rule 3 — Blocking] Installed `use-sync-external-store` peer dep**
- **Found during:** Task 3 (running tests after wiring `useTemporalStore`)
- **Issue:** `zustand/traditional` (where `useStoreWithEqualityFn` lives) imports `use-sync-external-store` which is not in zustand's hard deps — it's a React-version-coupled peer.
- **Fix:** `npm install use-sync-external-store`
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** Test suite goes from "Cannot find package 'use-sync-external-store'" to all-green.
- **Committed in:** `7e01f46` (Task 3 GREEN commit)

**3. [Rule 1 — Bug] `handleSet` zundo type signature**
- **Found during:** Task 3 typecheck after first GREEN attempt
- **Issue:** Plan's reference snippet calls the inner `handleSet` with 4 args (`pastState, replace, currentState, deltaState`); zundo's inner `handleSet` IS `setState` which only accepts 1-2 args. Compile failed with TS2554.
- **Fix:** Wrapped function calls `handleSet(pastState, replace)` only. `currentState` and `deltaState` are computed inside zundo before our outer fn is invoked; we intentionally drop them on the rAF-coalescing edge — only the latest pastState matters per frame because pointermove churn collapses into one history entry. Documented in the file with a comment block.
- **Files modified:** `src/stores/planStore.ts`
- **Verification:** `npx tsc --noEmit` clean; rAF debounce tests pass.
- **Committed in:** `7e01f46` (Task 3 GREEN commit, second-pass)

**4. [Rule 2 — Missing Critical] `createEmptyPlan` initializes `completedTaskIds: []`**
- **Found during:** Task 3 (writing setLocation test)
- **Issue:** `toggleTaskCompletion` reads `s.plan.completedTaskIds ?? []` so it tolerates undefined, but for newly-created plans (via `setLocation` on a null plan) we want the field present from day one — otherwise the JSON export shape drifts based on whether anyone has toggled a task yet.
- **Fix:** Added `completedTaskIds: []` to `createEmptyPlan()` factory.
- **Files modified:** `src/stores/planStore.ts`
- **Verification:** Existing `setLocation` test still passes; new toggleTaskCompletion test reads the materialized array.
- **Committed in:** `7e01f46`

---

**Total deviations:** 4 auto-fixed (1 Rule 1 — bug, 1 Rule 2 — missing critical, 2 Rule 3 — blocking)
**Impact on plan:** Deviations 1 and 2 are unavoidable consequences of running 03-01 and 03-02 in parallel wave 1. Deviation 3 is a documentation correction (the plan's reference snippet predated the type tightening in zundo 2.3). Deviation 4 is a defensive default. No scope creep — every change traces to a plan-asserted contract.

## Issues Encountered

- **Pre-existing lint error in `src/domain/constraints.ts:28:32`** (`'_plant' is defined but never used`). Verified pre-existing on the wave-1 base via `git stash`. Out of scope for Plan 03-02. Logged to `deferred-items.md`. Likely resolved by Plan 03-01 which extends `constraints.ts` with new rules that consume the parameter.
- **4 pre-existing `Unused eslint-disable directive` warnings in `src/domain/dateWrappers.ts`** (lines 25, 74, 87, 96). Same scope/disposition as above.

## Threat Flags

None — this plan operates entirely within already-mapped trust boundaries (planStore persistence, document keydown, dragStore writes). No new network endpoints, no new auth paths, no new file access patterns, no schema-boundary changes (the schema bump is 03-01's). The threat register from the plan (T-03-02-01..T-03-02-04) is fully covered:
- T-03-02-01 (corrupt persist envelope) — Phase 1 validate-or-clear still active; middleware-order gate (Test 1) pins the envelope shape.
- T-03-02-02 (false-positive Cmd-Z) — `isFormFocus` covers input/textarea/[contenteditable]; future embedded-editor surface handed to Phase 4.
- T-03-02-03 (rAF DoS) — accepted (single-user app); rAF debounce already coalesces 60Hz writes.
- T-03-02-04 (drag persist leak) — Test 6 in `dragStore.test.ts` pins the no-persist invariant.

## Self-Check: PASSED

Verified post-write:

```text
FOUND: src/stores/dragStore.ts
FOUND: src/stores/historyBindings.ts
FOUND: src/stores/planStore.ts (modified)
FOUND: src/stores/uiStore.ts (modified)
FOUND: tests/stores/dragStore.test.ts
FOUND: tests/stores/temporal.test.ts
FOUND: tests/stores/planStore.test.ts (modified)
FOUND: src/domain/types.ts (modified)
FOUND: src/domain/schemas.ts (modified)

Commits in git log:
FOUND: f5e91b7 chore(03-02): install Phase 3 dependencies
FOUND: ee65090 test(03-02): add failing tests for dragStore transient state
FOUND: 49bcc2b feat(03-02): create dragStore — transient drag state, no middleware
FOUND: 5384fde test(03-02): add failing tests for planStore zundo wrap + Phase 3 setters
FOUND: 7e01f46 feat(03-02): wrap planStore in zundo temporal + add Phase 3 setters
FOUND: 73d33ad feat(03-02): extend uiStore + add historyBindings hook
```

Test suite: 22 files / 171 tests passing. `npx tsc --noEmit` clean.

## Next Phase Readiness

Plan 03-03 (drag layer) can now:
- Subscribe to `useDragStore` for transient preview state
- Call `usePlanStore.getState().commitEdit(edit)` on pointerup to record the drag-commit edit (engine wiring lands in 03-01 Task 2A)
- Read `usePlanStore.getState().setLock(plantingId, eventType, locked)` for Alt-click lock toggling
- Mount `useHistoryKeybindings()` from AppShell
- Read `useTemporalStore((t) => t.pastStates.length === 0)` for the header Undo button disabled state

Plan 03-04 (calendar) can call `commitEdit` for calendar drag commits and read `lastConstraintViolation` from uiStore for sticky-pill display.

Plan 03-05 (tasks) can use `addCustomTask` / `editCustomTask` / `removeCustomTask` / `toggleTaskCompletion` and read/write `taskGroupBy` from uiStore.

**Blockers:** None — but Plan 03-01 must land for the `version: 3` schema bump to take effect. Once 03-01 is merged, the planStore persist version and the v2→v3 migration through rehydrate will both work without further code changes here.

---
*Phase: 03-drag-cascade-calendar-tasks*
*Plan: 02*
*Completed: 2026-04-27*
