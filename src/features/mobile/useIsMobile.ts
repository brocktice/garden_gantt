// src/features/mobile/useIsMobile.ts
// matchMedia hook over a single 640px breakpoint (D-01).
//
// NOTE: Plan 04-01 (Wave 0) is the canonical owner of this file. This worktree (Plan
// 04-02, Wave 1) is forced to ship a minimal version because the parallel-execution
// branch is rooted before Plan 04-01 lands. The export shape matches the Plan 01
// interface contract — when 04-01 merges, the more elaborate version supersedes
// this one without changing the public API.
//
// Source: [CITED: .planning/phases/04-polish-mobile-ship/04-PATTERNS.md §useIsMobile.ts]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-RESEARCH.md §Pattern 1]

import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 639px)';

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
