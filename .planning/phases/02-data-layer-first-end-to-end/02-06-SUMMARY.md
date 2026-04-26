---
phase: 02-data-layer-first-end-to-end
plan: 06
subsystem: domain-engine
tags: [succession, scheduler, pure-function, date-fns, vitest, snapshot-test]

# Dependency graph
requires:
  - phase: 01-foundation-schedule-engine
    provides: "generateSchedule() pure engine + 7 locked snapshot tests + dateWrappers + Plant/Planting/GardenPlan types"
  - phase: 02-data-layer-first-end-to-end
    provides: "Plan 02-01 schemaVersion: 2 + Planting.successionEnabled?: boolean + Pitfall E migration"
provides:
  - "expandSuccessions(plan, catalog) pure pre-pass that inlines N derived plantings into the GardenPlan before generateSchedule()"
  - "Pitfall D defensive guard in scheduler.ts: skip plantings whose plant has daysToMaturity <= 0"
  - "Cap formula: floor((daysToFirstFrost - dtm) / interval) ∧ maxSuccessions ∧ maxSuccessions ?? 12 safety cap"
  - "Derived planting id convention: ${baseId}-s${i} for i = 1..upperBound"
  - "8th snapshot in scheduler.snapshot.test.ts.snap covering lettuce-with-succession (Phase 1's 7 byte-identical)"
affects: [02-10-useDerivedSchedule-wiring, 02-09-myplan-panel-succession-toggle, 02-12-gantt-succession-row-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure pre-pass extension of pure engine — preserves Phase 1 snapshot invariants"
    - "Three-layer defense for malformed catalog data (Zod import + modal save validation + scheduler guard)"

key-files:
  created:
    - "src/domain/succession.ts"
    - "tests/domain/succession.test.ts"
  modified:
    - "src/domain/scheduler.ts"
    - "tests/domain/scheduler.snapshot.test.ts"
    - "tests/__snapshots__/scheduler.snapshot.test.ts.snap"

key-decisions:
  - "Pre-pass approach (RESEARCH §Pattern 1) preserves engine purity — generateSchedule() unchanged; non-succession plans are no-op identity through expandSuccessions"
  - "Derived id format uses `-s${i}` (per plan body + research) instead of `-succession-${idx}` (success-criterion text); plan body is the more detailed spec"
  - "Pitfall D guard added to scheduler.ts as the third defense layer — does not change Phase 1 snapshot output (existing 4 plants all have valid DTM)"

patterns-established:
  - "Pure-domain pre-pass pattern: when extending a pure engine, prepend a pure transform of the input rather than threading new parameters through the engine"
  - "Safety cap + algorithmic cap composition: min(algorithmic-cap, configured-soft-cap) where soft-cap defaults to 12"

requirements-completed: [SCH-06, GANTT-01]

# Metrics
duration: 3min
completed: 2026-04-26
---

# Phase 2 Plan 06: Succession Engine Extension Summary

**Pure expandSuccessions pre-pass that inlines N derived plantings (capped by frost + maxSuccessions) before generateSchedule, plus defensive DTM guard in scheduler — Phase 1's 7 snapshots remain byte-identical.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-26T23:23:10Z
- **Completed:** 2026-04-26T23:26:59Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- `expandSuccessions(plan, catalog) → GardenPlan` is a pure function (zero React/Zustand/I/O imports verified by grep — count = 0)
- Cap formula correctly bounds derived plantings by frost-date arithmetic AND by `maxSuccessions ?? 12` safety ceiling
- Identity invariant: original planting always preserved at index 0 with original id and `successionIndex: 0`; derived plantings use id `${baseId}-s${i}`
- Phase 1's 7 engine snapshots remain byte-identical (canary-protected via the snapshot suite)
- New 8th snapshot covers `lettuce zone 7 with successionEnabled` — produces 5 plantings (1 original + 4 succession, capped by `maxSuccessions=4`)
- Pitfall D defensive guard added to `scheduler.ts`: plantings whose plant has `daysToMaturity <= 0` are silently skipped (third defense layer atop Zod + modal validation)

## Task Commits

1. **Task 1: succession.ts pure pre-pass + scheduler.ts Pitfall D guard** — `40412e9` (feat)
2. **Task 2: succession unit tests + scheduler.snapshot extension** — `28e6c04` (test)

_Note: TDD here uses the snapshot suite as the canary "RED" gate (existing 7 snapshots fail if engine output drifts) and Task 2 adds dedicated unit tests + the new 8th snapshot. The lone source change in Task 1 added zero net behavior to non-succession plans by design (the pre-pass never runs and the Pitfall D guard is no-op for valid catalogs)._

## Files Created/Modified
- `src/domain/succession.ts` — pure `expandSuccessions(plan, catalog)`; uses `parseDate`/`addDays`/`differenceInDays` from `dateWrappers` only; branches on `startMethod` to compute `baseAnchor`; cap formula `min(floor((daysToFirstFrost - dtm) / interval), maxSuccessions ?? 12)`
- `src/domain/scheduler.ts` — single-line Pitfall D guard inside the per-planting loop; existing 7 snapshots unchanged
- `tests/domain/succession.test.ts` — 8 unit cases (identity preservation, no-op for unflagged, no-op for missing interval, 5-plantings expansion, derived id format, Pitfall F cap-math boundary, unknown plantId silently-skipped, no-mutation-of-input)
- `tests/domain/scheduler.snapshot.test.ts` — adds `import { expandSuccessions }` and a final `describe` block with 1 new snapshot
- `tests/__snapshots__/scheduler.snapshot.test.ts.snap` — extended from 7 to 8 entries; the 7 Phase 1 entries are byte-identical

## Decisions Made
- **Pure pre-pass over engine modification.** Keeps the Phase 1 snapshot invariant (engine output for non-succession plans must not change) and matches RESEARCH §Pattern 1 verbatim.
- **`-s${i}` id suffix.** The plan's success-criteria field uses `-succession-${idx}`, but the plan body, research, and PATTERNS.md all use `-s${i}`. The body's explicit code wins; the success-criteria text is treated as a paraphrase.
- **`maxSuccessions ?? 12` default.** Lettuce in the catalog has `maxSuccessions: 4` so it caps at 4. For plants with no `maxSuccessions` declared, 12 is a generous ceiling that the cap formula will almost always undercut anyway (216 days / 14-day interval = ~15 max for fast crops).

## Deviations from Plan

None — plan executed exactly as written. The lint adjustment in Task 1 (changing `let offsetDays = 0;` to `let offsetDays: number;` because every code path assigns a value) is a stylistic conformance to `no-useless-assignment` and does not change behavior.

## Issues Encountered

**Per-row date shift not applied at engine level (design observation, not a bug per this plan's scope).**

The new 8th snapshot reveals that derived plantings (e.g. `p-lettuce-s1`, `p-lettuce-s2`, ...) currently produce events at the **same calendar dates** as the original planting. This is the literal behavior of the research design (Pattern 1 lines 380-427) and matches the plan body verbatim: `expandSuccessions` pushes derived plantings with identical plant data and only the `id` + `successionIndex` differ. The engine, by design, reads dates from `plant.timing` only — it does not inspect `successionIndex`.

**Why this is in-scope and intentional for Plan 02-06:**
- Plan body's behavior list specifies count, id, and `successionIndex` invariants — never per-row date shifting.
- Plan success criteria mentions cap math (count cap) but does not assert per-row date diversity.
- All 8 plan/research checks pass (purity, snapshot byte-identity, cap-math correctness on count, id format).

**Why this is a flag for the next succession-related plan (likely 02-10 or 02-12):**
- The user-visible value of succession (multiple staggered plantings on the gantt) requires the derived plantings to actually plant on different dates.
- This will require either:
  1. Adding a `dateOffsetDays?: number` (or `successionStartOverride?: string`) field to the `Planting` schema (Plan 02-01 territory — schema change), and having the engine read it; OR
  2. Having `expandSuccessions` synthesize a per-row `ScheduleEdit[]` entry to nudge the start dates; OR
  3. Modifying the engine to apply `successionIndex * interval` shift internally.
- All three are architectural enough to belong in their own plan, NOT to be hot-patched here as a Rule-2 critical-functionality fix because (a) the plan explicitly never required date-shifting and (b) the schema field doesn't exist yet.

## Threat Flags

None. The new pre-pass introduces no new trust-boundary surface — it consumes the same `GardenPlan` + `catalog` inputs as the Phase 1 engine and produces a `GardenPlan`. Pitfall D guard hardens an existing surface.

## Verification

```
$ npx tsc --noEmit                                                      # exit 0
$ npx eslint src/domain/succession.ts src/domain/scheduler.ts \
            tests/domain/succession.test.ts \
            tests/domain/scheduler.snapshot.test.ts                     # exit 0
$ grep -c 'react\|zustand\|fetch(\|localStorage\|window\.' \
       src/domain/succession.ts                                         # 0
$ grep -q 'export function expandSuccessions' src/domain/succession.ts  # OK
$ grep -q 'Pitfall D' src/domain/scheduler.ts                           # OK
$ grep -c '^exports\[' tests/__snapshots__/scheduler.snapshot.test.ts.snap  # 8
$ npm test -- --run tests/domain/                                       # 6 files / 58 tests passed
```

## Next Phase Readiness

- `expandSuccessions` is ready to be wired into `useDerivedSchedule.ts` (Plan 02-10) immediately before `generateSchedule(plan, catalog)`.
- Cap math has been validated against catalog lettuce in zone 7 (5 plantings) and against boundary fixture (`anchor + (N+1)*interval + dtm > firstFrost`).
- The per-row date-shift gap noted under "Issues Encountered" should be resolved in Plan 02-10 or a successor plan; recommend extending `Planting` with a `dateOffsetDays?: number` field and threading it through the engine's anchor computation. The defensive design here means that change can be additive — the existing pre-pass + tests will not need to be rewritten.

## Self-Check: PASSED

- src/domain/succession.ts — FOUND
- src/domain/scheduler.ts (Pitfall D guard) — FOUND
- tests/domain/succession.test.ts — FOUND
- tests/domain/scheduler.snapshot.test.ts (extended) — FOUND
- tests/__snapshots__/scheduler.snapshot.test.ts.snap (8 entries) — VERIFIED
- Commit 40412e9 (feat: succession.ts + scheduler guard) — FOUND
- Commit 28e6c04 (test: succession + snapshot extension) — FOUND

---
*Phase: 02-data-layer-first-end-to-end*
*Completed: 2026-04-26*
