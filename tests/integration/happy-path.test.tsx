/**
 * @vitest-environment happy-dom
 *
 * Phase 2 Flow A integration test — the canonical happy path.
 *
 * Reproduces UI-SPEC §Interaction Contracts Flow A end-to-end at the component
 * level (no real browser): visit /setup → enter ZIP → add 5 plants → unmount,
 * remount → state persists via localStorage rehydrate.
 *
 * Source: [CITED: 02-12-PLAN.md Task 2 Step 1]
 *         [CITED: 02-UI-SPEC.md Flow A]
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

// Inject the legacy variety entries as the curated catalog. The live catalog
// has been narrowed to 4 species-level entries pending extension-publication
// verification, but this happy-path test exercises the full setup flow with
// 5 plants — needs the richer fixture set.
vi.mock('../../src/assets/catalog', async () => {
  const fixture = await vi.importActual<
    typeof import('../../src/assets/catalog.unverified')
  >('../../src/assets/catalog.unverified');
  return {
    curatedCatalog: fixture.unverifiedFixtureCatalog,
    sampleCatalog: fixture.unverifiedFixtureSampleCatalog,
  };
});

const ZONES_FIXTURE = {
  version: 1,
  generatedAt: '2026-04-26T00:00:00.000Z',
  zips: {
    '20001': {
      zone: '7a',
      lat: 38.9,
      lon: -77.02,
      lastSpringFrost50: '04-15',
      firstFallFrost50: '10-20',
    },
  },
};

describe('Phase 2 Flow A — happy path', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = typeof url === 'string' ? url : (url as Request | URL).toString();
      if (u.includes('/data/zones.2.json')) {
        return new Response(JSON.stringify(ZONES_FIXTURE), {
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

  it('full happy path: ZIP -> 5 plants -> finish; reload preserves state', async () => {
    const user = userEvent.setup();
    const { App } = await import('../../src/app/App');
    const { usePlanStore } = await import('../../src/stores/planStore');
    const { _resetCacheForTests } = await import('../../src/data/zones');
    _resetCacheForTests();
    // Make sure we start clean (the persist middleware may have rehydrated
    // an empty plan from a previous run in the same process).
    usePlanStore.setState({ plan: null });

    // 1. Render app at /setup (initial state: plan === null).
    const { unmount } = render(
      <MemoryRouter initialEntries={['/setup']}>
        <App />
      </MemoryRouter>,
    );

    // 2. Step 1: enter ZIP and wait for derived block to render zone "7a".
    const zipInput = await screen.findByLabelText(/your zip code/i);
    await user.type(zipInput, '20001');
    await waitFor(
      () => expect(screen.getByText('USDA zone')).toBeTruthy(),
      { timeout: 2000 },
    );
    expect(screen.getByText('7a')).toBeTruthy();

    // 3. Click Next -> Step 2 (catalog browser).
    const nextBtn = screen.getByRole('button', { name: /next/i });
    await waitFor(
      () => expect((nextBtn as HTMLButtonElement).disabled).toBe(false),
      { timeout: 2000 },
    );
    await user.click(nextBtn);

    // Catalog rendered → search bar appears.
    await waitFor(
      () => expect(screen.getByPlaceholderText(/search plants by name/i)).toBeTruthy(),
      { timeout: 2000 },
    );

    // 4. Add 5 plants. PlantCard add button has aria-label "Add ${name} to plan".
    const addButtons = await screen.findAllByRole('button', {
      name: /add .+ to plan/i,
    });
    expect(addButtons.length).toBeGreaterThanOrEqual(5);
    for (let i = 0; i < 5; i++) {
      await user.click(addButtons[i]!);
    }

    await waitFor(() =>
      expect(usePlanStore.getState().plan?.plantings.length).toBe(5),
    );

    // 5. Verify plan persisted under the canonical key.
    const persisted = window.localStorage.getItem('garden-gantt:plan');
    expect(persisted).not.toBeNull();
    const parsed = JSON.parse(persisted!) as {
      state: { plan: { plantings: unknown[] } };
    };
    expect(parsed.state.plan.plantings.length).toBe(5);

    // 6. Unmount and remount at /plan. State must persist across the unmount.
    //    NOTE: localStorage persistence is verified above (step 5) by reading
    //    'garden-gantt:plan' directly. After unmount + remount, the in-memory
    //    Zustand store still holds the plan; we additionally exercise the
    //    persist.rehydrate() path to prove the disk shape is consumable.
    unmount();
    const persistedRaw = window.localStorage.getItem('garden-gantt:plan');
    expect(persistedRaw).not.toBeNull();

    // Force a real rehydrate from disk (simulates a fresh tab open):
    // wipe the in-memory state, then call persist.rehydrate().
    usePlanStore.setState({ plan: null });
    expect(usePlanStore.getState().plan).toBeNull();
    // Restore the persisted blob (setState bypasses storage write because
    // we are inside a sync handler; but persist middleware persists on every
    // setState, which would have wiped storage. Re-write before rehydrating.)
    window.localStorage.setItem('garden-gantt:plan', persistedRaw!);

    const persistApi = (
      usePlanStore as unknown as {
        persist: { rehydrate: () => Promise<void> | void };
      }
    ).persist;
    await persistApi.rehydrate();

    await waitFor(
      () => expect(usePlanStore.getState().plan?.plantings.length).toBe(5),
      { timeout: 2000 },
    );
    expect(usePlanStore.getState().plan?.location.zip).toBe('20001');
    expect(usePlanStore.getState().plan?.location.zone).toBe('7a');

    // Now render /plan and confirm the gantt view sees the plan.
    render(
      <MemoryRouter initialEntries={['/plan']}>
        <App />
      </MemoryRouter>,
    );
    // GanttView shows the plan body when plantings exist (no "No plants yet" empty state).
    await waitFor(() => {
      expect(screen.queryByText(/No plants in your plan yet/i)).toBeNull();
    });
  });
});
