/**
 * @vitest-environment happy-dom
 */
// tests/stores/planStore.dirty-counter.test.ts
// Phase 4 Plan 04-05 Task 1 — D-14 dirty-counter wiring + D-15 exportPlan post-success side-effect.
// Source: .planning/phases/04-polish-mobile-ship/04-05-PLAN.md Task 1 behaviors.
//
// Each schema-meaningful coarse setter increments uiStore.exportReminder.dirtySinceExport
// by 1; explicitly excluded setters (setLock, toggleTaskCompletion, loadSamplePlan,
// replacePlan) leave the counter alone. zundo undo/redo replays do NOT re-invoke setters,
// so they MUST NOT bump the counter. exportPlan() success path resets the counter and
// stamps lastExportedAt; failure path leaves the counter untouched.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  CustomTask,
  Location,
  Plant,
  Planting,
  ScheduleEdit,
} from '../../src/domain/types';

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

function makePlant(id: string, name: string): Plant {
  return {
    id,
    source: 'custom',
    name,
    category: 'other',
    timing: {
      startMethod: 'direct-sow',
      daysToMaturity: 60,
      harvestWindowDays: 14,
      frostTolerance: 'half-hardy',
      hasFlowering: false,
      requiresHardening: false,
      season: 'cool',
    },
  };
}

function makeCustomTask(id: string, title: string): CustomTask {
  return {
    id,
    title,
    category: 'other',
    dueDate: '2026-05-01T12:00:00.000Z',
  };
}

function makeEdit(plantingId: string): ScheduleEdit {
  return {
    plantingId,
    eventType: 'transplant',
    newStart: '2026-05-15T12:00:00.000Z',
    timestamp: '2026-04-27T12:00:00.000Z',
  };
}

describe('planStore — dirty-counter wiring (D-14)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  async function setupPlan() {
    const { usePlanStore } = await import('../../src/stores/planStore');
    const { useUIStore } = await import('../../src/stores/uiStore');
    // Seed plan + reset dirty counter to 0.
    usePlanStore.getState().setLocation(sampleLocation);
    useUIStore.setState((s) => ({
      exportReminder: { ...s.exportReminder, dirtySinceExport: 0 },
    }));
    return { usePlanStore, useUIStore };
  }

  it('setLocation increments dirtySinceExport', async () => {
    const { useUIStore } = await import('../../src/stores/uiStore');
    const { usePlanStore } = await import('../../src/stores/planStore');
    useUIStore.setState((s) => ({
      exportReminder: { ...s.exportReminder, dirtySinceExport: 0 },
    }));
    usePlanStore.getState().setLocation(sampleLocation);
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(1);
  });

  it('commitEdit increments dirtySinceExport', async () => {
    const { usePlanStore, useUIStore } = await setupPlan();
    usePlanStore.getState().addPlanting(makePlanting('p1', 'tomato'));
    const before = useUIStore.getState().exportReminder.dirtySinceExport;
    usePlanStore.getState().commitEdit(makeEdit('p1'));
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(before + 1);
  });

  it('addPlanting increments dirtySinceExport', async () => {
    const { usePlanStore, useUIStore } = await setupPlan();
    usePlanStore.getState().addPlanting(makePlanting('p1', 'tomato'));
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(1);
  });

  it('removePlanting increments dirtySinceExport', async () => {
    const { usePlanStore, useUIStore } = await setupPlan();
    usePlanStore.getState().addPlanting(makePlanting('p1', 'tomato'));
    const before = useUIStore.getState().exportReminder.dirtySinceExport;
    usePlanStore.getState().removePlanting('p1');
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(before + 1);
  });

  it('toggleSuccession increments dirtySinceExport', async () => {
    const { usePlanStore, useUIStore } = await setupPlan();
    usePlanStore.getState().addPlanting(makePlanting('p1', 'tomato'));
    const before = useUIStore.getState().exportReminder.dirtySinceExport;
    usePlanStore.getState().toggleSuccession('p1');
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(before + 1);
  });

  it('upsertCustomPlant increments dirtySinceExport (covers add+edit)', async () => {
    const { usePlanStore, useUIStore } = await setupPlan();
    usePlanStore.getState().upsertCustomPlant(makePlant('cp1', 'Cherokee'));
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(1);
    // editing the same plant via upsert also counts as +1.
    usePlanStore.getState().upsertCustomPlant(makePlant('cp1', 'Cherokee Purple'));
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(2);
  });

  it('removeCustomPlant increments dirtySinceExport', async () => {
    const { usePlanStore, useUIStore } = await setupPlan();
    usePlanStore.getState().upsertCustomPlant(makePlant('cp1', 'Cherokee'));
    const before = useUIStore.getState().exportReminder.dirtySinceExport;
    usePlanStore.getState().removeCustomPlant('cp1');
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(before + 1);
  });

  it('removeCustomPlantWithCascade increments dirtySinceExport ONCE (not per cascaded planting)', async () => {
    const { usePlanStore, useUIStore } = await setupPlan();
    usePlanStore.getState().upsertCustomPlant(makePlant('cp1', 'Cherokee'));
    // Add 3 plantings of the same custom plant.
    usePlanStore.getState().addPlanting(makePlanting('p1', 'cp1'));
    usePlanStore.getState().addPlanting(makePlanting('p2', 'cp1'));
    usePlanStore.getState().addPlanting(makePlanting('p3', 'cp1'));
    const before = useUIStore.getState().exportReminder.dirtySinceExport;
    usePlanStore.getState().removeCustomPlantWithCascade('cp1');
    // Exactly +1 regardless of how many plantings cascaded.
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(before + 1);
  });

  it('addCustomTask increments dirtySinceExport', async () => {
    const { usePlanStore, useUIStore } = await setupPlan();
    usePlanStore.getState().addCustomTask(makeCustomTask('t1', 'Mulch beds'));
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(1);
  });

  it('editCustomTask increments dirtySinceExport', async () => {
    const { usePlanStore, useUIStore } = await setupPlan();
    usePlanStore.getState().addCustomTask(makeCustomTask('t1', 'Mulch beds'));
    const before = useUIStore.getState().exportReminder.dirtySinceExport;
    usePlanStore.getState().editCustomTask('t1', { title: 'Mulch all beds' });
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(before + 1);
  });

  it('removeCustomTask increments dirtySinceExport', async () => {
    const { usePlanStore, useUIStore } = await setupPlan();
    usePlanStore.getState().addCustomTask(makeCustomTask('t1', 'Mulch beds'));
    const before = useUIStore.getState().exportReminder.dirtySinceExport;
    usePlanStore.getState().removeCustomTask('t1');
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(before + 1);
  });

  it('setLock does NOT increment dirtySinceExport (D-14 exclusion)', async () => {
    const { usePlanStore, useUIStore } = await setupPlan();
    usePlanStore.getState().addPlanting(makePlanting('p1', 'tomato'));
    const before = useUIStore.getState().exportReminder.dirtySinceExport;
    usePlanStore.getState().setLock('p1', 'transplant', true);
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(before);
    usePlanStore.getState().setLock('p1', 'transplant', false);
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(before);
  });

  it('toggleTaskCompletion does NOT increment dirtySinceExport (D-14 exclusion)', async () => {
    const { usePlanStore, useUIStore } = await setupPlan();
    const before = useUIStore.getState().exportReminder.dirtySinceExport;
    usePlanStore.getState().toggleTaskCompletion('t1:2026-05-01');
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(before);
    usePlanStore.getState().toggleTaskCompletion('t1:2026-05-01');
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(before);
  });

  it('loadSamplePlan does NOT increment dirtySinceExport (D-14 exclusion)', async () => {
    const { usePlanStore, useUIStore } = await setupPlan();
    const before = useUIStore.getState().exportReminder.dirtySinceExport;
    usePlanStore.getState().loadSamplePlan();
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(before);
  });

  it('replacePlan does NOT increment dirtySinceExport (D-14 exclusion)', async () => {
    const { usePlanStore, useUIStore } = await setupPlan();
    const snapshot = usePlanStore.getState().exportPlanSnapshot();
    expect(snapshot).not.toBeNull();
    const before = useUIStore.getState().exportReminder.dirtySinceExport;
    usePlanStore.getState().replacePlan(snapshot!);
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(before);
  });

  it('zundo undo/redo do NOT increment dirtySinceExport (replays bypass setters)', async () => {
    const { usePlanStore, useUIStore } = await setupPlan();
    const { getTemporal } = await import('../../src/stores/planStore');
    // Two distinct setter calls so undo/redo has something to navigate.
    usePlanStore.getState().addPlanting(makePlanting('p1', 'tomato'));
    // Force the rAF-debounced handleSet to flush a history entry.
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    usePlanStore.getState().addPlanting(makePlanting('p2', 'lettuce'));
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    const beforeUndo = useUIStore.getState().exportReminder.dirtySinceExport;
    getTemporal().undo();
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(beforeUndo);
    getTemporal().redo();
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(beforeUndo);
  });
});

describe('exportPlan — D-15 post-success side-effect', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('on success: setLastExportedAt(<iso>) + resetDirty()', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const { usePlanStore } = await import('../../src/stores/planStore');
    const { useUIStore } = await import('../../src/stores/uiStore');
    const { samplePlan } = await import('../../src/samplePlan');

    usePlanStore.getState().replacePlan(structuredClone(samplePlan));
    // Manually pump the counter to a positive value (simulate prior edits).
    useUIStore.setState((s) => ({
      exportReminder: { ...s.exportReminder, dirtySinceExport: 7 },
    }));

    const { exportPlan } = await import('../../src/features/settings/exportPlan');
    const result = exportPlan();
    expect(result.ok).toBe(true);

    const slice = useUIStore.getState().exportReminder;
    expect(slice.dirtySinceExport).toBe(0);
    expect(slice.lastExportedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('on failure (no plan): does NOT touch uiStore exportReminder slice', async () => {
    const { useUIStore } = await import('../../src/stores/uiStore');
    useUIStore.setState((s) => ({
      exportReminder: {
        ...s.exportReminder,
        dirtySinceExport: 9,
        lastExportedAt: null,
      },
    }));
    const before = { ...useUIStore.getState().exportReminder };

    const { exportPlan } = await import('../../src/features/settings/exportPlan');
    // No plan loaded → exportPlan returns { ok: false, reason: 'No plan to export' }.
    const result = exportPlan();
    expect(result.ok).toBe(false);

    const after = useUIStore.getState().exportReminder;
    expect(after.dirtySinceExport).toBe(before.dirtySinceExport);
    expect(after.lastExportedAt).toBe(before.lastExportedAt);
  });
});
