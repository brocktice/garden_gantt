// src/ui/Skeleton.tsx
// Loading-placeholder primitive (D-08). Decorative — role=presentation + aria-hidden
// keep AT users out of the pulse loop while content streams in.
//
// Source: .planning/phases/04-polish-mobile-ship/04-RESEARCH.md §Code Examples (Skeleton)
//         .planning/phases/04-polish-mobile-ship/04-UI-SPEC.md §Skeleton primitive
//         .planning/phases/04-polish-mobile-ship/04-PATTERNS.md §src/ui/Skeleton.tsx
import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  shape?: 'rect' | 'text' | 'circle';
}

export function Skeleton({ shape = 'rect', className, ...props }: SkeletonProps) {
  const shapeClass = {
    rect: 'rounded',
    text: 'rounded h-4',
    circle: 'rounded-full',
  }[shape];
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn('animate-pulse bg-stone-200', shapeClass, className)}
      {...props}
    />
  );
}
