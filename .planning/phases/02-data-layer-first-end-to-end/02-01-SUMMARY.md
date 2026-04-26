---
phase: 02-data-layer-first-end-to-end
plan: 01
subsystem: domain
type: execute
wave: 1
tags: [types, schemas, migrations, zod, dateWrappers, foundation]
requires:
  - "src/domain/types.ts (Phase 1 canonical type system)"
  - "src/domain/dateWrappers.ts (Phase 1 SCH-03 ESLint-allowed site)"
  - "src/samplePlan.ts (Phase 1 fixture)"
  - "src/assets/catalog.ts (Phase 1 4-plant fixture catalog)"
provides:
  - "src/domain/schemas.ts — Zod runtime schemas (GardenPlanSchema v2, ExportEnvelopeSchema, sub-schemas)"
  - "src/domain/migrations.ts — migrateToCurrent + CURRENT_SCHEMA_VERSION (single source of truth, Pitfall E)"
  - "Phase 2 type extensions: schemaVersion: 2, Location.overrides, Planting.successionEnabled, PlantTiming.season"
  - "dateWrappers extensions: nowISOString, lastDayOfMonth, currentYear (canonical sites under SCH-03)"
  - "zod@^4.3.6 dependency"
affects:
  - "Wave 1+ stores/planStore.ts will import migrateToCurrent and bump persist version to 2"
  - "Wave 3 features/settings/importPlan.ts will import migrateToCurrent and ExportEnvelopeSchema"
  - "Wave 1+ all 'now' / month-boundary / year sites switch to dateWrappers helpers"
  - "Phase 1 snapshot tests: re-verified byte-identical after schemaVersion bump"
tech-stack:
  added:
    - "zod ^4.3.6"
  patterns:
    - "Parallel-maintained Zod schema mirror of types.ts (RESEARCH.md §Pattern 3)"
    - "Single-source-of-truth migration module (Pitfall E mitigation)"
key-files:
  created:
    - "src/domain/schemas.ts"
    - "src/domain/migrations.ts"
    - "tests/domain/schemas.test.ts"
    - "tests/domain/migrations.test.ts"
  modified:
    - "src/domain/types.ts (schemaVersion: 2, Location.overrides, Planting.successionEnabled, PlantTiming.season required, Plant.enrichment widened)"
    - "src/domain/dateWrappers.ts (nowISOString, lastDayOfMonth, currentYear)"
    - "src/samplePlan.ts (schemaVersion: 2)"
    - "src/assets/catalog.ts (season field on tomato/lettuce/broccoli/garlic)"
    - "tests/domain/dateWrappers.test.ts (added nowISOString/lastDayOfMonth/currentYear tests)"
    - "tests/domain/constraints.test.ts (schemaVersion: 2 in fixture)"
    - "tests/domain/scheduler.snapshot.test.ts (schemaVersion: 2 in fixture; output byte-identical)"
    - "package.json, package-lock.json (zod@^4.3.6)"
decisions:
  - "migrateToCurrent return type is `unknown` (not `GardenPlan | null` as PATTERNS.md suggested): the input is the persist-wrapper shape `{ plan: ... }`, not the plan itself. Caller validates via Zod after. Documented inline in migrations.ts."
  - "Phase 1 test fixtures (constraints.test.ts, scheduler.snapshot.test.ts) bumped schemaVersion: 1 → 2 because GardenPlan.schemaVersion is now a literal-2 type. Required by Rule 3 (blocking type error). Snapshot output verified byte-identical."
metrics:
  duration: "~5 min"
  completed: "2026-04-26"
  tasks_completed: "2/2"
  commits: 4
---

# Phase 2 Plan 01: Domain Foundation (Types / Schemas / Migrations / Date Helpers) Summary

Wave-0 foundation for Phase 2: Zod runtime schemas (DATA-04, DATA-05), v1→v2 migration as single source of truth (Pitfall E), Phase 2 type extensions (schemaVersion: 2, location overrides, succession toggle, season), and the canonical dateWrappers helpers (nowISOString, lastDayOfMonth, currentYear) every later wave will import.

## What Was Built

### Task 1 — Install Zod, extend domain types, extend dateWrappers
- Installed `zod@^4.3.6`.
- Bumped `GardenPlan.schemaVersion: 1 → 2` (literal type).
- Added `Location.overrides?: { zone?, lastFrostDate?, firstFrostDate?: boolean }` (D-05).
- Added `Planting.successionEnabled?: boolean` (D-21).
- Added required `PlantTiming.season: 'cool' | 'warm'` (D-09).
- Widened `Plant.enrichment` from `Record<string, never>` to `Record<string, unknown>` for Permapeople payloads.
- Added 3 helpers to `dateWrappers.ts` — each with the Phase 1 `eslint-disable-next-line no-restricted-syntax -- THIS is the allowed site` comment style:
  - `nowISOString()` — canonical ISO timestamp ("YYYY-MM-DDTHH:mm:ss.sssZ").
  - `lastDayOfMonth(year, month)` — month-boundary helper for D-24 gantt season axis. Leap-year safe.
  - `currentYear()` — canonical "current calendar year" site.
- Updated `samplePlan.ts` and `sampleCatalog` (4 plants: tomato='warm', lettuce/broccoli/garlic='cool') to satisfy the new types.

Commits: `2096730` (test RED), `73129a8` (feat GREEN).

### Task 2 — Zod schemas + migration module
- Created `src/domain/schemas.ts`: `GardenPlanSchema` (v2 literal), `ExportEnvelopeSchema` (accepts schemaVersion 1 or 2), and the exported sub-schemas `PlantSchema`, `PlantTimingSchema`, `LocationSchema`, `PlantingSchema`, plus enum schemas. Constraints lifted verbatim from RESEARCH.md §Pattern 3 (daysToMaturity ≥ 1 — Pitfall D, ZIP `/^\d{5}$/`, zone `/^\d{1,2}[ab]$/`, isoUtcNoonDate).
- Created `src/domain/migrations.ts`: `migrateToCurrent(state, fromVersion)` + `CURRENT_SCHEMA_VERSION = 2`. The 1→2 step adds `location.overrides: {}` and stamps `successionEnabled: false` on every planting (safe default). Idempotent when `fromVersion === CURRENT`. Defensive on non-object input.
- This module is the **single** definition of `migrateToCurrent` in `src/` (Pitfall E gate enforced by verify grep).

Commits: `98083f1` (test RED), `3dec4ca` (feat GREEN).

## Verification Results

| Gate | Command | Result |
|------|---------|--------|
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Domain tests | `npm test -- --run tests/domain/` | 49/49 pass (was 22; +27 new) |
| All tests | `npm test -- --run` | 69/69 pass |
| Phase 1 snapshot canary | `npm test -- --run tests/domain/scheduler.snapshot.test.ts` | 7/7 pass (byte-identical) |
| ESLint allowed sites in dateWrappers | `grep -c 'eslint-disable-next-line no-restricted-syntax' src/domain/dateWrappers.ts` | 4 (parseDate + nowISOString + lastDayOfMonth + currentYear) |
| migrateToCurrent single source | `grep -rln 'export function migrateToCurrent' src/` | only `src/domain/migrations.ts` |
| schemaVersion: 2 in types | `grep -c 'schemaVersion: 2' src/domain/types.ts` | 1 |
| successionEnabled in types | `grep -c 'successionEnabled' src/domain/types.ts` | 1 |
| zod present | `grep '"zod":' package.json` | `"zod": "^4.3.6"` |

## Phase 1 Catalog Plant IDs Preserved

The 4 Phase 1 catalog plants (`tomato`, `lettuce`, `broccoli`, `garlic`) keep their Phase 1 IDs and timing values byte-identical. Only the new `season` field was added (a TYPE addition not consumed by the engine), and `samplePlan.schemaVersion` was bumped 1→2. The scheduler snapshot test (`tests/domain/scheduler.snapshot.test.ts`, 7 cases) re-passed byte-identical, confirming the engine output for these 4 plants is unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Phase 1 test fixtures had `schemaVersion: 1`**
- **Found during:** Task 1 verification (tsc errors).
- **Issue:** `tests/domain/constraints.test.ts:10` and `tests/domain/scheduler.snapshot.test.ts:22` declared their `GardenPlan` fixtures with `schemaVersion: 1`, which became a TS2322 error after the literal-type bump in `src/domain/types.ts`.
- **Fix:** Bumped both fixtures to `schemaVersion: 2`. No engine-output impact (verified via snapshot test — 7/7 byte-identical).
- **Files modified:** `tests/domain/constraints.test.ts`, `tests/domain/scheduler.snapshot.test.ts`.
- **Commit:** `73129a8` (rolled into the Task 1 GREEN commit).

### Deferred Items
None.

## Threat Surface (from plan threat_model)

All four threats in the plan's threat register are addressed at the validator layer:
- T-02-01 (Tampering — imported JSON): `GardenPlanSchema.safeParse` rejects malformed inputs. Tested in `tests/domain/schemas.test.ts` (daysToMaturity:0, bad ZIP, unknown frostTolerance, missing zip).
- T-02-02 (Tampering via v1→v2 path): `ExportEnvelopeSchema` accepts v1 envelopes; `migrateToCurrent` normalizes; `GardenPlanSchema` (v2-strict) validates the post-migration result. Two-stage validation flow ready for Plan 02-11.
- T-02-03 (DoS via oversized arrays): Numeric ranges bounded (DTM ≤ 400, weeksIndoor ≤ 16). Accepted disposition (single-user, localStorage 5 MB cap is the natural ceiling).
- T-02-04 (Information disclosure): Schemas mirror public types only. Accepted disposition.

## Wave 0 Gate (Pitfall E Enforcement)

`grep -rln 'export function migrateToCurrent' src/` → exactly one match: `src/domain/migrations.ts`. No other `src/` file may inline the migration step shape.

## Commits (in order)

| # | Hash | Type | Message |
|---|------|------|---------|
| 1 | 2096730 | test | add failing tests for nowISOString, lastDayOfMonth, currentYear |
| 2 | 73129a8 | feat | install zod, extend domain types, add date helpers |
| 3 | 98083f1 | test | add failing tests for schemas and migrations |
| 4 | 3dec4ca | feat | add Zod schemas and v1→v2 migration module |

## TDD Gate Compliance

Both tasks followed RED → GREEN sequence with explicit `test(...)` commits preceding `feat(...)` commits. No REFACTOR commits required.

## Self-Check: PASSED

Files created (verified to exist):
- `src/domain/schemas.ts` — FOUND
- `src/domain/migrations.ts` — FOUND
- `tests/domain/schemas.test.ts` — FOUND
- `tests/domain/migrations.test.ts` — FOUND

Commits exist in `git log`:
- 2096730 — FOUND
- 73129a8 — FOUND
- 98083f1 — FOUND
- 3dec4ca — FOUND

All verification gates green. Phase 1 snapshot tests byte-identical.
