// src/features/gantt/drag/useDragBar.ts
// Per-bar useDraggable wrapper. Attaches drag listeners + node ref; passes event/plant via
// useDraggable.data so the DndContext-level dispatcher modifier (DragLayer) can route to
// makeClampModifier per active drag.
//
// For non-draggable event types (CONTEXT D-06), returns disabled+no-op listeners so the bar
// is still clickable for select/inspect + future Alt-click lock-toggle hover.
//
// Source: [CITED: 03-RESEARCH.md §Pattern 1 — dnd-kit v6 modifiers are DndContext-level only]
//         [CITED: 03-CONTEXT.md D-04, D-05, D-06]

import { useDraggable } from '@dnd-kit/core';
import type { ScheduleEvent, Plant } from '../../../domain/types';

export const DRAGGABLE_BAR_TYPES = new Set<ScheduleEvent['type']>([
  'indoor-start',
  'transplant',
  'direct-sow',
  'harvest-window',
]);

export function useDragBar(args: { event: ScheduleEvent; plant: Plant }) {
  const isDraggableType = DRAGGABLE_BAR_TYPES.has(args.event.type);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: args.event.id,
    disabled: !isDraggableType,
    data: { event: args.event, plant: args.plant }, // consumed by DragLayer dispatcher modifier
  });

  return {
    attributes,
    listeners: isDraggableType ? listeners : undefined,
    setNodeRef,
    transform,
    isDragging,
  };
}
