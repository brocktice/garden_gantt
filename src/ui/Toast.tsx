/**
 * Toast primitives — shadcn-style composition over @radix-ui/react-toast.
 *
 * Variants per UI-SPEC §11:
 *  - success: green-700 background, white text
 *  - warning: amber-100 background, amber-900 text, amber-200 border
 *  - error:   red-700 background, white text
 *
 * Auto-dismiss 4s default — set duration={4000} on <ToastProvider>; consumers can
 * override with duration={Infinity} for sticky toasts. Stack capped to 3 by
 * consumer logic + Provider's swipeDirection="right".
 */
import * as ToastPrimitive from '@radix-ui/react-toast';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from 'react';
import { X } from 'lucide-react';
import { cn } from './cn';

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = forwardRef<
  ElementRef<typeof ToastPrimitive.Viewport>,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(function ToastViewport({ className, ...props }, ref) {
  return (
    <ToastPrimitive.Viewport
      ref={ref}
      className={cn(
        'fixed bottom-4 right-4 z-50 flex max-h-screen w-full max-w-[420px] flex-col gap-2 outline-none',
        className,
      )}
      {...props}
    />
  );
});

const VARIANT_CLASSES = {
  success: 'bg-green-700 text-white border border-green-800',
  warning: 'bg-amber-100 text-amber-900 border border-amber-200',
  error: 'bg-red-700 text-white border border-red-800',
} as const;

export type ToastVariant = keyof typeof VARIANT_CLASSES;

export interface ToastProps extends ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  variant?: ToastVariant;
}

export const Toast = forwardRef<ElementRef<typeof ToastPrimitive.Root>, ToastProps>(
  function Toast({ className, variant = 'success', ...props }, ref) {
    return (
      <ToastPrimitive.Root
        ref={ref}
        className={cn(
          'pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-md p-4 shadow-md',
          'transition-[opacity,transform] duration-150',
          'data-[state=closed]:opacity-0 data-[state=closed]:translate-x-2',
          'data-[state=open]:opacity-100 data-[state=open]:translate-x-0',
          'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
          'data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform',
          'data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
          VARIANT_CLASSES[variant],
          className,
        )}
        {...props}
      />
    );
  },
);

export const ToastTitle = forwardRef<
  ElementRef<typeof ToastPrimitive.Title>,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(function ToastTitle({ className, ...props }, ref) {
  return (
    <ToastPrimitive.Title ref={ref} className={cn('text-sm font-semibold', className)} {...props} />
  );
});

export const ToastDescription = forwardRef<
  ElementRef<typeof ToastPrimitive.Description>,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(function ToastDescription({ className, ...props }, ref) {
  return (
    <ToastPrimitive.Description ref={ref} className={cn('text-sm opacity-90', className)} {...props} />
  );
});

export const ToastAction = forwardRef<
  ElementRef<typeof ToastPrimitive.Action>,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(function ToastAction({ className, ...props }, ref) {
  return (
    <ToastPrimitive.Action
      ref={ref}
      className={cn(
        'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium',
        'border-white/30 hover:bg-white/10',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
        className,
      )}
      {...props}
    />
  );
});

export const ToastClose = forwardRef<
  ElementRef<typeof ToastPrimitive.Close>,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(function ToastClose({ className, ...props }, ref) {
  return (
    <ToastPrimitive.Close
      ref={ref}
      className={cn(
        'rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current',
        className,
      )}
      toast-close=""
      {...props}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </ToastPrimitive.Close>
  );
});
