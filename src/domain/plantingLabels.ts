import type { Plant, Planting } from './types';

function basePlantingId(id: string): string {
  return id.replace(/-s\d+$/, '');
}

function rawPlantingName(
  planting: Planting | undefined,
  catalog: ReadonlyMap<string, Plant>,
  fallbackPlantId: string,
): string {
  const label = planting?.label?.trim();
  if (label) return label;
  const plantId = planting?.plantId ?? fallbackPlantId;
  return catalog.get(plantId)?.name ?? plantId;
}

/**
 * Builds stable display labels for a plan's planting rows. User labels win.
 * Otherwise, repeated base plantings of the same plant are numbered and
 * derived succession rows inherit the base label with an S-number suffix.
 */
export function buildPlantingLabelMap(
  plantings: readonly Planting[],
  catalog: ReadonlyMap<string, Plant>,
): Map<string, string> {
  const baseById = new Map<string, Planting>();
  for (const planting of plantings) {
    if ((planting.successionIndex ?? 0) === 0) {
      baseById.set(planting.id, planting);
    }
  }

  const plantCounts = new Map<string, number>();
  for (const planting of baseById.values()) {
    plantCounts.set(planting.plantId, (plantCounts.get(planting.plantId) ?? 0) + 1);
  }

  const seenByPlant = new Map<string, number>();
  const baseLabels = new Map<string, string>();
  for (const planting of baseById.values()) {
    const seen = (seenByPlant.get(planting.plantId) ?? 0) + 1;
    seenByPlant.set(planting.plantId, seen);

    const hasCustomLabel = planting.label?.trim();
    const name = rawPlantingName(planting, catalog, planting.plantId);
    const shouldNumber = !hasCustomLabel && (plantCounts.get(planting.plantId) ?? 0) > 1;
    baseLabels.set(planting.id, shouldNumber ? `${name} #${seen}` : name);
  }

  const labels = new Map<string, string>();
  for (const planting of plantings) {
    const baseId = basePlantingId(planting.id);
    const baseLabel =
      baseLabels.get(baseId) ?? rawPlantingName(planting, catalog, planting.plantId);
    const successionIndex = planting.successionIndex ?? 0;
    labels.set(
      planting.id,
      successionIndex > 0 ? `${baseLabel} - S${successionIndex + 1}` : baseLabel,
    );
  }

  return labels;
}

export function getPlantingLabel(
  planting: Planting,
  catalog: ReadonlyMap<string, Plant>,
  allPlantings: readonly Planting[],
): string {
  return buildPlantingLabelMap(allPlantings, catalog).get(planting.id) ?? planting.id;
}
