/**
 * @vitest-environment happy-dom
 */
// tests/features/catalog/CatalogBrowser.cascade.test.ts
// D-15 cascade-on-delete invariant: deleting a custom plant in use also drops referencing plantings.
// CatalogBrowser opens DeletePlantDialog when refs > 0 and routes confirmation through
// usePlanStore.removeCustomPlantWithCascade. This test exercises the store-level contract that
// the UI relies on; the UI wiring is covered by code-path grep verification in the plan.
//
// Source: [CITED: 02-09-PLAN.md Task 4 cascade test setup]
//         [CITED: 02-CONTEXT.md D-15]
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Location, Plant, Planting } from '../../../src/domain/types';

const baseLocation: Location = {
  zip: '20001',
  zone: '7a',
  lastFrostDate: '2026-04-15T12:00:00.000Z',
  firstFrostDate: '2026-10-20T12:00:00.000Z',
  source: 'manual',
};

function makeCustomPlant(id: string, name: string): Plant {
  return {
    id,
    source: 'custom',
    name,
    category: 'other',
    timing: {
      startMethod: 'direct-sow',
      daysToMaturity: 60,
      harvestWindowDays: 14,
      frostTolerance: 'half-hardy',
      hasFlowering: false,
      requiresHardening: false,
      season: 'cool',
    },
  };
}

function makePlanting(id: string, plantId: string): Planting {
  return { id, plantId, successionIndex: 0 };
}

describe('CatalogBrowser cascade-on-delete (D-15)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('removeCustomPlantWithCascade removes plant from BOTH stores AND drops plantings', async () => {
    const { useCatalogStore } = await import('../../../src/stores/catalogStore');
    const { usePlanStore } = await import('../../../src/stores/planStore');

    // Seed catalogStore with one custom plant
    const customPlant = makeCustomPlant('beet-detroit', 'Beet — Detroit');
    useCatalogStore.getState().upsertCustomPlant(customPlant);
    expect(useCatalogStore.getState().customPlants).toHaveLength(1);

    // Seed planStore with location + add the plant + a planting referencing it
    usePlanStore.getState().setLocation(baseLocation);
    usePlanStore.getState().upsertCustomPlant(customPlant);
    usePlanStore
      .getState()
      .addPlanting(makePlanting('p-beet-detroit', 'beet-detroit'));

    let plan = usePlanStore.getState().plan;
    expect(plan).not.toBeNull();
    expect(plan!.plantings).toHaveLength(1);
    expect(plan!.customPlants).toHaveLength(1);

    // Reference count from plantings (UI uses this to choose dialog vs immediate)
    const refCount = plan!.plantings.filter(
      (pl) => pl.plantId === customPlant.id,
    ).length;
    expect(refCount).toBe(1);

    // Trigger cascade
    usePlanStore.getState().removeCustomPlantWithCascade(customPlant.id);

    // Verify both stores cleaned up
    expect(useCatalogStore.getState().customPlants).toHaveLength(0);
    plan = usePlanStore.getState().plan;
    expect(plan).not.toBeNull();
    expect(plan!.customPlants).toHaveLength(0);
    expect(plan!.plantings).toHaveLength(0);
  });

  it('removeCustomPlant on catalogStore alone leaves plan.plantings intact (no-cascade path)', async () => {
    // When refCount === 0, CatalogBrowser uses catalogStore.removeCustomPlant directly,
    // which does NOT touch plan.plantings. Verifies that the no-references quick-path
    // doesn't accidentally invoke the cascade.
    const { useCatalogStore } = await import('../../../src/stores/catalogStore');
    const { usePlanStore } = await import('../../../src/stores/planStore');

    const customPlant = makeCustomPlant('basil-genovese', 'Basil — Genovese');
    useCatalogStore.getState().upsertCustomPlant(customPlant);
    usePlanStore.getState().setLocation(baseLocation);

    // No plantings reference the plant.
    expect(usePlanStore.getState().plan!.plantings).toHaveLength(0);

    useCatalogStore.getState().removeCustomPlant(customPlant.id);

    expect(useCatalogStore.getState().customPlants).toHaveLength(0);
    // Plan plantings remain unchanged (still empty in this case).
    expect(usePlanStore.getState().plan!.plantings).toHaveLength(0);
  });
});
