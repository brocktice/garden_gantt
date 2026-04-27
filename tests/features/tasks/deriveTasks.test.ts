/**
 * @vitest-environment node
 */
// tests/features/tasks/deriveTasks.test.ts
// Pure-projection tests for Plan 03-05 Task 1.
// Covers:
//   - expandRecurringTasks (one-off + daily/weekly/interval; endDate cap; composite key)
//   - deriveTasks (auto from ScheduleEvent[], merge with custom, completion read, catalog lookup)
//   - partitionTasksByWindow (Today/Week/Overdue per CONTEXT D-32)
//   - composite-key helpers (toCompositeKey / parseCompositeKey / isOccurrenceKey)

import { describe, it, expect } from 'vitest';
import type {
  CustomTask,
  Plant,
  PlantTiming,
  ScheduleEvent,
  Task,
  TaskRecurrence,
} from '../../../src/domain/types';

// ---- Helpers / fixtures --------------------------------------------------

function timing(overrides: Partial<PlantTiming> = {}): PlantTiming {
  return {
    startMethod: 'indoor-start',
    daysToMaturity: 60,
    harvestWindowDays: 14,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: true,
    season: 'warm',
    ...overrides,
  };
}

function plant(id: string, name: string, overrides: Partial<Plant> = {}): Plant {
  return {
    id,
    source: 'curated',
    name,
    category: 'fruiting-vegetable',
    timing: timing(),
    ...overrides,
  };
}

function customTask(overrides: Partial<CustomTask> & { id: string; dueDate: string; title?: string }): CustomTask {
  return {
    id: overrides.id,
    source: 'custom',
    title: overrides.title ?? 'Custom task',
    category: overrides.category ?? 'custom',
    dueDate: overrides.dueDate,
    completed: overrides.completed ?? false,
    ...overrides,
  } as CustomTask;
}

function event(overrides: Partial<ScheduleEvent> & { id: string; type: ScheduleEvent['type']; start: string }): ScheduleEvent {
  return {
    id: overrides.id,
    plantingId: overrides.plantingId ?? 'p-tomato',
    plantId: overrides.plantId ?? 'tomato',
    type: overrides.type,
    start: overrides.start,
    end: overrides.end ?? overrides.start,
    edited: overrides.edited ?? false,
    constraintsApplied: overrides.constraintsApplied ?? [],
  };
}

const RANGE_START = '2026-05-15';
const RANGE_END = '2026-06-15';

// ============================================================================
// expandRecurringTasks
// ============================================================================

describe('expandRecurringTasks', () => {
  it('Test 1 — one-off in range emits a single Task with bare id', async () => {
    const { expandRecurringTasks } = await import('../../../src/domain/taskEmitter');
    const ct = customTask({ id: 'T1', dueDate: '2026-05-15T12:00:00.000Z' });
    const out = expandRecurringTasks([ct], RANGE_START, RANGE_END, new Set());
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe('T1');
    expect(out[0]!.source).toBe('custom');
    expect(out[0]!.completed).toBe(false);

    // outside range → empty
    const out2 = expandRecurringTasks([ct], '2026-06-01', RANGE_END, new Set());
    expect(out2).toHaveLength(0);
  });

  it('Test 2 — daily recurrence emits per-occurrence Tasks within range', async () => {
    const { expandRecurringTasks } = await import('../../../src/domain/taskEmitter');
    const recurrence: TaskRecurrence = { type: 'daily' };
    const ct = customTask({ id: 'T2', dueDate: '2026-05-15T12:00:00.000Z', recurrence });
    const out = expandRecurringTasks([ct], '2026-05-13', '2026-05-17', new Set());
    // cursor starts at 2026-05-15 (dueDate), increments by 1 day until 2026-05-17 inclusive
    expect(out).toHaveLength(3);
    expect(out.map((t) => t.id)).toEqual([
      'T2:2026-05-15',
      'T2:2026-05-16',
      'T2:2026-05-17',
    ]);
  });

  it('Test 3 — weekly recurrence emits 5 occurrences across May-Jun 2026', async () => {
    const { expandRecurringTasks } = await import('../../../src/domain/taskEmitter');
    const recurrence: TaskRecurrence = { type: 'weekly' };
    const ct = customTask({ id: 'T3', dueDate: '2026-05-15T12:00:00.000Z', recurrence });
    const out = expandRecurringTasks([ct], '2026-05-15', '2026-06-15', new Set());
    expect(out.map((t) => t.id)).toEqual([
      'T3:2026-05-15',
      'T3:2026-05-22',
      'T3:2026-05-29',
      'T3:2026-06-05',
      'T3:2026-06-12',
    ]);
  });

  it('Test 4 — interval recurrence with intervalDays=3 emits expected dates', async () => {
    const { expandRecurringTasks } = await import('../../../src/domain/taskEmitter');
    const recurrence: TaskRecurrence = { type: 'interval', intervalDays: 3 };
    const ct = customTask({ id: 'T4', dueDate: '2026-05-15T12:00:00.000Z', recurrence });
    const out = expandRecurringTasks([ct], '2026-05-15', '2026-05-25', new Set());
    expect(out.map((t) => t.id)).toEqual([
      'T4:2026-05-15',
      'T4:2026-05-18',
      'T4:2026-05-21',
      'T4:2026-05-24',
    ]);
  });

  it('Test 5 — recurrence endDate caps emission early', async () => {
    const { expandRecurringTasks } = await import('../../../src/domain/taskEmitter');
    const recurrence: TaskRecurrence = { type: 'daily', endDate: '2026-05-17' };
    const ct = customTask({ id: 'T5', dueDate: '2026-05-15T12:00:00.000Z', recurrence });
    const out = expandRecurringTasks([ct], '2026-05-15', '2026-05-25', new Set());
    expect(out.map((t) => t.id)).toEqual([
      'T5:2026-05-15',
      'T5:2026-05-16',
      'T5:2026-05-17',
    ]);
  });

  it('Test 6 — composite key + completion read', async () => {
    const { expandRecurringTasks } = await import('../../../src/domain/taskEmitter');
    const recurrence: TaskRecurrence = { type: 'daily' };
    const ct = customTask({ id: 'T6', dueDate: '2026-05-15T12:00:00.000Z', recurrence });
    const completedKeys = new Set(['T6:2026-05-16']);
    const out = expandRecurringTasks([ct], '2026-05-15', '2026-05-17', completedKeys);
    expect(out).toHaveLength(3);
    expect(out.find((t) => t.id === 'T6:2026-05-16')!.completed).toBe(true);
    expect(out.find((t) => t.id === 'T6:2026-05-15')!.completed).toBe(false);
    expect(out.find((t) => t.id === 'T6:2026-05-17')!.completed).toBe(false);
  });

  it('Test 6b — interval with intervalDays=0 does not infinite-loop (defensive clamp)', async () => {
    const { expandRecurringTasks } = await import('../../../src/domain/taskEmitter');
    const recurrence: TaskRecurrence = { type: 'interval', intervalDays: 0 };
    const ct = customTask({ id: 'T6b', dueDate: '2026-05-15T12:00:00.000Z', recurrence });
    const out = expandRecurringTasks([ct], '2026-05-15', '2026-05-17', new Set());
    // Defensive Math.max(1, intervalDays) clamps 0 → 1; 3 occurrences expected
    expect(out).toHaveLength(3);
  });
});

// ============================================================================
// deriveTasks
// ============================================================================

describe('deriveTasks', () => {
  it('Test 7 — auto from water-seedlings event yields source=auto, category=water, plantingId', async () => {
    const { deriveTasks } = await import('../../../src/features/tasks/deriveTasks');
    const ev = event({
      id: 'p-tomato:water-seedlings:0',
      plantingId: 'p-tomato',
      plantId: 'tomato',
      type: 'water-seedlings',
      start: '2026-05-15T12:00:00.000Z',
    });
    const cat = new Map<string, Plant>([['tomato', plant('tomato', 'Tomato')]]);
    const out = deriveTasks([ev], [], cat, RANGE_START, RANGE_END, new Set());
    expect(out).toHaveLength(1);
    expect(out[0]!.source).toBe('auto');
    expect(out[0]!.plantingId).toBe('p-tomato');
    expect(out[0]!.category).toBe('water');
    expect(out[0]!.title).toContain('Tomato');
    expect(out[0]!.dueDate).toBe('2026-05-15T12:00:00.000Z');
  });

  it('Test 8 — auto + custom merged: 2 events + 1 one-off + recurring = expected count', async () => {
    const { deriveTasks } = await import('../../../src/features/tasks/deriveTasks');
    const events = [
      event({ id: 'e1', type: 'water-seedlings', start: '2026-05-15T12:00:00.000Z' }),
      event({ id: 'e2', type: 'harden-off-day', start: '2026-05-16T12:00:00.000Z' }),
    ];
    const oneOff = customTask({ id: 'C1', dueDate: '2026-05-20T12:00:00.000Z' });
    const recurring = customTask({
      id: 'C2',
      dueDate: '2026-05-15T12:00:00.000Z',
      recurrence: { type: 'daily', endDate: '2026-05-17' },
    });
    const cat = new Map<string, Plant>([['tomato', plant('tomato', 'Tomato')]]);
    const out = deriveTasks(events, [oneOff, recurring], cat, '2026-05-15', '2026-05-25', new Set());
    // 2 auto + 1 one-off + 3 recurring occurrences
    expect(out).toHaveLength(6);
  });

  it('Test 9 — completion read: task whose key is in completedKeys returns completed=true', async () => {
    const { deriveTasks } = await import('../../../src/features/tasks/deriveTasks');
    const events = [
      event({ id: 'p-tomato:water-seedlings:0', type: 'water-seedlings', start: '2026-05-15T12:00:00.000Z' }),
    ];
    const cat = new Map<string, Plant>([['tomato', plant('tomato', 'Tomato')]]);
    const out = deriveTasks(events, [], cat, RANGE_START, RANGE_END, new Set(['p-tomato:water-seedlings:0']));
    expect(out[0]!.completed).toBe(true);
  });

  it('Test 10 — catalog lookup populates plant name; missing plant falls back gracefully', async () => {
    const { deriveTasks } = await import('../../../src/features/tasks/deriveTasks');
    const events = [
      event({ id: 'e-known', type: 'water-seedlings', plantId: 'tomato', start: '2026-05-15T12:00:00.000Z' }),
      event({ id: 'e-missing', type: 'water-seedlings', plantId: 'unknown', start: '2026-05-15T12:00:00.000Z' }),
    ];
    const cat = new Map<string, Plant>([['tomato', plant('tomato', 'Tomato')]]);
    const out = deriveTasks(events, [], cat, RANGE_START, RANGE_END, new Set());
    expect(out).toHaveLength(2);
    expect(out.find((t) => t.id === 'e-known')!.title).toContain('Tomato');
    // Missing plant: title is the action label only (no plant name suffix), no crash
    expect(out.find((t) => t.id === 'e-missing')!.title).toBeTruthy();
  });
});

// ============================================================================
// partitionTasksByWindow (pure helper inside useTodayWeekOverdue)
// ============================================================================

describe('partitionTasksByWindow', () => {
  const TODAY = '2026-05-15T12:00:00.000Z';

  function task(overrides: Partial<Task> & { id: string; dueDate: string }): Task {
    return {
      id: overrides.id,
      source: overrides.source ?? 'custom',
      title: overrides.title ?? 'T',
      category: overrides.category ?? 'custom',
      dueDate: overrides.dueDate,
      completed: overrides.completed ?? false,
      ...overrides,
    } as Task;
  }

  it('Test 11 — task dueDate === today appears only in `today`', async () => {
    const { partitionTasksByWindow } = await import('../../../src/features/tasks/useTodayWeekOverdue');
    const t = task({ id: 'T1', dueDate: '2026-05-15T12:00:00.000Z' });
    const out = partitionTasksByWindow([t], TODAY);
    expect(out.today).toHaveLength(1);
    expect(out.thisWeek).toHaveLength(0);
    expect(out.overdue).toHaveLength(0);
  });

  it('Test 12 — overdue task appears in BOTH today AND overdue (D-32)', async () => {
    const { partitionTasksByWindow } = await import('../../../src/features/tasks/useTodayWeekOverdue');
    const t = task({ id: 'T2', dueDate: '2026-05-10T12:00:00.000Z' });
    const out = partitionTasksByWindow([t], TODAY);
    expect(out.today).toHaveLength(1);
    expect(out.today[0]!.id).toBe('T2');
    expect(out.overdue).toHaveLength(1);
    expect(out.overdue[0]!.id).toBe('T2');
    expect(out.thisWeek).toHaveLength(0);
  });

  it('Test 13 — week excludes today; covers (today, today+7]', async () => {
    const { partitionTasksByWindow } = await import('../../../src/features/tasks/useTodayWeekOverdue');
    const t1 = task({ id: 'T3a', dueDate: '2026-05-16T12:00:00.000Z' }); // tomorrow
    const t2 = task({ id: 'T3b', dueDate: '2026-05-22T12:00:00.000Z' }); // today+7
    const out = partitionTasksByWindow([t1, t2], TODAY);
    expect(out.thisWeek.map((x) => x.id)).toEqual(['T3a', 'T3b']);
    expect(out.today).toHaveLength(0);
    expect(out.overdue).toHaveLength(0);
  });

  it('Test 14 — beyond +7 days: not in any bucket', async () => {
    const { partitionTasksByWindow } = await import('../../../src/features/tasks/useTodayWeekOverdue');
    const t = task({ id: 'T4', dueDate: '2026-05-30T12:00:00.000Z' });
    const out = partitionTasksByWindow([t], TODAY);
    expect(out.today).toHaveLength(0);
    expect(out.thisWeek).toHaveLength(0);
    expect(out.overdue).toHaveLength(0);
  });

  it('Test 15 — completed tasks filtered out of all buckets', async () => {
    const { partitionTasksByWindow } = await import('../../../src/features/tasks/useTodayWeekOverdue');
    const t = task({ id: 'T5', dueDate: '2026-05-15T12:00:00.000Z', completed: true });
    const out = partitionTasksByWindow([t], TODAY);
    expect(out.today).toHaveLength(0);
    expect(out.thisWeek).toHaveLength(0);
    expect(out.overdue).toHaveLength(0);
  });
});

// ============================================================================
// composite-key helpers
// ============================================================================

describe('useCompositeCompletionKey helpers', () => {
  it('Test 16 — toCompositeKey concatenates with colon; trims full ISO to YYYY-MM-DD', async () => {
    const { toCompositeKey } = await import('../../../src/features/tasks/useCompositeCompletionKey');
    expect(toCompositeKey('T1', '2026-05-15')).toBe('T1:2026-05-15');
    expect(toCompositeKey('T1', '2026-05-15T12:00:00.000Z')).toBe('T1:2026-05-15');
  });

  it('Test 17 — parseCompositeKey splits on first colon', async () => {
    const { parseCompositeKey } = await import('../../../src/features/tasks/useCompositeCompletionKey');
    expect(parseCompositeKey('T1:2026-05-15')).toEqual({ taskId: 'T1', date: '2026-05-15' });
    expect(parseCompositeKey('T1')).toEqual({ taskId: 'T1' });
  });

  it('Test 18 — isOccurrenceKey returns true only for composite keys', async () => {
    const { isOccurrenceKey } = await import('../../../src/features/tasks/useCompositeCompletionKey');
    expect(isOccurrenceKey('T1:2026-05-15')).toBe(true);
    expect(isOccurrenceKey('T1')).toBe(false);
  });
});
