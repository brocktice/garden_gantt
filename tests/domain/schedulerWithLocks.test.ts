// tests/domain/schedulerWithLocks.test.ts
// GANTT-08: schedulerWithLocks — defensive contract that locked events match plan.edits.
// Source: [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-01-PLAN.md Task 2 (C)]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-RESEARCH.md §Pattern 5]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md D-08, D-13]
import { describe, it, expect } from 'vitest';
import { generateScheduleWithLocks } from '../../src/domain/schedulerWithLocks';
import { generateSchedule } from '../../src/domain/scheduler';
import { unverifiedFixtureSampleCatalog as sampleCatalog } from '../../src/assets/catalog.unverified';
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

  it('locked-on-default (lock set, no edit) — engine returns the synthesized lock-anchor (CR-02)', () => {
    // CR-02 fix: with the lock pre-pass, a locked event with no matching edit gets a
    // synthesized ScheduleEdit anchored at the baseline value. The engine then renders
    // that event with `edited: true` because plan.edits[] now contains the synth entry.
    const plan = planFor('tomato', { transplant: true });
    const events = generateScheduleWithLocks(plan, sampleCatalog);
    const transplant = events.find(
      (e) => e.type === 'transplant' && e.plantingId === 'p-tomato',
    );
    expect(transplant).toBeDefined();
    // tomato lastFrost=2026-04-15 + 14 = 2026-04-29
    expect(transplant!.start).toBe('2026-04-29T12:00:00.000Z');
    // After CR-02 fix: synthesized lock-anchor edit makes engine treat the date as edited.
    expect(transplant!.edited).toBe(true);
  });
});

describe('generateScheduleWithLocks — lock survives cascade across anchor change (CR-02)', () => {
  it('locked transplant holds fixed when an UPSTREAM edit (indoor-start) moves', () => {
    // CR-02 contract: lock survives cascade. With locks.transplant=true and an explicit
    // indoor-start edit pulling the start date earlier, the cascade WOULD normally walk
    // forward to a new transplant date. The lock pre-pass synthesizes a transplant anchor
    // at the edit-free baseline so transplant stays put.
    const planUnedited = planFor('tomato', { transplant: true });
    const planEdited: GardenPlan = {
      ...planUnedited,
      edits: [
        {
          plantingId: 'p-tomato',
          eventType: 'indoor-start',
          startOverride: '2026-02-01T12:00:00.000Z', // pulled WAY earlier
          reason: 'user-drag',
          editedAt: '2026-04-26T17:00:00.000Z',
        },
      ],
    };

    const a = generateScheduleWithLocks(planUnedited, sampleCatalog);
    const b = generateScheduleWithLocks(planEdited, sampleCatalog);

    const tA = a.find((e) => e.type === 'transplant')!;
    const tB = b.find((e) => e.type === 'transplant')!;
    const indoorB = b.find((e) => e.type === 'indoor-start')!;

    // The indoor-start edit applied (sanity check).
    expect(indoorB.start).toBe('2026-02-01T12:00:00.000Z');
    // Lock holds: transplant date unchanged across the cascade-triggering edit.
    // (Without the lock, transplant would NOT move from indoor-start in the current engine
    // — indoor-start is upstream-only; the more meaningful upstream-cascade test is the
    // unlocked-downstream-events test below, but we keep this one as a redundant pin
    // against any future engine change that adds indoor→transplant cascading.)
    expect(tB.start).toBe(tA.start);
  });

  it('unlocked downstream events still reflow when only one event is locked', () => {
    // Lock harvest-window only; drag transplant LATER via an explicit edit; harvest stays put
    // because the lock pre-pass synthesized a harvest-anchor edit at the *pre-edit* baseline.
    const plan: GardenPlan = {
      ...planFor('tomato', { 'harvest-window': true }),
      edits: [
        {
          plantingId: 'p-tomato',
          eventType: 'transplant',
          startOverride: '2026-06-15T12:00:00.000Z', // shifted ~6 weeks later
          reason: 'user-drag',
          editedAt: '2026-04-26T17:00:00.000Z',
        },
      ],
    };
    const events = generateScheduleWithLocks(plan, sampleCatalog);
    const transplant = events.find((e) => e.type === 'transplant')!;
    const harvest = events.find((e) => e.type === 'harvest-window')!;

    // Transplant moved (the explicit edit applied).
    expect(transplant.start).toBe('2026-06-15T12:00:00.000Z');
    // Harvest is locked at the BASELINE (pre-edit) value.
    // tomato baseline: lastFrost=2026-04-15 + 14 (transplantOffset) + 75 (DTM) = 2026-07-13.
    expect(harvest.start).toBe('2026-07-13T12:00:00.000Z');
  });

  it('explicit edit beats lock-synth (lock pre-pass does not clobber existing edit)', () => {
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
    const transplant = events.find((e) => e.type === 'transplant')!;
    // Explicit edit wins over the synthesized lock-anchor edit.
    expect(transplant.start).toBe('2026-05-20T12:00:00.000Z');
    expect(transplant.edited).toBe(true);
  });
});
