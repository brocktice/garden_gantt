// src/features/mobile/useIsMobile.ts
// Single-source matchMedia hook for the (max-width: 639px) breakpoint (D-01 / D-04 /
// CAL-04 / D-03). Built on useSyncExternalStore so React 19 strict-mode and concurrent
// rendering observe a stable boolean snapshot (RESEARCH §Pitfall 2).
//
// Source: .planning/phases/04-polish-mobile-ship/04-RESEARCH.md §Pattern 1 (verbatim)
//         .planning/phases/04-polish-mobile-ship/04-PATTERNS.md §src/features/mobile/useIsMobile.ts
import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 639px)';

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  // Desktop default for SSR / pre-mount; client hydrates to actual value on first effect.
  return false;
}

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
