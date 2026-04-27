// src/features/gantt/lock/useLockKeybinding.ts
// Document Alt-click listener — toggles lock on the bar under the cursor.
// Power-user shortcut per CONTEXT D-11.
//
// Source: [CITED: src/app/AppShell.tsx lines 30-40 (analog: document listener with cleanup)]
//         [CITED: 03-PATTERNS.md §useLockKeybinding.ts]
//
// Contract:
// - Only fires when altKey is held on click.
// - Target must have (or be inside) [data-event-id][data-planting-id][data-event-type]
//   — the same trio shipped on every gantt bar by GanttView's <DraggableBar> (D-26).
// - LockToggle.onClick stops propagation so a normal-click on the button does NOT
//   double-fire setLock through this listener.

import { useEffect } from 'react';
import { usePlanStore } from '../../../stores/planStore';
import type { EventType } from '../../../domain/types';

export function useLockKeybinding(): void {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!e.altKey) return;
      const target = (e.target as Element | null)?.closest(
        '[data-event-id][data-planting-id][data-event-type]',
      );
      if (!target) return;
      e.preventDefault();
      const eventId = target.getAttribute('data-event-id');
      const plantingId = target.getAttribute('data-planting-id');
      const eventType = target.getAttribute('data-event-type') as EventType | null;
      if (!eventId || !plantingId || !eventType) return;
      // Read current lock state from store + toggle.
      const planting = usePlanStore
        .getState()
        .plan?.plantings.find((p) => p.id === plantingId);
      const currentLock = planting?.locks?.[eventType] === true;
      usePlanStore.getState().setLock(plantingId, eventType, !currentLock);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
