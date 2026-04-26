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
  description?: string;
  scientificName?: string;
  family?: string;
  genus?: string;
  imageUrl?: string;
};

export type PermapeopleResult =
  | { status: 'ok'; data: EnrichmentFields }
  | { status: 'not-found' }
  | { status: 'rate-limited' }
  | { status: 'unreachable'; reason: 'cors' | 'network' | 'timeout' | 'http-5xx' | 'invalid-json' };

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
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    // Worker proxy strips Permapeople auth headers and adds them server-side.
    // If pointing direct in dev, .env.local supplies x-permapeople-key-id/secret here too.
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
    if ((e as Error).name === 'AbortError') {
      return { status: 'unreachable', reason: 'timeout' };
    }
    // TypeError on fetch is the canonical CORS / network signal in browsers.
    // Per the live probe (02-CORS-SPIKE.md) this is the expected failure mode
    // when the Worker proxy is not yet deployed and the user is hitting
    // permapeople.org directly.
    return { status: 'unreachable', reason: 'cors' };
  }
  clearTimeout(timer);

  if (res.status === 429) return { status: 'rate-limited' };
  if (res.status >= 500) return { status: 'unreachable', reason: 'http-5xx' };
  if (!res.ok) return { status: 'not-found' };

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { status: 'unreachable', reason: 'invalid-json' };
  }

  const plants = (json as { plants?: unknown[] } | null)?.plants;
  const first = Array.isArray(plants) ? plants[0] : undefined;
  if (!first) return { status: 'not-found' };
  return {
    status: 'ok',
    data: mapPermapeopleToEnrichment(first),
  };
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
  if (typeof obj.description === 'string') out.description = obj.description;
  if (typeof obj.scientific_name === 'string') out.scientificName = obj.scientific_name;
  if (typeof obj.image_url === 'string') out.imageUrl = obj.image_url;
  if (typeof dataMap['Family'] === 'string') out.family = dataMap['Family'];
  if (typeof dataMap['Genus'] === 'string') out.genus = dataMap['Genus'];
  return out;
}

function directAuthHeadersIfDev(): Record<string, string> {
  const id = import.meta.env.VITE_PERMAPEOPLE_KEY_ID;
  const secret = import.meta.env.VITE_PERMAPEOPLE_KEY_SECRET;
  if (id && secret) {
    return { 'x-permapeople-key-id': id, 'x-permapeople-key-secret': secret };
  }
  return {};
}
