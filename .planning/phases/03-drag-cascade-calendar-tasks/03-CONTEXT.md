# Phase 3: Drag, Cascade, Calendar & Tasks - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

The product becomes the product. Phase 1 shipped the engine + persistence + read-only SVG gantt; Phase 2 wired real ZIP/catalog data through it. Phase 3 makes the gantt **interactive**: bars can be dragged with constraint enforcement and downstream cascade, edits are undoable, a calendar view reads the same `ScheduleEvent[]`, and a Today/This Week task dashboard projects engine-emitted task events for daily use.

**In scope:**
- Drag interactions on existing bare-SVG `GanttView.tsx` via `@dnd-kit/core` (whole-bar drag for `indoor-start` / `transplant` / `direct-sow`; right-edge resize for `harvest-window`)
- Constraint clamp via `domain/constraints.ts` `canMove()` evaluated every drag tick inside a @dnd-kit `modifier`
- Ghost cascade preview via `<DragOverlay>` — live re-run of `generateSchedule(plan + transientEdit, catalog)` on rAF-throttled pointermove
- Snap-back UX with floating-with-cursor tooltip → sticky inline pill explaining the constraint reason (GANTT-09)
- Per-event lock toggle (hover-revealed icon + Alt-click power shortcut), locked events held fixed during cascade reflow (GANTT-08)
- Undo/redo via **zundo** `temporal` middleware — `limit: 20`, plan-wide partialize, Cmd/Ctrl-Z + Cmd/Ctrl-Shift-Z bindings (GANTT-10)
- Calendar view via FullCalendar 6.1 (`@fullcalendar/react` + `daygrid` + `timegrid` + `interaction` plugins), reading the same `ScheduleEvent[]` (CAL-01..03)
- Single `#/plan` route + tab strip with `?view=calendar` URL search param; React.lazy(FullCalendar) so gantt-only sessions don't pay the calendar bundle cost
- Day-detail side drawer triggered by FullCalendar `dateClick`, with `?date=YYYY-MM-DD` URL state for refresh-restore + back-button-closes
- Tasks dashboard at `#/tasks` — Today / This Week / Overdue (today merges overdue with red flag); group-by plant default with toggle to category; per-row checkboxes; custom-task authoring modal opened from `+ New task`
- Custom task authoring (TaskRecurrence shape already in `types.ts`); recurring-task per-occurrence completion via `${taskId}:${ISODate}` composite key

**Out of scope:**
- Mobile-default-to-calendar (CAL-04) — Phase 4 (the URL-param navigation is designed to make this a one-line viewport check at route mount)
- Keyboard-driven drag fallback (POL-08) — Phase 4 a11y pass; the snap-back pill is built portaled now so `aria-live=polite` + keyboard-dismiss wire in without restructuring
- WCAG AA contrast audit (POL-09) — Phase 4
- 60fps stress-testing on 200-event plans (POL-07) — Phase 4 (Phase 3 wires rAF throttling + memoized per-bar selectors so the perf foundation is in place)
- Bulk task multi-select / shift-click — explicit deferral; per-row checkboxes only for v1
- Onboarding wizard, empty/error/loading polish, export-reminder UX — Phase 4
- SVAR React Gantt / Frappe Gantt adoption — explicitly rejected (see D-01)
- Per-phase drag of arbitrary bars — explicit deferral (anchor-only model is the v1 surface)
- Zoom controls / scale picker — not in Phase 3 scope; if added, snap stays day-level
- Time of day on tasks — all date-only, UTC-noon discipline preserved

</domain>

<decisions>
## Implementation Decisions

### Gantt drag library + integration

- **D-01:** **Bare SVG + `@dnd-kit/core`** — keep `GanttView.tsx` and `timeScale.ts`. SVAR React Gantt 2.6 was researched and rejected: its `intercept("drag-task")` API is binary allow/block (cannot clamp candidates to a constraint boundary or surface per-reason tooltip text — breaks GANTT-09), and multi-segment-per-row bars (needed for the indoor → harden → transplant → harvest single-row layout already shipped in Phase 2) are PRO-only/paid in SVAR. Adopting SVAR would force discarding the working `GanttView.tsx` + `timeScale.ts` pair plus a post-commit-revert workaround for clamping. @dnd-kit's `modifiers` API runs every drag tick and can transform the candidate transform, which is a near-perfect fit for `canMove(...).finalDate` clamp; `<DragOverlay>` is a ready-made ghost layer for the cascade preview.

- **D-02:** Use `useDraggable` + `PointerSensor` (no `useSortable` — Garden Gantt does not reorder rows). Wire `canMove(event, candidate, plan, plant)` inside a custom `modifier` so clamp + tooltip-reason are computed server-side-of-the-drag-handler before the candidate transform is applied to the bar. Pointer events run on @dnd-kit's own listeners; do NOT add raw `pointerdown`/`pointermove` to bars.

- **D-03:** rAF-throttle pointermove updates to the transient drag store. `requestAnimationFrame` wrap the `setTransientEdit()` call so 60 Hz pointer events collapse into one update per frame. Engine cost over 5–50 plantings × ~6 events = sub-millisecond — the bottleneck is React reconciliation of bars, not engine work.

### Drag scope — what's draggable

- **D-04:** Draggable bars (whole-bar move):
  - `indoor-start` — moves the start of the indoor seeding window; cascade pushes harden-off + transplant + harvest forward
  - `transplant` — anchor for indoor-start plants; cascade adjusts harden-off (backward) + harvest-window (forward)
  - `direct-sow` — anchor for direct-sow plants; cascade pushes germination-window + harvest-window forward
- **D-05:** Right-edge resize (extends end date only, drag-left does not shorten below `daysToMaturity`):
  - `harvest-window` — extend the trailing harvest window by dragging its right edge. Min width = `daysToMaturity` derived end; max = first-fall-frost.
- **D-06:** **Not draggable** — pointer-events-none on the drag layer (still clickable for select/inspect, still receive lock-toggle hover affordance):
  - Derived range bars: `harden-off`, `germination-window` (computed between anchors; moving the anchor moves these)
  - Auto-task events: `water-seedlings`, `harden-off-day`, `fertilize-at-flowering` (engine-projected from anchors via `taskEmitter`)
- **D-07:** Snap to whole-day boundaries always, regardless of zoom level. Stored UTC-noon ISO dates; gardener vocabulary is "May 15," not "week of." If horizontal density makes day-snap jittery at season-zoom, fix with a 6 px/day floor on the time axis (force horizontal scroll inside `<div overflow-x-auto>`), not by changing snap granularity.

### Constraint enforcement + snap-back tooltip

- **D-08:** Constraint clamp lives inside the @dnd-kit `modifier` — `canMove(event, candidate, plan, plant)` evaluates every tick; if `clamped: true`, the modifier returns the clamped candidate transform (so the bar physically stops at the boundary), and writes the `reasons[]` to a `lastConstraintViolation` slot in `uiStore` (transient).
- **D-09:** Tooltip placement: **floating-with-cursor during snap-back animation (~400ms ease-out)**, then transition into a **sticky inline pill** (above or below the constrained bar based on viewport-edge proximity). Pill persists until the next drag-start OR an 8-second timeout, whichever comes first. Min width 240px, max width 320px. Border accent uses the lifecycle palette token of the constrained event type.
- **D-10:** Pill is a **portaled component** built from day 1 so the Phase 4 a11y pass can wire `aria-live="polite"`, keyboard-dismiss (Esc), and tab-focusability without restructuring. Phase 3 ships visual polish; Phase 4 adds a11y plumbing.

### Lock/pin UX

- **D-11:** Lock affordance: **hover-revealed 16×16 lock icon at the top-right corner of each bar**, always-visible (filled-lock variant) when the event is locked. Wrap the icon in an invisible 24×24 hit-target rect for Phase 4 mobile (tap-and-hold equivalent ships in Phase 4). Plus **Alt-click anywhere on the bar** as a power-user shortcut.
- **D-12:** Locked-state visual treatment: filled lock icon (Lucide `Lock`) **plus** a 2px outline ring around the bar in a new `--lifecycle-locked` palette token (added to `src/index.css @theme`). Hatched fill and desaturation were considered and rejected — both lose color signal on 20px-tall bars.
- **D-13:** Lock state lives on the `Planting` (per event-type) — extend `Planting` interface with `locks?: Partial<Record<EventType, boolean>>`. Persisted via Zustand persist; tracked by zundo (Cmd-Z reverses lock toggles). Cascade reflow (in `generateSchedule` or a thin wrapper) checks the lock map and skips re-projecting locked events.

### Undo/redo (zundo)

- **D-14:** **Zundo `temporal` middleware** for Cmd-Z / Cmd-Shift-Z. Config: `limit: 20`, `partialize` over the entire `plan` slice (excluding transient drag preview state), `wrapTemporal` order is **inner-most temporal, outer-most persist** so persisted state is the materialized plan and history is in-memory only.
- **D-15:** **Plan-wide undo scope** (not drag-only). Undo reverses any mutation to `plan`: drags + planting add/remove + lock toggles + custom task add/edit/delete + completion toggles + location overrides. The "regression" frustration trigger means Cmd-Z must feel uniform — "undo my last action" should never silently fail because the user's last action wasn't a drag.
- **D-16:** `handleSet` callback rAF-debounces drag-stream updates so a drag's many transient updates collapse into **one** history entry on commit (pointerup), not 60+ per second.
- **D-17:** Transient drag preview state (`transientEdit`, `dragPreviewEvents`, `lastConstraintViolation`) lives in a **separate non-temporal store** (or a partialize-excluded slice) so ghost-render churn never enters history. Only the committed `ScheduleEdit` append on pointerup creates a history entry.
- **D-18:** Keybindings: Cmd-Z (Mac) / Ctrl-Z (other) → `temporal.getState().undo()`. Cmd-Shift-Z / Ctrl-Shift-Z → `redo()`. Wire on the document at AppShell mount; suppress when focus is inside a `<input>`/`<textarea>`/`[contenteditable]`.

### Cascade preview

- **D-19:** **Live re-run `generateSchedule(plan + transientEdit, catalog)` on rAF-throttled pointermove.** Single source of truth: whatever the user previews is exactly what commit will produce. Engine cost over 30–300 events is sub-ms — well inside 16ms frame budget.
- **D-20:** Render strategy: **two-layer ghost overlay** — committed bars stay frozen during drag (no re-render), ghost layer is a separate `<g>` rendering the transient `ScheduleEvent[]` at 60% opacity with the lifecycle-palette accent border. On commit, the ghost layer collapses back into the committed layer.
- **D-21:** Use `useMemo` per-bar selectors keyed on `(eventId, start, end, edited)` so React only re-renders bars whose dates actually changed during the drag.

### Calendar view

- **D-22:** **FullCalendar 6.1** (already locked in PROJECT.md TL;DR). Plugins: `@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`. No `@fullcalendar/resource-*` premium plugins.
- **D-23:** Views: month (default) + week. No day-list view. `headerToolbar` shows view-switch buttons.
- **D-24:** Event mapping: `ScheduleEvent[]` → FullCalendar event objects via a pure `selectEventsForCalendar(events, tasks)` selector. Each event carries `extendedProps.eventType` so styling (color from `lifecyclePalette`) and click-handling can dispatch on type. Auto-tasks (`water-seedlings`, `harden-off-day`, `fertilize-at-flowering`) AND user custom tasks both render as calendar events alongside lifecycle anchors.
- **D-25:** Read-only on calendar — no drag interactions on calendar events in Phase 3. Drag stays on the gantt; calendar is for surveying. Phase 4 may revisit if user demand surfaces.
- **D-26:** `dayMaxEvents={3}` so cells with >3 events show a `+more` link that uses FullCalendar's built-in popover for overflow. The custom day-detail drawer (D-29) is for deliberate day inspection, not overflow.

### Calendar↔Gantt navigation

- **D-27:** **Single `#/plan` route + tab strip with `?view=calendar` URL search param.** React Router 7 `useSearchParams('view')`. Default `view=gantt` if param absent. Tab strip sits immediately above the chart area inside `/plan`. Lazy-load FullCalendar via `React.lazy` so gantt-only sessions don't pay the calendar bundle cost (~80KB gz).
- **D-28:** Phase 4 mobile-default to calendar (CAL-04) is then a one-line check at route mount: if no `view` param AND `window.matchMedia('(max-width: 640px)').matches`, default to `calendar`. No route refactor, no flash.

### Day-detail panel

- **D-29:** **Side drawer (right-side sheet)** triggered by FullCalendar `dateClick` handler from `@fullcalendar/interaction`. State: `selectedDate` written to URL search param (`?view=calendar&date=2026-05-15`). Back button closes drawer (`useNavigate(-1)` or pop search param); refresh restores; deep-link copy/paste works.
- **D-30:** Drawer contents: every `ScheduleEvent` and every `Task` for the selected day, grouped by planting. Per-row checkbox for tasks (writes `completedTaskIds`). Each event row shows the lifecycle-palette accent + plant name + event-type label. Close affordances: outside-click, Esc, X button.
- **D-31:** Mobile (Phase 4): right drawer → bottom sheet via Tailwind breakpoint swap; component structure stays the same.

### Tasks dashboard

- **D-32:** Layout: **Today / This Week / Overdue** sections, in that visual order. **Today merges overdue tasks** (overdue rows get a red flag pill `Overdue · 2 days`). "This Week" = next 7 days excluding today.
- **D-33:** Default group-by: **plant** ("Tomato — Cherokee Purple" header + tasks for that plant). Single global toggle in the dashboard header switches all sections to group-by **category** ("Water" header + tasks across plants). Toggle state lives in `uiStore` (memory; resets on refresh).
- **D-34:** Per-row checkbox only — **no bulk multi-select** for v1. <50 tasks/week doesn't justify the desktop/touch parity work.
- **D-35:** Custom task authoring: **modal** opened from `+ New task` button in the dashboard header. Form covers `TaskRecurrence` (daily / weekly / interval+`intervalDays` + `endDate`), attach-to-planting (dropdown of current plantings, including "None / free-floating"), `category` from `TaskCategory` enum (with sensible defaults like `custom` for free-floating, `water`/`fertilize`/etc. for plant-attached). Modal is also reused for edit (delete is a button inside the modal; confirmation inline).
- **D-36:** Recurring-task completion: **per-occurrence**. Composite key `${taskId}:${ISODate}` written to `completedTaskIds`. The `taskEmitter` projects recurring tasks into per-day occurrences; each is independently checkable. Design this in the type system on day 1 (extend `completedTaskIds: string[]` semantics — keys are either bare `taskId` for one-off OR `${taskId}:${ISODate}` for recurring). Phase 4 may add a "completed N of M this week" stat.
- **D-37:** `/tasks` hash route IS the dashboard (existing AppShell nav link points here).

### Claude's Discretion (unselected gray areas — planner picks)

- Ghost overlay opacity exact value (60% picked above as starting point; may need 40–80% based on lifecycle-palette contrast).
- Lock-icon glyph (Lucide `Lock` named in D-12; planner may pick a different glyph if visual weight is wrong at 16px).
- Tab strip visual style (segmented control vs underlined tabs vs pill toggles) — planner picks based on AppShell aesthetic.
- Side drawer width (300–400px range) and animation timing (200–250ms ease-out is the share-worthy default).
- FullCalendar theme integration (passing Tailwind tokens vs custom CSS overrides); planner picks based on `lifecyclePalette` integration.
- `--lifecycle-locked` palette token color value (must contrast against all lifecycle-phase fills; UI-SPEC author picks).
- Cascade reflow algorithm details (where the lock map is consulted — inside `generateSchedule` or a thin post-pass wrapper); planner picks. Engine purity invariant must be preserved either way.
- Tooltip auto-dismiss timing (8s default in D-09; planner can tune 6–10s based on average reason-text length).
- Section "show more" / collapse for the dashboard if a section overflows (deferred to v1.1 unless trivial).
- ESLint allowance for any new `new Date()` site beyond existing allowlist must include a comment.
- Test-strategy split between Vitest unit/integration (constraint clamp, cascade preview, undo/redo state) and Vitest 4 browser mode (drag pointer events on real DOM); planner picks the cut.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Core value, single-user no-backend constraint, share-worthy polish target.
- `.planning/REQUIREMENTS.md` — Phase 3 requirement IDs: GANTT-04..10, CAL-01..03, TASK-01..06.
- `.planning/ROADMAP.md` §Phase 3 — Phase goal, depends on Phase 2, 6 success criteria, kickoff spike note.

### Phase 1 outputs (must respect — engine + persistence are LOCKED)
- `.planning/phases/01-foundation-schedule-engine/01-CONTEXT.md` — D-05..D-07 (bare-SVG render approach, timeScale.ts API locked, deliberate no-SVAR-yet), D-10..D-13 (lifecycle event types + auto-task event types), D-15 (multi-tab listener).
- `.planning/phases/01-foundation-schedule-engine/01-RESEARCH.md` — Pattern 4 (constraint registry); pitfalls actively prevented in Phase 1.
- `.planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md` — Locked palette/typography/spacing tokens; lifecyclePalette token names.
- `.planning/phases/01-foundation-schedule-engine/01-VERIFICATION.md` — What Phase 1 actually shipped (engine API surface, persistence boundary, file inventory).

### Phase 2 outputs (must respect — gantt render + plan store are LIVE)
- `.planning/phases/02-data-layer-first-end-to-end/02-CONTEXT.md` — D-22..D-26 (gantt rendering — succession rows, axis bounds, color coding, **D-26: data-event-id / data-event-type / data-planting-id attrs are READY for Phase 3 drag handles**), D-29 (schema migration v1→v2 — Phase 3 may need v2→v3 if `Planting.locks` and recurring-task completion-key changes count as schema changes).
- `.planning/phases/02-data-layer-first-end-to-end/02-VERIFICATION.md` — End state of Phase 2 code (catalog 50 plants, succession, custom plants, Permapeople optional, JSON export/import).
- `.planning/phases/02-data-layer-first-end-to-end/02-CORS-SPIKE.md` — Permapeople CORS resolution (read for context; Phase 3 doesn't touch Permapeople).

### Stack & architecture (locked)
- `.planning/research/STACK.md` — React 19 + Vite 7 + TS 6 + Zustand v5 + date-fns v4 + Tailwind v4 + FullCalendar 6.1 + Vitest 4 + Cloudflare Pages. Phase 3 adds: `@dnd-kit/core` (~10KB gz), `zundo` (<700B), `@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`.
- `.planning/research/ARCHITECTURE.md` — Pure-function domain core; planStore/catalogStore/uiStore split; one-write-boundary rule for I/O (Phase 3 adds NO new I/O sites — drag/cascade/calendar/tasks are all in-memory or via existing planStore persist).
- `.planning/research/SUMMARY.md` — Resolved conflicts; date-fns over Temporal; localStorage budget OK at <5MB.

### Pitfalls to actively prevent in Phase 3
- `.planning/research/PITFALLS.md` §2 (DST/off-by-one — drag math must use `dateWrappers.ts`), §7 (DST transitions — verify with Phase 1's DST snapshot fixture still green after drag refactors), §8 (year-rollover — garlic drag across calendar boundary), §9 (Date vs Datetime — UTC-noon discipline preserved through transient edits), §15 (hardening-off as derived event — must NOT become draggable per D-06), §17 (succession vs DTM — succession plantings reflow correctly when their parent is dragged).

### Drag library docs (D-01)
- `@dnd-kit/core` — https://docs.dndkit.com/api-documentation/sensors/pointer (PointerSensor config); https://docs.dndkit.com/api-documentation/draggable/drag-overlay (DragOverlay for ghost preview); https://docs.dndkit.com/api-documentation/modifiers (modifiers — clamp candidate transform every tick).
- React 19 compatibility note: `@dnd-kit/sortable` has open R19 issues; Garden Gantt does NOT use sortable, only `useDraggable` + `PointerSensor`, which is stable.

### Undo/redo docs (D-14..D-18)
- `zundo` (temporal middleware for Zustand) — https://github.com/charkour/zundo
- Middleware ordering: persist outermost, temporal innermost. See https://zustand.docs.pmnd.rs/middlewares/persist for ordering rules. Combine via `wrapTemporal` so persist serializes the materialized plan only, history stays in-memory.

### Calendar docs (D-22..D-31)
- FullCalendar 6.1 React — https://fullcalendar.io/docs/react
- `dateClick` (interaction plugin) — https://fullcalendar.io/docs/dateClick
- `dayMaxEvents` + built-in popover — https://fullcalendar.io/docs/dayMaxEvents and https://fullcalendar.io/docs/event-popover
- FullCalendar issue #7344 (custom popover not supported) — design implication for D-29 custom drawer.

### React Router URL state
- `useSearchParams` (RR7) — https://reactrouter.com/api/hooks/useSearchParams used for `?view=` and `?date=` URL state in D-27, D-29.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/domain/scheduler.ts` — `generateSchedule(plan, catalog) → ScheduleEvent[]` is the pure function the cascade preview re-runs every rAF tick (D-19). Phase 3 may add a thin wrapper that consults the lock map (D-13) before re-projecting.
- `src/domain/constraints.ts` — `canMove(event, candidate, plan, plant) → ConstraintResult` is wired directly into the @dnd-kit `modifier` (D-08). Phase 3 will add additional rules to the registry (e.g., succession cutoff, harvest-min-DTM, hardening-must-precede-transplant) — extend `rules[]` without touching the registry mechanics.
- `src/domain/dateWrappers.ts` — All date math during drag MUST go through this. ESLint allowlist already includes `src/features/gantt/**`; new modules outside the gantt directory must NOT call raw `new Date()`.
- `src/domain/types.ts` — `EventType` (9-member union), `ScheduleEvent`, `ScheduleEdit` (sparse-edit shape), `Task`, `TaskRecurrence`, `TaskCategory`. Phase 3 adds: `Planting.locks?: Partial<Record<EventType, boolean>>` (D-13); `completedTaskIds` semantics extended to support `${taskId}:${ISODate}` recurring keys (D-36).
- `src/domain/taskEmitter.ts` — Existing engine-projection from `ScheduleEvent[]` to `Task[]`. Phase 3 EXTENDS for: today/week/overdue partitioning, custom-task merging, recurring-task occurrence expansion. Stays pure.
- `src/features/gantt/GanttView.tsx` — Bare-SVG render. Phase 3 extends in place: wrap each draggable rect in `useDraggable`, add `<DragOverlay>` ghost layer, add lock icon overlay. Existing `data-event-id`/`data-event-type`/`data-planting-id` attrs become drag handles per D-04..D-06.
- `src/features/gantt/timeScale.ts` — `dateToX` / `xToDate` are the conversion primitives the @dnd-kit `modifier` calls to clamp candidate pixel deltas to whole-day boundaries (D-07).
- `src/features/gantt/lifecyclePalette.ts` — Source of color tokens for ghost-overlay borders (D-20) and the new `--lifecycle-locked` token (D-12).
- `src/stores/planStore.ts` — Zustand persist machinery (version=2). Phase 3 wraps with `wrapTemporal(persist(...))` per D-14. Schema bump v2→v3 likely needed for `Planting.locks` and recurring-completion-key migration.
- `src/stores/uiStore.ts` — Phase 3 adds: `lastConstraintViolation` (transient drag state), `taskGroupBy: 'plant' | 'category'` (dashboard toggle), `dayDetailDrawerOpen` (computed from URL searchParams; mostly stays in URL not store).
- `src/app/AppShell.tsx` — Header + nav. Phase 3 adds keyboard handler for Cmd-Z / Cmd-Shift-Z (D-18) at the document level via `useEffect` in AppShell.
- `tests/__snapshots__/scheduler.snapshot.test.ts.snap` — Locked engine output. Phase 3 must NOT regress these. Add new snapshots for: drag-result cascade (post-commit `ScheduleEdit` applied), lock-respecting reflow, succession-with-anchor-drag.

### Established Patterns
- Pure domain core + imperative shell — drag/cascade/lock/undo all run in the imperative shell; `domain/` stays pure.
- Sparse edits over materialized state — drag commits a single `ScheduleEdit`; preview is `plan + transientEdit` re-derived. zundo persists history of the materialized `plan`, not the edit log.
- Constraint registry — extend `rules[]` in `constraints.ts`; never bypass the registry from drag handlers.
- One-write-boundary for I/O — Phase 3 adds zero new I/O sites.
- Feature-sliced UI structure — new dirs: `src/features/gantt/drag/` (modifiers, hooks, ghost overlay), `src/features/calendar/`, `src/features/tasks/`.
- ESLint `no-restricted-syntax` for raw `new Date()` — keep allowlist as-is; new modules outside `src/features/gantt/**` and `src/domain/dateWrappers.ts` must use `dateWrappers` helpers.
- Tailwind v4 `@theme` tokens in `src/index.css` — extend with `--lifecycle-locked` and any drawer/tooltip/tab tokens.
- Atomic commits via `gsd-sdk query commit`.

### Integration Points
- `<GanttView>` already reads `usePlanStore.plan`. Phase 3 wraps `GanttView` with `<DndContext>` provider and adds a `<DragOverlay>` sibling for the ghost layer.
- `usePlanStore` becomes `wrapTemporal(persist(planSlice))` — accessor pattern stays the same; new `useTemporalStore()` hook exposes `undo()` / `redo()` / `pastStates` for Cmd-Z keybinding wiring.
- Transient drag state lives in a NEW separate store (`useDragStore`) — no persist, no temporal — so ghost-render churn doesn't pollute history or storage.
- `/plan` route gains a tab strip child (Gantt | Calendar). Calendar is `React.lazy`-loaded.
- `/tasks` route swaps from Phase 2's placeholder to the real dashboard.
- `/calendar` is NOT a separate route in this design — `?view=calendar` on `/plan` is the calendar entry. Removing the placeholder calendar route from AppShell nav (if it exists) is part of Phase 3 cleanup.

### New Modules Phase 3 Adds
- `src/features/gantt/drag/` — `DragLayer.tsx`, `useDragBar.ts` (wrapper around `useDraggable` per bar), `clampModifier.ts` (the @dnd-kit modifier that calls `canMove` and `xToDate`/`dateToX`), `GhostOverlay.tsx` (`<DragOverlay>` content rendering transient `ScheduleEvent[]`), `useTransientSchedule.ts` (rAF-throttled selector that runs `generateSchedule(plan + transientEdit, catalog)`).
- `src/features/gantt/lock/` — `LockToggle.tsx` (the 16x16 hover-revealed icon), `useLockKeybinding.ts` (Alt-click handler).
- `src/features/gantt/tooltip/` — `ConstraintTooltip.tsx` (portaled floating + sticky pill, with `aria-live` ready).
- `src/features/calendar/` — `CalendarView.tsx` (FullCalendar wrapper), `selectEventsForCalendar.ts` (pure selector mapping ScheduleEvent[] + Task[] → FullCalendar event objects), `DayDetailDrawer.tsx`.
- `src/features/tasks/` — `TasksDashboard.tsx`, `TaskGroup.tsx`, `TaskRow.tsx`, `CustomTaskModal.tsx`, `useTodayWeekOverdue.ts` (selector partitioning Task[] for the dashboard).
- `src/stores/dragStore.ts` — Transient drag state (NOT persisted, NOT temporal).
- `src/stores/historyBindings.ts` — Cmd-Z / Cmd-Shift-Z document keybinding setup; mounted from AppShell.

</code_context>

<specifics>
## Specific Ideas

- **Drag scope semantics** — user explicitly clarified: indoor-start, transplant, direct-sow are draggable as anchors; harvest-window has trailing-edge resize (extend the end date); harden-off and germination-window stay derived/non-draggable; auto-task events stay engine-projected. Document this in the test plan as four explicit drag-test classes (anchor-drag-indoor, anchor-drag-transplant, anchor-drag-direct-sow, harvest-resize) plus negative-drag tests for the non-draggable types.
- **Why @dnd-kit's `modifiers` API matters** — it returns the candidate `transform` *before* the bar visually moves, so calling `canMove(...).finalDate` inside it produces clamp-at-boundary as a single visual moment. The same call also sets `lastConstraintViolation` so the tooltip system knows "what reason to show" without a second event round-trip.
- **Recurring-task completion key format** — `${taskId}:${ISODate}` where ISODate is `YYYY-MM-DD` (no time component, since all task dates are UTC-noon-anchored and read as date-only). Bare `taskId` (no colon) means "this is a one-off task, completion is global." Migration v2→v3 may need to upgrade existing one-off completed task ids — but Phase 2 didn't ship completed tasks, so the migration is a no-op for current users.
- **Tab strip URL pattern** — `/plan?view=gantt` (or no param) for gantt; `/plan?view=calendar` for calendar; `/plan?view=calendar&date=2026-05-15` for calendar with day-detail open. Drawer close clears `date` param without changing `view`.
- **Snap-back tooltip text** — read directly from `ConstraintResult.reasons[]`. Existing rule produces `"Tender plant: clamped transplant to last frost (${plan.location.lastFrostDate})."` — that string IS the tooltip text. Keep tone: practical, no jargon, includes the actual date.
- **Lock-with-cascade semantics** — locked events are NOT moved by cascade reflow even if their anchor is dragged. Concretely: if user locks the Cherokee Purple harvest-window and then drags transplant later, the harvest-window stays put — implying a shorter actual harvest period (the locked end no longer lines up with anchor + DTM). This is intentional ("I committed to harvesting at the farmers' market that weekend, no matter what"). Tooltip on the dragged anchor should still show the cascade boundary if the lock would have been violated.
- **Phase 4 paint-into-corner audit** — every Phase 3 affordance has a Phase 4 follow-up:
  - Hover-revealed lock icon → tap-and-hold equivalent (Phase 4)
  - 16×16 icon hit-target → wrapped in 24×24 invisible rect now so Phase 4 mobile passes WCAG 2.5.5
  - Floating-cursor tooltip → keyboard-accessible aria-live pill (Phase 4)
  - URL-state nav → mobile-default-to-calendar viewport check (Phase 4)
  - rAF-throttled drag → 200-event-plan stress-test at 60fps (Phase 4)

</specifics>

<deferred>
## Deferred Ideas

- **Drag interactions on the calendar view** — Phase 3 keeps calendar read-only; revisit in Phase 4 if user demand surfaces.
- **Bulk task multi-select / shift-click + section-level "complete all"** — explicit deferral; per-row checkboxes only for v1. Revisit if real-user task volume exceeds ~50/wk.
- **Quick-add task bar** (natural-language parsing) — too complex for v1; modal stays the authoring path. Revisit post-v1.
- **Per-phase drag of arbitrary bars** (move just harden-off, etc.) — paint-into-corner risk in v1; explicit deferral. Anchor-only model is the v1 surface.
- **Gantt zoom controls / scale picker** — not in Phase 3 scope. If added later, snap stays day-level (D-07 still holds).
- **Tooltip auto-dismiss + keyboard-dismiss + aria-live** — Phase 4 a11y pass. Phase 3 builds the tooltip portaled so this wires in without restructuring.
- **Mobile-default-to-calendar (CAL-04)** — Phase 4. The URL-param navigation in D-27/D-28 makes this a one-line viewport check.
- **Keyboard-driven drag fallback (POL-08)** — Phase 4. Linear's "focus a bar, arrow keys move 1 day, shift+arrow 7 days, L toggles lock, Esc cancels" is the documented target.
- **WCAG AA contrast audit (POL-09)** — Phase 4. New `--lifecycle-locked` token must be picked with contrast in mind, but the audit pass is Phase 4.
- **60fps stress-test on 200-event plans (POL-07)** — Phase 4. Phase 3 wires rAF throttle + memoized selectors so the perf foundation is ready.
- **"Completed N of M this week" stat** on tasks dashboard — V1.1 polish.
- **Section "show more" / collapse** for overflowing dashboard sections — V1.1 polish unless trivial during planning.
- **Tooltip with frost-date uncertainty band** (translucent ±2-week band on axis at frost markers) — Phase 4 polish.
- **PWA / offline-first** — Phase 4 if validated.
- **Multi-bed / 2D layout, companion planting, native mobile** — explicitly out of scope per PROJECT.md.

</deferred>

---

*Phase: 03-drag-cascade-calendar-tasks*
*Context gathered: 2026-04-26*
