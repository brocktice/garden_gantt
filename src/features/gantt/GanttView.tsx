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

import { useEffect, useMemo, useState } from 'react';
import { useDerivedSchedule } from './useDerivedSchedule';
import { createTimeScale, type TimeScale } from './timeScale';
import { lifecyclePalette } from './lifecyclePalette';
import { LifecycleLegend } from './LifecycleLegend';
import { EmptyGanttState } from './EmptyGanttState';
import { useCatalogStore, selectMerged } from '../../stores/catalogStore';
import { usePlanStore } from '../../stores/planStore';
import { useDragStore } from '../../stores/dragStore';
import { lastDayOfMonth } from '../../domain/dateWrappers';
import { expandSuccessions } from '../../domain/succession';
import type { EventType, GardenPlan, Plant, ScheduleEvent } from '../../domain/types';
import { useDragBar } from './drag/useDragBar';
import { GhostOverlay } from './drag/GhostOverlay';
import { useTransientSchedule } from './drag/useTransientSchedule';
import { setActiveScale } from './drag/scaleHandoff';
import { LockToggle } from './lock/LockToggle';
import { useIsMobile } from '../mobile/useIsMobile';
import { EditPlantingModal } from '../mobile/EditPlantingModal';
import { useKeyboardBarDrag } from '../keyboard-drag/useKeyboardBarDrag';
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
  // Phase 4 Plan 04-06: Linear-style keyboard drag controller. Single document-level
  // listener; bars are roving-tabindex focusable with [data-event-id] etc. The hook
  // reads delegated focus and stages/commits via planStore (POL-08).
  useKeyboardBarDrag();

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

  // Phase 4 Plan 04-02 (D-01/D-02/D-04): mobile branch — sticky plant-name column,
  // 44px transparent tap-handle overlay per bar, EditPlantingModal as the edit
  // affordance instead of touch-drag.
  const isMobile = useIsMobile();
  const [editModalState, setEditModalState] = useState<
    { plantingId: string; eventType: EventType } | null
  >(null);

  return (
    <div className="bg-white border border-stone-200 rounded">
      <LifecycleLegend />
      <div className="flex">
        {/* Left label column — outside the scrollable SVG per UI-SPEC §Min plot width.
            Phase 4 D-04: at <640px viewport, position:sticky left:0 z-10 with width
            var(--spacing-sticky-plant-col) so the plant names stay visible while
            the user horizontally scrolls the plot. */}
        <div
          className={cn(
            'border-r border-stone-200 shrink-0 bg-white',
            isMobile && 'sticky left-0 z-10',
          )}
          style={{
            width: isMobile ? 'var(--spacing-sticky-plant-col, 96px)' : LABEL_WIDTH,
          }}
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
                // Render order: multi-day range bars first, single-day point markers last,
                // so the indoor-start / transplant / direct-sow dots draw ON TOP of any
                // overlapping germination-window or harden-off range that starts on the
                // same date. Stable secondary sort preserves scheduler emit order.
                const sortedRowEvents = [...rowEvents].sort((a, b) => {
                  const aPoint = a.start === a.end ? 1 : 0;
                  const bPoint = b.start === b.end ? 1 : 0;
                  return aPoint - bPoint;
                });
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
                    {sortedRowEvents.map((e, ei) => {
                      const fill = lifecyclePalette[e.type];
                      // Skip task events (water-seedlings, harden-off-day, fertilize-at-flowering).
                      if (!fill || !plant) return null;
                      const isLocked = p.locks?.[e.type] === true;
                      // Phase 4 Plan 04-04 (D-05): the first lifecycle bar of the first
                      // planting row becomes the anchor for coach marks 2 (drag) + 3 (lock).
                      const isFirstBar = i === 0 && ei === 0;
                      const mobileTapProps = isMobile
                        ? {
                            isMobile: true,
                            onTapMobile: () =>
                              setEditModalState({
                                plantingId: p.id,
                                eventType: e.type,
                              }),
                          }
                        : {};
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
                          isFirstBar={isFirstBar}
                          {...mobileTapProps}
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
      {/* Phase 4 Plan 04-02 (D-02): mobile tap-to-edit modal mount. Plan 04-03 will
          wrap this in a toast-with-undo provider so deletes show an Undo affordance. */}
      {editModalState && (
        <EditPlantingModal
          open
          onOpenChange={(o) => {
            if (!o) setEditModalState(null);
          }}
          plantingId={editModalState.plantingId}
          eventType={editModalState.eventType}
        />
      )}
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
  /** Phase 4 Plan 04-02 (D-02): true at <640px viewport. Drag is disabled by gating
   *  the @dnd-kit listeners and a transparent 44px tap-handle <rect> is drawn over
   *  the bar to open EditPlantingModal via onTapMobile. */
  isMobile?: boolean;
  onTapMobile?: () => void;
  /** Phase 4 Plan 04-04 (D-05): true on the very first lifecycle bar (row 0, event 0).
   *  Adds `data-coach-target="first-bar"` to the wrapping <g> and propagates `isFirst`
   *  to the LockToggle so coach marks 2 (drag) + 3 (lock) can find their anchors. */
  isFirstBar?: boolean;
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
  isMobile,
  onTapMobile,
  isFirstBar,
}: DraggableBarProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDragBar({
    event,
    plant,
  });
  // At <640px, suppress drag listeners — the tap-handle overlay opens EditPlantingModal
  // instead. We preserve the underlying <g> ref so dnd-kit's bookkeeping stays sane.
  const effectiveListeners = isMobile ? {} : listeners;
  const isDraggable = !isMobile && DRAGGABLE_BAR_TYPES.has(event.type);
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

  // Phase 4 Plan 04-06 — POL-08 a11y label per UI-SPEC §Accessibility Contract.
  const phaseLabel = event.type.replace(/-/g, ' ');
  const startShort = event.start.slice(0, 10);
  const endShort = event.end.slice(0, 10);
  const ariaLabel = `${plantLabel} ${phaseLabel} from ${startShort} to ${endShort}. Press arrow keys to adjust, L to lock, Enter to commit, Escape to cancel.`;

  // Lock icon position per UI-SPEC §"Gantt Visual Treatment — Lock icon".
  // foreignObject hosts an HTML <button> inside the SVG. For zero-duration / very thin
  // bars (indoor-start, transplant, direct-sow markers where width clamps to 4px),
  // `x + width - 26` would land 22px LEFT of the bar's left edge, extending the <g>'s
  // bbox and making the drag click target reach into empty whitespace. Clamping at `x`
  // keeps the lock anchored from the bar's left edge for tiny bars (visually overlaps
  // the dot, which is the right trade-off — the bbox stays at the visible bar).
  const lockX = Math.max(x, x + width - 24 - 2);
  const lockY = BAR_Y_OFFSET - 8; // -8px from top of bar

  return (
    <g
      ref={setNodeRef as unknown as (el: SVGGElement | null) => void}
      transform={`translate(${dx}, ${dy})`}
      className={cn(
        'group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700',
        cursorClass,
      )}
      style={{ touchAction: 'none', opacity: isDragging ? 0.4 : 1 }}
      data-planting-id={plantingId}
      data-coach-target={isFirstBar ? 'first-bar' : undefined}
      data-event-id={event.id}
      data-event-type={event.type}
      data-event-start={event.start}
      {...attributes}
      {...effectiveListeners}
      // Phase 4 Plan 04-06 — these MUST come AFTER {...attributes} so they win
      // (dnd-kit's attributes include role/tabIndex defaults; we override per
      // RESEARCH Pitfall 4 and UI-SPEC §Accessibility Contract). Roving tabindex:
      // only the first bar gets tabIndex=0 so Tab lands on the gantt once;
      // arrow keys then handle within-gantt navigation.
      tabIndex={isFirstBar ? 0 : -1}
      role="button"
      aria-label={ariaLabel}
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
      {/* Phase 4 Plan 04-02 (D-02): mobile tap-handle overlay. Transparent rect with
          a 44px hit-target height so finger taps reliably register over the 20px-tall
          bar. Rendered ONLY at <640px so the desktop drag from Phase 3 stays
          unaffected (T-04-02-04 mitigation). */}
      {isMobile && onTapMobile && (
        <rect
          data-tap-handle="true"
          x={x}
          y={BAR_Y_OFFSET - 12}
          width={Math.max(width, 24)}
          height={Math.max(BAR_HEIGHT + 24, 44)}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            onTapMobile();
          }}
          aria-label={`Edit ${plantLabel} ${event.type}`}
          role="button"
        />
      )}
      {/* Drag affordance: three thin vertical lines centered inside the bar. Rendered
          only on draggable bars wide enough to host the glyph (≥14px). Thin point
          markers (4px-wide indoor-start / transplant / direct-sow) rely on
          cursor:grab + the lock icon for drag affordance. */}
      {isDraggable && width >= 14 && (
        <g
          aria-hidden="true"
          pointerEvents="none"
          stroke="#FFFFFF"
          strokeOpacity={0.75}
          strokeWidth={1}
          strokeLinecap="round"
        >
          <line
            x1={x + width / 2 - 3}
            x2={x + width / 2 - 3}
            y1={BAR_Y_OFFSET + 5}
            y2={BAR_Y_OFFSET + BAR_HEIGHT - 5}
          />
          <line
            x1={x + width / 2}
            x2={x + width / 2}
            y1={BAR_Y_OFFSET + 5}
            y2={BAR_Y_OFFSET + BAR_HEIGHT - 5}
          />
          <line
            x1={x + width / 2 + 3}
            x2={x + width / 2 + 3}
            y1={BAR_Y_OFFSET + 5}
            y2={BAR_Y_OFFSET + BAR_HEIGHT - 5}
          />
        </g>
      )}
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
          isFirst={isFirstBar === true}
        />
      </foreignObject>
    </g>
  );
}
