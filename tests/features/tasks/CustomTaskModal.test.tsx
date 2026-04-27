/**
 * @vitest-environment happy-dom
 */
// tests/features/tasks/CustomTaskModal.test.tsx
// Plan 03-05 Task 3 — author + edit + delete with TaskRecurrence form.
// Mirrors tests/features/catalog/CustomPlantModal.test.tsx shape.

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

describe('CustomTaskModal', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    const { usePlanStore } = await import('../../../src/stores/planStore');
    usePlanStore.setState({ plan: null });
  });

  afterEach(() => {
    cleanup();
  });

  async function renderModal(editingTask: CustomTask | null = null) {
    const { CustomTaskModal } = await import(
      '../../../src/features/tasks/CustomTaskModal'
    );
    let openState = true;
    const onOpenChange = (next: boolean) => {
      openState = next;
    };
    const utils = render(
      <CustomTaskModal
        open
        onOpenChange={onOpenChange}
        editingTask={editingTask}
      />,
    );
    return { ...utils, getOpenState: () => openState };
  }

  it('Test 1 — Save (Add task) is disabled until title is non-empty', async () => {
    const user = userEvent.setup();
    await renderModal();
    const save = screen.getByRole('button', { name: /add task/i }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Mulch the beds');
    expect(save.disabled).toBe(false);
  });

  it('Test 2 — recurrence radios swap conditional fields (One time vs Every N days)', async () => {
    const user = userEvent.setup();
    await renderModal();
    // One-time should be the default; the date input is visible
    expect(screen.getByLabelText(/^due/i)).toBeTruthy();
    // Switch to "Every N days"
    const everyNRadio = screen.getByRole('radio', { name: /every n days/i });
    await user.click(everyNRadio);
    // Interval input appears
    expect(screen.getByLabelText(/interval/i)).toBeTruthy();
    // Switch back to one-time
    const oneTimeRadio = screen.getByRole('radio', { name: /one time/i });
    await user.click(oneTimeRadio);
    expect(screen.getByLabelText(/^due/i)).toBeTruthy();
  });

  it('Test 3 — attach-to-planting dropdown shows None + seeded plantings', async () => {
    const { usePlanStore } = await import('../../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    const planting: Planting = {
      id: 'p-tomato',
      plantId: 'tomato',
      successionIndex: 0,
    };
    usePlanStore.getState().addPlanting(planting);

    const user = userEvent.setup();
    await renderModal();
    // The attach select trigger
    const trigger = screen.getByLabelText(/attach to planting/i);
    await user.click(trigger);
    // Open listbox should expose the options as elements with role="option" (Radix Select)
    const noneOption = screen.getByRole('option', { name: /none — free-floating/i });
    expect(noneOption).toBeTruthy();
    const tomatoOption = screen.getByRole('option', { name: /tomato/i });
    expect(tomatoOption).toBeTruthy();
  });

  it('Test 4 — edit mode: Delete button reveals inline confirm; confirming removes task', async () => {
    const { usePlanStore } = await import('../../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    const ct: CustomTask = {
      id: 'C-edit',
      source: 'custom',
      title: 'Edit me',
      category: 'custom',
      dueDate: '2026-05-15T12:00:00.000Z',
      completed: false,
    };
    usePlanStore.getState().addCustomTask(ct);

    const user = userEvent.setup();
    await renderModal(ct);
    const deleteBtn = screen.getByRole('button', { name: /delete task/i });
    await user.click(deleteBtn);
    // Confirm UI shows
    expect(screen.getByText(/delete this task\?/i)).toBeTruthy();
    // Confirm
    const confirm = screen.getByRole('button', { name: /^delete task$/i });
    await user.click(confirm);
    // Task removed from store
    const plan = usePlanStore.getState().plan!;
    expect(plan.customTasks.find((t) => t.id === 'C-edit')).toBeUndefined();
  });

  it('Test 5 — clearable interval input accepts empty string without crashing', async () => {
    const user = userEvent.setup();
    await renderModal();
    // Switch to "Every N days"
    const everyNRadio = screen.getByRole('radio', { name: /every n days/i });
    await user.click(everyNRadio);
    const intervalInput = screen.getByLabelText(/interval/i) as HTMLInputElement;
    await user.type(intervalInput, '3');
    expect(intervalInput.value).toBe('3');
    await user.clear(intervalInput);
    expect(intervalInput.value).toBe('');
    // No crash, modal still mounted
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
