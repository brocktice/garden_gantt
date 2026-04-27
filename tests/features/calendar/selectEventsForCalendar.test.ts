// tests/features/calendar/selectEventsForCalendar.test.ts
// Phase 3 Plan 03-04 Task 1: pure adapter ScheduleEvent[] + Task[] → CalendarEventInput[].
// Source: 03-04-PLAN.md Task 1 behaviors 1-8.
// Pitfall 5 (FullCalendar end is EXCLUSIVE): multi-day spans must add 1 day to the end.

import { describe, it, expect } from 'vitest';
import {
  selectEventsForCalendar,
  type CalendarEventInput,
} from '../../../src/features/calendar/selectEventsForCalendar';
import { lifecyclePalette } from '../../../src/features/gantt/lifecyclePalette';
import type { ScheduleEvent, Task } from '../../../src/domain/types';

function ev(partial: Partial<ScheduleEvent> & Pick<ScheduleEvent, 'type' | 'start' | 'end'>): ScheduleEvent {
  return {
    id: partial.id ?? `${partial.plantingId ?? 'p'}:${partial.type}`,
    plantingId: partial.plantingId ?? 'p1',
    plantId: partial.plantId ?? 'tomato',
    type: partial.type,
    start: partial.start,
    end: partial.end,
    edited: partial.edited ?? false,
    constraintsApplied: partial.constraintsApplied ?? [],
  };
}

function task(partial: Partial<Task> & Pick<Task, 'id' | 'title' | 'dueDate'>): Task {
  return {
    id: partial.id,
    source: partial.source ?? 'auto',
    plantingId: partial.plantingId,
    title: partial.title,
    category: partial.category ?? 'water',
    dueDate: partial.dueDate,
    completed: partial.completed ?? false,
  };
}

describe('selectEventsForCalendar (Phase 3 Plan 03-04 Task 1)', () => {
  it('Test 1: lifecycle event single day → end undefined, palette color, kind=lifecycle', () => {
    const e = ev({
      id: 'p1:transplant',
      plantingId: 'p1',
      type: 'transplant',
      start: '2026-05-01T12:00:00.000Z',
      end: '2026-05-01T12:00:00.000Z',
    });
    const out = selectEventsForCalendar([e], []);
    expect(out).toHaveLength(1);
    const r = out[0] as CalendarEventInput;
    expect(r.start).toBe('2026-05-01');
    expect(r.end).toBeUndefined();
    expect(r.backgroundColor).toBe(lifecyclePalette.transplant);
    expect(r.extendedProps.kind).toBe('lifecycle');
    expect(r.extendedProps.eventType).toBe('transplant');
    expect(r.extendedProps.plantingId).toBe('p1');
  });

  it('Test 2: lifecycle multi-day end-exclusive — harvest 2026-08-01..2026-08-15 → end 2026-08-16', () => {
    const e = ev({
      type: 'harvest-window',
      plantingId: 'p1',
      start: '2026-08-01T12:00:00.000Z',
      end: '2026-08-15T12:00:00.000Z',
    });
    const out = selectEventsForCalendar([e], []);
    expect(out).toHaveLength(1);
    expect(out[0].start).toBe('2026-08-01');
    expect(out[0].end).toBe('2026-08-16');
  });

  it('Test 3: auto-task event types skipped from lifecycle loop', () => {
    const events: ScheduleEvent[] = [
      ev({ type: 'water-seedlings', start: '2026-05-01T12:00:00.000Z', end: '2026-05-01T12:00:00.000Z' }),
      ev({ type: 'harden-off-day', start: '2026-05-02T12:00:00.000Z', end: '2026-05-02T12:00:00.000Z' }),
      ev({ type: 'fertilize-at-flowering', start: '2026-06-01T12:00:00.000Z', end: '2026-06-01T12:00:00.000Z' }),
    ];
    const out = selectEventsForCalendar(events, []);
    expect(out).toHaveLength(0);
  });

  it('Test 4: germination-window included (palette entry exists)', () => {
    const e = ev({
      type: 'germination-window',
      plantingId: 'p1',
      start: '2026-05-01T12:00:00.000Z',
      end: '2026-05-08T12:00:00.000Z',
    });
    const out = selectEventsForCalendar([e], []);
    expect(out).toHaveLength(1);
    expect(out[0].extendedProps.eventType).toBe('germination-window');
    expect(out[0].backgroundColor).toBe(lifecyclePalette['germination-window']);
  });

  it('Test 5: harden-off included as multi-day range (end-exclusive)', () => {
    const e = ev({
      type: 'harden-off',
      plantingId: 'p1',
      start: '2026-04-20T12:00:00.000Z',
      end: '2026-04-26T12:00:00.000Z',
    });
    const out = selectEventsForCalendar([e], []);
    expect(out).toHaveLength(1);
    expect(out[0].start).toBe('2026-04-20');
    expect(out[0].end).toBe('2026-04-27'); // 26 + 1 day
    expect(out[0].extendedProps.eventType).toBe('harden-off');
  });

  it('Test 6: tasks → CalendarEventInput with kind=task and id=task:T.id', () => {
    const t = task({
      id: 'T1',
      plantingId: 'p1',
      title: 'Water seedlings',
      dueDate: '2026-05-10T12:00:00.000Z',
    });
    const out = selectEventsForCalendar([], [t]);
    expect(out).toHaveLength(1);
    const r = out[0];
    expect(r.id).toBe('task:T1');
    expect(r.extendedProps.kind).toBe('task');
    expect(r.extendedProps.taskId).toBe('T1');
    expect(r.extendedProps.plantingId).toBe('p1');
    expect(r.title).toBe('Water seedlings');
    expect(r.start).toBe('2026-05-10');
  });

  it('Test 7: tasks neutral color (NOT lifecycle palette)', () => {
    const t = task({ id: 'T2', title: 'Custom task', dueDate: '2026-05-10T12:00:00.000Z' });
    const out = selectEventsForCalendar([], [t]);
    expect(out).toHaveLength(1);
    const lifecycleHexes = Object.values(lifecyclePalette);
    expect(lifecycleHexes).not.toContain(out[0].backgroundColor);
    // Stone-100 per UI-SPEC §6 / RESEARCH §Pattern 6
    expect(out[0].backgroundColor).toBe('#f5f5f4');
  });

  it('Test 8: empty inputs return []', () => {
    expect(selectEventsForCalendar([], [])).toEqual([]);
  });
});
