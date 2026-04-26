---
phase: 01-foundation-schedule-engine
plan: 05
subsystem: testing
tags: [vitest, snapshot-tests, schedule-engine, sch-08, sch-04, dst, leap-year, year-rollover]

# Dependency graph
requires:
  - phase: 01-foundation-schedule-engine
    plan: 02
    provides: dateWrappers (UTC-noon ISO strings; DST/leap/rollover invariants)
  - phase: 01-foundation-schedule-engine
    plan: 03
    provides: types + sampleCatalog (4 plants — tomato/lettuce/broccoli/garlic) + samplePlan
  - phase: 01-foundation-schedule-engine
    plan: 04
    provides: generateSchedule(plan, catalog) → ScheduleEvent[] + canMove(event, candidate, plan, plant) → ConstraintResult
provides:
  - tests/domain/scheduler.snapshot.test.ts — SCH-08 snapshot suite (4 plants + DST + leap + rollover) — 7 tests
  - tests/domain/constraints.test.ts — SCH-04 unit tests (3 tests covering clamp + 2 pass-through branches)
  - tests/__snapshots__/scheduler.snapshot.test.ts.snap — locked deterministic engine output (committed to git)
  - vite.config.ts.resolveSnapshotPath — centralizes all .snap files at tests/__snapshots__/
affects: [01-07 store-selectors, 01-08 GanttView, 03-* drag-cascade-constraints, 04-* succession-recurrence]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Snapshot-based regression detection (Vitest toMatchSnapshot) — locks engine output as PR-reviewable diff"
    - "Centralized snapshot directory via resolveSnapshotPath — all .snap files at tests/__snapshots__/ regardless of test location"
    - "Edge-fixture per timing pitfall — DST, leap-year, year-rollover each get a dedicated describe block"

key-files:
  created:
    - tests/domain/scheduler.snapshot.test.ts
    - tests/domain/constraints.test.ts
    - tests/__snapshots__/scheduler.snapshot.test.ts.snap
  modified:
    - vite.config.ts (resolveSnapshotPath config added)

key-decisions:
  - "Snapshot files centralized at tests/__snapshots__/ via Vitest resolveSnapshotPath. Default would have placed them at tests/domain/__snapshots__/, but the plan acceptance criteria + future test organization both want a single canonical snapshot directory."
  - "Year-rollover test uses BOTH a snapshot AND a byte-exact assertion (harvest.start === '2027-07-12T12:00:00.000Z') AND a startsWith('2027') check — three independent pins per T-01-21 mitigation."
  - "Snapshot file is committed to git (1276 lines, 33 KB). Future scheduler.ts changes that drift dates surface as PR diff — no silent regression possible."

patterns-established:
  - "Snapshot regression pattern: future engine changes either match the snapshot or fail loudly. Update flow is `npm test -- -u` after intentional algorithm changes."
  - "Edge-fixture-per-pitfall pattern: each PITFALLS section that affects date math gets its own describe block (DST §7, leap §8 implicit via year-rollover, rollover §8). Future pitfalls follow this convention."

requirements-completed: [SCH-08]

# Metrics
duration: 3min
completed: 2026-04-26
---

# Phase 1 Plan 05: Snapshot Suite + Constraint Unit Tests Summary

**Engine output locked: 7 snapshot tests covering tomato/lettuce/broccoli/garlic + DST-crossing/leap-year/year-rollover edge fixtures, plus 3 constraint unit tests pinning the SCH-04 clamp behavior on both branches.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-26T20:16:22Z
- **Completed:** 2026-04-26T20:19:20Z
- **Tasks:** 2
- **Files created:** 3 (2 test files + 1 auto-generated .snap)
- **Files modified:** 1 (vite.config.ts)

## Accomplishments

- **Snapshot regression net for the engine.** 7 toMatchSnapshot tests cover the 4 canonical plants per D-16 + 3 edge fixtures per D-17. The 33 KB .snap file is the canonical record of `generateSchedule`'s output across the four plants. Any future change to `scheduler.ts`, `taskEmitter.ts`, `constraints.ts`, `dateWrappers.ts`, or the catalog that drifts a date or reorders events surfaces as a snapshot diff in PR review.
- **DST safety verified.** Tomato indoor-start window from 2026-03-04 (lastFrost - 42d) crosses March 8 2026 spring-forward; water-seedlings cadence emits at 2026-03-04, 03-07, 03-10, 03-13, ... — exactly every 3 UTC days, no DST drift. Pinned in DST snapshot.
- **Leap-year safety verified.** Tomato with lastFrost = 2024-03-15 emits indoor-start at 2024-02-02; water-seedlings:9 lands on 2024-02-29 (Feb 29 leap day) and water-seedlings:10 follows at 2024-03-03. UTC-noon arithmetic carries through.
- **Year-rollover safety verified.** Garlic direct-sow 2026-10-15 → harvest-window 2027-07-12T12:00:00.000Z. Triple-pinned (snapshot + byte-exact assertion + startsWith('2027') check).
- **SCH-04 constraint unit-tested.** 3 tests cover all branches of `canMove + noTransplantBeforeLastFrostForTender`: tender-before-frost clamps (finalDate = lastFrost, reasons[0] contains "Tender plant"), tender-after-frost passes through, hardy-anytime passes through. Future rule additions to the registry don't trip these tests unless the tender-clamp behavior itself regresses.
- **Centralized snapshot directory.** Added `resolveSnapshotPath` to vite.config.ts so all .snap files live at `tests/__snapshots__/`, satisfying the plan's acceptance criterion and creating a single canonical location for future test files.

## Task Commits

Each task was committed atomically:

1. **Task 1: Snapshot suite — 4 plants + DST + leap + rollover** — `b5882a6` (test)
2. **Task 2: Constraint unit tests — clamp + pass-through** — `6fbdb43` (test)

Plan metadata commit follows.

## Files Created/Modified

- `tests/domain/scheduler.snapshot.test.ts` — 82 lines. 7 tests in 4 describe blocks: canonical plants (4 tests), DST-crossing (1 test), leap-year (1 test), year-rollover (1 test). Year-rollover uses snapshot + byte-exact assertion + startsWith. Per D-16, D-17.
- `tests/domain/constraints.test.ts` — 75 lines. 3 tests in one describe block. SCH-04 branches (clamp / pass-through-tender-after-frost / pass-through-hardy).
- `tests/__snapshots__/scheduler.snapshot.test.ts.snap` — 1276 lines auto-generated by Vitest first run. Committed to git.
- `vite.config.ts` — added `resolveSnapshotPath` config + `import path from 'node:path'`. Centralizes snapshots at `tests/__snapshots__/`.

## Decisions Made

- **Centralized snapshot directory** (`tests/__snapshots__/`) via `resolveSnapshotPath` — chosen over Vitest's default `tests/domain/__snapshots__/` because (a) the plan's acceptance criteria reference the centralized path explicitly, (b) Wave 4+ may add tests in non-`domain/` subdirs (`features/`, `data/`) and those should share one snapshot tree, and (c) it makes "find all locked outputs" a single-directory operation.
- **Triple-pin on year-rollover** — the garlic harvest test asserts the snapshot AND `harvest.start === '2027-07-12T12:00:00.000Z'` AND `harvest.start.startsWith('2027')`. Even if the snapshot is updated by accident (`-u`), the byte-exact + startsWith assertions fail loudly. Per threat T-01-21 mitigation in the plan.
- **No engine code changes** — Plan 04 already produces deterministic, sorted output. The snapshot tests passed on first run with no engine adjustments needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vitest default snapshot path didn't match plan acceptance criteria**
- **Found during:** Task 1 (immediately after first `npm test -- --run`)
- **Issue:** Vitest writes `.snap` files to `<testdir>/__snapshots__/` by default, so the snapshot landed at `tests/domain/__snapshots__/scheduler.snapshot.test.ts.snap`. The plan's verification command checks `tests/__snapshots__/scheduler.snapshot.test.ts.snap` (centralized location), and the plan's `<files>` block + acceptance criteria call out that exact path.
- **Fix:** Added `resolveSnapshotPath` config to `vite.config.ts` that returns `path.join(__dirname, 'tests/__snapshots__', basename(testPath) + snapExt)`. Then moved the existing `.snap` to the centralized location and deleted the empty `tests/domain/__snapshots__/` dir.
- **Files modified:** `vite.config.ts`
- **Verification:** `test -f tests/__snapshots__/scheduler.snapshot.test.ts.snap && grep -c "^exports\\[" ...` returns `7`. `npm test -- --run` exits 0 with all 30 tests passing.
- **Committed in:** `b5882a6` (Task 1 commit, fixed before commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 3 blocking)
**Impact on plan:** Single config change in vite.config.ts; no test or engine logic touched. The plan's `<files_modified>` list already implied a centralized path, so this is alignment with intent rather than scope creep.

## Issues Encountered

None — Plan 04's engine produced deterministic output on first run; all 7 snapshot tests + 3 constraint tests passed cleanly. The single deviation (snapshot path) was caught and fixed in <30s.

## Deferred Issues

Pre-existing lint problems unrelated to Plan 05's changes were noted and logged to `.planning/phases/01-foundation-schedule-engine/deferred-items.md`:
- `src/domain/constraints.ts:28` `'_plant' is defined but never used` (carryover from Plan 01-04 — leading-underscore convention not honored by current ESLint config).
- `src/domain/dateWrappers.ts:25` unused `eslint-disable` directive (carryover from Plan 01-02).

Both are cosmetic; `tsc --noEmit` and full Vitest suite pass cleanly.

## Known Stubs

None. The two test files are real working tests, not placeholders. The .snap file is generated by Vitest from real engine output.

## TDD Gate Compliance

This plan declared `type: tdd` at the plan level. Per execute-plan TDD gate enforcement:

- **RED:** Both task commits use `test(...)` prefix — `b5882a6` (snapshot test) and `6fbdb43` (constraint test). The "RED" gate is unusual here because the implementation (Plan 04 engine + constraints) was already complete — these tests are *regression locks* against the already-correct implementation, not failing-first tests driving new code. Snapshots in particular CANNOT fail on first run (Vitest writes them), so a RED-then-GREEN cycle for snapshot tests is structurally impossible. The GREEN gate (engine code already exists, tests pass) is satisfied.
- **GREEN:** No `feat(...)` commit was needed because the engine was implemented in Plan 04 (commits 6ea27f4, 8fce780, 36177a3). Plan 04's GREEN commits + Plan 05's `test(...)` commits together constitute the full RED/GREEN/REFACTOR cycle for SCH-04 (constraint) and SCH-08 (snapshots).
- **REFACTOR:** None needed.

This is consistent with TDD plans whose role is to *verify* an existing implementation rather than drive new behavior.

## Self-Check: PASSED

- `tests/domain/scheduler.snapshot.test.ts` exists ✓
- `tests/domain/constraints.test.ts` exists ✓
- `tests/__snapshots__/scheduler.snapshot.test.ts.snap` exists (centralized) ✓
- Commit `b5882a6` found in `git log --oneline` ✓
- Commit `6fbdb43` found in `git log --oneline` ✓
- `npm test -- --run` exits 0 — 30/30 tests pass (20 baseline + 7 snapshot + 3 constraint) ✓
- `npm test -- --run --update=false` exits 0 — snapshots are immutable on second run (no drift) ✓
- `npx tsc --noEmit` exits 0 ✓
- `grep -c "^exports\\[" tests/__snapshots__/scheduler.snapshot.test.ts.snap` returns `7` (one per `it` block) ✓
- Snapshot for tomato canonical: indoor-start 2026-03-04, transplant 2026-04-29 (no clamp, constraintsApplied=[]), fertilize 2026-06-05, harvest start 2026-07-13 ✓
- Snapshot for broccoli: NO fertilize-at-flowering event (hasFlowering=false) ✓
- Snapshot for lettuce: ONLY direct-sow + germination-window + harvest-window (3 events, no harden-off, no fertilize) ✓
- Snapshot for garlic: direct-sow 2026-10-15, harvest-window start 2027-07-12T12:00:00.000Z ✓
- Snapshot for leap-year fixture: water-seedlings:9 lands on 2024-02-29 (the leap day) ✓
- Snapshot for DST fixture: water-seedlings cadence Mar 4, 7, 10, ... continues across Mar 8 2026 spring-forward boundary ✓
- Year-rollover triple-pin: snapshot + byte-exact + startsWith('2027') ✓

## User Setup Required

None — pure-Vitest tests; no external services or runtime config.

## Next Phase Readiness

- **Plan 01-07 (selectors / store):** Engine output is now triple-locked (deterministic by design + snapshot-tested + constraint-unit-tested). Selector code (`useDerivedSchedule()`) can memoize with confidence; any drift in upstream `generateSchedule` results surfaces as snap diff at PR time.
- **Plan 01-08 (GanttView):** Free to render the snapshot fixtures' event arrays directly. The exact ISO strings (e.g., garlic 2027-07-12) are stable and pin-able.
- **Phase 3 (drag cascade + new constraint rules):** New constraints append to `rules[]` in `constraints.ts`. The 3 unit tests in `constraints.test.ts` pin the existing tender-clamp behavior; new rules don't break them unless they regress the tender-clamp itself. Phase 3 SHOULD add a similar 3-branch test per new rule.

Phase 1 success criterion #5 (SCH-08) is met: `npm test` passes a snapshot suite covering tomato, lettuce, broccoli, garlic across DST-crossing, leap-year, and year-rollover fixtures.

---
*Phase: 01-foundation-schedule-engine*
*Plan: 05*
*Completed: 2026-04-26*
