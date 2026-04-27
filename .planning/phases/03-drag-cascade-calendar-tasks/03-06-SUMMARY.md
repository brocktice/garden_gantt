---
phase: 03-drag-cascade-calendar-tasks
plan: 06
subsystem: lock-ui-and-shell
tags: [lock-toggle, alt-click, keybinding, undo-redo, header, constraint-tooltip-mount, foreignObject, theme-tokens, react, typescript, svg]

# Dependency graph
requires:
  - phase: 03-drag-cascade-calendar-tasks
    plan: 01
    provides: Planting.locks shape, generateScheduleWithLocks, completedTaskIds
  - phase: 03-drag-cascade-calendar-tasks
    plan: 02
    provides: planStore.setLock, getTemporal/useTemporalStore, useHistoryKeybindings, dragStore + uiStore Phase 3 slots
  - phase: 03-drag-cascade-calendar-tasks
    plan: 03
    provides: DraggableBar sub-component (data-event-id/data-planting-id/data-event-type), ConstraintTooltip portaled component
provides:
  - LockToggle component (16x16 hover-revealed icon; 24x24 hit-target; locked → always-visible filled Lock; calls planStore.setLock)
  - useLockKeybinding hook (document Alt-click → toggles lock for the bar under the cursor)
  - GanttView extension — each DraggableBar wraps a 'group' class, an outline ring rect when locked, and a <foreignObject>-mounted LockToggle at top-right
  - AppShell extension — mounts useHistoryKeybindings + useLockKeybinding once; renders Undo / Redo header buttons on /plan + /tasks; mounts <ConstraintTooltip /> at top level
  - DragLayer cleanup — temporary in-DragLayer ConstraintTooltip mount removed (now lives in AppShell)
  - index.css @theme tokens — --color-lifecycle-locked, --spacing-lock-icon, --spacing-lock-hit
affects: [03-07 integration smoke (now exercises full LockToggle + Cmd-Z + AppShell wiring path)]

# Tech tracking
tech-stack:
  added: []      # All Phase 3 deps already installed in Plan 03-02; no new deps in this plan.
  patterns:
    - "foreignObject + LockToggle mounting strategy: HTML <button> inside SVG <g> via <foreignObject>. Per-bar <g> uses Tailwind 'group' so LockToggle's 'group-hover:opacity-100' reveals on hover. LockToggle is the LAST child of <g> so it draws above the fill+ring within that bar."
    - "Lock outline ring as an extra <rect> with stroke=var(--color-lifecycle-locked) and fill=none, drawn AFTER the fill rect inside the same <g>. pointerEvents='none' so the ring never steals clicks."
    - "stopPropagation in LockToggle.onClick prevents the document Alt-click listener from double-firing when a normal click on the lock button happens with Alt held."
    - "Native title attribute for header Undo / Redo hover hint — Radix Tooltip 200ms-delay polish per UI-SPEC §11 deferred to Phase 4."
    - "Document keybinding mounts at AppShell level (single canonical mount), not inside route components — survives view changes."

key-files:
  created:
    - src/features/gantt/lock/LockToggle.tsx
    - src/features/gantt/lock/useLockKeybinding.ts
    - tests/features/gantt/lock/LockToggle.test.tsx
  modified:
    - src/index.css
    - src/features/gantt/GanttView.tsx
    - src/app/AppShell.tsx
    - src/features/gantt/drag/DragLayer.tsx

key-decisions:
  - "Phase 3 P06: LockToggle rendered on ALL 6 lifecycle event types (per RESEARCH §Pitfall 9), including derived non-draggable bars (harden-off, germination-window). Locking holds them fixed during cascade reflow even though they are not user-draggable."
  - "Phase 3 P06: Lock outline ring uses var(--color-lifecycle-locked) token (not a hex inline) for theme consistency. The token resolves at runtime via Tailwind v4's @theme block — verified by build output."
  - "Phase 3 P06: foreignObject hosts the LockToggle inside the SVG. The lock icon is the LAST child of the per-bar <g> so it draws above the fill+ring of that bar. Z-order trade-off vs UI-SPEC §'Z-order in the gantt SVG' (which calls for 'Lock icons (top-most, ALWAYS visible above ghost)'): for Phase 3 this is best-effort — during a drag the GhostOverlay <g> renders AFTER the committed-bars <g>, so the ghost can momentarily cover the lock icon. Phase 4 may extract a separate top-most <LockToggleLayer> if user testing surfaces confusion."
  - "Phase 3 P06: stopPropagation in LockToggle.onClick is the canonical fix for the LockToggle/useLockKeybinding double-fire risk (T-03-06-02). Test 7 in LockToggle.test.tsx pins the contract: a click event WITHOUT altKey does NOT call setLock through the document listener; the LockToggle's own onClick is the only setter path for normal clicks."
  - "Phase 3 P06: Header Undo/Redo uses native title attribute for hover hint (Cmd-Z / Ctrl-Z platform-detected). Radix Tooltip 200ms-delay polish per UI-SPEC §11 is documented as a Phase 4 polish follow-up — the native title attr is functional, accessible (browser-default tooltip), and avoids adding a Radix Tooltip wrapper boundary around two buttons just for hover hint timing."
  - "Phase 3 P06: ConstraintTooltip mount migrated from inside DragLayer.tsx (Plan 03-03 temporary) to AppShell top-level. Survives view changes per UI-SPEC §4 placement note. No Plan 03-03 tests broke — the ConstraintTooltip test (8 specs) renders the component standalone, never through DragLayer, so the mount-site change is invisible to those tests."
  - "Phase 3 P06: persisted Phase 3 @theme tokens consolidated in src/index.css — drag tokens (Plan 03-03), drawer/tab-strip tokens (Plan 03-04), and lock tokens (this plan) all in the canonical @theme block. No duplications; the Plan 03-04 prerequisites (--spacing-drawer-w, --spacing-tab-strip-h) were verified present before adding lock tokens."
  - "Phase 3 P06: visible Undo/Redo buttons gated by currentHash.startsWith('#/plan') || currentHash.startsWith('#/tasks') per UI-SPEC §11. /setup, /catalog, /settings get the keyboard shortcut (no UI affordance) — by design: those routes don't have plan-mutation surface that benefits from a visible affordance."

patterns-established:
  - "HTML-in-SVG mount via foreignObject: any future per-bar HTML control (selection menu, succession indicator, etc.) follows the same pattern — foreignObject inside the per-bar <g>, child of <g> at the position you want in the z-order."
  - "Document-level shortcut mounts live at AppShell once (not in route components). Already established by useHistoryKeybindings (Plan 03-02); useLockKeybinding follows the same pattern."
  - "Outline ring as separate <rect> with pointerEvents='none' is the canonical SVG pattern for adding a state outline without breaking interaction routing (the underlying fill rect still receives clicks/taps)."

requirements-completed: [GANTT-08, GANTT-10]

# Metrics
duration: ~5min
completed: 2026-04-27
---

# Phase 3 Plan 06: Lock UI + AppShell Wiring Summary

**Lock UI + AppShell global mounts: every gantt bar now exposes a hover-revealed Lock icon (always-visible filled Lock when locked) + 2px stone-700 outline ring; Alt-click anywhere on a bar toggles the lock; the AppShell mounts the Cmd-Z / Cmd-Shift-Z / Ctrl-Y keybindings, the document Alt-click listener, the visible Undo / Redo header buttons (on /plan + /tasks), and the portaled ConstraintTooltip (migrated from DragLayer).**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-27T04:51:14Z
- **Completed:** 2026-04-27T04:56:13Z
- **Tasks:** 2 (Task 1 TDD — RED → GREEN; Task 2 single feat commit, no new tests per plan — integration smoke covered in Plan 03-07)
- **Test growth:** 256 → 265 (+9 new tests; all 5 LockToggle + 4 useLockKeybinding cases pass)
- **Files created/modified:** 7 (3 created, 4 modified)

## Accomplishments

- Lock UI ships on every lifecycle bar (all 6 event types — including derived non-draggable harden-off / germination-window per RESEARCH §Pitfall 9). Hover reveals a 16x16 LockOpen icon at top-right; clicking switches the bar to a filled Lock with a 2px stone-700 outline ring that stays always-visible until unlocked. Alt-click anywhere on a bar achieves the same toggle as a power-user shortcut (D-11).
- AppShell now owns three global mounts: useHistoryKeybindings (Cmd-Z + Ctrl-Y), useLockKeybinding (Alt-click), and the portaled <ConstraintTooltip />. All three survive route changes — the tooltip in particular was a temporary mount inside DragLayer until this plan moved it up.
- Header gets visible Undo / Redo buttons on /plan and /tasks routes per UI-SPEC §11. Disabled when the respective stack is empty (`pastStates.length === 0` / `futureStates.length === 0` from useTemporalStore). Native title attribute provides the platform-aware hover hint (⌘Z on Mac, Ctrl+Z elsewhere) — Radix Tooltip polish deferred to Phase 4.
- Phase 3 @theme tokens are now consolidated in src/index.css: drag tokens (Plan 03-03), calendar+drawer tokens (Plan 03-04), and lock tokens (this plan) all live in the canonical @theme block.

## Task Commits

1. **Task 1 RED:** `8bf4bfb` (test) — 9 failing tests for LockToggle + useLockKeybinding
2. **Task 1 GREEN:** `d95924f` (feat) — LockToggle component + useLockKeybinding hook + index.css lock tokens
3. **Task 2:** `84633c3` (feat) — GanttView per-bar LockToggle wrap + AppShell mounts + DragLayer ConstraintTooltip removal

## Files Created/Modified

### Created

- `src/features/gantt/lock/LockToggle.tsx` — 16x16 Lucide Lock/LockOpen icon button; 24x24 hit-target wrapper; `opacity-0 group-hover:opacity-100` when unlocked, `opacity-100` filled-Lock when locked; aria-label format `Lock|Unlock {plantName} {eventType}`; onClick stops propagation + calls planStore.setLock.
- `src/features/gantt/lock/useLockKeybinding.ts` — document `click` listener with altKey + closest('[data-event-id][data-planting-id][data-event-type]') guards; reads current lock state from planStore and toggles via setLock.
- `tests/features/gantt/lock/LockToggle.test.tsx` — 9 specs: 5 LockToggle (hover-reveal, locked-always-visible, click→setLock, aria-label, hit-target sizing), 4 useLockKeybinding (Alt-click, no-altKey ignored, no-data-attrs ignored, toggle existing state).

### Modified

- `src/index.css` — appended Phase 3 lock tokens to the existing @theme block: `--color-lifecycle-locked: #44403C` (stone-700, WCAG ≥3:1 against all 6 lifecycle fills), `--spacing-lock-icon: 16px`, `--spacing-lock-hit: 24px`. Verified that Plan 03-03 drag tokens (`--spacing-tooltip-min-w/max-w`, `--spacing-bar-min-drag-px`, `@keyframes ghost-pulse`) and Plan 03-04 drawer tokens (`--spacing-drawer-w`, `--spacing-tab-strip-h`) are already in place.
- `src/features/gantt/GanttView.tsx` — each `<DraggableBar>` outer `<g>` now has a `'group'` class; if `p.locks?.[e.type] === true`, an extra `<rect>` is rendered as the outline ring (stroke=var(--color-lifecycle-locked), strokeWidth=2, fill=none, pointerEvents=none); a `<foreignObject>` (24×24) at `(x + width - 24 - 2, BAR_Y_OFFSET - 8)` hosts a `<LockToggle>` for every lifecycle bar. The `cn()` helper composes the `'group'` + cursor classes.
- `src/app/AppShell.tsx` — imports `useHistoryKeybindings`, `useLockKeybinding`, `getTemporal`, `useTemporalStore`, `Undo2`, `Redo2`, `ConstraintTooltip`. Calls the two keybinding hooks once at the shell body. Renders a header Undo/Redo button group when `currentHash.startsWith('#/plan') || currentHash.startsWith('#/tasks')` — disabled state, platform-aware title attr. Mounts `<ConstraintTooltip />` at the bottom of the shell (sibling to MyPlanPanel + PermapeopleAttributionFooter).
- `src/features/gantt/drag/DragLayer.tsx` — removed the import + the inline mount of `<ConstraintTooltip />`; left a comment noting the migration to AppShell.

## Decisions Made

See `key-decisions:` in frontmatter. Highlights answering the SUMMARY output spec questions:

- **foreignObject + LockToggle mounting strategy used in GanttView:** per-bar `<foreignObject>` (24×24, last child of the bar's `<g>`) hosts the `<LockToggle>` button. The wrapper `<g>` carries `class="group"` so the LockToggle's `group-hover:opacity-100` reveal works. **Z-order trade-off:** the foreignObject is the last child of the committed bar's `<g>` so it draws above its own fill+ring. The committed-bars `<g>` renders BEFORE the GhostOverlay `<g>`, so during a drag the ghost overlay can momentarily cover the lock icon — accepted for Phase 3 best-effort. UI-SPEC's "Lock icons (top-most, ALWAYS visible above ghost)" would require a separate top-level `<LockToggleLayer>` at the end of the SVG; deferred to Phase 4 only if user testing surfaces confusion.
- **stopPropagation fix in LockToggle.onClick:** prevents the document Alt-click listener from double-firing when a user clicks the lock button with Alt held. Test 7 (regular click ignored) and Test 3 (single setLock call per click) pin the contract.
- **ConstraintTooltip mount migration:** moved from DragLayer.tsx (Plan 03-03 temporary) → AppShell.tsx (top-level portaled). Plan 03-03 had 8 ConstraintTooltip specs; all 8 still pass because they render the component standalone, never through DragLayer.
- **Radix Tooltip vs native title attribute:** native title attribute used for header Undo/Redo hover hint. Radix Tooltip wrapper deferred to Phase 4 polish — UI-SPEC §11's "200ms delay" specification is a polish detail; the native browser tooltip is functional + accessible today.
- **Header button anatomy:** UI-SPEC §11 calls for `36×36`. Tailwind's `w-9 h-9` resolves to exactly 36×36 — implementation matches the spec. (Plan output spec asked about possible 9×9 vs 36×36 confusion; in Tailwind v4 `w-9` is `2.25rem = 36px` per the default scale.)
- **All three plans' index.css token additions confirmed in the canonical @theme block:** drag (Plan 03-03), calendar/drawer (Plan 03-04), lock (this plan) — verified by `grep` against final src/index.css.

## Deviations from Plan

None — plan executed as written. The verification command (`npm run build`) exits 0; the full test suite (265/265) passes; lint clean (0 errors; 4 pre-existing dateWrappers warnings out of scope, already logged in Plan 03-02's deferred-items.md).

## Issues Encountered

- One initial `useEffect` import in the test file went unused (the test mounts `useLockKeybinding` via a sub-component, not directly). Removed in a follow-up edit before commit; lint clean afterward. Trivial — not worth a separate deviation entry.
- The plan's grep done-criteria for "ConstraintTooltip removed from DragLayer" suggested counting via `grep -v '^//' | grep -c "ConstraintTooltip"`. JSX block comments (`{/* ... */}`) are not stripped by `^//`, so the grep returned 1 (the migration-note comment). The actual mount + import are both removed — verified by `grep -n "ConstraintTooltip" src/features/gantt/drag/DragLayer.tsx` returning a single comment line at line 100.

## Threat Flags

None — this plan operates within the trust boundaries documented in the plan's `<threat_model>`:

- **T-03-06-01 (third-party widget injects [data-event-id] attrs):** accepted (single-user local app, no third-party widgets).
- **T-03-06-02 (LockToggle.onClick + useLockKeybinding double-fire):** mitigated. Test 7 in LockToggle.test.tsx + the stopPropagation guard in LockToggle.onClick.
- **T-03-06-03 (header buttons title attr leaks platform):** accepted — user knows their own platform.
- **T-03-06-04 (Alt + click-spam DoS):** mitigated. planStore.handleSet rAF debounce coalesces; zundo `limit: 20` caps history.
- **T-03-06-05 (locked event somehow gets dragged):** accepted at UI level. Engine + cascade respect locks (Plan 03-01 data path); UI-level "disable drag on locked" is a Phase 4 polish if user testing surfaces confusion.

## Self-Check: PASSED

```text
FOUND: src/features/gantt/lock/LockToggle.tsx
FOUND: src/features/gantt/lock/useLockKeybinding.ts
FOUND: src/index.css (modified — --color-lifecycle-locked, --spacing-lock-icon, --spacing-lock-hit)
FOUND: src/features/gantt/GanttView.tsx (modified — LockToggle + foreignObject + outline ring)
FOUND: src/app/AppShell.tsx (modified — keybinding mounts + Undo/Redo + ConstraintTooltip)
FOUND: src/features/gantt/drag/DragLayer.tsx (modified — ConstraintTooltip mount removed)
FOUND: tests/features/gantt/lock/LockToggle.test.tsx (9 specs)

Commits in git log:
FOUND: 8bf4bfb test(03-06): add failing tests for LockToggle + useLockKeybinding
FOUND: d95924f feat(03-06): LockToggle component + useLockKeybinding hook + lock CSS tokens
FOUND: 84633c3 feat(03-06): GanttView per-bar LockToggle + AppShell undo/redo + tooltip mount
```

Test suite: 35 files / 265 tests passing. `npm run build` exits 0. `npm run lint` clean (0 errors; 4 pre-existing dateWrappers warnings out of scope). `npx tsc --noEmit` clean.

## Next Phase Readiness

- **Plan 03-07 (integration smoke):** unblocked. The full Lock UI + Cmd-Z + Alt-click + ConstraintTooltip path is wired through AppShell; integration smoke can exercise the end-to-end "drag → lock → undo" loop without further code changes.
- **Phase 4 follow-ups documented in code:**
  - GanttView.tsx: separate top-most `<LockToggleLayer>` `<g>` (instead of per-bar foreignObject) if user testing wants lock icons visible above the ghost overlay during drag.
  - AppShell.tsx: replace native `title` attr on Undo/Redo with Radix Tooltip (200ms delay) per UI-SPEC §11 polish detail.
  - LockToggle.tsx: 3-shot Alt-click tip (UI-SPEC §Lock toggle copy) — uiStore.altClickTipDismissCount slot already exists from Plan 03-02; UI surface deferred.

---
*Phase: 03-drag-cascade-calendar-tasks*
*Plan: 06*
*Completed: 2026-04-27*
