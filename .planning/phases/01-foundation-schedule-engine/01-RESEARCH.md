# Phase 1: Foundation & Schedule Engine - Research

**Researched:** 2026-04-26
**Domain:** Greenfield SPA bootstrap — pure-function date-arithmetic engine + versioned localStorage persistence + hash-routed shell + bare-SVG static gantt
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Plan + persistence pathway**
- **D-01:** Build the full persistence machinery in Phase 1 — Zustand `persist` middleware on `planStore`, `schemaVersion: 1`, `migrations[]` array (initially `[]` since no prior schemas), iOS Safari Private mode availability detection at boot, and a multi-tab `storage` event listener.
- **D-02:** The only localStorage write at boot is a tiny availability probe (`setItem('__gg_probe','1')` + `removeItem` in a try/catch). If it throws, render a non-blocking banner explaining persistence is unavailable. No plan data is persisted in Phase 1.
- **D-03:** The hardcoded sample plan is a TypeScript constant loaded fresh from code on every boot. Success criterion #2 ("change `lastFrostDate`, reload, dependent bars move") works trivially because there is no localStorage cache of the plan to invalidate.
- **D-04:** Phase 2 is the milestone that wires real user input (Setup Wizard, catalog selections) to the persisted `planStore`. Phase 1 ships the machinery; Phase 2 turns it on.

**Static gantt render approach**
- **D-05:** Phase 1 gantt is hand-rolled bare SVG — `<svg>` root, one `<g>` per planting, one `<rect>` per lifecycle phase, color-coded. Read-only; no drag bindings.
- **D-06:** `features/gantt/timeScale.ts` (date ↔ pixel mapping) ships in Phase 1 — it is needed regardless of which gantt library wins the Phase 3 kickoff spike (SVAR React Gantt vs `@dnd-kit` + custom SVG).
- **D-07:** Phase 1 deliberately does NOT pull in SVAR React Gantt or Frappe Gantt. The Phase 3 kickoff spike (1–2 hours, per ROADMAP.md §Research Spikes) is the explicit decision point for the gantt library.

**Hash router implementation**
- **D-08:** React Router 7 in SPA hash mode (`createHashRouter` or `HashRouter`). Routes registered: `#/setup`, `#/plan`, `#/tasks`, `#/settings`. Empty placeholder components in Phase 1; later phases fill them in.
- **D-09:** Hash routing chosen (not BrowserRouter) so deep links survive refresh on any static host without server rewrites or `404.html` hacks. Satisfies DEPLOY-02.

**Phase 1 task-event scope (SCH-07)**
- **D-10:** Engine emits both lifecycle events AND 3 universal auto-tasks in Phase 1.
- **D-11:** Lifecycle event types: `indoor-start`, `harden-off` (range), `transplant`, `direct-sow`, `germination-window` (range), `harvest-window` (range).
- **D-12:** Auto-task event types in Phase 1: `water-seedlings` (during indoor phase, cadence: every 2–3 days), `harden-off-day` (one per day in the harden-off range), `fertilize-at-flowering` (DTM-based offset; skipped for plants without a flowering stage like lettuce/garlic — engine guards on a catalog flag).
- **D-13:** Phase 3's `TasksDashboard` becomes a pure projection — `taskEmitter.deriveTasks(events, customTasks, now) → Task[]` reads the engine's emitted task events; the engine API is frozen here.
- **D-14:** Snapshot tests cover task-emission cadence per plant (tomato, lettuce, broccoli, garlic), in addition to lifecycle dates.

**Multi-tab sync (DATA-06)**
- **D-15:** `window.addEventListener('storage', ...)` listener registered at boot. On event, Zustand re-hydrates from storage. No BroadcastChannel — the simpler `storage` event satisfies DATA-06; revisit only if Phase 3 introduces a real coordination need.

**Snapshot test fixtures (SCH-08)**
- **D-16:** Snapshot suite covers tomato (frost-tender, indoor-start, fruiting), lettuce (cold-hardy, succession-friendly, leafy), broccoli (half-hardy, indoor-start, brassica), and garlic (year-rollover, fall-planted, allium).
- **D-17:** Edge-case fixtures: DST-crossing window (subDays across March 2026 spring-forward), leap-year handling (Feb 29 2024 fixture), year-rollover (garlic planted Oct 2026, harvested Jul 2027).

### Claude's Discretion
- Catalog file format for Phase 1's 4 plants — TS constants in `src/assets/catalog.ts` OR `src/assets/catalog.json` imported as ES module. Either works; planner picks based on test ergonomics.
- Migration array stub shape (`Array<(state) => state>` vs Zustand persist's built-in `migrate(state, fromVersion)` callback). Architecture leans toward Zustand's built-in.
- Banner copy/styling for iOS Private mode — needs to be clear, non-blocking, dismissable. (UI-SPEC has now finalized the copy and styling.)
- Initial constraint registry scope for Phase 1 — at minimum `noTransplantBeforeLastFrostForTender` (SCH-04). Other rules can wait for Phase 3 when drag exercises them.
- Plant id format ("tomato-cherokee-purple" pattern is in ARCHITECTURE.md; planner can finalize).

### Deferred Ideas (OUT OF SCOPE)
- **SVAR React Gantt vs custom SVG drag** — Phase 3 kickoff spike (1–2 hours). Phase 1's bare SVG is intentionally disposable so this decision stays open.
- **Plan persistence (writing user plan data to localStorage)** — Phase 2, after Setup Wizard collects real user input.
- **Permapeople CORS verification** — Phase 2 spike (~30 min).
- **Full constraint rule registry** — Phase 3, when drag exercises every rule. Phase 1 ships only `noTransplantBeforeLastFrostForTender` (SCH-04 demands it).
- **Full task taxonomy (sow/prune/scout-pests)** — Phase 3 alongside `TasksDashboard`. Phase 1 ships only the 3 universal auto-task types.
- **BroadcastChannel cross-tab coordination** — only if Phase 3 surfaces a real need. For now, the `storage` event listener is sufficient.
- **JSON export/import UX** — Phase 2 (DATA-04, DATA-05). Phase 1 builds the schema/migration framework that import will rely on.
- **Catalog grown to ~30 plants** — Phase 2 (CAT-01). Phase 1 ships only the 4 fixture plants needed for snapshot tests.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCH-01 | Engine computes per-plant lifecycle: indoor-start → harden-off → transplant → harvest | Algorithm in §Schedule Engine + cascade rules from ARCHITECTURE.md §Schedule Engine reproduced below |
| SCH-02 | All scheduling math is pure functions over `(plan, catalog) → ScheduleEvent[]` with no I/O | Pure-domain pattern locked in §Architecture Patterns; lint rule + import-boundary discipline |
| SCH-03 | Dates stored & computed as UTC noon; no raw `new Date(string)` outside one wrapper | `domain/dateWrappers.ts` design + `@date-fns/utc` `UTCDate` usage in §Code Examples |
| SCH-04 | Engine respects frost tolerance: tender clamps transplant ≥ lastFrost; hardy allows offset | `noTransplantBeforeLastFrostForTender` rule in §Constraint Registry |
| SCH-05 | Year-rollover crops compute correctly across calendar boundaries | Garlic Oct 2026 → Jul 2027 fixture in §Snapshot Test Fixtures |
| SCH-07 | Engine emits auto-derived task events alongside lifecycle events | Auto-task emission contract in §Schedule Engine (`water-seedlings`, `harden-off-day`, `fertilize-at-flowering`) |
| SCH-08 | Snapshot tests cover tomato/lettuce/broccoli/garlic + DST + leap-year | Vitest snapshot setup in §Validation Architecture |
| DATA-01 | Plan state persists to localStorage on every change | Zustand `persist` middleware in §Code Examples (machinery only — no plan writes in Phase 1 per D-02) |
| DATA-02 | Persisted state carries `schemaVersion`; migration framework runs on load | `version: 1` + `migrate` callback pattern verified from Zustand official docs |
| DATA-03 | Detect localStorage unavailable, surface non-blocking banner | iOS Private probe pattern verified against MDN + community sources |
| DATA-06 | Multi-tab `storage` events keep tabs reconciled | `withStorageDOMEvents` HOF verified from Zustand official docs |
| DATA-07 | Bad/corrupt import shows clear error without corrupting current state | `migrate` returns un-mutated state on parse failure; defensive shape in §Code Examples |
| DEPLOY-02 | Hash-based routing so deep links work after refresh on static host | `createHashRouter` from React Router 7 verified from official docs |
</phase_requirements>

## Summary

Phase 1 is a greenfield bootstrap. There is no `src/`, no `package.json`, no Vite scaffold yet — this phase commits the first line of code. The locked stack (React 19 + Vite + TS 6 + Zustand 5 + date-fns 4 + Tailwind 4 + Vitest 4 + React Router 7) is uncontroversial for a static SPA, and the discrete deliverables are well-defined: (1) Vite scaffold + `src/` directory tree per `ARCHITECTURE.md`, (2) `domain/` pure functions for the schedule engine and constraint registry, (3) `data/storage.ts` boundary with iOS-Safari probe + `storage` event listener, (4) Zustand `planStore` with `persist` middleware (machinery only — D-02 forbids writing plan data in Phase 1), (5) hash router shell with four placeholder routes, (6) bare-SVG static gantt rendering a hardcoded sample plan via `generateSchedule()`, and (7) Vitest snapshot suite for the four canonical plants across DST/leap-year/year-rollover fixtures.

The two highest-leverage research findings: **(a)** Vite 8.0.10 is current and `@vitejs/plugin-react@6.0.1` requires `vite: ^8.0.0`, so the practical scaffold is Vite 8, not Vite 7 as STACK.md briefly says — STACK.md's "Vite 7+" wording covers this, but the planner should know the install command resolves to v8. **(b)** Cloudflare Pages auto-detects SPA mode when no `404.html` exists and serves `/index.html` for unknown paths — for hash routing this means no `_redirects` file is strictly required, but adding one (`/* /index.html 200`) makes the SPA fallback explicit and survives a future host migration. Both findings are verified against npm registry queries and Cloudflare official docs.

**Primary recommendation:** Scaffold with `npm create vite@latest garden-gantt -- --template react-ts`, install the locked dependencies, set `tsconfig.json` to `"strict": true` + `"noUncheckedIndexedAccess": true` + `"exactOptionalPropertyTypes": true` (the engine's purity invariant relies on these), and structure the first commits in this order: types → date wrappers → catalog → engine → constraint registry → snapshot tests → persistence machinery → hash router → bare SVG gantt. Tests gate every step; the engine ships green snapshot output before any UI exists.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schedule engine (`generateSchedule`) | Browser / Client (pure module, no DOM) | — | App is single-user no-backend; engine runs in the browser; pure-function discipline keeps it untestable from React |
| Persistence layer (`data/storage.ts`) | Browser / Client (localStorage) | — | localStorage is the only durable store per Core Value constraint; no backend exists |
| Storage probe & banner state | Browser / Client | — | iOS Private detection requires running JS in the browser; banner is a memory-only UI flag |
| Multi-tab `storage` event listener | Browser / Client | — | DOM-level event; only meaningful between tabs of the same origin |
| Hash router | Browser / Client | — | Hash never reaches the server; static host serves the same `index.html` for any path |
| Bare-SVG static gantt | Browser / Client (SVG/DOM) | — | Pure browser render; no SSR; data flows in-memory from engine through derived selector |
| Tailwind v4 stylesheet | Browser / Client | CDN / Static (build artifact served by host) | Built into a static CSS file at `vite build` time; runs as plain CSS in browser |
| Snapshot test runner | (Build-time, not a runtime tier) | — | Vitest runs in Node during dev/CI; not a runtime concern of the deployed app |
| Cloudflare Pages SPA fallback | CDN / Static | — | Host serves `/index.html` for any unmatched path; no compute |

**No backend tier exists.** Every capability is browser-side or build-time. The Architectural Responsibility Map for later phases (Setup Wizard, ZIP lookup, Permapeople) introduces some "fetch a static asset / fetch from third-party API" flows, all still browser-originated.

## Standard Stack

### Version verification

All versions queried against npm registry on 2026-04-26 via `npm view <pkg> version`. Publish dates checked where relevant.

| Package | Version (verified) | Published | Notes |
|---------|--------------------|-----------|-------|
| `react` | 19.2.5 | stable | matches STACK.md |
| `react-dom` | 19.2.5 | stable | peer of react |
| `@types/react` | 19.2.14 | recent | required by TS strict |
| `@types/react-dom` | 19.2.3 | recent | required by TS strict |
| `vite` | 8.0.10 | 2026-04-23 | **STACK.md says "Vite 7+" — current resolution is v8; v7.3.2 still available but `@vitejs/plugin-react@6` requires `vite: ^8`** |
| `@vitejs/plugin-react` | 6.0.1 | recent | peer: `vite: ^8.0.0` (forces Vite 8) |
| `typescript` | 6.0.3 | stable | matches STACK.md |
| `zustand` | 5.0.12 | 2026-03-16 | matches STACK.md |
| `date-fns` | 4.1.5 | recent | matches STACK.md (v4 line) |
| `@date-fns/utc` | 2.1.1 | 2025-07 (~9 mo ago) | independent versioning; matches STACK.md |
| `react-router` | 7.14.2 | recent | matches STACK.md |
| `tailwindcss` | 4.2.4 | recent | matches STACK.md |
| `@tailwindcss/vite` | 4.2.4 | recent | peers: `vite: ^5.2.0 || ^6 || ^7 || ^8` (Vite 8 OK) |
| `lucide-react` | 1.11.0 | recent | UI-SPEC requires for banner dismiss icon |
| `vitest` | 4.1.5 | recent | latest in v4 line; STACK.md says "4.1.0+" |

`[VERIFIED: npm registry, queries 2026-04-26]` for all rows above.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.5 | UI framework | Locked by STACK.md/CONTEXT |
| react-dom | 19.2.5 | DOM renderer | Peer of react |
| typescript | 6.0.3 | Type safety | Locked by STACK.md; engine purity depends on strict types |
| vite | 8.0.10 | Dev server + build | Locked by STACK.md; v8 is current major and the only path the React plugin supports |
| @vitejs/plugin-react | 6.0.1 | React HMR + JSX transform | Standard React + Vite plumbing |
| zustand | 5.0.12 | Store + persist middleware | Locked by STACK.md; built-in `persist` with `version`/`migrate` |
| react-router | 7.14.2 | Hash router | Locked by STACK.md/D-08 |
| date-fns | 4.1.5 | Pure date arithmetic | Locked by STACK.md |
| @date-fns/utc | 2.1.1 | UTC `Date` class wrapper | Locked by STACK.md; `UTCDate` removes DST traps |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwindcss | 4.2.4 | Utility-first CSS | UI-SPEC mandates Tailwind v4 tokens |
| @tailwindcss/vite | 4.2.4 | Tailwind v4 native Vite plugin | Required for v4 (no PostCSS pipeline) |
| lucide-react | 1.11.0 | Icon set | UI-SPEC: banner dismiss `X` icon; Phase 2+ has wider use |
| vitest | 4.1.5 | Test runner | Locked by STACK.md; native ESM/TS, snapshot built-in |
| @vitest/ui | 4.1.5 | Vitest UI dashboard | Optional dev convenience; planner can defer |

### Dev-only Types
| Library | Version | Purpose |
|---------|---------|---------|
| @types/react | 19.2.14 | React type defs |
| @types/react-dom | 19.2.3 | React DOM type defs |
| @types/node | latest in 20/22 line | Vite/Vitest config typing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff (rejected — STACK is locked) |
|------------|-----------|----------|
| `@date-fns/utc` `UTCDate` | Native `Temporal.PlainDate` | Temporal not yet in Safari unflagged → polyfill is 20–60 KB; STACK.md rejects in favor of date-fns v4 |
| `createHashRouter` (data router) | `<HashRouter>` (declarative) | Both work; data router has loader/action APIs we don't need in Phase 1; declarative `<HashRouter>` is simpler for placeholder routes (recommended below) |
| `@tailwindcss/vite` plugin | PostCSS + `tailwindcss` plugin | v4 is built around the Vite plugin; PostCSS path is legacy v3-style — DO NOT USE |
| `npm create vite@latest` | Manual `npm init` + `vite` install | Scaffold is `--template react-ts`; saves ~10 boilerplate lines; standard |

**Installation (single shot, after scaffold):**
```bash
# 1. Scaffold (creates package.json, vite.config.ts, tsconfig.json, src/main.tsx, etc.)
npm create vite@latest garden-gantt -- --template react-ts
cd garden-gantt
npm install

# 2. Locked production deps
npm install zustand@^5 react-router@^7 date-fns@^4 @date-fns/utc@^2 lucide-react@^1

# 3. Tailwind v4
npm install -D tailwindcss@^4 @tailwindcss/vite@^4

# 4. Vitest (Vite 8 + Vitest 4 are version-aligned)
npm install -D vitest@^4 @vitest/ui@^4
```

Note: `npm create vite@latest --template react-ts` (as of 2026-04) emits Vite 8 + React 19 + TS 6 by default, so steps 1–2 do not need explicit version pins — the bare `react@^19 react-dom@^19 vite@^8` already match STACK.md. Pinning is a planner judgment call; recommend caret ranges to allow non-breaking patches.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            App boot (main.tsx)                          │
│   1. import './index.css' (Tailwind v4)                                 │
│   2. probeStorage() — try setItem/removeItem; sets isStorageAvailable   │
│   3. withStorageDOMEvents(usePlanStore) — multi-tab listener wired      │
│   4. ReactDOM.createRoot().render(<RouterProvider />)                   │
└──────────────────────────────────────────┬──────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  Hash Router (react-router 7 createHashRouter)          │
│  #/setup → <PlaceholderRoute />     #/plan → <GanttView />              │
│  #/tasks → <PlaceholderRoute />     #/settings → <PlaceholderRoute />   │
│  Wrapped by <AppShell> — banner + header + nav links                    │
└──────────────────────────────────────────┬──────────────────────────────┘
                                           │
                  ┌────────────────────────┴─────────────────────────┐
                  │                                                   │
                  ▼                                                   ▼
┌─────────────────────────────┐              ┌─────────────────────────────────┐
│       <GanttView />         │              │      <PlaceholderRoute />       │
│  Reads sampleHardcodedPlan  │              │  Static "coming soon" copy      │
│  + sampleCatalog            │              │  (per UI-SPEC)                  │
│  Calls useDerivedSchedule() │              └─────────────────────────────────┘
└─────────────┬───────────────┘
              │
              │ (selector, memoized on plan+catalog refs)
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│           domain/scheduler.ts — generateSchedule(plan, catalog)         │
│                                                                          │
│   For each Planting:                                                     │
│     1. Resolve Plant from catalog (warn if missing)                      │
│     2. Compute base anchors via dateWrappers.ts (UTC arithmetic only)    │
│        - indoorStart  = subDays(lastFrost, weeksIndoor*7)                │
│        - transplant   = addDays(lastFrost, transplantOffset)             │
│        - hardenOff    = subDays(transplant, daysToHardenOff)             │
│        - harvestStart = addDays(transplant, daysToMaturity)              │
│        - harvestEnd   = addDays(harvestStart, harvestWindowDays)         │
│     3. Apply ScheduleEdit overrides (sparse — empty in Phase 1)          │
│     4. Apply constraint rules (clamp, mark constraintsApplied[])         │
│     5. Emit auto-tasks via taskEmitter.emitTaskEvents(planting, …)       │
│        - water-seedlings (every 2-3d during indoor phase)                │
│        - harden-off-day (one per day in harden-off range)                │
│        - fertilize-at-flowering (DTM-based, skipped if !hasFlowering)    │
│  Output: ScheduleEvent[] (lifecycle + task events, flat array)           │
└─────────────┬───────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│        domain/constraints.ts — canMove(event, candidate, plan, plant)   │
│                                                                          │
│   Rules registry (Phase 1: only 1 rule):                                 │
│     • noTransplantBeforeLastFrostForTender                               │
│       — applies to type==='transplant' AND plant.frostTolerance==='tender'│
│       — clamps candidate to max(candidate, lastFrostDate)                │
└─────────────────────────────────────────────────────────────────────────┘

              ┌─────────────────────────────────────────┐
              │   Persistence machinery (D-01, no plan  │
              │     writes in Phase 1 per D-02)         │
              │                                         │
              │  stores/planStore.ts                    │
              │   create(persist((set, get) => ({ … })))│
              │     name: 'garden-gantt:plan'           │
              │     version: 1                          │
              │     migrate: (s, v) => s  // empty stub │
              │                                         │
              │  data/storage.ts                        │
              │   probeStorage() — try/catch probe      │
              │   isStorageAvailable() — boolean        │
              │   withStorageDOMEvents() — 'storage'    │
              │     event listener calling rehydrate()  │
              │                                         │
              │  stores/uiStore.ts (in-memory only)     │
              │   bannerDismissed: boolean              │
              │   isStorageAvailable: boolean           │
              └─────────────────────────────────────────┘
```

### Recommended Project Structure

Follows ARCHITECTURE.md verbatim with Phase 1 scope. Empty/placeholder folders are intentional — they pre-establish boundaries for Phases 2/3.

```
garden-gantt/
├── public/
│   └── _redirects                    # /* /index.html 200 (defensive, not strictly required on CF Pages)
├── src/
│   ├── app/                          # App shell, routing, providers
│   │   ├── App.tsx                   # <AppShell> wrapping <Outlet>
│   │   ├── routes.tsx                # createHashRouter + route table
│   │   ├── AppShell.tsx              # Banner + header + nav (per UI-SPEC)
│   │   ├── PlaceholderRoute.tsx      # "Coming soon" route component
│   │   └── ErrorBoundary.tsx         # Top-level boundary
│   ├── features/
│   │   └── gantt/                    # Phase 1 only feature with real content
│   │       ├── GanttView.tsx         # Bare-SVG read-only gantt
│   │       ├── timeScale.ts          # Date ↔ pixel mapping (D-06)
│   │       └── lifecyclePalette.ts   # EventType → hex (UI-SPEC tokens)
│   ├── domain/                       # PURE — no React, no I/O imports
│   │   ├── types.ts                  # Plant, GardenPlan, Planting, ScheduleEvent, ScheduleEdit, etc.
│   │   ├── dateWrappers.ts           # ONLY allowed `new Date(string)` site
│   │   ├── scheduler.ts              # generateSchedule(plan, catalog)
│   │   ├── constraints.ts            # canMove + rule registry
│   │   ├── taskEmitter.ts            # emitTaskEvents per planting (Phase 1 scope: 3 universal types)
│   │   └── ids.ts                    # plantingId / eventId helpers
│   ├── data/
│   │   └── storage.ts                # probeStorage, isStorageAvailable, withStorageDOMEvents
│   ├── stores/
│   │   ├── planStore.ts              # Zustand + persist (machinery only)
│   │   └── uiStore.ts                # In-memory: bannerDismissed, isStorageAvailable
│   ├── assets/
│   │   └── catalog.ts                # tomato, lettuce, broccoli, garlic constants (Phase 1 fixtures)
│   ├── samplePlan.ts                 # The hardcoded sample plan (D-03)
│   ├── index.css                     # @import "tailwindcss"; @theme { … }
│   └── main.tsx                      # App entry — boot sequence
├── tests/
│   ├── domain/
│   │   ├── scheduler.snapshot.test.ts   # SCH-08: tomato/lettuce/broccoli/garlic
│   │   ├── scheduler.dst.test.ts        # March 2026 spring-forward
│   │   ├── scheduler.leap.test.ts       # Feb 29 2024
│   │   ├── scheduler.rollover.test.ts   # Garlic Oct 2026 → Jul 2027
│   │   └── constraints.test.ts          # noTransplantBeforeLastFrostForTender
│   └── __snapshots__/                   # Auto-generated; checked into git
├── index.html                        # Vite scaffold default
├── vite.config.ts                    # plugins: [react(), tailwindcss()]
├── vitest.config.ts                  # OR test block in vite.config.ts
├── tsconfig.json                     # strict + noUncheckedIndexedAccess
├── tsconfig.node.json                # Vite/Vitest config typing
└── package.json
```

**Structure rationale:**
- `samplePlan.ts` lives at `src/` root (not in `assets/`) because it imports from `domain/` and `assets/` and is consumed by `<GanttView>`. Putting it in `assets/` would create a cycle.
- `tests/` is sibling to `src/` (not co-located) because Phase 1 testing is engine-only, no component tests yet. Co-located `.test.ts` is fine for Phase 2+ when component tests appear; consistency comes later.
- `app/PlaceholderRoute.tsx` is reused by all three placeholder routes via props — see UI-SPEC's per-route copy table.
- `assets/catalog.ts` (TS, not JSON): planner discretion, but TS gives stronger types and lets IDE jump-to-definition surface plant constants directly. Per CONTEXT.md "Claude's Discretion" — the engine doesn't care which.

### Pattern 1: Pure Domain Core, Imperative Shell

**What:** All scheduling, constraint, and task-emission logic lives in `src/domain/` as pure TypeScript with **zero imports** from `react`, `zustand`, `react-router`, `vite`, `lucide-react`, `tailwindcss`, or any module under `src/data/`, `src/stores/`, or `src/features/`. The "shell" calls into the core but never participates in scheduling decisions.

**When to use:** here — correctness of the schedule is the product.

**Example:**
```typescript
// src/domain/scheduler.ts (pure)
import { addDays, subDays } from 'date-fns';
import { parseDate } from './dateWrappers';
import type { GardenPlan, Plant, ScheduleEvent } from './types';

export function generateSchedule(
  plan: GardenPlan,
  catalog: ReadonlyMap<string, Plant>
): ScheduleEvent[] {
  return plan.plantings.flatMap(p => eventsForPlanting(p, catalog, plan.location, plan.edits));
}
```

```typescript
// src/stores/planStore.ts (selector wraps it; this file may import React/Zustand)
import { useMemo } from 'react';
import { generateSchedule } from '../domain/scheduler';
import { usePlanStore } from './planStore';
import { useCatalogStore } from './catalogStore';

export const useDerivedSchedule = () => {
  const plan = usePlanStore(s => s.plan);
  const catalog = useCatalogStore(s => s.merged);
  return useMemo(() => generateSchedule(plan, catalog), [plan, catalog]);
};
```

**Source:** `[CITED: .planning/research/ARCHITECTURE.md §Pattern 1]`. The pattern is endemic to functional core + imperative shell architectures (Gary Bernhardt, ~2012); battle-tested.

### Pattern 2: UTC-Noon Storage Discipline

**What:** Every date stored or computed within `domain/` is an ISO 8601 string at UTC noon (`"2026-05-15T12:00:00Z"`). The single allowed `new Date(string)` site is `src/domain/dateWrappers.ts`. Everywhere else uses `parseDate()` (the wrapper) or `addDays/subDays/differenceInDays` from date-fns.

**Why noon, specifically:** UTC noon on day X is the same calendar day in every timezone from UTC-12 to UTC+12. Storing midnight (00:00 UTC) is the canonical Pitfall 6 — a user in Pacific time sees "May 14" when the data says "May 15." Noon dodges that across the entire planet.

**When to use:** any date-only domain (no time-of-day semantics) where the date must mean the same calendar day everywhere.

**Trade-offs:**
- Pro: zero timezone display drift; DST never bites because we never do hour math
- Pro: a single grep can audit every date-creation site (`grep -rn "new Date(" src/` should yield only `dateWrappers.ts`)
- Con: a tiny mental model shift — devs writing new code must use the wrapper, not `new Date()`
- Con: ISO strings with time component (`T12:00:00Z`) feel verbose; a `parseDate` wrapper hides this

**Example:**
```typescript
// src/domain/dateWrappers.ts — the ONLY module that may call new Date(string)
// Source: [VERIFIED: github.com/date-fns/utc README, fetched 2026-04-26]
//          [CITED: ARCHITECTURE.md §Pattern Date Discipline]
import { UTCDate } from '@date-fns/utc';

/** Parse an ISO date string ("2026-04-15" or "2026-04-15T12:00:00Z") to a UTCDate at noon UTC. */
export function parseDate(iso: string): UTCDate {
  // Accept both date-only and datetime forms; coerce to noon UTC.
  const trimmed = iso.length === 10 ? `${iso}T12:00:00Z` : iso;
  // eslint-disable-next-line no-restricted-syntax -- THIS is the allowed site
  return new UTCDate(new Date(trimmed));
}

/** Format a Date back to an ISO string at UTC noon. Idempotent. */
export function toISODate(date: Date): string {
  const d = new UTCDate(date);
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

/** Format a Date as "YYYY-MM-DD" for display only (never for storage). */
export function formatDateShort(date: Date): string {
  const d = new UTCDate(date);
  return d.toISOString().slice(0, 10);
}
```

`new UTCDate()` performs all arithmetic in UTC, so `addDays(parseDate('2026-03-08'), 1)` yields `2026-03-09T12:00:00Z` regardless of system timezone or whether March 8 → 9 crosses DST. `[VERIFIED: github.com/date-fns/utc README — explicit DST example]`

### Pattern 3: Sparse Edits Over Materialized State

**What:** Persist only the deltas (`ScheduleEdit[]`) — never the full `ScheduleEvent[]`. Always regenerate events at load time from `plantings + plants + location + edits`.

**When to use:** any app where computed state is large, derivation is fast, and you want catalog updates to flow into existing plans.

In **Phase 1** there is no persisted plan (D-02), so `edits[]` is the empty array on the hardcoded sample. The pattern still ships in `domain/scheduler.ts` as the apply-edits step, dormant until Phase 3 lights it up.

**Source:** `[CITED: ARCHITECTURE.md §Pattern 2]`.

### Pattern 4: Constraint Registry

**What:** Constraint rules are functions registered into an array. `canMove(event, candidate, plan, plant)` runs every applicable rule and aggregates results.

**Phase 1 scope (D-13/SCH-04):** the registry contains exactly **one rule** — `noTransplantBeforeLastFrostForTender`. Other rules join the registry in Phase 3 when drag exercises them.

**Why register-as-list now even with one rule:** future rules append without restructuring; the engine's call site is `rules.filter(r => r.appliesTo(event)).reduce(applyRule, …)` regardless of `rules.length`. Snapshot tests verify the one rule today; tomorrow's tests do the same with no engine churn.

**Example:**
```typescript
// src/domain/constraints.ts
import { parseDate } from './dateWrappers';
import type { GardenPlan, Plant, ScheduleEvent } from './types';

export type ConstraintResult =
  | { ok: true; finalDate: string }
  | { ok: true; finalDate: string; clamped: true; reasons: string[] };

interface ConstraintRule {
  name: string;
  appliesTo: (event: ScheduleEvent, plant: Plant) => boolean;
  check: (event: ScheduleEvent, candidate: string, plan: GardenPlan, plant: Plant)
    => ConstraintResult;
}

const noTransplantBeforeLastFrostForTender: ConstraintRule = {
  name: 'noTransplantBeforeLastFrostForTender',
  appliesTo: (e, p) => e.type === 'transplant' && p.timing.frostTolerance === 'tender',
  check: (e, candidate, plan, _plant) => {
    const lastFrost = parseDate(plan.location.lastFrostDate);
    const cand = parseDate(candidate);
    if (cand >= lastFrost) return { ok: true, finalDate: candidate };
    return {
      ok: true,
      clamped: true,
      finalDate: plan.location.lastFrostDate,
      reasons: [`Tender plant: clamped transplant to last frost (${plan.location.lastFrostDate}).`],
    };
  },
};

const rules: ConstraintRule[] = [noTransplantBeforeLastFrostForTender];

export function canMove(
  event: ScheduleEvent,
  candidate: string,
  plan: GardenPlan,
  plant: Plant,
): ConstraintResult {
  let acc: ConstraintResult = { ok: true, finalDate: candidate };
  for (const rule of rules) {
    if (!rule.appliesTo(event, plant)) continue;
    const next = rule.check(event, acc.finalDate, plan, plant);
    if ('clamped' in next && next.clamped) {
      acc = {
        ok: true,
        clamped: true,
        finalDate: next.finalDate,
        reasons: [
          ...(('reasons' in acc && acc.clamped) ? acc.reasons : []),
          ...next.reasons,
        ],
      };
    } else {
      acc = { ok: true, finalDate: next.finalDate };
    }
  }
  return acc;
}
```

**Source:** `[CITED: ARCHITECTURE.md §Pattern 3]`.

### Pattern 5: Probe-First Persistence

**What:** Before Zustand `persist` hydrates, `main.tsx` runs a probe write that's deliberately separate from any plan data. The probe sets `__gg_probe = "1"` then removes it; if either op throws, `isStorageAvailable` is false and the banner is shown. Per **D-02**, no plan data is written in Phase 1, so even when storage IS available the persist middleware has nothing to write — it's wired but inert.

**Why probe BEFORE persist hydrates:** `persist` middleware reads from storage at create time. If iOS Private Mode causes `setItem` to throw, persist will swallow the error and the app keeps running, but we lose visibility. Probing first sets a known boolean flag that the banner reads regardless of persist's behavior.

**Source:** `[VERIFIED: developer.mozilla.org/en-US/docs/Web/API/Storage/setItem]` confirms `QuotaExceededError` is the documented exception. iOS Safari Private Mode behavior cited in PITFALLS.md §18 with two community sources.

### Pattern 6: Storage-Event Multi-Tab Listener

**What:** A higher-order function `withStorageDOMEvents(store)` subscribes to `window.addEventListener('storage', …)` and on matching key change calls `store.persist.rehydrate()`. Returned cleanup function unsubscribes (called from `useEffect` return).

**Source pattern (verbatim from official docs, used as-is):**
```typescript
// Source: [VERIFIED: github.com/pmndrs/zustand/blob/main/docs/reference/integrations/persisting-store-data.md]
// Fetched via Context7 /pmndrs/zustand 2026-04-26
type StoreWithPersist = Mutate<StoreApi<State>, [["zustand/persist", unknown]]>;

export const withStorageDOMEvents = (store: StoreWithPersist) => {
  const storageEventCallback = (e: StorageEvent) => {
    if (e.key === store.persist.getOptions().name && e.newValue) {
      store.persist.rehydrate();
    }
  };
  window.addEventListener('storage', storageEventCallback);
  return () => {
    window.removeEventListener('storage', storageEventCallback);
  };
};
```

**Phase 1 application:** the listener IS wired in Phase 1 (D-15), but in Phase 1 there's no persisted plan to overwrite, so `rehydrate()` is effectively a no-op. The wiring exists so Phase 2 doesn't have to retrofit it — the test "two tabs open, edit in tab A, observe tab B" only becomes meaningful in Phase 2, but DATA-06 demands the listener exist now.

### Anti-Patterns to Avoid

- **`new Date('2026-04-15')` outside `dateWrappers.ts`** — parses as UTC midnight; in PT renders as April 14. Add an ESLint rule (`no-restricted-syntax: NewExpression[callee.name='Date']`) with an allowlist for `dateWrappers.ts`.
- **Persisting `ScheduleEvent[]`** — doubles storage size, blocks catalog fixes from propagating, makes migrations harder. Persist `plantings + customPlants + edits + location + settings` only. (See PITFALLS.md anti-pattern.)
- **Putting schedule math in `<GanttView>`** — `useMemo` over date arithmetic in a component is untestable without rendering. Pure `domain/scheduler.ts` + `useDerivedSchedule()` selector.
- **One big Zustand store** — drag preview state, plan state, banner state in one store means `persist` writes everything on every change. Split into `planStore` (persisted) + `uiStore` (in-memory) — D-02/UI-SPEC require this.
- **Skipping `storage` event listener "since we're single-user"** — a single user can have two tabs open. PITFALLS.md §19 covers the race; D-15 mandates the listener.
- **Skipping `version` + `migrate` "since v1 has no prior schemas"** — adds the entire migration burden when v2 ships. Wire it now with an empty migrate path. PITFALLS.md §4 covers the cost.
- **Tailwind v3 PostCSS pipeline** — Tailwind v4 is built around `@tailwindcss/vite`. Mixing v4 with the v3-style `tailwind.config.js` + PostCSS path is unsupported. Use `@import "tailwindcss"` + `@theme { … }` in `src/index.css`. `[VERIFIED: tailwindcss.com/docs/installation/using-vite]`
- **`<HashRouter>` and `createHashRouter` together** — you pick one. `createHashRouter` + `<RouterProvider>` is the data-router path; `<HashRouter><Routes>…</Routes></HashRouter>` is declarative. For Phase 1 (no loaders/actions), declarative is simpler. Both are stable in v7. Recommendation: use **`<HashRouter>` + `<Routes>`** to keep the surface tiny.
- **Storing dates in mixed forms** — some places ISO `"2026-04-15"`, others `"2026-04-15T00:00:00Z"`, others Date objects. `dateWrappers.parseDate()` accepts both string forms and always returns `UTCDate`; `toISODate()` always returns the noon-UTC form. Discipline at the type level: `Location.lastFrostDate: string` (always noon-UTC ISO).
- **Adding the SVAR/Frappe gantt library now** — explicitly forbidden by D-07. The Phase 3 spike picks the library; Phase 1's bare SVG must be disposable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persistence with versioning + migration | Custom `localStorage.getItem/setItem` wrapper with manual `version` field check | Zustand `persist` middleware with `version` + `migrate` | Built-in `migrate(persistedState, version)` callback handles schema bumps; `createJSONStorage` swap-in for IndexedDB later; rehydrate API for multi-tab. `[VERIFIED: zustand official docs via Context7]` |
| Multi-tab sync | Hand-rolled `BroadcastChannel` polling, custom event bus, or polling `localStorage` on focus | `window.addEventListener('storage', …)` + Zustand `store.persist.rehydrate()` | The storage event fires automatically on cross-tab writes; the official Zustand pattern is 10 lines and correct. D-15 explicitly bans BroadcastChannel for Phase 1. `[VERIFIED: zustand official docs]` |
| Date arithmetic with DST safety | Custom millisecond math, `Date.setDate()`, manual leap-year guards | `date-fns` `addDays`/`subDays`/`differenceInDays` + `@date-fns/utc` `UTCDate` | DST is a 30-year-old hand-grenade. UTC arithmetic dodges it entirely; date-fns is tree-shakable and zero-allocation per call. `[VERIFIED: github.com/date-fns/utc, github.com/date-fns/date-fns]` |
| Hash routing | Custom `window.addEventListener('hashchange', …)` + manual route table parsing | React Router 7 `<HashRouter>` or `createHashRouter` | Handles back/forward buttons, basename, future flags, focus management on navigation, all already debugged. ~10 KB gzipped is acceptable. `[VERIFIED: react-router docs via Context7]` |
| iOS Private Mode detection | Sniffing `navigator.userAgent` for "iPad/iPhone" + checking `localStorage.length` | `try { setItem; removeItem } catch` probe | UA sniffing is fragile and wrong (desktop Safari Private also throws); the probe is the canonical pattern from MDN. `[VERIFIED: developer.mozilla.org/en-US/docs/Web/API/Storage/setItem]` |
| Snapshot serialization | Custom `JSON.stringify` with sorted keys + manual diff | Vitest `toMatchSnapshot` with default `@vitest/pretty-format` | Built-in stable key sort, deterministic output, `--update` flag, snapshot file format that Git diffs cleanly. `[VERIFIED: vitest docs via Context7]` |
| Time-axis tick generation for SVG gantt | Hand-loop generating month/week tick marks | `eachMonthOfInterval` + `eachWeekOfInterval` from date-fns | The wheel exists; Phase 1 uses date-fns interval helpers + a simple `dateToX` projection. `[CITED: date-fns API docs]` |
| TypeScript strict mode | `// @ts-ignore` to silence errors as they appear | Set strict flags in `tsconfig.json`, fix at the source | Engine purity invariant relies on `noUncheckedIndexedAccess` (catalog lookups can be undefined) and `exactOptionalPropertyTypes` (sparse `ScheduleEdit` shape). `[CITED: typescriptlang.org/tsconfig]` |
| Cloudflare Pages SPA fallback | Hand-rolled `404.html` redirect with `<meta http-equiv="refresh">` hack | Cloudflare Pages auto-detects SPA mode (no `404.html` present) → serves `/index.html` for unknown paths | Hash routing means the path the server sees is always `/`, so this is doubly belt-and-suspenders. `[VERIFIED: developers.cloudflare.com/pages/configuration/serving-pages/]` |

**Key insight:** every "do not hand-roll" item above has a battle-tested library in the locked stack. The temptation in greenfield is "we know what we want, let's just write it." The cost shows up in Phase 4 when an iOS user, a DST week, a multi-tab race, or a schema migration each individually finds the bug. Lean on the libraries.

## Common Pitfalls

Sourced from PITFALLS.md, narrowed to Phase 1 scope.

### Pitfall 1: Off-by-one in "weeks before last frost" math
**What goes wrong:** Indoor seed-start dates land a week early or late; cascade compounds.
**Why it happens:** `subWeeks(date, 6)` and `subDays(date, 42)` can yield different results in libraries that handle weeks as "calendar weeks" vs "7-day intervals," and DST boundary crossings in `Date` arithmetic shift by ±1 hour, which flips the calendar day.
**How to avoid:** All "weeks before X" math goes through `subDays(date, weeks * 7)` only. Never use `subWeeks`. Run with `UTCDate` to remove DST entirely. Snapshot tests cover March 2026 spring-forward (`new UTCDate('2026-03-12')` minus 14 days must equal `2026-02-26T12:00:00Z` exactly).
**Warning signs:** Any `subWeeks` import; any `setDate(getDate() - n)` mutation; tests that pass in summer but fail in March.
**Source:** `[CITED: PITFALLS.md §2]`

### Pitfall 2: Year-rollover (garlic Oct → Jul next year)
**What goes wrong:** Engine assumes single calendar year. Garlic harvest renders before garlic planting on the gantt.
**Why it happens:** Naive engine uses `getFullYear()` of the planting date and stamps that year on harvest.
**How to avoid:** Engine works in plain UTC dates with no implicit year reset. `addDays(parseDate('2026-10-15'), 270)` correctly yields `2027-07-12T12:00:00Z`. The `samplePlan.ts` includes garlic to verify; D-17 mandates a fixture.
**Warning signs:** Any `getFullYear()` or `setFullYear()` calls; harvest dates appearing in the same calendar year as fall plantings.
**Source:** `[CITED: PITFALLS.md §8]`

### Pitfall 3: localStorage write throws in iOS Safari Private Browsing
**What goes wrong:** `setItem` throws `QuotaExceededError` (quota=0). App crashes or silently fails first save.
**How to avoid:** D-02 mandates probe-first pattern. `data/storage.ts:probeStorage()` runs before Zustand persist creates the store; sets `uiStore.isStorageAvailable = false` on throw; banner renders.
**Warning signs:** No try/catch around `setItem`; no banner on first launch in iOS Private Mode.
**Source:** `[CITED: PITFALLS.md §18]`, `[VERIFIED: developer.mozilla.org/en-US/docs/Web/API/Storage/setItem]`

### Pitfall 4: Multi-tab race condition
**What goes wrong:** Two tabs open. Tab A edits. Tab B's in-memory state is now stale; tab B's next save overwrites tab A's edits.
**How to avoid:** D-15 mandates the `storage` event listener. The Zustand-canonical `withStorageDOMEvents(store)` HOF wires `rehydrate()` on every cross-tab write.
**Phase 1 caveat:** No plan data is persisted in Phase 1 (D-02), so the listener is wired but inert. The verification in Phase 1 is: the listener IS attached (snapshot test on `window.addEventListener` calls), and `withStorageDOMEvents` returns a cleanup function. Real race-condition testing waits for Phase 2.
**Source:** `[CITED: PITFALLS.md §19]`, `[VERIFIED: zustand official docs via Context7]`

### Pitfall 5: Schema migration not in place at v1
**What goes wrong:** v1 ships with `version: 1`; v2 changes the data shape. Without `migrate`, persisted v1 plans crash at load time in v2.
**How to avoid:** D-01 + D-02 + DATA-02 mandate the full machinery in Phase 1, even though no plans are persisted. The `migrate` callback in `planStore.ts` is `(state, fromVersion) => state` — a no-op pass-through that establishes the contract. Future migrations append to a `migrations` array; the callback chains them.
**Recommended shape (planner discretion per CONTEXT.md):**
```typescript
const migrations: Record<number, (s: any) => any> = {};
// Each future migration: migrations[N] = (s) => { /* transform s from N-1 to N */ return s; }

migrate: (persisted, fromVersion) => {
  let s = persisted;
  for (let v = fromVersion + 1; v <= 1; v++) {
    if (migrations[v]) s = migrations[v](s);
  }
  return s;
};
```
For Phase 1 the loop is empty (current version is 1, no migrations below). When v2 ships, `migrations[2] = …` is added; the loop already runs it.
**Source:** `[CITED: PITFALLS.md §4]`, `[VERIFIED: zustand persist migrate docs via Context7]`

### Pitfall 6: Timezone display shift makes ISO date appear off by one day
**What goes wrong:** `new Date('2026-04-15')` parses as UTC midnight. PT user formats with `toLocaleDateString` and sees "April 14."
**How to avoid:** UTC noon storage convention. `toISODate()` always emits `T12:00:00Z`. Display formatter takes a `UTCDate` and uses `toISOString().slice(0,10)` for the date part — explicitly UTC, never local. UI-SPEC time-axis labels and gantt tooltips both go through this formatter.
**Source:** `[CITED: PITFALLS.md §6]`

### Pitfall 7: Corrupt persisted state crashes the app
**What goes wrong:** localStorage contains malformed JSON (manual edit, browser bug, partial write). `JSON.parse` throws; app boots to white screen.
**How to avoid:** Zustand `persist` wraps `JSON.parse` in its internal try/catch and falls back to the initial state if parse fails. Additionally, `migrate` returning the un-mutated state on validation failure is a defensive add. For Phase 1 with no plan data, the surface area is small, but the contract — "boot must succeed even if storage is gibberish" — is verified by a test that pre-seeds localStorage with `"not-json"` and asserts the app still renders.
**Source:** `[CITED: PITFALLS.md §21]`

### Pitfall 8: Missing harden-off events
**What goes wrong:** Engine emits indoor-start → transplant → harvest. User skips hardening; loses seedlings to wind/sun shock.
**How to avoid:** D-11 mandates `harden-off` as a range event type. Engine emits one per applicable planting:
- Indoor-start plants (broccoli, tomato): `harden-off` range = `[transplant - daysToHardenOff, transplant - 1]`
- Direct-sow plants (lettuce, garlic): no harden-off emitted (the catalog `requiresHardening` flag is false)
**Source:** `[CITED: PITFALLS.md §15]`

### Pitfall 9: Tailwind v4 ↔ v3 config style mismatch
**What goes wrong:** Developer writes `tailwind.config.js` with `module.exports = { content: [...], theme: {...} }` — the v3 way. Tailwind v4 expects `@theme { … }` in CSS and tree-shakes via the Vite plugin's content scanning.
**How to avoid:** Phase 1 ships zero `tailwind.config.*` files. All theme tokens go in `src/index.css`'s `@theme` block.
**Source:** `[VERIFIED: tailwindcss.com/docs/theme]`

## Code Examples

Verified patterns from official sources or canonical project files. Each is copy-pasteable into the Phase 1 implementation.

### main.tsx — boot sequence (probe → register listener → render)

```typescript
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import { App } from './app/App';
import { probeStorage, withStorageDOMEvents } from './data/storage';
import { usePlanStore } from './stores/planStore';
import { useUIStore } from './stores/uiStore';
import './index.css';

// 1. Probe storage availability BEFORE Zustand persist hydrates.
const isStorageAvailable = probeStorage();
useUIStore.getState().setStorageAvailable(isStorageAvailable);

// 2. Wire multi-tab `storage` event listener (D-15 / DATA-06).
//    No-op in Phase 1 since no plan data persists, but contract is in place.
withStorageDOMEvents(usePlanStore);

// 3. Render hash-router shell.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
```

### data/storage.ts — probe + storage event listener

```typescript
// src/data/storage.ts
// Source: [VERIFIED: developer.mozilla.org/en-US/docs/Web/API/Storage/setItem]
//          [VERIFIED: zustand persist docs — withStorageDOMEvents pattern]
import type { StoreApi, Mutate } from 'zustand';

const PROBE_KEY = '__gg_probe';

export function probeStorage(): boolean {
  try {
    window.localStorage.setItem(PROBE_KEY, '1');
    window.localStorage.removeItem(PROBE_KEY);
    return true;
  } catch {
    // QuotaExceededError on iOS Safari Private Browsing, or storage disabled.
    return false;
  }
}

export function isStorageAvailable(): boolean {
  return probeStorage();
}

type StoreWithPersist<T> = Mutate<StoreApi<T>, [['zustand/persist', unknown]]>;

export function withStorageDOMEvents<T>(store: StoreWithPersist<T>): () => void {
  const callback = (e: StorageEvent) => {
    if (e.key === store.persist.getOptions().name && e.newValue) {
      void store.persist.rehydrate();
    }
  };
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}
```

### stores/planStore.ts — Zustand persist with version + migrate (machinery only, D-02)

```typescript
// src/stores/planStore.ts
// Source: [VERIFIED: zustand persist + migrate docs via Context7 /pmndrs/zustand]
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GardenPlan } from '../domain/types';

interface PlanState {
  plan: GardenPlan | null;
  // Phase 1 has no setters that mutate `plan` (D-02). Future phases add them.
}

const SCHEMA_VERSION = 1;

// Each future migration: migrations[N] = (s) => { /* transform s from version N-1 to N */ return s; }
const migrations: Record<number, (state: any) => any> = {};

export const usePlanStore = create<PlanState>()(
  persist(
    (_set) => ({
      plan: null, // Phase 1: hardcoded sample plan is loaded from samplePlan.ts, not persisted.
    }),
    {
      name: 'garden-gantt:plan',
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, fromVersion) => {
        let s = persisted;
        for (let v = fromVersion + 1; v <= SCHEMA_VERSION; v++) {
          const m = migrations[v];
          if (m) s = m(s);
        }
        return s as PlanState;
      },
    },
  ),
);
```

### app/routes.tsx — declarative HashRouter with placeholder routes

```typescript
// src/app/App.tsx
// Source: [VERIFIED: react-router 7 declarative HashRouter via Context7 /remix-run/react-router]
import { Route, Routes } from 'react-router';
import { AppShell } from './AppShell';
import { PlaceholderRoute } from './PlaceholderRoute';
import { GanttView } from '../features/gantt/GanttView';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<GanttView />} />
        <Route path="/plan" element={<GanttView />} />
        <Route
          path="/setup"
          element={
            <PlaceholderRoute
              heading="Setup — Coming soon"
              body="This view lights up in Phase 2. The Setup Wizard will walk you through ZIP entry, frost-date confirmation, and your first plant picks."
            />
          }
        />
        <Route
          path="/tasks"
          element={
            <PlaceholderRoute
              heading="Tasks — Coming soon"
              body="This view lights up in Phase 3. Today's tasks, this week's tasks, and overdue tasks will live here, derived from your schedule."
            />
          }
        />
        <Route
          path="/settings"
          element={
            <PlaceholderRoute
              heading="Settings — Coming soon"
              body="This view lights up in Phase 2 (import/export) and Phase 4 (preferences). Nothing here yet."
            />
          }
        />
      </Routes>
    </AppShell>
  );
}
```

`<HashRouter>` is mounted in `main.tsx` (above). Routes nest inside it. `[VERIFIED: react-router 7 declarative pattern]`

### vite.config.ts — Vite 8 + React 19 + Tailwind 4 + Vitest 4

```typescript
// vite.config.ts
// Source: [VERIFIED: tailwindcss.com/docs/installation/using-vite]
//          [VERIFIED: vitejs.dev guide]
//          [VERIFIED: vitest config docs via Context7]
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node', // Phase 1 tests are pure-domain; no DOM needed
    include: ['tests/**/*.test.ts'],
    snapshotFormat: {
      printBasicPrototype: false, // default in Vitest 4 but explicit for clarity
    },
  },
});
```

`vitest.config.ts` is optional — embedding `test:` in `vite.config.ts` keeps the surface tiny. If snapshot inspection becomes painful, planner can split.

### src/index.css — Tailwind v4 with UI-SPEC tokens

```css
/* src/index.css */
/* Source: [VERIFIED: tailwindcss.com/docs/theme — v4 @theme block syntax] */
@import "tailwindcss";

@theme {
  /* Lifecycle palette — UI-SPEC §Color */
  --color-lifecycle-indoor-start: #3B82F6;     /* blue-500 */
  --color-lifecycle-harden-off: #EAB308;       /* yellow-500 */
  --color-lifecycle-transplant: #16A34A;       /* green-600 */
  --color-lifecycle-direct-sow: #0D9488;       /* teal-600 */
  --color-lifecycle-germination: #A3E635;      /* lime-400 */
  --color-lifecycle-harvest: #EA580C;          /* orange-600 */

  /* Gantt-specific spacing (UI-SPEC) */
  --spacing-gantt-row-height: 32px;
  --spacing-gantt-row-gap: 8px;
  --spacing-gantt-bar-height: 20px;
  --spacing-gantt-axis-height: 32px;
  --spacing-gantt-label-width: 140px;
}
```

The lifecycle palette tokens are also re-exported as a TypeScript constant in `features/gantt/lifecyclePalette.ts` so the bare-SVG renderer can fill `<rect fill={…}>` without DOM-querying CSS variables. Keeping both in sync is a Phase 1 task; UI-SPEC is the source of truth.

### tsconfig.json — strict for engine purity

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,

    "jsx": "react-jsx",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,

    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src", "tests"],
  "exclude": ["node_modules", "dist"]
}
```

`[CITED: typescriptlang.org/tsconfig]` for option semantics.

**Why these strict flags specifically:**
- `noUncheckedIndexedAccess: true` — `catalog.get(plantId)` returns `Plant | undefined`. The engine MUST handle the missing-plant case (emit a warning event per ARCHITECTURE.md §Schedule Engine step 1); strict typing makes this a compile error to ignore.
- `exactOptionalPropertyTypes: true` — `ScheduleEdit.endOverride?: string` cannot be assigned `undefined`; only omitted. Forces sparse-edits discipline (Pattern 3) to be precise.
- `strict: true` (umbrella) covers `strictNullChecks`, `strictFunctionTypes`, `strictPropertyInitialization`, etc. — engine functions must declare all input/output shapes explicitly.

### tests/domain/scheduler.snapshot.test.ts — the canonical Phase 1 test

```typescript
// tests/domain/scheduler.snapshot.test.ts
// Source: [VERIFIED: vitest snapshot docs via Context7 /vitest-dev/vitest]
import { describe, it, expect } from 'vitest';
import { generateSchedule } from '../../src/domain/scheduler';
import { sampleCatalog } from '../../src/assets/catalog';
import type { GardenPlan } from '../../src/domain/types';

const baseLocation = {
  zip: '20001',
  zone: '7a',
  lastFrostDate: '2026-04-15T12:00:00Z',
  firstFrostDate: '2026-10-20T12:00:00Z',
  source: 'manual' as const,
};

const planFor = (plantId: string): GardenPlan => ({
  schemaVersion: 1,
  id: 'snapshot-fixture',
  name: 'Snapshot test plan',
  createdAt: '2026-01-01T12:00:00Z',
  updatedAt: '2026-01-01T12:00:00Z',
  location: baseLocation,
  customPlants: [],
  plantings: [{ id: `p-${plantId}`, plantId, successionIndex: 0 }],
  customTasks: [],
  edits: [],
  settings: { units: 'imperial', weekStartsOn: 0, timezone: 'America/New_York' },
});

describe('schedule engine — canonical plants (SCH-08)', () => {
  it('tomato (frost-tender, indoor-start)', () => {
    expect(generateSchedule(planFor('tomato'), sampleCatalog)).toMatchSnapshot();
  });
  it('lettuce (cold-hardy, succession-friendly, leafy)', () => {
    expect(generateSchedule(planFor('lettuce'), sampleCatalog)).toMatchSnapshot();
  });
  it('broccoli (half-hardy, indoor-start, brassica)', () => {
    expect(generateSchedule(planFor('broccoli'), sampleCatalog)).toMatchSnapshot();
  });
  it('garlic (year-rollover, fall-planted, allium)', () => {
    // Override location to fall-planting season for garlic
    const fallPlan: GardenPlan = {
      ...planFor('garlic'),
      location: { ...baseLocation, firstFrostDate: '2026-10-20T12:00:00Z' },
    };
    expect(generateSchedule(fallPlan, sampleCatalog)).toMatchSnapshot();
  });
});

describe('schedule engine — DST-crossing fixture (SCH-08, D-17)', () => {
  it('does not shift dates around March 2026 spring-forward', () => {
    // Tomato indoor-start typically lands ~6 weeks before lastFrost.
    // For lastFrost = 2026-04-15, indoorStart = 2026-03-04 (before spring DST).
    // Verify the harden-off range that crosses DST (March 8 2026) yields exact day count.
    const plan: GardenPlan = {
      ...planFor('tomato'),
      location: { ...baseLocation, lastFrostDate: '2026-04-15T12:00:00Z' },
    };
    expect(generateSchedule(plan, sampleCatalog)).toMatchSnapshot();
  });
});

describe('schedule engine — leap-year fixture (SCH-08, D-17)', () => {
  it('handles Feb 29 2024 correctly', () => {
    const plan: GardenPlan = {
      ...planFor('lettuce'),
      location: { ...baseLocation, lastFrostDate: '2024-04-15T12:00:00Z' },
    };
    expect(generateSchedule(plan, sampleCatalog)).toMatchSnapshot();
  });
});

describe('schedule engine — year-rollover fixture (SCH-05, D-17)', () => {
  it('garlic planted Oct 2026 harvests in Jul 2027', () => {
    const plan: GardenPlan = {
      ...planFor('garlic'),
      location: { ...baseLocation, firstFrostDate: '2026-10-20T12:00:00Z' },
    };
    const events = generateSchedule(plan, sampleCatalog);
    const harvestStart = events.find(e => e.type === 'harvest-window' && e.plantingId === 'p-garlic');
    expect(harvestStart?.start.startsWith('2027')).toBe(true);
    expect(events).toMatchSnapshot();
  });
});
```

### tests/domain/constraints.test.ts — the canonical Phase 1 constraint test

```typescript
// tests/domain/constraints.test.ts
import { describe, it, expect } from 'vitest';
import { canMove } from '../../src/domain/constraints';
import { sampleCatalog } from '../../src/assets/catalog';

const plan = {
  /* … minimal plan with location.lastFrostDate = '2026-04-15T12:00:00Z' … */
} as any;

describe('noTransplantBeforeLastFrostForTender (SCH-04)', () => {
  it('clamps tender plant transplant to last frost when candidate is earlier', () => {
    const tomato = sampleCatalog.get('tomato')!;
    const event = { type: 'transplant', plantingId: 'p-tomato' /* … */ } as any;
    const result = canMove(event, '2026-04-01T12:00:00Z', plan, tomato);
    expect(result.ok).toBe(true);
    expect('clamped' in result && result.clamped).toBe(true);
    expect(result.finalDate).toBe('2026-04-15T12:00:00Z');
  });

  it('passes through hardy plant transplant before last frost', () => {
    const lettuce = sampleCatalog.get('lettuce')!;
    const event = { type: 'transplant', plantingId: 'p-lettuce' /* … */ } as any;
    const result = canMove(event, '2026-04-01T12:00:00Z', plan, lettuce);
    expect(result.ok).toBe(true);
    expect('clamped' in result).toBe(false);
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Webpack + Babel + create-react-app | Vite + esbuild + native ESM | CRA officially sunset 2023; Vite 5+ standard since 2024 | Vite 8 (2026-03) is the current stable; React 19 + Vite 8 + TS 6 is the 2026 baseline |
| Tailwind v3 (PostCSS plugin + tailwind.config.js) | Tailwind v4 (`@tailwindcss/vite` + `@theme` in CSS) | Tailwind 4 stable Q4 2024 | v4 has no JS config file; `@theme` in CSS is the canonical token-declaration site |
| Moment.js + manual UTC math | date-fns v4 + `@date-fns/utc` `UTCDate` | Moment deprecated 2020; date-fns v4 added timezone classes 2024-09 | `UTCDate` is 504B; Moment was 70KB. Tree-shakable; immutable; type-safe |
| Redux + Redux Toolkit | Zustand 5 (single-store, no Provider) | Zustand 5 stable 2024-11; community pivot 2023+ | Right-sized for single-store apps; built-in persist + devtools |
| BrowserRouter with `404.html` hack on GitHub Pages | HashRouter + (auto SPA fallback on Cloudflare Pages) | Always — hash routing has always been simpler for static hosts | Zero config; deep links survive refresh |
| Manual `JSON.parse` + `localStorage.setItem` with custom version field | Zustand `persist` with `version: 1` + `migrate(persistedState, version)` | Persist middleware has shipped this API since Zustand 4 | Migration loop is one method on the middleware, not a hand-rolled framework |
| Jest with ts-jest + babel-jest | Vitest 4 (Vite-native) | Vitest 1.0 stable 2023-12; Vitest 4 stable 2025 | Native ESM, faster cold start, identical snapshot format |
| Native `Temporal.PlainDate` (proposed) | date-fns v4 + UTC discipline | Temporal Stage 4 March 2026; Safari unflagged TBD | Polyfill is 20-60 KB; date-fns is 4 KB tree-shaken; revisit in v2 once Safari lands |

**Deprecated/outdated:**
- `subWeeks` from any library: ambiguous semantics; use `subDays(d, n*7)`.
- `new Date('YYYY-MM-DD')`: parses as UTC midnight; renders one day off in negative-UTC timezones. Use `parseDate()` wrapper.
- Tailwind 3 `tailwind.config.js`: not used in v4. Replaced by `@theme { … }` in CSS.
- `react-router-dom` (separate package): folded into `react-router` in v7.

## Assumptions Log

> All claims tagged `[ASSUMED]` in this research. Empty == nothing was assumed; all claims verified.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `migrate` function returning `state as PlanState` (with type assertion) is acceptable in TS-strict mode — the middleware's signature is `(persistedState: unknown, version: number) => unknown` and we cast at the boundary. | §Code Examples — `planStore.ts` | Low — TS will compile with `unknown` in/out; the cast makes the application code type-safe downstream. If Zustand's TS surface changes the recommendation in v6, planner adjusts. `[ASSUMED — based on Zustand 5 docs but exact strict-mode TS interaction not separately verified]` |
| A2 | `npm create vite@latest` with `--template react-ts` emits Vite 8 + React 19 + TS 6 as the default scaffold, not asking interactive questions. | §Standard Stack — Installation | Low — if the scaffold defaults to a newer template (e.g., a future v9 of `create-vite`), the React/TS versions still match locked stack; planner adds explicit `@^8` if drift observed. `[ASSUMED — npm view create-vite confirms 9.0.6 latest, but the scaffolded versions are what `create-vite` chooses, not separately probed]` |
| A3 | Tailwind v4 lifecycle palette tokens declared in `@theme` block CSS variables can be referenced from TypeScript via `getComputedStyle(document.documentElement).getPropertyValue('--color-lifecycle-indoor-start')`. | §Code Examples — index.css | Low — Phase 1 sidesteps this entirely by also declaring the palette as a TS constant in `features/gantt/lifecyclePalette.ts`. The risk is a sync drift between the two; CI lint can verify they match. `[ASSUMED — Tailwind v4 token surface is verified, but the dual-source-of-truth choice is a planner decision]` |

If any of A1–A3 turns out wrong at execution time, mitigation is a small code edit, not a rearchitecture.

## Open Questions

1. **Should `<HashRouter>` (declarative) or `createHashRouter` (data router) be used in Phase 1?**
   - What we know: both are stable in v7; declarative is simpler; data router has loaders/actions we don't need yet.
   - What's unclear: Phase 2's Setup Wizard might want a route loader for ZIP lookup. If yes, switching mid-stream is ~30 lines.
   - Recommendation: use **declarative `<HashRouter>` + `<Routes>`** in Phase 1 (smaller surface). When Phase 2 needs loaders, evaluate then. The change is local — only `App.tsx` and `main.tsx` move.

2. **Should the catalog be `assets/catalog.ts` (TS) or `assets/catalog.json` (JSON)?**
   - What we know: CONTEXT.md flags this as Claude's Discretion; engine consumes a `Map<string, Plant>` either way.
   - What's unclear: developer ergonomics. TS gives jump-to-definition + jsdoc; JSON gives a cleaner separation of data from code.
   - Recommendation: **TS** (`catalog.ts`), exporting `export const sampleCatalog = new Map<string, Plant>([['tomato', {...}], …])`. Easier to author types-correctly; trivial to migrate to JSON in Phase 2 if the catalog grows large enough that compile times complain.

3. **Should `samplePlan.ts` use ZIP 20001 (Washington DC, zone 7a, lastFrost ≈ Apr 15) or another ZIP?**
   - What we know: D-03 says "hardcoded sample plan, fresh from code on every boot." Any ZIP works.
   - What's unclear: which value the developer wants at the gantt time-axis. PROJECT.md doesn't specify.
   - Recommendation: **ZIP 20001 / zone 7a / lastFrost 2026-04-15 / firstFrost 2026-10-20**. This gives a balanced 8-month season, includes all four canonical plants comfortably, and the round numbers make snapshot test diffs easier to read.

4. **Plant id convention for the four Phase 1 catalog entries.**
   - What we know: ARCHITECTURE.md suggests `"tomato-cherokee-purple"` style for variety-level. CONTEXT.md flags as Claude's discretion.
   - What's unclear: do we want variety-level (`"tomato-cherokee-purple"`) or species-level (`"tomato"`) for Phase 1?
   - Recommendation: **species-level** (`"tomato"`, `"lettuce"`, `"broccoli"`, `"garlic"`) for Phase 1's catalog.ts. Phase 2 grows the catalog to ~30 entries and a variety-level convention emerges naturally; Phase 1's four fixtures are too few to justify the longer ids.

5. **Is the "today indicator" date computed at module-load time or render-time?**
   - What we know: UI-SPEC mandates a "Today" line on the gantt.
   - What's unclear: if the user keeps the tab open for 12 hours, does the line stay still or move?
   - Recommendation: **render-time** (`new Date()` called in `<GanttView>`'s render). It's a UI render concern, not a domain concern (engine never imports `Date.now()`). The single allowed `new Date()` outside `dateWrappers.ts` is here, in a UI component, with a comment marking it as a UI-only call. Document as a deliberate exception.

## Environment Availability

Phase 1 needs Node + npm to scaffold and test. No external services.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | Vite, Vitest, npm scripts | ✓ | v22.22.2 (verified `node --version`) | — |
| npm | Package install | ✓ | 10.9.7 (verified `npm --version`) | — |
| `npm registry` access | Initial `npm install` | ✓ (verified `npm view react version` returned 19.2.5) | — | — |
| `git` | Commit hooks (config sets `commit_docs: true`) | ✓ (project is configured for git) | — | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

Step 2.6 environment audit complete. Phase 1 has no external service dependencies (no DB, no API at runtime).

## Validation Architecture

> Note: `.planning/config.json` has `workflow.nyquist_validation: false`. The dedicated Validation Architecture section is therefore not strictly required by the schema. However, snapshot tests are central to phase success criterion #5 ("`npm test` passes"), so I include the test architecture below as part of the Code Examples + the Phase Requirements → Test Map. The planner should treat Vitest setup as a Wave 0 prerequisite regardless.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | `vite.config.ts` (test block — single config; planner can split to `vitest.config.ts` if preferred) |
| Quick run command | `npm test -- --run` (one-shot, no watch) |
| Full suite command | `npm test -- --run --coverage` (Phase 1 doesn't gate on coverage, but the command is wired) |
| Snapshot file location | Default: `tests/__snapshots__/<test-file>.snap` (Vitest co-locates snapshots in a sibling `__snapshots__` directory by default) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| SCH-01 | Engine emits indoor-start → harden-off → transplant → harvest sequence per indoor plant | snapshot | `npm test scheduler.snapshot` | `tests/domain/scheduler.snapshot.test.ts` |
| SCH-02 | Domain modules import zero React/Zustand/I/O | static (lint) | ESLint `import/no-restricted-paths` + `npm test` ensures domain tests run without DOM | `eslint.config.js` rule + the absence of failures in scheduler.test.ts |
| SCH-03 | Dates stored as UTC noon ISO; no `new Date()` outside wrapper | snapshot + grep | `npm test scheduler.snapshot` (output ISO strings) + `grep -rn "new Date(" src/ \| grep -v dateWrappers.ts` returns nothing | `tests/domain/scheduler.snapshot.test.ts` + CI grep step |
| SCH-04 | Tender plant transplant clamped to last frost | unit | `npm test constraints` | `tests/domain/constraints.test.ts` |
| SCH-05 | Garlic Oct 2026 → Jul 2027 round-trips correctly | snapshot | `npm test scheduler.rollover` | `tests/domain/scheduler.snapshot.test.ts` (rollover describe block) |
| SCH-07 | Engine emits 3 universal auto-task event types | snapshot | `npm test scheduler.snapshot` (snapshot includes task events) | `tests/domain/scheduler.snapshot.test.ts` |
| SCH-08 | Tomato/lettuce/broccoli/garlic + DST + leap-year + rollover all snapshot-stable | snapshot | `npm test scheduler.snapshot` (covers all 4 plants + 3 edge fixtures) | `tests/domain/scheduler.snapshot.test.ts` |
| DATA-01 | Plan persists to localStorage on change | unit (machinery only — Phase 1 has no setters) | `npm test stores` | `tests/stores/planStore.test.ts` (verifies `persist` middleware is wired with name `garden-gantt:plan` and version 1) |
| DATA-02 | `schemaVersion` field present; `migrate` callback shape correct | unit | `npm test stores` | `tests/stores/planStore.test.ts` (verifies `version: 1` and `migrate` is a function) |
| DATA-03 | Storage probe detects unavailable localStorage | unit | `npm test storage` | `tests/data/storage.test.ts` (mocks `setItem` to throw, asserts `probeStorage()` returns false) |
| DATA-06 | `storage` event listener registered at boot | unit | `npm test storage` | `tests/data/storage.test.ts` (verifies `withStorageDOMEvents` adds + removes the listener) |
| DATA-07 | Corrupt persisted state doesn't crash boot | unit | `npm test stores` | `tests/stores/planStore.test.ts` (pre-seeds malformed JSON, verifies app initial state) |
| DEPLOY-02 | Hash routes resolve on refresh | manual smoke + (deferred to Phase 4 deploy spike) | `npm run build && npm run preview` then visit `/#/setup` and refresh | manual (no automated test until Phase 4 ships CD) |

### Sampling Rate

- **Per task commit:** `npm test -- --run` (full Vitest suite, ~2-5 seconds for Phase 1's domain tests; runs all suites green before commit)
- **Per wave merge:** Same as above + ESLint `npm run lint` to enforce import-boundary rules + `tsc --noEmit` to ensure strict types pass
- **Phase gate:** All snapshots committed and green; `npm run build` produces a working `dist/`; manual smoke of `npm run preview` then visiting `/#/plan` shows the gantt for the hardcoded sample plan; visiting `/#/setup` shows the placeholder; refreshing each route produces correct content.

### Wave 0 Gaps

None of these files exist yet (greenfield phase); all are Phase 1 deliverables:

- [ ] `package.json` + `package-lock.json` — `npm install` after scaffold
- [ ] `vite.config.ts` — Tailwind plugin + Vitest test block
- [ ] `tsconfig.json` + `tsconfig.node.json` — strict config
- [ ] `tests/domain/scheduler.snapshot.test.ts` — covers SCH-01, SCH-03, SCH-05, SCH-07, SCH-08
- [ ] `tests/domain/constraints.test.ts` — covers SCH-04
- [ ] `tests/data/storage.test.ts` — covers DATA-03, DATA-06
- [ ] `tests/stores/planStore.test.ts` — covers DATA-01, DATA-02, DATA-07
- [ ] `tests/__snapshots__/scheduler.snapshot.test.ts.snap` — auto-generated by first `npm test --run`; checked into git
- [ ] ESLint config (`eslint.config.js`) with `no-restricted-syntax` for `new Date()` outside `dateWrappers.ts` and `import/no-restricted-paths` for the engine purity invariant

**Framework install:** Vitest is installed alongside Vite in the locked stack; no separate framework decision. Confirmed peer-dep compatible: `vitest@4.1.5` peers `vite: ^6 || ^7 || ^8` and we're on Vite 8.

## Sources

### Primary (HIGH confidence)
- **npm registry** — live queries on 2026-04-26 via `npm view <package> version` and `npm view <package> peerDependencies` for: react@19.2.5, react-dom@19.2.5, vite@8.0.10, @vitejs/plugin-react@6.0.1, typescript@6.0.3, zustand@5.0.12, date-fns@4.1.5, @date-fns/utc@2.1.1, react-router@7.14.2, tailwindcss@4.2.4, @tailwindcss/vite@4.2.4, lucide-react@1.11.0, vitest@4.1.5, @types/react@19.2.14, @types/react-dom@19.2.3.
- **Zustand official docs (via Context7 `/pmndrs/zustand`)** — fetched 2026-04-26. Topics: persist middleware, version + migrate callback, `createJSONStorage`, `withStorageDOMEvents` multi-tab pattern, `skipHydration` + manual `rehydrate()`. Verbatim code in §Code Examples.
- **React Router official docs (via Context7 `/remix-run/react-router`)** — fetched 2026-04-26. Topics: `createHashRouter` API, declarative `<HashRouter>`, `RouterProvider`, SPA mode config.
- **Vitest official docs (via Context7 `/vitest-dev/vitest`)** — fetched 2026-04-26. Topics: `toMatchSnapshot`, `snapshotFormat` config, `resolveSnapshotPath`, `expect.addSnapshotSerializer`, defineConfig pattern.
- **date-fns docs (via Context7 `/date-fns/date-fns`)** — fetched 2026-04-26. Topics: `addDays`, `subDays`, `add`, `format`, `parse`, `parseISO`.
- **@date-fns/utc README (raw GitHub)** — fetched 2026-04-26 via `curl raw.githubusercontent.com/date-fns/utc/main/README.md`. Topics: `UTCDate` vs `UTCDateMini`, DST-safe arithmetic, `utc()` context function for date-fns v4 contextual operations.
- **Tailwind CSS official docs** — `tailwindcss.com/docs/installation/using-vite`, `tailwindcss.com/docs/theme`. Fetched 2026-04-26. Topics: `@tailwindcss/vite` plugin, `@import "tailwindcss"`, `@theme { … }` block syntax with custom palette + spacing.
- **TypeScript official docs** — `typescriptlang.org/tsconfig`. Fetched 2026-04-26. Topics: strict flag families, recommended Vite + React 19 config.
- **MDN Storage.setItem** — `developer.mozilla.org/en-US/docs/Web/API/Storage/setItem`. Fetched 2026-04-26. Topics: `QuotaExceededError`, iOS Safari Private Browsing behavior.
- **Cloudflare Pages docs** — `developers.cloudflare.com/pages/configuration/serving-pages/`, `developers.cloudflare.com/pages/configuration/redirects/`. Fetched 2026-04-26. Topics: SPA fallback (no `404.html` → auto-routes to `/`), `_redirects` file syntax (`/* /index.html 200`).
- **Vite official guide** — `vite.dev/guide/`. Fetched 2026-04-26. Topics: `npm create vite@latest` scaffold, `--template react-ts` flag, post-scaffold steps.

### Secondary (MEDIUM confidence)
- **`.planning/research/STACK.md`, ARCHITECTURE.md, PITFALLS.md, SUMMARY.md, FEATURES.md** — Project-internal locked research, treated as authoritative for project decisions (palette tokens, architecture patterns, pitfall list).
- **`.planning/research/ARCHITECTURE.md` linked sources** — SVAR React Gantt, Frappe Gantt, DHTMLX/Bryntum gantt blogs, etc. — verified at the project-research level but not re-fetched here since Phase 1 doesn't pull in any gantt library (D-07).

### Tertiary (LOW confidence)
- None — every claim that informs a Phase 1 deliverable is verified against an authoritative source above.

## Project Constraints (from CLAUDE.md)

Extracted from `./CLAUDE.md` and `~/.claude/CLAUDE.md` (developer profile + project instructions). The planner must verify compliance.

**From project CLAUDE.md (Garden Gantt):**
- Single-user; no backend with user data; no auth; everything in browser localStorage.
- Tech stack open during research, locked at: React 19 + Vite 7+ + TS 6 + Zustand v5 + date-fns v4 + Tailwind v4 + Vitest 4 + React Router 7 + Cloudflare Pages.
- Polish target: share-worthy v1 — UI/UX must be tight enough the user would recommend it.
- Hosting: static-site (Cloudflare Pages primary).
- **Don't recommend or use:** dhtmlx-gantt commercial, Bryntum, gantt-schedule-timeline-calendar, Moment.js, Redux/RTK, Next.js/Remix, Create React App, Material UI, live OpenFarm API, phzmapi.org runtime, Permapeople as primary plant data, localForage/IndexedDB.
- **Conventions:** none yet established (greenfield).
- **Architecture:** none mapped yet (Phase 1 establishes it via ARCHITECTURE.md).
- **GSD Workflow Enforcement:** all Edit/Write tool use must go through GSD commands; no direct repo edits outside GSD workflow.

**From global ~/.claude/CLAUDE.md (developer profile):**
- Communication: terse, direct, action-oriented, minimal preamble.
- Decisions: fast, intuitive — recommend a path and proceed.
- Explanations: code-only; minimize prose; only explain non-obvious things.
- Debugging: fix-first — investigate and fix, don't ask clarifying questions until necessary.
- UX: pragmatic — match references when provided; functional focus elsewhere.
- Vendor choices: pragmatic-fast — make recommendations directly, no comparison tables for low-stakes picks.
- Frustrations: regression-averse — verify changes don't break related systems; never modify out-of-scope files; be explicit about persistence/config handling.
- Learning: guided — Claude investigates unfamiliar code and reports findings.

**Implication for the planner:** the plan should be terse, action-oriented, sequence well-ordered, with code patterns exact (not "consider X"). Verifications should explicitly cover regression — every Phase 1 task that adds machinery (storage probe, persist middleware, hash router, snapshot tests) must have a verification step asserting the boot path still works.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version verified against npm registry today; peer deps cross-verified; STACK.md alignment checked. Caveat: Vite 8 vs STACK.md "Vite 7+" (resolved: STACK.md's wording covers v8 since "+" is open-ended; I documented this explicitly so the planner doesn't get confused).
- Architecture patterns: HIGH — patterns are verbatim from ARCHITECTURE.md, which was research-locked at project init. Code examples for `withStorageDOMEvents`, `persist + migrate`, and `parseDate` are taken verbatim from official Zustand and `@date-fns/utc` docs.
- Pitfalls: HIGH — sourced from PITFALLS.md (project research) and verified against MDN for the `QuotaExceededError` claim.
- Validation strategy: HIGH — Vitest snapshot patterns verified via Context7; the test fixtures cover every Phase 1 success criterion enumerated in ROADMAP.md.

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (~30 days, given the locked stack is on stable major versions; minor patch releases may shift but won't invalidate the architecture)

---
*Phase 1 research for: Garden Gantt — Foundation & Schedule Engine*
*Researched: 2026-04-26*
