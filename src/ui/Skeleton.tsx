// src/ui/Skeleton.tsx
// Pulse loading placeholder primitive (D-08). Renders a stone-200 animate-pulse block
// at the requested shape/size. Aria-hidden + role=presentation: skeletons are not
// announced; surrounding role=status containers announce "loading" to screen readers.
//
// Source: [CITED: .planning/phases/04-polish-mobile-ship/04-PATTERNS.md §src/ui/Skeleton.tsx]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-UI-SPEC.md §Loading states]
//
// Dependency note: Plan 01 (wave 0) is the canonical home for this primitive; this
// worktree (Plan 03, wave 1) ships it locally because Plan 01 has not yet merged into
// the parallel branch base. The shape contract matches the Plan 01 spec exactly.

import { cn } from './cn';

export interface SkeletonProps {
  shape?: 'rect' | 'text' | 'circle' | 'card';
  variant?: 'line' | 'rect' | 'card';
  w?: string;
  h?: string;
  count?: number;
  className?: string;
}

/**
 * Skeleton — pulse-animated placeholder.
 *
 * Default shape='rect'. Use `className` to size (e.g. `className="h-5 w-full"`)
 * or pass `w`/`h` strings (e.g. `w="100%"`, `h="20px"`).
 */
export function Skeleton({
  shape = 'rect',
  variant,
  w,
  h,
  count = 1,
  className,
}: SkeletonProps) {
  // `variant` is an alias accepted by some call sites; map onto shape.
  const effectiveShape =
    variant === 'line'
      ? 'rect'
      : variant === 'card'
        ? 'card'
        : variant === 'rect'
          ? 'rect'
          : shape;

  const items = Array.from({ length: count }).map((_, i) => (
    <div
      key={i}
      role="presentation"
      aria-hidden="true"
      className={cn(
        'bg-stone-200 animate-pulse',
        effectiveShape === 'circle' ? 'rounded-full' : 'rounded-md',
        // Sensible defaults that callers usually override via className.
        effectiveShape === 'text' && 'h-4 w-full',
        effectiveShape === 'rect' && 'h-5 w-full',
        effectiveShape === 'card' && 'h-48 w-full',
        effectiveShape === 'circle' && 'h-8 w-8',
        className,
      )}
      style={{ width: w, height: h }}
    />
  ));
  return <>{items}</>;
}
