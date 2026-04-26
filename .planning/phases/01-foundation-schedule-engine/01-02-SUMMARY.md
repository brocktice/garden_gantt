---
phase: 01-foundation-schedule-engine
plan: 02
subsystem: domain
tags: [date-fns, utc, dst-safety, leap-year, year-rollover, sch-03]

# Dependency graph
requires:
  - "01-01: Vite/React/TS scaffold + ESLint SCH-03 rule allowlisting src/domain/dateWrappers.ts"
provides:
  - "src/domain/dateWrappers.ts — the SINGLE allowed `new Date(string)` call site in the codebase"
  - "parseDate / toISODate / formatDateShort / addDays / subDays / differenceInDays primitives over @date-fns/utc UTCDate"
  - "DST/leap/year-rollover ISO fixtures pinned by 12 unit tests (Plan 05 snapshot tests will reuse the exact strings)"
affects: [01-03, 01-04, 01-05, 01-06, 01-08, 02, 03, 04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UTC-noon storage discipline: ISO 8601 at T12:00:00.000Z so a date is the same calendar day in every timezone from UTC-12 to UTC+12"
    - "UTCDate re-boxing: addDays/subDays wrap date-fns helpers and re-construct `new UTCDate(...)` so downstream `.toISOString()` is timezone-stable"
    - "Single-site Date construction: parseDate is the only function in the repo that calls `new Date(string)`; ESLint SCH-03 enforces this"
    - "No subWeeks/addWeeks: PITFALLS §1 ambiguity; engine must use subDays(d, n*7) explicitly"

key-files:
  created:
    - src/domain/dateWrappers.ts
    - tests/domain/dateWrappers.test.ts
  modified: []

key-decisions:
  - "Kept the eslint-disable-next-line comment on the `new Date(trimmed)` call even though the file is on the SCH-03 ignores list — per Plan 02 acceptance criteria the comment is the visible flag for the single allowed Date construction site. Generates a benign 'unused eslint-disable directive' warning (0 errors)."
  - "Imported addDays/subDays/differenceInDays from `date-fns` with `as` aliases (addDaysFns/subDaysFns/differenceInDaysFns) and re-export same-named wrappers — keeps call sites consistent with date-fns API while ensuring all results flow through `new UTCDate(...)`."
  - "Tests use exact-string ISO assertions (`'2026-03-08T12:00:00.000Z'`, `'2024-02-29T12:00:00.000Z'`, `'2027-07-12T12:00:00.000Z'`, `'2026-03-04T12:00:00.000Z'`) rather than Date object comparisons so failures localize to the ISO byte that drifted."

requirements-completed:
  - SCH-03

# Metrics
duration: 2min
completed: 2026-04-26
---

# Phase 01 Plan 02: UTC-Noon Date Primitive Summary

**Locked the single allowed `new Date(string)` call site at `src/domain/dateWrappers.ts` and pinned DST / leap-year / year-rollover behavior with 12 vitest assertions over `@date-fns/utc` `UTCDate` outputs.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-26T19:45:26Z
- **Completed:** 2026-04-26T19:47:47Z
- **Tasks:** 2
- **Files created:** 2 (`src/domain/dateWrappers.ts`, `tests/domain/dateWrappers.test.ts`)
- **Files modified:** 0

## Accomplishments

- `parseDate(iso)` accepts both date-only (`"2026-04-15"`, length 10 — coerced to noon UTC) and full-ISO strings; returns a `UTCDate` whose `.toISOString()` always lands at `T12:00:00.000Z`.
- `toISODate(date)` re-boxes any `Date` as `UTCDate`, sets UTC hours to noon, and emits the canonical ISO string. Idempotent over the noon-UTC convention.
- `formatDateShort(date)` returns the `YYYY-MM-DD` slice for display only (storage uses `toISODate`).
- `addDays` / `subDays` wrap `date-fns` helpers and re-construct `new UTCDate(...)` so every downstream `.toISOString()` stays UTC-noon-stable across DST boundaries.
- `differenceInDays(a, b)` returns the exact whole-day count via `date-fns` (no re-boxing needed — it returns a number).
- The single `new Date(trimmed)` call is wrapped in a `// eslint-disable-next-line no-restricted-syntax -- THIS is the allowed site (SCH-03)` comment for documentation visibility (the rule's `ignores` list also exempts this file).
- 12 vitest assertions pin the exact ISO outputs:
  - parseDate idempotent (date-only → noon UTC) and full-ISO passthrough
  - toISODate normalizes to `'2026-04-15T12:00:00.000Z'`
  - formatDateShort returns `'2026-04-15'`
  - DST spring-forward (Mar 7 → Mar 8 2026): `'2026-03-08T12:00:00.000Z'`
  - DST window (14 days back from Mar 12 2026 across spring-forward): `'2026-02-26T12:00:00.000Z'`
  - DST fall-back (Oct 31 → Nov 1 2026): `'2026-11-01T12:00:00.000Z'`
  - Leap year (Feb 28 2024 +1d): `'2024-02-29T12:00:00.000Z'`
  - Leap year (Feb 28 2024 +2d): `'2024-03-01T12:00:00.000Z'`
  - Year rollover garlic fixture (Oct 15 2026 + 270d): `'2027-07-12T12:00:00.000Z'`
  - 6-weeks-before-last-frost (Apr 15 - 42d): `'2026-03-04T12:00:00.000Z'`
  - differenceInDays(Apr 15, Mar 4): `42`
- T-01-08 mitigation lives in those 12 fixtures: any future drift in DST / leap / year-rollover behavior fails CI on the exact byte that moved.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement dateWrappers.ts (the only `new Date(string)` site) + UTC re-exports** — `34230ab` (feat)
2. **Task 2: dateWrappers tests — DST, leap-year, year-rollover, idempotency, week-math** — `a7f14b6` (test)

## Files Created/Modified

### Created

- `src/domain/dateWrappers.ts` — 66 lines. Imports `UTCDate` from `@date-fns/utc` and `addDays`/`subDays`/`differenceInDays` from `date-fns` (aliased). Exports `parseDate`, `toISODate`, `formatDateShort`, `addDays`, `subDays`, `differenceInDays`. Contains exactly one `new Date(...)` call (inside `parseDate`).
- `tests/domain/dateWrappers.test.ts` — 80 lines. 12 `expect(...)` assertions across 7 `describe` blocks covering parseDate, toISODate, formatDateShort, DST safety, leap year, year rollover, week math, and differenceInDays.

### Modified

None — both files are net-new. The `tests/` directory itself did not exist before this plan; vitest's default include pattern (`tests/**/*.{test,spec}.{ts,tsx,js,jsx}`) picked the new file up automatically.

## Decisions Made

- **Kept the redundant eslint-disable directive.** The SCH-03 rule's `ignores: ['src/domain/dateWrappers.ts']` already exempts the file, so the `eslint-disable-next-line no-restricted-syntax` comment generates an "unused eslint-disable directive" warning. Plan 02 acceptance criteria explicitly require the comment ("the eslint-disable comment is the visible flag"), so the warning is accepted as documentation cost. ESLint exits 0 (warning, not error).
- **Adjusted the file header comment** from `"... raw `new Date(string)`"` to `"... raw Date from a string"` so the literal substring `new Date(` appears exactly once in the file (the actual call). The plan's verify command `grep -c "new Date(" ... | grep -q "^1$"` would otherwise count the comment match. The semantic intent is unchanged.
- **Used `date.length === 10` to detect the date-only form** rather than a regex, per RESEARCH.md §Pattern 2's exact reference snippet. ISO 8601 date-only is always exactly 10 chars (`YYYY-MM-DD`); anything longer is a datetime and is passed through to the `Date` constructor as-is.
- **Re-boxed `addDays`/`subDays` results in `new UTCDate(...)`** even though `date-fns` v4 already supports `UTCDate` natively. The re-box is cheap, makes the return type explicit (`UTCDate`, not `Date`), and matches RESEARCH.md §Pattern 2 verbatim.
- **Did NOT export `subWeeks` / `addWeeks`.** PITFALLS §1 calls out the off-by-one ambiguity ("6 weeks" = 42 days vs 6 calendar-week boundaries). The engine in Plan 04 must use `subDays(d, n*7)` explicitly so the math is auditable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adjusted file header to keep `grep -c "new Date("` at exactly 1**
- **Found during:** Task 1 (post-write verify)
- **Issue:** The verify command `grep -c "new Date(" src/domain/dateWrappers.ts | grep -q "^1$"` failed because the header comment contained the exact phrase `` `new Date(string)` `` in backticks, matching grep's literal pattern. Initial output: `2` (one comment + one real call). Acceptance criterion explicitly requires "exactly ONE occurrence of `new Date(`".
- **Fix:** Changed the header comment from `` "... that may construct a raw `new Date(string)`." `` to `"... that may construct a raw Date from a string."`. Semantic intent preserved; verify command now passes (1 match).
- **Files modified:** `src/domain/dateWrappers.ts` (line 2)
- **Verification:** `grep -c "new Date(" src/domain/dateWrappers.ts` returns `1`. Full Task 1 verify command passes end-to-end.
- **Committed in:** `34230ab` (Task 1 commit; the fix happened pre-commit).

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Cosmetic — the comment phrasing change is invisible at the API surface. Zero impact on imports, exports, types, runtime behavior, or test assertions.

## Issues Encountered

None beyond the one deviation above. All 12 tests passed on first run. `tsc --noEmit` clean. Re-running tests after the Task 2 commit confirmed the suite still goes 12/12 green.

## Verification Run

- `grep -c "new Date(" src/domain/dateWrappers.ts` → `1` (exact)
- `grep -rn "new Date(" src/ tests/ | grep -v "src/domain/dateWrappers.ts"` → empty (no other call sites)
- `grep -c "expect(" tests/domain/dateWrappers.test.ts` → `12`
- `npx tsc --noEmit` → exits 0 (strict mode, including `tests/`)
- `npx eslint src/domain/dateWrappers.ts` → exits 0 (1 warning: unused eslint-disable directive — accepted per plan acceptance criteria)
- `npx eslint tests/domain/dateWrappers.test.ts` → exits 0 (clean)
- `npm test -- --run` → exits 0; `Test Files 1 passed (1) | Tests 12 passed (12)`
- All 4 load-bearing fixture strings present verbatim in the test file: `'2026-03-08T12:00:00.000Z'`, `'2024-02-29T12:00:00.000Z'`, `'2027-07-12T12:00:00.000Z'`, `'2026-03-04T12:00:00.000Z'`

## User Setup Required

None — no external services or secrets required.

## Next Phase Readiness

Plan 01-03 (catalog seed + sample plan fixture) is unblocked:

- `parseDate` is available for the catalog's lifecycle date references and for the sample plan's `lastFrostDate` / `firstFrostDate` constants
- `toISODate` provides the storage-side normalization the catalog must use to keep all stored dates byte-stable
- The 4 load-bearing fixture ISO strings are pinned — Plan 05's snapshot tests can reproduce them deterministically across machines and timezones

Plan 01-04 (schedule engine + constraints) is unblocked:

- `addDays(d, n)` / `subDays(d, n*7)` is the canonical week-math primitive — engine constraints can express "6 weeks before last frost" as `subDays(lastFrost, 42)` with the exact-day output guaranteed
- `differenceInDays(a, b)` provides the cascade-recompute primitive: when a bar is dragged in Plan 03 (Phase 3), the offset from the anchor date is `differenceInDays(newStart, anchorDate)`

Plan 01-05 (snapshot suite) is unblocked:

- The fixture strings used by `dateWrappers.test.ts` are exactly the strings the engine will emit — Plan 05 snapshots can `toMatchInlineSnapshot` them without surprise

## Self-Check: PASSED

All claimed files exist on disk:
- `src/domain/dateWrappers.ts` FOUND
- `tests/domain/dateWrappers.test.ts` FOUND

All claimed commits exist in `git log`:
- `34230ab` FOUND (feat(01-02): add UTC-noon date primitive (single allowed new Date site))
- `a7f14b6` FOUND (test(01-02): pin dateWrappers with DST/leap/year-rollover assertions)

---
*Phase: 01-foundation-schedule-engine*
*Completed: 2026-04-26*
