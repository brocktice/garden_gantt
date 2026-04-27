// scripts/import/cornell-extension.ts
// Parser for Cornell Cooperative Extension's "NYC Area Vegetable Planting Guide"
// (Harvest NY, August 2020 revision; original John Ameroso, rev 1-03).
// Source PDF: https://harvestny.cce.cornell.edu/uploads/doc_160.pdf
//
// PARSER STATUS: IMPLEMENTED (planting-window data only — see GAP below)
//
// WHAT CORNELL GIVES US
//   The PDF is a one-page chart with 7 columns. Each column is a planting
//   window (date range + frost-relative subtitle). Crops listed under each
//   column are direct-seeded `(S)`, transplanted `(T)`, or either `(T, S)`.
//
// WHAT IT DOES NOT GIVE US
//   - days to maturity
//   - days to germination
//   - harvest window
//   - indoor-start lead time (only "X weeks before last frost" for transplant;
//     not how many weeks before THAT to start indoors)
//
// HANDLING THE GAP
//   Each emitted Plant uses Cornell's planting-window offset for the
//   start-method (direct-sow OR transplant), then fills the remaining
//   timing fields from CROP_DEFAULTS in `_shared.ts`. Every Plant is
//   emitted with `verified: false` and a `note` documenting which fields
//   are pending cross-reference. A later parser (UMaine growing chart,
//   USU planting guide) that supplies real DTM will upgrade the entry to
//   `verified: true` via the orchestrator's verified-wins merge rule.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plant, PlantTiming } from '../../src/domain/types';
import {
  CROP_DEFAULTS,
  buildCuratedPlant,
  keyToCommonName,
  type CropDefaults,
} from './_shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_PATH = resolve(
  __dirname,
  '../data-sources/extension-pdfs/cornell-vegetable-planting.pdf',
);

const PROVENANCE_BASE = {
  source: 'Cornell Cooperative Extension',
  publication: 'Planting Guide for the New York City Area (rev. Aug 2020)',
  url: 'https://harvestny.cce.cornell.edu/uploads/doc_160.pdf',
  retrieved: '2026-04-27',
  license:
    'Land-grant Smith-Lever publication; redistributable with attribution.',
} as const;

// Column geometry (x-coords from the PDF; verified by _inspect-pdf.ts).
// Each column has a published frost-relative window. Midpoint of that
// window becomes the offset stored on Plant.timing.
interface ColumnSpec {
  /** Approximate x-coord of the column's left edge (text items cluster here). */
  xMin: number;
  xMax: number;
  /** Display-only label, for logging. */
  label: string;
  /** Frost-relative offset midpoint, in days, anchored to last-spring-frost.
   *  Negative = before last frost. Used for the start-method this window
   *  prescribes. */
  offsetDays: number;
  /** Whether this column anchors to last-spring frost or first-fall frost.
   *  Currently only spring-frost-anchored offsets are emitted; fall-anchored
   *  columns are skipped (the engine doesn't yet model fall-anchored sows). */
  anchor: 'spring' | 'fall';
  /** Implied season class for crops in this column. */
  season: 'cool' | 'warm';
  /** Implied frost tolerance for crops in this column. */
  frostTolerance: 'tender' | 'half-hardy' | 'hardy';
}

const COLUMNS: ColumnSpec[] = [
  {
    xMin: 15,
    xMax: 100,
    label: 'April 1 - 30 (cold-hardy, early spring)',
    offsetDays: -28, // midpoint of "2-6 weeks before last spring frost"
    anchor: 'spring',
    season: 'cool',
    frostTolerance: 'hardy',
  },
  {
    xMin: 100,
    xMax: 175,
    label: 'April 15 - 30 (cold-hardy)',
    offsetDays: -21, // "2-4 weeks before last spring frost"
    anchor: 'spring',
    season: 'cool',
    frostTolerance: 'half-hardy',
  },
  {
    xMin: 200,
    xMax: 270,
    label: 'May 15 - June 15 (cold-tender, around last frost)',
    offsetDays: 14, // "0-4 weeks after last spring frost"
    anchor: 'spring',
    season: 'warm',
    frostTolerance: 'tender',
  },
  {
    xMin: 290,
    xMax: 410,
    label: 'June - July (multiple successions)',
    offsetDays: 45, // mid-season succession midpoint
    anchor: 'spring',
    season: 'warm',
    frostTolerance: 'tender',
  },
];

/** Cornell's fall-anchored columns (5/6/7). We don't extract offsets here
 *  (they'd need a first-fall-frost anchor the engine doesn't model yet),
 *  but we DO extract frostTolerance + season — useful for crops that only
 *  appear in fall (Brussels Sprouts, Chinese Cabbage, etc.) so the merge
 *  can flip them to verified=true. */
const FALL_COLUMNS: ColumnSpec[] = [
  {
    xMin: 450,
    xMax: 525,
    label: 'July 15 - Aug 1 (12-14 weeks before first fall frost)',
    offsetDays: 0, // unused — anchor='fall'
    anchor: 'fall',
    season: 'cool',
    frostTolerance: 'hardy',
  },
  {
    xMin: 560,
    xMax: 635,
    label: 'Aug 1 - 20 (10-12 weeks before first fall frost)',
    offsetDays: 0,
    anchor: 'fall',
    season: 'cool',
    frostTolerance: 'hardy',
  },
  {
    xMin: 660,
    xMax: 730,
    label: 'Aug 15 - Sept 1 (8-10 weeks before first fall frost)',
    offsetDays: 0,
    anchor: 'fall',
    season: 'cool',
    frostTolerance: 'hardy',
  },
];

const COLUMN_SKIP_REASON =
  'Cornell fall columns extract frostTolerance/season only; offset data anchored to first-fall frost (engine does not model fall-anchored sows yet).';

interface CornellEntry {
  cropName: string;
  methods: ReadonlyArray<'S' | 'T'>;
  column: ColumnSpec;
}

function parseCropAndMethods(text: string): {
  name: string;
  methods: Array<'S' | 'T'>;
} | null {
  // Common: "Tomato (T)" / "Beans, All (S)" / "Squash, Bush Summer Varieties (T, S)"
  // Tricky: "Onion (Sets)" / "Green Onion (Sets)" — parens are part of the
  //   NAME (varietal qualifier) and the planting method (sets) is implicit
  //   direct-sow. Detect via fallback when parens contain no S/T tokens.
  const m = text.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (!m || !m[1] || !m[2]) return null;
  const innerCodes = m[2]
    .split(/[,\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s === 'S' || s === 'T') as Array<'S' | 'T'>;
  if (innerCodes.length > 0) {
    return { name: m[1].trim(), methods: innerCodes };
  }
  // No method codes inside parens — the parens are part of the name.
  // "Onion (Sets)" / "Green Onion (Sets)" → direct-sow (S).
  if (/^[A-Za-z][a-z\s]*\(sets\)$/i.test(text.trim())) {
    return { name: text.trim(), methods: ['S'] };
  }
  return null;
}

/** Cornell occasionally lists a crop with no method-code parens at all
 *  (e.g. "Potato", "Garlic"). These are implicit-direct-sow crops planted
 *  from tubers/cloves rather than seed. Match these explicitly to avoid
 *  silent skipping. */
function parseBareCropName(text: string): {
  name: string;
  methods: Array<'S' | 'T'>;
} | null {
  const t = text.trim();
  // Bare name with no parens.
  if (/\(/.test(t)) return null;
  const knownBare = /^(potato|potatoes|garlic|sweet potato|sweet potatoes)$/i;
  if (knownBare.test(t)) {
    return { name: t, methods: ['S'] };
  }
  return null;
}

/** Cornell crop label → CROP_DEFAULTS lookup key. Returns null for crops
 *  we don't have defaults for (parser will skip them with a log line). */
function resolveDefaultsKey(name: string): string | null {
  const n = name.toLowerCase().trim();
  // Direct matches first.
  if (CROP_DEFAULTS[n]) return n;
  // Heuristics for Cornell's naming quirks.
  if (n === 'peas') return 'peas';
  if (n.startsWith('peppers')) return 'pepper';
  if (n.startsWith('beans')) return 'beans';
  if (n === 'leek' || n === 'leeks') return 'leek';
  if (n === 'onion (sets)' || n === 'onion') return 'onion';
  if (n === 'green onion (sets)') return 'green-onion';
  if (n === 'tomato' || n === 'tomatoes') return 'tomato';
  if (n === 'tomatillo') return 'tomatillo';
  if (n === 'eggplant') return 'eggplant';
  if (n === 'cucumber') return 'cucumber';
  if (n === 'melons' || n === 'melon') return 'melon';
  if (n.startsWith('squash')) return 'squash';
  if (n === 'okra') return 'okra';
  if (n === 'broccoli') return 'broccoli';
  if (n === 'cabbage') return 'cabbage';
  if (n === 'cauliflower') return 'cauliflower';
  if (n === 'brussels sprouts') return 'brussels-sprouts';
  if (n === 'kale') return 'kale';
  if (n === 'collards') return 'collards';
  if (n === 'chinese cabbage') return 'chinese-cabbage';
  if (n === 'kohlrabi') return 'kohlrabi';
  if (n === 'mustard') return 'mustard';
  if (n === 'turnip greens') return 'turnip-greens';
  if (n === 'carrot') return 'carrot';
  if (n === 'beet') return 'beet';
  if (n === 'radish') return 'radish';
  if (n === 'turnip') return 'turnip';
  if (n === 'rutabaga') return 'rutabaga';
  if (n === 'parsnip') return 'parsnip';
  if (n === 'potato') return 'potato';
  if (n === 'chives') return 'chives';
  if (n === 'leaf lettuce') return 'leaf-lettuce';
  if (n === 'heat resistant lettuce') return 'heat-resistant-lettuce';
  if (n === 'spinach') return 'spinach';
  if (n === 'chard') return 'chard';
  if (n === 'n.z. spinach' || n === 'nz spinach') return 'nz-spinach';
  if (n === 'leafy greens') return 'leafy-greens';
  if (n === 'basil') return 'basil';
  if (n === 'cilantro') return 'cilantro';
  if (n === 'dill') return 'dill';
  if (n === 'fennel') return 'fennel';
  if (n === 'parsley') return 'parsley';
  if (n === 'celery') return 'celery';
  if (n === 'sweet corn') return 'sweet-corn';
  return null;
}

function buildTiming(
  defaults: CropDefaults,
  method: 'S' | 'T',
  column: ColumnSpec,
): PlantTiming {
  if (method === 'T') {
    // Cornell's column offset is the TRANSPLANT date. Indoor-start lead time
    // comes from CROP_DEFAULTS; if the crop isn't typically transplanted
    // (no weeksIndoorBeforeLastFrost in defaults) use 6 weeks as a sane
    // fallback and let the verified pass override.
    const t: PlantTiming = {
      startMethod: 'indoor-start',
      weeksIndoorBeforeLastFrost: defaults.weeksIndoorBeforeLastFrost ?? 6,
      transplantOffsetDaysFromLastFrost: column.offsetDays,
      daysToGermination: defaults.daysToGermination,
      daysToMaturity: defaults.daysToMaturity,
      harvestWindowDays: defaults.harvestWindowDays,
      frostTolerance: column.frostTolerance,
      hasFlowering: defaults.hasFlowering,
      requiresHardening: defaults.requiresHardening,
      season: column.season,
    };
    if (defaults.daysToHardenOff !== undefined) {
      t.daysToHardenOff = defaults.daysToHardenOff;
    }
    if (defaults.successionIntervalDays !== undefined) {
      t.successionIntervalDays = defaults.successionIntervalDays;
    }
    if (defaults.maxSuccessions !== undefined) {
      t.maxSuccessions = defaults.maxSuccessions;
    }
    return t;
  }
  // 'S' = direct sow
  const t: PlantTiming = {
    startMethod: 'direct-sow',
    directSowOffsetDaysFromLastFrost: column.offsetDays,
    daysToGermination: defaults.daysToGermination,
    daysToMaturity: defaults.daysToMaturity,
    harvestWindowDays: defaults.harvestWindowDays,
    frostTolerance: column.frostTolerance,
    hasFlowering: defaults.hasFlowering,
    requiresHardening: defaults.requiresHardening,
    season: column.season,
  };
  if (defaults.successionIntervalDays !== undefined) {
    t.successionIntervalDays = defaults.successionIntervalDays;
  }
  if (defaults.maxSuccessions !== undefined) {
    t.maxSuccessions = defaults.maxSuccessions;
  }
  return t;
}

function pickColumn(x: number): ColumnSpec | null {
  for (const c of COLUMNS) {
    if (x >= c.xMin && x <= c.xMax) return c;
  }
  for (const c of FALL_COLUMNS) {
    if (x >= c.xMin && x <= c.xMax) return c;
  }
  return null;
}

interface PdfTextItem {
  str: string;
  transform: number[];
}

/** Group items by (column-bucket, y-row). Within each bucket, items are
 *  joined left-to-right with a single space. This prevents merging across
 *  columns (which would glue separate crops together). */
function joinByColumnAndRow(items: PdfTextItem[]): PdfTextItem[] {
  type Bucket = { col: ColumnSpec; y: number; xs: PdfTextItem[] };
  const buckets = new Map<string, Bucket>();
  for (const it of items) {
    if (it.str.trim() === '') continue;
    const x = it.transform[4] ?? 0;
    const y = it.transform[5] ?? 0;
    const col = pickColumn(x);
    if (!col) continue;
    // Quantize y to nearest 3 to absorb sub-pixel jitter on multi-line cells.
    const yKey = Math.round(y / 3) * 3;
    const key = `${col.xMin}:${yKey}`;
    let b = buckets.get(key);
    if (!b) {
      b = { col, y: yKey, xs: [] };
      buckets.set(key, b);
    }
    b.xs.push(it);
  }
  const out: PdfTextItem[] = [];
  for (const b of buckets.values()) {
    b.xs.sort(
      (a, c) => (a.transform[4] ?? 0) - (c.transform[4] ?? 0),
    );
    const str = b.xs
      .map((i) => i.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const first = b.xs[0];
    if (!first) continue;
    out.push({ str, transform: first.transform });
  }
  return out;
}

export async function parseCornellExtension(): Promise<Plant[]> {
  if (!existsSync(PDF_PATH)) {
    console.warn(
      `[cornell-extension] PDF not found at ${PDF_PATH} — skipping. Download per LICENSES.md to enable.`,
    );
    return [];
  }

  const buf = readFileSync(PDF_PATH);
  const data = new Uint8Array(buf);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const allItems: PdfTextItem[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    for (const it of tc.items as PdfTextItem[]) {
      if (
        typeof it.str === 'string' &&
        it.str.trim() !== '' &&
        Array.isArray(it.transform)
      ) {
        allItems.push({ str: it.str, transform: it.transform });
      }
    }
  }

  // Limit to the data band: y between 99 and 360 (entries in the chart body).
  const inBand = allItems.filter((it) => {
    const y = it.transform[5] ?? 0;
    return y >= 95 && y <= 360;
  });
  const rows = joinByColumnAndRow(inBand);

  const entries: CornellEntry[] = [];
  let skippedNoColumn = 0;
  let skippedNotCrop = 0;
  for (const r of rows) {
    const x = r.transform[4] ?? 0;
    const col = pickColumn(x);
    if (!col) {
      skippedNoColumn++;
      continue;
    }
    const parsed = parseCropAndMethods(r.str) ?? parseBareCropName(r.str);
    if (!parsed) {
      skippedNotCrop++;
      continue;
    }
    entries.push({ cropName: parsed.name, methods: parsed.methods, column: col });
  }

  const plants: Plant[] = [];
  let skippedNoDefaults = 0;
  const seen = new Set<string>();
  for (const e of entries) {
    const key = resolveDefaultsKey(e.cropName);
    if (!key) {
      skippedNoDefaults++;
      console.warn(
        `[cornell-extension] no CROP_DEFAULTS entry for "${e.cropName}" — skipping`,
      );
      continue;
    }
    const defaults = CROP_DEFAULTS[key];
    if (!defaults) continue;

    // For (T, S) crops, prefer transplant if the column's offset is negative
    // (before last frost — would only make sense as transplant); prefer
    // direct-sow if positive (post-frost direct sow).
    const method: 'S' | 'T' =
      e.methods.length === 1
        ? (e.methods[0] as 'S' | 'T')
        : e.column.offsetDays < 0
          ? 'T'
          : 'S';

    const dedupKey = `${key}:${method}:${e.column.label}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const isFall = e.column.anchor === 'fall';
    const note = isFall
      ? `Cornell fall column ${e.column.label}: verifies frostTolerance + season for "${e.cropName}" (offset NOT extracted — fall-anchored).`
      : `Cornell verifies start-method (${method}) and frost-relative window (${e.column.label}, offsetDays=${e.column.offsetDays}). Other timing fields from typical-extension defaults — pending UMaine/USU/PSU cross-reference.`;

    const verifiedFields: string[] = isFall
      ? ['frostTolerance', 'season']
      : ['startMethod', 'frostTolerance', 'season'];
    if (!isFall && method === 'T') verifiedFields.push('transplantOffsetDaysFromLastFrost');
    if (!isFall && method === 'S') verifiedFields.push('directSowOffsetDaysFromLastFrost');

    plants.push(
      buildCuratedPlant({
        commonName: keyToCommonName(key),
        ...(defaults.scientificName
          ? { scientificName: defaults.scientificName }
          : {}),
        category: defaults.category,
        timing: buildTiming(defaults, method, e.column),
        provenance: {
          ...PROVENANCE_BASE,
          verified: false,
          note: `${note} (Source label: "${e.cropName}".)`,
          page: 1,
          verifiedFields,
        },
      }),
    );
  }

  console.log(
    `[cornell-extension] entries parsed=${entries.length} emitted=${plants.length} ` +
      `skipped(no-column=${skippedNoColumn}, not-a-crop=${skippedNotCrop}, no-defaults=${skippedNoDefaults}) ` +
      `${COLUMN_SKIP_REASON}`,
  );

  return plants;
}
