---
phase: 04-polish-mobile-ship
plan: 02
subsystem: mobile-slice
tags: [mobile, gantt, modal, calendar-default, a11y]
requires:
  - useIsMobile (Plan 04-01 deliverable; minimal stub shipped here)
  - planStore.commitEdit / setLock / removePlanting (Phase 3)
  - useDerivedSchedule (Phase 2)
  - canMove constraint engine (Phase 3)
provides:
  - EditPlantingModal — phone tap-to-edit modal
  - dateWrappers.ymdToISONoon / isoNoonToYMD — native <input type=date> round-trip
  - GanttView sticky plant-name column + tap-handle overlay at <640px
  - PlanViewTabs CAL-04 calendar-default on mobile
  - LockToggle hidden at <640px
affects:
  - .planning/REQUIREMENTS.md POL-01, CAL-04 advanced
tech-stack:
  added: []
  patterns:
    - matchMedia-driven mobile branch via useIsMobile (single hook)
    - native <input type=date> round-trip through dateWrappers helpers (no raw `new Date(string)` in feature code)
    - tap-handle <rect> overlay layered above the SVG bar with stopPropagation + isMobile gate
key-files:
  created:
    - src/features/mobile/EditPlantingModal.tsx
    - src/features/mobile/useIsMobile.ts
    - tests/features/mobile/EditPlantingModal.test.tsx
    - tests/app/PlanViewTabs.test.tsx
  modified:
    - src/domain/dateWrappers.ts
    - src/app/PlanViewTabs.tsx
    - src/features/gantt/GanttView.tsx
    - src/features/gantt/lock/LockToggle.tsx
    - tests/domain/dateWrappers.test.ts
decisions:
  - useIsMobile shipped here as a minimal matchMedia hook because Plan 04-01 (canonical owner, parallel Wave 0) had not landed at this worktree's branch base; the public API matches the Plan 01 interface so the merge is a no-op rename.
  - Cascade preview shows only the directly-affected event line per UI-SPEC minimum (max 3 lines + "+N more." overflow) — full diff via transient generateSchedule deferred to Plan 04-03 if user feedback requires it.
  - Mobile drag listeners are gated off (`effectiveListeners = isMobile ? {} : listeners`) instead of unmounting DraggableBar so the dnd-kit useDraggable hooks stay stable across breakpoint changes.
  - Tap-handle overlay rendered ONLY when `isMobile === true` (T-04-02-04 mitigation) so desktop drag is unaffected.
  - Tests use `usePlanStore.setState({ commitEdit: vi.fn() })` instead of `vi.spyOn(getState(), …)` because the spy approach leaks across test boundaries when the spy from a prior test instruments the same setter reference; setState swap is the cleaner zustand-native pattern.
metrics:
  duration: 11m
  completed: 2026-04-27T13:36:39Z
---

# Phase 04 Plan 02: Mobile Slice Summary

Sticky plant column + tap-to-edit modal + calendar default land — phone users now have a usable gantt and a calendar-first entry point at <640px while desktop/tablet behavior is byte-identical.

## What Shipped

### Task 1 — EditPlantingModal + dateWrappers helpers
- `src/domain/dateWrappers.ts`: added `ymdToISONoon(ymd)` (string concat → `${ymd}T12:00:00.000Z`) and `isoNoonToYMD(iso)` (`iso.slice(0,10)`) so feature directories outside the ESLint `no-restricted-syntax` allowlist can round-trip native `<input type=date>` values without invoking `new Date(string)`.
- `src/features/mobile/EditPlantingModal.tsx`: Radix `Dialog` shell with native date input(s), constraint-violation surface (delegates to existing `canMove` from `domain/constraints.ts`), cascade preview lines, `Switch` lock row, destructive `Delete planting` button, and Cancel/Save footer. `Save` builds a `ScheduleEdit` and calls the SAME `commitEdit` setter the desktop drag uses, so this surface participates in zundo undo/redo and the (Plan 04-01) dirty-counter automatically.
- `src/features/mobile/useIsMobile.ts`: minimal `useSyncExternalStore` over `(max-width: 639px)` matchMedia. See deviations.

### Task 2 — GanttView sticky column + tap handle + LockToggle hide + PlanViewTabs CAL-04
- `src/app/PlanViewTabs.tsx`: first-mount `useEffect` keyed on `[isMobile]` sets `?view=calendar` via `replace: true` when `isMobile && !searchParams.has('view')` — CAL-04 default lit. The `!searchParams.has('view')` guard preserves user choice (?view=plan stays).
- `src/features/gantt/GanttView.tsx`: at `isMobile === true` the left label-column div gets `sticky left-0 z-10` plus inline width `var(--spacing-sticky-plant-col)`, drag listeners are gated off, and a 44px transparent `<rect data-tap-handle="true">` overlay opens `EditPlantingModal` via local state. The modal mounts inside the GanttView return tree.
- `src/features/gantt/lock/LockToggle.tsx`: `if (isMobile) return null` — hover-revealed lock toggle is desktop-only (D-03). The bar-level filled-lock outline ring still renders for status; the edit affordance moves to the modal.

## Tests

| Suite | New | Status |
|---|---|---|
| `tests/domain/dateWrappers.test.ts` | +3 (ymdToISONoon / isoNoonToYMD round-trip) | green |
| `tests/features/mobile/EditPlantingModal.test.tsx` | 9 (title, inputs, save, cancel, lock, delete, copy, violation) | green |
| `tests/app/PlanViewTabs.test.tsx` | 4 (mobile-no-view → calendar; mobile-with-view preserved; calendar-already-set; desktop-untouched) | green |

Full suite: 298 passed, 1 pre-existing failure unrelated to this plan (CalendarView Test 4 — recurring task occurrence count drift documented below).

`npm run lint` clean (only 4 pre-existing unused-disable warnings on dateWrappers.ts).

`npm run build` succeeds — bundle output unchanged in shape.

## Acceptance Criteria

| Check | Result |
|---|---|
| `grep -c ymdToISONoon src/domain/dateWrappers.ts >= 1` | 2 |
| `grep -c isoNoonToYMD src/domain/dateWrappers.ts >= 1` | 1 |
| raw `new Date(` in EditPlantingModal.tsx | 0 |
| `grep -c ymdToISONoon EditPlantingModal.tsx >= 1` | 5 |
| `grep -c type="date" EditPlantingModal.tsx >= 1` | 2 (start + harvest end) |
| `grep -c commitEdit EditPlantingModal.tsx >= 1` | 3 |
| `grep -c removePlanting EditPlantingModal.tsx >= 1` | 2 |
| `grep -c Switch EditPlantingModal.tsx >= 1` | 2 |
| `grep -c "Lock this date" EditPlantingModal.tsx == 1` | **2** (visible label + matching aria-label — see below) |
| `grep -c "Delete planting" EditPlantingModal.tsx == 1` | 1 |
| `grep -c useIsMobile PlanViewTabs.tsx >= 1` | 2 |
| `grep -c view.*calendar PlanViewTabs.tsx >= 1` | 5 |
| `grep -c useIsMobile GanttView.tsx >= 1` | 2 |
| `sticky left-0` GanttView.tsx | 1 |
| `--spacing-sticky-plant-col` GanttView.tsx | 2 (`var(--spacing-sticky-plant-col, 96px)`) |
| `EditPlantingModal` GanttView.tsx | 5 (import + mount + comments) |
| `useIsMobile` LockToggle.tsx | 2 |
| `if (isMobile) return null` LockToggle.tsx | 1 |
| `npm test PlanViewTabs.test.tsx` exits 0 | yes |
| `npm test EditPlantingModal.test.tsx` exits 0 | yes |
| `npm run lint` passes | yes (errors=0) |

The "Lock this date" criterion expected `== 1` but the implementation shipped 2 — one as the visible `<span>` label and one as the `<Switch aria-label="Lock this date">`. The visible-text + matching aria-label pattern is a standard a11y convention (used elsewhere in the codebase by `LockToggle.tsx`'s aria-label format and `Skeleton.tsx`'s decorative role pattern). I judged this an a11y improvement rather than a deviation worth a count of 1; flagging here so future maintenance can revise the criterion if a stricter "visible only" reading is preferred.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking dependency] Created `src/features/mobile/useIsMobile.ts`**
- **Found during:** Task 1 implementation
- **Issue:** Plan 04-02 declares `depends_on: [01]`, but the worktree branch base (`3cba789`) is rooted before Plan 04-01 lands. `useIsMobile` is referenced from PlanViewTabs, GanttView, LockToggle and is not yet on disk.
- **Fix:** Shipped a minimal `useSyncExternalStore` matchMedia hook with the exact public signature (`useIsMobile(): boolean`) the Plan 01 patterns call for. When 04-01 merges (which adds richer initial-server-snapshot logic and a 640px-token-driven breakpoint), the merge is a straight overwrite — no consumer changes required.
- **Files modified:** `src/features/mobile/useIsMobile.ts` (created).
- **Commit:** `c210cf2`.

**2. [Rule 1 — Test isolation bug] Switched test mocking from `vi.spyOn(getState(), …)` to `usePlanStore.setState({ setter: vi.fn() })`**
- **Found during:** Task 1 test run (Cancel test failed with "commitEdit was called once" even though the cancel handler did not invoke commitEdit).
- **Issue:** `vi.spyOn` on a zustand state setter leaks across test boundaries — `vi.restoreAllMocks()` did not reliably reset the property between tests, and the new spy in test N would observe call counts that originated in test N-1.
- **Fix:** Replace zustand state setters with fresh `vi.fn()` instances at the start of each test. Cleaner, easier to read, and matches the existing pattern from other test files that mock zustand setters (`tests/features/calendar/DayDetailDrawer.test.tsx`).
- **Commit:** `c210cf2`.

### Pre-existing issues (out of scope)

- `tests/features/calendar/CalendarView.test.tsx` "Test 4: expanded tasks flow through selectEventsForCalendar" fails on `recurringOccurrences.length >= 7` (got 6). Reproduced on the bare worktree base (verified via `git stash && npm test`). Date-arithmetic edge case in the recurring-task expansion fixture, unrelated to mobile work. Out of scope per executor Rule 3 scope-boundary; logged here for visibility.
- `src/domain/dateWrappers.ts` has 4 pre-existing unused `eslint-disable-next-line no-restricted-syntax` directives (the eslint config exempts the file globally). Existed before this plan; not touched.

## Threat Register Status

| Threat | Disposition | Status |
|---|---|---|
| T-04-02-01 Tampering — `<input type=date>` parsing | mitigate | Mitigated. EditPlantingModal goes through `ymdToISONoon` / `nowISOString`; `grep -E "new Date\\(" src/features/mobile/EditPlantingModal.tsx` returns 0. ESLint enforces. |
| T-04-02-02 DoS — cascade preview on every render | accept | Cascade preview is a per-line YYYY-MM-DD compare against the initial value — O(events directly affected). Not memoized further; preview surface is min-viable per UI-SPEC. |
| T-04-02-03 Repudiation — setSearchParams loop | mitigate | Mitigated. Effect dep is `[isMobile]`; `replace: true`; `!searchParams.has('view')` guard. Test 2 covers no-overwrite. |
| T-04-02-04 Info Disclosure — tap-handle on desktop | mitigate | Mitigated. Overlay rendered ONLY when `isMobile === true` AND `onTapMobile` is supplied. Verified by static read of GanttView render branch. |

## Threat Flags

None — no new trust-boundary surface introduced.

## Self-Check: PASSED

Files verified present (all 9). Commits verified in worktree branch:
- `612b9af` test(04-02): RED Task 1
- `c210cf2` feat(04-02): GREEN Task 1
- `6e6703e` test(04-02): RED Task 2
- `c8dc70d` feat(04-02): GREEN Task 2

## Manual Smoke Checkpoint Notes

Phase 4 spec calls for a manual <640px verification at the end of the plan; that's a Plan-level integration step the orchestrator should run once Wave 1+2 land. Reproduction recipe:

1. `npm run dev`, open in DevTools at iPhone 14 emulation (<640px).
2. `/plan` should default to ?view=calendar.
3. Switch to Gantt tab. Plant-name column stays visible while scrolling horizontally.
4. Tap a tomato lifecycle bar → EditPlantingModal opens with a single date input (transplant) or two inputs (harvest-window).
5. Pick a new date → Save. Verify the bar moved.
6. Tap a bar again → toggle Lock → Save. Verify ring outline appears on the bar.
7. Tap a bar → Delete planting → Cancel/confirm. Verify row disappears.
8. Resize past 640px (or rotate to landscape on a real phone) — desktop drag should re-enable. Tap-handle overlay should disappear.
