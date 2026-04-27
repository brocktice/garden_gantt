// src/features/export-reminder/useExportReminder.ts
// Phase 4 Plan 04-05 Task 2 — D-12 should-show selector + D-13 snooze action helpers.
// Source: 04-05-PLAN.md Task 2 + 04-RESEARCH.md §Code Examples (selector pattern).
//         04-CONTEXT.md D-12 (thresholds), D-13 (snooze copy/durations), D-14 (counter
//         resets only via exportPlan success path), D-15 (uiStore.exportReminder shape).
//
// Triggers (D-12):
//   A. dirtySinceExport >= 20 (regardless of last-export age)
//   B. (now - lastExportedAt) >= 14d AND dirtySinceExport > 0
// Snooze (D-13): snoozedUntil > now overrides both triggers (banner stays hidden).
// "No edits = no nagging": dirtySinceExport === 0 short-circuits to false even when
// last export is years old (D-12 explicit).
//
// Date discipline:
//   - parseISO from date-fns (NOT raw `new Date(string)`) — ESLint allowlist friendly.
//   - nowISOString() from src/domain/dateWrappers is the canonical "now" source.
//   - Snooze writes use `addDays(parseISO(now), n).toISOString()` — no raw new Date().
//   - Date-label format runs through UTCDate wrapper so the rendered short date is
//     timezone-stable (matches the noon-UTC storage convention in dateWrappers.ts).
import { UTCDate } from '@date-fns/utc';
import { differenceInCalendarDays, parseISO, addDays, format } from 'date-fns';
import { useUIStore } from '../../stores/uiStore';
import { nowISOString } from '../../domain/dateWrappers';

const DIRTY_THRESHOLD = 20;
const AGE_THRESHOLD_DAYS = 14;
const SNOOZE_LATER_DAYS = 3;
const SNOOZE_LONG_DAYS = 30;

export interface ExportReminderState {
  shouldShow: boolean;
  count: number;
  lastExportedAt: string | null;
}

export interface ExportReminderActions extends ExportReminderState {
  snooze3Days: () => void;
  snooze30Days: () => void;
  formatLastExportedShort: () => string;
}

/**
 * Pure should-show selector. Composes the three uiStore.exportReminder fields against
 * the D-12 trigger matrix. Returns the banner display state — actions live on
 * `useExportReminder()` below.
 *
 * Snooze precedence: when snoozedUntil > now, returns shouldShow=false unconditionally.
 * Otherwise: dirtySinceExport === 0 → false (D-12 "no edits = no nagging"); else
 * Trigger A (dirty >= 20) OR Trigger B (age >= 14d AND dirty > 0) → true.
 */
export function useShouldShowExportReminder(): ExportReminderState {
  const dirty = useUIStore((s) => s.exportReminder.dirtySinceExport);
  const lastExported = useUIStore((s) => s.exportReminder.lastExportedAt);
  const snoozedUntil = useUIStore((s) => s.exportReminder.snoozedUntil);

  const now = parseISO(nowISOString());

  // Snooze takes precedence (T-04-05-04 mitigation: malformed snoozedUntil yields
  // Invalid Date; comparing > now returns false, so malformed strings degrade to
  // "snooze expired" — banner shows. Acceptable failure mode.)
  if (snoozedUntil && parseISO(snoozedUntil) > now) {
    return { shouldShow: false, count: dirty, lastExportedAt: lastExported };
  }

  // No edits = no nagging (D-12 explicit).
  if (dirty <= 0) {
    return { shouldShow: false, count: dirty, lastExportedAt: lastExported };
  }

  // Trigger A: dirty count threshold reached.
  if (dirty >= DIRTY_THRESHOLD) {
    return { shouldShow: true, count: dirty, lastExportedAt: lastExported };
  }

  // Trigger B: 14+ days since last export AND any dirty edits.
  if (lastExported) {
    const daysSince = differenceInCalendarDays(now, parseISO(lastExported));
    if (daysSince >= AGE_THRESHOLD_DAYS) {
      return { shouldShow: true, count: dirty, lastExportedAt: lastExported };
    }
  }

  return { shouldShow: false, count: dirty, lastExportedAt: lastExported };
}

/**
 * Reactive selector + action helpers for the ExportReminderBanner. Wraps the
 * should-show selector and exposes snooze writers + a date-label formatter.
 *
 * Snooze writers compute `now + N days` via date-fns `addDays` over `parseISO`,
 * never via raw `new Date(string)` (per ESLint no-restricted-syntax outside the
 * dateWrappers allowlist).
 */
export function useExportReminder(): ExportReminderActions {
  const setSnoozedUntil = useUIStore((s) => s.setSnoozedUntil);
  const state = useShouldShowExportReminder();

  const snoozeNDays = (n: number): void => {
    const target = addDays(parseISO(nowISOString()), n);
    setSnoozedUntil(target.toISOString());
  };

  return {
    ...state,
    snooze3Days: () => snoozeNDays(SNOOZE_LATER_DAYS),
    snooze30Days: () => snoozeNDays(SNOOZE_LONG_DAYS),
    // UTCDate wrapper keeps the short label timezone-stable (matches noon-UTC
    // storage convention; "Apr 15" for `2026-04-15T12:00:00.000Z` regardless of
    // viewer timezone).
    formatLastExportedShort: () =>
      state.lastExportedAt
        ? format(new UTCDate(parseISO(state.lastExportedAt)), 'MMM d')
        : 'you started',
  };
}
