# Project Research Summary

**Project:** Garden Gantt
**Domain:** Single-user, browser-only, interactive garden-planning SPA (gantt + calendar)
**Researched:** 2026-04-26
**Confidence:** HIGH

## Executive Summary

Garden Gantt is a timing-first garden planner: ZIP in, interactive lifecycle gantt out. The closest competitor is Seedtime, which is calendar-first and charges for advanced features. No existing tool does a true drag-adjustable gantt with constraint-aware cascade — that gap is the product's entire value proposition. The recommended approach is a pure-function domain core (schedule engine, constraint registry, task emitter) wrapped in a React 19 + Zustand SPA, with SVAR React Gantt for the gantt view and FullCalendar for the calendar toggle. All plant, zone, and frost data ships statically; no required backend.

The central architectural discipline is treating the schedule engine as a pure compiler: `(plan, catalog) → ScheduleEvent[]`. Drag interactions write sparse `ScheduleEdit` deltas to Zustand (persisted via localStorage), and the engine recomputes deterministically. This design makes the gantt trustworthy, unit-testable in isolation, and cheap to recompute on every drag tick. Permapeople is enrichment-only and never touches the engine, protecting correctness from API drift or outage.

The top risks are: (1) timezone/DST bugs in frost-date math invalidating the schedule for real users; (2) SVAR React Gantt being younger and less community-tested than alternatives — if it stalls, Frappe Gantt is a documented fallback; (3) the Permapeople CORS situation is unverified and must be confirmed early; and (4) undo/redo on drag is non-negotiable — without it users won't trust the gantt enough to recommend it.

---

## Key Findings

### Recommended Stack

React 19 + Vite 7 + TypeScript 6 is the clear framework choice given the gantt/calendar library ecosystem. SVAR React Gantt (`@svar-ui/react-gantt` v2.6, MIT since v2.4) is the primary gantt component — drag-to-adjust, dependency cascade, and configurable time scales are all in the free community edition. Frappe Gantt v1.0.3 is the documented fallback if SVAR maintenance stalls (see open question below). FullCalendar 6.1 handles the calendar toggle at zero cost for the plugin set needed. Zustand v5 with `persist` middleware is the state layer: ~1KB, built-in localStorage wiring, and reactive subscriptions that match the cascade pattern precisely. Tailwind v4 + shadcn/ui closes the gap between "functional" and "share-worthy" UI without a design budget.

**Core technologies:**

| Technology | Purpose | Why |
|---|---|---|
| React 19 + Vite 7 + TS 6 | Framework + build | Best gantt/calendar ecosystem; fastest HMR for iterating drag interactions |
| SVAR React Gantt 2.6 | Gantt view | MIT, drag+cascade OOTB, React-native TypeScript types |
| FullCalendar 6.1 | Calendar toggle | Mature, free for needed plugins, "looks like a calendar" out of the box |
| Zustand 5 + `persist` | State + localStorage | Built-in persistence, reactive derived selectors, no boilerplate |
| date-fns v4 + @date-fns/utc | Date arithmetic | Tree-shakable, UTC-clean, no DST surprises for frost-date math |
| Tailwind v4 + shadcn/ui | Styling | Sub-100ms rebuilds; shadcn pre-built components hit share-worthy polish fast |
| Static zones.json (frostline + NOAA) | ZIP → frost dates | No runtime dependency; offline-capable; ship once, lazy-load |
| Vitest 4 + Playwright 1.59 | Testing | Vite-native; browser mode covers drag; Playwright for pointer-event E2E |
| Cloudflare Pages | Hosting | Unlimited bandwidth free tier; SPA fallback in one line |

**Resolved conflict — date library:** PITFALLS recommended `Temporal.PlainDate`; STACK chose `date-fns v4 + @date-fns/utc`. **STACK wins.** Temporal is Safari-flagged as of April 2026; polyfills add 20-60KB to a static SPA; date-fns v4 is 13-17KB tree-shaken and has a clean UTC story for "store dates as UTC noon, render in local." Migrate to native Temporal in a v2 milestone once Safari ships unflagged. The critical discipline (store all dates as UTC noon `2026-05-15T12:00:00Z`, never local timestamps) is the same regardless of library.

### Expected Features

The feature landscape is well-researched with 20+ live apps surveyed. The entire competitor category is bed-layout-first; Garden Gantt's timeline-first stance with drag-to-adjust cascade is genuinely unoccupied territory.

**Must have (table stakes) — without these users abandon:**
- ZIP → frost dates → USDA zone (static JSON lookup, no runtime API)
- Per-plant lifecycle gantt: indoor start → harden off → transplant → harvest
- Curated plant catalog (~50 entries), search/filter from day one
- Custom plant entry (first-class, same scheduling math)
- Drag-to-adjust with constraint enforcement and downstream cascade
- Calendar view (month + week), toggleable with gantt
- Succession planting as first-class rows with interval picker
- Auto-derived garden tasks + custom tasks, checkable
- "Today / This Week" dashboard
- localStorage persistence — silent, automatic
- JSON export/import — visible, round-trippable
- Mobile-responsive (calendar/list on mobile; gantt readable)
- Polish: no drag jank, real empty/error states, accessibility basics

**Should have (differentiators):**
- Constraint-aware cascade with visual drag preview (ghost bars for affected events)
- Undo/redo (non-negotiable for drag trust)
- Phase-segment color coding on gantt bars
- "Why this date?" tooltip showing the scheduling formula
- First-run onboarding wizard (ZIP → starter plants → see gantt)
- Print stylesheet / one-page season summary (P2)
- Frost-date confidence band preference (10%/50%/90% risk)
- Permapeople enrichment on custom plant flow (P2, post-CORS verification)

**Defer to v2+:**
- Internationalization beyond US ZIPs
- Multiple plans per browser
- PWA / offline service worker
- Multi-bed timing-only segmentation
- Public share links (requires backend)
- Web push notifications

**Anti-features (explicitly out):** 2D bed layout, companion planting, multi-user accounts, live weather API, plant identification, native apps, AI chatbot, photo journaling.

### Architecture Approach

The architecture follows a pure domain core + imperative shell pattern. `src/domain/` contains pure TypeScript functions (`scheduler`, `succession`, `taskEmitter`, `constraints`) with zero imports from React, Zustand, or any I/O. State is split into three Zustand stores: `planStore` (persisted — location, plantings, custom plants, tasks, sparse `ScheduleEdit` deltas), `catalogStore` (in-memory — curated + custom + Permapeople cache), and `uiStore` (in-memory — drag preview, zoom, selection). `ScheduleEvent[]` is never persisted; it recomputes from inputs on every load in <5ms.

**Major components:**

| Component | Responsibility |
|---|---|
| `domain/scheduler.ts` | Pure fn: `(plan, catalog) → ScheduleEvent[]`; the product's correctness claim lives here |
| `domain/constraints.ts` | Constraint registry: per-rule functions aggregated by `canMove()`; powers drag validation and "explain this date" UI |
| `domain/taskEmitter.ts` | Pure fn: `(events, customTasks) → Task[]` |
| `features/gantt/` | SVG gantt render + pointer-event drag hook; reads `derivedSchedule`, writes `ScheduleEdit` to `planStore` |
| `features/calendar/` | CSS-grid month/week view; same `ScheduleEvent[]` source as gantt |
| `features/tasks/` | Today/This Week/Overdue dashboard; derived task view |
| `stores/planStore.ts` | Zustand + persist; schema-versioned; migration callbacks from day 1 |
| `data/zoneLookup.ts` | ZIP → zone/frost from bundled `zones.json` (frostline + NOAA derived at build time) |

Hash routing (`#/setup`, `#/plan`, `#/tasks`, `#/settings`) is recommended over BrowserRouter — works on every static host without server rewrites, zero 404-on-refresh risk.

**Persistence decision (documented):** PITFALLS recommended IndexedDB. ARCHITECTURE chose Zustand+persist (localStorage) because a realistic 30-plant plan with edits fits well under 50KB, and the 5MB localStorage quota is generous for this use case. **This is the correct choice for v1.** Revisit trigger: if users approach the 5MB limit (detectable at write time via a quota check), migrate `data/storage.ts` to an IndexedDB adapter — the rest of the architecture is unchanged because `data/storage.ts` is the only I/O boundary.

### Critical Pitfalls

1. **Zone ≠ frost dates** — USDA hardiness zone describes average winter minimum temperature, not spring/fall frost timing. Two ZIPs in zone 8b can differ by 4+ weeks. Store `lastFrostDate`, `firstFrostDate`, and `zone` as independent fields from independent data sources. Never derive frost dates from zone.

2. **Timezone/DST drift in date arithmetic** — `new Date('2026-04-15')` is parsed as UTC midnight; users west of UTC see "April 14." Fix: store all dates as UTC noon (`2026-05-15T12:00:00Z`); use date-fns `subDays`; ban raw `new Date(string)` outside one wrapper module. Test with DST-crossing and leap-year fixtures.

3. **Schema migrations missing from day 1** — Every persisted blob needs `schemaVersion` from the first commit. Build a `migrations[]` array of pure functions before any data is persisted. Without this, every future schema change is a user-data disaster.

4. **Cascade drag with no preview and no undo** — Moving one bar and watching three others jump is the #1 trust-destroyer. Required before shipping: ghost bars for affected events during drag, Cmd-Z undo (≥20 levels), per-event lock toggle, constraint violation shows why with snap-to-constraint + override.

5. **Permapeople CORS unverified** — Verify in Phase 2 before building any feature on top of it. If blocked, a Cloudflare Worker proxy is ~30 min to ship. App must work fully without Permapeople regardless.

**Additional pitfalls to track:** iOS Safari Private Browsing (localStorage quota = 0; detect at boot), multi-tab race conditions (listen for `storage` event), corrupt JSON import (Zod-validate before applying), variety-specific DTM (catalog must be variety-level, not species-level), harden-off events in schedule engine, year-rollover for fall crops (garlic Oct → July next year).

---

## Implications for Roadmap

PROJECT.md sets granularity = "coarse" (3-5 phases). FEATURES suggested 5-6, ARCHITECTURE suggested 4, PITFALLS suggested 6. **Recommend 4 phases** that align with ARCHITECTURE's coarse cut. PITFALLS's polish/deploy sub-phases collapse into Phase 4's tail. Every P1 feature from FEATURES.md maps cleanly across these 4 phases without loss.

### Phase 1: Foundation + Schedule Engine

**Rationale:** The schedule engine is the product. Everything else is UI around it. Phase 1 builds the testable, correct domain core before any UI commitment. Locking the date primitive, schema versioning, and persistence layer here prevents the most expensive rewrites (pitfalls 2, 3, 4, 6, 7, 9, 18-21).

**Delivers:** Correct, snapshot-tested schedule engine; read-only static gantt rendering for hardcoded sample plan; full type system (`GardenPlan`, `Plant`, `ScheduleEvent`, `Task`); hash-router shell; Zustand + persist with schema versioning and migration stub; storage availability detection (iOS Private mode).

**Features addressed:** Per-plant lifecycle math (engine), persistence foundation, type-safe date arithmetic.

**Pitfalls addressed:** Timezone/DST bugs (date primitive locked with UTC-noon discipline), schema migration (versioning from commit 1), iOS Safari Private mode (boot check), corrupt import (Zod validation wired), multi-tab races (storage event listener).

**Exit criteria:** `npm test` passes with DST + leap-year + year-rollover fixtures; visiting `/plan` shows a static gantt for a hardcoded plan; changing `lastFrostDate` in code moves all bars correctly.

**Research flag:** Standard patterns — no additional research needed.

---

### Phase 2: Data Layer + Catalog + Real Plan

**Rationale:** With a correct engine, Phase 2 makes it real: ZIP → actual frost dates → user's actual plants → gantt that survives reload. This is the end-to-end demo milestone. Frost-date data sourcing and catalog data model must both be locked before Phase 3 drag work begins (drag depends on constraint rules, which depend on per-plant frost tolerance fields in the catalog).

**Delivers:** ZIP → zone/frost lookup (bundled static JSON from frostline + NOAA); Setup Wizard with manual override; planStore wired to real data; curated catalog (~30 plants, variety-level with frost tolerance + DTM); CatalogBrowser with search/filter; custom plant editor; gantt connected to live planStore; localStorage persistence with export/import; empty state UX; Permapeople CORS verification spike.

**Features addressed:** ZIP → frost-date lookup, curated plant catalog, custom plant entry, gantt timeline view (live data), localStorage persistence, JSON export/import, catalog search/filter, succession planting (engine expansion), harden-off events (engine event types).

**Pitfalls addressed:** Zone ≠ frost date (independent data sources), frost-tolerance per plant (catalog schema), variety-specific DTM (catalog entries are variety-level), harden-off events (engine emits them), year-rollover for fall crops (garlic fixture), microclimate caveat + manual override, Permapeople CORS (verify and decide proxy or drop), Permapeople attribution.

**Exit criteria:** Open browser, enter ZIP, add 5 plants, reload → same gantt. Permapeople CORS verified or proxy decision documented.

**Research flag:** Targeted 30-minute spike on Permapeople CORS (browser `fetch()` from deployed origin). Determines whether integration is a day of work or needs a Worker proxy — either way, Phase 3 can proceed without uncertainty.

---

### Phase 3: Drag + Interactions + Tasks

**Rationale:** Phase 3 is where the product becomes the product. Drag-to-adjust with constraint-aware cascade is the differentiator. Calendar view and task dashboard share the same `ScheduleEvent[]` model and belong in the same phase. All drag UX pitfalls (no preview, no undo, resize/move ambiguity) are addressed here.

**Delivers:** Drag-to-adjust with constraint enforcement and downstream cascade; ghost-bar preview during drag; undo/redo (Cmd-Z, ≥20 levels); per-event lock toggle; constraint-violation feedback (snap + tooltip "Can't transplant tender plant before May 15"); Calendar view (month + week toggle); Task dashboard (Today/This Week/Overdue, auto-derived + custom, checkable); custom task CRUD; succession planting rows on gantt.

**Features addressed:** Drag-to-adjust with constraints, cascade reflow, calendar view (toggleable), succession planting (gantt display), auto-derived garden tasks, custom tasks, "Today / This Week" dashboard.

**Pitfalls addressed:** Cascade drag surprises (ghost preview + undo + lock), resize vs move ambiguity (cursor zones), snap-to-day default, touch drag vs page scroll (long-press threshold + handles), perf with 200 events (memoization + virtualization if measured).

**Exit criteria:** Drag a tomato transplant bar → harvest moves with it → transplant clamps at last frost with visible reason. Undo reverses it. Calendar shows same data as gantt. Today's tasks accurate.

**Open question surfaced to Phase 3 kickoff:** STACK recommends SVAR React Gantt's built-in drag/cascade. ARCHITECTURE flagged that custom SVG drag may integrate more cleanly with `domain/constraints.ts` (no impedance mismatch between SVAR's internal scheduling model and Garden Gantt's pure-function constraint registry). **Recommendation: start with SVAR; run a 1-2 hour constraint-hook spike at Phase 3 kickoff. If SVAR's constraint API accommodates `domain/constraints.ts` cleanly, stay with SVAR. If not, switch to `@dnd-kit` + custom SVG pointer events — that path is documented and Frappe Gantt remains a valid render-layer fallback.**

**Research flag:** Phase 3 kickoff spike on SVAR constraint hook API (1-2 hours).

---

### Phase 4: Polish, Enrichment + Ship

**Rationale:** The gap between "technically works" and "I'd recommend this to my gardening friend." Permapeople enrichment (if CORS resolved), schema migrations fully wired, mobile layout, print stylesheet, onboarding wizard, empty/error/loading states, accessibility audit, and CI/CD deploy. This is the "share-worthy v1" bar.

**Delivers:** Live Cloudflare Pages deploy with CI/CD (GitHub Actions → Pages); Permapeople lazy enrichment if CORS resolved; curated catalog grown to 50-100 plants; JSON import schema validation (Zod) with preview-before-overwrite; schema migration framework for all future changes; mobile-responsive layout (calendar default on narrow viewports; gantt landscape-only with prompt); print stylesheet (`@media print`); onboarding wizard (ZIP → starter pack → see gantt); empty/error/loading states everywhere; accessibility (keyboard nav for drag, ARIA labels, WCAG AA contrast); "last saved" timestamp; export-prompt UX; performance verified at 200 events.

**Features addressed:** Share-worthy polish, mobile-responsive layout, fully-validated JSON export/import, onboarding, print view (P2), "Why this date?" tooltips (P2), all polish checklist items.

**Pitfalls addressed:** Hostile empty state (onboarding wizard), mobile gantt unusable (calendar fallback), print broken (media print), accessibility (keyboard drag + ARIA), perf at 200+ events (row virtualization if needed), stale CDN cache (hashed assets + uncached index.html), no drag affordance (hover cursor + first-run tip).

**Exit criteria:** Live deploy. Shown to 2-3 gardeners; "I'd recommend it" signal reached.

**Research flag:** Standard patterns — no research needed. Cloudflare Pages CI/CD is well-documented.

---

### Phase Ordering Rationale

- **Engine before UI:** The schedule engine is pure functions with no React dependency. Building it first means every subsequent phase builds on verified-correct math. Bugs are caught in unit tests, not the gantt render.
- **Data layer before drag:** Frost-tolerance fields, variety-specific DTM, and harden-off event types in the catalog schema must be locked before Phase 3's constraint rules reference them.
- **Drag before polish:** Drag is the highest-risk, most novel engineering in the project. Polish on a gantt without confirmed drag mechanics is waste.
- **Permapeople verified in Phase 2:** The CORS question is a hard blocker for any Permapeople feature work. A 30-minute spike in Phase 2 removes the uncertainty from Phases 3 and 4.

---

### Research Flags

**Needs targeted research/spike:**
- **Phase 2:** Permapeople CORS verification (browser `fetch()` from deployed origin). 30-minute task; determines integration path or removes the feature.
- **Phase 3 kickoff:** SVAR React Gantt constraint hook API vs custom SVG drag (1-2 hours). Determines the drag implementation approach.

**Standard patterns (skip research):**
- **Phase 1:** Pure TS domain core + Zustand + Vitest — well-documented.
- **Phase 2:** Static ZIP/frost JSON bundling — frostline + NOAA are well-understood data sources.
- **Phase 4:** Cloudflare Pages CI/CD, print stylesheets, Tailwind responsive — all standard.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | npm versions verified live 2026-04-26; SVAR MIT confirmed at v2.4; Frappe v1.0.3 move_dependencies confirmed |
| Features | HIGH | 20+ apps surveyed with direct review; user complaint patterns consistent across sources |
| Architecture | HIGH | Pure-function + Zustand + SPA patterns battle-tested for this app shape; data model derived from requirements |
| Pitfalls | HIGH | Date/timezone and localStorage pitfalls confirmed by official sources (MDN, TC39, TrackJS); garden-domain pitfalls cross-referenced with extension services and seed company docs |

**Overall confidence: HIGH**

### Conflicts Resolved

| Conflict | Resolution |
|---|---|
| PITFALLS (Temporal API) vs STACK (date-fns v4) | **STACK wins.** Temporal is Safari-flagged; polyfills are 20-60KB; date-fns v4 is the correct boring choice for v1. Migrate in v2 after Safari ships unflagged. |
| PITFALLS (IndexedDB) vs ARCHITECTURE (localStorage) | **ARCHITECTURE wins for v1.** Data fits comfortably under 5MB. Revisit trigger: users approach quota. `data/storage.ts` is the only boundary to swap; architecture is unchanged. |
| FEATURES (5-6 phases) vs ARCHITECTURE (4) vs PITFALLS (6) vs PROJECT.md (3-5 coarse) | **4 phases recommended.** Matches ARCHITECTURE's coarse cut and PROJECT.md granularity setting. All P1 features map cleanly. PITFALLS's polish/deploy sub-phases are Phase 4's tail work. |

### Open Question (Phase 3)

**SVAR built-in drag vs custom SVG + @dnd-kit:**
- STACK: Use SVAR OOTB for speed.
- ARCHITECTURE: Custom SVG gives cleaner integration with `domain/constraints.ts`; no impedance mismatch with SVAR's PRO auto-schedule model.
- Decision deferred to Phase 3 kickoff spike. Start with SVAR; measure constraint integration friction; switch to custom if friction is real. Frappe Gantt remains a valid render-layer fallback either way.

### Gaps to Address

- **Permapeople response shape:** Verify with a live call in Phase 2 before writing `data/permapeople.ts`. ARCHITECTURE flags MEDIUM confidence on exact API response structure.
- **frostline ZIP coverage:** Exact coverage percentage unknown until the build script runs. Build-time ZCTA-3 nearest-neighbor fallback is the mitigation.
- **SVAR community activity:** 13 commits visible at research time. Frappe Gantt fallback is documented and compatible.
- **Variety catalog authoring effort:** Committing to variety-level entries (confirmed necessary for schedule correctness) means more data entry for 50-100 entries. Factor into Phase 2 scope.

---

## Sources

### Primary (HIGH confidence)
- npm registry (live 2026-04-26) — all version pins verified
- [SVAR React Gantt repo](https://github.com/svar-widgets/react-gantt) — MIT license, drag/dependencies confirmed
- [Frappe Gantt repo](https://github.com/frappe/gantt) — MIT, v1.0.3 move_dependencies confirmed
- [Permapeople API docs](https://permapeople.org/knowledgebase/api-docs/) — CC BY-SA 4.0, header auth, no timing data, manual key approval, CORS unverified
- [date-fns v4 timezone announcement](https://blog.date-fns.org/v40-with-time-zone-support/) — UTC story confirmed
- [TC39 Temporal proposal](https://github.com/tc39/proposal-temporal) — Stage 4 March 2026, Safari flagged
- [USDA Plant Hardiness Zone Map](https://planthardiness.ars.usda.gov/) — zone = winter minimum temp, not frost timing
- [waldoj/frostline](https://github.com/waldoj/frostline) — MIT, PRISM-derived ZIP→zone data
- [NOAA NCEI frost statistics](https://www.ncei.noaa.gov/products/coordinates/frost-freeze) — frost date source
- [Zustand persist docs](https://zustand-demo.pmnd.rs/) — persist middleware API
- [MDN Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — localStorage limits
- [TrackJS: iOS Safari Private + localStorage](https://trackjs.com/javascript-errors/failed-to-execute-setitem-on-storage/) — quota=0 in Private mode confirmed
- [Johnny's Seeds succession planting](https://www.johnnyseeds.com/growers-library/methods-tools-supplies/succession-planting/) — succession interval vs DTM distinction
- [Penn State Extension: hardening off](https://extension.psu.edu/hardening-transplants) — harden-off as required step

### Secondary (MEDIUM confidence)
- [Seedtime](https://seedtime.us/) — closest competitor; timeline-first; pricing confirmed
- [GrowVeg](https://www.growveg.com/) — bed-layout-first; reschedule fragility per reviews
- Competitor app reviews (Trustpilot, App Store) — user complaint patterns across 20+ apps
- [PkgPulse: Temporal vs date-fns 2026](https://www.pkgpulse.com/blog/date-fns-v4-vs-temporal-api-vs-dayjs-date-handling-2026)
- [DanubeData: Cloudflare Pages vs Netlify vs Vercel 2026](https://danubedata.ro/blog/cloudflare-pages-vs-netlify-vs-vercel-static-hosting-2026)
- [Wyse Guide: hardiness zone vs frost date](https://www.wyseguide.com/hardiness-zone-vs-frost-date/)
- [Johnny's Seeds onion daylength map](https://www.johnnyseeds.com/growers-library/vegetables/onions/onion-bulbing-daylength-latitude-map.html) — photoperiod/latitude

---
*Research completed: 2026-04-26*
*Ready for roadmap: yes*
