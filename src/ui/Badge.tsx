import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'tender'
    | 'half-hardy'
    | 'hardy'
    | 'cool'
    | 'warm'
    | 'custom'
    | 'permapeople'
    | 'manual';
}

const VARIANT_CLASSES: Record<NonNullable<BadgeProps['variant']>, string> = {
  tender: 'bg-red-100 text-red-800',
  'half-hardy': 'bg-amber-100 text-amber-800',
  hardy: 'bg-green-100 text-green-900',
  cool: 'bg-blue-100 text-blue-900',
  warm: 'bg-orange-100 text-orange-900',
  custom: 'bg-neutral-200 text-neutral-800',
  permapeople: 'bg-violet-100 text-violet-700',
  manual: 'bg-sky-100 text-sky-700',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = 'custom', className, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold uppercase tracking-wider',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
});
