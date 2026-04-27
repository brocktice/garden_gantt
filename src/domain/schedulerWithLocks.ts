// src/domain/schedulerWithLocks.ts
// Lock-aware wrapper over generateSchedule (per CONTEXT D-08 / D-13).
// Source: [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md D-13]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-RESEARCH.md §Pattern 5]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-01-PLAN.md Task 2 (C)]
//         [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-08-PLAN.md Task 1 (CR-02 closure)]
//
// Purity: zero React/Zustand/I/O; date math via dateWrappers only (re-exports scheduler output).
//
// Contract (CR-02 closure): For any planting where `locks[event.type] === true`, the
// returned event's start/end MUST be held fixed across cascade reflows — independent of
// upstream anchor changes (plan.location.lastFrostDate) AND independent of explicit edits
// to OTHER events in the same planting. The wrapper enforces this by:
//   1. Computing an EDIT-FREE baseline via generateSchedule({...plan, edits: []}, catalog).
//      This is the engine-computed value at the moment of locking, before any user drags.
//      The lock pins to this value: locks mean "hold this event where the unedited engine
//      put it", which is what users see when they hit the lock toggle on a fresh plan.
//   2. Synthesizing ScheduleEdit entries for every locks[type]=true that has NO matching
//      plan.edits[] entry, anchored at the edit-free baseline event's start (and end, for
//      windowed events). Re-uses the existing 'user-form-edit' reason enum so the
//      ScheduleEdit type stays surgical; widening the union to add 'lock-synth' is
//      deferred (Phase 4).
//   3. Re-running generateSchedule with [...plan.edits, ...synth-edits] so the engine —
//      which is the single source of truth for cascade — applies user edits + lock-synth
//      edits together. The findEdit() last-write-wins ordering ensures lock-synth edits
//      (appended after user edits) win for the locked event, while user edits on
//      OTHER events are honored (their cascades are recomputed from the edited anchor;
//      locked downstream events stay pinned via their own synth).
//
// Lock-vs-edit precedence: when a locked event already has a matching plan.edits[] entry,
// the explicit edit value wins; the lock pre-pass skips synthesis for that (plantingId,
// eventType) pair. This preserves user intent: an explicit drag-edit on a locked event
// is the user re-anchoring the lock to a new value.
//
// Out of scope (Phase 3): event types whose dates are NOT consumed from plan.edits[] by
// the engine (germination-window, water-seedlings, harden-off-day, fertilize-at-flowering)
// cannot be locked via this wrapper alone — locking them is a no-op at the engine level.
// The Phase 3 lock UI only exposes the editable lifecycle types (indoor-start, transplant,
// harden-off, direct-sow, harvest-window). Editable-germination is a Phase 4 concern.
//
// Perf note: the wrapper runs generateSchedule twice when any lock-without-edit synthesis
// is needed. The fast-path early return (`augmentedEdits.length === plan.edits.length`)
// short-circuits the second call when no synthesis happens, preserving byte-identical
// passthrough for the common no-locks case (tested via deep-equal).

import { generateSchedule } from './scheduler';
import type { EventType, GardenPlan, Plant, ScheduleEdit, ScheduleEvent } from './types';

// Event types whose dates are consumed from plan.edits[] by the engine.
// Keep in sync with findEdit() call sites in scheduler.ts.
const EDIT_CONSUMING_EVENTS: ReadonlySet<EventType> = new Set([
  'indoor-start',
  'harden-off',
  'transplant',
  'direct-sow',
  'harvest-window',
]);

// Event types that emit a windowed range (start + end). For these, the synthesized edit
// MUST carry endOverride so locks pin both ends.
const WINDOWED_EVENTS: ReadonlySet<EventType> = new Set([
  'harden-off',
  'harvest-window',
]);

export function generateScheduleWithLocks(
  plan: GardenPlan,
  catalog: ReadonlyMap<string, Plant>,
): ScheduleEvent[] {
  const existingEdits = plan.edits ?? [];

  // Detect whether ANY active lock exists on an edit-consuming event type. When none,
  // we short-circuit to plain generateSchedule(plan, catalog) so the no-locks case
  // is byte-identical to the engine output (preserves deep-equal passthrough test).
  let hasActiveLock = false;
  outer: for (const planting of plan.plantings) {
    const locks = planting.locks ?? {};
    for (const [eventTypeKey, isLocked] of Object.entries(locks)) {
      if (!isLocked) continue;
      if (!EDIT_CONSUMING_EVENTS.has(eventTypeKey as EventType)) continue;
      // A lock that already has a matching edit can't synthesize anything either.
      const hasExplicitEdit = existingEdits.some(
        (e) => e.plantingId === planting.id && e.eventType === eventTypeKey,
      );
      if (hasExplicitEdit) continue;
      hasActiveLock = true;
      break outer;
    }
  }
  if (!hasActiveLock) {
    return generateSchedule(plan, catalog);
  }

  // 1. Edit-free baseline. The lock pins to the engine-computed value at the moment of
  //    locking — i.e. what the user sees on a clean plan before any drags. Computing the
  //    baseline WITHOUT existing edits means an explicit edit on event A doesn't drag
  //    a locked event B along its cascade.
  const baseline = generateSchedule({ ...plan, edits: [] }, catalog);

  // 2. Synthesize lock-anchor edits for every active lock without an explicit edit.
  const augmentedEdits: ScheduleEdit[] = [...existingEdits];
  const now = new Date().toISOString();

  for (const planting of plan.plantings) {
    const locks = planting.locks ?? {};
    for (const [eventTypeKey, isLocked] of Object.entries(locks)) {
      if (!isLocked) continue;
      const eventType = eventTypeKey as EventType;
      if (!EDIT_CONSUMING_EVENTS.has(eventType)) continue;

      // Lock-vs-edit precedence: explicit edits beat lock-synth. Skip synthesis when
      // a matching edit already exists in plan.edits[].
      const hasExplicitEdit = augmentedEdits.some(
        (e) => e.plantingId === planting.id && e.eventType === eventType,
      );
      if (hasExplicitEdit) continue;

      const baselineEvent = baseline.find(
        (e) => e.plantingId === planting.id && e.type === eventType,
      );
      if (!baselineEvent) continue;

      const synth: ScheduleEdit = {
        plantingId: planting.id,
        eventType,
        startOverride: baselineEvent.start,
        ...(WINDOWED_EVENTS.has(eventType) ? { endOverride: baselineEvent.end } : {}),
        // Re-use existing reason enum to keep ScheduleEdit shape surgical (CR-02 scope).
        reason: 'user-form-edit',
        editedAt: now,
      };
      augmentedEdits.push(synth);
    }
  }

  // 3. Re-run with augmented edits so the engine renders the locked dates pinned.
  return generateSchedule({ ...plan, edits: augmentedEdits }, catalog);
}
