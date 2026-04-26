---
phase: 01-foundation-schedule-engine
plan: 03
subsystem: domain
tags: [type-system, plant-catalog, sample-plan, fixtures, sch-02, d-11, d-12, d-16, d-03]

# Dependency graph
requires:
  - "01-01: Vite/TS scaffold + ESLint SCH-03 rule"
  - "01-02: src/domain/dateWrappers.ts (UTC-noon date primitive)"
provides:
  - "src/domain/types.ts — canonical Phase 1 type system (Plant, GardenPlan, ScheduleEvent, EventType, ...)"
  - "src/domain/ids.ts — deterministic plantingId/eventId helpers"
  - "src/assets/catalog.ts — 4-plant fixture catalog (tomato, lettuce, broccoli, garlic) as ReadonlyMap"
  - "src/samplePlan.ts — hardcoded GardenPlan loaded fresh on every boot (D-03)"
affects: [01-04, 01-05, 01-06, 01-07, 01-08, 02, 03, 04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-type domain core: src/domain/types.ts has zero runtime imports"
    - "9-member EventType union (6 lifecycle from D-11 + 3 task from D-12) — engine emits a flat ScheduleEvent[]"
    - "Required boolean flags (`hasFlowering`, `requiresHardening`) gate task-event emission instead of runtime guards"
    - "Literal `schemaVersion: 1` (not `number`) — locks the migration boundary at the type level"
    - "ReadonlyMap<string, Plant> for the catalog — readonly enforced at the type level, not via Object.freeze"
    - "Hardcoded `samplePlan` constant + plantingId helper composition — no runtime IDs, fully deterministic"

key-files:
  created:
    - src/domain/types.ts
    - src/domain/ids.ts
    - src/assets/catalog.ts
    - src/samplePlan.ts
  modified: []

key-decisions:
  - "Used `Record<string, never>` for `Plant.enrichment` (instead of `Record<string, unknown>` or omitting) — Phase 2 will widen this to the actual Permapeople fields. Empty-record type is the strictest signal that nothing flows here in Phase 1."
  - "samplePlan.ts imports the runtime `plantingId` helper from domain/ids.ts (in addition to `import type { GardenPlan }`). This is the documented threat-model exception (T-01-13): the helper is pure + deterministic, so the import remains within the engine-purity envelope."
  - "Garlic timing uses `directSowOffsetDaysFromLastFrost: 183` to model fall planting from spring last-frost. Plan acknowledges this is a Phase 1 modeling shortcut — actual fall-plant rule is firstFrost-keyed; engine + sample plan together produce the Oct→Jul rollover via the 270-day daysToMaturity. Plan 04 engine will consume this verbatim."
  - "tomato.hasFlowering = true; lettuce/broccoli/garlic = false (per D-12). Broccoli's edible head is the unopened flower bud — no fertilize-at-flowering applies in the canonical garden-task sense."

requirements-completed:
  - SCH-02

# Metrics
duration: 3min
completed: 2026-04-26
---

# Phase 01 Plan 03: Type System + Catalog + Sample Plan Summary

**Locked the canonical Phase 1 type system, shipped the 4-plant fixture catalog (tomato, lettuce, broccoli, garlic) as a ReadonlyMap, and hardcoded the sample GardenPlan that boots fresh from code per D-03.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-26T19:51:12Z
- **Completed:** 2026-04-26T19:53:48Z
- **Tasks:** 2
- **Files created:** 4 (`src/domain/types.ts`, `src/domain/ids.ts`, `src/assets/catalog.ts`, `src/samplePlan.ts`)
- **Files modified:** 0

## Accomplishments

### Type system (`src/domain/types.ts`)

- 14 exported types covering the entire Phase 1 contract:
  - `PlantSource` (`'curated' | 'custom' | 'permapeople'`)
  - `PlantCategory` (8-member union)
  - `PlantTiming` (interface; required `daysToMaturity`, `harvestWindowDays`, `frostTolerance`, `startMethod`, `hasFlowering`, `requiresHardening`)
  - `Plant` (id, source, name, optional scientificName, category, timing, optional enrichment)
  - `Location` (zip, zone, lastFrostDate, firstFrostDate, source, optional lookupTimestamp)
  - `Planting` (id, plantId, optional label, successionIndex, optional notes)
  - `EventType` — 9-member union: `indoor-start | harden-off | transplant | direct-sow | germination-window | harvest-window | water-seedlings | harden-off-day | fertilize-at-flowering`
  - `ScheduleEvent` (id, plantingId, plantId, type, start, end, edited, constraintsApplied)
  - `ScheduleEdit` (sparse-edit envelope: plantingId, eventType, startOverride, optional endOverride, reason, editedAt)
  - `TaskCategory`, `TaskRecurrence`, `Task`, `CustomTask` (Phase 1 task model)
  - `GardenPlan` (schemaVersion: literal `1`, id, name, createdAt, updatedAt, location, customPlants, plantings, customTasks, edits, settings)
- Zero runtime imports — `grep -E "^import [^t]" src/domain/types.ts` returns empty (verified).
- `exactOptionalPropertyTypes: true` (Plan 01) interacts cleanly with all `?` fields: callers cannot pass `undefined` explicitly, only omit.

### ID helpers (`src/domain/ids.ts`)

- `plantingId(plantId, successionIndex = 0)` returns `'p-{id}'` for the canonical/first planting and `'p-{id}-s{n}'` for successions ≥ 1. Default-arg lets callers omit the index.
- `eventId(planting, eventType, index?)` returns `'{planting}:{type}'` (single-event) or `'{planting}:{type}:{i}'` (multi-event, e.g. `water-seedlings`).
- Both functions are pure, deterministic, JSON-stable. Zero imports.

### Catalog (`src/assets/catalog.ts`)

- `sampleCatalog: ReadonlyMap<string, Plant>` containing 4 entries:

| id        | category            | startMethod   | frostTolerance | weeksIndoor / sowOffset       | DTM | harvestWindow | hasFlowering | requiresHardening |
|-----------|---------------------|---------------|----------------|-------------------------------|-----|---------------|--------------|-------------------|
| tomato    | fruiting-vegetable  | indoor-start  | tender         | 6w indoor, +14d transplant    | 75  | 60            | true         | true              |
| lettuce   | leafy-green         | direct-sow    | hardy          | -28d sow (succession 14d × 4) | 50  | 30            | false        | false             |
| broccoli  | brassica            | indoor-start  | half-hardy     | 5w indoor, -14d transplant    | 60  | 21            | false        | true              |
| garlic    | allium              | direct-sow    | hardy          | +183d sow (≈Oct 15)           | 270 | 21            | false        | false             |

- Garlic's `daysToMaturity: 270` paired with `directSowOffsetDaysFromLastFrost: 183` produces the canonical Oct → Jul next-year rollover when the engine consumes it against samplePlan's `lastFrostDate: 2026-04-15`.
- Only `import type { Plant }` — no runtime imports.

### Sample plan (`src/samplePlan.ts`)

- `samplePlan: GardenPlan` constant — hardcoded values, ready to import from anywhere.
- Location: `zip:'20001'`, `zone:'7a'`, `lastFrostDate:'2026-04-15T12:00:00.000Z'`, `firstFrostDate:'2026-10-20T12:00:00.000Z'`, `source:'manual'`.
- 4 plantings, one per catalog plant at successionIndex 0; ids generated via `plantingId('tomato')` etc., yielding `p-tomato`, `p-lettuce`, `p-broccoli`, `p-garlic`.
- Empty `customPlants`, `customTasks`, `edits` — Phase 1 has no user input flowing into the plan (D-02).
- Settings: `units:'imperial'`, `weekStartsOn:0` (Sunday), `timezone:'America/New_York'`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define canonical types + id helpers** — `a6d2ea4` (feat)
2. **Task 2: 4-plant catalog + hardcoded sample plan** — `eb006f6` (feat)

## Files Created/Modified

### Created

- `src/domain/types.ts` — 154 lines. Exports 14 types covering the Phase 1 contract. Zero runtime imports.
- `src/domain/ids.ts` — 22 lines. Exports `plantingId` and `eventId`. Zero imports.
- `src/assets/catalog.ts` — 91 lines. Exports `sampleCatalog: ReadonlyMap<string, Plant>` with 4 fixture plants. Only `import type { Plant }` from `../domain/types`.
- `src/samplePlan.ts` — 36 lines. Exports `samplePlan: GardenPlan`. `import type { GardenPlan }` + runtime `import { plantingId }` (accept-listed per threat T-01-13).

### Modified

None — all four files are net-new.

## Decisions Made

- **`Plant.enrichment?: Record<string, never>`** — Phase 2 will widen this to the actual Permapeople fields. The `Record<string, never>` shape is the strictest type signal that nothing flows through this slot in Phase 1. Anyone trying to put data here gets a tsc error today; Phase 2 widens by simple type extension.
- **samplePlan imports `plantingId`, not just `import type`** — Documented exception per threat T-01-13 (`E (Elevation of privilege)` disposition `mitigate`). The helper is pure + deterministic + has no I/O, so the import stays inside the engine-purity envelope. The grep gate `! grep -E "^import [^t]" src/assets/catalog.ts` is checked on catalog.ts (which is pure-type), not samplePlan.ts (which deliberately imports a runtime helper).
- **Garlic fall-planting modeled via `directSowOffsetDaysFromLastFrost: 183`** — Phase 1 modeling shortcut. The actual horticultural rule is "plant ~14 days before first frost" (firstFrost-keyed). We model from lastFrost to keep the engine's offset math uniform across all 4 plants. The 270-day DTM combined with the +183 offset reproduces the Oct → Jul rollover the snapshot tests will lock in (Plan 05).
- **Tomato is the only `hasFlowering: true`** — Per D-12: lettuce bolting is the END of harvest (not a fertilize trigger), broccoli's edible head is the unopened flower bud (we harvest BEFORE flowering opens), garlic scapes are sometimes harvested but no "fertilize-at-flowering" task applies. Engine guards on this flag — no fertilize event emitted for the 3 false plants.
- **`requiresHardening: true` for tomato + broccoli only** — Direct-sow plants (lettuce, garlic) skip the harden-off range entirely. Indoor-start tender (tomato) and half-hardy (broccoli) plants get a 7-day harden-off range emitted by the engine.
- **`successionIntervalDays: 14, maxSuccessions: 4` on lettuce only** — Lettuce is the canonical succession-friendly fixture (D-16). Engine in Plan 04 will emit 4 succession plantings at 14-day intervals (this is what the snapshot tests pin in Plan 05).
- **Inline ISO date strings (no `parseDate`/`toISODate` calls)** — Both files are pure data; samplePlan's ISO strings are already in the canonical UTC-noon format (`...T12:00:00.000Z`). No need to round-trip through dateWrappers — that's Plan 04 engine code's job.

## Deviations from Plan

None. Both tasks executed exactly as written. All grep verifications, tsc, vitest, and eslint passed on first run.

## Issues Encountered

None.

## Verification Run

- `grep -q "export type EventType"` (and 21 other Task 1 grep gates) → all pass
- `grep -q "id: 'tomato'"` (and 22 other Task 2 grep gates) → all pass
- `grep -c "plantId: '"` on samplePlan.ts → `4` (exact)
- `! grep -E "^import [^t]"` on `src/domain/types.ts`, `src/domain/ids.ts`, `src/assets/catalog.ts` → all pass (no runtime imports outside `import type`)
- `npx tsc --noEmit` → exits 0 (strict mode + `exactOptionalPropertyTypes: true` + `noUncheckedIndexedAccess: true`)
- `npx eslint src/ tests/` → exits 0 (1 pre-existing warning from Plan 02's dateWrappers.ts — not introduced here)
- `npm test -- --run` → exits 0; `Test Files 1 passed (1) | Tests 12 passed (12)` (Plan 02's 12 dateWrappers assertions, no regressions)
- All 4 load-bearing fixture identities present verbatim: `'tomato'`, `'lettuce'`, `'broccoli'`, `'garlic'` (catalog ids)
- All load-bearing sample-plan strings present verbatim: `'2026-04-15T12:00:00.000Z'`, `'2026-10-20T12:00:00.000Z'`, `'20001'`, `'7a'`

## User Setup Required

None — no external services or secrets required.

## Next Phase Readiness

Plan 01-04 (schedule engine + constraints) is unblocked:

- `Plant`, `PlantTiming`, `GardenPlan`, `Planting`, `ScheduleEvent`, `EventType`, `ScheduleEdit` all exported and locked. Engine signature `generateSchedule(plan: GardenPlan, catalog: ReadonlyMap<string, Plant>) → ScheduleEvent[]` has all its types ready.
- `eventId` and `plantingId` helpers ready to construct deterministic event ids inside the engine.
- 9-member EventType union locks the lifecycle palette (currently typed as `Record<string, string>` in `lifecyclePalette.ts`) — Plan 04 or 08 can narrow that to `Record<EventType, string>` once the engine actually emits events.

Plan 01-05 (snapshot suite) is unblocked:

- 4 fixture plant timings are pinned at the exact values snapshot tests will lock down.
- `samplePlan` is the canonical input; engine output snapshot is the canonical contract.

Plan 01-06 (planStore) is unblocked:

- `GardenPlan` type ready to be the `plan` field's type (`GardenPlan | null`).
- `schemaVersion: 1` literal locks the migration boundary.

Plan 01-08 (GanttView) is unblocked:

- `ScheduleEvent[]` is the render input.
- `EventType` union is the palette key.
- `samplePlan` is the bootstrap data.

## Self-Check: PASSED

All claimed files exist on disk:
- `src/domain/types.ts` FOUND
- `src/domain/ids.ts` FOUND
- `src/assets/catalog.ts` FOUND
- `src/samplePlan.ts` FOUND

All claimed commits exist in `git log`:
- `a6d2ea4` FOUND (feat(01-03): add canonical Phase 1 type system + id helpers)
- `eb006f6` FOUND (feat(01-03): add 4-plant catalog + hardcoded sample plan)

---
*Phase: 01-foundation-schedule-engine*
*Completed: 2026-04-26*
