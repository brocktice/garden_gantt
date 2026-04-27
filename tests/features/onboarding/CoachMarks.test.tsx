/**
 * @vitest-environment happy-dom
 */
// tests/features/onboarding/CoachMarks.test.tsx
// Phase 4 Plan 04-04 Task 2: Hand-rolled coach marks portal + Esc/Enter keyboard.
//
// Source: .planning/phases/04-polish-mobile-ship/04-04-PLAN.md (Task 2)
//         04-UI-SPEC.md §Coach-mark visual style + §Onboarding coach marks

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';

import { CoachMarks } from '../../../src/features/onboarding/CoachMarks';
import { useUIStore } from '../../../src/stores/uiStore';
import { usePlanStore } from '../../../src/stores/planStore';
import { samplePlan } from '../../../src/samplePlan';

function Wrapper({
  children,
  initialEntries = ['/plan'],
}: {
  children: ReactNode;
  initialEntries?: string[];
}) {
  return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
}

beforeEach(() => {
  window.localStorage.clear();
  useUIStore.getState().setCoachMarksDismissed(false);
  // Plan with no plantings → only mark 1 visible by default
  usePlanStore.setState({ plan: { ...samplePlan, plantings: [] } });
  // Insert anchor in DOM so positioning resolves
  const anchor = document.createElement('button');
  anchor.setAttribute('data-coach-target', 'catalog-button');
  anchor.textContent = 'Add';
  anchor.id = 'test-anchor';
  document.body.appendChild(anchor);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.querySelectorAll('[data-coach-target]').forEach((n) => n.remove());
  useUIStore.getState().setCoachMarksDismissed(false);
});

describe('CoachMarks — render gate', () => {
  it('renders nothing when dismissed', () => {
    useUIStore.getState().setCoachMarksDismissed(true);
    render(
      <Wrapper>
        <CoachMarks />
      </Wrapper>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders nothing when route is not /plan', () => {
    render(
      <Wrapper initialEntries={['/setup']}>
        <CoachMarks />
      </Wrapper>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('CoachMarks — Mark 1 (catalog-button)', () => {
  it('renders dialog with heading + body verbatim', () => {
    render(
      <Wrapper>
        <CoachMarks />
      </Wrapper>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText('Pick your plants here')).toBeTruthy();
    expect(
      screen.getByText(
        'Browse the catalog or add custom plants to start your gantt.',
      ),
    ).toBeTruthy();
  });

  it('renders Skip tour + Next → buttons (mark 1 of 1 here, but body still uses Next? No — single mark = isLast = Got it)', () => {
    // With plantings=0, total=1, so isLast=true → Got it shown.
    render(
      <Wrapper>
        <CoachMarks />
      </Wrapper>,
    );
    expect(screen.getByRole('button', { name: 'Skip tour' })).toBeTruthy();
    // total=1, isLast=true → "Got it"
    expect(screen.getByRole('button', { name: 'Got it' })).toBeTruthy();
  });

  it('shows numbered indicator "1 of 1" when only mark 1 visible', () => {
    render(
      <Wrapper>
        <CoachMarks />
      </Wrapper>,
    );
    expect(screen.getByText('1 of 1')).toBeTruthy();
  });
});

describe('CoachMarks — staged reveal: 4 marks visible', () => {
  beforeEach(() => {
    usePlanStore.setState({ plan: { ...samplePlan } });
    // Add the additional anchors so positioning works as we advance
    ['first-bar', 'first-lock-toggle', 'calendar-tab'].forEach((id) => {
      const el = document.createElement('div');
      el.setAttribute('data-coach-target', id);
      el.textContent = id;
      document.body.appendChild(el);
    });
  });

  it('numbered indicator shows "1 of 4" with plantings present', () => {
    render(
      <Wrapper>
        <CoachMarks />
      </Wrapper>,
    );
    expect(screen.getByText('1 of 4')).toBeTruthy();
  });

  it('shows Next → on non-last marks', () => {
    render(
      <Wrapper>
        <CoachMarks />
      </Wrapper>,
    );
    expect(screen.getByRole('button', { name: /Next/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull();
  });

  it('clicking Next → advances to mark 2 (first-bar)', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <CoachMarks />
      </Wrapper>,
    );
    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getByText('Drag to adjust dates')).toBeTruthy();
    expect(screen.getByText('2 of 4')).toBeTruthy();
  });

  it('on mark 4 button label flips to Got it; clicking dismisses', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <CoachMarks />
      </Wrapper>,
    );
    await user.click(screen.getByRole('button', { name: /Next/ })); // 1 -> 2
    await user.click(screen.getByRole('button', { name: /Next/ })); // 2 -> 3
    await user.click(screen.getByRole('button', { name: /Next/ })); // 3 -> 4
    expect(screen.getByText('Switch to calendar view')).toBeTruthy();
    expect(screen.getByText('4 of 4')).toBeTruthy();
    const gotIt = screen.getByRole('button', { name: 'Got it' });
    await user.click(gotIt);
    expect(useUIStore.getState().onboarding.coachMarksDismissed).toBe(true);
  });
});

describe('CoachMarks — dismiss controls', () => {
  it('clicking Skip tour dismisses', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <CoachMarks />
      </Wrapper>,
    );
    await user.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(useUIStore.getState().onboarding.coachMarksDismissed).toBe(true);
  });

  it('Esc key dismisses', () => {
    render(
      <Wrapper>
        <CoachMarks />
      </Wrapper>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useUIStore.getState().onboarding.coachMarksDismissed).toBe(true);
  });

  it('Enter key advances (single-mark scenario → dismisses on last)', () => {
    render(
      <Wrapper>
        <CoachMarks />
      </Wrapper>,
    );
    fireEvent.keyDown(document, { key: 'Enter' });
    // total=1, advance on last → dismiss
    expect(useUIStore.getState().onboarding.coachMarksDismissed).toBe(true);
  });

  it('Esc inside an input does NOT dismiss (form-focus guard)', () => {
    render(
      <Wrapper>
        <>
          <input data-testid="form-input" defaultValue="x" />
          <CoachMarks />
        </>
      </Wrapper>,
    );
    const input = screen.getByTestId('form-input');
    input.focus();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(useUIStore.getState().onboarding.coachMarksDismissed).toBe(false);
  });
});

describe('CoachMarks — positioning', () => {
  it('callout is positioned with numeric left/top', () => {
    // happy-dom getBoundingClientRect returns 0s by default; positioning code
    // should still set numeric style values (left and top are read out as strings).
    render(
      <Wrapper>
        <CoachMarks />
      </Wrapper>,
    );
    const dialog = screen.getByRole('dialog') as HTMLElement;
    expect(dialog.style.left).toBeTruthy();
    expect(dialog.style.top).toBeTruthy();
    // Should be a px-suffixed string from inline style
    expect(dialog.style.left).toMatch(/px$/);
  });
});
