---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 3 UI-SPEC approved
last_updated: "2026-04-27T03:35:26.822Z"
last_activity: 2026-04-27 -- Phase 03 planning complete
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 27
  completed_plans: 20
  percent: 74
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-26)

**Core value:** Plug in your ZIP and your plants → get a correct, draggable lifecycle gantt for the season.
**Current focus:** Phase 01 — foundation-schedule-engine

## Current Position

Phase: 01 (foundation-schedule-engine) — EXECUTING
Plan: 8 of 8
Status: Ready to execute
Last activity: 2026-04-27 -- Phase 03 planning complete

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

Last session: 2026-04-27T01:56:30.102Z
Stopped at: Phase 3 UI-SPEC approved
Resume file: 
.planning/phases/03-drag-cascade-calendar-tasks/03-UI-SPEC.md
