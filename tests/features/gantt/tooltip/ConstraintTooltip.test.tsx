// @vitest-environment happy-dom
// tests/features/gantt/tooltip/ConstraintTooltip.test.tsx
// Phase 3 Plan 03-03 Task 3: ConstraintTooltip — portaled snap-back pill.
// Source: 03-03-PLAN.md Task 3 behaviors 1-8.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';
import { ConstraintTooltip } from '../../../../src/features/gantt/tooltip/ConstraintTooltip';
import { useUIStore } from '../../../../src/stores/uiStore';
import { useDragStore } from '../../../../src/stores/dragStore';

const flushFrames = async () => {
  // Microtask flush + one rAF for cursor tracker.
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

describe('ConstraintTooltip (Phase 3 Plan 03-03)', () => {
  it('Test 1: no violation, no render — returns null and does not portal', () => {
    render(<ConstraintTooltip />);
    expect(screen.queryByTestId('constraint-tooltip')).toBeNull();
  });

  it('Test 2: sticky pill from uiStore — renders header + body + <strong>-wrapped date', async () => {
    useUIStore.setState({
      lastConstraintViolation: {
        eventId: 'e1',
        eventType: 'transplant',
        reasons: ['Tender plant: clamped transplant to last frost (May 15, 2026).'],
      },
    });
    render(<ConstraintTooltip />);
    await flushFrames();
    const pill = screen.getByTestId('constraint-tooltip');
    expect(pill).toBeTruthy();
    expect(pill.textContent).toContain('TRANSPLANT BLOCKED');
    expect(pill.textContent).toContain('Tender plant');
    // Date "May 15, 2026" wrapped in <strong>
    const strongs = pill.querySelectorAll('strong');
    expect(strongs.length).toBeGreaterThan(0);
    expect(Array.from(strongs).some((s) => s.textContent === 'May 15, 2026')).toBe(true);
  });

  it('Test 3: lifecycle accent — border-left-color matches lifecyclePalette.transplant', async () => {
    useUIStore.setState({
      lastConstraintViolation: {
        eventId: 'e1',
        eventType: 'transplant',
        reasons: ['some reason'],
      },
    });
    render(<ConstraintTooltip />);
    await flushFrames();
    const pill = screen.getByTestId('constraint-tooltip') as HTMLElement;
    // Inline style.borderLeftColor should match palette.transplant (#16A34A → rgb(22, 163, 74))
    // happy-dom may serialize either form; accept either hex or rgb.
    const c = pill.style.borderLeftColor.toLowerCase();
    expect(
      c === '#16a34a' ||
        c === 'rgb(22, 163, 74)' ||
        c.includes('22, 163, 74') ||
        c.includes('16a34a'),
    ).toBe(true);
  });

  it('Test 4: defensive empty reasons — fallback header + fallback body', async () => {
    useUIStore.setState({
      lastConstraintViolation: {
        // Use an event type NOT in the HEADER_BY_TYPE map so the fallback header fires.
        eventId: 'e1',
        eventType: 'germination-window',
        reasons: [],
      },
    });
    render(<ConstraintTooltip />);
    await flushFrames();
    const pill = screen.getByTestId('constraint-tooltip');
    expect(pill.textContent).toContain('Move blocked');
    expect(pill.textContent).toContain("This date isn't allowed");
  });

  it('Test 5: event-type → header label mapping (4 cases)', async () => {
    const cases: Array<[
      'transplant' | 'indoor-start' | 'direct-sow' | 'harvest-window',
      string,
    ]> = [
      ['transplant', 'TRANSPLANT BLOCKED'],
      ['indoor-start', 'INDOOR-START BLOCKED'],
      ['direct-sow', 'DIRECT-SOW BLOCKED'],
      ['harvest-window', 'HARVEST EXTEND BLOCKED'],
    ];
    for (const [type, expected] of cases) {
      cleanup();
      useUIStore.setState({
        lastConstraintViolation: {
          eventId: 'e1',
          eventType: type,
          reasons: ['reason'],
        },
      });
      render(<ConstraintTooltip />);
      await flushFrames();
      const pill = screen.getByTestId('constraint-tooltip');
      expect(pill.textContent).toContain(expected);
    }
  });

  it('Test 6: role=status — a11y-ready', async () => {
    useUIStore.setState({
      lastConstraintViolation: {
        eventId: 'e1',
        eventType: 'transplant',
        reasons: ['reason'],
      },
    });
    render(<ConstraintTooltip />);
    await flushFrames();
    const pill = screen.getByTestId('constraint-tooltip');
    expect(pill.getAttribute('role')).toBe('status');
  });

  it('Test 7: Mode B bar-anchored — pill positions above the bar element', async () => {
    // Mount a stub bar in the DOM to be the anchor.
    const bar = document.createElement('div');
    bar.setAttribute('data-event-id', 'e1');
    Object.defineProperty(bar, 'getBoundingClientRect', {
      value: () => ({
        left: 200,
        top: 300,
        width: 100,
        height: 20,
        right: 300,
        bottom: 320,
        x: 200,
        y: 300,
        toJSON() {
          return {};
        },
      }),
    });
    document.body.appendChild(bar);

    useUIStore.setState({
      lastConstraintViolation: {
        eventId: 'e1',
        eventType: 'transplant',
        reasons: ['anchored test'],
      },
    });
    render(<ConstraintTooltip />);
    await flushFrames();
    // microtask compute → re-flush
    await flushFrames();
    const pill = screen.getByTestId('constraint-tooltip') as HTMLElement;
    // PILL_W = 280; left = 200 + 50 - 140 = 110.
    expect(pill.style.left).toBe('110px');
    // top: bar at 300, pill height 64, gap 8 → 300 - 64 - 8 = 228.
    expect(pill.style.top).toBe('228px');
    document.body.removeChild(bar);
  });

  it('Test 8: Mode A cursor-tracking — pointermove updates pill position with offset', async () => {
    useDragStore.setState({
      isDragging: true,
      activeEventId: 'e1',
      lastConstraintViolation: {
        eventId: 'e1',
        eventType: 'transplant',
        reasons: ['cursor test'],
      },
    });
    render(<ConstraintTooltip />);
    await flushFrames();
    // Dispatch a pointermove with clientX/clientY.
    await act(async () => {
      const ev = new Event('pointermove') as PointerEvent;
      Object.defineProperty(ev, 'clientX', { value: 400 });
      Object.defineProperty(ev, 'clientY', { value: 250 });
      document.dispatchEvent(ev);
      await flushFrames();
    });
    const pill = screen.getByTestId('constraint-tooltip') as HTMLElement;
    // CURSOR_OFFSET = 16 → 400+16=416, 250+16=266.
    expect(pill.style.left).toBe('416px');
    expect(pill.style.top).toBe('266px');
  });
});
