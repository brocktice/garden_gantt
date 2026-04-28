// tests/domain/succession.test.ts
// Unit tests for the pure succession pre-pass (Plan 02-06).
// Source: [CITED: 02-RESEARCH.md §Pattern 1, §Pitfall F (cap math)]
//         [CITED: 02-PATTERNS.md tests/domain/succession.test.ts]
//
// Purity: zero React/Zustand/I/O — node default test environment.

import { describe, it, expect } from 'vitest';
import { expandSuccessions } from '../../src/domain/succession';
import { unverifiedFixtureSampleCatalog as sampleCatalog } from '../../src/assets/catalog.unverified';
import { parseDate, addDays, differenceInDays } from '../../src/domain/dateWrappers';
import type { GardenPlan, Plant } from '../../src/domain/types';

function buildPlan(
  plantings: Array<{ plantId: string; successionEnabled?: boolean }>,
): GardenPlan {
  return {
    schemaVersion: 3,
    id: 'test-plan',
    name: 'Test',
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
    location: {
      zip: '20001',
      zone: '7a',
      lastFrostDate: '2026-04-15T12:00:00.000Z',
      firstFrostDate: '2026-10-20T12:00:00.000Z',
      source: 'manual',
    },
    customPlants: [],
    plantings: plantings.map((p, idx) => ({
      id: `p-${p.plantId}-${idx}`,
      plantId: p.plantId,
      successionIndex: 0,
      ...(p.successionEnabled !== undefined
        ? { successionEnabled: p.successionEnabled }
        : {}),
    })),
    customTasks: [],
    edits: [],
    completedTaskIds: [],
    settings: { units: 'imperial', weekStartsOn: 0, timezone: 'UTC' },
  };
}

describe('expandSuccessions', () => {
  it('returns plan unchanged when no plantings have successionEnabled:true', () => {
    const plan = buildPlan([{ plantId: 'lettuce', successionEnabled: false }]);
    const out = expandSuccessions(plan, sampleCatalog);
    expect(out.plantings).toHaveLength(1);
    expect(out.plantings[0]!.id).toBe(plan.plantings[0]!.id);
    expect(out.plantings[0]!.successionIndex).toBe(0);
  });

  it('uses the default interval for plants without catalog successionIntervalDays', () => {
    // tomato has no successionIntervalDays in the catalog, but the UI still lets
    // gardeners opt into a 14-day succession cadence.
    const plan = buildPlan([{ plantId: 'tomato', successionEnabled: true }]);
    const out = expandSuccessions(plan, sampleCatalog);
    expect(out.plantings.length).toBeGreaterThan(1);
    expect(out.plantings[0]!.id).toBe(plan.plantings[0]!.id);
    expect(out.plantings[1]!.startOffsetDays).toBe(14);
  });

  it('does not expand when a second planting cannot mature before first frost', () => {
    const longSeasonPlant: Plant = {
      ...sampleCatalog.get('tomato')!,
      id: 'long-season-test',
      timing: {
        ...sampleCatalog.get('tomato')!.timing,
        daysToMaturity: 175,
        maxSuccessions: 12,
      },
    };
    const catalog = new Map(sampleCatalog);
    catalog.set(longSeasonPlant.id, longSeasonPlant);
    const plan = buildPlan([
      { plantId: longSeasonPlant.id, successionEnabled: true },
    ]);
    const out = expandSuccessions(plan, catalog);

    expect(out.plantings).toHaveLength(1);
  });

  it('expands lettuce in zone 7 to 5 plantings (1 original + 4 succession, capped by maxSuccessions=4)', () => {
    // Lettuce: dtm=50, interval=14, maxSuccessions=4, directSowOffset=-28
    // baseAnchor = 2026-04-15 + (-28d) = 2026-03-18
    // daysToFirstFrost (2026-10-20 - 2026-03-18) = 216
    // maxIndex = floor((216 - 50) / 14) = 11
    // upperBound = min(11, 4) = 4 → original + 4 = 5 plantings
    const plan = buildPlan([{ plantId: 'lettuce', successionEnabled: true }]);
    const out = expandSuccessions(plan, sampleCatalog);
    expect(out.plantings).toHaveLength(5);
  });

  it('preserves identity of original planting (index 0 keeps original id and successionIndex 0)', () => {
    const plan = buildPlan([{ plantId: 'lettuce', successionEnabled: true }]);
    const out = expandSuccessions(plan, sampleCatalog);
    expect(out.plantings[0]!.id).toBe(plan.plantings[0]!.id);
    expect(out.plantings[0]!.successionIndex).toBe(0);
  });

  it('derived planting ids are `${baseId}-s${i}` with successionIndex matching i', () => {
    const plan = buildPlan([{ plantId: 'lettuce', successionEnabled: true }]);
    const out = expandSuccessions(plan, sampleCatalog);
    const baseId = plan.plantings[0]!.id;
    for (let i = 1; i < out.plantings.length; i++) {
      expect(out.plantings[i]!.successionIndex).toBe(i);
      expect(out.plantings[i]!.id).toBe(`${baseId}-s${i}`);
      expect(out.plantings[i]!.plantId).toBe('lettuce');
    }
  });

  it('cap is hard: anchor + (upperBound+1)*interval + dtm exceeds firstFrostDate (Pitfall F boundary)', () => {
    const plan = buildPlan([{ plantId: 'lettuce', successionEnabled: true }]);
    const out = expandSuccessions(plan, sampleCatalog);
    const N = out.plantings.length - 1; // upperBound; original is index 0
    expect(N).toBeGreaterThanOrEqual(1);

    // Compute boundary: would the (N+1)th succession's harvest fit?
    const lettuce = sampleCatalog.get('lettuce')!;
    const offset = lettuce.timing.directSowOffsetDaysFromLastFrost ?? 0;
    const interval = lettuce.timing.successionIntervalDays!;
    const dtm = lettuce.timing.daysToMaturity;
    const lastFrost = parseDate(plan.location.lastFrostDate);
    const firstFrost = parseDate(plan.location.firstFrostDate);
    const baseAnchor = addDays(lastFrost, offset);

    // Last in-bounds succession (index N): harvest must fit before firstFrost
    const harvestN = differenceInDays(firstFrost, addDays(baseAnchor, N * interval + dtm));
    expect(harvestN).toBeGreaterThanOrEqual(0);

    // (N+1)th succession would NOT fit (unless capped early by maxSuccessions).
    // If maxSuccessions caps before frost-cap, this assertion is skipped.
    const maxSuccessions = lettuce.timing.maxSuccessions ?? 12;
    if (N < maxSuccessions) {
      const harvestNplus1 = differenceInDays(
        firstFrost,
        addDays(baseAnchor, (N + 1) * interval + dtm),
      );
      expect(harvestNplus1).toBeLessThan(0);
    }
  });

  it('silently skips planting for unknown plantId', () => {
    const plan = buildPlan([
      { plantId: 'unknown-plant-zzzz', successionEnabled: true },
    ]);
    const out = expandSuccessions(plan, sampleCatalog);
    expect(out.plantings).toHaveLength(1);
  });

  it('does not mutate input plan', () => {
    const plan = buildPlan([{ plantId: 'lettuce', successionEnabled: true }]);
    const beforeLen = plan.plantings.length;
    const beforeId = plan.plantings[0]!.id;
    expandSuccessions(plan, sampleCatalog);
    expect(plan.plantings).toHaveLength(beforeLen);
    expect(plan.plantings[0]!.id).toBe(beforeId);
  });
});
