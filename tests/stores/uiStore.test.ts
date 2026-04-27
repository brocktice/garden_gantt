/**
 * @vitest-environment happy-dom
 */
// tests/stores/uiStore.test.ts
// Phase 4 Plan 04-01 Task 1: uiStore wrapped in zustand persist with restricted partialize
// whitelist (D-06 onboarding + D-15 export-reminder), plus storage.ts watchQuotaExceeded
// helper for D-10 storage-full banner detection.
//
// Source: .planning/phases/04-polish-mobile-ship/04-01-PLAN.md (Task 1)
//         04-RESEARCH.md §Pattern 2 (persist setup with partialize), §Pitfall 1 (whitelist)
//         04-PATTERNS.md §src/stores/uiStore.ts and §src/data/storage.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const STORAGE_KEY = 'gg-ui';

describe('useUIStore — Phase 2 transient flags (preserved)', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('Phase 1 + 2 + 3 setters preserved (memory-only slices unchanged)', async () => {
    const { useUIStore } = await import('../../src/stores/uiStore');
    const s = useUIStore.getState();
    expect(typeof s.bannerDismissed).toBe('boolean');
    expect(typeof s.isStorageAvailable).toBe('boolean');
    expect(typeof s.setBannerDismissed).toBe('function');
    expect(typeof s.setStorageAvailable).toBe('function');
    expect(typeof s.setMyPlanPanelOpen).toBe('function');
    expect(typeof s.toggleFilterChip).toBe('function');
    expect(typeof s.setSearchQuery).toBe('function');
    expect(typeof s.setImportPreviewOpen).toBe('function');
    expect(typeof s.setLastConstraintViolation).toBe('function');
    expect(typeof s.setTaskGroupBy).toBe('function');
    expect(typeof s.incrementAltClickTipDismiss).toBe('function');
  });

  it('toggleFilterChip adds then removes', async () => {
    const { useUIStore } = await import('../../src/stores/uiStore');
    useUIStore.getState().toggleFilterChip('cool-season');
    expect(useUIStore.getState().filterChips.has('cool-season')).toBe(true);
    useUIStore.getState().toggleFilterChip('cool-season');
    expect(useUIStore.getState().filterChips.has('cool-season')).toBe(false);
  });
});

describe('useUIStore — persist envelope (D-06 / D-15)', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('persist middleware uses canonical key name and version', async () => {
    const { useUIStore } = await import('../../src/stores/uiStore');
    const options = (
      useUIStore as unknown as {
        persist: { getOptions: () => { name: string; version: number } };
      }
    ).persist.getOptions();
    expect(options.name).toBe(STORAGE_KEY);
    expect(options.version).toBe(1);
  });

  it('default onboarding + exportReminder slices', async () => {
    const { useUIStore } = await import('../../src/stores/uiStore');
    const s = useUIStore.getState();
    expect(s.onboarding).toEqual({ coachMarksDismissed: false });
    expect(s.exportReminder).toEqual({
      lastExportedAt: null,
      dirtySinceExport: 0,
      snoozedUntil: null,
    });
    expect(s.isStorageFull).toBe(false);
  });

  it('setCoachMarksDismissed flips onboarding.coachMarksDismissed and persists', async () => {
    const { useUIStore } = await import('../../src/stores/uiStore');
    useUIStore.getState().setCoachMarksDismissed(true);
    expect(useUIStore.getState().onboarding.coachMarksDismissed).toBe(true);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const env = JSON.parse(raw!);
    expect(env.state.onboarding.coachMarksDismissed).toBe(true);
  });

  it('setCoachMarksDismissed survives a store re-instantiation (reload simulation)', async () => {
    const { useUIStore } = await import('../../src/stores/uiStore');
    useUIStore.getState().setCoachMarksDismissed(true);
    // Simulate a reload: drop the module cache, re-import. localStorage persists.
    vi.resetModules();
    const { useUIStore: useUIStore2 } = await import('../../src/stores/uiStore');
    expect(useUIStore2.getState().onboarding.coachMarksDismissed).toBe(true);
  });

  it('incrementDirty bumps exportReminder.dirtySinceExport by 1; resetDirty returns to 0', async () => {
    const { useUIStore } = await import('../../src/stores/uiStore');
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(0);
    useUIStore.getState().incrementDirty();
    useUIStore.getState().incrementDirty();
    useUIStore.getState().incrementDirty();
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(3);
    useUIStore.getState().resetDirty();
    expect(useUIStore.getState().exportReminder.dirtySinceExport).toBe(0);
  });

  it('setLastExportedAt round-trips ISO string through persist', async () => {
    const { useUIStore } = await import('../../src/stores/uiStore');
    const iso = '2026-04-27T12:00:00.000Z';
    useUIStore.getState().setLastExportedAt(iso);
    expect(useUIStore.getState().exportReminder.lastExportedAt).toBe(iso);
    const env = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(env.state.exportReminder.lastExportedAt).toBe(iso);
  });

  it('setSnoozedUntil accepts string OR null and persists', async () => {
    const { useUIStore } = await import('../../src/stores/uiStore');
    const iso = '2026-05-01T00:00:00.000Z';
    useUIStore.getState().setSnoozedUntil(iso);
    expect(useUIStore.getState().exportReminder.snoozedUntil).toBe(iso);
    useUIStore.getState().setSnoozedUntil(null);
    expect(useUIStore.getState().exportReminder.snoozedUntil).toBeNull();
    const env = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(env.state.exportReminder.snoozedUntil).toBeNull();
  });

  it('partialize whitelist contains ONLY onboarding + exportReminder (Pitfall K invariant)', async () => {
    const { useUIStore } = await import('../../src/stores/uiStore');
    // Mutate every memory-only slice; none should leak into the persisted envelope.
    useUIStore.getState().setBannerDismissed(true);
    useUIStore.getState().toggleFilterChip('warm-season');
    useUIStore.getState().setSearchQuery('tomato');
    useUIStore.getState().setMyPlanPanelOpen(true);
    useUIStore.getState().setImportPreviewOpen(true);
    useUIStore.getState().setLastConstraintViolation({
      eventId: 'x',
      eventType: 'transplant',
      reasons: ['locked'],
    });
    useUIStore.getState().setTaskGroupBy('category');
    useUIStore.getState().incrementAltClickTipDismiss();
    // Fire a persisted setter so the envelope exists.
    useUIStore.getState().setCoachMarksDismissed(true);

    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const env = JSON.parse(raw!);
    const keys = Object.keys(env.state).sort();
    expect(keys).toEqual(['exportReminder', 'onboarding']);
  });

  it('setStorageFull(true) flips isStorageFull but does NOT appear in persisted envelope', async () => {
    const { useUIStore } = await import('../../src/stores/uiStore');
    useUIStore.getState().setCoachMarksDismissed(true); // ensure envelope written
    useUIStore.getState().setStorageFull(true);
    expect(useUIStore.getState().isStorageFull).toBe(true);
    const env = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(env.state.isStorageFull).toBeUndefined();
  });
});

describe('watchQuotaExceeded (storage.ts)', () => {
  let originalSetItem: Storage['setItem'];

  beforeEach(() => {
    window.localStorage.clear();
    originalSetItem = Storage.prototype.setItem;
  });

  afterEach(() => {
    // Defensive: ensure we restore the prototype if a test bailed out without teardown
    Storage.prototype.setItem = originalSetItem;
  });

  it('invokes onFull and re-throws on synthetic QuotaExceededError', async () => {
    const { watchQuotaExceeded } = await import('../../src/data/storage');
    // Build a Storage-shaped mock whose setItem throws QuotaExceededError.
    const throwingStorage: Storage = {
      length: 0,
      clear: () => {},
      getItem: () => null,
      key: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      },
    };
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => throwingStorage,
    });
    try {
      const onFull = vi.fn();
      const teardown = watchQuotaExceeded(onFull);
      try {
        expect(() => window.localStorage.setItem('foo', 'bar')).toThrow(DOMException);
        expect(onFull).toHaveBeenCalledTimes(1);
      } finally {
        teardown();
      }
    } finally {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: () => original,
      });
    }
  });

  it('teardown restores original setItem (no longer intercepts)', async () => {
    const { watchQuotaExceeded } = await import('../../src/data/storage');
    const throwingStorage: Storage = {
      length: 0,
      clear: () => {},
      getItem: () => null,
      key: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      },
    };
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => throwingStorage,
    });
    try {
      const onFull = vi.fn();
      const teardown = watchQuotaExceeded(onFull);
      teardown();
      // After teardown, setItem still throws (the underlying storage throws), but
      // onFull MUST NOT be invoked because the wrapper has been removed.
      expect(() => window.localStorage.setItem('foo', 'bar')).toThrow(DOMException);
      expect(onFull).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: () => original,
      });
    }
  });

  it('does not invoke onFull on successful setItem', async () => {
    const { watchQuotaExceeded } = await import('../../src/data/storage');
    const onFull = vi.fn();
    const teardown = watchQuotaExceeded(onFull);
    try {
      window.localStorage.setItem('happy-key', 'value');
      expect(onFull).not.toHaveBeenCalled();
      expect(window.localStorage.getItem('happy-key')).toBe('value');
    } finally {
      teardown();
    }
  });
});
