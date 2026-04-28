// src/features/tasks/useTodayWeekOverdue.ts
// Pure partition selector — buckets tasks into Today / This Week / Overdue.
// Per CONTEXT D-32 (today merges overdue; week excludes today; week = next 7 days).
//
// Purity: zero React/Zustand/I/O at the partition function. The hook variant reads stores
// + nowISOString and delegates to the pure partition for testability (tests can inject a
// fixed todayISO without faking timers).

import { useMemo } from 'react';
import { useExpandedTasks } from './useExpandedTasks';
import { parseDate, addDays, toISODate, nowISOString } from '../../domain/dateWrappers';
import type { Task } from '../../domain/types';

/**
 * Pure partition. Buckets tasks into Today / This Week / Overdue per D-32:
 *  - completed tasks are filtered out of all buckets
 *  - dueDate < today → in BOTH today AND overdue (today merges overdue)
 *  - dueDate === today → in today only
 *  - today < dueDate <= today + 7 → in thisWeek only
 *  - dueDate > today + 7 → in NO bucket (TASK-05 wording)
 */
export function partitionTasksByWindow(
  tasks: Task[],
  todayISO: string,
): { today: Task[]; thisWeek: Task[]; overdue: Task[] } {
  const today = parseDate(todayISO);
  const todayStr = toISODate(today).slice(0, 10);
  const weekEnd = addDays(today, 7);
  const weekEndStr = toISODate(weekEnd).slice(0, 10);

  const todayBucket: Task[] = [];
  const weekBucket: Task[] = [];
  const overdueBucket: Task[] = [];

  for (const t of tasks) {
    if (t.completed) continue;
    const dueStr = t.dueDate.slice(0, 10);
    if (dueStr < todayStr) {
      overdueBucket.push(t);
      todayBucket.push(t); // D-32: Today merges overdue
    } else if (dueStr === todayStr) {
      todayBucket.push(t);
    } else if (dueStr <= weekEndStr) {
      weekBucket.push(t);
    }
    // else: beyond week — not in any bucket per TASK-05
  }
  return { today: todayBucket, thisWeek: weekBucket, overdue: overdueBucket };
}

/**
 * React hook variant. Reads expanded tasks from useExpandedTasks (today-30..today+30) and
 * partitions via the pure helper. The backward window is required for overdue custom
 * tasks; otherwise they are filtered out before the overdue bucket can see them.
 */
export function useTodayWeekOverdue(): {
  today: Task[];
  thisWeek: Task[];
  overdue: Task[];
} {
  const todayISO = nowISOString();
  const today = parseDate(todayISO);
  const tasks = useExpandedTasks(
    toISODate(addDays(today, -30)),
    toISODate(addDays(today, 30)),
  );

  return useMemo(() => partitionTasksByWindow(tasks, todayISO), [tasks, todayISO]);
}
