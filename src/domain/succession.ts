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
import { parseDate, addDays, differenceInDays, toISODate } from './dateWrappers';
import {
  directSowOffsetForPlanting,
  resolveStartMethod,
  transplantOffsetForPlanting,
} from './plantingTiming';

export const DEFAULT_SUCCESSION_INTERVAL_DAYS = 14;
export const DEFAULT_SUCCESSION_COUNT = 1;

export interface SuccessionCapacity {
  intervalDays: number;
  upperBound: number;
  baseAnchorISO: string;
}

export function getSuccessionCapacity(
  plan: GardenPlan,
  planting: Planting,
  plant: Plant,
): SuccessionCapacity | null {
  const intervalDays =
    plant.timing.successionIntervalDays ?? DEFAULT_SUCCESSION_INTERVAL_DAYS;
  if (intervalDays <= 0) return null;

  const dtm = plant.timing.daysToMaturity;
  if (!dtm || dtm <= 0) return null;

  const lastFrost = parseDate(plan.location.lastFrostDate);
  const firstFrost = parseDate(plan.location.firstFrostDate);
  const offsetDays =
    resolveStartMethod(planting, plant) === 'indoor-start'
      ? transplantOffsetForPlanting(planting, plant)
      : directSowOffsetForPlanting(planting, plant);
  const baseAnchor = addDays(lastFrost, offsetDays);
  const daysToFirstFrost = differenceInDays(firstFrost, baseAnchor);
  const maxIndex = Math.floor((daysToFirstFrost - dtm) / intervalDays);
  const safetyCap = plant.timing.maxSuccessions ?? 12;
  return {
    intervalDays,
    upperBound: Math.min(maxIndex, safetyCap),
    baseAnchorISO: toISODate(baseAnchor),
  };
}

export function clampSuccessionCount(
  requested: number | undefined,
  capacity: SuccessionCapacity,
): number {
  const fallback = Math.min(DEFAULT_SUCCESSION_COUNT, capacity.upperBound);
  const count = requested ?? fallback;
  return Math.max(0, Math.min(count, capacity.upperBound));
}

export function successionLastPlantingDate(
  capacity: SuccessionCapacity,
  count: number,
): string {
  return toISODate(addDays(parseDate(capacity.baseAnchorISO), count * capacity.intervalDays));
}

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
  const expanded: Planting[] = [];

  for (const planting of plan.plantings) {
    expanded.push(planting); // index 0 always preserved with original id
    if (!planting.successionEnabled) continue;

    const plant = catalog.get(planting.plantId);
    if (!plant) continue; // missing plant: silently skip (Phase 1 invariant)

    const capacity = getSuccessionCapacity(plan, planting, plant);
    if (!capacity || capacity.upperBound < 1) continue;
    const count = clampSuccessionCount(planting.successionCount, capacity);
    if (count < 1) continue;

    for (let i = 1; i <= count; i++) {
      expanded.push({
        ...planting,
        id: `${planting.id}-s${i}`,
        successionIndex: i,
        // Plan 02-10 (Rule 2 deviation): stagger derived plantings by i * interval days.
        // The engine reads startOffsetDays and shifts its lastFrost anchor; downstream
        // events (indoor-start, transplant, harvest, etc.) all shift in lockstep so each
        // succession row plants on a distinct calendar date (D-22 visual goal).
        startOffsetDays: (planting.startOffsetDays ?? 0) + i * capacity.intervalDays,
        // successionEnabled stays true so visual grouping works
      });
    }
  }

  return { ...plan, plantings: expanded };
}
