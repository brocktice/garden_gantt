---
phase: 02-data-layer-first-end-to-end
plan: 09
subsystem: ui
tags: [react, radix, zustand, lucide, permapeople, catalog, dialog, drawer]

# Dependency graph
requires:
  - phase: 02-data-layer-first-end-to-end
    provides: catalogStore + planStore setters (incl. removeCustomPlantWithCascade), uiStore filterChips/searchQuery/myPlanPanelOpen, src/data/permapeople.ts (searchPlant), Radix-wrapped UI primitives, expandSuccessions, PlantSchema
provides:
  - CatalogBrowser slice (search + 8 chips + responsive grid + pinned add-custom card)
  - PlantCard with Available/Added states (D-11) and per-card Custom dropdown (D-15)
  - AddCustomPlantCard pinned first-cell tile (D-13)
  - CustomPlantModal (Create + Edit + Permapeople enrich, save-never-blocked)
  - MyPlanPill counter + MyPlanPanel right-side slide-out drawer (UI-SPEC §5)
  - DeletePlantDialog cascade-confirmation (D-15) wired to removeCustomPlantWithCascade
  - Pure filters.ts (OR-within-group, AND-across-groups; em-dash↔hyphen tolerant)
affects:
  - 02-10 (AppShell wiring of MyPlanPill / MyPlanPanel; /catalog route)
  - 02-11 (Settings export/import — consumes same custom-plant store conventions)
  - 02-12 (verification + Permapeople end-to-end tests)
  - 03 (drag interactions on the gantt — selection state may extend MyPlanPanel)

# Tech tracking
tech-stack:
  added: []  # all libraries pre-installed by Plan 02-07 (Radix primitives) + 02-03 (permapeople)
  patterns:
    - "Pinned-first-cell grid: AddCustomPlantCard rendered as the first <li> outside .map()"
    - "Two-store custom-plant write: catalogStore is canonical home; planStore.customPlants holds export-portable copy"
    - "Right-side slide-out drawer using Radix Dialog Content + data-state translate-x transition"
    - "Cascade-confirm Dialog isolated in DeletePlantDialog; CatalogBrowser computes refCount and routes confirmed deletes through planStore.removeCustomPlantWithCascade"
    - "Modal reset via key-on-mount instead of setState-in-effect (react-hooks compliance)"

key-files:
  created:
    - src/features/catalog/filters.ts (pure)
    - src/features/catalog/PlantCard.tsx
    - src/features/catalog/CatalogBrowser.tsx
    - src/features/catalog/CustomPlantModal.tsx
    - src/features/catalog/MyPlanPill.tsx
    - src/features/catalog/MyPlanPanel.tsx
    - src/features/catalog/DeletePlantDialog.tsx
    - tests/features/catalog/CatalogBrowser.cascade.test.ts
  modified: []

key-decisions:
  - "Custom-plant save writes to BOTH catalogStore (canonical browse home) AND planStore.customPlants (export portability) — documented in CustomPlantModal.handleSave."
  - "Cascade test runs at the store-contract level (no @testing-library/react installed); UI cascade wiring verified via grep + TS compile."
  - "Modal form reset uses a parent <CustomPlantModal> wrapper that re-keys the inner <CustomPlantModalInner> on (open, editingPlant.id) — avoids react-hooks setState-in-effect rule."
  - "Lucide-react v1 has no Onion/Garlic glyph; allium falls back to Sprout per UI-SPEC §4 implementation note."
  - "Permapeople description preview is text-content only (T-02-28 mitigation) — no innerHTML."

patterns-established:
  - "Radix slide-out drawer using data-[state=open]:translate-x-0 / data-[state=closed]:translate-x-full"
  - "Filter chip OR-within-group / AND-across-groups predicate registry in pure module"
  - "Re-keying child component on identity change as alternative to setState-in-effect for form reset"

requirements-completed: [CAT-03, CAT-04, CAT-05, CAT-06, CAT-07, CAT-08, GANTT-01]

# Metrics
duration: 62min
completed: 2026-04-26
---

# Phase 02 Plan 09: Catalog Browser, Custom Plant Authoring, My Plan Drawer Summary

**Catalog feature slice (browser + card + modal + drawer + cascade-delete) wired to existing stores; primary data-entry surface for the first end-to-end demo.**

## Performance

- **Duration:** 62 min
- **Started:** 2026-04-26T22:45:00Z
- **Completed:** 2026-04-26T23:47:13Z
- **Tasks:** 4
- **Files modified:** 8 (7 new src/, 1 new test)

## Accomplishments
- Pure filter logic with em-dash↔hyphen tolerant case-insensitive search and OR-within-group / AND-across-groups chip semantics (UI-SPEC §3 default).
- PlantCard supports Available/Added states with green-700 border + bg-green-50 + CheckCircle2 indicator (D-11), Custom badge + DropdownMenu Edit/Delete for source==='custom' (D-12, D-15), and Permapeople sparkles indicator (CAT-08).
- CustomPlantModal provides full PlantTiming form (8 timing fields), Duplicate-from-catalog baseline (D-14), Permapeople enrich block with all four states (idle/loading/success/error) — failure does NOT block save (CAT-07).
- MyPlanPill renders count or "No plants yet" (aria-disabled at zero, focusable for AT). MyPlanPanel is a Radix slide-out drawer with location summary, succession Switch (only when intervalDays > 0, D-21), live succession-count caption via expandSuccessions, remove confirmation, and footer navigation.
- DeletePlantDialog (D-15) opens when a custom plant being deleted has ≥1 referencing planting; confirmation routes through usePlanStore.removeCustomPlantWithCascade, dropping the plant from BOTH stores AND filtering plan.plantings.
- Cascade test at the store-contract level passes (`tests/features/catalog/CatalogBrowser.cascade.test.ts`).

## Task Commits

Each task was committed atomically:

1. **Task 1: filters.ts + PlantCard + AddCustomPlantCard** — `cb0188e` (feat)
2. **Task 2: CustomPlantModal with Permapeople enrichment** — `9fcdb57` (feat)
3. **Task 3: MyPlanPill + MyPlanPanel slide-out drawer** — `ddbba0a` (feat)
4. **Task 4: CatalogBrowser + DeletePlantDialog with D-15 cascade** — `6a28028` (feat)

## Files Created/Modified
- `src/features/catalog/filters.ts` — Pure chip predicate registry + applyFilters search/sort.
- `src/features/catalog/PlantCard.tsx` — Card visual + AddCustomPlantCard pinned tile.
- `src/features/catalog/CatalogBrowser.tsx` — Search + chip row + grid + modal/dialog hosting.
- `src/features/catalog/CustomPlantModal.tsx` — CRUD form + Permapeople enrich + Zod validation.
- `src/features/catalog/MyPlanPill.tsx` — Header counter pill (mounted by Plan 02-10).
- `src/features/catalog/MyPlanPanel.tsx` — Right-side drawer with succession Switch + remove flow.
- `src/features/catalog/DeletePlantDialog.tsx` — Cascade-confirmation dialog used by CatalogBrowser.
- `tests/features/catalog/CatalogBrowser.cascade.test.ts` — Verifies removeCustomPlantWithCascade contract.

## Decisions Made
- Two-store custom-plant write on save (catalogStore + planStore.customPlants) for browse vs. export-portability separation. Comment in CustomPlantModal.handleSave documents the rationale.
- Form reset implemented via outer/inner component split with a `key` derived from `(open, editingPlant.id)` rather than a setState-in-effect block. Keeps lint clean and is functionally equivalent.
- Cascade test verifies the store-level invariant rather than driving the UI through @testing-library/react (which is not installed). UI wiring is verified by grep + TypeScript compile.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1 ↔ Task 4 import ordering**
- **Found during:** Task 1
- **Issue:** Plan called for CatalogBrowser to ship in Task 1 with a stubbed onDelete and be re-edited in Task 4. CatalogBrowser imports CustomPlantModal (Task 2) and DeletePlantDialog (Task 4); committing it in Task 1 would produce a non-compiling intermediate commit.
- **Fix:** Reordered task contents so each commit compiles cleanly: Task 1 ships filters.ts + PlantCard.tsx; Task 2 ships CustomPlantModal.tsx; Task 3 ships MyPlanPill + MyPlanPanel; Task 4 ships CatalogBrowser.tsx + DeletePlantDialog.tsx + cascade test. The final file inventory and behavior match the plan.
- **Files modified:** as listed above
- **Verification:** `git log --oneline` shows 4 atomic commits; `npx tsc --noEmit` clean after each; `npx vitest run` 133/133 passing.
- **Committed in:** spread across cb0188e / 9fcdb57 / ddbba0a / 6a28028

**2. [Rule 1 - Bug] react-hooks/set-state-in-effect lint failure in CustomPlantModal**
- **Found during:** Task 2
- **Issue:** Original implementation used `useEffect(() => { if (open) setForm(...) ... }, [open, editingPlant])` to reset form state when the modal opened with a different editing target. ESLint flagged this as a setState-in-effect cascade.
- **Fix:** Split the component into a thin `<CustomPlantModal>` wrapper that re-keys the inner `<CustomPlantModalInner>` on `(open, editingPlant.id)`. Inner component initializes state once via the lazy initializer.
- **Files modified:** src/features/catalog/CustomPlantModal.tsx
- **Verification:** `npx eslint src/features/catalog/` clean; modal still resets on open and on switching between Create/Edit targets.
- **Committed in:** 9fcdb57

**3. [Rule 1 - Bug] react-hooks/rules-of-hooks lint failure on `useEnrichField`**
- **Found during:** Task 2
- **Issue:** A helper function named `useEnrichField` was treated by ESLint as a hook (because of the `use` prefix) and flagged because it was called inside event handlers / arrow callbacks.
- **Fix:** Renamed `useEnrichField` → `applyEnrichField`. It was never a hook; the `use` prefix was a naming accident.
- **Files modified:** src/features/catalog/CustomPlantModal.tsx
- **Verification:** ESLint clean.
- **Committed in:** 9fcdb57

**4. [Rule 1 - Bug] exactOptionalPropertyTypes: true type errors**
- **Found during:** Task 1 (PlantCard) + Task 2 (CustomPlantModal.buildPlant)
- **Issue:** Project uses TS `exactOptionalPropertyTypes: true`. Setting `onEdit: foo ? f : undefined` in JSX or `scientificName: x.trim() || undefined` in object literals violated the strictness — undefined cannot be assigned to a property whose type does not include undefined.
- **Fix:** PlantCard props widened to `(() => void) | undefined`. CustomPlantModal.buildPlant constructs the Plant with required fields then conditionally assigns optional fields (`if (sci) plant.scientificName = sci`), avoiding inline-undefined.
- **Files modified:** src/features/catalog/PlantCard.tsx, src/features/catalog/CustomPlantModal.tsx
- **Verification:** `npx tsc --noEmit` clean.
- **Committed in:** cb0188e + 9fcdb57

---

**Total deviations:** 4 auto-fixed (1 blocking task ordering, 3 bug/lint).
**Impact on plan:** All within Rule 1/3 scope; behavior matches plan; no scope creep. The task ordering deviation kept every intermediate commit in a compilable state, which is required for atomic commits per the project workflow.

## Issues Encountered
- `@testing-library/react` is not installed and the Vitest config glob is `tests/**/*.test.ts` (not `.tsx`). The cascade test was therefore implemented at the store-contract level rather than driving the dropdown menu via Testing Library. The UI cascade path is still covered by grep verification (`removeCustomPlantWithCascade` invoked from CatalogBrowser.tsx, `DeletePlantDialog` mounted with computed `referencingCount`) and TypeScript compile.
- Lucide-react v1 lacks `Onion`/`Garlic` glyphs; `allium` falls back to `Sprout` per UI-SPEC §4 implementation note.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Plan 02-10 can mount `<MyPlanPill />` in AppShell header (right side) and `<MyPlanPanel />` as a sibling of `<main>`. Both are self-contained and read uiStore/planStore directly.
- Plan 02-10 can register `/catalog` and wire `<CatalogBrowser />` as the route element.
- Permapeople CC BY-SA 4.0 attribution: per-card Sparkles indicator with `<title>` is shipped (CAT-08); the global footer line ("Some plant data enriched from Permapeople.org (CC BY-SA 4.0).") is owned by Plan 02-10's AppShell extension.

## Self-Check: PASSED

Verified files:
- src/features/catalog/filters.ts — FOUND
- src/features/catalog/PlantCard.tsx — FOUND
- src/features/catalog/CatalogBrowser.tsx — FOUND
- src/features/catalog/CustomPlantModal.tsx — FOUND
- src/features/catalog/MyPlanPill.tsx — FOUND
- src/features/catalog/MyPlanPanel.tsx — FOUND
- src/features/catalog/DeletePlantDialog.tsx — FOUND
- tests/features/catalog/CatalogBrowser.cascade.test.ts — FOUND

Verified commits:
- cb0188e — FOUND (Task 1: filters + PlantCard)
- 9fcdb57 — FOUND (Task 2: CustomPlantModal)
- ddbba0a — FOUND (Task 3: MyPlanPill + MyPlanPanel)
- 6a28028 — FOUND (Task 4: CatalogBrowser + DeletePlantDialog + cascade test)

Verified gates:
- `npx tsc --noEmit` clean across the worktree
- `npx eslint src/features/catalog/` clean
- `npx vitest run` 133/133 passing (full suite, including new cascade test)
- All 24 grep verification probes from the plan PASS

---
*Phase: 02-data-layer-first-end-to-end*
*Completed: 2026-04-26*
