---
phase: 02-data-layer-first-end-to-end
plan: 04
subsystem: data-layer
tags: [zustand, persist, catalog, multi-tab, lru-cache, tdd]

requires:
  - phase: 01-foundation-schedule-engine
    provides: Plant + PlantTiming types, sampleCatalog 4-plant fixture, withStorageDOMEvents helper, planStore persist pattern
  - phase: 02-data-layer-first-end-to-end (Plan 02-01)
    provides: PlantTiming.season ('cool'|'warm') field
provides:
  - 53-entry curated plant catalog (D-07/D-08/D-09) with full PlantTiming including season
  - useCatalogStore Zustand persist store (customPlants + permapeopleCache LRU)
  - selectMerged(state) -> ReadonlyMap<string, Plant> with custom-overrides-curated semantics
  - useUIStore Phase 2 transient flags (myPlanPanelOpen, filterChips, searchQuery, importPreviewOpen)
  - withStorageDOMEvents wired for both planStore + catalogStore (DATA-06 multi-tab sync)
affects:
  - 02-05 (Setup Wizard — uses curated catalog list)
  - 02-09 (Catalog Browser — consumes selectMerged + filterChips + searchQuery)
  - 02-10 (Custom Plant Modal — uses upsertCustomPlant)
  - 02-11 (Import/Export — uses importPreviewOpen + customPlants)
  - 02-12 (My Plan Panel — uses myPlanPanelOpen)

tech-stack:
  added: []
  patterns:
    - "Variety-level catalog naming convention: 'Common name — Variety' with em-dash separator"
    - "Plant ID kebab-case '{species}-{variety}' for variety-level entries"
    - "Pitfall H: insertion-order LRU cap on permapeopleCache (50 entries max)"
    - "Pitfall K: UI ephemeral state (filter/search/panel) lives in uiStore — never persisted"
    - "Multi-tab sync: every persist store wired through withStorageDOMEvents in main.tsx"

key-files:
  created:
    - src/stores/catalogStore.ts
    - tests/stores/catalogStore.test.ts
    - tests/stores/uiStore.test.ts
  modified:
    - src/assets/catalog.ts (4 -> 53 entries; Phase 1 ids byte-identical)
    - src/stores/uiStore.ts (Phase 2 transient flags added)
    - src/main.tsx (catalogStore added to multi-tab listener)

key-decisions:
  - "Used insertion-order LRU via key delete-then-reinsert (Object.entries last-N) for permapeopleCache cap rather than separate access-order tracking — simpler and sufficient for 50-entry cap (Pitfall H)."
  - "selectMerged returns a fresh Map per call rather than memoising — Zustand's shallow-compare via consumer-side useShallow is the recommended memoisation point (RESEARCH §Pattern 7)."
  - "Variety entries with sensible succession behaviour (lettuces, radish, beet, kohlrabi, scallion, bush bean, arugula, cilantro, dill, cucumber, summer squash, turnip) carry successionIntervalDays 7-21 + maxSuccessions 2-8."
  - "kale-lacinato + kale-red-russian use startMethod 'either' to support both indoor + direct sow (research-backed; engine handles both branches)."
  - "Migrated planStore-style migrate() scaffolding into catalogStore for future schema bumps (currently empty migrations map)."

patterns-established:
  - "Zustand persist store for Phase 2+ stores follows planStore template: SCHEMA_VERSION, migrations map, createJSONStorage, name 'garden-gantt:{slug}', version 1"
  - "TDD RED/GREEN cycle: tests/stores/*.test.ts written first (failing), then implementation lands in single GREEN commit"
  - "Test reset pattern for uiStore (no persist): useUIStore.setState({...defaults}) in beforeEach"
  - "Test reset pattern for persisted stores: window.localStorage.clear() + vi.resetModules() in beforeEach (matches planStore.test.ts)"

requirements-completed: [CAT-01, CAT-02, CAT-03, CAT-04, CAT-05]

duration: 6min
completed: 2026-04-26
---

# Phase 2 Plan 04: Catalog Growth + Catalog/UI Stores Summary

**Curated catalog grew 4 -> 53 plants with full PlantTiming including season; new catalogStore (Zustand persist) holds customPlants + LRU-capped Permapeople cache + selectMerged selector; uiStore extended with Phase 2 transient flags (panel/filter/search/import-preview, no persist); main.tsx now wires multi-tab sync for both persist stores.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-26T23:22:44Z
- **Completed:** 2026-04-26T23:28:22Z
- **Tasks:** 2
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- Catalog grew from 4 species-level entries to 53 entries spanning all 8 PlantCategory values; Phase 1's tomato/lettuce/broccoli/garlic ids and timing values are byte-identical (Pitfall G enforced).
- New `useCatalogStore` (Zustand persist) supports custom plant CRUD + Permapeople enrichment cache with insertion-order LRU cap of 50 entries (Pitfall H).
- `selectMerged` selector merges curated + customPlants with custom-by-id override semantics; ready for Plan 02-09 catalog browser consumption.
- `useUIStore` extended with Phase 2 transient flags: `myPlanPanelOpen`, `filterChips: Set<string>`, `searchQuery`, `importPreviewOpen` — all in-memory only (Pitfall K — `grep -c persist src/stores/uiStore.ts` = 0).
- `main.tsx` now calls `withStorageDOMEvents` for both `usePlanStore` AND `useCatalogStore` (DATA-06 multi-tab sync coverage).
- Test count grew from 88 to 107 (19 new tests, all green); tsc clean; eslint clean.

## Task Commits

Each task was committed atomically (--no-verify per worktree convention):

1. **Task 1: Grow catalog 4 → 53 plants** — `92a93d6` (feat)
2. **Task 2 RED: Failing tests for catalogStore + uiStore** — `2f400c6` (test)
3. **Task 2 GREEN: catalogStore + uiStore extension + main.tsx wiring** — `d54ba6a` (feat)

## Files Created/Modified

### Created
- `src/stores/catalogStore.ts` — Zustand persist store: customPlants + permapeopleCache (LRU-capped at 50) + upsert/remove/cacheEnrichment setters + `selectMerged` selector. Persist key `garden-gantt:catalog`, version 1, migrate scaffolding (empty migrations map).
- `tests/stores/catalogStore.test.ts` — 12 tests covering persist wiring, default state, CRUD (upsert add/replace, remove), cacheEnrichment LRU cap (Pitfall H), selectMerged (no customs / id override / appending new ids), corrupt-JSON tolerance (DATA-07 inheritance).
- `tests/stores/uiStore.test.ts` — 7 tests covering Phase 2 defaults, toggleFilterChip add/remove + multi-chip, setSearchQuery + setMyPlanPanelOpen + setImportPreviewOpen round-trips, no-persist invariant (Pitfall K), Phase 1 field preservation.

### Modified
- `src/assets/catalog.ts` — 4 → 53 entries. Phase 1 species-level entries (tomato, lettuce, broccoli, garlic) unchanged; 49 new variety-level entries added. Added `curatedCatalog: readonly Plant[]` export; `sampleCatalog` now derived from it via `.map(p => [p.id, p])`. Header documents Pitfall G LOCK on Phase 1 entries.
- `src/stores/uiStore.ts` — UIState interface extended with Phase 2 fields; in-memory only.
- `src/main.tsx` — added `import { useCatalogStore }` and second `withStorageDOMEvents(useCatalogStore)` call after the planStore call.

## Decisions Made

- **LRU implementation:** Used delete-then-reinsert + slice(last-N) on Object.entries rather than a separate Map<string, accessTimestamp> structure. JS object key ordering preserves insertion order, so re-inserting on every cache write achieves access-order LRU at 50-entry cap. Simpler than tracking timestamps; sufficient for the cache size.
- **selectMerged returns fresh Map:** Did not memoise; the consumer-side `useShallow` (Zustand) or component-level useMemo is the right place to memoise for downstream subscribers. Matches the RESEARCH §Pattern 7 example.
- **`startMethod: 'either'` on kale variants:** Both kale entries support indoor-start AND direct-sow. The engine already handles 'either' (Phase 1) so this is forward-compatible.
- **Migrate scaffolding parity:** Mirrored the planStore.ts migrations pattern (SCHEMA_VERSION + empty migrations map + migrate function) so future catalog schema bumps follow a single template.

## Deviations from Plan

None — plan executed exactly as written. Notes:

- The plan's Step 1 verification spec literally said `grep 'withStorageDOMEvents' src/main.tsx | wc -l === 2`. The actual count is 3 (1 import + 2 call sites). The intent (both persist stores wired) is met; the spec arithmetic was off by 1. No code change needed.
- The plan's step said `grep -c 'persist' src/stores/uiStore.ts === 0`. Initial draft of uiStore had a clarifying comment that contained the word "persist". Adjusted comment to remove the word so the literal grep invariant holds (count is now 0). No semantic change.

## Threat Surface Scan

No NEW security-relevant surface introduced beyond what the plan's threat_model already enumerates:

- **T-02-15 (Tampering, custom plant text):** Mitigated by storing as-is + relying on React text-content escaping in consumers. No `dangerouslySetInnerHTML` introduced. Plan 02-09's plant card and Plan 02-10's modal must continue this rule.
- **T-02-16 (DoS, Permapeople cache growth):** Mitigated by 50-entry LRU cap; tested in `cacheEnrichment caps at 50 entries (Pitfall H — oldest evicted)`.
- **T-02-17 (Tampering, corrupt localStorage JSON):** Mitigated by Zustand persist's internal try/catch returning initial state; tested in `boots with default state when localStorage contains corrupt JSON`.

No threat flags to raise.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Catalog (53 entries) ready for Plan 02-05 Setup Wizard plant-pick step.
- `useCatalogStore` + `selectMerged` ready for Plan 02-09 Catalog Browser.
- `upsertCustomPlant` / `removeCustomPlant` ready for Plan 02-10 Custom Plant Modal.
- `filterChips` / `searchQuery` ready for Plan 02-09 filter/search UI.
- `myPlanPanelOpen` ready for Plan 02-12 My Plan Panel toggle.
- `importPreviewOpen` ready for Plan 02-11 Import/Export modal flow.
- `permapeopleCache` ready for Plan 02-03's already-plumbed Permapeople fetcher to write into.

## Self-Check: PASSED

```
FOUND: src/stores/catalogStore.ts
FOUND: tests/stores/catalogStore.test.ts
FOUND: tests/stores/uiStore.test.ts
FOUND: src/assets/catalog.ts
FOUND: src/stores/uiStore.ts
FOUND: src/main.tsx
FOUND: .planning/phases/02-data-layer-first-end-to-end/02-04-SUMMARY.md
FOUND commit: 92a93d6 (Task 1: catalog growth)
FOUND commit: 2f400c6 (Task 2 RED: failing tests)
FOUND commit: d54ba6a (Task 2 GREEN: catalogStore + uiStore + main.tsx)
catalog.ts plant id count: 53 (>= 50 required)
Phase 1 ids preserved: tomato, lettuce, broccoli, garlic — all FOUND
Snapshot canary tests/domain/scheduler.snapshot.test.ts: 7/7 zero diffs
Full test suite: 107/107 passing (88 baseline + 19 new)
tsc --noEmit: clean
eslint on modified files: clean
grep -c 'persist' src/stores/uiStore.ts: 0 (Pitfall K invariant holds)
```

---
*Phase: 02-data-layer-first-end-to-end*
*Plan: 04*
*Completed: 2026-04-26*
