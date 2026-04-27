// @vitest-environment happy-dom
// tests/app/AppShell.banner-stack.test.tsx
// Phase 4 Plan 04-06 Task 1: AppShell mounts banner-stack selector +
// SkipToMain + sr-only announcer + ToastHost + CoachMarks.
//
// Source: .planning/phases/04-polish-mobile-ship/04-06-PLAN.md Task 1 behaviors
//         .planning/phases/04-polish-mobile-ship/04-RESEARCH.md §Open Question 1
//         .planning/phases/04-polish-mobile-ship/04-UI-SPEC.md §Banner stack

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';

// Mock heavy/component-tree-deep modules so the AppShell render is isolated.
vi.mock('../../src/features/catalog/MyPlanPill', () => ({
  MyPlanPill: () => <div data-testid="my-plan-pill" />,
}));
vi.mock('../../src/features/catalog/MyPlanPanel', () => ({
  MyPlanPanel: () => <div data-testid="my-plan-panel" />,
}));
vi.mock('../../src/app/PermapeopleAttributionFooter', () => ({
  PermapeopleAttributionFooter: () => <div data-testid="ppl-footer" />,
}));
vi.mock('../../src/features/gantt/tooltip/ConstraintTooltip', () => ({
  ConstraintTooltip: () => <div data-testid="constraint-tooltip-mock" />,
}));
vi.mock('../../src/features/onboarding/CoachMarks', () => ({
  CoachMarks: () => <div data-testid="coach-marks-mock" />,
}));
vi.mock('../../src/ui/toast/ToastHost', () => ({
  ToastHost: () => <div data-testid="toast-host-mock" />,
}));
vi.mock('../../src/features/export-reminder/useExportReminder', () => ({
  useShouldShowExportReminder: vi.fn(() => ({
    shouldShow: false,
    count: 0,
    lastExportedAt: null,
  })),
  useExportReminder: vi.fn(() => ({
    shouldShow: false,
    count: 0,
    lastExportedAt: null,
    snooze3Days: vi.fn(),
    snooze30Days: vi.fn(),
    formatLastExportedShort: () => 'you started',
  })),
}));

import { AppShell } from '../../src/app/AppShell';
import { useUIStore } from '../../src/stores/uiStore';
import {
  useShouldShowExportReminder,
  useExportReminder,
} from '../../src/features/export-reminder/useExportReminder';

function resetUIStore() {
  useUIStore.setState({
    bannerDismissed: false,
    isStorageAvailable: true,
    isStorageFull: false,
  });
}

beforeEach(() => {
  resetUIStore();
  vi.mocked(useShouldShowExportReminder).mockReturnValue({
    shouldShow: false,
    count: 0,
    lastExportedAt: null,
  });
  vi.mocked(useExportReminder).mockReturnValue({
    shouldShow: false,
    count: 0,
    lastExportedAt: null,
    snooze3Days: vi.fn(),
    snooze30Days: vi.fn(),
    formatLastExportedShort: () => 'you started',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AppShell — banner stack priority (Plan 04-06 Task 1)', () => {
  it('Test 1: storage-full takes precedence over iOS Private and export reminder', () => {
    useUIStore.setState({
      isStorageFull: true,
      isStorageAvailable: false,
      bannerDismissed: false,
    });
    vi.mocked(useShouldShowExportReminder).mockReturnValue({
      shouldShow: true,
      count: 30,
      lastExportedAt: null,
    });
    render(
      <AppShell>
        <div>child</div>
      </AppShell>,
    );
    expect(screen.getByText(/Storage full/i)).toBeTruthy();
    // iOS Private banner copy must NOT render (its key phrase).
    expect(screen.queryByText(/Heads up — your changes won't be saved/i)).toBeNull();
    // Export reminder copy must NOT render.
    expect(screen.queryByText(/unsaved changes/i)).toBeNull();
  });

  it('Test 2: when storage-full=false and storage unavailable, iOS Private banner renders', () => {
    useUIStore.setState({
      isStorageFull: false,
      isStorageAvailable: false,
      bannerDismissed: false,
    });
    render(
      <AppShell>
        <div>child</div>
      </AppShell>,
    );
    expect(screen.getByText(/changes won't be saved/i)).toBeTruthy();
    expect(screen.queryByText(/^Storage full/i)).toBeNull();
  });

  it('Test 3: export reminder renders when storage healthy and reminder qualifies', () => {
    useUIStore.setState({
      isStorageFull: false,
      isStorageAvailable: true,
      bannerDismissed: false,
    });
    vi.mocked(useShouldShowExportReminder).mockReturnValue({
      shouldShow: true,
      count: 25,
      lastExportedAt: null,
    });
    vi.mocked(useExportReminder).mockReturnValue({
      shouldShow: true,
      count: 25,
      lastExportedAt: null,
      snooze3Days: vi.fn(),
      snooze30Days: vi.fn(),
      formatLastExportedShort: () => 'you started',
    });
    render(
      <AppShell>
        <div>child</div>
      </AppShell>,
    );
    expect(screen.getByText(/unsaved changes/i)).toBeTruthy();
  });

  it('Test 4: no banner when none qualify', () => {
    useUIStore.setState({
      isStorageFull: false,
      isStorageAvailable: true,
      bannerDismissed: false,
    });
    render(
      <AppShell>
        <div>child</div>
      </AppShell>,
    );
    expect(screen.queryByText(/^Storage full/i)).toBeNull();
    expect(screen.queryByText(/changes won't be saved/i)).toBeNull();
    expect(screen.queryByText(/unsaved changes/i)).toBeNull();
  });
});

describe('AppShell — SkipToMain + announcer + portals (Plan 04-06 Task 1)', () => {
  it('Test 5: SkipToMain renders as the first child of the shell tree', () => {
    const { container } = render(
      <AppShell>
        <div>child</div>
      </AppShell>,
    );
    // First focusable element should be the skip link.
    const firstAnchor = container.querySelector('a[href="#main"]');
    expect(firstAnchor).toBeTruthy();
    expect(firstAnchor?.textContent).toBe('Skip to main content');
    // It should appear before the <header> in the DOM order.
    const header = container.querySelector('header');
    expect(header).toBeTruthy();
    if (firstAnchor && header) {
      const cmp = firstAnchor.compareDocumentPosition(header);
      // Header follows the skip link in document order.
      expect(cmp & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('Test 6: kbd-drag-announcer div present with aria-live=polite + sr-only', () => {
    const { container } = render(
      <AppShell>
        <div>child</div>
      </AppShell>,
    );
    const announcer = container.querySelector('#kbd-drag-announcer');
    expect(announcer).toBeTruthy();
    expect(announcer?.getAttribute('aria-live')).toBe('polite');
    expect(announcer?.className).toMatch(/sr-only/);
  });

  it('Test 7: ToastHost + CoachMarks are mounted', () => {
    render(
      <AppShell>
        <div>child</div>
      </AppShell>,
    );
    expect(screen.getByTestId('toast-host-mock')).toBeTruthy();
    expect(screen.getByTestId('coach-marks-mock')).toBeTruthy();
  });

  it('Test 8: <main id="main"> still renders children (existing structure preserved)', () => {
    render(
      <AppShell>
        <div data-testid="child-content">child</div>
      </AppShell>,
    );
    const main = document.getElementById('main');
    expect(main).toBeTruthy();
    expect(within(main!).getByTestId('child-content')).toBeTruthy();
  });
});
