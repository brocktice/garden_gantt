import type { Plant, Planting } from './types';

export type ResolvedStartMethod = 'direct-sow' | 'indoor-start';

export function resolveStartMethod(planting: Planting, plant: Plant): ResolvedStartMethod {
  if (planting.startMethodOverride) return planting.startMethodOverride;
  return plant.timing.startMethod === 'indoor-start' ? 'indoor-start' : 'direct-sow';
}

export function requiresHardeningForPlanting(
  planting: Planting,
  plant: Plant,
): boolean {
  return resolveStartMethod(planting, plant) === 'indoor-start';
}

export function directSowOffsetForPlanting(planting: Planting, plant: Plant): number {
  void planting;
  return (
    plant.timing.directSowOffsetDaysFromLastFrost ??
    plant.timing.transplantOffsetDaysFromLastFrost ??
    0
  );
}

export function transplantOffsetForPlanting(planting: Planting, plant: Plant): number {
  void planting;
  return (
    plant.timing.transplantOffsetDaysFromLastFrost ??
    plant.timing.directSowOffsetDaysFromLastFrost ??
    0
  );
}
