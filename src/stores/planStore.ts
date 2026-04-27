// src/stores/planStore.ts
// Phase 2: setter surface + v1->v2 migration via shared migrations module + sample-plan bootstrap.
// Source: [VERIFIED: zustand persist + migrate docs via Context7 /pmndrs/zustand]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md §Pattern 4 lines 640-727]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-PATTERNS.md src/stores/planStore.ts (EXTEND)]
//
// Pitfall E (RESEARCH.md): the v1->v2 migration logic lives in src/domain/migrations.ts and is
// shared with src/features/settings/importPlan.ts (Plan 02-11). DO NOT duplicate it here.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GardenPlan, Planting, Plant, Location } from '../domain/types';
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
}

const SCHEMA_VERSION = CURRENT_SCHEMA_VERSION;

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
    }),
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
