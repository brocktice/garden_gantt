// @vitest-environment happy-dom
// tests/features/gantt/drag/DragLayer.test.tsx
// Phase 3 Plan 03-03 Task 2: DragLayer + GhostOverlay wiring contract.
// Source: 03-03-PLAN.md Task 2 D2 behaviors 1-3.

import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { useDragStore } from '../../../../src/stores/dragStore';
import { usePlanStore } from '../../../../src/stores/planStore';
import { DragLayer } from '../../../../src/features/gantt/drag/DragLayer';
import * as __test__ from '../../../../src/features/gantt/drag/dragHandlers';
import { setActiveScale } from '../../../../src/features/gantt/drag/scaleHandoff';
import { createTimeScale } from '../../../../src/features/gantt/timeScale';
import type {
  GardenPlan,
  ScheduleEdit,
  ScheduleEvent,
  Plant,
} from '../../../../src/domain/types';
import { unverifiedFixtureSampleCatalog as sampleCatalog } from '../../../../src/assets/catalog.unverified';

const PX_PER_DAY = 6;

const basePlan: GardenPlan = {
  schemaVersion: 3,
  id: 'draglayer-test',
  name: 'draglayer test plan',
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
  cleanup();
  usePlanStore.setState({ plan: structuredClone(basePlan) as GardenPlan });
  useDragStore.setState({
    transientEdit: null,
    dragPreviewEvents: null,
    isDragging: false,
    activeEventId: null,
    lastConstraintViolation: null,
  });
  setActiveScale(
    createTimeScale({ start: '2026-01-01', end: '2026-12-31', pxPerDay: PX_PER_DAY }),
  );
});

const transplantEvent: ScheduleEvent = {
  id: 'p-tomato:transplant',
  plantingId: 'p-tomato',
  plantId: 'tomato',
  type: 'transplant',
  start: '2026-04-29T12:00:00.000Z',
  end: '2026-04-29T12:00:00.000Z',
  edited: false,
  constraintsApplied: [],
};

describe('DragLayer wiring (Phase 3 Plan 03-03)', () => {
  it('Test 1: handleDragMove writes a transientEdit reflecting the pixel delta (rAF-coalesced)', async () => {
    const tomato = sampleCatalog.get('tomato')! as Plant;
    // Simulate dnd-kit drag-move event: drag right by 7 days = 42 px.
    __test__.handleDragMove({
      active: {
        id: 'p-tomato:transplant',
        data: { current: { event: transplantEvent, plant: tomato } },
      },
      delta: { x: 7 * PX_PER_DAY, y: 0 },
    });
    // rAF coalesce — wait one frame for the setter to flush (mirrors planStore handleSet pattern).
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const transient = useDragStore.getState().transientEdit;
    expect(transient).not.toBeNull();
    expect(transient!.plantingId).toBe('p-tomato');
    expect(transient!.eventType).toBe('transplant');
    // 2026-04-29 + 7 days = 2026-05-06.
    expect(transient!.startOverride).toBe('2026-05-06T12:00:00.000Z');
    expect(transient!.reason).toBe('user-drag');
  });

  it('Test 2: handleDragEnd commits transientEdit to plan.edits exactly once and clears drag state', () => {
    const edit: ScheduleEdit = {
      plantingId: 'p-tomato',
      eventType: 'transplant',
      startOverride: '2026-05-06T12:00:00.000Z',
      reason: 'user-drag',
      editedAt: '2026-04-26T17:00:00.000Z',
    };
    useDragStore.setState({
      transientEdit: edit,
      isDragging: true,
      activeEventId: 'p-tomato:transplant',
    });
    const beforeLen = usePlanStore.getState().plan!.edits.length;
    __test__.handleDragEnd();
    const after = usePlanStore.getState().plan!;
    expect(after.edits.length).toBe(beforeLen + 1);
    const lastEdit = after.edits[after.edits.length - 1]!;
    expect(lastEdit.startOverride).toBe('2026-05-06T12:00:00.000Z');
    expect(lastEdit.eventType).toBe('transplant');
    // Drag state cleared.
    expect(useDragStore.getState().isDragging).toBe(false);
    expect(useDragStore.getState().transientEdit).toBeNull();
  });

  it('Test 3: GhostOverlay renders rects when isDragging=true with a transientEdit', () => {
    const edit: ScheduleEdit = {
      plantingId: 'p-tomato',
      eventType: 'transplant',
      startOverride: '2026-05-20T12:00:00.000Z',
      reason: 'user-drag',
      editedAt: '2026-04-26T17:00:00.000Z',
    };
    useDragStore.setState({
      transientEdit: edit,
      isDragging: true,
      activeEventId: 'p-tomato:transplant',
    });
    render(<DragLayer />);
    // GhostOverlay group is rendered inside GanttView when isDragging=true.
    const ghostGroup = screen.getByTestId('ghost-overlay');
    expect(ghostGroup).toBeTruthy();
    // At least one ghost rect (lifecycle event for tomato).
    const rects = ghostGroup.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThan(0);
  });
});
