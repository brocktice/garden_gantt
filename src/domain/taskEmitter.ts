// src/domain/taskEmitter.ts
// Per D-10/D-12. Pure: no I/O, no React, dates via dateWrappers only.
//
// Phase 1 emits 3 universal auto-task types per planting (gated on catalog flags):
//   - water-seedlings:        every 3 days during indoor phase
//   - harden-off-day:         one per day in the harden-off range
//   - fertilize-at-flowering: single event at transplant + floor(daysToMaturity/2)

import type { CustomTask, Plant, ScheduleEvent, Task } from './types';
import { parseDate, addDays, differenceInDays, toISODate } from './dateWrappers';
import { eventId } from './ids';

export interface PlantingAnchors {
  indoorStart?: string;
  germStart?: string;
  germEnd?: string;
  hardenOffStart?: string;
  hardenOffEnd?: string;
  transplant?: string;
  directSow?: string;
  harvestStart: string;
  harvestEnd: string;
}

/** Cadence: every 3 calendar days from start through end (inclusive). */
function emitEvery3Days(
  plantingIdValue: string,
  plantId: string,
  eventType: 'water-seedlings',
  startISO: string,
  endISO: string,
): ScheduleEvent[] {
  const start = parseDate(startISO);
  const end = parseDate(endISO);
  const total = differenceInDays(end, start);
  const out: ScheduleEvent[] = [];
  for (let i = 0, n = 0; i <= total; i += 3, n++) {
    const day = addDays(start, i);
    out.push({
      id: eventId(plantingIdValue, eventType, n),
      plantingId: plantingIdValue,
      plantId,
      type: eventType,
      start: toISODate(day),
      end: toISODate(day),
      edited: false,
      constraintsApplied: [],
    });
  }
  return out;
}

/** Cadence: one event per UTC day from start through end (inclusive). */
function emitDaily(
  plantingIdValue: string,
  plantId: string,
  eventType: 'harden-off-day',
  startISO: string,
  endISO: string,
): ScheduleEvent[] {
  const start = parseDate(startISO);
  const end = parseDate(endISO);
  const total = differenceInDays(end, start);
  const out: ScheduleEvent[] = [];
  for (let i = 0; i <= total; i++) {
    const day = addDays(start, i);
    out.push({
      id: eventId(plantingIdValue, eventType, i),
      plantingId: plantingIdValue,
      plantId,
      type: eventType,
      start: toISODate(day),
      end: toISODate(day),
      edited: false,
      constraintsApplied: [],
    });
  }
  return out;
}

/**
 * Emit Phase 1's 3 universal auto-task event types.
 * - water-seedlings:        gated on requiresHardening + indoorStart + transplant defined
 * - harden-off-day:         gated on requiresHardening + hardenOffStart + hardenOffEnd defined
 * - fertilize-at-flowering: gated on hasFlowering + transplant defined; date = transplant + floor(daysToMaturity/2)
 */
export function emitTaskEvents(
  plantingIdValue: string,
  plantId: string,
  plant: Plant,
  anchors: PlantingAnchors,
): ScheduleEvent[] {
  const out: ScheduleEvent[] = [];

  // water-seedlings — every 3 days from indoorStart to transplant-1
  if (plant.timing.requiresHardening && anchors.indoorStart && anchors.transplant) {
    const dayBeforeTransplant = toISODate(addDays(parseDate(anchors.transplant), -1));
    out.push(
      ...emitEvery3Days(
        plantingIdValue,
        plantId,
        'water-seedlings',
        anchors.indoorStart,
        dayBeforeTransplant,
      ),
    );
  }

  // harden-off-day — one per day in the harden-off range
  if (
    plant.timing.requiresHardening &&
    anchors.hardenOffStart &&
    anchors.hardenOffEnd
  ) {
    out.push(
      ...emitDaily(
        plantingIdValue,
        plantId,
        'harden-off-day',
        anchors.hardenOffStart,
        anchors.hardenOffEnd,
      ),
    );
  }

  // fertilize-at-flowering — single event at transplant + floor(DTM/2)
  if (plant.timing.hasFlowering && anchors.transplant) {
    const transplant = parseDate(anchors.transplant);
    const offsetDays = Math.floor(plant.timing.daysToMaturity / 2);
    const fertilizeDate = toISODate(addDays(transplant, offsetDays));
    out.push({
      id: eventId(plantingIdValue, 'fertilize-at-flowering'),
      plantingId: plantingIdValue,
      plantId,
      type: 'fertilize-at-flowering',
      start: fertilizeDate,
      end: fertilizeDate,
      edited: false,
      constraintsApplied: [],
    });
  }

  return out;
}

/**
 * Expand recurring custom tasks into per-day occurrences within [rangeStart, rangeEnd].
 * Per CONTEXT D-36: each recurring occurrence's id is a composite key `${ct.id}:${YYYY-MM-DD}`.
 * Completion is read from `completedKeys` using either the bare ct.id (one-off) or the
 * composite key (recurring per-occurrence).
 *
 * Source: [CITED: 03-RESEARCH.md §Pattern 7]
 *         [CITED: 03-CONTEXT.md D-36]
 *
 * Purity: zero React/Zustand/I/O. Date math via dateWrappers only.
 *
 * Defensive: `intervalDays` is clamped to Math.max(1, ...) so a malformed CustomTask with
 * intervalDays: 0 cannot trigger an infinite loop (T-03-05-01 mitigation).
 */
export function expandRecurringTasks(
  customTasks: CustomTask[],
  rangeStart: string, // YYYY-MM-DD or full ISO
  rangeEnd: string,
  completedKeys: ReadonlySet<string>,
): Task[] {
  const out: Task[] = [];
  const start = parseDate(rangeStart);
  const end = parseDate(rangeEnd);

  // Use YYYY-MM-DD string comparisons for the in-range check — avoids edge cases where
  // sub-day ISO precision (e.g. nowISOString() at 04:40Z vs a task created seconds earlier)
  // pushes a task technically before the "start of today" range.
  const startDay = toISODate(start).slice(0, 10);
  const endDay = toISODate(end).slice(0, 10);

  for (const ct of customTasks) {
    if (!ct.recurrence) {
      // One-off: completion key is bare ct.id.
      const dueDay = ct.dueDate.slice(0, 10);
      if (dueDay >= startDay && dueDay <= endDay) {
        out.push({ ...ct, source: 'custom', completed: completedKeys.has(ct.id) });
      }
      continue;
    }

    const rawInterval =
      ct.recurrence.type === 'daily'
        ? 1
        : ct.recurrence.type === 'weekly'
          ? 7
          : ct.recurrence.intervalDays ?? 7;
    const interval = Math.max(1, rawInterval);

    const stopAt = ct.recurrence.endDate ? parseDate(ct.recurrence.endDate) : end;
    const effectiveEnd = stopAt < end ? stopAt : end;

    let cursor = parseDate(ct.dueDate);
    // Skip ahead to range start if dueDate is before it.
    while (cursor < start) {
      cursor = addDays(cursor, interval);
    }
    while (cursor <= effectiveEnd) {
      const dateStr = toISODate(cursor).slice(0, 10);
      const key = `${ct.id}:${dateStr}`;
      out.push({
        ...ct,
        id: key,
        source: 'custom',
        dueDate: toISODate(cursor),
        completed: completedKeys.has(key),
      });
      cursor = addDays(cursor, interval);
    }
  }
  return out;
}
