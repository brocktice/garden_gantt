// tests/domain/migrations.test.ts
// Single-source-of-truth schema migration (Pitfall E mitigation).
// Source: .planning/phases/02-data-layer-first-end-to-end/02-RESEARCH.md §Pattern 4
//         .planning/phases/02-data-layer-first-end-to-end/02-PATTERNS.md migrations.ts (NEW)
//         .planning/phases/02-data-layer-first-end-to-end/02-01-PLAN.md Task 2
//         .planning/phases/03-drag-cascade-calendar-tasks/03-01-PLAN.md Task 1 (v2→v3 + chained v1→v3)
import { describe, it, expect } from 'vitest';
import { migrateToCurrent, CURRENT_SCHEMA_VERSION } from '../../src/domain/migrations';

describe('CURRENT_SCHEMA_VERSION', () => {
  it('is 3 (Phase 3)', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(3);
  });
});

describe('migrateToCurrent — v1 → v2 normalization', () => {
  it('returns object with plan === null when input plan is null', () => {
    const result = migrateToCurrent({ plan: null }, 1) as { plan: unknown };
    expect(result.plan).toBeNull();
  });

  it('returns input unchanged when state is not an object (defensive)', () => {
    expect(migrateToCurrent('not-an-object', 1)).toBe('not-an-object');
    expect(migrateToCurrent(null, 1)).toBe(null);
    expect(migrateToCurrent(undefined, 1)).toBe(undefined);
  });
});

describe('migrateToCurrent — v2 → v3 (Phase 3 D-13: per-event lock map)', () => {
  it('stamps schemaVersion: 3 and defaults plantings[].locks to {} on a v2 plan with no locks', () => {
    const v2Plan = {
      schemaVersion: 2 as const,
      id: 'p1',
      name: 'v2 plan',
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
      location: {
        zip: '20001',
        zone: '7a',
        lastFrostDate: '2026-04-15T12:00:00.000Z',
        firstFrostDate: '2026-10-20T12:00:00.000Z',
        source: 'manual',
        overrides: {},
      },
      customPlants: [],
      plantings: [
        { id: 'p-tomato-0', plantId: 'tomato', successionIndex: 0, successionEnabled: false },
      ],
      customTasks: [],
      edits: [],
      settings: { units: 'imperial', weekStartsOn: 0, timezone: 'America/New_York' },
    };

    const result = migrateToCurrent({ plan: v2Plan }, 2) as {
      plan: {
        schemaVersion: number;
        plantings: { locks?: Record<string, boolean> }[];
        completedTaskIds?: string[];
      };
    };

    expect(result.plan.schemaVersion).toBe(3);
    expect(result.plan.plantings).toHaveLength(1);
    expect(result.plan.plantings[0]!.locks).toEqual({});
    expect(result.plan.completedTaskIds).toEqual([]);
  });

  it('idempotent when fromVersion === CURRENT_SCHEMA_VERSION (v3 → v3 is identity)', () => {
    const alreadyV3 = {
      plan: {
        schemaVersion: 3,
        id: 'p1',
        plantings: [{ id: 'x', successionEnabled: true, locks: {} }],
        completedTaskIds: [],
      },
    };
    const result = migrateToCurrent(alreadyV3, 3);
    expect(result).toEqual(alreadyV3);
  });

  it('preserves existing locks when v3 migration step runs (??=, not overwrite)', () => {
    // Simulate a re-application where plantings already have locks.transplant=true.
    // The migration uses `locks: p.locks ?? {}` defaulting; existing locks must survive.
    const planWithLocks = {
      schemaVersion: 2 as const,
      id: 'p1',
      name: 'plan',
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
      location: {
        zip: '20001',
        zone: '7a',
        lastFrostDate: '2026-04-15T12:00:00.000Z',
        firstFrostDate: '2026-10-20T12:00:00.000Z',
        source: 'manual',
        overrides: {},
      },
      customPlants: [],
      plantings: [
        {
          id: 'p-tomato',
          plantId: 'tomato',
          successionIndex: 0,
          successionEnabled: false,
          locks: { transplant: true },
        },
      ],
      customTasks: [],
      edits: [],
      settings: { units: 'imperial', weekStartsOn: 0, timezone: 'America/New_York' },
    };

    const result = migrateToCurrent({ plan: planWithLocks }, 2) as {
      plan: { plantings: { locks: Record<string, boolean> }[] };
    };
    expect(result.plan.plantings[0]!.locks).toEqual({ transplant: true });
  });

  it('preserves existing completedTaskIds on v3 migration (?? defaulting)', () => {
    const planWithCompleted = {
      schemaVersion: 2 as const,
      id: 'p1',
      name: 'plan',
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
      location: {
        zip: '20001',
        zone: '7a',
        lastFrostDate: '2026-04-15T12:00:00.000Z',
        firstFrostDate: '2026-10-20T12:00:00.000Z',
        source: 'manual',
        overrides: {},
      },
      customPlants: [],
      plantings: [],
      customTasks: [],
      edits: [],
      completedTaskIds: ['task-1', 'task-2:2026-05-01'],
      settings: { units: 'imperial', weekStartsOn: 0, timezone: 'America/New_York' },
    };

    const result = migrateToCurrent({ plan: planWithCompleted }, 2) as {
      plan: { completedTaskIds: string[] };
    };
    expect(result.plan.completedTaskIds).toEqual(['task-1', 'task-2:2026-05-01']);
  });
});

describe('migrateToCurrent — chained v1 → v3 (Pitfall 10: v1 envelopes must reach v3, not just v2)', () => {
  it('a v1-shape plan migrates to v3 with all defaults populated in one call', () => {
    const v1Plan = {
      schemaVersion: 1 as const,
      id: 'p1',
      name: 'v1 plan',
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
      // Note: no location.overrides (v2 default), no successionEnabled (v2 default),
      // no locks (v3 default), no completedTaskIds (v3 default).
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
        plantings: { successionEnabled?: boolean; locks?: Record<string, boolean> }[];
        completedTaskIds?: string[];
      };
    };

    // v3 schemaVersion
    expect(result.plan.schemaVersion).toBe(3);
    // v2 defaults populated
    expect(result.plan.location.overrides).toEqual({});
    for (const p of result.plan.plantings) {
      expect(p.successionEnabled).toBe(false);
      // v3 defaults populated
      expect(p.locks).toEqual({});
    }
    // v3 plan-level default
    expect(result.plan.completedTaskIds).toEqual([]);
  });
});
