// src/features/tasks/deriveTasks.ts
// Pure projection: ScheduleEvent[] (auto-task subset) + CustomTask[] → flat Task[].
// Per CONTEXT D-36 + UI-SPEC §Tasks dashboard.
// Source: [CITED: 03-PATTERNS.md §deriveTasks.ts]
//         [CITED: 03-RESEARCH.md §Pattern 7]
//
// Purity: zero React/Zustand/I/O; date math via dateWrappers only.

import type {
  ScheduleEvent,
  CustomTask,
  Plant,
  Task,
  EventType,
  TaskCategory,
} from '../../domain/types';
import { expandRecurringTasks } from '../../domain/taskEmitter';

const AUTO_EVENT_TO_CATEGORY: Partial<Record<EventType, TaskCategory>> = {
  'water-seedlings': 'water',
  'harden-off-day': 'harden-off',
  'fertilize-at-flowering': 'fertilize',
};

function autoEventTitle(eventType: EventType, plantName: string | undefined): string {
  const action =
    eventType === 'water-seedlings'
      ? 'Water seedlings'
      : eventType === 'harden-off-day'
        ? 'Harden off'
        : eventType === 'fertilize-at-flowering'
          ? 'Fertilize'
          : eventType;
  return plantName ? `${action} — ${plantName}` : action;
}

/**
 * Project all tasks for the consumer:
 *  - Auto-tasks from auto-task ScheduleEvents (water-seedlings / harden-off-day / fertilize-at-flowering)
 *  - Custom one-off tasks (kept verbatim if dueDate falls in range)
 *  - Custom recurring tasks expanded to per-occurrence (via expandRecurringTasks)
 *
 * Caller passes the (rangeStart, rangeEnd) for recurring expansion + the completed-keys set.
 */
export function deriveTasks(
  events: ScheduleEvent[],
  customTasks: CustomTask[],
  catalog: ReadonlyMap<string, Plant>,
  rangeStart: string,
  rangeEnd: string,
  completedKeys: ReadonlySet<string>,
): Task[] {
  const out: Task[] = [];

  // Auto-tasks from events
  for (const e of events) {
    const category = AUTO_EVENT_TO_CATEGORY[e.type];
    if (!category) continue;
    const plant = catalog.get(e.plantId);
    const task: Task = {
      id: e.id, // event-id IS the task id for auto-tasks
      source: 'auto',
      title: autoEventTitle(e.type, plant?.name),
      category,
      dueDate: e.start,
      completed: completedKeys.has(e.id),
    };
    if (e.plantingId) task.plantingId = e.plantingId;
    out.push(task);
  }

  // Custom + recurring (centralized expansion per Pitfall 7)
  out.push(...expandRecurringTasks(customTasks, rangeStart, rangeEnd, completedKeys));

  return out;
}
