// src/features/gantt/drag/useTransientSchedule.ts
// rAF-throttled selector that runs the live cascade preview during drag.
// Source: [CITED: 03-CONTEXT.md D-19, D-20]
//         [CITED: 03-RESEARCH.md §Pattern 3]
//         [CITED: 03-PATTERNS.md §useTransientSchedule.ts]
//
// Identical structure to useDerivedSchedule, but:
// - Reads `transientEdit` from dragStore and inserts/replaces it in plan.edits[]
//   (dedupe by (plantingId, eventType), last-write-wins — matches planStore.commitEdit
//   and Plan 03-01's findEdit engine convention).
// - Calls generateScheduleWithLocks() (lock-aware seam) instead of generateSchedule().
// - useMemo deps include transientEdit so the cascade preview rebuilds on every drag tick
//   the dragStore writes a new transientEdit to.

import { useMemo } from 'react';
import { usePlanStore } from '../../../stores/planStore';
import { useCatalogStore, selectMerged } from '../../../stores/catalogStore';
import { useDragStore } from '../../../stores/dragStore';
import { generateScheduleWithLocks } from '../../../domain/schedulerWithLocks';
import { expandSuccessions } from '../../../domain/succession';
import type { ScheduleEvent } from '../../../domain/types';

export function useTransientSchedule(): ScheduleEvent[] {
  const plan = usePlanStore((s) => s.plan);
  const catalog = useCatalogStore(selectMerged);
  const transientEdit = useDragStore((s) => s.transientEdit);
  return useMemo<ScheduleEvent[]>(() => {
    if (!plan) return [];
    const planWithTransient = transientEdit
      ? {
          ...plan,
          edits: [
            ...plan.edits.filter(
              (e) =>
                !(
                  e.plantingId === transientEdit.plantingId &&
                  e.eventType === transientEdit.eventType
                ),
            ),
            transientEdit,
          ],
        }
      : plan;
    const expanded = expandSuccessions(planWithTransient, catalog);
    return generateScheduleWithLocks(expanded, catalog);
  }, [plan, catalog, transientEdit]);
}
