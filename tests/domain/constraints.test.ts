// tests/domain/constraints.test.ts
// SCH-04: noTransplantBeforeLastFrostForTender — clamp + pass-through branches.
// Source: [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Code Examples lines 973–1003]
import { describe, it, expect } from 'vitest';
import { canMove } from '../../src/domain/constraints';
import { unverifiedFixtureSampleCatalog as sampleCatalog } from '../../src/assets/catalog.unverified';
import type { GardenPlan, ScheduleEvent } from '../../src/domain/types';

const plan: GardenPlan = {
  schemaVersion: 3,
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
  completedTaskIds: [],
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

// Phase 3 GANTT-05: harden-off must precede transplant by daysToHardenOff.
// Source: [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-01-PLAN.md Task 2 (B.1)]
describe('hardenOffMustPrecedeTransplant (Phase 3 GANTT-05)', () => {
  it('clamps transplant forward when candidate squeezes harden-off before indoor anchor (half-hardy plant)', () => {
    // broccoli requiresHardening=true, frostTolerance=half-hardy (so the tender rule
    // does NOT fire); daysToHardenOff=7, weeksIndoorBeforeLastFrost=5.
    // indoorStart = lastFrost (2026-04-15) - 5w = 2026-03-11
    // If user drags transplant to 2026-03-15, harden-off span = 2026-03-07..2026-03-14,
    //   which starts before indoorAnchor 2026-03-11.
    // Rule clamps to indoorAnchor + hardenDays + 1 = 2026-03-11 + 8d = 2026-03-19.
    const broccoli = sampleCatalog.get('broccoli')!;
    const planWithBroccoli: GardenPlan = {
      ...plan,
      plantings: [{ id: 'p-broccoli', plantId: 'broccoli', successionIndex: 0 }],
    };
    const event = transplantEvent('p-broccoli', 'broccoli', '2026-03-15T12:00:00.000Z');
    const result = canMove(event, '2026-03-15T12:00:00.000Z', planWithBroccoli, broccoli);
    expect(result.ok).toBe(true);
    expect('clamped' in result && result.clamped).toBe(true);
    if ('clamped' in result && result.clamped) {
      expect(result.finalDate).toBe('2026-03-19T12:00:00.000Z');
      const hasHardenReason = result.reasons.some((r) => r.includes('Harden-off'));
      expect(hasHardenReason).toBe(true);
    }
  });

  it('passes through when frost-hardy plant has requiresHardening=false (rule does not apply)', () => {
    // lettuce requiresHardening=false → the rule short-circuits to ok:true with no clamp.
    const lettuce = sampleCatalog.get('lettuce')!;
    const event = transplantEvent('p-lettuce', 'lettuce', '2026-03-01T12:00:00.000Z');
    // Use a plan where lettuce planting is registered for the rule lookup.
    const planWithLettuce: GardenPlan = {
      ...plan,
      plantings: [{ id: 'p-lettuce', plantId: 'lettuce', successionIndex: 0 }],
    };
    const result = canMove(event, '2026-03-01T12:00:00.000Z', planWithLettuce, lettuce);
    expect(result.ok).toBe(true);
    expect('clamped' in result && result.clamped).toBeFalsy();
    expect(result.finalDate).toBe('2026-03-01T12:00:00.000Z');
  });

  it('passes through when transplant candidate gives sufficient harden-off lead time', () => {
    // broccoli (requiresHardening=true, half-hardy → tender rule does NOT apply, daysToHardenOff=7)
    // indoorStart = lastFrost (2026-04-15) - 5w = 2026-03-11
    // candidate transplant = 2026-04-15 (last frost) → harden-off span 2026-04-07 to 2026-04-14,
    //   well after indoorStart. Rule should not clamp.
    const broccoli = sampleCatalog.get('broccoli')!;
    const event = transplantEvent('p-broccoli', 'broccoli', '2026-04-15T12:00:00.000Z');
    const planWithBroccoli: GardenPlan = {
      ...plan,
      plantings: [{ id: 'p-broccoli', plantId: 'broccoli', successionIndex: 0 }],
    };
    const result = canMove(event, '2026-04-15T12:00:00.000Z', planWithBroccoli, broccoli);
    expect(result.ok).toBe(true);
    expect('clamped' in result && result.clamped).toBeFalsy();
    expect(result.finalDate).toBe('2026-04-15T12:00:00.000Z');
  });
});

// Phase 3 GANTT-05: harvest must follow transplant (or direct-sow) by ≥ daysToMaturity.
// Source: [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-01-PLAN.md Task 2 (B.2)]
describe('harvestMustFollowTransplantByDTM (Phase 3 GANTT-05)', () => {
  it('clamps harvest forward when candidate is before transplant + DTM (indoor-start)', () => {
    // tomato lastFrost=2026-04-15, transplantOffset=14 → transplant=2026-04-29
    //   daysToMaturity=75 → minHarvestStart=2026-07-13
    // User attempts to drag harvest-window earlier to 2026-06-01 → clamp.
    const tomato = sampleCatalog.get('tomato')!;
    const harvestCandidate = '2026-06-01T12:00:00.000Z';
    const harvestEvent = {
      id: 'p-tomato:harvest-window',
      plantingId: 'p-tomato',
      plantId: 'tomato',
      type: 'harvest-window' as const,
      start: harvestCandidate,
      end: harvestCandidate,
      edited: false,
      constraintsApplied: [],
    };
    const planWithTomato: GardenPlan = {
      ...plan,
      plantings: [{ id: 'p-tomato', plantId: 'tomato', successionIndex: 0 }],
    };
    const result = canMove(harvestEvent, harvestCandidate, planWithTomato, tomato);
    expect(result.ok).toBe(true);
    expect('clamped' in result && result.clamped).toBe(true);
    if ('clamped' in result && result.clamped) {
      expect(result.finalDate).toBe('2026-07-13T12:00:00.000Z');
      const hasReason = result.reasons.some((r) => r.includes('Harvest must be at least'));
      expect(hasReason).toBe(true);
    }
  });

  it('passes through when harvest candidate is after transplant + DTM', () => {
    // tomato minHarvestStart = 2026-07-13; candidate 2026-08-01 should pass through.
    const tomato = sampleCatalog.get('tomato')!;
    const harvestCandidate = '2026-08-01T12:00:00.000Z';
    const harvestEvent = {
      id: 'p-tomato:harvest-window',
      plantingId: 'p-tomato',
      plantId: 'tomato',
      type: 'harvest-window' as const,
      start: harvestCandidate,
      end: harvestCandidate,
      edited: false,
      constraintsApplied: [],
    };
    const planWithTomato: GardenPlan = {
      ...plan,
      plantings: [{ id: 'p-tomato', plantId: 'tomato', successionIndex: 0 }],
    };
    const result = canMove(harvestEvent, harvestCandidate, planWithTomato, tomato);
    expect(result.ok).toBe(true);
    expect('clamped' in result && result.clamped).toBeFalsy();
    expect(result.finalDate).toBe(harvestCandidate);
  });

  it('uses anchorEdit when present (cascade reads edited transplant date)', () => {
    // Edit transplant to 2026-05-20 → minHarvestStart should now be 2026-08-03 (= 2026-05-20 + 75d).
    // A harvest candidate of 2026-07-01 would be valid against original (2026-04-29 + 75d = 2026-07-13)
    // but invalid against edited (2026-08-03), so it gets clamped.
    const tomato = sampleCatalog.get('tomato')!;
    const harvestCandidate = '2026-07-15T12:00:00.000Z';
    const harvestEvent = {
      id: 'p-tomato:harvest-window',
      plantingId: 'p-tomato',
      plantId: 'tomato',
      type: 'harvest-window' as const,
      start: harvestCandidate,
      end: harvestCandidate,
      edited: false,
      constraintsApplied: [],
    };
    const planWithTomato: GardenPlan = {
      ...plan,
      plantings: [{ id: 'p-tomato', plantId: 'tomato', successionIndex: 0 }],
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
    const result = canMove(harvestEvent, harvestCandidate, planWithTomato, tomato);
    expect(result.ok).toBe(true);
    expect('clamped' in result && result.clamped).toBe(true);
    if ('clamped' in result && result.clamped) {
      expect(result.finalDate).toBe('2026-08-03T12:00:00.000Z');
    }
  });
});
