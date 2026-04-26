// src/assets/catalog.ts
// Phase 1 fixture catalog. Plan 05 snapshot tests pin the engine output for these 4 plants.
// Per .planning/phases/01-foundation-schedule-engine/01-CONTEXT.md D-16, RESEARCH.md §Open Questions Q3+Q4.
//
// Purity: only `import type` from ../domain/types — no React, no I/O, no runtime imports.
// Do not adjust timing values without updating Plan 05's expected snapshots.

import type { Plant } from '../domain/types';

const tomato: Plant = {
  id: 'tomato',
  source: 'curated',
  name: 'Tomato',
  scientificName: 'Solanum lycopersicum',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 6,
    transplantOffsetDaysFromLastFrost: 14, // 2 weeks AFTER last frost (tender)
    daysToGermination: [5, 10],
    daysToHardenOff: 7,
    daysToMaturity: 75,
    harvestWindowDays: 60,
    frostTolerance: 'tender',
    hasFlowering: true, // tomatoes flower → fertilize-at-flowering applies
    requiresHardening: true,
  },
};

const lettuce: Plant = {
  id: 'lettuce',
  source: 'curated',
  name: 'Lettuce',
  scientificName: 'Lactuca sativa',
  category: 'leafy-green',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -28, // 4 weeks BEFORE last frost (cold-hardy)
    daysToGermination: [7, 14],
    daysToMaturity: 50,
    harvestWindowDays: 30,
    successionIntervalDays: 14,
    maxSuccessions: 4,
    frostTolerance: 'hardy',
    hasFlowering: false, // bolting = end of harvest, not a fertilize event
    requiresHardening: false,
  },
};

const broccoli: Plant = {
  id: 'broccoli',
  source: 'curated',
  name: 'Broccoli',
  scientificName: 'Brassica oleracea var. italica',
  category: 'brassica',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 5,
    transplantOffsetDaysFromLastFrost: -14, // 2 weeks BEFORE last frost (half-hardy)
    daysToGermination: [4, 10],
    daysToHardenOff: 7,
    daysToMaturity: 60,
    harvestWindowDays: 21,
    frostTolerance: 'half-hardy',
    hasFlowering: false, // we harvest the head BEFORE flowering opens
    requiresHardening: true,
  },
};

const garlic: Plant = {
  id: 'garlic',
  source: 'curated',
  name: 'Garlic',
  scientificName: 'Allium sativum',
  category: 'allium',
  timing: {
    startMethod: 'direct-sow',
    // Garlic is fall-planted: ~14 days before FIRST frost (Oct planting).
    // Modeled as a large positive offset from spring last-frost — engine treats this as
    // Oct planting by adding the offset to lastFrost. The 270-day daysToMaturity creates
    // the canonical Oct → Jul next-year rollover when paired with sample plan's lastFrost.
    directSowOffsetDaysFromLastFrost: 183, // ~6 months after spring last-frost = ~Oct 15
    daysToMaturity: 270, // Oct → Jul next year (garlic year-rollover)
    harvestWindowDays: 21,
    frostTolerance: 'hardy',
    hasFlowering: false, // garlic scapes harvested but no fertilize-at-flowering task
    requiresHardening: false,
  },
};

export const sampleCatalog: ReadonlyMap<string, Plant> = new Map<string, Plant>([
  ['tomato', tomato],
  ['lettuce', lettuce],
  ['broccoli', broccoli],
  ['garlic', garlic],
]);
