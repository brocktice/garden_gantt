// src/features/gantt/drag/dragHandlers.ts
// Phase 3 (Plan 03-03) — drag-event handlers extracted out of DragLayer.tsx so React Fast
// Refresh treats DragLayer.tsx as a clean component-only module. Tests import from here
// (or via the __test__ re-export on DragLayer for stable plan-aligned naming).
//
// rAF coalesces 60Hz pointermove → one setTransientEdit per frame.
// On pointerup: commitEdit fires once (zundo records ONE history entry per Plan 03-02 D-16).

import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useDragStore } from '../../../stores/dragStore';
import { useUIStore } from '../../../stores/uiStore';
import { usePlanStore } from '../../../stores/planStore';
import type { Plant, ScheduleEvent, ScheduleEdit } from '../../../domain/types';
import { getActiveScale } from './scaleHandoff';
import { nowISOString } from '../../../domain/dateWrappers';

// rAF coalesce — module-level so a burst of pointermove events collapses into one frame.
let rafId: number | null = null;
let pendingEdit: ScheduleEdit | null = null;
function scheduleRafSet(setter: (e: ScheduleEdit | null) => void, edit: ScheduleEdit) {
  pendingEdit = edit;
  if (rafId !== null) return;
  if (typeof requestAnimationFrame === 'undefined') {
    setter(edit);
    return;
  }
  rafId = requestAnimationFrame(() => {
    rafId = null;
    if (pendingEdit) setter(pendingEdit);
  });
}

export interface DragMoveLike {
  active: {
    id: string | number;
    data: { current?: unknown };
  };
  delta: { x: number; y: number };
}

export function handleDragStart(e: DragStartEvent) {
  useDragStore.getState().beginDrag(String(e.active.id));
  // Clear any prior sticky-pill from previous drag.
  useUIStore.getState().setLastConstraintViolation(null);
}

export function handleDragMove(e: DragMoveLike) {
  const plan = usePlanStore.getState().plan;
  if (!plan) return;
  const data = e.active.data.current as
    | { event?: ScheduleEvent; plant?: Plant }
    | undefined;
  if (!data?.event) return;
  const scale = getActiveScale();
  if (!scale) return;
  const startX = scale.dateToX(data.event.start);
  const newDate = scale.xToDate(startX + e.delta.x);
  const isResize = data.event.end !== data.event.start;
  const edit: ScheduleEdit = {
    plantingId: data.event.plantingId,
    eventType: data.event.type,
    startOverride: newDate,
    ...(isResize
      ? { endOverride: scale.xToDate(scale.dateToX(data.event.end) + e.delta.x) }
      : {}),
    reason: 'user-drag',
    editedAt: nowISOString(),
  };
  scheduleRafSet(useDragStore.getState().setTransientEdit, edit);
}

export function handleDragEnd(_event?: DragEndEvent) {
  void _event;
  const transientEdit = useDragStore.getState().transientEdit;
  const violation = useDragStore.getState().lastConstraintViolation;
  if (transientEdit) {
    usePlanStore.getState().commitEdit(transientEdit);
  }
  if (violation) {
    useUIStore.getState().setLastConstraintViolation(violation);
  }
  useDragStore.getState().endDrag();
}

export function handleDragCancel() {
  useDragStore.getState().endDrag();
}
