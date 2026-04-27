// @vitest-environment happy-dom
// tests/features/gantt/lock/LockToggle.test.tsx
// Phase 3 Plan 03-06 Task 1: LockToggle component + useLockKeybinding hook tests.
// Source: 03-06-PLAN.md Task 1 behaviors 1-9.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { LockToggle } from '../../../../src/features/gantt/lock/LockToggle';
import { useLockKeybinding } from '../../../../src/features/gantt/lock/useLockKeybinding';
import { usePlanStore } from '../../../../src/stores/planStore';
import type { GardenPlan } from '../../../../src/domain/types';

const basePlan: GardenPlan = {
  schemaVersion: 3,
  id: 'lock-test',
  name: 'lock test plan',
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
  location: {
    zip: '20001',
    zone: '7a',
    lastFrostDate: '2026-04-15T12:00:00.000Z',
    firstFrostDate: '2026-10-20T12:00:00.000Z',
    source: 'manual',
  },
  customPlants: [],
  plantings: [{ id: 'P1', plantId: 'tomato', successionIndex: 0 }],
  customTasks: [],
  edits: [],
  completedTaskIds: [],
  settings: { units: 'imperial', weekStartsOn: 0, timezone: 'America/New_York' },
};

beforeEach(() => {
  usePlanStore.setState({ plan: structuredClone(basePlan) as GardenPlan });
});

afterEach(() => {
  cleanup();
});

describe('LockToggle (Phase 3 Plan 03-06)', () => {
  it('Test 1: unlocked state renders LockOpen icon button with opacity-0 (hover-revealed via group)', () => {
    render(
      <LockToggle plantingId="P1" eventType="transplant" locked={false} plantName="Tomato" />,
    );
    const btn = screen.getByRole('button', { name: /Lock Tomato transplant/i });
    expect(btn).toBeTruthy();
    // Hover-revealed via parent group: opacity-0 by default, group-hover:opacity-100.
    expect(btn.className).toMatch(/opacity-0/);
    expect(btn.className).toMatch(/group-hover:opacity-100/);
  });

  it('Test 2: locked state renders Lock icon button with opacity-100 (always visible)', () => {
    render(
      <LockToggle plantingId="P1" eventType="transplant" locked={true} plantName="Tomato" />,
    );
    const btn = screen.getByRole('button', { name: /Unlock Tomato transplant/i });
    expect(btn).toBeTruthy();
    expect(btn.className).toMatch(/opacity-100/);
    // Should NOT depend on group-hover when locked.
    expect(btn.className).not.toMatch(/group-hover:opacity-100/);
  });

  it('Test 3: clicking the button calls planStore.setLock with toggled value', () => {
    const setLockSpy = vi.spyOn(usePlanStore.getState(), 'setLock');
    // Re-set state to ensure spy is bound (zustand getState returns same object instance per render).
    render(
      <LockToggle plantingId="P1" eventType="transplant" locked={false} plantName="Tomato" />,
    );
    const btn = screen.getByRole('button', { name: /Lock Tomato transplant/i });
    fireEvent.click(btn);
    expect(setLockSpy).toHaveBeenCalledWith('P1', 'transplant', true);
    setLockSpy.mockRestore();
  });

  it('Test 4: aria-label format reflects locked vs unlocked state', () => {
    const { rerender } = render(
      <LockToggle plantingId="P1" eventType="transplant" locked={false} plantName="Tomato" />,
    );
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe(
      'Lock Tomato transplant',
    );
    rerender(
      <LockToggle plantingId="P1" eventType="transplant" locked={true} plantName="Tomato" />,
    );
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe(
      'Unlock Tomato transplant',
    );
  });

  it('Test 5: button has 24x24 hit-target (w-6 h-6) and icon is 16x16 (w-4 h-4)', () => {
    render(
      <LockToggle plantingId="P1" eventType="transplant" locked={false} plantName="Tomato" />,
    );
    const btn = screen.getByRole('button', { name: /Lock Tomato transplant/i });
    expect(btn.className).toMatch(/w-6/);
    expect(btn.className).toMatch(/h-6/);
    const icon = btn.querySelector('svg');
    expect(icon).toBeTruthy();
    expect(icon!.getAttribute('class')).toMatch(/w-4/);
    expect(icon!.getAttribute('class')).toMatch(/h-4/);
  });
});

// Mount harness for the hook.
function HookHost() {
  useLockKeybinding();
  return (
    <div>
      <div
        data-testid="bar1"
        data-event-id="P1:transplant"
        data-planting-id="P1"
        data-event-type="transplant"
      >
        bar1
      </div>
      <div data-testid="non-bar">no data attrs here</div>
    </div>
  );
}

describe('useLockKeybinding (Phase 3 Plan 03-06)', () => {
  it('Test 6: Alt-click on a bar with data attrs calls setLock with toggled value', () => {
    const setLockSpy = vi.spyOn(usePlanStore.getState(), 'setLock');
    render(<HookHost />);
    const bar = screen.getByTestId('bar1');
    fireEvent.click(bar, { altKey: true });
    expect(setLockSpy).toHaveBeenCalledWith('P1', 'transplant', true);
    setLockSpy.mockRestore();
  });

  it('Test 7: regular click (no altKey) is ignored — setLock NOT called', () => {
    const setLockSpy = vi.spyOn(usePlanStore.getState(), 'setLock');
    render(<HookHost />);
    const bar = screen.getByTestId('bar1');
    fireEvent.click(bar); // no altKey
    expect(setLockSpy).not.toHaveBeenCalled();
    setLockSpy.mockRestore();
  });

  it('Test 8: Alt-click on element WITHOUT [data-event-id] is a no-op', () => {
    const setLockSpy = vi.spyOn(usePlanStore.getState(), 'setLock');
    render(<HookHost />);
    const non = screen.getByTestId('non-bar');
    fireEvent.click(non, { altKey: true });
    expect(setLockSpy).not.toHaveBeenCalled();
    setLockSpy.mockRestore();
  });

  it('Test 9: Alt-click toggles existing lock state (true → false)', () => {
    // Pre-seed with transplant locked=true.
    usePlanStore.setState({
      plan: {
        ...basePlan,
        plantings: [
          { id: 'P1', plantId: 'tomato', successionIndex: 0, locks: { transplant: true } },
        ],
      },
    });
    const setLockSpy = vi.spyOn(usePlanStore.getState(), 'setLock');
    render(<HookHost />);
    const bar = screen.getByTestId('bar1');
    fireEvent.click(bar, { altKey: true });
    // Currently locked=true → should toggle to false.
    expect(setLockSpy).toHaveBeenCalledWith('P1', 'transplant', false);
    setLockSpy.mockRestore();
  });
});
