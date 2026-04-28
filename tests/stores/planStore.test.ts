/**
 * @vitest-environment happy-dom
 */
// tests/stores/planStore.test.ts
// Phase 1: DATA-01 (persist wiring), DATA-02 (schemaVersion + migrate), DATA-07 (corrupt JSON tolerance)
// Phase 2 (Plan 02-05): setter surface + v1->v2 migration + structuredClone bootstrap.
// Source: .planning/phases/02-data-layer-first-end-to-end/02-05-PLAN.md (Task 2)
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  CustomTask,
  GardenPlan,
  Location,
  Plant,
  Planting,
  ScheduleEdit,
} from '../../src/domain/types';

const ISO_UTC_NOON_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

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

describe('usePlanStore — persist wiring (DATA-01, DATA-02)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('exposes a plan field initialized to null', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    const state = usePlanStore.getState();
    expect(state.plan).toBeNull();
  });

  it('persist middleware uses the canonical key name and version', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    const options = (
      usePlanStore as unknown as {
        persist: { getOptions: () => { name: string; version: number } };
      }
    ).persist.getOptions();
    expect(options.name).toBe('garden-gantt:plan');
    expect(options.version).toBe(3);
  });
});

describe('usePlanStore — corrupt JSON tolerance (DATA-07)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('boots with default state when localStorage contains malformed JSON', async () => {
    window.localStorage.setItem('garden-gantt:plan', 'not-json');
    const { usePlanStore } = await import('../../src/stores/planStore');
    const state = usePlanStore.getState();
    expect(state.plan).toBeNull();
  });
});

describe('usePlanStore — Phase 2 setters', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('setLocation on null plan creates a new plan with the location + defaults', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    expect(usePlanStore.getState().plan).toBeNull();

    usePlanStore.getState().setLocation(sampleLocation);

    const plan = usePlanStore.getState().plan;
    expect(plan).not.toBeNull();
    expect(plan!.schemaVersion).toBe(3);
    expect(plan!.location).toEqual(sampleLocation);
    expect(plan!.plantings).toEqual([]);
    expect(plan!.customPlants).toEqual([]);
    expect(plan!.customTasks).toEqual([]);
    expect(plan!.edits).toEqual([]);
    expect(plan!.settings.units).toBe('imperial');
    expect(plan!.settings.weekStartsOn).toBe(0);
    expect(plan!.createdAt).toMatch(ISO_UTC_NOON_RE);
    expect(plan!.updatedAt).toMatch(ISO_UTC_NOON_RE);
  });

  it('setLocation on existing plan updates location + bumps updatedAt', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    const before = usePlanStore.getState().plan!.updatedAt;
    // small async gap to guarantee the ISO string changes
    await new Promise((r) => setTimeout(r, 5));
    const newLoc: Location = { ...sampleLocation, zone: '7b' };
    usePlanStore.getState().setLocation(newLoc);
    const plan = usePlanStore.getState().plan!;
    expect(plan.location.zone).toBe('7b');
    expect(plan.updatedAt).not.toBe(before);
    expect(plan.updatedAt).toMatch(ISO_UTC_NOON_RE);
  });

  it('addPlanting on null plan is a no-op (state.plan stays null)', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().addPlanting(makePlanting('p-tomato', 'tomato'));
    expect(usePlanStore.getState().plan).toBeNull();
  });

  it('addPlanting on existing plan appends + bumps updatedAt', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    const before = usePlanStore.getState().plan!.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    usePlanStore.getState().addPlanting(makePlanting('p-tomato', 'tomato'));
    const plan = usePlanStore.getState().plan!;
    expect(plan.plantings).toHaveLength(1);
    expect(plan.plantings[0]!.plantId).toBe('tomato');
    expect(plan.updatedAt).not.toBe(before);
    expect(plan.updatedAt).toMatch(ISO_UTC_NOON_RE);
  });

  it('removePlanting filters by id', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    usePlanStore.getState().addPlanting(makePlanting('p-tomato', 'tomato'));
    usePlanStore.getState().addPlanting(makePlanting('p-lettuce', 'lettuce'));
    usePlanStore.getState().removePlanting('p-tomato');
    const plan = usePlanStore.getState().plan!;
    expect(plan.plantings).toHaveLength(1);
    expect(plan.plantings[0]!.id).toBe('p-lettuce');
  });

  it('toggleSuccession flips successionEnabled boolean', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    usePlanStore.getState().addPlanting(makePlanting('p-lettuce', 'lettuce'));
    expect(usePlanStore.getState().plan!.plantings[0]!.successionEnabled).toBeUndefined();
    usePlanStore.getState().toggleSuccession('p-lettuce');
    expect(usePlanStore.getState().plan!.plantings[0]!.successionEnabled).toBe(true);
    usePlanStore.getState().toggleSuccession('p-lettuce');
    expect(usePlanStore.getState().plan!.plantings[0]!.successionEnabled).toBe(false);
  });

  it('setSuccessionCount stores a clamped integer count', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    usePlanStore.getState().addPlanting(makePlanting('p-lettuce', 'lettuce'));

    usePlanStore.getState().setSuccessionCount('p-lettuce', 2.8);
    expect(usePlanStore.getState().plan!.plantings[0]!.successionCount).toBe(2);

    usePlanStore.getState().setSuccessionCount('p-lettuce', 99);
    expect(usePlanStore.getState().plan!.plantings[0]!.successionCount).toBe(20);
  });

  it('setPlantingStartMethod stores override and prunes incompatible edits and locks', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    usePlanStore.getState().addPlanting({
      ...makePlanting('p-tomato', 'tomato'),
      locks: { transplant: true, 'direct-sow': true },
    });
    usePlanStore.getState().commitEdit({
      plantingId: 'p-tomato',
      eventType: 'transplant',
      startOverride: '2026-05-20T12:00:00.000Z',
      reason: 'user-form-edit',
      editedAt: '2026-04-26T17:00:00.000Z',
    });
    usePlanStore.getState().commitEdit({
      plantingId: 'p-tomato',
      eventType: 'direct-sow',
      startOverride: '2026-05-01T12:00:00.000Z',
      reason: 'user-form-edit',
      editedAt: '2026-04-26T17:00:00.000Z',
    });

    usePlanStore.getState().setPlantingStartMethod('p-tomato', 'direct-sow');

    const planting = usePlanStore.getState().plan!.plantings[0]!;
    expect(planting.startMethodOverride).toBe('direct-sow');
    expect(planting.locks).toEqual({ 'direct-sow': true });
    expect(usePlanStore.getState().plan!.edits).toEqual([
      expect.objectContaining({ eventType: 'direct-sow' }),
    ]);
  });

  it('upsertCustomPlant adds new + replaces existing by id', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    usePlanStore.getState().upsertCustomPlant(makePlant('purple-tomato', 'Purple Tomato'));
    expect(usePlanStore.getState().plan!.customPlants).toHaveLength(1);
    expect(usePlanStore.getState().plan!.customPlants[0]!.name).toBe('Purple Tomato');
    // replace by id
    usePlanStore
      .getState()
      .upsertCustomPlant({ ...makePlant('purple-tomato', 'Renamed Tomato') });
    expect(usePlanStore.getState().plan!.customPlants).toHaveLength(1);
    expect(usePlanStore.getState().plan!.customPlants[0]!.name).toBe('Renamed Tomato');
  });

  it('removeCustomPlant cascades to plantings using that plantId (D-15)', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    usePlanStore.getState().upsertCustomPlant(makePlant('purple-tomato', 'Purple Tomato'));
    usePlanStore
      .getState()
      .addPlanting(makePlanting('p-purple-tomato', 'purple-tomato'));
    usePlanStore.getState().addPlanting(makePlanting('p-lettuce', 'lettuce'));

    usePlanStore.getState().removeCustomPlant('purple-tomato');

    const plan = usePlanStore.getState().plan!;
    expect(plan.customPlants).toEqual([]);
    expect(plan.plantings).toHaveLength(1);
    expect(plan.plantings[0]!.plantId).toBe('lettuce'); // unrelated planting survives
  });

  it('removeCustomPlantWithCascade removes from catalogStore + planStore + cascades plantings (D-15 full)', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    const { useCatalogStore } = await import('../../src/stores/catalogStore');

    // Seed catalog with the custom plant
    const customPlant = makePlant('purple-tomato', 'Purple Tomato');
    useCatalogStore.getState().upsertCustomPlant(customPlant);
    expect(useCatalogStore.getState().customPlants).toHaveLength(1);

    // Seed plan: location + custom plant copy + planting referencing it
    usePlanStore.getState().setLocation(sampleLocation);
    usePlanStore.getState().upsertCustomPlant(customPlant);
    usePlanStore
      .getState()
      .addPlanting(makePlanting('p-purple-tomato', 'purple-tomato'));

    // Full cascade
    usePlanStore.getState().removeCustomPlantWithCascade('purple-tomato');

    expect(useCatalogStore.getState().customPlants).toEqual([]);
    const plan = usePlanStore.getState().plan!;
    expect(plan.customPlants).toEqual([]);
    expect(plan.plantings).toEqual([]);
  });

  it('loadSamplePlan populates plan with a CLONE — mutating store does not mutate samplePlan', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    const { samplePlan: original } = await import('../../src/samplePlan');

    const originalPlantingsLen = original.plantings.length;
    const originalFirstId = original.plantings[0]!.id;

    usePlanStore.getState().loadSamplePlan();
    expect(usePlanStore.getState().plan).not.toBeNull();
    // Reference must differ (structuredClone, not aliased)
    expect(usePlanStore.getState().plan).not.toBe(original);
    expect(usePlanStore.getState().plan!.plantings).not.toBe(original.plantings);

    // Mutate the in-store copy via the setter API
    usePlanStore.getState().addPlanting(makePlanting('p-test', 'tomato'));

    // Original is untouched
    expect(original.plantings.length).toBe(originalPlantingsLen);
    expect(original.plantings[0]!.id).toBe(originalFirstId);
  });

  it('replacePlan atomically swaps the entire plan', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);

    const replacement: GardenPlan = {
      schemaVersion: 3,
      id: 'imported-plan',
      name: 'Imported Plan',
      createdAt: '2025-01-01T12:00:00.000Z',
      updatedAt: '2025-01-01T12:00:00.000Z',
      location: { ...sampleLocation, zip: '94110' },
      customPlants: [],
      plantings: [makePlanting('p-cilantro', 'cilantro')],
      customTasks: [],
      edits: [],
      completedTaskIds: [],
      settings: { units: 'metric', weekStartsOn: 1, timezone: 'UTC' },
    };
    usePlanStore.getState().replacePlan(replacement);

    const plan = usePlanStore.getState().plan!;
    expect(plan.id).toBe('imported-plan');
    expect(plan.location.zip).toBe('94110');
    expect(plan.plantings[0]!.plantId).toBe('cilantro');
    expect(plan.settings.units).toBe('metric');
  });

  it('exportPlanSnapshot returns the current plan reference', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    expect(usePlanStore.getState().exportPlanSnapshot()).toBeNull();
    usePlanStore.getState().setLocation(sampleLocation);
    const snapshot = usePlanStore.getState().exportPlanSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot).toBe(usePlanStore.getState().plan); // identity (no clone for read-only export)
  });
});

describe('usePlanStore — v1 -> v3 migration (Pitfall E)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('rehydrates a v1-shaped persisted plan as v3 with overrides:{}, successionEnabled:false, locks:{}, completedTaskIds:[]', async () => {
    const v1State = {
      state: {
        plan: {
          schemaVersion: 1,
          id: 'plan-1',
          name: 'Old plan',
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
          plantings: [{ id: 'p-tomato', plantId: 'tomato', successionIndex: 0 }],
          customTasks: [],
          edits: [],
          settings: { units: 'imperial', weekStartsOn: 0, timezone: 'UTC' },
        },
      },
      version: 1,
    };
    window.localStorage.setItem('garden-gantt:plan', JSON.stringify(v1State));
    const { usePlanStore } = await import('../../src/stores/planStore');
    const plan = usePlanStore.getState().plan;
    expect(plan).not.toBeNull();
    expect(plan!.schemaVersion).toBe(3);
    expect(plan!.location.overrides).toEqual({});
    expect(plan!.plantings[0]!.successionEnabled).toBe(false);
    expect(plan!.plantings[0]!.locks).toEqual({});
    expect(plan!.completedTaskIds).toEqual([]);
  });

  it('rehydrates v2-shaped persisted plan as v3 (chains v2→v3, defaults locks and completedTaskIds)', async () => {
    const v2State = {
      state: {
        plan: {
          schemaVersion: 2,
          id: 'plan-1',
          name: 'Existing plan',
          createdAt: '2026-01-01T12:00:00.000Z',
          updatedAt: '2026-01-02T12:00:00.000Z',
          location: {
            zip: '20001',
            zone: '7a',
            lastFrostDate: '2026-04-15T12:00:00.000Z',
            firstFrostDate: '2026-10-20T12:00:00.000Z',
            source: 'manual',
            overrides: { zone: true },
          },
          customPlants: [],
          plantings: [
            { id: 'p-tomato', plantId: 'tomato', successionIndex: 0, successionEnabled: true },
          ],
          customTasks: [],
          edits: [],
          settings: { units: 'imperial', weekStartsOn: 0, timezone: 'UTC' },
        },
      },
      version: 2,
    };
    window.localStorage.setItem('garden-gantt:plan', JSON.stringify(v2State));
    const { usePlanStore } = await import('../../src/stores/planStore');
    const plan = usePlanStore.getState().plan;
    expect(plan).not.toBeNull();
    expect(plan!.schemaVersion).toBe(3);
    expect(plan!.name).toBe('Existing plan');
    expect(plan!.location.overrides).toEqual({ zone: true }); // preserved, not overwritten
    expect(plan!.plantings[0]!.locks).toEqual({});
    expect(plan!.completedTaskIds).toEqual([]);
    expect(plan!.plantings[0]!.successionEnabled).toBe(true); // preserved
  });
});

describe('usePlanStore — Phase 3 setters (Plan 03-02)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  // Flush the rAF-debounced handleSet so temporal pastStates is observable. Pitfall 4:
  // production-correct rAF debounce means writes batch into one history entry per frame —
  // tests must await rAF to see the materialized history.
  async function flushRAF(): Promise<void> {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  function makeEdit(plantingId: string, eventType: ScheduleEdit['eventType'], startOverride: string): ScheduleEdit {
    return {
      plantingId,
      eventType,
      startOverride,
      reason: 'user-drag',
      editedAt: '2026-05-20T12:00:00.000Z',
    };
  }

  function makeCustomTask(id: string, title: string, dueDate: string): CustomTask {
    return {
      id,
      source: 'custom',
      title,
      category: 'custom',
      dueDate,
      completed: false,
    };
  }

  // commitEdit ------------------------------------------------------------------------

  it('commitEdit appends an edit AND adds ONE temporal pastStates entry', async () => {
    const { usePlanStore, getTemporal } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    getTemporal().clear();
    const edit = makeEdit('p-tomato', 'transplant', '2026-05-20T12:00:00.000Z');
    usePlanStore.getState().commitEdit(edit);
    await flushRAF();

    const plan = usePlanStore.getState().plan!;
    expect(plan.edits).toHaveLength(1);
    expect(plan.edits[0]).toEqual(edit);
    expect(getTemporal().pastStates.length).toBe(1);
  });

  it('commitEdit dedupes by (plantingId, eventType) — last write wins', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    const e1 = makeEdit('p-tomato', 'transplant', '2026-05-20T12:00:00.000Z');
    const e2 = makeEdit('p-tomato', 'transplant', '2026-05-22T12:00:00.000Z');
    usePlanStore.getState().commitEdit(e1);
    usePlanStore.getState().commitEdit(e2);
    const plan = usePlanStore.getState().plan!;
    expect(plan.edits).toHaveLength(1);
    expect(plan.edits[0]!.startOverride).toBe('2026-05-22T12:00:00.000Z');
  });

  // setLock ---------------------------------------------------------------------------

  it('setLock toggles per-event lock flag (explicit boolean, not delete)', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    usePlanStore.getState().addPlanting({ id: 'p-tomato', plantId: 'tomato', successionIndex: 0 });

    usePlanStore.getState().setLock('p-tomato', 'transplant', true);
    expect(usePlanStore.getState().plan!.plantings.find((p) => p.id === 'p-tomato')!.locks!.transplant).toBe(true);

    usePlanStore.getState().setLock('p-tomato', 'transplant', false);
    expect(usePlanStore.getState().plan!.plantings.find((p) => p.id === 'p-tomato')!.locks!.transplant).toBe(false);
  });

  // addCustomTask / editCustomTask / removeCustomTask --------------------------------

  it('addCustomTask appends to plan.customTasks AND adds ONE pastStates entry', async () => {
    const { usePlanStore, getTemporal } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    getTemporal().clear();
    const task = makeCustomTask('task-1', 'Water seedlings', '2026-05-15T12:00:00.000Z');
    usePlanStore.getState().addCustomTask(task);
    await flushRAF();
    const plan = usePlanStore.getState().plan!;
    expect(plan.customTasks).toHaveLength(1);
    expect(plan.customTasks[0]).toEqual(task);
    expect(getTemporal().pastStates.length).toBe(1);
  });

  it('editCustomTask merges patch by id AND adds ONE pastStates entry', async () => {
    const { usePlanStore, getTemporal } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    usePlanStore.getState().addCustomTask(makeCustomTask('task-1', 'Original', '2026-05-15T12:00:00.000Z'));
    await flushRAF();
    getTemporal().clear();

    usePlanStore.getState().editCustomTask('task-1', { title: 'Renamed', notes: 'note' });
    await flushRAF();
    const plan = usePlanStore.getState().plan!;
    expect(plan.customTasks[0]!.title).toBe('Renamed');
    expect(plan.customTasks[0]!.notes).toBe('note');
    expect(plan.customTasks[0]!.dueDate).toBe('2026-05-15T12:00:00.000Z'); // unchanged
    expect(getTemporal().pastStates.length).toBe(1);
  });

  it('removeCustomTask filters by id AND adds ONE pastStates entry', async () => {
    const { usePlanStore, getTemporal } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    usePlanStore.getState().addCustomTask(makeCustomTask('task-1', 'A', '2026-05-15T12:00:00.000Z'));
    await flushRAF();
    usePlanStore.getState().addCustomTask(makeCustomTask('task-2', 'B', '2026-05-16T12:00:00.000Z'));
    await flushRAF();
    getTemporal().clear();

    usePlanStore.getState().removeCustomTask('task-1');
    await flushRAF();
    const plan = usePlanStore.getState().plan!;
    expect(plan.customTasks).toHaveLength(1);
    expect(plan.customTasks[0]!.id).toBe('task-2');
    expect(getTemporal().pastStates.length).toBe(1);
  });

  // toggleTaskCompletion -------------------------------------------------------------

  it('toggleTaskCompletion toggles bare taskId (one-off completion)', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    usePlanStore.getState().toggleTaskCompletion('task-1');
    expect(usePlanStore.getState().plan!.completedTaskIds).toEqual(['task-1']);
    usePlanStore.getState().toggleTaskCompletion('task-1');
    expect(usePlanStore.getState().plan!.completedTaskIds).toEqual([]);
  });

  it('toggleTaskCompletion treats composite key as independent of bare taskId', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    usePlanStore.getState().toggleTaskCompletion('task-1');
    usePlanStore.getState().toggleTaskCompletion('task-1:2026-05-15');
    expect(usePlanStore.getState().plan!.completedTaskIds).toEqual([
      'task-1',
      'task-1:2026-05-15',
    ]);
    // Toggling the composite key off does not touch the bare key
    usePlanStore.getState().toggleTaskCompletion('task-1:2026-05-15');
    expect(usePlanStore.getState().plan!.completedTaskIds).toEqual(['task-1']);
  });
});

describe('usePlanStore — updatedAt format (SCH-03 / nowISOString invariant)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('all updatedAt writes match ISO UTC datetime format', async () => {
    const { usePlanStore } = await import('../../src/stores/planStore');
    usePlanStore.getState().setLocation(sampleLocation);
    expect(usePlanStore.getState().plan!.updatedAt).toMatch(ISO_UTC_NOON_RE);

    usePlanStore.getState().addPlanting(makePlanting('p-tomato', 'tomato'));
    expect(usePlanStore.getState().plan!.updatedAt).toMatch(ISO_UTC_NOON_RE);

    usePlanStore.getState().toggleSuccession('p-tomato');
    expect(usePlanStore.getState().plan!.updatedAt).toMatch(ISO_UTC_NOON_RE);

    usePlanStore.getState().upsertCustomPlant(makePlant('purple-tomato', 'Purple Tomato'));
    expect(usePlanStore.getState().plan!.updatedAt).toMatch(ISO_UTC_NOON_RE);

    usePlanStore.getState().removeCustomPlant('purple-tomato');
    expect(usePlanStore.getState().plan!.updatedAt).toMatch(ISO_UTC_NOON_RE);

    usePlanStore.getState().removePlanting('p-tomato');
    expect(usePlanStore.getState().plan!.updatedAt).toMatch(ISO_UTC_NOON_RE);
  });
});
