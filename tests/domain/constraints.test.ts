// tests/domain/constraints.test.ts
// SCH-04: noTransplantBeforeLastFrostForTender — clamp + pass-through branches.
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Code Examples lines 973–1003]
import { describe, it, expect } from 'vitest';
import { canMove } from '../../src/domain/constraints';
import { sampleCatalog } from '../../src/assets/catalog';
import type { GardenPlan, ScheduleEvent } from '../../src/domain/types';

const plan: GardenPlan = {
  schemaVersion: 1,
  id: 'constraints-test',
  name: 'constraints test plan',
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
  plantings: [],
  customTasks: [],
  edits: [],
  settings: { units: 'imperial', weekStartsOn: 0, timezone: 'America/New_York' },
};

const transplantEvent = (
  plantingId: string,
  plantId: string,
  dateISO: string,
): ScheduleEvent => ({
  id: `${plantingId}:transplant`,
  plantingId,
  plantId,
  type: 'transplant',
  start: dateISO,
  end: dateISO,
  edited: false,
  constraintsApplied: [],
});

describe('noTransplantBeforeLastFrostForTender (SCH-04)', () => {
  it('clamps tender plant transplant to last frost when candidate is earlier', () => {
    const tomato = sampleCatalog.get('tomato')!;
    const event = transplantEvent('p-tomato', 'tomato', '2026-04-01T12:00:00.000Z');
    const result = canMove(event, '2026-04-01T12:00:00.000Z', plan, tomato);
    expect(result.ok).toBe(true);
    expect('clamped' in result && result.clamped).toBe(true);
    expect(result.finalDate).toBe('2026-04-15T12:00:00.000Z');
    if ('clamped' in result && result.clamped) {
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons[0]).toContain('Tender plant');
    }
  });

  it('does NOT clamp tender plant when candidate is on/after last frost', () => {
    const tomato = sampleCatalog.get('tomato')!;
    const event = transplantEvent('p-tomato', 'tomato', '2026-04-29T12:00:00.000Z');
    const result = canMove(event, '2026-04-29T12:00:00.000Z', plan, tomato);
    expect(result.ok).toBe(true);
    expect('clamped' in result && result.clamped).toBeFalsy();
    expect(result.finalDate).toBe('2026-04-29T12:00:00.000Z');
  });

  it('does NOT apply to hardy plant even before last frost', () => {
    const lettuce = sampleCatalog.get('lettuce')!;
    const event = transplantEvent('p-lettuce', 'lettuce', '2026-03-18T12:00:00.000Z');
    const result = canMove(event, '2026-03-18T12:00:00.000Z', plan, lettuce);
    expect(result.ok).toBe(true);
    expect('clamped' in result && result.clamped).toBeFalsy();
    expect(result.finalDate).toBe('2026-03-18T12:00:00.000Z');
  });
});
