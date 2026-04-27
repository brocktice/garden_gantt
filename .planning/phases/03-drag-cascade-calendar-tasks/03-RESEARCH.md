# Phase 3: Drag, Cascade, Calendar & Tasks - Research

**Researched:** 2026-04-26
**Domain:** Constraint-aware SVG drag + cascade preview + undo/redo + calendar view + task dashboard
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Gantt drag library + integration**
- D-01: Bare SVG + `@dnd-kit/core` (NOT SVAR, NOT Frappe). Keep `GanttView.tsx` and `timeScale.ts`. SVAR's `intercept("drag-task")` is binary allow/block — cannot clamp to a constraint boundary or surface per-reason tooltip text; multi-segment-per-row bars are PRO-only.
- D-02: `useDraggable` + `PointerSensor` (no `useSortable` — no row reorder). `canMove(event, candidate, plan, plant)` runs inside a custom `modifier` so clamp + tooltip-reason are computed before the candidate transform is applied. No raw pointer events on bars.
- D-03: rAF-throttle `setTransientEdit()` so 60Hz pointer events collapse into one update per frame.

**Drag scope**
- D-04: Whole-bar drag for `indoor-start`, `transplant`, `direct-sow` (anchors).
- D-05: Right-edge resize for `harvest-window` only. Min width = `daysToMaturity` derived end; max = first-fall-frost.
- D-06: NOT draggable (pointer-events-none on drag layer): `harden-off`, `germination-window`, `water-seedlings`, `harden-off-day`, `fertilize-at-flowering`. Still clickable for select/inspect; still receive lock-toggle hover.
- D-07: Snap to whole-day boundaries always. If horizontal density jitters at zoom, fix with 6 px/day floor on the time axis (not by changing snap granularity).

**Constraint enforcement + tooltip**
- D-08: Constraint clamp lives inside the `@dnd-kit` modifier. If `clamped: true`, modifier returns the clamped candidate transform AND writes `reasons[]` to `lastConstraintViolation` slot in `dragStore` (transient).
- D-09: Tooltip = floating-with-cursor during snap-back animation (~400ms ease-out), then portaled sticky inline pill (above/below by viewport edge). Persists until next drag-start OR 8s timeout. Min 240px, max 320px. Border accent uses lifecycle-palette token of constrained event type.
- D-10: Pill is portaled day 1 so Phase 4 a11y wires `aria-live="polite"` + Esc dismiss + tab-focus without restructuring.

**Lock/pin UX**
- D-11: Hover-revealed 16×16 lock icon (Lucide `Lock`) at top-right of each bar. Always-visible (filled-lock variant) when locked. Wrap icon in invisible 24×24 hit-target rect. Plus Alt-click anywhere on bar as power shortcut.
- D-12: Locked-state visual = filled lock icon PLUS 2px outline ring around the bar in new `--lifecycle-locked` palette token (`@theme` in `src/index.css`). Hatched fill / desaturation rejected — they lose color signal on 20px-tall bars.
- D-13: Lock state lives on the `Planting` (per event-type) — extend `Planting` interface with `locks?: Partial<Record<EventType, boolean>>`. Persisted via Zustand persist; tracked by zundo (Cmd-Z reverses lock toggles). Cascade reflow checks the lock map and skips re-projecting locked events.

**Undo/redo (zundo)**
- D-14: `zundo` `temporal` middleware for Cmd-Z / Cmd-Shift-Z. Config: `limit: 20`, `partialize` over the entire `plan` slice (excluding transient drag preview state). Middleware order: persist outer-most, temporal inner-most. NO `wrapTemporal` — history stays in-memory.
- D-15: Plan-wide undo scope (not drag-only). Undo reverses any mutation to `plan`: drags + planting add/remove + lock toggles + custom task add/edit/delete + completion toggles + location overrides. Uniform Cmd-Z behavior is non-negotiable.
- D-16: `handleSet` rAF-debounces drag-stream updates so a drag's many transient updates collapse into ONE history entry on commit (pointerup), not 60+ per second.
- D-17: Transient drag preview state (`transientEdit`, `dragPreviewEvents`, `lastConstraintViolation`) lives in a SEPARATE non-temporal store (`dragStore`) so ghost-render churn never enters history. Only the committed `ScheduleEdit` append on pointerup creates a history entry.
- D-18: Keybindings: Cmd/Ctrl-Z → `temporal.getState().undo()`; Cmd/Ctrl-Shift-Z → `redo()`. Wired on document at AppShell mount; suppressed when focus is inside `<input>` / `<textarea>` / `[contenteditable]`.

**Cascade preview**
- D-19: Live re-run `generateSchedule(plan + transientEdit, catalog)` on rAF-throttled pointermove. Single source of truth: preview = exact commit output.
- D-20: Two-layer ghost overlay — committed bars frozen during drag (no re-render), ghost layer is a separate `<g>` rendering transient `ScheduleEvent[]` at 60% opacity with lifecycle-palette accent border. On commit, ghost layer collapses back into committed layer.
- D-21: `useMemo` per-bar selectors keyed on `(eventId, start, end, edited)` so React only re-renders bars whose dates actually changed during drag.

**Calendar view**
- D-22: FullCalendar 6.1 (`@fullcalendar/react` + `@fullcalendar/daygrid` + `@fullcalendar/timegrid` + `@fullcalendar/interaction`). NO `@fullcalendar/resource-*` premium plugins.
- D-23: Views: month (default) + week. No day-list view. `headerToolbar` shows view-switch buttons.
- D-24: Event mapping: `ScheduleEvent[]` → FullCalendar event objects via pure `selectEventsForCalendar(events, tasks)` selector. Each event carries `extendedProps.eventType`. Auto-tasks AND user custom tasks render as calendar events alongside lifecycle anchors.
- D-25: Calendar is read-only in Phase 3 (no drag interactions).
- D-26: `dayMaxEvents={3}` so cells with >3 events show built-in `+more` popover for overflow. Custom day-detail drawer (D-29) is for deliberate day inspection, not overflow.

**Calendar↔Gantt navigation**
- D-27: Single `#/plan` route + tab strip with `?view=calendar` URL search param (React Router 7 `useSearchParams`). Default `view=gantt` if absent. `React.lazy` for FullCalendar so gantt-only sessions don't pay calendar bundle (~80KB gz).
- D-28: Phase 4 mobile-default to calendar = one-line viewport check at route mount.

**Day-detail panel**
- D-29: Side drawer (right-side sheet) triggered by FullCalendar `dateClick`. State: `selectedDate` written to URL (`?view=calendar&date=2026-05-15`). Back button closes; refresh restores; deep-link copy/paste works.
- D-30: Drawer contents: every `ScheduleEvent` and every `Task` for the selected day, grouped by planting. Per-row checkbox for tasks (writes `completedTaskIds`). Close affordances: outside-click, Esc, X button.
- D-31: Mobile (Phase 4): right drawer → bottom sheet via Tailwind breakpoint swap.

**Tasks dashboard**
- D-32: Layout: Today / This Week / Overdue, in that order. Today merges overdue (overdue rows get red `Overdue · 2 days` flag). "This Week" = next 7 days excluding today.
- D-33: Default group-by = plant. Single global toggle in dashboard header switches all sections to group-by category. Toggle state in `uiStore` (memory; resets on refresh).
- D-34: Per-row checkbox only — NO bulk multi-select for v1.
- D-35: Custom task authoring: modal opened from `+ New task` in dashboard header. Form covers `TaskRecurrence` (daily / weekly / interval+`intervalDays` + `endDate`), attach-to-planting dropdown, `category` from `TaskCategory` enum. Modal is also reused for edit (delete inside modal; confirmation inline).
- D-36: Recurring-task completion = per-occurrence. Composite key `${taskId}:${ISODate}` written to `completedTaskIds`. `taskEmitter` projects recurring tasks into per-day occurrences; each independently checkable. Type-system change on day 1: `completedTaskIds: string[]` keys are either bare `taskId` (one-off, global) OR `${taskId}:${ISODate}` (recurring, per-occurrence).
- D-37: `/tasks` hash route IS the dashboard.

### Claude's Discretion (planner picks)

- Ghost overlay opacity exact value (60% picked above as starting point; may need 40–80% based on lifecycle-palette contrast).
- Lock-icon glyph (Lucide `Lock` named in D-11/12; planner may pick alternate at 16px).
- Tab strip visual style (segmented control vs underlined tabs vs pill toggles).
- Side drawer width (300–400px range) and animation timing (200–250ms ease-out default).
- FullCalendar theme integration (Tailwind tokens vs CSS overrides).
- `--lifecycle-locked` palette token color value (must contrast against all lifecycle-phase fills).
- Cascade reflow algorithm details (lock map consulted inside `generateSchedule` or thin post-pass wrapper). Engine purity invariant must be preserved either way.
- Tooltip auto-dismiss timing (8s default; tunable 6–10s).
- Section "show more" / collapse for the dashboard if a section overflows (deferred to v1.1 unless trivial).
- ESLint allowance for any new `new Date()` site beyond existing allowlist must include a comment.
- Test-strategy split between Vitest unit/integration (constraint clamp, cascade preview, undo/redo state) and Vitest 4 browser mode (drag pointer events on real DOM); planner picks the cut.

### Deferred Ideas (OUT OF SCOPE for Phase 3)

- Drag interactions on the calendar view → Phase 4 if user demand surfaces.
- Bulk task multi-select / shift-click + section-level "complete all" → V1.1+ if real-user task volume exceeds ~50/wk.
- Quick-add task bar (natural-language parsing) → post-v1.
- Per-phase drag of arbitrary bars → explicit deferral (anchor-only model is the v1 surface).
- Gantt zoom controls / scale picker → if added later, snap stays day-level.
- Tooltip auto-dismiss + keyboard-dismiss + aria-live → Phase 4 a11y pass.
- Mobile-default-to-calendar (CAL-04) → Phase 4.
- Keyboard-driven drag fallback (POL-08) → Phase 4.
- WCAG AA contrast audit (POL-09) → Phase 4.
- 60fps stress-test on 200-event plans (POL-07) → Phase 4.
- "Completed N of M this week" task stat → V1.1.
- Section "show more" / collapse for overflowing dashboard sections → V1.1 polish unless trivial.
- Frost-date uncertainty band on axis → Phase 4 polish.
- PWA / offline-first → Phase 4 if validated.
- Multi-bed / 2D layout, companion planting, native mobile → explicitly out of scope (PROJECT.md).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GANTT-04 | User can drag any phase boundary or whole-bar to adjust dates | Standard Stack §dnd-kit; Pattern 1 (modifier-based clamp); D-04..D-06 lock the drag scope |
| GANTT-05 | Drag respects constraints (no transplant of frost-tender before last frost; harden-off must precede transplant; harvest must follow transplant by ≥DTM) | Pattern 2 (constraint-rule extension); existing `noTransplantBeforeLastFrostForTender` is the template; Phase 3 adds `noHardenOffBeforeIndoor`, `harvestMustFollowTransplantByDTM` rules |
| GANTT-06 | Drag shows ghost/preview of affected downstream events (cascade preview) | Pattern 3 (two-layer ghost overlay); D-19/D-20; live `generateSchedule(plan + transientEdit, catalog)` on rAF tick |
| GANTT-07 | Releasing drag commits sparse `ScheduleEdit`; downstream events that weren't manually pinned reflow | `ScheduleEdit` shape exists in `types.ts`; `plan.edits[]` array exists; need new setter `commitEdit(edit)` on planStore; engine consumption pattern not yet implemented (engine reads `plan.edits` and prefers edit start/end over computed) |
| GANTT-08 | User can lock individual events; cascade reflow won't move them | D-13 lock map on Planting; engine wrapper consults lock map and skips re-projecting locked events |
| GANTT-09 | When drag would violate a constraint, bar snaps to boundary + tooltip explains why | `ConstraintResult.reasons[]` already returns string array; clamp + tooltip via D-08/D-09 |
| GANTT-10 | Undo (Cmd/Ctrl-Z, ≥20 levels) reverses any drag/edit; redo Cmd/Ctrl-Shift-Z | zundo `temporal` middleware with `limit: 20`; D-14..D-18; document-level keybindings in AppShell |
| CAL-01 | User can toggle gantt ↔ calendar; both views read same schedule events | `useDerivedSchedule` selector becomes the shared event source; `selectEventsForCalendar(events, tasks)` adapts shape for FullCalendar |
| CAL-02 | Calendar offers month + week views | `dayGridPlugin` (month) + `timeGridPlugin` (week) + `headerToolbar` view switch |
| CAL-03 | Clicking a day shows all events + tasks for that day in detail panel | FullCalendar `dateClick` from `@fullcalendar/interaction` → URL `?date=` → portaled drawer |
| TASK-01 | Auto-derived tasks appear on calendar + dashboard | Existing `taskEmitter.ts` already projects auto-tasks into 3 event types; Phase 3 adds `Task[]` adapter that converts auto-task `ScheduleEvent`s into `Task` shape |
| TASK-02 | User can add custom one-off or recurring tasks tied to planting or free-floating | `TaskRecurrence` shape in `types.ts`; `customTasks: CustomTask[]` already on `GardenPlan`; need `addCustomTask` / `editCustomTask` setters on planStore |
| TASK-03 | User can edit and delete custom tasks | Same modal handles edit; delete via setter `removeCustomTask(id)` |
| TASK-04 | All tasks (auto + custom) checkable; completion persists | Need `completedTaskIds: string[]` on plan (NEW field — not on current `GardenPlan`); composite-key semantic per D-36 |
| TASK-05 | Today / This Week / Overdue dashboard | Pure selector `useTodayWeekOverdue(tasks, today)`; date math via `dateWrappers` |
| TASK-06 | Group by plant or category; bulk check-off | Group-by toggle in `uiStore`; bulk check-off explicitly DESCOPED to per-row in v1 (D-34) — note divergence from REQUIREMENTS wording, captured in CONTEXT |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **GSD workflow:** Phase 3 work must enter through `/gsd-execute-phase`; no direct repo edits outside the workflow.
- **No backend / single-user / no accounts:** All Phase 3 state stays in browser; lock map, edits, completedTaskIds, customTasks all persist via existing `garden-gantt:plan` localStorage entry.
- **Static-site host (Cloudflare Pages):** All Phase 3 features must work offline once loaded; FullCalendar lazy-load chunk must be served from same origin.
- **Tech stack (frozen):** React 19.2.5 + Vite 8.x + TS 6.0 + Zustand 5.0.12 + date-fns 4.1.5 + Tailwind 4.2 + FullCalendar 6.1.20 + lucide-react 1.11. Phase 3 ADDS only: `@dnd-kit/core` ^6.3.1, `zundo` ^2.3.0, `@fullcalendar/react` ^6.1.20, `@fullcalendar/daygrid` ^6.1.20, `@fullcalendar/timegrid` ^6.1.20, `@fullcalendar/interaction` ^6.1.20.
- **Banned dependencies:** `@svar-ui/*`, `frappe-gantt`, Bryntum, dhtmlx-gantt, Moment, Redux, Material UI, gantt-schedule-timeline-calendar, localForage. (Confirmed in Phase 2 RESEARCH §line 115.)
- **ESLint enforcement of SCH-03:** No raw `new Date(string)` outside `dateWrappers.ts`. The `src/features/gantt/**` directory is allowlisted for `new Date()` only (no-arg today reads); other gantt subfolders (Phase 3 `src/features/gantt/drag/`, `src/features/gantt/lock/`, `src/features/gantt/tooltip/`, `src/features/calendar/`, `src/features/tasks/`) inherit the allowlist if under `src/features/gantt/**`. NEW directories outside `src/features/gantt/**` (e.g., `src/features/calendar/`, `src/features/tasks/`) MUST go through `dateWrappers` helpers.
- **Pure domain core:** `src/domain/*` stays pure (no React, no Zustand, no I/O). Cascade reflow respecting locks must either live inside `generateSchedule` or in a thin pure wrapper that takes the lock map as input.
- **One-write-boundary rule:** Phase 3 adds ZERO new I/O sites. All state writes go through existing `planStore` (with new setters) or new in-memory `dragStore` / `historyStore`.
- **Atomic commits:** Each plan commit via `gsd-sdk query commit`.

## Summary

Phase 3 turns the Phase 2 read-only gantt into Garden Gantt's actual product: drag-to-adjust bars with frost-aware constraint clamping, live downstream cascade preview, per-event lock, undo/redo, a calendar mirror view, and a Today/This Week/Overdue task dashboard. The domain engine and persistence layer from Phases 1-2 are LOCKED — Phase 3 is almost entirely new UI + state-store wiring + a tiny extension to the constraint registry and a non-purity-breaking lock-aware wrapper around `generateSchedule`. The `useDerivedSchedule` selector becomes the single source of truth that feeds both gantt and calendar views.

The kickoff spike is RESOLVED: bare-SVG + `@dnd-kit/core` is locked over SVAR React Gantt 2.6 because (1) SVAR's `intercept` hook is binary allow/block — it cannot clamp candidates to a constraint boundary or surface per-reason tooltip text, killing GANTT-09; (2) multi-segment-per-row bars (already shipped in Phase 2) are paywalled in SVAR PRO; and (3) adopting SVAR would discard the working `GanttView.tsx` + `timeScale.ts` pair plus require a post-commit-revert workaround for clamping. `@dnd-kit/core`'s modifier API runs every drag tick and can transform the candidate transform — a near-perfect fit for `canMove(...).finalDate` clamp; `<DragOverlay>` is a ready-made portaled ghost layer for cascade preview.

Three force-multipliers in the existing codebase make this phase tractable:
- `domain/constraints.ts` exposes a registry — Phase 3 adds rules to `rules[]` without touching the registry mechanics.
- `domain/scheduler.ts` is a pure function whose cost over realistic plans (5-50 plantings × ~6 events = ~30-300 events) is sub-millisecond — it can be re-run live on every rAF tick during drag without performance concern. The bottleneck is React reconciliation of bars, NOT engine work.
- `data-event-id`, `data-event-type`, `data-planting-id` attrs already exist on every gantt rect (Phase 2 D-26) — Phase 3 just wraps them in `useDraggable` per-bar.

**Primary recommendation:** Build Phase 3 as five independent feature slices wired through the existing single source of truth: (1) `src/features/gantt/drag/` (modifier + ghost layer + commit), (2) `src/features/gantt/lock/` (lock toggle + lock-aware engine wrapper), (3) `src/features/gantt/tooltip/` (portaled snap-back pill), (4) `src/features/calendar/` (FullCalendar wrapper + day-detail drawer), (5) `src/features/tasks/` (dashboard + custom-task modal). Wrap `planStore` with `temporal()` middleware (zundo) for undo/redo; create a new in-memory `dragStore` for transient drag state so ghost churn never enters history or storage. Migrate the schema v2→v3 to add `Planting.locks` and `plan.completedTaskIds`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Drag pointer capture, drag-tick clamp, ghost overlay render | Browser / Client (React + SVG) | — | All interaction is purely client-side; no backend exists |
| Constraint evaluation (`canMove`) | Pure domain core (`src/domain/`) | — | SCH-03 / pure-function invariant locked in Phase 1; constraints are testable without React |
| Cascade reflow respecting locks | Pure domain core (lock-aware wrapper around `generateSchedule`) | — | Engine purity invariant must hold; lock map is input data, not React state at compute time |
| Transient drag preview state | Browser / Client (in-memory Zustand `dragStore`) | — | Never persisted, never undoable; lifecycle = pointerdown → pointerup |
| Committed schedule edits + lock toggles + custom tasks | Browser / Client (`planStore` + Zustand `persist` to localStorage) | — | Plan-wide undoable, plan-wide persisted; same boundary as Phase 1-2 |
| Undo history (≥20 levels) | Browser / Client (in-memory `temporal` store via zundo) | — | History is in-memory only — D-14 explicitly excludes `wrapTemporal`-with-persist; reload starts fresh history |
| Calendar event projection | Pure derivation (`selectEventsForCalendar(events, tasks)`) | — | Pure adapter from `ScheduleEvent[]` + `Task[]` to FullCalendar event-object shape |
| Day-detail panel state | URL search params (`?date=YYYY-MM-DD`) + ephemeral derived hook | Browser / Client | URL-as-state for refresh-restore + back-button-closes + deep-link sharing per D-29 |
| Tasks projection (Today/Week/Overdue partition; recurring-task occurrence expansion) | Pure derivation (`useTodayWeekOverdue` selector + extended `taskEmitter`) | — | Pure functions over `tasks` + `today`; no React state |
| Tasks dashboard UI (group-by toggle, modal, checkboxes) | Browser / Client (React) | — | Pure UI; per-row check writes back to `planStore.completedTaskIds` |
| Keybinding wiring (Cmd-Z / Cmd-Shift-Z) | Browser / Client (document-level listener mounted in AppShell `useEffect`) | — | Document-scope so keybindings work regardless of which view is mounted; suppress when focus is in form input per D-18 |
| FullCalendar bundle code-split | Browser / Client (Vite + `React.lazy`) | — | D-27: gantt-only sessions don't pay calendar bundle (~80KB gz) |

## Standard Stack

### Core (Phase 3 additions to Phase 1-2 stack)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@dnd-kit/core` | `^6.3.1` | Pointer-sensor drag with custom modifier API for clamp + DragOverlay for ghost layer | [VERIFIED: npm view @dnd-kit/core version → 6.3.1, peer react ≥16.8] Modifier API is `function(args) { const {transform} = args; return {...transform, x: ..., y: ...} }` — runs every drag tick, can clamp transforms by consulting external state. DragOverlay renders arbitrary children (including SVG content) and supports `active.id`-pattern routing of which item is being dragged. [CITED: dndkit.com/api-documentation/modifiers]
| `zundo` | `^2.3.0` | Temporal middleware for Zustand → undo/redo with `limit`, `partialize`, `handleSet` (debounce on commit) | [VERIFIED: npm view zundo version → 2.3.0, peer zustand ^4.3 \|\| ^5.0] <700B gz, native Zustand idiom. `handleSet` lets us collapse a drag's many transient updates into ONE history entry on commit. [CITED: github.com/charkour/zundo README]
| `@fullcalendar/react` | `^6.1.20` | React wrapper for FullCalendar | [VERIFIED: npm view @fullcalendar/react peerDependencies → react ^16.7 \|\| ^17 \|\| ^18 \|\| ^19] Officially supports React 19. |
| `@fullcalendar/daygrid` | `^6.1.20` | Month-view plugin | Free; no premium dependencies |
| `@fullcalendar/timegrid` | `^6.1.20` | Week-view plugin | Free |
| `@fullcalendar/interaction` | `^6.1.20` | `dateClick` callback (D-29 trigger) | Free |

### Supporting (Phase 1-2 already installed; Phase 3 just consumes)

| Library | Version | Purpose | When Phase 3 Uses It |
|---------|---------|---------|----------------------|
| `react` | `19.2.5` | UI runtime | Throughout |
| `react-router` | `7.14.2` | URL state via `useSearchParams` | D-27 (`?view=`), D-29 (`?date=`) |
| `zustand` | `5.0.12` | State management | New `dragStore`; wrap existing `planStore` with `temporal` |
| `date-fns` + `@date-fns/utc` | `4.1.0` + `2.1.1` | UTC-noon date arithmetic | All date math during drag/cascade/task-bucketing via existing `dateWrappers.ts` |
| `lucide-react` | `1.11.0` | Icon set | `Lock` (D-11), `Plus` (new task), `X` (modal close), `Calendar`, `LayoutList` (tab strip) |
| `tailwindcss` | `4.2.4` | Styling | New tokens: `--lifecycle-locked` (D-12), drawer/tooltip/tab tokens |
| `zod` | `4.3.6` | Schema validation | Tighten `customTasks` and `edits` arrays (currently `z.array(z.unknown())` per Phase 2 schemas.ts:100-101) |
| `@radix-ui/react-dialog` | `1.1.15` | Already used for modals | Day-detail drawer uses Radix Dialog (or Sheet pattern) for portal + a11y semantics |
| `@radix-ui/react-checkbox` | `1.3.3` | Already in deps | Per-row task checkboxes |

### Alternatives Considered (and rejected)

| Standard | Alternative | Tradeoff (why standard wins) |
|----------|-------------|------------------------------|
| `@dnd-kit/core` v6 | `@dnd-kit/react` v0.x (the new "v7" rewrite under `dnd-kit/dom` org) | The new package is in beta, has different API (`Modifier` class vs function), and its docs are mid-migration. v6 is stable, well-documented, used by ~10M weekly downloads. Migration to v7 is a v2 task. [CITED: dndkit.com/react/quickstart] |
| `@dnd-kit/core` | `interact.js` v1.10 | Stale maintenance (last release Mar 2024); not React-idiomatic; manual ghost layer; no first-class modifier API for clamping. Documented in CONTEXT.md kickoff spike. |
| `@dnd-kit/core` | Hand-rolled pointer events | Reinvents capture/cancel/scroll-lock/`touch-action`/keyboard fallback. Phase 4 a11y likely pulls a library back in anyway. |
| `@dnd-kit/core` | SVAR React Gantt 2.6 | REJECTED in CONTEXT D-01: `intercept("drag-task")` is binary allow/block (cannot clamp); multi-segment bars are PRO-only; would discard working `GanttView.tsx`. |
| `zundo` | Reverse-edit log over `ScheduleEdit[]` | Tiny memory footprint, but doesn't cover non-schedule actions (planting CRUD, lock toggles, custom tasks); redo-stack invalidation bugs to maintain. CONTEXT D-15 says undo MUST feel uniform. |
| `zundo` | `structuredClone(plan)` snapshots into a hand-rolled history stack | Simplest mental model but rebuilds zundo's API by hand; no `handleSet` debounce, no `partialize`. |
| `zundo` | `immer` `produceWithPatches` | Patches are precise undo/redo — but require refactoring all mutations to immer producers; array-index drift gotchas. Out of proportion with phase scope. |
| FullCalendar | `react-big-calendar` | Acceptable, less mature; FullCalendar already locked in CLAUDE.md TL;DR (D-22). |
| URL search params for view + date state | uiStore-only toggle | Loses deep-linking + refresh-restores. DEPLOY-02 (deep-link survival) directly motivates URL state. |

**Installation:**

```bash
npm install @dnd-kit/core@^6.3.1 zundo@^2.3.0 \
  @fullcalendar/react@^6.1.20 @fullcalendar/daygrid@^6.1.20 \
  @fullcalendar/timegrid@^6.1.20 @fullcalendar/interaction@^6.1.20
```

**Version verification (live `npm view` queries 2026-04-26):**
- `@dnd-kit/core` → 6.3.1 (modified 2024-12-05; mature, stable, peer `react>=16.8`) [VERIFIED]
- `zundo` → 2.3.0 (modified 2024-11-17; peer `zustand ^4.3 || ^5.0`; ~61KB unpackedSize) [VERIFIED]
- `@fullcalendar/react` → 6.1.20 (peer `react ^16.7 || ^17 || ^18 || ^19`) [VERIFIED]
- `@fullcalendar/daygrid|timegrid|interaction` → 6.1.20 (all share `~6.1.20` core peer) [VERIFIED]
- Phase 1-2 tooling: react 19.2.5, vite 8.0.10, typescript 6.0.2, zustand 5.0.12, date-fns 4.1.0, tailwindcss 4.2.4, vitest 4.1.5, lucide-react 1.11.0 [VERIFIED via repo `package.json`]

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────────┐
                         │                Browser DOM                   │
                         └─────────────────────────────────────────────┘
                                              │
                          ┌───────────────────┼──────────────────────┐
                          │                                          │
                    ┌─────▼──────┐                       ┌───────────▼────────┐
                    │   Pointer  │                       │   Keyboard         │
                    │   events   │                       │   (Cmd-Z, etc.)    │
                    └─────┬──────┘                       └───────────┬────────┘
                          │                                          │
                  ┌───────▼────────────┐                  ┌──────────▼─────────┐
                  │ @dnd-kit DndContext│                  │ document keydown   │
                  │ (PointerSensor)    │                  │ listener (AppShell)│
                  └───────┬────────────┘                  └──────────┬─────────┘
                          │                                          │
                  ┌───────▼────────────┐                              │
                  │ Custom modifier:   │                              │
                  │ clampToConstraint  │                              │
                  │ (calls canMove,    │                              │
                  │  writes reasons    │                              │
                  │  to dragStore)     │                              │
                  └───────┬────────────┘                              │
                          │                                          │
              ┌───────────▼─────────────┐                            │
              │ dragStore (in-memory)   │                            │
              │ - transientEdit         │                            │
              │ - lastConstraintViolation│                           │
              │ NOT persisted, NOT undoable                          │
              └───────────┬─────────────┘                            │
                          │                                          │
                          │ rAF throttle                             │
                          │                                          │
        ┌─────────────────▼──────────────────────┐                   │
        │ useTransientSchedule()                  │                  │
        │ → generateSchedule(plan + transientEdit)│                   │
        │   (pure, sub-ms over 5-50 plantings)    │                  │
        └─────────────────┬──────────────────────┘                   │
                          │                                          │
                  ┌───────▼─────────┐                                 │
                  │ <GhostOverlay/> │ ← <DragOverlay portal>          │
                  │ (transient bars │                                 │
                  │  60% opacity)   │                                 │
                  └─────────────────┘                                 │
                                                                     │
                          ───── pointerup commits ─────               │
                                                                     │
                  ┌───────────────────────────────┐  ┌──────────────▼─────────────┐
                  │ planStore.commitEdit(edit)    │  │ temporal.getState().undo() │
                  │ (Zustand setter)              │  │ / .redo() / .clear()       │
                  └─────────────────┬─────────────┘  └──────────────┬─────────────┘
                                    │                               │
                                    └────────┬──────────────────────┘
                                             │
                              ┌──────────────▼────────────────────┐
                              │ planStore — wrap order:           │
                              │   persist(temporal(planSlice, {   │
                              │     limit: 20, partialize: plan,  │
                              │     handleSet: rAF-debounce       │
                              │   }))                             │
                              │ - persist outer (localStorage)    │
                              │ - temporal inner (in-memory hist) │
                              └──────────────┬────────────────────┘
                                             │
                       ┌─────────────────────┼──────────────────────┐
                       │                     │                      │
              ┌────────▼────────┐  ┌─────────▼────────┐  ┌─────────▼────────┐
              │ useDerivedSched │  │ catalogStore     │  │ uiStore          │
              │ (lock-aware     │  │ (curated+custom  │  │ (taskGroupBy,    │
              │  wrapper around │  │  merged, locked) │  │  drawer state)   │
              │  generateSchedule│ │                  │  │                  │
              │  + expandSucces.│  │                  │  │                  │
              └────────┬────────┘  └──────────────────┘  └──────────────────┘
                       │
         ┌─────────────┼──────────────────┐
         │             │                  │
   ┌─────▼────┐   ┌────▼─────┐       ┌────▼──────────────────────┐
   │ <Gantt   │   │ <Calend  │       │ <TasksDashboard/> (#/tasks)│
   │  View/>  │   │  arView  │       │  - Today / Week / Overdue │
   │ (#/plan  │   │ /> (#/   │       │  - per-row checkbox       │
   │  ?view=  │   │  plan?   │       │  - + New Task → modal     │
   │  gantt)  │   │  view=   │       │  - group-by toggle        │
   │          │   │  cal)    │       │                           │
   └──────────┘   └────┬─────┘       └───────────────────────────┘
                       │
                  ┌────▼──────────────┐
                  │ FullCalendar      │
                  │ + dateClick →     │
                  │   ?date=YYYY-MM-DD│
                  │ + dayMaxEvents=3  │
                  │ → built-in popover│
                  │ React.lazy chunk  │
                  └────┬──────────────┘
                       │
                  ┌────▼──────────────┐
                  │ <DayDetailDrawer/>│
                  │ (Radix portal,    │
                  │ events+tasks for  │
                  │ selected day)     │
                  └───────────────────┘
```

### Recommended Project Structure (Phase 3 additions)

```
src/
├── stores/
│   ├── planStore.ts          (EXTEND: wrap with temporal; add commitEdit, lockEvent,
│   │                          unlockEvent, addCustomTask, editCustomTask, removeCustomTask,
│   │                          toggleTaskCompletion setters; bump schemaVersion to 3)
│   ├── uiStore.ts            (EXTEND: taskGroupBy, lastConstraintViolation slot
│   │                          REMOVED — moved to dragStore per D-17)
│   ├── dragStore.ts          (NEW — transient: transientEdit, dragPreviewEvents,
│   │                          lastConstraintViolation; NOT persisted, NOT temporal)
│   ├── catalogStore.ts       (no changes)
│   └── historyBindings.ts    (NEW — Cmd-Z / Cmd-Shift-Z document keybinding setup;
│                              mounted from AppShell useEffect)
├── domain/
│   ├── types.ts              (EXTEND: Planting.locks?: Partial<Record<EventType,boolean>>;
│   │                          GardenPlan.completedTaskIds: string[];
│   │                          schemaVersion: 3)
│   ├── schemas.ts            (EXTEND: tighten customTasks/edits arrays;
│   │                          add LockMapSchema; bump GardenPlanSchema to v3)
│   ├── migrations.ts         (EXTEND: add v2→v3 migration: locks={}, completedTaskIds=[])
│   ├── constraints.ts        (EXTEND: add hardenOffMustPrecedeTransplant,
│   │                          harvestMustFollowTransplantByDTM, dragSpecific rules)
│   ├── scheduler.ts          (no signature changes; consider lock-aware wrapper)
│   ├── schedulerWithLocks.ts (NEW — pure thin wrapper that takes (plan, catalog, lockMap)
│   │                          and returns ScheduleEvent[]; respects lock map by reading
│   │                          plan.edits and treating locked event start/end as anchors
│   │                          downstream cascade reflows around)
│   ├── taskEmitter.ts        (EXTEND: add expandRecurringTasks(customTasks, range) →
│   │                          per-occurrence Task[]; add deriveAutoTasksFromEvents(events) →
│   │                          Task[] adapter so calendar/dashboard consume Task[] uniformly)
│   └── ...
├── features/
│   ├── gantt/
│   │   ├── GanttView.tsx                (EXTEND: wrap in <DndContext>, add <GhostOverlay/>,
│   │   │                                 add <LockToggle/> per bar)
│   │   ├── timeScale.ts                 (no changes — locked API)
│   │   ├── lifecyclePalette.ts          (EXTEND: add 'locked' token reading from CSS var)
│   │   ├── useDerivedSchedule.ts        (EXTEND: switch to schedulerWithLocks)
│   │   ├── drag/
│   │   │   ├── DragLayer.tsx            (NEW — DndContext provider + DragOverlay sibling)
│   │   │   ├── useDragBar.ts            (NEW — wrapper around useDraggable per event)
│   │   │   ├── clampModifier.ts         (NEW — the @dnd-kit modifier; calls canMove +
│   │   │   │                              xToDate/dateToX to snap to whole-day boundaries)
│   │   │   ├── GhostOverlay.tsx         (NEW — DragOverlay content rendering transient
│   │   │   │                              ScheduleEvent[] at 60% opacity)
│   │   │   └── useTransientSchedule.ts  (NEW — rAF-throttled selector running
│   │   │                                  generateSchedule(plan + transientEdit, catalog))
│   │   ├── lock/
│   │   │   ├── LockToggle.tsx           (NEW — 16x16 hover-revealed icon w/ 24x24 hit-target)
│   │   │   └── useLockKeybinding.ts     (NEW — Alt-click handler bound to bar group)
│   │   └── tooltip/
│   │       └── ConstraintTooltip.tsx    (NEW — portaled floating + sticky pill,
│   │                                     aria-live ready for Phase 4)
│   ├── calendar/                         (NEW directory)
│   │   ├── CalendarView.tsx              (NEW — FullCalendar wrapper, lazy-loaded)
│   │   ├── selectEventsForCalendar.ts   (NEW — pure selector mapping ScheduleEvent[] +
│   │   │                                  Task[] → FullCalendar event-object shape;
│   │   │                                  carries extendedProps.eventType)
│   │   ├── DayDetailDrawer.tsx          (NEW — Radix Dialog portal; reads ?date= from URL;
│   │   │                                  groups events+tasks by planting; per-row checkbox)
│   │   └── useDayDetailUrl.ts           (NEW — useSearchParams wrapper for ?date= state)
│   ├── tasks/                            (NEW directory)
│   │   ├── TasksDashboard.tsx           (NEW — top-level page at #/tasks)
│   │   ├── useTodayWeekOverdue.ts       (NEW — pure partition selector)
│   │   ├── useTaskGroupBy.ts            (NEW — group by plant or category)
│   │   ├── TaskGroup.tsx                (NEW — section + group header + task rows)
│   │   ├── TaskRow.tsx                  (NEW — checkbox + label + overdue pill)
│   │   ├── CustomTaskModal.tsx          (NEW — author/edit modal with TaskRecurrence form)
│   │   └── useCompositeCompletionKey.ts (NEW — helpers for ${taskId}:${ISODate} keys)
│   └── plan/                             (NEW — tab strip wrapper)
│       └── PlanRoute.tsx                 (NEW — /plan route with ?view= tab strip;
│                                          renders <GanttView/> or <CalendarView/>)
└── app/
    ├── App.tsx              (EXTEND: /tasks route swap from PlaceholderRoute → TasksDashboard;
    │                         /plan route wraps PlanRoute)
    └── AppShell.tsx         (EXTEND: mount historyBindings; remove /tasks placeholder copy)
```

### Pattern 1: @dnd-kit modifier-based clamp + tooltip-reason write

**What:** A custom @dnd-kit modifier evaluates the constraint registry every drag tick. The modifier transforms the candidate transform to clamp at boundaries and writes `reasons[]` to a transient store slot so the tooltip system knows what to show — without a second event round-trip.

**When to use:** Whenever drag must be constrained by domain logic that returns both a clamped position AND a human-readable explanation.

**Example:**

```typescript
// src/features/gantt/drag/clampModifier.ts
// Source: [CITED: dndkit.com/api-documentation/modifiers] — modifier signature
//         [CITED: src/domain/constraints.ts] — canMove + ConstraintResult
//         [CITED: src/features/gantt/timeScale.ts] — dateToX / xToDate
import type { Modifier } from '@dnd-kit/core';
import type { TimeScale } from '../timeScale';
import type { GardenPlan, Plant, ScheduleEvent } from '../../../domain/types';
import { canMove } from '../../../domain/constraints';
import { useDragStore } from '../../../stores/dragStore';

export function makeClampModifier(args: {
  scale: TimeScale;
  event: ScheduleEvent;
  plan: GardenPlan;
  plant: Plant;
}): Modifier {
  return ({ transform, activeNodeRect }) => {
    if (!activeNodeRect) return transform;

    // 1) Convert pixel delta to date delta (whole-day snap per D-07).
    const startX = args.scale.dateToX(args.event.start);
    const candidateX = startX + transform.x;
    const candidateDate = args.scale.xToDate(candidateX);

    // 2) Run the constraint registry.
    const result = canMove(args.event, candidateDate, args.plan, args.plant);

    // 3) Write reasons to transient store IF clamped.
    if ('clamped' in result && result.clamped) {
      useDragStore.getState().setLastConstraintViolation({
        eventId: args.event.id,
        eventType: args.event.type,
        reasons: result.reasons,
      });
      // 4) Convert clamped date back to x; return clamped transform.
      const clampedX = args.scale.dateToX(result.finalDate);
      return { ...transform, x: clampedX - startX };
    }

    // 5) Snap to whole-day even when not clamped.
    const snappedX = args.scale.dateToX(candidateDate);
    return { ...transform, x: snappedX - startX };
  };
}
```

Wire into `useDraggable` per-bar:

```typescript
// src/features/gantt/drag/useDragBar.ts
import { useDraggable } from '@dnd-kit/core';
import { useMemo } from 'react';
import { makeClampModifier } from './clampModifier';
// ...
const modifiers = useMemo(
  () => [makeClampModifier({ scale, event, plan, plant })],
  [scale, event.id, event.start, event.end, plan.location.lastFrostDate, plant.id],
);
const { attributes, listeners, setNodeRef, transform } = useDraggable({
  id: event.id,
  modifiers,
});
```

### Pattern 2: Constraint-rule extension (registry pattern)

**What:** Phase 3 adds new rules to `src/domain/constraints.ts` `rules[]` without touching the registry mechanism. Each rule declares `appliesTo` (which events it gates) and `check` (returns clamped result with reasons).

**When to use:** Every new drag constraint (GANTT-05) — `hardenOffMustPrecedeTransplant`, `harvestMustFollowTransplantByDTM`, `transplantMustFollowHardenOff`, `directSowMustNotPrecedeFrostByPlantTolerance`, etc.

**Example:**

```typescript
// Append to rules[] in src/domain/constraints.ts
const harvestMustFollowTransplantByDTM: ConstraintRule = {
  name: 'harvestMustFollowTransplantByDTM',
  appliesTo: (e) => e.type === 'harvest-window',
  check: (event, candidate, plan, plant) => {
    // Find this planting's transplant date (or direct-sow if no transplant).
    const anchor = plan.edits.find(
      (ed) => ed.plantingId === event.plantingId
        && (ed.eventType === 'transplant' || ed.eventType === 'direct-sow'),
    );
    const anchorDate = anchor?.startOverride ?? /* compute from base */;
    const minStart = toISODate(addDays(parseDate(anchorDate), plant.timing.daysToMaturity));
    if (parseDate(candidate).getTime() >= parseDate(minStart).getTime()) {
      return { ok: true, finalDate: candidate };
    }
    return {
      ok: true, clamped: true, finalDate: minStart,
      reasons: [`Harvest must be at least ${plant.timing.daysToMaturity} days after planting (${minStart}).`],
    };
  },
};
```

### Pattern 3: Two-layer ghost overlay with rAF-throttled live engine re-run

**What:** Render committed bars frozen in a static `<g>`. During drag, a separate ghost `<g>` (inside `<DragOverlay>`) renders the transient `ScheduleEvent[]` produced by `generateSchedule(plan + transientEdit, catalog)` at 60% opacity. The transient compute is rAF-throttled.

**When to use:** Every drag interaction that must show downstream cascade preview (GANTT-06).

**Example:**

```typescript
// src/features/gantt/drag/useTransientSchedule.ts
import { useSyncExternalStore } from 'react';
import { useDragStore } from '../../../stores/dragStore';
import { usePlanStore } from '../../../stores/planStore';
import { useCatalogStore, selectMerged } from '../../../stores/catalogStore';
import { generateSchedule } from '../../../domain/scheduler';
import { expandSuccessions } from '../../../domain/succession';

let rafId: number | null = null;
let cachedResult: ScheduleEvent[] = [];

export function useTransientSchedule(): ScheduleEvent[] {
  const plan = usePlanStore((s) => s.plan);
  const catalog = useCatalogStore(selectMerged);
  const transientEdit = useDragStore((s) => s.transientEdit);

  return useMemo(() => {
    if (!plan || !transientEdit) return [];
    // Apply transient edit to a shallow-copied plan (NOT mutating store).
    const previewPlan = {
      ...plan,
      edits: [...plan.edits.filter(/* drop existing edit for same event */),
              transientEdit],
    };
    const expanded = expandSuccessions(previewPlan, catalog);
    return generateSchedule(expanded, catalog);
  }, [plan, catalog, transientEdit]);
}

// Caller (DragLayer.tsx) wraps setState in rAF:
function onDragMove(event) {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    useDragStore.getState().setTransientEdit(computeEditFromDeltaX(event.delta.x));
  });
}
```

### Pattern 4: zundo `temporal` middleware — middleware order + handleSet debounce

**What:** Wrap `planStore` with `persist(temporal(...))` in that order. Use `partialize` to track only `plan` (excluding ephemeral fields). Use `handleSet` to debounce the drag stream so 60Hz transient ghost updates don't pollute history — only commit at pointerup creates a new history entry.

**Why this order:** [CITED: github.com/charkour/zundo README] persist must be OUTER, temporal INNER. The outer persist serializes the materialized plan to localStorage. The inner temporal tracks history in-memory. Garden Gantt does NOT use `wrapTemporal(persist(...))` — history is in-memory only per D-14, so reload starts fresh history (intentional: undo across reload would surprise users).

**Example:**

```typescript
// src/stores/planStore.ts (extension)
import { temporal } from 'zundo';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import type { TemporalState } from 'zundo';

interface PlanState { /* existing + new setters */ }
type PartializedPlanState = Pick<PlanState, 'plan'>;

export const usePlanStore = create<PlanState>()(
  persist(
    temporal(
      (set, get) => ({
        plan: null,
        // ... existing setters
        // NEW Phase 3 setters:
        commitEdit: (edit) => set((s) => /* append to plan.edits */),
        lockEvent: (plantingId, eventType) => set(/* set Planting.locks[eventType] = true */),
        unlockEvent: (plantingId, eventType) => set(/* set Planting.locks[eventType] = false */),
        addCustomTask: (task) => set(/* push to plan.customTasks */),
        editCustomTask: (id, patch) => set(/* update by id */),
        removeCustomTask: (id) => set(/* filter */),
        toggleTaskCompletion: (key) => set(/* toggle in plan.completedTaskIds */),
      }),
      {
        limit: 20,
        partialize: (state) => ({ plan: state.plan }),
        // Debounce: collapse drag-stream into one history entry on commit.
        handleSet: (handleSet) => {
          let pending: PlanState | null = null;
          return (state) => {
            pending = state;
            // Skip intermediate sets; only commit when pointer is up.
            // Simpler implementation: rAF-debounce so pointermove → many sets → one rAF tick.
            if (rafScheduled) return;
            rafScheduled = true;
            requestAnimationFrame(() => {
              rafScheduled = false;
              if (pending) handleSet(pending);
            });
          };
        },
      },
    ),
    {
      name: 'garden-gantt:plan',
      version: 3, // bumped from 2 for locks + completedTaskIds
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, fromVersion) => migrateToCurrent(persisted, fromVersion) as PlanState,
    },
  ),
);

// Reactive temporal hook for keybindings + history badges.
type TS = TemporalState<PartializedPlanState>;
export function useTemporalStore<T>(selector: (s: TS) => T): T {
  return useStoreWithEqualityFn(usePlanStore.temporal as any, selector);
}

// Imperative access (for keybindings, no React rerender):
export function getTemporal() {
  return (usePlanStore.temporal as any).getState() as {
    undo: () => void; redo: () => void; clear: () => void;
    pastStates: PartializedPlanState[]; futureStates: PartializedPlanState[];
  };
}
```

**Keybinding wiring (D-18):**

```typescript
// src/stores/historyBindings.ts
import { useEffect } from 'react';
import { getTemporal } from './planStore';

function isFormFocus(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches('input, textarea, [contenteditable="true"]');
}

export function useHistoryKeybindings() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isFormFocus(e.target)) return;
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        getTemporal().undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        getTemporal().redo();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
// Mount in AppShell: useHistoryKeybindings();
```

### Pattern 5: Lock-aware engine wrapper (preserves purity)

**What:** A pure thin wrapper around `generateSchedule` that consults the lock map. Locked events are read from `plan.edits` and treated as fixed anchors; unlocked events recompute downstream of the locked event using the standard offsets.

**When to use:** Any consumer of `useDerivedSchedule` (gantt + calendar + tasks). Engine purity invariant means the lock map is INPUT data, not React state mutation.

**Example:**

```typescript
// src/domain/schedulerWithLocks.ts
import { generateSchedule } from './scheduler';
import type { GardenPlan, Plant, ScheduleEvent, EventType } from './types';

export function generateScheduleWithLocks(
  plan: GardenPlan,
  catalog: ReadonlyMap<string, Plant>,
): ScheduleEvent[] {
  // 1) Run the standard engine. It already consumes plan.edits.
  const events = generateSchedule(plan, catalog);

  // 2) For each locked event, ensure its date matches the corresponding edit.
  //    The engine should already do this, but be defensive:
  return events.map((e) => {
    const planting = plan.plantings.find((p) => p.id === e.plantingId);
    const isLocked = planting?.locks?.[e.type] === true;
    if (!isLocked) return e;
    // Locked: reflect the edit verbatim (or the original computed if no edit).
    const edit = plan.edits.find(
      (ed) => ed.plantingId === e.plantingId && ed.eventType === e.type,
    );
    if (!edit) return { ...e, edited: false }; // locked-on-default
    return { ...e, start: edit.startOverride, end: edit.endOverride ?? edit.startOverride, edited: true };
  });
}
```

> **Note:** the existing `generateSchedule` does NOT yet consume `plan.edits` — that wiring is part of Phase 3 (GANTT-07). Plan task should add edit-respecting logic to `eventsForPlanting` (read edit before computing, prefer edit dates if present), then this wrapper just validates the lock contract.

### Pattern 6: Pure adapter — `ScheduleEvent[]` + `Task[]` → FullCalendar event objects

**What:** A pure selector that maps domain shapes to FullCalendar's `EventInput[]`. Every output event carries `extendedProps.eventType` so styling and click-handling can dispatch on event type.

**When to use:** The single point where domain shapes meet FullCalendar — keeps FullCalendar concerns out of the domain.

**Example:**

```typescript
// src/features/calendar/selectEventsForCalendar.ts
import type { ScheduleEvent, Task } from '../../domain/types';
import type { EventInput } from '@fullcalendar/core';
import { lifecyclePalette } from '../gantt/lifecyclePalette';

export function selectEventsForCalendar(
  events: ScheduleEvent[],
  tasks: Task[],
): EventInput[] {
  const out: EventInput[] = [];

  // Lifecycle anchors + ranges.
  for (const e of events) {
    // Skip auto-task event types — those come through the tasks array as Task[].
    if (e.type === 'water-seedlings' || e.type === 'harden-off-day' || e.type === 'fertilize-at-flowering') continue;
    out.push({
      id: e.id,
      title: humanLabel(e.type),
      start: e.start.slice(0, 10), // YYYY-MM-DD
      end: e.end !== e.start ? addOneDay(e.end.slice(0, 10)) : undefined, // FC end is exclusive
      backgroundColor: lifecyclePalette[e.type],
      borderColor: lifecyclePalette[e.type],
      extendedProps: { kind: 'lifecycle', eventType: e.type, plantingId: e.plantingId },
    });
  }

  // Tasks (auto + custom + recurring expanded).
  for (const t of tasks) {
    out.push({
      id: `task:${t.id}`,
      title: t.title,
      start: t.dueDate.slice(0, 10),
      backgroundColor: '#f5f5f4', // stone-100 — neutral; differentiates from lifecycle
      borderColor: '#a8a29e',
      extendedProps: { kind: 'task', category: t.category, taskId: t.id },
    });
  }
  return out;
}
```

### Pattern 7: Recurring-task occurrence expansion + composite completion key

**What:** Custom tasks with `recurrence` are expanded into per-occurrence `Task[]` over the visible date range. Completion is per-occurrence — keys are `${taskId}:${YYYY-MM-DD}`. Bare `taskId` (no colon) means a one-off task with global completion.

**When to use:** Anywhere recurring tasks are consumed (calendar, dashboard, day-detail drawer).

**Example:**

```typescript
// src/domain/taskEmitter.ts (EXTEND)
import { addDays, parseDate, toISODate, differenceInDays } from './dateWrappers';
import type { CustomTask, Task } from './types';

export function expandRecurringTasks(
  customTasks: CustomTask[],
  rangeStart: string, // YYYY-MM-DD
  rangeEnd: string,
  completedKeys: ReadonlySet<string>,
): Task[] {
  const out: Task[] = [];
  const start = parseDate(rangeStart);
  const end = parseDate(rangeEnd);

  for (const ct of customTasks) {
    if (!ct.recurrence) {
      // One-off: completion key is bare ct.id.
      const due = parseDate(ct.dueDate);
      if (due >= start && due <= end) {
        out.push({ ...ct, source: 'custom', completed: completedKeys.has(ct.id) });
      }
      continue;
    }

    const interval = ct.recurrence.type === 'daily' ? 1
      : ct.recurrence.type === 'weekly' ? 7
      : ct.recurrence.intervalDays ?? 7;
    const stopAt = ct.recurrence.endDate ? parseDate(ct.recurrence.endDate) : end;
    const effectiveEnd = stopAt < end ? stopAt : end;

    let cursor = parseDate(ct.dueDate);
    while (cursor <= effectiveEnd) {
      if (cursor >= start) {
        const dateStr = toISODate(cursor).slice(0, 10);
        const key = `${ct.id}:${dateStr}`;
        out.push({
          ...ct,
          id: key, // expanded occurrence's id IS the composite key
          source: 'custom',
          dueDate: toISODate(cursor),
          completed: completedKeys.has(key),
        });
      }
      cursor = addDays(cursor, interval);
    }
  }
  return out;
}
```

### Pattern 8: URL-as-state for view + day-detail (deep-link survival per DEPLOY-02)

**What:** `?view=gantt|calendar` and `?date=YYYY-MM-DD` live in the URL via React Router 7's `useSearchParams`. Drawer open/closed is derived from URL presence of `date` — back-button-closes is automatic.

**When to use:** Any UI state that benefits from refresh-restore + deep-linking (view switch, day-detail).

**Example:**

```typescript
// src/features/calendar/useDayDetailUrl.ts
import { useSearchParams } from 'react-router';

export function useDayDetailUrl() {
  const [params, setParams] = useSearchParams();
  const selectedDate = params.get('date'); // 'YYYY-MM-DD' or null
  const isOpen = selectedDate !== null;

  function open(dateStr: string) {
    const next = new URLSearchParams(params);
    next.set('date', dateStr);
    setParams(next, { replace: false }); // pushState — back-button closes
  }
  function close() {
    const next = new URLSearchParams(params);
    next.delete('date');
    setParams(next, { replace: false });
  }
  return { selectedDate, isOpen, open, close };
}
```

### Anti-Patterns to Avoid

- **Don't put `useDraggable` directly on `<rect>` SVG elements without a `setNodeRef` wrapper** — the `<g>` parent is the safer mount point. dnd-kit's `setNodeRef` works on any DOM node, but bounding-rect calculations behave more predictably on `<g>` than on `<rect>`. Use `<g ref={setNodeRef}>` and put the visual `<rect>` inside.
- **Don't render the `<DragOverlay>` conditionally** — dnd-kit's docs explicitly state "Remain mounted at all times. Conditionally rendering the overlay itself (not just children) breaks drop animations." Conditional render goes inside the overlay, not around it.
- **Don't try to wrap individual planStore actions in `temporal` calls** — zundo intercepts ALL `set` calls automatically; no per-action plumbing needed.
- **Don't persist the temporal history** — D-14 explicitly excludes `wrapTemporal(persist(...))`. Reload-fresh is intentional.
- **Don't put transient drag state in `planStore`** — D-17 mandates a separate `dragStore` (no persist, no temporal). Otherwise every pointermove pollutes localStorage AND undo history.
- **Don't compute "today" by `new Date()` inside `domain/`** — use `dateWrappers.nowISOString()` or pass `today` as a parameter. ESLint enforces this.
- **Don't bypass `dateWrappers` in new directories outside `src/features/gantt/**`** — `src/features/calendar/` and `src/features/tasks/` are NOT allowlisted; they must use `dateWrappers` helpers.
- **Don't render auto-task `ScheduleEvent` types as colored bars in the gantt** — `lifecyclePalette` intentionally omits them (Phase 1 Plan 08 invariant). They appear only on the calendar (as Task entries) and dashboard.
- **Don't read `planStore.temporal.pastStates` directly in render** — the docs warn: "properties such as `pastStates` and `futureStates` are not reactive when accessed directly from the store." Use `useStoreWithEqualityFn(usePlanStore.temporal, selector)` for reactive access.
- **Don't make the calendar drag-interactive in Phase 3** — D-25 explicitly defers; calendar stays read-only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pointer drag with cancel/scroll-lock/touch-action | Custom `pointerdown`/`pointermove`/`pointerup` listeners | `@dnd-kit/core` `useDraggable` + `PointerSensor` | Mobile touch handling, keyboard a11y prep, drop animation, overlay portal — solved problems |
| Per-drag-tick clamp logic | onPointerMove handler that calls `setState` and React state updates inside | `@dnd-kit` modifier function | Modifier runs in the drag manager BEFORE bar visually moves; React re-renders happen once per state change rather than once per move |
| Undo/redo stack | Hand-rolled `history: GardenPlan[]` slice with manual undo/redo setters | `zundo` `temporal` middleware | `partialize`, `limit`, `handleSet` debounce, `equality`, reactive `pastStates`/`futureStates` — all solved |
| Drag history coalescing | Manual `lastSetTime` tracking | zundo `handleSet` callback | One-line throttle/debounce wrapper |
| Calendar grid rendering with month/week views, popovers, view switching | Custom CSS grid + date math | FullCalendar 6.1 + free plugins | Mature event positioning, accessibility, popover overflow, view switching, header toolbar |
| `ScheduleEvent` → calendar event conversion | Inline mapping inside `<CalendarView>` JSX | Pure `selectEventsForCalendar(events, tasks)` selector | Testable in isolation; same pattern as `useDerivedSchedule` |
| Recurring-task occurrence expansion | Ad-hoc loop inside dashboard component | Pure `expandRecurringTasks(tasks, range, completed)` in `taskEmitter.ts` | Same expansion needed for calendar + dashboard + day-detail; single source |
| Day-detail panel state (open/closed/selectedDate) | `useState` in CalendarView | URL search params via `useSearchParams` | Back-button closes for free; deep-link works; refresh restores; per DEPLOY-02 |
| Floating tooltip positioning | Hand-rolled position calculations | Floating-cursor → portaled pill (D-09); mostly CSS + a `useEffect` to read viewport edge | Phase 4 a11y wires `aria-live`; portaled today, no restructuring later |
| Composite-key completion semantics | Branching code (if recurring vs one-off) at every consumer | `${taskId}:${ISODate}` convention + helper `isOccurrenceKey(key)` | Type-system unification; same `completedTaskIds: string[]` field handles both cases |

**Key insight:** Phase 3 has zero new I/O sites and zero new pure-domain math (the engine is already correct). Every "Don't Hand-Roll" item is about leaning on the libraries already chosen and the patterns already established — not about importing new abstractions.

## Runtime State Inventory

> Phase 3 is a feature-add phase, not a rename/refactor phase. However, schema migrations DO introduce runtime state concerns worth inventorying.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | localStorage entry `garden-gantt:plan` (Zustand persist; current `version: 2`) carries `GardenPlan` JSON. Phase 3 bumps to `version: 3` for new fields (`Planting.locks`, `GardenPlan.completedTaskIds`). Existing `plan.edits: ScheduleEdit[]` and `plan.customTasks: CustomTask[]` arrays exist but are untyped (`z.array(z.unknown())` per `schemas.ts:100-101`). | (1) Add v2→v3 migration in `domain/migrations.ts` initializing `locks: {}` per planting and `completedTaskIds: []`. (2) Tighten `customTasks` and `edits` schemas (Phase 3 task per `schemas.ts:100-101` comment). (3) Update `importPlan.ts` migrate path (Pitfall E — single source of truth). |
| Live service config | None — single-user web app, no backend services, no external configuration store. | None. |
| OS-registered state | None — browser app. No OS scheduling, no system services. | None. |
| Secrets/env vars | None — Permapeople worker proxy is the only secret consumer (Phase 2), and Phase 3 doesn't touch it. | None. |
| Build artifacts | TypeScript build (`tsc -b && vite build`) emits hashed JS to `dist/`. New `React.lazy` chunk for FullCalendar will produce a separate dynamic-import chunk; ensure Vite's chunk-naming pattern is stable enough for cache (CLAUDE.md DEPLOY-03 references hashed filenames). | Verify the FullCalendar lazy chunk is emitted as a separate hashed file (not inlined). |

**Verified by:** `grep "garden-gantt:plan" src/` (used only in `planStore.ts:182`); `grep version src/stores/planStore.ts` (current `SCHEMA_VERSION = 2` from `migrations.ts:11`); `cat src/domain/migrations.ts` (only `2:` migration registered today).

## Common Pitfalls

### Pitfall 1: dnd-kit context re-renders ALL draggables on drag start

**What goes wrong:** Issue [#1071](https://github.com/clauderic/dnd-kit/issues/1071) — when one bar starts dragging, the `active` value on dnd-kit's internal context changes, which re-renders every component subscribing via `useDraggable`. With ~50 plantings × 6 events = ~300 draggables, this is a real perf cliff.

**Why it happens:** dnd-kit v6 exposes `active` as a context value rather than via a function-selector. Every consumer re-renders when `active.id` changes.

**How to avoid:** D-21 already addresses this: `useMemo` per-bar selectors keyed on `(eventId, start, end, edited)` so React skips re-render when dates haven't changed. Additionally, render the bar visual content from a memoized `Bar` component — the `useDraggable` call returns transform that triggers re-render only on the bar being dragged.

**Warning signs:** Drag feels janky on plans with >100 events; React DevTools Profiler shows every Bar component flashing on `dragstart`.

### Pitfall 2: SVG `<rect>` + `useDraggable` ref placement

**What goes wrong:** Putting `setNodeRef` on `<rect>` directly produces inconsistent bounding-rect measurements because SVG element rects depend on `viewBox` transforms. Drag deltas can be off-axis.

**Why it happens:** dnd-kit measures DOM rects via `getBoundingClientRect()`; SVG transforms are applied differently than CSS transforms.

**How to avoid:** Wrap each draggable bar in a `<g ref={setNodeRef} {...listeners} {...attributes}>` and put the visual `<rect>` inside. The `<g>` element's bounding-rect is computed from its children's union, which is what we want.

**Warning signs:** Bars jump on drag-start; transform deltas don't match pixel movement; dragging from the right edge of a bar produces the same delta as dragging from the left.

### Pitfall 3: zundo middleware ordering — silent data loss

**What goes wrong:** If `temporal` is OUTER and `persist` is INNER, persist serializes the temporal store's *internal shape* (with `pastStates`, `futureStates`), and on rehydrate, the user's plan looks empty.

**Why it happens:** Middleware composition order matters — outer middleware wraps the inner store and sees only the inner store's exposed state.

**How to avoid:** Always `persist(temporal(planSlice, opts))` — persist OUTER, temporal INNER. CONTEXT D-14 locks this order. [CITED: github.com/charkour/zundo README]

**Warning signs:** After the first reload, the plan is null even though localStorage has data; the persist key contains `pastStates` arrays.

### Pitfall 4: handleSet rAF debounce drops the final commit

**What goes wrong:** A naive rAF debounce skips intermediate `set()` calls but ALSO skips the final commit if it lands inside the same animation frame as a transient update.

**Why it happens:** `requestAnimationFrame` coalesces all calls in the current tick; the rAF callback fires once with the LAST pending value — which may be the transient one if the commit happened first.

**How to avoid:** Two strategies: (a) explicitly `flushHistoryDebounce()` from the drag commit handler before `commitEdit(edit)`; (b) treat drag commit as a different write path that bypasses debounce — use `usePlanStore.temporal.getState()` to imperatively `pause()` during drag and `resume()` after commit. The simpler answer: don't put transient state in planStore at all (D-17) — only commits hit planStore, so debounce becomes unnecessary.

**Warning signs:** After a drag, Cmd-Z does nothing OR Cmd-Z reverts to a state that was never visible to the user.

### Pitfall 5: FullCalendar end dates are EXCLUSIVE

**What goes wrong:** Mapping a `ScheduleEvent` with `start: '2026-05-15'` and `end: '2026-05-20'` directly to a FullCalendar event renders it as May 15-19 (4 days), not May 15-20 (5 days).

**Why it happens:** FullCalendar's `end` is exclusive — it's the date AFTER the last day the event covers.

**How to avoid:** In `selectEventsForCalendar`, add one day to the end date when mapping multi-day events. Use `addDays(parseDate(e.end), 1)` from `dateWrappers`. Validate with a snapshot test on a 5-day harvest window.

**Warning signs:** Multi-day events on the calendar appear one day shorter than on the gantt.

### Pitfall 6: React.lazy + ErrorBoundary integration

**What goes wrong:** A failed FullCalendar lazy-load (network error, code-split chunk missing after deploy with stale cache) crashes the app because `React.lazy` throws on promise rejection.

**Why it happens:** `React.lazy` requires a Suspense boundary AND an ErrorBoundary to recover from chunk-load failure.

**How to avoid:** Wrap `<CalendarView>` in `<Suspense fallback={...}>` AND ensure the existing `<ErrorBoundary>` (already in `App.tsx:21`) catches the failure. Provide a "Reload calendar" button in the error UI that retries the import. The DEPLOY-03 hashed-asset rule + uncached `index.html` mitigates the most common cause (stale cache after deploy).

**Warning signs:** After a deploy, users on the gantt tab can't switch to calendar — the page goes white and ErrorBoundary doesn't catch it.

### Pitfall 7: Recurring-task expansion across calendar pages

**What goes wrong:** If recurring-task expansion is bounded by the visible calendar range, the dashboard's "This Week" partition can show different tasks than the calendar — because they expand against different ranges.

**Why it happens:** Two consumers, two range computations, two different result sets.

**How to avoid:** Centralize the expansion: `useExpandedTasks(rangeStart, rangeEnd)` is a hook used by BOTH calendar and dashboard. The dashboard always passes `today..today+7`; the calendar passes the visible month/week range. Same function; same date math. Test that for a recurring task starting 2026-05-01 with `interval: 7`, the same Tuesday occurrences appear in both consumers.

**Warning signs:** Task X shows on the dashboard for Wed but not on the calendar's Wed cell (or vice versa).

### Pitfall 8: ConstraintTooltip clipping inside `<svg>`

**What goes wrong:** Rendering the tooltip pill inside the SVG plot area means it gets clipped by the `<div overflow-x-auto>` scroll container, and SVG `<text>` doesn't support multi-line wrapping.

**Why it happens:** SVG and HTML have different layout systems; the tooltip needs HTML-like flow + portal.

**How to avoid:** D-10 already mandates portaling. Use `createPortal(<ConstraintPill {...} />, document.body)` and position the pill via fixed-position CSS using the bar's `getBoundingClientRect()` at snap-back time. Use a Radix `<Tooltip.Root>` if you want the a11y primitives now (Phase 4 a11y wiring becomes free).

**Warning signs:** Tooltip cut off when bar is near right edge; tooltip text overflows on long reasons strings.

### Pitfall 9: Lock toggle on a derived (non-draggable) event

**What goes wrong:** User Alt-clicks a `harden-off` bar (D-06: NOT draggable). Either (a) nothing happens, surprising the user, OR (b) the lock map gains a key for `harden-off`, but cascade reflow ignores it because the engine doesn't read locks for derived events.

**Why it happens:** D-06 makes 5 event types non-draggable, but lock toggle should still apply to ALL events the user can see (locking the auto-derived `germination-window` is a legitimate "the seedlings have already germinated" use case).

**How to avoid:** Lock toggle is independent of drag — it applies to all 9 event types. `LockToggle.tsx` is rendered on every bar (including pointer-events-none derived bars). The lock-aware engine wrapper (Pattern 5) respects the lock map for ALL event types. Decide explicitly in the planning task: do we expose lock UI on derived bars in v1 or only on draggable bars? The CONTEXT.md leaves this to discretion — D-13 says "per event-type" without restricting to draggable. Recommendation: expose on all bars to avoid surprises.

**Warning signs:** User locks a `harden-off` bar, drags `transplant`, and the harden-off range moves anyway. User locks `germination-window`, drags `indoor-start`, and germination jumps.

### Pitfall 10: schema v2→v3 migration on import path

**What goes wrong:** Phase 2 imports a v1 export envelope and runs the v1→v2 migration in `importPlan.ts`. Phase 3 adds v3, but if the import code only chains v1→v2 (not v1→v3 OR v2→v3), users importing old exports get v2-shaped plans into a v3 store, crashing on missing `locks` field.

**Why it happens:** `migrateToCurrent` walks `fromVersion + 1` through `CURRENT_SCHEMA_VERSION`, but the importer needs to bump `CURRENT_SCHEMA_VERSION` AND register the v3 migration AND update `ExportEnvelopeSchema` to accept v3.

**How to avoid:** Follow the Pitfall E pattern from Phase 2 — single source of truth in `migrations.ts`. Update `CURRENT_SCHEMA_VERSION = 3`, register `migrations[3]`, update `ExportEnvelopeSchema` to allow `schemaVersion: z.union([z.literal(1), z.literal(2), z.literal(3)])`. Add an integration test that imports a v1 envelope and a v2 envelope and verifies the resulting plan has `locks: {}` and `completedTaskIds: []` on every applicable shape.

**Warning signs:** Import of an old export crashes with `Cannot read properties of undefined (reading 'transplant')` (lock-map access on a planting that never got migrated).

## Code Examples

Verified patterns from official sources and the existing repo:

### Example A: DragLayer wrapping GanttView

```typescript
// src/features/gantt/drag/DragLayer.tsx
// Source: [CITED: dndkit.com/api-documentation/draggable/drag-overlay]
//         [CITED: src/features/gantt/GanttView.tsx — existing render]
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState, type ReactNode } from 'react';
import { GhostOverlay } from './GhostOverlay';
import { useDragStore } from '../../../stores/dragStore';
import { usePlanStore } from '../../../stores/planStore';

interface Props { children: ReactNode; }

export function DragLayer({ children }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 }, // 4px deadzone — prevent accidental drags on click
    }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => {
        setActiveId(String(e.active.id));
        useDragStore.getState().beginDrag(String(e.active.id));
      }}
      onDragMove={() => {
        // The clampModifier on each useDraggable already wrote transientEdit
        // and lastConstraintViolation — nothing to do here.
      }}
      onDragEnd={(e) => {
        const dragStore = useDragStore.getState();
        const transientEdit = dragStore.transientEdit;
        if (transientEdit) {
          // Commit the edit to planStore (zundo records ONE history entry).
          usePlanStore.getState().commitEdit(transientEdit);
        }
        dragStore.endDrag();
        setActiveId(null);
      }}
      onDragCancel={() => {
        useDragStore.getState().endDrag();
        setActiveId(null);
      }}
    >
      {children}
      {/* Remain mounted at all times per dnd-kit docs */}
      <DragOverlay dropAnimation={null}>
        {activeId ? <GhostOverlay activeId={activeId} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### Example B: planStore extension with temporal + handleSet

(See Pattern 4 above — full code block.)

### Example C: Tasks dashboard partition selector

```typescript
// src/features/tasks/useTodayWeekOverdue.ts
import { useMemo } from 'react';
import { parseDate, addDays, toISODate } from '../../domain/dateWrappers';
import type { Task } from '../../domain/types';

export function useTodayWeekOverdue(tasks: Task[], todayISO: string) {
  return useMemo(() => {
    const today = parseDate(todayISO);
    const todayStr = toISODate(today).slice(0, 10);
    const weekEnd = addDays(today, 7);

    const todayBucket: Task[] = [];
    const weekBucket: Task[] = [];
    const overdueBucket: Task[] = [];

    for (const t of tasks) {
      if (t.completed) continue;
      const due = parseDate(t.dueDate);
      const dueStr = toISODate(due).slice(0, 10);
      if (dueStr < todayStr) {
        overdueBucket.push(t);
        todayBucket.push(t); // D-32: Today merges overdue
      } else if (dueStr === todayStr) {
        todayBucket.push(t);
      } else if (due <= weekEnd) {
        weekBucket.push(t);
      }
    }
    return { today: todayBucket, week: weekBucket, overdue: overdueBucket };
  }, [tasks, todayISO]);
}
```

### Example D: CalendarView with React.lazy code-split

```typescript
// src/features/plan/PlanRoute.tsx
import { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router';
import { GanttView } from '../gantt/GanttView';

const CalendarView = lazy(() =>
  import('../calendar/CalendarView').then((m) => ({ default: m.CalendarView })),
);

export function PlanRoute() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'calendar' ? 'calendar' : 'gantt';

  function setView(next: 'gantt' | 'calendar') {
    const np = new URLSearchParams(params);
    np.set('view', next);
    setParams(np, { replace: true });
  }

  return (
    <>
      <TabStrip view={view} onChange={setView} />
      {view === 'gantt' ? (
        <GanttView />
      ) : (
        <Suspense fallback={<CalendarLoadingShell />}>
          <CalendarView />
        </Suspense>
      )}
    </>
  );
}
```

### Example E: FullCalendar wrapper with lazy import + dateClick

```typescript
// src/features/calendar/CalendarView.tsx
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useDerivedSchedule } from '../gantt/useDerivedSchedule';
import { useExpandedTasks } from '../tasks/useExpandedTasks';
import { selectEventsForCalendar } from './selectEventsForCalendar';
import { useDayDetailUrl } from './useDayDetailUrl';
import { DayDetailDrawer } from './DayDetailDrawer';

export function CalendarView() {
  const events = useDerivedSchedule();
  const tasks = useExpandedTasks(/* visible range */);
  const { open } = useDayDetailUrl();
  const fcEvents = selectEventsForCalendar(events, tasks);

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek',
        }}
        events={fcEvents}
        dayMaxEvents={3}
        dateClick={(info) => open(info.dateStr)} // 'YYYY-MM-DD'
      />
      <DayDetailDrawer />
    </>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-beautiful-dnd` | `@dnd-kit/core` | Atlassian deprecated rbd in 2024; dnd-kit is now the React DnD default | Use dnd-kit; rbd is in maintenance-only mode |
| `redux-undo` for undo/redo | `zundo` for Zustand stores | Zustand became default Redux alternative; `zundo` is the canonical undo middleware for Zustand | Use zundo; redux-undo still works for Redux apps |
| FullCalendar v5 with monkey-patched popover | FullCalendar v6.1 with built-in `dayMaxEvents` popover | v6 release line is current; popover is no longer experimental | Use v6.1; v5 docs are superseded |
| `react-big-calendar` for free month/week | FullCalendar 6 free plugins | FullCalendar premium is for resource timelines only; month/week is free | FullCalendar 6 with daygrid/timegrid is the cleaner choice when you don't need resource views |
| Hand-rolled URL state with `window.location` | React Router 7 `useSearchParams` | RR7 cleaned up the SPA pattern | Use `useSearchParams`; manual is error-prone |

**Deprecated/outdated to avoid:**
- **react-beautiful-dnd** — Atlassian moved to maintenance-only; new projects should not adopt it.
- **dhtmlx-gantt commercial editions, Bryntum, gantt-schedule-timeline-calendar, SVAR PRO features** — already banned in CLAUDE.md.
- **`@dnd-kit/sortable`** — Phase 3 does NOT need sortable (no row reorder); plus there are open R19 issues with sortable. Stick to `@dnd-kit/core` `useDraggable`.
- **`@dnd-kit/react` (the v7 rewrite)** — beta, different API; v6 is stable and locked for Phase 3.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Existing `generateSchedule` will be extended in Phase 3 to read `plan.edits` and prefer edit dates over computed dates | Pattern 5 + GANTT-07 | If we leave the engine ignoring `edits`, drag commits won't actually move bars persistently; the engine wiring to consume `plan.edits[]` is a Phase 3 implementation task that must be planned. Confirmed by reading `scheduler.ts` — the file currently has no `plan.edits` consumption; all events are recomputed from `plan.location.lastFrostDate` + plant timing offsets. [VERIFIED via repo grep] — moving from ASSUMED to VERIFIED-MUST-IMPLEMENT. |
| A2 | The lock-aware wrapper can live OUTSIDE `generateSchedule` without engine changes | Pattern 5 | If the engine doesn't read locks from inside `eventsForPlanting`, downstream cascade calculations may use unlocked dates even when locks are set. Recommendation: have the planning task choose between (a) modifying `eventsForPlanting` to take a lock map parameter, or (b) post-pass that overrides locked event start/end. (b) is simpler but less correct for cascade math (downstream events computed from unlocked anchor would shift). |
| A3 | dnd-kit's modifier function receives sufficient context to clamp via the existing `canMove` signature | Pattern 1 | If the modifier doesn't have access to plan + plant + scale at modifier-creation time, we'd need a higher-order pattern. CONFIRMED by docs — modifiers are just functions over `args` and we close over plan/plant/scale via factory function `makeClampModifier(args)`. [VERIFIED] |
| A4 | The Phase 3 schema bump v2→v3 is the right place to add `Planting.locks` and `GardenPlan.completedTaskIds` | Project Structure + Pitfall 10 | If `completedTaskIds` ends up needing per-occurrence metadata (e.g., `completedAt`, `completedBy`), a flat `string[]` won't scale. For v1 single-user, flat array is correct; v2 multi-user would force a rewrite anyway. |
| A5 | rAF-debounced `handleSet` correctly collapses drag stream into one history entry | Pitfall 4 | If the rAF callback fires during the same frame as commit, the commit may be lost. Mitigation: don't put transient drag state in planStore at all (D-17 already mandates). Need to verify in test that a drag → commit sequence produces exactly ONE history entry. |
| A6 | FullCalendar's `dateClick` fires reliably on touch devices | D-29 | If dateClick is unreliable on mobile, the day-detail drawer entry path breaks. Mobile is Phase 4 anyway, but verify desktop touch (trackpad) works in Phase 3. |
| A7 | The bundled `@fullcalendar/*` packages stay version-locked together (`~6.1.20`) | Standard Stack | If a transitive `@fullcalendar/core` mismatch occurs (e.g., `@fullcalendar/react` pulls a different patch than `@fullcalendar/daygrid`), the Calendar throws. Use `npm ls @fullcalendar/core` after install to verify single-version. The `~6.1.20` peer constraint enforces this at install time. [VERIFIED via `npm view`] |
| A8 | `lucide-react@1.11.0` includes the `Lock` icon needed by D-11/D-12 | Standard Stack | If Lock isn't exported, planner picks an alternate glyph (already discretionary per CONTEXT). Quick verification: `import { Lock } from 'lucide-react'` should typecheck. lucide-react ships ~1500 icons including Lock; very low risk. |

**Total assumed claims:** 8. All flagged for the planner — assumptions A1, A2, A5 are the highest risk and should appear as explicit verification steps in the relevant plans.

## Open Questions

1. **Should the lock toggle UI be exposed on derived (non-draggable) bars?**
   - What we know: D-13 says lock state is per-event-type; D-06 says certain bars are non-draggable.
   - What's unclear: Whether to render the LockToggle component on `harden-off` / `germination-window` / auto-task bars.
   - Recommendation: Yes — lock applies to all events the user sees; drag is a separate concern. Document this in the plan.

2. **Where should `commitEdit` deduplicate against existing edits for the same event?**
   - What we know: `plan.edits: ScheduleEdit[]` is an append-only sparse-edit log per Phase 1 design.
   - What's unclear: If a user drags the same `transplant` bar twice, do we have two ScheduleEdits or do we dedupe to the latest?
   - Recommendation: Dedupe by `(plantingId, eventType)` — keep only the most recent. Saves storage and matches user intent. Append + filter on read works too; planner picks.

3. **Should `useExpandedTasks` cache occurrences across the whole season or expand on demand per visible range?**
   - What we know: 50 plantings × 6 events ≈ 30 auto-tasks/wk; user custom tasks ≪ 50. Total ~1000-2000 occurrences/season.
   - What's unclear: Whether re-expanding on every range change is cheap enough to skip caching.
   - Recommendation: Expand on demand (range-bounded). Sub-millisecond for these cardinalities; cache invalidation is the real cost.

4. **What's the keybinding behavior when the day-detail drawer is open?**
   - What we know: D-30 says drawer closes on Esc.
   - What's unclear: Should Cmd-Z while drawer is open undo the last plan mutation, or close the drawer?
   - Recommendation: Cmd-Z always undoes (uniform per D-15); drawer close requires Esc / X / outside-click.

5. **Should we test the drag interaction with Vitest 4 browser mode or with Playwright?**
   - What we know: Vitest 4 browser mode supports Playwright as the underlying engine; both are options. Existing tests are happy-dom + Vitest.
   - What's unclear: Whether the marginal test fidelity of real-browser drag justifies the setup cost.
   - Recommendation: Unit-test the constraint registry, the modifier function (call it directly with synthetic transform), and the cascade preview selector with happy-dom (cheap, fast). Reserve Playwright for one or two end-to-end "drag a bar, verify it commits, verify Cmd-Z reverts" smoke tests. Planner picks the exact split (CONTEXT explicitly delegates this).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `node` | All build/test | ✓ (existing project) | (existing) | — |
| `npm` | Package install | ✓ (existing project) | (existing) | — |
| `@dnd-kit/core` (npm registry) | Drag interactions | ✓ (npm) | 6.3.1 | — |
| `zundo` (npm registry) | Undo/redo | ✓ (npm) | 2.3.0 | — |
| `@fullcalendar/react` + plugins (npm registry) | Calendar view | ✓ (npm) | 6.1.20 | If npm install fails (network), defer Calendar entirely; gantt + tasks dashboard still ship. |
| Browser (Chrome/Firefox/Safari) with PointerEvent + `requestAnimationFrame` | Drag + ghost preview | ✓ (universal in target audience) | All evergreen | None — these are baseline 2026 browser features |
| localStorage (≥5MB quota) | Persisted plan with new `locks` + `completedTaskIds` fields | ✓ (Phase 1 verified) | — | iOS Safari Private Mode banner already shipped (Phase 1); Phase 3 changes don't introduce new storage paths |

**No external services, no new I/O sites, no env vars added in Phase 3.**

## Validation Architecture

> Note: `workflow.nyquist_validation` is `false` in `.planning/config.json`. This section is included for the planner's benefit — it's a public-surface map regardless.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + happy-dom 20.9.0 (existing); add `@vitest/browser` + Playwright 1.59.x for one E2E drag test (optional) |
| Config file | `vite.config.ts` (existing test block) |
| Quick run command | `npx vitest run --reporter=dot` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map (Public Surfaces)

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| GANTT-04 | Whole-bar drag emits ScheduleEdit on commit | unit (modifier called directly) + integration (DragLayer with synthetic pointer events) | `npx vitest run tests/features/gantt/drag/clampModifier.test.ts` | `tests/features/gantt/drag/clampModifier.test.ts` ❌ NEW |
| GANTT-05 | Constraint registry rejects/clamps invalid drags | unit | `npx vitest run tests/domain/constraints.test.ts` | `tests/domain/constraints.test.ts` (extend existing) |
| GANTT-06 | Ghost preview = generateSchedule(plan + transientEdit) | unit (selector) | `npx vitest run tests/features/gantt/drag/useTransientSchedule.test.ts` | NEW |
| GANTT-07 | commitEdit appends ScheduleEdit; engine reads it on next render | integration | `npx vitest run tests/integration/drag-commit.test.tsx` | NEW |
| GANTT-08 | Locked event held fixed during cascade reflow | unit (schedulerWithLocks) | `npx vitest run tests/domain/schedulerWithLocks.test.ts` | NEW |
| GANTT-09 | Constraint violation writes reasons to dragStore; tooltip renders | unit (clamp returns reasons) + component (tooltip mounts) | `npx vitest run tests/features/gantt/tooltip/ConstraintTooltip.test.tsx` | NEW |
| GANTT-10 | Cmd-Z undoes last drag; ≥20 levels of history | integration (zundo temporal API + planStore) | `npx vitest run tests/stores/temporal.test.ts` | NEW |
| CAL-01 | Same events render in gantt and calendar | unit (selectEventsForCalendar parity test) | `npx vitest run tests/features/calendar/selectEventsForCalendar.test.ts` | NEW |
| CAL-02 | Month + week views switchable | component (FullCalendar mounts both views) | `npx vitest run tests/features/calendar/CalendarView.test.tsx` | NEW |
| CAL-03 | Day click → drawer with events + tasks | integration | `npx vitest run tests/features/calendar/DayDetailDrawer.test.tsx` | NEW |
| TASK-01 | Auto-derived tasks appear in dashboard + calendar | integration | `npx vitest run tests/integration/auto-tasks-flow.test.tsx` | NEW |
| TASK-02 | Add custom one-off and recurring tasks | unit (planStore setters) + component (modal) | `npx vitest run tests/features/tasks/CustomTaskModal.test.tsx` | NEW |
| TASK-03 | Edit and delete custom tasks | unit + component | (same modal test) | NEW |
| TASK-04 | Per-row checkbox writes completedTaskIds | unit (toggleTaskCompletion setter) + component | `npx vitest run tests/features/tasks/TaskRow.test.tsx` | NEW |
| TASK-05 | Today/Week/Overdue partition | unit (pure selector with fixed `todayISO` injected) | `npx vitest run tests/features/tasks/useTodayWeekOverdue.test.ts` | NEW |
| TASK-06 | Group-by toggle resorts visible tasks | component | `npx vitest run tests/features/tasks/TasksDashboard.test.tsx` | NEW |
| Schema | v2→v3 migration adds locks + completedTaskIds | unit | `npx vitest run tests/domain/migrations.test.ts` (extend) | (extend existing) |
| Snapshot | Engine output stable across drag+commit cycle | snapshot | `npx vitest run tests/domain/scheduler.snapshot.test.ts` | (extend existing) |

### Public Surfaces (assertable observable outputs)

| Surface | What to Assert |
|---------|----------------|
| `clampModifier(args)({ transform, activeNodeRect })` | Returns `{x, y}` clamped to constraint boundary; writes correct `reasons[]` to dragStore |
| `useTransientSchedule()` | Returns `ScheduleEvent[]` matching `generateSchedule(plan + transientEdit, catalog)` byte-for-byte |
| `usePlanStore.getState().commitEdit(edit)` | Appends to `plan.edits`; ONE entry added to `temporal.pastStates` |
| `getTemporal().undo()` | Reverts to previous `pastStates[length-1]`; `plan.edits` matches pre-commit state |
| `selectEventsForCalendar(events, tasks)` | Returns FullCalendar `EventInput[]` with correct `extendedProps.eventType`, `start`, `end (exclusive)` |
| `expandRecurringTasks(tasks, range, completed)` | Returns `Task[]` with composite-key ids `${taskId}:${YYYY-MM-DD}` for occurrences in range |
| `useTodayWeekOverdue(tasks, todayISO)` | Returns `{today, week, overdue}` partition; overdue duplicates appear in today bucket |
| `parseImportFile(envelope)` for v1/v2 envelopes | Returns v3-shaped plan with `locks: {}` and `completedTaskIds: []` initialized |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=dot` (existing 153 tests + Phase 3 additions; should stay <15s)
- **Per wave merge:** Full suite green
- **Phase gate:** Full suite green + production build green (`npm run build`)

### Wave 0 Gaps

- `@dnd-kit/core`, `zundo`, `@fullcalendar/*` not yet installed (`package.json` doesn't list them) — install in first wave
- No `tests/features/gantt/drag/`, `tests/features/calendar/`, `tests/features/tasks/` directories exist — created with first feature plans
- No browser-mode test config in `vite.config.ts` if Playwright path is chosen — Wave 0 task to add `@vitest/browser` + Playwright if planner picks that route
- Snapshot file `tests/__snapshots__/scheduler.snapshot.test.ts.snap` will need new entries for drag-result cascade, lock-respecting reflow, and edit-respecting engine output — Wave 0 alignment with engine extension (A1)

## Sources

### Primary (HIGH confidence)

- npm registry live queries 2026-04-26: `@dnd-kit/core@6.3.1`, `zundo@2.3.0`, `@fullcalendar/react@6.1.20`, `@fullcalendar/daygrid@6.1.20`, `@fullcalendar/timegrid@6.1.20`, `@fullcalendar/interaction@6.1.20`, `lucide-react@1.11.0` — all peer-dep + version data verified.
- Existing repo files: `src/domain/{types,scheduler,constraints,migrations,schemas,dateWrappers,taskEmitter}.ts`, `src/stores/{planStore,uiStore,catalogStore}.ts`, `src/features/gantt/{GanttView,timeScale,lifecyclePalette,useDerivedSchedule}.tsx`, `src/app/{App,AppShell}.tsx`, `vite.config.ts`, `eslint.config.js`, `package.json`.
- `.planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md` — locked decisions D-01..D-37.
- `.planning/phases/03-drag-cascade-calendar-tasks/03-DISCUSSION-LOG.md` — alternatives considered.
- `.planning/phases/02-data-layer-first-end-to-end/02-VERIFICATION.md` — verified Phase 2 output state.
- `.planning/phases/01-foundation-schedule-engine/01-CONTEXT.md` — D-05..D-07 (bare-SVG locked), D-10..D-13 (event types).
- Context7 `/charkour/zundo` — temporal middleware API, `partialize`, `handleSet`, `wrapTemporal`, reactive `useTemporalStore` pattern.
- Context7 `/clauderic/dnd-kit` + `/websites/dndkit` — modifier API + DragOverlay + PointerSensor activation constraints.
- Context7 `/fullcalendar/fullcalendar-docs` — React wrapper, `dateClick`, `extendedProps`, `eventContent`, `dayMaxEvents`, custom rendering.
- [zundo README](https://github.com/charkour/zundo) — middleware order pattern (persist outer, temporal inner).
- [dnd-kit modifiers docs](https://dndkit.com/api-documentation/modifiers) — function signature `({transform}) => ({...transform, x: ...})`.
- [dnd-kit DragOverlay docs](https://dndkit.com/api-documentation/draggable/drag-overlay) — "remain mounted at all times" rule.
- [FullCalendar React docs](https://github.com/fullcalendar/fullcalendar-docs) — peer dep `react ^16.7 || ^17 || ^18 || ^19`.

### Secondary (MEDIUM confidence)

- [dnd-kit issue #1071](https://github.com/clauderic/dnd-kit/issues/1071) — re-render-on-drag-start performance issue (validates D-21 memoization mitigation).
- [dnd-kit issue #389](https://github.com/clauderic/dnd-kit/issues/389) — unnecessary rerenders cause poor performance.
- [dnd-kit issue #572 / #1025](https://github.com/clauderic/dnd-kit/issues/572) — ResizeObserver SSR + loop-limit issues (not blocking for Garden Gantt SPA).
- [FullCalendar issue #7344](https://github.com/fullcalendar/fullcalendar/issues) — custom popover not supported (validates D-29 custom drawer).

### Tertiary (LOW confidence — flagged for verification at planning time)

- "FullCalendar lazy-load chunk size ~80KB gz" (CONTEXT.md D-27) — number cited in CONTEXT but not independently verified; bundlephobia rate-limited. Planner should verify with actual `vite build --analyze` after wiring; if it's larger, the lazy-load decision is even more correct.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package version verified via `npm view`; peer-dep ranges confirmed; no R19 incompatibilities found.
- Architecture: HIGH — patterns directly derived from existing pure-domain core (Phases 1-2) and locked CONTEXT decisions; no new architectural inventions required.
- Pitfalls: HIGH on dnd-kit context re-render (issue #1071 confirmed open/known), zundo middleware order (zundo README direct quote), schema migration (existing Pattern E from Phase 2). MEDIUM on rAF debounce subtleties (Pitfall 4) — needs actual test exercise to confirm.
- Validation architecture: MEDIUM — surfaces are clear but planner must pick the unit/component/integration cuts; existing Vitest 4 + happy-dom infrastructure is good for everything except real-browser drag.

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (30 days — Phase 3 stack is stable; reverify if execution slips beyond 30 days, especially `@dnd-kit/core` and `zundo` versions).

## RESEARCH COMPLETE
