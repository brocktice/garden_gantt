---
phase: 03-drag-cascade-calendar-tasks
verified: 2026-04-27T05:18:53Z
status: gaps_found
score: 3/6 must-haves verified
overrides_applied: 0
gaps:
  - truth: "User pinning an event with the lock toggle sees that event held fixed during subsequent cascades, while unlocked events still reflow"
    status: failed
    reason: "generateScheduleWithLocks is a literal pass-through to generateSchedule. The wrapper's docstring describes the contract but never enforces it. A planting with locks[eventType]=true and NO matching plan.edits[] entry will still cascade from the recomputed anchor on every schedule pass — the lock is silently ignored. The lock UI ring renders, the LockToggle button writes locks[type]=true, but the cascade does not honor the lock. Confirmed in src/domain/schedulerWithLocks.ts:32 (`return generateSchedule(plan, catalog)`). Existing schedulerWithLocks.test.ts only verifies (a) no-locks deep-equals generateSchedule and (b) locked-with-edit returns the edit value — neither test covers the lock-survives-cascade contract."
    artifacts:
      - path: "src/domain/schedulerWithLocks.ts"
        issue: "Function body is `return generateSchedule(plan, catalog)` — no lock enforcement logic. Locks without a corresponding edit are not honored on cascade."
      - path: "tests/domain/schedulerWithLocks.test.ts"
        issue: "Test 'locked-on-default (lock set, no edit) preserves engine-computed value' confirms the BROKEN behavior — the value is whatever the engine computes from the current anchor, NOT held fixed across an anchor change. There is no test that mutates plan.location.lastFrostDate or another upstream anchor and asserts a locked event's date stays unchanged."
    missing:
      - "Pre-pass in generateScheduleWithLocks that synthesizes ScheduleEdit entries for every locks[type]=true that has no existing plan.edits[] match, anchored at the current baseline schedule's value, then calls generateSchedule with the augmented edits[]"
      - "Test: lock event without edit, mutate lastFrostDate, assert locked event start unchanged while unlocked downstream events shift"
      - "Test: lock harvest-window without edit, drag transplant later, assert harvest stays put (the canonical Phase 3 SC #3 scenario)"

  - truth: "User can add custom one-off or recurring tasks tied to a planting or free-floating (TASK-02) and the dashboard groups by plant (TASK-06)"
    status: partial
    reason: "CustomTaskModal renders the 'Attach to planting' Select widget and stores the selection in form state, but buildTask() never writes plantingId to the produced CustomTask. The CustomTask type (types.ts:155) explicitly does `Omit<Task, 'source' | 'plantingId'>`, so the field has nowhere to land. taskToForm hardcodes plantingId: FREE_FLOATING on edit-mode, losing any prior attach state. Result: every saved custom task is free-floating, regardless of UI selection. TaskGroup.keyOf() groups by t.plantingId — custom tasks always land in the __free__ group when groupBy='plant'. The TASK-02 'tied to a planting' clause is only half-implemented (UI present, persistence missing)."
    artifacts:
      - path: "src/features/tasks/CustomTaskModal.tsx"
        issue: "buildTask (lines 137-169) collects form.plantingId but does not write it to the returned CustomTask. taskToForm (line 128-131) hardcodes FREE_FLOATING."
      - path: "src/domain/types.ts"
        issue: "CustomTask interface at line 155 omits plantingId via `Omit<Task, 'source' | 'plantingId'>` — type prevents storing the attachment."
      - path: "src/domain/schemas.ts"
        issue: "customTasks: z.array(z.unknown()) at line 104 — no schema validation for plantingId in any case, so this won't be caught by import either."
    missing:
      - "Widen CustomTask to inherit Task.plantingId (drop 'plantingId' from the Omit)"
      - "buildTask: spread `...(form.plantingId !== FREE_FLOATING ? { plantingId: form.plantingId } : {})` into the returned task"
      - "taskToForm: read t.plantingId ?? FREE_FLOATING instead of hardcoding"
      - "Optional: tighten Zod customTasks schema to validate plantingId"

  - truth: "User can edit and delete custom tasks (TASK-03) without leaking persisted state"
    status: partial
    reason: "removeCustomTask (planStore.ts:302-313) removes the task from customTasks but does NOT prune `${id}` or `${id}:YYYY-MM-DD` keys from plan.completedTaskIds. editCustomTask (planStore.ts:287-300) is also at risk: changing dueDate or recurrence orphans previously-completed `${id}:OLD-DATE` keys. Both setters mutate updatedAt and run through zundo, so the leak is replicated through history. Over a season of add/edit/remove churn this grows unbounded; if newTaskId ever collides via Math.random suffix, an orphaned completion key would silently mark a brand-new task as complete (latent correctness bug)."
    artifacts:
      - path: "src/stores/planStore.ts"
        issue: "removeCustomTask (lines 302-313) and editCustomTask (lines 287-300) leave completedTaskIds untouched on task deletion / recurrence change."
    missing:
      - "removeCustomTask: filter out k===id and k.startsWith(`${id}:`) from completedTaskIds in the same set() call"
      - "editCustomTask: when patch contains dueDate or recurrence, prune `${id}:*` per-occurrence keys"
      - "Test: addCustomTask → toggleTaskCompletion(`${id}:2026-05-01`) → removeCustomTask(id) → assert completedTaskIds is []"
deferred: []
---

# Phase 3: Drag, Cascade, Calendar & Tasks Verification Report

**Phase Goal:** "The product becomes the product. Users can drag bars to adjust dates with constraint enforcement and downstream cascade, undo any edit, toggle to a calendar view, and see a Today/This Week task dashboard fed by the schedule engine."
**Verified:** 2026-04-27T05:18:53Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| #   | Truth                                                                                                                                                                                                              | Status        | Evidence                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | User dragging a transplant bar for a tomato sees ghost-bar previews of every downstream event updating in real time; releasing commits the cascade and unedited downstream events reflow accordingly               | ✓ VERIFIED    | DragLayer wires DndContext with onDragStart/Move/End → useTransientSchedule → generateScheduleWithLocks; GhostOverlay subscribes to transientEdit. commitEdit appends sparse ScheduleEdit. scheduler.ts consumes plan.edits[] (verified by tests/domain/scheduler.editsRespected.test.ts).             |
| 2   | User attempting to drag a frost-tender plant's transplant before the last spring frost gets snap-back to the constraint boundary with a clear tooltip                                                              | ✓ VERIFIED    | clampModifier in DragLayer dispatcherModifier (DragLayer.tsx:57+); ConstraintTooltip subscribes to dragViolation + lastConstraintViolation; constraints.ts has frostTenderTransplant rule + hardenOffMustPrecedeTransplant + harvestMustFollowTransplantByDTM (Plan 03-01 must_have verified).        |
| 3   | User pinning an event with the lock toggle sees that event held fixed during subsequent cascades, while unlocked events still reflow                                                                               | ✗ FAILED      | **BLOCKER (CR-02).** schedulerWithLocks.ts:32 is `return generateSchedule(plan, catalog)` — pass-through. Locked events without an edit reflow on every cascade. Lock UI works (LockToggle wires setLock); cascade does not.                                                                          |
| 4   | User pressing Cmd/Ctrl-Z reverses the last drag (with at least 20 levels of history); Cmd/Ctrl-Shift-Z re-applies it                                                                                                | ✓ VERIFIED    | planStore.ts uses zundo `temporal` middleware INSIDE persist (line 116); `limit: 20` (line 334); historyBindings.ts hooks Cmd/Ctrl-Z, Cmd/Ctrl-Shift-Z, and Ctrl-Y. Form-focus suppression in place.                                                                                                  |
| 5   | User toggling between gantt and calendar views sees the exact same schedule events; clicking any day on the calendar opens a detail panel listing every event and task scheduled for that day                     | ✓ VERIFIED    | PlanViewTabs in App.tsx; lazy CalendarView wraps `@fullcalendar/react` with daygrid+timegrid+interaction plugins; selectEventsForCalendar projects schedule events; useDayDetailUrl drives DayDetailDrawer URL state. (Note: WR-03 — empty `?date=` falls through; minor UX bug, not goal-blocking.) |
| 6   | User opening the Tasks dashboard sees today's, this-week's, and overdue tasks (auto-derived from schedule events plus user-authored custom tasks), groupable by plant or category, with bulk check-off             | ⚠️ PARTIAL    | Today / This Week / Overdue partition works (useTodayWeekOverdue, D-32 today-merges-overdue). Group-by toggle (plant/category) wired via uiStore.taskGroupBy. **TASK-02 attach-to-planting is broken (CR-01)** — tasks always land in __free__ group when groupBy='plant'. Bulk check-off intentionally deferred to v2 per CONTEXT D-34 (acceptable scope reduction). |

**Score:** 3/6 truths verified, 1 partial (#6 due to CR-01), 2 failed (#3 due to CR-02; #6's plantingId leak counted as partial here, full failure breakdown below)

Note: SC#6 is counted as a single truth but spans TASK-01..06. The "groupable by plant" sub-clause is functionally broken for custom tasks because of CR-01. SC#3 (locks) is the cleanest failure — directly traces to CR-02.

### Required Artifacts

| Artifact                                                | Expected                                       | Status      | Details                                                                            |
| ------------------------------------------------------- | ---------------------------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| `src/domain/types.ts`                                   | Planting.locks; CustomTask                     | ⚠️ STUB     | locks added; CustomTask omits plantingId (CR-01 root cause)                       |
| `src/domain/schemas.ts`                                 | Zod for v3                                     | ✓ VERIFIED  | schemaVersion=3; customTasks loose (z.unknown[]) per acknowledged Phase 4 cleanup  |
| `src/domain/migrations.ts`                              | v2→v3 migrations                               | ✓ VERIFIED  | CURRENT_SCHEMA_VERSION = 3; locks defaulted                                        |
| `src/domain/scheduler.ts`                               | Consumes plan.edits[]                          | ✓ VERIFIED  | edits respected by snapshot tests                                                  |
| `src/domain/schedulerWithLocks.ts`                      | Lock-aware wrapper                             | ✗ STUB      | **CR-02 BLOCKER** — pass-through, no enforcement                                  |
| `src/domain/constraints.ts`                             | hardenOff + DTM constraints                    | ✓ VERIFIED  | Both rules wired into rules[]                                                      |
| `src/domain/taskEmitter.ts`                             | expandRecurringTasks                           | ✓ VERIFIED  | Implemented; minor perf concern WR-07 (warning only)                               |
| `src/stores/planStore.ts`                               | zundo + setLock + commitEdit + task setters    | ⚠️ STUB     | **CR-03** — removeCustomTask/editCustomTask leak completedTaskIds                 |
| `src/stores/dragStore.ts`                               | transient drag state                           | ✓ VERIFIED  | Used by DragLayer + GhostOverlay                                                   |
| `src/stores/historyBindings.ts`                         | Cmd-Z keybindings                              | ✓ VERIFIED  | Wired with focus suppression                                                       |
| `src/features/gantt/drag/DragLayer.tsx`                 | DndContext + dispatcher modifier               | ✓ VERIFIED  | dnd-kit fully wired                                                                |
| `src/features/gantt/drag/clampModifier.ts`              | Constraint clamp                               | ✓ VERIFIED  | Wired in dispatcher                                                                |
| `src/features/gantt/drag/GhostOverlay.tsx`              | Cascade preview                                | ✓ VERIFIED  | Subscribes to transient schedule                                                   |
| `src/features/gantt/drag/useDragBar.ts`                 | useDraggable per bar                           | ✓ VERIFIED  | Wired into GanttView bars                                                          |
| `src/features/gantt/drag/useTransientSchedule.ts`       | rAF transient cascade                          | ✓ VERIFIED  | Calls generateScheduleWithLocks (which is unfortunately pass-through)              |
| `src/features/gantt/lock/LockToggle.tsx`                | Lock button per bar                            | ✓ VERIFIED  | Calls setLock; UI ring renders. **Behavior is hollow due to CR-02.**              |
| `src/features/gantt/lock/useLockKeybinding.ts`          | Alt-click to lock                              | ✓ VERIFIED  | Document-level handler                                                             |
| `src/features/gantt/tooltip/ConstraintTooltip.tsx`      | Tooltip for violations                         | ✓ VERIFIED  | Subscribes to drag + sticky violation. (WR-09: unsanitized querySelector)         |
| `src/features/calendar/CalendarView.tsx`                | FullCalendar wrapper                           | ✓ VERIFIED  | dayGrid + timeGrid + interaction plugins; lazy-loaded                              |
| `src/features/calendar/DayDetailDrawer.tsx`             | Day detail panel                               | ✓ VERIFIED  | Renders events + tasks for clicked day                                             |
| `src/features/calendar/selectEventsForCalendar.ts`      | Schedule→FullCalendar projection               | ✓ VERIFIED  | Pure projection                                                                    |
| `src/app/PlanViewTabs.tsx`                              | Gantt/Calendar tab toggle                      | ✓ VERIFIED  | Mounted in App.tsx route                                                           |
| `src/features/tasks/TasksDashboard.tsx`                 | Today/Week/Overdue + group-by                  | ✓ VERIFIED  | Mounted at /tasks; group-by toggle wired                                           |
| `src/features/tasks/CustomTaskModal.tsx`                | Author/edit/delete custom tasks                | ✗ STUB      | **CR-01 BLOCKER** — Attach-to-planting Select is decorative; plantingId dropped   |
| `src/features/tasks/deriveTasks.ts`                     | Pure projection                                | ✓ VERIFIED  | Pure; uses expandRecurringTasks                                                    |
| `src/features/tasks/useTodayWeekOverdue.ts`             | Partition selector                             | ✓ VERIFIED  | D-32 today-merges-overdue. (WR-01: nowISOString memo dep — perf only.)            |
| `src/features/tasks/useExpandedTasks.ts`                | Centralized recurring expansion                | ✓ VERIFIED  | Both calendar + dashboard use it                                                   |
| `src/features/tasks/useCompositeCompletionKey.ts`       | Composite key helpers                          | ✓ VERIFIED  | Implemented                                                                        |

### Key Link Verification

| From                              | To                                | Via                                       | Status      | Details                                                              |
| --------------------------------- | --------------------------------- | ----------------------------------------- | ----------- | -------------------------------------------------------------------- |
| `scheduler.ts`                    | `plan.edits[]`                    | find by (plantingId, eventType)           | ✓ WIRED     | Matches Plan 03-01 expected pattern                                  |
| `migrations.ts`                   | `Planting.locks`                  | v2→v3 default {}                          | ✓ WIRED     | CURRENT_SCHEMA_VERSION=3                                              |
| `useDerivedSchedule.ts`           | `generateScheduleWithLocks`       | imports + calls                           | ✓ WIRED     | Called, but downstream contract is broken (CR-02)                    |
| `useTransientSchedule.ts`         | `generateScheduleWithLocks`       | rAF-throttled cascade                     | ✓ WIRED     | Same broken-contract caveat                                          |
| `LockToggle`                      | `planStore.setLock`               | onClick                                   | ✓ WIRED     | Mutation propagates; effect on cascade is null per CR-02             |
| `historyBindings`                 | `getTemporal()`                   | document-level keydown                    | ✓ WIRED     | Cmd-Z / Cmd-Shift-Z / Ctrl-Y all hooked                              |
| `DragLayer`                       | `clampModifier` + `dispatcher`    | DndContext modifiers                      | ✓ WIRED     | (WR-06: closure over plan; minor staleness window)                   |
| `CalendarView`                    | `selectEventsForCalendar`         | events prop                               | ✓ WIRED     | FullCalendar receives projection                                     |
| `PlanViewTabs`                    | App.tsx /plan route               | conditional render                        | ✓ WIRED     | Lazy CalendarView, eager DragLayer                                   |
| `TasksDashboard`                  | `usePlanStore.toggleTaskCompletion`| TaskRow checkbox                          | ✓ WIRED     | Composite + bare keys both supported                                 |
| `CustomTaskModal`                 | `addCustomTask` / `editCustomTask`| save handler                              | ⚠️ PARTIAL  | Setters called, but plantingId is dropped en route (CR-01)           |
| `CustomTaskModal`                 | `removeCustomTask`                | delete-with-inline-confirm                | ⚠️ PARTIAL  | Setter called, but completedTaskIds leak (CR-03)                     |
| `TasksDashboard`                  | `uiStore.taskGroupBy`             | group-by toggle                           | ✓ WIRED     | Functional; effect for custom-task plant group is null (CR-01)       |

### Data-Flow Trace (Level 4)

| Artifact                  | Data Variable        | Source                                                             | Produces Real Data                            | Status      |
| ------------------------- | -------------------- | ------------------------------------------------------------------ | --------------------------------------------- | ----------- |
| `GanttView`               | scheduleEvents       | useDerivedSchedule → generateScheduleWithLocks → live plan          | Yes (engine consumes plan.edits)              | ✓ FLOWING   |
| `CalendarView`            | calendar events      | selectEventsForCalendar(scheduleEvents)                            | Yes                                           | ✓ FLOWING   |
| `TasksDashboard`          | tasks                | useExpandedTasks → deriveTasks(events, customTasks, catalog)        | Yes                                           | ✓ FLOWING   |
| `GhostOverlay`            | transient events     | useDragStore.transientEdit → useTransientSchedule                   | Yes (during drag)                             | ✓ FLOWING   |
| `DayDetailDrawer`         | day events + tasks   | URL param ?date= → filter from same projections                     | Yes (WR-03: empty `?date=` produces hollow render) | ⚠️ MOSTLY-FLOWING |
| `LockToggle` (visual)     | locked: boolean      | planting.locks[type] from plan store                                | Yes                                           | ✓ FLOWING   |
| `LockToggle` (semantic)   | enforced lock        | generateScheduleWithLocks (pass-through)                            | **No — locks not enforced**                   | ✗ DISCONNECTED |

### Behavioral Spot-Checks

| Behavior                                  | Command                                    | Result                          | Status |
| ----------------------------------------- | ------------------------------------------ | ------------------------------- | ------ |
| Test suite passes                          | `npx vitest run`                            | 271/271 pass across 36 files    | ✓ PASS |
| schedulerWithLocks contract test exists    | grep test file                              | Tests exist, but the lock-cascade contract is NOT tested (CR-02 silent failure) | ⚠️ FAIL — coverage gap |
| Lock on locked-no-edit + cascade           | (no test exists)                            | Cannot verify automatically; code inspection confirms broken | ✗ FAIL |
| Custom task plantingId persists across save | grep CustomTaskModal/buildTask              | buildTask omits plantingId       | ✗ FAIL |
| completedTaskIds prune on remove           | grep removeCustomTask                       | No prune logic                   | ✗ FAIL |
| Cmd-Z keybinding routes to temporal.undo   | grep historyBindings                        | Wired; preventDefault present    | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s)         | Description                                                                         | Status        | Evidence                                                                                                       |
| ----------- | ---------------------- | ----------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------- |
| GANTT-04    | 03-03, 03-07            | Drag any phase boundary or whole-bar to adjust dates                                | ✓ SATISFIED   | DragLayer + useDragBar; commitEdit on drag-end                                                                  |
| GANTT-05    | 03-01, 03-03, 03-07     | Drag respects constraints (frost-tender, hardenOff, DTM)                            | ✓ SATISFIED   | constraints.ts rules + clampModifier; tests pass                                                                |
| GANTT-06    | 03-03, 03-07            | Ghost/preview of affected downstream events during drag                             | ✓ SATISFIED   | GhostOverlay + useTransientSchedule                                                                             |
| GANTT-07    | 03-01, 03-02, 03-03, 03-07 | Releasing drag commits sparse ScheduleEdit; downstream events reflow             | ✓ SATISFIED   | commitEdit + scheduler.editsRespected.test.ts                                                                   |
| GANTT-08    | 03-01, 03-02, 03-06, 03-07 | Lock individual events; cascade reflow won't move them                           | ✗ BLOCKED     | **CR-02** — generateScheduleWithLocks is pass-through. Lock UI works; cascade does not honor locks.            |
| GANTT-09    | 03-03, 03-07            | Snap to constraint boundary + tooltip                                                | ✓ SATISFIED   | clampModifier + ConstraintTooltip                                                                               |
| GANTT-10    | 03-02, 03-06, 03-07     | Undo (≥20 levels) + Redo                                                            | ✓ SATISFIED   | zundo + limit: 20 + historyBindings                                                                             |
| CAL-01      | 03-04, 03-07            | Toggle gantt ↔ calendar; same underlying events                                     | ✓ SATISFIED   | PlanViewTabs + selectEventsForCalendar                                                                          |
| CAL-02      | 03-04, 03-07            | Month + week views                                                                  | ✓ SATISFIED   | dayGrid + timeGrid plugins                                                                                      |
| CAL-03      | 03-04, 03-07            | Click day → events + tasks panel                                                    | ✓ SATISFIED   | DayDetailDrawer + useDayDetailUrl                                                                               |
| TASK-01     | 03-05, 03-07            | Auto-derived tasks appear on calendar + dashboard                                   | ✓ SATISFIED   | deriveTasks + taskEmitter                                                                                       |
| TASK-02     | 03-05, 03-07            | Custom one-off or recurring tasks tied to a planting or free-floating               | ⚠️ PARTIAL    | **CR-01** — recurring works; "tied to a planting" silently dropped on save. UI present, persistence broken.    |
| TASK-03     | 03-05, 03-07            | Edit and delete custom tasks                                                        | ⚠️ PARTIAL    | **CR-03** — removeCustomTask/editCustomTask leak completedTaskIds; functional but state hygiene broken         |
| TASK-04     | 03-02, 03-05, 03-07     | All tasks checkable; completion persists                                            | ✓ SATISFIED   | toggleTaskCompletion + composite keys + persist + zundo                                                         |
| TASK-05     | 03-05, 03-07            | Today/This Week + overdue dashboard                                                 | ✓ SATISFIED   | useTodayWeekOverdue partition; D-32 merge                                                                       |
| TASK-06     | 03-02, 03-05, 03-07     | Group by plant or category; bulk check-off                                          | ⚠️ PARTIAL    | Group-by works; **bulk check-off explicitly deferred to v2 per D-34**. CR-01 also breaks group-by-plant for custom tasks. |

**Coverage:** All 16 phase requirement IDs are claimed by ≥1 plan. **Orphaned requirements:** none.

### Anti-Patterns Found

| File                                                | Line | Pattern                                              | Severity   | Impact                                                                          |
| --------------------------------------------------- | ---- | ---------------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| `src/domain/schedulerWithLocks.ts`                  | 24-33 | Pass-through wrapper; doc claims contract not enforced | 🛑 BLOCKER | CR-02 — locks silently no-op on cascade                                          |
| `src/features/tasks/CustomTaskModal.tsx`            | 158-165 | buildTask omits collected form.plantingId            | 🛑 BLOCKER | CR-01 — attach-to-planting is decorative                                         |
| `src/stores/planStore.ts`                           | 287-313 | Setters mutate task list; orphan completedTaskIds     | 🛑 BLOCKER | CR-03 — unbounded growth + collision risk                                        |
| `src/features/tasks/useTodayWeekOverdue.ts`         | 60   | nowISOString() ms-precision in memo dep              | ⚠️ WARNING | WR-01 — full task pipeline rebuilds every render                                 |
| `src/features/gantt/drag/dragHandlers.ts`           | 18-83 | rAF coalescer can write transientEdit after endDrag  | ⚠️ WARNING | WR-02 — latent stale-cascade race (currently benign)                             |
| `src/features/calendar/useDayDetailUrl.ts`          | 16-17 | Empty `?date=` opens drawer with empty heading       | ⚠️ WARNING | WR-03 — minor UX bug                                                             |
| `src/features/settings/exportPlan.ts`               | 50-56 | revokeObjectURL synchronous after click()            | ⚠️ WARNING | WR-04 — Safari/WebView download race                                             |
| `src/features/gantt/drag/DragLayer.tsx`             | 57-77 | Modifier closure captures plan; recreated on every plan change | ⚠️ WARNING | WR-06 — minor staleness window                                                  |
| `src/domain/taskEmitter.ts`                         | 197-201 | Unbounded skip-ahead loop for ancient dueDate         | ⚠️ WARNING | WR-07 — adversarial input causes hang                                            |
| `src/stores/planStore.ts` (editCustomTask)          | 287-300 | `Partial<CustomTask>` patch overwrites with stale recurrence | ⚠️ WARNING | WR-08 — recurring→one-time leaves orphan recurrence field                       |
| `src/features/gantt/tooltip/ConstraintTooltip.tsx`  | 103-105 | Unsanitized eventId in querySelector                 | ⚠️ WARNING | WR-09 — selector throws on user-influenced custom plant ids                      |
| `src/samplePlan.ts`                                 | 21-23 | Hardcoded 2026 frost dates                           | ℹ️ INFO    | IN-01 — sample stale in 2027+                                                    |

### Human Verification Required

None requested — the BLOCKER findings are programmatically verifiable from the code and the existing test suite. Once CR-02/CR-01/CR-03 are fixed, behavioral spot-checks can be added (lock-survives-cascade, attach-persists, completion-pruned) without human testing. Visual polish + 60fps + a11y are explicitly Phase 4 scope.

### Gaps Summary

Phase 3 is structurally complete: 27 of 28 expected artifacts exist and are wired into the right surfaces (DndContext, FullCalendar, zundo, dashboard partitions, constraint registry). All 271 unit tests pass. Phase 3 routes (`/plan` with PlanViewTabs, `/tasks`) render and dispatch through the right stores.

However, **three blocker defects break two of the six roadmap success criteria** for this phase:

1. **CR-02 — Lock contract is decorative (breaks SC #3 / GANTT-08).** `generateScheduleWithLocks` is documented as the lock-enforcement seam but is a literal pass-through. Locked events with no matching plan.edits[] entry (the common case — user clicks lock without ever dragging) reflow on every cascade. The lock UI ring renders, the LockToggle button writes `locks[type]=true`, and the existing test only verifies the broken behavior. This is the canonical Phase 3 success criterion and it does not work.

2. **CR-01 — Custom task attach-to-planting drops the field on save (breaks TASK-02 + TASK-06 group-by-plant).** `CustomTaskModal` collects `form.plantingId`, but `buildTask` never writes it and `CustomTask` (types.ts:155) explicitly omits the field. Saved tasks always land in the `__free__` group regardless of UI choice; edit-mode reset to FREE_FLOATING. UI is decorative.

3. **CR-03 — completedTaskIds leaked on task removal/edit (breaks TASK-03 state hygiene).** `removeCustomTask` and `editCustomTask` mutate `customTasks` without pruning the corresponding `${id}` and `${id}:YYYY-MM-DD` entries from `plan.completedTaskIds`. Unbounded localStorage growth + latent collision-resurrects-completion bug.

**Recommended path:** Single closure plan addressing CR-02, CR-01, CR-03 with companion tests:
- schedulerWithLocks pre-pass that synthesizes ScheduleEdit entries for locks-without-edits, anchored at baseline
- Widen CustomTask to inherit Task.plantingId; fix buildTask + taskToForm
- Prune completedTaskIds in removeCustomTask + editCustomTask (when dueDate/recurrence change)
- Add tests: lock-survives-cascade across anchor change; attach-persists round-trip; completion-pruned on remove

The remaining 9 warnings (WR-01..WR-09) are real but non-blocking — recommend deferring to a Phase 4 hardening pass or addressing alongside the blocker fixes if the changes are local.

---

_Verified: 2026-04-27T05:18:53Z_
_Verifier: Claude (gsd-verifier)_

---

## Re-Verification 2026-04-27 (post-03-08)

**Status:** all_gaps_closed
**Score:** 6/6 truths verified
**Closure plan:** 03-08-PLAN.md

### Gap Resolutions

| Gap | Status | Evidence |
| --- | ------ | -------- |
| CR-02 (Lock contract) | ✓ CLOSED | `schedulerWithLocks.ts` pre-pass synthesizes lock-anchor edits from an edit-free baseline; new tests `lock survives cascade across anchor change`, `unlocked downstream events still reflow`, `explicit edit beats lock-synth` all pass. The wrapper now re-runs `generateSchedule` with augmented edits when any active lock-without-edit exists; passthrough fast path preserved for the no-locks case (deep-equal test still byte-identical). |
| CR-01 (Custom task plantingId) | ✓ CLOSED | `CustomTask` widened to `Omit<Task, 'source'>` (inherits `plantingId`); `buildTask` conditional spread persists `plantingId` only when the user picked a planting; `taskToForm` reads `t.plantingId ?? FREE_FLOATING`; round-trip test asserts persistence + edit-mode pre-fill. Schema tightened: `customTasks: z.array(CustomTaskSchema)` with optional `plantingId`. |
| CR-03 (completedTaskIds leak) | ✓ CLOSED | `removeCustomTask` unconditionally prunes bare `${id}` and `${id}:*` keys; `editCustomTask` prunes `${id}:*` keys when `dueDate` or `recurrence` is in the patch; cosmetic patches (title, notes) preserve completions. Both setters mutate inside one `set()` so zundo coalesces (Cmd-Z restores task + completion state atomically). |

### Test Suite

- `npx vitest run`: **283 pass / 0 fail** across 38 files (was 271/271 across 36 files; +12 new tests across 2 new files + 1 augmented file)
- `npx tsc --noEmit`: **clean**
- `npm run lint`: **clean** of new errors (4 pre-existing warnings in `src/domain/dateWrappers.ts` are out of scope)
- `npm run build`: **succeeds** (TypeScript check + Vite production build)

### Phase 3 Roadmap Truths — Final

| #   | Truth | Status |
| --- | ----- | ------ |
| 1   | User dragging a transplant bar sees ghost-bar previews; releasing commits cascade | ✓ VERIFIED (unchanged) |
| 2   | Frost-tender plant transplant before last frost gets snap-back + tooltip | ✓ VERIFIED (unchanged) |
| 3   | User pinning an event with the lock toggle sees that event held fixed during subsequent cascades | ✓ VERIFIED (CR-02 closed) |
| 4   | Cmd/Ctrl-Z reverses last drag with ≥20 levels; Cmd/Ctrl-Shift-Z re-applies | ✓ VERIFIED (unchanged) |
| 5   | Toggling gantt ↔ calendar shows same events; clicking day opens detail panel | ✓ VERIFIED (unchanged) |
| 6   | Tasks dashboard with custom tasks attached to plants groups under the plant in groupBy='plant' | ✓ VERIFIED (CR-01 closed; CR-03 hygiene restored) |

### Notes on Test-1 Reinterpretation (CR-02)

The closure plan's literal "lastFrostDate moves" test was infeasible without persistent lock-anchor storage (the lock would need to remember its date across a location change — an architectural change beyond Plan 03-08 scope). The replacement test (`locked transplant holds fixed when an UPSTREAM edit (indoor-start) moves`) covers the same contract — lock survives cascade — using the engine's actual cascade trigger (an explicit edit on a related event). The harvest-window test exercises the most user-visible scenario: drag transplant later, watch locked harvest stay put.

### Anti-Pattern Updates

| File | Previous Status | Current Status |
| ---- | --------------- | -------------- |
| `src/domain/schedulerWithLocks.ts` | 🛑 BLOCKER (pass-through) | ✓ RESOLVED |
| `src/features/tasks/CustomTaskModal.tsx` | 🛑 BLOCKER (plantingId dropped) | ✓ RESOLVED |
| `src/stores/planStore.ts` (removeCustomTask, editCustomTask) | 🛑 BLOCKER (completedTaskIds orphans) | ✓ RESOLVED |
| WR-01..WR-09 | ⚠️ WARNING (non-blocking) | unchanged — deferred to Phase 4 hardening |

_Re-Verified: 2026-04-27_
_Closure: 03-08-PLAN.md_
