// src/features/gantt/GanttView.tsx
// Bare hand-rolled SVG — read-only Phase 2 render per UI-SPEC §Gantt Visual Treatment (D-05, D-23, D-26).
// Phase 1 success criterion #1: gantt rendered from generateSchedule() with NO hardcoded events.
// Phase 2 (Plan 02-10): reads from usePlanStore (not samplePlan), wires expandSuccessions through
// useDerivedSchedule, computes season-spanning axis bounds from actual events, renders a 4px
// stone-400 left-edge accent strip on succession-derived rows, falls back to <EmptyGanttState/>
// when plan is null or plantings.length === 0.
//
// D-23: still hand-rolled bare-SVG (no SVAR / no Frappe / no @dnd-kit) — Phase 3 spike picks the
// final gantt library.
// D-26: read-only in Phase 2 (no drag bindings) but data-event-id, data-event-type, and
// data-planting-id attributes are preserved on every rect so Phase 3 has the handles ready.
//
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Gantt Visual Treatment]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-CONTEXT.md D-05, D-06, D-07]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-UI-SPEC.md §Component Inventory item 8]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md §Code Example D lines 1252-1283]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-CONTEXT.md D-22, D-23, D-24, D-25, D-26]

import { useMemo } from 'react';
import { useDerivedSchedule } from './useDerivedSchedule';
import { createTimeScale } from './timeScale';
import { lifecyclePalette } from './lifecyclePalette';
import { EmptyGanttState } from './EmptyGanttState';
import { useCatalogStore, selectMerged } from '../../stores/catalogStore';
import { usePlanStore } from '../../stores/planStore';
import { lastDayOfMonth } from '../../domain/dateWrappers';
import { expandSuccessions } from '../../domain/succession';
import type { GardenPlan, Plant, ScheduleEvent } from '../../domain/types';

// UI-SPEC §Gantt Visual Treatment §Visual specifications — pixel constants
const ROW_HEIGHT = 32;
const ROW_GAP = 8;
const BAR_HEIGHT = 20;
const BAR_Y_OFFSET = 6; // (ROW_HEIGHT - BAR_HEIGHT) / 2 = 6 px top/bottom margin
const AXIS_HEIGHT = 32;
const LABEL_WIDTH = 140;
const PX_PER_DAY = 3;
const MIN_PLOT_WIDTH = 720;

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

  // Build the row list from the SAME expansion the engine sees so succession-derived
  // rows render with their own labels + accent strips. Keep this cheap — expandSuccessions
  // is pure and re-runs whenever plan/catalog change (matched by useDerivedSchedule deps).
  return <GanttViewInner plan={plan} events={events} merged={merged} />;
}

interface GanttViewInnerProps {
  plan: GardenPlan;
  events: ScheduleEvent[];
  merged: ReadonlyMap<string, Plant>;
}

function GanttViewInner({ plan, events, merged }: GanttViewInnerProps) {
  // Re-derive expanded plantings inline so we can render one row per derived planting.
  // expandSuccessions is the same pure call used by useDerivedSchedule.
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

  const todayX = scale.todayX();
  const showToday = todayX >= 0 && todayX <= plotWidth;

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
              {/* Month tick labels */}
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
              {/* Weekly grid lines (faint) */}
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

            {/* Succession-row visual grouping (D-22): 4px stone-400 left-edge accent
                rendered BEHIND the row rects. Only derived plantings (successionIndex > 0)
                get the accent strip. */}
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

            {/* Rows: one <g> per planting, one <rect> per lifecycle event */}
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
                      // Skip task events (water-seedlings, harden-off-day, fertilize-at-flowering)
                      // — they are intentionally absent from lifecyclePalette per Plan 08.
                      if (!fill) return null;
                      const x = scale.dateToX(e.start);
                      const endX = scale.dateToX(e.end);
                      // Point events have start === end → render a 4px-wide marker
                      const width = Math.max(endX - x, 4);
                      const dateLabel =
                        e.end !== e.start
                          ? `${e.start.slice(0, 10)} to ${e.end.slice(0, 10)}`
                          : e.start.slice(0, 10);
                      return (
                        <rect
                          key={e.id}
                          data-event-id={e.id}
                          data-event-type={e.type}
                          data-planting-id={p.id}
                          x={x}
                          y={BAR_Y_OFFSET}
                          width={width}
                          height={BAR_HEIGHT}
                          fill={fill}
                          rx={3}
                        >
                          <title>
                            {plant?.name ?? p.plantId} — {e.type} — {dateLabel}
                          </title>
                        </rect>
                      );
                    })}
                  </g>
                );
              })}
            </g>

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

