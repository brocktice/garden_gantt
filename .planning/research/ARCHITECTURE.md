# Architecture Research

**Domain:** Single-user, no-backend, static-site garden-planning web app with interactive gantt + calendar views and localStorage persistence.
**Researched:** 2026-04-26
**Confidence:** HIGH (patterns are well-established for this app shape; some specifics — like Permapeople response shape — flagged MEDIUM)

---

## Executive Architectural Decisions

The following decisions thread through the rest of this document. Each is opinionated; alternatives noted briefly.

| Decision | Choice | One-liner |
|----------|--------|-----------|
| Engine style | Pure functions, immutable data | Schedule math is a compiler, not an OO graph |
| State manager | Zustand + `persist` middleware | Right-sized for one user; no Redux ceremony |
| Persistence | localStorage for plan; static JSON files for catalog/zones | 5MB plenty for one user's plan |
| Render strategy | SVG for gantt bars, native HTML/CSS for calendar | DOM-level interaction beats canvas at this scale |
| Routing | Hash router (`#/setup`, `#/plan`, `#/tasks`) | Works everywhere, zero static-host config |
| Build target | SPA, single bundle, prerendered shell | One HTML file, deep links via hash |
| Permapeople | Lazy, manual fetch per plant; cache in localStorage | API may be slow/rate-limited; never block the engine |
| Plant identity | Stable string `id` (e.g., `"tomato-cherokee-purple"`) | Stays valid across catalog updates and exports |

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Presentation Layer                           │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌──────────┐  │
│  │ Setup   │  │ Catalog  │  │ Gantt    │  │Calendar│  │ Tasks    │  │
│  │ Wizard  │  │ Browser  │  │ Editor   │  │  View  │  │Dashboard │  │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  └─────┬────┘  │
│       │            │             │            │             │        │
├───────┴────────────┴─────────────┴────────────┴─────────────┴────────┤
│                        State Layer (Zustand)                          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  planStore   (persisted)        catalogStore   (in-memory)     │  │
│  │  • location  • plantings        • curated      • permapeople   │  │
│  │  • customPlants  • tasks        • merged view  • fetch state   │  │
│  │  • settings                                                     │  │
│  └─────────────────────────┬──────────────────────────────────────┘  │
├────────────────────────────┴──────────────────────────────────────────┤
│                      Domain Logic (Pure Functions)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │  scheduler   │  │  succession  │  │  taskEmitter │  │constraint│ │
│  │  generate()  │  │  expand()    │  │  derive()    │  │  check() │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬────┘ │
│         └─────────────────┴─────────────────┴────────────────┘       │
│                                  │                                    │
├──────────────────────────────────┴────────────────────────────────────┤
│                            Data Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ localStorage │  │ static JSON  │  │ Permapeople  │  │ Zone CSV │ │
│  │ (plan)       │  │ (catalog)    │  │ API (lazy)   │  │ (frost)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**Key invariant:** the **domain layer never imports React, never reads localStorage, never calls fetch**. Inputs go in, derived state comes out. Everything else is plumbing around it.

---

## Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **Setup Wizard** | Collect ZIP, look up zone+frost dates, seed initial plan | React form; calls `lookupLocation(zip)` |
| **Catalog Browser** | Browse/filter curated catalog + custom plants; "Add to plan" | Virtualized list (`react-window`) + filter input |
| **Custom Plant Editor** | CRUD form for user-created plants (timing fields) | React Hook Form + Zod schema validation |
| **Gantt Editor** | Render bars per planting × phase; handle drag | SVG; one `<g>` per planting; pointer events for drag |
| **Calendar View** | Month/week grid with events placed on dates | CSS grid; same `ScheduleEvent[]` source as gantt |
| **Tasks Dashboard** | Today / This Week / Overdue lists; checkboxes | Date-bucketed `Task[]`; toggles `completed` flag |
| **Settings** | Import/export JSON, units, theme | File picker for import; `Blob` + `URL.createObjectURL` for export |
| **planStore** | Mutable plan state; persisted to localStorage | Zustand store with `persist` middleware |
| **catalogStore** | Read-mostly catalog; merges curated + custom + Permapeople cache | Zustand store, in-memory only |
| **scheduler** | Pure function: `(plan, catalog) → ScheduleEvent[]` | TS module, no side effects |
| **succession** | Pure function: expand a base planting into N successive plantings | TS module |
| **taskEmitter** | Pure function: `(events, customTasks) → Task[]` for a date range | TS module |
| **constraints** | Pure function: validate a candidate drag → ok / clamped / rejected | TS module |

---

## Recommended Project Structure

```
src/
├── app/                     # App shell, routing, providers
│   ├── App.tsx              # Top-level route switch
│   ├── routes.ts            # Hash route definitions
│   └── ErrorBoundary.tsx
├── features/                # Feature-sliced UI
│   ├── setup/               # Setup wizard (ZIP → location)
│   │   ├── SetupWizard.tsx
│   │   ├── ZipInput.tsx
│   │   └── lookupLocation.ts
│   ├── catalog/             # Catalog browser + custom editor
│   │   ├── CatalogBrowser.tsx
│   │   ├── PlantCard.tsx
│   │   └── CustomPlantEditor.tsx
│   ├── gantt/               # Timeline view (SVG)
│   │   ├── GanttView.tsx
│   │   ├── GanttRow.tsx
│   │   ├── GanttBar.tsx
│   │   ├── useDragBar.ts    # Pointer-event hook
│   │   └── timeScale.ts     # Date ↔ pixel mapping
│   ├── calendar/            # Calendar view (CSS grid)
│   │   ├── CalendarView.tsx
│   │   ├── MonthGrid.tsx
│   │   └── WeekGrid.tsx
│   ├── tasks/               # Task dashboard
│   │   ├── TasksDashboard.tsx
│   │   ├── TaskItem.tsx
│   │   └── TaskBuckets.ts   # Today/Week/Overdue partitioning
│   └── settings/            # Import/export/preferences
│       ├── SettingsPanel.tsx
│       ├── exportPlan.ts
│       └── importPlan.ts
├── domain/                  # PURE FUNCTIONS — no React, no I/O
│   ├── types.ts             # Plant, GardenPlan, ScheduleEvent, Task, Location
│   ├── scheduler.ts         # generateSchedule(plan, catalog) → ScheduleEvent[]
│   ├── succession.ts        # expandSuccession(planting) → Planting[]
│   ├── taskEmitter.ts       # deriveTasks(events, customTasks, now) → Task[]
│   ├── constraints.ts       # canMove(event, newDate, plan) → ConstraintResult
│   ├── frostMath.ts         # daysFromFrost(date, frostDate, sign) helpers
│   └── ids.ts               # generatePlantingId, taskId, etc.
├── data/                    # I/O adapters
│   ├── storage.ts           # localStorage read/write with versioning
│   ├── permapeople.ts       # API client with cache
│   ├── zoneLookup.ts        # ZIP → zone/frost from static CSV/JSON
│   └── catalog.ts           # Load static curated catalog
├── stores/                  # Zustand stores
│   ├── planStore.ts         # Persisted: location, plantings, custom plants, tasks
│   ├── catalogStore.ts      # In-memory: merged Plant view
│   └── uiStore.ts           # In-memory: zoom, selection, modals
├── ui/                      # Generic primitives (Button, Modal, Tooltip)
└── assets/
    ├── catalog.json         # Curated plant catalog (~50-100 entries)
    └── zones.csv            # ZIP → zone + frost dates (or per-ZIP JSON)
```

### Structure Rationale

- **`domain/` is sacrosanct:** Pure TS, zero dependencies on React/stores/I/O. Unit-testable as pure data-in/data-out. This is where the "garden gantt is correct" claim lives.
- **`features/` is feature-sliced**, not layer-sliced. Each feature owns its components, hooks, and small utilities. Easier to delete or rebuild a feature without untangling layers.
- **`stores/` is thin:** Zustand stores hold raw state; derived data comes from selectors that call `domain/` functions. Stores never contain scheduling logic.
- **`data/` adapters wrap I/O:** swappable. If localStorage becomes IndexedDB, only `storage.ts` changes.

---

## Data Model

All shapes are TypeScript-style. JSON-serializable (dates as ISO 8601 strings) so import/export and localStorage round-trip cleanly.

### Plant

A unified shape for curated, custom, and Permapeople-enriched plants.

```typescript
type PlantSource = "curated" | "custom" | "permapeople";

interface Plant {
  id: string;                          // stable, e.g. "tomato-cherokee-purple"
  source: PlantSource;
  name: string;                        // "Cherokee Purple Tomato"
  scientificName?: string;             // "Solanum lycopersicum"
  category: PlantCategory;             // "fruiting-vegetable" | "leafy-green" | ...

  // CORE TIMING (the schedule engine reads these — required for scheduled plants)
  timing: {
    startMethod: "direct-sow" | "indoor-start" | "either";
    weeksIndoorBeforeLastFrost?: number;     // for indoor-start
    transplantOffsetDaysFromLastFrost?: number; // negative = before, positive = after
    directSowOffsetDaysFromLastFrost?: number;
    daysToGermination?: [number, number];    // [min, max]
    daysToHardenOff?: number;                 // typical 7-14
    daysToMaturity: number;                   // from transplant or direct sow
    harvestWindowDays: number;                // length of harvest period

    successionIntervalDays?: number;          // null = no succession
    maxSuccessions?: number;                  // cap, e.g. 4

    frostTolerance: "tender" | "half-hardy" | "hardy";
    cutoffDaysBeforeFirstFrost?: number;      // last sow date constraint
  };

  // ENRICHMENT (display-only, not used by engine)
  enrichment?: {
    spacing?: { inRowInches: number; betweenRowsInches: number };
    sunRequirement?: "full-sun" | "partial-shade" | "shade";
    waterNeeds?: "low" | "medium" | "high";
    notes?: string;
    permapeoplePlantId?: number;       // for cache invalidation
  };
}

type PlantCategory =
  | "fruiting-vegetable"   // tomato, pepper, squash
  | "leafy-green"          // lettuce, kale
  | "root"                 // carrot, beet
  | "brassica"             // broccoli, cabbage
  | "legume"               // bean, pea
  | "allium"               // onion, garlic
  | "herb"                 // basil, parsley
  | "other";
```

### Location

```typescript
interface Location {
  zip: string;                         // "20001"
  zone: string;                        // "7a"
  lastFrostDate: string;               // "2026-04-15" (ISO date, no time)
  firstFrostDate: string;              // "2026-10-20"
  source: "lookup" | "manual";         // user can override
  lookupTimestamp?: string;            // ISO timestamp of lookup
}
```

### GardenPlan

The complete persisted unit. One per browser. Versioned for migrations.

```typescript
interface GardenPlan {
  schemaVersion: 1;                    // bump on breaking schema changes
  id: string;                          // uuid; useful if multi-plan ever added
  name: string;                        // "2026 Garden"
  createdAt: string;
  updatedAt: string;

  location: Location;

  customPlants: Plant[];               // user-authored Plant entries

  plantings: Planting[];               // user's selections

  customTasks: CustomTask[];           // one-offs and recurring user tasks

  edits: ScheduleEdit[];               // drag-to-adjust overrides (sparse)

  settings: {
    units: "imperial" | "metric";
    weekStartsOn: 0 | 1;               // Sun | Mon
    timezone: string;                  // IANA, defaults to browser
  };
}
```

### Planting

A specific instance of growing a plant in this plan. Multiple plantings of one plant = succession.

```typescript
interface Planting {
  id: string;                          // uuid
  plantId: string;                     // FK to Plant.id (curated or custom)
  label?: string;                      // user override, e.g. "Early Tomatoes"
  successionIndex: number;             // 0 = first planting, 1 = second, etc.
  notes?: string;
}
```

### ScheduleEvent

Computed output of the schedule engine. **Never stored**; always re-derived from `(plantings, plants, location, edits)`.

```typescript
type EventType =
  | "indoor-start"
  | "harden-off"
  | "transplant"
  | "direct-sow"
  | "germination-window"
  | "harvest-window";

interface ScheduleEvent {
  id: string;                          // deterministic: `${plantingId}:${type}`
  plantingId: string;
  plantId: string;
  type: EventType;
  start: string;                       // ISO date
  end: string;                         // ISO date (== start for point events)
  edited: boolean;                     // true if user dragged this event
  constraintsApplied: string[];        // ["clamped-to-last-frost"], for UI hints
}
```

### ScheduleEdit (drag overrides)

Sparse: only stored when user has manually adjusted an event.

```typescript
interface ScheduleEdit {
  plantingId: string;
  eventType: EventType;
  startOverride: string;               // ISO date
  endOverride?: string;
  reason: "user-drag" | "user-form-edit";
  editedAt: string;
}
```

### Task

```typescript
interface Task {
  id: string;
  source: "auto" | "custom";
  plantingId?: string;                 // present for auto-derived
  title: string;                       // "Water seedlings" / "Harden off broccoli"
  category: TaskCategory;
  dueDate: string;                     // ISO date
  recurrence?: TaskRecurrence;
  completed: boolean;                  // user toggles
  completedAt?: string;
  notes?: string;
}

type TaskCategory =
  | "sow" | "transplant" | "harden-off" | "harvest"
  | "water" | "fertilize" | "prune" | "scout-pests" | "custom";

interface TaskRecurrence {
  type: "weekly" | "daily" | "interval";
  intervalDays?: number;               // for "interval"
  endDate?: string;                    // ISO; null = forever
}

// Custom user tasks live separately; auto tasks regenerate from events.
interface CustomTask extends Omit<Task, "source" | "plantingId"> {
  source: "custom";
}
```

### Schema sketch (the whole picture)

```
GardenPlan
├── Location          (1)
├── customPlants[]    (Plant)
├── plantings[]       (Planting → references Plant.id)
├── customTasks[]     (CustomTask)
└── edits[]           (ScheduleEdit, sparse — only stored on drag)

DERIVED (never persisted)
├── ScheduleEvent[]   ← scheduler.generateSchedule(plan, catalog)
└── Task[]            ← taskEmitter.deriveTasks(events, customTasks, now)
```

**Persistence rule:** if it can be re-derived from inputs + edits, do not persist it. This makes catalog updates and bug fixes propagate automatically; the user's plan is just `{location, plantings, customPlants, customTasks, edits, settings}`.

---

## Schedule Engine

The schedule engine is the heart of the product. It must be **pure**, **deterministic**, and **fast enough to recompute on every drag**.

### Inputs / Outputs

```typescript
function generateSchedule(
  plan: GardenPlan,
  catalog: ReadonlyMap<string, Plant>     // all known plants by id
): ScheduleEvent[];
```

- **Input:** the persisted plan + a merged plant catalog (curated + custom + permapeople)
- **Output:** flat array of `ScheduleEvent`. Caller (gantt, calendar, taskEmitter) groups as needed.

### Algorithm

For each `Planting` in the plan:

1. **Resolve plant:** look up `Plant` via `plantId` from catalog. If missing, emit a warning event (`type: "missing-plant"`) and skip.

2. **Compute base anchors** from `location.lastFrostDate` and `Plant.timing`:

```typescript
// For an indoor-start plant with succession index 0:
const successionShift = planting.successionIndex * (plant.timing.successionIntervalDays ?? 0);
const lastFrost = parseISO(plan.location.lastFrostDate);

const indoorStart = subDays(lastFrost,
  plant.timing.weeksIndoorBeforeLastFrost! * 7
).plus({ days: successionShift });

const transplant = addDays(lastFrost,
  plant.timing.transplantOffsetDaysFromLastFrost ?? 0
).plus({ days: successionShift });

const hardenOff = subDays(transplant, plant.timing.daysToHardenOff ?? 7);

const harvestStart = addDays(transplant, plant.timing.daysToMaturity);
const harvestEnd = addDays(harvestStart, plant.timing.harvestWindowDays);
```

3. **Build candidate events** as point or range events.

4. **Apply edits:** for each `ScheduleEdit` matching this planting+eventType, replace the computed dates with the override. Cascade: if `transplant` is overridden, recompute downstream `harvestStart` from `transplant + daysToMaturity` (unless `harvestStart` itself is overridden).

5. **Apply constraints** (see below) — each event's dates are clamped, with `constraintsApplied` populated for UI hinting.

6. **Filter to season window:** drop events fully before `lastFrost - 90d` or after `firstFrost + 30d` (defensive; mostly cosmetic).

### Succession

Succession is **expansion of plantings**, not a separate event chain.

```typescript
function expandSuccession(
  planting: Planting,
  plant: Plant,
  location: Location
): Planting[] {
  const interval = plant.timing.successionIntervalDays;
  const max = plant.timing.maxSuccessions ?? 4;
  if (!interval) return [planting];

  // Compute first sow date for index 0
  const firstSow = computeFirstSowDate(plant, location);
  // Compute last allowed sow date (cutoff before first frost)
  const lastAllowed = subDays(
    parseISO(location.firstFrostDate),
    (plant.timing.cutoffDaysBeforeFirstFrost ?? plant.timing.daysToMaturity)
  );

  const result: Planting[] = [];
  for (let i = 0; i < max; i++) {
    const sowDate = addDays(firstSow, i * interval);
    if (sowDate > lastAllowed) break;
    result.push({ ...planting, successionIndex: i, id: `${planting.id}-s${i}` });
  }
  return result;
}
```

User UX choice: succession can be (a) automatic when user adds a plant with `successionIntervalDays`, with a slider for "how many", or (b) manual ("Add another planting"). Recommend (a) with the ability to delete individual successions — gives correct defaults without losing control.

### Drag-to-Adjust + Constraint Model

When the user drags a bar:

```
1. Drag start    → snapshot current event start date
2. Drag move     → compute candidate new date from pixel delta
3. Constraint    → constraints.canMove(event, candidateDate, plan, plant) returns:
                   { ok, clampedDate, reasons[] }
4. Visual        → bar follows cursor in "candidate" mode; tooltip shows reason
                   if clamping (e.g. "Can't transplant tender plant before May 15")
5. Drag end      → if ok or clampable: write ScheduleEdit, regenerate events,
                   re-render. If hard-rejected: snap back, toast the reason.
```

Constraint function:

```typescript
type ConstraintResult =
  | { ok: true; finalDate: string }
  | { ok: true; finalDate: string; clamped: true; reasons: string[] }
  | { ok: false; reasons: string[] };

function canMove(
  event: ScheduleEvent,
  candidateDate: string,
  plan: GardenPlan,
  plant: Plant
): ConstraintResult;
```

**Constraint rules** (extensible registry, not a hardcoded if-chain):

| Rule | Applies to | Behavior |
|------|------------|----------|
| `noTransplantBeforeLastFrostForTender` | `transplant` events for tender plants | Clamp to `lastFrost` |
| `noOutdoorSowBeforeSafeWindow` | `direct-sow` events | Clamp by frost tolerance class |
| `harvestAfterMaturity` | `harvest-window` start | Hard-rejected if before `transplant + 0.7 * daysToMaturity` |
| `hardenOffPrecedesTransplant` | `harden-off` ranges | Clamp end to `transplant - 1d` |
| `withinSeasonWindow` | All events | Clamp to `[lastFrost - 120d, firstFrost + 60d]` |
| `cascadeDownstream` | Earlier-phase events | When `transplant` moves, ripple `harvest` unless harvest is also edited |

**Cascade semantics:**
- Moving an **earlier** event ripples *unedited* later events (preserves their offset relative to the moved one).
- Moving a **later** event does NOT ripple earlier events — user said "harvest comes here", we accept it.
- An event with an existing `ScheduleEdit` is treated as **pinned** — cascades skip it.

This is the key UX call: "rippling later events is friendly; rippling earlier events is destructive." Industry gantts (DHTMLX, Bryntum) use the same heuristic.

### Pure Functions, Not Classes — Recommendation

**Recommendation: pure functions.**

| Concern | Pure Functions Win |
|---------|--------------------|
| Testing | `expect(generateSchedule(plan, catalog)).toMatchSnapshot()` — trivial |
| Drag perf | Memoize on `(plan, catalog)` reference; React rerenders skip easily |
| Mental model | "Schedule is a compiler." Same input → same output. Always. |
| Migrations | Schema migration is a pure transform, easy to chain |

A class-based engine adds OO ceremony (constructors, methods, internal state) for zero gain in this domain. The engine has no I/O, no async, no lifecycle. There is nothing for an object to be.

### Performance budget

- `generateSchedule` for ~30 plantings × 5 events each = 150 events. Should run in <5ms cold, <1ms with memoization.
- Memoize at the store boundary: `useDerivedSchedule()` selector with `(plan, catalog)` reference equality.
- Recompute on every drag is fine — if drag is laggy, the bottleneck is React re-render, not the engine. Use a transient "drag preview" state separate from committed plan to avoid full regenerates per pixel.

---

## State Management Split

### What lives in `localStorage` (persisted via `planStore`)

```typescript
// planStore (persisted by Zustand persist middleware)
{
  schemaVersion: 1,
  plan: GardenPlan,    // location, plantings, customPlants, customTasks, edits, settings
}
```

That's it. ~5-50 KB typical. localStorage limit (~5 MB) is hilariously generous.

### What lives in memory only (`catalogStore`, `uiStore`)

| State | Where | Why not persisted |
|-------|-------|-------------------|
| Curated catalog (~50-100 plants) | `catalogStore`, loaded from `assets/catalog.json` | Bundled with app; updates ship with deploys |
| Permapeople responses | `catalogStore.permapeopleCache`, mirrored to a dedicated localStorage key | Cache, not source of truth; can be rebuilt from API |
| Merged plant view | `catalogStore` selector | Pure derivation from catalog + customPlants + permapeople |
| `ScheduleEvent[]` | Computed via selector | Derived from plan; cheap to regenerate |
| `Task[]` | Computed via selector | Derived from events + customTasks |
| Drag preview state | `uiStore` | Transient; should not leak into localStorage |
| Modal/dialog open state | `uiStore` | Trivially regenerable |
| Zoom level, scroll position | `uiStore` (mirror to `sessionStorage` if persisted across reloads is desired) | UX preference, not plan state |
| Selected planting | `uiStore` | Transient |

### What's recomputed on demand vs cached

| Data | Strategy |
|------|----------|
| `ScheduleEvent[]` | Memoized selector; recompute when `plan` reference changes |
| `Task[]` | Memoized selector; recompute when `events` or `customTasks` change |
| Calendar bucketing (events by day) | Memoized; keyed on `events` + visible month |
| Date ↔ pixel scale | Memoized on `(timelineStartDate, timelineEndDate, viewportWidth)` |
| Plant catalog merge | Memoized; recompute when curated, custom, or permapeople cache changes |

Use `zustand/middleware`'s `subscribeWithSelector` and `useShallow` to keep React rerenders surgical. Prefer derived selectors (no setter) over storing computed values; only cache when the cost is measurable (e.g., calendar layout for 365 days).

### Persistence detail

```typescript
// stores/planStore.ts (sketch)
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const usePlanStore = create<PlanStore>()(
  persist(
    (set, get) => ({
      plan: defaultPlan(),
      setLocation: (loc) => set((s) => ({ plan: { ...s.plan, location: loc, updatedAt: nowIso() }})),
      addPlanting: (p) => set((s) => ({ plan: { ...s.plan, plantings: [...s.plan.plantings, p] }})),
      editEvent: (edit) => set((s) => ({
        plan: { ...s.plan, edits: upsertEdit(s.plan.edits, edit) }
      })),
      // ... reducers
    }),
    {
      name: "garden-gantt:plan",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (state, fromVersion) => migrations[fromVersion]?.(state) ?? state,
    }
  )
);
```

Versioning + migrations are mandatory from day 1, even at v1. The cost is one `migrate` callback; the benefit is never breaking users on a schema change.

---

## Plant Data Layer

Three sources, one unified `Plant` interface, one merge function.

### Sources

| Source | Where | When loaded | Mutability |
|--------|-------|-------------|------------|
| Curated catalog | `assets/catalog.json` (bundled) | App boot (one fetch of static asset) | Read-only |
| Custom plants | `plan.customPlants[]` (localStorage) | App boot (from store) | User-editable |
| Permapeople | `catalogStore.permapeopleCache` (in-memory + mirrored to localStorage) | Lazy: on user action ("Enrich from Permapeople") per plant, OR on plant search | Read-only cache |

### Merge

```typescript
function mergedCatalog(
  curated: Plant[],
  custom: Plant[],
  permapeopleCache: Map<string, Partial<Plant>>
): Map<string, Plant> {
  const out = new Map<string, Plant>();

  // 1. Curated — base layer
  for (const p of curated) out.set(p.id, p);

  // 2. Permapeople — enrichment ONLY (never overwrites timing fields)
  for (const [id, enrichment] of permapeopleCache) {
    const base = out.get(id);
    if (base) {
      out.set(id, {
        ...base,
        enrichment: { ...base.enrichment, ...enrichment.enrichment }
        // NOTE: timing is NOT merged. Curated timing wins.
      });
    }
  }

  // 3. Custom — full Plant entries; can shadow curated by id (rare)
  for (const p of custom) out.set(p.id, p);

  return out;
}
```

**Key rule: Permapeople never sets timing.** Curated catalog and custom plants are the only sources of `timing.*`. Permapeople fills in `enrichment.*` (spacing, sun, water, notes). This protects engine correctness from API drift.

### Permapeople fetch strategy

**Manual + lazy.** No background fetches, no boot-time hydration of all plants.

- Trigger: user clicks "Enrich" on a plant card, or the catalog browser surfaces a "Search Permapeople for more plants" button.
- On success: write to `permapeopleCache`, mirror to `localStorage` under key `garden-gantt:permapeople-cache`.
- On failure: toast the error; never block the app. The plant remains usable from curated/custom data.
- Cache TTL: 30 days. Stale entries refetched only on next manual trigger.

**Why lazy/manual:** API rate limits, latency, and offline use. The user can always plan their garden without Permapeople; enrichment is a nice-to-have. **Do not** make the schedule engine depend on Permapeople.

### Custom plant id collisions

When a user creates a custom plant, generate `id = "custom:<slug>:<short-uuid>"` (e.g., `"custom:purple-carrot:a3f2"`). This guarantees no collisions with curated `id`s and survives JSON export/import across machines.

---

## Component Boundaries

### Top-level UI

```
App (routing)
├── /setup        SetupWizard
├── /plan         PlanLayout
│   ├── /catalog  CatalogBrowser (sidebar) + GanttView (main) + TasksRail (right)
│   ├── /timeline GanttView (focused)
│   └── /calendar CalendarView
├── /tasks        TasksDashboard
└── /settings     SettingsPanel (import / export / preferences)
```

### Route → component → state ownership

| Route | Component | Reads | Writes |
|-------|-----------|-------|--------|
| `/setup` | `SetupWizard` | `planStore.location` | `planStore.setLocation` |
| `/catalog` | `CatalogBrowser` | `catalogStore.merged`, `planStore.plantings` | `planStore.addPlanting`, `catalogStore.fetchPermapeople` |
| `/plan` (timeline) | `GanttView` | `derivedSchedule`, `planStore.plantings` | `planStore.editEvent`, `planStore.removePlanting` |
| `/plan` (calendar) | `CalendarView` | `derivedSchedule`, `derivedTasks` | (read-only) |
| `/tasks` | `TasksDashboard` | `derivedTasks`, `planStore.customTasks` | `planStore.toggleTask`, `planStore.addCustomTask` |
| `/settings` | `SettingsPanel` | `planStore.plan` | `planStore.replacePlan` (import), `planStore.updateSettings` |

### Local-vs-global state per component

| Component | Local state (useState) | Global state (Zustand) |
|-----------|------------------------|------------------------|
| `SetupWizard` | Form fields, validation errors, lookup-in-progress | `planStore.location` |
| `CatalogBrowser` | Search query, filter chips | `catalogStore`, `planStore.plantings` |
| `CustomPlantEditor` | RHF form state | `planStore.customPlants` (on save) |
| `GanttView` | Zoom level, scroll position, drag preview | `planStore`, `derivedSchedule` |
| `useDragBar` | Drag-in-progress dates, pointer offsets | Read schedule, write `ScheduleEdit` on drop |
| `CalendarView` | Visible month, view mode (week/month) | `derivedSchedule`, `derivedTasks` |
| `TasksDashboard` | Filter (today/week/all), grouping | `derivedTasks`, `planStore.customTasks` |
| `SettingsPanel` | File-input state, import-preview | `planStore.plan` |

**Rule:** if state changes need to survive a reload, it goes in `planStore` (persisted) or never persists at all (memory). Avoid mid-tier persistence (e.g., per-component `sessionStorage` writes) — too much surface area.

---

## Data Flow

### User Adds a Plant to the Plan

```
User clicks "Add" on PlantCard in CatalogBrowser
  └─→ planStore.addPlanting({ plantId, successionIndex: 0 })
        └─→ planStore.plantings is updated (immutable)
              └─→ Zustand persist writes to localStorage:garden-gantt:plan
              └─→ Subscribers re-render:
                    ├─→ derivedSchedule selector recomputes
                    │     └─→ scheduler.generateSchedule(plan, catalog)
                    │           └─→ ScheduleEvent[] (e.g., 5 events for tomato)
                    │                 └─→ GanttView re-renders new bars
                    │                 └─→ CalendarView places events on dates
                    │                 └─→ taskEmitter.deriveTasks(events, ...)
                    │                       └─→ TasksDashboard updates
                    └─→ CatalogBrowser shows "Added" badge
```

### User Drags a Gantt Bar

```
pointerdown on GanttBar
  └─→ useDragBar captures event.id, snapshot start date
       └─→ uiStore.setDragPreview({ eventId, candidateStart })   (transient)

pointermove (per pixel)
  └─→ candidateDate = pixelToDate(event.clientX - dragOffset)
       └─→ constraints.canMove(event, candidateDate, plan, plant)
       └─→ uiStore.setDragPreview({ eventId, candidateStart, clamped, reasons })
       └─→ GanttBar shows itself at preview position with reason tooltip

pointerup
  └─→ if hard-rejected: uiStore.clearDragPreview() (snap back)
  └─→ if ok: planStore.editEvent({ plantingId, eventType, startOverride })
       └─→ derivedSchedule recomputes (cascade applied)
       └─→ GanttView re-renders all dependent bars
       └─→ TasksDashboard updates auto-tasks
       └─→ uiStore.clearDragPreview()
```

The **drag preview is transient** (uiStore, in-memory only). Only the final commit hits `planStore` and localStorage. This means: 60fps drag feedback, single localStorage write on drop.

### App Boot

```
Browser loads index.html
  └─→ Vite-bundled JS executes
       └─→ Zustand persist hydrates planStore from localStorage
            └─→ migrate() runs if schemaVersion mismatch
       └─→ catalogStore loads assets/catalog.json (cached by browser)
       └─→ catalogStore loads localStorage:garden-gantt:permapeople-cache
       └─→ Hash router reads window.location.hash
            ├─→ first time / no plan? → /setup
            └─→ has plan? → /plan
       └─→ App renders
```

### State Management Diagram

```
┌────────────────────────────────────────┐
│            planStore (persisted)        │
│  plan: GardenPlan                       │
│  setLocation, addPlanting, editEvent... │
└──────────────┬─────────────────────────┘
               │ subscribes
               ▼
┌────────────────────────────────────────┐
│         derivedSchedule selector        │
│  generateSchedule(plan, catalog)        │
└──────────────┬─────────────────────────┘
               │
       ┌───────┴────────┬─────────────┐
       ▼                ▼             ▼
   GanttView      CalendarView   taskEmitter
                                      │
                                      ▼
                              derivedTasks
                                      │
                                      ▼
                              TasksDashboard
```

---

## Routing & Static-Site Deployment

### SPA vs MPA — recommend SPA

**SPA**, single bundle, hash routing.

**Why:**
- One HTML file, one JS bundle. Drop on any static host (GitHub Pages, Netlify, Cloudflare Pages, Vercel) with zero configuration.
- All "navigation" is in-app and instant; no need for SSR.
- localStorage state is shared across "routes" trivially.
- App Shell pattern: prerender the empty shell at build, hydrate with Vite + React.

**Why not MPA:** No SEO concern (it's a private user app). No content-discoverability concern. SSR/SSG buys nothing.

### Hash routing — recommend over BrowserRouter

```typescript
// Routes via React Router (or a tiny custom hash router; ~30 lines)
const routes = {
  "#/setup":    SetupWizard,
  "#/plan":     PlanLayout,
  "#/calendar": CalendarView,
  "#/tasks":    TasksDashboard,
  "#/settings": SettingsPanel,
};
```

**Why hash:**
- Works on every static host without server rewrites. GitHub Pages doesn't natively support `BrowserRouter` deep-link refresh without a `404.html` hack.
- No 404s on refresh. Bookmarks always resolve.
- Zero cost: hash is part of the URL the browser already handles.

**When to revisit:** never, unless you add SSR or move to a host with rewrite support and want pretty URLs. For a single-user planning tool, hash is the right call.

### Asset/data bundling

| Asset | How | Why |
|-------|-----|-----|
| Curated plant catalog | `src/assets/catalog.json`, imported as ES module | Vite tree-shakes; ships in main bundle (~50 KB JSON gzipped tiny) |
| ZIP → zone/frost lookup | One JSON per ZIP loaded on demand (`/data/zones/{zip}.json`), fallback to ZCTA-3 if no exact ZIP | ~42K ZIPs × tiny JSON → don't bundle all; fetch per lookup |
| USDA zone shapefile | Don't ship; precomputed CSV → split per-ZIP JSON | Shapefile parsing in browser is huge dependency |
| Fonts/icons | Self-host or use system stack | No CDN privacy leak |

**Recommended ZIP→frost approach:**

1. Pre-build step: take `frostline`-style data (PRISM-derived) and produce `public/data/zones/{zip}.json` files at build time (~42K small files; the static host serves them lazily).
2. At runtime: `lookupLocation(zip)` does `fetch("/data/zones/" + zip + ".json")`.
3. Fallback: if 404, derive zone from ZCTA-3 (first 3 digits) using a smaller in-bundle map.
4. User override: always allow manual frost-date entry — covers gaps and non-US users.

Alternative (simpler, smaller asset count): bundle a single 2-3 MB `zones.json` mapping `zip → { zone, lastFrost, firstFrost }`. Loads once on first lookup, cached forever. **Recommend this** for v1 — simpler to ship, network cost is one-time, and 2-3 MB is acceptable for a planning app the user opens infrequently.

### Build/deploy

```
Vite build → dist/
├── index.html
├── assets/index-{hash}.js     # main bundle
├── assets/index-{hash}.css
└── data/
    ├── catalog.json           # curated plants
    └── zones.json             # ZIP → zone+frost
```

Deploy = `git push` to GitHub Pages, or `netlify deploy --dir=dist`. CD via GitHub Actions: build on `main`, push to `gh-pages`. Done.

---

## Architectural Patterns

### Pattern 1: Pure Domain Core, Imperative Shell

**What:** All scheduling, constraint, and task-emitter logic lives in `src/domain/` as pure TypeScript functions with no imports from React, Zustand, or any I/O. The "shell" (React components, stores, fetch wrappers) calls into the core but never participates in scheduling decisions.

**When to use:** any app where correctness of a derived computation is the product (here: "is the gantt right?").

**Trade-offs:**
- Pro: trivially unit-testable, deterministic, fast, easy to migrate
- Pro: forces clean dependency direction (UI → store → domain, never reverse)
- Con: requires discipline; new contributors will be tempted to put logic in components
- Con: a little more boilerplate at first (selector wrappers)

**Example:**
```typescript
// src/domain/scheduler.ts (pure)
export function generateSchedule(plan: GardenPlan, catalog: PlantCatalog): ScheduleEvent[] {
  return plan.plantings.flatMap(p => eventsForPlanting(p, catalog, plan.location, plan.edits));
}

// src/stores/planStore.ts (selector wraps it)
export const useDerivedSchedule = () => {
  const plan = usePlanStore(s => s.plan);
  const catalog = useCatalogStore(s => s.merged);
  return useMemo(() => generateSchedule(plan, catalog), [plan, catalog]);
};
```

### Pattern 2: Sparse Edits Over Materialized State

**What:** Don't store the full `ScheduleEvent[]` in localStorage. Store only the **deltas** (`ScheduleEdit[]`) and regenerate events from `plantings + plants + location + edits` every time.

**When to use:** any app where computed state is large, derivation is fast, and you want catalog updates to flow into existing plans.

**Trade-offs:**
- Pro: catalog updates and bug fixes propagate to existing plans automatically
- Pro: storage is small and human-readable
- Pro: schema migrations only touch inputs, not derived data
- Con: need to recompute on load — but it's <5ms, negligible
- Con: edits must be addressable (planting id + event type) to survive plant changes

**Example:**
```typescript
// Persisted: just the delta
{
  edits: [
    { plantingId: "p_abc", eventType: "transplant",
      startOverride: "2026-04-22", reason: "user-drag" }
  ]
}
// Materialized at runtime by scheduler.generateSchedule()
```

### Pattern 3: Constraint Registry

**What:** Constraints are individual functions registered into a list. `canMove` runs them all and aggregates results.

**When to use:** when constraint rules are likely to grow over time (and they will: "don't sow after frost", "respect pre-cooldown", etc.).

**Trade-offs:**
- Pro: easy to add new rules without touching existing ones
- Pro: rules can be unit-tested independently
- Pro: same registry can power both drag validation and "explain this date" UI tooltips
- Con: ordering matters when rules conflict (use explicit priority)

**Example:**
```typescript
// src/domain/constraints.ts
type ConstraintRule = {
  name: string;
  appliesTo: (e: ScheduleEvent) => boolean;
  check: (e, candidate, plan, plant) => Partial<ConstraintResult>;
};

const rules: ConstraintRule[] = [
  noTransplantBeforeLastFrostForTender,
  noOutdoorSowBeforeSafeWindow,
  harvestAfterMaturity,
  hardenOffPrecedesTransplant,
  withinSeasonWindow,
];

export function canMove(...args): ConstraintResult {
  return rules
    .filter(r => r.appliesTo(args[0]))
    .reduce(applyRule, { ok: true, finalDate: args[1] });
}
```

### Pattern 4: Feature-Sliced UI

**What:** Group code by *feature* (`features/gantt/`, `features/calendar/`) not by *layer* (`components/`, `hooks/`, `utils/`).

**When to use:** apps with 4+ distinct feature areas where each feature has its own UI, hooks, and small helpers.

**Trade-offs:**
- Pro: easier to find code; deletion of a feature is one folder
- Pro: avoids "components/Button.tsx" mega-folders
- Con: shared primitives need a `ui/` folder; not all code fits cleanly
- Con: cross-feature dependencies must be explicit (only `ui/` and `domain/` are universal)

---

## Anti-Patterns

### Anti-Pattern 1: Persisting Derived State

**What people do:** Write the full `ScheduleEvent[]` to localStorage so the gantt loads fast.

**Why it's wrong:**
- Doubles persistence size for no gain (regen is <5ms)
- Catalog/timing fixes don't propagate to existing plans (user is "stuck" on stale schedule)
- Schema migrations get harder (now you have to migrate derived data too)
- Drift: cached events can disagree with current catalog if a custom plant is edited

**Do this instead:** persist inputs + sparse edits. Always regenerate events at load time.

### Anti-Pattern 2: Putting Schedule Math in React Components

**What people do:** A `useMemo` inside `<GanttView>` that does all the date calculation per-render.

**Why it's wrong:**
- Untestable without rendering the component
- Couples scheduling logic to React's lifecycle
- Re-runs on unrelated state changes (theme, zoom level)
- Becomes a tar pit when the calendar view also needs the same logic — copy-paste ensues

**Do this instead:** `src/domain/scheduler.ts` exports a pure function. React components consume it via a selector. One source of truth, multiple views.

### Anti-Pattern 3: Permapeople in the Critical Path

**What people do:** Block the gantt render on Permapeople fetch to "enrich" plants before showing them.

**Why it's wrong:**
- API down → app down
- API rate-limited → user gets a slow boot
- Adds offline-broken state for a feature that's pure nice-to-have

**Do this instead:** Permapeople is **lazy and additive**. The schedule engine never reads `enrichment.*`. The user can plan offline.

### Anti-Pattern 4: One Big Zustand Store

**What people do:** Single `useStore()` with everything — plan, UI, catalog, drag preview — under one namespace.

**Why it's wrong:**
- Persist middleware writes the whole store to localStorage on any change → drag preview hits localStorage 60×/sec
- Subscribers re-render on unrelated state changes
- Migration becomes "migrate everything" instead of "migrate plan"

**Do this instead:** `planStore` (persisted), `catalogStore` (in-memory), `uiStore` (in-memory). Each store has a single concern. Cross-store reads via direct imports of selectors.

### Anti-Pattern 5: Drag Mutations Bypassing the Constraint System

**What people do:** Allow direct date setters on events without running constraints, "for power users".

**Why it's wrong:**
- The product's promise is "trustworthy schedule" — uncontrained drag breaks that
- Inconsistency between drag UI and form-edit UI (both should hit the same validator)
- Easy to ship a tomato transplanted in February

**Do this instead:** All edits — drag, form, import — go through `applyEdit(plan, edit)` which runs constraints first. Power user override = an explicit "ignore constraint" flag stored on the edit, surfaced visually as a warning.

---

## Build Order — Coarse 4-Phase Plan

Project granularity is "Coarse"; phases are roadmap-shaped, not sprint-shaped.

### Phase 1: Foundation & Schedule Engine (the spine)

**Goal:** A correct, testable schedule engine and a hard-coded gantt rendering of one or two plants. No persistence yet, no drag, no fancy UI.

**Includes:**
- Repo scaffold: Vite + React + TS + Zustand + Vitest + ESLint/Prettier
- `domain/types.ts` — full type system
- `domain/scheduler.ts` — pure function with snapshot tests for tomato, lettuce, broccoli
- `domain/succession.ts` — succession expansion with tests
- `domain/constraints.ts` — initial rule set
- `assets/catalog.json` — 5-10 hand-curated plants for testing
- `features/gantt/GanttView.tsx` — read-only SVG render, hardcoded plan
- Hash router shell, three empty routes

**Exit criteria:** `npm test` passes; visiting `/plan` shows a static gantt for a sample plan; can change `lastFrostDate` in code and watch all bars move.

### Phase 2: Plan Persistence & Setup Flow (real users)

**Goal:** A user can enter their ZIP, pick plants from a catalog, and see their actual gantt — and it survives reload.

**Includes:**
- `data/zoneLookup.ts` — ZIP → zone/frost from bundled `zones.json`
- `features/setup/SetupWizard.tsx` — ZIP entry, lookup, manual override
- `stores/planStore.ts` — Zustand + persist, schema versioning, migrations stub
- `features/catalog/CatalogBrowser.tsx` — list, filter, "Add to plan"
- `features/gantt/GanttView.tsx` — connected to `planStore` via `derivedSchedule`
- Curated catalog grown to ~30 common plants
- "Empty state" UX for first-time users

**Exit criteria:** Open browser, enter ZIP, add 5 plants, reload → same gantt is there. **End-to-end usable demo.** ← Critical path milestone.

### Phase 3: Interaction & Tasks (the product comes alive)

**Goal:** Drag-to-adjust works with constraints; calendar view; task dashboard with auto-derived and custom tasks.

**Includes:**
- `features/gantt/useDragBar.ts` — pointer-event drag with constraint feedback
- `domain/constraints.ts` extended — full rule registry, cascade logic, "pinned edits"
- `domain/taskEmitter.ts` — derive tasks from events
- `features/calendar/CalendarView.tsx` — month + week grid
- `features/tasks/TasksDashboard.tsx` — today/this-week/overdue, toggling
- Custom task CRUD
- Custom plant editor (basic form for timing fields)

**Exit criteria:** Drag a tomato transplant bar; harvest moves with it; tomato transplant cannot go before last frost. Calendar shows same data as gantt. Today's tasks accurate.

### Phase 4: Enrichment, Polish & Ship (recommend-worthy)

**Goal:** Permapeople integration, JSON import/export, polish to "share-worthy v1" bar.

**Includes:**
- `data/permapeople.ts` — API client with caching + manual trigger
- Plant enrichment UI (sun/water/spacing displays)
- `features/settings/{import,export}.ts` — JSON round-trip with schema validation
- Schema migration framework wired up
- Empty/error/loading states everywhere
- Mobile-responsive layout for tasks/calendar (gantt likely landscape-only)
- Catalog grown to 50-100 plants
- Static-site deploy CI/CD
- Documentation: schema, contributing custom plants, troubleshooting

**Exit criteria:** Live deploy. Run by 2-3 fellow gardeners; collect feedback; reach the "I'd recommend it" bar.

### Critical Path: blank slate → first end-to-end demo

The minimum viable demo is the end of Phase 2. Concretely:

```
[Phase 1] domain/types  →  domain/scheduler  →  GanttView (static)
                                                       │
[Phase 2] zoneLookup  →  SetupWizard  →  planStore  →  CatalogBrowser  →  GanttView (live)
```

If we cut anywhere, cut **Phase 3 calendar** (gantt is the spine, calendar is a second view) or **Phase 4 Permapeople** (enrichment, not core). Do not cut into Phase 1 (engine) or Phase 2 (setup + persistence) — those *are* the product.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 user, ~30 plantings | Default architecture is comfortable. SVG with ~150 events is well within budget. localStorage at <50 KB. |
| 1 user, ~200 plantings (heavy successions) | Memoize selectors aggressively; virtualize gantt rows (`react-window`); chunk SVG into per-row groups. |
| 1 user, ~1000 plantings (unrealistic but possible w/ heavy succession multipliers) | Consider canvas rendering for gantt; move catalog merge to Web Worker; batch localStorage writes via debounce. |
| Multi-device sync (out of scope, but...) | Replace `planStore` persistence with a sync adapter (e.g., automerge over WebRTC, or a server). Domain code unchanged. |

### Scaling Priorities

1. **First bottleneck:** SVG render of ~500+ bars on slow devices. Mitigation: row virtualization (only render visible rows in the viewport).
2. **Second bottleneck:** localStorage write latency on every drag-end. Mitigation: debounce 300ms; coalesce multi-edits in a session.
3. **Third bottleneck:** catalog merge cost on Permapeople update. Mitigation: incremental merge (only touch changed plant ids).

Most users will never hit #1. Optimize when measured, not when imagined.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Permapeople API | Lazy fetch on user action; localStorage-backed cache; never blocks | Confirm rate limits + auth before integration; design for graceful failure |
| ZIP/zone data | Bundled static `zones.json`; runtime lookup is in-memory | Built from `frostline`-style data + PRISM at build time |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ stores | React hooks (`useStore` selectors) | One-way subscribe; mutations via store actions |
| Stores ↔ domain | Direct function calls; pure | No store imports from domain; flow is one-way |
| Domain ↔ I/O | None (none allowed) | Domain is pure; I/O lives in `data/` |
| `data/` ↔ stores | Async functions called from store actions | Stores own loading/error state; data adapters are stateless |

---

## Testing Strategy

### Unit-testable (the bulk of testing budget)

| Module | What to test | Tool |
|--------|--------------|------|
| `domain/scheduler.ts` | Snapshot tests per (plant, frost date, succession index) combo; ~30 assertions cover the critical surface | Vitest + snapshots |
| `domain/succession.ts` | Edge cases: succession capped by first-frost cutoff; zero successions when interval undefined | Vitest |
| `domain/constraints.ts` | Each rule in isolation; matrix of (event type, candidate date, plant frost tolerance) → expected result | Vitest |
| `domain/taskEmitter.ts` | Event → tasks for known plants; recurrence expansion within window | Vitest |
| `data/zoneLookup.ts` | Known ZIP → expected zone (mock zones.json); fallback to ZCTA-3 | Vitest |
| `stores/planStore.ts` | Action → next state; migration from v0 → v1 | Vitest |

**Goal: ~80% coverage of `domain/`. Less elsewhere.** The domain is where bugs become "the gantt is wrong"; the UI is where bugs become "the layout is ugly." Different stakes.

### Integration tests

| Surface | Test | Tool |
|---------|------|------|
| Add planting → gantt updates | RTL render `<App>`, click "Add", assert event count | React Testing Library + Vitest |
| Setup wizard → location persists | Render wizard, fill ZIP, submit, reload-equivalent → state present | RTL + Vitest |
| Import JSON → plan replaces | Drop a fixture file, assert plantings count | RTL + Vitest |

### E2E (limited — drag is the only interaction worth E2E)

| Scenario | Test | Tool |
|----------|------|------|
| Drag transplant bar → harvest cascades | Real browser; pointer events on SVG; assert end positions | Playwright |
| Drag tender transplant before frost → clamps with warning | Same | Playwright |
| Full demo flow (setup → add plants → drag → check task) | Smoke test | Playwright |

**Why minimal E2E:** drag interactions in SVG are the one place where unit tests can't simulate the full pointer-event lifecycle. Everything else is testable as pure data.

---

## Sources

- [SVAR React Gantt — drag-and-drop with TypeScript support](https://svar.dev/react/gantt/)
- [DHTMLX Gantt — auto-scheduling engine and constraint cascade](https://dhtmlx.com/docs/products/dhtmlxGantt/)
- [Bryntum Gantt — async scheduling with dependency cascading](https://bryntum.com/products/react-gantt-chart/)
- [Zustand — bear-necessities state management](https://github.com/pmndrs/zustand)
- [Zustand persist + localStorage middleware patterns](https://medium.com/@jalish.dev/how-to-use-zustand-in-react-with-local-storage-persistence-fd67ab0cc5a0)
- [State management in 2025: Context vs Zustand vs Jotai vs Redux](https://dev.to/saswatapal/do-you-need-state-management-in-2025-react-context-vs-zustand-vs-jotai-vs-redux-1ho)
- [SPA localStorage persistence patterns and pitfalls](https://dev.to/linou518/making-your-spa-remember-state-with-localstorage-3-patterns-and-their-pitfalls-30jo)
- [frostline — USDA hardiness zones JSON-by-ZIP dataset](https://github.com/waldoj/frostline)
- [phzmapi.org — JSON-per-ZIP plant hardiness API (precedent for static-host approach)](https://phzmapi.org/)
- [USDA Plant Hardiness Zone Map (2023, official source)](https://planthardiness.ars.usda.gov/)

---

## Confidence Notes

- **HIGH** on overall structure (pure domain core + Zustand + SPA + hash routing). These patterns are battle-tested for this app shape.
- **HIGH** on data model — derived from the requirements; concrete shapes verified against the timing math described in `PROJECT.md`.
- **HIGH** on schedule engine algorithm. Frost-date math is well-understood; cascade rules match industry gantt convention.
- **MEDIUM** on Permapeople specifics — exact response shape and rate limits not yet verified by direct API call. The architecture isolates this risk: Permapeople is in `enrichment.*` only and never touches the engine.
- **MEDIUM** on ZIP-to-zone data shape (per-ZIP JSON files vs single bundled JSON) — both work; bundled is simpler for v1, per-ZIP scales better. Recommend bundled for v1.
- **LOW** confidence not flagged; specifics defer to phase-level research where the Permapeople API and SVG/canvas render perf can be measured for real, not guessed at.

---

*Architecture research for: garden_gantt*
*Researched: 2026-04-26*
