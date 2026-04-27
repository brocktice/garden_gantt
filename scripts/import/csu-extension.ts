// scripts/import/csu-extension.ts
// Parser for Colorado State University Extension's "CMG GardenNotes #720 —
// Vegetable Planting Guide". Source URL:
//   https://cmg.extension.colostate.edu/Gardennotes/720.pdf
//
// PARSER STATUS: IMPLEMENTED
//
// WHAT WE EXTRACT
//   Table 1 (cool-season, page 2):  Vegetable | germ temps | spacing | depth |
//                                   days-germ (range) | DTM | age-of-transplant
//   Table 2 (warm-season, page 3):  same columns
//
//   Plus: prose classifications on pages 1-3 give us a clean 3-tier
//   frostTolerance: Hardy / Semi-Hardy / Tender / Very-Tender. We map:
//     Hardy        → 'hardy'
//     Semi-Hardy   → 'half-hardy'
//     Tender       → 'tender'
//     Very Tender  → 'tender'  (engine has no separate "very tender")
//
//   "T" suffix on DTM (e.g. "65T") means days-to-harvest from transplant —
//   we use it to verify startMethod=indoor-start.
//
// NOT EXTRACTED
//   Soil temperature ranges (germination min/optimum/max). Could be used as
//   an alternative frost-tolerance heuristic but we already have prose
//   classifications which are cleaner.

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
  '../data-sources/extension-pdfs/csu-cmg-gardennotes-720.pdf',
);

const PROVENANCE_BASE = {
  source: 'Colorado State University Extension (Master Gardener)',
  publication: 'CMG GardenNotes #720 — Vegetable Planting Guide',
  url: 'https://cmg.extension.colostate.edu/Gardennotes/720.pdf',
  retrieved: '2026-04-27',
  license:
    'CSU Extension; reproducible without change for nonprofit educational use with attribution.',
} as const;

// CSU table column geometry (verified across pages 2 and 3 via _inspect-pdf.ts).
const COL_VEG = { xMin: 70, xMax: 145 };
const COL_DAYS_GERM = { xMin: 365, xMax: 405 };
const COL_DTM = { xMin: 435, xMax: 480 };

interface PdfTextItem {
  str: string;
  transform: number[];
}

interface CsuRow {
  cropLabel: string;
  daysGerm: [number, number] | null;
  dtm: [number, number] | null;
  fromTransplant: boolean; // 'T' suffix on DTM
  season: 'cool' | 'warm';
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

/** Parse the DTM cell text like "60", "65T", "60-90". */
function parseDtm(s: string): {
  range: [number, number] | null;
  fromTransplant: boolean;
} {
  const t = s.trim();
  const tFlag = /T$/.test(t);
  const cleaned = t.replace(/T$/, '');
  return { range: parseRange(cleaned), fromTransplant: tFlag };
}

function extractRowsFromTable(
  items: PdfTextItem[],
  yMin: number,
  yMax: number,
  season: 'cool' | 'warm',
): CsuRow[] {
  // 1) Classify each item by column.
  type Item = { x: number; y: number; str: string };
  const cropItems: Item[] = [];
  const germItems: Item[] = [];
  const dtmItems: Item[] = [];
  for (const it of items) {
    if (it.str.trim() === '') continue;
    const x = it.transform[4] ?? 0;
    const y = it.transform[5] ?? 0;
    if (y < yMin || y > yMax) continue;
    if (x >= COL_VEG.xMin && x <= COL_VEG.xMax)
      cropItems.push({ x, y, str: it.str });
    else if (x >= COL_DAYS_GERM.xMin && x <= COL_DAYS_GERM.xMax)
      germItems.push({ x, y, str: it.str });
    else if (x >= COL_DTM.xMin && x <= COL_DTM.xMax)
      dtmItems.push({ x, y, str: it.str });
  }

  // 2) Group germ items by y (~3-unit jitter) — each group is one data row.
  type DataRow = { y: number; germ: string; dtm: string };
  const germByY = new Map<number, string>();
  for (const it of germItems) {
    const yKey = Math.round(it.y / 3) * 3;
    germByY.set(yKey, (germByY.get(yKey) ?? '') + it.str);
  }
  const dtmByY = new Map<number, string>();
  for (const it of dtmItems) {
    const yKey = Math.round(it.y / 3) * 3;
    dtmByY.set(yKey, (dtmByY.get(yKey) ?? '') + it.str);
  }

  const dataRows: DataRow[] = [];
  for (const [y, germ] of germByY.entries()) {
    // Find the closest DTM y within ±3 units.
    let bestDtm = '';
    let bestDist = Infinity;
    for (const [dy, val] of dtmByY.entries()) {
      const d = Math.abs(dy - y);
      if (d <= 3 && d < bestDist) {
        bestDtm = val;
        bestDist = d;
      }
    }
    const germRange = parseRange(germ);
    const dtmRange = parseDtm(bestDtm);
    if (germRange && dtmRange.range) dataRows.push({ y, germ, dtm: bestDtm });
  }
  dataRows.sort((a, b) => b.y - a.y); // top-down

  // 3) Assign each crop-column item to its CLOSEST data row by y, dropping
  //    pure-digit tokens (footnote refs) and the column header "Vegetable".
  const labelByDataIdx = new Map<number, Array<{ y: number; x: number; str: string }>>();
  for (const c of cropItems) {
    if (/^\d+$/.test(c.str.trim())) continue;
    if (/^vegetable$/i.test(c.str.trim())) continue;
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < dataRows.length; i++) {
      const d = Math.abs(dataRows[i]!.y - c.y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx === -1 || bestDist > 12) continue;
    let arr = labelByDataIdx.get(bestIdx);
    if (!arr) {
      arr = [];
      labelByDataIdx.set(bestIdx, arr);
    }
    arr.push(c);
  }

  const rows: CsuRow[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const dr = dataRows[i]!;
    const parts = (labelByDataIdx.get(i) ?? [])
      .sort((a, b) => b.y - a.y || a.x - b.x)
      .map((c) => c.str);
    const cropLabel = parts
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*$/, '')
      .trim();
    if (!cropLabel) continue;
    const dtmParsed = parseDtm(dr.dtm);
    const germParsed = parseRange(dr.germ);
    if (!germParsed || !dtmParsed.range) continue;
    rows.push({
      cropLabel,
      daysGerm: germParsed,
      dtm: dtmParsed.range,
      fromTransplant: dtmParsed.fromTransplant,
      season,
    });
  }
  return rows;
}

/** Extract per-page items via pdfjs. */
async function readPdfPages(pdfPath: string): Promise<PdfTextItem[][]> {
  const buf = readFileSync(pdfPath);
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
  return pages;
}

/** Collect prose-classified frostTolerance lookup from page 1-3 text.
 *  Returns a map: lower-cased crop name → 'hardy' | 'half-hardy' | 'tender'. */
function extractFrostToleranceFromProse(
  pages: PdfTextItem[][],
): Map<string, 'hardy' | 'half-hardy' | 'tender'> {
  const out = new Map<string, 'hardy' | 'half-hardy' | 'tender'>();
  // Reconstruct full prose text per page (joined with spaces — pdfjs items
  // are not always whitespace-separated).
  const prose = pages
    .map((items) => items.map((i) => i.str).join(' '))
    .join(' ')
    .replace(/\s+/g, ' ');

  // Pattern: "Crops: <crop-list>" — the heading appears earlier, but the
  // anchor we trust is the "Crops:" prefix immediately preceding the list.
  // Capture the crop-list up to the next bullet/period/Temperatures section.
  const cropsRe =
    /(Hardy|Semi-Hardy|Very Tender|Tender)\s+Vegetables[\s\S]*?Crops:\s*([^.•]+?)(?:\s+(?:Temperatures|When to plant)\b|[.•])/gi;
  let m: RegExpExecArray | null;
  while ((m = cropsRe.exec(prose)) !== null) {
    const heading = (m[1] ?? '').toLowerCase();
    const list = m[2] ?? '';
    let tier: 'hardy' | 'half-hardy' | 'tender';
    if (heading === 'hardy') tier = 'hardy';
    else if (heading === 'semi-hardy') tier = 'half-hardy';
    else tier = 'tender'; // 'tender' or 'very tender'
    const crops = list
      .split(/[,]/)
      .map((s) => s.replace(/\s+/g, ' ').trim().toLowerCase())
      .filter((s) => s.length > 0)
      .map((s) => s.replace(/^and\s+/, ''));
    for (const c of crops) {
      out.set(c, tier);
    }
  }
  return out;
}

/** Map CSU's crop labels to CROP_DEFAULTS keys. */
function resolveDefaultsKey(name: string): string | null {
  const stripParen = name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const n = stripParen
    .toLowerCase()
    .replace(/[,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (CROP_DEFAULTS[n]) return n;
  if (n === 'beets' || n === 'beet') return 'beet';
  if (n === 'broccoli') return 'broccoli';
  if (n === 'cabbage') return 'cabbage';
  if (n === 'carrots' || n === 'carrot') return 'carrot';
  if (n === 'cauliflower') return 'cauliflower';
  if (n === 'kohlrabi') return 'kohlrabi';
  if (n === 'leeks' || n === 'leek') return 'leek';
  if (n === 'lettuce' || n === 'lettuce leaf types') return 'leaf-lettuce';
  if (n === 'onions green' || n === 'green onion') return 'green-onion';
  if (n === 'onion dry seed' || n === 'onion dry sets' || n === 'onion dry')
    return 'onion';
  if (n === 'parsnips' || n === 'parsnip') return 'parsnip';
  if (n === 'peas' || n === 'pea') return 'peas';
  if (n === 'potatoes' || n === 'potato') return 'potato';
  if (n === 'radishes' || n === 'radish') return 'radish';
  if (n === 'spinach') return 'spinach';
  if (n === 'swiss chard' || n === 'chard') return 'chard';
  if (n === 'turnips' || n === 'turnip') return 'turnip';
  if (n === 'beans snap' || n === 'beans' || n === 'snap beans') return 'beans';
  if (n === 'cantaloupe' || n === 'melons' || n === 'melon') return 'melon';
  if (n === 'corn' || n === 'sweet corn') return 'sweet-corn';
  if (n === 'cucumbers' || n === 'cucumber') return 'cucumber';
  if (n === 'eggplant') return 'eggplant';
  if (n === 'pepper' || n === 'peppers') return 'pepper';
  if (n === 'tomato' || n === 'tomatoes') return 'tomato';
  if (n === 'squash summer' || n === 'summer squash') return 'squash';
  if (n === 'squash winter' || n === 'winter squash') return 'squash';
  // No mappings for: asparagus, watermelon, lima beans, parsley (table)
  return null;
}

function buildTiming(
  defaults: CropDefaults,
  row: CsuRow,
  frostTolerance: 'tender' | 'half-hardy' | 'hardy' | null,
): PlantTiming {
  const t: PlantTiming = {
    startMethod: row.fromTransplant ? 'indoor-start' : 'direct-sow',
    daysToGermination: row.daysGerm ?? defaults.daysToGermination,
    daysToMaturity: row.dtm ? Math.round((row.dtm[0] + row.dtm[1]) / 2) : defaults.daysToMaturity,
    harvestWindowDays: defaults.harvestWindowDays,
    frostTolerance: frostTolerance ?? 'half-hardy',
    hasFlowering: defaults.hasFlowering,
    requiresHardening: defaults.requiresHardening,
    season: row.season,
  };
  if (row.fromTransplant) {
    t.weeksIndoorBeforeLastFrost = defaults.weeksIndoorBeforeLastFrost ?? 6;
    t.transplantOffsetDaysFromLastFrost = 0;
  } else {
    t.directSowOffsetDaysFromLastFrost = 0;
  }
  if (defaults.daysToHardenOff !== undefined) t.daysToHardenOff = defaults.daysToHardenOff;
  if (defaults.successionIntervalDays !== undefined)
    t.successionIntervalDays = defaults.successionIntervalDays;
  if (defaults.maxSuccessions !== undefined)
    t.maxSuccessions = defaults.maxSuccessions;
  return t;
}

export async function parseCsuExtension(): Promise<Plant[]> {
  if (!existsSync(PDF_PATH)) {
    console.warn(
      `[csu-extension] PDF not found at ${PDF_PATH} — skipping. Download per LICENSES.md to enable.`,
    );
    return [];
  }

  const pages = await readPdfPages(PDF_PATH);
  const frostMap = extractFrostToleranceFromProse(pages);

  // Page indices are 0-based here. Page 2 (cool-season table) is index 1.
  // Page 3 (warm-season table) is index 2.
  const cool = pages[1] ? extractRowsFromTable(pages[1], 350, 700, 'cool') : [];
  const warm = pages[2] ? extractRowsFromTable(pages[2], 90, 360, 'warm') : [];
  const rows = [...cool, ...warm];

  const plants: Plant[] = [];
  let skippedNoDefaults = 0;
  const seen = new Set<string>();
  for (const r of rows) {
    const key = resolveDefaultsKey(r.cropLabel);
    if (!key) {
      skippedNoDefaults++;
      console.warn(
        `[csu-extension] no CROP_DEFAULTS for "${r.cropLabel}" — skipping`,
      );
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    const defaults = CROP_DEFAULTS[key];
    if (!defaults) continue;

    // Frost-tolerance lookup: try exact match first, then try canonical key
    // and per-word matches against the prose-derived map.
    let frostTolerance: 'hardy' | 'half-hardy' | 'tender' | null = null;
    const candidates = [
      r.cropLabel.toLowerCase(),
      key,
      keyToCommonName(key).toLowerCase(),
    ];
    for (const c of candidates) {
      if (frostMap.has(c)) {
        frostTolerance = frostMap.get(c)!;
        break;
      }
    }
    // Fuzzy: prose may say "onions" while we look up "onion".
    if (!frostTolerance) {
      for (const [k, v] of frostMap.entries()) {
        if (key.includes(k) || k.includes(key)) {
          frostTolerance = v;
          break;
        }
      }
    }

    const verifiedFields: string[] = [
      'startMethod',
      'season',
      'daysToGermination',
      'daysToMaturity',
    ];
    if (frostTolerance) verifiedFields.push('frostTolerance');

    const note =
      `CSU verifies daysToGermination (${r.daysGerm?.[0]}-${r.daysGerm?.[1]}), ` +
      `daysToMaturity (${r.dtm?.[0]}${r.fromTransplant ? 'T' : ''}` +
      `${r.dtm && r.dtm[0] !== r.dtm[1] ? `-${r.dtm[1]}` : ''}), ` +
      `season=${r.season}, startMethod=${r.fromTransplant ? 'indoor-start' : 'direct-sow'}` +
      (frostTolerance
        ? `, frostTolerance=${frostTolerance} (from CSU prose).`
        : '. (frostTolerance not classifiable from CSU prose.)') +
      ` (Source label: "${r.cropLabel}".)`;

    plants.push(
      buildCuratedPlant({
        commonName: keyToCommonName(key),
        ...(defaults.scientificName
          ? { scientificName: defaults.scientificName }
          : {}),
        category: defaults.category,
        timing: buildTiming(defaults, r, frostTolerance),
        provenance: {
          ...PROVENANCE_BASE,
          verified: false,
          note,
          page: r.season === 'cool' ? 2 : 3,
          verifiedFields,
        },
      }),
    );
  }

  console.log(
    `[csu-extension] rows=${rows.length} emitted=${plants.length} ` +
      `skipped(no-defaults=${skippedNoDefaults}) ` +
      `prose-frostTolerance-mapped=${frostMap.size}`,
  );
  return plants;
}
