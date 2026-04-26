// src/features/gantt/timeScale.ts
// Date ↔ pixel mapping. D-06: ships in Phase 1 regardless of the Phase 3 gantt-library spike.
// Locked API: Phase 3 builds drag against this surface; do not change signatures without
// re-validating the spike outcomes in CONTEXT.md.
//
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-CONTEXT.md D-06]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Gantt Visual Treatment]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Open Questions Q5 — render-time today read]

import { parseDate, addDays, differenceInDays, toISODate } from '../../domain/dateWrappers';

export interface MonthTick {
  date: string;
  x: number;
  label: string;
}

export interface WeekTick {
  date: string;
  x: number;
}

export interface TimeScale {
  start: string;
  end: string;
  pxPerDay: number;
  totalWidth: number;
  dateToX(date: Date | string): number;
  xToDate(x: number): string;
  monthTicks: MonthTick[];
  weekTicks: WeekTick[];
  todayX(): number;
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function createTimeScale(args: {
  start: string;
  end: string;
  pxPerDay: number;
}): TimeScale {
  const startISO = args.start.length === 10 ? `${args.start}T12:00:00.000Z` : args.start;
  const endISO = args.end.length === 10 ? `${args.end}T12:00:00.000Z` : args.end;
  const startDate = parseDate(startISO);
  const endDate = parseDate(endISO);
  const totalDays = differenceInDays(endDate, startDate);
  const totalWidth = totalDays * args.pxPerDay;

  function dateToX(date: Date | string): number {
    const d = typeof date === 'string' ? parseDate(date) : date;
    return differenceInDays(d, startDate) * args.pxPerDay;
  }

  function xToDate(x: number): string {
    const days = Math.round(x / args.pxPerDay);
    return toISODate(addDays(startDate, days));
  }

  // Month ticks: one per month from start.year/start.month through end.year/end.month.
  // We walk Date.UTC at noon to stay timezone-stable and add 1 to UTCMonth each iteration.
  const monthTicks: MonthTick[] = [];
  let cursorYear = startDate.getUTCFullYear();
  let cursorMonth = startDate.getUTCMonth();
  // Cap the iteration to avoid runaway loops for any unusually large ranges.
  for (let i = 0; i < 240; i += 1) {
    const cursorMs = Date.UTC(cursorYear, cursorMonth, 1, 12, 0, 0);
    if (cursorMs > endDate.getTime()) break;
    // For the very first tick, pin its x to the scale's actual start (day 0)
    // so callers don't get a negative pixel for "Jan 1" when start is "2026-01-01".
    // For subsequent ticks, the first-of-month UTC noon is the canonical date.
    const firstOfMonthISO = toISODate(new Date(cursorMs));
    const x =
      i === 0 && cursorYear === startDate.getUTCFullYear() && cursorMonth === startDate.getUTCMonth()
        ? Math.max(0, dateToX(firstOfMonthISO))
        : dateToX(firstOfMonthISO);
    monthTicks.push({
      date: firstOfMonthISO,
      x,
      label: MONTH_LABELS[cursorMonth] ?? '',
    });
    cursorMonth += 1;
    if (cursorMonth > 11) {
      cursorMonth = 0;
      cursorYear += 1;
    }
  }

  // Week ticks: every 7 days from start day 0 through totalDays inclusive.
  const weekTicks: WeekTick[] = [];
  for (let day = 0; day <= totalDays; day += 7) {
    const tickISO = toISODate(addDays(startDate, day));
    weekTicks.push({ date: tickISO, x: day * args.pxPerDay });
  }

  function todayX(): number {
    // Documented exception to SCH-03 per RESEARCH.md §Open Questions Q5: render-time
    // today read is a UI concern, not engine math. The eslint allowlist in
    // eslint.config.js permits `new Date()` for `src/features/gantt/**` (UI-only sites).
    const today = new Date();
    const todayISO = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
    return dateToX(todayISO);
  }

  return {
    start: startISO,
    end: endISO,
    pxPerDay: args.pxPerDay,
    totalWidth,
    dateToX,
    xToDate,
    monthTicks,
    weekTicks,
    todayX,
  };
}
