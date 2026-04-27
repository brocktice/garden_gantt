// src/features/gantt/lock/LockToggle.tsx
// 16x16 hover-revealed Lock icon at top-right corner of each bar.
// Always-visible (filled-Lock) when the event is locked.
// 24x24 invisible hit-target wrapper for WCAG 2.5.5 readiness (Phase 4 mobile audit).
// Per CONTEXT D-11, D-12 + UI-SPEC §3.
//
// Source: [CITED: src/features/catalog/MyPlanPill.tsx (analog: Lucide + button + cn pattern)]
//         [CITED: 03-PATTERNS.md §LockToggle.tsx]
//         [CITED: 03-CONTEXT.md D-11 (16x16 visible / 24x24 hit-target), D-12 (Lock + LockOpen Lucide)]
//         [CITED: 03-UI-SPEC.md §3 + §Lock toggle copy contract (aria-label format)]
//
// stopPropagation in onClick: prevents the document Alt-click listener
// (useLockKeybinding) from double-firing when the user clicks this button with Alt held.
// Without stop, Alt-click on the button would fire setLock twice.

import { Lock, LockOpen } from 'lucide-react';
import { usePlanStore } from '../../../stores/planStore';
import { cn } from '../../../ui/cn';
import { useIsMobile } from '../../mobile/useIsMobile';
import type { EventType } from '../../../domain/types';

interface LockToggleProps {
  plantingId: string;
  eventType: EventType;
  locked: boolean;
  plantName: string;
}

export function LockToggle({ plantingId, eventType, locked, plantName }: LockToggleProps) {
  const setLock = usePlanStore((s) => s.setLock);
  const isMobile = useIsMobile();
  // Phase 4 Plan 04-02 (D-03): hover-revealed lock toggle is desktop-only at <640px.
  // The bar's filled-lock outline ring (Phase 3 D-12) still renders for status; the
  // edit affordance moves to EditPlantingModal's Switch row on phones.
  if (isMobile) return null;
  const Icon = locked ? Lock : LockOpen;

  return (
    <button
      type="button"
      onClick={(e) => {
        // Prevent useLockKeybinding's document listener from also firing.
        e.stopPropagation();
        setLock(plantingId, eventType, !locked);
      }}
      aria-label={locked ? `Unlock ${plantName} ${eventType}` : `Lock ${plantName} ${eventType}`}
      className={cn(
        // 24x24 hit-target (per D-11) — w-6 h-6
        'inline-flex items-center justify-center w-6 h-6 rounded-sm',
        'transition-opacity duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700',
        locked
          ? 'opacity-100 text-stone-700' // always-visible filled lock — uses --color-lifecycle-locked semantically
          : 'opacity-0 group-hover:opacity-100 text-stone-400 hover:text-stone-700',
      )}
    >
      {/* 16x16 visible glyph */}
      <Icon className="w-4 h-4" />
    </button>
  );
}
