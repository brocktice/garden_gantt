// scripts/acquire-zone-data.ts
// Network step: downloads raw frostline + NOAA Normals inputs to scripts/data-sources/.
// Idempotent: skips files that already exist (use --force to re-download).
//
// Run: `npm run acquire:data` (or `-- --force` to refresh).
// Source: [VERIFIED: waldoj/frostline raw GitHub CSV — github.com/waldoj/frostline]
//         [VERIFIED: NOAA NCEI 1991-2020 Climate Normals — ncei.noaa.gov/products/coordinates/frost-freeze]
//
// Output schema:
//   - scripts/data-sources/frostline.csv: zip,zone,lat,lon (~29-42K rows)
//   - scripts/data-sources/noaa-normals-ann.csv: station_id,lat,lon,last_spring_50_mmdd,first_fall_50_mmdd
//
// On failure: logs structured error to stderr, exits non-zero. Build script then falls
// back to SEED_FALLBACK.json automatically (Plan 02-02 §Decision Log row 2).

import { existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, 'data-sources');
const FROSTLINE_OUT = resolve(DATA_DIR, 'frostline.csv');
const NOAA_OUT = resolve(DATA_DIR, 'noaa-normals-ann.csv');

// Frostline zipcode + lat/lon source. The legacy PRISM zone CSVs referenced in
// frostline.py (phzm_us_zipcode_2023.csv) returned 404 at acquisition time —
// the historical zone column is no longer published in raw form. We download
// the ZIP centroid CSV and synthesize zones via a documented latitude-band
// heuristic (USDA 2023 Plant Hardiness Zone Map proxy).
const FROSTLINE_ZIPCODES_URL = 'https://raw.githubusercontent.com/waldoj/frostline/master/zipcodes.csv';

// NOAA NCEI 1991–2020 Climate Normals — annual frost-freeze probability product index.
// The bulk-product CSV URL pattern requires station-by-station fetching from the
// portal at https://www.ncei.noaa.gov/products/coordinates/frost-freeze. The simple
// raw-download path used by frostline.py is no longer published; the NOAA portal
// gates downloads through a session-cookie form. Acquisition is best-effort: if the
// portal is unreachable or the format has changed, the script logs a clear failure
// and exits non-zero so the build script falls back to SEED_FALLBACK.json.
const NOAA_NORMALS_INDEX_URL = 'https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/';

const force = process.argv.includes('--force');

function zoneFromLat(lat: number): string {
  // Documented heuristic: USDA 2023 Plant Hardiness Zone Map approximation by latitude
  // band (CONUS east-of-Rockies modal zone). Western/elevation effects unmodeled in this
  // synthesis; SEED_FALLBACK is the authoritative fallback for downstream consumers.
  if (lat >= 49) return '3a';
  if (lat >= 47) return '4a';
  if (lat >= 45) return '4b';
  if (lat >= 43) return '5a';
  if (lat >= 41.5) return '5b';
  if (lat >= 40) return '6a';
  if (lat >= 38.5) return '6b';
  if (lat >= 37) return '7a';
  if (lat >= 35) return '7b';
  if (lat >= 33) return '8a';
  if (lat >= 31) return '8b';
  if (lat >= 29) return '9a';
  if (lat >= 27) return '9b';
  if (lat >= 25) return '10a';
  return '10b';
}

async function fetchFrostline(): Promise<void> {
  if (existsSync(FROSTLINE_OUT) && !force) {
    console.log(`SKIP frostline.csv (exists; use --force to re-download)`);
    return;
  }
  console.log(`Fetching ${FROSTLINE_ZIPCODES_URL}...`);
  const res = await fetch(FROSTLINE_ZIPCODES_URL);
  if (!res.ok) throw new Error(`frostline fetch failed: ${res.status} ${res.statusText}`);
  const csv = await res.text();
  const lines = csv.split('\n').filter((l) => l.trim().length > 0);
  console.log(`Got ${lines.length - 1} rows. Synthesizing zone column from latitude band...`);

  const out: string[] = ['zip,zone,lat,lon'];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i]!.split(',');
    if (parts.length < 5) continue;
    const zip = parts[0]!.trim();
    if (zip.length !== 5) continue;
    const lat = parseFloat(parts[3]!);
    const lon = parseFloat(parts[4]!);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
    out.push(`${zip},${zoneFromLat(lat)},${lat},${lon}`);
  }
  writeFileSync(FROSTLINE_OUT, out.join('\n') + '\n');
  console.log(`Wrote ${FROSTLINE_OUT} (${out.length - 1} rows)`);
}

async function fetchNOAANormals(): Promise<void> {
  if (existsSync(NOAA_OUT) && !force) {
    console.log(`SKIP noaa-normals-ann.csv (exists; use --force to re-download)`);
    return;
  }
  console.log(`Probing NOAA NCEI normals index ${NOAA_NORMALS_INDEX_URL}...`);
  const res = await fetch(NOAA_NORMALS_INDEX_URL, { method: 'HEAD' });
  if (!res.ok) {
    throw new Error(
      `NOAA Normals index unreachable: ${res.status} ${res.statusText}. ` +
        `Manual acquisition required: visit ${NOAA_NORMALS_INDEX_URL} and download ` +
        `ANN-TMIN-PRBLST-T28FP90 + ANN-TMIN-PRBFST-T28FP90 station files. ` +
        `Join on station_id and write to ${NOAA_OUT} with columns ` +
        `station_id,lat,lon,last_spring_50_mmdd,first_fall_50_mmdd.`,
    );
  }
  // Even when the index is reachable, the per-station CSV format requires custom
  // parsing per NOAA's `prdesc` headers. Bulk acquisition is left as a manual step
  // (documented in scripts/data-sources/README.md) — the portal blocks anonymous
  // bulk fetches via session cookies. SEED_FALLBACK ships canonical 50-metro
  // values until a human runs the manual NOAA acquisition.
  throw new Error(
    `NOAA Normals bulk acquisition not automated (format requires per-station joins). ` +
      `Follow the manual procedure in scripts/data-sources/README.md.`,
  );
}

async function main(): Promise<void> {
  console.log(`acquire-zone-data: target dir = ${DATA_DIR}, force = ${force}`);
  let frostlineOk = false;
  let noaaOk = false;
  try {
    await fetchFrostline();
    frostlineOk = true;
  } catch (err) {
    console.error(`frostline acquisition failed: ${(err as Error).message}`);
  }
  try {
    await fetchNOAANormals();
    noaaOk = true;
  } catch (err) {
    console.error(`NOAA Normals acquisition failed: ${(err as Error).message}`);
  }
  console.log(`acquire summary: frostline=${frostlineOk ? 'ok' : 'fail'}, noaa=${noaaOk ? 'ok' : 'fail'}`);
  if (!frostlineOk || !noaaOk) {
    console.error(
      `Partial acquisition. Build will use SEED_FALLBACK.json fallback path. ` +
        `See scripts/data-sources/README.md for manual NOAA acquisition steps.`,
    );
    process.exit(1);
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
