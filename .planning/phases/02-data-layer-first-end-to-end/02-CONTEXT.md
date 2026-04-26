# Phase 2: Data Layer & First End-to-End - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

The first end-to-end demo milestone. Real users hit the app, enter a ZIP, pick plants from a curated catalog (~50 entries), optionally enrich with Permapeople, toggle succession, see their actual lifecycle gantt, and export/import the plan as versioned JSON. Phase 1 shipped the engine + persistence machinery; Phase 2 turns it on with real user input.

**In scope:**
- Setup Wizard (3-step: ZIP → plants → review)
- ZIP → zone + frost dates (build-time bundled JSON; manual override; unrecognized-ZIP fallback)
- Curated catalog (50 plants, variety-level, hand-authored TS const)
- Catalog browser (search + filter chips + card grid with "Added" state)
- Custom plant authoring (CRUD; first-class with curated)
- Permapeople API enrichment (opt-in, optional, CC BY-SA attribution; Wave 1 CORS spike)
- Succession planting (engine support + UI toggle; auto-rows in gantt capped at first-fall-frost)
- Gantt rendering: horizontal bars, lifecycle-phase color coding, season-spanning axis (still bare SVG — Phase 3 picks the library)
- JSON export/import (versioned, Zod-validated, preview-on-import)
- Schema migration v1 → v2 (Phase 1's empty schema → Phase 2's plan-with-data schema)

**Out of scope:**
- Drag interactions on the gantt (Phase 3 — GANTT-04..10)
- Calendar view (Phase 3)
- Tasks dashboard / checkable tasks (Phase 3)
- Final gantt library decision (Phase 3 spike: SVAR vs custom)
- CAT-V2 features (bulk Permapeople import beyond per-plant, per-planting overrides, etc.)
- PWA / offline sync (Phase 4 if validated)

</domain>

<decisions>
## Implementation Decisions

### Setup Wizard flow
- **D-01:** 3-step wizard. Step 1: ZIP entry → derived zone/frost dates with override path. Step 2: catalog browser, pick plants. Step 3: review derived gantt + finish. Back/Next buttons.
- **D-02:** `/setup` route is always-available (not first-run only). Behavior: opens to Step 1 if `plan === null`, jumps to Step 2 if plan exists (lets users add plants without re-entering ZIP). Header nav link to `/setup` is always visible.
- **D-03:** First-run experience includes a "Try with sample plan" link on Step 1. Clicking it loads the Phase 1 sample plan (4 plants, ZIP 20001) as the user's editable plan and routes to `/plan`. The sample becomes their plan once they tweak anything — no separate "demo mode" state. Removes the empty-state friction for kicking the tires.

### ZIP / frost data (LOC-01..05)
- **D-04:** Zone + frost data is build-time bundled per CONTEXT-Phase-1's STACK.md decision — `scripts/build-zone-data.ts` consumes `waldoj/frostline` (zones) + NOAA GHCN (50%-probability frost dates) and emits `public/data/zones.{firstChar}.json` (split by first ZIP digit, ~30 KB per chunk, lazy-loaded on demand).
- **D-05:** Manual override path (LOC-03): every auto-derived value (zone, last spring frost, first fall frost) has an "Override" link next to it that flips the value to a controllable input. Overrides persist to `plan.location` and are flagged so the user knows their gantt isn't using the default.
- **D-06:** Unrecognized-ZIP fallback (LOC-04): if `zones.{first}.json` doesn't contain the entered ZIP, surface a clear error ("ZIP not recognized — enter your zone and frost dates manually") and pivot the form to manual zone+frost entry. Do not block the wizard.

### Catalog source & format (CAT-01, CAT-02)
- **D-07:** Curated catalog grows from 4 (Phase 1) to 50 plants. Hand-authored, variety-level entries (e.g., "Tomato — Cherokee Purple", "Lettuce — Black Seeded Simpson", "Broccoli — Calabrese", etc). Timing data sourced from seed-packet conventions and generally accepted gardening references (Old Farmer's Almanac, university extension publications). No external runtime API dependency.
- **D-08:** Catalog file format: TypeScript const (`src/assets/catalog.ts`). Extends Phase 1's existing 4-plant array. Type-checked at compile time — missing required fields are build errors, not runtime bugs. Variety naming convention: `"{Common name} — {Variety}"` for variety-level; `"{Common name}"` for species-level when no specific variety is canonical.
- **D-09:** Each catalog plant carries the full timing field set from CAT-02: `weeksIndoorsBeforeLastFrost`, `transplantOffsetDaysAfterLastFrost`, `daysToGerminate`, `daysToMaturity`, `successionIntervalDays` (optional, only on succession-friendly crops), `frostTolerance: 'tender' | 'half-hardy' | 'hardy'`, `season: 'cool' | 'warm'`. Phase 1's existing fields (`frostTender`, `requiresHardening`, `hasFlowering`) are preserved as derived/equivalent.

### Plant picker UX (CAT-03)
- **D-10:** Search bar + filter chips + card grid layout. Search bar is full-width at top of `/setup` Step 2 / `/catalog` route. Below: filter chips (cool-season, warm-season, leafy, fruiting, root, herb, allium, brassica). Below chips: responsive card grid. Each card shows plant name, frost-tolerance badge, season badge, days-to-maturity, and an "Add" button.
- **D-11:** "Added" affordance: clicking Add flips the card to a green-checked "Added" state (the card stays in place — does NOT disappear from the grid). A floating counter pill ("5 plants added") sits in the header (top-right of AppShell), visible from any route. Clicking the pill opens a "My Plan" panel (slide-out or modal — planner picks) listing added plantings with remove + edit affordances.
- **D-12:** Custom plants live alongside curated in the same grid, marked with a "Custom" badge. Same Add/Added state machinery. Search and filter chips include custom plants.

### Custom plant authoring (CAT-04, CAT-05)
- **D-13:** Custom plant authoring lives in a modal opened from the catalog grid via a "+ Add custom plant" card pinned to the top-left of the grid. Modal form has all CAT-02 timing fields with helper text + reasonable defaults.
- **D-14:** Modal supports "Duplicate from catalog" — a dropdown at the top lets the user start with any catalog plant's timing as the baseline, then tweak. Saves typing.
- **D-15:** Custom plant edit/delete: each "Custom"-badged card in the grid has an "Edit" button → reopens modal pre-filled. Delete only allowed if the plant is not currently in the user's plan; if it is, surface a confirmation explaining downstream impact (plantings using it will be removed).

### Permapeople integration (CAT-06..08)
- **D-16:** **Wave 1 CORS spike (30-min timebox)** before catalog work begins. Spike: `data/permapeople.ts` issues one fetch to `permapeople.org/api/plants?q=tomato` from a Cloudflare Pages preview deployment. Result documented in `.planning/phases/02-data-layer-first-end-to-end/02-CORS-SPIKE.md`. Drives the rest of CAT-06's implementation.
- **D-17:** Permapeople fallback if CORS is blocked: ship a tiny stateless **Cloudflare Worker proxy** (~20 lines). Worker holds the Permapeople API key as an env var (key stays server-side, never reaches browser). Worker adds `Access-Control-Allow-Origin: *` to responses. Free tier covers thousands of requests. This is technically a backend but stateless and trivial — does NOT violate the "no user-data backend" constraint (no user data crosses the Worker, only generic plant lookups).
- **D-18:** Permapeople fetch is **opt-in per plant** (CAT-06) — never blocks scheduling. UI: in the custom plant edit modal, an "Enrich from Permapeople" button. Clicking it shows a loading spinner, then either populates the plant's description/image/family/genus fields with editable Permapeople data, or surfaces a clear error ("Permapeople is unreachable — try again later") that does NOT block save.
- **D-19:** CC BY-SA 4.0 attribution (CAT-08): a small footer line ("Some plant data enriched from Permapeople.org (CC BY-SA 4.0)") on routes that display Permapeople-sourced fields. Per-card indicator (an icon next to the plant name) on cards whose description came from Permapeople.

### Succession (SCH-06, GANTT-01)
- **D-20:** Engine extension: `generateSchedule` accepts plantings with `succession: true`. For such plantings, it expands into N derived plantings spaced by `successionIntervalDays`, capped at the latest direct-sow / indoor-start that can still complete `daysToMaturity` before `firstFallFrostDate`. Each derived planting gets a unique `plantingId` (`${baseId}-succession-${idx}`).
- **D-21:** Succession UI: toggle on the planting card in the "My Plan" panel. Default off. Toggling on requires a `successionIntervalDays` value on the catalog plant — the toggle is hidden / disabled for plants without it.
- **D-22:** Succession in the gantt: each succession planting gets its own row (per ROADMAP success criterion #3). Rows are visually grouped (small left-edge accent indicating "succession of X") but each renders as a normal lifecycle bar.

### Gantt rendering (GANTT-01..03)
- **D-23:** Phase 2 gantt is **still hand-rolled bare SVG** — extends the Phase 1 `GanttView` component. No SVAR React Gantt, no Frappe Gantt, no `@dnd-kit`. The Phase 3 kickoff spike is still the explicit decision point for the gantt library (per Phase 1 D-07).
- **D-24:** Time axis spans the user's gardening season: from `min(indoor-start across plantings)` rounded down to month start, to `max(harvest-window.end across plantings)` rounded up to month end. Includes a month-tick layer (12pt labels) and weekly subticks (subtle).
- **D-25:** Color coding (GANTT-02): per-phase fills from `lifecyclePalette` (Phase 1 UI-SPEC tokens). Phase boundaries within a bar are visible as adjacent rects with a 1px gap (or a hairline divider — planner picks).
- **D-26:** Read-only in Phase 2 — no drag bindings (Phase 3 territory). But `data-event-id`, `data-event-type`, `data-planting-id` attrs ship now (already in Phase 1) so Phase 3 has handles ready.

### Export/Import (DATA-04, DATA-05)
- **D-27:** Export: single "Export plan" button in /settings. Triggers a download of `garden-gantt-plan-{YYYY-MM-DD}.json` containing the full `GardenPlan` + custom plants + schemaVersion + a top-level `app: 'garden-gantt', version: '0.2'` metadata block.
- **D-28:** Import: single "Import plan" button in /settings, opens a file picker. On file select, parse + Zod-validate against the current schema. Show a preview modal: "Importing N plantings, M custom plants, location {ZIP}. This will OVERWRITE your current plan." Confirm button = full overwrite (no merge — too complex for v1). Cancel button = dismiss.
- **D-29:** Schema migration: bump `schemaVersion` to 2 in `usePlanStore`'s persist config. Add the first migration in the `migrate(state, fromVersion)` callback: `1 → 2` adds `plan.plantings`, `plan.customPlants`, `plan.location` to a previously-null plan. Imports of v1 JSON files trigger the same migration.

### Claude's Discretion (unselected gray areas)
- "My Plan" panel implementation: slide-out side drawer vs modal — planner picks based on screen real estate.
- Worker proxy URL convention: e.g. `https://garden-gantt-cors-proxy.{user}.workers.dev` — to be set in env config; planner can choose how to wire it.
- Catalog plant icons: Lucide icons by category (leaf, carrot, broccoli, garlic, etc.) — planner picks specific glyphs.
- Tailwind v4 token additions (Phase 2 may need new spacing/color tokens for the catalog grid, the wizard layout, the modal — extend `src/index.css @theme` as needed without breaking Phase 1 tokens).
- ESLint allowance: any new `new Date()` site needed beyond `dateWrappers.ts` and `src/features/gantt/**` should be discussed and added to the allowlist with a comment explaining why.
- Wizard step state management: local React state per step OR a Zustand sub-store — planner picks; does NOT persist across reloads (each visit to /setup starts at the appropriate step based on plan presence).
- Filter chip behavior: AND vs OR for multi-chip selection — planner picks; default to "OR within category, AND across categories" if not obvious.

</decisions>

<specifics>
## Specific Ideas

- **Phase 1 sample plan as bootstrap:** The hardcoded `samplePlan` (`src/samplePlan.ts`) becomes the "Try with sample plan" payload. This means Phase 2 can keep `samplePlan.ts` as both a dev fixture for snapshot tests AND a runtime asset for the bootstrap path. No duplication.
- **Variety naming:** `"Tomato — Cherokee Purple"` (em-dash, not hyphen). Search must be case-insensitive and tolerate either.
- **Plant id format:** Phase 1 used species-level ids (`"tomato"`). Phase 2 needs to expand to variety-level. New format: kebab-case `{species}-{variety}` (e.g., `"tomato-cherokee-purple"`). Phase 1's 4 plants migrate during D-29's `1 → 2` migration if they appear in a user's imported plan.
- **CORS spike output format:** `02-CORS-SPIKE.md` should record (a) endpoint hit, (b) response status, (c) `Access-Control-Allow-Origin` header value (or absence), (d) decision: "browser-direct OK" or "Worker proxy required".
- **Worker proxy** (if D-17 path): a single `cors-proxy/index.ts` Worker file in a sibling repo dir, deployed via `wrangler` separately from the main app. Includes one endpoint for plant search and one for plant detail. Source-attributes back to Permapeople in response.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Core value, constraints, key decisions.
- `.planning/REQUIREMENTS.md` — Phase 2 requirement IDs: LOC-01..05, CAT-01..08, SCH-06, GANTT-01..03, DATA-04, DATA-05.
- `.planning/ROADMAP.md` §Phase 2 — Phase goal, depends on Phase 1, 5 success criteria.

### Phase 1 outputs (must respect)
- `.planning/phases/01-foundation-schedule-engine/01-CONTEXT.md` — D-01..D-17 from Phase 1 (engine, persistence, hash router, no-SVAR-yet).
- `.planning/phases/01-foundation-schedule-engine/01-RESEARCH.md` — Locked stack, code patterns, pitfalls.
- `.planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md` — Locked palette/typography/spacing tokens; banner copy; placeholder route copy patterns.
- `.planning/phases/01-foundation-schedule-engine/01-VERIFICATION.md` — What Phase 1 actually shipped (engine API, persistence boundary, file inventory).

### Stack & architecture (locked)
- `.planning/research/STACK.md` — React 19 + Vite + TS 6 + Zustand v5 + date-fns v4 + Tailwind v4 + Vitest 4 + React Router 7 + Cloudflare Pages.
- `.planning/research/ARCHITECTURE.md` — Pure-function domain core; planStore/catalogStore/uiStore split; one-write-boundary rule for I/O; `data/permapeople.ts` is the ONLY module that calls `fetch` to Permapeople (or its proxy).
- `.planning/research/SUMMARY.md` — Resolved conflicts (curated catalog primary; Permapeople enrichment-only).

### Pitfalls to actively prevent in Phase 2
- `.planning/research/PITFALLS.md` §3 (localStorage data loss — covered by Phase 1's persistence; verify export/import round-trip), §4 (schema migrations — D-29's 1→2 migration), §10 (CORS — Wave 1 spike), §11 (rate limiting — Permapeople has no documented rate limits, throttle defensively), §12 (CC BY-SA attribution — D-19), §17 (succession vs DTM — D-20 cap), §20 (export versioning — D-27/D-28), §21 (corrupt JSON — Zod validation in D-28).

### Build-time data sources (LOC-02)
- `waldoj/frostline` (GitHub) — ZIP → USDA Hardiness Zone mapping.
- NOAA NCEI GHCN frost statistics — ZIP → 50%-probability last spring + first fall frost.
- Build script location: `scripts/build-zone-data.ts` — consumes both, emits `public/data/zones.{firstChar}.json`.

### External APIs / docs
- Permapeople API: `https://permapeople.org/api` (header auth: `x-permapeople-key-id` + `x-permapeople-key-secret`). License: CC BY-SA 4.0.
- Cloudflare Workers docs: `https://developers.cloudflare.com/workers/` — for the proxy (if D-17 path triggers).

</canonical_refs>

<code_context>
## Existing Code Insights

**Foundation shipped in Phase 1.** All Phase 2 work builds on top of:

### Reusable Assets
- `src/domain/scheduler.ts` — `generateSchedule(plan, catalog) → ScheduleEvent[]`. Phase 2 EXTENDS this for succession (D-20).
- `src/domain/dateWrappers.ts` — UTC-noon date primitive. Single allowed `new Date(string)` site. ALL date math in Phase 2 must use this.
- `src/domain/types.ts` — Plant, GardenPlan, ScheduleEvent, EventType, Task, ScheduleEdit. Phase 2 extends with new fields (succession, location override flags).
- `src/domain/constraints.ts` — Constraint registry pattern. Phase 2 may add more rules (e.g., succession cutoff guard).
- `src/data/storage.ts` — Sole I/O boundary for localStorage. Phase 2 adds `data/permapeople.ts` as the second I/O boundary (only `fetch` site).
- `src/stores/planStore.ts` — Zustand persist machinery, version=1 currently. Phase 2 bumps to version=2 with migration.
- `src/stores/uiStore.ts` — In-memory UI state. Phase 2 may add `myPlanPanelOpen` and similar transient flags.
- `src/app/AppShell.tsx` — Header + nav. Phase 2 adds the floating "X plants added" counter pill.
- `src/app/PlaceholderRoute.tsx` — Phase 1's empty placeholder. Phase 2 replaces 3 of 4 routes (`/setup`, `/tasks` stays placeholder for Phase 3, `/settings` gets export/import).
- `src/features/gantt/GanttView.tsx` — Bare SVG render. Phase 2 extends with succession rows + season-spanning axis; still bare SVG.
- `src/features/gantt/timeScale.ts` — Locked API. Phase 2 just consumes.
- `src/assets/catalog.ts` — Phase 1's 4-plant array. Phase 2 extends to ~50.
- `src/samplePlan.ts` — Phase 1's hardcoded sample. Phase 2 reuses as the "Try with sample plan" payload (D-03).
- `tests/__snapshots__/scheduler.snapshot.test.ts.snap` — Locked engine output for 4 plants × DST/leap/rollover. Phase 2 ADDS succession + new-plant snapshots without removing existing ones.

### Established Patterns
- Pure domain core + imperative shell (ARCHITECTURE.md §System Overview).
- Sparse edits over materialized state (`ScheduleEdit[]` persisted; `ScheduleEvent[]` re-derived).
- Constraint registry (functions registered to a list, aggregated by `canMove`).
- Feature-sliced UI structure (`features/setup`, `features/catalog`, `features/gantt`, etc).
- One-write-boundary rule for I/O.
- ESLint `no-restricted-syntax` blocks raw `new Date()` outside `dateWrappers.ts` and `features/gantt/**`.
- Tailwind v4 `@theme` tokens in `src/index.css` (no `tailwind.config.*` files).
- All commits go through `gsd-sdk query commit` for atomic-commit consistency.

### New Modules Phase 2 Adds
- `src/features/setup/` — Wizard steps, ZIP form, plant picker, "My Plan" panel, succession toggle.
- `src/features/catalog/` — Card grid, search bar, filter chips, custom plant modal.
- `src/data/permapeople.ts` — Sole `fetch` site for Permapeople API (or its Worker proxy).
- `src/data/zones.ts` — Build-time-emitted JSON loader; client-side ZIP → zone+frost lookup.
- `scripts/build-zone-data.ts` — Build-time data preparation.
- `src/stores/catalogStore.ts` — Zustand store for catalog (curated array + custom plants persisted).
- `src/features/settings/` — Export/import buttons + import preview modal.
- `cors-proxy/` (sibling, conditional on D-17) — Cloudflare Worker for Permapeople CORS fallback.

### Integration Points
- `usePlanStore` becomes the source of plan state instead of `samplePlan` constant. Setup wizard writes here.
- `useCatalogStore` is new — holds curated array (loaded fresh from `catalog.ts` on every boot, like sample plan in Phase 1) + custom plants (persisted via Zustand `persist`).
- `<GanttView>` reads from `usePlanStore.plan` instead of importing `samplePlan` directly. Phase 2 success criterion #1 demands this — engine takes the user's actual plan.
- The 4 hash routes from Phase 1 fill in: `/setup` → wizard, `/plan` → gantt (now from real plan), `/tasks` → still placeholder ("Coming in Phase 3"), `/settings` → export/import.

</code_context>

<deferred>
## Deferred Ideas

- **Drag interactions on the gantt** (GANTT-04..10) — Phase 3.
- **Calendar view** — Phase 3.
- **Tasks dashboard / checkable tasks** (TASK-01..05) — Phase 3.
- **Final gantt library decision** (SVAR vs custom) — Phase 3 kickoff spike per ROADMAP §Research Spikes.
- **CAT-V2-01 Permapeople bulk import** (beyond per-plant enrichment) — V2 milestone.
- **CAT-V2-02 Per-planting DTM overrides** — V2 milestone.
- **CAT-V2-03 Per-planting frost-tolerance overrides** — V2 milestone.
- **PWA / offline-first** — Phase 4 if validated.
- **Encrypted GitHub Gist sync** as a backup option — V2 if multi-device demand emerges.
- **Multi-bed / 2D layout** — explicitly out of scope per PROJECT.md.
- **Companion planting** — explicitly out of scope per PROJECT.md.
- **Mobile-native** — explicitly out of scope; mobile-responsive web is fine for v1.

</deferred>

---

*Phase: 02-data-layer-first-end-to-end*
*Context gathered: 2026-04-26*
