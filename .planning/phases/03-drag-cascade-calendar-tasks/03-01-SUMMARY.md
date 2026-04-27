---
phase: 03-drag-cascade-calendar-tasks
plan: 01
subsystem: domain
tags: [schema-migration, zod, scheduler, cascade, constraints, locks, plan-edits]

# Dependency graph
requires:
  - phase: 01-foundation-schedule-engine
    provides: pure scheduler engine, constraint registry, ScheduleEdit type, snapshot suite
  - phase: 02-data-layer-first-end-to-end
    provides: v1→v2 migration, GardenPlanSchema, persist wiring, importPlan/exportPlan
provides:
  - GardenPlan schemaVersion 3 with Planting.locks + completedTaskIds
  - chained v1→v2→v3 migration via single migrateToCurrent(state, 1) call
  - engine consumes plan.edits[] with last-write-wins per (plantingId, eventType)
  - cascade math reflows from edited/clamped anchors (harvest, harden-off, tasks)
  - hardenOffMustPrecedeTransplant constraint rule (GANTT-05)
  - harvestMustFollowTransplantByDTM constraint rule (GANTT-05; edit-aware)
  - generateScheduleWithLocks public seam for lock-aware UI
affects: [03-02 zundo wrap, 03-03 drag commit + cascade preview, 03-04 calendar view, 03-05 tasks]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "v3 schema bump: append-only field additions on Planting (locks?) and GardenPlan (completedTaskIds)"
    - "Chained migration via numeric version walk: migrations[v] applied in order v→v+1"
    - "Engine edit consumption: findEdit() last-write-wins scan per (plantingId, eventType) before computing downstream cascade"
    - "Constraint rule registry stays append-only; new rules wrapped in same ConstraintRule shape"
    - "Lock-aware wrapper as documented public seam (engine authoritative; UI prevents new edits to locked events)"

key-files:
  created:
    - src/domain/schedulerWithLocks.ts
    - tests/domain/scheduler.editsRespected.test.ts
    - tests/domain/schedulerWithLocks.test.ts
  modified:
    - src/domain/types.ts
    - src/domain/schemas.ts
    - src/domain/migrations.ts
    - src/domain/scheduler.ts
    - src/domain/constraints.ts
    - src/samplePlan.ts
    - src/stores/planStore.ts
    - src/features/settings/exportPlan.ts
    - src/features/settings/importPlan.ts
    - tests/domain/migrations.test.ts
    - tests/domain/constraints.test.ts
    - tests/domain/schemas.test.ts
    - tests/domain/scheduler.snapshot.test.ts
    - tests/domain/succession.test.ts
    - tests/features/settings/exportPlan.test.ts
    - tests/features/settings/importPlan.test.ts
    - tests/stores/planStore.test.ts

key-decisions:
  - "Phase 3 P01: schemaVersion 2→3 single bump; locks defaults to {}, completedTaskIds defaults to [] under ?? defaulting (idempotent re-application)"
  - "Phase 3 P01: ExportEnvelopeSchema accepts {1|2|3}; importPlan migration trigger fires for any schemaVersion < CURRENT_SCHEMA_VERSION (was hardcoded === 1)"
  - "Phase 3 P01: importPlan.ts duplicated CURRENT_SCHEMA_VERSION constant removed (Pitfall E unification)"
  - "Phase 3 P01: engine reads plan.edits[] inside eventsForPlanting before computing cascade; downstream anchors (harvest, harden-off, tasks) reflow from post-edit-post-clamp transplant"
  - "Phase 3 P01: hardenOffMustPrecedeTransplant clamps to indoorAnchor + hardenDays + 1; reads indoor-start edit if present so chained drags compose correctly"
  - "Phase 3 P01: harvestMustFollowTransplantByDTM clamps to anchor + DTM where anchor type derived from plant.timing.startMethod and anchor date reads transplant/direct-sow edit if present"
  - "Phase 3 P01: schedulerWithLocks is a pass-through wrapper; engine is authoritative because edits are already consumed in (A); locks enforced in UI layer (Plan 03-03)"
  - "Phase 3 P01: canMove pass-through-after-clamp bug fixed (Phase 1 had 1 rule, bug was inert; Phase 3's 3-rule pipeline exposes it)"

patterns-established:
  - "Schema migration step uses ?? defaulting (NOT overwrite) so re-application is identity on already-migrated data"
  - "Engine edit consumption pipeline: compute → findEdit override → constraint clamp → emit"
  - "Constraint rule check signature can use fewer params than the interface (TS variance) — no need for _underscore-prefixed unused parameters"

requirements-completed: [GANTT-05, GANTT-07, GANTT-08]

# Metrics
duration: ~30min
completed: 2026-04-26
---

# Phase 3 Plan 01: v3 schema + edit-aware engine + GANTT-05 constraint rules + lock wrapper Summary

**v3 schema with Planting.locks and GardenPlan.completedTaskIds, scheduler that consumes plan.edits[] and reflows cascade from edited anchors, two new constraint rules (harden-off precedes transplant, harvest follows transplant by ≥DTM), and the lock-aware wrapper that becomes the public seam for Plan 03-03's drag UI.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 2 (TDD: red → green per task)
- **Files modified:** 17 (3 created, 14 modified)
- **Tests:** 158 → 172 (+14 new tests)
- **Snapshot suite:** byte-identical (no `--update`)

## Accomplishments

- Schema v3 lands with two new fields (Planting.locks, GardenPlan.completedTaskIds) defaulted via migration registry; v1 envelopes chain to v3 in one call.
- Scheduler engine now consumes plan.edits[] last-write-wins; cascade math (harvest, harden-off range, water-seedlings cadence, fertilize-at-flowering) all read post-edit anchors so the next render after a drag commit is correct.
- Two new GANTT-05 constraint rules registered without restructuring the registry; one is edit-aware (harvest reads transplant/direct-sow anchor edit), the other reads indoor-start anchor edit. Both compose with the existing tender-frost rule.
- Lock-aware public seam (`generateScheduleWithLocks`) is in place; Plan 03-03's `useTransientSchedule` will switch to it without engine changes.
- All 7 existing snapshot tests stay green and byte-identical — confirming the empty-edits path is the unchanged Phase 1+2 baseline.

## Task Commits

1. **Task 1 RED**: `6164041` (test) — failing tests for v2→v3 migration + chained v1→v3
2. **Task 1 GREEN**: `b0153e0` (feat) — schema v3 + chained migration + adjusted Phase 1/2 fixtures
3. **Task 2 RED**: `1467195` (test) — failing tests for edits consumption, new constraints, lock wrapper
4. **Task 2 GREEN**: `340dfbc` (feat) — engine.edits consumption + GANTT-05 rules + scheduler wrapper

## Files Created/Modified

### Created

- `src/domain/schedulerWithLocks.ts` — public seam wrapping `generateSchedule`. Engine authoritative; lock contract enforced via UI preventing new edits to locked events (Plan 03-03).
- `tests/domain/scheduler.editsRespected.test.ts` — 5 tests: empty edits stays Phase 1+2, transplant edit overrides + sets edited:true, harvest reflows from edited transplant, tender clamp still fires on edit candidate, last-write-wins per (plantingId, eventType).
- `tests/domain/schedulerWithLocks.test.ts` — 3 tests: passthrough when no locks, locked event with edit returns edit start, locked-on-default returns engine-computed value.

### Modified

- `src/domain/types.ts` — Planting.locks?: Partial<Record<EventType, boolean>>; GardenPlan.schemaVersion 2→3; GardenPlan.completedTaskIds: string[]; doc comment for D-36 completion-key semantics.
- `src/domain/schemas.ts` — GardenPlanSchema.schemaVersion → z.literal(3); PlantingSchema.locks (z.record permissive on key); GardenPlanSchema.completedTaskIds: z.array(z.string()); ExportEnvelopeSchema accepts 1|2|3.
- `src/domain/migrations.ts` — CURRENT_SCHEMA_VERSION = 3; added migrations[3] step defaulting locks: {} and completedTaskIds: [] using ?? (idempotent under re-application).
- `src/domain/scheduler.ts` — Added findEdit() helper; eventsForPlanting reads plan.edits[] for indoor-start, transplant, harden-off, direct-sow, harvest-window; cascade math reflows from post-edit-post-clamp transplant. Snapshot suite stays byte-identical.
- `src/domain/constraints.ts` — Added hardenOffMustPrecedeTransplant + harvestMustFollowTransplantByDTM rules to rules[]; canMove pass-through-after-clamp bug fixed (Rule 1).
- `src/samplePlan.ts` — schemaVersion: 3, completedTaskIds: [].
- `src/stores/planStore.ts` — createEmptyPlan emits schemaVersion: 3, completedTaskIds: [] (persist version auto-bumps via CURRENT_SCHEMA_VERSION constant).
- `src/features/settings/exportPlan.ts` — emits envelope schemaVersion: 3 (sourced from CURRENT_SCHEMA_VERSION); APP_VERSION '0.3'.
- `src/features/settings/importPlan.ts` — drop duplicated CURRENT_SCHEMA_VERSION constant (Pitfall E); migration trigger fires for any envelope.schemaVersion < CURRENT_SCHEMA_VERSION (was hardcoded === 1).
- 8 test files (constraints, schemas, scheduler.snapshot, succession, migrations, exportPlan, importPlan, planStore) — fixtures bumped to schemaVersion: 3 + completedTaskIds: []; assertions on persist version and migration result targets updated to v3.

## Decisions Made

See `key-decisions:` in frontmatter. Highlights:

- ExportEnvelopeSchema widened to accept `1|2|3` rather than keeping it at `1|2` and stamping a fixed legacy envelope version — chosen because the envelope schemaVersion documents which plan version is enclosed, and re-importing a freshly-exported v3 plan would otherwise fail Zod.
- Engine edit consumption happens BEFORE constraint clamp so a tender plant can't bypass the SCH-04 rule via an edit (security-equivalent: drag-driven changes flow through the same gate as the original computed-then-clamped path).
- Lock wrapper kept pass-through (instead of adding a structural assertion in the wrapper) because the engine already does the right thing once edits are consumed; an extra assertion layer adds surface without changing behavior. The wrapper exists as the documented seam Plan 03-03's `useTransientSchedule` will call so future locked-event behavior changes have a single edit point.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] canMove pass-through-after-clamp clobbered prior clamp state**
- **Found during:** Task 2 (constraint pipeline composition with three rules)
- **Issue:** Original `canMove` had `else { acc = { ok: true, finalDate: next.finalDate }; }` which dropped `clamped` and `reasons` whenever a later rule's `appliesTo` returned false-then-pass. Phase 1 had only one rule so the bug was inert; Phase 3's three-rule pipeline (tender-clamp → harden-off-clamp → harvest-DTM-clamp) exposes it.
- **Fix:** Pass-through branch only updates `finalDate` if no prior clamp was recorded; otherwise preserves the clamped accumulator unchanged.
- **Files modified:** src/domain/constraints.ts
- **Verification:** All existing constraints tests stay green; new harden-off/harvest tests cover the composed pipeline.
- **Committed in:** 340dfbc

**2. [Rule 3 — Blocking] schemaVersion literal bump forced fixture and assertion updates across 11 files**
- **Found during:** Task 1 (types.ts schemaVersion: 2 → 3 type-literal bump)
- **Issue:** TypeScript treats `schemaVersion: 2` as a literal type. After bumping to `3`, every plan-construction site (samplePlan, planStore.createEmptyPlan, all test fixtures) became a TS error.
- **Fix:** Updated 11 fixture sites + 5 assertion sites to use `schemaVersion: 3` and added `completedTaskIds: []` where required by the GardenPlan literal type. Plan explicitly said "do not modify planStore.ts persist.version" — that was honored: planStore reads `CURRENT_SCHEMA_VERSION` from migrations.ts, so the persist version auto-bumps without a literal-value edit.
- **Files modified:** src/samplePlan.ts, src/stores/planStore.ts, src/features/settings/exportPlan.ts, src/features/settings/importPlan.ts, 8 test files (see Files list above).
- **Verification:** `npx tsc --noEmit` clean; `npm run lint` clean; `npx vitest run` 172/172.
- **Committed in:** b0153e0

**3. [Rule 2 — Missing Critical] importPlan.ts had a duplicated CURRENT_SCHEMA_VERSION constant (pre-existing Pitfall E violation)**
- **Found during:** Task 1 (chained migration support requires importPlan to migrate any pre-current version, not just v1)
- **Issue:** importPlan.ts redeclared `const CURRENT_SCHEMA_VERSION = 2` locally instead of importing from migrations.ts, and only triggered migration when `schemaVersion === 1`. With v3 introduced, v2 envelopes also need migration.
- **Fix:** Removed local constant; imported from migrations.ts; migration trigger now fires for any `envelope.schemaVersion < CURRENT_SCHEMA_VERSION`.
- **Files modified:** src/features/settings/importPlan.ts
- **Verification:** importPlan v1→v3 chained-migration test passes; round-trip v3 envelope test passes.
- **Committed in:** b0153e0

**4. [Rule 1 — Bug-cleanup] Pre-existing `_plant` unused-variable lint error in constraints.ts**
- **Found during:** Task 2 (rewriting constraints.ts to add new rules)
- **Issue:** Pre-existing master-branch lint error (no-unused-vars on `_plant` in noTransplantBeforeLastFrostForTender). Since constraints.ts was being heavily edited as part of Task 2, addressing it brought the file lint-clean.
- **Fix:** Dropped the unused 4th parameter; TS function literals can have fewer params than their target signature, no need for the underscore-prefixed unused.
- **Files modified:** src/domain/constraints.ts
- **Verification:** `npm run lint` clean (0 errors).
- **Committed in:** 340dfbc

---

**Total deviations:** 4 auto-fixed (1 bug, 1 blocking, 1 missing-critical, 1 bug-cleanup)
**Impact on plan:** All four were correctness-required and stayed within the files Task 1/Task 2 already needed to touch. No scope creep into other subsystems.

## Issues Encountered

- One initial test for `hardenOffMustPrecedeTransplant` used tomato (tender) which interacted unexpectedly with the SCH-04 tender-frost rule in the same pipeline — the tender clamp pre-empted the harden-off clamp. Switched the test to use broccoli (half-hardy, requiresHardening=true) so the harden-off rule is the only one that fires for that case. (Test correction, not implementation; the implementation was correct.)

## Snapshot Stability

Verified byte-identical: `tests/__snapshots__/scheduler.snapshot.test.ts.snap` is unchanged (no `--update` flag used). The empty `plan.edits[]` path through the new edit-consumption logic emits the same events the Phase 1+2 implementation did.

## Next Phase Readiness

- Plan 03-02 (zundo wrap + persist version): the persist version auto-bumps to 3 via CURRENT_SCHEMA_VERSION; Plan 03-02 will add the zundo middleware and wire history tracking on plan.edits + plantings.locks + customTasks (per CONTEXT D-13).
- Plan 03-03 (drag commit + cascade preview): `generateScheduleWithLocks` and edit-aware constraints are the public seams `useTransientSchedule` and the @dnd-kit modifier need.
- Plan 03-04 (calendar view): consumes the same engine output; nothing in this plan blocks it.
- Plan 03-05 (custom tasks + completion): GardenPlan.completedTaskIds: string[] is already in place with the D-36 documented per-occurrence key semantics.

## Self-Check: PASSED

- All listed files exist on disk and contain expected content.
- All four task commits are present in git log (`6164041`, `b0153e0`, `1467195`, `340dfbc`).
- All Phase 1+2 tests still pass (158 baseline + 14 new = 172/172).
- Snapshot file untouched (verified via `git status --short tests/__snapshots__/`).
- TypeScript: clean (`npx tsc --noEmit`).
- Lint: clean (`npm run lint` 0 errors; 4 pre-existing dateWrappers warnings out of scope).

---
*Phase: 03-drag-cascade-calendar-tasks*
*Plan: 01*
*Completed: 2026-04-26*
