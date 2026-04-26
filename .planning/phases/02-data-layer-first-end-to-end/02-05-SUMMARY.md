---
phase: 02-data-layer-first-end-to-end
plan: 05
subsystem: state
tags: [zustand, persist, migration, typescript, structuredClone]

# Dependency graph
requires:
  - phase: 01-foundation-schedule-engine
    provides: planStore.ts persist scaffolding (DATA-01, DATA-02), GardenPlan/Plant/Planting/Location types, samplePlan
  - phase: 02-data-layer-first-end-to-end (Plan 02-01)
    provides: src/domain/migrations.ts (migrateToCurrent + CURRENT_SCHEMA_VERSION), src/domain/dateWrappers.ts (nowISOString)
provides:
  - planStore.ts extended with full Phase 2 setter surface (10 setters)
  - v1 -> v2 migration wired via shared migrations module (Pitfall E single source of truth)
  - "Try with sample plan" bootstrap path (D-03) using structuredClone
  - Cross-store cascade delete (D-15 full) — removeCustomPlantWithCascade drops from catalogStore + planStore + plantings
  - replacePlan import hook (D-28) for Plan 02-11 importPlan integration
affects:
  - 02-04 catalogStore (cross-store contract)
  - 02-06 setup wizard (consumes setLocation, addPlanting)
  - 02-09 catalog browser (consumes upsertCustomPlant, removeCustomPlantWithCascade)
  - 02-11 settings page (consumes exportPlanSnapshot, replacePlan)
  - 03+ drag edits (will consume setters that bump updatedAt)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pitfall E single-source-of-truth: persist.migrate delegates to shared migrations module — no inline migration logic in stores"
    - "Cross-store cascade: setter on planStore reaches into useCatalogStore.getState() for canonical-home update before its own filter"
    - "structuredClone for sample bootstrap: never alias the imported sample object as the store's plan"
    - "All updatedAt writes route through nowISOString() (SCH-03 ESLint guard) — never raw new Date()"

key-files:
  created:
    - src/stores/catalogStore.ts (minimal contract stub for cross-store import; Plan 02-04 ships full version)
  modified:
    - src/stores/planStore.ts (extended Phase 1 scaffolding with setters + v2 migration)
    - tests/stores/planStore.test.ts (3 -> 18 tests)

key-decisions:
  - "Bind SCHEMA_VERSION to CURRENT_SCHEMA_VERSION import (drift-proof) instead of duplicating the literal 2"
  - "removeCustomPlant cascades to plantings unconditionally — UI is responsible for confirmation BEFORE invoking the setter"
  - "removeCustomPlantWithCascade performs cross-store side effect (catalogStore.removeCustomPlant) BEFORE updating its own state to keep both stores converging"
  - "exportPlanSnapshot returns the live plan reference (no defensive clone) — caller is read-only by contract; matches replacePlan symmetry"
  - "Shipped a minimal catalogStore.ts contract stub from this worktree so the cross-store import compiles in isolation; Plan 02-04 (in parallel) supersedes on merge"

patterns-established:
  - "Setter shape: set(s => s.plan ? { plan: { ...s.plan, ...patch, updatedAt: nowISOString() } } : s) — null-plan guard preserves Phase 1 invariant"
  - "Cross-store side effect ordering: external store update first, internal set() second"
  - "Migration test pattern: pre-seed window.localStorage.setItem('garden-gantt:plan', JSON.stringify(v1State)) then dynamic-import the store and inspect getState()"

requirements-completed: [DATA-04, DATA-05, LOC-01, LOC-03, LOC-05, CAT-04, CAT-05]

# Metrics
duration: 4min
completed: 2026-04-26
---

# Phase 02 Plan 05: planStore Phase 2 Setter Surface + v1->v2 Migration Summary

**Extended planStore from null-plan scaffolding to a full setter surface with cross-store cascade delete, sample-plan bootstrap via structuredClone, and v1->v2 schema migration delegated to a shared migrations module (Pitfall E).**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-26T23:23:09Z
- **Completed:** 2026-04-26T23:27:18Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 3 (1 new, 2 modified)

## Accomplishments
- 10 setters wired with consistent shape (null-plan guard, nowISOString updatedAt bump): setLocation, addPlanting, removePlanting, toggleSuccession, upsertCustomPlant, removeCustomPlant (D-15 plan-side cascade), removeCustomPlantWithCascade (D-15 full cross-store cascade), loadSamplePlan, replacePlan, exportPlanSnapshot
- Persist version bumped to CURRENT_SCHEMA_VERSION (=2) via the shared migrations module — Pitfall E mitigation in production
- v1 -> v2 migration test confirms rehydrate produces overrides:{} + successionEnabled:false on every planting
- 18 planStore tests pass (was 3); full suite remains green at 103/103
- ESLint clean for plan-scope files; zero raw `new Date()` in src/stores/planStore.ts

## Task Commits

1. **Task 1 RED: bump expected version to 2** — `2b74fd5` (test)
2. **Task 1 GREEN: extend planStore with setters + v2 migration** — `9300149` (feat)
3. **Task 2: Phase 2 test coverage** — `8f3d753` (test)

_TDD: Task 1 ran RED -> GREEN cycle (no refactor needed). Task 2 added 15 new tests on top of the 3 Phase 1 tests._

## Files Created/Modified

- `src/stores/planStore.ts` — Modified. Bumped SCHEMA_VERSION (= CURRENT_SCHEMA_VERSION), added 10 setters, wired persist.migrate to migrateToCurrent, added createEmptyPlan helper. 174 LOC (was 39).
- `src/stores/catalogStore.ts` — **Created (worktree-only contract stub).** Minimal Zustand persist store implementing the documented catalogStore API surface (customPlants + permapeopleCache + upsertCustomPlant + removeCustomPlant + cacheEnrichment). Exists so the cross-store import in planStore compiles in isolation. Plan 02-04 (parallel wave) ships the full implementation including selectMerged selector and multi-tab wiring; the merge resolution will land 02-04's version.
- `tests/stores/planStore.test.ts` — Modified. 350 LOC (was 47). 4 describe blocks: Phase 1 wiring (preserved), corrupt JSON tolerance (preserved), Phase 2 setters (11 tests), v1->v2 migration (2 tests), updatedAt format (1 test).

## Decisions Made
- **CURRENT_SCHEMA_VERSION binding:** SCHEMA_VERSION in planStore is bound to the imported constant rather than the literal `2`. If the migrations module ever bumps to v3, planStore picks it up automatically — no two-place edit required.
- **D-15 setter unconditionality:** removeCustomPlant cascades to plantings without checking whether any plantings reference the plant. This keeps the setter pure and contract-clean. UI in Plan 02-09 owns the confirm dialog.
- **Cross-store ordering:** In removeCustomPlantWithCascade, we update catalogStore first, then planStore. If the second update throws, the canonical (catalog) state is already consistent; if we did it the other way around, plan would lose the planting but the catalog would still advertise the (now-orphaned) plant.
- **catalogStore stub strategy:** Rather than trying to mock the cross-store import via vi.mock in tests, ship a minimal catalogStore.ts that satisfies the documented contract. This:
  1. Keeps the test file simple (no module mocking gymnastics).
  2. Makes the test exercise the real cross-store wiring.
  3. Hands off cleanly to Plan 02-04 — the full file replaces this stub on merge with no API drift.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created minimal catalogStore.ts contract stub**
- **Found during:** Task 1 GREEN (tsc check)
- **Issue:** planStore.ts imports `useCatalogStore` from `./catalogStore`, but the file does not exist in this worktree (Plan 02-04 ships it in parallel). Without the file, `tsc --noEmit` fails with TS2307.
- **Fix:** Created `src/stores/catalogStore.ts` implementing the documented Phase 2 contract from 02-PATTERNS.md lines 392-441 (customPlants + permapeopleCache + upsertCustomPlant + removeCustomPlant + cacheEnrichment + persist with `'garden-gantt:catalog'` key, version 1). Header comment explicitly notes it is a contract stub superseded by Plan 02-04.
- **Files modified:** `src/stores/catalogStore.ts` (new)
- **Verification:** `npx tsc --noEmit` clean; cross-store cascade test exercises real wiring against the stub.
- **Committed in:** `9300149` (Task 1 GREEN)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** None — the stub matches the locked contract. Merge with 02-04 will replace this file with the full version (selectMerged + multi-tab wiring); the planStore import surface stays identical.

## Issues Encountered
- Pre-existing lint error in `src/domain/constraints.ts:28` (`'_plant' is defined but never used`) — out of scope; already tracked in `deferred-items.md` from Plan 02-02.
- Pre-existing lint warnings in `src/domain/dateWrappers.ts` (`Unused eslint-disable directive`) — out of scope; already tracked in `deferred-items.md`.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Plan 02-06 (setup wizard) can now consume `setLocation` and `addPlanting` to drive Step 1 -> Step 2 progression.
- Plan 02-09 (catalog browser) can consume `upsertCustomPlant` and `removeCustomPlantWithCascade` directly.
- Plan 02-11 (settings/import-export) has its `replacePlan` integration point.
- Wave-2 merge: Plan 02-04 will overwrite `src/stores/catalogStore.ts` with its full implementation. Cross-store imports in planStore are unchanged (same surface).

## Threat Flags
None — no new threat surface beyond what 02-PLAN.md and the plan's `<threat_model>` already enumerate. T-02-18/19/20 mitigations confirmed in code:
- T-02-18 (replacePlan tampering): documented in setter JSDoc (caller validates).
- T-02-19 (hand-edited v1 localStorage): migration via migrateToCurrent runs once on rehydrate; tested.
- T-02-20 (migration drift): Pitfall E satisfied — single migrations module shared between store and importer.

## Self-Check: PASSED

All claimed files exist (SUMMARY.md, planStore.ts, catalogStore.ts, planStore.test.ts).
All claimed commits exist (`2b74fd5`, `9300149`, `8f3d753`).
All <verify> grep assertions pass: CURRENT_SCHEMA_VERSION, migrateToCurrent, structuredClone(samplePlan), useCatalogStore.getState().removeCustomPlant, zero raw `new Date(` sites, ≥5 nowISOString uses.
Full test suite: 103/103 passing.
