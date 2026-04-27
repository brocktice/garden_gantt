/**
 * @vitest-environment happy-dom
 */
// tests/stores/planStore.completionPrune.test.ts
// CR-03 — completedTaskIds pruning on removeCustomTask + editCustomTask.
// Source: .planning/phases/03-drag-cascade-calendar-tasks/03-08-PLAN.md Task 3
//         .planning/phases/03-drag-cascade-calendar-tasks/03-VERIFICATION.md gap CR-03

import { describe, it, expect, beforeEach } from 'vitest';
import type { CustomTask, Location } from '../../src/domain/types';

const sampleLocation: Location = {
  zip: '20001',
  zone: '7a',
  lastFrostDate: '2026-04-15T12:00:00.000Z',
  firstFrostDate: '2026-10-20T12:00:00.000Z',
  source: 'manual',
};

const baseTask: CustomTask = {
  id: 't-prune-1',
  source: 'custom',
  title: 'Test task',
  category: 'water',
  dueDate: '2026-05-01T12:00:00.000Z',
  completed: false,
};

const recurringTask: CustomTask = {
  id: 't-prune-2',
  source: 'custom',
  title: 'Weekly water',
  category: 'water',
  dueDate: '2026-05-01T12:00:00.000Z',
  recurrence: { type: 'weekly' },
  completed: false,
};

describe('planStore — completedTaskIds prune on removeCustomTask (CR-03)', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.setState({ plan: null });
    usePlanStore.getState().setLocation(sampleLocation);
  });

  it('drops `${id}:*` per-occurrence keys', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    const { addCustomTask, toggleTaskCompletion, removeCustomTask } =
      usePlanStore.getState();
    addCustomTask(recurringTask);
    toggleTaskCompletion(`${recurringTask.id}:2026-05-01`);
    toggleTaskCompletion(`${recurringTask.id}:2026-05-08`);
    expect(usePlanStore.getState().plan!.completedTaskIds).toContain(
      `${recurringTask.id}:2026-05-01`,
    );

    removeCustomTask(recurringTask.id);

    const after = usePlanStore.getState().plan!.completedTaskIds;
    expect(after.find((k) => k.startsWith(`${recurringTask.id}:`))).toBeUndefined();
    expect(after.find((k) => k === recurringTask.id)).toBeUndefined();
  });

  it('drops bare `${id}` one-off completion key', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    const { addCustomTask, toggleTaskCompletion, removeCustomTask } =
      usePlanStore.getState();
    addCustomTask(baseTask);
    toggleTaskCompletion(baseTask.id); // bare key
    expect(usePlanStore.getState().plan!.completedTaskIds).toContain(baseTask.id);

    removeCustomTask(baseTask.id);

    expect(usePlanStore.getState().plan!.completedTaskIds).not.toContain(baseTask.id);
  });

  it('does not affect other tasks completion keys', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    const { addCustomTask, toggleTaskCompletion, removeCustomTask } =
      usePlanStore.getState();
    addCustomTask(baseTask);
    addCustomTask(recurringTask);
    toggleTaskCompletion(baseTask.id);
    toggleTaskCompletion(`${recurringTask.id}:2026-05-01`);

    removeCustomTask(baseTask.id);

    const after = usePlanStore.getState().plan!.completedTaskIds;
    expect(after).toContain(`${recurringTask.id}:2026-05-01`);
  });
});

describe('planStore — completedTaskIds prune on editCustomTask (CR-03)', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.setState({ plan: null });
    usePlanStore.getState().setLocation(sampleLocation);
  });

  it('prunes `${id}:*` keys when patch.dueDate is present', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    const { addCustomTask, toggleTaskCompletion, editCustomTask } =
      usePlanStore.getState();
    addCustomTask(recurringTask);
    toggleTaskCompletion(`${recurringTask.id}:2026-05-01`);

    editCustomTask(recurringTask.id, { dueDate: '2026-06-01T12:00:00.000Z' });

    const after = usePlanStore.getState().plan!.completedTaskIds;
    expect(after.find((k) => k.startsWith(`${recurringTask.id}:`))).toBeUndefined();
  });

  it('prunes `${id}:*` keys when patch.recurrence is present', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    const { addCustomTask, toggleTaskCompletion, editCustomTask } =
      usePlanStore.getState();
    addCustomTask(recurringTask);
    toggleTaskCompletion(`${recurringTask.id}:2026-05-01`);

    // Pass an empty patch object that explicitly carries the `recurrence` key (still
    // triggers recurrenceShapeChanged via hasOwnProperty) without violating
    // exactOptionalPropertyTypes. We cast through unknown so the shape check happens at
    // runtime in the store rather than at the call site.
    editCustomTask(
      recurringTask.id,
      { recurrence: undefined } as unknown as Partial<CustomTask>,
    );

    const after = usePlanStore.getState().plan!.completedTaskIds;
    expect(after.find((k) => k.startsWith(`${recurringTask.id}:`))).toBeUndefined();
  });

  it('leaves completedTaskIds untouched on cosmetic patches (title, notes)', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    const { addCustomTask, toggleTaskCompletion, editCustomTask } =
      usePlanStore.getState();
    addCustomTask(recurringTask);
    toggleTaskCompletion(`${recurringTask.id}:2026-05-01`);
    const before = [...usePlanStore.getState().plan!.completedTaskIds];

    editCustomTask(recurringTask.id, { title: 'Renamed' });
    editCustomTask(recurringTask.id, { notes: 'Some notes' });

    const after = usePlanStore.getState().plan!.completedTaskIds;
    expect(after).toEqual(before);
  });
});
