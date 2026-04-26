# Phase 2: Data Layer & First End-to-End — Pattern Map

**Mapped:** 2026-04-26
**Files analyzed:** 32 (new + modified)
**Analogs found:** 28 / 32 (87%)

> Per-file pattern assignments for the planner. Every Phase 2 file gets a closest existing analog from Phase 1's shipped code, with concrete excerpts to copy. Files with no analog are listed in §No Analog Found.

---

## File Classification

### Domain (pure)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/domain/types.ts` (EXTEND) | type-system | n/a (types only) | `src/domain/types.ts` (Phase 1) | exact (extend in place) |
| `src/domain/dateWrappers.ts` (EXTEND) | utility (date) | pure transform | `src/domain/dateWrappers.ts` (Phase 1) | exact (extend in place) |
| `src/domain/scheduler.ts` (EXTEND) | engine | pure transform | `src/domain/scheduler.ts` (Phase 1) | exact (extend in place) |
| `src/domain/succession.ts` (NEW) | engine pre-pass | pure transform | `src/domain/scheduler.ts` (Phase 1) | role+flow exact |
| `src/domain/schemas.ts` (NEW) | validation | runtime validation | `src/domain/types.ts` (parallel — types↔schemas) | role-match (no Zod analog yet) |
| `src/domain/migrations.ts` (NEW; Pitfall E) | utility (transform) | pure transform | `src/domain/scheduler.ts` (purity invariant) | partial (no migration analog) |

### Stores (Zustand)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/stores/planStore.ts` (EXTEND) | store (persist) | CRUD + setters | `src/stores/planStore.ts` (Phase 1) | exact (extend in place) |
| `src/stores/catalogStore.ts` (NEW) | store (persist) | CRUD | `src/stores/planStore.ts` (Phase 1) | exact (same persist machinery) |
| `src/stores/uiStore.ts` (EXTEND) | store (in-memory) | event-driven | `src/stores/uiStore.ts` (Phase 1) | exact (extend in place) |

### Data layer (I/O boundary)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/data/permapeople.ts` (NEW) | data-fetch | request-response | `src/data/storage.ts` (Phase 1 I/O boundary) | role-match (different I/O type) |
| `src/data/zones.ts` (NEW) | data-fetch | request-response | `src/data/storage.ts` (Phase 1 I/O boundary) | role-match |
| `scripts/build-zone-data.ts` (NEW) | build-script | batch transform | n/a — first build script | none |
| `cors-proxy/src/index.ts` (NEW) | edge-function | request-response (proxy) | n/a — first Worker | none |

### Features — setup wizard (NEW slice)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/setup/SetupWizard.tsx` (NEW) | component (container) | event-driven | `src/app/AppShell.tsx` | role-match (layout shell) |
| `src/features/setup/SetupStepLocation.tsx` (NEW) | component (form) | request-response (lookup) | `src/app/Banner.tsx` (form-shaped block) | partial |
| `src/features/setup/SetupStepPlants.tsx` (NEW) | component (container) | event-driven | `src/features/gantt/GanttView.tsx` (rich UI from store) | role-match |
| `src/features/setup/SetupStepReview.tsx` (NEW) | component (display) | read-only | `src/app/PlaceholderRoute.tsx` (display-only block) | partial |
| `src/features/setup/ZipInput.tsx` (NEW) | component (input) | event-driven | `src/app/Banner.tsx` (button + input pattern) | partial |
| `src/features/setup/lookupLocation.ts` (NEW) | hook (data wrapper) | request-response | `src/features/gantt/useDerivedSchedule.ts` | role-match |

### Features — catalog (NEW slice)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/catalog/CatalogBrowser.tsx` (NEW) | component (container) | event-driven | `src/features/gantt/GanttView.tsx` | role-match |
| `src/features/catalog/PlantCard.tsx` (NEW) | component (presentational) | read-only + click | `src/app/PlaceholderRoute.tsx` (small block component) | partial |
| `src/features/catalog/CustomPlantModal.tsx` (NEW) | component (modal/form) | event-driven + async | `src/app/Banner.tsx` (dismissible aside) | weak |
| `src/features/catalog/MyPlanPill.tsx` (NEW) | component (button) | read-only | `src/app/AppShell.tsx` (nav link with active style) | partial |
| `src/features/catalog/MyPlanPanel.tsx` (NEW) | component (drawer) | CRUD | `src/app/Banner.tsx` (sticky aside) | partial |
| `src/features/catalog/filters.ts` (NEW) | utility (pure) | pure transform | `src/domain/constraints.ts` (registry of pure rules) | role-match |

### Features — settings (NEW slice)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/settings/SettingsPanel.tsx` (NEW) | component (container) | event-driven | `src/app/PlaceholderRoute.tsx` (current settings shell) | role-match |
| `src/features/settings/exportPlan.ts` (NEW) | utility (browser-API) | file-I/O (out) | `src/data/storage.ts` (browser-API boundary) | role-match |
| `src/features/settings/importPlan.ts` (NEW) | utility (browser-API) | file-I/O (in) + validation | `src/data/storage.ts` + Zod | role-match |
| `src/features/settings/ImportPreviewModal.tsx` (NEW) | component (modal) | event-driven | `src/app/Banner.tsx` | weak |

### Features — gantt (EXTEND existing slice)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/gantt/GanttView.tsx` (EXTEND) | component (SVG render) | read-only render | `src/features/gantt/GanttView.tsx` (Phase 1) | exact (extend in place) |
| `src/features/gantt/useDerivedSchedule.ts` (EXTEND) | hook (selector) | pure derivation | `src/features/gantt/useDerivedSchedule.ts` (Phase 1) | exact (extend in place) |

### App shell (EXTEND)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/AppShell.tsx` (EXTEND) | layout shell | event-driven | `src/app/AppShell.tsx` (Phase 1) | exact (extend in place) |
| `src/app/App.tsx` (EXTEND) | router | request-response (route) | `src/app/App.tsx` (Phase 1) | exact (extend in place) |

### UI primitives (NEW directory)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/ui/cn.ts` (NEW) | utility (className) | pure | `src/domain/ids.ts` (1-line pure helper) | partial |
| `src/ui/Button.tsx` (NEW) | primitive | event-driven | `src/app/Banner.tsx` (button class composition) | partial |
| `src/ui/Input.tsx` / `Label.tsx` / `Select.tsx` / `Dialog.tsx` / `DropdownMenu.tsx` / `Switch.tsx` / `Toast.tsx` / `Card.tsx` / `Badge.tsx` (NEW) | primitive | event-driven | none in Phase 1 — Radix wrappers | none (use Radix docs) |

### Assets (EXTEND)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/assets/catalog.ts` (EXTEND 4→50) | data (const) | n/a | `src/assets/catalog.ts` (Phase 1) | exact (extend in place) |

### Tests (NEW + EXTEND)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `tests/domain/succession.test.ts` (NEW) | test (unit) | pure | `tests/domain/dateWrappers.test.ts` (pure node-env tests) | exact |
| `tests/domain/schemas.test.ts` (NEW) | test (unit) | pure | `tests/domain/dateWrappers.test.ts` | role-match |
| `tests/domain/migrations.test.ts` (NEW) | test (unit) | pure | `tests/domain/constraints.test.ts` | role-match |
| `tests/domain/scheduler.snapshot.test.ts` (EXTEND) | test (snapshot) | pure | self (Phase 1) | exact |
| `tests/stores/catalogStore.test.ts` (NEW) | test (store) | persist + happy-dom | `tests/stores/planStore.test.ts` | exact |
| `tests/stores/planStore.test.ts` (EXTEND for v2) | test (store) | persist + migrate | self (Phase 1) | exact |
| `tests/data/zones.test.ts` (NEW) | test (fetch w/ MSW) | request-response | `tests/data/storage.test.ts` (DOM boundary) | role-match |
| `tests/data/permapeople.test.ts` (NEW) | test (fetch w/ MSW) | request-response | `tests/data/storage.test.ts` | role-match |
| `tests/features/settings/exportPlan.test.ts` / `importPlan.test.ts` (NEW) | test (round-trip) | file-I/O | `tests/data/storage.test.ts` | role-match |
| `tests/features/gantt/GanttView.test.tsx` (NEW component test) | test (component) | DOM render | none (Phase 1 has no component tests) | none |

---

## Pattern Assignments

### `src/domain/succession.ts` (NEW — engine pre-pass)

**Analog:** `src/domain/scheduler.ts`

**Purity invariant** (Phase 1 file header — `src/domain/scheduler.ts:1-11`):
```typescript
// src/domain/scheduler.ts
// The product. Pure entry point per SCH-02.
// Algorithm:
//   For each Planting → resolve Plant from catalog → compute base anchors from
//   plant.timing + plan.location.lastFrostDate → emit lifecycle events → apply
//   constraints (SCH-04 transplant clamp) → append auto-task events → sort.
//
// Purity: zero React/Zustand/I/O; date math via dateWrappers only.
```
**Apply to succession.ts:** mirror this header verbatim — succession is also pure, also dateWrappers-only, also catalog-resolving.

**Imports pattern** (`src/domain/scheduler.ts:12-16`):
```typescript
import type { GardenPlan, Plant, Planting, ScheduleEvent } from './types';
import { parseDate, addDays, subDays, toISODate } from './dateWrappers';
import { eventId } from './ids';
import { canMove } from './constraints';
import { emitTaskEvents, type PlantingAnchors } from './taskEmitter';
```
**Apply to succession.ts:** copy `parseDate`/`addDays`/`differenceInDays` import; import `GardenPlan`/`Plant`/`Planting` types only (no `ScheduleEvent` — succession returns `GardenPlan`, not events).

**Catalog-resolution pattern** (`src/domain/scheduler.ts:188-193`):
```typescript
for (const planting of plan.plantings) {
  const plant = catalog.get(planting.plantId);
  if (!plant) continue; // Missing plant: silently skip in Phase 1; Plan 05 doesn't exercise.
  all.push(...eventsForPlanting(planting, plant, plan));
}
```
**Apply to expandSuccessions:** same loop shape, same `catalog.get(plantId)` lookup, same "missing plant: silently skip" pattern (consistency with Pitfall D).

**Anchor-computation pattern** (`src/domain/scheduler.ts:34-45` — indoor-start branch):
```typescript
if (t.startMethod === 'indoor-start') {
  const weeks = t.weeksIndoorBeforeLastFrost ?? 6;
  const indoorStart = subDays(lastFrost, weeks * 7);
  const transplant = addDays(lastFrost, t.transplantOffsetDaysFromLastFrost ?? 0);
  // ...
}
```
**Apply to succession cap math:** same `t.startMethod === 'indoor-start' ? transplantOffset : directSowOffset` branching to compute `baseAnchor`, then `differenceInDays(firstFrost, baseAnchor)` to derive `maxIndex` per Pattern 1 in RESEARCH.md (already specified there).

**Sort/dedup tail** (`src/domain/scheduler.ts:194-200`):
```typescript
all.sort((a, b) => {
  if (a.start !== b.start) return a.start < b.start ? -1 : 1;
  if (a.type !== b.type) return a.type < b.type ? -1 : 1;
  return a.id < b.id ? -1 : 1;
});
```
**Note:** succession.ts does NOT sort (returns `GardenPlan` with plantings in insert order — index 0 first, then s1..sN). The sort lives downstream in `generateSchedule`.

---

### `src/domain/scheduler.ts` (EXTEND — wire succession pre-pass)

**Analog:** self (Phase 1).

**No structural changes.** Per RESEARCH.md §Pattern 1, the pre-pass approach means `generateSchedule()` stays byte-identical for non-succession plans. Phase 1 snapshots remain green.

**Integration point:** `useDerivedSchedule.ts` (NOT scheduler.ts) calls `expandSuccessions(plan, catalog)` first, then passes the result to `generateSchedule`. See pattern below.

**Optional defensive guard** (Pitfall D — custom plant with missing DTM):
```typescript
// Add at scheduler.ts:191 inside the per-planting loop, before resolving the plant:
if (!plant || !plant.timing.daysToMaturity || plant.timing.daysToMaturity <= 0) continue;
```
Keeps existing "silently skip" semantics; tightens the tolerance for v1 user-authored plants.

---

### `src/domain/types.ts` (EXTEND)

**Analog:** self (Phase 1).

**Imports pattern** (`src/domain/types.ts:8-9` — purity comment):
```typescript
// Purity invariant (RESEARCH.md §Pattern 1): this file has ZERO runtime imports.
// Only `import type` (currently none — every type is defined in this file) is allowed.
```
**Apply to extension:** keep zero runtime imports. New fields are purely type-level additions.

**Required Phase 2 additions** (per CONTEXT D-05, D-21, RESEARCH §Pattern 3):
```typescript
// Add to existing Location interface (after line 60):
export interface Location {
  zip: string;
  zone: string;
  lastFrostDate: string;
  firstFrostDate: string;
  source: 'lookup' | 'manual';
  lookupTimestamp?: string;
  // Phase 2 (D-05): per-field override flags
  overrides?: {
    zone?: boolean;
    lastFrostDate?: boolean;
    firstFrostDate?: boolean;
  };
}

// Add to existing Planting interface (after line 68):
export interface Planting {
  id: string;
  plantId: string;
  label?: string;
  successionIndex: number;
  notes?: string;
  // Phase 2 (D-21): toggle for engine pre-pass expansion
  successionEnabled?: boolean;
}

// Bump GardenPlan.schemaVersion literal:
export interface GardenPlan {
  schemaVersion: 2;  // was 1 in Phase 1
  // ... rest unchanged
}
```

**Critical:** Phase 1's `enrichment?: Record<string, never>` widens to `Record<string, unknown>` in Phase 2 (per `src/domain/schemas.ts` PlantSchema spec in RESEARCH.md line 582).

---

### `src/domain/dateWrappers.ts` (EXTEND — add `nowISOString` helper)

**Analog:** self (Phase 1).

**Existing helpers** (`src/domain/dateWrappers.ts:22-66`): `parseDate`, `toISODate`, `formatDateShort`, `addDays`, `subDays`, `differenceInDays`.

**ESLint-allowed `new Date()` call site** (`src/domain/dateWrappers.ts:25-27`):
```typescript
export function parseDate(iso: string): UTCDate {
  const trimmed = iso.length === 10 ? `${iso}T12:00:00Z` : iso;
  // eslint-disable-next-line no-restricted-syntax -- THIS is the allowed site (SCH-03).
  return new UTCDate(new Date(trimmed));
}
```
**Apply to `nowISOString`:** same `eslint-disable-next-line` comment style, same justification ("THIS is the allowed site"):
```typescript
/**
 * Current time as ISO string. The canonical "now" for updatedAt, exportedAt,
 * lookupTimestamp. Replaces ad-hoc `new Date().toISOString()` sites elsewhere.
 */
export function nowISOString(): string {
  // eslint-disable-next-line no-restricted-syntax -- THIS is the allowed site (Phase 2 extension of SCH-03).
  return new Date().toISOString();
}
```
**Add helper** (per RESEARCH.md Example D, line 1286): `lastDayOfMonth(year: number, month: number): number` — same eslint exemption pattern.

---

### `src/domain/migrations.ts` (NEW — shared between store and importer)

**Analog:** `src/domain/scheduler.ts` (purity model + module shape).

**Why this module exists:** Pitfall E (migration drift between `planStore.migrate` and `importPlan.parseImportFile`).

**Module shape** (mirrors scheduler.ts header):
```typescript
// src/domain/migrations.ts
// Single source of truth for schema-version migrations. Imported by BOTH
// stores/planStore.ts (Zustand `persist.migrate`) AND
// features/settings/importPlan.ts (v1-export migration on import).
// Pitfall E: do not duplicate this logic in either consumer.
//
// Purity: zero React/Zustand/I/O; date math via dateWrappers only.
```

**Migration function shape** (mirrors RESEARCH.md Pattern 4 lines 668-693):
```typescript
import type { GardenPlan } from './types';

export const CURRENT_SCHEMA_VERSION = 2;

export type AnyVersionedPlan = unknown; // We don't have v1 types still in the codebase

export function migrateToCurrent(
  plan: AnyVersionedPlan,
  fromVersion: number,
): GardenPlan | null {
  let s: any = plan;
  for (let v = fromVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const m = migrations[v];
    if (m) s = m(s);
  }
  return s as GardenPlan | null;
}

const migrations: Record<number, (s: any) => any> = {
  2: (state: any) => {
    // 1 → 2: location.overrides defaults to {}; plantings get successionEnabled: false
    if (!state || typeof state !== 'object') return state;
    if (!state.plan) return { ...state, plan: null };
    return {
      ...state,
      plan: {
        ...state.plan,
        schemaVersion: 2,
        location: { ...state.plan.location, overrides: {} },
        plantings: state.plan.plantings.map((p: any) => ({
          ...p,
          successionEnabled: false, // safe default per RESEARCH.md line 678
        })),
      },
    };
  },
};
```

---

### `src/stores/planStore.ts` (EXTEND — bump v2, add setters, wire migration)

**Analog:** self (Phase 1).

**Persist wiring pattern** (`src/stores/planStore.ts:6-39`):
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GardenPlan } from '../domain/types';

interface PlanState {
  plan: GardenPlan | null;
}

const SCHEMA_VERSION = 1;

const migrations: Record<number, (state: unknown) => unknown> = {};

export const usePlanStore = create<PlanState>()(
  persist(
    (): PlanState => ({
      plan: null,
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
**Phase 2 changes:**
1. Bump `SCHEMA_VERSION = 2`.
2. Replace local `migrations` object with import from `../domain/migrations` (Pitfall E).
3. Add setters per RESEARCH.md Pattern 4 lines 695-727 — verbatim shape: `setLocation`, `addPlanting`, `removePlanting`, `toggleSuccession`, `upsertCustomPlant`, `removeCustomPlant`, `loadSamplePlan`, `replacePlan`, `exportPlanSnapshot`.
4. Use `nowISOString()` (NEW dateWrapper helper) instead of `new Date().toISOString()` for `updatedAt` writes.

**Setter shape pattern** (set→if-plan-else-noop):
```typescript
addPlanting: (planting) => set(s => s.plan
  ? { plan: { ...s.plan, plantings: [...s.plan.plantings, planting], updatedAt: nowISOString() } }
  : s
),
```
**Apply to all setters:** never mutate `s.plan` if null — return `s` unchanged. The wizard ensures Step 1 sets location before Step 2 adds plantings.

---

### `src/stores/catalogStore.ts` (NEW)

**Analog:** `src/stores/planStore.ts`.

**Imports + persist scaffolding** — copy from planStore.ts verbatim, swap key name:
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Plant } from '../domain/types';
import { curatedCatalog } from '../assets/catalog';

interface CatalogState {
  customPlants: Plant[];
  permapeopleCache: Record<string, Plant['enrichment']>;
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
    {
      name: 'garden-gantt:catalog',  // distinct from 'garden-gantt:plan'
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Selector — call as: const merged = useCatalogStore(selectMerged)
export function selectMerged(s: CatalogState): ReadonlyMap<string, Plant> {
  const map = new Map<string, Plant>();
  for (const p of curatedCatalog) map.set(p.id, p);
  for (const p of s.customPlants) map.set(p.id, p);  // custom override curated by id
  return map;
}
```
**Wire** in `main.tsx` (alongside `usePlanStore`): `withStorageDOMEvents(useCatalogStore as unknown as StoreWithPersist)` for multi-tab sync (DATA-06 framework reused).

---

### `src/stores/uiStore.ts` (EXTEND)

**Analog:** self (Phase 1).

**In-memory pattern** (`src/stores/uiStore.ts:6-20`):
```typescript
import { create } from 'zustand';

interface UIState {
  bannerDismissed: boolean;
  isStorageAvailable: boolean;
  setBannerDismissed: (v: boolean) => void;
  setStorageAvailable: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  bannerDismissed: false,
  isStorageAvailable: true,
  setBannerDismissed: (v) => set({ bannerDismissed: v }),
  setStorageAvailable: (v) => set({ isStorageAvailable: v }),
}));
```
**Phase 2 additions** (per CONTEXT specifics + RESEARCH.md Pitfall K):
```typescript
interface UIState {
  // ...phase 1
  myPlanPanelOpen: boolean;
  filterChips: Set<string>;          // selected chips, in-memory only (Pitfall K)
  searchQuery: string;
  importPreviewOpen: boolean;
  setMyPlanPanelOpen: (v: boolean) => void;
  toggleFilterChip: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setImportPreviewOpen: (v: boolean) => void;
}
```
**Critical (RESEARCH.md anti-pattern line 1046):** do NOT add wizard step state here — keep that in local React state per step.

---

### `src/data/permapeople.ts` (NEW — sole fetch site)

**Analog:** `src/data/storage.ts` (other sole-I/O-boundary module).

**File header pattern** (`src/data/storage.ts:1-5`):
```typescript
// src/data/storage.ts
// The SOLE module in src/ that touches localStorage.
// Source: [VERIFIED: developer.mozilla.org/en-US/docs/Web/API/Storage/setItem]
//         [VERIFIED: zustand persist withStorageDOMEvents pattern via Context7 /pmndrs/zustand]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Code Examples lines 662–698]
```
**Apply to permapeople.ts:**
```typescript
// src/data/permapeople.ts
// The SOLE module in src/ that calls fetch() to Permapeople (or its proxy).
// Per ARCHITECTURE.md §I/O boundary one-write rule.
// Source: [VERIFIED: live probe of permapeople.org/api/search OPTIONS returned 404]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md §Pattern 5]
```

**Try/catch + structured-result pattern** (`src/data/storage.ts:13-21`):
```typescript
export function probeStorage(): boolean {
  try {
    window.localStorage.setItem(PROBE_KEY, '1');
    window.localStorage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}
```
**Apply to permapeople.ts** — same shape but discriminated-union return per RESEARCH.md Pattern 5 lines 762-767:
```typescript
export type PermapeopleResult =
  | { status: 'ok'; data: EnrichmentFields }
  | { status: 'not-found' }
  | { status: 'rate-limited' }
  | { status: 'unreachable'; reason: 'cors' | 'network' | 'timeout' | 'http-5xx' | 'invalid-json' };
```
Full implementation in RESEARCH.md lines 768-825 — copy verbatim.

**AbortController + timeout pattern:** RESEARCH.md lines 769-770 (Pitfall I — race condition on modal close).

---

### `src/data/zones.ts` (NEW — same-origin static fetch)

**Analog:** `src/data/storage.ts`.

**Module structure:** copy storage.ts header comment style. The `lookupLocation` implementation is fully specified in RESEARCH.md Example A lines 1136-1185 — copy verbatim.

**In-memory cache pattern** (`src/data/zones.ts` lines 1148-1171 from RESEARCH.md):
```typescript
const cache = new Map<number, Record<string, ZoneRow> | null>();
// On miss: fetch + populate; on failure: set to null (negative-cache to avoid retry storm)
```
**Note:** This module fetches same-origin static assets (`/data/zones.{n}.json`); it's an I/O boundary architecturally but does not require the Worker proxy.

---

### `scripts/build-zone-data.ts` (NEW build script)

**Analog:** none in the repo (first build script).

**Pattern source:** RESEARCH.md §Pattern 2 lines 484-523. The script is a one-shot Node program with three stages: (1) read pre-downloaded raw inputs from `scripts/_raw/`, (2) join ZIP centroids → nearest GHCN station, (3) split by first ZIP digit → 10 chunks.

**package.json wiring:**
```json
"scripts": {
  "build:data": "tsx scripts/build-zone-data.ts"
}
```

**Output schema** (RESEARCH.md lines 459-475) — pin in `src/data/zones.ts` `ZoneRow` interface for client-side type safety.

**Critical decisions (planner picks):**
- v1 subset (top ~5-10K populated ZIPs) vs full coverage (~42K). RESEARCH.md recommends subset (line 527).
- Commit raw inputs (`scripts/_raw/frostline-zips.json`, `scripts/_raw/noaa-frost-stations.csv`) and outputs (`public/data/zones.{0..9}.json`) to git for reproducibility.

---

### `cors-proxy/src/index.ts` (NEW Cloudflare Worker — sibling repo dir)

**Analog:** none.

**Pattern source:** RESEARCH.md §Pattern 5 lines 829-877 — copy verbatim. The Worker is stateless, ~30 LOC, holds Permapeople API key as Wrangler secret, adds CORS headers.

**Critical:** ALLOWED_ORIGIN check via `wrangler secret put`. The Worker is "backend" only in the trivial sense — no user data crosses it (D-17).

**Wrangler config:** RESEARCH.md lines 882-888.

---

### `src/features/setup/SetupWizard.tsx` (NEW — wizard shell)

**Analog:** `src/app/AppShell.tsx`.

**Imports pattern** (`src/app/AppShell.tsx:1-4`):
```typescript
import { useEffect, useState, type ReactNode } from 'react';
import { Banner } from './Banner';
```
**Apply to wizard:** `useState` for current step (NOT persisted — Pitfall: anti-pattern line 1046), `useEffect` to read `planStore.plan` on mount and decide initial step.

**Hash-routing pattern** (`src/app/AppShell.tsx:19-29`):
```typescript
function useCurrentHash(): string {
  const [hash, setHash] = useState<string>(() =>
    typeof window === 'undefined' ? '' : window.location.hash || '#/plan',
  );
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/plan');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}
```
**Apply to wizard step navigation:** prefer `useNavigate()` from `react-router` for `Finish → /plan` (existing dep — main.tsx already wraps in `<HashRouter>`).

**Layout shell pattern** (`src/app/AppShell.tsx:38-72`) — copy the `<header><nav><main>` structure for the step indicator + bottom action bar.

**Active-state styling pattern** (`src/app/AppShell.tsx:53-55`):
```typescript
const className = isActive
  ? 'text-sm font-medium text-green-700 underline underline-offset-4 decoration-2'
  : 'text-sm font-medium text-stone-600 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700';
```
**Apply to step indicator circles:** active = green-700 fill; completed = green-700 + check; pending = stone-200 outline. Same green-700 anchor as nav.

---

### `src/features/setup/SetupStepLocation.tsx` (NEW)

**Analog:** `src/app/Banner.tsx` (closest form-shaped block in Phase 1).

**Form-row + helper-text pattern** (UI-SPEC §2 — extends Banner's stack pattern):
```typescript
// src/app/Banner.tsx:14-23 — block layout, sticky/aside-like containers
<aside role="status" aria-live="polite" className="...">
  <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
    <div>
      <p className="text-sm font-semibold">Heading</p>
      <p className="mt-1 text-sm font-normal">Body</p>
    </div>
```
**Apply to error block** (UI-SPEC §2 unrecognized-ZIP) — same `aria-live="polite"`, same heading-over-body stack, swap `amber` for the error block.

**Async lookup pattern** — see `src/features/setup/lookupLocation.ts` below.

**Override flag pattern:** new `Location.overrides` field per `src/domain/types.ts` extension. Clicking `Override` flips the row to manual input AND sets the corresponding override flag in `plan.location.overrides`.

---

### `src/features/setup/lookupLocation.ts` (NEW — hook wrapper)

**Analog:** `src/features/gantt/useDerivedSchedule.ts`.

**useMemo + store-read pattern** (`src/features/gantt/useDerivedSchedule.ts:14-19`):
```typescript
export function useDerivedSchedule(): ScheduleEvent[] {
  return useMemo(() => generateSchedule(samplePlan, sampleCatalog), []);
}
```
**Apply to lookupLocation hook:** `useState<LookupResult>` + `useEffect` that calls async `lookupLocation(zip)` from `data/zones.ts`. Memoize per `zip`.
```typescript
export function useLookupLocation(zip: string, year: number) {
  const [result, setResult] = useState<LookupResult | { status: 'idle' } | { status: 'loading' }>({ status: 'idle' });
  useEffect(() => {
    if (!/^\d{5}$/.test(zip)) { setResult({ status: 'idle' }); return; }
    setResult({ status: 'loading' });
    let cancelled = false;
    lookupLocation(zip, year).then(r => { if (!cancelled) setResult(r); });
    return () => { cancelled = true; };
  }, [zip, year]);
  return result;
}
```

---

### `src/features/setup/SetupStepPlants.tsx` & `src/features/catalog/CatalogBrowser.tsx`

**Analog:** `src/features/gantt/GanttView.tsx` (rich UI driven from store-derived data).

**Store-read + useMemo pattern** (`src/features/gantt/GanttView.tsx:28-56`):
```typescript
export function GanttView() {
  const events = useDerivedSchedule();
  const plantings = samplePlan.plantings;

  const eventsByPlanting = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const e of events) {
      const list = map.get(e.plantingId) ?? [];
      list.push(e);
      map.set(e.plantingId, list);
    }
    return map;
  }, [events]);
  // ...
}
```
**Apply to CatalogBrowser:** same shape — read `useCatalogStore(selectMerged)` for the full catalog Map, read `useUIStore` for `searchQuery + filterChips`, useMemo to compute filtered list:
```typescript
export function CatalogBrowser() {
  const catalog = useCatalogStore(selectMerged);
  const search = useUIStore(s => s.searchQuery);
  const chips = useUIStore(s => s.filterChips);
  const myPlantingIds = usePlanStore(s => new Set((s.plan?.plantings ?? []).map(p => p.plantId)));

  const filtered = useMemo(
    () => applyFilters(Array.from(catalog.values()), search, chips),
    [catalog, search, chips],
  );
  // render grid...
}
```

**Pinned "+ Add custom plant" first-cell pattern** — render outside the `.map()` as a literal first child:
```jsx
<ul role="list" className="grid ...">
  <li><AddCustomPlantCard onClick={openModal} /></li>
  {filtered.map(plant => <li key={plant.id}><PlantCard plant={plant} added={myPlantingIds.has(plant.id)} /></li>)}
</ul>
```

---

### `src/features/catalog/PlantCard.tsx` (NEW)

**Analog:** `src/app/PlaceholderRoute.tsx` (closest small presentational component).

**Component shape** (`src/app/PlaceholderRoute.tsx:1-16`):
```typescript
interface PlaceholderRouteProps {
  heading: string;
  body: string;
}

export function PlaceholderRoute({ heading, body }: PlaceholderRouteProps) {
  return (
    <div className="text-center py-16">
      <h1 className="text-3xl font-semibold text-stone-900">{heading}</h1>
      <p className="mt-4 text-base text-stone-600 max-w-prose mx-auto">{body}</p>
    </div>
  );
}
```
**Apply to PlantCard:** same single-export-named-function-with-Props-interface shape. PlantCard's badge variants (frost-tolerance, season, custom, permapeople) drive class composition via `cn()` helper. UI-SPEC §4 specifies all badge tokens.

---

### `src/features/catalog/filters.ts` (NEW — pure filter logic)

**Analog:** `src/domain/constraints.ts` (registry of pure rules).

**Registry pattern** (`src/domain/constraints.ts:14-45`):
```typescript
interface ConstraintRule {
  name: string;
  appliesTo: (event: ScheduleEvent, plant: Plant) => boolean;
  check: (event: ScheduleEvent, candidate: string, plan: GardenPlan, plant: Plant) => ConstraintResult;
}

const rules: ConstraintRule[] = [noTransplantBeforeLastFrostForTender];

export function canMove(event, candidate, plan, plant): ConstraintResult { /* iterate rules */ }
```
**Apply to filters.ts:** chip predicates as a registry, "OR within group, AND across groups" reducer:
```typescript
type ChipGroup = 'season' | 'category';
interface FilterChip {
  id: string;       // 'cool-season' | 'leafy' | ...
  group: ChipGroup;
  predicate: (plant: Plant) => boolean;
}

export const chips: readonly FilterChip[] = [
  { id: 'cool-season', group: 'season', predicate: (p) => p.timing.frostTolerance === 'hardy' || p.timing.frostTolerance === 'half-hardy' },
  // ...8 total
];

export function applyFilters(catalog: Plant[], search: string, activeChips: Set<string>): Plant[] {
  // 1) Search filter (case-insensitive against name + scientificName, em-dash↔hyphen tolerant)
  // 2) Group chips by `group`; within a group OR; across groups AND.
  // 3) Sort alphabetically by name.
}
```

---

### `src/features/catalog/CustomPlantModal.tsx`, `MyPlanPanel.tsx`, `MyPlanPill.tsx`

**Analog:** none in Phase 1 (no modals or drawers shipped). Use **Radix primitives directly**.

**Radix Dialog pattern** (RESEARCH.md §Don't Hand-Roll, line 1060):
- Use `@radix-ui/react-dialog` with `<Dialog.Root>`/`<Dialog.Trigger>`/`<Dialog.Portal>`/`<Dialog.Overlay>`/`<Dialog.Content>`.
- Wrap in `src/ui/Dialog.tsx` with shadcn-style class composition via `cn()` helper.
- Focus trap + esc-to-close + scrim are built in.

**Open-state pattern:** drive from `uiStore` (`myPlanPanelOpen`, `importPreviewOpen`) so the AppShell `MyPlanPill` button can flip it without a Context wrapper.

**No direct Phase 1 analog for slide-out drawer** — Radix Dialog's content can be styled with `data-state=open/closed` + Tailwind transition utilities to slide from the right (UI-SPEC §5).

---

### `src/features/settings/SettingsPanel.tsx` & `exportPlan.ts` & `importPlan.ts` & `ImportPreviewModal.tsx`

**Analog for SettingsPanel:** `src/app/PlaceholderRoute.tsx` (currently rendered at `/settings`; Phase 2 replaces).

**Analog for exportPlan.ts / importPlan.ts:** `src/data/storage.ts` (only browser-API-boundary precedent).

**Pure-API pattern** — exportPlan/importPlan are NOT React components; they're pure functions called from Settings buttons. Implementation fully specified in RESEARCH.md §Pattern 6 lines 896-992.

**Critical:** `importPlan.ts:migrateV1ToV2` is replaced by `import { migrateToCurrent } from '../../domain/migrations'` per Pitfall E. Don't duplicate migration logic.

**ESLint:** `new Date().toISOString()` calls in exportPlan.ts use `nowISOString()` from `dateWrappers.ts` (per Phase 2 dateWrappers extension).

---

### `src/features/gantt/GanttView.tsx` (EXTEND)

**Analog:** self (Phase 1).

**Existing axis-bounds pattern** (`src/features/gantt/GanttView.tsx:34-43`):
```typescript
const lastFrostYear = parseInt(samplePlan.location.lastFrostDate.slice(0, 4), 10);
const scale = useMemo(
  () =>
    createTimeScale({
      start: `${lastFrostYear}-01-01`,
      end: `${lastFrostYear + 1}-12-31`,
      pxPerDay: PX_PER_DAY,
    }),
  [lastFrostYear],
);
```
**Phase 2 replacement:** RESEARCH.md Example D lines 1252-1283 — derive bounds from `min(events.start)` / `max(events.end)`, round to month boundaries. Add `lastDayOfMonth(year, month)` helper to `dateWrappers.ts` (eslint-allowed site).

**Plan-source pattern (PHASE 2 BREAKING CHANGE):**
```typescript
// Phase 1:
const plantings = samplePlan.plantings;

// Phase 2:
const plan = usePlanStore(s => s.plan);
if (!plan) return <EmptyGanttState />;
const plantings = plan.plantings;
```

**Empty state:** new `<EmptyGanttState />` component when `plan === null` — heading + body + CTA pointing to `/setup`. Mirror `PlaceholderRoute.tsx` shape.

**Succession row accent pattern** (UI-SPEC §8 — D-22) — for plantings with `successionIndex > 0`:
```jsx
<rect x={LABEL_WIDTH - 4} y={rowY + 4} width={4} height={ROW_HEIGHT - 8} fill="#A8A29E" />
```
4px stone-400 left-edge accent on grouped succession rows. Place in the SVG `<g className="rows">` block before each row's bars.

**Existing data-attrs pattern** (`src/features/gantt/GanttView.tsx:144-145, 162-165`) — already shipped, Phase 3 drag-ready:
```jsx
<g data-planting-id={p.id} transform={`translate(0, ${rowY})`}>
  <rect data-event-id={e.id} data-event-type={e.type} data-planting-id={p.id} ... />
```
**Apply unchanged.**

---

### `src/features/gantt/useDerivedSchedule.ts` (EXTEND — wire stores + succession)

**Analog:** self (Phase 1).

**Existing pattern** (`src/features/gantt/useDerivedSchedule.ts:14-19`):
```typescript
export function useDerivedSchedule(): ScheduleEvent[] {
  return useMemo(() => generateSchedule(samplePlan, sampleCatalog), []);
}
```
**Phase 2 replacement** (RESEARCH.md §Pattern 1 lines 432-449 — verbatim):
```typescript
import { useMemo } from 'react';
import { usePlanStore } from '../../stores/planStore';
import { useCatalogStore, selectMerged } from '../../stores/catalogStore';
import { generateSchedule } from '../../domain/scheduler';
import { expandSuccessions } from '../../domain/succession';
import type { ScheduleEvent } from '../../domain/types';

export function useDerivedSchedule(): ScheduleEvent[] {
  const plan = usePlanStore(s => s.plan);
  const catalog = useCatalogStore(selectMerged);
  return useMemo(() => {
    if (!plan) return [];
    const expanded = expandSuccessions(plan, catalog);
    return generateSchedule(expanded, catalog);
  }, [plan, catalog]);
}
```

---

### `src/app/AppShell.tsx` (EXTEND)

**Analog:** self (Phase 1).

**NAV_LINKS already includes `/setup`** (`src/app/AppShell.tsx:13-17`) — no change needed.

**Phase 2 additions:**
1. `<MyPlanPill>` floating in the header right side (after `<nav>`):
```jsx
<header ...>
  <div className="flex items-baseline gap-3">...</div>
  <nav>...</nav>
  <MyPlanPill /> {/* Phase 2 — counts plan.plantings */}
</header>
```
2. `<MyPlanPanel>` rendered as a sibling of `<main>` (Radix Dialog mounted in portal):
```jsx
<>
  <Banner />
  <header>...</header>
  <main>{children}</main>
  <MyPlanPanel /> {/* drives from uiStore.myPlanPanelOpen */}
  <PermapeopleAttributionFooter /> {/* per UI-SPEC §10, conditional */}
</>
```

---

### `src/app/App.tsx` (EXTEND)

**Analog:** self (Phase 1).

**Existing routes** (`src/app/App.tsx:18-49`) — replace 3 of 4 placeholders:
```typescript
<Route path="/setup" element={<SetupWizard />} />     // was PlaceholderRoute
<Route path="/plan" element={<GanttView />} />        // unchanged (now reads usePlanStore)
<Route path="/catalog" element={<CatalogBrowser />} />// NEW route per UI-SPEC §3
<Route path="/tasks" element={<PlaceholderRoute ... />} /> // KEEP — Phase 3
<Route path="/settings" element={<SettingsPanel />} />// was PlaceholderRoute
```
**Note:** `/catalog` route addition — UI-SPEC §3 mentions "same browser is reused at `/catalog`". Wire in NAV_LINKS too.

---

### `src/assets/catalog.ts` (EXTEND 4→50)

**Analog:** self (Phase 1).

**Existing pattern** (`src/assets/catalog.ts:10-89` — per-plant `const`):
```typescript
const tomato: Plant = {
  id: 'tomato',
  source: 'curated',
  name: 'Tomato',
  scientificName: 'Solanum lycopersicum',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 6,
    transplantOffsetDaysFromLastFrost: 14,
    daysToGermination: [5, 10],
    daysToHardenOff: 7,
    daysToMaturity: 75,
    harvestWindowDays: 60,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: true,
  },
};
```
**Phase 2 extension pattern** (RESEARCH.md Example B lines 1187-1228):
1. **KEEP existing 4 plants unchanged** (Pitfall G — preserves snapshot-test invariants).
2. Add ~46 variety-level entries with kebab-case ids: `'tomato-cherokee-purple'`, `'lettuce-black-seeded-simpson'`, etc.
3. Export both `curatedCatalog: readonly Plant[]` (for catalog UI) AND `sampleCatalog: ReadonlyMap<string, Plant>` (preserves Phase 1 API surface — RESEARCH.md line 1226-1228).

**50-plant suggested set:** RESEARCH.md lines 1232-1244 (~9 fruiting, 8 leafy, 6 brassica, 6 root, 5 allium, 4 legume, 3 cucurbit, 9 herbs).

**Naming convention** (CONTEXT specifics): `"Tomato — Cherokee Purple"` (em-dash). Search must tolerate hyphen too.

---

### `src/ui/cn.ts` (NEW — className helper)

**Analog:** `src/domain/ids.ts` (pure 1-line helper).

**Single-export pattern** (`src/domain/ids.ts:9-13`):
```typescript
export function plantingId(plantId: string, successionIndex = 0): string {
  return successionIndex === 0 ? `p-${plantId}` : `p-${plantId}-s${successionIndex}`;
}
```
**Apply to cn.ts:**
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

---

### Tests — pattern by category

#### `tests/domain/succession.test.ts` (NEW)

**Analog:** `tests/domain/dateWrappers.test.ts` (pure node-env, no `@vitest-environment`).

**Test fixtures pattern** (`tests/domain/scheduler.snapshot.test.ts:10-33`):
```typescript
const baseLocation = {
  zip: '20001', zone: '7a',
  lastFrostDate: '2026-04-15T12:00:00.000Z',
  firstFrostDate: '2026-10-20T12:00:00.000Z',
  source: 'manual' as const,
};

const planFor = (plantId: string, locationOverrides = {}): GardenPlan => ({
  schemaVersion: 1, id: 'snapshot-fixture', name: 'Snapshot test plan',
  // ...
  plantings: [{ id: `p-${plantId}`, plantId, successionIndex: 0 }],
  // ...
});
```
**Apply to succession tests** — same `planFor()` factory, set `successionEnabled: true` on the planting, assert `expandSuccessions(plan, catalog).plantings.length` matches RESEARCH.md Pitfall F boundary fixtures.

**Snapshot pattern** (`tests/domain/scheduler.snapshot.test.ts:36-50`):
```typescript
it('tomato (frost-tender, indoor-start, fruiting)', () => {
  expect(generateSchedule(planFor('tomato'), sampleCatalog)).toMatchSnapshot();
});
```
**Apply to succession snapshots** — RESEARCH.md Example E lines 1290-1298 shows the test file shape. Snapshot the full expanded plan output.

#### `tests/stores/catalogStore.test.ts` (NEW)

**Analog:** `tests/stores/planStore.test.ts` (exact match).

**happy-dom pragma + reset pattern** (`tests/stores/planStore.test.ts:1-13`):
```typescript
/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('usePlanStore — persist wiring (DATA-01, DATA-02)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });
  // ...
});
```
**Apply to catalogStore tests:** copy verbatim; swap key name to `'garden-gantt:catalog'`; test customPlants CRUD + permapeopleCache size cap (Pitfall H).

#### `tests/stores/planStore.test.ts` (EXTEND for v2 + setters)

**Analog:** self (Phase 1).

**Existing version-assertion pattern** (`tests/stores/planStore.test.ts:21-28`):
```typescript
it('persist middleware uses the canonical key name and version', async () => {
  const { usePlanStore } = await import('../../src/stores/planStore');
  const options = (usePlanStore as unknown as {
    persist: { getOptions: () => { name: string; version: number } };
  }).persist.getOptions();
  expect(options.name).toBe('garden-gantt:plan');
  expect(options.version).toBe(1);  // BUMP TO 2 in Phase 2
});
```
**Phase 2 update:** `expect(options.version).toBe(2)`. Add new tests:
1. Setters mutate `plan` correctly (`setLocation`, `addPlanting`, `toggleSuccession`).
2. `loadSamplePlan()` populates `plan` with structuredClone of sample (Pitfall: anti-pattern line 1044 — don't mutate `samplePlan`).
3. Migration: pre-seed v1 JSON in localStorage, import store, assert plan migrated to v2 with `overrides: {}` and `successionEnabled: false`.

**Corrupt JSON tolerance pattern** (`tests/stores/planStore.test.ts:31-46`) — preserve, still applies in v2.

#### `tests/data/zones.test.ts` & `tests/data/permapeople.test.ts` (NEW — MSW required)

**Analog:** `tests/data/storage.test.ts`.

**happy-dom + setup/teardown pattern** (`tests/data/storage.test.ts:1-13`):
```typescript
/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```
**Apply with MSW** — set up MSW server in `beforeAll`, reset handlers in `afterEach`. Mock:
- `GET /data/zones.2.json` → return canned chunk for `zones.test.ts`.
- `POST /permapeople-proxy/search` → return canned plant data for `permapeople.test.ts`. Test all five `PermapeopleResult` status branches (ok, not-found, rate-limited, unreachable×4 reasons).

#### `tests/features/settings/exportPlan.test.ts` & `importPlan.test.ts` (NEW)

**Analog:** `tests/data/storage.test.ts`.

**Pattern:** round-trip test — call `exportPlan()` → capture Blob via spy on `URL.createObjectURL`, parse JSON, feed to `parseImportFile()`, assert the resulting plan deep-equals the original. Pitfall E mitigation: import a Phase-1-shaped (v1) JSON, assert it migrates to v2 correctly.

#### `tests/domain/scheduler.snapshot.test.ts` (EXTEND)

**Analog:** self.

**Critical:** Phase 1's existing 7 snapshots stay byte-identical (RESEARCH.md note 4 line 137 — non-succession plans pass through `expandSuccessions` as identity). ADD new snapshots for: (a) succession-expanded lettuce, (b) variety-level plant from new catalog. DO NOT modify existing snapshots.

---

## Shared Patterns

### Authentication / Authorization

**N/A** — single-user, no auth, no backend with user data.

### Error Handling

**Source:** `src/app/ErrorBoundary.tsx` (top-level), discriminated-union returns elsewhere.

**Discriminated-union result pattern** (`src/domain/constraints.ts:10-12` — Phase 1 baseline):
```typescript
export type ConstraintResult =
  | { ok: true; finalDate: string; clamped?: false }
  | { ok: true; finalDate: string; clamped: true; reasons: string[] };
```
**Apply to:** `PermapeopleResult` (5 statuses), `LookupResult` (3 statuses), `ImportResult` (ok/invalid-json/invalid-schema/newer-version). Never throw across module boundaries; always return a tagged union.

**Top-level boundary** (`src/app/ErrorBoundary.tsx:12-37`):
```typescript
export class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): State { return { error }; }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }
  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="text-center py-16 px-4">
          <h1 className="text-3xl font-semibold text-stone-900">Something went wrong</h1>
          <p className="mt-4 text-base text-stone-600 max-w-prose mx-auto">
            {this.state.error.message || 'An unexpected error occurred.'} Refresh to try again.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
```
**Apply to:** all Phase 2 features — already wraps `<App />` in `main.tsx`. No extension needed.

### Validation

**Source:** Phase 1 has no runtime validation. Phase 2 introduces Zod (`src/domain/schemas.ts`).

**Apply to:** `importPlan.parseImportFile` (DATA-05); optionally to `usePlanStore` rehydrate via custom `partialize` callback (RESEARCH.md §Pattern 3 lines 532-535).

**Pattern source:** RESEARCH.md §Pattern 3 lines 542-637 — copy verbatim. Schemas are parallel-maintained with `domain/types.ts` (NOT inferred from Zod) per RESEARCH.md line 536 (avoids refactoring Phase 1 invariants).

### Logging

**Source:** `src/app/ErrorBoundary.tsx:21` — `console.error('[ErrorBoundary]', ...)` is the only Phase 1 logging site.

**Apply to:** Phase 4 will pipe to a service. Phase 2 stays with `console.error` for unrecoverable boundary cases; structured-result returns for everything else.

### File header comment style

**Source pattern:** every Phase 1 src/ file has the same header shape — short purpose line, verified/cited references in comments.

Examples:
- `src/domain/scheduler.ts:1-11` (engine purity invariant)
- `src/data/storage.ts:1-5` (sole I/O boundary, MDN refs)
- `src/stores/planStore.ts:1-5` (store purpose, citations)

**Apply to all new files:** copy this style. Cite `02-RESEARCH.md` and the relevant pattern section.

### ESLint `new Date()` discipline

**Source:** `eslint.config.js:23-47`.

**Existing rule:**
```javascript
{
  files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
  ignores: ['src/domain/dateWrappers.ts'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "NewExpression[callee.name='Date']",
        message: 'Direct `new Date(...)` is forbidden outside src/domain/dateWrappers.ts. Use parseDate() from dateWrappers instead.',
      },
    ],
  },
},
{
  files: ['src/features/gantt/**/*.{ts,tsx}'],
  rules: { 'no-restricted-syntax': 'off' },
},
```
**Phase 2 strategy:** do NOT widen the allowlist. Add `nowISOString()` and `lastDayOfMonth()` helpers to `dateWrappers.ts` as new allowed sites (already specified above). Per CONTEXT discretion line 88: "any new `new Date()` site needed beyond `dateWrappers.ts` and `src/features/gantt/**` should be discussed and added to the allowlist with a comment explaining why" — strict path is preferred.

### Tailwind v4 `@theme` token convention

**Source:** `src/index.css:4-19` — Phase 1 lifecycle palette + spacing tokens via `@theme {}`.

**Existing tokens** (`src/index.css:5-18`):
```css
@theme {
  --color-lifecycle-indoor-start: #3B82F6;
  --color-lifecycle-harden-off: #EAB308;
  /* ...6 lifecycle colors */
  --spacing-gantt-row-height: 32px;
  --spacing-gantt-row-gap: 8px;
  --spacing-gantt-bar-height: 20px;
  --spacing-gantt-axis-height: 32px;
  --spacing-gantt-label-width: 140px;
}
```
**Phase 2 additions** (UI-SPEC §Spacing + §Color new tokens):
```css
@theme {
  /* ...phase 1 unchanged */

  /* Phase 2 spacing additions per UI-SPEC §Spacing */
  --spacing-card-min: 240px;
  --spacing-card-gap: 16px;
  --spacing-modal-max-w: 640px;
  --spacing-panel-w: 400px;
  --spacing-pill-h: 36px;
  --spacing-wizard-max-w: 720px;

  /* Phase 2 badge tokens per UI-SPEC §Color new semantic accents */
  /* (use Tailwind utility classes directly — no new --color-* tokens needed
     because all Phase 2 accents map to existing Tailwind palette colors) */
}
```
**Critical:** UI-SPEC notes "Phase 1 lifecycle palette is locked" — don't redefine `--color-lifecycle-*`.

### Multi-tab persistence wiring

**Source:** `src/main.tsx:18` + `src/data/storage.ts:48-56`.

**Existing pattern:**
```typescript
// main.tsx
withStorageDOMEvents(usePlanStore);
```
**Phase 2 extension:** also wire `useCatalogStore`:
```typescript
withStorageDOMEvents(usePlanStore as unknown as StoreWithPersist);
withStorageDOMEvents(useCatalogStore as unknown as StoreWithPersist);
```

---

## No Analog Found

Files where Phase 1 provides no useful pattern. Planner should follow RESEARCH.md or external library docs.

| File | Role | Reason |
|------|------|--------|
| `scripts/build-zone-data.ts` | build-script | First Node-side build script in repo. Use RESEARCH.md §Pattern 2 + `tsx` library docs. |
| `cors-proxy/src/index.ts` | edge-function | First Cloudflare Worker. Use RESEARCH.md §Pattern 5 + Wrangler docs. |
| `src/ui/Dialog.tsx` / `DropdownMenu.tsx` / `Select.tsx` / `Switch.tsx` / `Toast.tsx` / `Card.tsx` / `Badge.tsx` / `Input.tsx` / `Label.tsx` | shadcn-style primitives | First UI primitive set. Use Radix docs + UI-SPEC §1's "copy-paste shadcn" rationale. ~300 LOC total per UI-SPEC line 33. |
| `src/features/catalog/CustomPlantModal.tsx` | modal/form | Phase 1 has no modals. Use Radix Dialog + the form pattern from `SetupStepLocation.tsx`. |
| `tests/features/gantt/GanttView.test.tsx` | component test | Phase 1 has no component tests. Use Vitest 4 happy-dom env + `@testing-library/react`. Optional — Phase 1 RESEARCH §6 deemed bare-SVG performance comfortable; component test value is marginal until Phase 3 drag work. |

---

## Metadata

**Analog search scope:** `/home/brock/src/garden_gantt/src/**` and `/home/brock/src/garden_gantt/tests/**`.

**Files scanned:** 24 source files + 6 test files + 1 config file (`eslint.config.js`) + 1 CSS file (`src/index.css`).

**Pattern extraction date:** 2026-04-26

**Cross-references:**
- `.planning/phases/02-data-layer-first-end-to-end/02-CONTEXT.md` — D-01..D-29
- `.planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md` — §Patterns 1-7, §Code Examples A-E, §Pitfalls A-K
- `.planning/phases/02-data-layer-first-end-to-end/02-UI-SPEC.md` — §Component Inventory 1-12
- `.planning/phases/01-foundation-schedule-engine/01-VERIFICATION.md` — Phase 1 shipped inventory
- Phase 1 source: `src/domain/scheduler.ts`, `src/domain/dateWrappers.ts`, `src/domain/constraints.ts`, `src/domain/types.ts`, `src/domain/ids.ts`, `src/domain/taskEmitter.ts`, `src/data/storage.ts`, `src/stores/planStore.ts`, `src/stores/uiStore.ts`, `src/features/gantt/GanttView.tsx`, `src/features/gantt/timeScale.ts`, `src/features/gantt/lifecyclePalette.ts`, `src/features/gantt/useDerivedSchedule.ts`, `src/app/AppShell.tsx`, `src/app/App.tsx`, `src/app/Banner.tsx`, `src/app/ErrorBoundary.tsx`, `src/app/PlaceholderRoute.tsx`, `src/assets/catalog.ts`, `src/samplePlan.ts`, `src/main.tsx`, `src/index.css`, `eslint.config.js`.
