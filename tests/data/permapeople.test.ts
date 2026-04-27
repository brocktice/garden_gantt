/**
 * @vitest-environment happy-dom
 */
// tests/data/permapeople.test.ts
// CAT-06 / CAT-07 — searchPlant() PermapeopleResult discriminated-union coverage.
// Source: .planning/phases/02-data-layer-first-end-to-end/02-03-PLAN.md (Task 2)
//         .planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md §Pattern 5

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { searchPlant } from '../../src/data/permapeople';

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('searchPlant (CAT-06 / CAT-07)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.useRealTimers();
  });

  it('returns ok with mapped EnrichmentFields when response.ok and plants[0] exists', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        plants: [
          {
            name: 'Green Zebra',
            description: 'A common garden tomato.',
            scientific_name: 'Solanum lycopersicum',
            image_url: 'https://example.com/tomato.jpg',
            data: [
              { key: 'Family', value: 'Solanaceae' },
              { key: 'Genus', value: 'Solanum' },
              { key: 'Light', value: 'Full sun' },
              { key: 'Days to harvest', value: '80-90' },
              { key: 'When to start indoors (weeks)', value: '6' },
            ],
          },
        ],
      }),
    );
    const result = await searchPlant('tomato');
    expect(result).toEqual({
      status: 'ok',
      data: {
        matchedName: 'Green Zebra',
        description: 'A common garden tomato.',
        scientificName: 'Solanum lycopersicum',
        family: 'Solanaceae',
        genus: 'Solanum',
        imageUrl: 'https://example.com/tomato.jpg',
        daysToMaturity: 80,
        weeksIndoorBeforeLastFrost: 6,
        startMethod: 'indoor-start',
      },
    });
  });

  it('returns not-found when response.ok but plants array is empty', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ plants: [] }));
    const result = await searchPlant('zzznotaplant');
    expect(result).toEqual({ status: 'not-found' });
  });

  it('returns not-found when response.ok=false and status is a 4xx (e.g. 404)', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({}, { status: 404 }));
    const result = await searchPlant('tomato');
    expect(result).toEqual({ status: 'not-found' });
  });

  it('returns rate-limited when status is 429', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({}, { status: 429 }));
    const result = await searchPlant('tomato');
    expect(result).toEqual({ status: 'rate-limited' });
  });

  it('returns unreachable/http-5xx when status >= 500', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({}, { status: 503 }));
    const result = await searchPlant('tomato');
    expect(result).toEqual({ status: 'unreachable', reason: 'http-5xx' });
  });

  it('returns unreachable/cors when fetch rejects with TypeError', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const result = await searchPlant('tomato');
    expect(result).toEqual({ status: 'unreachable', reason: 'cors' });
  });

  it('returns unreachable/timeout when AbortController fires (>8s)', async () => {
    vi.useFakeTimers();
    // Mock fetch to return a Promise that rejects only when the AbortSignal fires.
    fetchSpy.mockImplementationOnce(
      (_input: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const sig = init?.signal;
          if (sig) {
            sig.addEventListener('abort', () => {
              const err = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        }) as Promise<Response>,
    );
    const promise = searchPlant('tomato');
    // Advance past the 8s TIMEOUT_MS.
    await vi.advanceTimersByTimeAsync(8500);
    const result = await promise;
    expect(result).toEqual({ status: 'unreachable', reason: 'timeout' });
  });

  it('returns unreachable/invalid-json when body is not parseable JSON', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('<!DOCTYPE html><html>not json</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    );
    const result = await searchPlant('tomato');
    expect(result).toEqual({ status: 'unreachable', reason: 'invalid-json' });
  });

  it('mapPermapeopleToEnrichment skips non-string fields defensively (T-02-10)', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        plants: [
          {
            // Adversarial / malformed upstream data — non-string types must NOT leak through.
            description: { malicious: true },
            scientific_name: 42,
            image_url: ['array'],
            data: [{ key: 'Family', value: 'Brassicaceae' }],
          },
        ],
      }),
    );
    const result = await searchPlant('cabbage');
    expect(result).toEqual({
      status: 'ok',
      data: {
        family: 'Brassicaceae',
        // description / scientificName / genus / imageUrl are all undefined → omitted
      },
    });
  });
});
