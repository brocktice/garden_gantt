/**
 * @vitest-environment happy-dom
 */
// tests/features/settings/SettingsPanel.test.tsx
// Phase 4 Plan 04-04 Task 2: Reset onboarding row.
//
// Source: .planning/phases/04-polish-mobile-ship/04-04-PLAN.md (Task 2)
//         04-UI-SPEC.md §Settings additions

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { SettingsPanel } from '../../../src/features/settings/SettingsPanel';
import { useUIStore } from '../../../src/stores/uiStore';
import { useToastStore } from '../../../src/ui/toast/ToastHost';

beforeEach(() => {
  window.localStorage.clear();
  useUIStore.getState().setCoachMarksDismissed(true);
  // Drain toast store between tests
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SettingsPanel — Reset onboarding row', () => {
  it('renders label "Reset onboarding"', () => {
    render(
      <MemoryRouter>
        <SettingsPanel />
      </MemoryRouter>,
    );
    expect(screen.getByText('Reset onboarding')).toBeTruthy();
  });

  it('renders helper text "Show the Plan-page tour again on your next visit."', () => {
    render(
      <MemoryRouter>
        <SettingsPanel />
      </MemoryRouter>,
    );
    expect(
      screen.getByText('Show the Plan-page tour again on your next visit.'),
    ).toBeTruthy();
  });

  it('renders a Reset button', () => {
    render(
      <MemoryRouter>
        <SettingsPanel />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Reset' })).toBeTruthy();
  });

  it('clicking Reset flips coachMarksDismissed back to false', async () => {
    const user = userEvent.setup();
    expect(useUIStore.getState().onboarding.coachMarksDismissed).toBe(true);
    render(
      <MemoryRouter>
        <SettingsPanel />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(useUIStore.getState().onboarding.coachMarksDismissed).toBe(false);
  });

  it('clicking Reset pushes a confirmation toast', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SettingsPanel />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    const toasts = useToastStore.getState().toasts;
    expect(toasts.length).toBe(1);
    expect(toasts[0]!.title).toBe(
      'Tour will show next time you visit Plan.',
    );
  });
});
