// tests/features/gantt/drag/clampModifier.test.ts
// Phase 3 Plan 03-03 Task 1: clampModifier — pure factory wrapping canMove() in a @dnd-kit Modifier.
// Source: 03-03-PLAN.md Task 1 behaviors 1-4.

import { describe, it, expect, vi } from 'vitest';
import { makeClampModifier } from '../../../../src/features/gantt/drag/clampModifier';
import { createTimeScale } from '../../../../src/features/gantt/timeScale';
import { sampleCatalog } from '../../../../src/assets/catalog';
import type { GardenPlan, ScheduleEvent } from '../../../../src/domain/types';

const PX_PER_DAY = 6;

const plan: GardenPlan = {
  schemaVersion: 3,
  id: 'clamp-test',
  name: 'clamp test plan',
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

const harvestEvent = (
  plantingId: string,
  plantId: string,
  startISO: string,
  endISO: string,
): ScheduleEvent => ({
  id: `${plantingId}:harvest-window`,
  plantingId,
  plantId,
  type: 'harvest-window',
  start: startISO,
  end: endISO,
  edited: false,
  constraintsApplied: [],
});

// Synthetic dnd-kit modifier args. Only `transform` and `activeNodeRect` are read.
const makeArgs = (deltaX: number) => ({
  transform: { x: deltaX, y: 0, scaleX: 1, scaleY: 1 },
  activeNodeRect: { top: 0, left: 0, right: 60, bottom: 20, width: 60, height: 20 },
  active: null,
  draggingNodeRect: null,
  containerNodeRect: null,
  over: null,
  windowRect: null,
  scrollableAncestors: [],
  scrollableAncestorRects: [],
}) as unknown as Parameters<ReturnType<typeof makeClampModifier>>[0];

describe('clampModifier (Phase 3 Plan 03-03)', () => {
  const scale = createTimeScale({
    start: '2026-01-01',
    end: '2026-12-31',
    pxPerDay: PX_PER_DAY,
  });

  it('Test 1: pass-through — frost-hardy plant transplant drag returns whole-day-snapped transform; no setViolation', () => {
    // Lettuce (frost-hardy, requiresHardening=false) — neither tender rule nor harden-off rule fires.
    const lettuce = sampleCatalog.get('lettuce')!;
    const event = transplantEvent('p-lettuce', 'lettuce', '2026-04-01T12:00:00.000Z');
    const setViolation = vi.fn();
    const planWithLettuce: GardenPlan = {
      ...plan,
      plantings: [{ id: 'p-lettuce', plantId: 'lettuce', successionIndex: 0 }],
    };
    const modifier = makeClampModifier({
      scale,
      event,
      plan: planWithLettuce,
      plant: lettuce,
      setViolation,
    });
    // 5 day drag in pixels = 5 * pxPerDay = 30 px.
    const result = modifier(makeArgs(5 * PX_PER_DAY));
    // No clamp; whole-day snap; transform.x = exactly 5 * pxPerDay.
    expect(result.x).toBe(5 * PX_PER_DAY);
    // Pass-through clears any prior violation.
    expect(setViolation).toHaveBeenCalledWith(null);
  });

  it('Test 2: tender clamp — tomato transplant drag past last-frost left clamps + sets violation', () => {
    // Tomato is tender; last frost = 2026-04-15.
    // Existing event start = 2026-05-01, drag left by 30 days → candidate 2026-04-01 (before frost).
    // Rule clamps to lastFrost (2026-04-15). Expected x = (April 15 - May 1) days * pxPerDay = -16 * 6 = -96.
    const tomato = sampleCatalog.get('tomato')!;
    const event = transplantEvent('p-tomato', 'tomato', '2026-05-01T12:00:00.000Z');
    const setViolation = vi.fn();
    const planWithTomato: GardenPlan = {
      ...plan,
      plantings: [{ id: 'p-tomato', plantId: 'tomato', successionIndex: 0 }],
    };
    const modifier = makeClampModifier({
      scale,
      event,
      plan: planWithTomato,
      plant: tomato,
      setViolation,
    });
    // Drag left by 30 days = -30 * pxPerDay = -180 px.
    const result = modifier(makeArgs(-30 * PX_PER_DAY));
    // Clamped to lastFrost = 2026-04-15. Delta from event start (2026-05-01) = -16 days.
    expect(result.x).toBe(-16 * PX_PER_DAY);
    // Violation populated with reasons[].
    expect(setViolation).toHaveBeenCalledTimes(1);
    const call = setViolation.mock.calls[0]![0];
    expect(call).toBeTruthy();
    expect(call.eventId).toBe(event.id);
    expect(call.eventType).toBe('transplant');
    expect(call.reasons.length).toBeGreaterThan(0);
    expect(call.reasons[0]).toContain('Tender');
  });

  it('Test 3: whole-day snap — sub-day pixel delta snaps to a multiple of pxPerDay', () => {
    // Lettuce pass-through path; pxPerDay = 6.
    // Drag by +13 px = 2.16 days → snap to 2 days = 12 px.
    const lettuce = sampleCatalog.get('lettuce')!;
    const event = transplantEvent('p-lettuce', 'lettuce', '2026-04-01T12:00:00.000Z');
    const setViolation = vi.fn();
    const planWithLettuce: GardenPlan = {
      ...plan,
      plantings: [{ id: 'p-lettuce', plantId: 'lettuce', successionIndex: 0 }],
    };
    const modifier = makeClampModifier({
      scale,
      event,
      plan: planWithLettuce,
      plant: lettuce,
      setViolation,
    });
    const result = modifier(makeArgs(13)); // sub-day delta
    expect(result.x % PX_PER_DAY).toBe(0); // whole-day snapped
    expect(result.x).toBe(2 * PX_PER_DAY); // round(13/6) = 2
  });

  it('Test 4: harvest-min-DTM — dragging harvest-window left below transplant+DTM clamps forward', () => {
    // Tomato: lastFrost 2026-04-15, transplantOffset=14 → transplant=2026-04-29
    //   DTM=75 → minHarvestStart=2026-07-13
    // Existing harvest event starts 2026-08-01 (passes through). User drags left by 60 days
    // → candidate 2026-06-02 (before minHarvestStart).
    // Rule clamps to 2026-07-13. Expected delta x = (Jul 13 - Aug 1) days * pxPerDay = -19 * 6 = -114.
    const tomato = sampleCatalog.get('tomato')!;
    const event = harvestEvent(
      'p-tomato',
      'tomato',
      '2026-08-01T12:00:00.000Z',
      '2026-09-30T12:00:00.000Z',
    );
    const setViolation = vi.fn();
    const planWithTomato: GardenPlan = {
      ...plan,
      plantings: [{ id: 'p-tomato', plantId: 'tomato', successionIndex: 0 }],
    };
    const modifier = makeClampModifier({
      scale,
      event,
      plan: planWithTomato,
      plant: tomato,
      setViolation,
    });
    const result = modifier(makeArgs(-60 * PX_PER_DAY));
    expect(result.x).toBe(-19 * PX_PER_DAY);
    expect(setViolation).toHaveBeenCalledTimes(1);
    const call = setViolation.mock.calls[0]![0];
    expect(call.eventType).toBe('harvest-window');
    expect(call.reasons[0]).toContain('Harvest must be at least');
  });
});
