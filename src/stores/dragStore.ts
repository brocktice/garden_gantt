// src/stores/dragStore.ts
// Transient drag state — held only in process memory; NEVER persisted, NEVER tracked by zundo.
// rAF-throttled writes from drag handlers; cleared on pointerup commit/cancel.
//
// Source: [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md D-08, D-13, D-17]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-PATTERNS.md §src/stores/dragStore.ts]
//
// Purity: zero React, zero I/O. Pure Zustand bare-create — no middleware (no `persist`,
// no `temporal`). Verified by tests/stores/dragStore.test.ts last spec (no localStorage key
// matching /drag|transient/ after exercising every setter).
//
// `activeEventId` extends the PATTERNS.md spec because Plan 03-03's GhostOverlay needs to know
// which event NOT to render (the dragged event lives in DragOverlay portal at full opacity)
// per UI-SPEC §2 GhostOverlay visual contract.

import { create } from 'zustand';
import type { EventType, ScheduleEdit, ScheduleEvent } from '../domain/types';

interface DragState {
  transientEdit: ScheduleEdit | null;
  dragPreviewEvents: ScheduleEvent[] | null;
  lastConstraintViolation: {
    eventId: string;
    eventType: EventType;
    reasons: string[];
  } | null;
  isDragging: boolean;
  activeEventId: string | null;
  beginDrag: (eventId: string) => void;
  setTransientEdit: (edit: ScheduleEdit | null) => void;
  setDragPreviewEvents: (events: ScheduleEvent[] | null) => void;
  setLastConstraintViolation: (v: DragState['lastConstraintViolation']) => void;
  endDrag: () => void;
}

export const useDragStore = create<DragState>((set) => ({
  transientEdit: null,
  dragPreviewEvents: null,
  lastConstraintViolation: null,
  isDragging: false,
  activeEventId: null,
  beginDrag: (eventId) => set({ isDragging: true, activeEventId: eventId }),
  setTransientEdit: (edit) => set({ transientEdit: edit }),
  setDragPreviewEvents: (events) => set({ dragPreviewEvents: events }),
  setLastConstraintViolation: (v) => set({ lastConstraintViolation: v }),
  endDrag: () =>
    set({
      isDragging: false,
      activeEventId: null,
      transientEdit: null,
      dragPreviewEvents: null,
      lastConstraintViolation: null,
    }),
}));
