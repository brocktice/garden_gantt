/**
 * @vitest-environment happy-dom
 */
// tests/features/tasks/TasksDashboard.test.tsx
// Plan 03-05 Task 2 — component test for the dashboard route page.
// Covers: empty state, sections render, group-by toggle, per-row checkbox wiring,
// modal opens via "+ New task" button.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { Location, GardenPlan, CustomTask } from '../../../src/domain/types';

const sampleLocation: Location = {
  zip: '20001',
  zone: '7a',
  lastFrostDate: '2026-04-15T12:00:00.000Z',
  firstFrostDate: '2026-10-20T12:00:00.000Z',
  source: 'manual',
};

function todayISOFor(): string {
  // Match the dateWrappers nowISOString() — full ISO of "now"
  return new Date().toISOString();
}

describe('TasksDashboard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
  });

  async function renderDashboard() {
    vi.resetModules();
    const { TasksDashboard } = await import('../../../src/features/tasks/TasksDashboard');
    return render(
      <MemoryRouter>
        <TasksDashboard />
      </MemoryRouter>,
    );
  }

  it('Test 1 — renders empty state when no plan / no tasks', async () => {
    await renderDashboard();
    // No plan in store → empty state heading
    expect(screen.getByText(/No tasks yet\./i)).toBeTruthy();
    // Heading
    expect(screen.getByRole('heading', { level: 1, name: 'Tasks' })).toBeTruthy();
  });

  it('Test 2 — renders Today and This Week section headings + + New task button', async () => {
    // Seed plan with a custom task due today
    const today = todayISOFor();
    const planStoreModule = await import('../../../src/stores/planStore');
    planStoreModule.usePlanStore.getState().setLocation(sampleLocation);
    const ct: CustomTask = {
      id: 'C-today',
      source: 'custom',
      title: 'Water the basil',
      category: 'water',
      dueDate: today,
      completed: false,
    };
    planStoreModule.usePlanStore.getState().addCustomTask(ct);

    await renderDashboard();
    // Today section visible (heading includes count)
    expect(screen.getByRole('heading', { level: 2, name: /Today \(\d+\)/ })).toBeTruthy();
    // This Week section visible
    expect(screen.getByRole('heading', { level: 2, name: /This Week \(\d+\)/ })).toBeTruthy();
    // + New task button
    expect(screen.getByRole('button', { name: /new task/i })).toBeTruthy();
    // Task title shows up
    expect(screen.getByText('Water the basil')).toBeTruthy();
  });

  it('Test 3 — group-by toggle button switches label between plant and category', async () => {
    const planStoreModule = await import('../../../src/stores/planStore');
    planStoreModule.usePlanStore.getState().setLocation(sampleLocation);

    const user = userEvent.setup();
    await renderDashboard();
    const toggle = screen.getByRole('button', { name: /group by plant/i });
    expect(toggle).toBeTruthy();
    await user.click(toggle);
    // After click, label should reflect new value
    expect(screen.getByRole('button', { name: /group by category/i })).toBeTruthy();
  });

  it('Test 4 — per-row checkbox calls toggleTaskCompletion', async () => {
    const today = todayISOFor();
    const planStoreModule = await import('../../../src/stores/planStore');
    planStoreModule.usePlanStore.getState().setLocation(sampleLocation);
    const ct: CustomTask = {
      id: 'C-toggle',
      source: 'custom',
      title: 'Toggle me',
      category: 'water',
      dueDate: today,
      completed: false,
    };
    planStoreModule.usePlanStore.getState().addCustomTask(ct);

    const user = userEvent.setup();
    await renderDashboard();
    // Find the row by title; the checkbox is the input within the row
    const row = screen.getByText('Toggle me').closest('li');
    expect(row).toBeTruthy();
    const checkbox = within(row as HTMLElement).getByRole('checkbox');
    await user.click(checkbox);
    // After toggling, the id 'C-toggle' should be in completedTaskIds
    const plan = planStoreModule.usePlanStore.getState().plan as GardenPlan;
    expect(plan.completedTaskIds).toContain('C-toggle');
  });

  it('Test 5 — clicking + New task opens the modal (CustomTaskModal renders dialog)', async () => {
    const planStoreModule = await import('../../../src/stores/planStore');
    planStoreModule.usePlanStore.getState().setLocation(sampleLocation);

    const user = userEvent.setup();
    await renderDashboard();
    const newTaskBtn = screen.getByRole('button', { name: /new task/i });
    await user.click(newTaskBtn);
    // Radix Dialog renders with role="dialog"
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
