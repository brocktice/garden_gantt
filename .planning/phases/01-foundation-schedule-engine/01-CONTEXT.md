# Phase 1: Foundation & Schedule Engine - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

A correct, snapshot-tested schedule engine on top of a versioned persistence layer, rendering a hardcoded sample plan as a static gantt. The pure-function domain core, the date primitive, and the persistence machinery are all locked here — every later phase builds on them.

**In scope:** schedule engine (`generateSchedule`), succession expansion, constraint registry (initial frost-tolerance rules only), task-event emission, persistence layer (Zustand persist + schemaVersion + migrations[] + iOS Private detection + multi-tab listener), hash router shell with empty routes, read-only static gantt of a hardcoded sample plan.

**Out of scope:** ZIP/frost lookup (Phase 2), Setup Wizard (Phase 2), live catalog browser (Phase 2), JSON export/import UX (Phase 2), drag interactions (Phase 3), calendar view (Phase 3), task dashboard (Phase 3), Permapeople (Phase 4 if CORS resolves), mobile/polish/CI (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Plan + persistence pathway
- **D-01:** Build the full persistence machinery in Phase 1 — Zustand `persist` middleware on `planStore`, `schemaVersion: 1`, `migrations[]` array (initially `[]` since no prior schemas), iOS Safari Private mode availability detection at boot, and a multi-tab `storage` event listener.
- **D-02:** The only localStorage write at boot is a tiny availability probe (`setItem('__gg_probe','1')` + `removeItem` in a try/catch). If it throws, render a non-blocking banner explaining persistence is unavailable. No plan data is persisted in Phase 1.
- **D-03:** The hardcoded sample plan is a TypeScript constant loaded fresh from code on every boot. Success criterion #2 ("change `lastFrostDate`, reload, dependent bars move") works trivially because there is no localStorage cache of the plan to invalidate.
- **D-04:** Phase 2 is the milestone that wires real user input (Setup Wizard, catalog selections) to the persisted `planStore`. Phase 1 ships the machinery; Phase 2 turns it on.

### Static gantt render approach
- **D-05:** Phase 1 gantt is hand-rolled bare SVG — `<svg>` root, one `<g>` per planting, one `<rect>` per lifecycle phase, color-coded. Read-only; no drag bindings.
- **D-06:** `features/gantt/timeScale.ts` (date ↔ pixel mapping) ships in Phase 1 — it is needed regardless of which gantt library wins the Phase 3 kickoff spike (SVAR React Gantt vs `@dnd-kit` + custom SVG).
- **D-07:** Phase 1 deliberately does NOT pull in SVAR React Gantt or Frappe Gantt. The Phase 3 kickoff spike (1–2 hours, per ROADMAP.md §Research Spikes) is the explicit decision point for the gantt library.

### Hash router implementation
- **D-08:** React Router 7 in SPA hash mode (`createHashRouter` or `HashRouter`). Routes registered: `#/setup`, `#/plan`, `#/tasks`, `#/settings`. Empty placeholder components in Phase 1; later phases fill them in.
- **D-09:** Hash routing chosen (not BrowserRouter) so deep links survive refresh on any static host without server rewrites or `404.html` hacks. Satisfies DEPLOY-02.

### Phase 1 task-event scope (SCH-07)
- **D-10:** Engine emits both lifecycle events AND 3 universal auto-tasks in Phase 1.
- **D-11:** Lifecycle event types: `indoor-start`, `harden-off` (range), `transplant`, `direct-sow`, `germination-window` (range), `harvest-window` (range).
- **D-12:** Auto-task event types in Phase 1: `water-seedlings` (during indoor phase, cadence: every 2–3 days), `harden-off-day` (one per day in the harden-off range), `fertilize-at-flowering` (DTM-based offset; skipped for plants without a flowering stage like lettuce/garlic — engine guards on a catalog flag).
- **D-13:** Phase 3's `TasksDashboard` becomes a pure projection — `taskEmitter.deriveTasks(events, customTasks, now) → Task[]` reads the engine's emitted task events; the engine API is frozen here.
- **D-14:** Snapshot tests cover task-emission cadence per plant (tomato, lettuce, broccoli, garlic), in addition to lifecycle dates.

### Multi-tab sync (DATA-06)
- **D-15:** `window.addEventListener('storage', ...)` listener registered at boot. On event, Zustand re-hydrates from storage. No BroadcastChannel — the simpler `storage` event satisfies DATA-06; revisit only if Phase 3 introduces a real coordination need.

### Snapshot test fixtures (SCH-08)
- **D-16:** Snapshot suite covers tomato (frost-tender, indoor-start, fruiting), lettuce (cold-hardy, succession-friendly, leafy), broccoli (half-hardy, indoor-start, brassica), and garlic (year-rollover, fall-planted, allium).
- **D-17:** Edge-case fixtures: DST-crossing window (subDays across March 2026 spring-forward), leap-year handling (Feb 29 2024 fixture), year-rollover (garlic planted Oct 2026, harvested Jul 2027).

### Claude's Discretion
- Catalog file format for Phase 1's 4 plants — TS constants in `src/assets/catalog.ts` OR `src/assets/catalog.json` imported as ES module. Either works; planner picks based on test ergonomics.
- Migration array stub shape (`Array<(state) => state>` vs Zustand persist's built-in `migrate(state, fromVersion)` callback). Architecture leans toward Zustand's built-in.
- Banner copy/styling for iOS Private mode — needs to be clear, non-blocking, dismissable.
- Initial constraint registry scope for Phase 1 — at minimum `noTransplantBeforeLastFrostForTender` (SCH-04). Other rules can wait for Phase 3 when drag exercises them.
- Plant id format ("tomato-cherokee-purple" pattern is in ARCHITECTURE.md; planner can finalize).

</decisions>

<specifics>
## Specific Ideas

- **Probe-only write pattern:** the boot probe is the first localStorage operation; it deliberately runs before Zustand persist hydrates. Banner state lives in `uiStore` (memory only), so it doesn't depend on storage being available.
- **Bare SVG render:** prioritize readability of the markup over cleverness — one `<rect>` per phase per planting, `data-*` attrs for the planting/event ids so the Phase 3 drag work has handles to attach to without restructuring.
- **Color coding by lifecycle phase:** indoor-start (cool/blue), harden-off (yellow/transition), transplant→establish (green), harvest (warm/orange). Final palette deferred to UI phase, but Phase 1 picks distinct hues so the snapshot test output is meaningful.
- **Engine purity:** `domain/` modules import zero React, zero Zustand, zero I/O. The architecture invariant from ARCHITECTURE.md §System Overview applies from commit 1.
- **Date discipline:** ISO date strings stored as UTC noon (`"2026-05-15T12:00:00Z"`); a single `domain/dateWrappers.ts` module holds the only allowed `new Date(string)` call site; everything else uses date-fns helpers (`addDays`, `subDays`) and `parseISO` from this wrapper.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Core value, constraints (single-user, no backend, share-worthy polish), key decisions.
- `.planning/REQUIREMENTS.md` — Phase 1 requirements: SCH-01..05, SCH-07, SCH-08, DATA-01, DATA-02, DATA-03, DATA-06, DATA-07, DEPLOY-02.
- `.planning/ROADMAP.md` §Phase 1 — Phase goal, depends-on, success criteria (5 enumerated), and the inter-phase dependency rationale.

### Stack & architecture (locked)
- `.planning/research/STACK.md` — React 19 + Vite 7 + TS 6, Zustand v5 + persist, date-fns v4 + @date-fns/utc, Vitest 4, Tailwind v4, React Router 7, Cloudflare Pages.
- `.planning/research/ARCHITECTURE.md` — Pure-function domain core; planStore/catalogStore/uiStore split; data model (Plant, GardenPlan, ScheduleEvent, ScheduleEdit, Task); schedule engine algorithm with cascade semantics; constraint registry pattern; project structure layout.
- `.planning/research/SUMMARY.md` — Resolved conflicts (date-fns over Temporal; localStorage over IndexedDB; 4 phases over 5–6); confidence assessment; per-phase rationale.

### Pitfalls to actively prevent in Phase 1
- `.planning/research/PITFALLS.md` §2 (DST/off-by-one), §3 (localStorage data loss), §4 (schema migrations), §6 (timezone display shift), §7 (DST transitions), §8 (year-rollover), §9 (Date vs Datetime), §15 (hardening-off missing), §17 (succession vs DTM), §18 (iOS Private mode), §19 (multi-tab race), §20 (export versioning), §21 (corrupt JSON).

### Domain primer
- `.planning/research/FEATURES.md` — Garden-domain feature inventory; informs which auto-task types are universal vs niche.

</canonical_refs>

<code_context>
## Existing Code Insights

**Greenfield project — no `src/` yet.** This is the first phase to lay any code down.

### Reusable Assets
None — Phase 1 builds the foundation that Phases 2–4 reuse.

### Established Patterns
None in code; patterns are pre-defined in `.planning/research/ARCHITECTURE.md`:
- Pure domain core + imperative shell
- Sparse edits over materialized state (`ScheduleEdit[]` persisted; `ScheduleEvent[]` always re-derived)
- Constraint registry (functions registered to a list, aggregated by `canMove`)
- Feature-sliced UI structure (`features/setup`, `features/gantt`, etc.)
- One-write-boundary rule for I/O — `data/storage.ts` is the only module that touches localStorage; `data/permapeople.ts` is the only module that calls `fetch`.

### Integration Points
- `src/app/App.tsx` — top-level route switch; Phase 1 renders the hash router shell with placeholder routes.
- `src/stores/planStore.ts` — Zustand persist wired here; Phase 1 ships it but the only writes in Phase 1 are the boot availability probe.
- `src/domain/scheduler.ts` — pure entry point `generateSchedule(plan, catalog) → ScheduleEvent[]`; consumed in Phase 1 by `<GanttView>`'s `useDerivedSchedule()` selector.
- `src/data/storage.ts` — sole I/O boundary; wraps `localStorage` with try/catch, exposes `isStorageAvailable()`, registers the storage-event listener.

</code_context>

<deferred>
## Deferred Ideas

- **SVAR React Gantt vs custom SVG drag** — Phase 3 kickoff spike (1–2 hours) per ROADMAP.md §Research Spikes. Phase 1's bare SVG is intentionally disposable so this decision stays open.
- **Plan persistence (writing user plan data to localStorage)** — Phase 2, after Setup Wizard collects real user input.
- **Permapeople CORS verification** — Phase 2 spike (~30 min) per ROADMAP.md.
- **Full constraint rule registry** — Phase 3, when drag exercises every rule. Phase 1 ships only `noTransplantBeforeLastFrostForTender` (the rule SCH-04 demands).
- **Full task taxonomy (sow/prune/scout-pests)** — Phase 3 alongside `TasksDashboard`. Phase 1 ships only the 3 universal auto-task types.
- **BroadcastChannel cross-tab coordination** — only if Phase 3 surfaces a real need (e.g., active-tab drag arbitration). For now, the `storage` event listener is sufficient.
- **JSON export/import UX** — Phase 2 (DATA-04, DATA-05). Phase 1 builds the schema/migration framework that import will rely on.
- **Catalog grown to ~30 plants** — Phase 2 (CAT-01). Phase 1 ships only the 4 fixture plants needed for snapshot tests.

</deferred>

---

*Phase: 01-foundation-schedule-engine*
*Context gathered: 2026-04-26*
