// @vitest-environment happy-dom
// tests/features/gantt/tooltip/ConstraintTooltip.a11y.test.tsx
// Phase 4 Plan 04-06 Task 1: ConstraintTooltip a11y additions —
// aria-live=polite, aria-atomic=true, key on eventId+reasons, Escape dismiss,
// sr-only summary span.
//
// Source: 04-06-PLAN.md Task 1 behaviors
//         04-RESEARCH.md §Pitfall 3 (re-announcement on real change only)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';
import { ConstraintTooltip } from '../../../../src/features/gantt/tooltip/ConstraintTooltip';
import { useUIStore } from '../../../../src/stores/uiStore';
import { useDragStore } from '../../../../src/stores/dragStore';

const flushFrames = async () => {
  await Promise.resolve();
  await new Promise((r) => requestAnimationFrame(() => r(null)));
};

beforeEach(() => {
  useUIStore.setState({ lastConstraintViolation: null });
  useDragStore.setState({
    transientEdit: null,
    dragPreviewEvents: null,
    isDragging: false,
    activeEventId: null,
    lastConstraintViolation: null,
  });
});

afterEach(() => {
  cleanup();
});

describe('ConstraintTooltip a11y plumbing (Plan 04-06 Task 1)', () => {
  it('Test A1: portal root has role=status, aria-live=polite, aria-atomic=true', async () => {
    useUIStore.setState({
      lastConstraintViolation: {
        eventId: 'e1',
        eventType: 'transplant',
        reasons: ['some reason'],
      },
    });
    render(<ConstraintTooltip />);
    await flushFrames();
    const pill = screen.getByTestId('constraint-tooltip');
    expect(pill.getAttribute('role')).toBe('status');
    expect(pill.getAttribute('aria-live')).toBe('polite');
    expect(pill.getAttribute('aria-atomic')).toBe('true');
  });

  it('Test A2: contains an sr-only span with the header + body summary for screen readers', async () => {
    useUIStore.setState({
      lastConstraintViolation: {
        eventId: 'e1',
        eventType: 'transplant',
        reasons: ['Tender plant clamped to last frost.'],
      },
    });
    render(<ConstraintTooltip />);
    await flushFrames();
    const pill = screen.getByTestId('constraint-tooltip');
    const srOnly = pill.querySelector('.sr-only');
    expect(srOnly).toBeTruthy();
    expect(srOnly?.textContent).toContain('TRANSPLANT BLOCKED');
    expect(srOnly?.textContent).toContain('Tender plant clamped to last frost.');
  });

  it('Test A3: changing reasons remounts the portal root (key derived from eventId+reasons)', async () => {
    useUIStore.setState({
      lastConstraintViolation: {
        eventId: 'e1',
        eventType: 'transplant',
        reasons: ['Reason one.'],
      },
    });
    const { rerender } = render(<ConstraintTooltip />);
    await flushFrames();
    const first = screen.getByTestId('constraint-tooltip');
    const firstKey = first.getAttribute('data-violation-key');
    expect(firstKey).toBe('e1|Reason one.');

    // Change reasons → key changes → React remounts the element.
    act(() => {
      useUIStore.setState({
        lastConstraintViolation: {
          eventId: 'e1',
          eventType: 'transplant',
          reasons: ['Reason two.'],
        },
      });
    });
    rerender(<ConstraintTooltip />);
    await flushFrames();
    const second = screen.getByTestId('constraint-tooltip');
    expect(second.getAttribute('data-violation-key')).toBe('e1|Reason two.');
  });

  it('Test A4: pressing Escape clears uiStore.lastConstraintViolation', async () => {
    useUIStore.setState({
      lastConstraintViolation: {
        eventId: 'e1',
        eventType: 'transplant',
        reasons: ['some reason'],
      },
    });
    render(<ConstraintTooltip />);
    await flushFrames();
    expect(screen.getByTestId('constraint-tooltip')).toBeTruthy();

    await act(async () => {
      const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(ev);
      await flushFrames();
    });

    expect(useUIStore.getState().lastConstraintViolation).toBeNull();
  });

  it('Test A5: Escape handler not registered when no violation present', async () => {
    // Should not throw when no violation; pressing Escape leaves state untouched.
    render(<ConstraintTooltip />);
    await flushFrames();
    expect(useUIStore.getState().lastConstraintViolation).toBeNull();
    await act(async () => {
      const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(ev);
      await flushFrames();
    });
    expect(useUIStore.getState().lastConstraintViolation).toBeNull();
  });
});
