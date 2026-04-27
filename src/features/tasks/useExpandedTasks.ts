// src/features/tasks/useExpandedTasks.ts
// Centralized hook: returns deriveTasks(...) over a (rangeStart, rangeEnd) window.
// Both the calendar (visible month) and dashboard (today..today+N) consume this so
// occurrences agree per Pitfall 7.
// Per CONTEXT D-36 + RESEARCH §Pitfall 7.

import { useMemo } from 'react';
import { usePlanStore } from '../../stores/planStore';
import { useCatalogStore, selectMerged } from '../../stores/catalogStore';
import { useDerivedSchedule } from '../gantt/useDerivedSchedule';
import { deriveTasks } from './deriveTasks';
import { nowISOString, addDays, parseDate, toISODate } from '../../domain/dateWrappers';
import type { Task } from '../../domain/types';

/**
 * @param rangeStart YYYY-MM-DD or full ISO; default = today (UTC noon "now")
 * @param rangeEnd   YYYY-MM-DD or full ISO; default = today + 60 days (covers calendar
 *                   month + dashboard week generously)
 */
export function useExpandedTasks(rangeStart?: string, rangeEnd?: string): Task[] {
  const plan = usePlanStore((s) => s.plan);
  const events = useDerivedSchedule();
  const catalog = useCatalogStore(selectMerged);

  return useMemo<Task[]>(() => {
    if (!plan) return [];
    const start = rangeStart ?? nowISOString();
    const end = rangeEnd ?? toISODate(addDays(parseDate(start), 60));
    const completedKeys = new Set(plan.completedTaskIds ?? []);
    return deriveTasks(events, plan.customTasks, catalog, start, end, completedKeys);
  }, [plan, events, catalog, rangeStart, rangeEnd]);
}
