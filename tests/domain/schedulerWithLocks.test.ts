// tests/domain/schedulerWithLocks.test.ts
// GANTT-08: schedulerWithLocks — defensive contract that locked events match plan.edits.
// Source: [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-01-PLAN.md Task 2 (C)]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-RESEARCH.md §Pattern 5]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md D-08, D-13]
import { describe, it, expect } from 'vitest';
import { generateScheduleWithLocks } from '../../src/domain/schedulerWithLocks';
import { generateSchedule } from '../../src/domain/scheduler';
import { sampleCatalog } from '../../src/assets/catalog';
import type { GardenPlan } from '../../src/domain/types';

const baseLocation = {
  zip: '20001',
  zone: '7a',
  lastFrostDate: '2026-04-15T12:00:00.000Z',
  firstFrostDate: '2026-10-20T12:00:00.000Z',
  source: 'manual' as const,
};

const planFor = (plantId: string, locks: Record<string, boolean> = {}): GardenPlan => ({
  schemaVersion: 3,
  id: 'lock-fixture',
  name: 'Lock test plan',
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
  location: baseLocation,
  customPlants: [],
  plantings: [
    {
      id: `p-${plantId}`,
      plantId,
      successionIndex: 0,
      ...(Object.keys(locks).length > 0 ? { locks } : {}),
    },
  ],
  customTasks: [],
  edits: [],
  completedTaskIds: [],
  settings: { units: 'imperial', weekStartsOn: 0, timezone: 'America/New_York' },
});

describe('generateScheduleWithLocks — passthrough', () => {
  it('with no locks set, returns events deep-equal to generateSchedule', () => {
    const plan = planFor('tomato');
    const a = generateSchedule(plan, sampleCatalog);
    const b = generateScheduleWithLocks(plan, sampleCatalog);
    expect(b).toEqual(a);
  });
});

describe('generateScheduleWithLocks — locked event matches edit (defensive contract)', () => {
  it('returns the edit-overridden start for a locked transplant when matching edit exists', () => {
    const plan: GardenPlan = {
      ...planFor('tomato', { transplant: true }),
      edits: [
        {
          plantingId: 'p-tomato',
          eventType: 'transplant',
          startOverride: '2026-05-20T12:00:00.000Z',
          reason: 'user-drag',
          editedAt: '2026-04-26T17:00:00.000Z',
        },
      ],
    };
    const events = generateScheduleWithLocks(plan, sampleCatalog);
    const transplant = events.find(
      (e) => e.type === 'transplant' && e.plantingId === 'p-tomato',
    );
    expect(transplant).toBeDefined();
    expect(transplant!.start).toBe('2026-05-20T12:00:00.000Z');
    expect(transplant!.edited).toBe(true);
  });

  it('locked-on-default (lock set, no edit) preserves engine-computed value with edited:false', () => {
    // No matching edit in plan.edits — engine returns its computed value.
    // The wrapper does not synthesize edits; it relies on engine for date,
    // and lock-aware UI prevents drag to enforce the no-change contract.
    const plan = planFor('tomato', { transplant: true });
    const events = generateScheduleWithLocks(plan, sampleCatalog);
    const transplant = events.find(
      (e) => e.type === 'transplant' && e.plantingId === 'p-tomato',
    );
    expect(transplant).toBeDefined();
    // tomato lastFrost=2026-04-15 + 14 = 2026-04-29
    expect(transplant!.start).toBe('2026-04-29T12:00:00.000Z');
    expect(transplant!.edited).toBe(false);
  });
});
