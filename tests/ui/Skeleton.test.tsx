/**
 * @vitest-environment happy-dom
 */
// tests/ui/Skeleton.test.tsx
// Phase 4 Plan 04-01 Task 2: Skeleton primitive (D-08 loading state).
// Source: .planning/phases/04-polish-mobile-ship/04-01-PLAN.md (Task 2)
//         04-RESEARCH.md §Code Examples (Skeleton primitive)
//         04-UI-SPEC.md §Skeleton primitive
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from '../../src/ui/Skeleton';

describe('Skeleton (D-08)', () => {
  it('renders a div with animate-pulse + bg-stone-200 + rounded (default rect shape)', () => {
    const { container } = render(<Skeleton />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.tagName).toBe('DIV');
    expect(div).toHaveClass('animate-pulse');
    expect(div).toHaveClass('bg-stone-200');
    expect(div).toHaveClass('rounded');
  });

  it('applies role=presentation and aria-hidden=true', () => {
    const { container } = render(<Skeleton />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.getAttribute('role')).toBe('presentation');
    expect(div.getAttribute('aria-hidden')).toBe('true');
  });

  it('shape="circle" applies rounded-full', () => {
    const { container } = render(<Skeleton shape="circle" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div).toHaveClass('rounded-full');
  });

  it('shape="text" applies rounded AND h-4', () => {
    const { container } = render(<Skeleton shape="text" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div).toHaveClass('rounded');
    expect(div).toHaveClass('h-4');
  });

  it('merges className via cn (extra classes preserved)', () => {
    const { container } = render(<Skeleton shape="circle" className="w-8 h-8" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div).toHaveClass('rounded-full');
    expect(div).toHaveClass('w-8');
    expect(div).toHaveClass('h-8');
  });

  it('passes through arbitrary HTML attributes (data-testid)', () => {
    const { container } = render(<Skeleton data-testid="loading-ph" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.getAttribute('data-testid')).toBe('loading-ph');
  });
});
