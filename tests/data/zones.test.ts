/**
 * @vitest-environment happy-dom
 */
// tests/data/zones.test.ts
// LOC-01 + LOC-04 — client-side ZIP → zone+frost lookup with structured-result return.
// Source: .planning/phases/02-data-layer-first-end-to-end/02-02-PLAN.md (Task 2)

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { lookupLocation, _resetCacheForTests } from '../../src/data/zones';

const ISO_NOON_REGEX = /^\d{4}-\d{2}-\d{2}T12:00:00\.000Z$/;

function chunkResponse(zips: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ version: 1, generatedAt: 'test', zips }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const dcRow = {
  zone: '7a',
  lat: 38.9,
  lon: -77.02,
  lastSpringFrost50: '04-15',
  firstFallFrost50: '10-20',
};

describe('lookupLocation (LOC-01, LOC-04)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    _resetCacheForTests();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns ok for a valid ZIP present in the chunk', async () => {
    fetchSpy.mockResolvedValueOnce(chunkResponse({ '20001': dcRow }));
    const result = await lookupLocation('20001', 2026);
    expect(result).toEqual({
      status: 'ok',
      zone: '7a',
      lastFrostDate: '2026-04-15T12:00:00.000Z',
      firstFrostDate: '2026-10-20T12:00:00.000Z',
    });
  });

  it('returned date strings match isoUtcNoonDate regex (schemas.ts contract)', async () => {
    fetchSpy.mockResolvedValueOnce(chunkResponse({ '20001': dcRow }));
    const result = await lookupLocation('20001', 2026);
    if (result.status !== 'ok') throw new Error(`expected ok, got ${result.status}`);
    expect(result.lastFrostDate).toMatch(ISO_NOON_REGEX);
    expect(result.firstFrostDate).toMatch(ISO_NOON_REGEX);
  });

  it('returns not-found for a malformed ZIP (non-numeric)', async () => {
    const result = await lookupLocation('abc', 2026);
    expect(result).toEqual({ status: 'not-found' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns not-found for a ZIP of wrong length', async () => {
    const result = await lookupLocation('1234', 2026);
    expect(result).toEqual({ status: 'not-found' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns not-found when valid format but ZIP missing from chunk', async () => {
    fetchSpy.mockResolvedValueOnce(chunkResponse({ '99000': dcRow }));
    const result = await lookupLocation('99999', 2026);
    expect(result).toEqual({ status: 'not-found' });
  });

  it('returns unreachable when fetch throws (network error)', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const result = await lookupLocation('20001', 2026);
    expect(result).toEqual({ status: 'unreachable' });
  });

  it('returns unreachable when response.ok is false (5xx)', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('boom', { status: 500 }));
    const result = await lookupLocation('20001', 2026);
    expect(result).toEqual({ status: 'unreachable' });
  });

  it('caches the chunk: second lookup for same firstChar does NOT fetch again', async () => {
    fetchSpy.mockResolvedValueOnce(chunkResponse({ '20001': dcRow, '20002': dcRow }));
    const first = await lookupLocation('20001', 2026);
    const second = await lookupLocation('20002', 2026);
    expect(first.status).toBe('ok');
    expect(second.status).toBe('ok');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('hits the same-origin /data/zones.{firstChar}.json path', async () => {
    fetchSpy.mockResolvedValueOnce(chunkResponse({ '20001': dcRow }));
    await lookupLocation('20001', 2026);
    expect(fetchSpy).toHaveBeenCalledWith('/data/zones.2.json');
  });

  it('uses the year argument when assembling result dates', async () => {
    fetchSpy.mockResolvedValueOnce(chunkResponse({ '20001': dcRow }));
    const result = await lookupLocation('20001', 2030);
    if (result.status !== 'ok') throw new Error(`expected ok, got ${result.status}`);
    expect(result.lastFrostDate).toBe('2030-04-15T12:00:00.000Z');
    expect(result.firstFrostDate).toBe('2030-10-20T12:00:00.000Z');
  });
});
