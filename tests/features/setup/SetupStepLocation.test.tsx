/**
 * @vitest-environment happy-dom
 */
// tests/features/setup/SetupStepLocation.test.tsx
// Plan 04-03 Task 4 — D-08 ZIP-derive Skeleton replacing legacy spinner-text row.
//
// Source: [CITED: .planning/phases/04-polish-mobile-ship/04-03-PLAN.md Task 4]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-UI-SPEC.md §Loading states]

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

// Mock useLookupLocation so we control the status synchronously.
vi.mock('../../../src/features/setup/lookupLocation', () => ({
  useLookupLocation: vi.fn(),
}));

import { useLookupLocation } from '../../../src/features/setup/lookupLocation';
import { SetupStepLocation } from '../../../src/features/setup/SetupStepLocation';

const mockedHook = useLookupLocation as unknown as ReturnType<typeof vi.fn>;

function renderHarness() {
  return render(
    <MemoryRouter>
      <SetupStepLocation
        onValidLocation={() => {}}
        onLocationInvalid={() => {}}
      />
    </MemoryRouter>,
  );
}

describe('SetupStepLocation — D-08 ZIP-derive Skeleton', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedHook.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Skeleton + sr-only announcement when lookup.status === loading; legacy spinner row absent', async () => {
    mockedHook.mockReturnValue({ status: 'loading' });
    const { container } = renderHarness();

    // Type a 5-digit ZIP so the loading branch is reachable.
    const zipInput = screen.getByLabelText(/Your ZIP code/);
    // Direct value mutation via fireEvent-style change is fine for jsdom.
    // Use react-testing-library's userEvent-style typing via input event.
    // Simpler: just trigger an onChange manually.
    // The component-controlled onChange strips non-digits & caps at 5.
    (zipInput as HTMLInputElement).focus();
    // We rely on the mocked hook returning 'loading' regardless of zip; just
    // populate something so any zip-length-gated branches render.
    // The component's internal `lookup` is sourced from the mock, so the
    // content branch should reflect 'loading' on initial render.

    // Use waitFor so React has a chance to flush.
    await waitFor(() => {
      expect(screen.getByTestId('lookup-skeleton')).toBeTruthy();
    });

    // sr-only announcement preserves the original "Looking up frost dates" copy.
    const srOnly = container.querySelector('span.sr-only');
    expect(srOnly?.textContent).toMatch(/Looking up frost dates for/);

    // Legacy visible spinner row (border-t-green-700 animate-spin) must NOT render.
    const legacy = container.querySelector('.border-t-green-700.animate-spin');
    expect(legacy).toBeNull();
  });

  it('does not render skeleton when lookup.status === ok; renders derived dl', async () => {
    mockedHook.mockReturnValue({
      status: 'ok',
      zone: '7a',
      lastFrostDate: '2026-04-15T12:00:00.000Z',
      firstFrostDate: '2026-10-15T12:00:00.000Z',
    });
    const { container } = renderHarness();

    expect(container.querySelector('[data-testid="lookup-skeleton"]')).toBeNull();
    // The derived <dl> renders with a <dt>USDA zone</dt> heading.
    const dl = container.querySelector('dl');
    expect(dl).not.toBeNull();
    expect(dl?.textContent).toMatch(/USDA zone/);
  });

  it('does not render skeleton when lookup.status === idle', () => {
    mockedHook.mockReturnValue({ status: 'idle' });
    const { container } = renderHarness();

    expect(container.querySelector('[data-testid="lookup-skeleton"]')).toBeNull();
    // No <dl> derived-fields block in idle.
    expect(container.querySelector('dl')).toBeNull();
  });
});
