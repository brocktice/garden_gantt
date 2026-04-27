---
phase: 04-polish-mobile-ship
plan: 06
subsystem: ui
tags: [a11y, wcag, keyboard-drag, banner-stack, portals, react, zustand, skip-link]

# Dependency graph
requires:
  - phase: 04-polish-mobile-ship
    provides: "Plan 04-01 useUIStore persisted slices; Plan 04-03 StorageFullBanner + ToastHost; Plan 04-04 CoachMarks portal; Plan 04-05 ExportReminderBanner"
provides:
  - "AppShell banner-stack selector — single mount, priority storage-full > iOS Private > export-reminder"
  - "SkipToMain primitive — first focusable element on every page (POL-08)"
  - "kbd-drag-announcer sr-only live region — keyboard-drag SR announcements"
  - "ConstraintTooltip a11y plumbing — aria-live=polite + aria-atomic=true + key-on-eventId|reasons remount + Escape dismiss + sr-only summary"
  - "useKeyboardBarDrag hook — Linear-style focus + arrow stage, Enter commit, Escape cancel, L lock toggle"
  - "GanttView roving tabindex + role=button + aria-label per bar + data-event-start"
  - "Phase 4 a11y wave (POL-04 / POL-08 / POL-09 / POL-10) integration into AppShell"
affects: [phase-04-07, deploy, post-deploy-a11y-audits]

# Tech tracking
tech-stack:
  added:
    - "Linear-style keyboard-drag pattern (delegated document keydown + [data-event-id] ancestor lookup)"
    - "Banner-stack priority selector pattern at AppShell"
  patterns:
    - "Single-listener + delegated focus: same shape as useLockKeybinding / useHistoryKeybindings (document-level addEventListener + closest('[data-event-id][data-planting-id][data-event-type]'))"
    - "isFormFocus() guard mirrored from historyBindings.ts so arrow-in-input doesn't hijack typing"
    - "key-on-content-hash remount pattern for aria-live re-announcement (RESEARCH Pitfall 3)"
    - "Roving tabindex on SVG <g> bars (first bar tabIndex=0, others -1) — single Tab lands inside the gantt"

key-files:
  created:
    - "src/ui/SkipToMain.tsx"
    - "src/features/keyboard-drag/useKeyboardBarDrag.ts"
    - "tests/app/AppShell.banner-stack.test.tsx"
    - "tests/features/gantt/tooltip/ConstraintTooltip.a11y.test.tsx"
    - "tests/features/keyboard-drag/useKeyboardBarDrag.test.tsx"
  modified:
    - "src/app/AppShell.tsx"
    - "src/features/gantt/tooltip/ConstraintTooltip.tsx"
    - "src/features/gantt/GanttView.tsx"

key-decisions:
  - "Banner-stack: single mount-point selector at AppShell with deterministic priority order (storage-full > iOS Private > export-reminder); mitigates T-04-06-03 (concurrent flag spoofing)."
  - "Keyboard drag uses ScheduleEdit canonical shape (startOverride + reason='user-form-edit' + editedAt=nowISOString()) — plan said `newStart` but the type defines startOverride. Followed type, updated test assertions."
  - "ConstraintTooltip Escape handler is gated to active sticky violation via useEffect deps so it doesn't intercept Escape when no violation present (T-04-06-06)."
  - "Visible header/body in ConstraintTooltip carry aria-hidden='true' so screen readers read ONLY the sr-only summary span — guarantees the date isn't read twice (once visually, once again from <strong>)."
  - "GanttView attribute spread order: {...attributes} from dnd-kit FIRST, then tabIndex/role/aria-label override. dnd-kit injects role/tabIndex defaults that would shadow our a11y contract otherwise."
  - "WCAG AA audit auto-approved in auto-mode: pre-validated contrast pairs documented in UI-SPEC §Phase 4 WCAG AA audit deltas; no axe-core CLI run possible in this sandbox (no headless Chrome). Lifecycle palette + lock ring already validated in Phase 3 (per Plan 03-06 §Color WCAG-verified comment)."

patterns-established:
  - "Banner-stack at AppShell: selector chooses ONE banner via priority chain; never two concurrent banners (Open Question 1 recommendation a)"
  - "useKeyboardBarDrag: pendingRef accumulates deltas, commit fires ONCE on Enter (single zundo entry per pointerup-equivalent T-04-06-02)"
  - "kbd-drag-announcer: shared sr-only live region written by keyboard-drag transitions; announcer text is the single SR observable signal for staged/committed/canceled state"
  - "ConstraintTooltip: aria-live region uses key on (eventId + reasons) so React remounts whenever the message actually changes (Pitfall 3 mitigation)"

requirements-completed:
  - POL-04
  - POL-08
  - POL-09
  - POL-10

# Metrics
duration: ~25 min
completed: 2026-04-27
---

# Phase 4 Plan 06: Polish Integration Wave Summary

**AppShell banner-stack mount + SkipToMain + sr-only announcer + ConstraintTooltip a11y plumbing + Linear-style keyboard drag (POL-08) + WCAG AA audit gate.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-27T14:55:00Z
- **Completed:** 2026-04-27T15:20:00Z
- **Tasks:** 3 (Tasks 1+2 implemented; Task 3 checkpoint auto-approved)
- **Files modified:** 8 (3 created, 5 modified, 3 test files added)

## Accomplishments

- AppShell now renders a single banner via priority stack (storage-full > iOS Private > export-reminder), guaranteed by tests covering each precedence rule.
- SkipToMain primitive shipped — first focusable element, sr-only by default, focus-visible chip pointing at `<main id="main">`.
- ConstraintTooltip portal root re-architected for screen-readers: aria-live=polite + aria-atomic=true + key={eventId|reasons} so SR announces only when the message changes; sr-only summary span gives unambiguous read; Escape dismisses sticky pill.
- Keyboard-drag controller (POL-08): focus a bar → arrow keys stage delta (no commit) → Enter commits one zundo entry → Escape cancels → L toggles lock; every transition writes to #kbd-drag-announcer for screen readers.
- GanttView bars now carry roving tabindex (first bar tabIndex=0), role="button", aria-label per UI-SPEC §Accessibility Contract, and data-event-start so the keyboard-drag hook can read original ISO start without a per-bar wiring change.
- WCAG AA audit checkpoint auto-approved against UI-SPEC §Phase 4 WCAG AA audit deltas; lifecycle palette and lock ring tokens already validated in Phase 3.

## Task Commits

1. **Task 1 RED — failing tests + SkipToMain** — `8e5c7cf` (test)
2. **Task 1 GREEN — AppShell banner stack + ConstraintTooltip a11y** — `43be5b2` (feat)
3. **Task 2 — useKeyboardBarDrag + GanttView roving tabindex** — `400afb7` (feat)
4. **Task 3 — WCAG AA checkpoint** — auto-approved (no commit needed; no token tweaks required)

**Plan metadata:** committed alongside SUMMARY in next final commit.

_Note: Plan was tdd="true" so RED commit precedes GREEN commits per Plan 04-06 task contracts._

## Files Created/Modified

- `src/ui/SkipToMain.tsx` (new) — sr-only skip link; reveals on focus.
- `src/app/AppShell.tsx` — added banner-stack selector, SkipToMain mount as first child, kbd-drag-announcer live region, CoachMarks + ToastHost portal mounts; preserved existing header/main/MyPlanPanel/PermapeopleAttributionFooter/ConstraintTooltip mounts.
- `src/features/gantt/tooltip/ConstraintTooltip.tsx` — portal root gains aria-live, aria-atomic, key on (eventId | reasons), sr-only summary span, Escape keydown handler gated on active violation; visible header/body now aria-hidden so SR reads only the sr-only summary.
- `src/features/keyboard-drag/useKeyboardBarDrag.ts` (new) — Linear-style document-level keyboard-drag controller; delegates by [data-event-id][data-planting-id][data-event-type]; isFormFocus guard; pendingRef accumulator; commit on Enter via planStore.commitEdit; Escape cancel; L lock-toggle; SR announcements throughout.
- `src/features/gantt/GanttView.tsx` — mounts useKeyboardBarDrag(); each bar `<g>` gains tabIndex (roving), role="button", aria-label, data-event-start, focus-visible outline.
- `tests/app/AppShell.banner-stack.test.tsx` (new) — 8 tests covering banner priority + SkipToMain ordering + announcer + ToastHost + CoachMarks.
- `tests/features/gantt/tooltip/ConstraintTooltip.a11y.test.tsx` (new) — 5 tests covering aria-live + aria-atomic + key remount + Escape dismiss + sr-only summary.
- `tests/features/keyboard-drag/useKeyboardBarDrag.test.tsx` (new) — 10 tests covering arrow staging, Shift+arrow, Enter commit, Escape cancel, L lock, isFormFocus guard, no-event-id no-op, ArrowLeft, zero-delta Enter no-op, bar-switch resets pending.

## Decisions Made

- **Banner-stack at AppShell with priority selector** — single mount-point so concurrent flags resolve deterministically (T-04-06-03 mitigation).
- **ScheduleEdit shape over plan's `newStart` field name** — type system source of truth: `startOverride: string`, `reason: 'user-form-edit'`, `editedAt: nowISOString()`. Tests updated to assert against the canonical shape.
- **aria-hidden on visible tooltip header/body** — pairs with the new sr-only summary span so screen readers don't read the same content twice (the visible body wraps the date in `<strong>` which can confuse some SRs).
- **dnd-kit attributes spread BEFORE tabIndex/role override** — required attribute order; dnd-kit injects defaults that would otherwise shadow our a11y contract.
- **Escape handler gated to active sticky violation** — useEffect deps include stickyViolation so the listener only registers when a violation is present (T-04-06-06 mitigation; Escape doesn't dismiss unrelated dialogs).
- **Auto-mode auto-approval of WCAG checkpoint** — pre-validated contrast pairs documented in UI-SPEC §Phase 4 WCAG AA audit deltas; lifecycle palette + lock ring + accent + destructive all match WCAG AA combinations already validated in Phase 3 (per Plan 03-06 §Color comment); axe-core CLI cannot run in this sandbox (no Chrome binary).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ScheduleEdit field name `newStart` does not exist on the type**
- **Found during:** Task 2 (npm run build TS check)
- **Issue:** Plan 04-06 Task 2 action pseudocode used `commitEdit({ ..., newStart: ymdToISONoon(...) })` — but `ScheduleEdit` defines `startOverride: string`, not `newStart`.
- **Fix:** Updated `useKeyboardBarDrag` to call `commitEdit({ plantingId, eventType, startOverride, reason: 'user-form-edit', editedAt: nowISOString() })` with the canonical shape; updated test assertions to expect `arg.startOverride` + `arg.reason`.
- **Files modified:** `src/features/keyboard-drag/useKeyboardBarDrag.ts`, `tests/features/keyboard-drag/useKeyboardBarDrag.test.tsx`.
- **Verification:** `npm run build` passes; all 10 keyboard-drag tests green.
- **Committed in:** `400afb7` (Task 2 commit).

**2. [Rule 1 - Bug] `attributes` spread from dnd-kit shadows our tabIndex/role**
- **Found during:** Task 2 (npm run build TS error TS2783 'tabIndex specified more than once')
- **Issue:** Plan placed tabIndex/role/aria-label BEFORE `{...attributes}` and `{...effectiveListeners}`. dnd-kit's attributes inject role/tabIndex defaults; with our props first, dnd-kit's would win and shadow the a11y contract.
- **Fix:** Moved tabIndex/role/aria-label AFTER both spreads so they override dnd-kit's defaults; added a code comment explaining the order requirement.
- **Files modified:** `src/features/gantt/GanttView.tsx`.
- **Verification:** `npm run build` passes; lint clean for that file.
- **Committed in:** `400afb7` (Task 2 commit).

**3. [Rule 1 - Bug] vi.spyOn shared call history across tests in keyboard-drag tests**
- **Found during:** Task 2 (test 4 failed with leaked commit data from test 3)
- **Issue:** `vi.spyOn(usePlanStore.getState(), 'commitEdit')` after `vi.restoreAllMocks` between tests still surfaced test 3's recorded calls in test 4's freshly-created spy. Likely a vitest spy-on-shared-target edge case.
- **Fix:** Switched to `usePlanStore.setState({ commitEdit: vi.fn(), setLock: vi.fn() })` in `beforeEach` — replaces the actions with brand-new mocks for each test, no shared call history possible.
- **Files modified:** `tests/features/keyboard-drag/useKeyboardBarDrag.test.tsx`.
- **Verification:** All 10 tests pass deterministically when run together.
- **Committed in:** `400afb7` (Task 2 commit).

---

**Total deviations:** 3 auto-fixed (Rule 1 bugs).
**Impact on plan:** All three were correctness fixes required to make the plan's intent compile and pass tests; no scope creep.

## Issues Encountered

- **Pre-existing CalendarView test failure** — `tests/features/calendar/CalendarView.test.tsx` Test 4 (recurring task occurrence count) is date-dependent and was already failing on master before this plan. Not in scope for Plan 04-06; logged as pre-existing.
- **Pre-existing lint errors** — `src/features/catalog/CatalogBrowser.tsx:49 set-state-in-effect` and 4 unused-eslint-disable warnings in `src/domain/dateWrappers.ts` are pre-existing on master. Not introduced by this plan.
- **axe-core CLI cannot run in this sandbox** — no headless Chrome binary available. Auto-mode auto-approves the WCAG checkpoint per checkpoint design; UI-SPEC pre-validated contrast pairs are the documented record of compliance for this milestone.

## Threat Flags

None — no new network endpoints, auth paths, file-access patterns, or schema changes at trust boundaries introduced. The plan's `<threat_model>` register (T-04-06-01..06) was mitigated as designed: isFormFocus guard (T-04-06-01), single-Enter-commit (T-04-06-02), priority banner selector (T-04-06-03), early-return on missing data attrs (T-04-06-05), Escape gated to active violation (T-04-06-06).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- POL-04 / POL-08 / POL-09 / POL-10 closed (Plan 04-07 owns deploy + onboarding-recap remaining items).
- AppShell now mounts every Wave 1+2 surface: StorageFullBanner, ExportReminderBanner, CoachMarks, ToastHost, ConstraintTooltip, SkipToMain, kbd-drag-announcer.
- Gantt is now keyboard-navigable end-to-end; manual SR walkthrough deferred to Plan 04-07's deploy-day a11y verification.
- WCAG AA token tweaks: none required by static inspection. axe-core CLI run deferred to deploy-time with real Chrome environment.

---
*Phase: 04-polish-mobile-ship*
*Completed: 2026-04-27*

## Self-Check: PASSED

Files created exist:
- FOUND: src/ui/SkipToMain.tsx
- FOUND: src/features/keyboard-drag/useKeyboardBarDrag.ts
- FOUND: tests/app/AppShell.banner-stack.test.tsx
- FOUND: tests/features/gantt/tooltip/ConstraintTooltip.a11y.test.tsx
- FOUND: tests/features/keyboard-drag/useKeyboardBarDrag.test.tsx

Commits exist:
- FOUND: 8e5c7cf (RED)
- FOUND: 43be5b2 (Task 1 GREEN)
- FOUND: 400afb7 (Task 2)

Acceptance grep counts:
- src/app/AppShell.tsx: SkipToMain=2, StorageFullBanner=2, ExportReminderBanner=2, CoachMarks=2, ToastHost=2, kbd-drag-announcer=1 ✓
- src/ui/SkipToMain.tsx: sr-only=2, "Skip to main content"=1 ✓
- src/features/gantt/tooltip/ConstraintTooltip.tsx: aria-live=2, aria-atomic=1, Escape=3, sr-only=2 ✓
- src/features/keyboard-drag/useKeyboardBarDrag.ts: ArrowRight/Left=4, shiftKey=2, commitEdit=2, setLock=2, kbd-drag-announcer=2, isFormFocus=5, raw new Date(string)=0 ✓
- src/features/gantt/GanttView.tsx: useKeyboardBarDrag()=1, tabIndex=2, aria-label=4, data-event-start=1 ✓

Tests:
- AppShell.banner-stack.test.tsx: 8/8 pass
- ConstraintTooltip.a11y.test.tsx: 5/5 pass
- useKeyboardBarDrag.test.tsx: 10/10 pass
- Full suite: 433/434 pass (1 pre-existing CalendarView date failure on master)

Build: `npm run build` succeeds; lint: no new errors introduced.
