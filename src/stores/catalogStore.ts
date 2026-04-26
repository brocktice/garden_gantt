// src/stores/catalogStore.ts
// Phase 2 catalog store: customPlants + permapeopleCache persisted to localStorage.
// MINIMAL CONTRACT STUB shipped from Plan 02-05 worktree so cross-store imports
// from planStore.ts (removeCustomPlantWithCascade) compile in isolation.
// Plan 02-04 ships the full implementation (selectMerged selector, multi-tab wiring,
// permapeopleCache size cap). Merge resolution: 02-04's full file replaces this stub.
//
// Source: [CITED: .planning/phases/02-data-layer-first-end-to-end/02-PATTERNS.md
//          src/stores/catalogStore.ts (NEW) section, lines 392-441]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md §Pattern 7]
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Plant } from '../domain/types';

interface CatalogState {
  customPlants: Plant[];
  permapeopleCache: Record<string, Plant['enrichment']>;
  upsertCustomPlant: (p: Plant) => void;
  removeCustomPlant: (id: string) => void;
  cacheEnrichment: (plantId: string, fields: Plant['enrichment']) => void;
}

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
        set((s) => ({
          permapeopleCache: { ...s.permapeopleCache, [plantId]: fields },
        })),
    }),
    {
      name: 'garden-gantt:catalog',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
