---
phase: 04-polish-mobile-ship
fixed_at: 2026-04-27T16:00:00Z
review_path: .planning/phases/04-polish-mobile-ship/04-REVIEW.md
iteration: 1
findings_in_scope: 16
fixed: 16
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-04-27T16:00:00Z
**Source review:** .planning/phases/04-polish-mobile-ship/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 16 (3 BLOCKER + 13 WARNING; INFO out of scope per fix_scope=critical_warning)
- Fixed: 16
- Skipped: 0
- Status: all_fixed

All 3 BLOCKERs (CR-01, CR-02, CR-03) and all 13 WARNINGs (WR-01..WR-13) were
fixed. Each fix verified by running the relevant subset of the test suite
(passing). Full suite remains 442/443 passing — the single failure
(`tests/features/calendar/CalendarView.test.tsx > Test 4: ...recurring task
adds task entries`) is the same pre-existing date-dependent failure already
documented in 04-VERIFICATION.md (line 130) and is unrelated to these fixes.

## Fixed Issues

### CR-01: "Delete plant" button in edit mode does nothing

**Files modified:** `src/features/catalog/CustomPlantModal.tsx`, `src/features/catalog/CatalogBrowser.tsx`, `tests/features/catalog/CustomPlantModal.test.tsx`
**Commit:** df1ec36
**Applied fix:** Added `onRequestDelete?: (plant: Plant) => void` prop to
`CustomPlantModal`. Edit-mode Delete now: (a) closes the modal, then
(b) invokes `onRequestDelete(plant)`. `CatalogBrowser` passes
`handleDeleteRequest` for this prop, so the existing cascade-confirm flow
(zero-references → drop immediately; otherwise open `DeletePlantDialog`)
runs with the correct reference count. Defensive: button is hidden if
`onRequestDelete` is omitted, so the control never advertises behavior it
cannot perform. Two new tests pin the wiring + the defensive hide.

### CR-02: Custom plant slug collisions silently overwrite catalog entries

**Files modified:** `src/features/catalog/CustomPlantModal.tsx`, `tests/features/catalog/CustomPlantModal.test.tsx`
**Commit:** 6d54d70
**Applied fix:** Added a collision check in `handleSave`: when not editing,
if `merged.has(kebabCase(form.name))`, set an inline name error (`"A plant
with this name already exists. Pick a different name."`) and return
without invoking `upsertCatalog`/`upsertPlan`. Edit mode is exempt because
the id is fixed to `editingPlant.id`. New test asserts that typing
"Tomato" (curated id `tomato`) is rejected with the inline error and the
upsert never fires.

### CR-03: `clearPlan` leaves stale dirty counter, producing a phantom export-reminder banner

**Files modified:** `src/stores/planStore.ts`, `tests/stores/planStore.dirty-counter.test.ts`
**Commit:** 7fa41a4
**Applied fix:** `clearPlan` now calls
`useUIStore.getState().resetDirty()` after `set({ plan: null })` so the
export-reminder banner cannot linger after a plan reset (D-15 contract:
dirty counter mirrors plan state). `clearCompletedTaskIds` is
schema-meaningful (mutates exported `plan.completedTaskIds`) and now
calls `incrementDirty()` per D-14 — distinct from `toggleTaskCompletion`
which the test suite + plan 04-05 explicitly exclude as a per-occurrence
display flip (the existing pinning tests at lines 182-199 of
planStore.dirty-counter.test.ts continue to pass unmodified). Two new
tests cover the fixed behavior.

**Verifier note:** This addresses the verifier's failed must_have for
POL-10. The verifier explicitly recorded "clearPlan + clearCompletedTaskIds
are NOT [documented exclusions] — that is the actual bug" (04-VERIFICATION.md
line 108). `setLock` and `toggleTaskCompletion` remain D-14 exclusions per
plan 04-05 and pinning tests.

### WR-01: `EditPlantingModal.handleSave` always commits + dirties even when nothing changed

**Files modified:** `src/features/mobile/EditPlantingModal.tsx`
**Commit:** ae1bac4
**Applied fix:** `handleSave` now compares `startYMD`/`endYMD` against
`initialStartYMD`/`initialEndYMD`; when neither changed, it calls
`onOpenChange(false)` and returns without invoking `commitEdit`. Prevents
inflating `dirtySinceExport` on no-op opens.

### WR-02: `EditPlantingModal.handleDelete` removes a planting with no confirmation

**Files modified:** `src/features/mobile/EditPlantingModal.tsx`
**Commit:** ae1bac4 (combined with WR-01)
**Applied fix:** `handleDelete` now pushes a 5-second toast-with-undo
matching D-09 (reversible destructive ops) and the desktop pattern. Undo
button calls `getTemporal().undo()` to restore the planting. Toast title:
`"Deleted ${plant.name}."`.

### WR-03: `ConstraintTooltip` selector susceptible to CSS-syntax errors / injection

**Files modified:** `src/features/gantt/tooltip/ConstraintTooltip.tsx`, `src/features/onboarding/CoachMarks.tsx`
**Commit:** 5941fc6
**Applied fix:** Wrapped the interpolated value in `CSS.escape` for both
`document.querySelector` sites (`[data-event-id="..."]` in
ConstraintTooltip; `[data-coach-target="..."]` in CoachMarks).

### WR-04: `TasksDashboard.todayISO` computes "today" in UTC, not local time

**Files modified:** `src/domain/dateWrappers.ts`, `src/features/tasks/TasksDashboard.tsx`, `src/features/tasks/CustomTaskModal.tsx`
**Commit:** 2d2d5a1
**Applied fix:** Added `todayLocalYMD()` helper to `dateWrappers` (the
allowed site for raw `new Date()` per SCH-03). `TasksDashboard.todayISO`
and `CustomTaskModal.todayDate` now route through it. "Today" is a
display concept; storage convention (noon-UTC ISO) is unaffected.

### WR-05: `localStorage.setItem` monkey-patch loses original error if `onFull` throws

**Files modified:** `src/data/storage.ts`
**Commit:** 84cd776
**Applied fix:** Wrapped the `onFull()` call in try/catch; logs notifier
failure separately via `console.error` and always re-throws the original
QuotaExceededError so downstream consumers (zustand persist) see the
expected failure shape.

### WR-06: `AppShell` reads deprecated `navigator.platform` for Mac detection

**Files modified:** `src/app/AppShell.tsx`
**Commit:** a8bf59b
**Applied fix:** Replaced `navigator.platform` regex with a tiered probe:
prefer `navigator.userAgentData.platform` (Chromium 2023+), fall back to
`/Mac|iPhone|iPad/i.test(navigator.userAgent)`. Returns `false` if
`navigator` is undefined.

### WR-07: `SettingsPanel.lastExport` resets to "never" on every navigation

**Files modified:** `src/features/settings/SettingsPanel.tsx`
**Commit:** 49a778c
**Applied fix:** Removed component-local `useState` for `lastExport` and
swapped the JSX to read `useUIStore((s) => s.exportReminder.lastExportedAt)`,
which is already populated by `exportPlan()` on success. Display format:
`"Last exported: ${iso.slice(0,10)}"` (date-only).

### WR-08: `SetupStepLocation` effect can dispatch `onValidLocation` repeatedly

**Files modified:** `src/features/setup/SetupStepLocation.tsx`
**Commit:** 4f2740f
**Applied fix:** Ref-stabilized `onValidLocation` and `onLocationInvalid`
via two `useRef` + companion sync `useEffect`s. The validation effect now
calls `onValidRef.current(...)` / `onInvalidRef.current(...)` and lists
only data inputs in its dep array (zip, lookup, overrides, manualZone,
manualLast, manualFirst). Future inline-arrow callers cannot create
re-entry storms.

### WR-09: `ImportPreviewModal` nests a Dialog inside another Dialog

**Files modified:** `src/features/settings/ImportPreviewModal.tsx`
**Commit:** 90d3d67
**Applied fix:** Hoisted the second-step "Replace plan" confirm Dialog
out of the outer `DialogContent` into a sibling under a Fragment.
Component state (`confirmOpen`, `setConfirmOpen`, `handleConfirm`)
remains shared. Radix portals render both Dialogs at the document body
regardless of JSX position; the change avoids the per-Dialog focus-trap
collision.

### WR-10: `useKeyboardBarDrag` `format()` formats UTCDate in local TZ

**Files modified:** `src/features/keyboard-drag/useKeyboardBarDrag.ts`
**Commit:** 751e4d0
**Applied fix:** Replaced `date-fns/{addDays,format,parseISO}` with
`dateWrappers.{addDays,formatDateShort,parseDate}` so the announcer YMD
matches the rest of the app's noon-UTC convention. Also added a
`pendingDeltaDays === 0` guard inside `stage()` to suppress the
"Pending move +0 days" no-op announcement when the user staged then
canceled a delta.

### WR-11: `CoachMarks` declares `aria-modal="true"` without making the page inert

**Files modified:** `src/features/onboarding/CoachMarks.tsx`, `tests/features/onboarding/CoachMarks.test.tsx`
**Commit:** c6ff4cd
**Applied fix:** Dropped `aria-modal="true"` from the callout `<div>`.
Coach marks are advisory non-blocking UI (Esc + click-backdrop dismiss);
focus is not trapped, so the previous attribute lied to screen readers.
`role="dialog"` + `aria-labelledby` remain. Updated the pinning test to
expect the attribute to be absent.

### WR-12: `useToastStore.useEffect` can dismiss many toasts on a single past-state delta

**Files modified:** `src/ui/toast/ToastHost.tsx`
**Commit:** d802853
**Applied fix:** Replaced the bulk-iterate dismiss with a per-undo
correlation: find the most-recent toast whose
`mountTimePastStatesCount === pastStatesCount + 1` (the toast for the
action that was just undone) and dismiss only that one. Stacked
toast-with-undo entries no longer drop on a single Cmd-Z.

### WR-13: `CatalogBrowser.clearFilters` dispatches O(N) toggles instead of one set

**Files modified:** `src/stores/uiStore.ts`, `src/features/catalog/CatalogBrowser.tsx`
**Commit:** 455d9af
**Applied fix:** Added `clearFilterChips: () => set({ filterChips: new Set() })`
action to `uiStore`. `CatalogBrowser.clearFilters` now calls
`clearFilterChips()` instead of looping `toggleChip(id)`. One re-render
instead of N; no observable intermediate states.

## Skipped Issues

None — all 16 in-scope findings (3 BLOCKERs + 13 WARNINGs) were fixed.

The 6 INFO findings (IN-01..IN-06) are out of scope per `fix_scope=critical_warning`:

- IN-01: dead-code branch in `useCoachMarks` route check
- IN-02: `CustomTaskModal.dueISO` inlines noon-UTC convention instead of `ymdToISONoon`
- IN-03: `SetupStepLocation` re-implements `ymdToISONoon`/`isoNoonToYmd`
- IN-04: `MyPlanPanel.successionCounts` couples to id-suffix format
- IN-05: `exportPlan` revokes object URL synchronously after `.click()`
- IN-06: `ToastHost.ToastItemView` non-null assertion is redundant

These can be queued for a follow-up polish pass.

## Verifier Gap Closure

This fix-pass closes both code-side gaps from 04-VERIFICATION.md:

| Gap | Status |
|-----|--------|
| POL-06 (CR-01 + CR-02): destructive confirmations broken | CLOSED — both BLOCKERs fixed + tested |
| POL-10 (CR-03): clearPlan phantom dirty counter | CLOSED — `resetDirty()` wired + tested |

The 3 deferred human-verification gates (POL-07 perf trace, DEPLOY-01
Cloudflare OAuth, DEPLOY-03 live-URL header smoke) are unchanged and
remain pending per Plan 04-07's `autonomous: false` declaration.

---

_Fixed: 2026-04-27T16:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
