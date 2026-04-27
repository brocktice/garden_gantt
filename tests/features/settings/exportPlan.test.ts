/**
 * @vitest-environment happy-dom
 */
// tests/features/settings/exportPlan.test.ts
// D-27 export envelope shape + anchor-click download mechanics.
// Source: [CITED: 02-11-PLAN.md Task 1]
//         [CITED: 02-RESEARCH.md §Pattern 6]
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('exportPlan', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('returns { ok: false } when plan is null', async () => {
    const { exportPlan } = await import('../../../src/features/settings/exportPlan');
    const r = exportPlan();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/no plan/i);
  });

  it('returns { ok: true, filename } and triggers anchor-click download', async () => {
    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:test');
    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    const { usePlanStore } = await import('../../../src/stores/planStore');
    const { samplePlan } = await import('../../../src/samplePlan');
    usePlanStore.getState().replacePlan(structuredClone(samplePlan));

    const { exportPlan } = await import('../../../src/features/settings/exportPlan');
    const r = exportPlan();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.filename).toMatch(/^garden-gantt-plan-\d{4}-\d{2}-\d{2}\.json$/);
    }
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalled();
  });

  it('produces a valid envelope { app, version, schemaVersion, exportedAt, plan }', async () => {
    let capturedBlob: Blob | null = null;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource) => {
      capturedBlob = blob as Blob;
      return 'blob:test';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const { usePlanStore } = await import('../../../src/stores/planStore');
    const { samplePlan } = await import('../../../src/samplePlan');
    usePlanStore.getState().replacePlan(structuredClone(samplePlan));

    const { exportPlan } = await import('../../../src/features/settings/exportPlan');
    exportPlan();

    expect(capturedBlob).not.toBeNull();
    const text = await (capturedBlob as unknown as Blob).text();
    const parsed = JSON.parse(text);
    expect(parsed.app).toBe('garden-gantt');
    expect(parsed.version).toBe('0.2');
    expect(parsed.schemaVersion).toBe(2);
    expect(typeof parsed.exportedAt).toBe('string');
    expect(parsed.plan).toBeTruthy();
    expect(parsed.plan.id).toBe(samplePlan.id);
  });
});
