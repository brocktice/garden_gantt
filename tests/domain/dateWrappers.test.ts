// tests/domain/dateWrappers.test.ts
// Pins down the date primitive. Failures here cascade into engine snapshot drift in Plan 05.
// Edge fixtures driven by D-17 (DST, leap year, year-rollover) — .planning/phases/01-foundation-schedule-engine/01-CONTEXT.md
import { describe, it, expect } from 'vitest';
import {
  parseDate,
  toISODate,
  formatDateShort,
  addDays,
  subDays,
  differenceInDays,
  nowISOString,
  lastDayOfMonth,
  currentYear,
} from '../../src/domain/dateWrappers';

describe('parseDate — coerce date-only to UTC noon (SCH-03)', () => {
  it('coerces YYYY-MM-DD to noon UTC ISO', () => {
    expect(parseDate('2026-04-15').toISOString()).toBe('2026-04-15T12:00:00.000Z');
  });

  it('accepts full ISO datetime as-is (idempotent over noon-UTC)', () => {
    expect(parseDate('2026-04-15T12:00:00.000Z').toISOString()).toBe('2026-04-15T12:00:00.000Z');
  });
});

describe('toISODate — normalize any Date to UTC-noon ISO string', () => {
  it('idempotent on already-noon-UTC input', () => {
    expect(toISODate(parseDate('2026-04-15'))).toBe('2026-04-15T12:00:00.000Z');
  });
});

describe('formatDateShort — display formatter (date-only string)', () => {
  it('returns YYYY-MM-DD slice', () => {
    expect(formatDateShort(parseDate('2026-04-15'))).toBe('2026-04-15');
  });
});

describe('addDays / subDays — DST safety (PITFALLS §7)', () => {
  it('crossing US spring-forward (Mar 8 2026): +1 day yields exact next calendar day', () => {
    // March 8 2026 is the DST spring-forward in US/Eastern.
    // UTC arithmetic does not see DST.
    expect(addDays(parseDate('2026-03-07'), 1).toISOString()).toBe('2026-03-08T12:00:00.000Z');
  });

  it('14-day subtract across spring-forward yields exact 14 calendar days', () => {
    // Tomato indoor-start canonical fixture: 14 days before 2026-03-12 == 2026-02-26
    expect(subDays(parseDate('2026-03-12'), 14).toISOString()).toBe('2026-02-26T12:00:00.000Z');
  });

  it('crossing US fall-back (Nov 1 2026): +1 day yields exact next calendar day', () => {
    expect(addDays(parseDate('2026-10-31'), 1).toISOString()).toBe('2026-11-01T12:00:00.000Z');
  });
});

describe('addDays — leap-year handling (D-17)', () => {
  it('Feb 28 2024 + 1 day == Feb 29 2024 (leap)', () => {
    expect(addDays(parseDate('2024-02-28'), 1).toISOString()).toBe('2024-02-29T12:00:00.000Z');
  });

  it('Feb 28 2024 + 2 days == Mar 1 2024', () => {
    expect(addDays(parseDate('2024-02-28'), 2).toISOString()).toBe('2024-03-01T12:00:00.000Z');
  });
});

describe('addDays — year rollover (D-17, garlic fixture)', () => {
  it('Oct 15 2026 + 270 days == Jul 12 2027', () => {
    // Garlic planted 2026-10-15, ~270-day to maturity, harvest in mid-July 2027
    expect(addDays(parseDate('2026-10-15'), 270).toISOString()).toBe('2027-07-12T12:00:00.000Z');
  });
});

describe('subDays — canonical "6 weeks before last frost" (PITFALLS §1)', () => {
  it('Apr 15 - 42 days == Mar 4 (no off-by-one)', () => {
    expect(subDays(parseDate('2026-04-15'), 42).toISOString()).toBe('2026-03-04T12:00:00.000Z');
  });
});

describe('differenceInDays — exact whole-day count', () => {
  it('Apr 15 - Mar 4 == 42 days', () => {
    expect(differenceInDays(parseDate('2026-04-15'), parseDate('2026-03-04'))).toBe(42);
  });
});

describe('nowISOString — canonical "current time" site (Phase 2 extension of SCH-03)', () => {
  it('returns full-precision UTC ISO string (YYYY-MM-DDTHH:mm:ss.sssZ)', () => {
    expect(nowISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('two consecutive calls are within 5 seconds of each other', () => {
    const a = Date.parse(nowISOString());
    const b = Date.parse(nowISOString());
    expect(Math.abs(b - a)).toBeLessThan(5_000);
  });
});

describe('lastDayOfMonth — month-boundary helper (D-24 gantt season axis)', () => {
  it('February 2024 (leap year) → 29', () => {
    expect(lastDayOfMonth(2024, 2)).toBe(29);
  });

  it('February 2026 (non-leap) → 28', () => {
    expect(lastDayOfMonth(2026, 2)).toBe(28);
  });

  it('January 2026 → 31', () => {
    expect(lastDayOfMonth(2026, 1)).toBe(31);
  });

  it('April 2026 → 30', () => {
    expect(lastDayOfMonth(2026, 4)).toBe(30);
  });

  it('December 2026 → 31', () => {
    expect(lastDayOfMonth(2026, 12)).toBe(31);
  });
});

describe('currentYear — canonical "current calendar year" site', () => {
  it('returns a finite integer', () => {
    const y = currentYear();
    expect(Number.isInteger(y)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
  });

  it('returns a year in the plausible Garden Gantt operating window', () => {
    const y = currentYear();
    expect(y).toBeGreaterThanOrEqual(2026);
    expect(y).toBeLessThanOrEqual(2100);
  });
});
