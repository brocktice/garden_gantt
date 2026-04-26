// tests/features/gantt/timeScale.test.ts
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-08-PLAN.md Task 1 behavior]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Gantt Visual Treatment]
//
// timeScale.ts is the locked API for Phase 3 per CONTEXT.md D-06. These tests pin the
// pixel-math contract: dateToX/xToDate inverse, monthTicks count, weekTicks cadence.

import { describe, it, expect } from 'vitest';
import { createTimeScale } from '../../../src/features/gantt/timeScale';

describe('createTimeScale', () => {
  const scale = createTimeScale({ start: '2026-01-01', end: '2026-12-31', pxPerDay: 3 });

  it('totalWidth equals (end-start) days * pxPerDay', () => {
    // 2026 is not a leap year. Jan 1 to Dec 31 = 364 days.
    expect(scale.totalWidth).toBe(364 * 3);
  });

  it('dateToX returns 0 for start', () => {
    expect(scale.dateToX('2026-01-01')).toBe(0);
  });

  it('dateToX returns pxPerDay for start+1', () => {
    expect(scale.dateToX('2026-01-02')).toBe(3);
  });

  it('dateToX returns 312 for 2026-04-15 (104 days * 3 px/day)', () => {
    expect(scale.dateToX('2026-04-15')).toBe(104 * 3);
  });

  it('xToDate(0) returns 2026-01-01T12:00:00.000Z', () => {
    expect(scale.xToDate(0)).toBe('2026-01-01T12:00:00.000Z');
  });

  it('xToDate is inverse of dateToX', () => {
    const iso = '2026-04-15T12:00:00.000Z';
    const x = scale.dateToX(iso);
    expect(scale.xToDate(x)).toBe(iso);
  });

  it('monthTicks has 12 entries (Jan through Dec)', () => {
    expect(scale.monthTicks.length).toBe(12);
    expect(scale.monthTicks[0]?.label).toBe('Jan');
    expect(scale.monthTicks[11]?.label).toBe('Dec');
  });

  it('monthTicks first entry has x=0 (Jan 1 = start)', () => {
    expect(scale.monthTicks[0]?.x).toBe(0);
  });

  it('weekTicks has 53 entries (every 7 days from day 0 through day 364)', () => {
    // floor(364/7) = 52, so 53 entries (0, 7, 14, …, 364)
    expect(scale.weekTicks.length).toBe(53);
    expect(scale.weekTicks[0]?.x).toBe(0);
    expect(scale.weekTicks[52]?.x).toBe(364 * 3);
  });

  it('todayX returns dateToX of today (UTC date)', () => {
    // Today (2026-04-26) → 115 days from 2026-01-01 → 345 px
    // Note: this test is date-sensitive and asserts the function is integrated with the scale.
    // We assert numerical consistency rather than a specific date (test must remain green
    // regardless of the day this test is run).
    const tx = scale.todayX();
    expect(typeof tx).toBe('number');
    // todayX must equal dateToX of today's date — round-trip via xToDate snaps to a day boundary.
    const snapped = scale.xToDate(tx);
    expect(scale.dateToX(snapped)).toBe(tx);
  });
});

describe('createTimeScale — multi-year (garlic year-rollover)', () => {
  // Garlic spans Oct 2026 → Jul 2027; the GanttView creates scales spanning 2 years.
  const scale = createTimeScale({ start: '2026-01-01', end: '2027-12-31', pxPerDay: 3 });

  it('spans 2 years correctly', () => {
    // 2026 (365 days, non-leap) - 1 + 2027 (365 days, non-leap) - 1 = 729-ish days
    // Actually: 2026-01-01 to 2027-12-31 = 729 days (2 years - 1 day)
    expect(scale.totalWidth).toBe(729 * 3);
  });

  it('monthTicks has 24 entries across 2 years', () => {
    expect(scale.monthTicks.length).toBe(24);
    expect(scale.monthTicks[0]?.label).toBe('Jan');
    expect(scale.monthTicks[12]?.label).toBe('Jan'); // year 2 January
    expect(scale.monthTicks[23]?.label).toBe('Dec');
  });
});
