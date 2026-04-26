// scripts/build-zone-data.ts
// Pure transform: scripts/data-sources/* → public/data/zones.{0..9}.json.
// No network calls. Reproducible offline from committed raw inputs.
//
// Run: `npm run build:data`. Output committed to git.
// Source: [CITED: .planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md §Pattern 2 lines 451-527]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-02-PLAN.md Task 1 algorithm]
//
// Algorithm:
//   1. Try to read scripts/data-sources/frostline.csv + noaa-normals-ann.csv.
//      If both present and >1000 rows: full-coverage path
//        a. Parse frostline → Record<zip, {zone, lat, lon}>
//        b. Parse NOAA → Array<station>
//        c. Join: each ZIP → nearest NOAA station by Haversine on (lat, lon)
//        d. Carry frost dates from station to ZIP
//      Otherwise: fallback path
//        e. Read SEED_FALLBACK.json (already pre-joined; ≥3000 ZIPs across 50 metros)
//   2. Split joined records by zip[0] → 10 chunks.
//   3. Write public/data/zones.{0..9}.json with shape { version: 1, generatedAt, zips }.
//   4. Validate every chunk has ≥1 entry; total ≥3000 (fallback floor).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, 'data-sources');
const OUTPUT_DIR = resolve(__dirname, '../public/data');
const FROSTLINE = resolve(DATA_DIR, 'frostline.csv');
const NOAA = resolve(DATA_DIR, 'noaa-normals-ann.csv');
const SEED_FALLBACK = resolve(DATA_DIR, 'SEED_FALLBACK.json');

interface ZoneRow {
  zone: string;
  lat: number;
  lon: number;
  lastSpringFrost50: string; // "MM-DD"
  firstFallFrost50: string; // "MM-DD"
}

interface ChunkFile {
  version: 1;
  generatedAt: string;
  zips: Record<string, ZoneRow>;
}

interface FrostlineRow {
  zip: string;
  zone: string;
  lat: number;
  lon: number;
}

interface NoaaStation {
  stationId: string;
  lat: number;
  lon: number;
  lastSpringMMDD: string;
  firstFallMMDD: string;
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function parseCsv(text: string): string[][] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.split(','));
}

function parseFrostline(text: string): FrostlineRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0]!;
  const out: FrostlineRow[] = [];
  // Expected columns: zip,zone,lat,lon
  const iZip = header.indexOf('zip');
  const iZone = header.indexOf('zone');
  const iLat = header.indexOf('lat');
  const iLon = header.indexOf('lon');
  if (iZip < 0 || iZone < 0 || iLat < 0 || iLon < 0) {
    throw new Error(`frostline.csv header missing required columns. Got: ${header.join(',')}`);
  }
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    const zip = r[iZip]!.trim();
    if (!/^\d{5}$/.test(zip)) continue;
    const lat = parseFloat(r[iLat]!);
    const lon = parseFloat(r[iLon]!);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
    out.push({ zip, zone: r[iZone]!.trim(), lat, lon });
  }
  return out;
}

function parseNoaa(text: string): NoaaStation[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0]!;
  const iId = header.indexOf('station_id');
  const iLat = header.indexOf('lat');
  const iLon = header.indexOf('lon');
  const iSpring = header.indexOf('last_spring_50_mmdd');
  const iFall = header.indexOf('first_fall_50_mmdd');
  if (iId < 0 || iLat < 0 || iLon < 0 || iSpring < 0 || iFall < 0) {
    throw new Error(`noaa-normals-ann.csv header missing required columns. Got: ${header.join(',')}`);
  }
  const out: NoaaStation[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    const lat = parseFloat(r[iLat]!);
    const lon = parseFloat(r[iLon]!);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
    out.push({
      stationId: r[iId]!.trim(),
      lat,
      lon,
      lastSpringMMDD: r[iSpring]!.trim(),
      firstFallMMDD: r[iFall]!.trim(),
    });
  }
  return out;
}

function nearestStation(target: { lat: number; lon: number }, stations: NoaaStation[]): NoaaStation {
  let best = stations[0]!;
  let bestDist = haversineKm(target, best);
  for (let i = 1; i < stations.length; i++) {
    const d = haversineKm(target, stations[i]!);
    if (d < bestDist) {
      best = stations[i]!;
      bestDist = d;
    }
  }
  return best;
}

function buildFromFullCoverage(): Record<string, ZoneRow> {
  const frostlineText = readFileSync(FROSTLINE, 'utf8');
  const noaaText = readFileSync(NOAA, 'utf8');
  const frostline = parseFrostline(frostlineText);
  const noaa = parseNoaa(noaaText);
  console.log(`full-coverage: ${frostline.length} ZIPs × ${noaa.length} stations`);
  const out: Record<string, ZoneRow> = {};
  for (const fr of frostline) {
    const station = nearestStation(fr, noaa);
    out[fr.zip] = {
      zone: fr.zone,
      lat: fr.lat,
      lon: fr.lon,
      lastSpringFrost50: station.lastSpringMMDD,
      firstFallFrost50: station.firstFallMMDD,
    };
  }
  return out;
}

function buildFromFallback(): Record<string, ZoneRow> {
  if (!existsSync(SEED_FALLBACK)) {
    throw new Error(`SEED_FALLBACK.json not found at ${SEED_FALLBACK} (this should never happen — file is committed)`);
  }
  const seed = JSON.parse(readFileSync(SEED_FALLBACK, 'utf8')) as Record<string, unknown>;
  const out: Record<string, ZoneRow> = {};
  for (const [zip, row] of Object.entries(seed)) {
    if (zip === '_meta') continue;
    if (!/^\d{5}$/.test(zip)) continue;
    out[zip] = row as ZoneRow;
  }
  return out;
}

function shouldUseFullCoverage(): boolean {
  if (!existsSync(FROSTLINE) || !existsSync(NOAA)) return false;
  const frLines = readFileSync(FROSTLINE, 'utf8').split('\n').filter((l) => l.trim().length > 0).length;
  const noaaLines = readFileSync(NOAA, 'utf8').split('\n').filter((l) => l.trim().length > 0).length;
  return frLines > 1000 && noaaLines > 1000;
}

function main(): void {
  console.log(`build-zone-data: output dir = ${OUTPUT_DIR}`);
  const useFull = shouldUseFullCoverage();
  const mode: 'full-coverage' | 'fallback' = useFull ? 'full-coverage' : 'fallback';
  if (!useFull) {
    console.warn(`Raw inputs unavailable or insufficient — building from SEED_FALLBACK.json`);
  }
  const records = useFull ? buildFromFullCoverage() : buildFromFallback();
  const totalZips = Object.keys(records).length;

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  // Split by first ZIP digit.
  const chunks: Record<string, Record<string, ZoneRow>> = {};
  for (let d = 0; d < 10; d++) chunks[String(d)] = {};
  for (const [zip, row] of Object.entries(records)) {
    const d = zip[0]!;
    chunks[d]![zip] = row;
  }

  const generatedAt = new Date().toISOString();
  for (let d = 0; d < 10; d++) {
    const digit = String(d);
    const zips = chunks[digit]!;
    const count = Object.keys(zips).length;
    if (count === 0) {
      throw new Error(`Chunk zones.${digit}.json would be empty — refusing to write.`);
    }
    const file: ChunkFile = { version: 1, generatedAt, zips };
    const out = resolve(OUTPUT_DIR, `zones.${digit}.json`);
    writeFileSync(out, JSON.stringify(file, null, 2) + '\n');
    console.log(`wrote zones.${digit}.json (${count} zips)`);
  }

  if (totalZips < 3000) {
    throw new Error(`Total ZIP count ${totalZips} below fallback floor of 3000.`);
  }

  // Verify the canonical 20001 row.
  const zip20001 = records['20001'];
  if (!zip20001) {
    throw new Error(`Canonical ZIP 20001 missing from output.`);
  }
  if (zip20001.zone !== '7a' || zip20001.lastSpringFrost50 !== '04-15' || zip20001.firstFallFrost50 !== '10-20') {
    console.warn(
      `WARNING: 20001 has zone=${zip20001.zone}, lastSpringFrost50=${zip20001.lastSpringFrost50}, ` +
        `firstFallFrost50=${zip20001.firstFallFrost50} — expected 7a / 04-15 / 10-20 (Phase 1 canonical). ` +
        `Phase 1 snapshot consistency requires the canonical pin in SEED_FALLBACK.json.`,
    );
  }

  console.log(`built ${totalZips} entries across 10 chunks (mode: ${mode})`);
}

main();
