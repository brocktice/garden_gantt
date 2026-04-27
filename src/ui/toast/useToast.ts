// src/ui/toast/useToast.ts
// Imperative `pushToast` API + `useToast` hook. Both delegate to the in-memory
// toast store in ToastHost.tsx. Importing `pushToast` from a non-React module
// (e.g. a setter side-effect, a mutation handler) avoids a Provider/Context
// requirement — the toast queue lives at module scope.
//
// Source: [CITED: .planning/phases/04-polish-mobile-ship/04-03-PLAN.md Task 1]

import { getTemporal } from '../../stores/planStore';
import { useToastStore, type ToastItem } from './ToastHost';
import type { ToastVariant } from '../Toast';

export interface PushToastOptions {
  title: string;
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
  variant?: ToastVariant;
}

const DEFAULT_DURATION_MS = 5000;

export function pushToast(opts: PushToastOptions): string {
  const item: Omit<ToastItem, 'id'> = {
    title: opts.title,
    duration: opts.duration ?? DEFAULT_DURATION_MS,
    variant: opts.variant ?? 'success',
    mountTimePastStatesCount: getTemporal().pastStates.length,
  };
  if (opts.description !== undefined) item.description = opts.description;
  if (opts.action !== undefined) item.action = opts.action;
  return useToastStore.getState().push(item);
}

/** Hook form for components that prefer the React idiom. */
export function useToast(): { pushToast: typeof pushToast } {
  return { pushToast };
}
