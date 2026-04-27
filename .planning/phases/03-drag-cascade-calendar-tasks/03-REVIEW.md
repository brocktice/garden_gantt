---
phase: 03-drag-cascade-calendar-tasks
reviewed: 2026-04-27T05:13:21Z
depth: standard
files_reviewed: 40
files_reviewed_list:
  - src/app/App.tsx
  - src/app/AppShell.tsx
  - src/app/PlanViewTabs.tsx
  - src/domain/constraints.ts
  - src/domain/migrations.ts
  - src/domain/scheduler.ts
  - src/domain/schedulerWithLocks.ts
  - src/domain/schemas.ts
  - src/domain/taskEmitter.ts
  - src/domain/types.ts
  - src/features/calendar/CalendarView.tsx
  - src/features/calendar/DayDetailDrawer.tsx
  - src/features/calendar/selectEventsForCalendar.ts
  - src/features/calendar/useDayDetailUrl.ts
  - src/features/gantt/GanttView.tsx
  - src/features/gantt/drag/DragLayer.tsx
  - src/features/gantt/drag/GhostOverlay.tsx
  - src/features/gantt/drag/clampModifier.ts
  - src/features/gantt/drag/dragHandlers.ts
  - src/features/gantt/drag/scaleHandoff.ts
  - src/features/gantt/drag/useDragBar.ts
  - src/features/gantt/drag/useTransientSchedule.ts
  - src/features/gantt/lock/LockToggle.tsx
  - src/features/gantt/lock/useLockKeybinding.ts
  - src/features/gantt/tooltip/ConstraintTooltip.tsx
  - src/features/gantt/useDerivedSchedule.ts
  - src/features/settings/exportPlan.ts
  - src/features/settings/importPlan.ts
  - src/features/setup/SetupStepReview.tsx
  - src/features/tasks/CustomTaskModal.tsx
  - src/features/tasks/TaskGroup.tsx
  - src/features/tasks/TaskRow.tsx
  - src/features/tasks/TasksDashboard.tsx
  - src/features/tasks/deriveTasks.ts
  - src/features/tasks/useCompositeCompletionKey.ts
  - src/features/tasks/useExpandedTasks.ts
  - src/features/tasks/useTodayWeekOverdue.ts
  - src/samplePlan.ts
  - src/stores/dragStore.ts
  - src/stores/historyBindings.ts
  - src/stores/planStore.ts
findings:
  blocker: 3
  warning: 9
  info: 6
  total: 18
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-04-27T05:13:21Z
**Depth:** standard
**Files Reviewed:** 40
**Status:** issues_found

## Summary

Phase 3 ships drag/cascade, calendar, locks, undo/redo, and the tasks dashboard. The
overall architecture is clean — pure domain layer, well-isolated stores, careful zundo
+ persist ordering, dateWrappers discipline, and a registry-style constraint pipeline.

Three blocking defects:

1. **Custom-task "Attach to planting" is broken end-to-end.** The CustomTaskModal collects
   `form.plantingId`, but `CustomTask` (types.ts) explicitly omits `plantingId`, and
   `buildTask` never writes it. The Select widget is purely decorative; saved tasks are
   always free-floating regardless of UI choice. This hits the Phase 3 task-dashboard
   contract directly.
2. **Locking an unedited event has no effect.** `schedulerWithLocks` is documented as the
   contract-enforcement seam but is a literal pass-through to `generateSchedule`. If a user
   locks a bar that has no entry in `plan.edits[]`, the engine still reflows it from the
   recomputed anchor on every cascade tick. Lock UI shows the visual ring but the cascade
   ignores the lock.
3. **`completedTaskIds` is leaked when custom tasks are removed or have their recurrence
   edited.** Both `removeCustomTask` and `editCustomTask` mutate the task list without
   pruning matching `${id}` or `${id}:YYYY-MM-DD` completion entries. Over a season of
   add/remove churn this grows unbounded and risks resurrected-completion bugs if a future
   id collision occurs.

Several warnings center on `nowISOString()` being used as a memo dep
(`useTodayWeekOverdue`, `useExpandedTasks`, `TasksDashboard`) — millisecond-precision
"now" rebuilds the entire task pipeline every render. Plus the rAF coalescer in
`dragHandlers.ts` has a latent post-drag race that can resurrect a stale `transientEdit`.

## Critical Issues

### CR-01: Custom-task `plantingId` form field is silently dropped on save

**File:** `src/features/tasks/CustomTaskModal.tsx:137-169`
**Issue:** `FormState.plantingId` is collected from the "Attach to planting" Select
widget (line 372-402) and stored in form state, but `buildTask()` never writes it to
the produced `CustomTask`. `CustomTask` (types.ts:155) explicitly does
`Omit<Task, 'source' | 'plantingId'>`, so there is no field to write. The "Attach to
planting" UI is purely decorative.

Downstream consequences:
- `TaskGroup.keyOf()` (TaskGroup.tsx:30-39) groups custom tasks by `t.plantingId`, but
  for `CustomTask`-derived `Task` objects, that field will always be undefined →
  every custom task lands in the `__free__` group regardless of user choice.
- `TaskRow` "secondary line" never resolves to a plant name for custom tasks.
- The smart-default category coercion at lines 379-385 (custom → water when attached)
  is the only persisted side-effect of attach selection.

**Fix:** Either remove the "Attach to planting" UI for v1, or carry `plantingId` on
`CustomTask`. The smaller fix is to widen `CustomTask`:
```ts
// types.ts
export interface CustomTask extends Omit<Task, 'source'> {
  source: 'custom';
  // plantingId is inherited from Task (already optional)
}
```
And update `buildTask`:
```ts
const task: CustomTask = {
  id,
  source: 'custom',
  title: form.title.trim(),
  category: form.category,
  dueDate: dueISO,
  completed: false,
  ...(form.plantingId !== FREE_FLOATING ? { plantingId: form.plantingId } : {}),
};
```
Also fix `taskToForm` (line 128-131) to read the persisted `plantingId` instead of
hardcoding `FREE_FLOATING`. Add Zod validation for the field in `schemas.ts` once
`customTasks` is tightened past `z.array(z.unknown())`.

### CR-02: `generateScheduleWithLocks` does not enforce locks on un-edited events

**File:** `src/domain/schedulerWithLocks.ts:24-33`
**Issue:** The wrapper is a pure pass-through to `generateSchedule(plan, catalog)`.
The engine consumes `plan.edits[]` and recomputes everything else from anchors. A
planting can have `locks[eventType] === true` with NO matching `ScheduleEdit` —
in that case `generateSchedule` will still cascade the date from the recomputed
anchor, ignoring the lock entirely.

Concretely: user opens GanttView, locks `harvest-window` on `p-tomato` without dragging
it, then drags `transplant` later. The cascade reflows `harvest-window` to
`new-transplant + DTM` even though the user explicitly locked it. Same applies to
`indoor-start`, `direct-sow`, `harden-off`, `germination-window`. The lock outline ring
in the UI (GanttView.tsx:432-444) is rendered, the LockToggle button works, but the
cascade silently overrides the user's intent.

The wrapper's docstring describes the contract but never enforces it. There is no
test surface anywhere else that closes the gap.

**Fix:** Implement the lock contract in the wrapper. Either:
(a) Pre-pass: synthesize a "synthetic edit" for every locked event from the current
schedule, append to `plan.edits` clone, then call `generateSchedule`. This automatically
holds the date fixed because the engine's `findEdit` will hit the synthetic entry.
(b) Post-pass: call `generateSchedule` once with `edits` only, snapshot dated values
for locked events, then call again with synthetic edits. Slower but simpler.

Sketch:
```ts
export function generateScheduleWithLocks(plan, catalog) {
  const baseline = generateSchedule(plan, catalog);
  const lockedEdits: ScheduleEdit[] = [];
  for (const planting of plan.plantings) {
    if (!planting.locks) continue;
    for (const [eventType, isLocked] of Object.entries(planting.locks)) {
      if (!isLocked) continue;
      // Skip if user already has an explicit edit — engine will use it.
      const hasEdit = plan.edits.some(
        (e) => e.plantingId === planting.id && e.eventType === eventType,
      );
      if (hasEdit) continue;
      const ev = baseline.find(
        (e) => e.plantingId === planting.id && e.type === eventType,
      );
      if (!ev) continue;
      lockedEdits.push({
        plantingId: planting.id,
        eventType: eventType as EventType,
        startOverride: ev.start,
        ...(ev.end !== ev.start ? { endOverride: ev.end } : {}),
        reason: 'user-form-edit',
        editedAt: nowISOString(),
      });
    }
  }
  if (lockedEdits.length === 0) return baseline;
  return generateSchedule({ ...plan, edits: [...plan.edits, ...lockedEdits] }, catalog);
}
```
Note: this is also the wrapper used by `useTransientSchedule`, so the live cascade
preview will respect locks too.

### CR-03: `removeCustomTask` and `editCustomTask` leak `completedTaskIds` entries

**File:** `src/stores/planStore.ts:287-313`
**Issue:** When `removeCustomTask(id)` runs, the corresponding completion entries are
NOT pruned from `plan.completedTaskIds`. Both bare `id` (one-off completion) and
`${id}:YYYY-MM-DD` keys (recurring per-occurrence) remain forever.

Same class of leak in `editCustomTask`: if the user changes a recurring task's
`dueDate` or recurrence interval, the previously-completed `${id}:OLD-DATE` entries
become orphans (the task no longer emits an occurrence on those dates), but the
strings persist. A growing recurring-task workflow will steadily bloat
`completedTaskIds` and `localStorage` usage.

Worse: if a future feature recycles task ids (e.g. user manually picks an id, or
collision in `newTaskId`'s `Math.random` suffix), an orphaned completion key could
silently mark the new task as complete.

**Fix:** Prune in both setters:
```ts
removeCustomTask: (id) =>
  set((s) => {
    if (!s.plan) return s;
    const prefix = `${id}:`;
    const completedTaskIds = s.plan.completedTaskIds.filter(
      (k) => k !== id && !k.startsWith(prefix),
    );
    return {
      plan: {
        ...s.plan,
        customTasks: s.plan.customTasks.filter((t) => t.id !== id),
        completedTaskIds,
        updatedAt: nowISOString(),
      },
    };
  }),
```
For `editCustomTask`, prune `${id}:*` per-occurrence keys whenever the patch
contains `dueDate` or `recurrence` (the bare `${id}` one-off key may legitimately
survive if recurrence changed from one-off to recurring or vice versa — choose a
policy and document it).

## Warnings

### WR-01: `nowISOString()` ms-precision breaks task pipeline memoization

**File:** `src/features/tasks/useTodayWeekOverdue.ts:60`, `src/features/tasks/useExpandedTasks.ts:27-28`, `src/features/tasks/TasksDashboard.tsx:25`
**Issue:** `nowISOString()` returns a fresh string with millisecond precision on every
call. It is used as:
- `todayISO` in `useTodayWeekOverdue` (line 60) — dep of `useMemo` partition
- default `rangeStart` in `useExpandedTasks` (line 27) — dep of `useMemo` over
  `deriveTasks`
- `todayISO` in `TasksDashboard` (line 25) — passed as prop to every `TaskGroup` /
  `TaskRow`, recomputed each render

Because the string changes every render, all dependent `useMemo`s rebuild on every
parent render. The full task pipeline (`expandRecurringTasks` over a 60-day window
+ `partitionTasksByWindow`) re-runs unnecessarily, including for unrelated state
changes.

Beyond the perf hit, the cascading prop change forces `TaskGroup` and `TaskRow` to
re-render every tick. Combined with `useDerivedSchedule` (which is properly memoized),
the dashboard and calendar dispatch redundant work for any unrelated UI interaction.

**Fix:** Snap `todayISO` to the day boundary so it's stable across renders within the
same day:
```ts
// useTodayWeekOverdue.ts
const todayISO = useMemo(() => toISODate(parseDate(nowISOString())), []);
// or, if you want it to update past midnight, depend on a coarse interval timer.
```
For default-range strings inside `useExpandedTasks`, slice to YYYY-MM-DD before
passing to `deriveTasks` so the dep stabilizes for the day.

### WR-02: rAF coalescer can resurrect a stale `transientEdit` after `endDrag`

**File:** `src/features/gantt/drag/dragHandlers.ts:18-31, 72-83`
**Issue:** `scheduleRafSet` keeps `pendingEdit` and `rafId` at module scope. If a
`pointermove` schedules an edit and `pointerup` fires before the rAF callback runs,
`handleDragEnd` calls `endDrag()` which clears `transientEdit` to null. The pending
rAF then fires and writes `pendingEdit` back into `transientEdit` AFTER drag ended.

Currently this is benign because `useDragStore.isDragging === false` and
`activeEventId === null` mean nothing renders `useTransientSchedule`'s output. But
`useTransientSchedule` itself will compute a stale cascade preview — wasted work and
a latent source of confusion if any future consumer reads transientEdit unconditionally.

**Fix:** Cancel the pending rAF in `handleDragEnd` and `handleDragCancel`:
```ts
// dragHandlers.ts
export function cancelPendingTransient(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  pendingEdit = null;
}

export function handleDragEnd(_event?: DragEndEvent) {
  cancelPendingTransient();
  // ... rest unchanged
}
export function handleDragCancel() {
  cancelPendingTransient();
  useDragStore.getState().endDrag();
}
```

### WR-03: `useDayDetailUrl` accepts empty `?date=` as "open"

**File:** `src/features/calendar/useDayDetailUrl.ts:16-17`
**Issue:** `params.get('date')` returns `''` for `?date=` (empty value) and any
malformed string. `selectedDate !== null` is then true, so `isOpen` is true.
`DayDetailDrawer` renders with `selectedDate = ''`, falls into `safeFormat` (returns
the raw string), and shows `Heading: ''` with no events filtered.

User-controllable URL state should be validated before opening the drawer.

**Fix:**
```ts
const raw = params.get('date');
const selectedDate = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
```
Place the regex constant module-level to avoid per-call allocation.

### WR-04: `URL.revokeObjectURL` called synchronously after `a.click()`

**File:** `src/features/settings/exportPlan.ts:50-56`
**Issue:** Some browsers (Safari historically, some mobile WebViews) race the download
trigger against an immediate `URL.revokeObjectURL`. The blob URL becomes invalid
before the navigation that would start the download. The download silently fails on
those targets.

**Fix:** Defer the revoke to a microtask or next event-loop turn:
```ts
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(url), 0);
```

### WR-05: `useLockKeybinding` runs on EVERY click, not just Alt-clicks

**File:** `src/features/gantt/lock/useLockKeybinding.ts:21-38`
**Issue:** The `click` handler runs for every click on the document, then bails on
`!e.altKey`. Each call still does an `instanceof` check, a `closest()` traversal up the
DOM, and reads from React state — all wasted work for non-Alt clicks. Listen on a
narrower event or check the modifier earlier.

The current code is correct, but the early-return is only the modifier check; everything
above (target → Element cast) still runs and the listener is attached at document.

**Fix:** Move the modifier check to the very first line:
```ts
const onClick = (e: MouseEvent) => {
  if (!e.altKey) return;
  // ... rest unchanged
};
```
Already in place — actually this is fine; downgrade to INFO if performance is not a
concern. Keeping as WARNING because the listener has no removeEventListener guard
against fast remount in StrictMode and the surrounding `closest()` selector accepts
any descendant of a bar, which is correct but worth verifying that the
LockToggle button itself doesn't match (it does — the button is inside the bar's
data-event-id rect's parent g, but the closest call walks up from `target` which is
the icon path; it would find the parent rect with the data attrs first). Confirm
behavior: with LockToggle's `e.stopPropagation()` the document listener does not
receive the bubble, so this is OK by construction. Reduce severity at maintainer's
discretion.

### WR-06: `dispatcherModifier` recreated on every `plan` change

**File:** `src/features/gantt/drag/DragLayer.tsx:57-77`
**Issue:** `useMemo([plan, setViolation])` recreates the modifier function whenever
`plan` changes — i.e. on every commit, every setLock, every toggleTaskCompletion. The
modifier is then handed to dnd-kit's `<DndContext modifiers={[dispatcherModifier]} />`,
which (per dnd-kit's behavior) re-evaluates the modifier list. While dnd-kit handles
this gracefully, the closure reads `plan` from React-render scope; long drag sessions
that overlap state churn can produce a brief tick where the modifier closes over a
slightly stale `plan` snapshot.

In practice the constraint pipeline only reads `plan.edits` and `plan.location.lastFrostDate`
— rarely-changed fields during a drag — so the staleness window is small. But the
cleaner pattern is to avoid the closure capture entirely: read `usePlanStore.getState().plan`
inside the modifier body. That way the modifier identity stays stable across all renders.

**Fix:**
```ts
const dispatcherModifier: Modifier = useMemo(() => {
  return (args) => {
    const plan = usePlanStore.getState().plan;
    if (!plan) return args.transform;
    // ... unchanged
  };
}, [setViolation]);
```

### WR-07: `expandRecurringTasks` skip-ahead loop is unbounded for ancient `dueDate`

**File:** `src/domain/taskEmitter.ts:197-201`
**Issue:**
```ts
let cursor = parseDate(ct.dueDate);
while (cursor < start) {
  cursor = addDays(cursor, interval);
}
```
A custom recurring task with `dueDate` years before `rangeStart` and `interval = 1`
(daily) will iterate ~365 × N times to skip forward. With `Math.max(1, rawInterval)`
this is bounded by interval=1 → still 365×Δyears iterations per task per call.
`useExpandedTasks` rebuilds the call on every render with current memoization issues
(WR-01), so this lands in the hot path.

The math to skip directly is straightforward:
```ts
const startTime = start.getTime();
const dueTime = cursor.getTime();
if (dueTime < startTime) {
  const dayMs = 86400000;
  const daysBehind = Math.ceil((startTime - dueTime) / (interval * dayMs));
  cursor = addDays(cursor, daysBehind * interval);
}
```
Performance perfection is out of v1 scope, but this can become a hang with
adversarial input (a task scheduled in 1970). Treating as a defensive correctness
issue: `useExpandedTasks` runs on every render; a single bad task degrades the whole
app.

**Fix:** Replace the while-loop with arithmetic skip-ahead.

### WR-08: `editCustomTask` accepts `Partial<CustomTask>` but UI passes a full task

**File:** `src/stores/planStore.ts:287-300`, `src/features/tasks/CustomTaskModal.tsx:230-232`
**Issue:** `editCustomTask(id, patch: Partial<CustomTask>)` does `{ ...t, ...patch }`.
Caller `handleSave` passes the full `task = buildTask(...)` which includes a fresh
`id`. Spreading a fresh `id` over the existing task overwrites the id — but
`buildTask(form, isEdit, editingId)` returns the editingId when `isEdit` is true,
so this is OK. But: `buildTask` builds a new task with `completed: false` always.
That means saving any edit to a previously-completed one-off task silently flips
`completed` from true → false in the patch.

In practice, completion state is tracked in `completedTaskIds` (D-36), not on the
task itself, so the in-task `completed` field is largely cosmetic — but it is read
by `expandRecurringTasks`/`deriveTasks` paths via `t.completed`? Let me check:
`expandRecurringTasks` writes `completed: completedKeys.has(...)` and the one-off
branch does `{ ...ct, source: 'custom', completed: completedKeys.has(ct.id) }` —
completion is overwritten from completedKeys. So the in-task `completed` field is
already shadowed. OK in practice but the data is confusing.

Also: `recurrence` is unset on `task` when the user picks "one-time", but spread will
NOT delete a previous `recurrence` on the existing record (spread only overwrites
present keys). A previously-recurring task edited to one-time will retain the
old `recurrence` field after `editCustomTask` spread.

**Fix:** Replace patch-spread with a full replacement when passed a full CustomTask:
```ts
editCustomTask: (id, next) =>
  set((s) =>
    s.plan
      ? {
          plan: {
            ...s.plan,
            customTasks: s.plan.customTasks.map((t) =>
              t.id === id ? { ...next, id } : t,
            ),
            updatedAt: nowISOString(),
          },
        }
      : s,
  ),
```
And type `editCustomTask: (id: string, next: CustomTask) => void`. If `Partial` is
required for some other call site, adjust the modal to compute a true patch object.

### WR-09: ConstraintTooltip uses unsanitized `eventId` in `querySelector`

**File:** `src/features/gantt/tooltip/ConstraintTooltip.tsx:103-105`
**Issue:** `document.querySelector(\`[data-event-id="${stickyViolation.eventId}"]\`)`
uses string interpolation in a CSS attribute selector. With `eventId` containing
characters such as `"` or `]`, this would either throw or match unintended elements.
Today eventIds are deterministic from `eventId(plantingId, eventType, index?)` and
plantingIds come from `plantingId(plantId, ...)` — but `plantId` for custom plants
is user-influenced. If a custom plant's id ever contains a quote, this breaks.

There is no XSS surface — the result is only used for `getBoundingClientRect()` —
but the selector can throw and break tooltip rendering for arbitrary user-authored
plant ids.

**Fix:** Use `CSS.escape`:
```ts
const el = document.querySelector(
  `[data-event-id="${CSS.escape(stickyViolation.eventId)}"]`,
);
```

## Info

### IN-01: Hardcoded year `2026` in `samplePlan.ts`

**File:** `src/samplePlan.ts:21-23`
**Issue:** Sample plan frost dates pin 2026. After 2026 the sample loads with all
events in the past — broken for new users hitting "Try sample" in 2027.
**Fix:** Compute from `currentYear()` in `dateWrappers`. Trade-off: sample plan
diffs become non-deterministic year-over-year. Acceptable for a sample-only path.

### IN-02: `taskToForm` always loses prior planting attachment

**File:** `src/features/tasks/CustomTaskModal.tsx:128-131`
**Issue:** Edit-mode form initializes `plantingId: FREE_FLOATING` regardless of the
underlying task's actual attach state. Together with CR-01, this is the second
prong of the broken attach feature. Fix is dependent on CR-01.

### IN-03: `handleDragMove` does not gate on draggable type

**File:** `src/features/gantt/drag/dragHandlers.ts:47-70`
**Issue:** `useDragBar` disables non-draggable types via `useDraggable({ disabled })`,
so dnd-kit should never fire `dragmove` for them. Defensive belt-and-suspenders:
```ts
const DRAGGABLE_TYPES = new Set([...]);
if (!DRAGGABLE_TYPES.has(data.event.type)) return;
```
Noise-free if invariants hold; cheap insurance.

### IN-04: `useLockKeybinding` re-attaches listener on every mount

**File:** `src/features/gantt/lock/useLockKeybinding.ts:39-41`
**Issue:** Empty deps + StrictMode double-mount means in dev mode the listener is
added → removed → added on first mount. Functionally correct but generates a brief
window between cleanup and re-add where Alt-clicks miss. Not a real bug — listed
as awareness for the next reviewer.

### IN-05: `commitEdit` filter+append is O(n) per drag commit

**File:** `src/stores/planStore.ts:237-253`
**Issue:** Every commit walks `plan.edits[]` to dedupe by (plantingId, eventType).
Long sessions accumulate edits; performance is out of v1 scope but a Map<string,
ScheduleEdit> keyed by `${plantingId}:${eventType}` would make it O(1). Phase 4.

### IN-06: `samplePlan` `lookupTimestamp` missing

**File:** `src/samplePlan.ts:18-24`
**Issue:** `Location.lookupTimestamp` is optional in the type; sample plan omits it.
Not a bug, but the `source: 'manual'` plus no timestamp is asymmetric with what
`SetupStepLocation` writes. Cosmetic.

---

_Reviewed: 2026-04-27T05:13:21Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
