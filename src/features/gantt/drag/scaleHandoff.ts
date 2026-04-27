// src/features/gantt/drag/scaleHandoff.ts
// Module-level singleton — GanttView writes the active TimeScale via setActiveScale() in a
// useEffect; DragLayer's dispatcher modifier reads via getActiveScale() each drag tick.
// Single-writer (GanttView mount), single-reader (DragLayer modifier) by construction —
// no race because both run on the React render thread.
//
// Why a module-level singleton: dnd-kit v6 modifiers receive only `{ active, transform,
// activeNodeRect, ... }` — they cannot accept user data via React props. Routing the
// TimeScale through the active-drag's `data.current` would bloat every <DraggableBar>
// `useDraggable` payload with a non-serializable scale instance. A module-level handoff
// keeps the data path narrow without touching the locked timeScale.ts API (Phase 1 D-06).
//
// Source: [CITED: 03-RESEARCH.md §Pattern 1 — dnd-kit modifier args do not include user data;
//          a module-level handoff is the canonical workaround]

import type { TimeScale } from '../timeScale';

let current: TimeScale | null = null;

export function setActiveScale(s: TimeScale | null): void {
  current = s;
}

export function getActiveScale(): TimeScale | null {
  return current;
}
