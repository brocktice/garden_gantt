/**
 * @vitest-environment happy-dom
 */
// tests/stores/planStore.test.ts
// DATA-01 (persist wiring), DATA-02 (schemaVersion + migrate), DATA-07 (corrupt JSON tolerance)
// Source: .planning/phases/01-foundation-schedule-engine/01-06-PLAN.md (Task 2)
import { describe, it, expect, beforeEach, vi } from 'vitest';

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
    const options = (usePlanStore as unknown as {
      persist: { getOptions: () => { name: string; version: number } };
    }).persist.getOptions();
    expect(options.name).toBe('garden-gantt:plan');
    expect(options.version).toBe(1);
  });
});

describe('usePlanStore — corrupt JSON tolerance (DATA-07)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('boots with default state when localStorage contains malformed JSON', async () => {
    // Pre-seed bogus content under the persist key
    window.localStorage.setItem('garden-gantt:plan', 'not-json');

    // Import under test — Zustand's internal try/catch should fall back to initial state
    const { usePlanStore } = await import('../../src/stores/planStore');
    const state = usePlanStore.getState();
    expect(state.plan).toBeNull();
  });
});
