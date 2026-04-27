/**
 * @vitest-environment happy-dom
 */
// tests/features/setup/ZipInput.test.tsx
// Plan 04-03 Task 3 — D-10 inline error wiring on ZipInput.
//
// Source: [CITED: .planning/phases/04-polish-mobile-ship/04-03-PLAN.md Task 3]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-UI-SPEC.md §Error states]

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { ZipInput } from '../../../src/features/setup/ZipInput';

afterEach(() => cleanup());

const NOT_FOUND_COPY =
  "Couldn't find that ZIP. Try a 5-digit US ZIP, or enter your zone manually below.";

describe('ZipInput — D-10 inline error', () => {
  it('renders the error helper text and aria-invalid=true when error prop is set', () => {
    render(
      <ZipInput value="99999" onChange={() => {}} error={NOT_FOUND_COPY} />,
    );
    const input = screen.getByLabelText(/Your ZIP code/);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(NOT_FOUND_COPY)).toBeTruthy();
  });

  it('does not render error text and aria-invalid=false when error prop is absent', () => {
    render(<ZipInput value="" onChange={() => {}} />);
    const input = screen.getByLabelText(/Your ZIP code/);
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(screen.queryByText(NOT_FOUND_COPY)).toBeNull();
  });

  it('helper text uses the destructive red palette', () => {
    render(
      <ZipInput value="99999" onChange={() => {}} error={NOT_FOUND_COPY} />,
    );
    const helper = screen.getByText(NOT_FOUND_COPY);
    expect(helper.className).toMatch(/text-red-700/);
  });
});
