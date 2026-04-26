// src/features/gantt/GanttView.tsx
// Bare hand-rolled SVG — read-only Phase 1 render per UI-SPEC §Gantt Visual Treatment (D-05).
// Phase 1 success criterion #1: gantt rendered from generateSchedule() with NO hardcoded events.
// Phase 1 success criterion #2: changing samplePlan.location.lastFrostDate moves bars on reload.
// Phase 3 spike picks the final library; this implementation is intentionally throwaway (D-07).
//
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Gantt Visual Treatment]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-CONTEXT.md D-05, D-06, D-07]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Pattern 1]

import { useMemo } from 'react';
import { useDerivedSchedule } from './useDerivedSchedule';
import { createTimeScale } from './timeScale';
import { lifecyclePalette } from './lifecyclePalette';
import { sampleCatalog } from '../../assets/catalog';
import { samplePlan } from '../../samplePlan';

// UI-SPEC §Gantt Visual Treatment §Visual specifications — pixel constants
const ROW_HEIGHT = 32;
const ROW_GAP = 8;
const BAR_HEIGHT = 20;
const BAR_Y_OFFSET = 6; // (ROW_HEIGHT - BAR_HEIGHT) / 2 = 6 px top/bottom margin
const AXIS_HEIGHT = 32;
const LABEL_WIDTH = 140;
const PX_PER_DAY = 3;
const MIN_PLOT_WIDTH = 720;

export function GanttView() {
  const events = useDerivedSchedule();
  const plantings = samplePlan.plantings;

  // Time scale spans Jan 1 of lastFrost.year through Dec 31 of (year+1) so the garlic
  // year-rollover (Oct 2026 → Jul 2027) fits in a single view per CONTEXT.md D-17.
  const lastFrostYear = parseInt(samplePlan.location.lastFrostDate.slice(0, 4), 10);
  const scale = useMemo(
    () =>
      createTimeScale({
        start: `${lastFrostYear}-01-01`,
        end: `${lastFrostYear + 1}-12-31`,
        pxPerDay: PX_PER_DAY,
      }),
    [lastFrostYear],
  );
  const plotWidth = Math.max(MIN_PLOT_WIDTH, scale.totalWidth);
  const totalHeight = AXIS_HEIGHT + plantings.length * (ROW_HEIGHT + ROW_GAP);

  // Group events by plantingId for row rendering.
  const eventsByPlanting = useMemo(() => {
    const map = new Map<string, typeof events>();
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
            const plant = sampleCatalog.get(p.plantId);
            return (
              <div
                key={p.id}
                style={{
                  height: ROW_HEIGHT,
                  marginBottom: i < plantings.length - 1 ? ROW_GAP : 0,
                }}
                className="flex items-center px-3 text-xs font-medium text-stone-900"
              >
                {plant?.name ?? p.plantId}
              </div>
            );
          })}
        </div>

        {/* Scrollable plot area */}
        <div className="overflow-x-auto flex-1">
          <svg
            role="img"
            aria-label={`Garden gantt chart for ${samplePlan.name}`}
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

            {/* Rows: one <g> per planting, one <rect> per lifecycle event */}
            <g className="rows">
              {plantings.map((p, i) => {
                const plant = sampleCatalog.get(p.plantId);
                const rowY = AXIS_HEIGHT + i * (ROW_HEIGHT + ROW_GAP);
                const rowEvents = eventsByPlanting.get(p.id) ?? [];

                return (
                  <g
                    key={p.id}
                    data-planting-id={p.id}
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
