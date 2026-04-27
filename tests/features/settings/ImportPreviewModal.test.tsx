/**
 * @vitest-environment happy-dom
 */
// tests/features/settings/ImportPreviewModal.test.tsx
// Plan 04-03 Task 1 — second-step "Replace plan" confirmation gating.
// Plan 04-03 Task 3 — corrupt-import inline error wiring.
//
// Source: [CITED: .planning/phases/04-polish-mobile-ship/04-03-PLAN.md Task 1, Task 3]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-UI-SPEC.md §Destructive actions]

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ImportPreviewModal } from '../../../src/features/settings/ImportPreviewModal';
import { usePlanStore } from '../../../src/stores/planStore';
import { samplePlan } from '../../../src/samplePlan';
import type { ImportResult } from '../../../src/features/settings/importPlan';

type SuccessResult = Extract<ImportResult, { ok: true }>;

function makeSuccess(): SuccessResult {
  const incoming = structuredClone(samplePlan);
  incoming.plantings = incoming.plantings.slice(0, 2); // distinct shape
  return {
    ok: true,
    plan: incoming,
    meta: {
      plantingsCount: incoming.plantings.length,
      customPlantsCount: incoming.customPlants.length,
      zip: incoming.location.zip,
      zone: incoming.location.zone,
      needsMigration: false,
    },
  };
}

describe('ImportPreviewModal — Replace plan confirm step', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Seed current plan so the Replace step has a non-empty before-state.
    usePlanStore.setState({ plan: structuredClone(samplePlan) });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('clicking the primary apply button opens the second-step Replace dialog', async () => {
    const user = userEvent.setup();
    render(
      <ImportPreviewModal open onOpenChange={() => {}} result={makeSuccess()} />,
    );

    // The primary trigger button on the preview modal.
    const replaceTrigger = screen.getByRole('button', { name: /Replace my plan/ });
    await user.click(replaceTrigger);

    // Second dialog title is now visible.
    const confirmTitle = await screen.findByText(/Replace your current plan\?/);
    expect(confirmTitle).toBeTruthy();
    // The dialog must contain the "Replace plan" destructive confirm button.
    expect(
      screen.getByRole('button', { name: /^Replace plan$/ }),
    ).toBeTruthy();
  });

  it('confirming the second step applies the import (replaces plan)', async () => {
    const user = userEvent.setup();
    const success = makeSuccess();
    render(<ImportPreviewModal open onOpenChange={() => {}} result={success} />);

    await user.click(screen.getByRole('button', { name: /Replace my plan/ }));
    await user.click(await screen.findByRole('button', { name: /^Replace plan$/ }));

    const after = usePlanStore.getState().plan;
    expect(after?.plantings.length).toBe(success.meta.plantingsCount);
  });

  it('cancelling the second step returns to preview without applying', async () => {
    const user = userEvent.setup();
    const before = structuredClone(samplePlan);
    usePlanStore.setState({ plan: before });
    render(<ImportPreviewModal open onOpenChange={() => {}} result={makeSuccess()} />);

    await user.click(screen.getByRole('button', { name: /Replace my plan/ }));
    await screen.findByText(/Replace your current plan\?/);

    // The second-step Cancel button. Multiple Cancel buttons may exist (preview + confirm),
    // so target the one inside the second dialog by scoping.
    const dialogs = screen.getAllByRole('dialog');
    const confirmDialog = dialogs.find((d) =>
      d.textContent?.includes('Replace your current plan?'),
    );
    expect(confirmDialog).toBeTruthy();
    const cancelBtn = Array.from(
      confirmDialog!.querySelectorAll('button'),
    ).find((b) => b.textContent?.trim() === 'Cancel');
    expect(cancelBtn).toBeTruthy();
    await user.click(cancelBtn!);

    // After cancel: plan unchanged, preview still visible.
    expect(usePlanStore.getState().plan?.plantings.length).toBe(
      before.plantings.length,
    );
    expect(screen.getByText(/Import preview/)).toBeTruthy();
  });
});
