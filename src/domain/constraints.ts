// src/domain/constraints.ts
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Pattern 4]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-01-PLAN.md Task 2 (B)]
//
// Phase 1 scope: ONE rule (SCH-04, noTransplantBeforeLastFrostForTender).
// Phase 3 (GANTT-05): adds two rules to the registry without changing the registry mechanics:
//   - hardenOffMustPrecedeTransplant: clamps a transplant candidate forward when squeezing
//     harden-off below the indoor anchor.
//   - harvestMustFollowTransplantByDTM: clamps a harvest-window candidate forward when it
//     would start before transplant + daysToMaturity. Edit-aware (reads anchor edits from
//     plan.edits[] so cascade math reflows correctly).
//
// Pure: zero React, zero I/O, zero raw Date construction outside the parseDate import.

import type { EventType, GardenPlan, Plant, ScheduleEvent } from './types';
import { parseDate, addDays, toISODate } from './dateWrappers';

export type ConstraintResult =
  | { ok: true; finalDate: string; clamped?: false }
  | { ok: true; finalDate: string; clamped: true; reasons: string[] };

interface ConstraintRule {
  name: string;
  appliesTo: (event: ScheduleEvent, plant: Plant) => boolean;
  check: (
    event: ScheduleEvent,
    candidate: string,
    plan: GardenPlan,
    plant: Plant,
  ) => ConstraintResult;
}

/**
 * Last-write-wins lookup for an edit on (plantingId, eventType). Mirrors the helper in
 * scheduler.ts; duplicated here to keep this module's import surface narrow (constraints
 * is consumed by the @dnd-kit modifier and must stay tree-shakable per CONTEXT D-08).
 */
function findEditAnchor(
  plan: GardenPlan,
  plantingId: string,
  eventType: EventType,
): string | undefined {
  for (let i = plan.edits.length - 1; i >= 0; i--) {
    const e = plan.edits[i];
    if (e && e.plantingId === plantingId && e.eventType === eventType) {
      return e.startOverride;
    }
  }
  return undefined;
}

const noTransplantBeforeLastFrostForTender: ConstraintRule = {
  name: 'noTransplantBeforeLastFrostForTender',
  appliesTo: (e, p) => e.type === 'transplant' && p.timing.frostTolerance === 'tender',
  // ConstraintRule.check has 4 parameters; this rule only needs `candidate` and `plan`.
  // TypeScript permits fewer-param function literals against a wider call signature.
  check: (_e, candidate, plan) => {
    const lastFrost = parseDate(plan.location.lastFrostDate);
    const cand = parseDate(candidate);
    if (cand.getTime() >= lastFrost.getTime()) {
      return { ok: true, finalDate: candidate };
    }
    return {
      ok: true,
      clamped: true,
      finalDate: plan.location.lastFrostDate,
      reasons: [
        `Tender plant: clamped transplant to last frost (${plan.location.lastFrostDate}).`,
      ],
    };
  },
};

// Phase 3 GANTT-05: harden-off must precede transplant by daysToHardenOff (D-06).
// Active rule: dragging transplant earlier squeezes harden-off; if harden-off would start
// before the indoor anchor, clamp transplant forward to indoorAnchor + hardenDays + 1.
// (Harden-off itself is not directly draggable in v1; this rule ensures transplant drags
// preserve the lead-time invariant. The rule is registry-resident so Phase 4 keyboard-drag
// of harden-off can reuse the same constraint shape.)
const hardenOffMustPrecedeTransplant: ConstraintRule = {
  name: 'hardenOffMustPrecedeTransplant',
  appliesTo: (e, p) => e.type === 'transplant' && p.timing.requiresHardening === true,
  check: (event, candidate, plan, plant) => {
    const planting = plan.plantings.find((p) => p.id === event.plantingId);
    if (!planting) return { ok: true, finalDate: candidate };
    const hardenDays = plant.timing.daysToHardenOff ?? 7;

    // Indoor anchor: post-edit if a user-drag set it, else computed from
    // plant.timing.weeksIndoorBeforeLastFrost (negative offset from lastFrost).
    const baseLastFrost = parseDate(plan.location.lastFrostDate);
    const indoorEditISO = findEditAnchor(plan, planting.id, 'indoor-start');
    const indoorAnchorISO =
      indoorEditISO ??
      toISODate(addDays(baseLastFrost, -((plant.timing.weeksIndoorBeforeLastFrost ?? 6) * 7)));
    const indoorAnchor = parseDate(indoorAnchorISO);

    const candidateDate = parseDate(candidate);
    const hardenOffEnd = addDays(candidateDate, -1);
    const hardenOffStart = addDays(hardenOffEnd, -hardenDays);

    if (hardenOffStart.getTime() >= indoorAnchor.getTime()) {
      return { ok: true, finalDate: candidate };
    }
    // Clamp candidate forward so harden-off can begin no earlier than the indoor anchor:
    //   minTransplant = indoorAnchor + hardenDays + 1 day
    const minTransplant = toISODate(addDays(indoorAnchor, hardenDays + 1));
    return {
      ok: true,
      clamped: true,
      finalDate: minTransplant,
      reasons: [
        `Harden-off must precede transplant by ${hardenDays} days (earliest transplant: ${minTransplant.slice(0, 10)}).`,
      ],
    };
  },
};

// Phase 3 GANTT-05: harvest must follow transplant (or direct-sow) by ≥ daysToMaturity.
// Active rule fires when user resizes/drags harvest-window left of the planting anchor + DTM.
const harvestMustFollowTransplantByDTM: ConstraintRule = {
  name: 'harvestMustFollowTransplantByDTM',
  appliesTo: (e) => e.type === 'harvest-window',
  check: (event, candidate, plan, plant) => {
    const planting = plan.plantings.find((p) => p.id === event.plantingId);
    if (!planting) return { ok: true, finalDate: candidate };

    // Anchor: 'transplant' for indoor-start (and 'either'); 'direct-sow' for direct-sow.
    const anchorType: EventType =
      plant.timing.startMethod === 'direct-sow' ? 'direct-sow' : 'transplant';

    const baseLastFrost = parseDate(plan.location.lastFrostDate);
    const computedAnchorISO =
      anchorType === 'transplant'
        ? toISODate(addDays(baseLastFrost, plant.timing.transplantOffsetDaysFromLastFrost ?? 0))
        : toISODate(
            addDays(baseLastFrost, plant.timing.directSowOffsetDaysFromLastFrost ?? 0),
          );

    const anchorEditISO = findEditAnchor(plan, planting.id, anchorType);
    const anchorISO = anchorEditISO ?? computedAnchorISO;
    const minHarvestStart = toISODate(
      addDays(parseDate(anchorISO), plant.timing.daysToMaturity),
    );

    if (parseDate(candidate).getTime() >= parseDate(minHarvestStart).getTime()) {
      return { ok: true, finalDate: candidate };
    }
    return {
      ok: true,
      clamped: true,
      finalDate: minHarvestStart,
      reasons: [
        `Harvest must be at least ${plant.timing.daysToMaturity} days after planting (${minHarvestStart.slice(0, 10)}).`,
      ],
    };
  },
};

const rules: ConstraintRule[] = [
  noTransplantBeforeLastFrostForTender,
  hardenOffMustPrecedeTransplant,
  harvestMustFollowTransplantByDTM,
];

export function canMove(
  event: ScheduleEvent,
  candidate: string,
  plan: GardenPlan,
  plant: Plant,
): ConstraintResult {
  let acc: ConstraintResult = { ok: true, finalDate: candidate };
  for (const rule of rules) {
    if (!rule.appliesTo(event, plant)) continue;
    const next = rule.check(event, acc.finalDate, plan, plant);
    if ('clamped' in next && next.clamped) {
      const accReasons: string[] = 'clamped' in acc && acc.clamped ? acc.reasons : [];
      acc = {
        ok: true,
        clamped: true,
        finalDate: next.finalDate,
        reasons: [...accReasons, ...next.reasons],
      };
    } else {
      // Pass-through: rule did not clamp. Preserve any prior clamp state.
      if (!('clamped' in acc && acc.clamped)) {
        acc = { ok: true, finalDate: next.finalDate };
      }
    }
  }
  return acc;
}
