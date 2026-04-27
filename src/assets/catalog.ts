// src/assets/catalog.ts
// Live curated catalog. Every entry MUST carry provenance metadata. Entries
// with `provenance.verified === false` surface a "pending verification" badge
// in the UI — we don't pretend timing values are authoritative when they
// haven't been cross-checked against a cited extension publication.
//
// === Quarantine — 2026-04-27 ===
// The previous Phase 2 catalog (~50 hand-authored variety entries) was moved
// to `catalog.unverified.ts` and is NO LONGER imported. Those values were
// transcribed by an AI assistant from "Old Farmer's Almanac, Cornell Extension,
// Utah State University Extension" without per-entry verification — i.e., a
// human never confirmed each timing value against the cited source. Shipping
// them as authoritative is a project policy violation.
//
// The 4 entries below (tomato, lettuce, broccoli, garlic) remain because the
// Phase 1 scheduler snapshot tests pin their timing values. They carry
// `verified: false` so the UI is honest. Re-verification is tracked in the
// extension-publication ETL pipeline (scripts/import/) — the import script
// will overwrite these entries with verified replacements as USU / Cornell /
// other land-grant publications are parsed.
//
// Purity: only `import type` from ../domain/types — no React, no I/O, no runtime imports.

import type { Plant } from '../domain/types';

const PHASE_1_FIXTURE_PROVENANCE = {
  verified: false,
  source: 'Phase 1 fixture (pending verification)',
  note: 'Timing values pin scheduler.snapshot.test.ts. Re-verify against an extension publication and bump verified=true.',
} as const;

const tomato: Plant = {
  id: 'tomato',
  source: 'curated',
  name: 'Tomato',
  scientificName: 'Solanum lycopersicum',
  category: 'fruiting-vegetable',
  timing: {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: 6,
    transplantOffsetDaysFromLastFrost: 14,
    daysToGermination: [5, 10],
    daysToHardenOff: 7,
    daysToMaturity: 75,
    harvestWindowDays: 60,
    frostTolerance: 'tender',
    hasFlowering: true,
    requiresHardening: true,
    season: 'warm',
  },
  provenance: PHASE_1_FIXTURE_PROVENANCE,
};

const lettuce: Plant = {
  id: 'lettuce',
  source: 'curated',
  name: 'Lettuce',
  scientificName: 'Lactuca sativa',
  category: 'leafy-green',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: -28,
    daysToGermination: [7, 14],
    daysToMaturity: 50,
    harvestWindowDays: 30,
    successionIntervalDays: 14,
    maxSuccessions: 4,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
  provenance: PHASE_1_FIXTURE_PROVENANCE,
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
    transplantOffsetDaysFromLastFrost: -14,
    daysToGermination: [4, 10],
    daysToHardenOff: 7,
    daysToMaturity: 60,
    harvestWindowDays: 21,
    frostTolerance: 'half-hardy',
    hasFlowering: false,
    requiresHardening: true,
    season: 'cool',
  },
  provenance: PHASE_1_FIXTURE_PROVENANCE,
};

const garlic: Plant = {
  id: 'garlic',
  source: 'curated',
  name: 'Garlic',
  scientificName: 'Allium sativum',
  category: 'allium',
  timing: {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: 183,
    daysToMaturity: 270,
    harvestWindowDays: 21,
    frostTolerance: 'hardy',
    hasFlowering: false,
    requiresHardening: false,
    season: 'cool',
  },
  provenance: PHASE_1_FIXTURE_PROVENANCE,
};

export const curatedCatalog: readonly Plant[] = [
  tomato,
  lettuce,
  broccoli,
  garlic,
] as const;

export const sampleCatalog: ReadonlyMap<string, Plant> = new Map<string, Plant>(
  curatedCatalog.map((p) => [p.id, p]),
);
