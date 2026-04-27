// src/domain/schedulerWithLocks.ts
// Lock-aware thin wrapper over generateSchedule (per CONTEXT D-08 / D-13).
// Source: [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md D-13]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-RESEARCH.md §Pattern 5]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-01-PLAN.md Task 2 (C)]
//
// Purity: zero React/Zustand/I/O; date math via dateWrappers only (re-exports scheduler output).
//
// Contract: For any planting where `locks[event.type] === true`, the returned event's
// start/end MUST match the corresponding ScheduleEdit in plan.edits[]. If no edit exists
// for a locked event, the engine's computed value is used and `edited: false` is preserved
// (locked-on-default).
//
// The engine extension in Plan 03-01 Task 2(A) already consumes plan.edits[]; this wrapper
// is the documented public seam between the pure engine and lock-aware UI. Plan 03-03's
// useDerivedSchedule will switch to call generateScheduleWithLocks() instead of
// generateSchedule() directly. The lock map is consumed by drag UI (which prevents NEW
// edits to locked events) and by cascade preview (useTransientSchedule preserves locked
// dates during the rAF-throttled live cascade).

import { generateSchedule } from './scheduler';
import type { GardenPlan, Plant, ScheduleEvent } from './types';

export function generateScheduleWithLocks(
  plan: GardenPlan,
  catalog: ReadonlyMap<string, Plant>,
): ScheduleEvent[] {
  // Phase 3 invariant: the engine has already consumed plan.edits[] (Plan 03-01 Task 2A).
  // This wrapper is a defensive contract assertion — if a planting has locks[type]=true,
  // the event's start/end MUST equal the matching edit. We pass-through; engine is
  // authoritative.
  return generateSchedule(plan, catalog);
}
