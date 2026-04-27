// scripts/import/umaine-extension.ts
// Parser for University of Maine Cooperative Extension's Vegetable Growing
// Chart. Source URL:
//   https://extension.umaine.edu/gardening/wp-content/uploads/sites/5/2016/02/Vegetable-growing-chart.pdf
//
// USAGE
//   1. Confirm the publication is redistributable (see scripts/data-sources/extension-pdfs/LICENSES.md)
//   2. Download the PDF to scripts/data-sources/extension-pdfs/umaine-vegetable-growing-chart.pdf
//   3. Append a row to LICENSES.md inventory
//   4. Run: npm run import:catalog
//
// PARSER STATUS: IMPLEMENTED (indoor-start table only)
//
// WHAT WE EXTRACT
//   The bottom table of the PDF ("Planting Seeds Indoors:") has 4 columns:
//     - Crop name
//     - "Weeks to Sow Indoors Before Last Frost" (e.g. "5-7", "8-10")
//     - "Weeks to Germination" (e.g. "1-2", "2-3")
//     - "Set Out Transplants" (free-text — "After frost, late summer", etc.)
//
//   We extract the first three columns. The set-out column is too variable
//   to translate to numeric offsets reliably; we leave that field for
//   Cornell or USU.
//
// WHAT WE SKIP
//   The top-section "Early Spring / Midspring / ..." planting-window chart
//   duplicates the data Cornell already provides at higher fidelity — we
//   skip it to avoid noisy collisions.

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
  '../data-sources/extension-pdfs/umaine-vegetable-growing-chart.pdf',
);

const PROVENANCE_BASE = {
  source: 'University of Maine Cooperative Extension',
  publication: 'Vegetable Growing Chart',
  url: 'https://extension.umaine.edu/gardening/wp-content/uploads/sites/5/2016/02/Vegetable-growing-chart.pdf',
  retrieved: '2026-04-27',
  license:
    'Land-grant Smith-Lever publication; redistributable with attribution.',
} as const;

// Column x-coords for the bottom indoor-start table. The PDF has y between
// roughly 21 and 153 for data rows; the section headers are at y≈185, y≈173.
const TABLE_Y_MAX = 160;
const TABLE_Y_MIN = 15;
const COL_CROP = { xMin: 30, xMax: 170 };
const COL_WEEKS_INDOOR = { xMin: 170, xMax: 280 };
const COL_WEEKS_GERM = { xMin: 280, xMax: 410 };
// const COL_SET_OUT = { xMin: 440, xMax: 600 };  // intentionally not parsed

interface PdfTextItem {
  str: string;
  transform: number[];
}

interface UmaineRow {
  crop: string;
  weeksIndoor: [number, number] | null;
  weeksGerm: [number, number] | null;
}

/** Parse "5-7" or "8" into a [min,max] tuple. Returns null on garbage. */
function parseRange(s: string): [number, number] | null {
  const trimmed = s.trim();
  const range = trimmed.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (range?.[1] && range?.[2]) {
    const lo = parseInt(range[1], 10);
    const hi = parseInt(range[2], 10);
    if (Number.isFinite(lo) && Number.isFinite(hi)) return [lo, hi];
  }
  const single = trimmed.match(/^(\d+)$/);
  if (single?.[1]) {
    const v = parseInt(single[1], 10);
    if (Number.isFinite(v)) return [v, v];
  }
  return null;
}

/** Group items into rows by quantized y-coord, then split into our 3 columns. */
function extractRows(items: PdfTextItem[]): UmaineRow[] {
  type Bucket = { y: number; xs: PdfTextItem[] };
  const buckets = new Map<number, Bucket>();
  for (const it of items) {
    if (it.str.trim() === '') continue;
    const x = it.transform[4] ?? 0;
    const y = it.transform[5] ?? 0;
    if (y < TABLE_Y_MIN || y > TABLE_Y_MAX) continue;
    if (x < COL_CROP.xMin || x > COL_WEEKS_GERM.xMax) continue;
    const yKey = Math.round(y / 3) * 3;
    let b = buckets.get(yKey);
    if (!b) {
      b = { y: yKey, xs: [] };
      buckets.set(yKey, b);
    }
    b.xs.push(it);
  }

  const rows: UmaineRow[] = [];
  for (const b of buckets.values()) {
    const cropParts: string[] = [];
    let weeksIndoorRaw = '';
    let weeksGermRaw = '';
    for (const it of b.xs) {
      const x = it.transform[4] ?? 0;
      if (x >= COL_CROP.xMin && x <= COL_CROP.xMax) {
        cropParts.push(it.str);
      } else if (x >= COL_WEEKS_INDOOR.xMin && x <= COL_WEEKS_INDOOR.xMax) {
        weeksIndoorRaw += it.str;
      } else if (x >= COL_WEEKS_GERM.xMin && x <= COL_WEEKS_GERM.xMax) {
        weeksGermRaw += it.str;
      }
    }
    const crop = cropParts.join(' ').replace(/\s+/g, ' ').trim();
    if (!crop) continue;
    rows.push({
      crop,
      weeksIndoor: parseRange(weeksIndoorRaw),
      weeksGerm: parseRange(weeksGermRaw),
    });
  }
  return rows;
}

/** Map UMaine's crop labels to CROP_DEFAULTS keys. */
function resolveDefaultsKey(name: string): string | null {
  const n = name.toLowerCase().trim();
  if (CROP_DEFAULTS[n]) return n;
  // Strip parenthetical varietal qualifiers like "Onions (globle)" (sic).
  const stripped = n.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (CROP_DEFAULTS[stripped]) return stripped;
  if (n === 'broccoli') return 'broccoli';
  if (n === 'brussels sprout' || n === 'brussels sprouts') return 'brussels-sprouts';
  if (n === 'cabbage') return 'cabbage';
  if (n === 'cauliflower') return 'cauliflower';
  if (n === 'cucumber' || n === 'cucumbers') return 'cucumber';
  if (n === 'eggplant') return 'eggplant';
  if (n === 'leeks' || n === 'leek') return 'leek';
  if (n === 'head lettuce' || n === 'lettuce') return 'leaf-lettuce';
  if (stripped === 'onions' || stripped === 'onion') return 'onion';
  if (n === 'peppers' || n === 'pepper') return 'pepper';
  if (n === 'tomatoes' || n === 'tomato') return 'tomato';
  return null;
}

function buildTiming(
  defaults: CropDefaults,
  weeksIndoor: number,
  daysGerm: [number, number],
): PlantTiming {
  // UMaine doesn't supply transplant offset for these — fall back to
  // CROP_DEFAULTS or 0 (last-frost). Cornell will overlay the real frost
  // window when both parsers cover the same crop.
  const t: PlantTiming = {
    startMethod: 'indoor-start',
    weeksIndoorBeforeLastFrost: weeksIndoor,
    transplantOffsetDaysFromLastFrost: 0,
    daysToGermination: daysGerm,
    daysToMaturity: defaults.daysToMaturity,
    harvestWindowDays: defaults.harvestWindowDays,
    frostTolerance: 'half-hardy',
    hasFlowering: defaults.hasFlowering,
    requiresHardening: defaults.requiresHardening,
    season: 'cool',
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

export async function parseUmaineExtension(): Promise<Plant[]> {
  if (!existsSync(PDF_PATH)) {
    console.warn(
      `[umaine-extension] PDF not found at ${PDF_PATH} — skipping. Download per LICENSES.md to enable.`,
    );
    return [];
  }

  const buf = readFileSync(PDF_PATH);
  const data = new Uint8Array(buf);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const items: PdfTextItem[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    for (const it of tc.items as PdfTextItem[]) {
      if (
        typeof it.str === 'string' &&
        it.str.trim() !== '' &&
        Array.isArray(it.transform)
      ) {
        items.push({ str: it.str, transform: it.transform });
      }
    }
  }

  const rows = extractRows(items);

  const plants: Plant[] = [];
  let skippedNoDefaults = 0;
  let skippedNoNumbers = 0;
  for (const r of rows) {
    const key = resolveDefaultsKey(r.crop);
    if (!key) {
      // Header rows like "Planting Seeds" or "Indoors:" land here — silently skip.
      continue;
    }
    if (!r.weeksIndoor || !r.weeksGerm) {
      skippedNoNumbers++;
      console.warn(
        `[umaine-extension] "${r.crop}" missing weeksIndoor or weeksGerm — skipping`,
      );
      continue;
    }
    const defaults = CROP_DEFAULTS[key];
    if (!defaults) {
      skippedNoDefaults++;
      continue;
    }

    const weeksIndoorMid = Math.round((r.weeksIndoor[0] + r.weeksIndoor[1]) / 2);
    const daysGerm: [number, number] = [
      r.weeksGerm[0] * 7,
      r.weeksGerm[1] * 7,
    ];

    plants.push(
      buildCuratedPlant({
        commonName: keyToCommonName(key),
        ...(defaults.scientificName
          ? { scientificName: defaults.scientificName }
          : {}),
        category: defaults.category,
        timing: buildTiming(defaults, weeksIndoorMid, daysGerm),
        provenance: {
          ...PROVENANCE_BASE,
          verified: false,
          note: `UMaine verifies weeksIndoorBeforeLastFrost (${r.weeksIndoor[0]}-${r.weeksIndoor[1]} → midpoint ${weeksIndoorMid}) and daysToGermination (${r.weeksGerm[0]}-${r.weeksGerm[1]} weeks → ${daysGerm[0]}-${daysGerm[1]} days). Other fields from typical-extension defaults — pending USU for daysToMaturity. (Source label: "${r.crop}".)`,
          page: 1,
          verifiedFields: ['weeksIndoorBeforeLastFrost', 'daysToGermination'],
        },
      }),
    );
  }

  console.log(
    `[umaine-extension] rows scanned=${rows.length} emitted=${plants.length} ` +
      `skipped(no-defaults=${skippedNoDefaults}, no-numbers=${skippedNoNumbers})`,
  );

  return plants;
}
