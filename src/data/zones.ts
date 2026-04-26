// src/data/zones.ts
// The SOLE module in src/ that fetches /data/zones.{n}.json static assets.
// Per ARCHITECTURE.md §I/O boundary one-write rule.
// Source: [CITED: .planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md §Pattern 2, §Code Example A]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-02-PLAN.md Task 2]

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

// Per-first-digit chunk cache. Negative-cache (null) on fetch failure to avoid
// retry storms when the user types/edits the ZIP in the wizard form (LOC-01).
const cache = new Map<number, Record<string, ZoneRow> | null>();

export type LookupResult =
  | { status: 'ok'; zone: string; lastFrostDate: string; firstFrostDate: string }
  | { status: 'not-found' }
  | { status: 'unreachable' };

/**
 * ZIP → zone + frost-date lookup against same-origin static chunks at
 * /data/zones.{firstChar}.json. Validates the ZIP format before any I/O so a
 * mistyped value never triggers a 404 fetch.
 *
 * Returns one of three discriminated-union statuses (CONTEXT D-06):
 *   - ok: ZIP is in the chunk; caller renders zone + assembled UTC-noon dates
 *   - not-found: ZIP is malformed OR missing from chunk → wizard pivots to manual entry
 *   - unreachable: fetch error or 5xx → wizard surfaces a retry hint
 *
 * Date strings are assembled with the caller-supplied `year` argument so the
 * lookup is year-agnostic; consumers (Plan 02-08 SetupStepLocation) pass the
 * current calendar year (`currentYear()` from dateWrappers).
 */
export async function lookupLocation(zip: string, year: number): Promise<LookupResult> {
  if (!/^\d{5}$/.test(zip)) return { status: 'not-found' };
  const firstChar = parseInt(zip[0]!, 10);

  let chunk = cache.get(firstChar);
  if (chunk === undefined) {
    try {
      const res = await fetch(`/data/zones.${firstChar}.json`);
      if (!res.ok) {
        cache.set(firstChar, null);
        return { status: 'unreachable' };
      }
      const json = (await res.json()) as ChunkFile;
      chunk = json.zips;
      cache.set(firstChar, chunk);
    } catch {
      cache.set(firstChar, null);
      return { status: 'unreachable' };
    }
  }
  if (!chunk) return { status: 'unreachable' };

  const row = chunk[zip];
  if (!row) return { status: 'not-found' };

  return {
    status: 'ok',
    zone: row.zone,
    lastFrostDate: `${year}-${row.lastSpringFrost50}T12:00:00.000Z`,
    firstFrostDate: `${year}-${row.firstFallFrost50}T12:00:00.000Z`,
  };
}

/**
 * Test-only: clear the in-memory chunk cache between vitest cases so the
 * fetch-call-count assertions remain deterministic. Not exported from any
 * production import path.
 */
export function _resetCacheForTests(): void {
  cache.clear();
}
