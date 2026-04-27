---
phase: 04-polish-mobile-ship
plan: 04
subsystem: onboarding
tags: [coach-marks, onboarding, portal, settings, a11y, persist]
requirements: [POL-02]
dependency-graph:
  requires:
    - "src/stores/uiStore.ts onboarding slice + setCoachMarksDismissed (Plan 04-01)"
    - "src/ui/toast/useToast.ts pushToast helper (Plan 04-03)"
    - "src/features/mobile/useIsMobile (Plan 04-01/02 — used transitively via LockToggle)"
  provides:
    - "src/features/onboarding/CoachMarks.tsx — portal-mounted 4-mark overlay (no library)"
    - "src/features/onboarding/useCoachMarks.ts — controller hook (route + dismissed gate, staged reveal, advance/dismiss)"
    - "src/features/onboarding/coachMarks.types.ts — MARKS content table (verbatim UI-SPEC copy)"
    - "data-coach-target anchors on catalog button, first gantt bar, first lock toggle, calendar tab"
    - "SettingsPanel 'Reset onboarding' row (D-06 re-arm path)"
  affects:
    - "Plan 06 will mount <CoachMarks /> in AppShell (NOT modified here)"
tech-stack:
  added: []
  patterns:
    - "Hand-rolled coach marks via createPortal + getBoundingClientRect (analog to ConstraintTooltip.tsx)"
    - "Document keydown listener with isFormFocus guard (analog to historyBindings.ts:24-29)"
    - "data-coach-target attribute selector (analog to data-event-id used by ConstraintTooltip)"
    - "Single-source MARKS const driving both content table and visibleMarks staging"
key-files:
  created:
    - src/features/onboarding/coachMarks.types.ts
    - src/features/onboarding/useCoachMarks.ts
    - src/features/onboarding/CoachMarks.tsx
    - tests/features/onboarding/useCoachMarks.test.ts
    - tests/features/onboarding/CoachMarks.test.tsx
    - tests/features/settings/SettingsPanel.test.tsx
  modified:
    - src/features/catalog/MyPlanPanel.tsx
    - src/app/PlanViewTabs.tsx
    - src/features/gantt/lock/LockToggle.tsx
    - src/features/gantt/GanttView.tsx
    - src/features/settings/SettingsPanel.tsx
decisions:
  - "Both 'Browse plants' and 'Add more plants' buttons in MyPlanPanel get data-coach-target=catalog-button. The two render in mutually-exclusive empty/non-empty branches, so document.querySelector resolves to whichever is mounted at coach-mark time."
  - "isFirstBar prop on DraggableBar (computed as i===0 && ei===0 in render loop) drives both data-coach-target='first-bar' on the wrapping <g> AND propagation to LockToggle.isFirst → data-coach-target='first-lock-toggle'. Single boolean, two anchors."
  - "Reset onboarding lives in its own 'Onboarding' Settings section above 'Danger zone' (D-07: separate from Clear plan)."
  - "Dismiss model: single boolean (uiStore.onboarding.coachMarksDismissed). Per-mark progress is local hook state (not persisted) — first dismiss/Got-it action ends the tour permanently."
  - "queueMicrotask(setAnchorPos) on mount + microtask reset on inactive — same pattern as ConstraintTooltip.tsx to satisfy React Compiler's setState-in-effect rule."
metrics:
  duration: ~7 minutes
  completed: 2026-04-27
---

# Phase 04 Plan 04: Onboarding Coach Marks Summary

POL-02 advances: hand-rolled (no library) coach marks portal renders 4 marks on /plan with single-dismissal model; staged reveal so mark 1 (catalog button) shows immediately and marks 2-4 unlock once the user adds a planting; Settings re-arm path lands as a 'Reset onboarding' row.

## Tasks

| Task | Name                                                                                  | Commits                | Files                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | useCoachMarks hook + MARKS content table + data-coach-target attributes on 4 anchors  | 3e8e44b (RED), 6eefd79 (GREEN) | src/features/onboarding/{coachMarks.types,useCoachMarks}.ts, src/features/catalog/MyPlanPanel.tsx, src/app/PlanViewTabs.tsx, src/features/gantt/lock/LockToggle.tsx, src/features/gantt/GanttView.tsx, tests/features/onboarding/useCoachMarks.test.ts |
| 2    | CoachMarks portal component + Settings Reset-onboarding row                           | b5e526e (RED), 5942e5e (GREEN) | src/features/onboarding/CoachMarks.tsx, src/features/settings/SettingsPanel.tsx, tests/features/onboarding/CoachMarks.test.tsx, tests/features/settings/SettingsPanel.test.tsx                  |

## What Shipped

### Task 1 — useCoachMarks controller + content table + 4 anchor attributes

- **`coachMarks.types.ts`**: `MARK_IDS` const (`['catalog-button', 'first-bar', 'first-lock-toggle', 'calendar-tab']`) + `MARKS` table with verbatim UI-SPEC heading + body copy. `requiresPlantings: false` only for mark 1.
- **`useCoachMarks(currentRoute)`**: returns `{ active, currentMark, currentIndex, totalCount, isLast, dismiss, advance }`. Gates on (a) `uiStore.onboarding.coachMarksDismissed`, (b) route prefix `/plan` or `/plan?…`, (c) plantings count → visibleMarks. `advance()` on the last mark calls `setDismissed(true)` (Got-it semantics). `useMemo`-wrapped `visibleMarks` keyed on `plantingCount` (T-04-04-01 stable refs).
- **Anchor attributes added:**
  - `MyPlanPanel.tsx`: both the empty-state "Browse plants" CTA and the footer "Add more plants" CTA receive `data-coach-target="catalog-button"`.
  - `PlanViewTabs.tsx`: Calendar tab `<button>` receives `data-coach-target="calendar-tab"`.
  - `LockToggle.tsx`: new `isFirst?: boolean` prop renders `data-coach-target="first-lock-toggle"` when true.
  - `GanttView.tsx`: new `isFirstBar?: boolean` prop on DraggableBar drives `data-coach-target="first-bar"` on the bar's wrapping `<g>` AND propagates to LockToggle.isFirst. Computed at render as `i===0 && ei===0` (first row, first event).

### Task 2 — Hand-rolled CoachMarks portal + Settings Reset row

- **`CoachMarks.tsx`**: thin React component using `createPortal(…, document.body)`. Renders backdrop (z-40, dismiss-on-click) + callout `<div role="dialog" aria-modal="true">` (z-50). Position computed via `getBoundingClientRect()` of the active anchor; recomputed on `resize` + `scroll` (capturing). Esc → dismiss, Enter → advance, with `isFormFocus` guard (T-04-04-02 mitigation) so typing in catalog search doesn't dismiss the tour. Numbered indicator "{i+1} of {total}" upper-right of bubble; "Skip tour" (ghost) + "Next →"/"Got it" (primary) buttons.
- **`SettingsPanel.tsx`**: new "Onboarding" `<section>` between the Import section and Danger zone, containing label "Reset onboarding", helper text "Show the Plan-page tour again on your next visit.", and a secondary "Reset" button that calls `useUIStore.getState().setCoachMarksDismissed(false)` and pushes the confirmation toast `Tour will show next time you visit Plan.` (success variant, 5s).
- Plan 06 mounts `<CoachMarks />` in AppShell — this plan does NOT touch AppShell.

## Verification

- `npm test -- --run tests/features/onboarding/useCoachMarks.test.ts` → 15/15 pass
- `npm test -- --run tests/features/onboarding/CoachMarks.test.tsx` → 13/13 pass
- `npm test -- --run tests/features/settings/SettingsPanel.test.tsx` → 5/5 pass
- `npm test -- --run` (full suite) → 410/411 pass; sole failure is the pre-existing `tests/features/calendar/CalendarView.test.tsx` Test 4 documented in `deferred-items.md` (verified pre-existing in 04-01-SUMMARY + 04-03-SUMMARY).
- `npm run build` → succeeds
- `npm run lint` → 1 error, all in `src/features/catalog/CatalogBrowser.tsx` (pre-existing from Plan 03 — see Deviations).

## Acceptance Criteria

| Criterion                                                                                          | Result   |
| -------------------------------------------------------------------------------------------------- | -------- |
| `grep -c "MARKS" src/features/onboarding/coachMarks.types.ts >= 1`                                 | 1        |
| `grep -c "Pick your plants here" src/features/onboarding/coachMarks.types.ts == 1`                 | 1        |
| `grep -c "Drag to adjust dates" src/features/onboarding/coachMarks.types.ts == 1`                  | 1        |
| `grep -c "Lock to pin a date" src/features/onboarding/coachMarks.types.ts == 1`                    | 1        |
| `grep -c "Switch to calendar view" src/features/onboarding/coachMarks.types.ts == 1`               | 1        |
| `grep -c "useCoachMarks" src/features/onboarding/useCoachMarks.ts >= 1`                            | 2        |
| `data-coach-target="catalog-button"` hits in src/features/catalog/                                 | 2 (empty + footer button) |
| `data-coach-target="first-bar"` (or `first-bar` token) hits in src/features/gantt/GanttView.tsx    | 2        |
| `first-lock-toggle` hits in src/features/gantt/lock/                                               | 1        |
| `data-coach-target="calendar-tab"` hits in src/app/                                                | 1        |
| `grep -c "createPortal" src/features/onboarding/CoachMarks.tsx >= 1`                               | 2 (import + call) |
| `grep -c "role=\"dialog\"" src/features/onboarding/CoachMarks.tsx >= 1`                            | 1        |
| `grep -c "aria-modal=\"true\"" src/features/onboarding/CoachMarks.tsx >= 1`                        | 1        |
| `grep -c "Skip tour" src/features/onboarding/CoachMarks.tsx == 1`                                  | 1        |
| `grep -c "Got it" src/features/onboarding/CoachMarks.tsx == 1`                                     | 1        |
| `grep -c "Next →" src/features/onboarding/CoachMarks.tsx == 1`                                     | 1        |
| `grep -c "'Escape'" src/features/onboarding/CoachMarks.tsx >= 1`                                   | 1        |
| `grep -c "Reset onboarding" src/features/settings/SettingsPanel.tsx >= 1`                          | 2 (heading + label) |
| `grep -c "setCoachMarksDismissed(false" src/features/settings/SettingsPanel.tsx >= 1`              | 1        |
| `grep -c "Tour will show next time you visit Plan" src/features/settings/SettingsPanel.tsx >= 1`   | 1        |
| `npm test useCoachMarks.test.ts` exits 0                                                           | yes      |
| `npm test CoachMarks.test.tsx` exits 0                                                             | yes      |
| `npm test SettingsPanel.test.tsx` exits 0                                                          | yes      |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `useToastStore` field name in test was `items` (incorrect) — actual field is `toasts`**
- **Found during:** Task 2 GREEN verification
- **Issue:** SettingsPanel test asserted `useToastStore.getState().items.length` but the store defines `toasts` (per Plan 03's ToastHost.tsx implementation).
- **Fix:** Updated assertion to `toasts`.
- **Commit:** rolled into 5942e5e.

**2. [Rule 1 - Bug] Initial RED test attempted `result.current.advance()` 3 times in a single `act()` block**
- **Found during:** Task 1 GREEN verification
- **Issue:** Each call captured the closed-over `safeIndex` from the initial render, so all three advance() calls saw `safeIndex=0` and only set state to 1 (clobbering subsequent calls). Test expected `currentIndex=3` after 3 advances; actual was 1.
- **Fix:** Split each `advance()` into its own `act()` block so React commits the state update between calls. Functionally equivalent for the hook contract; the multi-act pattern matches how the real CoachMarks UI advances (one event per click).
- **Commit:** rolled into 6eefd79 (after a fixup edit between RED commit and GREEN commit).

### Out-of-Scope Pre-existing Issues

- `src/features/catalog/CatalogBrowser.tsx:49:5` — `react-hooks/set-state-in-effect` lint error introduced by Plan 03's `loadingFlash` flip-on-mount pattern. NOT introduced by this plan; touching it would expand scope. Pre-existing per Plan 03's commit `7039ae6`. Out of scope per executor Rule 3 scope boundary; logged here for visibility.
- `tests/features/calendar/CalendarView.test.tsx` Test 4 — pre-existing recurring-task occurrence-count off-by-one documented in 04-01-SUMMARY and 04-03-SUMMARY. Out of scope.
- `src/domain/dateWrappers.ts` 4 pre-existing unused eslint-disable warnings — pre-existing.

## Auth Gates

None.

## TDD Gate Compliance

Per-task RED→GREEN gates:

- Task 1 RED: `3e8e44b` (`test(04-04): add failing tests for useCoachMarks hook + MARKS table`) — file-not-found resolution failure observed
- Task 1 GREEN: `6eefd79` (`feat(04-04): add useCoachMarks hook + MARKS table + data-coach-target anchors`) — 15/15 pass
- Task 2 RED: `b5e526e` (`test(04-04): add failing tests for CoachMarks portal + Settings Reset row`) — 5 failures observed
- Task 2 GREEN: `5942e5e` (`feat(04-04): add CoachMarks portal + Settings Reset onboarding row`) — 18/18 pass

No REFACTOR commits required.

## Known Stubs

None. CoachMarks portal is fully wired; Plan 06 mounts the component in AppShell as planned.

## Threat Register Status

| Threat | Disposition | Status |
|---|---|---|
| T-04-04-01 DoS — re-render storm if MARKS recomputed each render | mitigate | Mitigated. `MARKS` is a module-level `const`; `visibleMarks` is `useMemo`-wrapped keyed on plantingCount. Hook returns referentially stable currentMark across re-renders. |
| T-04-04-02 Repudiation — Esc dismisses unintentionally during catalog search | mitigate | Mitigated. `isFormFocus(e.target)` guard skips the document keydown listener when `target.matches('input, textarea, [contenteditable]')`. Test asserts Esc inside an input does NOT dismiss. |
| T-04-04-03 Tampering — data-coach-target attribute hijacked | accept | No surface change; single-user local app. |
| T-04-04-04 Information Disclosure — coach mark heading/body leaks UI structure | accept | Static copy; no dynamic data exposure. |

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced beyond what the plan's `<threat_model>` documents.

## Self-Check: PASSED

Verified files exist:
- src/features/onboarding/coachMarks.types.ts FOUND
- src/features/onboarding/useCoachMarks.ts FOUND
- src/features/onboarding/CoachMarks.tsx FOUND
- tests/features/onboarding/useCoachMarks.test.ts FOUND
- tests/features/onboarding/CoachMarks.test.tsx FOUND
- tests/features/settings/SettingsPanel.test.tsx FOUND

Verified commits exist (in `git log --oneline 3cba789..HEAD`):
- 3e8e44b test(04-04): add failing tests for useCoachMarks hook + MARKS table — FOUND
- 6eefd79 feat(04-04): add useCoachMarks hook + MARKS table + data-coach-target anchors — FOUND
- b5e526e test(04-04): add failing tests for CoachMarks portal + Settings Reset row — FOUND
- 5942e5e feat(04-04): add CoachMarks portal + Settings Reset onboarding row — FOUND

## Manual Smoke Recipe (for orchestrator's Wave 2 checkpoint)

1. `npm run dev`, clear localStorage on the dev origin.
2. Visit `/plan` → coach mark 1 (catalog button anchor) appears with backdrop dim. Numbered indicator reads "1 of 1" (no plantings yet).
3. Press Esc → portal dismisses. Reload → coach marks gone (persisted).
4. Open Settings → "Reset onboarding" → click Reset → confirmation toast "Tour will show next time you visit Plan."
5. Revisit `/plan` → mark 1 reappears.
6. Add a plant via the catalog button; return to /plan → numbered indicator now reads "1 of 4" and Next → button advances through marks 2 (first bar), 3 (lock toggle), 4 (calendar tab) → Got it dismisses.
