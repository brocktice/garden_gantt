/**
 * @vitest-environment happy-dom
 */
// tests/features/onboarding/useCoachMarks.test.ts
// Phase 4 Plan 04-04 Task 1: useCoachMarks controller hook + MARKS content table.
//
// Source: .planning/phases/04-polish-mobile-ship/04-04-PLAN.md (Task 1)
//         04-UI-SPEC.md §Onboarding coach marks
//         04-RESEARCH.md §Open Question 2 (staged reveal)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCoachMarks } from '../../../src/features/onboarding/useCoachMarks';
import { MARKS, MARK_IDS } from '../../../src/features/onboarding/coachMarks.types';
import { useUIStore } from '../../../src/stores/uiStore';
import { usePlanStore } from '../../../src/stores/planStore';
import { samplePlan } from '../../../src/samplePlan';

beforeEach(() => {
  // Fresh stores per test
  window.localStorage.clear();
  useUIStore.getState().setCoachMarksDismissed(false);
  // Plan with no plantings by default
  usePlanStore.setState({
    plan: { ...samplePlan, plantings: [] },
  });
});

afterEach(() => {
  // Clean up
  useUIStore.getState().setCoachMarksDismissed(false);
});

describe('MARKS content table', () => {
  it('exposes 4 marks with the verbatim UI-SPEC copy', () => {
    expect(MARKS).toHaveLength(4);
    expect(MARKS[0]!.id).toBe('catalog-button');
    expect(MARKS[0]!.headingLabel).toBe('Pick your plants here');
    expect(MARKS[0]!.body).toBe(
      'Browse the catalog or add custom plants to start your gantt.',
    );
    expect(MARKS[0]!.requiresPlantings).toBe(false);

    expect(MARKS[1]!.id).toBe('first-bar');
    expect(MARKS[1]!.headingLabel).toBe('Drag to adjust dates');
    expect(MARKS[1]!.requiresPlantings).toBe(true);

    expect(MARKS[2]!.id).toBe('first-lock-toggle');
    expect(MARKS[2]!.headingLabel).toBe('Lock to pin a date');
    expect(MARKS[2]!.requiresPlantings).toBe(true);

    expect(MARKS[3]!.id).toBe('calendar-tab');
    expect(MARKS[3]!.headingLabel).toBe('Switch to calendar view');
    expect(MARKS[3]!.requiresPlantings).toBe(true);
  });

  it('MARK_IDS lists each id', () => {
    expect(MARK_IDS).toEqual([
      'catalog-button',
      'first-bar',
      'first-lock-toggle',
      'calendar-tab',
    ]);
  });
});

describe('useCoachMarks — dismissed gate', () => {
  it('returns active=false when coachMarksDismissed===true', () => {
    useUIStore.getState().setCoachMarksDismissed(true);
    const { result } = renderHook(() => useCoachMarks('/plan'));
    expect(result.current.active).toBe(false);
    expect(result.current.currentMark).toBeNull();
  });
});

describe('useCoachMarks — route gate', () => {
  it('returns active=false when route is /setup', () => {
    const { result } = renderHook(() => useCoachMarks('/setup'));
    expect(result.current.active).toBe(false);
  });

  it('returns active=false when route is /tasks', () => {
    const { result } = renderHook(() => useCoachMarks('/tasks'));
    expect(result.current.active).toBe(false);
  });

  it('returns active=true on /plan with no plantings (mark 1 only)', () => {
    const { result } = renderHook(() => useCoachMarks('/plan'));
    expect(result.current.active).toBe(true);
    expect(result.current.currentMark?.id).toBe('catalog-button');
    expect(result.current.totalCount).toBe(1);
  });

  it('returns active=true on /plan?view=calendar', () => {
    const { result } = renderHook(() => useCoachMarks('/plan?view=calendar'));
    expect(result.current.active).toBe(true);
  });
});

describe('useCoachMarks — staged reveal (RESEARCH Open Question 2)', () => {
  it('exposes only mark 1 when plantings.length === 0', () => {
    const { result } = renderHook(() => useCoachMarks('/plan'));
    expect(result.current.totalCount).toBe(1);
    expect(result.current.currentMark?.id).toBe('catalog-button');
  });

  it('exposes all 4 marks when plantings.length >= 1', () => {
    usePlanStore.setState({
      plan: { ...samplePlan },
    });
    const { result } = renderHook(() => useCoachMarks('/plan'));
    expect(result.current.totalCount).toBe(4);
    expect(result.current.currentMark?.id).toBe('catalog-button');
  });

  it('still on mark 1 when plantings exist and currentIndex===0', () => {
    usePlanStore.setState({ plan: { ...samplePlan } });
    const { result } = renderHook(() => useCoachMarks('/plan'));
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentMark?.id).toBe('catalog-button');
  });
});

describe('useCoachMarks — advance + dismiss', () => {
  it('dismiss() flips coachMarksDismissed to true', () => {
    const { result } = renderHook(() => useCoachMarks('/plan'));
    act(() => {
      result.current.dismiss();
    });
    expect(useUIStore.getState().onboarding.coachMarksDismissed).toBe(true);
  });

  it('advance() bumps currentIndex when plantings present', () => {
    usePlanStore.setState({ plan: { ...samplePlan } });
    const { result } = renderHook(() => useCoachMarks('/plan'));
    expect(result.current.currentIndex).toBe(0);
    act(() => {
      result.current.advance();
    });
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentMark?.id).toBe('first-bar');
  });

  it('advance() on last mark dismisses (Got it behavior)', () => {
    usePlanStore.setState({ plan: { ...samplePlan } });
    const { result } = renderHook(() => useCoachMarks('/plan'));
    act(() => {
      result.current.advance(); // 0 -> 1
      result.current.advance(); // 1 -> 2
      result.current.advance(); // 2 -> 3
    });
    expect(result.current.currentIndex).toBe(3);
    expect(result.current.isLast).toBe(true);
    act(() => {
      result.current.advance(); // last -> dismiss
    });
    expect(useUIStore.getState().onboarding.coachMarksDismissed).toBe(true);
  });

  it('isLast is true when currentIndex === totalCount - 1', () => {
    usePlanStore.setState({ plan: { ...samplePlan } });
    const { result } = renderHook(() => useCoachMarks('/plan'));
    expect(result.current.isLast).toBe(false);
    act(() => {
      result.current.advance();
      result.current.advance();
      result.current.advance();
    });
    expect(result.current.isLast).toBe(true);
  });
});

describe('useCoachMarks — clamp on stage drop', () => {
  it('clamps currentIndex to mark 0 when plantings.length===0 and total drops to 1', () => {
    // Start with plantings, advance, then remove plantings -- index should clamp.
    usePlanStore.setState({ plan: { ...samplePlan } });
    const { result, rerender } = renderHook(() => useCoachMarks('/plan'));
    act(() => {
      result.current.advance(); // currentIndex -> 1
    });
    expect(result.current.currentIndex).toBe(1);
    // Drop plantings -- visibleMarks shrinks to 1, safeIndex clamps to 0.
    act(() => {
      usePlanStore.setState({
        plan: { ...samplePlan, plantings: [] },
      });
    });
    rerender();
    expect(result.current.totalCount).toBe(1);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentMark?.id).toBe('catalog-button');
  });
});
