---
phase: 01-foundation-schedule-engine
plan: 04
subsystem: domain-engine
tags: [schedule-engine, constraint-registry, task-emitter, pure-functions, typescript-strict, date-fns-utc]

# Dependency graph
requires:
  - phase: 01-foundation-schedule-engine
    plan: 02
    provides: dateWrappers (parseDate, addDays, subDays, differenceInDays, toISODate) — UTC-noon date math
  - phase: 01-foundation-schedule-engine
    plan: 03
    provides: types (GardenPlan, Plant, Planting, ScheduleEvent, EventType, PlantTiming) + sampleCatalog + samplePlan + ids (eventId)
provides:
  - generateSchedule(plan, catalog) → ScheduleEvent[] — pure entry point producing deterministic, sorted lifecycle + auto-task events
  - canMove(event, candidate, plan, plant) → ConstraintResult — extensible constraint registry; ships noTransplantBeforeLastFrostForTender (SCH-04)
  - emitTaskEvents(plantingId, plantId, plant, anchors) → ScheduleEvent[] — emits water-seedlings/harden-off-day/fertilize-at-flowering gated on catalog flags (D-12)
  - PlantingAnchors interface — engine ↔ taskEmitter contract for resolved anchor dates
  - ConstraintResult discriminated union — ok/clamped result type for SCH-04 propagation
affects: [01-05 snapshot-tests, 01-08 GanttView, 02-* setup-wizard, 03-* tasks-dashboard, 03-* drag-cascade-constraints, 04-* succession-recurrence]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-function domain core (Pattern 1): src/domain/* never imports React/Zustand/I/O"
    - "Constraint registry (Pattern 4): rules array + canMove aggregator extends without touching aggregator"
    - "Anchor-date object passed engine → taskEmitter for cadence-driven auto-task derivation"
    - "Deterministic sort: by start ASC, type ASC, id ASC for snapshot stability"

key-files:
  created:
    - src/domain/constraints.ts
    - src/domain/scheduler.ts
    - src/domain/taskEmitter.ts
  modified: []

key-decisions:
  - "Phase 1 ships exactly ONE constraint rule (noTransplantBeforeLastFrostForTender per SCH-04). Other rules deferred to Phase 3 when drag exercises them."
  - "Auto-task cadences locked: water every 3 days, harden-off one per day, fertilize at transplant + floor(DTM/2). Plan 05 snapshots will pin these exact dates."
  - "Engine sorts all events by (start, type, id) for deterministic Plan 05 snapshot tests."
  - "Missing plant in catalog → silent skip (no event emitted). Phase 1's samplePlan never triggers this; Plan 05 doesn't exercise it."
  - "When transplant is clamped, both the event AND anchors.transplant update so downstream task events use the clamped date."

patterns-established:
  - "Pattern 1 (purity): Engine modules import only ./types, ./dateWrappers, ./ids, ./constraints, ./taskEmitter. Verified by grep + TS compile."
  - "Pattern 4 (constraints): canMove reduces over fixed rules array. Phase 3 adds rules without modifying aggregator."
  - "Date safety: all arithmetic via dateWrappers (subDays(d, weeks * 7), never subWeeks). PITFALLS §1 invariant."
  - "Year-rollover handled implicitly: UTC arithmetic carries garlic Oct→Jul correctly without special-casing."

requirements-completed: [SCH-01, SCH-02, SCH-04, SCH-05, SCH-07]

# Metrics
duration: 4min
completed: 2026-04-26
---

# Phase 1 Plan 04: Foundation Schedule Engine Summary

**Pure schedule engine — generateSchedule(plan, catalog) → ScheduleEvent[] — with extensible constraint registry and gated auto-task emitter, all UTC-arithmetic-clean and zero-React.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-26T19:57:38Z
- **Completed:** 2026-04-26T20:01:35Z
- **Tasks:** 3
- **Files created:** 3 (constraints.ts, taskEmitter.ts, scheduler.ts)

## Accomplishments

- **Constraint registry** with the canonical Phase 1 rule (`noTransplantBeforeLastFrostForTender`, SCH-04). Phase 3 will append rules without touching the aggregator.
- **Auto-task emitter** producing 3 universal task event types per planting, gated on catalog flags per D-12 (water-seedlings/harden-off-day/fertilize-at-flowering).
- **Schedule engine** — the product. Single pure entry point `generateSchedule(plan, catalog)` returns deterministic `ScheduleEvent[]` for all plantings (lifecycle events + auto-tasks, sorted by date/type/id).
- **Sanity-verified output** for samplePlan: 57 events total. Garlic year-rollover lands at 2027-07-12 (harvest start). Tomato fertilize at 2026-06-05 (transplant + floor(75/2)). Tomato transplant 2026-04-29 (lastFrost+14d, no clamp needed).
- **Purity invariant enforced:** zero React/Zustand/I/O imports in src/domain/; zero raw `new Date(` calls in any of the three modules.

## Task Commits

Each task was committed atomically:

1. **Task 1: Constraint registry + canMove (SCH-04)** — `6ea27f4` (feat)
2. **Task 2: Auto-task emitter (SCH-07, D-12)** — `8fce780` (feat)
3. **Task 3: Schedule engine generateSchedule (SCH-01,02,04,05,07)** — `36177a3` (feat)

Plan metadata commit follows.

## Files Created/Modified

- `src/domain/constraints.ts` — Constraint rule registry + canMove aggregator. Ships ONE Phase 1 rule. 70 lines.
- `src/domain/taskEmitter.ts` — emitTaskEvents emits 3 auto-task types per planting with deterministic cadences. 144 lines.
- `src/domain/scheduler.ts` — generateSchedule pure entry point. Resolves plant → computes anchors → applies constraints → emits tasks → sorts. 201 lines.

## Decisions Made

- **One constraint rule in Phase 1**: deferred `hardenOffPrecedesTransplant`, `harvestAfterMaturity`, etc. to Phase 3 when drag interactions exercise them. Per CONTEXT.md "Claude's Discretion".
- **Sort key triple (start, type, id)**: chosen so that two events with the same start date sort by event-type lexicographically (e.g. `direct-sow` < `germination-window` < `harvest-window`), giving Plan 05 a stable snapshot ordering.
- **Silent skip for missing catalog entries**: `if (!plant) continue;` in `generateSchedule`. Plan 05 doesn't exercise this path; future phases can add a console.warn if needed (not a Phase 1 requirement).
- **PlantingAnchors as object**: emits all anchor dates (indoor-start, harden-off, transplant, etc.) in one structure so the scheduler can update `anchors.transplant` after constraint clamping and have downstream task events use the clamped value.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript implicit-any error in canMove reduce loop**
- **Found during:** Task 1 (constraints.ts initial implementation)
- **Issue:** `const accReasons = 'clamped' in acc && acc.clamped ? acc.reasons : []` — TS7022 implicit-any because the inferred type self-references through the immediately-following `acc =` reassignment.
- **Fix:** Added explicit `: string[]` annotation: `const accReasons: string[] = ...`. Pure type-only fix; behavior unchanged.
- **Files modified:** src/domain/constraints.ts
- **Verification:** `npx tsc --noEmit` exits 0.
- **Committed in:** 6ea27f4 (Task 1 commit, fixed before commit)

**2. [Rule 1 - Bug] Documentation comment matched grep `new Date(` purity check**
- **Found during:** Task 1 verification
- **Issue:** Header comment "zero `new Date(string)` outside the parseDate import" contained the literal `new Date(` substring. The acceptance grep `grep -c "new Date(" src/domain/constraints.ts` returned `1` (matching the comment) instead of `0`.
- **Fix:** Rephrased comment to "zero raw Date construction outside the parseDate import" — preserves meaning, dodges grep match.
- **Files modified:** src/domain/constraints.ts
- **Verification:** `grep -c "new Date(" src/domain/constraints.ts` returns `0`.
- **Committed in:** 6ea27f4 (Task 1 commit, fixed before commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes were trivial type/grep hygiene. No scope creep. No behavior change.

## Issues Encountered

None — all three modules wrote cleanly with the exact algorithm specified in RESEARCH.md and the verbatim implementation provided in the plan body. The two deviations above were caught at verification, not during runtime.

## Self-Check: PASSED

- src/domain/constraints.ts exists ✓
- src/domain/taskEmitter.ts exists ✓
- src/domain/scheduler.ts exists ✓
- Commit 6ea27f4 found in `git log` ✓
- Commit 8fce780 found in `git log` ✓
- Commit 36177a3 found in `git log` ✓
- `grep -c "new Date(" src/domain/{constraints,scheduler,taskEmitter}.ts` returns 0 across all 3 ✓
- `grep -rn "subWeeks\|addWeeks" src/` returns no matches ✓
- `grep -rn "from ['\"]react\|from ['\"]zustand\|from ['\"]\\.\\./data\|from ['\"]\\.\\./stores\|from ['\"]\\.\\./features" src/domain/` returns no matches ✓
- `npx tsc --noEmit` exits 0 ✓
- `npm test -- --run` — 12/12 tests pass (Plan 02 baseline holds) ✓
- Sanity run on samplePlan: 57 events, garlic harvest 2027-07-12 ✓

## User Setup Required

None — pure-TypeScript modules, no external services or runtime config.

## Next Phase Readiness

- **Plan 05 (snapshot tests):** Engine output is deterministic. Plan 05 can write snapshot tests against `generateSchedule(samplePlan, sampleCatalog)` and the byte-exact ISO output will pin to today's behavior. Sanity values to expect: 57 events; garlic harvest-window starts 2027-07-12T12:00:00.000Z; tomato fertilize-at-flowering at 2026-06-05T12:00:00.000Z; tomato transplant Apr 29 with empty constraintsApplied (no clamp triggered for samplePlan's lastFrost+14d).
- **Plan 06 (selectors + Zustand store):** `useDerivedSchedule()` will memo-call `generateSchedule(plan, catalog)`. Engine signature is the locked D-13 contract.
- **Plan 08 (GanttView):** Reads ScheduleEvent[] one-way; engine produces SVAR-renderable rows.
- **Phase 3 (drag cascade):** Will add new constraint rules to `rules[]` in constraints.ts. The aggregator `canMove` and the rule type don't change.

---
*Phase: 01-foundation-schedule-engine*
*Plan: 04*
*Completed: 2026-04-26*
