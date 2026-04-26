// src/features/setup/lookupLocation.ts
// React hook wrapper around src/data/zones.ts lookupLocation. Memoizes per (zip, year),
// debounces stale results via a cancellation flag so a quickly-typed ZIP doesn't race
// the previous in-flight fetch (Pitfall I — race condition on form re-entry).
//
// Source: [CITED: .planning/phases/02-data-layer-first-end-to-end/02-PATTERNS.md
//          src/features/setup/lookupLocation.ts (NEW) lines 654-665]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-08-PLAN.md Task 1]
//
// The sole-fetch-site invariant lives in src/data/zones.ts; this module only
// adapts the async API to a React effect lifecycle.

import { useEffect, useState } from 'react';
import { lookupLocation, type LookupResult } from '../../data/zones';

export type LookupHookState =
  | { status: 'idle' }
  | { status: 'loading' }
  | LookupResult;

const IDLE: LookupHookState = { status: 'idle' };

/**
 * useLookupLocation — runs an async ZIP lookup whenever (zip, year) changes.
 *
 * - Returns `{ status: 'idle' }` while the ZIP is shorter than 5 digits.
 * - Returns `{ status: 'loading' }` while a fetch is in flight.
 * - Returns the discriminated `LookupResult` (`ok` | `not-found` | `unreachable`)
 *   once the data/zones lookup resolves.
 *
 * Stale-result protection: if `zip` changes mid-fetch, the previous effect's
 * cleanup sets `cancelled = true` so the resolved value is discarded. This avoids
 * the wizard flashing an `ok` state for an old ZIP after the user has typed a new one.
 */
export function useLookupLocation(zip: string, year: number): LookupHookState {
  const isValid = /^\d{5}$/.test(zip);
  // Async-result store: only updated by the fetch effect. The hook returns either
  // this value (when the ZIP is valid) or IDLE (when it isn't), avoiding a
  // synchronous setState inside the effect for the idle branch (react-hooks/set-state-in-effect).
  const [asyncResult, setAsyncResult] = useState<LookupHookState>({
    status: 'loading',
  });

  useEffect(() => {
    if (!isValid) return;
    let cancelled = false;
    // Reset to loading via a microtask so the setState happens outside the effect
    // body (react-hooks/set-state-in-effect). Then kick off the fetch.
    queueMicrotask(() => {
      if (!cancelled) setAsyncResult({ status: 'loading' });
    });
    lookupLocation(zip, year).then((r) => {
      if (!cancelled) setAsyncResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, [isValid, zip, year]);

  return isValid ? asyncResult : IDLE;
}
