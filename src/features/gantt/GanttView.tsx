// src/features/gantt/GanttView.tsx
// Bare hand-rolled SVG — read-only Phase 2 render per UI-SPEC §Gantt Visual Treatment (D-05, D-23, D-26).
// Phase 1 success criterion #1: gantt rendered from generateSchedule() with NO hardcoded events.
// Phase 2 (Plan 02-10): reads from usePlanStore (not samplePlan), wires expandSuccessions through
// useDerivedSchedule, computes season-spanning axis bounds from actual events, renders a 4px
// stone-400 left-edge accent strip on succession-derived rows, falls back to <EmptyGanttState/>
// when plan is null or plantings.length === 0.
//
// Phase 3 (Plan 03-03): each lifecycle bar is wrapped in <DraggableBar> which calls useDragBar
// (a useDraggable wrapper that gates non-draggable types per D-06). The active TimeScale is
// published via setActiveScale() so DragLayer's dispatcher modifier can read it without a prop
// path. GhostOverlay is mounted conditionally on isDragging.
//
// D-23: still hand-rolled bare-SVG (no SVAR / no Frappe) — Phase 3 spike resolved as
// "stay bare-SVG + @dnd-kit/core" per CONTEXT D-01.
// D-26: data-event-id, data-event-type, data-planting-id attributes preserved for drag layer.
//
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Gantt Visual Treatment]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-CONTEXT.md D-05, D-06, D-07]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-UI-SPEC.md §Component Inventory item 8]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md §Code Example D]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md D-04, D-05, D-06, D-19, D-20, D-21]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-RESEARCH.md §Pitfall 2 — useDraggable on <g> not <rect>]

import { useEffect, useMemo } from 'react';
import { useDerivedSchedule } from './useDerivedSchedule';
import { createTimeScale, type TimeScale } from './timeScale';
import { lifecyclePalette } from './lifecyclePalette';
import { EmptyGanttState } from './EmptyGanttState';
import { useCatalogStore, selectMerged } from '../../stores/catalogStore';
import { usePlanStore } from '../../stores/planStore';
import { useDragStore } from '../../stores/dragStore';
import { lastDayOfMonth } from '../../domain/dateWrappers';
import { expandSuccessions } from '../../domain/succession';
import type { GardenPlan, Plant, ScheduleEvent } from '../../domain/types';
import { useDragBar } from './drag/useDragBar';
import { GhostOverlay } from './drag/GhostOverlay';
import { useTransientSchedule } from './drag/useTransientSchedule';
import { setActiveScale } from './drag/scaleHandoff';
import { LockToggle } from './lock/LockToggle';
import { cn } from '../../ui/cn';

// UI-SPEC §Gantt Visual Treatment §Visual specifications — pixel constants
const ROW_HEIGHT = 32;
const ROW_GAP = 8;
const BAR_HEIGHT = 20;
const BAR_Y_OFFSET = 6; // (ROW_HEIGHT - BAR_HEIGHT) / 2 = 6 px top/bottom margin
const AXIS_HEIGHT = 32;
const LABEL_WIDTH = 140;
const PX_PER_DAY = 3;
const MIN_PLOT_WIDTH = 720;

const DRAGGABLE_BAR_TYPES = new Set<ScheduleEvent['type']>([
  'indoor-start',
  'transplant',
  'direct-sow',
  'harvest-window',
]);

/**
 * Compute axis bounds (start/end ISO YYYY-MM-DD strings) snapped to month boundaries.
 *
 * D-24: span min(event.start) → max(event.end), rounded down to month start and up to
 *   month end so the axis aligns with the monthly tick labels.
 * Empty-events fallback: span Jan 1 → Dec 31 of the lastFrostDate's calendar year.
 *
 * Source: [CITED: 02-RESEARCH.md §Code Example D lines 1252-1283]
 */
function computeAxisBounds(
  events: ScheduleEvent[],
  plan: GardenPlan,
): { start: string; end: string } {
  if (events.length === 0) {
    const year = parseInt(plan.location.lastFrostDate.slice(0, 4), 10);
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  let minStart = events[0]!.start;
  let maxEnd = events[0]!.end;
  for (const e of events) {
    if (e.start < minStart) minStart = e.start;
    if (e.end > maxEnd) maxEnd = e.end;
  }
  const startStr = `${minStart.slice(0, 7)}-01`;
  const endYear = parseInt(maxEnd.slice(0, 4), 10);
  const endMonth = parseInt(maxEnd.slice(5, 7), 10);
  const lastDay = lastDayOfMonth(endYear, endMonth);
  const endStr = `${maxEnd.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
  return { start: startStr, end: endStr };
}

export function GanttView() {
  const plan = usePlanStore((s) => s.plan);
  const merged = useCatalogStore(selectMerged);
  const events = useDerivedSchedule();

  // Empty state: no plan OR plan with no plantings.
  if (!plan || plan.plantings.length === 0) {
    return <EmptyGanttState />;
  }

  return <GanttViewInner plan={plan} events={events} merged={merged} />;
}

interface GanttViewInnerProps {
  plan: GardenPlan;
  events: ScheduleEvent[];
  merged: ReadonlyMap<string, Plant>;
}

function GanttViewInner({ plan, events, merged }: GanttViewInnerProps) {
  const plantings = useMemo(() => {
    return expandSuccessions(plan, merged).plantings;
  }, [plan, merged]);

  const { start: axisStart, end: axisEnd } = useMemo(
    () => computeAxisBounds(events, plan),
    [events, plan],
  );
  const scale = useMemo(
    () => createTimeScale({ start: axisStart, end: axisEnd, pxPerDay: PX_PER_DAY }),
    [axisStart, axisEnd],
  );

  // Phase 3 (Plan 03-03): publish scale for DragLayer's dispatcher modifier.
  useEffect(() => {
    setActiveScale(scale);
    return () => setActiveScale(null);
  }, [scale]);

  const plotWidth = Math.max(MIN_PLOT_WIDTH, scale.totalWidth);
  const totalHeight = AXIS_HEIGHT + plantings.length * (ROW_HEIGHT + ROW_GAP);

  // Group events by plantingId for row rendering.
  const eventsByPlanting = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const e of events) {
      const list = map.get(e.plantingId) ?? [];
      list.push(e);
      map.set(e.plantingId, list);
    }
    return map;
  }, [events]);

  // rowYByPlantingId: ghost overlay needs to render bars at the correct row Y.
  const rowYByPlantingId = useMemo(() => {
    const map = new Map<string, number>();
    plantings.forEach((p, i) => {
      const rowY = AXIS_HEIGHT + i * (ROW_HEIGHT + ROW_GAP);
      map.set(p.id, rowY);
    });
    return map;
  }, [plantings]);

  const todayX = scale.todayX();
  const showToday = todayX >= 0 && todayX <= plotWidth;

  const isDragging = useDragStore((s) => s.isDragging);
  const activeEventId = useDragStore((s) => s.activeEventId);
  const transientEvents = useTransientSchedule();

  return (
    <div className="bg-white border border-stone-200 rounded">
      <div className="flex">
        {/* Left label column — outside the scrollable SVG per UI-SPEC §Min plot width */}
        <div
          className="border-r border-stone-200 shrink-0 bg-white"
          style={{ width: LABEL_WIDTH }}
        >
          <div style={{ height: AXIS_HEIGHT }} />
          {plantings.map((p, i) => {
            const plant = merged.get(p.plantId);
            const isDerived = (p.successionIndex ?? 0) > 0;
            const label = isDerived
              ? `${plant?.name ?? p.plantId} #${(p.successionIndex ?? 0) + 1}`
              : (plant?.name ?? p.plantId);
            return (
              <div
                key={p.id}
                style={{
                  height: ROW_HEIGHT,
                  marginBottom: i < plantings.length - 1 ? ROW_GAP : 0,
                }}
                className="flex items-center px-3 text-xs font-medium text-stone-900"
              >
                {label}
              </div>
            );
          })}
        </div>

        {/* Scrollable plot area */}
        <div className="overflow-x-auto flex-1">
          <svg
            role="img"
            aria-label={`Garden gantt chart for ${plan.name}`}
            width={plotWidth}
            height={totalHeight}
            viewBox={`0 0 ${plotWidth} ${totalHeight}`}
          >
            {/* Time axis */}
            <g className="axis">
              <rect x={0} y={0} width={plotWidth} height={AXIS_HEIGHT} fill="#FFFFFF" />
              <line
                x1={0}
                y1={AXIS_HEIGHT}
                x2={plotWidth}
                y2={AXIS_HEIGHT}
                stroke="#E7E5E4"
                strokeWidth={1}
              />
              {scale.monthTicks.map((tick) => (
                <text
                  key={tick.date}
                  x={tick.x + 4}
                  y={AXIS_HEIGHT - 8}
                  fontSize={11}
                  fill="#57534E"
                >
                  {tick.label}
                </text>
              ))}
              {scale.weekTicks.map((tick) => (
                <line
                  key={tick.date}
                  x1={tick.x}
                  y1={AXIS_HEIGHT}
                  x2={tick.x}
                  y2={totalHeight}
                  stroke="#E7E5E4"
                  strokeWidth={1}
                  opacity={0.5}
                />
              ))}
            </g>

            {/* Succession-row visual grouping (D-22) */}
            <g className="succession-groups">
              {plantings.map((p, i) => {
                if ((p.successionIndex ?? 0) === 0) return null;
                const rowY = AXIS_HEIGHT + i * (ROW_HEIGHT + ROW_GAP);
                return (
                  <rect
                    key={p.id + '-accent'}
                    x={0}
                    y={rowY + 4}
                    width={4}
                    height={ROW_HEIGHT - 8}
                    fill="#A8A29E"
                    aria-hidden="true"
                  />
                );
              })}
            </g>

            {/* Rows: one <g> per planting, one <DraggableBar> per lifecycle event */}
            <g className="rows">
              {plantings.map((p, i) => {
                const plant = merged.get(p.plantId);
                const rowY = AXIS_HEIGHT + i * (ROW_HEIGHT + ROW_GAP);
                const rowEvents = eventsByPlanting.get(p.id) ?? [];
                const isDerived = (p.successionIndex ?? 0) > 0;
                const aLabel = isDerived
                  ? `Succession ${(p.successionIndex ?? 0) + 1} of ${plant?.name ?? p.plantId}`
                  : (plant?.name ?? p.plantId);

                return (
                  <g
                    key={p.id}
                    data-planting-id={p.id}
                    aria-label={aLabel}
                    transform={`translate(0, ${rowY})`}
                  >
                    {rowEvents.map((e) => {
                      const fill = lifecyclePalette[e.type];
                      // Skip task events (water-seedlings, harden-off-day, fertilize-at-flowering).
                      if (!fill || !plant) return null;
                      const isLocked = p.locks?.[e.type] === true;
                      return (
                        <DraggableBar
                          key={e.id}
                          event={e}
                          plant={plant}
                          plantingId={p.id}
                          plantLabel={plant.name}
                          fill={fill}
                          scale={scale}
                          isLocked={isLocked}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </g>

            {/* Phase 3 (Plan 03-03): GhostOverlay rendered while dragging — draws on top of
                committed bars at 0.55 opacity per D-20 + UI-SPEC §2. */}
            {isDragging && (
              <GhostOverlay
                events={transientEvents}
                activeEventId={activeEventId}
                scale={scale}
                rowYByPlantingId={rowYByPlantingId}
              />
            )}

            {/* Today indicator — green-700 (accent) per UI-SPEC §Gantt Visual Treatment */}
            {showToday && (
              <g>
                <line
                  x1={todayX}
                  y1={AXIS_HEIGHT - 4}
                  x2={todayX}
                  y2={totalHeight}
                  stroke="#15803D"
                  strokeWidth={1}
                />
                <text
                  x={todayX + 3}
                  y={12}
                  fontSize={11}
                  fill="#15803D"
                  fontWeight={500}
                >
                  Today
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

interface DraggableBarProps {
  event: ScheduleEvent;
  plant: Plant;
  plantingId: string;
  plantLabel: string;
  fill: string;
  scale: TimeScale;
  isLocked: boolean;
}

/**
 * Per-bar wrapper that calls useDragBar and renders the lifecycle bar inside a <g> with
 * the drag listeners attached. Per RESEARCH.md §Pitfall 2: setNodeRef goes on the <g>,
 * NOT directly on the <rect> (dnd-kit needs a focusable element).
 *
 * Memoized re-render: useDragBar reads transform from useDraggable's internal state and
 * applies it as an SVG transform on the wrapper <g> so React only re-renders this single
 * bar during its own drag (per CONTEXT D-21).
 *
 * Phase 3 (Plan 03-06):
 * - Outer <g> uses Tailwind `group` so the LockToggle's `group-hover:opacity-100` reveals
 *   the icon on hover.
 * - When the (plantingId, eventType) is locked, a 2px stone-700 outline ring rect is drawn
 *   on top of the fill rect (UI-SPEC §"Gantt Visual Treatment — Lock outline ring").
 * - LockToggle is rendered inside a <foreignObject> at top-right of the bar (per
 *   UI-SPEC §"Gantt Visual Treatment — Lock icon": -8px above bar top, -2px inside right edge).
 *   Per RESEARCH §Pitfall 9, LockToggle is rendered on ALL lifecycle event types (including
 *   derived non-draggable bars like harden-off and germination-window) — locking holds them
 *   fixed during cascade reflow.
 *
 * Z-order trade-off (UI-SPEC §"Z-order in the gantt SVG" calls for "Lock icons (top-most,
 * ALWAYS visible above ghost)"). For Phase 3 this is best-effort: the foreignObject is the
 * LAST child of the per-bar <g>, so it draws above this bar's fill+ring. The committed bars'
 * <g> renders BEFORE the GhostOverlay <g>, so during drag the ghost overlay can momentarily
 * cover the lock icon. Phase 4 may extract a separate top-most <LockToggleLayer> <g> if
 * user testing surfaces confusion. Documented in 03-06-SUMMARY.md.
 */
function DraggableBar({
  event,
  plant,
  plantingId,
  plantLabel,
  fill,
  scale,
  isLocked,
}: DraggableBarProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDragBar({
    event,
    plant,
  });
  const isDraggable = DRAGGABLE_BAR_TYPES.has(event.type);
  const x = scale.dateToX(event.start);
  const endX = scale.dateToX(event.end);
  const width = Math.max(endX - x, 4);
  const dateLabel =
    event.end !== event.start
      ? `${event.start.slice(0, 10)} to ${event.end.slice(0, 10)}`
      : event.start.slice(0, 10);

  const dx = transform?.x ?? 0;
  const dy = transform?.y ?? 0;
  const cursorClass = isDraggable
    ? 'cursor-grab active:cursor-grabbing'
    : 'cursor-default';

  // Lock icon position per UI-SPEC §"Gantt Visual Treatment — Lock icon".
  // foreignObject hosts an HTML <button> inside the SVG.
  const lockX = x + width - 24 - 2; // -2px inside right edge; -24 = hit-target width
  const lockY = BAR_Y_OFFSET - 8; // -8px from top of bar

  return (
    <g
      ref={setNodeRef as unknown as (el: SVGGElement | null) => void}
      transform={`translate(${dx}, ${dy})`}
      className={cn('group', cursorClass)}
      style={{ touchAction: 'none', opacity: isDragging ? 0.4 : 1 }}
      data-planting-id={plantingId}
      {...attributes}
      {...listeners}
    >
      <rect
        data-event-id={event.id}
        data-event-type={event.type}
        data-planting-id={plantingId}
        x={x}
        y={BAR_Y_OFFSET}
        width={width}
        height={BAR_HEIGHT}
        fill={fill}
        rx={3}
      >
        <title>
          {plantLabel} — {event.type} — {dateLabel}
        </title>
      </rect>
      {/* Phase 3 Plan 03-06: lock outline ring (UI-SPEC §"Gantt Visual Treatment — Lock outline ring"). */}
      {isLocked && (
        <rect
          x={x}
          y={BAR_Y_OFFSET}
          width={width}
          height={BAR_HEIGHT}
          fill="none"
          stroke="var(--color-lifecycle-locked)"
          strokeWidth={2}
          rx={3}
          pointerEvents="none"
        />
      )}
      {/* Phase 3 Plan 03-06: LockToggle in foreignObject for HTML-in-SVG.
          Last child of <g> → drawn above the fill+ring. */}
      <foreignObject
        x={lockX}
        y={lockY}
        width={24}
        height={24}
        className="overflow-visible"
      >
        <LockToggle
          plantingId={plantingId}
          eventType={event.type}
          locked={isLocked}
          plantName={plantLabel}
        />
      </foreignObject>
    </g>
  );
}
