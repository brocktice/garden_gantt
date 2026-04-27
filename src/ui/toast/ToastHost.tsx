// src/ui/toast/ToastHost.tsx
// Programmatic toast viewport. Mounts the Radix ToastProvider + ToastViewport once
// at the app root and renders one Toast per item in the in-memory toast store.
//
// D-09 contract: destructive reversibles dispatch the mutation then push a toast
// with an "Undo" action that calls `getTemporal().undo()`. The toast also
// auto-dismisses if the user undoes from another source (Cmd-Z, header button,
// page nav) so the user never has two competing undo paths (RESEARCH Pitfall 5).
//
// The store lives at module scope (zustand without middleware) — queue is in-memory
// only; toasts do not persist across reload.
//
// Source: [CITED: .planning/phases/04-polish-mobile-ship/04-03-PLAN.md Task 1]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-RESEARCH.md §Pitfall 5]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-PATTERNS.md §Toast-with-undo]

import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import {
  Toast,
  ToastAction,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastVariant,
} from '../Toast';
import { getTemporal, useTemporalStore } from '../../stores/planStore';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  duration: number;
  action?: { label: string; onClick: () => void };
  variant: ToastVariant;
  // Mount-time pastStates length captured when the toast is pushed. If the
  // current temporal pastStates length drops below this number, the user has
  // already undone via another path — auto-dismiss this toast (Pitfall 5).
  mountTimePastStatesCount: number;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => string;
  dismiss: (id: string) => void;
}

let nextId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = `toast-${nextId++}`;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/**
 * ToastHost — render this once at the app root. Subscribes to the toast store
 * and to zundo's temporal store so toasts auto-dismiss on external undo.
 */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const pastStatesCount = useTemporalStore((s) => s.pastStates.length);

  // Pitfall 5: when pastStates shrinks below a toast's mount-time count, undo
  // happened from another path — drop the toast so the user can't double-undo.
  useEffect(() => {
    for (const t of toasts) {
      if (pastStatesCount < t.mountTimePastStatesCount) {
        dismiss(t.id);
      }
    }
  }, [pastStatesCount, toasts, dismiss]);

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map((t) => (
        <ToastItemView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

function ToastItemView({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  // Drive auto-dismiss with our own timer (ms-precise; works under fake timers).
  // Radix Toast's internal duration would also dismiss visually, but we own the
  // store entry so we manage the lifetime here for testability + Pitfall 5.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (item.duration === Infinity || item.duration <= 0) return;
    timerRef.current = setTimeout(onDismiss, item.duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // onDismiss is stable per item id; safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.duration, item.id]);

  return (
    <Toast
      variant={item.variant}
      duration={Infinity}
      open
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <div className="flex flex-col gap-1">
        <ToastTitle>{item.title}</ToastTitle>
        {item.description && <ToastDescription>{item.description}</ToastDescription>}
      </div>
      {item.action && (
        <ToastAction
          altText={item.action.label}
          onClick={() => {
            item.action!.onClick();
            onDismiss();
          }}
        >
          {item.action.label}
        </ToastAction>
      )}
    </Toast>
  );
}

// Re-export getTemporal for convenience (so callers can `import { getTemporal } from '../ui/toast/ToastHost'`).
export { getTemporal };
