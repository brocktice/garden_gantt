/**
 * @vitest-environment happy-dom
 */
// tests/stores/catalogStore.test.ts
// Phase 2 Plan 02-04 Task 2: catalogStore persist wiring + selectMerged + LRU cache cap.
// Source: .planning/phases/02-data-layer-first-end-to-end/02-04-PLAN.md (Task 2)
//         02-RESEARCH.md §Pattern 7, §Pitfall H (cache size cap)
//         02-PATTERNS.md src/stores/catalogStore.ts (NEW)
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Plant } from '../../src/domain/types';

const samplePlant = (id: string, overrides: Partial<Plant> = {}): Plant => ({
  id,
  source: 'custom',
  name: id,
  category: 'other',
  timing: {
    startMethod: 'direct-sow',
    daysToMaturity: 60,
    harvestWindowDays: 30,
    frostTolerance: 'half-hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'warm',
  },
  ...overrides,
});

describe('useCatalogStore — persist wiring', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('persist middleware uses canonical key name and version', async () => {
    const { useCatalogStore } = await import('../../src/stores/catalogStore');
    const options = (
      useCatalogStore as unknown as {
        persist: { getOptions: () => { name: string; version: number } };
      }
    ).persist.getOptions();
    expect(options.name).toBe('garden-gantt:catalog');
    expect(options.version).toBe(1);
  });

  it('default state has empty customPlants and permapeopleCache', async () => {
    const { useCatalogStore } = await import('../../src/stores/catalogStore');
    const s = useCatalogStore.getState();
    expect(s.customPlants).toEqual([]);
    expect(s.permapeopleCache).toEqual({});
  });
});

describe('useCatalogStore — CRUD operations', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('upsertCustomPlant adds a new plant', async () => {
    const { useCatalogStore } = await import('../../src/stores/catalogStore');
    const p = samplePlant('custom-1');
    useCatalogStore.getState().upsertCustomPlant(p);
    expect(useCatalogStore.getState().customPlants).toHaveLength(1);
    expect(useCatalogStore.getState().customPlants[0]?.id).toBe('custom-1');
  });

  it('upsertCustomPlant replaces existing plant with same id (no duplicates)', async () => {
    const { useCatalogStore } = await import('../../src/stores/catalogStore');
    const p1 = samplePlant('custom-1', { name: 'first' });
    const p2 = samplePlant('custom-1', { name: 'second' });
    useCatalogStore.getState().upsertCustomPlant(p1);
    useCatalogStore.getState().upsertCustomPlant(p2);
    const customs = useCatalogStore.getState().customPlants;
    expect(customs).toHaveLength(1);
    expect(customs[0]?.name).toBe('second');
  });

  it('removeCustomPlant filters by id', async () => {
    const { useCatalogStore } = await import('../../src/stores/catalogStore');
    useCatalogStore.getState().upsertCustomPlant(samplePlant('a'));
    useCatalogStore.getState().upsertCustomPlant(samplePlant('b'));
    useCatalogStore.getState().removeCustomPlant('a');
    const customs = useCatalogStore.getState().customPlants;
    expect(customs).toHaveLength(1);
    expect(customs[0]?.id).toBe('b');
  });

  it('cacheEnrichment populates permapeopleCache[plantId]', async () => {
    const { useCatalogStore } = await import('../../src/stores/catalogStore');
    useCatalogStore
      .getState()
      .cacheEnrichment('tomato', { description: 'red fruit' });
    expect(useCatalogStore.getState().permapeopleCache['tomato']).toEqual({
      description: 'red fruit',
    });
  });

  it('cacheEnrichment caps at 50 entries (Pitfall H — oldest evicted)', async () => {
    const { useCatalogStore } = await import('../../src/stores/catalogStore');
    // Insert 51 entries
    for (let i = 0; i < 51; i++) {
      useCatalogStore.getState().cacheEnrichment(`plant-${i}`, { idx: i });
    }
    const cache = useCatalogStore.getState().permapeopleCache;
    expect(Object.keys(cache)).toHaveLength(50);
    // Oldest (plant-0) was evicted; plant-50 retained
    expect(cache['plant-0']).toBeUndefined();
    expect(cache['plant-50']).toEqual({ idx: 50 });
  });
});

describe('selectMerged', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('returns curated catalog when no custom plants', async () => {
    const { useCatalogStore, selectMerged } = await import(
      '../../src/stores/catalogStore'
    );
    const { curatedCatalog } = await import('../../src/assets/catalog');
    const merged = selectMerged(useCatalogStore.getState());
    expect(merged.size).toBe(curatedCatalog.length);
    expect(merged.get('tomato')).toBeDefined();
    expect(merged.get('leaf-lettuce')).toBeDefined();
    expect(merged.get('broccoli')).toBeDefined();
    expect(merged.get('garlic')).toBeDefined();
  });

  it('custom plants override curated entries with same id', async () => {
    const { useCatalogStore, selectMerged } = await import(
      '../../src/stores/catalogStore'
    );
    const overrideTomato = samplePlant('tomato', { name: 'My Custom Tomato' });
    useCatalogStore.getState().upsertCustomPlant(overrideTomato);
    const merged = selectMerged(useCatalogStore.getState());
    expect(merged.get('tomato')?.name).toBe('My Custom Tomato');
  });

  it('appends custom plants with new ids to curated entries', async () => {
    const { useCatalogStore, selectMerged } = await import(
      '../../src/stores/catalogStore'
    );
    const { curatedCatalog } = await import('../../src/assets/catalog');
    useCatalogStore.getState().upsertCustomPlant(samplePlant('my-custom-x'));
    const merged = selectMerged(useCatalogStore.getState());
    expect(merged.size).toBe(curatedCatalog.length + 1);
    expect(merged.get('my-custom-x')).toBeDefined();
  });
});

describe('useCatalogStore — corrupt JSON tolerance (DATA-07 inheritance)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('boots with default state when localStorage contains corrupt JSON', async () => {
    window.localStorage.setItem('garden-gantt:catalog', 'not-json');
    const { useCatalogStore } = await import('../../src/stores/catalogStore');
    const s = useCatalogStore.getState();
    expect(s.customPlants).toEqual([]);
    expect(s.permapeopleCache).toEqual({});
  });
});
