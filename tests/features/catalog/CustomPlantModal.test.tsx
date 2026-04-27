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

  it('Permapeople fetch fail shows D-10 inline pill (replaces legacy multi-line block); Save stays enabled (CAT-07 + Plan 04-03 Task 4)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      // Throwing TypeError mimics CORS / network failure (the canonical browser signal)
      throw new TypeError('Failed to fetch');
    });

    const user = userEvent.setup();
    const { container } = await renderModal();

    const nameInput = screen.getByLabelText(/plant name/i);
    await user.type(nameInput, 'Tomato');

    const save = screen.getByRole('button', { name: /save plant/i }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);

    const enrich = screen.getByRole('button', { name: /enrich from permapeople/i });
    await user.click(enrich);

    // D-10 pill copy + role=status + aria-live=polite.
    await waitFor(
      () =>
        expect(
          screen.getByText(/Couldn.t fetch — try again/),
        ).toBeTruthy(),
      { timeout: 2000 },
    );
    const pill = screen.getByText(/Couldn.t fetch — try again/);
    expect(pill.getAttribute('role')).toBe('status');
    expect(pill.getAttribute('aria-live')).toBe('polite');

    // Legacy multi-line block must NOT render.
    expect(
      container.textContent?.includes('Permapeople is unreachable right now'),
    ).toBe(false);

    // Save remains enabled even after Permapeople failure.
    expect(save.disabled).toBe(false);
  });

  it('Permapeople loading state renders D-08 spinner button: disabled, animate-spin, "Looking up…" label preserved', async () => {
    // never-resolving fetch
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise(() => {}) as ReturnType<typeof fetch>,
    );

    const user = userEvent.setup();
    const { container } = await renderModal();
    const nameInput = screen.getByLabelText(/plant name/i);
    await user.type(nameInput, 'Tomato');
    await user.click(
      screen.getByRole('button', { name: /enrich from permapeople/i }),
    );

    // The loading variant of the button: disabled + animate-spin + "Looking up…" text.
    const lookingBtn = await screen.findByRole('button', {
      name: /Looking up…/,
    });
    expect((lookingBtn as HTMLButtonElement).disabled).toBe(true);
    expect(lookingBtn.textContent).toMatch(/Looking up…/);
    // The Loader2 icon inside the button has the animate-spin class.
    const spinner = lookingBtn.querySelector('[class*="animate-spin"]');
    // Fallback: any element in the document with animate-spin (lucide-react may
    // place the class on a wrapper or the svg itself depending on version).
    const anySpinner = spinner ?? container.querySelector('.animate-spin') ?? container.querySelector('[class*="animate-spin"]');
    expect(anySpinner).not.toBeNull();
  });

  it('Enrich button remains clickable after error pill renders (retry path)', async () => {
    let calls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      calls += 1;
      throw new TypeError('Failed to fetch');
    });

    const user = userEvent.setup();
    await renderModal();
    const nameInput = screen.getByLabelText(/plant name/i);
    await user.type(nameInput, 'Tomato');

    const enrich1 = screen.getByRole('button', {
      name: /enrich from permapeople/i,
    });
    await user.click(enrich1);
    await waitFor(
      () => expect(screen.getByText(/Couldn.t fetch — try again/)).toBeTruthy(),
      { timeout: 2000 },
    );

    // Re-click: the Enrich button is still rendered + clickable.
    const enrich2 = screen.getByRole('button', {
      name: /enrich from permapeople/i,
    });
    expect((enrich2 as HTMLButtonElement).disabled).toBe(false);
    await user.click(enrich2);
    await waitFor(() => expect(calls).toBeGreaterThanOrEqual(2));
  });
});
