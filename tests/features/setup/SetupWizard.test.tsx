/**
 * @vitest-environment happy-dom
 */
// tests/features/setup/SetupWizard.test.tsx
// Phase 2 component test — wizard hero copy + sample-plan link + ZIP-gated Next + D-06 manual fallback.
// Source: [CITED: .planning/phases/02-data-layer-first-end-to-end/02-12-PLAN.md Task 1 Step 3]
//         [CITED: 02-UI-SPEC.md §Component Inventory items 1+2]
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';

interface ZoneRow {
  zone: string;
  lat: number;
  lon: number;
  lastSpringFrost50: string;
  firstFallFrost50: string;
}

function zoneFixture(zips: Record<string, ZoneRow>) {
  return JSON.stringify({ version: 1, generatedAt: '2026-04-26T00:00:00.000Z', zips });
}

describe('SetupWizard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = typeof url === 'string' ? url : (url as Request | URL).toString();
      if (u.includes('/data/zones.2.json')) {
        return new Response(
          zoneFixture({
            '20001': {
              zone: '7a',
              lat: 38.9,
              lon: -77.02,
              lastSpringFrost50: '04-15',
              firstFallFrost50: '10-20',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (u.includes('/data/zones.9.json')) {
        // Empty chunk — 99999 will resolve to status 'not-found'
        return new Response(zoneFixture({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  async function renderWizard() {
    const { SetupWizard } = await import('../../../src/features/setup/SetupWizard');
    const { _resetCacheForTests } = await import('../../../src/data/zones');
    _resetCacheForTests();
    return render(
      <MemoryRouter initialEntries={['/setup']}>
        <Routes>
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/plan" element={<div>Plan view</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders Step 1 hero when plan is null (first-run UX)', async () => {
    await renderWizard();
    expect(screen.getByText("Let's set up your garden")).toBeTruthy();
  });

  it('"Try with sample plan" link is visible only when plan is null (D-03)', async () => {
    await renderWizard();
    expect(screen.getByText('Or try the app with a sample plan →')).toBeTruthy();
  });

  it('Next button stays disabled until ZIP lookup succeeds', async () => {
    const user = userEvent.setup();
    await renderWizard();
    const next = screen.getByRole('button', { name: /next/i });
    expect((next as HTMLButtonElement).disabled).toBe(true);

    const zipInput = screen.getByLabelText(/your zip code/i);
    await user.type(zipInput, '20001');

    await waitFor(
      () => expect((next as HTMLButtonElement).disabled).toBe(false),
      { timeout: 2000 },
    );
  });

  it('unrecognized ZIP shows manual entry block (D-06)', async () => {
    const user = userEvent.setup();
    await renderWizard();
    const zipInput = screen.getByLabelText(/your zip code/i);
    await user.type(zipInput, '99999');

    // Phase 4 (Plan 04-03 Task 3): D-10 inline error replaces the legacy amber
    // "ZIP not recognized" header — the user-visible signal is now on ZipInput.
    await waitFor(
      () =>
        expect(
          screen.getByText(
            /Couldn.t find that ZIP\. Try a 5-digit US ZIP, or enter your zone manually below\./,
          ),
        ).toBeTruthy(),
      { timeout: 2000 },
    );
  });
});
