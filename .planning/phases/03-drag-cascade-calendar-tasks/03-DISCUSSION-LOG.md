# Phase 3: Drag, Cascade, Calendar & Tasks - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 03-drag-cascade-calendar-tasks
**Areas discussed:** Gantt library; Undo/redo + cascade preview; Lock/pin UX + drag affordances; Task dashboard + calendar nav

---

## Gantt library (kickoff spike)

| Option | Description | Selected |
|--------|-------------|----------|
| Bare SVG + @dnd-kit/core | Keep existing GanttView.tsx, add @dnd-kit pointer sensors. modifiers transform candidate every tick — wire canMove() inside a modifier for clamp + tooltip reasons. DragOverlay = ghost cascade preview. | ✓ |
| @svar-ui/react-gantt 2.6 | Drag/dependencies built-in, MIT, R19 OK. Rejected: intercept API is binary allow/block (can't clamp), multi-segment-per-row is PRO-only (paid), discards working GanttView.tsx + timeScale.ts. | |
| Bare SVG + interact.js | Mature framework-agnostic pointer drag. Staler maintenance (last v1.10.27 Mar 2024); not React-idiomatic; manual ghost layer. | |
| Bare SVG + hand-rolled pointer events | Zero deps, total control. Reinvent capture/cancel/scroll-lock/touch-action; Phase 4 a11y likely pulls a library back in. | |

**User's choice:** Bare SVG + @dnd-kit/core (Recommended)
**Notes:** Decisive finding was that SVAR's intercept can't clamp candidates and multi-segment bars are paywalled — that wipes GANTT-05/09 and the existing render. @dnd-kit's modifiers + DragOverlay are a near-perfect fit for the constraint engine already in `src/domain/constraints.ts`.

---

## Undo history representation

| Option | Description | Selected |
|--------|-------------|----------|
| zundo temporal middleware, plan-wide scope | <700B; native Zustand; free Cmd-Z plumbing; handleSet collapses 60Hz drag stream into one entry on commit; partialize covers full plan slice → undo also reverses planting CRUD + lock toggles + custom tasks + location overrides | ✓ |
| Reverse-edit log over ScheduleEdit[] | Tiny memory; aligns with sparse-edits invariant. Doesn't cover non-schedule actions; redo-stack invalidation bugs to maintain. | |
| Full-plan deep-clone snapshots | structuredClone(plan) + history stack. Simplest mental model but rebuilds zundo's API by hand. | |
| Immer patches (produceWithPatches) | Patch+inverse is precisely undo/redo. Refactor mutations to immer producers; array-index drift gotchas. | |

**User's choice:** zundo temporal middleware, plan-wide scope (Recommended)
**Notes:** Plan-wide undo scope locked because the user's profile flags "regression" as a top frustration trigger — Cmd-Z must feel uniform. Drag-only undo would surprise users when accidental planting deletion didn't reverse.

---

## Cascade preview computation

| Option | Description | Selected |
|--------|-------------|----------|
| Live re-run generateSchedule on rAF-throttled pointermove | Single source of truth (engine); preview = exact commit output; engine cost over 30–300 events is sub-ms; ghost layer renders transient at 60% opacity. | ✓ |
| Two-layer render (frozen committed + ghost overlay) | Same engine call; committed bars don't re-render. Locked as the actual render strategy via D-20. | |
| Precomputed delta-table on dragStart | Theoretically fastest. Couples to engine internals; preview/commit divergence bugs; premature opt. | |

**User's choice:** Live re-run generateSchedule on pointermove (Recommended)
**Notes:** Engine cost over realistic plans (5-50 plantings × ~6 events) is sub-millisecond; React reconciliation churn is the bottleneck, mitigated with rAF throttle + memoized per-bar selectors keyed on (eventId, start, end, edited). Two-layer render strategy adopted as the actual implementation pattern (D-20).

---

## Lock toggle placement

| Option | Description | Selected |
|--------|-------------|----------|
| Hover-revealed icon + Alt-click shortcut | 16x16 lock icon top-right of bar, hover-revealed when unlocked, always-visible filled when locked. 24x24 invisible hit-target wrapper for Phase 4 touch. Alt-click power shortcut. New 'locked' palette token + 2px outline ring. | ✓ |
| Right-click context menu | No bar chrome; scales to other actions later. Hidden affordance, no touch story. | |
| Modifier-click only (Alt-click) | Zero chrome, fastest. Completely undiscoverable without onboarding. | |

**User's choice:** Hover-revealed icon + Alt-click shortcut (Recommended)
**Notes:** Wrap icon in 24x24 invisible hit-target rect now so Phase 4 mobile (tap-and-hold equivalent) ships without restructuring.

---

## What's draggable

| Option | Description | Selected |
|--------|-------------|----------|
| Anchor-only: transplant or direct-sow | Only planting anchor is draggable; cascade pushes everything downstream. Auto-task + derived bars get pointer-events-none. | (modified) |
| Anchor + harvest-window edge resize | Adds harvest extension. Edge-resize on 20px bar with horizontal scroll is finicky. | |
| Per-phase drag + edge resize on all bars | Maximum flexibility. 6 event types × 2 affordances = combinatorial bug risk. | |

**User's choice:** Modified option 2 — "indoor seeding, transplant, direct-sow" as draggable anchors (whole-bar move) PLUS the trailing harvest window (edge resize). Auto-task + harden-off + germination-window stay derived/non-draggable.
**Notes:** User clarified scope mid-question. Captured as D-04 (whole-bar drag for indoor-start, transplant, direct-sow), D-05 (right-edge resize for harvest-window only), D-06 (everything else stays derived/non-draggable).

---

## Snap granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Whole-day snap, always | Matches UTC-noon storage; gardener vocabulary; cascade math in days. Fix season-zoom jitter with 6 px/day floor on time axis. | ✓ |
| Week snap | Honest about frost-date uncertainty but creates "snapped to Mon May 12" tooltip noise. | |
| Hybrid (day in / week out) | Linear-style. Behavior-changes-on-zoom can surprise mid-drag. | |

**User's choice:** Whole-day snap always (Recommended)
**Notes:** Surface frost-date uncertainty via a separate visual (translucent band on axis) in Phase 4, not by degrading drag precision.

---

## Snap-back tooltip placement

| Option | Description | Selected |
|--------|-------------|----------|
| Floating-with-cursor + sticky inline pill | ~400ms floating during snap-back, then portaled inline pill (above/below by viewport edge) until next drag-start or 8s. 240–320px, lifecycle-palette accent border. Phase 4 a11y wires aria-live=polite without rework. | ✓ |
| Inline sticky pill only | Simpler; loses live snap-back feedback moment. | |
| Fixed banner at top of gantt panel | Always visible, never clipped, easy aria-live. Loses spatial connection to which bar snapped. | |

**User's choice:** Floating-with-cursor + sticky inline pill (Recommended)
**Notes:** Tooltip text reads directly from `ConstraintResult.reasons[]`. Built portaled day 1 so Phase 4 a11y pass adds aria-live + keyboard-dismiss without restructuring.

---

## Task dashboard layout

| Option | Description | Selected |
|--------|-------------|----------|
| By-plant default + toggle, per-row checkboxes, modal author | Things 3 / Todoist conventions; plant-centric mental model; Today merges overdue with red flag; modal hosts recurrence form; recurring-task completion key = `${taskId}:${ISODate}`. | ✓ |
| By-category + bulk multi-select + quick-add bar | For >100 tasks/wk. Shift-click is desktop-only; Phase 4 mobile parity awkward. | |
| Independent per-section grouping | Today by plant, Week by category, Overdue flat. Three UIs in one screen; harder to test/mobile-port. | |

**User's choice:** By-plant default + toggle, per-row checkboxes, modal author (Recommended)
**Notes:** Recurring-task completion key designed in the type system on day 1: bare `taskId` for one-off (global completion), `${taskId}:${ISODate}` for recurring (per-occurrence completion).

---

## Calendar/Gantt navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Single /plan + ?view= URL param tab strip | useSearchParams('view'). Phase 4 mobile-default-to-calendar = one-line viewport check at route mount. React.lazy(FullCalendar) keeps gantt-only sessions cheap. | ✓ |
| Two separate hash routes (#/plan + #/calendar) | Simplest mental model. Phase 4 mobile-default needs a redirect dance that flashes. | |
| Toolbar toggle in uiStore (memory only) | Zero URL coupling. Refresh always lands on gantt; can't deep-link to calendar view. | |

**User's choice:** Single /plan route + ?view= URL param tab strip (Recommended)
**Notes:** DEPLOY-02 (deep-link survival on static host) directly motivates URL state over uiStore-only toggle.

---

## Day-detail panel

| Option | Description | Selected |
|--------|-------------|----------|
| Side drawer + URL state | dateClick handler → `?date=YYYY-MM-DD` URL param → right drawer (bottom sheet on mobile via CSS breakpoint). dayMaxEvents={3} lets built-in +more popover handle cell overflow. Back-button closes drawer; refresh restores. | ✓ |
| Side drawer, no URL state | selectedDate in uiStore. Loses deep-linking + refresh-restores. | |
| Inline expansion below grid | Calendar grid jumps; mobile pushes calendar off-screen. | |

**User's choice:** Side drawer + URL state (Recommended)
**Notes:** FullCalendar's built-in popover is non-customizable per issue #7344, so a custom drawer is the only path to share-worthy polish. Combine `dayMaxEvents={3}` (built-in popover handles overflow) + custom drawer (deliberate day inspection) — two complementary affordances.

---

## Claude's Discretion (deferred to planner)

- Ghost overlay opacity exact value (60% starting point)
- Lock-icon glyph (Lucide `Lock` named; planner may pick alternate)
- Tab strip visual style (segmented control vs underlined tabs vs pill toggles)
- Side drawer width (300–400px range) and animation timing (200–250ms ease-out default)
- FullCalendar theme integration (Tailwind tokens vs CSS overrides)
- `--lifecycle-locked` palette token color value (must contrast against all phase fills)
- Cascade reflow algorithm details (lock map consulted inside `generateSchedule` or thin post-pass wrapper)
- Tooltip auto-dismiss timing (8s default; tunable 6–10s)
- Section "show more" / collapse for overflowing dashboard sections (deferred unless trivial)
- ESLint allowance for any new `new Date()` site
- Test split between Vitest unit/integration vs Vitest 4 browser mode for drag testing

## Deferred Ideas

- Drag interactions on the calendar view → Phase 4 if user demand surfaces
- Bulk task multi-select / shift-click + section-level "complete all" → V1.1+ if real-user task volume exceeds ~50/wk
- Quick-add task bar (natural-language parsing) → post-v1
- Per-phase drag of arbitrary bars → explicit deferral
- Gantt zoom controls / scale picker → if added later, snap stays day-level
- Tooltip auto-dismiss + keyboard-dismiss + aria-live → Phase 4 a11y pass
- Mobile-default-to-calendar (CAL-04) → Phase 4
- Keyboard-driven drag fallback (POL-08) → Phase 4
- WCAG AA contrast audit (POL-09) → Phase 4
- 60fps stress-test on 200-event plans (POL-07) → Phase 4
- "Completed N of M this week" task stat → V1.1
- Frost-date uncertainty band on axis → Phase 4 polish
- PWA / offline-first → Phase 4 if validated
- Multi-bed / 2D layout, companion planting, native mobile → explicitly out of scope (PROJECT.md)
