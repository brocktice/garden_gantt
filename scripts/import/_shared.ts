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

/** Convert a CROP_DEFAULTS kebab-case key into a canonical Title-Case
 *  display name. e.g. "brussels-sprouts" → "Brussels Sprouts",
 *  "leaf-lettuce" → "Leaf Lettuce". Both parsers use this so different
 *  source labels ("Tomato" vs "Tomatoes") collapse onto the same Plant id. */
export function keyToCommonName(key: string): string {
  // Special-case crops where simple Title-Case is wrong.
  const overrides: Record<string, string> = {
    'nz-spinach': 'New Zealand Spinach',
    'leaf-lettuce': 'Leaf Lettuce',
    'heat-resistant-lettuce': 'Heat-Resistant Lettuce',
    'leafy-greens': 'Leafy Greens',
    'green-onion': 'Green Onion',
    'sweet-corn': 'Sweet Corn',
    'turnip-greens': 'Turnip Greens',
    'chinese-cabbage': 'Chinese Cabbage',
    'brussels-sprouts': 'Brussels Sprouts',
  };
  if (overrides[key]) return overrides[key];
  return key
    .split('-')
    .map((p) => (p.length === 0 ? p : p[0]!.toUpperCase() + p.slice(1)))
    .join(' ');
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

/** Typical-value lookup for fields a publication doesn't directly supply.
 *  Used by parsers (e.g. Cornell's NYC chart, which gives planting windows
 *  but not DTM/germination). Values are extension-cited averages, not
 *  variety-specific. ANY parser using these must emit verified=false and
 *  document the gap in provenance.note so a richer source can later upgrade
 *  the entry to verified=true.
 *
 *  Sources for these defaults:
 *    - UMaine Bulletin 2190 / vegetable growing chart
 *    - USU Vegetable Planting Guide DTM column
 *    - Johnny's Selected Seeds variety median (cross-checked against
 *      multiple extension sources, used only where extensions agree)
 *  Treat any entry missing here as "unsupported by this lookup" — the parser
 *  should skip the crop rather than invent values.
 */
export interface CropDefaults {
  scientificName?: string;
  category: PlantCategory;
  daysToGermination: [number, number];
  daysToMaturity: number;
  harvestWindowDays: number;
  daysToHardenOff?: number;
  weeksIndoorBeforeLastFrost?: number;
  successionIntervalDays?: number;
  maxSuccessions?: number;
  hasFlowering: boolean;
  requiresHardening: boolean;
}

export const CROP_DEFAULTS: Readonly<Record<string, CropDefaults>> = {
  // Fruiting vegetables
  tomato: {
    scientificName: 'Solanum lycopersicum',
    category: 'fruiting-vegetable',
    daysToGermination: [6, 12],
    daysToMaturity: 75,
    harvestWindowDays: 35,
    daysToHardenOff: 7,
    weeksIndoorBeforeLastFrost: 7,
    hasFlowering: true,
    requiresHardening: true,
  },
  tomatillo: {
    scientificName: 'Physalis philadelphica',
    category: 'fruiting-vegetable',
    daysToGermination: [7, 14],
    daysToMaturity: 75,
    harvestWindowDays: 30,
    daysToHardenOff: 7,
    weeksIndoorBeforeLastFrost: 7,
    hasFlowering: true,
    requiresHardening: true,
  },
  pepper: {
    scientificName: 'Capsicum annuum',
    category: 'fruiting-vegetable',
    daysToGermination: [10, 21],
    daysToMaturity: 75,
    harvestWindowDays: 35,
    daysToHardenOff: 7,
    weeksIndoorBeforeLastFrost: 8,
    hasFlowering: true,
    requiresHardening: true,
  },
  eggplant: {
    scientificName: 'Solanum melongena',
    category: 'fruiting-vegetable',
    daysToGermination: [8, 14],
    daysToMaturity: 80,
    harvestWindowDays: 30,
    daysToHardenOff: 7,
    weeksIndoorBeforeLastFrost: 8,
    hasFlowering: true,
    requiresHardening: true,
  },
  cucumber: {
    scientificName: 'Cucumis sativus',
    category: 'fruiting-vegetable',
    daysToGermination: [4, 10],
    daysToMaturity: 60,
    harvestWindowDays: 30,
    daysToHardenOff: 5,
    hasFlowering: true,
    requiresHardening: true,
  },
  squash: {
    scientificName: 'Cucurbita pepo',
    category: 'fruiting-vegetable',
    daysToGermination: [5, 10],
    daysToMaturity: 55,
    harvestWindowDays: 30,
    daysToHardenOff: 5,
    hasFlowering: true,
    requiresHardening: true,
  },
  melon: {
    scientificName: 'Cucumis melo',
    category: 'fruiting-vegetable',
    daysToGermination: [4, 10],
    daysToMaturity: 80,
    harvestWindowDays: 21,
    daysToHardenOff: 7,
    hasFlowering: true,
    requiresHardening: true,
  },
  okra: {
    scientificName: 'Abelmoschus esculentus',
    category: 'fruiting-vegetable',
    daysToGermination: [7, 14],
    daysToMaturity: 60,
    harvestWindowDays: 60,
    hasFlowering: true,
    requiresHardening: false,
  },
  // Legumes
  peas: {
    scientificName: 'Pisum sativum',
    category: 'legume',
    daysToGermination: [7, 14],
    daysToMaturity: 65,
    harvestWindowDays: 14,
    hasFlowering: true,
    requiresHardening: false,
  },
  beans: {
    scientificName: 'Phaseolus vulgaris',
    category: 'legume',
    daysToGermination: [6, 10],
    daysToMaturity: 55,
    harvestWindowDays: 21,
    successionIntervalDays: 14,
    maxSuccessions: 4,
    hasFlowering: true,
    requiresHardening: false,
  },
  // Brassicas
  broccoli: {
    scientificName: 'Brassica oleracea var. italica',
    category: 'brassica',
    daysToGermination: [5, 10],
    daysToMaturity: 65,
    harvestWindowDays: 21,
    daysToHardenOff: 7,
    weeksIndoorBeforeLastFrost: 6,
    hasFlowering: false,
    requiresHardening: true,
  },
  cabbage: {
    scientificName: 'Brassica oleracea var. capitata',
    category: 'brassica',
    daysToGermination: [5, 10],
    daysToMaturity: 70,
    harvestWindowDays: 21,
    daysToHardenOff: 7,
    weeksIndoorBeforeLastFrost: 6,
    hasFlowering: false,
    requiresHardening: true,
  },
  cauliflower: {
    scientificName: 'Brassica oleracea var. botrytis',
    category: 'brassica',
    daysToGermination: [5, 10],
    daysToMaturity: 70,
    harvestWindowDays: 14,
    daysToHardenOff: 7,
    weeksIndoorBeforeLastFrost: 6,
    hasFlowering: false,
    requiresHardening: true,
  },
  'brussels-sprouts': {
    scientificName: 'Brassica oleracea var. gemmifera',
    category: 'brassica',
    daysToGermination: [5, 10],
    daysToMaturity: 100,
    harvestWindowDays: 30,
    daysToHardenOff: 7,
    weeksIndoorBeforeLastFrost: 6,
    hasFlowering: false,
    requiresHardening: true,
  },
  kale: {
    scientificName: 'Brassica oleracea var. sabellica',
    category: 'brassica',
    daysToGermination: [5, 10],
    daysToMaturity: 55,
    harvestWindowDays: 60,
    hasFlowering: false,
    requiresHardening: false,
  },
  collards: {
    scientificName: 'Brassica oleracea var. acephala',
    category: 'brassica',
    daysToGermination: [5, 10],
    daysToMaturity: 60,
    harvestWindowDays: 60,
    hasFlowering: false,
    requiresHardening: false,
  },
  'chinese-cabbage': {
    scientificName: 'Brassica rapa subsp. pekinensis',
    category: 'brassica',
    daysToGermination: [5, 10],
    daysToMaturity: 60,
    harvestWindowDays: 14,
    hasFlowering: false,
    requiresHardening: false,
  },
  kohlrabi: {
    scientificName: 'Brassica oleracea var. gongylodes',
    category: 'brassica',
    daysToGermination: [5, 10],
    daysToMaturity: 55,
    harvestWindowDays: 14,
    hasFlowering: false,
    requiresHardening: false,
  },
  mustard: {
    scientificName: 'Brassica juncea',
    category: 'brassica',
    daysToGermination: [4, 10],
    daysToMaturity: 40,
    harvestWindowDays: 21,
    hasFlowering: false,
    requiresHardening: false,
  },
  'turnip-greens': {
    scientificName: 'Brassica rapa subsp. rapa',
    category: 'brassica',
    daysToGermination: [4, 10],
    daysToMaturity: 35,
    harvestWindowDays: 21,
    hasFlowering: false,
    requiresHardening: false,
  },
  // Roots
  carrot: {
    scientificName: 'Daucus carota',
    category: 'root',
    daysToGermination: [10, 21],
    daysToMaturity: 70,
    harvestWindowDays: 30,
    hasFlowering: false,
    requiresHardening: false,
  },
  beet: {
    scientificName: 'Beta vulgaris',
    category: 'root',
    daysToGermination: [7, 14],
    daysToMaturity: 55,
    harvestWindowDays: 21,
    hasFlowering: false,
    requiresHardening: false,
  },
  radish: {
    scientificName: 'Raphanus sativus',
    category: 'root',
    daysToGermination: [4, 10],
    daysToMaturity: 28,
    harvestWindowDays: 14,
    successionIntervalDays: 14,
    maxSuccessions: 6,
    hasFlowering: false,
    requiresHardening: false,
  },
  turnip: {
    scientificName: 'Brassica rapa subsp. rapa',
    category: 'root',
    daysToGermination: [5, 10],
    daysToMaturity: 50,
    harvestWindowDays: 21,
    hasFlowering: false,
    requiresHardening: false,
  },
  rutabaga: {
    scientificName: 'Brassica napus var. napobrassica',
    category: 'root',
    daysToGermination: [5, 14],
    daysToMaturity: 90,
    harvestWindowDays: 30,
    hasFlowering: false,
    requiresHardening: false,
  },
  parsnip: {
    scientificName: 'Pastinaca sativa',
    category: 'root',
    daysToGermination: [14, 28],
    daysToMaturity: 110,
    harvestWindowDays: 60,
    hasFlowering: false,
    requiresHardening: false,
  },
  potato: {
    scientificName: 'Solanum tuberosum',
    category: 'root',
    daysToGermination: [14, 28], // sprout from seed potato
    daysToMaturity: 90,
    harvestWindowDays: 30,
    hasFlowering: true,
    requiresHardening: false,
  },
  // Alliums
  onion: {
    scientificName: 'Allium cepa',
    category: 'allium',
    daysToGermination: [7, 14],
    daysToMaturity: 100,
    harvestWindowDays: 21,
    weeksIndoorBeforeLastFrost: 8,
    hasFlowering: false,
    requiresHardening: false,
  },
  'green-onion': {
    scientificName: 'Allium fistulosum',
    category: 'allium',
    daysToGermination: [7, 14],
    daysToMaturity: 60,
    harvestWindowDays: 30,
    hasFlowering: false,
    requiresHardening: false,
  },
  leek: {
    scientificName: 'Allium ampeloprasum',
    category: 'allium',
    daysToGermination: [7, 14],
    daysToMaturity: 100,
    harvestWindowDays: 30,
    weeksIndoorBeforeLastFrost: 10,
    hasFlowering: false,
    requiresHardening: false,
  },
  chives: {
    scientificName: 'Allium schoenoprasum',
    category: 'allium',
    daysToGermination: [10, 21],
    daysToMaturity: 80,
    harvestWindowDays: 90,
    hasFlowering: true,
    requiresHardening: false,
  },
  garlic: {
    scientificName: 'Allium sativum',
    category: 'allium',
    daysToGermination: [14, 28],
    daysToMaturity: 240,
    harvestWindowDays: 21,
    hasFlowering: false,
    requiresHardening: false,
  },
  // Leafy greens
  'leaf-lettuce': {
    scientificName: 'Lactuca sativa',
    category: 'leafy-green',
    daysToGermination: [4, 10],
    daysToMaturity: 50,
    harvestWindowDays: 21,
    successionIntervalDays: 14,
    maxSuccessions: 4,
    hasFlowering: false,
    requiresHardening: false,
  },
  'heat-resistant-lettuce': {
    scientificName: 'Lactuca sativa',
    category: 'leafy-green',
    daysToGermination: [4, 10],
    daysToMaturity: 55,
    harvestWindowDays: 21,
    hasFlowering: false,
    requiresHardening: false,
  },
  spinach: {
    scientificName: 'Spinacia oleracea',
    category: 'leafy-green',
    daysToGermination: [7, 14],
    daysToMaturity: 45,
    harvestWindowDays: 21,
    hasFlowering: false,
    requiresHardening: false,
  },
  chard: {
    scientificName: 'Beta vulgaris subsp. vulgaris',
    category: 'leafy-green',
    daysToGermination: [7, 14],
    daysToMaturity: 55,
    harvestWindowDays: 60,
    hasFlowering: false,
    requiresHardening: false,
  },
  'nz-spinach': {
    scientificName: 'Tetragonia tetragonoides',
    category: 'leafy-green',
    daysToGermination: [10, 20],
    daysToMaturity: 60,
    harvestWindowDays: 60,
    hasFlowering: false,
    requiresHardening: false,
  },
  'leafy-greens': {
    category: 'leafy-green',
    daysToGermination: [5, 14],
    daysToMaturity: 45,
    harvestWindowDays: 30,
    hasFlowering: false,
    requiresHardening: false,
  },
  // Herbs
  basil: {
    scientificName: 'Ocimum basilicum',
    category: 'herb',
    daysToGermination: [5, 14],
    daysToMaturity: 60,
    harvestWindowDays: 60,
    weeksIndoorBeforeLastFrost: 6,
    hasFlowering: true,
    requiresHardening: true,
  },
  cilantro: {
    scientificName: 'Coriandrum sativum',
    category: 'herb',
    daysToGermination: [7, 14],
    daysToMaturity: 50,
    harvestWindowDays: 21,
    hasFlowering: true,
    requiresHardening: false,
  },
  dill: {
    scientificName: 'Anethum graveolens',
    category: 'herb',
    daysToGermination: [7, 21],
    daysToMaturity: 55,
    harvestWindowDays: 30,
    hasFlowering: true,
    requiresHardening: false,
  },
  fennel: {
    scientificName: 'Foeniculum vulgare',
    category: 'herb',
    daysToGermination: [7, 14],
    daysToMaturity: 65,
    harvestWindowDays: 21,
    hasFlowering: true,
    requiresHardening: false,
  },
  parsley: {
    scientificName: 'Petroselinum crispum',
    category: 'herb',
    daysToGermination: [14, 28],
    daysToMaturity: 75,
    harvestWindowDays: 90,
    weeksIndoorBeforeLastFrost: 8,
    hasFlowering: false,
    requiresHardening: false,
  },
  // Other
  celery: {
    scientificName: 'Apium graveolens',
    category: 'other',
    daysToGermination: [14, 21],
    daysToMaturity: 100,
    harvestWindowDays: 30,
    weeksIndoorBeforeLastFrost: 10,
    hasFlowering: false,
    requiresHardening: true,
  },
  'sweet-corn': {
    scientificName: 'Zea mays',
    category: 'other',
    daysToGermination: [5, 10],
    daysToMaturity: 75,
    harvestWindowDays: 14,
    successionIntervalDays: 14,
    maxSuccessions: 3,
    hasFlowering: true,
    requiresHardening: false,
  },
};

/** Parse "MM-DD" or "Apr 15" / "April 15" into {m,d}. Throws on malformed input. */
function parseMmDd(s: string): { m: number; d: number } {
  const m1 = s.match(/^(\d{1,2})-(\d{1,2})$/);
  if (m1?.[1] && m1?.[2]) return { m: parseInt(m1[1], 10), d: parseInt(m1[2], 10) };
  const months = [
    'jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec',
  ];
  const m2 = s.toLowerCase().match(/^([a-z]{3,9})\.?\s+(\d{1,2})/);
  if (m2?.[1] && m2?.[2]) {
    const idx = months.indexOf(m2[1].slice(0, 3));
    if (idx >= 0) return { m: idx + 1, d: parseInt(m2[2], 10) };
  }
  throw new Error(`Cannot parse date "${s}"`);
}

/** Convert a date pair like ("Apr 15", "May 5") relative to a reference last
 *  frost date into a transplant offset in days. Reference frost: assumed in
 *  the same calendar year; sign convention matches the engine. */
export function dateRangeToOffset(
  midpointMmDd: string, // "MM-DD" or "Apr 15"
  lastFrostMmDd: string, // baseline e.g. "04-15"
): number {
  const target = parseMmDd(midpointMmDd);
  const ref = parseMmDd(lastFrostMmDd);
  const yr = 2026; // arbitrary non-leap year
  const tDate = new Date(Date.UTC(yr, target.m - 1, target.d));
  const rDate = new Date(Date.UTC(yr, ref.m - 1, ref.d));
  return Math.round((tDate.getTime() - rDate.getTime()) / (24 * 60 * 60 * 1000));
}

/** Translate an absolute calendar date (e.g. "Apr 15") from a publication
 *  keyed to a specific climate (e.g. USU's Utah valleys, last-frost ≈ May 1)
 *  into the engine's frost-relative offset.
 *
 *  Use this for absolute-date publications. Frost-relative publications
 *  (Cornell, Johnny's "weeks before last frost") should call timingFromIndoorStart
 *  / timingFromDirectSow directly with the published offset.
 *
 *  Returned value is days; negative = before publication's home last-frost,
 *  positive = after. Sign convention matches the engine (offset added to the
 *  USER'S last-frost date at runtime — translation assumes the publication's
 *  recommendation tracks last-frost rather than absolute soil temperature).
 *
 *  IMPORTANT: This translation has a known weakness — many absolute-date
 *  recommendations actually track soil temperature or photoperiod, not last
 *  frost. For warm-season crops (tomato, pepper) the correlation is good;
 *  for cool-season crops (peas, spinach) it's mediocre. Record the home
 *  frost date in provenance.note so future readers can audit.
 */
export function absoluteDateToOffset(input: {
  /** Absolute date in the publication, e.g. "Apr 15", "04-15". */
  publicationDate: string;
  /** The publication's home last-frost date, e.g. USU northern Utah ≈ "05-15". */
  homeLastFrost: string;
}): number {
  const target = parseMmDd(input.publicationDate);
  const ref = parseMmDd(input.homeLastFrost);
  const yr = 2026;
  const tDate = new Date(Date.UTC(yr, target.m - 1, target.d));
  const rDate = new Date(Date.UTC(yr, ref.m - 1, ref.d));
  return Math.round((tDate.getTime() - rDate.getTime()) / (24 * 60 * 60 * 1000));
}

/** Same as absoluteDateToOffset but for first-fall-frost-anchored events
 *  (rare in planting guides, common in harvest-window math). */
export function absoluteDateToFallFrostOffset(input: {
  publicationDate: string;
  homeFirstFallFrost: string;
}): number {
  return absoluteDateToOffset({
    publicationDate: input.publicationDate,
    homeLastFrost: input.homeFirstFallFrost,
  });
}
