// src/domain/dateWrappers.ts
// The ONLY module in this repo that may construct a raw Date from a string.
// Source: [VERIFIED: github.com/date-fns/utc README]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Pattern 2]
//
// Storage convention: ISO 8601 at UTC noon ("YYYY-MM-DDT12:00:00.000Z").
// Why noon: dodges Pitfall 6 (timezone display shift) — UTC noon on day X is the same
// calendar day in every timezone from UTC-12 to UTC+12.
// Why UTCDate: dodges Pitfall 7 (DST transitions). UTC arithmetic has no DST.

import { UTCDate } from '@date-fns/utc';
import {
  addDays as addDaysFns,
  subDays as subDaysFns,
  differenceInDays as differenceInDaysFns,
} from 'date-fns';

/**
 * Parse an ISO date string to a UTCDate at noon UTC.
 * Accepts "YYYY-MM-DD" (length 10, coerced to noon) or full ISO ("...T12:00:00Z" — used as-is).
 */
export function parseDate(iso: string): UTCDate {
  // Accept both date-only and datetime forms; coerce date-only to noon UTC.
  const trimmed = iso.length === 10 ? `${iso}T12:00:00Z` : iso;
  // eslint-disable-next-line no-restricted-syntax -- THIS is the allowed site (SCH-03).
  return new UTCDate(new Date(trimmed));
}

/**
 * Format a Date back to an ISO string at UTC noon. Idempotent over the noon-UTC convention.
 */
export function toISODate(date: Date): string {
  const d = new UTCDate(date);
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

/**
 * Format a Date as "YYYY-MM-DD" for display only (never for storage).
 */
export function formatDateShort(date: Date): string {
  const d = new UTCDate(date);
  return d.toISOString().slice(0, 10);
}

/**
 * Add N days using UTC arithmetic. Returns a UTCDate (not a stock Date) so downstream
 * formatting via toISOString() is timezone-stable.
 */
export function addDays(date: Date, days: number): UTCDate {
  return new UTCDate(addDaysFns(date, days));
}

/**
 * Subtract N days using UTC arithmetic.
 */
export function subDays(date: Date, days: number): UTCDate {
  return new UTCDate(subDaysFns(date, days));
}

/**
 * Difference in whole calendar days, computed in UTC (no DST hour drift).
 */
export function differenceInDays(a: Date, b: Date): number {
  return differenceInDaysFns(a, b);
}
