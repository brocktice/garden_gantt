// src/domain/scheduler.ts
// The product. Pure entry point per SCH-02.
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Pattern 1, §System Architecture Diagram]
//
// Algorithm:
//   For each Planting → resolve Plant from catalog → compute base anchors from
//   plant.timing + plan.location.lastFrostDate → emit lifecycle events → apply
//   constraints (SCH-04 transplant clamp) → append auto-task events → sort.
//
// Purity: zero React/Zustand/I/O; date math via dateWrappers only.

import type { GardenPlan, Plant, Planting, ScheduleEvent } from './types';
import { parseDate, addDays, subDays, toISODate } from './dateWrappers';
import { eventId } from './ids';
import { canMove } from './constraints';
import { emitTaskEvents, type PlantingAnchors } from './taskEmitter';

function eventsForPlanting(
  planting: Planting,
  plant: Plant,
  plan: GardenPlan,
): ScheduleEvent[] {
  // Phase 2 (Plan 02-10): apply per-planting startOffsetDays to the lastFrost anchor.
  // Default 0 ⇒ identity. Used by expandSuccessions to stagger derived plantings so
  // each succession row plants on a distinct calendar date (D-22).
  const baseLastFrost = parseDate(plan.location.lastFrostDate);
  const lastFrost = addDays(baseLastFrost, planting.startOffsetDays ?? 0);
  const out: ScheduleEvent[] = [];
  const anchors: PlantingAnchors = {
    // populated below
    harvestStart: '',
    harvestEnd: '',
  };

  const t = plant.timing;
  const germWindow = t.daysToGermination?.[1] ?? 10;

  if (t.startMethod === 'indoor-start') {
    // weeksIndoorBeforeLastFrost is required for indoor-start plants in our Phase 1 catalog
    const weeks = t.weeksIndoorBeforeLastFrost ?? 6;
    const indoorStart = subDays(lastFrost, weeks * 7);
    const transplant = addDays(lastFrost, t.transplantOffsetDaysFromLastFrost ?? 0);
    const daysToHardenOff = t.daysToHardenOff ?? 7;
    const hardenOffEnd = subDays(transplant, 1);
    const hardenOffStart = subDays(transplant, daysToHardenOff);
    const germStart = indoorStart;
    const germEnd = addDays(indoorStart, germWindow);
    const harvestStart = addDays(transplant, t.daysToMaturity);
    const harvestEnd = addDays(harvestStart, t.harvestWindowDays);

    anchors.indoorStart = toISODate(indoorStart);
    anchors.germStart = toISODate(germStart);
    anchors.germEnd = toISODate(germEnd);
    anchors.transplant = toISODate(transplant);
    anchors.harvestStart = toISODate(harvestStart);
    anchors.harvestEnd = toISODate(harvestEnd);

    if (t.requiresHardening) {
      anchors.hardenOffStart = toISODate(hardenOffStart);
      anchors.hardenOffEnd = toISODate(hardenOffEnd);
    }

    // Lifecycle events
    out.push({
      id: eventId(planting.id, 'indoor-start'),
      plantingId: planting.id,
      plantId: plant.id,
      type: 'indoor-start',
      start: anchors.indoorStart,
      end: anchors.indoorStart,
      edited: false,
      constraintsApplied: [],
    });
    out.push({
      id: eventId(planting.id, 'germination-window'),
      plantingId: planting.id,
      plantId: plant.id,
      type: 'germination-window',
      start: anchors.germStart,
      end: anchors.germEnd,
      edited: false,
      constraintsApplied: [],
    });
    if (t.requiresHardening && anchors.hardenOffStart && anchors.hardenOffEnd) {
      out.push({
        id: eventId(planting.id, 'harden-off'),
        plantingId: planting.id,
        plantId: plant.id,
        type: 'harden-off',
        start: anchors.hardenOffStart,
        end: anchors.hardenOffEnd,
        edited: false,
        constraintsApplied: [],
      });
    }
    // Build candidate transplant event, then apply constraints (SCH-04)
    const transplantCandidate: ScheduleEvent = {
      id: eventId(planting.id, 'transplant'),
      plantingId: planting.id,
      plantId: plant.id,
      type: 'transplant',
      start: anchors.transplant,
      end: anchors.transplant,
      edited: false,
      constraintsApplied: [],
    };
    const result = canMove(transplantCandidate, transplantCandidate.start, plan, plant);
    if ('clamped' in result && result.clamped) {
      // Update both the event AND anchors.transplant so downstream task events use the clamped date
      anchors.transplant = result.finalDate;
      out.push({
        ...transplantCandidate,
        start: result.finalDate,
        end: result.finalDate,
        constraintsApplied: ['noTransplantBeforeLastFrostForTender'],
      });
    } else {
      out.push(transplantCandidate);
    }
    // Harvest window
    out.push({
      id: eventId(planting.id, 'harvest-window'),
      plantingId: planting.id,
      plantId: plant.id,
      type: 'harvest-window',
      start: anchors.harvestStart,
      end: anchors.harvestEnd,
      edited: false,
      constraintsApplied: [],
    });
  } else {
    // direct-sow OR either (treated as direct-sow)
    const directSow = addDays(lastFrost, t.directSowOffsetDaysFromLastFrost ?? 0);
    const germStart = directSow;
    const germEnd = addDays(directSow, germWindow);
    const harvestStart = addDays(directSow, t.daysToMaturity);
    const harvestEnd = addDays(harvestStart, t.harvestWindowDays);

    anchors.directSow = toISODate(directSow);
    anchors.germStart = toISODate(germStart);
    anchors.germEnd = toISODate(germEnd);
    anchors.harvestStart = toISODate(harvestStart);
    anchors.harvestEnd = toISODate(harvestEnd);

    out.push({
      id: eventId(planting.id, 'direct-sow'),
      plantingId: planting.id,
      plantId: plant.id,
      type: 'direct-sow',
      start: anchors.directSow,
      end: anchors.directSow,
      edited: false,
      constraintsApplied: [],
    });
    out.push({
      id: eventId(planting.id, 'germination-window'),
      plantingId: planting.id,
      plantId: plant.id,
      type: 'germination-window',
      start: anchors.germStart,
      end: anchors.germEnd,
      edited: false,
      constraintsApplied: [],
    });
    out.push({
      id: eventId(planting.id, 'harvest-window'),
      plantingId: planting.id,
      plantId: plant.id,
      type: 'harvest-window',
      start: anchors.harvestStart,
      end: anchors.harvestEnd,
      edited: false,
      constraintsApplied: [],
    });
  }

  // Auto-task events (D-12; gated on catalog flags)
  out.push(...emitTaskEvents(planting.id, plant.id, plant, anchors));

  return out;
}

/**
 * Pure entry point. Phase 1 success criterion #1 + #2 depend on this.
 * For each planting in plan: resolve plant → compute anchors → apply constraints → emit tasks.
 * Returns a deterministic, sorted ScheduleEvent[].
 */
export function generateSchedule(
  plan: GardenPlan,
  catalog: ReadonlyMap<string, Plant>,
): ScheduleEvent[] {
  const all: ScheduleEvent[] = [];
  for (const planting of plan.plantings) {
    const plant = catalog.get(planting.plantId);
    if (!plant) continue; // Missing plant: silently skip in Phase 1; Plan 05 doesn't exercise.
    // Phase 2 (Pitfall D): defensive — skip plantings whose plant has malformed DTM
    // (e.g., user-authored custom plant with daysToMaturity <= 0). Three layers of
    // defense: Zod (Plan 02-01) rejects on import; modal validation (Plan 02-09)
    // prevents save; this guard handles any leak through.
    if (!plant.timing.daysToMaturity || plant.timing.daysToMaturity <= 0) continue;
    all.push(...eventsForPlanting(planting, plant, plan));
  }
  // Stable order: by start date asc, then by event type asc, then by id asc.
  all.sort((a, b) => {
    if (a.start !== b.start) return a.start < b.start ? -1 : 1;
    if (a.type !== b.type) return a.type < b.type ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
  return all;
}
