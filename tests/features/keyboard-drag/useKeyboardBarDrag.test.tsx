// @vitest-environment happy-dom
// tests/features/keyboard-drag/useKeyboardBarDrag.test.tsx
// Phase 4 Plan 04-06 Task 2: Linear-style keyboard drag controller for gantt bars.
//
// Source: 04-06-PLAN.md Task 2 behaviors
//         04-UI-SPEC.md §Keyboard drag affordance (POL-08)
//         04-RESEARCH.md §Pitfall 4 (KeyboardSensor vs foreignObject focus collision)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useKeyboardBarDrag } from '../../../src/features/keyboard-drag/useKeyboardBarDrag';
import { usePlanStore } from '../../../src/stores/planStore';
import type { GardenPlan } from '../../../src/domain/types';

const basePlan: GardenPlan = {
  schemaVersion: 3,
  id: 'kbd-test',
  name: 'kbd test plan',
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

const ORIGINAL_START = '2026-05-01T12:00:00.000Z';

function Harness() {
  useKeyboardBarDrag();
  return (
    <>
      <div
        data-testid="bar"
        data-event-id="evt1"
        data-planting-id="P1"
        data-event-type="transplant"
        data-event-start={ORIGINAL_START}
        tabIndex={0}
      />
      <div data-testid="other" tabIndex={0} />
      <input data-testid="form-input" />
      <div aria-live="polite" className="sr-only" id="kbd-drag-announcer" />
    </>
  );
}

let commitSpy: ReturnType<typeof vi.fn>;
let setLockSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  usePlanStore.setState({ plan: structuredClone(basePlan) as GardenPlan });
  // Replace the store actions with fresh vi.fn spies. This is more deterministic
  // than vi.spyOn (which can carry call history across tests when the target
  // object is shared).
  commitSpy = vi.fn();
  setLockSpy = vi.fn();
  usePlanStore.setState({
    commitEdit: commitSpy,
    setLock: setLockSpy,
  } as unknown as Parameters<typeof usePlanStore.setState>[0]);
  // Reset announcer between tests
  const a = document.getElementById('kbd-drag-announcer');
  if (a) a.textContent = '';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function pressKey(target: HTMLElement, key: string, opts: { shiftKey?: boolean } = {}) {
  fireEvent.keyDown(target, { key, ...opts, bubbles: true });
}

describe('useKeyboardBarDrag (Plan 04-06 Task 2)', () => {
  it('Test 1: ArrowRight stages +1 day; does NOT call commitEdit', () => {
    const { getByTestId } = render(<Harness />);
    const bar = getByTestId('bar') as HTMLElement;
    bar.focus();
    pressKey(bar, 'ArrowRight');
    expect(commitSpy).not.toHaveBeenCalled();
    const announcer = document.getElementById('kbd-drag-announcer');
    expect(announcer?.textContent).toMatch(/\+1 day/);
    expect(announcer?.textContent).toMatch(/2026-05-02/);
  });

  it('Test 2: Shift+ArrowRight stages +7 days', () => {
    const { getByTestId } = render(<Harness />);
    const bar = getByTestId('bar') as HTMLElement;
    bar.focus();
    pressKey(bar, 'ArrowRight', { shiftKey: true });
    const announcer = document.getElementById('kbd-drag-announcer');
    expect(announcer?.textContent).toMatch(/\+7 day/);
    expect(announcer?.textContent).toMatch(/2026-05-08/);
  });

  it('Test 3: Enter commits via planStore.commitEdit ONCE with newStart=originalStart+delta', () => {
    const { getByTestId } = render(<Harness />);
    const bar = getByTestId('bar') as HTMLElement;
    bar.focus();
    pressKey(bar, 'ArrowRight');
    pressKey(bar, 'ArrowRight'); // pending = +2
    pressKey(bar, 'Enter');
    expect(commitSpy).toHaveBeenCalledTimes(1);
    const arg = commitSpy.mock.calls[0]![0] as {
      plantingId: string;
      eventType: string;
      startOverride: string;
      reason: string;
    };
    expect(arg.plantingId).toBe('P1');
    expect(arg.eventType).toBe('transplant');
    expect(arg.startOverride).toBe('2026-05-03T12:00:00.000Z');
    expect(arg.reason).toBe('user-form-edit');
    const announcer = document.getElementById('kbd-drag-announcer');
    expect(announcer?.textContent).toMatch(/Moved to 2026-05-03/);
  });

  it('Test 4: Escape after staging cancels — no commit, announcer says canceled', () => {
    const { getByTestId } = render(<Harness />);
    const bar = getByTestId('bar') as HTMLElement;
    bar.focus();
    pressKey(bar, 'ArrowRight');
    pressKey(bar, 'Escape');
    expect(commitSpy).not.toHaveBeenCalled();
    const announcer = document.getElementById('kbd-drag-announcer');
    expect(announcer?.textContent).toMatch(/Drag canceled/i);
    // After cancel, Enter should be a no-op (delta cleared).
    pressKey(bar, 'Enter');
    expect(commitSpy).not.toHaveBeenCalled();
  });

  it('Test 5: L key calls planStore.setLock with toggled value; announces Locked/Unlocked', () => {
    const { getByTestId } = render(<Harness />);
    const bar = getByTestId('bar') as HTMLElement;
    bar.focus();
    pressKey(bar, 'l');
    expect(setLockSpy).toHaveBeenCalledWith('P1', 'transplant', true);
    const announcer = document.getElementById('kbd-drag-announcer');
    expect(announcer?.textContent).toMatch(/Locked/i);
  });

  it('Test 6: arrow keys are no-ops when focus is in a form input (isFormFocus guard)', () => {
    const { getByTestId } = render(<Harness />);
    const input = getByTestId('form-input') as HTMLInputElement;
    input.focus();
    pressKey(input, 'ArrowRight');
    expect(commitSpy).not.toHaveBeenCalled();
    const announcer = document.getElementById('kbd-drag-announcer');
    // Announcer should be untouched (empty).
    expect(announcer?.textContent ?? '').toBe('');
  });

  it('Test 7: arrow keys are no-ops when focus has no [data-event-id] ancestor', () => {
    const { getByTestId } = render(<Harness />);
    const other = getByTestId('other') as HTMLElement;
    other.focus();
    pressKey(other, 'ArrowRight');
    pressKey(other, 'Enter');
    expect(commitSpy).not.toHaveBeenCalled();
  });

  it('Test 8: ArrowLeft stages -1 day', () => {
    const { getByTestId } = render(<Harness />);
    const bar = getByTestId('bar') as HTMLElement;
    bar.focus();
    pressKey(bar, 'ArrowLeft');
    const announcer = document.getElementById('kbd-drag-announcer');
    expect(announcer?.textContent).toMatch(/-1 day/);
    expect(announcer?.textContent).toMatch(/2026-04-30/);
  });

  it('Test 9: Enter with zero pending delta is a no-op (no commit)', () => {
    const { getByTestId } = render(<Harness />);
    const bar = getByTestId('bar') as HTMLElement;
    bar.focus();
    pressKey(bar, 'Enter');
    expect(commitSpy).not.toHaveBeenCalled();
  });

  it('Test 10: pressing arrow on a different bar (after focusing it) resets pending state', () => {
    const { container } = render(<Harness />);
    // Add a second bar dynamically.
    const bar2 = document.createElement('div');
    bar2.setAttribute('data-event-id', 'evt2');
    bar2.setAttribute('data-planting-id', 'P1');
    bar2.setAttribute('data-event-type', 'indoor-start');
    bar2.setAttribute('data-event-start', '2026-03-01T12:00:00.000Z');
    bar2.tabIndex = 0;
    container.appendChild(bar2);
    const bar1 = container.querySelector('[data-event-id="evt1"]') as HTMLElement;

    bar1.focus();
    pressKey(bar1, 'ArrowRight');
    pressKey(bar1, 'ArrowRight'); // +2 days on bar1
    bar2.focus();
    pressKey(bar2, 'ArrowRight'); // resets pending; should be +1 on bar2
    pressKey(bar2, 'Enter');
    expect(commitSpy).toHaveBeenCalledTimes(1);
    const arg = commitSpy.mock.calls[0]![0] as {
      plantingId: string;
      eventType: string;
      startOverride: string;
    };
    expect(arg.plantingId).toBe('P1');
    expect(arg.eventType).toBe('indoor-start');
    expect(arg.startOverride).toBe('2026-03-02T12:00:00.000Z');
  });
});
