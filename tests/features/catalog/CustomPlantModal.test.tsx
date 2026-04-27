/**
 * @vitest-environment happy-dom
 */
// tests/features/catalog/CustomPlantModal.test.tsx
// Phase 2 component test — form validation + Permapeople MSW success/failure paths.
// Source: [CITED: 02-12-PLAN.md Task 1 Step 5]
//         [CITED: 02-UI-SPEC.md §Component Inventory item 6]
//         [CITED: 02-CONTEXT.md CAT-07 — Permapeople failure MUST NOT block save]
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const PERMAPEOPLE_FIXTURE = {
  plants: [
    {
      description: 'A red fruit traditionally grown as an annual.',
      scientific_name: 'Solanum lycopersicum',
      data: [
        { key: 'Family', value: 'Solanaceae' },
        { key: 'Genus', value: 'Solanum' },
      ],
      image_url: 'https://example.com/img.jpg',
    },
  ],
};

describe('CustomPlantModal', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  async function renderModal() {
    const { CustomPlantModal } = await import('../../../src/features/catalog/CustomPlantModal');
    let openState = true;
    const onOpenChange = (next: boolean) => {
      openState = next;
    };
    const utils = render(
      <CustomPlantModal
        open={true}
        onOpenChange={onOpenChange}
        editingPlant={null}
      />,
    );
    return { ...utils, getOpenState: () => openState };
  }

  it('Save button is disabled until plant name is non-empty', async () => {
    const user = userEvent.setup();
    await renderModal();
    const save = screen.getByRole('button', { name: /save plant/i }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    const nameInput = screen.getByLabelText(/plant name/i);
    await user.type(nameInput, 'Beet — Detroit Dark Red');
    expect(save.disabled).toBe(false);
  });

  it('Permapeople enrich populates a "Permapeople found" preview block (success path)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = typeof url === 'string' ? url : (url as Request | URL).toString();
      if (u.includes('/permapeople-proxy/search')) {
        return new Response(JSON.stringify(PERMAPEOPLE_FIXTURE), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    });

    const user = userEvent.setup();
    await renderModal();

    const nameInput = screen.getByLabelText(/plant name/i);
    await user.type(nameInput, 'Tomato');
    const enrich = screen.getByRole('button', { name: /enrich from permapeople/i });
    await user.click(enrich);

    await waitFor(
      () => expect(screen.getByText(/Permapeople found/i)).toBeTruthy(),
      { timeout: 2000 },
    );
    expect(screen.getByText(/Family: Solanaceae/i)).toBeTruthy();
    expect(screen.getByText(/Genus: Solanum/i)).toBeTruthy();
  });

  it('Permapeople unreachable shows amber warning but Save stays enabled (CAT-07)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      // Throwing TypeError mimics CORS / network failure (the canonical browser signal)
      throw new TypeError('Failed to fetch');
    });

    const user = userEvent.setup();
    await renderModal();

    const nameInput = screen.getByLabelText(/plant name/i);
    await user.type(nameInput, 'Tomato');

    const save = screen.getByRole('button', { name: /save plant/i }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);

    const enrich = screen.getByRole('button', { name: /enrich from permapeople/i });
    await user.click(enrich);

    await waitFor(
      () =>
        expect(
          screen.getByText(/Permapeople is unreachable right now/i),
        ).toBeTruthy(),
      { timeout: 2000 },
    );
    // Save remains enabled even after Permapeople failure
    expect(save.disabled).toBe(false);
  });
});
