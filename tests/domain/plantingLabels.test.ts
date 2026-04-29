import { describe, expect, it } from 'vitest';
import { buildPlantingLabelMap } from '../../src/domain/plantingLabels';
import { unverifiedFixtureSampleCatalog as sampleCatalog } from '../../src/assets/catalog.unverified';
import type { Planting } from '../../src/domain/types';

describe('buildPlantingLabelMap', () => {
  it('numbers repeated base plantings of the same plant', () => {
    const plantings: Planting[] = [
      { id: 'p-tomato', plantId: 'tomato', successionIndex: 0 },
      { id: 'p-tomato-2', plantId: 'tomato', successionIndex: 0 },
    ];

    const labels = buildPlantingLabelMap(plantings, sampleCatalog);

    expect(labels.get('p-tomato')).toBe('Tomato #1');
    expect(labels.get('p-tomato-2')).toBe('Tomato #2');
  });

  it('keeps custom labels and suffixes succession rows', () => {
    const plantings: Planting[] = [
      { id: 'p-lettuce', plantId: 'lettuce', successionIndex: 0, label: 'North bed' },
      { id: 'p-lettuce-s1', plantId: 'lettuce', successionIndex: 1, label: 'North bed' },
    ];

    const labels = buildPlantingLabelMap(plantings, sampleCatalog);

    expect(labels.get('p-lettuce')).toBe('North bed');
    expect(labels.get('p-lettuce-s1')).toBe('North bed - S2');
  });
});
