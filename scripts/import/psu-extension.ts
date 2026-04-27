// scripts/import/psu-extension.ts
// Parser for Penn State Extension's "Vegetable Seed Planting Guide"
// (York County Master Gardeners). Source URL:
//   https://extension.psu.edu/programs/master-gardener/counties/york/vegetable-guides/vegetable-seed-planting-guide/@@download/file/Vegetable-Seed-Planting-Guide.pdf
//
// PARSER STATUS: IMPLEMENTED
//
// WHAT WE EXTRACT
//   PSU's chart has 13 columns (rows alphabetical, 42 crops over pages 1–2):
//     Col 1: Plant
//     Col 2: (C)old or (W)arm season
//     Col 3: pH range
//     Col 4-7: Spacing/depth (skipped — not relevant to scheduler)
//     Col 8: Earliest date to sow seeds
//     Col 9: Last date to sow for full crop before first frost
//     Col 10: Days to germinate
//     Col 11: Days to maturity
//     Col 12: Date of maturity
//     Col 13: Date of last productive harvest
//
//   We verify: season, daysToGermination, daysToMaturity,
//   directSowOffsetDaysFromLastFrost, harvestWindowDays.
//
//   Crops with footnote "(7)" are transplant-best (broccoli, brussels
//   sprouts, both cabbages, cauliflower); PSU's column 8 date represents
//   direct-sow fallback rather than transplant date, so we DON'T verify
//   directSowOffset for those crops — Cornell's transplant window is the
//   trusted source there.
//
// REFERENCE FROST
//   Header reads "Last frost in Spring May 1; First frost in Fall October 1".
//   Used by absoluteDateToOffset to translate absolute dates → frost-relative.
//
// WHAT WE DO NOT VERIFY
//   - frostTolerance (PSU's C/W coarser than our hardy/half-hardy/tender;
//     Cornell verifies this with column-by-column granularity)
//   - weeksIndoorBeforeLastFrost (PSU is direct-sow-focused; UMaine verifies)
//   - Transplant offsets for (7) crops (Cornell handles those)
//
// NOTE: Tomato, Pepper, Eggplant are NOT in PSU's chart — PSU is
// direct-sow focused and excludes typical-transplant solanums.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plant, PlantTiming } from '../../src/domain/types';
import {
  CROP_DEFAULTS,
  buildCuratedPlant,
  keyToCommonName,
  absoluteDateToOffset,
  type CropDefaults,
} from './_shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_PATH = resolve(
  __dirname,
  '../data-sources/extension-pdfs/psu-vegetable-seed-planting-guide.pdf',
);

const PSU_HOME_FROST = {
  lastSpring: '05-01', // "Last frost in Spring May 1" per chart header
  firstFall: '10-01', // "First frost in Fall October 1"
} as const;

const PROVENANCE_BASE = {
  source: 'Penn State Extension (York County Master Gardeners)',
  publication: 'Vegetable Seed Planting Guide',
  url: 'https://extension.psu.edu/programs/master-gardener/counties/york/vegetable-guides/vegetable-seed-planting-guide/@@download/file/Vegetable-Seed-Planting-Guide.pdf',
  retrieved: '2026-04-27',
  license:
    'Land-grant Smith-Lever publication; redistributable with attribution.',
} as const;

// PSU column geometry (verified across pages 1 and 2 via _inspect-pdf.ts).
const COL_CROP = { xMin: 25, xMax: 145 };
const COL_SEASON = { xMin: 145, xMax: 175 };
const COL_EARLIEST_SOW = { xMin: 340, xMax: 392 };
const COL_LATEST_SOW = { xMin: 392, xMax: 440 };
const COL_DAYS_GERM = { xMin: 440, xMax: 470 };
const COL_DAYS_MATURITY = { xMin: 470, xMax: 498 };
const COL_DATE_MATURITY = { xMin: 498, xMax: 540 };
const COL_DATE_LAST_HARVEST = { xMin: 540, xMax: 600 };
// Page 1 title sits at y≈655 ("Last frost in Spring"); page 2 title at y≈716.
// Use 700 to clear page 1 title and column labels — page 2's data starts at
// y≈537 (Lettuce Head). Non-data rows are filtered downstream by the
// dgNum/dmNum integer check.
const HEADER_Y_THRESHOLD = 700;

interface PdfTextItem {
  str: string;
  transform: number[];
}

interface PsuRow {
  cropLabel: string;
  hasNote7: boolean; // (7) footnote — transplant-best
  season: 'C' | 'W' | null;
  earliestSow: string | null;
  daysGerm: number | null;
  daysMaturity: number | null;
  dateOfMaturity: string | null;
  dateOfLastHarvest: string | null;
}

function parseInt0(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const m = t.match(/^(\d+)$/);
  if (!m?.[1]) return null;
  const v = parseInt(m[1], 10);
  return Number.isFinite(v) ? v : null;
}

function isMonthDayDate(s: string): boolean {
  return /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s.trim());
}

function safeAbsoluteOffset(
  publicationDate: string,
  homeLastFrost: string,
): number | null {
  try {
    return absoluteDateToOffset({ publicationDate, homeLastFrost });
  } catch {
    return null;
  }
}

function extractRows(pages: { items: PdfTextItem[] }[]): PsuRow[] {
  const rows: PsuRow[] = [];
  for (const { items } of pages) {
    type Bucket = { y: number; xs: PdfTextItem[] };
    const buckets = new Map<number, Bucket>();
    for (const it of items) {
      if (it.str.trim() === '') continue;
      const x = it.transform[4] ?? 0;
      const y = it.transform[5] ?? 0;
      // Skip page header/title/footer regions.
      if (y > HEADER_Y_THRESHOLD || y < 50) continue;
      // Quantize y in 3-unit buckets (PSU rows are ~18 apart, headers larger).
      const yKey = Math.round(y / 3) * 3;
      let b = buckets.get(yKey);
      if (!b) {
        b = { y: yKey, xs: [] };
        buckets.set(yKey, b);
      }
      b.xs.push(it);
    }

    for (const b of buckets.values()) {
      const cropParts: string[] = [];
      let seasonRaw = '';
      const earliestSowParts: string[] = [];
      const latestSowParts: string[] = [];
      let daysGermRaw = '';
      let daysMaturityRaw = '';
      const dateOfMaturityParts: string[] = [];
      const dateOfLastHarvestParts: string[] = [];

      for (const it of b.xs) {
        const x = it.transform[4] ?? 0;
        if (x >= COL_CROP.xMin && x <= COL_CROP.xMax) cropParts.push(it.str);
        else if (x >= COL_SEASON.xMin && x <= COL_SEASON.xMax) seasonRaw += it.str;
        else if (x >= COL_EARLIEST_SOW.xMin && x <= COL_EARLIEST_SOW.xMax)
          earliestSowParts.push(it.str);
        else if (x >= COL_LATEST_SOW.xMin && x <= COL_LATEST_SOW.xMax)
          latestSowParts.push(it.str);
        else if (x >= COL_DAYS_GERM.xMin && x <= COL_DAYS_GERM.xMax)
          daysGermRaw += it.str;
        else if (x >= COL_DAYS_MATURITY.xMin && x <= COL_DAYS_MATURITY.xMax)
          daysMaturityRaw += it.str;
        else if (x >= COL_DATE_MATURITY.xMin && x <= COL_DATE_MATURITY.xMax)
          dateOfMaturityParts.push(it.str);
        else if (
          x >= COL_DATE_LAST_HARVEST.xMin &&
          x <= COL_DATE_LAST_HARVEST.xMax
        )
          dateOfLastHarvestParts.push(it.str);
      }

      const cropRaw = cropParts.join(' ').replace(/\s+/g, ' ').trim();
      if (!cropRaw) continue;
      // Skip rows that look like page headers/legends (no numbers in DTM/germ).
      const dgNum = parseInt0(daysGermRaw);
      const dmNum = parseInt0(daysMaturityRaw);
      if (dgNum === null && dmNum === null) continue;

      // Strip footnote "(7)" or similar from crop label, but track if (7) was present.
      const note7Match = cropRaw.match(/\((\d+)\)/);
      const hasNote7 = note7Match?.[1] === '7';
      const cropLabel = cropRaw.replace(/\s*\(\d+\)\s*$/, '').trim();

      const seasonClean = seasonRaw.trim().toUpperCase();
      const season =
        seasonClean === 'C' || seasonClean === 'W'
          ? (seasonClean as 'C' | 'W')
          : null;

      const earliestSowJoined = earliestSowParts
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      const earliestSow = isMonthDayDate(earliestSowJoined)
        ? earliestSowJoined
        : null;
      const dateOfMaturityJoined = dateOfMaturityParts
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      const dateOfMaturity = isMonthDayDate(dateOfMaturityJoined)
        ? dateOfMaturityJoined
        : null;
      const dateOfLastHarvestJoined = dateOfLastHarvestParts
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      const dateOfLastHarvest = isMonthDayDate(dateOfLastHarvestJoined)
        ? dateOfLastHarvestJoined
        : null;
      void latestSowParts; // intentionally unused — same info as DTM

      rows.push({
        cropLabel,
        hasNote7,
        season,
        earliestSow,
        daysGerm: dgNum,
        daysMaturity: dmNum,
        dateOfMaturity,
        dateOfLastHarvest,
      });
    }
  }
  return rows;
}

/** Map PSU's crop labels to CROP_DEFAULTS keys. */
function resolveDefaultsKey(name: string): string | null {
  const n = name.toLowerCase().trim();
  if (CROP_DEFAULTS[n]) return n;
  // PSU uses commas: "Bean, Snap, Bush" / "Cabbage, Chinese" / "Lettuce, Leaf"
  // / "Onion, Bunching" — look at first segment plus key qualifiers.
  if (/^bean,/.test(n)) return 'beans';
  if (/^cabbage, chinese/.test(n)) return 'chinese-cabbage';
  if (/^cabbage, regular/.test(n)) return 'cabbage';
  if (/^lettuce, head/.test(n)) return 'leaf-lettuce'; // collapse to lettuce
  if (/^lettuce, leaf/.test(n)) return 'leaf-lettuce';
  if (/^onion, bunching/.test(n)) return 'green-onion';
  if (/^onion, regular/.test(n)) return 'onion';
  if (/^squash, summer/.test(n)) return 'squash';
  if (/^squash, winter/.test(n)) return 'squash';
  if (n === 'beets' || n === 'beet') return 'beet';
  if (n === 'broccoli') return 'broccoli';
  if (n === 'brussel sprouts' || n === 'brussels sprouts' || n === 'brussel sprout')
    return 'brussels-sprouts';
  if (n === 'cantaloupe & melons' || n === 'melons' || n === 'melon') return 'melon';
  if (n === 'carrots' || n === 'carrot') return 'carrot';
  if (n === 'cauliflower') return 'cauliflower';
  if (n === 'celery') return 'celery';
  if (n === 'collards') return 'collards';
  if (n === 'corn') return 'sweet-corn';
  if (n === 'cucumber' || n === 'cucumbers') return 'cucumber';
  if (n === 'kale') return 'kale';
  if (n === 'kohlrabi') return 'kohlrabi';
  if (n === 'leeks' || n === 'leek') return 'leek';
  if (n === 'okra') return 'okra';
  if (n === 'parsnip' || n === 'parsnips') return 'parsnip';
  if (n === 'pea' || n === 'peas') return 'peas';
  if (n === 'radish' || n === 'radishes') return 'radish';
  if (n === 'rutabaga') return 'rutabaga';
  if (n === 'spinach') return 'spinach';
  if (n === 'swiss chard' || n === 'chard') return 'chard';
  if (n === 'turnip' || n === 'turnips') return 'turnip';
  // No mappings for: asparagus, celeriac, endive & escarole, peanut, pumpkin,
  // rhubarb, salsify, soy bean, lima bean — silently skip.
  return null;
}

function buildTiming(
  defaults: CropDefaults,
  row: PsuRow,
  directSowOffset: number | null,
  harvestWindowDays: number | null,
): PlantTiming {
  // PSU's row.daysGerm is a single value; expand to range using CROP_DEFAULTS
  // shape. UMaine will overlay with its actual range when both sources cover
  // the same crop.
  const dg: [number, number] = row.daysGerm
    ? [row.daysGerm, row.daysGerm]
    : defaults.daysToGermination;
  const dtm = row.daysMaturity ?? defaults.daysToMaturity;
  const seasonStr: 'cool' | 'warm' = row.season === 'W' ? 'warm' : 'cool';

  const t: PlantTiming = {
    startMethod: row.hasNote7 ? 'indoor-start' : 'direct-sow',
    daysToGermination: dg,
    daysToMaturity: dtm,
    harvestWindowDays: harvestWindowDays ?? defaults.harvestWindowDays,
    frostTolerance: 'half-hardy', // overlaid by Cornell where available
    hasFlowering: defaults.hasFlowering,
    requiresHardening: defaults.requiresHardening,
    season: seasonStr,
  };
  if (row.hasNote7) {
    t.weeksIndoorBeforeLastFrost = defaults.weeksIndoorBeforeLastFrost ?? 6;
    t.transplantOffsetDaysFromLastFrost = 0; // overlaid by Cornell
  } else {
    t.directSowOffsetDaysFromLastFrost = directSowOffset ?? 0;
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

export async function parseExtensionPsu(): Promise<Plant[]> {
  if (!existsSync(PDF_PATH)) {
    console.warn(
      `[psu-extension] PDF not found at ${PDF_PATH} — skipping. Download per LICENSES.md to enable.`,
    );
    return [];
  }

  const buf = readFileSync(PDF_PATH);
  const data = new Uint8Array(buf);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const pages: { items: PdfTextItem[] }[] = [];
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
    pages.push({ items });
  }

  const rows = extractRows(pages);

  const plants: Plant[] = [];
  let skippedNoDefaults = 0;
  let skippedIncomplete = 0;
  const seen = new Set<string>();
  for (const r of rows) {
    if (r.daysGerm === null && r.daysMaturity === null) {
      skippedIncomplete++;
      continue;
    }
    const key = resolveDefaultsKey(r.cropLabel);
    if (!key) {
      // Asparagus / celeriac / pumpkin / rhubarb / salsify / etc. silently skip.
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    const defaults = CROP_DEFAULTS[key];
    if (!defaults) {
      skippedNoDefaults++;
      continue;
    }

    // Compute direct-sow offset from May 1 reference (only for non-(7) crops).
    const directSowOffset =
      !r.hasNote7 && r.earliestSow
        ? safeAbsoluteOffset(r.earliestSow, PSU_HOME_FROST.lastSpring)
        : null;

    // Compute harvest window: dateOfLastHarvest - dateOfMaturity in days.
    let harvestWindowDays: number | null = null;
    if (r.dateOfMaturity && r.dateOfLastHarvest) {
      const matOffset = safeAbsoluteOffset(
        r.dateOfMaturity,
        PSU_HOME_FROST.lastSpring,
      );
      const lastHarvOffset = safeAbsoluteOffset(
        r.dateOfLastHarvest,
        PSU_HOME_FROST.lastSpring,
      );
      if (matOffset !== null && lastHarvOffset !== null) {
        const w = lastHarvOffset - matOffset;
        if (w >= 0 && w <= 200) harvestWindowDays = w;
      }
    }

    const verifiedFields: string[] = ['startMethod'];
    if (r.season) verifiedFields.push('season');
    if (r.daysGerm !== null) verifiedFields.push('daysToGermination');
    if (r.daysMaturity !== null) verifiedFields.push('daysToMaturity');
    if (directSowOffset !== null && !r.hasNote7) {
      verifiedFields.push('directSowOffsetDaysFromLastFrost');
    }
    if (harvestWindowDays !== null) verifiedFields.push('harvestWindowDays');

    const note =
      `PSU verifies: ${verifiedFields.join(', ')}. ` +
      `Reference frost: last spring ${PSU_HOME_FROST.lastSpring}, first fall ${PSU_HOME_FROST.firstFall}. ` +
      (r.hasNote7
        ? `(${r.cropLabel} has footnote (7) "transplant-best"; Cornell handles the transplant offset.) `
        : '') +
      `(Source label: "${r.cropLabel}".)`;

    plants.push(
      buildCuratedPlant({
        commonName: keyToCommonName(key),
        ...(defaults.scientificName
          ? { scientificName: defaults.scientificName }
          : {}),
        category: defaults.category,
        timing: buildTiming(defaults, r, directSowOffset, harvestWindowDays),
        provenance: {
          ...PROVENANCE_BASE,
          verified: false,
          note,
          page: 1,
          verifiedFields,
        },
      }),
    );
  }

  console.log(
    `[psu-extension] rows scanned=${rows.length} emitted=${plants.length} ` +
      `skipped(no-defaults=${skippedNoDefaults}, incomplete=${skippedIncomplete})`,
  );

  return plants;
}
