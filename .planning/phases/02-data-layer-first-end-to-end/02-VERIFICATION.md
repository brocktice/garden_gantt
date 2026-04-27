---
phase: 02-data-layer-first-end-to-end
verified: 2026-04-27T00:39:05Z
status: passed
score: 5/5 success criteria verified
overrides_applied: 0
---

# Phase 2: Data Layer & First End-to-End — Verification Report

**Phase Goal:** Real users hit the app, enter a ZIP, pick plants from a curated catalog, and see their actual lifecycle gantt that survives reload, export, and re-import. This is the first end-to-end demo milestone.

**Verified:** 2026-04-27T00:39:05Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Success Criteria (Observable Truths)

| #   | Truth                                                                              | Status     | Evidence                                                                                                                  |
| --- | ---------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | ZIP entry → derived zone + frost dates with override path                          | ✓ VERIFIED | `SetupStepLocation.tsx` lines 82-518, `lookupLocation.ts` 1-62, `data/zones.ts` 1-85, `public/data/zones.{0..9}.json` ship ~9,422 ZIPs. Per-field Override toggles + "manual" badge implemented. Unrecognized-ZIP and unreachable fallbacks present. |
| 2   | 5+ plants pickable → horizontal-bar gantt, lifecycle-color-coded, season axis      | ✓ VERIFIED | `src/assets/catalog.ts` ships 53 entries with full timing fields and 7 categories. `CatalogBrowser.tsx` (229 LoC) wires `addPlanting`. `GanttView.tsx` 30-307 reads `usePlanStore`, calls `useDerivedSchedule`, computes axis from `min(start)..max(end)` snapped to month boundaries (lines 50-70), renders one row per planting with 6 lifecycle-phase colors from `lifecyclePalette.ts`. |
| 3   | Succession toggle on `successionIntervalDays` plants → derived rows capped at first-fall-frost | ✓ VERIFIED | `succession.ts` 35-94 implements pure pre-pass: `maxIndex = floor((daysToFirstFrost − dtm) / interval)`, capped at `maxSuccessions ?? 12`. `useDerivedSchedule` calls it before `generateSchedule`. `MyPlanPanel.tsx` 144-200 renders Switch wired to `toggleSuccession`. `GanttView.tsx` 207-222 renders 4px stone-400 left-edge accent on `successionIndex > 0` rows. Scheduler lines 23-27 apply `startOffsetDays` to anchor. |
| 4   | Export → versioned JSON; Import → preview + Zod-validate + restore identical gantt | ✓ VERIFIED | `exportPlan.ts` 1-58 builds envelope `{app, version, schemaVersion: 2, exportedAt, plan}`, runs `ExportEnvelopeSchema.safeParse`, downloads via Blob/anchor. `importPlan.ts` 1-95 reads file, distinguishes `invalid-json | invalid-schema | newer-version`, runs `migrateToCurrent` for v1, validates with `GardenPlanSchema`. `ImportPreviewModal.tsx` shows preview of plantings/customPlants count + ZIP, requires destructive confirm. `SettingsPanel.tsx` is wired at `/settings` route in `App.tsx` line 37. |
| 5   | Reload preserves state; Permapeople unreachable does not block any core flow       | ✓ VERIFIED | `planStore.ts` uses Zustand `persist` with `migrate` delegating to shared `migrateToCurrent` (Pitfall E satisfied). `catalogStore.ts` persists customPlants + Permapeople LRU cache (cap=50). Integration test `tests/integration/happy-path.test.tsx` round-trips through localStorage rehydrate (passing). Permapeople: `permapeople.ts` 41-89 returns discriminated union (never throws); `searchPlant` returns `unreachable` on CORS/network/timeout — `CustomPlantModal.tsx` consumes the result and surfaces inline error rather than blocking save (line 234: enrichment is opt-in append). CORS-spike documented in `02-CORS-SPIKE.md`; Worker proxy shipped at `cors-proxy/src/index.ts`. |

**Score:** 5/5 success criteria verified

### Required Artifacts (Per-Plan)

| Plan  | Key Artifacts                                                                                                                          | Status     | Details                                                                                              |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| 02-01 | `src/domain/types.ts` (170L), `schemas.ts` (120L), `migrations.ts` (55L), `dateWrappers.ts` (98L)                                       | ✓ VERIFIED | Zod schemas substantive; `successionEnabled`, `startOffsetDays`, `overrides` fields present.         |
| 02-02 | `scripts/build-zone-data.ts`, `scripts/acquire-zone-data.ts`, `public/data/zones.0..9.json`, `src/data/zones.ts`                       | ✓ VERIFIED | All 10 chunks present (~9,422 ZIPs total). Build script + sole-fetch-site invariant honored.         |
| 02-03 | `cors-proxy/src/index.ts` (57L), `src/data/permapeople.ts` (124L), `02-CORS-SPIKE.md`                                                  | ✓ VERIFIED | Worker proxy wired with origin allow-list + secret-injection; client returns discriminated union.    |
| 02-04 | `src/assets/catalog.ts` (1210L, 53 entries), `src/stores/catalogStore.ts` (96L), `src/stores/uiStore.ts`                               | ✓ VERIFIED | Catalog meets/exceeds 50-plant target; all 7 categories represented; merge-selector with LRU cache.  |
| 02-05 | `src/stores/planStore.ts` (192L), `src/samplePlan.ts`, v1→v2 migration                                                                  | ✓ VERIFIED | Setters for setLocation, addPlanting, removePlanting, toggleSuccession, replacePlan all wired.       |
| 02-06 | `src/domain/succession.ts` (94L), scheduler `startOffsetDays` guard                                                                    | ✓ VERIFIED | Pure pre-pass; identity invariant for index 0 preserved; defensive on missing plant/dtm.             |
| 02-07 | `src/ui/{Button,Input,Label,Select,Dialog,DropdownMenu,Switch,Toast,Card,Badge,cn}.tsx`                                                | ✓ VERIFIED | All 11 primitives present; Tailwind v4 tokens in `index.css`.                                        |
| 02-08 | `SetupWizard.tsx`, `SetupStepLocation.tsx`, `SetupStepPlants.tsx`, `SetupStepReview.tsx`, `ZipInput.tsx`, `lookupLocation.ts`           | ✓ VERIFIED | 3-step wizard, mount-only initial-step decision (D-02), per-field override (D-05), sample-plan (D-03). |
| 02-09 | `CatalogBrowser.tsx` (229L), `PlantCard.tsx`, `CustomPlantModal.tsx` (762L), `MyPlanPill.tsx`, `MyPlanPanel.tsx`, `DeletePlantDialog.tsx` | ✓ VERIFIED | Cascade delete via D-15, enrich-from-Permapeople wired (`searchPlant` consumed in modal).            |
| 02-10 | `GanttView.tsx` (307L), `useDerivedSchedule.ts`, `timeScale.ts`, `lifecyclePalette.ts`, `EmptyGanttState.tsx`, `App.tsx`, `AppShell.tsx` | ✓ VERIFIED | Plan-source swap from samplePlan to usePlanStore; succession-row visual grouping; routes wired.      |
| 02-11 | `SettingsPanel.tsx`, `exportPlan.ts`, `importPlan.ts`, `ImportPreviewModal.tsx`                                                          | ✓ VERIFIED | Pitfall E satisfied (single migration source); v1 import path triggers migration before validation. |
| 02-12 | `tests/integration/happy-path.test.tsx`, all feature tests                                                                              | ✓ VERIFIED | 153/153 tests pass across 20 test files. Production build succeeds (539KB JS / 162KB gzip).          |

### Key Link Verification

| From                                | To                                  | Via                                                  | Status   | Details                                                                                                  |
| ----------------------------------- | ----------------------------------- | ---------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| SetupStepLocation                   | data/zones.ts                       | `useLookupLocation` hook → `lookupLocation()` fetch  | ✓ WIRED  | `lookupLocation.ts:14, 52`; effect kicks fetch on valid 5-digit ZIP, dispatches discriminated result.     |
| SetupStepLocation                   | planStore                           | `usePlanStore.setLocation` on Step 1 Next            | ✓ WIRED  | `SetupWizard.tsx:64` calls `setLocation(pendingLocation)`.                                                |
| CatalogBrowser PlantCard "Add"      | planStore                           | `addPlanting`                                        | ✓ WIRED  | `CatalogBrowser.tsx:31, 62`.                                                                              |
| MyPlanPanel succession Switch       | planStore                           | `toggleSuccession(plantingId)`                       | ✓ WIRED  | `MyPlanPanel.tsx:38, 179`; `planStore.ts:101-116`.                                                         |
| GanttView                           | scheduler + succession.ts           | `useDerivedSchedule` → `expandSuccessions` → `generateSchedule` | ✓ WIRED  | `useDerivedSchedule.ts:21-26`.                                                                            |
| GanttView axis                      | event bounds                        | `computeAxisBounds(events, plan)`                    | ✓ WIRED  | `GanttView.tsx:50-70, 101-104`.                                                                           |
| SettingsPanel Export                | planStore + Zod                     | `exportPlan()` → `usePlanStore.getState().plan` → `ExportEnvelopeSchema.safeParse` → Blob download | ✓ WIRED  | `exportPlan.ts:21-57`.                                                                                    |
| SettingsPanel Import                | parseImportFile + ImportPreviewModal | FileReader → Zod → migrateToCurrent → modal preview → `replacePlan` | ✓ WIRED  | `SettingsPanel.tsx:31-50, 99-107`; `ImportPreviewModal.tsx:30-32`.                                        |
| importPlan v1→v2                    | shared migrations module            | `migrateToCurrent(state, 1)`                         | ✓ WIRED  | `importPlan.ts:71`. Single source of truth — Pitfall E held.                                              |
| CustomPlantModal "Enrich"           | data/permapeople.ts                 | `searchPlant(query)` → discriminated union          | ✓ WIRED  | `CustomPlantModal.tsx:30, 188`. Result drives non-blocking error UI.                                      |
| AppShell                            | PermapeopleAttributionFooter        | conditional render on `enrichment.source === 'permapeople'` | ✓ WIRED  | `AppShell.tsx:92`; `PermapeopleAttributionFooter.tsx:22-32`.                                              |
| App.tsx routes                      | feature components                  | `/setup`, `/plan`, `/catalog`, `/settings`           | ✓ WIRED  | `App.tsx:24-39`.                                                                                          |

### Data-Flow Trace (Level 4)

| Artifact          | Data Variable        | Source                                          | Produces Real Data | Status     |
| ----------------- | -------------------- | ----------------------------------------------- | ------------------ | ---------- |
| GanttView         | `events`             | `useDerivedSchedule()` → `generateSchedule(expandSuccessions(plan, catalog), catalog)` | Yes — pure derivation from real Zustand `plan` (no static array fallback) | ✓ FLOWING  |
| GanttView         | `plantings`          | `expandSuccessions(plan, merged).plantings`     | Yes — derived from live plan                                          | ✓ FLOWING  |
| SetupStepLocation | `lookup`             | `useLookupLocation(zip, year)` → real fetch of `/data/zones.{n}.json` | Yes — chunked JSON ships ~9,422 ZIPs                  | ✓ FLOWING  |
| CatalogBrowser    | `merged`             | `selectMerged` selector over `curatedCatalog (53)` + `customPlants` | Yes — 53-entry catalog                              | ✓ FLOWING  |
| MyPlanPanel       | `plantings`          | `usePlanStore((s) => s.plan?.plantings ?? [])`  | Yes — live store                                                      | ✓ FLOWING  |
| SettingsPanel     | `plan` (export)      | `usePlanStore.getState().plan`                  | Yes — live snapshot                                                   | ✓ FLOWING  |

### Behavioral Spot-Checks

| Behavior                                                                                  | Command                          | Result                                            | Status    |
| ----------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------- | --------- |
| Vitest suite passes (153 tests across 20 files including integration happy-path)          | `npx vitest run`                 | `Test Files 20 passed (20) / Tests 153 passed (153) / Duration 9.27s` | ✓ PASS    |
| Production TypeScript build succeeds                                                      | `npm run build`                  | `tsc -b && vite build` → 539.63 kB JS / 32.41 kB CSS / built in 549ms | ✓ PASS    |
| Zone data chunks present and well-formed JSON                                             | `ls public/data/zones.*.json`    | All 10 chunks present, 9,422 ZIP entries totaled  | ✓ PASS    |
| Catalog has ≥50 plant entries                                                             | grep `id:` in `catalog.ts`       | 53 entries (target: ≥50)                          | ✓ PASS    |

### Requirements Coverage

| Requirement | Description                                                                  | Status      | Evidence                                                                           |
| ----------- | ---------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| LOC-01      | ZIP → zone, last frost, first fall frost                                     | ✓ SATISFIED | `lookupLocation` returns `{zone, lastFrostDate, firstFrostDate}`.                  |
| LOC-02      | Build-time bundled zone data (no runtime API)                                | ✓ SATISFIED | `scripts/build-zone-data.ts`; chunks shipped under `/public/data/`.                |
| LOC-03      | Manual override on each derived value                                        | ✓ SATISFIED | `OverrideFlags` + per-field "Override" buttons in `SetupStepLocation`.             |
| LOC-04      | Unrecognized-ZIP graceful fallback                                           | ✓ SATISFIED | `lookup.status === 'not-found'` branch renders manual zone+frost form.             |
| LOC-05      | Setup wizard ZIP → plants → first gantt one continuous flow                  | ✓ SATISFIED | `SetupWizard` (3 steps) + Finish navigates to `/plan`.                             |
| CAT-01      | ~50 curated plants                                                           | ✓ SATISFIED | 53 entries in `src/assets/catalog.ts`.                                             |
| CAT-02      | Timing fields per plant                                                      | ✓ SATISFIED | `PlantTimingSchema` + sampled fields in catalog (verified `daysToMaturity`, `frostTolerance`, `season`, `successionIntervalDays`). |
| CAT-03      | Search + filter by name/category                                             | ✓ SATISFIED | `filters.ts` `applyFilters` + chips registry; `CatalogBrowser` uses it.            |
| CAT-04      | Custom plant first-class                                                     | ✓ SATISFIED | `CustomPlantModal.tsx` (762 LoC) + `upsertCustomPlant` setter; merged into catalog. |
| CAT-05      | Edit/delete custom plants                                                    | ✓ SATISFIED | `DeletePlantDialog.tsx` + `removeCustomPlantWithCascade` (D-15).                   |
| CAT-06      | Optional Permapeople enrichment, opt-in per plant                            | ✓ SATISFIED | Modal "Enrich" button calls `searchPlant`; never blocks save.                      |
| CAT-07      | Permapeople unreachable → core flows continue                                | ✓ SATISFIED | `searchPlant` discriminated union (never throws); `enrichment` is opt-in append.   |
| CAT-08      | CC BY-SA attribution displayed                                               | ✓ SATISFIED | `PermapeopleAttributionFooter.tsx` conditional render on enriched plants.          |
| SCH-06      | Succession engine support, capped at first-fall-frost                        | ✓ SATISFIED | `succession.ts` pure pre-pass; cap formula honored; `tests/domain/succession.test.ts` passing. |
| GANTT-01    | Horizontal-bar gantt, one row per planting (incl. successions)               | ✓ SATISFIED | `GanttView.tsx` rows from `expandSuccessions(...).plantings`.                      |
| GANTT-02    | Bars segmented by lifecycle phase, color-coded                               | ✓ SATISFIED | One rect per `ScheduleEvent`, fill from `lifecyclePalette` (6 phase colors).       |
| GANTT-03    | Time axis spans gardening season w/ default zoom                             | ✓ SATISFIED | `computeAxisBounds` snaps to month bounds; `PX_PER_DAY = 3` default.               |
| DATA-04    | Export full plan to JSON                                                     | ✓ SATISFIED | `exportPlan()` envelope + Blob download.                                           |
| DATA-05    | Import JSON with Zod validation + preview before overwrite                   | ✓ SATISFIED | `parseImportFile` + `ImportPreviewModal` confirm before `replacePlan`.             |

**Coverage:** 19/19 requirements satisfied.

### Anti-Patterns Found

| File                                            | Line  | Pattern                                                | Severity | Impact                                                                                            |
| ----------------------------------------------- | ----- | ------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------- |
| `src/domain/constraints.ts`                     | 28    | `_plant` unused parameter                              | ℹ️ Info  | Pre-existing lint nit, tracked in `deferred-items.md`. No runtime effect.                         |
| `src/domain/dateWrappers.ts`                    | 25/74/87/96 | Stale `eslint-disable-next-line no-restricted-syntax` directives | ℹ️ Info  | Pre-existing lint nit, tracked in `deferred-items.md`. No runtime effect.                  |
| `src/app/PlaceholderRoute.tsx` (used at /tasks) | n/a   | "Coming soon" copy in `/tasks` route                   | ℹ️ Info  | Phase 3 territory per ROADMAP — out of scope for Phase 2.                                          |

No goal-blocking anti-patterns detected. No TODO/FIXME/placeholder strings in any artifact that should deliver Phase 2 functionality. The single `/tasks` placeholder is the legitimate Phase 3 deferral pattern.

### CONTEXT Decision Compliance (D-01..D-29)

Spot-checked decisions against implementation:

- D-01..D-03 (3-step wizard, /setup always-available, sample-plan link): `SetupWizard.tsx:30-167`, `loadSamplePlan` setter wired.
- D-04..D-06 (build-time zone data, override, unrecognized-ZIP): all three branches in `SetupStepLocation.tsx`.
- D-07..D-09 (53 plants ≥ target 50, TS const catalog, full timing fields): `src/assets/catalog.ts`.
- D-15 cascade-delete: `removeCustomPlantWithCascade` in `planStore.ts:152-168`.
- D-17..D-19 (Worker proxy, opt-in enrichment, attribution): `cors-proxy/src/index.ts`, `searchPlant`, `PermapeopleAttributionFooter`.
- D-20..D-22 (succession cap, toggle UX, succession rows): `succession.ts`, `MyPlanPanel.tsx`, `GanttView.tsx`.
- D-23 (still bare-SVG, no SVAR/Frappe yet): `GanttView.tsx:9-12` confirms hand-rolled SVG.
- D-26 (data-event-id/data-event-type/data-planting-id attrs): `GanttView.tsx:258-260`.
- D-27..D-29 (envelope shape, preview-confirm import, schema migration): `exportPlan.ts:26-32`, `ImportPreviewModal`, `migrations.ts`.

All locked decisions respected.

### Human Verification Required

Manual smoke-test already performed by user (per phase context: "User confirmed all 5 success criteria pass in browser smoke-test today after 2 small fixes"). No additional human verification required for goal achievement.

### Gaps Summary

No gaps. All 5 success criteria deliver real, wired, data-flowing implementations. 153 unit/integration tests pass (including the canonical Flow A integration test that exercises ZIP → 5 plants → reload → state preserved). Production build succeeds. Permapeople degradation path verified by code review (`searchPlant` returns discriminated union, never throws; modal handles `unreachable` without blocking save). Lint nits in `deferred-items.md` are pre-existing and non-goal-blocking.

Phase 2 goal is achieved. Ready to proceed to Phase 3.

---

_Verified: 2026-04-27T00:39:05Z_
_Verifier: Claude (gsd-verifier)_
