// src/assets/catalog.unverified.ts
//
// ⚠️  QUARANTINED — DO NOT IMPORT FROM APPLICATION CODE  ⚠️
//
// This file held ~50 hand-authored variety entries that an AI assistant
// transcribed from extension publications WITHOUT per-entry human verification.
// Project policy is that we don't ship un-verified timing data to users.
//
// The file is retained ONLY for cherry-picking after each entry is verified
// against the cited source. Once an entry is verified by the extension-PDF
// import pipeline (scripts/import/), copy it into the live catalog.ts with
// proper provenance metadata and DELETE the corresponding entry here.
//
// The CI lint/test gate should treat any import of this file from src/ or
// tests/ as a build failure. (TODO: enforce via an ESLint rule once we have
// one for the project.)
//
// — original header below —
//
// Phase 1 fixture catalog. Plan 05 snapshot tests pin the engine output for these 4 plants.
// Per .planning/phases/01-foundation-schedule-engine/01-CONTEXT.md D-16, RESEARCH.md §Open Questions Q3+Q4.
//
// Phase 2: extended to ≥50 hand-authored variety-level entries (D-07, D-08, D-09).
// Sources: Old Farmer's Almanac, Cornell University Extension publications,
// Utah State University Extension. Each entry's `daysToMaturity` and
// `weeksIndoorBeforeLastFrost` reflect typical seed-packet conventions.
//
// Purity: only `import type` from ../domain/types — no React, no I/O, no runtime imports.
// Do not adjust timing values without updating Plan 05's expected snapshots.
//
// === Phase 1 species-level entries (LOCKED — Pitfall G) ===
// tomato, lettuce, broccoli, garlic ids and timing values pin scheduler.snapshot.test.ts.
// Phase 2 adds NEW variety-level entries alongside; species-level remains untouched.

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
    season: 'warm', // Phase 2 D-09 — used by catalog filter chips
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
    season: 'cool', // Phase 2 D-09 — used by catalog filter chips
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
    season: 'cool', // Phase 2 D-09 — used by catalog filter chips
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
    season: 'cool', // Phase 2 D-09 — used by catalog filter chips
  },
};

// === Phase 2 variety-level additions (D-07) ===
// Sources: Old Farmer's Almanac, Cornell University Extension publications,
// Utah State University Extension. Each entry's `daysToMaturity` and
// `weeksIndoorBeforeLastFrost` reflect typical seed-packet conventions.
// Phase 1 species-level entries (tomato, lettuce, broccoli, garlic) above are LOCKED
// — their ids and timing pin the engine snapshot suite (Pitfall G).

// --- Fruiting vegetables (warm) ---

const tomatoCherokeePurple: Plant = {
  id: 'tomato-cherokee-purple',
  source: 'curated',
  name: 'Tomato — Cherokee Purple',
  scientificName: 'Solanum lycopersicum',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 6,
    transplantOffsetDaysFromLastFrost: 14,
    daysToGermination: [5, 10],
    daysToHardenOff: 7,
    daysToMaturity: 80,
    harvestWindowDays: 60,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: true,
    season: 'warm',
  },
};

const tomatoRoma: Plant = {
  id: 'tomato-roma',
  source: 'curated',
  name: 'Tomato — Roma',
  scientificName: 'Solanum lycopersicum',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 6,
    transplantOffsetDaysFromLastFrost: 14,
    daysToGermination: [5, 10],
    daysToHardenOff: 7,
    daysToMaturity: 76,
    harvestWindowDays: 45,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: true,
    season: 'warm',
  },
};

const tomatoSungold: Plant = {
  id: 'tomato-sungold',
  source: 'curated',
  name: 'Tomato — Sungold',
  scientificName: 'Solanum lycopersicum',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 6,
    transplantOffsetDaysFromLastFrost: 14,
    daysToGermination: [5, 10],
    daysToHardenOff: 7,
    daysToMaturity: 65,
    harvestWindowDays: 60,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: true,
    season: 'warm',
  },
};

const pepperCaliforniaWonder: Plant = {
  id: 'pepper-california-wonder',
  source: 'curated',
  name: 'Pepper — California Wonder',
  scientificName: 'Capsicum annuum',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 8,
    transplantOffsetDaysFromLastFrost: 21, // peppers tender — wait 3 weeks past last frost
    daysToGermination: [10, 21],
    daysToHardenOff: 10,
    daysToMaturity: 75,
    harvestWindowDays: 60,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: true,
    season: 'warm',
  },
};

const pepperJalapeno: Plant = {
  id: 'pepper-jalapeno',
  source: 'curated',
  name: 'Pepper — Jalapeño',
  scientificName: 'Capsicum annuum',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 8,
    transplantOffsetDaysFromLastFrost: 21,
    daysToGermination: [10, 21],
    daysToHardenOff: 10,
    daysToMaturity: 70,
    harvestWindowDays: 60,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: true,
    season: 'warm',
  },
};

const eggplantBlackBeauty: Plant = {
  id: 'eggplant-black-beauty',
  source: 'curated',
  name: 'Eggplant — Black Beauty',
  scientificName: 'Solanum melongena',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 8,
    transplantOffsetDaysFromLastFrost: 21,
    daysToGermination: [7, 14],
    daysToHardenOff: 10,
    daysToMaturity: 80,
    harvestWindowDays: 50,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: true,
    season: 'warm',
  },
};

const cucumberMarketmore: Plant = {
  id: 'cucumber-marketmore',
  source: 'curated',
  name: 'Cucumber — Marketmore',
  scientificName: 'Cucumis sativus',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: 7, // 1 week after last frost
    daysToGermination: [3, 10],
    daysToMaturity: 58,
    harvestWindowDays: 45,
    successionIntervalDays: 21,
    maxSuccessions: 2,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: false,
    season: 'warm',
  },
};

const summerSquashYellowCrookneck: Plant = {
  id: 'summer-squash-yellow-crookneck',
  source: 'curated',
  name: 'Summer Squash — Yellow Crookneck',
  scientificName: 'Cucurbita pepo',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: 7,
    daysToGermination: [5, 10],
    daysToMaturity: 50,
    harvestWindowDays: 60,
    successionIntervalDays: 21,
    maxSuccessions: 2,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: false,
    season: 'warm',
  },
};

const watermelonSugarBaby: Plant = {
  id: 'watermelon-sugar-baby',
  source: 'curated',
  name: 'Watermelon — Sugar Baby',
  scientificName: 'Citrullus lanatus',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 4,
    transplantOffsetDaysFromLastFrost: 14,
    daysToGermination: [5, 10],
    daysToHardenOff: 7,
    daysToMaturity: 80,
    harvestWindowDays: 30,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: true,
    season: 'warm',
  },
};

// --- Leafy greens (cool) ---

const lettuceBlackSeededSimpson: Plant = {
  id: 'lettuce-black-seeded-simpson',
  source: 'curated',
  name: 'Lettuce — Black Seeded Simpson',
  scientificName: 'Lactuca sativa',
  category: 'leafy-green',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -28,
    daysToGermination: [7, 14],
    daysToMaturity: 45,
    harvestWindowDays: 30,
    successionIntervalDays: 14,
    maxSuccessions: 4,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

const lettuceButtercrunch: Plant = {
  id: 'lettuce-buttercrunch',
  source: 'curated',
  name: 'Lettuce — Buttercrunch',
  scientificName: 'Lactuca sativa',
  category: 'leafy-green',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -28,
    daysToGermination: [7, 14],
    daysToMaturity: 55,
    harvestWindowDays: 30,
    successionIntervalDays: 14,
    maxSuccessions: 4,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

const lettuceRomaine: Plant = {
  id: 'lettuce-romaine',
  source: 'curated',
  name: 'Lettuce — Romaine',
  scientificName: 'Lactuca sativa',
  category: 'leafy-green',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -28,
    daysToGermination: [7, 14],
    daysToMaturity: 70,
    harvestWindowDays: 21,
    successionIntervalDays: 14,
    maxSuccessions: 4,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

const spinachBloomsdale: Plant = {
  id: 'spinach-bloomsdale',
  source: 'curated',
  name: 'Spinach — Bloomsdale',
  scientificName: 'Spinacia oleracea',
  category: 'leafy-green',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -42, // 6 weeks before last frost (very cold-hardy)
    daysToGermination: [7, 14],
    daysToMaturity: 45,
    harvestWindowDays: 30,
    successionIntervalDays: 14,
    maxSuccessions: 4,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

const kaleLacinato: Plant = {
  id: 'kale-lacinato',
  source: 'curated',
  name: 'Kale — Lacinato',
  scientificName: 'Brassica oleracea var. palmifolia',
  category: 'brassica',
  timing: {
    startMethod: 'either',
    weeksIndoorBeforeLastFrost: 6,
    transplantOffsetDaysFromLastFrost: -14,
    directSowOffsetDaysFromLastFrost: -14,
    daysToGermination: [5, 10],
    daysToHardenOff: 7,
    daysToMaturity: 60,
    harvestWindowDays: 90,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
};

const kaleRedRussian: Plant = {
  id: 'kale-red-russian',
  source: 'curated',
  name: 'Kale — Red Russian',
  scientificName: 'Brassica napus',
  category: 'brassica',
  timing: {
    startMethod: 'either',
    weeksIndoorBeforeLastFrost: 6,
    transplantOffsetDaysFromLastFrost: -14,
    directSowOffsetDaysFromLastFrost: -14,
    daysToGermination: [5, 10],
    daysToHardenOff: 7,
    daysToMaturity: 55,
    harvestWindowDays: 90,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
};

const arugula: Plant = {
  id: 'arugula',
  source: 'curated',
  name: 'Arugula',
  scientificName: 'Eruca vesicaria',
  category: 'leafy-green',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -28,
    daysToGermination: [5, 10],
    daysToMaturity: 40,
    harvestWindowDays: 21,
    successionIntervalDays: 10,
    maxSuccessions: 6,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

const swissChardBrightLights: Plant = {
  id: 'swiss-chard-bright-lights',
  source: 'curated',
  name: 'Swiss Chard — Bright Lights',
  scientificName: 'Beta vulgaris subsp. cicla',
  category: 'leafy-green',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -14,
    daysToGermination: [7, 14],
    daysToMaturity: 55,
    harvestWindowDays: 90,
    frostTolerance: 'half-hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

// --- Brassicas (cool) ---

const broccoliCalabrese: Plant = {
  id: 'broccoli-calabrese',
  source: 'curated',
  name: 'Broccoli — Calabrese',
  scientificName: 'Brassica oleracea var. italica',
  category: 'brassica',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 5,
    transplantOffsetDaysFromLastFrost: -14,
    daysToGermination: [4, 10],
    daysToHardenOff: 7,
    daysToMaturity: 65,
    harvestWindowDays: 21,
    frostTolerance: 'half-hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
};

const broccoliWaltham29: Plant = {
  id: 'broccoli-waltham-29',
  source: 'curated',
  name: 'Broccoli — Waltham 29',
  scientificName: 'Brassica oleracea var. italica',
  category: 'brassica',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 5,
    transplantOffsetDaysFromLastFrost: -14,
    daysToGermination: [4, 10],
    daysToHardenOff: 7,
    daysToMaturity: 74,
    harvestWindowDays: 21,
    frostTolerance: 'half-hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
};

const cauliflowerSnowball: Plant = {
  id: 'cauliflower-snowball',
  source: 'curated',
  name: 'Cauliflower — Snowball',
  scientificName: 'Brassica oleracea var. botrytis',
  category: 'brassica',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 5,
    transplantOffsetDaysFromLastFrost: -14,
    daysToGermination: [5, 10],
    daysToHardenOff: 7,
    daysToMaturity: 70,
    harvestWindowDays: 14,
    frostTolerance: 'half-hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
};

const brusselsSproutsLongIsland: Plant = {
  id: 'brussels-sprouts-long-island',
  source: 'curated',
  name: 'Brussels Sprouts — Long Island',
  scientificName: 'Brassica oleracea var. gemmifera',
  category: 'brassica',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 6,
    transplantOffsetDaysFromLastFrost: -14,
    daysToGermination: [5, 10],
    daysToHardenOff: 7,
    daysToMaturity: 100,
    harvestWindowDays: 30,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
};

const cabbageEarlyJerseyWakefield: Plant = {
  id: 'cabbage-early-jersey-wakefield',
  source: 'curated',
  name: 'Cabbage — Early Jersey Wakefield',
  scientificName: 'Brassica oleracea var. capitata',
  category: 'brassica',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 6,
    transplantOffsetDaysFromLastFrost: -21, // very cold-hardy
    daysToGermination: [5, 10],
    daysToHardenOff: 7,
    daysToMaturity: 63,
    harvestWindowDays: 21,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
};

const kohlrabi: Plant = {
  id: 'kohlrabi',
  source: 'curated',
  name: 'Kohlrabi',
  scientificName: 'Brassica oleracea var. gongylodes',
  category: 'brassica',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -28,
    daysToGermination: [5, 10],
    daysToMaturity: 55,
    harvestWindowDays: 14,
    successionIntervalDays: 21,
    maxSuccessions: 3,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

// --- Roots (cool) ---

const carrotNantes: Plant = {
  id: 'carrot-nantes',
  source: 'curated',
  name: 'Carrot — Nantes',
  scientificName: 'Daucus carota',
  category: 'root',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -14,
    daysToGermination: [10, 21],
    daysToMaturity: 65,
    harvestWindowDays: 30,
    successionIntervalDays: 21,
    maxSuccessions: 4,
    frostTolerance: 'half-hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

const carrotDanvers: Plant = {
  id: 'carrot-danvers',
  source: 'curated',
  name: 'Carrot — Danvers',
  scientificName: 'Daucus carota',
  category: 'root',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -14,
    daysToGermination: [10, 21],
    daysToMaturity: 75,
    harvestWindowDays: 30,
    successionIntervalDays: 21,
    maxSuccessions: 4,
    frostTolerance: 'half-hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

const beetDetroitDarkRed: Plant = {
  id: 'beet-detroit-dark-red',
  source: 'curated',
  name: 'Beet — Detroit Dark Red',
  scientificName: 'Beta vulgaris',
  category: 'root',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -28,
    daysToGermination: [5, 14],
    daysToMaturity: 60,
    harvestWindowDays: 21,
    successionIntervalDays: 21,
    maxSuccessions: 4,
    frostTolerance: 'half-hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

const radishCherryBelle: Plant = {
  id: 'radish-cherry-belle',
  source: 'curated',
  name: 'Radish — Cherry Belle',
  scientificName: 'Raphanus sativus',
  category: 'root',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -28,
    daysToGermination: [3, 10],
    daysToMaturity: 25,
    harvestWindowDays: 14,
    successionIntervalDays: 7,
    maxSuccessions: 8,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

const turnipPurpleTop: Plant = {
  id: 'turnip-purple-top',
  source: 'curated',
  name: 'Turnip — Purple Top',
  scientificName: 'Brassica rapa',
  category: 'root',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -14,
    daysToGermination: [5, 14],
    daysToMaturity: 55,
    harvestWindowDays: 21,
    successionIntervalDays: 21,
    maxSuccessions: 3,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

const parsnipHollowCrown: Plant = {
  id: 'parsnip-hollow-crown',
  source: 'curated',
  name: 'Parsnip — Hollow Crown',
  scientificName: 'Pastinaca sativa',
  category: 'root',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -14,
    daysToGermination: [14, 28],
    daysToMaturity: 120,
    harvestWindowDays: 60,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

// --- Alliums (cool) ---

const onionYellowSweetSpanish: Plant = {
  id: 'onion-yellow-sweet-spanish',
  source: 'curated',
  name: 'Onion — Yellow Sweet Spanish',
  scientificName: 'Allium cepa',
  category: 'allium',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 10,
    transplantOffsetDaysFromLastFrost: -28,
    daysToGermination: [7, 14],
    daysToHardenOff: 7,
    daysToMaturity: 110,
    harvestWindowDays: 30,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
};

const leekAmericanFlag: Plant = {
  id: 'leek-american-flag',
  source: 'curated',
  name: 'Leek — American Flag',
  scientificName: 'Allium ampeloprasum',
  category: 'allium',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 10,
    transplantOffsetDaysFromLastFrost: -14,
    daysToGermination: [7, 14],
    daysToHardenOff: 7,
    daysToMaturity: 130,
    harvestWindowDays: 60,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
};

const scallionEvergreen: Plant = {
  id: 'scallion-evergreen',
  source: 'curated',
  name: 'Scallion — Evergreen',
  scientificName: 'Allium fistulosum',
  category: 'allium',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -28,
    daysToGermination: [7, 14],
    daysToMaturity: 60,
    harvestWindowDays: 30,
    successionIntervalDays: 21,
    maxSuccessions: 3,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

const shallot: Plant = {
  id: 'shallot',
  source: 'curated',
  name: 'Shallot',
  scientificName: 'Allium cepa var. aggregatum',
  category: 'allium',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -28,
    daysToGermination: [7, 14],
    daysToMaturity: 100,
    harvestWindowDays: 30,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

// --- Legumes ---

const bushBeanProvider: Plant = {
  id: 'bush-bean-provider',
  source: 'curated',
  name: 'Bush Bean — Provider',
  scientificName: 'Phaseolus vulgaris',
  category: 'legume',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: 7,
    daysToGermination: [7, 14],
    daysToMaturity: 50,
    harvestWindowDays: 30,
    successionIntervalDays: 14,
    maxSuccessions: 4,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: false,
    season: 'warm',
  },
};

const poleBeanKentuckyWonder: Plant = {
  id: 'pole-bean-kentucky-wonder',
  source: 'curated',
  name: 'Pole Bean — Kentucky Wonder',
  scientificName: 'Phaseolus vulgaris',
  category: 'legume',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: 7,
    daysToGermination: [7, 14],
    daysToMaturity: 65,
    harvestWindowDays: 60,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: false,
    season: 'warm',
  },
};

const snapPeaSugarSnap: Plant = {
  id: 'snap-pea-sugar-snap',
  source: 'curated',
  name: 'Snap Pea — Sugar Snap',
  scientificName: 'Pisum sativum',
  category: 'legume',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -42, // peas tolerate freezing soil
    daysToGermination: [7, 14],
    daysToMaturity: 60,
    harvestWindowDays: 21,
    frostTolerance: 'hardy',
    hasFlowering: true,
    requiresHardening: false,
    season: 'cool',
  },
};

const shellingPeaGreenArrow: Plant = {
  id: 'shelling-pea-green-arrow',
  source: 'curated',
  name: 'Shelling Pea — Green Arrow',
  scientificName: 'Pisum sativum',
  category: 'legume',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -42,
    daysToGermination: [7, 14],
    daysToMaturity: 68,
    harvestWindowDays: 21,
    frostTolerance: 'hardy',
    hasFlowering: true,
    requiresHardening: false,
    season: 'cool',
  },
};

// --- Cucurbits (extra) ---

const winterSquashButternut: Plant = {
  id: 'winter-squash-butternut',
  source: 'curated',
  name: 'Winter Squash — Butternut',
  scientificName: 'Cucurbita moschata',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: 14,
    daysToGermination: [7, 14],
    daysToMaturity: 110,
    harvestWindowDays: 30,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: false,
    season: 'warm',
  },
};

const pumpkinSugarPie: Plant = {
  id: 'pumpkin-sugar-pie',
  source: 'curated',
  name: 'Pumpkin — Sugar Pie',
  scientificName: 'Cucurbita pepo',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: 14,
    daysToGermination: [7, 14],
    daysToMaturity: 100,
    harvestWindowDays: 30,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: false,
    season: 'warm',
  },
};

const cantaloupeHalesBest: Plant = {
  id: 'cantaloupe-hales-best',
  source: 'curated',
  name: "Cantaloupe — Hale's Best",
  scientificName: 'Cucumis melo',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 4,
    transplantOffsetDaysFromLastFrost: 14,
    daysToGermination: [5, 10],
    daysToHardenOff: 7,
    daysToMaturity: 86,
    harvestWindowDays: 30,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: true,
    season: 'warm',
  },
};

// --- Herbs ---

const basilGenovese: Plant = {
  id: 'basil-genovese',
  source: 'curated',
  name: 'Basil — Genovese',
  scientificName: 'Ocimum basilicum',
  category: 'herb',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 6,
    transplantOffsetDaysFromLastFrost: 14,
    daysToGermination: [5, 10],
    daysToHardenOff: 7,
    daysToMaturity: 60,
    harvestWindowDays: 90,
    frostTolerance: 'tender',
    hasFlowering: false, // pinch flowers to extend harvest — not a fertilize event
    requiresHardening: true,
    season: 'warm',
  },
};

const cilantro: Plant = {
  id: 'cilantro',
  source: 'curated',
  name: 'Cilantro',
  scientificName: 'Coriandrum sativum',
  category: 'herb',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -14,
    daysToGermination: [7, 14],
    daysToMaturity: 50,
    harvestWindowDays: 21,
    successionIntervalDays: 14,
    maxSuccessions: 6,
    frostTolerance: 'half-hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
};

const dillBouquet: Plant = {
  id: 'dill-bouquet',
  source: 'curated',
  name: 'Dill — Bouquet',
  scientificName: 'Anethum graveolens',
  category: 'herb',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: 0,
    daysToGermination: [7, 21],
    daysToMaturity: 60,
    harvestWindowDays: 60,
    successionIntervalDays: 21,
    maxSuccessions: 3,
    frostTolerance: 'half-hardy',
    hasFlowering: true, // dill seeds a primary product — flowering matters
    requiresHardening: false,
    season: 'warm',
  },
};

const parsleyItalianFlatLeaf: Plant = {
  id: 'parsley-italian-flat-leaf',
  source: 'curated',
  name: 'Parsley — Italian Flat-Leaf',
  scientificName: 'Petroselinum crispum',
  category: 'herb',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 8,
    transplantOffsetDaysFromLastFrost: -14,
    daysToGermination: [14, 28],
    daysToHardenOff: 7,
    daysToMaturity: 75,
    harvestWindowDays: 120,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
};

const oregano: Plant = {
  id: 'oregano',
  source: 'curated',
  name: 'Oregano',
  scientificName: 'Origanum vulgare',
  category: 'herb',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 8,
    transplantOffsetDaysFromLastFrost: 0,
    daysToGermination: [7, 14],
    daysToHardenOff: 7,
    daysToMaturity: 90,
    harvestWindowDays: 120,
    frostTolerance: 'half-hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
};

const thyme: Plant = {
  id: 'thyme',
  source: 'curated',
  name: 'Thyme',
  scientificName: 'Thymus vulgaris',
  category: 'herb',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 10,
    transplantOffsetDaysFromLastFrost: 0,
    daysToGermination: [14, 28],
    daysToHardenOff: 7,
    daysToMaturity: 90,
    harvestWindowDays: 120,
    frostTolerance: 'half-hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
};

const sage: Plant = {
  id: 'sage',
  source: 'curated',
  name: 'Sage',
  scientificName: 'Salvia officinalis',
  category: 'herb',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 8,
    transplantOffsetDaysFromLastFrost: 0,
    daysToGermination: [10, 21],
    daysToHardenOff: 7,
    daysToMaturity: 75,
    harvestWindowDays: 120,
    frostTolerance: 'half-hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
};

const mint: Plant = {
  id: 'mint',
  source: 'curated',
  name: 'Mint',
  scientificName: 'Mentha spicata',
  category: 'herb',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 8,
    transplantOffsetDaysFromLastFrost: 0,
    daysToGermination: [10, 14],
    daysToHardenOff: 7,
    daysToMaturity: 90,
    harvestWindowDays: 120,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
};

const chives: Plant = {
  id: 'chives',
  source: 'curated',
  name: 'Chives',
  scientificName: 'Allium schoenoprasum',
  category: 'herb',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 8,
    transplantOffsetDaysFromLastFrost: -14,
    daysToGermination: [7, 14],
    daysToHardenOff: 7,
    daysToMaturity: 80,
    harvestWindowDays: 120,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
};

/** All curated plants. Phase 1 species-level entries first (LOCKED). */
// These exports are TEST-ONLY fixtures. The names are intentionally distinct
// from the live catalog.ts exports so a search for `curatedCatalog` doesn't
// accidentally match this quarantined file.
export const unverifiedFixtureCatalog: readonly Plant[] = [
  // Phase 1 species-level (Pitfall G — DO NOT MODIFY)
  tomato,
  lettuce,
  broccoli,
  garlic,
  // Phase 2 fruiting-vegetable variety-level
  tomatoCherokeePurple,
  tomatoRoma,
  tomatoSungold,
  pepperCaliforniaWonder,
  pepperJalapeno,
  eggplantBlackBeauty,
  cucumberMarketmore,
  summerSquashYellowCrookneck,
  watermelonSugarBaby,
  // Phase 2 leafy-green
  lettuceBlackSeededSimpson,
  lettuceButtercrunch,
  lettuceRomaine,
  spinachBloomsdale,
  kaleLacinato,
  kaleRedRussian,
  arugula,
  swissChardBrightLights,
  // Phase 2 brassica
  broccoliCalabrese,
  broccoliWaltham29,
  cauliflowerSnowball,
  brusselsSproutsLongIsland,
  cabbageEarlyJerseyWakefield,
  kohlrabi,
  // Phase 2 root
  carrotNantes,
  carrotDanvers,
  beetDetroitDarkRed,
  radishCherryBelle,
  turnipPurpleTop,
  parsnipHollowCrown,
  // Phase 2 allium
  onionYellowSweetSpanish,
  leekAmericanFlag,
  scallionEvergreen,
  shallot,
  // Phase 2 legume
  bushBeanProvider,
  poleBeanKentuckyWonder,
  snapPeaSugarSnap,
  shellingPeaGreenArrow,
  // Phase 2 cucurbit (extra)
  winterSquashButternut,
  pumpkinSugarPie,
  cantaloupeHalesBest,
  // Phase 2 herb
  basilGenovese,
  cilantro,
  dillBouquet,
  parsleyItalianFlatLeaf,
  oregano,
  thyme,
  sage,
  mint,
  chives,
] as const;

export const unverifiedFixtureSampleCatalog: ReadonlyMap<string, Plant> = new Map<string, Plant>(
  unverifiedFixtureCatalog.map((p) => [p.id, p]),
);
