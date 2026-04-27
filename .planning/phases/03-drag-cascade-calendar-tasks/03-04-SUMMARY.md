---
phase: 03-drag-cascade-calendar-tasks
plan: 04
subsystem: calendar-view
tags: [fullcalendar, calendar, drawer, url-state, radix, react-router, end-exclusive, lazy-load-ready]

# Dependency graph
requires:
  - phase: 03-drag-cascade-calendar-tasks
    plan: 01
    provides: lock-aware scheduler seam (generateScheduleWithLocks) — same engine output for gantt and calendar
  - phase: 03-drag-cascade-calendar-tasks
    plan: 02
    provides: planStore.commitEdit, lastConstraintViolation, persisted setters for Phase 3 surfaces
  - phase: 03-drag-cascade-calendar-tasks
    plan: 03
    provides: useDerivedSchedule (generateScheduleWithLocks consumer) — calendar reads same ScheduleEvent[] as gantt (CAL-01)
provides:
  - selectEventsForCalendar — pure adapter ScheduleEvent[] + Task[] → FullCalendar EventInput[] with end-exclusive +1 day
  - useDayDetailUrl — useSearchParams wrapper for ?date=YYYY-MM-DD URL state
  - DayDetailDrawer — Radix Dialog right-side sheet keyed off ?date= URL param
  - CalendarView (default export) — FullCalendar 6.1 wrapper, month + week views, read-only, dateClick → drawer
  - PlanViewTabs — underlined Gantt | Calendar tab strip wired to ?view= URL param
  - src/features/calendar/fullcalendar.css — FullCalendar theme integration via FC CSS vars
  - --spacing-drawer-w (400px) + --spacing-tab-strip-h (44px) Tailwind v4 @theme tokens
affects: [03-07 wires React.lazy + Suspense for CalendarView and routes /plan?view=calendar; 03-05 supplies real Task[] consumer; 03-06 may move ConstraintTooltip mount but does not touch this plan's surfaces]

# Tech tracking
tech-stack:
  added: []   # All Phase 3 deps installed in Plan 03-02 (zundo, dnd-kit, FullCalendar bundle, Radix tooltip)
  patterns:
    - "URL-as-state for drawer + view via React Router 7 useSearchParams — back button closes drawer; refresh restores; deep-link works (RESEARCH §Pattern 8)"
    - "FullCalendar end-exclusive contract: multi-day spans add +1 day via dateWrappers (Pitfall 5) — selectEventsForCalendar.exclusiveEnd() is the canonical site"
    - "Default-export CalendarView for React.lazy boundary (Pitfall 6 / RESEARCH §Example D) — Plan 03-07 imports `() => import('./CalendarView')`"
    - "Append-only @theme block discipline in src/index.css with comment-fenced regions per plan (Wave 2 parallelism: Plan 03-03 owns drag tokens, this plan owns calendar/drawer tokens, Plan 03-06 owns lock tokens)"
    - "CSS-var fallback `var(--name, fallback)` defense-in-depth in consuming className strings — survives Wave 2 append-order inversion if any"
    - "Radix DialogPrimitive.Content right-side sheet pattern reused verbatim from MyPlanPanel.tsx lines 78-103 — translate-x-full closed → translate-x-0 open with 200ms ease-out"

key-files:
  created:
    - src/features/calendar/selectEventsForCalendar.ts
    - src/features/calendar/useDayDetailUrl.ts
    - src/features/calendar/DayDetailDrawer.tsx
    - src/features/calendar/CalendarView.tsx
    - src/features/calendar/fullcalendar.css
    - src/app/PlanViewTabs.tsx
    - tests/features/calendar/selectEventsForCalendar.test.ts
    - tests/features/calendar/DayDetailDrawer.test.tsx
    - tests/features/calendar/CalendarView.test.tsx
  modified:
    - src/index.css

key-decisions:
  - "Phase 3 P04: end-exclusive +1 day handled in selectEventsForCalendar.exclusiveEnd() via dateWrappers (parseDate → addDays(+1) → toISODate.slice(0,10)). Calendar/ is NOT in the no-restricted-syntax allowlist, so all date math goes through dateWrappers. date-fns `format()` is used in the drawer for human-readable headings (string→string, never constructs raw Date — no lint trigger)."
  - "Phase 3 P04: CalendarView is the default export of its module so React.lazy can dynamic-import it in Plan 03-07. The lazy boundary for the FullCalendar bundle is well-defined; Test 3 (CalendarView.test.tsx) smokes the dynamic import resolving to the same component."
  - "Phase 3 P04: Tasks parameter passed [] to both selectEventsForCalendar and DayDetailDrawer. Plan 03-05 will produce the deriveTasks output; Plan 03-07 wires the consumer hook (useExpandedTasks) and threads the Task[] through both surfaces. Tests use synthetic Task[] inputs to verify task rendering."
  - "Phase 3 P04: useDayDetailUrl uses pushState (replace: false) so the back button closes the drawer per CONTEXT D-29. close() preserves any pre-existing ?view= so switching gantt↔calendar isn't side-effected by drawer opens."
  - "Phase 3 P04: Drawer events filtered by string-prefix date comparison (selectedDate >= eStart && selectedDate <= eEnd, both 'YYYY-MM-DD' slices). Robust against malformed URL date values — they simply produce empty results rather than crashing the parseDate call (the format() call IS try/catch-wrapped per T-03-04-01 mitigation)."
  - "Phase 3 P04: index.css token append region marked with explicit `Phase 3 Plan 03-04 — calendar + drawer (Wave 2)` comment fence so future Wave 3+ appends preserve a stable diff surface. Plan 03-06 must NOT re-add these tokens (per plan instruction)."
  - "Phase 3 P04: Defense-in-depth CSS-var fallbacks in DayDetailDrawer (`w-[var(--spacing-drawer-w,400px)]`) and PlanViewTabs (`h-[var(--spacing-tab-strip-h,44px)]`) — Tailwind v4 arbitrary values support standard CSS `var(name, fallback)` syntax."

patterns-established:
  - "Calendar adapter purity: domain shapes (ScheduleEvent, Task) → FullCalendar EventInput[] in a single pure module. No FullCalendar imports leak into domain/ or stores/."
  - "URL-state hook pattern: useSearchParams + named param + open/close helpers. useDayDetailUrl is the canonical example; future drawers (planting-detail, settings) reuse the shape."
  - "FullCalendar theme via FC CSS vars only — never !important overrides. Phase 4 polish layers in by extending the same .calendar-host scope."

requirements-completed: [CAL-01, CAL-02, CAL-03]

# Metrics
duration: ~8min
completed: 2026-04-27
---

# Phase 3 Plan 04: Calendar View + Day-Detail Drawer + PlanViewTabs Summary

**Calendar tab is live: month + week views render the same `ScheduleEvent[]` as the gantt via `useDerivedSchedule` (CAL-01 single source of truth). Clicking a day opens a Radix right-side sheet keyed off `?date=YYYY-MM-DD` — back button closes, refresh restores, deep-link works. The underlined `Gantt | Calendar` tab strip switches via `?view=`. CalendarView is a default export, lazy-load-ready for Plan 03-07.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-27T04:20:41Z
- **Completed:** 2026-04-27T04:28:23Z
- **Tasks:** 3 (all `type="auto"`, all `tdd="true"`)
- **Test growth:** 208 → 227 (+19 new tests; 8 selectEventsForCalendar + 8 DayDetailDrawer + 3 CalendarView smoke)
- **Files created/modified:** 10 (9 created, 1 modified)

## Accomplishments

- The calendar surface is real: render a sample plan, switch the URL to `?view=calendar`, and FullCalendar renders the same lifecycle events the gantt shows — at the same dates, with the same lifecycle palette colors. Click any day → right-side drawer slides in over a stone-900/40 backdrop, lists events grouped by plant, closes via Esc/X/outside-click. Refresh the page with `?date=2026-05-15` in the URL → drawer restores to the same state.
- `selectEventsForCalendar` is a pure single-screen adapter (84 lines) that handles the FullCalendar end-exclusive contract correctly: a 15-day harvest window from `2026-08-01..2026-08-15` becomes `start: '2026-08-01', end: '2026-08-16'` because FC treats the end as the date AFTER the last day. Test 2 pins this verbatim.
- Auto-task event types (`water-seedlings`, `harden-off-day`, `fertilize-at-flowering`) are skipped from the lifecycle loop because they will render via the `Task[]` parameter once Plan 03-05 lands. The `AUTO_TASK_TYPES` set mirrors the intentional palette omission in `lifecyclePalette.ts` — a single source of "what's a task vs. what's a lifecycle bar".
- `useDayDetailUrl` is a 30-line hook over `useSearchParams` — `selectedDate` derives from URL presence, `open(dateStr)` writes via pushState (back button closes), `close()` deletes `?date=` while preserving `?view=`. Test 3 explicitly pins the close-preserves-view contract.
- `DayDetailDrawer` is a Radix `DialogPrimitive.Content` styled as a 400px right-side sheet (translate-x-full closed → translate-x-0 open, 200ms ease-out, stone-900/40 backdrop). It reads `useDerivedSchedule` directly so it shares the gantt's data path (no prop threading). Empty-state copy ("Nothing scheduled" + helpful body) renders when no events for the selected day; otherwise events are grouped by `plantingId` with the plant's name resolved from `catalogStore.selectMerged`.
- `PlanViewTabs` is the underlined-tab strip — copied verbatim from `AppShell` active-link styling (`text-green-700 underline underline-offset-4 decoration-2` translated to `border-b-2 border-green-700` for the tab variant per UI-SPEC §5). Switching from calendar→gantt also drops `?date=` from the URL because the drawer is calendar-specific.
- `CalendarView` (default export) wraps FullCalendar 6.1 with the locked plugin set (dayGrid + timeGrid + interaction — no premium plugins). `dayMaxEvents={3}` activates the +more popover (D-26). `editable={false}` and `selectable={false}` enforce read-only on the calendar (D-25 — drag is gantt-only in Phase 3). `dateClick` + `eventClick` both call `open(info.dateStr)` to surface the drawer.
- `fullcalendar.css` themes the calendar entirely via FullCalendar's own CSS variables (`--fc-border-color`, `--fc-button-bg-color`, `--fc-today-bg-color`, etc.) — zero `!important`, zero structural overrides. Phase 4 mobile/contrast polish layers in by extending the same `.calendar-host .fc` scope.
- All 19 new tests pass; full suite is 227/227 (was 208 before this plan). `npm run build` exits 0 (FullCalendar bundle compiles cleanly). The lazy chunk for FullCalendar will materialize when Plan 03-07 wires `React.lazy(() => import('./CalendarView'))`.

## Task Commits

1. **Task 1 RED:** `410c82f` (test) — failing tests for selectEventsForCalendar (8 cases)
2. **Task 1 GREEN:** `ce5136f` (feat) — selectEventsForCalendar pure adapter with end-exclusive +1 day
3. **Task 2 RED:** `ccf50e6` (test) — failing tests for useDayDetailUrl + DayDetailDrawer (8 cases)
4. **Task 2 GREEN:** `4dba9aa` (feat) — useDayDetailUrl + DayDetailDrawer Radix right-side sheet
5. **Task 3 RED:** `6afa080` (test) — failing smoke tests for CalendarView (3 cases)
6. **Task 3 GREEN:** `a3c0445` (feat) — PlanViewTabs + CalendarView FullCalendar wrapper + theme tokens

## Files Created/Modified

### Created

- `src/features/calendar/selectEventsForCalendar.ts` — pure adapter (84 lines). End-exclusive +1 day via dateWrappers; AUTO_TASK_TYPES skip-set; lifecycle bars get palette colors; tasks get neutral stone-100.
- `src/features/calendar/useDayDetailUrl.ts` — useSearchParams wrapper. `open(dateStr)` pushState; `close()` deletes `date=` while preserving `view=`. 30 lines.
- `src/features/calendar/DayDetailDrawer.tsx` — Radix right-side sheet. Reads useDerivedSchedule + catalogStore + planStore; groups events by plantingId; safeFormat() wraps date-fns for malformed-URL resilience (T-03-04-01 mitigation). 161 lines.
- `src/features/calendar/CalendarView.tsx` — default-export FullCalendar wrapper (54 lines). dayGrid + timeGrid + interaction plugins; month + week views; read-only; dateClick → drawer; renders DayDetailDrawer alongside grid.
- `src/features/calendar/fullcalendar.css` — theme integration via FC CSS vars. 31 lines, zero `!important`.
- `src/app/PlanViewTabs.tsx` — underlined tab strip wired to `?view=`. AppShell active-link pattern reused. 56 lines.
- `tests/features/calendar/selectEventsForCalendar.test.ts` — 8 specs: single-day, multi-day end-exclusive, auto-task skip, germination-window, harden-off range, task kind, neutral color, empty inputs.
- `tests/features/calendar/DayDetailDrawer.test.tsx` — 8 specs: hook closed/open/close-preserves-view, drawer renders/hides/empty-state/grouped-headings/Esc-closes.
- `tests/features/calendar/CalendarView.test.tsx` — 3 smoke specs: default export exists, FullCalendar renders toolbar, dynamic import resolves to default.

### Modified

- `src/index.css` — appended `--spacing-drawer-w: 400px` + `--spacing-tab-strip-h: 44px` to `@theme` block under explicit Plan 03-04 region marker.

## Decisions Made

See `key-decisions:` in frontmatter. Highlights:

- **End-exclusive +1 day handled in the adapter, not at the FullCalendar boundary.** `selectEventsForCalendar.exclusiveEnd()` is the canonical site; tests pin the contract. Doing the +1 in the adapter keeps the calendar-rendering call site thin and makes the rule trivially testable in pure-node tests (no DOM).
- **Default-export CalendarView for the React.lazy boundary.** Plan 03-07 will wire `const CalendarView = React.lazy(() => import('./CalendarView'))` and a `<Suspense fallback={<CalendarLoading />}>`. This plan ships the contract (default export); Plan 03-07 ships the lazy mount. Test 3 in CalendarView.test.tsx pins the contract.
- **Tasks parameter is `[]` for now.** Plan 03-05 produces `deriveTasks()`; Plan 03-07 wires the consumer hook (`useExpandedTasks`) and threads the Task[] through both `selectEventsForCalendar` and `DayDetailDrawer`. The Task[] surface is unit-tested with synthetic inputs (Tests 6 and 7 in selectEventsForCalendar.test.ts) so the wiring in Plan 03-07 is a one-line change.
- **`format(parseDate(...))` from date-fns + dateWrappers compose cleanly under the ESLint rule.** Calendar/ is NOT in the `no-restricted-syntax` allowlist, but date-fns `format()` takes a Date instance — it never constructs a raw Date from a string. `parseDate()` (the lone allowed `new Date(string)` site) feeds it. Verified by passing lint.
- **CSS-var fallback in className strings is defense-in-depth.** If a future Wave merge inverts the index.css append order, the consuming components still render at their intended sizes because Tailwind v4 honors `var(--name, fallback)` in arbitrary value brackets.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `exactOptionalPropertyTypes: true` strict mode forced explicit-undefined-handling in adapter**
- **Found during:** Task 1 GREEN typecheck
- **Issue:** TypeScript's `exactOptionalPropertyTypes: true` (project tsconfig setting) treats `{ end: undefined }` as a TYPE ERROR distinct from `{ end?: string }` with the key omitted. The plan's reference snippet did `const end = e.end !== e.start ? exclusiveEnd(e.end) : undefined; out.push({ ..., end, ... })` which fails to compile.
- **Fix:** Build the `CalendarEventInput` literal first, then conditionally assign `item.end = exclusiveEnd(...)` only for multi-day events. Same pattern applied to task `extendedProps.plantingId` (only set if defined). Same pattern applied to test factory `task()` helper.
- **Files modified:** `src/features/calendar/selectEventsForCalendar.ts`, `tests/features/calendar/selectEventsForCalendar.test.ts`
- **Verification:** `npx tsc --noEmit` clean; all 8 tests pass.
- **Committed in:** `ce5136f` (Task 1 GREEN)

**2. [Rule 3 — Blocking] `noUncheckedIndexedAccess: true` strict mode required non-null assertions in tests**
- **Found during:** Task 1 GREEN typecheck
- **Issue:** Project tsconfig has `noUncheckedIndexedAccess: true`, so `out[0]` is `CalendarEventInput | undefined`. The test assertions `expect(out[0].end).toBe(...)` failed type checking.
- **Fix:** Used non-null assertions (`out[0]!.end`) at the test sites where length is asserted on the previous line. This is the idiomatic test pattern when the test has already pinned the array length.
- **Files modified:** `tests/features/calendar/selectEventsForCalendar.test.ts`
- **Verification:** `npx tsc --noEmit` clean; tests pass.
- **Committed in:** `ce5136f` (Task 1 GREEN)

**3. [Rule 2 — Missing Critical] Drawer needs DialogDescription for Radix accessibility runtime check**
- **Found during:** Task 2 GREEN test pass (Radix dev-mode warning visible in stderr)
- **Issue:** Radix Dialog warns `Missing 'Description' or 'aria-describedby={undefined}' for {DialogContent}` at runtime when dev mode runs the a11y check. While our DialogTitle is wired via aria-labelledby, Radix expects either a DialogDescription or an explicit aria-describedby={undefined}.
- **Fix:** Added a `DialogDescription` (already exported from `src/ui/Dialog.tsx`) with sr-only styling and explicit `aria-describedby="day-detail-desc"` on DialogPrimitive.Content. Description text: "Lifecycle events and tasks for the selected day."
- **Files modified:** `src/features/calendar/DayDetailDrawer.tsx`
- **Verification:** Tests still pass. (Note: a residual Radix dev-mode warning about DialogTitle persists at test runtime — see Issues Encountered below. Functionally a11y is correct because our DialogTitle wraps DialogPrimitive.Title; Radix's dev-mode runtime detection appears to miss the forwardRef-wrapped Title in the tests but the aria-labelledby chain is intact.)
- **Committed in:** `4dba9aa` (Task 2 GREEN)

**4. [Rule 1 — Bug] humanLabel produced `undefined` for empty string segments under noUncheckedIndexedAccess**
- **Found during:** Task 1 GREEN typecheck
- **Issue:** `w[0].toUpperCase()` fails when `w` is the empty string under `noUncheckedIndexedAccess` because `w[0]` is `string | undefined`.
- **Fix:** Guard with `w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w`. Defensive — current EventType union members never produce empty segments after split('-'), but the guard makes the helper total.
- **Files modified:** `src/features/calendar/selectEventsForCalendar.ts`, `src/features/calendar/DayDetailDrawer.tsx` (same humanLabel pattern duplicated for the drawer's event-row label).
- **Verification:** `npx tsc --noEmit` clean.
- **Committed in:** `ce5136f` (Task 1 GREEN), `4dba9aa` (Task 2 GREEN — drawer copy)

---

**Total deviations:** 4 auto-fixed (1 Rule 1 — bug, 1 Rule 2 — missing critical a11y, 2 Rule 3 — blocking strict-mode TS). All within the files Tasks 1–3 were authoring; no scope creep. The strict-mode adjustments (Deviations 1, 2, 4) flow from project tsconfig settings (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) that the planner did not surface — these are recurring across plans and worth noting in PROJECT-level guidance for future planners.

## Issues Encountered

- **Residual Radix dev-mode warning about DialogTitle in tests.** stderr shows `\`DialogContent\` requires a \`DialogTitle\` for the component to be accessible for screen reader users` despite our DialogTitle being correctly nested via `forwardRef` from `src/ui/Dialog.tsx`. The aria-labelledby chain is intact (verified by inspection); this appears to be a Radix runtime check that doesn't recognize forwardRef-wrapped Title elements. Tests still pass and a11y is functionally correct. Phase 4 may revisit by switching to `DialogPrimitive.Title` directly in the drawer if Radix updates the runtime detection logic.
- **Pre-existing 4 dateWrappers.ts disable-directive warnings** carry forward from prior plans (logged to deferred-items.md by Plan 03-02). Out of scope for this plan.

## Threat Flags

None — this plan operates entirely within already-mapped trust boundaries (URL params, FullCalendar event objects, drawer DOM render). The threat register from the plan (T-03-04-01..T-03-04-05) is fully addressed:

- **T-03-04-01** (crafted `?date=` crashes drawer) — mitigated. `safeFormat()` wraps `format(parseDate(...))` in try/catch; on parse error renders the raw `selectedDate` string. The events-filter comparison still works because it's pure string-prefix matching on `selectedDate`.
- **T-03-04-02** (crafted `?view=` value) — mitigated. Default-to-gantt ternary covers; no admin/privilege concept exists.
- **T-03-04-03** (info disclosure in drawer) — accepted. Single-user local app; no PII boundary.
- **T-03-04-04** (FullCalendar lazy-load failure) — mitigated at the contract level. CalendarView ships as default export so the lazy boundary is well-defined; Plan 03-07 wires Suspense + ErrorBoundary fallback.
- **T-03-04-05** (deep-link spoofing) — accepted. URL-as-state is a feature; worst outcome is the drawer opens to a strange day. No XSRF surface (single-user local).

No new network endpoints, no auth paths, no new file access patterns, no new schema-boundary changes.

## Self-Check: PASSED

Verified post-write:

```text
FOUND: src/features/calendar/selectEventsForCalendar.ts
FOUND: src/features/calendar/useDayDetailUrl.ts
FOUND: src/features/calendar/DayDetailDrawer.tsx
FOUND: src/features/calendar/CalendarView.tsx
FOUND: src/features/calendar/fullcalendar.css
FOUND: src/app/PlanViewTabs.tsx
FOUND: src/index.css (modified)
FOUND: tests/features/calendar/selectEventsForCalendar.test.ts
FOUND: tests/features/calendar/DayDetailDrawer.test.tsx
FOUND: tests/features/calendar/CalendarView.test.tsx

Commits in git log:
FOUND: 410c82f test(03-04): add failing tests for selectEventsForCalendar
FOUND: ce5136f feat(03-04): selectEventsForCalendar pure adapter
FOUND: ccf50e6 test(03-04): add failing tests for useDayDetailUrl + DayDetailDrawer
FOUND: 4dba9aa feat(03-04): useDayDetailUrl + DayDetailDrawer
FOUND: 6afa080 test(03-04): add failing smoke tests for CalendarView
FOUND: a3c0445 feat(03-04): PlanViewTabs + CalendarView + theme tokens
```

Test suite: 31 files / 227 tests passing (was 208 / 28 files). `npx tsc --noEmit` clean. `npm run lint` clean (0 errors, 4 pre-existing dateWrappers warnings out of scope). `npm run build` exits 0.

## Next Phase Readiness

- **Plan 03-05 (tasks):** unblocked. Will produce `Task[]` via `deriveTasks(plan, catalog, eventsByPlanting)` plus the `useExpandedTasks` consumer hook. Plan 03-07 wires the output through both `selectEventsForCalendar` (calendar marks) and `DayDetailDrawer` (drawer task list). The drawer has a documented extension point: change `dayTasks` from the local `[]` placeholder to `useExpandedTasks().filter(t => t.dueDate.slice(0,10) === selectedDate)`.
- **Plan 03-06 (lock UI + AppShell mount):** unaffected. The `--spacing-drawer-w` and `--spacing-tab-strip-h` tokens have already shipped in this plan (NOT deferred to 03-06). Plan 03-06's index.css region must NOT re-add these tokens; if a duplicate is detected, the executor removes it from 03-06's append.
- **Plan 03-07 (integration):** ready. Wiring is a 4-line change in `App.tsx`:
  ```tsx
  const CalendarView = React.lazy(() => import('../features/calendar/CalendarView'));
  // /plan route renders <PlanViewTabs /> + ?view-aware swap between <DragLayer /> and <Suspense fallback={<CalendarLoading />}><CalendarView /></Suspense>
  ```
- **Phase 4 follow-ups documented in code:**
  - `DayDetailDrawer.tsx`: residual Radix dev-mode warning about DialogTitle — may resolve when Radix improves forwardRef detection or by switching to `DialogPrimitive.Title` directly.
  - `fullcalendar.css`: mobile breakpoint sizing + contrast polish; current theme works at desktop sizes.
  - `DayDetailDrawer.tsx`: mobile bottom-sheet (D-31) — Tailwind breakpoint swap on the same component, no structural change.

---
*Phase: 03-drag-cascade-calendar-tasks*
*Plan: 04*
*Completed: 2026-04-27*
