// src/stores/catalogStore.ts
// Zustand persist store for user-authored custom plants + Permapeople enrichment cache.
// Curated catalog is loaded fresh from src/assets/catalog.ts on every boot (matches Phase 1
// samplePlan.ts pattern). Only customPlants + permapeopleCache persist.
// Source: [CITED: 02-RESEARCH.md §Pattern 7 lines 996-1040]
//         [CITED: 02-PATTERNS.md src/stores/catalogStore.ts (NEW)]
//         [CITED: 02-RESEARCH.md §Pitfall H — Permapeople cache size cap]
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Plant } from '../domain/types';
import { curatedCatalog } from '../assets/catalog';

const PERMAPEOPLE_CACHE_CAP = 50; // Pitfall H

interface CatalogState {
  customPlants: Plant[];
  permapeopleCache: Record<string, Plant['enrichment']>;
  upsertCustomPlant: (p: Plant) => void;
  removeCustomPlant: (id: string) => void;
  cacheEnrichment: (plantId: string, fields: Plant['enrichment']) => void;
}

const SCHEMA_VERSION = 1;

const migrations: Record<number, (state: unknown) => unknown> = {};

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set) => ({
      customPlants: [],
      permapeopleCache: {},
      upsertCustomPlant: (p) =>
        set((s) => ({
          customPlants: [...s.customPlants.filter((x) => x.id !== p.id), p],
        })),
      removeCustomPlant: (id) =>
        set((s) => ({
          customPlants: s.customPlants.filter((p) => p.id !== id),
        })),
      cacheEnrichment: (plantId, fields) =>
        set((s) => {
          // Re-insert key at end to preserve insertion-order LRU semantics
          const next = { ...s.permapeopleCache };
          delete next[plantId];
          next[plantId] = fields;
          const entries = Object.entries(next);
          if (entries.length > PERMAPEOPLE_CACHE_CAP) {
            const trimmed = entries.slice(entries.length - PERMAPEOPLE_CACHE_CAP);
            return { permapeopleCache: Object.fromEntries(trimmed) };
          }
          return { permapeopleCache: next };
        }),
    }),
    {
      name: 'garden-gantt:catalog',
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, fromVersion) => {
        let s = persisted;
        for (let v = fromVersion + 1; v <= SCHEMA_VERSION; v++) {
          const m = migrations[v];
          if (m) s = m(s);
        }
        return s as CatalogState;
      },
    },
  ),
);

/**
 * Merge selector: custom plants override curated entries by id.
 * Returns ReadonlyMap<id, Plant> for catalog browser + filter consumers.
 *
 * Memoization invariant: useSyncExternalStore (Zustand's underlying React 19
 * subscription) requires getSnapshot to return a referentially-stable value
 * when state has not changed; otherwise React loops with "Maximum update depth
 * exceeded". The result is keyed by the customPlants array reference (which
 * Zustand replaces only on writes), so the merged Map is rebuilt only when
 * customPlants identity changes.
 *
 * Source: [Rule 1 fix discovered while writing tests/features/catalog/CatalogBrowser.test.tsx
 *          in Plan 02-12 — React 19 strictly enforces getSnapshot cache.]
 */
let cachedCustomPlantsRef: Plant[] | null = null;
let cachedMerged: ReadonlyMap<string, Plant> | null = null;
export function selectMerged(s: CatalogState): ReadonlyMap<string, Plant> {
  if (cachedMerged !== null && cachedCustomPlantsRef === s.customPlants) {
    return cachedMerged;
  }
  const map = new Map<string, Plant>();
  for (const p of curatedCatalog) map.set(p.id, p);
  for (const p of s.customPlants) map.set(p.id, p);
  cachedCustomPlantsRef = s.customPlants;
  cachedMerged = map;
  return map;
}
