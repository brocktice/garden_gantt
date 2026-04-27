// @vitest-environment happy-dom
// tests/features/gantt/drag/useTransientSchedule.test.tsx
// Phase 3 Plan 03-03 Task 1: useTransientSchedule — generateScheduleWithLocks(plan + transientEdit).
// Source: 03-03-PLAN.md Task 1 behaviors 5-7.

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTransientSchedule } from '../../../../src/features/gantt/drag/useTransientSchedule';
import { useDragStore } from '../../../../src/stores/dragStore';
import { usePlanStore } from '../../../../src/stores/planStore';
import { useCatalogStore } from '../../../../src/stores/catalogStore';
import type { GardenPlan, ScheduleEdit } from '../../../../src/domain/types';

const plan: GardenPlan = {
  schemaVersion: 3,
  id: 'transient-test',
  name: 'transient test plan',
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
  plantings: [{ id: 'p-tomato', plantId: 'tomato', successionIndex: 0 }],
  customTasks: [],
  edits: [],
  completedTaskIds: [],
  settings: { units: 'imperial', weekStartsOn: 0, timezone: 'America/New_York' },
};

beforeEach(() => {
  usePlanStore.setState({ plan: structuredClone(plan) as GardenPlan });
  useDragStore.setState({
    transientEdit: null,
    dragPreviewEvents: null,
    isDragging: false,
    activeEventId: null,
    lastConstraintViolation: null,
  });
  // catalogStore default: includes sampleCatalog via the curatedCatalog import; no setup needed.
  useCatalogStore.setState((s) => ({ ...s }));
});

describe('useTransientSchedule (Phase 3 Plan 03-03)', () => {
  it('Test 5: passthrough — transientEdit=null returns engine output (non-empty for tomato planting)', () => {
    const { result } = renderHook(() => useTransientSchedule());
    // Sanity: plan has 1 planting (tomato) → engine emits at least the lifecycle events.
    expect(result.current.length).toBeGreaterThan(0);
    // No transient edit → no `edited: true` events from a transient override.
    const transplantEv = result.current.find(
      (e) => e.plantingId === 'p-tomato' && e.type === 'transplant',
    );
    expect(transplantEv).toBeTruthy();
    // tomato transplantOffset=14, lastFrost=2026-04-15 → transplant=2026-04-29.
    expect(transplantEv!.start).toBe('2026-04-29T12:00:00.000Z');
    expect(transplantEv!.edited).toBe(false);
  });

  it('Test 6: applies transient edit — transplant override produces edited:true and reflows downstream', () => {
    const edit: ScheduleEdit = {
      plantingId: 'p-tomato',
      eventType: 'transplant',
      startOverride: '2026-05-20T12:00:00.000Z',
      reason: 'user-drag',
      editedAt: '2026-04-26T17:00:00.000Z',
    };
    useDragStore.setState({ transientEdit: edit });
    const { result } = renderHook(() => useTransientSchedule());
    const transplantEv = result.current.find(
      (e) => e.plantingId === 'p-tomato' && e.type === 'transplant',
    );
    expect(transplantEv).toBeTruthy();
    expect(transplantEv!.start).toBe('2026-05-20T12:00:00.000Z');
    expect(transplantEv!.edited).toBe(true);
    // Downstream: harvest reflows from edited transplant.
    // tomato DTM=75 → minHarvestStart = 2026-05-20 + 75d = 2026-08-03.
    const harvestEv = result.current.find(
      (e) => e.plantingId === 'p-tomato' && e.type === 'harvest-window',
    );
    expect(harvestEv).toBeTruthy();
    expect(harvestEv!.start).toBe('2026-08-03T12:00:00.000Z');
  });

  it('Test 7: memo identity — repeated calls with same (plan, catalog, transientEdit) return same array reference', () => {
    const { result, rerender } = renderHook(() => useTransientSchedule());
    const first = result.current;
    rerender();
    const second = result.current;
    expect(second).toBe(first); // Same array reference (useMemo invariant)
  });
});
