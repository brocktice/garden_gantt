// src/domain/constraints.ts
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Pattern 4]
//
// Phase 1 scope: ONE rule (SCH-04). Phase 3 extends the registry without touching this file.
// Pure: zero React, zero I/O, zero raw Date construction outside the parseDate import.

import type { GardenPlan, Plant, ScheduleEvent } from './types';
import { parseDate } from './dateWrappers';

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

const noTransplantBeforeLastFrostForTender: ConstraintRule = {
  name: 'noTransplantBeforeLastFrostForTender',
  appliesTo: (e, p) => e.type === 'transplant' && p.timing.frostTolerance === 'tender',
  check: (_e, candidate, plan, _plant) => {
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

const rules: ConstraintRule[] = [noTransplantBeforeLastFrostForTender];

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
      acc = { ok: true, finalDate: next.finalDate };
    }
  }
  return acc;
}
