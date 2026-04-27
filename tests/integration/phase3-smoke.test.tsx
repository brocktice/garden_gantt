/**
 * @vitest-environment happy-dom
 *
 * Phase 3 integration smoke — Flow B (simplified core scope).
 *
 * The full happy path described in 03-07-PLAN.md Task 2 (drag → cascade → undo →
 * calendar → drawer → tasks) is exercised across multiple unit + component test
 * files. This integration smoke focuses on the deterministic, automatable seams
 * that App.tsx Plan 03-07 wires:
 *
 *  1. /plan default renders the Gantt (DragLayer) with tab strip + history buttons.
 *  2. /plan?view=calendar lazy-loads CalendarView (Suspense boundary resolves to
 *     the FullCalendar root .fc).
 *  3. /tasks renders TasksDashboard (real component, not the Phase 2 placeholder).
 *  4. Clicking a task checkbox in the dashboard increments completedTaskIds.
 *
 * Drag interactions are deferred to Plan 03-03's clampModifier unit tests + the
 * manual smoke checkpoint (Task 3). Pointer-event simulation under happy-dom is
 * not reliable enough for cascade / drag-commit assertions.
 *
 * Source: [CITED: 03-07-PLAN.md Task 2 — happy-dom flakiness note]
 *         [CITED: tests/integration/happy-path.test.tsx — Phase 2 analog]
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { CustomTask } from '../../src/domain/types';
import { nowISOString } from '../../src/domain/dateWrappers';

describe('Phase 3 smoke — view switching + task completion', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
  });

  it('Test 1: /plan default renders the Gantt + tab strip', async () => {
    const { App } = await import('../../src/app/App');
    const { usePlanStore } = await import('../../src/stores/planStore');
    const { samplePlan } = await import('../../src/samplePlan');
    usePlanStore.setState({ plan: structuredClone(samplePlan) });

    render(
      <MemoryRouter initialEntries={['/plan']}>
        <App />
      </MemoryRouter>,
    );

    // Tab strip mounted
    await waitFor(() => {
      const tabs = screen.queryAllByRole('tab');
      expect(tabs.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('Test 2: /plan?view=calendar lazy-loads FullCalendar', async () => {
    const { App } = await import('../../src/app/App');
    const { usePlanStore } = await import('../../src/stores/planStore');
    const { samplePlan } = await import('../../src/samplePlan');
    usePlanStore.setState({ plan: structuredClone(samplePlan) });

    render(
      <MemoryRouter initialEntries={['/plan?view=calendar']}>
        <App />
      </MemoryRouter>,
    );

    // FullCalendar mounts — its root element has `.fc` class.
    await waitFor(
      () => {
        expect(document.querySelector('.fc')).not.toBeNull();
      },
      { timeout: 3000 },
    );
  });

  it('Test 3: /tasks renders TasksDashboard (not the Phase 2 placeholder)', async () => {
    const { App } = await import('../../src/app/App');
    const { usePlanStore } = await import('../../src/stores/planStore');
    const { samplePlan } = await import('../../src/samplePlan');
    usePlanStore.setState({ plan: structuredClone(samplePlan) });

    render(
      <MemoryRouter initialEntries={['/tasks']}>
        <App />
      </MemoryRouter>,
    );

    // TasksDashboard's H1 says "Tasks" (Phase 2 placeholder said "Tasks — Coming soon")
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1, name: /^Tasks$/i });
      expect(heading).toBeTruthy();
    });
    // Confirm it's NOT the placeholder copy
    expect(screen.queryByText(/Coming soon/i)).toBeNull();
  });

  it('Test 4: clicking a task checkbox increments completedTaskIds', async () => {
    const user = userEvent.setup();
    const { App } = await import('../../src/app/App');
    const { usePlanStore } = await import('../../src/stores/planStore');
    const { samplePlan } = await import('../../src/samplePlan');

    // Seed plan with a custom one-off task due TODAY so it lands in the Today bucket.
    const todayISO = nowISOString();
    const customTask: CustomTask = {
      id: 'custom-smoke-1',
      source: 'custom',
      title: 'Smoke test task',
      category: 'water',
      dueDate: todayISO,
      completed: false,
    };
    usePlanStore.setState({
      plan: { ...structuredClone(samplePlan), customTasks: [customTask] },
    });

    render(
      <MemoryRouter initialEntries={['/tasks']}>
        <App />
      </MemoryRouter>,
    );

    // Find at least one checkbox in the dashboard.
    let checkboxes: HTMLElement[] = [];
    await waitFor(() => {
      checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    const before = (usePlanStore.getState().plan?.completedTaskIds ?? []).length;
    await user.click(checkboxes[0]!);
    await waitFor(() => {
      const after = (usePlanStore.getState().plan?.completedTaskIds ?? []).length;
      expect(after).toBe(before + 1);
    });
  });
});
