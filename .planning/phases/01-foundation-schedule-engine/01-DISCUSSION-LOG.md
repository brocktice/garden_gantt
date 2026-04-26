# Phase 1: Foundation & Schedule Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 01-foundation-schedule-engine
**Areas discussed:** Plan + persistence pathway, Static gantt render approach, Hash router implementation, Phase 1 task-event scope (SCH-07), Multi-tab sync (DATA-06)

---

## Plan + persistence pathway

| Option | Description | Selected |
|--------|-------------|----------|
| Layer built; probe-only write | Full persistence machinery (Zustand persist, schemaVersion, migrations[], multi-tab, iOS detection) built and unit-tested. Only write at boot is a tiny availability probe. Plan loads from constants every boot. SC #2 demo: edit fixture, reload, dates move. Phase 2 wires real plan persistence. | ✓ |
| Plan persisted from first boot | First boot seeds the hardcoded plan to localStorage; subsequent boots read it back. SC #2's "edit fixture, reload, dates moved" needs a schemaVersion bump or dev-reset path. | |
| Plan persisted only when fixture changes (hash check) | Persistence wired to plan; on boot, hash the fixture and compare to stored hash. If different, re-seed and overwrite. SC #2 demo works without manual reset. Cost: extra fixture-hash logic that disappears in Phase 2. | |

**User's choice:** Layer built; probe-only write
**Notes:** Cleanest separation between "engine working" and "user input stored." Phase 2 turns persistence on for real user data.

---

## Static gantt render approach

| Option | Description | Selected |
|--------|-------------|----------|
| Bare SVG hand-rolled | ~100 LOC: `<svg>` + `<g>` per planting + `<rect>` per phase, color-coded. `timeScale.ts` (date↔pixel) needed regardless of which lib wins Phase 3. Defers SVAR-vs-custom to the explicit Phase 3 kickoff spike. | ✓ |
| SVAR React Gantt 2.6 read-only | Pull SVAR in now in read-only config (no drag bindings). Risk: Phase 3 spike picks @dnd-kit + custom SVG → Phase 1 SVAR work is thrown out. | |
| Frappe Gantt via community React wrapper | Simpler than SVAR; React wrapper community-maintained, lags core. Same lock-in risk as SVAR. | |

**User's choice:** Bare SVG hand-rolled
**Notes:** ROADMAP.md explicitly schedules a Phase 3 kickoff spike (1–2 hours) on SVAR vs `@dnd-kit` + custom SVG. Phase 1's bare SVG is intentionally disposable so that decision stays open.

---

## Hash router implementation

| Option | Description | Selected |
|--------|-------------|----------|
| React Router 7 SPA hash mode | `createHashRouter` or `HashRouter` component. ~5KB gzipped. Boring and correct. Standard choice in React 19 ecosystem. | ✓ |
| Tiny custom hash router (~50 LOC) | Subscribe to `hashchange`, switch on `window.location.hash`. Zero dep. Bug-surface risk on programmatic nav, back-button, scroll restoration. | |
| Wouter (~1.5KB minimalist router) | Tiny React router with hash mode. Maintained, simple API. Another dep choice the project carries forever. | |

**User's choice:** React Router 7 SPA hash mode
**Notes:** Satisfies DEPLOY-02. Nested routing available if a later phase ever needs it.

---

## Phase 1 task-event scope (SCH-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Lifecycle + minimal auto-tasks | Lifecycle events + 3 universal auto-tasks: water-seedlings, harden-off prompts, fertilize-at-flowering. Snapshot tests cover task cadence. Phase 3's TasksDashboard becomes a pure projection. | ✓ |
| Lifecycle events only; defer SCH-07 to Phase 3 | Engine emits only lifecycle events in Phase 1. Pure-function discipline reads cleaner. Cost: SCH-07 is officially Phase 1's; deviates from REQUIREMENTS.md mapping. | |
| Full task taxonomy now | Engine emits sow/transplant/harden-off/harvest/water/fertilize/prune/scout-pests. Most thorough Phase 1. Risk: many cadences are speculative until Phase 3. | |

**User's choice:** Lifecycle + minimal auto-tasks
**Notes:** Honors SCH-07 as written without over-fitting. Engine API is frozen here — Phase 3 just visualizes via `taskEmitter`.

---

## Multi-tab sync (DATA-06)

| Option | Description | Selected |
|--------|-------------|----------|
| storage event listener | Browser's built-in `storage` event fires in other tabs when localStorage changes. Listener re-hydrates Zustand. Zero deps, works everywhere, satisfies DATA-06. | ✓ |
| BroadcastChannel | BroadcastChannel API for structured cross-tab messaging. More machinery than DATA-06 needs. | |
| Both: storage event + BroadcastChannel | Both mechanisms wired in Phase 1. Overkill for current requirements. | |

**User's choice:** storage event listener
**Notes:** Revisit only if Phase 3 introduces a real coordination need (e.g., active-tab drag arbitration).

---

## Claude's Discretion

- **Catalog file format for Phase 1's 4 plants** — TS constants vs `assets/catalog.json`. Planner picks based on test ergonomics.
- **Migration array stub shape** — `Array<(state) => state>` vs Zustand persist's built-in `migrate(state, fromVersion)` callback (architecture leans toward Zustand's built-in).
- **Banner copy/styling for iOS Private mode** — needs to be clear, non-blocking, dismissable.
- **Initial constraint registry scope for Phase 1** — at minimum `noTransplantBeforeLastFrostForTender` (SCH-04). Other rules can wait for Phase 3.
- **Plant id format** — "tomato-cherokee-purple" pattern from ARCHITECTURE.md; planner finalizes.
- **Color palette for lifecycle phases on the SVG gantt** — distinct hues good enough for snapshot tests; final palette from UI phase.

## Deferred Ideas

- **SVAR React Gantt vs custom SVG drag** — Phase 3 kickoff spike (1–2 hours) per ROADMAP.md §Research Spikes.
- **Plan persistence (writing user plan data to localStorage)** — Phase 2 after Setup Wizard.
- **Permapeople CORS verification** — Phase 2 spike (~30 min) per ROADMAP.md.
- **Full constraint rule registry** — Phase 3, when drag exercises every rule.
- **Full task taxonomy (sow/prune/scout-pests etc.)** — Phase 3 alongside `TasksDashboard`.
- **BroadcastChannel cross-tab coordination** — only if Phase 3 needs structured messaging.
- **JSON export/import UX** — Phase 2 (DATA-04, DATA-05).
- **Catalog grown to ~30 plants** — Phase 2 (CAT-01).
