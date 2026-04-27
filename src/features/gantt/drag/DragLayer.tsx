// src/features/gantt/drag/DragLayer.tsx
// <DndContext> wrapper around <GanttView>; mounts <DragOverlay> sibling for ghost cascade preview.
//
// Source: [CITED: 03-CONTEXT.md integration points]
//         [CITED: 03-RESEARCH.md §Example A + §Pattern 1]
//         [CITED: dndkit.com/api-documentation/draggable/drag-overlay] — "Remain mounted at all times"
//         [CITED: 03-PATTERNS.md §DragLayer.tsx]
//
// Architecture notes:
// - dnd-kit v6's modifiers are CONTEXT-level only (not per-draggable). We register a single
//   "dispatcher modifier" that reads `active.data.current.event` + `.plant` and forwards to
//   `makeClampModifier()` per active drag.
// - The TimeScale is published from GanttView via scaleHandoff.ts (module-level singleton).
// - Drag handlers (handleDragStart/Move/End/Cancel) live in dragHandlers.ts so this file
//   exports only the component (React Fast Refresh requirement).

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type Modifier,
  type DragEndEvent,
  type DragStartEvent,
  type DragMoveEvent,
} from '@dnd-kit/core';
import { useCallback, useMemo } from 'react';
import { GanttView } from '../GanttView';
import { useDragStore } from '../../../stores/dragStore';
import { usePlanStore } from '../../../stores/planStore';
import { makeClampModifier } from './clampModifier';
import { useTransientSchedule } from './useTransientSchedule';
import type { Plant, ScheduleEvent } from '../../../domain/types';
import { getActiveScale } from './scaleHandoff';
import { ConstraintTooltip } from '../tooltip/ConstraintTooltip';
import {
  handleDragStart,
  handleDragMove,
  handleDragEnd,
  handleDragCancel,
} from './dragHandlers';

// Drag handlers (handleDragStart/Move/End/Cancel) are exported from `dragHandlers.ts` for
// direct test consumption. This file only exports the <DragLayer/> component so React
// Fast Refresh can hot-reload the drag UI without losing module state. Tests should import:
//   import { handleDragMove, handleDragEnd } from '.../drag/dragHandlers';

export function DragLayer() {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const plan = usePlanStore((s) => s.plan);
  const setViolation = useDragStore((s) => s.setLastConstraintViolation);
  const transientSchedule = useTransientSchedule();
  const activeId = useDragStore((s) => s.activeEventId);

  // Single dispatcher modifier: reads active.data.current to find the event/plant for the
  // active drag. Memoized on `plan` so React identity is stable across drag ticks.
  const dispatcherModifier: Modifier = useMemo(() => {
    return (args) => {
      if (!plan) return args.transform;
      const active = args.active;
      if (!active) return args.transform;
      const data = active.data.current as
        | { event?: ScheduleEvent; plant?: Plant }
        | undefined;
      if (!data?.event || !data.plant) return args.transform;
      const scale = getActiveScale();
      if (!scale) return args.transform;
      const inner = makeClampModifier({
        scale,
        event: data.event,
        plan,
        plant: data.plant,
        setViolation,
      });
      return inner(args);
    };
  }, [plan, setViolation]);

  const onDragStart = useCallback((e: DragStartEvent) => handleDragStart(e), []);
  const onDragMove = useCallback((e: DragMoveEvent) => handleDragMove(e), []);
  const onDragEnd = useCallback((e: DragEndEvent) => handleDragEnd(e), []);
  const onDragCancel = useCallback(() => handleDragCancel(), []);

  return (
    <DndContext
      sensors={sensors}
      modifiers={[dispatcherModifier]}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <GanttView />
      {/* Per dnd-kit docs: remain mounted at all times. */}
      <DragOverlay dropAnimation={null}>
        {activeId ? (
          <ActiveBarOverlay activeId={activeId} events={transientSchedule} />
        ) : null}
      </DragOverlay>
      {/* Phase 3 ships the ConstraintTooltip mount inside DragLayer for in-plan testing.
          Plan 03-06 will move the mount into AppShell. */}
      <ConstraintTooltip />
    </DndContext>
  );
}

// Minimal placeholder for the actively-dragged bar in the DragOverlay portal.
function ActiveBarOverlay({
  activeId,
  events,
}: {
  activeId: string;
  events: ScheduleEvent[];
}) {
  const e = events.find((x) => x.id === activeId);
  if (!e) return null;
  return (
    <div className="px-2 py-1 rounded-md bg-stone-900 text-white text-xs shadow-lg pointer-events-none">
      {e.type} → {e.start.slice(0, 10)}
    </div>
  );
}
