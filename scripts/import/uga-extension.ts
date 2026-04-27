// scripts/import/uga-extension.ts
// Parser for University of Georgia Extension's "Vegetable Production Chart"
// (Bulletin C963). Source URL:
//   https://secure.caes.uga.edu/extension/publications/files/html/C963/C963VegeChart.pdf
//
// PARSER STATUS: IMPLEMENTED (DTM only)
//
// WHAT WE EXTRACT
//   Crop name (x≈53) and days-to-maturity range (x≈138-147). Many rows are
//   slash-separated multi-variety (e.g. "tomato, cherry" / "tomato,
//   determinate" / "tomato, indeterminate"); we keep the FIRST match per
//   resolved CROP_DEFAULTS key.
//
// NOT EXTRACTED
//   Cultivar names, planting dates, seeds-per-100-ft, spacing, depth.
//   Those columns are present but we don't need them — UGA's value here
//   is DTM cross-validation for crops missing in PSU/USU (mustard, okra,
//   eggplant variants, pepper variants).

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
  '../data-sources/extension-pdfs/uga-c963-vegetable-chart.pdf',
);

const PROVENANCE_BASE = {
  source: 'University of Georgia Extension',
  publication: 'Vegetable Production Chart (C963)',
  url: 'https://secure.caes.uga.edu/extension/publications/files/html/C963/C963VegeChart.pdf',
  retrieved: '2026-04-27',
  license:
    'Land-grant Smith-Lever publication; redistributable with attribution.',
} as const;

const COL_CROP = { xMin: 45, xMax: 130 };
const COL_DTM = { xMin: 130, xMax: 175 };

interface PdfTextItem {
  str: string;
  transform: number[];
}

interface UgaRow {
  cropLabel: string;
  dtm: [number, number] | null;
}

function parseRange(s: string): [number, number] | null {
  const t = s.trim();
  const m = t.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (m?.[1] && m?.[2]) return [parseInt(m[1], 10), parseInt(m[2], 10)];
  const single = t.match(/^(\d+)$/);
  if (single?.[1]) {
    const v = parseInt(single[1], 10);
    return [v, v];
  }
  return null;
}

function extractRows(pages: PdfTextItem[][]): UgaRow[] {
  const rows: UgaRow[] = [];
  for (const items of pages) {
    type Bucket = { y: number; xs: PdfTextItem[] };
    const buckets = new Map<number, Bucket>();
    for (const it of items) {
      if (it.str.trim() === '') continue;
      const x = it.transform[4] ?? 0;
      const y = it.transform[5] ?? 0;
      if (x < COL_CROP.xMin || x > COL_DTM.xMax) continue;
      // Skip the column header band (y > 500 on page 1).
      if (y > 500) continue;
      // Skip footer notes (y < 30).
      if (y < 30) continue;
      const yKey = Math.round(y / 3) * 3;
      let b = buckets.get(yKey);
      if (!b) {
        b = { y: yKey, xs: [] };
        buckets.set(yKey, b);
      }
      b.xs.push(it);
    }
    for (const b of buckets.values()) {
      let cropParts = '';
      let dtmRaw = '';
      for (const it of b.xs) {
        const x = it.transform[4] ?? 0;
        if (x >= COL_CROP.xMin && x <= COL_CROP.xMax) cropParts += ` ${it.str}`;
        else if (x >= COL_DTM.xMin && x <= COL_DTM.xMax) dtmRaw += it.str;
      }
      const cropLabel = cropParts.replace(/\s+/g, ' ').trim();
      if (!cropLabel) continue;
      rows.push({ cropLabel, dtm: parseRange(dtmRaw) });
    }
  }
  return rows;
}

/** Map UGA's labels (often "<crop>, <variety>") to CROP_DEFAULTS keys. */
function resolveDefaultsKey(name: string): string | null {
  const n = name.toLowerCase().trim();
  if (CROP_DEFAULTS[n]) return n;
  // Comma-prefixed forms — take the head as the crop.
  const head = n.split(',')[0]?.trim() ?? n;
  if (CROP_DEFAULTS[head]) return head;
  if (head === 'beans' || head === 'bean') return 'beans';
  if (head === 'beets' || head === 'beet') return 'beet';
  if (head === 'broccoli') return 'broccoli';
  if (head === 'cabbage') return 'cabbage';
  if (head === 'cantaloupe' || head === 'cantaloupes') return 'melon';
  if (head === 'carrot' || head === 'carrots') return 'carrot';
  if (head === 'cauliflower') return 'cauliflower';
  if (head === 'collards') return 'collards';
  if (head === 'corn') return 'sweet-corn';
  if (head === 'cucumber' || head === 'cucumbers') return 'cucumber';
  if (head === 'eggplant') return 'eggplant';
  if (head === 'kale') return 'kale';
  if (head === 'lettuce') return 'leaf-lettuce';
  if (head === 'mustard') return 'mustard';
  if (head === 'okra') return 'okra';
  if (head === 'onion' || head === 'onions') {
    if (n.includes('green')) return 'green-onion';
    return 'onion';
  }
  if (head === 'peas' || head === 'pea') return 'peas';
  if (head === 'pepper' || head === 'peppers') return 'pepper';
  if (head === 'potato' || head === 'potatoes') return 'potato';
  if (head === 'radish' || head === 'radishes') return 'radish';
  if (head === 'spinach') return 'spinach';
  if (head === 'squash') return 'squash';
  if (head === 'tomato' || head === 'tomatoes') return 'tomato';
  if (head === 'turnip' || head === 'turnips') return 'turnip';
  // Skip: asparagus, butterpea, pumpkin, watermelon, sweet potato.
  return null;
}

function buildTiming(defaults: CropDefaults, dtmMid: number): PlantTiming {
  const t: PlantTiming = {
    startMethod: defaults.weeksIndoorBeforeLastFrost ? 'indoor-start' : 'direct-sow',
    daysToGermination: defaults.daysToGermination,
    daysToMaturity: dtmMid,
    harvestWindowDays: defaults.harvestWindowDays,
    frostTolerance: 'half-hardy', // overlaid by Cornell/CSU
    hasFlowering: defaults.hasFlowering,
    requiresHardening: defaults.requiresHardening,
    season: 'cool', // overlaid by Cornell/PSU/CSU
  };
  if (defaults.weeksIndoorBeforeLastFrost !== undefined) {
    t.weeksIndoorBeforeLastFrost = defaults.weeksIndoorBeforeLastFrost;
    t.transplantOffsetDaysFromLastFrost = 0;
  } else {
    t.directSowOffsetDaysFromLastFrost = 0;
  }
  if (defaults.daysToHardenOff !== undefined) t.daysToHardenOff = defaults.daysToHardenOff;
  if (defaults.successionIntervalDays !== undefined)
    t.successionIntervalDays = defaults.successionIntervalDays;
  if (defaults.maxSuccessions !== undefined) t.maxSuccessions = defaults.maxSuccessions;
  return t;
}

export async function parseUgaExtension(): Promise<Plant[]> {
  if (!existsSync(PDF_PATH)) {
    console.warn(
      `[uga-extension] PDF not found at ${PDF_PATH} — skipping. Download per LICENSES.md to enable.`,
    );
    return [];
  }

  const buf = readFileSync(PDF_PATH);
  const data = new Uint8Array(buf);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const pages: PdfTextItem[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const items: PdfTextItem[] = [];
    for (const it of tc.items as PdfTextItem[]) {
      if (
        typeof it.str === 'string' &&
        it.str.trim() !== '' &&
        Array.isArray(it.transform)
      ) {
        items.push({ str: it.str, transform: it.transform });
      }
    }
    pages.push(items);
  }

  const rows = extractRows(pages);

  const plants: Plant[] = [];
  let skippedNoDefaults = 0;
  let skippedNoDtm = 0;
  const seen = new Set<string>();
  for (const r of rows) {
    if (!r.dtm) {
      skippedNoDtm++;
      continue;
    }
    const key = resolveDefaultsKey(r.cropLabel);
    if (!key) {
      skippedNoDefaults++;
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    const defaults = CROP_DEFAULTS[key];
    if (!defaults) continue;

    const dtmMid = Math.round((r.dtm[0] + r.dtm[1]) / 2);
    plants.push(
      buildCuratedPlant({
        commonName: keyToCommonName(key),
        ...(defaults.scientificName ? { scientificName: defaults.scientificName } : {}),
        category: defaults.category,
        timing: buildTiming(defaults, dtmMid),
        provenance: {
          ...PROVENANCE_BASE,
          verified: false,
          note: `UGA verifies daysToMaturity (${r.dtm[0]}-${r.dtm[1]} → midpoint ${dtmMid}). (Source label: "${r.cropLabel}".)`,
          page: 1,
          verifiedFields: ['daysToMaturity'],
        },
      }),
    );
  }

  console.log(
    `[uga-extension] rows scanned=${rows.length} emitted=${plants.length} ` +
      `skipped(no-dtm=${skippedNoDtm}, no-defaults=${skippedNoDefaults})`,
  );
  return plants;
}
