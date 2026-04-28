// src/domain/scheduler.ts
// The product. Pure entry point per SCH-02.
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Pattern 1, §System Architecture Diagram]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-01-PLAN.md Task 2 (A) — edit consumption]
//
// Algorithm:
//   For each Planting → resolve Plant from catalog → compute base anchors from
//   plant.timing + plan.location.lastFrostDate → apply plan.edits[] overrides per
//   (plantingId, eventType) → apply constraints (SCH-04 + Phase 3 rules) → emit lifecycle
//   events → emit auto-task events (which read from anchors that already incorporate edits
//   + clamps) → sort.
//
// Purity: zero React/Zustand/I/O; date math via dateWrappers only.

import type { EventType, GardenPlan, Plant, Planting, ScheduleEdit, ScheduleEvent } from './types';
import { parseDate, addDays, subDays, toISODate } from './dateWrappers';
import { eventId } from './ids';
import { canMove } from './constraints';
import { emitTaskEvents, type PlantingAnchors } from './taskEmitter';
import {
  directSowOffsetForPlanting,
  requiresHardeningForPlanting,
  resolveStartMethod,
  transplantOffsetForPlanting,
} from './plantingTiming';

/**
 * Last-write-wins lookup for an edit on (plantingId, eventType).
 * Phase 3 GANTT-07: drag commits append to plan.edits[]; the most recent edit (last in
 * array order) wins for a given (plantingId, eventType) pair. Scan from the end so a
 * fresh user-drag overrides any prior form-edit on the same field. When an edit is
 * found, the emitted ScheduleEvent gets `edited: true` so UI can render the
 * "user-edited" affordance (badge, color tweak, restore-to-default action).
 */
function findEdit(
  plan: GardenPlan,
  plantingId: string,
  eventType: EventType,
): ScheduleEdit | undefined {
  for (let i = plan.edits.length - 1; i >= 0; i--) {
    const e = plan.edits[i];
    if (e && e.plantingId === plantingId && e.eventType === eventType) return e;
  }
  return undefined;
}

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
  const startMethod = resolveStartMethod(planting, plant);
  const requiresHardening = requiresHardeningForPlanting(planting, plant);
  const effectivePlant: Plant = {
    ...plant,
    timing: {
      ...plant.timing,
      startMethod,
      requiresHardening,
    },
  };
  const germWindow = t.daysToGermination?.[1] ?? 10;

  if (startMethod === 'indoor-start') {
    // weeksIndoorBeforeLastFrost is required for indoor-start plants in our Phase 1 catalog
    const weeks = t.weeksIndoorBeforeLastFrost ?? 6;
    const computedIndoorStart = subDays(lastFrost, weeks * 7);
    const computedTransplant = addDays(lastFrost, transplantOffsetForPlanting(planting, plant));
    const daysToHardenOff = t.daysToHardenOff ?? 7;

    // Phase 3 GANTT-07: consume plan.edits[] BEFORE downstream cascade math so harvest +
    // tasks (water-seedlings end-day, fertilize-at-flowering, harden-off range) all
    // reflow off the EDITED anchor.
    const indoorEdit = findEdit(plan, planting.id, 'indoor-start');
    const transplantEdit = findEdit(plan, planting.id, 'transplant');

    let indoorStartISO = indoorEdit
      ? indoorEdit.startOverride
      : toISODate(computedIndoorStart);
    let transplantISO = transplantEdit
      ? transplantEdit.startOverride
      : toISODate(computedTransplant);

    // Constraint pipeline runs on the EDITED candidate (or computed if no edit) so user
    // can't drag a tender transplant before last frost via an edit either.
    const transplantCandidate: ScheduleEvent = {
      id: eventId(planting.id, 'transplant'),
      plantingId: planting.id,
      plantId: plant.id,
      type: 'transplant',
      start: transplantISO,
      end: transplantISO,
      edited: transplantEdit !== undefined,
      constraintsApplied: [],
    };
    const result = canMove(transplantCandidate, transplantISO, plan, plant);
    let transplantConstraints: string[] = [];
    if ('clamped' in result && result.clamped) {
      transplantISO = result.finalDate;
      // Build constraintsApplied from the rule reasons. Each rule contributes one entry.
      // For Phase 1 + Phase 3 we record rule names by inspection of reasons so ordering
      // is preserved without a structural rule registry change.
      transplantConstraints = result.reasons.map((reason) => {
        if (reason.includes('Tender plant')) return 'noTransplantBeforeLastFrostForTender';
        if (reason.includes('Harden-off must precede')) return 'hardenOffMustPrecedeTransplant';
        if (reason.includes('Indoor-start sequence')) {
          return 'indoorStartMustAllowGerminationAndHardenOff';
        }
        return 'unknown';
      });
    }

    const maxIndoorStartISO = toISODate(
      subDays(parseDate(transplantISO), daysToHardenOff + germWindow + 1),
    );
    let indoorConstraints: string[] = [];
    if (parseDate(indoorStartISO).getTime() > parseDate(maxIndoorStartISO).getTime()) {
      indoorStartISO = maxIndoorStartISO;
      indoorConstraints = ['indoorStartMustAllowGerminationAndHardenOff'];
    }

    // Recompute downstream anchors from the (post-edit, post-clamp) transplant.
    const transplantPost = parseDate(transplantISO);
    const harvestStart = addDays(transplantPost, t.daysToMaturity);
    const harvestEnd = addDays(harvestStart, t.harvestWindowDays);
    const hardenOffEnd = subDays(transplantPost, 1);
    const hardenOffStart = subDays(transplantPost, daysToHardenOff);
    const indoorStartDate = parseDate(indoorStartISO);
    const germStart = indoorStartDate;
    const germEnd = addDays(indoorStartDate, germWindow);

    anchors.indoorStart = indoorStartISO;
    anchors.germStart = toISODate(germStart);
    anchors.germEnd = toISODate(germEnd);
    anchors.transplant = transplantISO;
    anchors.harvestStart = toISODate(harvestStart);
    anchors.harvestEnd = toISODate(harvestEnd);

    if (requiresHardening) {
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
      edited: indoorEdit !== undefined || indoorConstraints.length > 0,
      constraintsApplied: indoorConstraints,
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
    if (requiresHardening && anchors.hardenOffStart && anchors.hardenOffEnd) {
      const hardenOffEdit = findEdit(plan, planting.id, 'harden-off');
      const minHardenStart = addDays(parseDate(anchors.germEnd), 1);
      const maxHardenEnd = subDays(parseDate(transplantISO), 1);
      let hardenStartISO = anchors.hardenOffStart;
      let hardenEndISO = anchors.hardenOffEnd;
      const hardenConstraints: string[] = [];
      if (hardenOffEdit) {
        hardenStartISO = hardenOffEdit.startOverride;
        hardenEndISO = hardenOffEdit.endOverride ?? hardenOffEdit.startOverride;
        if (parseDate(hardenStartISO).getTime() < minHardenStart.getTime()) {
          hardenStartISO = toISODate(minHardenStart);
          hardenConstraints.push('hardenOffMustFollowGermination');
        }
        if (parseDate(hardenEndISO).getTime() > maxHardenEnd.getTime()) {
          hardenEndISO = toISODate(maxHardenEnd);
          hardenConstraints.push('hardenOffMustPrecedeTransplant');
        }
        if (parseDate(hardenStartISO).getTime() > parseDate(hardenEndISO).getTime()) {
          hardenStartISO = toISODate(minHardenStart);
          hardenEndISO = toISODate(maxHardenEnd);
          hardenConstraints.push('hardenOffWindowRestoredToValidRange');
        }
      }
      out.push({
        id: eventId(planting.id, 'harden-off'),
        plantingId: planting.id,
        plantId: plant.id,
        type: 'harden-off',
        start: hardenStartISO,
        end: hardenEndISO,
        edited: hardenOffEdit !== undefined || hardenConstraints.length > 0,
        constraintsApplied: hardenConstraints,
      });
    }
    out.push({
      ...transplantCandidate,
      start: transplantISO,
      end: transplantISO,
      edited: transplantEdit !== undefined || transplantConstraints.length > 0,
      constraintsApplied: transplantConstraints,
    });

    // Harvest window: respect direct harvest-window edit if present (last-write-wins),
    // else use the cascade-derived dates. Either way the engine emits a harvest event.
    const harvestEdit = findEdit(plan, planting.id, 'harvest-window');
    const harvestStartISO = harvestEdit ? harvestEdit.startOverride : anchors.harvestStart;
    const harvestEndISO = harvestEdit
      ? harvestEdit.endOverride ?? harvestEdit.startOverride
      : anchors.harvestEnd;
    out.push({
      id: eventId(planting.id, 'harvest-window'),
      plantingId: planting.id,
      plantId: plant.id,
      type: 'harvest-window',
      start: harvestStartISO,
      end: harvestEndISO,
      edited: harvestEdit !== undefined,
      constraintsApplied: [],
    });
  } else {
    // direct-sow OR either (treated as direct-sow)
    const computedDirectSow = addDays(lastFrost, directSowOffsetForPlanting(planting, plant));
    const directSowEdit = findEdit(plan, planting.id, 'direct-sow');
    const directSowISO = directSowEdit
      ? directSowEdit.startOverride
      : toISODate(computedDirectSow);

    const directSowDate = parseDate(directSowISO);
    const germStart = directSowDate;
    const germEnd = addDays(directSowDate, germWindow);
    const harvestStart = addDays(directSowDate, t.daysToMaturity);
    const harvestEnd = addDays(harvestStart, t.harvestWindowDays);

    anchors.directSow = directSowISO;
    anchors.germStart = toISODate(germStart);
    anchors.germEnd = toISODate(germEnd);
    anchors.harvestStart = toISODate(harvestStart);
    anchors.harvestEnd = toISODate(harvestEnd);

    out.push({
      id: eventId(planting.id, 'direct-sow'),
      plantingId: planting.id,
      plantId: plant.id,
      type: 'direct-sow',
      start: directSowISO,
      end: directSowISO,
      edited: directSowEdit !== undefined,
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

    const harvestEdit = findEdit(plan, planting.id, 'harvest-window');
    const harvestStartISO = harvestEdit ? harvestEdit.startOverride : anchors.harvestStart;
    const harvestEndISO = harvestEdit
      ? harvestEdit.endOverride ?? harvestEdit.startOverride
      : anchors.harvestEnd;
    out.push({
      id: eventId(planting.id, 'harvest-window'),
      plantingId: planting.id,
      plantId: plant.id,
      type: 'harvest-window',
      start: harvestStartISO,
      end: harvestEndISO,
      edited: harvestEdit !== undefined,
      constraintsApplied: [],
    });
  }

  // Auto-task events (D-12; gated on catalog flags). Reads from anchors that have already
  // been updated for edits + constraint clamps, so projected tasks reflect the edited plan.
  out.push(...emitTaskEvents(planting.id, plant.id, effectivePlant, anchors));

  return out;
}

/**
 * Pure entry point. Phase 1 success criterion #1 + #2 depend on this.
 * For each planting in plan: resolve plant → compute anchors → apply edits → apply constraints
 * → emit tasks. Returns a deterministic, sorted ScheduleEvent[].
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
