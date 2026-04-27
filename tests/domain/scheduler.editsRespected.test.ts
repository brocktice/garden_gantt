// tests/domain/scheduler.editsRespected.test.ts
// GANTT-07: engine consumes plan.edits[] and prefers edit dates over computed dates per
// (plantingId, eventType). Cascade math reads from edited anchors.
// Source: [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-01-PLAN.md Task 2 (A)]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-RESEARCH.md §Assumption A1]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md D-19, D-20]
import { describe, it, expect } from 'vitest';
import { generateSchedule } from '../../src/domain/scheduler';
import { sampleCatalog } from '../../src/assets/catalog';
import type { GardenPlan, ScheduleEdit } from '../../src/domain/types';

const baseLocation = {
  zip: '20001',
  zone: '7a',
  lastFrostDate: '2026-04-15T12:00:00.000Z',
  firstFrostDate: '2026-10-20T12:00:00.000Z',
  source: 'manual' as const,
};

const planFor = (
  plantId: string,
  edits: ScheduleEdit[] = [],
): GardenPlan => ({
  schemaVersion: 3,
  id: 'edit-fixture',
  name: 'Edit-respected test plan',
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
  location: baseLocation,
  customPlants: [],
  plantings: [{ id: `p-${plantId}`, plantId, successionIndex: 0 }],
  customTasks: [],
  edits,
  completedTaskIds: [],
  settings: { units: 'imperial', weekStartsOn: 0, timezone: 'America/New_York' },
});

describe('generateSchedule — empty plan.edits[] is byte-identical to Phase 1+2 output', () => {
  it('tomato with edits=[] matches the snapshot suite output', () => {
    const events = generateSchedule(planFor('tomato'), sampleCatalog);
    const transplant = events.find(
      (e) => e.type === 'transplant' && e.plantingId === 'p-tomato',
    );
    expect(transplant).toBeDefined();
    // tomato lastFrost=2026-04-15, transplantOffsetDaysFromLastFrost=14 → 2026-04-29
    expect(transplant!.start).toBe('2026-04-29T12:00:00.000Z');
    expect(transplant!.edited).toBe(false);
  });
});

describe('generateSchedule — plan.edits[] consumed (GANTT-07)', () => {
  it('a transplant edit overrides computed start AND sets edited:true', () => {
    const edit: ScheduleEdit = {
      plantingId: 'p-tomato',
      eventType: 'transplant',
      startOverride: '2026-05-20T12:00:00.000Z',
      reason: 'user-drag',
      editedAt: '2026-04-26T17:00:00.000Z',
    };
    const events = generateSchedule(planFor('tomato', [edit]), sampleCatalog);
    const transplant = events.find(
      (e) => e.type === 'transplant' && e.plantingId === 'p-tomato',
    );
    expect(transplant).toBeDefined();
    expect(transplant!.start).toBe('2026-05-20T12:00:00.000Z');
    expect(transplant!.end).toBe('2026-05-20T12:00:00.000Z');
    expect(transplant!.edited).toBe(true);
  });

  it('cascade respects edited anchor: harvest-window starts at editedTransplant + DTM', () => {
    const edit: ScheduleEdit = {
      plantingId: 'p-tomato',
      eventType: 'transplant',
      startOverride: '2026-05-20T12:00:00.000Z',
      reason: 'user-drag',
      editedAt: '2026-04-26T17:00:00.000Z',
    };
    const events = generateSchedule(planFor('tomato', [edit]), sampleCatalog);
    const harvest = events.find(
      (e) => e.type === 'harvest-window' && e.plantingId === 'p-tomato',
    );
    expect(harvest).toBeDefined();
    // tomato.daysToMaturity=75 → editedTransplant 2026-05-20 + 75d = 2026-08-03
    expect(harvest!.start).toBe('2026-08-03T12:00:00.000Z');
  });

  it('constraint still clamps an edit-driven candidate (tender + before-frost)', () => {
    // Editing transplant of a tender plant (tomato) to BEFORE last frost (2026-04-15)
    // must still trigger noTransplantBeforeLastFrostForTender → clamp to 2026-04-15.
    const edit: ScheduleEdit = {
      plantingId: 'p-tomato',
      eventType: 'transplant',
      startOverride: '2026-04-01T12:00:00.000Z',
      reason: 'user-drag',
      editedAt: '2026-04-26T17:00:00.000Z',
    };
    const events = generateSchedule(planFor('tomato', [edit]), sampleCatalog);
    const transplant = events.find(
      (e) => e.type === 'transplant' && e.plantingId === 'p-tomato',
    );
    expect(transplant).toBeDefined();
    // Edit date 2026-04-01 is before last frost → constraint clamps to last-frost.
    expect(transplant!.start).toBe('2026-04-15T12:00:00.000Z');
    expect(transplant!.constraintsApplied).toContain(
      'noTransplantBeforeLastFrostForTender',
    );
  });

  it('last-write-wins: last edit for a (plantingId, eventType) pair takes precedence', () => {
    const edits: ScheduleEdit[] = [
      {
        plantingId: 'p-tomato',
        eventType: 'transplant',
        startOverride: '2026-05-10T12:00:00.000Z',
        reason: 'user-drag',
        editedAt: '2026-04-26T16:00:00.000Z',
      },
      {
        plantingId: 'p-tomato',
        eventType: 'transplant',
        startOverride: '2026-05-25T12:00:00.000Z',
        reason: 'user-drag',
        editedAt: '2026-04-26T17:00:00.000Z',
      },
    ];
    const events = generateSchedule(planFor('tomato', edits), sampleCatalog);
    const transplant = events.find(
      (e) => e.type === 'transplant' && e.plantingId === 'p-tomato',
    );
    expect(transplant).toBeDefined();
    expect(transplant!.start).toBe('2026-05-25T12:00:00.000Z');
  });
});
