// src/features/gantt/drag/clampModifier.ts
// @dnd-kit modifier — runs every drag tick BEFORE the bar visually moves.
// Calls canMove(); if clamped, returns the clamped transform AND writes reasons[] via setViolation.
//
// Source: [CITED: 03-CONTEXT.md D-07, D-08]
//         [CITED: 03-RESEARCH.md §Pattern 1]
//         [CITED: dndkit.com/api-documentation/modifiers]
//
// Purity: pure factory; the returned modifier closes over plan/plant/scale references.
// The modifier itself is invoked synchronously by dnd-kit on every drag tick — it must be
// fast (< 1ms typical) and side-effect-light (only setViolation writes to dragStore).

import type { Modifier } from '@dnd-kit/core';
import type { TimeScale } from '../timeScale';
import type {
  EventType,
  GardenPlan,
  Plant,
  ScheduleEvent,
} from '../../../domain/types';
import { canMove } from '../../../domain/constraints';

interface ClampDeps {
  scale: TimeScale;
  event: ScheduleEvent;
  plan: GardenPlan;
  plant: Plant;
  setViolation: (
    v: { eventId: string; eventType: EventType; reasons: string[] } | null,
  ) => void;
}

export function makeClampModifier(deps: ClampDeps): Modifier {
  return ({ transform }) => {
    // Convert pixel delta → candidate date. xToDate() day-snaps internally
    // (timeScale.xToDate uses Math.round on day delta — locked Phase 1 contract D-06).
    const startX = deps.scale.dateToX(deps.event.start);
    const candidateX = startX + transform.x;
    const candidateDate = deps.scale.xToDate(candidateX);

    const result = canMove(deps.event, candidateDate, deps.plan, deps.plant);

    if ('clamped' in result && result.clamped) {
      deps.setViolation({
        eventId: deps.event.id,
        eventType: deps.event.type,
        reasons: result.reasons,
      });
      const clampedX = deps.scale.dateToX(result.finalDate);
      return { ...transform, x: clampedX - startX };
    }

    // Pass-through: clear violation; whole-day snap via dateToX(xToDate(...)) round-trip.
    deps.setViolation(null);
    const snappedX = deps.scale.dateToX(candidateDate);
    return { ...transform, x: snappedX - startX };
  };
}
