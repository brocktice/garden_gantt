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
import { generateScheduleWithLocks } from '../../domain/schedulerWithLocks';
import { expandSuccessions } from '../../domain/succession';
import type { ScheduleEvent } from '../../domain/types';

// Phase 3 (Plan 03-03): switched from generateSchedule → generateScheduleWithLocks.
// The wrapper is a thin pass-through today (engine consumes plan.edits[] from Plan 03-01)
// but it is the documented public seam where future locked-event policy (D-13) plugs in
// without changing this hook.
export function useDerivedSchedule(): ScheduleEvent[] {
  const plan = usePlanStore((s) => s.plan);
  const catalog = useCatalogStore(selectMerged);
  return useMemo(() => {
    if (!plan) return [];
    const expanded = expandSuccessions(plan, catalog);
    return generateScheduleWithLocks(expanded, catalog);
  }, [plan, catalog]);
}
