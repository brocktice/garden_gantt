// src/features/keyboard-drag/useKeyboardBarDrag.ts
// Linear-style keyboard drag controller for gantt bars (POL-08).
//
// Contract per UI-SPEC §Keyboard drag affordance + 04-CONTEXT POL-08 discretion:
//   - Focus a bar (data-event-id, data-planting-id, data-event-type, data-event-start)
//   - ArrowLeft / ArrowRight  → stage ±1 day delta (no commit yet)
//   - Shift + ArrowLeft / ArrowRight → stage ±7 day delta
//   - Enter → commit via planStore.commitEdit (single zundo entry, T-04-06-02)
//   - Escape → cancel pending stage (no commit; no zundo entry)
//   - L / l → toggle lock via planStore.setLock
//   - All transitions write to #kbd-drag-announcer for screen readers (POL-08)
//
// Suppression: matches isFormFocus pattern from src/stores/historyBindings.ts
// so arrow keys inside text inputs don't hijack the user's typing
// (T-04-06-01 mitigation).
//
// Source: [CITED: .planning/phases/04-polish-mobile-ship/04-06-PLAN.md Task 2]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-PATTERNS.md §useKeyboardBarDrag.ts]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-RESEARCH.md §Pitfall 4]
//         [CITED: src/features/gantt/lock/useLockKeybinding.ts (delegated [data-event-id] lookup)]
//         [CITED: src/stores/historyBindings.ts (isFormFocus pattern)]

import { useEffect, useRef } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { usePlanStore } from '../../stores/planStore';
import { nowISOString, ymdToISONoon } from '../../domain/dateWrappers';
import type { EventType } from '../../domain/types';

interface PendingState {
  plantingId: string;
  eventType: EventType;
  originalStartISO: string;
  pendingDeltaDays: number;
}

function isFormFocus(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches(
    'input, textarea, [contenteditable="true"], [contenteditable=""]',
  );
}

function announce(msg: string): void {
  const el = document.getElementById('kbd-drag-announcer');
  if (el) el.textContent = msg;
}

/**
 * Mount once at the gantt root (GanttView). Single document-level keydown listener
 * delegates by [data-event-id] ancestor — same pattern as useLockKeybinding so the
 * two listeners coexist without per-bar mounts (Pitfall 4 resolved by making the
 * bar the primary tab stop; L from focused bar handles lock without colliding with
 * the foreignObject LockToggle button).
 */
export function useKeyboardBarDrag(): void {
  const pendingRef = useRef<PendingState | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isFormFocus(e.target)) return;

      const targetEl = (e.target as Element | null)?.closest(
        '[data-event-id][data-planting-id][data-event-type]',
      );
      if (!(targetEl instanceof HTMLElement || targetEl instanceof SVGElement)) {
        return;
      }

      const plantingId = targetEl.getAttribute('data-planting-id');
      const eventType = targetEl.getAttribute('data-event-type') as EventType | null;
      const originalStartISO = targetEl.getAttribute('data-event-start');
      if (!plantingId || !eventType || !originalStartISO) return;

      // Reset pending state when focus moves to a different (planting, eventType) pair.
      if (
        !pendingRef.current ||
        pendingRef.current.plantingId !== plantingId ||
        pendingRef.current.eventType !== eventType
      ) {
        pendingRef.current = {
          plantingId,
          eventType,
          originalStartISO,
          pendingDeltaDays: 0,
        };
      }
      const p = pendingRef.current;

      const stage = (n: number) => {
        e.preventDefault();
        p.pendingDeltaDays += n;
        const newStart = addDays(parseISO(p.originalStartISO), p.pendingDeltaDays);
        const sign = p.pendingDeltaDays >= 0 ? '+' : '';
        announce(
          `Pending move ${sign}${p.pendingDeltaDays} day${p.pendingDeltaDays === 1 || p.pendingDeltaDays === -1 ? '' : 's'} to ${format(newStart, 'yyyy-MM-dd')}.`,
        );
      };

      if (e.key === 'ArrowRight') {
        stage(e.shiftKey ? 7 : 1);
        return;
      }
      if (e.key === 'ArrowLeft') {
        stage(e.shiftKey ? -7 : -1);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (p.pendingDeltaDays === 0) return;
        const newStart = addDays(parseISO(p.originalStartISO), p.pendingDeltaDays);
        const newStartYMD = format(newStart, 'yyyy-MM-dd');
        usePlanStore.getState().commitEdit({
          plantingId: p.plantingId,
          eventType: p.eventType,
          startOverride: ymdToISONoon(newStartYMD),
          reason: 'user-form-edit',
          editedAt: nowISOString(),
        });
        announce(`Moved to ${newStartYMD}. Press Cmd-Z to undo.`);
        pendingRef.current = null;
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        announce('Drag canceled. Original date kept.');
        pendingRef.current = null;
        return;
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        const planting = usePlanStore
          .getState()
          .plan?.plantings.find((pl) => pl.id === plantingId);
        const currentLock = planting?.locks?.[eventType] === true;
        usePlanStore.getState().setLock(plantingId, eventType, !currentLock);
        announce(currentLock ? 'Unlocked.' : 'Locked.');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
