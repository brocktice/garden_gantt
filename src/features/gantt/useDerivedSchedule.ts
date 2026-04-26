// src/features/gantt/useDerivedSchedule.ts
// Memoized selector — pure derivation per RESEARCH.md §Pattern 1.
// Phase 2 (Plan 02-10): swapped from samplePlan/sampleCatalog imports to usePlanStore +
// useCatalogStore. expandSuccessions runs as a pure pre-pass before generateSchedule so
// derived plantings get their own rows on the gantt (D-22).
//
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Pattern 1]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-CONTEXT.md D-02, D-04]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-PATTERNS.md
//          src/features/gantt/useDerivedSchedule.ts (EXTEND) lines 866-883]
import { useMemo } from 'react';
import { usePlanStore } from '../../stores/planStore';
import { useCatalogStore, selectMerged } from '../../stores/catalogStore';
import { generateSchedule } from '../../domain/scheduler';
import { expandSuccessions } from '../../domain/succession';
import type { ScheduleEvent } from '../../domain/types';

export function useDerivedSchedule(): ScheduleEvent[] {
  const plan = usePlanStore((s) => s.plan);
  const catalog = useCatalogStore(selectMerged);
  return useMemo(() => {
    if (!plan) return [];
    const expanded = expandSuccessions(plan, catalog);
    return generateSchedule(expanded, catalog);
  }, [plan, catalog]);
}
