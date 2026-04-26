// src/domain/succession.ts
// Pure pre-pass that expands plantings with successionEnabled: true into N derived
// plantings, spaced by plant.timing.successionIntervalDays, capped at firstFrostDate
// (per CONTEXT D-20). Returns a NEW plan; does not mutate input.
//
// Wired into useDerivedSchedule.ts (Plan 02-10) BEFORE generateSchedule(). Non-succession
// plans pass through unchanged so Phase 1's 7 engine snapshots remain byte-identical.
//
// Source: [CITED: 02-RESEARCH.md §Pattern 1 lines 363-427]
//         [CITED: 02-PATTERNS.md src/domain/succession.ts (NEW)]
//
// Purity: zero React/Zustand/I/O; date math via dateWrappers only.
//
// Derived planting ID convention: `${baseId}-s${i}` for i = 1..upperBound.
// successionIndex 0 is reserved for the original planting (identity preserved).

import type { GardenPlan, Plant, Planting } from './types';
import { parseDate, addDays, differenceInDays } from './dateWrappers';

/**
 * Pure pre-pass that expands successionEnabled plantings into a series of derived
 * plantings spaced by successionIntervalDays, capped so each derived planting's
 * harvest completes before firstFrostDate (D-20).
 *
 * Cap formula:
 *   baseAnchor       = lastFrost + offset (per startMethod)
 *   daysToFirstFrost = differenceInDays(firstFrost, baseAnchor)
 *   maxIndex         = floor((daysToFirstFrost - dtm) / interval)
 *   upperBound       = min(maxIndex, maxSuccessions ?? 12)
 *
 * Identity invariant: the original planting (successionIndex 0, original id) is
 * always preserved at the same position. Plans with no successionEnabled plantings
 * (or plants without successionIntervalDays) round-trip unchanged.
 */
export function expandSuccessions(
  plan: GardenPlan,
  catalog: ReadonlyMap<string, Plant>,
): GardenPlan {
  const lastFrost = parseDate(plan.location.lastFrostDate);
  const firstFrost = parseDate(plan.location.firstFrostDate);
  const expanded: Planting[] = [];

  for (const planting of plan.plantings) {
    expanded.push(planting); // index 0 always preserved with original id
    if (!planting.successionEnabled) continue;

    const plant = catalog.get(planting.plantId);
    if (!plant) continue; // missing plant: silently skip (Phase 1 invariant)

    const t = plant.timing;
    const interval = t.successionIntervalDays;
    if (!interval || interval <= 0) continue;

    const dtm = t.daysToMaturity;
    if (!dtm || dtm <= 0) continue; // Pitfall D — defensive

    // Pick anchor offset based on startMethod
    let offsetDays: number;
    if (t.startMethod === 'indoor-start') {
      offsetDays = t.transplantOffsetDaysFromLastFrost ?? 0;
    } else if (t.startMethod === 'direct-sow') {
      offsetDays = t.directSowOffsetDaysFromLastFrost ?? 0;
    } else {
      // 'either' — prefer direct-sow if specified, else transplant, else 0
      offsetDays =
        t.directSowOffsetDaysFromLastFrost ??
        t.transplantOffsetDaysFromLastFrost ??
        0;
    }
    const baseAnchor = addDays(lastFrost, offsetDays);

    const daysToFirstFrost = differenceInDays(firstFrost, baseAnchor);
    const maxIndex = Math.floor((daysToFirstFrost - dtm) / interval);
    const safetyCap = t.maxSuccessions ?? 12;
    const upperBound = Math.min(maxIndex, safetyCap);
    if (upperBound < 1) continue; // no room for even one succession

    for (let i = 1; i <= upperBound; i++) {
      expanded.push({
        ...planting,
        id: `${planting.id}-s${i}`,
        successionIndex: i,
        // Plan 02-10 (Rule 2 deviation): stagger derived plantings by i * interval days.
        // The engine reads startOffsetDays and shifts its lastFrost anchor; downstream
        // events (indoor-start, transplant, harvest, etc.) all shift in lockstep so each
        // succession row plants on a distinct calendar date (D-22 visual goal).
        startOffsetDays: (planting.startOffsetDays ?? 0) + i * interval,
        // successionEnabled stays true so visual grouping works
      });
    }
  }

  return { ...plan, plantings: expanded };
}
