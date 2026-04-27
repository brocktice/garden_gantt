/**
 * @vitest-environment happy-dom
 */
// tests/features/tasks/customTaskModal.attach.test.tsx
// CR-01 — Custom task plantingId persistence and round-trip.
// Source: .planning/phases/03-drag-cascade-calendar-tasks/03-08-PLAN.md Task 2
//         .planning/phases/03-drag-cascade-calendar-tasks/03-VERIFICATION.md gap CR-01

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CustomTask, Location, Planting } from '../../../src/domain/types';

const sampleLocation: Location = {
  zip: '20001',
  zone: '7a',
  lastFrostDate: '2026-04-15T12:00:00.000Z',
  firstFrostDate: '2026-10-20T12:00:00.000Z',
  source: 'manual',
};

const tomatoPlanting: Planting = {
  id: 'p-tomato',
  plantId: 'tomato',
  successionIndex: 0,
};

describe('CustomTaskModal — plantingId round-trip (CR-01)', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    const { usePlanStore } = await import('../../../src/stores/planStore');
    usePlanStore.setState({ plan: null });
    usePlanStore.getState().setLocation(sampleLocation);
    usePlanStore.getState().addPlanting(tomatoPlanting);
  });

  afterEach(() => {
    cleanup();
  });

  async function renderModal(editingTask: CustomTask | null = null) {
    const { CustomTaskModal } = await import(
      '../../../src/features/tasks/CustomTaskModal'
    );
    render(
      <CustomTaskModal
        open
        onOpenChange={() => {}}
        editingTask={editingTask}
      />,
    );
  }

  it('save with plantingId set → planStore.customTasks[0].plantingId is preserved', async () => {
    const user = userEvent.setup();
    await renderModal();

    // Type a title.
    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Mulch the tomato bed');

    // Open the attach select and pick the tomato planting.
    const trigger = screen.getByLabelText(/attach to planting/i);
    await user.click(trigger);
    const tomatoOption = screen.getByRole('option', { name: /tomato/i });
    await user.click(tomatoOption);

    // Click "Add task".
    const save = screen.getByRole('button', { name: /add task/i });
    await user.click(save);

    // Assert the persisted task carries plantingId.
    const { usePlanStore } = await import('../../../src/stores/planStore');
    const stored = usePlanStore.getState().plan!.customTasks[0];
    expect(stored).toBeDefined();
    expect(stored!.plantingId).toBe('p-tomato');
    // FREE_FLOATING placeholder must NOT leak into persisted data.
    expect(JSON.stringify(stored!)).not.toContain('__none__');
  });

  it('edit existing planting-attached task → form pre-fills with that plantingId', async () => {
    const seededTask: CustomTask = {
      id: 't-seeded',
      source: 'custom',
      plantingId: 'p-tomato',
      title: 'Existing tomato task',
      category: 'water',
      dueDate: '2026-05-01T12:00:00.000Z',
      completed: false,
    };
    const { usePlanStore } = await import('../../../src/stores/planStore');
    usePlanStore.getState().addCustomTask(seededTask);

    await renderModal(seededTask);

    // The Attach SelectTrigger renders the selected option's label as its visible text.
    // Free-floating shows "None — free-floating task"; an attached task should show the
    // plant's name (Tomato).
    const trigger = screen.getByLabelText(/attach to planting/i);
    expect(trigger.textContent ?? '').toMatch(/tomato/i);
    expect(trigger.textContent ?? '').not.toMatch(/none\s*—\s*free-floating/i);
  });

  it('save with plantingId = FREE_FLOATING → stored task has no plantingId field', async () => {
    const user = userEvent.setup();
    await renderModal();

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Free task');

    const save = screen.getByRole('button', { name: /add task/i });
    await user.click(save);

    const { usePlanStore } = await import('../../../src/stores/planStore');
    const stored = usePlanStore.getState().plan!.customTasks[0];
    expect(stored).toBeDefined();
    expect(stored!.plantingId).toBeUndefined();
    expect(JSON.stringify(stored!)).not.toContain('__none__');
  });
});
