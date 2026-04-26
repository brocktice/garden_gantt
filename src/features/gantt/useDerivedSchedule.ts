// src/features/gantt/useDerivedSchedule.ts
// Memoized selector — pure derivation per RESEARCH.md §Pattern 1.
// Phase 1 reads samplePlan + sampleCatalog directly. Phase 2 will swap to usePlanStore.plan
// + useCatalogStore.merged once the Setup Wizard wires real user input (D-04).
//
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Pattern 1]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-CONTEXT.md D-02, D-04]
import { useMemo } from 'react';
import { generateSchedule } from '../../domain/scheduler';
import { sampleCatalog } from '../../assets/catalog';
import { samplePlan } from '../../samplePlan';
import type { ScheduleEvent } from '../../domain/types';

export function useDerivedSchedule(): ScheduleEvent[] {
  // samplePlan and sampleCatalog are module-level constants → reference equality is stable
  // → useMemo computes once per component lifecycle. Phase 2 swaps the deps to
  // [plan, catalog] from the persisted stores.
  return useMemo(() => generateSchedule(samplePlan, sampleCatalog), []);
}
