// src/features/gantt/drag/GhostOverlay.tsx
// Ghost cascade preview layer — separate <g> rendering useTransientSchedule events at 0.55
// opacity. Per CONTEXT D-20 + UI-SPEC §2 visual contract.
//
// Rendered inside the GanttView SVG (NOT inside DragOverlay portal — DragOverlay holds the
// actively-dragged bar at full opacity per UI-SPEC §2). GanttView mounts <GhostOverlay>
// only when useDragStore((s) => s.isDragging) is true.

import type { ScheduleEvent } from '../../../domain/types';
import type { TimeScale } from '../timeScale';
import { lifecyclePalette } from '../lifecyclePalette';

const BAR_HEIGHT = 20;
const BAR_Y_OFFSET = 6;

interface GhostOverlayProps {
  events: ScheduleEvent[];
  activeEventId: string | null;
  scale: TimeScale;
  rowYByPlantingId: ReadonlyMap<string, number>;
}

export function GhostOverlay({
  events,
  activeEventId,
  scale,
  rowYByPlantingId,
}: GhostOverlayProps) {
  return (
    <g className="ghost-layer pointer-events-none" data-testid="ghost-overlay">
      {events.map((e) => {
        const fill = lifecyclePalette[e.type];
        if (!fill || e.id === activeEventId) return null;
        const rowY = rowYByPlantingId.get(e.plantingId);
        if (rowY === undefined) return null;
        const x = scale.dateToX(e.start);
        const width = Math.max(scale.dateToX(e.end) - x, 4);
        return (
          <rect
            key={e.id}
            data-event-id={e.id}
            data-event-type={e.type}
            x={x}
            y={rowY + BAR_Y_OFFSET}
            width={width}
            height={BAR_HEIGHT}
            fill={fill}
            fillOpacity={0.55}
            stroke={fill}
            strokeWidth={1.5}
            rx={3}
          />
        );
      })}
    </g>
  );
}
