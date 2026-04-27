/**
 * @vitest-environment happy-dom
 */
// tests/features/mobile/useIsMobile.test.ts
// Phase 4 Plan 04-01 Task 2: useSyncExternalStore matchMedia hook (D-01 / D-04 / CAL-04 / D-03).
// Source: .planning/phases/04-polish-mobile-ship/04-01-PLAN.md (Task 2)
//         04-RESEARCH.md §Pattern 1 (verbatim) + §Pitfall 2 (snapshot stability)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

interface MQLMock {
  matches: boolean;
  media: string;
  listeners: Set<() => void>;
  addEventListener: (type: 'change', cb: () => void) => void;
  removeEventListener: (type: 'change', cb: () => void) => void;
  dispatchEvent: () => boolean;
  onchange: null;
  // Legacy
  addListener: () => void;
  removeListener: () => void;
}

function makeMQL(initial: boolean): MQLMock {
  const listeners = new Set<() => void>();
  return {
    matches: initial,
    media: '(max-width: 639px)',
    listeners,
    addEventListener: (_type, cb) => {
      listeners.add(cb);
    },
    removeEventListener: (_type, cb) => {
      listeners.delete(cb);
    },
    dispatchEvent: () => true,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  };
}

describe('useIsMobile (D-01)', () => {
  let mql: MQLMock;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.resetModules();
  });

  it('returns true when viewport matches (max-width: 639px)', async () => {
    mql = makeMQL(true);
    window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
    const { useIsMobile } = await import('../../../src/features/mobile/useIsMobile');
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
    expect(typeof result.current).toBe('boolean');
  });

  it('returns false when viewport does not match', async () => {
    mql = makeMQL(false);
    window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
    const { useIsMobile } = await import('../../../src/features/mobile/useIsMobile');
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('re-renders with new value when matchMedia change event fires', async () => {
    mql = makeMQL(false);
    window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
    const { useIsMobile } = await import('../../../src/features/mobile/useIsMobile');
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => {
      mql.matches = true;
      // Notify each subscriber (useSyncExternalStore registers one)
      mql.listeners.forEach((cb) => cb());
    });
    expect(result.current).toBe(true);
  });

  it('queries the (max-width: 639px) breakpoint', async () => {
    mql = makeMQL(false);
    const matchMediaSpy = vi.fn().mockReturnValue(mql);
    window.matchMedia = matchMediaSpy as unknown as typeof window.matchMedia;
    const { useIsMobile } = await import('../../../src/features/mobile/useIsMobile');
    renderHook(() => useIsMobile());
    expect(matchMediaSpy).toHaveBeenCalledWith('(max-width: 639px)');
  });

  it('cleans up the change listener on unmount', async () => {
    mql = makeMQL(false);
    window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
    const { useIsMobile } = await import('../../../src/features/mobile/useIsMobile');
    const { unmount } = renderHook(() => useIsMobile());
    expect(mql.listeners.size).toBe(1);
    unmount();
    expect(mql.listeners.size).toBe(0);
  });
});
