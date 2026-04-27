// tests/domain/scheduler.snapshot.test.ts
// SCH-08: snapshot tests covering canonical plants + DST + leap + year-rollover fixtures.
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-CONTEXT.md D-16, D-17]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Code Examples lines 884–971]
import { describe, it, expect } from 'vitest';
import { generateSchedule } from '../../src/domain/scheduler';
import { expandSuccessions } from '../../src/domain/succession';
import { sampleCatalog } from '../../src/assets/catalog';
import type { GardenPlan } from '../../src/domain/types';

const baseLocation = {
  zip: '20001',
  zone: '7a',
  lastFrostDate: '2026-04-15T12:00:00.000Z',
  firstFrostDate: '2026-10-20T12:00:00.000Z',
  source: 'manual' as const,
};

const planFor = (
  plantId: string,
  locationOverrides: Partial<typeof baseLocation> = {},
): GardenPlan => ({
  schemaVersion: 3,
  id: 'snapshot-fixture',
  name: 'Snapshot test plan',
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
  location: { ...baseLocation, ...locationOverrides },
  customPlants: [],
  plantings: [{ id: `p-${plantId}`, plantId, successionIndex: 0 }],
  customTasks: [],
  edits: [],
  completedTaskIds: [],
  settings: { units: 'imperial', weekStartsOn: 0, timezone: 'America/New_York' },
});

describe('schedule engine — canonical plants (SCH-08, D-16)', () => {
  it('tomato (frost-tender, indoor-start, fruiting)', () => {
    expect(generateSchedule(planFor('tomato'), sampleCatalog)).toMatchSnapshot();
  });

  it('lettuce (cold-hardy, direct-sow, leafy)', () => {
    expect(generateSchedule(planFor('lettuce'), sampleCatalog)).toMatchSnapshot();
  });

  it('broccoli (half-hardy, indoor-start, brassica)', () => {
    expect(generateSchedule(planFor('broccoli'), sampleCatalog)).toMatchSnapshot();
  });

  it('garlic (cold-hardy, direct-sow, allium / year-rollover)', () => {
    expect(generateSchedule(planFor('garlic'), sampleCatalog)).toMatchSnapshot();
  });
});

describe('schedule engine — DST-crossing fixture (SCH-08, D-17)', () => {
  it('tomato indoor-start window crosses March 8 2026 spring-forward without drift', () => {
    // tomato indoorStart = lastFrost - 42d = 2026-04-15 - 42 = 2026-03-04
    // Water-seedlings every 3 days from 2026-03-04 through transplant-1 = 2026-04-28 — DOES cross Mar 8 2026 DST.
    expect(generateSchedule(planFor('tomato'), sampleCatalog)).toMatchSnapshot();
  });
});

describe('schedule engine — leap-year fixture (SCH-08, D-17)', () => {
  it('tomato with lastFrost 2024-03-15: indoor-start phase straddles Feb 29 2024', () => {
    // lastFrost = 2024-03-15; tomato weeksIndoorBeforeLastFrost = 6 → indoorStart = 2024-02-02
    // water-seedlings sequence crosses Feb 29 2024
    const plan = planFor('tomato', { lastFrostDate: '2024-03-15T12:00:00.000Z' });
    expect(generateSchedule(plan, sampleCatalog)).toMatchSnapshot();
  });
});

describe('schedule engine — year-rollover fixture (SCH-05, D-17)', () => {
  it('garlic planted Oct 2026 harvests in Jul 2027', () => {
    const plan = planFor('garlic');
    const events = generateSchedule(plan, sampleCatalog);
    const harvest = events.find(
      (e) => e.type === 'harvest-window' && e.plantingId === 'p-garlic',
    );
    expect(harvest).toBeDefined();
    expect(harvest!.start.startsWith('2027')).toBe(true);
    expect(harvest!.start).toBe('2027-07-12T12:00:00.000Z');
    expect(events).toMatchSnapshot();
  });
});

describe('schedule engine — Phase 2 succession expansion (Plan 02-06)', () => {
  it('lettuce zone 7 with successionEnabled produces multi-row schedule', () => {
    const plan = planFor('lettuce');
    plan.plantings[0]!.successionEnabled = true;
    const expanded = expandSuccessions(plan, sampleCatalog);
    const events = generateSchedule(expanded, sampleCatalog);
    expect(events).toMatchSnapshot();
  });
});
