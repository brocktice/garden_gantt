// src/data/permapeople.ts
// The SOLE module in src/ that calls fetch() to Permapeople (or its Worker proxy).
// Per ARCHITECTURE.md §I/O boundary one-write rule.
// Source: [VERIFIED: live probe of permapeople.org/api/search OPTIONS returned HTTP 404 — see 02-CORS-SPIKE.md]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md §Pattern 5 lines 743-825]

const PERMAPEOPLE_BASE_URL: string =
  // VITE_ env vars are baked at build time; user picks proxy or direct in .env.local.
  // Default '/permapeople-proxy' assumes a same-origin route or Cloudflare Pages Function
  // forwarding to the deployed Worker (see cors-proxy/README.md).
  import.meta.env.VITE_PERMAPEOPLE_BASE_URL ?? '/permapeople-proxy';

const TIMEOUT_MS = 8000;

export type EnrichmentFields = {
  matchedName?: string;
  description?: string;
  scientificName?: string;
  family?: string;
  genus?: string;
  imageUrl?: string;
  daysToMaturity?: number;
  weeksIndoorBeforeLastFrost?: number;
  harvestWindowDays?: number;
  startMethod?: 'direct-sow' | 'indoor-start' | 'either';
};

export type PermapeopleResult =
  | { status: 'ok'; data: EnrichmentFields }
  | { status: 'not-found' }
  | { status: 'rate-limited' }
  | { status: 'unreachable'; reason: 'cors' | 'network' | 'timeout' | 'http-5xx' | 'invalid-json' };

// Module-level LRU cache keyed by normalized query. Persists across modal opens
// for the lifetime of the page. Re-renders are free; second search of the same
// query never hits the network.
const SEARCH_CACHE_CAP = 100;
const searchCache = new Map<string, EnrichmentFields[]>();

/** Test-only hook — call in beforeEach to isolate fetch mocks. */
export function __clearSearchCacheForTests(): void {
  searchCache.clear();
}

/**
 * Normalize a Permapeople-returned plant name to the project's "Common — Varietal"
 * convention (matching curated entries like "Tomato — Cherokee Purple").
 *
 * Permapeople returns names like:
 *   "Tomato 'Brandywine'"            → "Tomato — Brandywine"
 *   'Tomato "Cherokee Purple"'        → "Tomato — Cherokee Purple"
 *   "Solanum lycopersicum 'Brandywine'" → "Tomato — Brandywine" (when scientificName matches base)
 *   "Tomato"                          → "Tomato" (no varietal, pass through)
 *
 * Falls back to the original name on any unexpected shape.
 */
export function normalizePermapeopleName(
  rawName: string,
  scientificName?: string,
): string {
  const name = rawName.trim();
  if (!name) return name;
  // Match "<base> 'varietal'" or '<base> "varietal"' (also Unicode curly quotes).
  const m = name.match(/^(.+?)\s+['"‘’“”]([^'"‘’“”]+)['"‘’“”]\s*$/);
  if (!m || !m[1] || !m[2]) return name;
  let base = m[1].trim();
  const varietal = m[2].trim();
  // If base looks like the scientific name itself, prefer to drop it — the
  // varietal alone is unhelpful, but we have nothing better. Caller can edit.
  if (scientificName && base.toLowerCase() === scientificName.trim().toLowerCase()) {
    base = scientificName.trim();
  }
  return `${base} — ${varietal}`;
}

/**
 * Search Permapeople for a plant by free-text query (CAT-06).
 *
 * Returns a discriminated union covering every observable failure mode so the
 * caller (`CustomPlantModal` in Plan 02-09) can render a precise error state
 * without throwing. Per CAT-07, this MUST never throw — Permapeople is optional
 * enrichment and a failure here MUST NOT block scheduling.
 *
 * Pitfall I (8s timeout via AbortController): the modal close path can pass an
 * external AbortSignal in a future iteration; for now the timeout-only behavior
 * matches RESEARCH §Pattern 5.
 */
export async function searchPlant(query: string): Promise<PermapeopleResult> {
  const list = await searchPlantsInternal(query);
  if (typeof list === 'string') {
    // Error sentinel — map to the discriminated-union failure shape.
    return errorFromSentinel(list);
  }
  if (list.length === 0) return { status: 'not-found' };
  const best = pickBestMatchByEnrichment(list, query) ?? list[0];
  if (!best) return { status: 'not-found' };
  return { status: 'ok', data: best };
}

/**
 * Return the top-N ranked candidates for a free-text query. Used by the
 * autocomplete dropdown. Each result is fully mapped to EnrichmentFields,
 * so clicking one immediately populates the form.
 *
 * Network/CORS/timeout failures resolve to an empty list (autocomplete
 * silently degrades — the user can still click "Add from Permapeople" to
 * see the explicit error state). Successful queries are cached in-memory.
 */
export async function searchPlants(
  query: string,
  limit = 5,
): Promise<EnrichmentFields[]> {
  const list = await searchPlantsInternal(query);
  if (typeof list === 'string') return [];
  // Autocomplete-only filter: plants without a name are useless in a list UI.
  // Keep them upstream so searchPlant() can still return their other fields.
  const named = list.filter((e) => !!e.matchedName);
  return rankByQuery(named, query).slice(0, limit);
}

/** Returns the mapped candidate list, or an error sentinel string. */
async function searchPlantsInternal(
  query: string,
): Promise<EnrichmentFields[] | string> {
  const cacheKey = query.trim().toLowerCase();
  if (!cacheKey) return [];
  const cached = searchCache.get(cacheKey);
  if (cached) {
    // LRU touch: re-insert at end.
    searchCache.delete(cacheKey);
    searchCache.set(cacheKey, cached);
    return cached;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${PERMAPEOPLE_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...directAuthHeadersIfDev(),
      },
      body: JSON.stringify({ q: query }),
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if ((e as Error).name === 'AbortError') return 'timeout';
    return 'cors';
  }
  clearTimeout(timer);

  if (res.status === 429) return 'rate-limited';
  if (res.status >= 500) return 'http-5xx';
  if (!res.ok) return 'not-found';

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return 'invalid-json';
  }

  const plants = (json as { plants?: unknown[] } | null)?.plants;
  if (!Array.isArray(plants) || plants.length === 0) return [];

  const mapped = plants.map(mapPermapeopleToEnrichment);

  // Cache and LRU-trim.
  searchCache.set(cacheKey, mapped);
  if (searchCache.size > SEARCH_CACHE_CAP) {
    const oldest = searchCache.keys().next().value;
    if (oldest !== undefined) searchCache.delete(oldest);
  }
  return mapped;
}

function errorFromSentinel(s: string): PermapeopleResult {
  switch (s) {
    case 'rate-limited':
      return { status: 'rate-limited' };
    case 'not-found':
      return { status: 'not-found' };
    case 'timeout':
      return { status: 'unreachable', reason: 'timeout' };
    case 'cors':
      return { status: 'unreachable', reason: 'cors' };
    case 'http-5xx':
      return { status: 'unreachable', reason: 'http-5xx' };
    case 'invalid-json':
      return { status: 'unreachable', reason: 'invalid-json' };
    default:
      return { status: 'not-found' };
  }
}

function pickBestMatchByEnrichment(
  list: EnrichmentFields[],
  query: string,
): EnrichmentFields | undefined {
  const ranked = rankByQuery(list, query);
  return ranked[0];
}

/**
 * Stable-sort candidates by query relevance (exact > startsWith > contains > other),
 * preserving Permapeople's original order within each tier.
 */
function rankByQuery(list: EnrichmentFields[], query: string): EnrichmentFields[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...list];
  const score = (e: EnrichmentFields): number => {
    const name = (e.matchedName ?? '').toLowerCase();
    const sci = (e.scientificName ?? '').toLowerCase();
    if (name === q || sci === q) return 0;
    if (name.startsWith(q) || sci.startsWith(q)) return 1;
    if (name.includes(q) || sci.includes(q)) return 2;
    return 3;
  };
  return [...list]
    .map((e, i) => ({ e, i, s: score(e) }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.e);
}

function mapPermapeopleToEnrichment(p: unknown): EnrichmentFields {
  // Permapeople returns `data: [{key, value}, ...]` per API docs (CC BY-SA 4.0).
  // Defensive shape parsing — T-02-10 mitigation: only string values leak through.
  const obj = (p ?? {}) as Record<string, unknown>;
  const dataArr = Array.isArray(obj.data) ? obj.data : [];
  const dataMap: Record<string, string> = {};
  for (const kv of dataArr) {
    if (
      kv && typeof kv === 'object'
      && typeof (kv as { key?: unknown }).key === 'string'
      && typeof (kv as { value?: unknown }).value === 'string'
    ) {
      const { key, value } = kv as { key: string; value: string };
      dataMap[key] = value;
    }
  }
  const out: EnrichmentFields = {};
  const sci = typeof obj.scientific_name === 'string' ? obj.scientific_name : undefined;
  if (typeof obj.name === 'string') {
    out.matchedName = normalizePermapeopleName(obj.name, sci);
  }
  if (typeof obj.description === 'string') out.description = obj.description;
  if (sci) out.scientificName = sci;
  if (typeof obj.image_url === 'string') out.imageUrl = obj.image_url;
  if (typeof dataMap['Family'] === 'string') out.family = dataMap['Family'];
  if (typeof dataMap['Genus'] === 'string') out.genus = dataMap['Genus'];
  const maturity = firstInt(
    dataMap['Days to maturity'] ??
      dataMap['Days to harvest'] ??
      dataMap['Time to harvest'],
  );
  if (maturity !== undefined) out.daysToMaturity = maturity;
  const indoorWeeks = firstInt(
    dataMap['When to start indoors (weeks)'] ??
      dataMap['Weeks before last frost'] ??
      dataMap['Start seeds indoors (weeks)'],
  );
  if (indoorWeeks !== undefined) out.weeksIndoorBeforeLastFrost = indoorWeeks;
  const harvestWindow = firstInt(
    dataMap['Harvest window'] ?? dataMap['Harvest window days'],
  );
  if (harvestWindow !== undefined) out.harvestWindowDays = harvestWindow;
  const transplantText = dataMap['Propagation - Transplanting'] ?? '';
  const directText = dataMap['Propagation - Direct sowing'] ?? '';
  if (indoorWeeks !== undefined || /indoors/i.test(transplantText)) {
    out.startMethod = 'indoor-start';
  } else if (directText) {
    out.startMethod = 'direct-sow';
  }
  return out;
}

function firstInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.match(/\d+/);
  if (!match) return undefined;
  const n = Number(match[0]);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function directAuthHeadersIfDev(): Record<string, string> {
  const id = import.meta.env.VITE_PERMAPEOPLE_KEY_ID;
  const secret = import.meta.env.VITE_PERMAPEOPLE_KEY_SECRET;
  if (id && secret) {
    return { 'x-permapeople-key-id': id, 'x-permapeople-key-secret': secret };
  }
  return {};
}
