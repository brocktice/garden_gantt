---
phase: 02-data-layer-first-end-to-end
plan: 10
subsystem: ui-integration
tags: [react, zustand, react-router, gantt, svg, succession, hash-router, permapeople, attribution]

# Dependency graph
requires:
  - phase: 01-foundation-schedule-engine
    provides: "GanttView bare-SVG component, useDerivedSchedule selector pattern, lifecyclePalette tokens, AppShell + App.tsx skeleton, samplePlan engine inputs"
  - phase: 02-data-layer-first-end-to-end
    provides: "Plan 02-04 planStore (usePlanStore), Plan 02-05 catalogStore (selectMerged), Plan 02-06 expandSuccessions, Plan 02-08 SetupWizard, Plan 02-09 CatalogBrowser + MyPlanPill + MyPlanPanel"
provides:
  - "GanttView reads usePlanStore (no longer samplePlan); empty state + season-spanning axis + succession row accents"
  - "useDerivedSchedule chains expandSuccessions → generateSchedule from real stores"
  - "EmptyGanttState component (CTA → /catalog)"
  - "AppShell hosts MyPlanPill (top-right of header), MyPlanPanel drawer, PermapeopleAttributionFooter"
  - "App.tsx routes: /, /plan, /setup, /catalog, /tasks, /settings (settings still on PlaceholderRoute pending 02-11)"
  - "/catalog added to NAV_LINKS"
  - "SetupStepPlants placeholder swapped → CatalogBrowser (same component reused inside wizard Step 2)"
  - "PermapeopleAttributionFooter (CC BY-SA 4.0; conditional on actual enriched plants — Pitfall J)"
  - "Per-planting startOffsetDays threaded through engine — succession rows now plant on distinct calendar dates"
affects: [02-11-settings-import-export, 02-12-phase-verification, 03-phase-3-gantt-spike]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure pre-pass extension: Planting.startOffsetDays additive field; engine reads it, expandSuccessions writes it on derived plantings; Phase 1's 7 snapshots remain byte-identical"
    - "Empty-state component pattern: feature folder owns its own <EmptyXState/> sibling with a CTA route navigation"
    - "Conditional global-chrome footer: scan stores for enrichment markers, NOT cache size, before rendering attribution"
    - "Hash-aware AppShell: read window.location.hash to drive conditional UI (MyPlanPill hidden on /setup when plan === null)"

key-files:
  created:
    - "src/features/gantt/EmptyGanttState.tsx"
    - "src/app/PermapeopleAttributionFooter.tsx"
  modified:
    - "src/features/gantt/GanttView.tsx"
    - "src/features/gantt/useDerivedSchedule.ts"
    - "src/app/AppShell.tsx"
    - "src/app/App.tsx"
    - "src/features/setup/SetupStepPlants.tsx"
    - "src/domain/types.ts (Rule 2 deviation — Planting.startOffsetDays)"
    - "src/domain/schemas.ts (Rule 2 deviation — PlantingSchema.startOffsetDays)"
    - "src/domain/scheduler.ts (Rule 2 deviation — addDays anchor by startOffsetDays)"
    - "src/domain/succession.ts (Rule 2 deviation — set startOffsetDays on derived plantings)"
    - "tests/__snapshots__/scheduler.snapshot.test.ts.snap (8th snapshot updated)"

key-decisions:
  - "Threaded a per-planting startOffsetDays field rather than splitting expandSuccessions vs the engine — additive change, Phase 1 invariants intact"
  - "MyPlanPill hidden ONLY on /setup when plan === null (D-19 first-run UX); visible everywhere else even with empty plan so users discover the drawer"
  - "/settings stays on PlaceholderRoute in this plan; Plan 02-11 owns the swap (depends_on 02-10)"
  - "Footer visibility scans plan.customPlants + catalogStore.customPlants for enrichment.source === 'permapeople' (Pitfall J — NOT permapeopleCache size)"
  - "GanttView re-uses expandSuccessions inline to derive its row list, mirroring the engine's view; same pure call, no duplication of cap math"

patterns-established:
  - "When fixing a Phase-N gap discovered late in execution, prefer additive schema changes (Planting.startOffsetDays) that keep Phase 1 snapshot fixtures byte-identical"
  - "Two-tier route table: live components (GanttView, SetupWizard, CatalogBrowser) live next to PlaceholderRoute stubs that document the next plan owning each swap"

requirements-completed: [GANTT-01, GANTT-02, GANTT-03, CAT-08, LOC-05]

# Metrics
duration: 12min
completed: 2026-04-26
---

# Phase 2 Plan 10: GanttView + AppShell Wiring Summary

**Real-plan-driven gantt: GanttView reads usePlanStore + expandSuccessions, succession rows plant on distinct dates via Planting.startOffsetDays, AppShell hosts MyPlanPill + MyPlanPanel + Permapeople attribution, /catalog route active, SetupStepPlants inlines CatalogBrowser.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-26T23:45:33Z
- **Completed:** 2026-04-26T23:57:45Z
- **Tasks:** 2 (+ 1 deviation fix commit)
- **Files modified:** 11 (2 created, 9 modified)

## Accomplishments
- GanttView no longer reads samplePlan — pulls plan from usePlanStore and catalog from useCatalogStore(selectMerged); falls back to <EmptyGanttState/> when plan is null or has zero plantings
- useDerivedSchedule chains expandSuccessions before generateSchedule so derived plantings get their own rows
- computeAxisBounds derives axis start/end from actual events (snapped to month boundaries per D-24); empty-events fallback spans the lastFrostDate's calendar year
- 4px stone-400 (#A8A29E) left-edge accent strip rendered behind every succession-derived row (D-22)
- data-event-id, data-event-type, data-planting-id attrs preserved on every rect (D-26 Phase 3 drag handles ready); no drag bindings (read-only invariant)
- AppShell hosts MyPlanPill in header right (hidden on /setup when plan === null), MyPlanPanel drawer (Radix portal), PermapeopleAttributionFooter at bottom
- App.tsx wires /setup → SetupWizard, /catalog → CatalogBrowser, /plan → GanttView; /catalog added to NAV_LINKS; /settings stays on PlaceholderRoute pending Plan 02-11
- SetupStepPlants placeholder replaced with `<CatalogBrowser/>` so wizard Step 2 reuses the same picker
- PermapeopleAttributionFooter renders only when ≥1 plant in plan.customPlants OR catalogStore.customPlants has enrichment.source === 'permapeople' (Pitfall J)
- Phase 1's 7 engine snapshots remain BYTE-IDENTICAL; 8th (succession) snapshot updated to reflect distinct succession dates
- 133 tests pass; build clean (542 ms; 534 KB JS, 32 KB CSS)

## Task Commits

1. **Deviation: per-planting startOffsetDays threading** — `f943c7b` (fix)
2. **Task 1: GanttView + useDerivedSchedule + EmptyGanttState** — `2add0f5` (feat)
3. **Task 2: AppShell + App.tsx routes + SetupStepPlants swap + PermapeopleAttributionFooter** — `9faf4e8` (feat)

## Files Created/Modified

**Created:**
- `src/features/gantt/EmptyGanttState.tsx` — empty-plot view with CTA → /catalog
- `src/app/PermapeopleAttributionFooter.tsx` — CC BY-SA 4.0 attribution; conditional on enrichment markers (Pitfall J)

**Modified:**
- `src/features/gantt/GanttView.tsx` — usePlanStore selector, expandSuccessions inlined for row derivation, computeAxisBounds, EmptyGanttState fallback, succession-groups <g>, succession-aware row labels + aria-labels
- `src/features/gantt/useDerivedSchedule.ts` — store-driven, chains expandSuccessions → generateSchedule
- `src/app/AppShell.tsx` — `/catalog` in NAV_LINKS, MyPlanPill in header right (hash-conditional), MyPlanPanel drawer + PermapeopleAttributionFooter mounted
- `src/app/App.tsx` — /setup → SetupWizard, /catalog → CatalogBrowser, /tasks copy refreshed, /settings still on PlaceholderRoute
- `src/features/setup/SetupStepPlants.tsx` — placeholder swapped → `<CatalogBrowser/>`
- `src/domain/types.ts` — Planting.startOffsetDays?: number (deviation)
- `src/domain/schemas.ts` — PlantingSchema.startOffsetDays (deviation)
- `src/domain/scheduler.ts` — `lastFrost = addDays(parseDate(...), planting.startOffsetDays ?? 0)` (deviation)
- `src/domain/succession.ts` — derived plantings carry `startOffsetDays = i * interval` (deviation)
- `tests/__snapshots__/scheduler.snapshot.test.ts.snap` — 8th (succession) snapshot updated (Phase 1's 7 byte-identical)

## Decisions Made
- **Inline `expandSuccessions` re-derivation in GanttView for row list.** The engine sees expanded plantings; the row list must match. Re-running the same pure call is cheaper than threading a separate "expanded plan" prop through the component tree.
- **MyPlanPill hidden only on /setup when plan === null.** Per UI-SPEC §10 line 517: first-run UX during the wizard hides global chrome until the user has committed to a location. Once plan exists OR they navigate away, the pill returns.
- **/settings deferred to Plan 02-11.** This plan owns App.tsx; Plan 02-11 owns SettingsPanel. To avoid a parallel-write conflict, we leave the placeholder here and Plan 02-11 (Wave 6) does a focused App.tsx route swap.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Per-planting startOffsetDays for succession date staggering**
- **Found during:** Plan setup — flagged in `<succession_date_offset_followup>` block of executor objective and Plan 02-06 SUMMARY (line 96-113 "Issues Encountered")
- **Issue:** Plan 02-06 shipped `expandSuccessions` returning N derived plantings with identical plant data — same calendar dates because the engine anchored everything to `plan.location.lastFrostDate` without per-planting offset. Phase 2 success criterion #3 ("succession rows appear automatically, capped at the season's first-fall-frost cutoff") is empty-shell unless each derived planting plants on a distinct date.
- **Fix:** Additive schema change. `Planting.startOffsetDays?: number` (default 0). `scheduler.ts` shifts the `lastFrost` anchor by that offset before computing all downstream events. `expandSuccessions` sets `startOffsetDays = i * successionIntervalDays` on derived plantings (preserving any pre-existing offset on the original).
- **Files modified:** src/domain/types.ts, src/domain/schemas.ts, src/domain/scheduler.ts, src/domain/succession.ts, tests/__snapshots__/scheduler.snapshot.test.ts.snap
- **Verification:** `npx tsc --noEmit` clean. `npm test -- --run tests/domain/` 6 files / 58 tests pass. Phase 1's 7 snapshots BYTE-IDENTICAL. The 8th (succession) snapshot updated — derived rows produce events on distinct calendar dates spaced by 14-day interval (lettuce in zone 7).
- **Committed in:** `f943c7b` (separate commit before Task 1)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical functionality flagged P0 by phase goal)
**Impact on plan:** Plan files_modified did NOT list domain files. Deviation kept additive: Phase 1 snapshot byte-identity preserved, no caller of `Planting` or `PlantingSchema` broke. Treated as in-scope per the executor's `<succession_date_offset_followup>` directive ("P0 for the phase goal — do not skip it without explicit documented compromise").

## Issues Encountered

None during planned work — both tasks executed exactly as specified. Pre-existing lint error on `src/domain/constraints.ts:28` (`'_plant' is defined but never used`) and 4 unused-eslint-disable warnings on `src/domain/dateWrappers.ts` are unchanged by this plan; already documented in `.planning/phases/02-data-layer-first-end-to-end/deferred-items.md`.

## Threat Flags

None. PermapeopleAttributionFooter introduces no new trust boundary — it reads from existing stores and renders text. The startOffsetDays field is set internally by `expandSuccessions` (never user input) and validated on import via Zod (PlantingSchema accepts integer; defensive parse already in place).

## Verification

```
$ npx tsc --noEmit                                                                # exit 0
$ npx eslint src/features/gantt/                                                  # exit 0
$ npx eslint src/app/AppShell.tsx src/app/App.tsx
       src/features/setup/SetupStepPlants.tsx
       src/app/PermapeopleAttributionFooter.tsx                                   # exit 0
$ npm test -- --run                                                               # 14 files / 133 tests pass
$ npm run build                                                                   # 542 ms; 534 KB JS, 32 KB CSS
$ grep -q 'usePlanStore' src/features/gantt/GanttView.tsx                         # OK
$ ! grep -q "import.*samplePlan.*from '../../samplePlan'" src/features/gantt/GanttView.tsx  # OK
$ grep -q 'expandSuccessions' src/features/gantt/useDerivedSchedule.ts            # OK
$ grep -q 'EmptyGanttState' src/features/gantt/GanttView.tsx                      # OK
$ grep -q 'computeAxisBounds' src/features/gantt/GanttView.tsx                    # OK
$ grep -q 'succession-groups\|successionIndex' src/features/gantt/GanttView.tsx   # OK
$ grep -q '#A8A29E' src/features/gantt/GanttView.tsx                              # OK
$ grep -q 'MyPlanPill\|MyPlanPanel\|PermapeopleAttributionFooter' src/app/AppShell.tsx  # OK
$ grep -q 'CatalogBrowser' src/app/App.tsx                                        # OK
$ grep -q "path=['\"]/catalog['\"]" src/app/App.tsx                               # OK
$ grep -q '<CatalogBrowser' src/features/setup/SetupStepPlants.tsx                # OK
$ grep -q 'Some plant data enriched from Permapeople.org (CC BY-SA 4.0)'
       src/app/PermapeopleAttributionFooter.tsx                                   # OK
```

## Next Phase Readiness

- **GANTT-01..03 + CAT-08 + LOC-05 satisfied.** /plan renders the user's actual plan with succession rows on distinct dates and CC BY-SA attribution where applicable.
- **Plan 02-11 (Wave 6) prereqs ready.** App.tsx is in a known state; the only remaining route swap is /settings → SettingsPanel. Plan 02-11 should add a single Route element change with no conflict on AppShell.
- **Phase 2 verification (Plan 02-12) ready to run.** All required components mounted, snapshot fixtures green, build clean.
- **Phase 3 spike (gantt library) handles ready.** data-event-id / data-event-type / data-planting-id present on every rect — drag bindings can attach without DOM restructuring.

## Self-Check: PASSED

- src/features/gantt/GanttView.tsx — FOUND
- src/features/gantt/useDerivedSchedule.ts — FOUND
- src/features/gantt/EmptyGanttState.tsx — FOUND
- src/app/AppShell.tsx — FOUND
- src/app/App.tsx — FOUND
- src/features/setup/SetupStepPlants.tsx — FOUND
- src/app/PermapeopleAttributionFooter.tsx — FOUND
- Commit f943c7b (fix: per-planting startOffsetDays) — FOUND
- Commit 2add0f5 (feat: GanttView + useDerivedSchedule + EmptyGanttState) — FOUND
- Commit 9faf4e8 (feat: AppShell + routes + SetupStepPlants + Permapeople footer) — FOUND

---
*Phase: 02-data-layer-first-end-to-end*
*Completed: 2026-04-26*
