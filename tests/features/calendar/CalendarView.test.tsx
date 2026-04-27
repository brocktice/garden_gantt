// @vitest-environment happy-dom
// tests/features/calendar/CalendarView.test.tsx
// Phase 3 Plan 03-04 Task 3: minimal smoke tests for CalendarView default export.
// Source: 03-04-PLAN.md Task 3 (E) — minimal smoke since FullCalendar's internal
// rendering is its own test surface.

import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import CalendarView from '../../../src/features/calendar/CalendarView';
import { usePlanStore } from '../../../src/stores/planStore';
import { samplePlan } from '../../../src/samplePlan';

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
});
