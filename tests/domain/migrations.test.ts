// tests/domain/migrations.test.ts
// Single-source-of-truth schema migration (Pitfall E mitigation).
// Source: .planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md §Pattern 4
//         .planning/phases/02-data-layer-first-end-to-end/02-PATTERNS.md migrations.ts (NEW)
//         .planning/phases/02-data-layer-first-end-to-end/02-01-PLAN.md Task 2
import { describe, it, expect } from 'vitest';
import { migrateToCurrent, CURRENT_SCHEMA_VERSION } from '../../src/domain/migrations';

describe('CURRENT_SCHEMA_VERSION', () => {
  it('is 2 (Phase 2)', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
  });
});

describe('migrateToCurrent — v1 → v2 normalization', () => {
  it('returns object with plan === null when input plan is null', () => {
    const result = migrateToCurrent({ plan: null }, 1) as { plan: unknown };
    expect(result.plan).toBeNull();
  });

  it('stamps schemaVersion: 2, adds location.overrides: {}, adds successionEnabled: false to every planting', () => {
    const v1Plan = {
      schemaVersion: 1 as const,
      id: 'p1',
      name: 'old plan',
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
      plantings: [
        { id: 'p-tomato-0', plantId: 'tomato', successionIndex: 0 },
        { id: 'p-lettuce-0', plantId: 'lettuce', successionIndex: 0 },
      ],
      customTasks: [],
      edits: [],
      settings: { units: 'imperial', weekStartsOn: 0, timezone: 'America/New_York' },
    };

    const result = migrateToCurrent({ plan: v1Plan }, 1) as {
      plan: {
        schemaVersion: number;
        location: { overrides?: Record<string, boolean> };
        plantings: { successionEnabled?: boolean }[];
      };
    };

    expect(result.plan.schemaVersion).toBe(2);
    expect(result.plan.location.overrides).toEqual({});
    expect(result.plan.plantings).toHaveLength(2);
    for (const p of result.plan.plantings) {
      expect(p.successionEnabled).toBe(false);
    }
  });

  it('idempotent when fromVersion === CURRENT_SCHEMA_VERSION (no migration runs)', () => {
    const alreadyV2 = {
      plan: {
        schemaVersion: 2,
        id: 'p1',
        location: { overrides: { zone: true } },
        plantings: [{ id: 'x', successionEnabled: true }],
      },
    };
    const result = migrateToCurrent(alreadyV2, 2);
    expect(result).toEqual(alreadyV2);
  });

  it('returns input unchanged when state is not an object (defensive)', () => {
    expect(migrateToCurrent('not-an-object', 1)).toBe('not-an-object');
    expect(migrateToCurrent(null, 1)).toBe(null);
    expect(migrateToCurrent(undefined, 1)).toBe(undefined);
  });
});
