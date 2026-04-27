# Roadmap: Garden Gantt

## Overview

Greenfield SPA. Four coarse phases driven by the schedule engine as the spine: build a correct,
testable engine + persistence first, then wire real ZIP/catalog data to reach the first end-to-end
demo, then layer the differentiator (constraint-aware drag with cascade + calendar + tasks),
then polish to share-worthy v1 and deploy. Two research spikes are flagged inline:
Permapeople CORS in Phase 2 (~30 min) and SVAR React Gantt constraint API vs custom SVG drag
at Phase 3 kickoff (1-2 hrs).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Schedule Engine** - Project scaffold, type system, pure schedule engine with snapshot tests, persistence layer with schema versioning + iOS detection, hash router, hardcoded gantt render
- [x] **Phase 2: Data Layer & First End-to-End** - ZIP/frost lookup, setup wizard, curated catalog + custom plants + Permapeople enrichment, succession, JSON export/import, gantt connected to live data
- [ ] **Phase 3: Drag, Cascade, Calendar & Tasks** - Constraint-aware drag with ghost preview, cascade, undo/redo, per-event lock, calendar view, auto + custom tasks + Today/This Week dashboard
- [ ] **Phase 4: Polish, Mobile & Ship** - Mobile-responsive, onboarding wizard, empty/error/loading states, a11y (WCAG AA + keyboard drag), export-reminder UX, Cloudflare Pages CI/CD deploy

## Phase Details

### Phase 1: Foundation & Schedule Engine
**Goal**: A correct, snapshot-tested schedule engine on top of a versioned persistence layer, rendering a hardcoded sample plan as a static gantt. Engine and date primitive locked before any UI commitment.
**Depends on**: Nothing (first phase)
**Requirements**: SCH-01, SCH-02, SCH-03, SCH-04, SCH-05, SCH-07, SCH-08, DATA-01, DATA-02, DATA-03, DATA-06, DATA-07, DEPLOY-02
**Success Criteria** (what must be TRUE):
  1. User visiting the app sees a static gantt for a hardcoded sample plan rendered from the live schedule engine (no random fixtures — output flows through `generateSchedule(plan, catalog)`)
  2. Changing `lastFrostDate` in the hardcoded plan and reloading visibly moves every dependent bar in the right direction (engine is the only source of truth for dates)
  3. The app boots cleanly in iOS Safari Private Browsing mode with a non-blocking banner explaining persistence is unavailable, instead of crashing on the first localStorage write
  4. Refreshing or deep-linking to `#/setup`, `#/plan`, `#/tasks`, or `#/settings` resolves to the right route without a 404 on a static host
  5. `npm test` passes a snapshot test suite covering tomato, lettuce, broccoli, and garlic across DST-crossing, leap-year, and year-rollover fixtures
**Plans**: 8 plans
- [x] 01-01-PLAN.md — Vite scaffold + Tailwind v4 tokens + lifecyclePalette + PlaceholderRoute + _redirects
- [x] 01-02-PLAN.md — UTC-noon date primitive (`dateWrappers.ts`) + DST/leap/rollover unit tests
- [x] 01-03-PLAN.md — Domain types + ids + 4-plant catalog + hardcoded sample plan
- [x] 01-04-PLAN.md — Schedule engine + constraint registry + auto-task emitter
- [x] 01-05-PLAN.md — Snapshot test suite (4 plants + DST + leap + year-rollover) + constraint unit tests
- [x] 01-06-PLAN.md — Persistence layer: storage probe + multi-tab listener + Zustand persist + uiStore
- [x] 01-07-PLAN.md — Hash router shell + AppShell + iOS Private banner + ErrorBoundary
- [x] 01-08-PLAN.md — timeScale + bare-SVG GanttView + useDerivedSchedule selector + /plan route wiring
**UI hint**: yes

### Phase 2: Data Layer & First End-to-End
**Goal**: Real users hit the app, enter a ZIP, pick plants from a curated catalog, and see their actual lifecycle gantt that survives reload, export, and re-import. This is the first end-to-end demo milestone.
**Depends on**: Phase 1
**Requirements**: LOC-01, LOC-02, LOC-03, LOC-04, LOC-05, CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06, CAT-07, CAT-08, SCH-06, GANTT-01, GANTT-02, GANTT-03, DATA-04, DATA-05
**Success Criteria** (what must be TRUE):
  1. User entering a valid US ZIP in the setup wizard immediately sees their derived USDA zone, last spring frost, and first fall frost, with a clearly-marked override path for any value
  2. User picking 5+ plants (mix of curated, custom-authored, and Permapeople-enriched) from a searchable catalog sees a horizontal-bar gantt with one row per planting, color-coded by lifecycle phase, spanning the user's actual gardening season
  3. User toggling "succession" on a crop with `successionIntervalDays` (e.g. lettuce) sees additional planting rows appear automatically, capped at the season's first-fall-frost cutoff
  4. User clicking "Export plan" downloads a versioned JSON file; clicking "Import plan" with that same file shows a preview, validates against the current schema, and on confirm restores the exact same gantt
  5. User reloading the browser after any change (location, planting added, custom plant authored, Permapeople enrichment fetched) sees identical state — and Permapeople being unreachable does not block any core flow
**Plans**: 12 plans
- [x] 02-01-PLAN.md — Domain types + Zod schemas + dateWrappers helpers + migrations module (Wave 1)
- [x] 02-02-PLAN.md — ZIP→zone+frost data pipeline (build script + zones.ts client + 10 chunks) (Wave 1)
- [x] 02-03-PLAN.md — Cloudflare Worker proxy + permapeople.ts client + CORS spike evidence (Wave 1)
- [x] 02-04-PLAN.md — Catalog 4→50 plants + catalogStore + uiStore Phase 2 transient flags (Wave 2)
- [x] 02-05-PLAN.md — planStore Phase 2 setters + v1→v2 migration + sample-plan bootstrap (Wave 2)
- [x] 02-06-PLAN.md — Succession engine pre-pass + scheduler defensive guard + tests (Wave 2)
- [x] 02-07-PLAN.md — UI primitives (cn, Button, Input, Label, Select, Dialog, DropdownMenu, Switch, Toast, Card, Badge) + Tailwind v4 tokens (Wave 3)
- [x] 02-08-PLAN.md — Setup Wizard 3 steps (SetupWizard + SetupStepLocation + SetupStepReview + ZipInput + lookupLocation hook) (Wave 4)
- [x] 02-09-PLAN.md — Catalog browser + PlantCard + CustomPlantModal + MyPlanPill + MyPlanPanel + filters (Wave 4)
- [x] 02-10-PLAN.md — GanttView season-axis + succession rows + plan-source swap + AppShell pill + footer + App.tsx routes (Wave 5)
- [x] 02-11-PLAN.md — Settings page + exportPlan + importPlan + ImportPreviewModal + /settings route swap (Wave 6)
- [x] 02-12-PLAN.md — Component tests + Flow A integration test + final build verification (Wave 7)
**UI hint**: yes

### Phase 3: Drag, Cascade, Calendar & Tasks
**Goal**: The product becomes the product. Users can drag bars to adjust dates with constraint enforcement and downstream cascade, undo any edit, toggle to a calendar view, and see a Today/This Week task dashboard fed by the schedule engine.
**Depends on**: Phase 2 (engine + live plan data must exist before constraint-aware drag is meaningful)
**Requirements**: GANTT-04, GANTT-05, GANTT-06, GANTT-07, GANTT-08, GANTT-09, GANTT-10, CAL-01, CAL-02, CAL-03, TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, TASK-06
**Success Criteria** (what must be TRUE):
  1. User dragging a transplant bar for a tomato sees ghost-bar previews of every downstream event (harvest) updating in real time; releasing commits the cascade and unedited downstream events reflow accordingly
  2. User attempting to drag a frost-tender plant's transplant before the last spring frost gets snap-back to the constraint boundary with a clear tooltip explaining why ("Can't transplant tomato before May 15 — frost tender")
  3. User pinning an event with the lock toggle sees that event held fixed during subsequent cascades, while unlocked events still reflow
  4. User pressing Cmd/Ctrl-Z reverses the last drag (with at least 20 levels of history); Cmd/Ctrl-Shift-Z re-applies it
  5. User toggling between gantt and calendar views sees the exact same schedule events; clicking any day on the calendar opens a detail panel listing every event and task scheduled for that day
  6. User opening the Tasks dashboard sees today's, this-week's, and overdue tasks (auto-derived from schedule events plus user-authored custom tasks), groupable by plant or category, with bulk check-off
**Plans**: 7 plans
- [x] 03-01-PLAN.md — Schema v2→v3 + engine consumes plan.edits[] + lock-aware wrapper + new constraint rules (Wave 1)
- [x] 03-02-PLAN.md — planStore zundo wrap + commitEdit/setLock/task setters + dragStore + historyBindings + uiStore extensions (Wave 1)
- [ ] 03-03-PLAN.md — Gantt drag mechanics: DragLayer + clampModifier + GhostOverlay + ConstraintTooltip + DraggableBar + drag tokens (Wave 2)
- [ ] 03-04-PLAN.md — Calendar: FullCalendar wrapper + selectEventsForCalendar + DayDetailDrawer + PlanViewTabs (Wave 2)
- [ ] 03-05-PLAN.md — Tasks: TasksDashboard + CustomTaskModal + deriveTasks + expandRecurringTasks + useTodayWeekOverdue (Wave 2)
- [ ] 03-06-PLAN.md — Lock UI: LockToggle + useLockKeybinding + AppShell undo/redo buttons + ConstraintTooltip top-level mount + remaining @theme tokens (Wave 3)
- [ ] 03-07-PLAN.md — App.tsx route wiring + lazy CalendarView + Phase 3 integration smoke + manual checkpoint (Wave 3)
**UI hint**: yes

### Phase 4: Polish, Mobile & Ship
**Goal**: The gap between "technically works" and "I'd recommend this to my gardening friend." Mobile-responsive layout, onboarding wizard, real empty/error/loading states everywhere, accessibility audit, export-reminder UX, and a live Cloudflare Pages deploy with CI/CD.
**Depends on**: Phase 3 (polish on a feature set that isn't done is rework)
**Requirements**: CAL-04, POL-01, POL-02, POL-03, POL-04, POL-05, POL-06, POL-07, POL-08, POL-09, POL-10, DEPLOY-01, DEPLOY-03
**Success Criteria** (what must be TRUE):
  1. First-time user landing on the deployed app at a narrow (mobile) viewport gets a calendar-default view with a guided onboarding flow (ZIP → starter pack → first gantt) and never sees a blank canvas with no next step
  2. User encountering a failure mode (bad ZIP, Permapeople fetch error, localStorage full, corrupt JSON import, attempted destructive action) sees a real, themed error/confirm/loading state with an undo or recovery path — no silent failures
  3. Power user navigating with keyboard alone (Tab, Enter, Escape, Arrow keys) can complete every primary flow including drag-to-adjust on the gantt; all interactive elements meet WCAG AA color contrast
  4. User dragging on the gantt at desktop with a 200-event plan sees no perceivable jank (60fps target); all destructive actions (delete planting, clear plan, overwrite-on-import) require confirmation and offer undo where possible
  5. Pushing to `main` triggers a Cloudflare Pages CI/CD deploy that propagates within minutes; deployed assets are hashed and `index.html` is uncached, so users always get the latest bundle without stale-cache breakage
  6. App periodically (or on-demand) prompts the user to export their plan as a JSON backup, mitigating the localStorage-clear data-loss risk
**Plans**: TBD
**UI hint**: yes

## Inter-Phase Dependencies

| Dependency | Why It Matters |
|------------|----------------|
| Phase 1 SCH engine → Phase 2 catalog | Catalog timing fields (`weeks_indoors_before_last_frost`, `frost_tolerance`, etc.) are the engine's input contract; engine must define those types first so catalog authoring can match |
| Phase 1 persistence layer → Phase 2 plan storage | Schema versioning, migration framework, iOS-Safari detection, multi-tab `storage` listener, Zod-validated import all live in Phase 1 so Phase 2 just adds payload — never duplicates persistence concerns |
| Phase 2 LOC + CAT → Phase 2 SCH-06 succession | Succession needs real `firstFrostDate` and per-plant `successionIntervalDays`; can't be tested meaningfully against hardcoded fixtures alone |
| Phase 2 GANTT-01..03 → Phase 3 GANTT-04..10 | Drag interactions need a real gantt to drag; basic render must exist before drag/cascade/lock/undo |
| Phase 1 SCH engine → Phase 3 constraints | `domain/constraints.ts` extends the same pure-function module locked in Phase 1; drag UI calls `canMove()` against it |
| Phase 1 SCH-07 task emission → Phase 3 TASK-01..06 | Auto-derived tasks ride on top of schedule events; engine must emit them in Phase 1 (as event types) so Phase 3's `taskEmitter` is purely a projection, not a re-implementation |
| Phase 3 calendar/tasks → Phase 4 mobile defaults | CAL-04 (calendar default on mobile) only makes sense once both views exist; can't ship a "default to calendar" rule until calendar is implemented |
| All prior phases → Phase 4 polish | Polish on incomplete features is rework; defer all polish/mobile/a11y/CI to Phase 4 except the cross-cutting basics already locked in Phase 1 (date discipline, schema versioning) |

## Research Spikes

| Phase | Spike | Duration | Why |
|-------|-------|----------|-----|
| Phase 2 | Permapeople CORS verification (live `fetch()` from deployed origin) | ~30 min | If CORS blocks browser calls, integration needs a Cloudflare Worker proxy or gets dropped — decide before building enrichment UI |
| Phase 3 kickoff | SVAR React Gantt constraint hook API vs custom SVG + `@dnd-kit` drag | 1-2 hours | If SVAR's constraint API accommodates `domain/constraints.ts` cleanly, stay with SVAR; if not, switch to custom SVG drag (Frappe Gantt fallback documented). Affects Phase 3 implementation strategy. |

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4. Decimal phases (e.g., 2.1) inserted as needed.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Schedule Engine | 1/8 | In Progress|  |
| 2. Data Layer & First End-to-End | 0/12 | Planned | - |
| 3. Drag, Cascade, Calendar & Tasks | 0/7 | Planned | - |
| 4. Polish, Mobile & Ship | 0/TBD | Not started | - |
