// src/data/storage.ts
// The SOLE module in src/ that touches localStorage.
// Source: [VERIFIED: developer.mozilla.org/en-US/docs/Web/API/Storage/setItem]
//         [VERIFIED: zustand persist withStorageDOMEvents pattern via Context7 /pmndrs/zustand]
//         [CITED: .planning/phases/01-foundation-schedule-engine/01-RESEARCH.md §Code Examples lines 662–698]

const PROBE_KEY = '__gg_probe';

/**
 * Probe localStorage availability. iOS Safari Private Browsing has quota=0 → setItem throws
 * QuotaExceededError. (Pitfall 18.) Sync; safe to call before app render.
 */
export function probeStorage(): boolean {
  try {
    window.localStorage.setItem(PROBE_KEY, '1');
    window.localStorage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Convenience alias used by the banner UI. */
export function isStorageAvailable(): boolean {
  return probeStorage();
}

/**
 * Structural shape of a Zustand store wrapped with the `persist` middleware.
 * Reproduced here (rather than imported from `zustand`) because the upstream
 * `Mutate<StoreApi<T>, [['zustand/persist', unknown]]>` collapses to `never`
 * under exactOptionalPropertyTypes — the inferred mutator chain doesn't satisfy
 * `StoreMutatorIdentifier` without the concrete creator type.
 *
 * Matches `StorePersist<S, Ps, Pr>['persist']` from zustand/middleware/persist.d.ts.
 */
export interface StoreWithPersist {
  persist: {
    getOptions: () => { name?: string };
    rehydrate: () => Promise<void> | void;
  };
}

/**
 * Multi-tab sync: re-hydrate the persisted store when ANOTHER tab writes the same key.
 * (DATA-06, Pitfall 19.) Returns a cleanup function that detaches the listener.
 */
export function withStorageDOMEvents(store: StoreWithPersist): () => void {
  const callback = (e: StorageEvent) => {
    if (e.key === store.persist.getOptions().name && e.newValue) {
      void store.persist.rehydrate();
    }
  };
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

/**
 * Patch `localStorage.setItem` so that any QuotaExceededError thrown during a write
 * fires `onFull()` once before the error propagates. (D-10 storage-full banner.)
 *
 * Single-call invariant: main.tsx wires this once at boot — before any other module
 * has a chance to write. The returned teardown restores the original setItem and
 * is intended for test cleanup.
 *
 * The wrapped setItem MUST re-throw so that downstream consumers (e.g. zustand persist)
 * see the same failure semantics they would without the watcher.
 *
 * Source: .planning/phases/04-polish-mobile-ship/04-RESEARCH.md §Pitfall 6
 *         .planning/phases/04-polish-mobile-ship/04-PATTERNS.md §src/data/storage.ts
 */
export function watchQuotaExceeded(onFull: () => void): () => void {
  const original = localStorage.setItem.bind(localStorage);
  function patched(this: Storage, key: string, value: string): void {
    try {
      original(key, value);
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === 'QuotaExceededError' ||
          (err as DOMException & { code?: number }).code === 22)
      ) {
        // WR-05 (REVIEW Phase 4): defensively guard onFull so a notifier
        // crash cannot replace the original QuotaExceededError that downstream
        // (zustand persist) is expecting. Log the notifier failure separately.
        try {
          onFull();
        } catch (notifyErr) {
          console.error('watchQuotaExceeded onFull threw:', notifyErr);
        }
      }
      throw err;
    }
  }
  localStorage.setItem = patched;
  return () => {
    localStorage.setItem = original;
  };
}
