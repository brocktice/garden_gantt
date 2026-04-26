// src/features/catalog/filters.ts
// Pure filter logic for catalog browser. Case-insensitive search + chip grouping.
// Search tolerates em-dash ↔ hyphen interchange (CONTEXT specifics: variety naming
// "Tomato — Cherokee Purple" must be searchable as either em-dash or hyphen).
//
// Source: [CITED: .planning/phases/02-data-layer-first-end-to-end/02-PATTERNS.md
//         src/features/catalog/filters.ts (NEW) — registry + OR-within-group/AND-across pattern]
//         [CITED: 02-UI-SPEC.md §3 default chip behavior]
//
// Purity: zero React/Zustand/I/O. Pure functions over Plant data.

import type { Plant } from '../../domain/types';

export type ChipGroup = 'season' | 'category';

export interface FilterChip {
  id: string;
  label: string;
  group: ChipGroup;
  predicate: (plant: Plant) => boolean;
}

export const chips: readonly FilterChip[] = [
  { id: 'cool-season', label: 'Cool-season', group: 'season', predicate: (p) => p.timing.season === 'cool' },
  { id: 'warm-season', label: 'Warm-season', group: 'season', predicate: (p) => p.timing.season === 'warm' },
  { id: 'leafy', label: 'Leafy', group: 'category', predicate: (p) => p.category === 'leafy-green' },
  { id: 'fruiting', label: 'Fruiting', group: 'category', predicate: (p) => p.category === 'fruiting-vegetable' },
  { id: 'root', label: 'Root', group: 'category', predicate: (p) => p.category === 'root' },
  { id: 'herb', label: 'Herb', group: 'category', predicate: (p) => p.category === 'herb' },
  { id: 'allium', label: 'Allium', group: 'category', predicate: (p) => p.category === 'allium' },
  { id: 'brassica', label: 'Brassica', group: 'category', predicate: (p) => p.category === 'brassica' },
];

/** Replace em-dash / en-dash / hyphen variants with a single canonical form for case-insensitive comparison. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[—–-]/g, '-');
}

/** OR within group, AND across groups (UI-SPEC §3 default). */
function chipMatch(plant: Plant, activeChips: Set<string>): boolean {
  if (activeChips.size === 0) return true;
  const groupActiveChips: Record<ChipGroup, FilterChip[]> = { season: [], category: [] };
  for (const chip of chips) {
    if (activeChips.has(chip.id)) groupActiveChips[chip.group].push(chip);
  }
  for (const group of ['season', 'category'] as ChipGroup[]) {
    const list = groupActiveChips[group];
    if (list.length === 0) continue; // no chips in this group → group passes (AND-trivially-true)
    if (!list.some((c) => c.predicate(plant))) return false; // OR within group
  }
  return true;
}

export function applyFilters(catalog: Plant[], search: string, activeChips: Set<string>): Plant[] {
  const q = normalize(search.trim());
  return catalog
    .filter((p) => {
      if (q && !normalize(p.name).includes(q) && !normalize(p.scientificName ?? '').includes(q)) {
        return false;
      }
      return chipMatch(p, activeChips);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
