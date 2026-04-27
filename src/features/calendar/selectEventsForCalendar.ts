// src/features/calendar/selectEventsForCalendar.ts
// Pure adapter: ScheduleEvent[] + Task[] → FullCalendar EventInput[].
// Single point where domain shapes meet FullCalendar — keeps FullCalendar concerns
// out of domain.
//
// Source: [CITED: 03-CONTEXT.md D-24]
//         [CITED: 03-RESEARCH.md §Pattern 6 + §Pitfall 5 (FullCalendar end is EXCLUSIVE)]
//         [CITED: 03-PATTERNS.md §selectEventsForCalendar.ts]
//
// Purity: zero React/Zustand/I/O; date math via dateWrappers only (calendar/ is NOT
// in the no-restricted-syntax allowlist — must go through dateWrappers).

import type { ScheduleEvent, Task, EventType } from '../../domain/types';
import { lifecyclePalette } from '../gantt/lifecyclePalette';
import { parseDate, addDays, toISODate } from '../../domain/dateWrappers';

export interface CalendarEventInput {
  id: string;
  title: string;
  start: string; // 'YYYY-MM-DD'
  end?: string; // 'YYYY-MM-DD', EXCLUSIVE per FullCalendar contract
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    kind: 'lifecycle' | 'task';
    eventType: string;
    plantingId?: string;
    taskId?: string;
  };
}

// Auto-task event types — these render via the Task[] parameter, not as lifecycle bars.
// Mirrors the lifecyclePalette intentional omission (typed Partial<Record<EventType,string>>).
const AUTO_TASK_TYPES: ReadonlySet<EventType> = new Set<EventType>([
  'water-seedlings',
  'harden-off-day',
  'fertilize-at-flowering',
]);

function humanLabel(type: EventType): string {
  return type
    .split('-')
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function exclusiveEnd(endISO: string): string {
  // FullCalendar end is the date AFTER the last day. Add one day per Pitfall 5.
  return toISODate(addDays(parseDate(endISO), 1)).slice(0, 10);
}

export function selectEventsForCalendar(
  events: ScheduleEvent[],
  tasks: Task[],
): CalendarEventInput[] {
  const out: CalendarEventInput[] = [];

  // Lifecycle anchors + ranges
  for (const e of events) {
    if (AUTO_TASK_TYPES.has(e.type)) continue;
    const fill = lifecyclePalette[e.type];
    if (!fill) continue; // defensive — palette omission means "do not render"

    const start = e.start.slice(0, 10);
    const isMultiDay = e.end !== e.start;

    const item: CalendarEventInput = {
      id: e.id,
      title: humanLabel(e.type),
      start,
      backgroundColor: fill,
      borderColor: fill,
      extendedProps: { kind: 'lifecycle', eventType: e.type, plantingId: e.plantingId },
    };
    if (isMultiDay) item.end = exclusiveEnd(e.end);
    out.push(item);
  }

  // Tasks (auto + custom + recurring expanded — supplied by caller from Plan 03-05's deriveTasks)
  for (const t of tasks) {
    const extendedProps: CalendarEventInput['extendedProps'] = {
      kind: 'task',
      eventType: 'task',
      taskId: t.id,
    };
    if (t.plantingId !== undefined) extendedProps.plantingId = t.plantingId;
    out.push({
      id: `task:${t.id}`,
      title: t.title,
      start: t.dueDate.slice(0, 10),
      backgroundColor: '#f5f5f4', // stone-100 — neutral; differentiates from lifecycle
      borderColor: '#a8a29e', // stone-400
      extendedProps,
    });
  }

  return out;
}
