// src/domain/taskEmitter.ts
// Per D-10/D-12. Pure: no I/O, no React, dates via dateWrappers only.
//
// Phase 1 emits 3 universal auto-task types per planting (gated on catalog flags):
//   - water-seedlings:        every 3 days during indoor phase
//   - harden-off-day:         one per day in the harden-off range
//   - fertilize-at-flowering: single event at transplant + floor(daysToMaturity/2)

import type { Plant, ScheduleEvent } from './types';
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
