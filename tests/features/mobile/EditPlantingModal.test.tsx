// @vitest-environment happy-dom
// tests/features/mobile/EditPlantingModal.test.tsx
// Phase 4 Plan 04-02 Task 1: tap-to-edit modal for the mobile gantt.
//
// Source: .planning/phases/04-polish-mobile-ship/04-02-PLAN.md Task 1 behaviors
//         .planning/phases/04-polish-mobile-ship/04-PATTERNS.md §EditPlantingModal
//         .planning/phases/04-polish-mobile-ship/04-UI-SPEC.md §Mobile tap-to-edit modal

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditPlantingModal } from '../../../src/features/mobile/EditPlantingModal';
import { usePlanStore } from '../../../src/stores/planStore';
import { useCatalogStore } from '../../../src/stores/catalogStore';
import { samplePlan } from '../../../src/samplePlan';
import type { Plant, Planting } from '../../../src/domain/types';

const tomatoPlanting: Planting = {
  id: 'p-tomato-test',
  plantId: 'tomato',
  successionIndex: 0,
};

beforeEach(() => {
  cleanup();
  // Seed the store with sample plan + an extra known planting.
  const seeded = structuredClone(samplePlan);
  seeded.plantings = [tomatoPlanting];
  seeded.edits = [];
  usePlanStore.setState({ plan: seeded });
  useCatalogStore.setState({ customPlants: [], permapeopleCache: {} });
});

afterEach(() => {
  cleanup();
});

describe('EditPlantingModal — Task 1 behaviors', () => {
  it('renders title "Edit {plant.name}" using catalog plant name', () => {
    render(
      <EditPlantingModal
        open
        onOpenChange={vi.fn()}
        plantingId={tomatoPlanting.id}
        eventType="transplant"
      />,
    );
    // catalog name for 'tomato' is 'Tomato'
    expect(screen.getByText(/Edit Tomato/i)).toBeTruthy();
  });

  it('renders ONE date input for non-harvest-window event types', () => {
    render(
      <EditPlantingModal
        open
        onOpenChange={vi.fn()}
        plantingId={tomatoPlanting.id}
        eventType="transplant"
      />,
    );
    const dates = document.querySelectorAll('input[type="date"]');
    expect(dates.length).toBe(1);
  });

  it('renders TWO date inputs for harvest-window (start + end)', () => {
    render(
      <EditPlantingModal
        open
        onOpenChange={vi.fn()}
        plantingId={tomatoPlanting.id}
        eventType="harvest-window"
      />,
    );
    const dates = document.querySelectorAll('input[type="date"]');
    expect(dates.length).toBe(2);
    expect(screen.getByText(/Harvest ends/i)).toBeTruthy();
  });

  it('Save calls commitEdit with newStart parsed via ymdToISONoon and closes', async () => {
    const onOpenChange = vi.fn();
    const commitSpy = vi.spyOn(usePlanStore.getState(), 'commitEdit');
    render(
      <EditPlantingModal
        open
        onOpenChange={onOpenChange}
        plantingId={tomatoPlanting.id}
        eventType="transplant"
      />,
    );

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-05-15' } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    await userEvent.click(saveBtn);

    expect(commitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        plantingId: tomatoPlanting.id,
        eventType: 'transplant',
        startOverride: '2026-05-15T12:00:00.000Z',
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Cancel does NOT call commitEdit', async () => {
    const onOpenChange = vi.fn();
    const commitSpy = vi.spyOn(usePlanStore.getState(), 'commitEdit');
    render(
      <EditPlantingModal
        open
        onOpenChange={onOpenChange}
        plantingId={tomatoPlanting.id}
        eventType="transplant"
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelBtn);

    expect(commitSpy).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('toggling Lock switch calls setLock(plantingId, eventType, true)', async () => {
    const setLockSpy = vi.spyOn(usePlanStore.getState(), 'setLock');
    render(
      <EditPlantingModal
        open
        onOpenChange={vi.fn()}
        plantingId={tomatoPlanting.id}
        eventType="transplant"
      />,
    );

    // Switch element rendered by Radix has role="switch"
    const sw = screen.getByRole('switch');
    await userEvent.click(sw);

    expect(setLockSpy).toHaveBeenCalledWith(tomatoPlanting.id, 'transplant', true);
  });

  it('Delete planting button calls removePlanting + onDelete + closes', async () => {
    const onOpenChange = vi.fn();
    const onDelete = vi.fn();
    const removeSpy = vi.spyOn(usePlanStore.getState(), 'removePlanting');
    render(
      <EditPlantingModal
        open
        onOpenChange={onOpenChange}
        plantingId={tomatoPlanting.id}
        eventType="transplant"
        onDelete={onDelete}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: /delete planting/i });
    await userEvent.click(deleteBtn);

    expect(removeSpy).toHaveBeenCalledWith(tomatoPlanting.id);
    expect(onDelete).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders the "Lock this date" copy and "Delete planting" copy verbatim (UI-SPEC contract)', () => {
    render(
      <EditPlantingModal
        open
        onOpenChange={vi.fn()}
        plantingId={tomatoPlanting.id}
        eventType="transplant"
      />,
    );
    expect(screen.getByText('Lock this date')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete planting' })).toBeTruthy();
  });

  it('renders violation text when constraint clamps the candidate date', async () => {
    // Tomato is tender. SamplePlan lastFrost is 2026-04-15. A transplant before
    // last frost should clamp to 2026-04-15 and surface the reason.
    render(
      <EditPlantingModal
        open
        onOpenChange={vi.fn()}
        plantingId={tomatoPlanting.id}
        eventType="transplant"
      />,
    );

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-03-01' } });

    // Constraint violation copy: "Can't move before {date} — {reason}."
    const violation = await screen.findByText(/Can't move before/i);
    expect(violation).toBeTruthy();
  });
});
