// @vitest-environment happy-dom
// tests/features/calendar/CalendarView.test.tsx
// Phase 3 Plan 03-04 Task 3: minimal smoke tests for CalendarView default export.
// Source: 03-04-PLAN.md Task 3 (E) — minimal smoke since FullCalendar's internal
// rendering is its own test surface.

import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import CalendarView from '../../../src/features/calendar/CalendarView';
import { useDerivedSchedule } from '../../../src/features/gantt/useDerivedSchedule';
import { useExpandedTasks } from '../../../src/features/tasks/useExpandedTasks';
import { selectEventsForCalendar } from '../../../src/features/calendar/selectEventsForCalendar';
import { usePlanStore } from '../../../src/stores/planStore';
import { samplePlan } from '../../../src/samplePlan';
import { renderHook } from '@testing-library/react';
import { nowISOString, addDays, parseDate, toISODate } from '../../../src/domain/dateWrappers';
import type { CustomTask } from '../../../src/domain/types';

beforeEach(() => {
  cleanup();
  usePlanStore.setState({ plan: structuredClone(samplePlan) });
});

describe('CalendarView (Phase 3 Plan 03-04 Task 3)', () => {
  it('Test 1: default export exists and is a function/component', () => {
    expect(typeof CalendarView).toBe('function');
  });

  it('Test 2: renders FullCalendar (toolbar title element present)', () => {
    render(
      <MemoryRouter initialEntries={['/plan?view=calendar']}>
        <Routes>
          <Route path="/plan" element={<CalendarView />} />
        </Routes>
      </MemoryRouter>,
    );
    // FullCalendar renders .fc-toolbar-title — confirms the calendar mounted.
    const title = document.querySelector('.fc-toolbar-title');
    expect(title).not.toBeNull();
  });

  it('Test 3: dynamic import resolves to a module whose default IS the component (lazy-import smoke)', async () => {
    const mod = await import('../../../src/features/calendar/CalendarView');
    expect(mod.default).toBe(CalendarView);
    expect(typeof mod.default).toBe('function');
  });

  it('Test 4: expanded tasks flow through selectEventsForCalendar — recurring custom task adds task entries', () => {
    // Seed plan with a daily recurring task starting today, ending today + 6 (7 occurrences).
    const todayISO = nowISOString();
    const start = toISODate(parseDate(todayISO)).slice(0, 10);
    const endISO = toISODate(addDays(parseDate(todayISO), 6)).slice(0, 10);

    const recurringTask: CustomTask = {
      id: 'custom-recur-1',
      source: 'custom',
      title: 'Daily watering check',
      category: 'water',
      dueDate: `${start}T12:00:00.000Z`,
      recurrence: { type: 'daily', endDate: endISO },
      completed: false,
    };
    usePlanStore.setState({
      plan: { ...structuredClone(samplePlan), customTasks: [recurringTask] },
    });

    // Construct the same expansion the component would perform — verify the selector
    // produces the expected count: lifecycle events (sample plan) + N task entries.
    const eventsHook = renderHook(() => useDerivedSchedule());
    const tasksHook = renderHook(() => useExpandedTasks());
    const events = eventsHook.result.current;
    const tasks = tasksHook.result.current;

    // The recurring task should yield at least 7 occurrences inside the 60-day window
    const recurringOccurrences = tasks.filter((t) => t.id.startsWith('custom-recur-1'));
    expect(recurringOccurrences.length).toBeGreaterThanOrEqual(7);

    const calendarEventsWithTasks = selectEventsForCalendar(events, tasks);
    const calendarEventsWithoutTasks = selectEventsForCalendar(events, []);
    // The selector adds task entries on top of lifecycle entries.
    expect(calendarEventsWithTasks.length).toBe(
      calendarEventsWithoutTasks.length + tasks.length,
    );
  });
});
