// @vitest-environment happy-dom
// tests/features/export-reminder/ExportReminderBanner.test.tsx
// Phase 4 Plan 04-05 Task 2 — banner shell + 3-action button row + a11y attributes.
// Source: 04-05-PLAN.md Task 2 behaviors; UI-SPEC §Export-reminder banner; D-13 copy.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format, parseISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';

// Mock module factories MUST be hoisted-safe: no top-level var refs inside the factory.
// We use vi.hoisted to share mock fns between factory and tests.
const { snooze3Mock, snooze30Mock, exportPlanMock } = vi.hoisted(() => ({
  snooze3Mock: vi.fn(),
  snooze30Mock: vi.fn(),
  exportPlanMock: vi.fn(() => ({ ok: true as const, filename: 'test.json' })),
}));

vi.mock('../../../src/features/export-reminder/useExportReminder', () => ({
  useExportReminder: vi.fn(),
  useShouldShowExportReminder: vi.fn(),
}));

vi.mock('../../../src/features/settings/exportPlan', () => ({
  exportPlan: exportPlanMock,
}));

import { ExportReminderBanner } from '../../../src/features/export-reminder/ExportReminderBanner';
import { useExportReminder } from '../../../src/features/export-reminder/useExportReminder';

const mockUseExportReminder = vi.mocked(useExportReminder);

function setHookState(state: {
  shouldShow: boolean;
  count?: number;
  lastExportedAt?: string | null;
}) {
  mockUseExportReminder.mockReturnValue({
    shouldShow: state.shouldShow,
    count: state.count ?? 0,
    lastExportedAt: state.lastExportedAt ?? null,
    snooze3Days: snooze3Mock,
    snooze30Days: snooze30Mock,
    formatLastExportedShort: () =>
      state.lastExportedAt
        ? // Match useExportReminder's real format helper (UTCDate-wrapped MMM d).
          format(new UTCDate(parseISO(state.lastExportedAt)), 'MMM d')
        : 'you started',
  });
}

describe('ExportReminderBanner', () => {
  beforeEach(() => {
    cleanup();
    snooze3Mock.mockClear();
    snooze30Mock.mockClear();
    exportPlanMock.mockClear();
    mockUseExportReminder.mockReset();
  });

  it('renders nothing when shouldShow=false', () => {
    setHookState({ shouldShow: false });
    const { container } = render(<ExportReminderBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders banner with count + Apr 15 date label when shouldShow=true', () => {
    setHookState({
      shouldShow: true,
      count: 25,
      lastExportedAt: '2026-04-15T12:00:00.000Z',
    });
    render(<ExportReminderBanner />);
    expect(screen.getByText(/25/)).toBeTruthy();
    expect(screen.getByText(/unsaved changes/i)).toBeTruthy();
    expect(screen.getByText(/Apr 15/)).toBeTruthy();
  });

  it('renders "since you started" when lastExportedAt is null', () => {
    setHookState({ shouldShow: true, count: 22, lastExportedAt: null });
    render(<ExportReminderBanner />);
    expect(screen.getByText(/since you started/i)).toBeTruthy();
  });

  it('renders three action buttons: Export plan, Remind me later, Don\'t remind for 30 days', () => {
    setHookState({ shouldShow: true, count: 22, lastExportedAt: null });
    render(<ExportReminderBanner />);
    expect(screen.getByRole('button', { name: /Export plan/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Remind me later/i })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Don't remind for 30 days/i }),
    ).toBeTruthy();
  });

  it('clicking "Export plan" calls exportPlan()', async () => {
    setHookState({ shouldShow: true, count: 22, lastExportedAt: null });
    const user = userEvent.setup();
    render(<ExportReminderBanner />);
    await user.click(screen.getByRole('button', { name: /Export plan/i }));
    expect(exportPlanMock).toHaveBeenCalledTimes(1);
  });

  it('clicking "Remind me later" calls snooze3Days()', async () => {
    setHookState({ shouldShow: true, count: 22, lastExportedAt: null });
    const user = userEvent.setup();
    render(<ExportReminderBanner />);
    await user.click(screen.getByRole('button', { name: /Remind me later/i }));
    expect(snooze3Mock).toHaveBeenCalledTimes(1);
  });

  it('clicking "Don\'t remind for 30 days" calls snooze30Days()', async () => {
    setHookState({ shouldShow: true, count: 22, lastExportedAt: null });
    const user = userEvent.setup();
    render(<ExportReminderBanner />);
    await user.click(
      screen.getByRole('button', { name: /Don't remind for 30 days/i }),
    );
    expect(snooze30Mock).toHaveBeenCalledTimes(1);
  });

  it('aside has role=status, aria-live=polite, and bg-stone-100 (UI-SPEC color contract)', () => {
    setHookState({ shouldShow: true, count: 22, lastExportedAt: null });
    render(<ExportReminderBanner />);
    const aside = screen.getByRole('status');
    expect(aside.getAttribute('aria-live')).toBe('polite');
    expect(aside.className).toMatch(/bg-stone-100/);
  });
});
