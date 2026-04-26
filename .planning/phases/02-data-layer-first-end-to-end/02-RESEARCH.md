# Phase 2: Data Layer & First End-to-End — Research

**Researched:** 2026-04-26
**Domain:** Build-time ZIP→zone+frost data pipeline; curated 50-plant catalog; Permapeople API integration with CORS-resistant fallback; succession-planting engine extension; bare-SVG gantt season-axis extension; Zod-validated JSON export/import + schemaVersion v1→v2 migration; 3-step Setup Wizard.
**Confidence:** HIGH (most patterns are extensions of Phase 1's locked invariants — engine purity, UTC-noon dates, Zustand persist machinery, one-write-boundary I/O — and the project CLAUDE.md prescribes the exact stack)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Setup Wizard flow**
- **D-01:** 3-step wizard. Step 1: ZIP entry → derived zone/frost dates with override path. Step 2: catalog browser, pick plants. Step 3: review derived gantt + finish. Back/Next buttons.
- **D-02:** `/setup` route is always-available (not first-run only). Behavior: opens to Step 1 if `plan === null`, jumps to Step 2 if plan exists. Header nav link to `/setup` is always visible.
- **D-03:** First-run experience includes a "Try with sample plan" link on Step 1. Clicking it loads the Phase 1 sample plan (4 plants, ZIP 20001) as the user's editable plan and routes to `/plan`.

**ZIP / frost data (LOC-01..05)**
- **D-04:** Build-time bundled — `scripts/build-zone-data.ts` consumes `waldoj/frostline` (zones) + NOAA GHCN (50%-probability frost dates) and emits `public/data/zones.{firstChar}.json` (split by first ZIP digit, ~30 KB per chunk, lazy-loaded on demand).
- **D-05:** Manual override path: every auto-derived value has an "Override" link; overrides persist to `plan.location` and are flagged.
- **D-06:** Unrecognized-ZIP fallback: clear error + pivot to manual zone+frost entry. Do not block the wizard.

**Catalog source & format (CAT-01, CAT-02)**
- **D-07:** Curated catalog grows from 4 to 50 plants. Hand-authored, variety-level. Sources: seed-packet conventions, Old Farmer's Almanac, university extensions.
- **D-08:** Catalog file format: TypeScript const (`src/assets/catalog.ts`). Variety naming: `"{Common name} — {Variety}"` em-dash.
- **D-09:** Each plant carries full timing field set: `weeksIndoorsBeforeLastFrost`, `transplantOffsetDaysAfterLastFrost`, `daysToGerminate`, `daysToMaturity`, `successionIntervalDays` (optional), `frostTolerance`, `season`. Phase 1's existing fields preserved.

**Plant picker UX (CAT-03)**
- **D-10:** Search bar + filter chips + card grid layout.
- **D-11:** "Added" affordance flips card to green-checked state in place. Floating counter pill in header. Pill opens "My Plan" panel.
- **D-12:** Custom plants live alongside curated in same grid with "Custom" badge.

**Custom plant authoring (CAT-04, CAT-05)**
- **D-13:** Modal opened from "+ Add custom plant" pinned card.
- **D-14:** "Duplicate from catalog" dropdown to pre-fill timing.
- **D-15:** Edit/Delete affordances; delete confirms downstream impact.

**Permapeople integration (CAT-06..08)**
- **D-16:** **Wave 1 CORS spike (30-min timebox)** before catalog work — record at `02-CORS-SPIKE.md`.
- **D-17:** Fallback if blocked: stateless **Cloudflare Worker proxy** (~20 lines) with API key in env var, ACAO header on response. Free tier covers usage. Stateless ⇒ does NOT violate "no backend with user data" constraint.
- **D-18:** Permapeople opt-in per plant. Failures surface error but never block save.
- **D-19:** CC BY-SA 4.0 attribution: footer line + per-card icon when description came from Permapeople.

**Succession (SCH-06, GANTT-01)**
- **D-20:** Engine extension: `generateSchedule` accepts plantings with `succession: true`. Expands into N derived plantings spaced by `successionIntervalDays`, capped so harvest completes before `firstFrostDate`. Each derived planting gets `${baseId}-succession-${idx}`.
- **D-21:** Succession UI: toggle on planting card in My Plan panel. Default off. Hidden for plants without `successionIntervalDays`.
- **D-22:** Succession in gantt: each derived planting gets its own row, visually grouped with 4px stone-400 left-edge accent.

**Gantt rendering (GANTT-01..03)**
- **D-23:** Phase 2 gantt is **still hand-rolled bare SVG** — extends Phase 1 `GanttView`. No SVAR, no Frappe, no `@dnd-kit`.
- **D-24:** Time axis spans `min(indoor-start)` rounded to month start → `max(harvest-window.end)` rounded to month end.
- **D-25:** Color coding: per-phase fills from `lifecyclePalette`. Adjacent rects with 1px gap.
- **D-26:** Read-only in Phase 2 — no drag bindings. `data-event-id`, `data-event-type`, `data-planting-id` attrs already shipped.

**Export/Import (DATA-04, DATA-05)**
- **D-27:** Single "Export plan" button in /settings → downloads `garden-gantt-plan-{YYYY-MM-DD}.json` containing full GardenPlan + custom plants + schemaVersion + `app: 'garden-gantt', version: '0.2'` envelope.
- **D-28:** Single "Import plan" button → file picker → Zod-validate → preview modal → full overwrite (no merge).
- **D-29:** Schema migration: bump `schemaVersion` to 2 in `usePlanStore`'s persist config. Migration `1 → 2` adds `plan.plantings`, `plan.customPlants`, `plan.location` to a previously-null plan. Imports of v1 JSON files trigger same migration.

### Claude's Discretion (planner picks)

- "My Plan" panel: slide-out drawer vs modal. UI-SPEC §5 already picks **slide-out side drawer from the right**.
- Worker proxy URL convention.
- Catalog plant icons (Lucide glyphs by category). UI-SPEC §4 already maps these.
- Tailwind v4 token additions.
- ESLint allowance for new `new Date()` sites — discuss before adding.
- Wizard step state management: local React state vs Zustand sub-store.
- Filter chip behavior: AND vs OR — UI-SPEC §3 picks **OR within group, AND across groups**.

### Deferred Ideas (OUT OF SCOPE)

- Drag interactions on gantt (Phase 3, GANTT-04..10)
- Calendar view (Phase 3)
- Tasks dashboard / checkable tasks (Phase 3, TASK-01..06)
- Final gantt library decision (Phase 3 spike)
- CAT-V2 features (bulk Permapeople import, per-planting overrides)
- PWA / offline sync (Phase 4 if validated)
- GitHub Gist sync, multi-bed, companion planting, mobile-native

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LOC-01 | ZIP → zone + frost dates derivation | §Build-Time Zone+Frost Data Pipeline; §Code Pattern A: zones.ts client loader |
| LOC-02 | Build-time bundled, no runtime API dep | §Build-Time Pipeline § Output strategy + LICENSE notes |
| LOC-03 | Manual override per derived field | §Setup Wizard Step 1 — Override Path |
| LOC-04 | Unrecognized-ZIP graceful fallback | §Wizard Step 1 — Lookup status union; UI-SPEC §2 not-found block |
| LOC-05 | Wizard walks ZIP → plants → gantt | §Setup Wizard Architecture |
| CAT-01 | ~50-plant curated catalog | §50-Plant Catalog — recommended set + sourcing |
| CAT-02 | Per-plant timing field set | §Catalog data shape — TS const literal type |
| CAT-03 | Search + filter | §catalogStore selectors; UI-SPEC §3 |
| CAT-04 | Custom plant CRUD, first-class | §catalogStore — customPlants array; §CustomPlantModal flow |
| CAT-05 | Edit/delete custom plants | §Custom plant delete with downstream-impact guard |
| CAT-06 | Permapeople opt-in enrichment | §Permapeople integration — fetch protocol; §Code Pattern D |
| CAT-07 | Graceful degradation | §Permapeople — failure handling matrix |
| CAT-08 | CC BY-SA attribution | §Permapeople — attribution; §Pitfall 28 |
| SCH-06 | Succession engine support | §Succession Engine Extension — `expandSuccessions()` pre-pass |
| GANTT-01 | Horizontal bars, one row per planting (succession own rows) | §Gantt Extension — succession rows |
| GANTT-02 | Lifecycle-phase color coding | Phase 1's `lifecyclePalette` already covers; UI-SPEC §8 |
| GANTT-03 | Time axis spans gardening season | §Gantt Extension — season-spanning axis |
| DATA-04 | Export plan to JSON | §Export/Import — Zod schemas + Blob download |
| DATA-05 | Import + Zod-validate + preview | §Export/Import — Import flow + preview modal |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

The project CLAUDE.md prescribes the entire Phase 2 stack — research must NOT propose alternatives. Constraints relevant to Phase 2:

- **Stack additions allowed:** Zod (v4), Radix UI primitives, `clsx + tailwind-merge` (helper), MSW for tests, optional `@vitest/browser + Playwright` for component tests, `tsx` for build script.
- **Banned dependencies:** `@svar-ui`, `frappe-gantt`, `redux`, `moment`, `material-ui`, `dhtmlx-gantt`, Bryntum, `gantt-schedule-timeline-calendar`, Create React App, `localForage`, live phzmapi.org runtime calls, live OpenFarm API, Permapeople as primary plant data source.
- **Workflow:** All commits go through `gsd-sdk query commit`. ESLint `no-restricted-syntax` blocks raw `new Date()` outside `dateWrappers.ts` and `features/gantt/**` — adding new sites requires an explicit allowlist update. Tailwind v4 `@theme` tokens in `src/index.css`; no `tailwind.config.*` files.
- **Polish target:** Share-worthy. UI/UX must match UI-SPEC palette/typography/spacing/copy verbatim.
- **Single-user constraint:** No accounts, no user-data backend. The CONTEXT D-17 Cloudflare Worker is **stateless** — no user data crosses it; only generic Permapeople plant lookups proxy through. This is explicitly within constraint per D-17.
- **localStorage budget:** ≤5MB per origin. Plan + catalog cache + Permapeople cache must stay within.

---

## Summary

Phase 2 is the first end-to-end demo: real users hit the app, enter a ZIP, pick from a 50-plant catalog, optionally enrich via Permapeople, see a real gantt, and export/import. Phase 1 shipped the engine + persistence machinery as `null`-plan-tolerant scaffolding; Phase 2 turns it on with real user input.

**Key research findings:**

1. **Permapeople CORS is almost certainly blocked.** Probe of `OPTIONS /api/search` from a Cloudflare-Pages-like origin returned **HTTP 404** (no CORS preflight handler at all). Plan should treat the Worker proxy (D-17) as the **likely path**, not the fallback. The 30-min spike (D-16) is still mandatory to record evidence in `02-CORS-SPIKE.md`, but the planner should pre-budget the Worker work.

2. **`waldoj/frostline` provides zones only — frost dates need NOAA separately.** The frostline-derived `phzmapi.org/{zip}.json` returns just `{zone, temperature_range, coordinates}`. Frost dates are NOT in that endpoint. The `scripts/build-zone-data.ts` script must fetch both: frostline (zone) + NOAA NCEI 1991–2020 Annual/Seasonal Climate Normals (frost probabilities) + a station→ZIP mapping (PRISM-derived lat/lon from frostline already gives ZIP coords; nearest-station algorithm joins them). Build complexity is non-trivial.

3. **Zone data subset for v1 is recommended.** Bundling all ~42K US ZIPs at zone + 2 frost dates is ~3MB JSON / ~500KB gzipped split into 10 chunks. Acceptable, but a v1-pragmatic alternative: ship a **subset** (top ~10K populated ZIPs) and rely on D-06's "ZIP not recognized → manual entry" path for the rest. Full coverage in a later phase.

4. **Succession engine extension is a pre-pass, not a structural rewrite.** Add `expandSuccessions(plan, catalog) → Plan` that returns a new plan with derived plantings inlined, then call existing `generateSchedule()` unchanged. Pure function; no engine-internals refactor needed. Identity preservation: original planting keeps `successionIndex: 0`; derived get `successionIndex: 1..N` and id `${baseId}-s${i}` per ARCHITECTURE.md §Succession.

5. **Schema migration v1→v2 has zero real users to migrate.** Phase 1 shipped with `plan: null` and no setters that mutate plan. Real persisted plans only start existing in Phase 2. The `migrate(state, 1)` callback for v1→v2 effectively just no-ops (or asserts the v1 plan was null) — the harder migration concern is **import-time**: a JSON file exported by Phase 2 has `schemaVersion: 2` already; v1 JSON exports never existed in the wild. The migration function exists for the framework's sake (DATA-02) but won't actually move data.

6. **Bare SVG comfortably handles 50 plants × succession.** A worst-case plan (50 plants × 4 successions × 4–6 lifecycle bars) ≈ 800–1200 SVG `<rect>` nodes. Phase 1 already renders 16 bars from 4 plants without virtualization. No perf intervention needed in Phase 2; performance work belongs in Phase 4 if real plans hit pain.

**Primary recommendation:** Treat the Permapeople integration as **proxy-by-default**: implement the Worker, point `data/permapeople.ts` at it, and use the spike to confirm/deny rather than to choose between paths. This avoids a wave-0 spike outcome blocking wave-1 work.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| ZIP → zone+frost lookup | CDN / Static (`public/data/zones.{n}.json`) | Browser (lazy fetch + in-memory cache via `data/zones.ts`) | Build-time bundled per CONTEXT D-04. No runtime backend. |
| Curated catalog | Browser (TS const in `src/assets/catalog.ts`) | — | Hand-authored at build; tree-shaken into JS bundle. |
| Custom plants CRUD | Browser (Zustand `catalogStore` with `persist`) | — | Single-user, no sync. |
| Permapeople enrichment | API / Backend (Cloudflare Worker proxy if needed) | Browser (`data/permapeople.ts` is sole fetch site) | Stateless proxy holds API key; user data never crosses. |
| Schedule computation | Browser (pure `domain/scheduler.ts`) | — | SCH-02 invariant: pure functions, zero I/O. |
| Plan persistence | Browser (`localStorage` via `data/storage.ts` boundary) | — | DATA-01..03 already shipped Phase 1. |
| Gantt rendering | Browser (bare SVG in `features/gantt/GanttView.tsx`) | — | D-23: hand-rolled, throwaway-quality, no library yet. |
| Export/Import | Browser (Blob + FileReader; `features/settings/`) | — | Pure browser APIs, no backend. |
| Schema migration v1→v2 | Browser (Zustand `migrate` callback in `planStore.ts`) | — | DATA-02 framework ships in Phase 1; Phase 2 adds the first real migration. |

**Phase 2 introduces ONE new I/O boundary:** `src/data/permapeople.ts` (sole `fetch` site for Permapeople API or its Worker proxy). `src/data/zones.ts` is also new but loads same-origin static assets (`fetch('/data/zones.X.json')`); architecturally part of the static-bundle tier.

---

## Standard Stack

### Core (Phase 2 additions to Phase 1's locked stack)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | `^4.3.6` (latest) | Runtime schema validation for Plant/Plan/Export envelope; import validation | TypeScript-first, .safeParse returns discriminated union, 6.5x faster than v3 [VERIFIED: npm view zod, dist-tags.latest=4.3.6 as of 2026-04-26] |
| `@radix-ui/react-dialog` | `^2.1.16` | Custom plant modal, import preview, delete confirmations, My Plan drawer | Headless, a11y built-in (focus trap, esc-to-close, modal semantics) [VERIFIED: npm view] |
| `@radix-ui/react-dropdown-menu` | `^2.2.6` | Custom card "..." menu (Edit/Delete) | Same family, keyboard nav built-in [VERIFIED: npm view] |
| `@radix-ui/react-select` | `^2.2.6` | Form selects in custom plant modal (frost-tolerance, season, category, start-method, duplicate-from-catalog) | Native-feel select with full a11y [VERIFIED: npm view, family version] |
| `@radix-ui/react-checkbox` | `^1.3.3` | Filter chips render as `role="checkbox"` per UI-SPEC | Matches a11y spec [VERIFIED: npm view] |
| `@radix-ui/react-switch` | `^1.2.6` | Succession toggle in My Plan panel | Better UX than checkbox for on/off | [VERIFIED: npm view] |
| `@radix-ui/react-label` | `^2.1.8` | Form label with `htmlFor` linkage | shadcn convention [VERIFIED: npm view] |
| `@radix-ui/react-toast` | `^1.2.15` | Multi-tab event toast, import/export success | Per UI-SPEC §11 [VERIFIED: npm view] |
| `@radix-ui/react-slot` | `^1.2.4` | shadcn `asChild` composition pattern (for `<Button>` etc) | Standard [VERIFIED: npm view] |
| `clsx` | `^2.1.1` | Conditional className composition | Tiny, stable [VERIFIED: npm view] |
| `tailwind-merge` | `^3.5.0` | Resolve Tailwind class conflicts in `cn()` helper | Required for shadcn-style component patterns [VERIFIED: npm view] |
| `tsx` | `^4.21.0` | Run `scripts/build-zone-data.ts` as one-shot Node script | Vite-compatible, zero-config TS execution [VERIFIED: npm view] |

### Supporting (Phase 1 already installed; Phase 2 just consumes)

| Library | Version | Purpose |
|---------|---------|---------|
| `zustand` | `^5.0.12` | `catalogStore` (new); `planStore` (extend with setters); both via `persist` |
| `date-fns` + `@date-fns/utc` | `^4.1.0` / `^2.1.1` | Continue UTC-noon discipline in succession math + season-axis bounds |
| `react-router` v7 | `^7.14.2` | `/setup`, `/catalog`, `/plan`, `/settings` route surfaces |
| `lucide-react` | `^1.11.0` | Icons per UI-SPEC §4 mapping (verify presence: `Carrot`, `Onion`, `Garlic` may be missing — fall back to `Sprout`) |
| `vitest` v4 + `happy-dom` | `^4.1.5` / `^20.9.0` | Unit + component tests (Phase 1 has node-only env; Phase 2 needs DOM env for component tests) |

### Dev-Only / Optional

| Library | Version | Purpose | When |
|---------|---------|---------|------|
| `msw` | `^2.13.6` | Mock Permapeople API in tests | Required for CAT-06/07 test coverage [VERIFIED: npm view] |
| `@vitest/browser` + `playwright` | latest | Component tests with real-browser DOM | Optional; `happy-dom` likely sufficient for Phase 2 |
| `@playwright/test` | latest | E2E one-path smoke (visit → wizard → gantt → reload) | Optional but valuable for share-worthy polish gate |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod | Valibot, ArkType, Yup | All viable; Zod is the de-facto choice for React+TS in 2026 and pairs naturally with Zustand's `persist` (gist patterns abound). Valibot is smaller bundle but less-known. CLAUDE.md doesn't explicitly mandate Zod but it's the only validator implied by the repo's conventions. |
| Radix UI primitives | HeadlessUI, Ariakit, Reach | Radix is the shadcn primitive set; UI-SPEC explicitly specifies it. |
| Cloudflare Worker (proxy) | Vercel Edge Function, Netlify Function | All free-tier viable. CLAUDE.md picks Cloudflare Pages for hosting; Cloudflare Workers integrate naturally (same dashboard, same domain, free tier covers thousands of requests/month). |
| `tsx` for build script | `vite-node`, `ts-node`, compile-then-run | `tsx` is zero-config, ESM-first, fastest startup. `vite-node` requires a Vite config import path; not worth the wiring for one script. |

**Installation (single command):**

```bash
npm install zod \
  @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select \
  @radix-ui/react-checkbox @radix-ui/react-switch @radix-ui/react-label \
  @radix-ui/react-toast @radix-ui/react-slot \
  clsx tailwind-merge

npm install --save-dev tsx msw
```

**Version verification:** All versions above were live-checked against the npm registry on 2026-04-26 via `npm view <pkg> version`. Re-verify before installing if Phase 2 starts more than ~2 weeks from this date.

---

## Architecture Patterns

### System Architecture Diagram

```
┌─ User Browser ────────────────────────────────────────────────────────┐
│                                                                       │
│  Setup Wizard (3 steps)        Catalog Browser            Settings    │
│  ┌─────────────────┐          ┌──────────────────┐       ┌────────┐  │
│  │ Step1: Location │          │ Search + chips + │       │ Export │  │
│  │ Step2: Plants   │          │ card grid + my-  │       │ Import │  │
│  │ Step3: Review   │──┐    ┌──│ plan panel       │       │ modal  │  │
│  └─────────────────┘  │    │  └──────────────────┘       └───┬────┘  │
│                       │    │                                  │       │
│                       v    v                                  v       │
│              ┌─────────────────────────────────────────────────────┐ │
│              │          STATE (Zustand stores)                     │ │
│              │  planStore (persist v2)   catalogStore (persist)    │ │
│              │  • plan (location +       • curated (boot from      │ │
│              │    plantings + custom-      catalog.ts const)       │ │
│              │    Plants + edits)        • customPlants            │ │
│              │  • setLocation, addPlant- • permapeopleCache        │ │
│              │    ing, toggleSuccession, • mergedSelector          │ │
│              │    upsertCustomPlant      • search/filter selectors │ │
│              │  • exportPlan / replace-                            │ │
│              │    Plan (atomic overwrite)                          │ │
│              └────────────────┬────────────────────────────────────┘ │
│                               │                                      │
│                               v (read-only)                          │
│              ┌─────────────────────────────────────────────────────┐ │
│              │  PURE DOMAIN (zero React/Zustand/I/O imports)        │ │
│              │  expandSuccessions(plan, catalog) → Plan             │ │
│              │           │                                          │ │
│              │           v                                          │ │
│              │  generateSchedule(expandedPlan, catalog)             │ │
│              │           │                                          │ │
│              │           v                                          │ │
│              │  ScheduleEvent[]  →  GanttView (bare SVG)            │ │
│              └────────────────┬────────────────────────────────────┘ │
│                               │                                      │
│              ┌────────────────┴────────────────────────────────────┐ │
│              │  I/O BOUNDARY (sole sites)                          │ │
│              │  data/storage.ts (localStorage probe + multi-tab)   │ │
│              │  data/permapeople.ts (sole fetch site for API)      │ │
│              │  data/zones.ts (lazy fetch of public/data/*.json)   │ │
│              │  features/settings/exportPlan.ts (Blob download)    │ │
│              │  features/settings/importPlan.ts (FileReader+Zod)   │ │
│              └─────────────────────────────────────────────────────┘ │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
                                     │ (only over network)
                                     │
       ┌─────────────────────────────┼──────────────────────────────┐
       │                             │                              │
       v                             v                              v
   public/data/zones.{n}.json    Cloudflare Worker proxy        (none — engine
   (same-origin static; built    (stateless; holds API key)     never calls fetch)
   from frostline + NOAA at      → Permapeople /api/search
   `npm run build:data`)            and /api/plants/{id}
```

### Recommended Project Structure (Phase 2 additions)

```
src/
├── app/                            # Phase 1 — unchanged shell
│   └── AppShell.tsx                # ADD: floating MyPlanPill + Permapeople footer
├── assets/
│   └── catalog.ts                  # EXTEND: 4 → 50 plants
├── data/
│   ├── storage.ts                  # Phase 1 — unchanged
│   ├── zones.ts                    # NEW: fetch /data/zones.{firstChar}.json + cache
│   └── permapeople.ts              # NEW: sole fetch site for Permapeople (or proxy)
├── domain/
│   ├── scheduler.ts                # Phase 1 — unchanged (consumes expanded plan)
│   ├── succession.ts               # NEW: expandSuccessions(plan, catalog) → Plan
│   ├── types.ts                    # EXTEND: add Planting.successionEnabled, Location.overrides[]
│   └── schemas.ts                  # NEW: Zod schemas for Plant/Plan/ExportEnvelope/ZoneRow
├── features/
│   ├── setup/                      # NEW
│   │   ├── SetupWizard.tsx
│   │   ├── SetupStepLocation.tsx
│   │   ├── SetupStepPlants.tsx
│   │   ├── SetupStepReview.tsx
│   │   ├── ZipInput.tsx
│   │   └── lookupLocation.ts       # zones.ts wrapper for hook ergonomics
│   ├── catalog/                    # NEW
│   │   ├── CatalogBrowser.tsx
│   │   ├── PlantCard.tsx
│   │   ├── CustomPlantModal.tsx
│   │   ├── MyPlanPill.tsx
│   │   ├── MyPlanPanel.tsx
│   │   └── filters.ts              # Pure filter logic for search+chips
│   ├── settings/                   # NEW
│   │   ├── SettingsPanel.tsx
│   │   ├── exportPlan.ts           # Blob download
│   │   ├── importPlan.ts           # FileReader + Zod parse + preview-then-overwrite
│   │   └── ImportPreviewModal.tsx
│   └── gantt/
│       └── GanttView.tsx           # EXTEND: season axis + succession rows + empty state
├── stores/
│   ├── planStore.ts                # EXTEND: setters; bump version 1→2; first migration
│   ├── catalogStore.ts             # NEW
│   └── uiStore.ts                  # EXTEND: myPlanPanelOpen, lastExportAt (transient)
├── ui/                             # NEW (shadcn-style copy-paste primitives)
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Label.tsx
│   ├── Select.tsx
│   ├── Dialog.tsx
│   ├── DropdownMenu.tsx
│   ├── Switch.tsx
│   ├── Toast.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   └── cn.ts                       # `cn()` = clsx + tailwind-merge helper

scripts/
└── build-zone-data.ts              # NEW: one-shot tsx script

cors-proxy/                         # NEW (separate dir, deployed independently)
├── src/
│   └── index.ts                    # Cloudflare Worker — Permapeople proxy
├── wrangler.toml
└── package.json

public/data/                        # NEW (emitted by build-zone-data.ts)
├── zones.0.json
├── zones.1.json
... zones.9.json
```

### Pattern 1: Pure-Domain Engine Extension via Pre-Pass

**What:** Add succession to the engine WITHOUT modifying `generateSchedule()`. Implement as a pure pre-pass that expands a plan with `successionEnabled: true` plantings into N derived plantings, then the existing engine sees a "fully expanded" plan and runs unchanged.

**When to use:** Phase 2 succession (D-20). Pattern preserves Phase 1's snapshot-test invariants — the engine's existing 7 snapshots remain byte-identical because non-succession plans run through `expandSuccessions()` as a no-op pass-through.

**Example:**
```typescript
// Source: [VERIFIED: existing src/domain/scheduler.ts purity invariant + ARCHITECTURE.md §Succession]
// src/domain/succession.ts
import type { GardenPlan, Plant, Planting } from './types';
import { parseDate, addDays, differenceInDays, toISODate } from './dateWrappers';

/**
 * Pre-pass that expands plantings with successionEnabled: true into N derived plantings.
 * Pure: zero React/Zustand/I/O. Returns a NEW plan; does not mutate input.
 *
 * Cap rule (D-20): each derived planting's harvest must complete before firstFrostDate.
 * For indoor-start plants: latest possible transplant such that transplant + DTM ≤ firstFrost
 * For direct-sow plants:  latest possible directSow such that directSow + DTM ≤ firstFrost
 *
 * Spacing: successionIntervalDays from the catalog plant. Derived planting IDs:
 *   original keeps successionIndex: 0 and original id
 *   derived get successionIndex: 1..N and id `${baseId}-s${i}`
 */
export function expandSuccessions(
  plan: GardenPlan,
  catalog: ReadonlyMap<string, Plant>,
): GardenPlan {
  const lastFrost = parseDate(plan.location.lastFrostDate);
  const firstFrost = parseDate(plan.location.firstFrostDate);
  const expanded: Planting[] = [];

  for (const planting of plan.plantings) {
    expanded.push(planting); // index 0 always preserved
    if (!planting.successionEnabled) continue;
    const plant = catalog.get(planting.plantId);
    if (!plant) continue;
    const interval = plant.timing.successionIntervalDays;
    if (!interval || interval <= 0) continue;

    // Compute the "anchor" date for index 0 (when the original would start).
    // Indoor-start: anchor = transplant date (lastFrost + transplantOffset)
    // Direct-sow:   anchor = directSow date  (lastFrost + directSowOffset)
    // For both: each derived planting i shifts the anchor by i * interval days.
    const t = plant.timing;
    const dtm = t.daysToMaturity;
    const isIndoor = t.startMethod === 'indoor-start';
    const baseAnchor = isIndoor
      ? addDays(lastFrost, t.transplantOffsetDaysFromLastFrost ?? 0)
      : addDays(lastFrost, t.directSowOffsetDaysFromLastFrost ?? 0);

    // Cap (D-20): derived planting i is valid iff baseAnchor + i*interval + dtm ≤ firstFrost.
    // Solve for max i: i ≤ (daysFromAnchorToFirstFrost - dtm) / interval
    const daysToFirstFrost = differenceInDays(firstFrost, baseAnchor);
    const maxIndex = Math.floor((daysToFirstFrost - dtm) / interval);
    // maxSuccessions cap (catalog default ceiling, e.g., 4) acts as additional ceiling
    const safetyCap = plant.timing.maxSuccessions ?? 12;
    const upperBound = Math.min(maxIndex, safetyCap);

    for (let i = 1; i <= upperBound; i++) {
      expanded.push({
        ...planting,
        id: `${planting.id}-s${i}`,
        successionIndex: i,
        // successionEnabled stays true on derived rows for visual grouping;
        // engine ignores it (only the pre-pass reads it).
      });
    }
  }

  return { ...plan, plantings: expanded };
}
```

**Wiring in `useDerivedSchedule.ts` (Phase 2 swap point):**

```typescript
// src/features/gantt/useDerivedSchedule.ts (extends Phase 1 version)
import { useMemo } from 'react';
import { usePlanStore } from '../../stores/planStore';
import { useCatalogStore } from '../../stores/catalogStore';
import { generateSchedule } from '../../domain/scheduler';
import { expandSuccessions } from '../../domain/succession';

export function useDerivedSchedule() {
  const plan = usePlanStore(s => s.plan);
  const catalog = useCatalogStore(s => s.merged); // selector: curated + custom
  return useMemo(() => {
    if (!plan) return [];
    const expanded = expandSuccessions(plan, catalog);
    return generateSchedule(expanded, catalog);
  }, [plan, catalog]);
}
```

### Pattern 2: Build-Time Static Data Pipeline

**What:** A one-shot Node script (`scripts/build-zone-data.ts`) that fetches frostline + NOAA at build time, joins them by ZIP centroid → nearest weather station, and emits 10 chunked JSON files into `public/data/`. The browser only ever does `fetch('/data/zones.{firstChar}.json')` against same-origin static assets.

**When to use:** LOC-01 / LOC-02 (CONTEXT D-04). Lock the data at build time; never call third-party APIs at runtime.

**Output schema:**

```typescript
// data/zones.{0..9}.json — schema
{
  "version": 1,
  "generatedAt": "2026-04-26T...",
  "zips": {
    "20001": {
      "zone": "8a",
      "lat": 38.907711,
      "lon": -77.01732,
      "lastSpringFrost50": "04-15",   // MM-DD (no year — engine adds current year)
      "firstFallFrost50": "10-20"
    },
    ...
  }
}
```

**Sources used at build time:**
1. **Zones:** `phzmapi.org/{zip}.json` (waldoj/frostline static API). Returns `{zone, temperature_range, coordinates}`. Coordinates are PRISM-derived ZIP centroids. [VERIFIED: live curl 2026-04-26 returned `{"zone":"8a","temperature_range":"10 to 15","coordinates":{"lat":"38.907711","lon":"-77.01732"}}`]
2. **Frost dates:** NOAA NCEI 1991–2020 Annual/Seasonal Climate Normals — frost/freeze probability product. URL: `https://www.ncei.noaa.gov/access/search/data-search/normals-annualseasonal-1991-2020`. Includes 10/20/30/40/50/60/70/80/90% probability dates of last 32°F occurrence in spring and first 32°F in fall. [CITED: NOAA NCEI search portal page] **The exact bulk-download CSV URL must be discovered during implementation** — the search portal is interactive; an FTP/HTTPS bulk path exists at `https://www.ncei.noaa.gov/data/normals-annual/1991-2020/` (probable; verify in implementation). [ASSUMED: bulk URL pattern]
3. **ZIP→station mapping:** Compute at script time. For each ZIP: take its lat/lon from frostline, find nearest GHCN station with frost-probability data, copy that station's 50% values. Use simple Haversine distance.

**Build script approach — sequenced:**

```typescript
// scripts/build-zone-data.ts (sketch)
// Run via: `npx tsx scripts/build-zone-data.ts`
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT_DIR = resolve(__dirname, '../public/data');

// Stage 1: Read pre-downloaded raw inputs from `scripts/_raw/` (committed, not refetched on every build)
//   - frostline-zips.json (built once from waldoj/frostline; cached in git)
//   - noaa-frost-stations.csv (downloaded from NCEI; cached in git)
const zips = JSON.parse(readFileSync('scripts/_raw/frostline-zips.json', 'utf8'));
const stations = parseCSV(readFileSync('scripts/_raw/noaa-frost-stations.csv', 'utf8'));

// Stage 2: For each ZIP, find nearest station; extract 50%-probability dates
const indexed = new Map<string, ZoneRow>();
for (const [zip, { zone, lat, lon }] of Object.entries(zips)) {
  const station = nearestStation(stations, lat, lon);
  if (!station) continue;
  indexed.set(zip, {
    zone,
    lat, lon,
    lastSpringFrost50: station.lastSpring50,  // "04-15"
    firstFallFrost50: station.firstFall50,    // "10-20"
  });
}

// Stage 3: Split by first ZIP digit, write 10 chunks
mkdirSync(OUT_DIR, { recursive: true });
for (let firstChar = 0; firstChar <= 9; firstChar++) {
  const chunk: Record<string, ZoneRow> = {};
  for (const [zip, row] of indexed) {
    if (zip.startsWith(String(firstChar))) chunk[zip] = row;
  }
  writeFileSync(
    resolve(OUT_DIR, `zones.${firstChar}.json`),
    JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), zips: chunk }),
  );
}
```

**Critical decision needed at planning time:** does this script run on every `npm run build`, or once and committed? Recommend **commit the output JSONs to git** and run the script manually (`npm run build:data`) — keeps CI fast, makes the data deterministic and reviewable in PRs. The pre-downloaded raw inputs (frostline + NOAA CSV) live in `scripts/_raw/` and are also committed.

**Pragmatic v1 subset (recommendation):** Bundling all ~42K US ZIPs × 3 fields ≈ 3MB JSON / ~500KB gzipped. Acceptable per CLAUDE.md "≤250KB total JS gzipped" target only if zone data is **not** counted as JS (it isn't — it's lazy-loaded JSON). But to keep first-load fast and the build script simple, ship only **major-metro ZIPs (~5–10K)** in v1; rely on D-06's "ZIP not recognized → manual entry" path for the rest. Phase 4 expands coverage. **Open question for planner:** confirm subset strategy with user, or commit to full coverage now.

### Pattern 3: Zod Schema as Single Source of Truth for Persistence + Import

**What:** Define Zod schemas once in `src/domain/schemas.ts`. They serve three roles:
1. Runtime validation of imported JSON (DATA-05)
2. Optional runtime validation of persisted Zustand state on rehydrate (catches localStorage corruption beyond Phase 1's `JSON.parse` try/catch)
3. Source-of-truth from which TS types could be derived (`z.infer<typeof PlanSchema>`)

For Phase 2, keep types as the canonical declaration in `domain/types.ts` (Phase 1 invariant) and let the Zod schemas be a parallel runtime-only artifact. This avoids a refactor of the existing `types.ts` file and the snapshot tests that depend on it. Acceptable parallel maintenance because the types are stable.

**When to use:** All export/import boundaries. Optional for Zustand `partialize` validation.

**Example:**

```typescript
// src/domain/schemas.ts
// Source: [VERIFIED: zod v4 docs zod.dev/v4]
import { z } from 'zod';

// ISO date at UTC noon: "YYYY-MM-DDT12:00:00.000Z"
const isoUtcNoonDate = z.string().regex(/^\d{4}-\d{2}-\d{2}T12:00:00\.000Z$/);

const FrostToleranceSchema = z.enum(['tender', 'half-hardy', 'hardy']);
const SeasonSchema = z.enum(['cool', 'warm']);
const PlantCategorySchema = z.enum([
  'fruiting-vegetable', 'leafy-green', 'root', 'brassica',
  'legume', 'allium', 'herb', 'other',
]);
const PlantSourceSchema = z.enum(['curated', 'custom', 'permapeople']);

const PlantTimingSchema = z.object({
  startMethod: z.enum(['direct-sow', 'indoor-start', 'either']),
  weeksIndoorBeforeLastFrost: z.number().int().min(0).max(16).optional(),
  transplantOffsetDaysFromLastFrost: z.number().int().min(-60).max(60).optional(),
  directSowOffsetDaysFromLastFrost: z.number().int().min(-90).max(365).optional(),
  daysToGermination: z.tuple([z.number().int().min(1), z.number().int().min(1)]).optional(),
  daysToHardenOff: z.number().int().min(0).max(30).optional(),
  daysToMaturity: z.number().int().min(1).max(400),
  harvestWindowDays: z.number().int().min(1).max(120),
  successionIntervalDays: z.number().int().min(1).max(60).optional(),
  maxSuccessions: z.number().int().min(1).max(20).optional(),
  frostTolerance: FrostToleranceSchema,
  cutoffDaysBeforeFirstFrost: z.number().int().min(0).max(120).optional(),
  hasFlowering: z.boolean(),
  requiresHardening: z.boolean(),
});

const PlantSchema = z.object({
  id: z.string().min(1),
  source: PlantSourceSchema,
  name: z.string().min(1),
  scientificName: z.string().optional(),
  category: PlantCategorySchema,
  timing: PlantTimingSchema,
  enrichment: z.record(z.string(), z.unknown()).optional(), // Phase 2 widens beyond Phase 1's empty {}
});

const LocationSchema = z.object({
  zip: z.string().regex(/^\d{5}$/),
  zone: z.string().regex(/^\d{1,2}[ab]$/),
  lastFrostDate: isoUtcNoonDate,
  firstFrostDate: isoUtcNoonDate,
  source: z.enum(['lookup', 'manual']),
  lookupTimestamp: z.string().optional(),
  // Phase 2 addition (D-05): per-field override flags
  overrides: z.object({
    zone: z.boolean().optional(),
    lastFrostDate: z.boolean().optional(),
    firstFrostDate: z.boolean().optional(),
  }).optional(),
});

const PlantingSchema = z.object({
  id: z.string().min(1),
  plantId: z.string().min(1),
  label: z.string().optional(),
  successionIndex: z.number().int().min(0),
  successionEnabled: z.boolean().optional(), // Phase 2 addition (D-21)
  notes: z.string().optional(),
});

export const GardenPlanSchema = z.object({
  schemaVersion: z.literal(2),  // Phase 2 bumps to 2
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  location: LocationSchema,
  customPlants: z.array(PlantSchema),
  plantings: z.array(PlantingSchema),
  customTasks: z.array(z.unknown()), // Phase 3 will tighten
  edits: z.array(z.unknown()),       // Phase 3 will tighten
  settings: z.object({
    units: z.enum(['imperial', 'metric']),
    weekStartsOn: z.union([z.literal(0), z.literal(1)]),
    timezone: z.string(),
  }),
});

// Top-level export envelope (D-27)
export const ExportEnvelopeSchema = z.object({
  app: z.literal('garden-gantt'),
  version: z.string(),               // app semver, e.g. '0.2'
  schemaVersion: z.union([z.literal(1), z.literal(2)]), // accept v1 or v2; v1 triggers migrate
  exportedAt: z.string(),
  plan: z.unknown(),                 // schema-versioned; validated AFTER migration
});

export type GardenPlanV2 = z.infer<typeof GardenPlanSchema>;
export type ExportEnvelope = z.infer<typeof ExportEnvelopeSchema>;
```

### Pattern 4: Zustand Persist Migration v1 → v2

**What:** Bump `version: 1` → `2` in the `persist` config; add the migration callback. Phase 1 already shipped the framework (DATA-02); Phase 2 adds the first real migration.

**Reality check:** Phase 1 shipped with `plan: null` and zero setters mutating plan. There are **no real persisted v1 plans in user storage**. The migration is therefore a no-op-equivalent for in-storage state, but the same migration is reused for **import-time** v1→v2 (in case a Phase 1 dev build wrote something to localStorage and someone exports it). Practically: `migrations[2]` returns the input unchanged with `schemaVersion: 2` stamped on. Belt-and-suspenders: also handle the case where `plan === null` (do nothing — startup will route to `/setup`).

```typescript
// src/stores/planStore.ts (Phase 2 extends Phase 1 version)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GardenPlan, Planting, Plant, Location } from '../domain/types';

interface PlanState {
  plan: GardenPlan | null;
  // Phase 2 setters
  setLocation: (loc: Location) => void;
  addPlanting: (planting: Planting) => void;
  removePlanting: (plantingId: string) => void;
  toggleSuccession: (plantingId: string) => void;
  upsertCustomPlant: (plant: Plant) => void;
  removeCustomPlant: (plantId: string) => void;
  loadSamplePlan: () => void;          // D-03 "Try with sample plan"
  replacePlan: (plan: GardenPlan) => void;  // import (D-28)
  exportPlanSnapshot: () => GardenPlan | null;
}

const SCHEMA_VERSION = 2;  // BUMP: was 1 in Phase 1

const migrations: Record<number, (s: unknown) => unknown> = {
  // 1 → 2: Add overrides{} to location, successionEnabled to plantings.
  // In practice no real v1 plan persisted past Phase 1 (plan: null), but this runs for
  // import of any historical v1 export and is required by DATA-02 framework.
  2: (s: unknown) => {
    if (!s || typeof s !== 'object') return s;
    const state = s as { plan?: GardenPlan | null };
    if (!state.plan) return { ...state, plan: null };
    const migratedPlantings = state.plan.plantings.map(p => ({
      ...p,
      successionEnabled: false, // safe default; no surprise expansion on migrate
    }));
    return {
      ...state,
      plan: {
        ...state.plan,
        schemaVersion: 2 as const,
        location: {
          ...state.plan.location,
          overrides: {},
        },
        plantings: migratedPlantings,
      },
    };
  },
};

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      plan: null,
      setLocation: (location) => set(s => s.plan
        ? { plan: { ...s.plan, location, updatedAt: new Date().toISOString() } }
        : { plan: createEmptyPlan(location) }
      ),
      addPlanting: (planting) => set(s => s.plan
        ? { plan: { ...s.plan, plantings: [...s.plan.plantings, planting], updatedAt: new Date().toISOString() } }
        : s
      ),
      // ... other setters
      replacePlan: (plan) => set({ plan }),
      loadSamplePlan: () => set({ plan: structuredClone(samplePlan) as GardenPlan }),
      exportPlanSnapshot: () => get().plan,
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

**Note on `new Date().toISOString()` for `updatedAt`:** This is a `new Date()` call. ESLint rule blocks raw `new Date()` outside `dateWrappers.ts` and `features/gantt/**`. Two options:
1. Add a `nowISOString()` helper to `dateWrappers.ts` (preferred — keeps the rule strict).
2. Add `src/stores/**` to the allowlist (worse — drift).

**Recommendation: add `nowISOString()` to `dateWrappers.ts`** as the canonical "current time" site. CONTEXT discretion line item ("ESLint allowance: any new `new Date()` site needed beyond `dateWrappers.ts` and `src/features/gantt/**` should be discussed and added to the allowlist with a comment explaining why") supports the strict path.

### Pattern 5: Sole-Fetch-Site for Permapeople via Worker Proxy

**What:** All Permapeople API calls go through ONE module: `src/data/permapeople.ts`. ESLint guards: no other module in `src/` may call `fetch` to a non-same-origin URL. The module's `fetch` target is configurable via env var; in dev/spike, it points directly at `https://permapeople.org/api/...`; in production, it points at the Worker proxy URL.

**When to use:** CAT-06 / D-16 / D-17.

**Example — client module:**

```typescript
// src/data/permapeople.ts
// Source: [VERIFIED: live probe of permapeople.org/api/search OPTIONS returned 404 — no CORS preflight handler]
// [CITED: permapeople.org/knowledgebase/api-docs.html — POST /api/search, GET /api/plants/{id}]

const PERMAPEOPLE_BASE_URL =
  // VITE_ env vars are baked at build time; user picks proxy or direct in .env.local
  import.meta.env.VITE_PERMAPEOPLE_BASE_URL ?? '/permapeople-proxy';

const TIMEOUT_MS = 8000;

export type EnrichmentFields = {
  description?: string;
  scientificName?: string;
  family?: string;
  genus?: string;
  imageUrl?: string;
};

export type PermapeopleResult =
  | { status: 'ok'; data: EnrichmentFields }
  | { status: 'not-found' }
  | { status: 'rate-limited' }
  | { status: 'unreachable'; reason: 'cors' | 'network' | 'timeout' | 'http-5xx' | 'invalid-json' };

export async function searchPlant(query: string): Promise<PermapeopleResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    // Worker proxy strips Permapeople auth headers and adds them server-side.
    // If pointing direct, dev .env.local supplies x-permapeople-key-id/secret here too.
    const res = await fetch(`${PERMAPEOPLE_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...directAuthHeadersIfDev(),
      },
      body: JSON.stringify({ q: query }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (res.status === 429) return { status: 'rate-limited' };
    if (res.status >= 500) return { status: 'unreachable', reason: 'http-5xx' };
    if (!res.ok) return { status: 'not-found' };
    const json = await res.json();
    const first = (json.plants ?? [])[0];
    if (!first) return { status: 'not-found' };
    return {
      status: 'ok',
      data: mapPermapeopleToEnrichment(first),
    };
  } catch (e) {
    clearTimeout(timer);
    if ((e as Error).name === 'AbortError') {
      return { status: 'unreachable', reason: 'timeout' };
    }
    // TypeError on fetch is the canonical CORS / network signal in browsers
    return { status: 'unreachable', reason: 'cors' };
  }
}

function mapPermapeopleToEnrichment(p: any): EnrichmentFields {
  // Permapeople returns `data: [{key, value}, ...]` per API docs.
  const dataMap: Record<string, string> = {};
  for (const kv of p.data ?? []) dataMap[kv.key] = kv.value;
  return {
    description: typeof p.description === 'string' ? p.description : undefined,
    scientificName: typeof p.scientific_name === 'string' ? p.scientific_name : undefined,
    family: dataMap['Family'],
    genus: dataMap['Genus'],
    imageUrl: typeof p.image_url === 'string' ? p.image_url : undefined,
  };
}

function directAuthHeadersIfDev(): Record<string, string> {
  const id = import.meta.env.VITE_PERMAPEOPLE_KEY_ID;
  const secret = import.meta.env.VITE_PERMAPEOPLE_KEY_SECRET;
  if (id && secret) {
    return { 'x-permapeople-key-id': id, 'x-permapeople-key-secret': secret };
  }
  return {};
}
```

**Worker proxy (cors-proxy/src/index.ts):**

```typescript
// cors-proxy/src/index.ts — Cloudflare Worker
// Source: [VERIFIED: Cloudflare Workers fetch handler API — developers.cloudflare.com/workers/]
// Stateless. No user data crosses this Worker — only generic Permapeople plant lookups.
// Env vars (set via `wrangler secret put`):
//   PERMAPEOPLE_KEY_ID, PERMAPEOPLE_KEY_SECRET, ALLOWED_ORIGIN

export default {
  async fetch(req: Request, env: { PERMAPEOPLE_KEY_ID: string; PERMAPEOPLE_KEY_SECRET: string; ALLOWED_ORIGIN: string }): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') ?? '';
    const allow = origin === env.ALLOWED_ORIGIN ? origin : env.ALLOWED_ORIGIN;
    const corsHeaders = {
      'Access-Control-Allow-Origin': allow,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    // Map our path → Permapeople path
    //   /search      → POST https://permapeople.org/api/search
    //   /plants/:id  → GET  https://permapeople.org/api/plants/:id
    const target =
      url.pathname === '/search'
        ? 'https://permapeople.org/api/search'
        : url.pathname.startsWith('/plants/')
          ? `https://permapeople.org/api${url.pathname}`
          : null;
    if (!target) return new Response('Not Found', { status: 404, headers: corsHeaders });

    const upstreamHeaders = new Headers(req.headers);
    upstreamHeaders.set('x-permapeople-key-id', env.PERMAPEOPLE_KEY_ID);
    upstreamHeaders.set('x-permapeople-key-secret', env.PERMAPEOPLE_KEY_SECRET);
    upstreamHeaders.delete('Origin'); // upstream may reject with CORS otherwise

    const upstream = await fetch(target, {
      method: req.method,
      headers: upstreamHeaders,
      body: req.method === 'POST' ? await req.text() : undefined,
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
    });
  },
};
```

`wrangler.toml`:
```toml
name = "garden-gantt-permapeople-proxy"
main = "src/index.ts"
compatibility_date = "2026-04-26"
[vars]
ALLOWED_ORIGIN = "https://garden-gantt.pages.dev"
# secrets via `wrangler secret put PERMAPEOPLE_KEY_ID` and `... PERMAPEOPLE_KEY_SECRET`
```

### Pattern 6: Export/Import as Pure Browser APIs

**What:** Export = `Blob` + `URL.createObjectURL` + a synthesized anchor click. Import = `<input type=file>` + `FileReader.readAsText` + `JSON.parse` + Zod `safeParse` + preview modal + `replacePlan()`.

**When to use:** DATA-04 / DATA-05.

```typescript
// src/features/settings/exportPlan.ts
import { usePlanStore } from '../../stores/planStore';
import { useCatalogStore } from '../../stores/catalogStore';
import { ExportEnvelopeSchema } from '../../domain/schemas';

const APP_VERSION = '0.2';

export function exportPlan(): { ok: true; filename: string } | { ok: false; reason: string } {
  const plan = usePlanStore.getState().plan;
  if (!plan) return { ok: false, reason: 'No plan to export' };

  const envelope = {
    app: 'garden-gantt' as const,
    version: APP_VERSION,
    schemaVersion: 2 as const,
    exportedAt: new Date().toISOString(), // see Pattern 4 note re: nowISOString helper
    plan,
  };

  // Validate before serializing (defense in depth)
  const result = ExportEnvelopeSchema.safeParse(envelope);
  if (!result.success) {
    return { ok: false, reason: `Internal error: ${result.error.issues[0]?.message}` };
  }

  const json = JSON.stringify(envelope, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `garden-gantt-plan-${dateStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { ok: true, filename };
}
```

```typescript
// src/features/settings/importPlan.ts
import { ExportEnvelopeSchema, GardenPlanSchema } from '../../domain/schemas';
import type { GardenPlan } from '../../domain/types';

export type ImportResult =
  | { ok: true; plan: GardenPlan; meta: { plantingsCount: number; customPlantsCount: number; zip: string; zone: string; needsMigration: boolean } }
  | { ok: false; reason: 'invalid-json' | 'invalid-schema' | 'newer-version'; detail?: string };

export async function parseImportFile(file: File): Promise<ImportResult> {
  const text = await file.text();
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, reason: 'invalid-json' }; }

  const env = ExportEnvelopeSchema.safeParse(parsed);
  if (!env.success) return { ok: false, reason: 'invalid-schema', detail: env.error.issues[0]?.message };

  // Reject schemaVersion newer than current app
  if (env.data.schemaVersion > 2) return { ok: false, reason: 'newer-version' };

  // Apply migration if v1
  let planObj = env.data.plan;
  if (env.data.schemaVersion === 1) {
    planObj = migrateV1ToV2(planObj);
  }

  // Validate the post-migration plan
  const planResult = GardenPlanSchema.safeParse(planObj);
  if (!planResult.success) return { ok: false, reason: 'invalid-schema', detail: planResult.error.issues[0]?.message };

  return {
    ok: true,
    plan: planResult.data as GardenPlan,
    meta: {
      plantingsCount: planResult.data.plantings.length,
      customPlantsCount: planResult.data.customPlants.length,
      zip: planResult.data.location.zip,
      zone: planResult.data.location.zone,
      needsMigration: env.data.schemaVersion === 1,
    },
  };
}

// Mirrors planStore.migrations[2]; should ideally be SHARED with the store's migration —
// recommend extracting both call-sites to a single `domain/migrations.ts` module.
function migrateV1ToV2(plan: any): any {
  if (!plan) return plan;
  return {
    ...plan,
    schemaVersion: 2,
    location: { ...plan.location, overrides: {} },
    plantings: (plan.plantings ?? []).map((p: any) => ({ ...p, successionEnabled: false })),
  };
}
```

### Pattern 7: catalogStore — Curated + Custom Merged Selector

**What:** Curated catalog is a TS const loaded fresh from `src/assets/catalog.ts` on every boot (matches the Phase 1 pattern for `samplePlan.ts`). Custom plants persist to localStorage via Zustand `persist`. A memoized selector merges them for the UI to consume as a single `Plant[]`.

```typescript
// src/stores/catalogStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Plant } from '../domain/types';
import { curatedCatalog } from '../assets/catalog';

interface CatalogState {
  customPlants: Plant[];
  permapeopleCache: Record<string, Plant['enrichment']>; // mirrored to localStorage
  upsertCustomPlant: (p: Plant) => void;
  removeCustomPlant: (id: string) => void;
  cacheEnrichment: (plantId: string, fields: Plant['enrichment']) => void;
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set) => ({
      customPlants: [],
      permapeopleCache: {},
      upsertCustomPlant: (p) => set(s => ({
        customPlants: [...s.customPlants.filter(x => x.id !== p.id), p],
      })),
      removeCustomPlant: (id) => set(s => ({
        customPlants: s.customPlants.filter(p => p.id !== id),
      })),
      cacheEnrichment: (plantId, fields) => set(s => ({
        permapeopleCache: { ...s.permapeopleCache, [plantId]: fields },
      })),
    }),
    { name: 'garden-gantt:catalog', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

// Selector — call as: const merged = useCatalogStore(selectMerged)
export function selectMerged(s: CatalogState): ReadonlyMap<string, Plant> {
  const map = new Map<string, Plant>();
  for (const p of curatedCatalog) map.set(p.id, p);
  for (const p of s.customPlants) map.set(p.id, p);
  return map;
}
```

### Anti-Patterns to Avoid

- **Mutating `samplePlan`** when "Try with sample plan" is clicked. Phase 1 imports it as a `const`; mutating it would persist across sessions in unexpected ways. Use `structuredClone()` or a deep-copy helper.
- **Calling `fetch` from any module other than `data/permapeople.ts`** for Permapeople or `data/zones.ts` for zones. ESLint should have an `import/no-restricted-modules` or a custom rule once Phase 2 ships — at minimum, code review enforces it.
- **Persisting wizard step state.** D-default + UI-SPEC §1: each visit to `/setup` starts at the appropriate step based on plan presence. Persisting "currentStep" creates a stuck state if the user reloads mid-wizard with `plan === null`.
- **Reading from `usePlanStore.getState().plan` inside the engine.** SCH-02 invariant. Engine takes `(plan, catalog)` as arguments only.
- **Bundling all 42K ZIPs in a single JSON file.** Use the chunked-by-first-digit strategy (D-04).
- **Stamping `app: 'garden-gantt'` somewhere other than the export envelope.** Don't put it inside the `GardenPlan` object itself; it's metadata for the export wrapper only.
- **Treating `successionIndex: 0` as "no succession".** Original plantings always have `successionIndex: 0`; succession-derived plantings have `successionIndex: 1..N`. The flag for "expand this on render" is `Planting.successionEnabled: boolean` (Phase 2 addition). This separation matters because the user may toggle succession off and on — turning it off must NOT renumber the original.
- **Mutating the lifecycle palette in Phase 2.** UI-SPEC §Color: Phase 1 lifecycle palette is locked. Phase 2 only adds badge/season tokens.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Runtime schema validation for imports | Recursive `typeof`/`Array.isArray` checks | **Zod 4** `.safeParse()` | Discriminated-union return type, structured error issues for UI display, matches the Pitfall 21 "validate before applying" requirement out of the box |
| Modal a11y (focus trap, esc, scrim, restore-focus) | DIY `<dialog>` or `position:fixed` div | **Radix Dialog** | Hand-rolled focus traps fail in subtle ways (tab key, screen reader announcements). Radix is the de-facto headless primitive |
| Dropdown menu (Edit/Delete on custom card) | DIY div + `onBlur` | **Radix DropdownMenu** | Roving tabindex, keyboard nav, click-outside, type-ahead — all built in |
| Form select with full keyboard support | Native `<select>` + custom styling | **Radix Select** | Native select can't be styled to match shadcn aesthetic; Radix gives you both |
| Rate-limit + retry-with-backoff for Permapeople | Manual setTimeout chain | A bounded retry helper (custom — but use a tested pattern: max 3 retries, exponential backoff, jitter) | The custom is fine; just don't reinvent the wheel beyond what's needed. **Recommendation: skip retry entirely in Phase 2** — Permapeople is opt-in and non-blocking; failure surfaces a UI message and the user retries by clicking again. Implementing retry adds complexity for marginal benefit |
| File download | Build a server endpoint | `Blob` + `URL.createObjectURL` + anchor click | Pure browser, zero infra |
| File picker → JSON | Custom drag-and-drop drop zone | `<input type=file>` + `FileReader` | Phase 4 polish can add drag-and-drop; v1 ships the basic input |
| Data fetch caching | localStorage + TTL bookkeeping | Zustand `persist` on `permapeopleCache` (lazy hydrate) | Already integrated with the store's lifecycle |
| Multi-select filter chip state | Custom hook | `useState<Set<string>>` + plain handlers | This is small enough to hand-roll cleanly; don't reach for a library |
| Class name composition | String templates with manual conditionals | `cn()` = `clsx + tailwind-merge` (one-line helper) | shadcn convention; resolves Tailwind conflicts deterministically |

**Key insight:** The Phase 2 surface is large enough that "DIY everything" would burn 2× the time. Lean on Radix for a11y and Zod for validation; hand-roll the domain logic (succession, schedule, time scale) and the bare-SVG gantt. The UI-SPEC's "copy-paste shadcn (no init)" decision means we own the component code — but Radix owns the hard a11y bits.

---

## Common Pitfalls

Cross-references throughout to `.planning/research/PITFALLS.md` (the master pitfall registry).

### Pitfall A: CORS on Permapeople — Treat Worker Proxy as Default Path
**What goes wrong:** Plan budgets a 30-min CORS spike (D-16) and a fallback Worker (D-17). Spike confirms CORS blocked. Now wave-1 catalog work blocks on suddenly building the Worker.
**Evidence:** `OPTIONS /api/search` from a non-permapeople.org origin returns HTTP 404 — there's no preflight handler at all. CORS will reject all browser-originated cross-origin requests with credentials/non-simple headers (and the auth headers Permapeople requires are non-simple).
**How to avoid:** Implement the Worker FIRST (wave 1 task), point `data/permapeople.ts` at it via `VITE_PERMAPEOPLE_BASE_URL`, and use the spike's mandatory output `02-CORS-SPIKE.md` to record the *evidence* (which justifies why we shipped the Worker), not to *decide whether to ship the Worker*. The Worker is small enough (~20 LOC core + wrangler.toml + README) that the cost of building it pre-spike is lower than the cost of orchestrating sequential wave dependencies.
**Cross-ref:** PITFALLS.md §39, §10 CORS pitfall.

### Pitfall B: NOAA Frost-Date Confidence Bands (50% vs 90%)
**What goes wrong:** Bundle 50%-probability dates without explanation. Risk-averse user plants tomatoes by the 50%-probability date and loses them in a cold spring.
**How to avoid:** Phase 2 ships **50% only** (per CONTEXT D-04 and UI-SPEC). Document this in the manual-override copy ("frost dates shown reflect 50% probability — half the years may differ"). Per-plant frost-tolerance still clamps tender plants 14 days AFTER last frost (Phase 1 SCH-04 already handles this), which gives a defensive buffer for tender crops. Risk-band preferences land in v2 (POWER-V2-02).
**Cross-ref:** PITFALLS.md §11.

### Pitfall C: ZIP Coverage Holes
**What goes wrong:** waldoj/frostline source PRISM data does NOT cover all US ZIPs. User in a covered ZIP works fine; user in an uncovered ZIP hits D-06's "ZIP not recognized" path even though their neighbor's ZIP works.
**How to avoid:** D-06 already handles this gracefully (manual zone+frost entry). Document in copy ("we don't have data for {zip}"). Track uncovered ZIPs from user reports as a backlog for catalog expansion.
**Cross-ref:** PITFALLS.md §10 (microclimate variance — same root: data resolution limit).

### Pitfall D: Custom Plant with Missing DTM Crashes the Engine
**What goes wrong:** User saves a custom plant with `daysToMaturity: undefined`. Engine `addDays(start, undefined)` produces an Invalid Date; whole gantt disappears.
**How to avoid:** (1) `CustomPlantModal` validation requires DTM ≥1; Save button disabled until valid. (2) `expandSuccessions` and `generateSchedule` defensively check `plant.timing.daysToMaturity > 0` and skip the planting otherwise (matches Phase 1's "missing plant: silently skip" pattern in scheduler.ts:191). (3) Zod `GardenPlanSchema` rejects DTM≤0 on import.
**Cross-ref:** PITFALLS.md §30.

### Pitfall E: Schema Migration Drift Between Store and Importer
**What goes wrong:** `planStore.migrations[2]` and `importPlan.ts:migrateV1ToV2` are written separately. They drift over time; an imported v1 file gets a different shape than a rehydrated v1 plan.
**How to avoid:** Extract a single `src/domain/migrations.ts` module exporting `migrateToCurrent(plan, fromVersion) → plan`. Both `planStore.migrate` and `importPlan.parseImportFile` import from it. **Plan tasks for Phase 2 must include this shared module.**
**Cross-ref:** PITFALLS.md §4, §20.

### Pitfall F: Succession Cap Off-by-One
**What goes wrong:** Cap math computes `floor((daysToFirstFrost - dtm) / interval)` but uses days-from-direct-sow vs days-from-transplant inconsistently. Last succession's harvest lands AFTER first frost.
**How to avoid:** `expandSuccessions` is unit-tested with explicit fixtures: zone 7 lettuce (dtm 50, interval 14, lastFrost 2026-04-15, firstFrost 2026-10-20) → expect indices 0..N where the last index's `directSow + dtm ≤ firstFrost`. Snapshot test pins the exact expansion. Cross-check by computing the boundary case where index N+1 would just barely violate the cap.
**Cross-ref:** PITFALLS.md §17 (succession vs DTM confusion); Phase 1 PITFALLS §1 (off-by-one math).

### Pitfall G: Variety-Level Plant ID Format Inconsistency
**What goes wrong:** Phase 1 uses species-level IDs (`"tomato"`). Phase 2 catalog uses variety-level (`"tomato-cherokee-purple"`). Sample plan loader (D-03) clones `samplePlan` which has the old IDs; catalog merge can't find the plant.
**How to avoid:** When extending `catalog.ts` from 4 → 50, the original 4 (tomato, lettuce, broccoli, garlic) MUST stay with their existing IDs (`tomato`, `lettuce`, `broccoli`, `garlic`) so Phase 1 snapshot tests keep passing. NEW variety-level entries (e.g., `tomato-cherokee-purple`) coexist. The `samplePlan` keeps using the species-level IDs and is treated as a "generic" baseline. **Document this dual-namespace in `catalog.ts` header comments.**

### Pitfall H: localStorage Quota Exceeded on Permapeople Cache Growth
**What goes wrong:** User enriches 50 plants × ~5KB each = 250KB just for the cache. Stack with plan + customPlants + curated mirror, can creep past 1MB; on iOS Safari Private mode (quota=0) this surfaces immediately as a write throw.
**How to avoid:** (1) `permapeopleCache` stores ONLY the enrichment fields (description, scientificName, family, genus, imageUrl), not the entire response. (2) Cap cache size: 50 entries; LRU-evict on overflow (simple `slice(-50)` ordering). (3) Phase 1's storage probe + banner already covers the quota=0 case for the user.
**Cross-ref:** PITFALLS.md §3, §18.

### Pitfall I: Race Condition: User Adds Plant While Permapeople Fetch In Flight
**What goes wrong:** User clicks "Enrich" → spinner → user navigates away or saves → fetch resolves into a stale modal.
**How to avoid:** AbortController in `searchPlant`. Modal close handler aborts. Also: store `requestId` in modal local state; ignore late-arriving response if requestId mismatch.

### Pitfall J: Footer Attribution Not Shown When Permapeople Cache Mirrored to localStorage
**What goes wrong:** User imports a plan from a different browser. Permapeople-derived fields are present in `customPlant.enrichment` but the cache is empty in this browser. Attribution footer logic that depends on cache being non-empty fails to render.
**How to avoid:** Footer visibility check reads `customPlants` (or any visible plant) for `enrichment.source === 'permapeople'` markers, NOT the cache directly. Set this marker in `searchPlant`'s mapper and persist it on the customPlant.

### Pitfall K: Filter Chip State Reset on Route Change
**What goes wrong:** User filters catalog to "Cool-season + Leafy", clicks a plant card to read details (hypothetical Phase 3 behavior), navigates back — chip state lost.
**How to avoid:** Filter chip state lives in `uiStore` (in-memory, not persisted). Survives within-session navigation; resets on full reload. Acceptable v1 behavior.

---

## Code Examples

### Example A: zones.ts client loader

```typescript
// src/data/zones.ts
// Sole module that fetches /data/zones.{n}.json. Caches per-chunk in memory.

interface ZoneRow {
  zone: string;
  lat: number;
  lon: number;
  lastSpringFrost50: string;  // "MM-DD"
  firstFallFrost50: string;
}

const cache = new Map<number, Record<string, ZoneRow> | null>();

export type LookupResult =
  | { status: 'ok'; zone: string; lastFrostDate: string; firstFrostDate: string }
  | { status: 'not-found' }
  | { status: 'unreachable' };

export async function lookupLocation(zip: string, year: number): Promise<LookupResult> {
  if (!/^\d{5}$/.test(zip)) return { status: 'not-found' };
  const firstChar = parseInt(zip[0]!, 10);

  let chunk = cache.get(firstChar);
  if (chunk === undefined) {
    try {
      const res = await fetch(`/data/zones.${firstChar}.json`);
      if (!res.ok) { cache.set(firstChar, null); return { status: 'unreachable' }; }
      const json = await res.json();
      chunk = json.zips as Record<string, ZoneRow>;
      cache.set(firstChar, chunk);
    } catch {
      cache.set(firstChar, null);
      return { status: 'unreachable' };
    }
  }
  if (!chunk) return { status: 'unreachable' };

  const row = chunk[zip];
  if (!row) return { status: 'not-found' };

  // Build ISO UTC noon strings; use current year by default
  return {
    status: 'ok',
    zone: row.zone,
    lastFrostDate: `${year}-${row.lastSpringFrost50}T12:00:00.000Z`,
    firstFrostDate: `${year}-${row.firstFallFrost50}T12:00:00.000Z`,
  };
}
```

### Example B: 50-plant catalog snippet (variety-level)

```typescript
// src/assets/catalog.ts (Phase 2 extension; keeps Phase 1's 4 species-level entries unchanged)

// === Phase 1 plants (locked — referenced by snapshot tests; DO NOT change ids or timing) ===
const tomato: Plant = { /* unchanged from Phase 1 */ };
const lettuce: Plant = { /* unchanged */ };
const broccoli: Plant = { /* unchanged */ };
const garlic: Plant = { /* unchanged */ };

// === Phase 2 variety-level additions ===
const tomatoCherokeePurple: Plant = {
  id: 'tomato-cherokee-purple',
  source: 'curated',
  name: 'Tomato — Cherokee Purple',
  scientificName: 'Solanum lycopersicum',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 6,
    transplantOffsetDaysFromLastFrost: 14,
    daysToGermination: [5, 10],
    daysToHardenOff: 7,
    daysToMaturity: 80,
    harvestWindowDays: 60,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: true,
  },
};
// ... 45 more entries

export const curatedCatalog: readonly Plant[] = [
  tomato, lettuce, broccoli, garlic,                    // Phase 1 species-level
  tomatoCherokeePurple, /* 45 more */,                  // Phase 2 variety-level
] as const;

// Map form for engine consumption (preserves Phase 1's `sampleCatalog` API surface)
export const sampleCatalog: ReadonlyMap<string, Plant> = new Map(
  curatedCatalog.map(p => [p.id, p]),
);
```

**Recommended 50-plant set (Claude's discretion under D-07):**

| Category | Count | Examples |
|----------|-------|----------|
| Fruiting (warm) | 9 | Tomato (Cherokee Purple, Roma, Sungold), Pepper (Bell, Jalapeño), Eggplant (Black Beauty), Cucumber (Marketmore), Summer Squash (Yellow Crookneck), Watermelon (Sugar Baby) |
| Leafy greens | 8 | Lettuce (Black Seeded Simpson, Buttercrunch, Romaine), Spinach (Bloomsdale), Kale (Lacinato, Red Russian), Arugula, Swiss Chard (Bright Lights) |
| Brassicas | 6 | Broccoli (Calabrese, Waltham 29), Cauliflower (Snowball), Brussels Sprouts (Long Island), Cabbage (Early Jersey Wakefield), Kohlrabi |
| Roots | 6 | Carrot (Nantes, Danvers), Beet (Detroit Dark Red), Radish (Cherry Belle), Turnip (Purple Top), Parsnip (Hollow Crown) |
| Alliums | 5 | Onion (Yellow Sweet Spanish), Garlic, Leek (American Flag), Scallion (Evergreen), Shallot |
| Legumes | 4 | Bush Bean (Provider), Pole Bean (Kentucky Wonder), Snap Pea (Sugar Snap), Shelling Pea (Green Arrow) |
| Cucurbits (additional) | 3 | Winter Squash (Butternut), Pumpkin (Sugar Pie), Cantaloupe (Hale's Best) |
| Herbs | 9 | Basil (Genovese), Cilantro, Dill (Bouquet), Parsley (Italian Flat-Leaf), Oregano, Thyme, Sage, Mint, Chives |

Total: 50 — varies by ±2 depending on planner trim. Sources for timing values: **Old Farmer's Almanac** (per CONTEXT D-07 + frostdates.com), **Cornell University Extension** for vegetables, **Utah State University Extension** for herbs (publicly available extension publications). Document the `sourceCitation: string` field per plant in a comment, not in the runtime data.

### Example C: Cloudflare Worker proxy (full)

See Pattern 5 above.

### Example D: GanttView season-axis extension

```typescript
// src/features/gantt/GanttView.tsx — Phase 2 axis-bounds replacement
// Phase 1 hardcoded `${lastFrostYear}-01-01` to `${lastFrostYear+1}-12-31`.
// Phase 2 derives bounds from the actual events.

import { parseDate, addDays, toISODate } from '../../domain/dateWrappers';

function computeAxisBounds(events: ScheduleEvent[], plan: GardenPlan): { start: string; end: string } {
  if (events.length === 0) {
    // Defensive fallback: lastFrost ± 90 days
    const lf = parseDate(plan.location.lastFrostDate);
    return {
      start: toISODate(addDays(lf, -90)).slice(0, 10),
      end: toISODate(addDays(lf, 270)).slice(0, 10),
    };
  }
  // Use string comparison (ISO is lexically ordered)
  let minStart = events[0]!.start;
  let maxEnd = events[0]!.end;
  for (const e of events) {
    if (e.start < minStart) minStart = e.start;
    if (e.end > maxEnd) maxEnd = e.end;
  }
  // Round to month boundaries: minStart → first of its month; maxEnd → last of its month
  const startStr = `${minStart.slice(0, 7)}-01`;
  const endYear = parseInt(maxEnd.slice(0, 4), 10);
  const endMonth = parseInt(maxEnd.slice(5, 7), 10);
  // Last day of month: use 0th day of next month (handles leap years correctly)
  const lastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();
  const endStr = `${maxEnd.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
  return { start: startStr, end: endStr };
}
```

Note: the `new Date(Date.UTC(...))` call here is a date construction without a string arg → triggers ESLint rule. Add to allowlist via inline comment or — preferred — extract to `dateWrappers.ts` as `lastDayOfMonth(yyyy: number, mm: number): number`. **Plan should add this helper.**

### Example E: Test fixtures for succession

```typescript
// tests/domain/succession.test.ts
import { describe, it, expect } from 'vitest';
import { expandSuccessions } from '../../src/domain/succession';
import { sampleCatalog } from '../../src/assets/catalog';

describe('expandSuccessions', () => {
  const baseLocation = {
    zip: '20001',
    zone: '7a',
    lastFrostDate: '2026-04-15T12:00:00.000Z',
    firstFrostDate: '2026-10-20T12:00:00.000Z',
    source: 'manual' as const,
  };

  it('returns plan unchanged when no plantings have successionEnabled', () => {
    const plan = makePlan([{ plantId: 'lettuce', successionEnabled: false }]);
    expect(expandSuccessions(plan, sampleCatalog).plantings).toHaveLength(1);
  });

  it('expands lettuce in zone 7 (interval 14, dtm 50, lastFrost Apr 15, firstFrost Oct 20)', () => {
    const plan = makePlan([{ plantId: 'lettuce', successionEnabled: true }]);
    const expanded = expandSuccessions(plan, sampleCatalog).plantings;
    // Direct-sow at lastFrost - 28 = Mar 18; firstFrost = Oct 20 → 216 days available
    // (216 - 50) / 14 = ~11.85 → max index 11 → 12 plantings (0..11)
    // BUT capped at maxSuccessions (lettuce catalog: 4) → 5 plantings (0..4)
    expect(expanded).toHaveLength(5); // 1 original + 4 succession
    expect(expanded[0]!.id).toBe(plan.plantings[0]!.id);
    expect(expanded[0]!.successionIndex).toBe(0);
    expect(expanded[1]!.id).toBe(`${plan.plantings[0]!.id}-s1`);
    expect(expanded[1]!.successionIndex).toBe(1);
    expect(expanded[4]!.id).toBe(`${plan.plantings[0]!.id}-s4`);
  });

  it('does not expand a plant without successionIntervalDays', () => {
    // tomato has no successionIntervalDays → succession a no-op even if flag set
    const plan = makePlan([{ plantId: 'tomato', successionEnabled: true }]);
    expect(expandSuccessions(plan, sampleCatalog).plantings).toHaveLength(1);
  });
});
```

---

## State of the Art

| Old approach | Current approach | When changed | Impact |
|--------------|------------------|--------------|--------|
| Yup / Joi for schema validation | **Zod 4** | Zod 4 (2025) — 6.5x faster `safeParse`, smaller bundle | Use Zod 4 directly; no need to evaluate alternatives [VERIFIED: zod.dev/v4] |
| Headless UI v1 | Radix UI v2 / shadcn copy-paste | 2023+ — Radix won the headless primitives race; HeadlessUI deprecated v1 | Use Radix per UI-SPEC |
| `react-window` for virtualized lists | `@tanstack/react-virtual` | 2024+ | Not needed in Phase 2 (50-plant catalog renders fine). Consider in Phase 4 if enrichment grows the cache |
| `xstate` for wizard state | `useState` per-step + simple step counter | Always — overkill for 3 steps | Wizard state in local React state per UI-SPEC §1 |
| `react-hook-form` + Zod resolver for forms | Same — still current; alternative is plain controlled inputs | — | UI-SPEC §6 doesn't mandate RHF. Recommend plain controlled inputs for Phase 2's small forms (modal + ZIP input) — adds zero deps; valid Phase 4 swap if forms grow |

**Deprecated / outdated:**
- Calling Permapeople API directly from the browser (CORS confirmed broken; use the Worker proxy)
- phzmapi.org as a runtime API (per CLAUDE.md "Avoid")
- Storing dates as raw `new Date()` (Phase 1 invariant — preserved in Phase 2)

---

## Validation Notes

- The `nyquist_validation` workflow flag is disabled for this run (see additional_context). No standalone Validation Architecture section. Phase 2 testing strategy still documented inline below.

**Phase 2 testing strategy:**

| Test type | Scope | Tooling |
|-----------|-------|---------|
| Unit | `expandSuccessions` cap math (zone 5 + zone 7 fixtures, edge: interval larger than season window) | Vitest |
| Unit | Zod schemas: parse a valid plan; reject a plan missing required field; reject DTM≤0 | Vitest |
| Unit | Schema migration v1→v2 (idempotent on already-v2 input) | Vitest |
| Snapshot | Engine output for 5 new variety plants at zones 5 and 7 (DST + leap-year already covered by Phase 1's 4 plants); succession expansion of lettuce zone 7 | Vitest snapshot |
| Component | Wizard happy-path: enter ZIP → derive → next → add plant → finish | Vitest + happy-dom (already installed) |
| Component | CustomPlantModal: validation, Permapeople MSW mock, save | Vitest + happy-dom + MSW |
| E2E (optional) | Single happy path: load /setup → ZIP 20001 → add 5 plants → finish → reload → state persists | Playwright |
| Manual | CORS spike (D-16) — record evidence in `02-CORS-SPIKE.md` | curl + browser DevTools |

**Verification environment requirements:**
- Add `happy-dom` test environment for any test importing React components (Phase 1's `tests/` are node-only).
- Vitest config split: keep existing `environment: 'node'` for `tests/domain/**` and add a second `environment: 'happy-dom'` setup for `tests/features/**` and `tests/components/**` via Vitest projects or filename-based env detection.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | NOAA NCEI 1991–2020 Annual/Seasonal Climate Normals frost-freeze CSV is downloadable as bulk via `https://www.ncei.noaa.gov/data/normals-annual/1991-2020/` (or similar bulk path) | §Build-Time Pipeline | If no bulk path: implementer must manually download via the search portal once and commit raw CSV to `scripts/_raw/`. Workaround exists; no blocker. |
| A2 | The 50% probability "last spring frost" / "first fall frost" date columns are clearly labeled in the NOAA CSV (e.g. `DLY-TMIN-PRB-FRSTGE32T-50` or similar) | §Build-Time Pipeline | If column names differ from expected pattern, the build script needs a one-time mapping table — minor adjustment. |
| A3 | All ~42K US ZIPs covered by frostline can be matched to a NOAA station within ~50km via Haversine | §Build-Time Pipeline | If many ZIPs have no near station, those go to D-06's manual-entry fallback. Not a blocker. |
| A4 | `lucide-react` v1.11.0 includes icons for `Apple`, `Leaf`, `Carrot`, `Sprout`, `Flower2`, `Trees` | §Plant Card icon mapping | If `Carrot` / `Onion` / `Garlic` missing: planner falls back to `Leaf` / `Sprout` per UI-SPEC §4 explicit fallback rule. |
| A5 | Cloudflare Workers free tier (100K requests/day) covers expected Permapeople usage | §Pattern 5 | Tested only by future scale; if exceeded, Cloudflare's Pay-as-You-Go is $0.50 per million requests — negligible for a single-user app shared with friends. |
| A6 | 50-plant catalog timing values from Old Farmer's Almanac + Cornell/Utah extensions are defensible (will not embarrass the project) | §50-Plant Catalog | Variety-level DTM can vary 10–20% across sources. Document `sourceCitation` per plant; user can override per-plant in v2 (CAT-V2-02). |
| A7 | `clsx + tailwind-merge` is the right `cn()` helper for Tailwind v4 (not vendor-specific to v3) | §Standard Stack | Tailwind v4 changed some class generation; `tailwind-merge@3` is v4-aware. Verified live: `npm view tailwind-merge` → 3.5.0 (2026). [VERIFIED] |
| A8 | Worst-case Phase 2 plan size (50 plants × 4 successions × 6 lifecycle bars ≈ 1200 SVG nodes) renders smoothly in bare SVG without virtualization | §Bare SVG performance | If laggy: planner adds React.memo on row components. Genuine virtualization is Phase 4 work. Realistic v1 plans are 5–15 plants, so this is highly unlikely to bite. |

---

## Open Questions (RESOLVED)

1. **Run `build-zone-data.ts` on every CI build, or commit outputs to git?**
   - What we know: Build is one-shot (data changes when sources update — annually-ish). 10 chunks × ~30KB = 300KB total.
   - What's unclear: User preference. Committing outputs makes PR diffs noisy when sources update; running on CI risks build flakes from NOAA's portal being slow.
   - **RESOLVED:** Commit outputs to git. Provide `npm run build:data` as a manual refresh script. Re-run annually (in spring) or when frostline/NOAA source changes.

2. **Ship subset of ZIPs in v1, or full coverage?**
   - What we know: Full set is ~3MB raw / ~500KB gzipped, split into 10 lazy-loaded chunks. D-06 already handles "ZIP not recognized."
   - What's unclear: User preference between "every US ZIP works" and "5-10K major-metro ZIPs work, rest fall to manual." Both are defensible; full coverage is more polished.
   - **RESOLVED:** Full coverage (per CONTEXT D-04). Plan 02-02 acquires raw frostline + NOAA inputs at execute time, commits raw inputs to scripts/data-sources/, and builds full-coverage chunks. If raw acquisition is infeasible, fallback ships ≥3000-5000 ZIPs (top 50 metros), never the original ~10.

3. **`new Date()` allowance for `updatedAt: new Date().toISOString()`?**
   - What we know: ESLint rule blocks raw `new Date()` outside dateWrappers + features/gantt.
   - What's unclear: Add `nowISOString()` helper to `dateWrappers.ts` or extend allowlist?
   - **RESOLVED:** Add `nowISOString()` helper in dateWrappers.ts (Plan 02-01). Cleanest invariant. Plan 02-01 also adds `lastDayOfMonth` and `currentYear` helpers as the same pattern.

4. **Refactor migration to shared module now or after first drift incident?**
   - What we know: `planStore.migrate` and `importPlan.migrateV1ToV2` both need v1→v2 logic.
   - What's unclear: Do them inline now or extract from day-1?
   - **RESOLVED:** Extract from day-1 to `src/domain/migrations.ts` (Plan 02-01 Task 2). Cheaper than fixing drift later (Pitfall E).

5. **Wizard "back" navigation when plan is partially populated?**
   - What we know: D-02 — `/setup` is always-available; opens to Step 1 if `plan === null`, else Step 2.
   - What's unclear: If user is on Step 2 and clicks browser Back, do they go to Step 1 (in-app) or to the previous URL (out of app)?
   - **RESOLVED:** Browser back goes out of app. Wizard's internal "Back" button moves between steps. Don't push history entries per step — keeps URL stable at `/#/setup` regardless of step. Simpler model.

6. **Where does `samplePlan.ts` live in Phase 2 — fixture or production asset?**
   - What we know: D-03 reuses it as the "Try with sample plan" payload. Phase 1's snapshot tests also import it.
   - What's unclear: It's both a runtime asset and a test fixture.
   - **RESOLVED:** Keep as `src/samplePlan.ts`. Imported by both runtime (D-03 click handler) and test files. The dual-use is fine; nothing in CLAUDE.md prohibits.

7. **Permapeople rate-limit defense beyond AbortController + per-click idempotency?**
   - What we know: API has no documented rate limits.
   - What's unclear: Should `data/permapeople.ts` enforce a client-side throttle (e.g., max 1 request / 2 seconds)?
   - **RESOLVED:** No throttle in Phase 2. Permapeople is opt-in per plant; user clicks deliberately. If we hit 429s in the wild, add throttle in a follow-up.

8. **Curated catalog: hard-code 50 plants vs ship 30 + accept user submissions for 50 by milestone?**
   - What we know: D-07 says 50.
   - What's unclear: Implementation timing.
   - **RESOLVED:** Ship 50 in Phase 2 (Plan 02-04 Task 1). Hand-authoring 50 entries with timing fields is ~4 hours of work; less risk than soliciting community PRs at v0.2.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (build) | `tsx scripts/build-zone-data.ts` | Required | ≥18 (assumed) | n/a |
| `tsx` | Build script execution | After install | 4.21.0 | `vite-node`, `ts-node` (slower) |
| Cloudflare Wrangler CLI | Worker deploy | After install | latest | Manual deploy via dashboard |
| Cloudflare Pages account | Hosting + Worker | Required | n/a | Netlify, GitHub Pages (loses bandwidth headroom) |
| Permapeople API key | Worker proxy auth | Required (manual approval per CONTEXT) | n/a | App degrades gracefully — Permapeople is opt-in |
| `frostline` source data | `scripts/build-zone-data.ts` input | Public on phzmapi.org | n/a | Cache locally to `scripts/_raw/` |
| NOAA NCEI Climate Normals CSV | `scripts/build-zone-data.ts` input | Public download | 1991–2020 | n/a — only available source for frost dates |

**Missing dependencies with fallback:** Permapeople key approval may take days; the rest of Phase 2 can ship without enrichment functionality enabled (D-18 explicitly allows save without enrichment). Permapeople integration can be feature-flagged.

**Missing dependencies with no fallback:** None — every external dependency has either a viable substitute or graceful degradation.

---

## Sources

### Primary (HIGH confidence)
- `.planning/phases/01-foundation-schedule-engine/01-VERIFICATION.md` — locked Phase 1 surface
- `.planning/phases/02-data-layer-first-end-to-end/02-CONTEXT.md` — locked Phase 2 decisions D-01..D-29
- `.planning/phases/02-data-layer-first-end-to-end/02-UI-SPEC.md` — locked component contracts
- `.planning/research/ARCHITECTURE.md` — locked architectural rules (purity invariant, one-write-boundary)
- `.planning/research/PITFALLS.md` — master pitfall registry
- `.planning/research/STACK.md` (mirrored in CLAUDE.md) — locked stack
- `src/domain/scheduler.ts`, `src/domain/types.ts`, `src/stores/planStore.ts` — read directly
- npm registry live queries (2026-04-26): zod@4.3.6, @radix-ui/react-dialog@2.1.16, @radix-ui/react-select@2.2.6, @radix-ui/react-checkbox@1.3.3, @radix-ui/react-switch@1.2.6, @radix-ui/react-label@2.1.8, @radix-ui/react-toast@1.2.15, @radix-ui/react-dropdown-menu@2.2.6, @radix-ui/react-slot@1.2.4, clsx@2.1.1, tailwind-merge@3.5.0, tsx@4.21.0, msw@2.13.6
- Live curl `phzmapi.org/20001.json` → `{zone, temperature_range, coordinates}` — schema verified
- Live curl `OPTIONS https://permapeople.org/api/search` → HTTP 404 (no preflight handler) — CORS will block

### Secondary (MEDIUM confidence)
- [Permapeople API docs](https://permapeople.org/knowledgebase/api-docs.html) — header auth, /api/search and /api/plants/{id} endpoints, response shape with `data` array of {key, value}
- [waldoj/frostline GitHub](https://github.com/waldoj/frostline) — JSON-per-ZIP static API at phzmapi.org; PRISM-derived; not 100% ZIP coverage
- [NOAA NCEI Climate Normals 1991-2020](https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals) — frost/freeze probability at 10/20/30/40/50/60/70/80/90% bands
- [Zod v4 release notes](https://zod.dev/v4) — 6.5x safeParse speedup, .issues replaces .errors
- [Cloudflare Workers — fetch handler](https://developers.cloudflare.com/workers/) — fetch handler signature, Response/Request semantics

### Tertiary (LOW confidence — flagged for verification)
- Exact NOAA bulk-download CSV URL pattern (search portal is interactive; bulk path inferred but not verified) [ASSUMED A1]
- Specific NOAA column names for 50%-probability frost dates [ASSUMED A2]
- Lucide-react v1.11.0 icon inventory (Carrot/Onion/Garlic presence) [ASSUMED A4]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions live-verified against npm registry 2026-04-26
- Architecture: HIGH — extends Phase 1's already-locked invariants; CONTEXT.md and UI-SPEC.md are fully prescriptive
- Pitfalls: HIGH — drawn from the master PITFALLS.md plus live evidence (CORS probe; phzmapi schema)
- Build-time data pipeline: MEDIUM — NOAA bulk URL/column names inferred but not directly verified (A1, A2)
- 50-plant catalog set: MEDIUM — domain expertise + cited sources; specific DTM values per variety need source-citation in code (A6)

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (30 days for stable; npm versions and external API behavior should be re-verified after 30 days if Phase 2 hasn't started). Permapeople CORS posture should be re-probed during the Wave 1 spike regardless.
