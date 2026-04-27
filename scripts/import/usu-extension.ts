// scripts/import/usu-extension.ts
// Parser for Utah State University Extension's "Wasatch Front Vegetable
// Chart" (Suggested Vegetable Planting Dates).
// Source URL: https://extension.usu.edu/yardandgarden/files/Planting-Guide.pdf
//
// USAGE
//   1. Confirm the publication is redistributable (see scripts/data-sources/extension-pdfs/LICENSES.md)
//   2. Download the PDF to scripts/data-sources/extension-pdfs/usu-vegetable-planting.pdf
//   3. Append a row to LICENSES.md inventory
//   4. Run: npm run import:catalog
//
// PARSER STATUS: IMPLEMENTED (DTM column only)
//
// WHAT WE EXTRACT
//   The chart has 19 columns: crop name, days-to-maturity, then 17 date
//   columns (1-MAR through 15-OCT) showing planting-window bars. We extract
//   the FIRST TWO columns:
//     - Crop name (often slash-separated multi-crop, e.g. "Carrots/Turnips")
//     - DTM range (e.g. "65-100", "100-120")
//
// WHAT WE SKIP
//   The 17 date-column bars are drawn as colored rectangles, not text.
//   pdfjs text extraction can't see them. The frost-relative planting
//   window data already comes from Cornell + UMaine — USU's unique value
//   here is daysToMaturity, the field that flips entries to verified=true.
//
// FROST REFERENCE
//   The chart header reads "AVERAGE FIRST FROST FREE DAY = MAY 1 - 15".
//   Recorded in provenance.note for audit; not used in extraction since
//   we're not parsing the date-column bars.

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
  '../data-sources/extension-pdfs/usu-vegetable-planting.pdf',
);

const USU_HOME_FROST = {
  lastSpring: '05-07', // midpoint of "MAY 1 - 15" per chart header
  firstFall: '10-01',
} as const;

const PROVENANCE_BASE = {
  source: 'Utah State University Extension',
  publication: 'Wasatch Front Vegetable Chart (Suggested Vegetable Planting Dates)',
  url: 'https://extension.usu.edu/yardandgarden/files/Planting-Guide.pdf',
  retrieved: '2026-04-27',
  license:
    'Land-grant Smith-Lever publication; redistributable with attribution.',
} as const;

// Column geometry: crop label at x≈19, DTM at x≈180-190.
const COL_CROP = { xMin: 5, xMax: 160 };
const COL_DTM = { xMin: 175, xMax: 220 };
// Header row at y≈448; data rows below it down to y≈64.
const ROW_Y_MAX = 440;
const ROW_Y_MIN = 50;

interface PdfTextItem {
  str: string;
  transform: number[];
}

interface UsuRow {
  cropLabel: string;
  dtm: [number, number] | null;
}

function parseRange(s: string): [number, number] | null {
  const t = s.trim();
  const m = t.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (m?.[1] && m?.[2]) {
    return [parseInt(m[1], 10), parseInt(m[2], 10)];
  }
  const single = t.match(/^(\d+)$/);
  if (single?.[1]) {
    const v = parseInt(single[1], 10);
    return [v, v];
  }
  return null;
}

function extractRows(items: PdfTextItem[]): UsuRow[] {
  type Bucket = { y: number; xs: PdfTextItem[] };
  const buckets = new Map<number, Bucket>();
  for (const it of items) {
    if (it.str.trim() === '') continue;
    const x = it.transform[4] ?? 0;
    const y = it.transform[5] ?? 0;
    if (y < ROW_Y_MIN || y > ROW_Y_MAX) continue;
    if (x > COL_DTM.xMax) continue; // skip date-column header text
    const yKey = Math.round(y / 3) * 3;
    let b = buckets.get(yKey);
    if (!b) {
      b = { y: yKey, xs: [] };
      buckets.set(yKey, b);
    }
    b.xs.push(it);
  }

  const rows: UsuRow[] = [];
  for (const b of buckets.values()) {
    const cropParts: string[] = [];
    let dtmRaw = '';
    for (const it of b.xs) {
      const x = it.transform[4] ?? 0;
      if (x >= COL_CROP.xMin && x <= COL_CROP.xMax) {
        cropParts.push(it.str);
      } else if (x >= COL_DTM.xMin && x <= COL_DTM.xMax) {
        dtmRaw += it.str;
      }
    }
    const cropLabel = cropParts.join(' ').replace(/\s+/g, ' ').trim();
    if (!cropLabel) continue;
    rows.push({ cropLabel, dtm: parseRange(dtmRaw) });
  }
  return rows;
}

/** Split a slash-separated multi-crop label into its constituents.
 *  e.g. "Carrots/Turnips" → ["Carrots", "Turnips"]
 *       "Lettuce (leafy types)" → ["Lettuce (leafy types)"] (no split) */
function splitMultiCrop(label: string): string[] {
  return label
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Map USU's crop labels (often plural, occasionally typo-ed) to
 *  CROP_DEFAULTS keys. Returns null if no match. */
function resolveDefaultsKey(name: string): string | null {
  const n = name.toLowerCase().trim();
  if (CROP_DEFAULTS[n]) return n;
  // Strip parentheticals like "Lettuce (leafy types)"
  const stripped = n.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (CROP_DEFAULTS[stripped]) return stripped;

  // Singularize / typo-fix common labels.
  if (n === 'beans' || n === 'bean') return 'beans';
  if (n === 'carrots' || n === 'carrot') return 'carrot';
  if (n === 'turnips' || n === 'turnip') return 'turnip';
  if (n === 'brocolli' || n === 'broccoli') return 'broccoli'; // USU typo
  if (n === 'cauliower' || n === 'cauliflower') return 'cauliflower'; // USU typo
  if (n === 'cabbage') return 'cabbage';
  if (n === 'corn' || n === 'sweet corn') return 'sweet-corn';
  if (n === 'kale') return 'kale';
  if (stripped === 'lettuce' || n === 'lettuces') return 'leaf-lettuce';
  if (n === 'onions' || n === 'onion') return 'onion';
  if (n === 'leeks' || n === 'leek') return 'leek';
  if (n === 'peas' || n === 'pea') return 'peas';
  if (n === 'peppers' || n === 'pepper') return 'pepper';
  if (n === 'potatoes' || n === 'potato') return 'potato';
  if (n === 'radishes' || n === 'radish') return 'radish';
  if (n === 'spinach') return 'spinach';
  if (n === 'beets' || n === 'beet') return 'beet';
  if (n === 'swiss chard' || n === 'chard') return 'chard';
  if (n === 'tomatoes' || n === 'tomato') return 'tomato';
  if (n === 'cucumber' || n === 'cucumbers') return 'cucumber';
  if (n === 'melons' || n === 'melon') return 'melon';
  if (n === 'summer squash' || n === 'winter squash' || n === 'squash')
    return 'squash';
  // 'pumpkins' / 'garlic' don't have CROP_DEFAULTS entries — skip.
  return null;
}

/** Build a minimal PlantTiming where USU's only verified field is
 *  daysToMaturity. Other fields come from CROP_DEFAULTS. The orchestrator's
 *  field-overlay merge will replace these defaults when Cornell/UMaine
 *  verify them. */
function buildTiming(defaults: CropDefaults, dtmMid: number): PlantTiming {
  const t: PlantTiming = {
    startMethod: 'direct-sow',
    daysToGermination: defaults.daysToGermination,
    daysToMaturity: dtmMid,
    harvestWindowDays: defaults.harvestWindowDays,
    frostTolerance: 'half-hardy', // overlaid by Cornell when available
    hasFlowering: defaults.hasFlowering,
    requiresHardening: defaults.requiresHardening,
    season: 'cool', // overlaid by Cornell when available
  };
  if (defaults.weeksIndoorBeforeLastFrost !== undefined) {
    t.startMethod = 'indoor-start';
    t.weeksIndoorBeforeLastFrost = defaults.weeksIndoorBeforeLastFrost;
    t.transplantOffsetDaysFromLastFrost = 0;
  } else {
    t.directSowOffsetDaysFromLastFrost = 0;
  }
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

export async function parseUsuExtension(): Promise<Plant[]> {
  if (!existsSync(PDF_PATH)) {
    console.warn(
      `[usu-extension] PDF not found at ${PDF_PATH} — skipping. Download per LICENSES.md to enable.`,
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
  let skippedNoDtm = 0;
  let skippedNoDefaults = 0;
  for (const r of rows) {
    if (!r.dtm) {
      // Header rows or rows missing DTM — silently skip.
      continue;
    }
    const dtmMid = Math.round((r.dtm[0] + r.dtm[1]) / 2);
    for (const sub of splitMultiCrop(r.cropLabel)) {
      const key = resolveDefaultsKey(sub);
      if (!key) {
        skippedNoDefaults++;
        console.warn(
          `[usu-extension] no CROP_DEFAULTS for "${sub}" (from row "${r.cropLabel}") — skipping`,
        );
        continue;
      }
      const defaults = CROP_DEFAULTS[key];
      if (!defaults) continue;

      plants.push(
        buildCuratedPlant({
          commonName: keyToCommonName(key),
          ...(defaults.scientificName
            ? { scientificName: defaults.scientificName }
            : {}),
          category: defaults.category,
          timing: buildTiming(defaults, dtmMid),
          provenance: {
            ...PROVENANCE_BASE,
            verified: false,
            note: `USU verifies daysToMaturity (${r.dtm[0]}-${r.dtm[1]} → midpoint ${dtmMid}). Wasatch Front home last-spring-frost ≈ ${USU_HOME_FROST.lastSpring}; planting-window bars on chart not extracted (image, not text). (Source label: "${sub}".)`,
            page: 1,
            verifiedFields: ['daysToMaturity'],
          },
        }),
      );
    }
    if (splitMultiCrop(r.cropLabel).every((s) => !resolveDefaultsKey(s))) {
      skippedNoDtm++; // not really "no DTM" but the row produced 0 plants
    }
  }

  console.log(
    `[usu-extension] rows=${rows.length} emitted=${plants.length} ` +
      `skipped(no-defaults=${skippedNoDefaults}, all-subcrops-skipped-rows=${skippedNoDtm})`,
  );

  return plants;
}
