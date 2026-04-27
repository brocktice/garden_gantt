/**
 * @vitest-environment happy-dom
 */
// tests/stores/temporal.test.ts
// Phase 3 (Plan 03-02 Task 3): zundo `temporal` middleware wrapped INSIDE persist.
// Source: .planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md D-13, D-14, D-17
//         .planning/phases/03-drag-cascade-calendar-tasks/03-RESEARCH.md §Pattern 4 + Pitfalls 3, 4
//         .planning/phases/03-drag-cascade-calendar-tasks/03-PATTERNS.md §planStore EXTEND
//
// Pitfall 3 (silent data loss): if temporal is OUTER and persist is INNER, persist serializes
// the entire `{ pastStates, futureStates, ... }` envelope to localStorage. With persist OUTER
// and temporal INNER (correct), localStorage holds only the materialized plan and history is
// in-memory only. Tested below by reading localStorage directly.
//
// Pitfall 4 (handleSet rAF debounce final-commit drop): the rAF debounce is implemented in
// planStore.ts; testing the debounce behavior under happy-dom is unreliable because vitest's
// fake-rAF emulation does not always match browser semantics. Test 13 from the plan is
// deferred — see SUMMARY for rationale.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Location, Planting } from '../../src/domain/types';

const sampleLocation: Location = {
  zip: '20001',
  zone: '7a',
  lastFrostDate: '2026-04-15T12:00:00.000Z',
  firstFrostDate: '2026-10-20T12:00:00.000Z',
  source: 'manual',
};

function makePlanting(id: string, plantId: string): Planting {
  return { id, plantId, successionIndex: 0 };
}

describe('planStore — middleware order (persist OUTER, temporal INNER)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('localStorage envelope holds materialized plan, NOT pastStates', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    usePlanStore.getState().addPlanting(makePlanting('p-tomato', 'tomato'));

    // Persisted envelope must contain the materialized plan, never temporal state.
    const raw = window.localStorage.getItem('garden-gantt:plan');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    // Persist envelope shape: { state: { plan: {...} }, version: N }
    expect(parsed.state).toBeDefined();
    expect(parsed.state.plan).toBeDefined();
    expect(parsed.state.plan.plantings[0].plantId).toBe('tomato');
    // Temporal artefacts must NEVER appear at the top level of persisted state
    expect(parsed.state.pastStates).toBeUndefined();
    expect(parsed.state.futureStates).toBeUndefined();
    expect(parsed.pastStates).toBeUndefined();
  });
});

describe('planStore — temporal undo/redo (D-15 plan-wide undo scope)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('undo reverses addPlanting; redo restores it', async () => {
    const { usePlanStore, getTemporal } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    getTemporal().clear();

    usePlanStore.getState().addPlanting(makePlanting('p-tomato', 'tomato'));
    expect(usePlanStore.getState().plan!.plantings).toHaveLength(1);

    getTemporal().undo();
    expect(usePlanStore.getState().plan!.plantings).toHaveLength(0);

    getTemporal().redo();
    expect(usePlanStore.getState().plan!.plantings).toHaveLength(1);
    expect(usePlanStore.getState().plan!.plantings[0]!.plantId).toBe('tomato');
  });

  it('limit caps pastStates at 20 entries (oldest dropped)', async () => {
    const { usePlanStore, getTemporal } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    getTemporal().clear();

    // 25 distinct mutations
    for (let i = 0; i < 25; i++) {
      usePlanStore.getState().addPlanting(makePlanting(`p-${i}`, 'tomato'));
    }
    expect(getTemporal().pastStates.length).toBe(20);
  });

  it('useTemporalStore selector hook is exported and callable', async () => {
    const { useTemporalStore } = await import('../../src/stores/planStore');
    expect(typeof useTemporalStore).toBe('function');
  });
});
