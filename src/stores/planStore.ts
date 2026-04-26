// src/stores/planStore.ts
// Zustand persist middleware machinery. Phase 1 has NO setters that mutate `plan` (D-02);
// Phase 2 (Setup Wizard) and Phase 3 (drag edits) add setters.
// Source: [VERIFIED: zustand persist + migrate docs via Context7 /pmndrs/zustand]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Code Examples lines 700–739]
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GardenPlan } from '../domain/types';

interface PlanState {
  plan: GardenPlan | null;
  // Phase 1 has no setters that mutate `plan` (D-02). Future phases add them.
}

const SCHEMA_VERSION = 1;

// Each future migration: migrations[N] = (s) => { /* transform s from version N-1 to N */ return s; }
const migrations: Record<number, (state: unknown) => unknown> = {};

export const usePlanStore = create<PlanState>()(
  persist(
    (): PlanState => ({
      plan: null, // Phase 1: hardcoded sample plan loads from samplePlan.ts; not persisted.
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
