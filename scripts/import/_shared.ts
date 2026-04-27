// scripts/import/_shared.ts
// Shared utilities for extension-publication parsers. Pure (no I/O), so each
// per-publication parser is just a text/table → Plant[] mapper.
//
// The parsers themselves are responsible for:
//   1. Reading the PDF text via pdfjs-dist (or HTML via fetch in build)
//   2. Locating the relevant table(s)
//   3. Calling helpers from this file to normalize columns into PlantTiming

import type {
  Plant,
  PlantCategory,
  PlantTiming,
  PlantProvenance,
} from '../../src/domain/types';

/** Convert "weeks before last frost" + "transplant when X" into the engine's
 * shape. Negative `transplantOffsetDaysFromLastFrost` means before last frost. */
export function timingFromIndoorStart(input: {
  weeksIndoor: number;
  transplantOffsetDays: number;
  daysToGermination: [number, number];
  daysToHardenOff?: number;
  daysToMaturity: number;
  harvestWindowDays: number;
  successionIntervalDays?: number;
  maxSuccessions?: number;
  frostTolerance: PlantTiming['frostTolerance'];
  hasFlowering: boolean;
  requiresHardening: boolean;
  season: PlantTiming['season'];
}): PlantTiming {
  const t: PlantTiming = {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: input.weeksIndoor,
    transplantOffsetDaysFromLastFrost: input.transplantOffsetDays,
    daysToGermination: input.daysToGermination,
    daysToMaturity: input.daysToMaturity,
    harvestWindowDays: input.harvestWindowDays,
    frostTolerance: input.frostTolerance,
    hasFlowering: input.hasFlowering,
    requiresHardening: input.requiresHardening,
    season: input.season,
  };
  if (input.daysToHardenOff !== undefined) t.daysToHardenOff = input.daysToHardenOff;
  if (input.successionIntervalDays !== undefined) {
    t.successionIntervalDays = input.successionIntervalDays;
  }
  if (input.maxSuccessions !== undefined) t.maxSuccessions = input.maxSuccessions;
  return t;
}

export function timingFromDirectSow(input: {
  directSowOffsetDays: number;
  daysToGermination: [number, number];
  daysToMaturity: number;
  harvestWindowDays: number;
  successionIntervalDays?: number;
  maxSuccessions?: number;
  frostTolerance: PlantTiming['frostTolerance'];
  hasFlowering: boolean;
  requiresHardening: boolean;
  season: PlantTiming['season'];
}): PlantTiming {
  const t: PlantTiming = {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: input.directSowOffsetDays,
    daysToGermination: input.daysToGermination,
    daysToMaturity: input.daysToMaturity,
    harvestWindowDays: input.harvestWindowDays,
    frostTolerance: input.frostTolerance,
    hasFlowering: input.hasFlowering,
    requiresHardening: input.requiresHardening,
    season: input.season,
  };
  if (input.successionIntervalDays !== undefined) {
    t.successionIntervalDays = input.successionIntervalDays;
  }
  if (input.maxSuccessions !== undefined) t.maxSuccessions = input.maxSuccessions;
  return t;
}

/** Generate a stable kebab-case id from a common name, optionally with a varietal.
 *  e.g. ("Tomato", "Cherokee Purple") → "tomato-cherokee-purple". */
export function makePlantId(commonName: string, varietal?: string): string {
  const raw = varietal ? `${commonName} ${varietal}` : commonName;
  return raw
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Format display name as "Common — Varietal" (matches curated convention). */
export function makePlantName(commonName: string, varietal?: string): string {
  return varietal ? `${commonName} — ${varietal}` : commonName;
}

/** Build a curated Plant with required provenance.
 *  Throws if `provenance.verified === false` AND the caller didn't pass a
 *  reason — we want every shipped entry to be either truly verified OR
 *  explicitly flagged with why it's pending. */
export function buildCuratedPlant(input: {
  commonName: string;
  varietal?: string;
  scientificName?: string;
  category: PlantCategory;
  timing: PlantTiming;
  provenance: PlantProvenance;
}): Plant {
  if (!input.provenance.verified && !input.provenance.note) {
    throw new Error(
      `[buildCuratedPlant] entry "${input.commonName}${input.varietal ? ` — ${input.varietal}` : ''}" has verified=false but no provenance.note explaining why`,
    );
  }
  const plant: Plant = {
    id: makePlantId(input.commonName, input.varietal),
    source: 'curated',
    name: makePlantName(input.commonName, input.varietal),
    category: input.category,
    timing: input.timing,
    provenance: input.provenance,
  };
  if (input.scientificName) plant.scientificName = input.scientificName;
  return plant;
}

/** Heuristic: weeks before last frost → days, with a sensible default
 *  for "transplant when soil reaches 50°F" type rules. Use ONLY when the
 *  source publication is ambiguous; prefer explicit values from the table. */
export function weeksToTransplantOffset(weeks: number): number {
  return Math.round(weeks * 7);
}

/** Convert a date pair like ("Apr 15", "May 5") relative to a reference last
 *  frost date into a transplant offset in days. Reference frost: assumed in
 *  the same calendar year; sign convention matches the engine. */
export function dateRangeToOffset(
  midpointMmDd: string, // "MM-DD" or "Apr 15"
  lastFrostMmDd: string, // baseline e.g. "04-15"
): number {
  const parse = (s: string): { m: number; d: number } => {
    const m1 = s.match(/^(\d{1,2})-(\d{1,2})$/);
    if (m1?.[1] && m1?.[2]) return { m: parseInt(m1[1], 10), d: parseInt(m1[2], 10) };
    const months = [
      'jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec',
    ];
    const m2 = s.toLowerCase().match(/^([a-z]{3})\.?\s+(\d{1,2})/);
    if (m2?.[1] && m2?.[2]) {
      const idx = months.indexOf(m2[1]);
      if (idx >= 0) return { m: idx + 1, d: parseInt(m2[2], 10) };
    }
    throw new Error(`Cannot parse date "${s}"`);
  };
  const target = parse(midpointMmDd);
  const ref = parse(lastFrostMmDd);
  const yr = 2026; // arbitrary non-leap year
  const tDate = new Date(Date.UTC(yr, target.m - 1, target.d));
  const rDate = new Date(Date.UTC(yr, ref.m - 1, ref.d));
  return Math.round((tDate.getTime() - rDate.getTime()) / (24 * 60 * 60 * 1000));
}
