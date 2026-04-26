/**
 * @vitest-environment happy-dom
 */
// tests/data/storage.test.ts
// DATA-03 + DATA-06 — probe failure detection + storage listener registration/cleanup.
// Source: .planning/phases/01-foundation-schedule-engine/01-06-PLAN.md (Task 1)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { probeStorage, isStorageAvailable, withStorageDOMEvents } from '../../src/data/storage';

describe('probeStorage (DATA-03)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns true when localStorage works', () => {
    expect(probeStorage()).toBe(true);
  });

  it('removes the probe key after success (no leftover state)', () => {
    probeStorage();
    expect(window.localStorage.getItem('__gg_probe')).toBeNull();
  });

  it('returns false when setItem throws (iOS Safari Private Browsing simulation)', () => {
    // happy-dom routes Storage.setItem through an internal Proxy after first use, so spying
    // on the prototype no longer intercepts the call. Instead, swap window.localStorage with
    // a Storage-shaped mock whose setItem throws — this matches iOS Safari Private Browsing,
    // which surfaces the failure via `localStorage.setItem(...) → QuotaExceededError`.
    const original = window.localStorage;
    const throwingStorage = {
      length: 0,
      clear: () => {},
      getItem: () => null,
      key: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      },
    } satisfies Storage;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => throwingStorage,
    });
    try {
      expect(probeStorage()).toBe(false);
      expect(isStorageAvailable()).toBe(false);
    } finally {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: () => original,
      });
    }
  });
});

describe('withStorageDOMEvents (DATA-06)', () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addSpy = vi.spyOn(window, 'addEventListener');
    removeSpy = vi.spyOn(window, 'removeEventListener');
  });
  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('attaches a storage event listener and returns a cleanup that detaches it', () => {
    const fakeStore = {
      persist: {
        getOptions: () => ({ name: 'garden-gantt:plan' }),
        rehydrate: vi.fn(),
      },
    } as unknown as Parameters<typeof withStorageDOMEvents>[0];
    const cleanup = withStorageDOMEvents(fakeStore);
    expect(addSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    cleanup();
    expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function));
  });

  it('rehydrate fires only on a matching key with non-null newValue', () => {
    const rehydrate = vi.fn();
    const fakeStore = {
      persist: {
        getOptions: () => ({ name: 'garden-gantt:plan' }),
        rehydrate,
      },
    } as unknown as Parameters<typeof withStorageDOMEvents>[0];
    withStorageDOMEvents(fakeStore);

    // Matching key + non-null newValue → rehydrate called
    window.dispatchEvent(new StorageEvent('storage', { key: 'garden-gantt:plan', newValue: '{}' }));
    expect(rehydrate).toHaveBeenCalledTimes(1);

    // Different key → no rehydrate
    rehydrate.mockClear();
    window.dispatchEvent(new StorageEvent('storage', { key: 'other-app:state', newValue: '{}' }));
    expect(rehydrate).not.toHaveBeenCalled();

    // Matching key but newValue=null (delete event) → no rehydrate
    rehydrate.mockClear();
    window.dispatchEvent(new StorageEvent('storage', { key: 'garden-gantt:plan', newValue: null }));
    expect(rehydrate).not.toHaveBeenCalled();
  });
});
