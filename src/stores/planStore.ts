// src/stores/planStore.ts
// Phase 2: setter surface + v1->v2 migration via shared migrations module + sample-plan bootstrap.
// Phase 3 (Plan 03-02): wraps the existing slice in zundo `temporal` middleware (INSIDE persist),
// adds 6 setters that drag/lock/tasks features consume, exposes getTemporal() + useTemporalStore()
// as the public seams for the document-level Cmd-Z keybinding (historyBindings.ts) and the
// header undo/redo button (Plan 03-03 wires the button).
//
// Source: [VERIFIED: zustand persist + migrate docs via Context7 /pmndrs/zustand]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md §Pattern 4 lines 640-727]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md D-13, D-14, D-15, D-16, D-17, D-18, D-36]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-RESEARCH.md §Pattern 4 + Pitfall 3]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-PATTERNS.md §planStore EXTEND]
//
// Pitfall 3 (silent data loss): `persist(temporal(slice, ...), {...})` is the ONLY correct
// ordering. Reversing to `temporal(persist(...))` causes persist to serialize the entire
// `{pastStates, futureStates, ...}` envelope to localStorage — the materialized plan is
// then trapped behind a layer of history reconstruction on rehydrate. Test 1 in
// tests/stores/temporal.test.ts pins this invariant by reading the persisted envelope shape.
//
// Pitfall 4 (handleSet final-commit drop): the rAF debounce coalesces drag-stream updates
// into one history entry per pointerup (D-16). The `typeof requestAnimationFrame === 'undefined'`
// fallback covers pure-node environments; happy-dom + browsers have rAF.
//
// Pitfall E (RESEARCH.md Phase 2): the v1->v2 migration logic lives in src/domain/migrations.ts
// and is shared with src/features/settings/importPlan.ts (Plan 02-11). DO NOT duplicate it here.
//
// Plan 03-02 deviation: the persist `version` literal is held at the current
// CURRENT_SCHEMA_VERSION (2) — not bumped to 3 in this plan because Plan 03-01 (parallel
// wave 1) owns the schema bump and v3 migration registration. When 03-01 lands and
// CURRENT_SCHEMA_VERSION becomes 3, the persist version follows automatically because
// `version: SCHEMA_VERSION` reads from the migrations module.
import { create } from 'zustand';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { persist, createJSONStorage } from 'zustand/middleware';
import { temporal } from 'zundo';
import type { TemporalState } from 'zundo';
import type {
  CustomTask,
  EventType,
  GardenPlan,
  Location,
  Plant,
  Planting,
  ScheduleEdit,
} from '../domain/types';
import { migrateToCurrent, CURRENT_SCHEMA_VERSION } from '../domain/migrations';
import { nowISOString } from '../domain/dateWrappers';
import { samplePlan } from '../samplePlan';
import { useCatalogStore } from './catalogStore';

interface PlanState {
  plan: GardenPlan | null;
  setLocation: (location: Location) => void;
  addPlanting: (planting: Planting) => void;
  removePlanting: (plantingId: string) => void;
  toggleSuccession: (plantingId: string) => void;
  upsertCustomPlant: (plant: Plant) => void;
  removeCustomPlant: (plantId: string) => void;
  // D-15 full cascade: removes plant from BOTH catalogStore.customPlants AND plan.customPlants,
  // AND removes any plantings referencing it. Consumed by Plan 02-09's CatalogBrowser
  // cascade-confirm Dialog (UI shows the dialog BEFORE invoking this — setter assumes
  // confirmation already happened).
  removeCustomPlantWithCascade: (plantId: string) => void;
  loadSamplePlan: () => void; // D-03 "Try with sample plan"
  replacePlan: (plan: GardenPlan) => void; // D-28 import path
  exportPlanSnapshot: () => GardenPlan | null;
  // Phase 3 setters (Plan 03-02) — all are tracked by zundo temporal so undo/redo works.
  // commitEdit: append (or replace by (plantingId, eventType)) the drag-commit edit log.
  commitEdit: (edit: ScheduleEdit) => void;
  // setLock: per-event-type lock toggle (D-13). Locked events keep their dates during reflow.
  setLock: (plantingId: string, eventType: EventType, locked: boolean) => void;
  // Custom-task CRUD (D-30 — Phase 3 task surface).
  addCustomTask: (task: CustomTask) => void;
  editCustomTask: (id: string, patch: Partial<CustomTask>) => void;
  removeCustomTask: (id: string) => void;
  // toggleTaskCompletion: idempotent toggle on completedTaskIds (D-36). Composite key for
  // recurring tasks `${taskId}:${ISODate}`; bare taskId for one-off tasks.
  toggleTaskCompletion: (compositeKey: string) => void;
}

const SCHEMA_VERSION = CURRENT_SCHEMA_VERSION;

// Partialized shape under which zundo tracks history. Only `plan` enters the temporal
// store (setters and other state slots are not history-eligible).
type PartializedPlan = { plan: GardenPlan | null };

/**
 * Default GardenPlan factory — used when setLocation is dispatched on a null plan
 * (Setup Wizard Step 1: location is the first concrete commitment).
 * Phase 2 single-plan model; multi-plan deferred to v2.
 */
function createEmptyPlan(location: Location): GardenPlan {
  const now = nowISOString();
  return {
    schemaVersion: 3,
    id: 'plan-1',
    name: 'My Garden',
    createdAt: now,
    updatedAt: now,
    location,
    customPlants: [],
    plantings: [],
    customTasks: [],
    edits: [],
    completedTaskIds: [],
    settings: {
      units: 'imperial',
      weekStartsOn: 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };
}

export const usePlanStore = create<PlanState>()(
  persist(
    temporal(
      (set, get): PlanState => ({
        plan: null,

        setLocation: (location) =>
          set((s) =>
            s.plan
              ? { plan: { ...s.plan, location, updatedAt: nowISOString() } }
              : { plan: createEmptyPlan(location) },
          ),

        addPlanting: (planting) =>
          set((s) =>
            s.plan
              ? {
                  plan: {
                    ...s.plan,
                    plantings: [...s.plan.plantings, planting],
                    updatedAt: nowISOString(),
                  },
                }
              : s,
          ),

        removePlanting: (plantingId) =>
          set((s) =>
            s.plan
              ? {
                  plan: {
                    ...s.plan,
                    plantings: s.plan.plantings.filter((p) => p.id !== plantingId),
                    updatedAt: nowISOString(),
                  },
                }
              : s,
          ),

        toggleSuccession: (plantingId) =>
          set((s) =>
            s.plan
              ? {
                  plan: {
                    ...s.plan,
                    plantings: s.plan.plantings.map((p) =>
                      p.id === plantingId
                        ? { ...p, successionEnabled: !p.successionEnabled }
                        : p,
                    ),
                    updatedAt: nowISOString(),
                  },
                }
              : s,
          ),

        upsertCustomPlant: (plant) =>
          set((s) =>
            s.plan
              ? {
                  plan: {
                    ...s.plan,
                    customPlants: [
                      ...s.plan.customPlants.filter((p) => p.id !== plant.id),
                      plant,
                    ],
                    updatedAt: nowISOString(),
                  },
                }
              : s,
          ),

        // D-15 plan-side cascade: removing a custom plant unconditionally drops any plantings
        // referencing it (cascade is unconditional in the setter; UI presents the confirm).
        removeCustomPlant: (plantId) =>
          set((s) =>
            s.plan
              ? {
                  plan: {
                    ...s.plan,
                    customPlants: s.plan.customPlants.filter((p) => p.id !== plantId),
                    plantings: s.plan.plantings.filter((pl) => pl.plantId !== plantId),
                    updatedAt: nowISOString(),
                  },
                }
              : s,
          ),

        // D-15 FULL cascade: catalogStore.customPlants (canonical home) + plan.customPlants
        // (export portability) + plan.plantings (referencing plantings).
        removeCustomPlantWithCascade: (plantId) => {
          // Cross-store side effect: catalogStore is the canonical custom-plant home;
          // plan.customPlants holds a copy for export portability. Both must drop.
          useCatalogStore.getState().removeCustomPlant(plantId);
          set((s) =>
            s.plan
              ? {
                  plan: {
                    ...s.plan,
                    customPlants: s.plan.customPlants.filter((p) => p.id !== plantId),
                    plantings: s.plan.plantings.filter((pl) => pl.plantId !== plantId),
                    updatedAt: nowISOString(),
                  },
                }
              : s,
          );
        },

        // D-03: structuredClone so mutating the store does not mutate the imported sample
        // (RESEARCH §Pattern 4 anti-pattern line 1044).
        loadSamplePlan: () =>
          set({ plan: structuredClone(samplePlan) as GardenPlan }),

        // D-28: import path. Caller (importPlan.ts in Plan 02-11) is responsible for Zod
        // validation BEFORE invoking replacePlan — this store does not validate.
        replacePlan: (plan) => set({ plan }),

        exportPlanSnapshot: () => get().plan,

        // ---- Phase 3 setters (Plan 03-02) ----

        // commitEdit: dedupe by (plantingId, eventType) — last-write-wins per Plan 03-01
        // findEdit convention. Engine consumes plan.edits[] (Plan 03-01 Task 2A).
        commitEdit: (edit) =>
          set((s) =>
            s.plan
              ? {
                  plan: {
                    ...s.plan,
                    edits: [
                      ...s.plan.edits.filter(
                        (e) => !(e.plantingId === edit.plantingId && e.eventType === edit.eventType),
                      ),
                      edit,
                    ],
                    updatedAt: nowISOString(),
                  },
                }
              : s,
          ),

        // setLock: explicit boolean (NOT delete) so lock state shows up under JSON.stringify
        // exports and under `plan.plantings[i].locks?.transplant === false` reads.
        setLock: (plantingId, eventType, locked) =>
          set((s) =>
            s.plan
              ? {
                  plan: {
                    ...s.plan,
                    plantings: s.plan.plantings.map((p) =>
                      p.id === plantingId
                        ? { ...p, locks: { ...(p.locks ?? {}), [eventType]: locked } }
                        : p,
                    ),
                    updatedAt: nowISOString(),
                  },
                }
              : s,
          ),

        addCustomTask: (task) =>
          set((s) =>
            s.plan
              ? {
                  plan: {
                    ...s.plan,
                    customTasks: [...s.plan.customTasks, task],
                    updatedAt: nowISOString(),
                  },
                }
              : s,
          ),

        // CR-03 (Plan 03-08): completedTaskIds pruning contract.
        //   - removeCustomTask(id) — UNCONDITIONAL purge of bare `${id}` and `${id}:*` keys.
        //   - editCustomTask(id, patch) — CONDITIONAL purge of `${id}:*` per-occurrence keys
        //     when patch.dueDate or patch.recurrence is present (recurrence shape changed,
        //     so prior occurrence dates may no longer apply). The bare `${id}` key (one-off
        //     completion) survives because it isn't tied to a date. Cosmetic patches
        //     (title, notes, category, completed) leave completedTaskIds untouched.
        // Both setters mutate inside the SAME `set()` call so zundo's handleSet coalesces
        // the prune + the task mutation into one atomic history entry (Cmd-Z restores both).
        editCustomTask: (id, patch) =>
          set((s) => {
            if (!s.plan) return s;
            const recurrenceShapeChanged =
              Object.prototype.hasOwnProperty.call(patch, 'dueDate') ||
              Object.prototype.hasOwnProperty.call(patch, 'recurrence');
            const nextCompletedTaskIds = recurrenceShapeChanged
              ? (s.plan.completedTaskIds ?? []).filter((k) => !k.startsWith(`${id}:`))
              : s.plan.completedTaskIds;
            return {
              plan: {
                ...s.plan,
                customTasks: s.plan.customTasks.map((t) =>
                  t.id === id ? { ...t, ...patch } : t,
                ),
                completedTaskIds: nextCompletedTaskIds,
                updatedAt: nowISOString(),
              },
            };
          }),

        removeCustomTask: (id) =>
          set((s) =>
            s.plan
              ? {
                  plan: {
                    ...s.plan,
                    customTasks: s.plan.customTasks.filter((t) => t.id !== id),
                    // CR-03: prune both bare `${id}` (one-off) and `${id}:*` (per-occurrence)
                    // completion keys so localStorage doesn't accumulate orphans on delete.
                    completedTaskIds: (s.plan.completedTaskIds ?? []).filter(
                      (k) => k !== id && !k.startsWith(`${id}:`),
                    ),
                    updatedAt: nowISOString(),
                  },
                }
              : s,
          ),

        // D-36: composite key `${taskId}:${ISODate}` for recurring per-occurrence completion;
        // bare `taskId` for one-off completion. Set semantics make double-toggle a no-op.
        toggleTaskCompletion: (compositeKey) =>
          set((s) => {
            if (!s.plan) return s;
            const next = new Set(s.plan.completedTaskIds ?? []);
            if (next.has(compositeKey)) next.delete(compositeKey);
            else next.add(compositeKey);
            return {
              plan: {
                ...s.plan,
                completedTaskIds: Array.from(next),
                updatedAt: nowISOString(),
              },
            };
          }),
      }),
      {
        // Per CONTEXT D-14 + D-16:
        limit: 20,
        partialize: (state): PartializedPlan => ({ plan: state.plan }),
        // rAF-debounce drag-stream updates → one history entry per pointerup (D-16).
        // The `typeof requestAnimationFrame === 'undefined'` guard covers pure-node test
        // environments; happy-dom + browsers all have rAF (verified in tests/stores/temporal.test.ts).
        // The inner `handleSet` is the wrapped setState — accepts (pastState, replace).
        // currentState/deltaState are computed inside zundo before our fn is called; we
        // intentionally drop them on the rAF coalescing edge — only the LATEST pastState
        // matters per frame because pointermove churn collapses into one history entry.
        handleSet: (handleSet) => {
          let raf = 0;
          let lastPastState: PartializedPlan | undefined;
          let lastReplace: false | undefined;
          return (pastState, replace) => {
            // Cast: zundo's outer signature passes pastState as the same shape setState accepts.
            const ps = pastState as Parameters<typeof handleSet>[0];
            const rp = replace as Parameters<typeof handleSet>[1];
            if (typeof requestAnimationFrame === 'undefined') {
              handleSet(ps, rp);
              return;
            }
            lastPastState = ps as PartializedPlan;
            lastReplace = rp as false | undefined;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
              handleSet(
                lastPastState as Parameters<typeof handleSet>[0],
                lastReplace as Parameters<typeof handleSet>[1],
              );
            });
          };
        },
      },
    ),
    {
      name: 'garden-gantt:plan',
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      // Pitfall E: delegate to the shared migrations module — single source of truth.
      migrate: (persisted, fromVersion) => {
        return migrateToCurrent(persisted, fromVersion) as PlanState;
      },
    },
  ),
);

// ---- Temporal accessors ----
//
// The `as unknown as { temporal: ... }` casts are required because the public typing of
// `usePlanStore` (a `UseBoundStore<StoreApi<PlanState>>` wrapped in persist + temporal)
// does not surface the `temporal` mutator at the top level — it lives on the store API
// runtime object via the zundo middleware. These two accessors are the ONLY codebase-wide
// sites that need the cast; downstream callers go through these seams.

interface TemporalApi {
  getState: () => TemporalState<PartializedPlan>;
  setState: (
    partial:
      | Partial<TemporalState<PartializedPlan>>
      | ((state: TemporalState<PartializedPlan>) => Partial<TemporalState<PartializedPlan>>),
    replace?: false,
  ) => void;
  subscribe: (
    listener: (state: TemporalState<PartializedPlan>, prev: TemporalState<PartializedPlan>) => void,
  ) => () => void;
}

function temporalApi(): TemporalApi {
  return (usePlanStore as unknown as { temporal: TemporalApi }).temporal;
}

/**
 * Imperative accessor for the temporal API. Used by historyBindings.ts (Cmd-Z keybinding)
 * and any non-React caller that needs to invoke undo/redo without subscribing.
 */
export function getTemporal(): TemporalState<PartializedPlan> {
  return temporalApi().getState();
}

/**
 * Reactive selector hook for temporal state. Used by the header undo/redo button (Plan 03-03)
 * to read `pastStates.length === 0` (disable Undo) and `futureStates.length === 0` (disable Redo).
 */
export function useTemporalStore<T>(
  selector: (state: TemporalState<PartializedPlan>) => T,
  equalityFn?: (a: T, b: T) => boolean,
): T {
  return useStoreWithEqualityFn(
    temporalApi() as unknown as Parameters<typeof useStoreWithEqualityFn>[0],
    selector as never,
    equalityFn,
  );
}
