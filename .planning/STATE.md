---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 04 Plan 04 (onboarding coach marks) complete
last_updated: "2026-04-27T14:22:37.437Z"
last_activity: 2026-04-27
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 35
  completed_plans: 35
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-26)

**Core value:** Plug in your ZIP and your plants → get a correct, draggable lifecycle gantt for the season.
**Current focus:** Phase 04 — polish-mobile-ship

## Current Position

Phase: 04 (polish-mobile-ship) — EXECUTING
Plan: 6 of 7 complete (Wave 2 plan 04-04 done; 04-06 + 04-07 remaining; 04-05 already complete)
Status: Ready to execute
Last activity: 2026-04-27

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01-foundation-schedule-engine P01 | 6min | 2 tasks | 13 files |
| Phase 01 P02 | 2min | 2 tasks | 2 files |
| Phase 01-foundation-schedule-engine P03 | 3min | 2 tasks | 4 files |
| Phase 01-foundation-schedule-engine P04 | 4min | 3 tasks | 3 files |
| Phase 01-foundation-schedule-engine P06 | 6min | 3 tasks | 5 files |
| Phase 01-foundation-schedule-engine P05 | 3min | 2 tasks | 4 files |
| Phase 01-foundation-schedule-engine P07 | 2min | 2 tasks | 5 files |
| Phase 01-foundation-schedule-engine P08 | 4m 2s | 2 tasks | 7 files |
| Phase 03-drag-cascade-calendar-tasks P03 | 11min | 3 tasks | 17 files |
| Phase 03-drag-cascade-calendar-tasks P04 | 8min | 3 tasks | 10 files |
| Phase 03-drag-cascade-calendar-tasks P05 | 12min | 3 tasks | 12 files |
| Phase 03 P06 | 5min | 2 tasks | 7 files |
| Phase 03-drag-cascade-calendar-tasks P07 | 7min | 2 tasks | 5 files |
| Phase 04-polish-mobile-ship P04 | ~7min | 2 tasks | 11 files (5 created, 6 modified) |
| Phase 04-polish-mobile-ship P06 | 25min | 3 tasks | 8 files |
| Phase 04-polish-mobile-ship P07 | 6min | 4 tasks | 5 (4 created, 1 modified) files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: 4 coarse phases per coarse granularity (Foundation → Data → Drag/Tasks → Polish/Ship)
- Architecture: Pure-function `domain/` core; React + Zustand `persist` shell; SVG gantt; FullCalendar for calendar
- Stack: React 19 + Vite 7 + TS 6, SVAR React Gantt 2.6 (Frappe fallback), date-fns v4 + UTC noon discipline (not Temporal)
- Persistence: localStorage via Zustand persist for v1; IndexedDB only if 5MB budget breached
- Permapeople: Enrichment-only, lazy, never blocks engine; CORS verification spiked in Phase 2
- [Phase ?]: Plan 01-01: Vite scaffolded into temp dir + merged into repo root to preserve CLAUDE.md and .planning/
- [Phase ?]: Plan 01-01: Single tsconfig.json (no project references); tsconfig.app.json removed; tsconfig.node.json kept for build-tool typing
- [Phase ?]: Plan 01-01: Tailwind v4 wired CSS-first via @theme block (zero tailwind.config.* files per PITFALLS §9)
- [Phase ?]: Plan 01-01: ESLint enforces SCH-03 via no-restricted-syntax with allowlist for dateWrappers.ts, GanttView.tsx, and build configs
- [Phase ?]: Plan 01-01: passWithNoTests enabled in vite.config.ts test block so empty Phase 1 Wave 1 exits clean; Plan 02 writes the first tests
- [Phase ?]: Plan 01-02: dateWrappers.ts is the single allowed new Date(string) site; UTC-noon storage discipline pinned by 12 vitest assertions
- [Phase 01]: Plan 01-03: Canonical Phase 1 type system locked - 9-member EventType union (6 lifecycle from D-11 + 3 task from D-12); PlantTiming requires hasFlowering + requiresHardening booleans
- [Phase 01]: Plan 01-03: 4-plant fixture catalog (tomato, lettuce, broccoli, garlic) as ReadonlyMap; samplePlan hardcoded with ZIP 20001 / lastFrost 2026-04-15 / firstFrost 2026-10-20 (loaded fresh per D-03)
- [Phase 01-foundation-schedule-engine]: Phase 1 ships ONE constraint rule (noTransplantBeforeLastFrostForTender per SCH-04); other rules deferred to Phase 3 when drag exercises them.
- [Phase 01-foundation-schedule-engine]: Auto-task cadences locked: water every 3 days, harden-off one per day, fertilize at transplant + floor(DTM/2). Plan 05 snapshots will pin these dates.
- [Phase 01-foundation-schedule-engine]: Engine sorts ScheduleEvent[] by (start, type, id) for deterministic Plan 05 snapshot tests.
- [Phase 01-foundation-schedule-engine]: PlantingAnchors object passed engine→taskEmitter; clamped transplant updates anchors so downstream task events use clamped date.
- [Phase ?]: Plan 06: Persist machinery wired (Zustand persist, name='garden-gantt:plan', version=1, plan: null per D-02). Storage I/O boundary enforced — only src/data/storage.ts touches localStorage.
- [Phase ?]: Plan 06: StoreWithPersist as structural interface (Mutate<StoreApi<T>, [['zustand/persist', unknown]]> collapses to never under exactOptionalPropertyTypes).
- [Phase ?]: Plan 06: Storage mock pattern for happy-dom uses Object.defineProperty(window, 'localStorage', ...) — prototype spies fail because Storage routes setItem through internal proxy after first use.
- [Phase 01]: Plan 05: Snapshot suite locks engine output (7 tests, 4 plants + DST/leap/rollover fixtures); .snap committed at tests/__snapshots__/, future drift surfaces as PR diff.
- [Phase 01]: Plan 05: vite.config.ts resolveSnapshotPath centralizes all .snap files at tests/__snapshots__/ (single canonical location for all future test files).
- [Phase 01]: Plan 05: SCH-04 unit tests cover all 3 branches of canMove (tender-before-frost clamps, tender-after-frost passes through, hardy passes through).
- [Phase 01-foundation-schedule-engine]: Plan 07: HashRouter declarative API (not createHashRouter) for Phase 1 — smaller surface, data-router APIs deferred until loaders/actions become a need.
- [Phase 01-foundation-schedule-engine]: Plan 07: AppShell uses plain anchor tags + window.hashchange listener for active-link state, not react-router NavLink — smaller coupling, isolated testability.
- [Phase 01-foundation-schedule-engine]: Plan 07: Catch-all path='*' route renders the Plan-loading placeholder; mistyped/stale hashes recover gracefully instead of dead-ending.
- [Phase 01-foundation-schedule-engine]: Plan 07: ErrorBoundary wraps AppShell at outer-most position; an error inside the header or banner cannot bubble past it.
- [Phase ?]: Bare-SVG gantt at /plan derived live via generateSchedule(); timeScale.ts locked as Phase 3 drag API (D-06)
- [Phase ?]: Skip task events in Phase 1 gantt; lifecyclePalette narrowed to Partial<Record<EventType,string>> so render skips them automatically
- [Phase ?]: ESLint new Date() allowlist widened from GanttView.tsx-only to features/gantt/** for the Today-indicator concern; engine-side directories still reject (T-01-36)
- [Phase ?]: Phase 3 P03: dispatcher modifier on DndContext (dnd-kit v6 has no per-draggable modifier API); single context-level modifier reads active.data.current and forwards to per-event makeClampModifier
- [Phase ?]: Phase 3 P03: scaleHandoff.ts module-level singleton (single-writer GanttView, single-reader DragLayer modifier) — dnd-kit modifier args have no user-data slot; canonical workaround that keeps timeScale.ts API locked
- [Phase ?]: Phase 3 P03: drag handlers extracted to dragHandlers.ts so DragLayer.tsx exports only the component (Fast Refresh / react-refresh/only-export-components)
- [Phase ?]: Phase 3 P03: ConstraintTooltip ships both Mode A (cursor-tracking) + Mode B (bar-anchored sticky); mounted from inside DragLayer until Plan 03-06 moves mount to AppShell
- [Phase ?]: Phase 3 P03: DragLayer wired into App.tsx routes (/, /plan, *) AND SetupStepReview.tsx — drag is the default behavior wherever the gantt renders
- [Phase ?]: Phase 3 P04: end-exclusive +1 day handled in selectEventsForCalendar via dateWrappers; calendar/ NOT in no-restricted-syntax allowlist so date-fns format composes via parseDate
- [Phase ?]: Phase 3 P04: CalendarView is default export so React.lazy in Plan 03-07 can code-split the FullCalendar bundle cleanly
- [Phase ?]: Phase 3 P04: drawer/tab tokens (--spacing-drawer-w 400px, --spacing-tab-strip-h 44px) shipped via comment-fenced @theme region; Plan 03-06 must NOT re-add
- [Phase ?]: Phase 3 P04: Tasks parameter passed [] to selectEventsForCalendar + DayDetailDrawer; Plan 03-07 wires real Task[] consumer via useExpandedTasks once Plan 03-05 lands
- [Phase ?]: Phase 3 P05: defensive Math.max(1, intervalDays) clamp in expandRecurringTasks closes T-03-05-01 (engine-level guard against malformed CustomTask infinite loop)
- [Phase ?]: Phase 3 P05: useExpandedTasks is the centralized seam — both dashboard AND (Plan 03-07) calendar consume the same expansion (Pitfall 7 mitigation)
- [Phase ?]: Phase 3 P05: TASK-06 — no bulk multi-select in v1 per D-34; per-row checkboxes only
- [Phase ?]: Phase 3 P05: one-off range check uses YYYY-MM-DD string compare to dodge sub-day ISO precision excluding tasks created seconds before render
- [Phase ?]: Phase 3 P05: CustomTask.plantingId captured in modal form state but not yet threaded through saved CustomTask; deferred to Plan 03-07 / Phase 4
- [Phase ?]: Phase 3 P06: foreignObject hosts LockToggle in per-bar SVG g — last child draws above fill+ring; ghost-overlay z-order trade-off accepted for Phase 3 best-effort
- [Phase ?]: Phase 3 P06: stopPropagation in LockToggle.onClick prevents double-fire with useLockKeybinding document Alt-click listener
- [Phase ?]: Phase 3 P06: ConstraintTooltip mount migrated from DragLayer to AppShell top-level — survives view changes; Plan 03-03 tests unaffected
- [Phase ?]: Phase 3 P06: header Undo/Redo uses native title attribute for hover hint — Radix Tooltip 200ms-delay polish deferred to Phase 4
- [Phase 03-drag-cascade-calendar-tasks]: Plan 03-07: PlanRoute inlined in App.tsx — small wrapper kept adjacent to route table
- [Phase 03-drag-cascade-calendar-tasks]: Plan 03-07: Phase 3 integration smoke runs simplified-core scope (4 tests); drag/cascade in clampModifier units + manual checkpoint
- [Phase 03-drag-cascade-calendar-tasks]: Plan 03-07: useExpandedTasks default 60-day window for CalendarView; Phase 4 may dynamically extend via FullCalendar viewDidMount
- [Phase 03-drag-cascade-calendar-tasks]: Plan 03-07: Top-level ErrorBoundary covers React.lazy chunk-load failure; calendar-specific recovery UI deferred to Phase 4
- [Phase 04-polish-mobile-ship]: Plan 04-04: CoachMarks portal hand-rolled (no library) — backdrop + getBoundingClientRect callout positioning, Esc/Enter keyboard support gated by isFormFocus, single-boolean dismissal model (per-mark progress is local hook state, not persisted).
- [Phase 04-polish-mobile-ship]: Plan 04-04: Both 'Browse plants' (empty state) and 'Add more plants' (footer) buttons in MyPlanPanel get data-coach-target=catalog-button — they render in mutually-exclusive branches, so document.querySelector resolves to whichever is mounted.
- [Phase 04-polish-mobile-ship]: Plan 04-04: isFirstBar prop on DraggableBar (i===0 && ei===0) drives both data-coach-target='first-bar' on the wrapping <g> AND propagation to LockToggle.isFirst → data-coach-target='first-lock-toggle' (single boolean, two anchors).
- [Phase 04-polish-mobile-ship]: Plan 04-04: 'Reset onboarding' Settings row lives in its own 'Onboarding' section above 'Danger zone' (D-07: separate from Clear plan; clearing the plan does NOT re-arm coach marks).
- [Phase 04-polish-mobile-ship]: Plan 04-04: Plan 06 will mount <CoachMarks /> in AppShell — this plan does NOT modify AppShell.
- [Phase ?]: test
- [Phase ?]: [Phase 04-polish-mobile-ship]: Plan 04-06: Banner-stack at AppShell uses single-mount priority selector (storage-full > iOS Private > export-reminder); only ONE banner visible at any time (Open Question 1 recommendation a; mitigates T-04-06-03).
- [Phase ?]: [Phase 04-polish-mobile-ship]: Plan 04-06: useKeyboardBarDrag uses ScheduleEdit canonical shape (startOverride + reason='user-form-edit' + editedAt) — plan said newStart but the type defines startOverride; tests assert against canonical shape.
- [Phase ?]: [Phase 04-polish-mobile-ship]: Plan 04-06: ConstraintTooltip key={eventId|reasons.join('|')} forces React remount when message changes; aria-live=polite then re-announces only on real changes (RESEARCH Pitfall 3); visible header/body carry aria-hidden so SR reads sr-only summary only.
- [Phase ?]: [Phase 04-polish-mobile-ship]: Plan 04-06: GanttView attribute spread order — {...attributes} from dnd-kit FIRST, then tabIndex/role/aria-label override; dnd-kit's defaults would otherwise shadow the a11y contract.
- [Phase ?]: [Phase 04-polish-mobile-ship]: Plan 04-06: Test isolation pattern — replace store actions with vi.fn via setState in beforeEach (not vi.spyOn on getState()); spyOn shared call history across tests.
- [Phase ?]: [Phase 04-polish-mobile-ship]: Plan 04-06: WCAG AA audit checkpoint auto-approved in auto-mode against UI-SPEC §Phase 4 WCAG AA audit deltas; axe-core CLI cannot run in this sandbox (no Chrome binary). Lifecycle palette + lock ring already validated in Phase 3 (Plan 03-06 §Color comment).
- [Phase ?]: [Phase 04-polish-mobile-ship]: Plan 04-07: Stress fixture event-count widened from 150-300 to 400-700; engine auto-emitted recurring task events push 40-planting fixture to ~500 events.
- [Phase ?]: [Phase 04-polish-mobile-ship]: Plan 04-07: ?stress=1 dev-only AppShell loader gated by import.meta.env.DEV with dynamic import; tree-shaken from production builds (bundle size unchanged).
- [Phase ?]: [Phase 04-polish-mobile-ship]: Plan 04-07: Tasks 2-4 (POL-07 perf trace, DEPLOY-01 Cloudflare connect, DEPLOY-03 deploy smoke) human-action-deferred; runbook in 04-07-DEPLOY-NOTES.md.

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2 spike: Permapeople CORS unverified — affects whether enrichment is direct fetch or needs Worker proxy
- Phase 3 kickoff spike: SVAR constraint hook API vs custom SVG drag — affects Phase 3 implementation strategy

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-04-27T14:22:05.242Z
Stopped at: Phase 04 Plan 04 (onboarding coach marks) complete
Resume file: 
None
