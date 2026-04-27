/**
 * @vitest-environment happy-dom
 */
// tests/stores/dragStore.test.ts
// Phase 3 (Plan 03-02 Task 2): transient drag state — no middleware, no persistence.
// Source: .planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md D-08, D-13, D-17
//         .planning/phases/03-drag-cascade-calendar-tasks/03-PATTERNS.md §src/stores/dragStore.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ScheduleEdit, ScheduleEvent } from '../../src/domain/types';

const sampleEdit: ScheduleEdit = {
  plantingId: 'p-tomato',
  eventType: 'transplant',
  startOverride: '2026-05-20T12:00:00.000Z',
  reason: 'user-drag',
  editedAt: '2026-05-20T12:00:00.000Z',
};

const sampleEvent: ScheduleEvent = {
  id: 'p-tomato:transplant',
  plantingId: 'p-tomato',
  plantId: 'tomato',
  type: 'transplant',
  start: '2026-05-15T12:00:00.000Z',
  end: '2026-05-15T12:00:00.000Z',
  edited: false,
  constraintsApplied: [],
};

describe('useDragStore — Phase 3 transient drag state', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('initial values are all idle/null', async () => {
    const { useDragStore } = await import('../../src/stores/dragStore');
    const s = useDragStore.getState();
    expect(s.isDragging).toBe(false);
    expect(s.transientEdit).toBeNull();
    expect(s.dragPreviewEvents).toBeNull();
    expect(s.lastConstraintViolation).toBeNull();
    expect(s.activeEventId).toBeNull();
  });

  it('beginDrag(eventId) flips isDragging + sets activeEventId; does NOT clear transientEdit', async () => {
    const { useDragStore } = await import('../../src/stores/dragStore');
    // Pre-seed something on transientEdit to prove beginDrag does not clear it
    useDragStore.getState().setTransientEdit(sampleEdit);
    useDragStore.getState().beginDrag('p-tomato:transplant');
    const s = useDragStore.getState();
    expect(s.isDragging).toBe(true);
    expect(s.activeEventId).toBe('p-tomato:transplant');
    expect(s.transientEdit).toEqual(sampleEdit);
  });

  it('setTransientEdit round-trips edit then null', async () => {
    const { useDragStore } = await import('../../src/stores/dragStore');
    useDragStore.getState().setTransientEdit(sampleEdit);
    expect(useDragStore.getState().transientEdit).toEqual(sampleEdit);
    useDragStore.getState().setTransientEdit(null);
    expect(useDragStore.getState().transientEdit).toBeNull();
  });

  it('setLastConstraintViolation round-trips', async () => {
    const { useDragStore } = await import('../../src/stores/dragStore');
    const violation = {
      eventId: 'p-tomato:transplant',
      eventType: 'transplant' as const,
      reasons: ['Tender plant cannot transplant before last frost.'],
    };
    useDragStore.getState().setLastConstraintViolation(violation);
    expect(useDragStore.getState().lastConstraintViolation).toEqual(violation);
    useDragStore.getState().setLastConstraintViolation(null);
    expect(useDragStore.getState().lastConstraintViolation).toBeNull();
  });

  it('endDrag clears every transient slot', async () => {
    const { useDragStore } = await import('../../src/stores/dragStore');
    useDragStore.getState().beginDrag('p-tomato:transplant');
    useDragStore.getState().setTransientEdit(sampleEdit);
    useDragStore.getState().setDragPreviewEvents([sampleEvent]);
    useDragStore.getState().setLastConstraintViolation({
      eventId: 'p-tomato:transplant',
      eventType: 'transplant',
      reasons: ['x'],
    });

    useDragStore.getState().endDrag();

    const s = useDragStore.getState();
    expect(s.isDragging).toBe(false);
    expect(s.activeEventId).toBeNull();
    expect(s.transientEdit).toBeNull();
    expect(s.dragPreviewEvents).toBeNull();
    expect(s.lastConstraintViolation).toBeNull();
  });

  it('NEVER persists to localStorage (no `drag` or `transient` keys after exercising setters)', async () => {
    const { useDragStore } = await import('../../src/stores/dragStore');
    useDragStore.getState().beginDrag('p-tomato:transplant');
    useDragStore.getState().setTransientEdit(sampleEdit);
    useDragStore.getState().setDragPreviewEvents([sampleEvent]);
    useDragStore.getState().setLastConstraintViolation({
      eventId: 'p-tomato:transplant',
      eventType: 'transplant',
      reasons: ['x'],
    });
    useDragStore.getState().endDrag();

    const offendingKeys = Object.keys(window.localStorage).filter((k) =>
      /drag|transient/i.test(k),
    );
    expect(offendingKeys).toEqual([]);
  });
});
