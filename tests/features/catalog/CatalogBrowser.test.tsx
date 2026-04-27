/**
 * @vitest-environment happy-dom
 */
// tests/features/catalog/CatalogBrowser.test.tsx
// Phase 2 component test — search + filter chip semantics + add planting flow.
// Source: [CITED: 02-12-PLAN.md Task 1 Step 4]
//         [CITED: 02-UI-SPEC.md §Component Inventory item 3]
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { Location } from '../../../src/domain/types';

const sampleLocation: Location = {
  zip: '20001',
  zone: '7a',
  lastFrostDate: '2026-04-15T12:00:00.000Z',
  firstFrostDate: '2026-10-20T12:00:00.000Z',
  source: 'manual',
};

describe('CatalogBrowser', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  async function renderCatalog() {
    const { CatalogBrowser } = await import('../../../src/features/catalog/CatalogBrowser');
    return render(
      <MemoryRouter>
        <CatalogBrowser />
      </MemoryRouter>,
    );
  }

  it('renders search bar + 8 filter chips + pinned add-custom card', async () => {
    await renderCatalog();
    expect(screen.getByPlaceholderText(/search plants by name/i)).toBeTruthy();
    // 8 filter chips
    expect(screen.getByRole('checkbox', { name: 'Cool-season' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Warm-season' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Leafy' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Fruiting' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Root' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Herb' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Allium' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Brassica' })).toBeTruthy();
    // Pinned add-custom-plant card
    expect(screen.getByText('Add custom plant')).toBeTruthy();
  });

  it('search filters cards (case-insensitive over Tomato variants)', async () => {
    const user = userEvent.setup();
    await renderCatalog();
    const search = screen.getByPlaceholderText(/search plants by name/i);
    await user.type(search, 'tomato');
    // Plain "Tomato" must still appear
    expect(screen.getByText('Tomato')).toBeTruthy();
    // Em-dash variant must also appear
    expect(screen.getByText(/Tomato — Cherokee Purple/)).toBeTruthy();
  });

  it('clicking a chip toggles aria-checked state', async () => {
    const user = userEvent.setup();
    await renderCatalog();
    const chip = screen.getByRole('checkbox', { name: 'Leafy' });
    expect(chip.getAttribute('aria-checked')).toBe('false');
    await user.click(chip);
    expect(chip.getAttribute('aria-checked')).toBe('true');
    await user.click(chip);
    expect(chip.getAttribute('aria-checked')).toBe('false');
  });

  it('Add to plan button creates a planting in planStore', async () => {
    const user = userEvent.setup();
    // Seed plan first so addPlanting takes effect (no-op when plan === null).
    const { usePlanStore } = await import('../../../src/stores/planStore');
    // Reset plantings/customPlants if a previous test wrote them
    usePlanStore.setState({ plan: null });
    usePlanStore.getState().setLocation(sampleLocation);

    await renderCatalog();
    // PlantCard exposes aria-label `Add ${plant.name} to plan`. The first
    // alphabetical plant in the curated catalog should have such a button.
    const addButtons = await screen.findAllByRole('button', {
      name: /add .+ to plan/i,
    });
    expect(addButtons.length).toBeGreaterThan(0);
    await user.click(addButtons[0]!);

    expect(usePlanStore.getState().plan?.plantings.length).toBe(1);
  });
});
