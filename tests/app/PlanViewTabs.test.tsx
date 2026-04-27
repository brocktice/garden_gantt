// @vitest-environment happy-dom
// tests/app/PlanViewTabs.test.tsx
// Phase 4 Plan 04-02 Task 2: CAL-04 — on first mount at <640px viewport with no
// explicit ?view= search param, PlanViewTabs sets ?view=calendar (replace=true).
//
// Source: .planning/phases/04-polish-mobile-ship/04-02-PLAN.md Task 2 behaviors

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router';
import type { ReactNode } from 'react';

// Mock useIsMobile so we control mobile vs desktop branch deterministically.
vi.mock('../../src/features/mobile/useIsMobile', () => ({
  useIsMobile: vi.fn(),
}));

import { useIsMobile } from '../../src/features/mobile/useIsMobile';
import { PlanViewTabs } from '../../src/app/PlanViewTabs';

function URLProbe() {
  const [params] = useSearchParams();
  return <div data-testid="url-search">{params.toString()}</div>;
}

function Wrapper({ children, initialEntries }: { children: ReactNode; initialEntries: string[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/plan"
          element={
            <>
              <URLProbe />
              {children}
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PlanViewTabs CAL-04 mobile-default', () => {
  it('on mount with isMobile=true and no view param, sets ?view=calendar', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(
      <Wrapper initialEntries={['/plan']}>
        <PlanViewTabs />
      </Wrapper>,
    );
    expect(screen.getByTestId('url-search').textContent).toBe('view=calendar');
  });

  it('on mount with isMobile=true and ?view=plan present, does NOT overwrite', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(
      <Wrapper initialEntries={['/plan?view=plan']}>
        <PlanViewTabs />
      </Wrapper>,
    );
    expect(screen.getByTestId('url-search').textContent).toBe('view=plan');
  });

  it('on mount with isMobile=true and ?view=calendar already present, leaves as-is', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(
      <Wrapper initialEntries={['/plan?view=calendar']}>
        <PlanViewTabs />
      </Wrapper>,
    );
    expect(screen.getByTestId('url-search').textContent).toBe('view=calendar');
  });

  it('on mount with isMobile=false, leaves URL untouched (desktop default)', () => {
    vi.mocked(useIsMobile).mockReturnValue(false);
    render(
      <Wrapper initialEntries={['/plan']}>
        <PlanViewTabs />
      </Wrapper>,
    );
    expect(screen.getByTestId('url-search').textContent).toBe('');
  });
});
