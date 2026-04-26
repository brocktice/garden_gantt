import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-base text-stone-900 placeholder:text-stone-500',
          'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-green-700 focus-visible:border-green-700',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'aria-[invalid=true]:border-red-700',
          className,
        )}
        {...props}
      />
    );
  },
);
