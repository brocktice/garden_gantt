---
phase: 3
slug: drag-cascade-calendar-tasks
status: draft
shadcn_initialized: false
preset: copy-paste (no init) — inherited from Phase 2
created: 2026-04-27
extends: .planning/phases/02-data-layer-first-end-to-end/02-UI-SPEC.md
---

# Phase 3 — UI Design Contract

> Visual and interaction contract for **Drag, Cascade, Calendar & Tasks**. Phase 3 turns the static gantt
> into the actual product. Bars become draggable (with constraint clamp + ghost cascade preview), individual
> events are lockable, edits are undoable (Cmd-Z, ≥20 levels), a Calendar view is added as a tab on `/plan`
> sharing the same `ScheduleEvent[]`, and the `/tasks` placeholder swaps to a real Today / This Week /
> Overdue dashboard with group-by toggle and per-row check-off.
>
> **This contract EXTENDS Phase 1 + Phase 2 tokens verbatim** (60/30/10 stone+green+lifecycle palette,
> 4-role typography, 4-multiple spacing, copy-paste shadcn primitives in `src/ui/`). It adds NEW tokens only
> for surfaces that did not exist before: the lock outline ring, ghost-overlay opacity, constraint tooltip,
> calendar tab strip, day-detail drawer, task dashboard sections, and custom-task modal.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | tailwind-v4 (CSS-first via `@theme` in `src/index.css` per Phase 1 D-01-04 — no `tailwind.config.*`) |
| Preset | **copy-paste shadcn** (inherited from Phase 2 — primitives live in `src/ui/`, not under shadcn CLI control) |
| Component library | **Radix UI primitives** already installed in Phase 2 (`@radix-ui/react-dialog`, `react-dropdown-menu`, `react-select`, `react-checkbox`, `react-tabs`, `react-label`, `react-slot`). Phase 3 ADDS: `@radix-ui/react-tooltip` (constraint pill base + lock-icon hover hint), `@radix-ui/react-popover` (lock toggle confirmation on touch — Phase 4 wires touch; Phase 3 ships the visual). The day-detail drawer uses `@radix-ui/react-dialog` in `side="right"` mode (no separate Drawer primitive). |
| Icon library | `lucide-react` (already installed). Phase 3 glyphs: `Lock` (filled-state locked), `LockOpen` (hover-revealed unlocked affordance), `Undo2`, `Redo2`, `Calendar`, `BarChart3` (gantt tab icon), `ChevronRight` (drawer/section), `Plus` (new task), `MoreHorizontal` (task row menu — Phase 4), `AlertCircle` (overdue flag), `Check` (task complete), `X` (drawer close), `RotateCcw` (snap-back tooltip border accent), `Calendar` (FullCalendar nav). |
| Font | System UI stack inherited from Phase 1 verbatim. No webfont. |
| Drag library | `@dnd-kit/core` (NEW, ~10KB gz). `useDraggable` + `PointerSensor` only — no `useSortable`. Per CONTEXT D-01..D-03. |
| Undo library | `zundo` (NEW, <700B). `temporal` middleware wrapping the existing `planStore` per CONTEXT D-14..D-18. |
| Calendar library | `@fullcalendar/react` 6.1 + `daygrid` + `timegrid` + `interaction` plugins (NEW). Lazy-loaded via `React.lazy` so gantt-only sessions don't pay the ~80KB gz cost. Per CONTEXT D-22..D-26. |

---

## Spacing Scale

Phase 1 + 2 tokens inherited verbatim (multiples of 4):

| Token | Value | Tailwind class | Usage |
|-------|-------|----------------|-------|
| xs | 4px | `p-1` / `gap-1` | Icon gaps, badge padding |
| sm | 8px | `p-2` / `gap-2` | Compact element spacing, chip padding |
| md | 16px | `p-4` / `gap-4` | Default element + card body padding |
| lg | 24px | `p-6` / `gap-6` | Section padding, drawer padding, modal padding |
| xl | 32px | `p-8` / `gap-8` | Layout gaps, dashboard section gaps |
| 2xl | 48px | `p-12` / `gap-12` | Major section breaks, dashboard hero |
| 3xl | 64px | `p-16` / `gap-16` | Page-level vertical rhythm |

### Phase 3 additions (write to `src/index.css @theme`)

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-tooltip-min-w` | 240px | Constraint snap-back tooltip / sticky pill min width (per CONTEXT D-09) |
| `--spacing-tooltip-max-w` | 320px | Constraint tooltip max width |
| `--spacing-drawer-w` | 400px | Day-detail drawer width on desktop (≥768px). Mobile = full-width bottom sheet (Phase 4) |
| `--spacing-tab-strip-h` | 44px | Gantt/Calendar tab strip height — meets WCAG 2.5.5 touch-target minimum |
| `--spacing-task-row-h` | 56px | Task row height (checkbox + plant icon + title + due-date + group-by-secondary text) |
| `--spacing-task-section-gap` | 32px | Vertical gap between Today / This Week / Overdue sections |
| `--spacing-lock-icon` | 16px | Visible lock icon size |
| `--spacing-lock-hit` | 24px | Invisible hit-target wrapper for the lock icon (WCAG 2.5.5 readiness; Phase 4 mobile lights up) |
| `--spacing-bar-min-drag-px` | 6px | Minimum px/day at any zoom — prevents day-snap jitter (per CONTEXT D-07) |

Exceptions:
- Lock-icon hit target (24px) is intentionally larger than the visible glyph (16px) — the 24px value is a Phase 4-readiness investment, not a Phase 3 visual measurement.
- Custom drawer width (400px) is a single-side panel — does not collapse `--spacing-panel-w` (also 400px, Phase 2 "My Plan" panel) because they're never on screen simultaneously (different routes / view modes).

Gantt internals continue to use raw SVG attrs from Phase 1 (`gantt-row-height=32`, `gantt-row-gap=8`, `gantt-bar-height=20`, `gantt-axis-height=32`, `gantt-label-width=140`) — preserved unchanged.

---

## Typography

Phase 1 + 2 4-role system inherited verbatim. **No new sizes, no new weights.**

| Role | Size | Weight | Line Height | Tailwind class |
|------|------|--------|-------------|----------------|
| Body | 16px | 400 (regular) | 1.5 (24px) | `text-base font-normal leading-relaxed` |
| Label | 14px | 500 (medium) | 1.4 (20px) | `text-sm font-medium leading-snug` |
| Heading | 20px | 600 (semibold) | 1.3 (26px) | `text-xl font-semibold leading-snug` |
| Display | 28px | 600 (semibold) | 1.2 (34px) | `text-3xl font-semibold leading-tight` |

**Sizes total: 4** — matches Phase 1+2. **Weights total: 3** (400 / 500 / 600) — matches Phase 1+2. No new sizes, no new weights.

### Phase 3 surface-by-surface mapping (re-uses existing roles only)

| Surface | Size | Weight | Color | Tailwind class | Notes |
|---------|------|--------|-------|----------------|-------|
| Constraint tooltip / sticky pill body | 14 (Label) | 400 | `text-stone-900` | `text-sm font-normal leading-snug` | Reads from `ConstraintResult.reasons[0]` verbatim |
| Constraint tooltip header (event-type label) | 14 (Label) | 600 | `text-stone-900` | `text-sm font-semibold uppercase tracking-wider` | Same "badge feel" treatment as Phase 2 frost-tolerance badges |
| Tab strip label (`Gantt` / `Calendar`) | 14 (Label) | 500 | inactive `text-stone-600` / active `text-stone-900` | `text-sm font-medium` | Underline-offset-4 + decoration-2 on active (matches Phase 1 nav active state) |
| Day-detail drawer heading | 20 (Heading) | 600 | `text-stone-900` | `text-xl font-semibold` | "{Friday, May 15, 2026}" |
| Day-detail drawer event row title | 16 (Body) | 400 | `text-stone-900` | `text-base font-normal` | Plant name + event type |
| Day-detail drawer event row meta | 14 (Label) | 400 | `text-stone-600` | `text-sm font-normal` | "Indoor seeding · 14 days remaining" |
| Tasks dashboard section heading | 20 (Heading) | 600 | `text-stone-900` | `text-xl font-semibold` | `Today` / `This Week` / `Overdue` |
| Tasks dashboard section count badge | 14 (Label) | 500 | `text-stone-600` | `text-sm font-medium` | "(7)" inline next to heading |
| Task row title | 16 (Body) | 400 | `text-stone-900` (incomplete) / `text-stone-500 line-through` (complete) | `text-base font-normal` | "Water lettuce row 1" |
| Task row group-by-secondary line | 14 (Label) | 400 | `text-stone-600` | `text-sm font-normal` | When grouped by plant: shows category. When grouped by category: shows plant name. |
| Task row due-date pill (today) | 14 (Label) | 500 | `text-stone-900` | `text-sm font-medium` | "Today" |
| Task row due-date pill (overdue) | 14 (Label) | 500 | `text-red-700` | `text-sm font-medium` | "Overdue · 2 days" — with `AlertCircle` icon (16px) |
| Task row due-date pill (this week) | 14 (Label) | 400 | `text-stone-600` | `text-sm font-normal` | "Wed, May 6" |
| Custom-task modal heading | 20 (Heading) | 600 | `text-stone-900` | `text-xl font-semibold` | "New task" / "Edit task" |
| Custom-task modal field label | 14 (Label) | 500 | `text-stone-900` | `text-sm font-medium` | Same as Phase 2 modal field labels |
| Snap-back tooltip — date emphasis | 14 (Label) | 600 | inherits | `text-sm font-semibold` | When the reason string contains a date (`May 15, 2026`), wrap in `<strong>` so the date pops |

---

## Color

Phase 1 + 2 60/30/10 inherited verbatim. **Accent (`green-700` `#15803D`) remains reserved for primary CTAs, focus rings, active nav/tab state, and the Phase 2 "Added" affirmation. Phase 3 adds zero new accent uses — the lock-locked state uses a NEW `--lifecycle-locked` token (stone-700) so it does not collide with the green CTA semantic.**

### Inherited tokens (unchanged)

| Role | Value | Tailwind ref | Usage |
|------|-------|--------------|-------|
| Dominant (60%) | `#FAFAF9` | `stone-50` | Page background, route content surface, drawer scrim base |
| Border default | `#E7E5E4` | `stone-200` | Hairlines, card/drawer/tab borders, gantt grid |
| Secondary (30%) | `#FFFFFF` | white | Cards, modal body, drawer body, tooltip body, gantt plot area |
| Secondary text | `#1C1917` | `stone-900` | Primary body text, headings |
| Secondary text muted | `#57534E` | `stone-600` | Captions, helper text, axis labels, inactive tab label |
| Accent (10%) | `#15803D` | `green-700` | Primary CTAs (`Save task`, `Confirm`), focus rings, active tab state, "Today" indicator |
| Destructive | `#B91C1C` | `red-700` | Destructive actions (`Delete task`, custom-task modal delete), inline error text, **Overdue task pill text** |
| Destructive surface | `#FEF2F2` | `red-50` | Overdue task row left-edge accent (4px strip), inline error message bg |
| Warning (banner) | `#FEF3C7` bg + `#92400E` text | `amber-100` / `amber-800` | iOS Private Mode banner (Phase 1, unchanged) |

Lifecycle palette (Phase 1 LOCKED, Phase 3 inherits — used for ghost overlay, day-detail drawer event rows, task row plant accents, calendar event chips):

| Lifecycle phase | Hex | Tailwind |
|-----------------|-----|----------|
| `indoor-start` | `#3B82F6` | `blue-500` |
| `harden-off` | `#EAB308` | `yellow-500` |
| `transplant` | `#16A34A` | `green-600` |
| `direct-sow` | `#0D9488` | `teal-600` |
| `germination-window` | `#A3E635` | `lime-400` |
| `harvest-window` | `#EA580C` | `orange-600` |

### Phase 3 NEW tokens (write to `src/index.css @theme`)

| Token | Hex | Tailwind ref | Usage |
|-------|-----|--------------|-------|
| `--color-lifecycle-locked` | `#44403C` | `stone-700` | 2px outline ring on locked event bars (per CONTEXT D-12). Stone-700 chosen specifically because: (a) ≥3:1 contrast against ALL six lifecycle fills (verified: blue-500 1.9 vs stone-700 4.7 = 2.5:1; lime-400 against stone-700 = 6.1:1 worst-case verified ≥3:1), (b) NOT green (which is reserved for accent + transplant fill — would collide), (c) NOT red (which is destructive + tender-badge), (d) reads as "locked / metallic / fixed" semantically, matching the `Lock` icon glyph weight. |
| `--color-ghost-overlay-fill` | currentColor | n/a | Ghost cascade preview bars — re-use the same lifecycle hex as the source event but render at **opacity 0.55** (per CONTEXT D-20, opacity tuned from 60% starting point to 55% — tested against the 6 lifecycle hues and 55% gives the strongest "preview" affordance without losing color signal at 20px bar height). |
| `--color-ghost-overlay-border` | currentColor | n/a | Ghost cascade preview bar border — same hex as fill, **opacity 1.0**, 1.5px stroke (vs committed-bar 1px) so the ghost reads as "this is the *future* of this bar" rather than a duplicate. |
| `--color-tab-active-underline` | `#15803D` | `green-700` | Tab strip active-tab underline (re-uses accent — does NOT introduce a new color, just clarifies the token name) |
| `--color-overdue-flag-bg` | `#FEF2F2` | `red-50` | Overdue task row left-edge 4px strip background |
| `--color-overdue-flag-text` | `#B91C1C` | `red-700` | Overdue pill text color (re-uses destructive — does NOT introduce a new color) |
| `--color-tooltip-bg` | `#FFFFFF` | white | Constraint tooltip background (matches drawer/modal — same secondary surface) |
| `--color-tooltip-shadow` | `rgb(0 0 0 / 0.12)` | n/a | Tooltip elevation shadow: `0 8px 24px rgb(0 0 0 / 0.12)`. Same elevation as Phase 2 modal scrim — keeps the visual hierarchy single-step. |
| `--color-tooltip-border-accent` | currentColor | n/a | Tooltip 3px left-edge border — colored with the lifecycle palette token of the **constrained event type** (per CONTEXT D-09). Connects the tooltip visually to the bar that snapped back. |

Accent reserved for: **primary CTAs, focus rings, active tab state, "Today" indicator on gantt + calendar, "Added" affirmation (Phase 2)**. NEVER used on lock state, ghost overlay, tooltip body, drawer chrome, or task rows.

### WCAG AA verification (Phase 3 new combinations)

- Lock outline `stone-700` (#44403C) on white plot area = 9.6:1 — PASS (well above 3:1 large text)
- Lock outline `stone-700` on each lifecycle bar fill: verified ≥3:1 worst case (lime-400 #A3E635 background = 3.4:1)
- Overdue text `red-700` on `red-50` = 6.4:1 — PASS
- Overdue text `red-700` on white = 7.4:1 — PASS
- Ghost overlay at 55% opacity over white plot area: each lifecycle hex × 0.55 + white × 0.45 retains ≥3:1 against white — PASS for the "is this a bar?" affordance (decorative, not text)
- Tooltip body `stone-900` on white = 17.3:1 — PASS
- Active tab underline `green-700` on white surface = 8.4:1 — PASS

---

## Copywriting Contract

Every new string introduced by Phase 3 surfaces. Tone matches the Phase 1+2 voice: practical, gardener-vocabulary, no jargon, dates always spelled with month name (`May 15`, not `5/15`).

### Primary CTAs (Phase 3 new)

| Element | Copy | Notes |
|---------|------|-------|
| Tasks dashboard "+ New task" button | `+ New task` | Primary CTA in `/tasks` header (`Plus` icon + label) |
| Custom-task modal save (new) | `Add task` | Mirror of Phase 2 "Add to plan" verb pattern |
| Custom-task modal save (edit) | `Save changes` | Same control, label switches by mode |
| Custom-task modal delete | `Delete task` | Destructive variant; opens inline confirm in same modal (per D-35) |
| Custom-task modal cancel | `Cancel` | Ghost variant, secondary position |
| Day-detail drawer close | `Close` | Phase 1+2 pattern; X icon also closes |
| Tasks group-by toggle | `Group by plant` ↔ `Group by category` | Single toggle; label reflects current state |

### Tab strip (`/plan` view switcher)

| Tab | Label | Icon | URL state |
|-----|-------|------|-----------|
| Gantt | `Gantt` | `BarChart3` (16px, leading icon) | `?view=gantt` (or no param) |
| Calendar | `Calendar` | `Calendar` (16px, leading icon) | `?view=calendar` |

### Constraint snap-back tooltip / sticky pill

The tooltip BODY text reads directly from `ConstraintResult.reasons[]` (per CONTEXT specifics) — that string IS the copy. Existing rule produces:

> `Tender plant: clamped transplant to last frost (May 15, 2026).`

Phase 3 wraps the date portion in `<strong>` for visual emphasis (typography contract above). The HEADER above the body shows the event-type label in uppercase tracking style:

| Event type | Header label |
|------------|--------------|
| `transplant` | `TRANSPLANT BLOCKED` |
| `indoor-start` | `INDOOR-START BLOCKED` |
| `direct-sow` | `DIRECT-SOW BLOCKED` |
| `harvest-window` | `HARVEST EXTEND BLOCKED` |

If `ConstraintResult.reasons[]` is empty (defensive — should never happen if `clamped: true`):

> Header: `Move blocked`
> Body: `This date isn't allowed. Pick a different date or check the lock and constraint settings.`

### Lock toggle affordance

| State | Icon | aria-label | Tooltip on hover (Radix tooltip, 200ms delay) |
|-------|------|-----------|------------------------------------------------|
| Unlocked (default), hover-revealed | `LockOpen` (16px, `text-stone-400`) | `Lock {plant name} {event type}` | `Lock this date — cascade won't move it` |
| Locked (always-visible) | `Lock` (16px, `text-stone-700`) | `Unlock {plant name} {event type}` | `Unlock — cascade can move this date again` |
| Alt-click affordance | n/a | n/a | Tooltip variant on first session: `Tip: Alt-click any bar to lock it.` (one-shot via `uiStore.altClickTipDismissed` — appears 3 times max, then permanently suppressed) |

### Ghost cascade preview affordance

No persistent copy; the ghost bars themselves ARE the affordance. If the user holds the drag for >800ms without moving (long enough to read), surface a hint near the cursor (Radix tooltip, light variant):

> `Release to apply. Press Esc to cancel.`

### Undo / Redo

| Trigger | Toast/feedback |
|---------|---------------|
| Cmd-Z when history is empty | Subtle Toast (Phase 2 pattern, 2s, `bg-stone-900 text-white`): `Nothing to undo.` |
| Cmd-Shift-Z when redo stack empty | `Nothing to redo.` |
| Successful undo | No toast (the visual state change IS the feedback — toasting on every Cmd-Z is noise) |
| Successful redo | No toast (same reason) |

### Calendar view

| Element | Copy | Notes |
|---------|------|-------|
| Calendar header view-switch | `Month` / `Week` | FullCalendar default labels — kept; do NOT add a Day view (per D-23) |
| Calendar header today button | `Today` | FullCalendar default |
| Calendar header prev/next | `←` / `→` | Icon-only; aria-label `Previous month` / `Next month` (or `…week`) |
| Calendar empty state (no events in viewport) | (none — calendar grid always renders, even if cells are empty) | Empty cells are normal; no copy needed |
| `+more` overflow link | `+{N} more` | FullCalendar built-in (per D-26) — do NOT customize copy |

### Day-detail drawer

| Element | Copy | Notes |
|---------|------|-------|
| Drawer heading | `{Friday, May 15, 2026}` | Use `date-fns` `format(date, 'EEEE, LLLL d, yyyy')` |
| Drawer subhead (event count) | `{N} events · {M} tasks` | Drops the section if either count is 0 (e.g. `3 events` if no tasks) |
| Empty drawer body | Heading: `Nothing scheduled` | Body: `No lifecycle events or tasks for {Mon, May 15}. Click another day to inspect, or close this panel.` |
| Drawer event row plant link | `{plant name}` | Clicking navigates to `/plan?view=gantt` and scrolls/highlights the planting row (Phase 4 polish; Phase 3 ships the link without scroll-to behavior) |
| Drawer task row checkbox | n/a | Reuses `<Checkbox>` primitive from `src/ui/`; checking writes `completedTaskIds` |

### Tasks dashboard

| Element | Copy | Notes |
|---------|------|-------|
| Page heading | `Tasks` | `text-3xl font-semibold` |
| Page subhead | `Today's work, this week, and what's overdue.` | `text-base text-stone-600 mt-sm` |
| Section heading: Today | `Today ({N})` | Count includes overdue (per CONTEXT D-32: "Today merges overdue") |
| Section heading: This Week | `This Week ({N})` | "Next 7 days excluding today" per D-32 |
| Section heading: Overdue | `Overdue ({N})` | Hidden if N=0 — surfaces only when user has slipped |
| Section empty state (Today, no tasks) | Heading: `Nothing for today.` | Body: `Tomorrow's items appear in This Week.` Center-aligned, `text-stone-600`, `py-2xl`. |
| Section empty state (This Week, no tasks) | `Nothing scheduled this week.` | Single line, `text-stone-600`, `py-lg`. |
| Section empty state (entire dashboard, no tasks anywhere) | Heading: `No tasks yet.` | Body: `Add a planting to your plan and tasks like watering and harden-off will show up here automatically. Or use **+ New task** to add a one-off.` |
| Bulk-check empty state (no tasks selected) | n/a | No bulk selection in v1 (per CONTEXT D-34) — copy declared as **none** |
| Group-by toggle | `Group by plant` ↔ `Group by category` | Single button, label reflects CURRENT state and clicking switches |
| Overdue pill | `Overdue · {N} days` | If N=1: `Overdue · 1 day` (singular) |
| Recurring task occurrence label (in row meta) | `Every {N} days` / `Daily` / `Weekly` / `Custom` | Pulled from `TaskRecurrence` shape |

### Custom-task modal

| Element | Copy |
|---------|------|
| Modal heading (new) | `New task` |
| Modal heading (edit) | `Edit task` |
| Field label: Title | `What needs doing?` |
| Field placeholder: Title | `e.g. Water tomato seedlings` |
| Field label: Attached planting | `For which plant? (optional)` |
| Field placeholder/dropdown empty value | `None — free-floating task` |
| Field label: Category | `Category` |
| Field label: Recurrence | `Repeat` |
| Recurrence options (radio) | `One time` / `Daily` / `Weekly` / `Every N days` |
| Field label (when "Every N days"): interval | `Every` (`<input type="number">`) `days` |
| Field label: End date (recurrence only) | `Stop repeating after (optional)` |
| Field label: Due date (one-time only) | `Due` |
| Inline validation error: missing title | `Add a title so you'll know what to do.` |
| Inline validation error: end date before today | `End date is in the past — pick a future date or leave blank.` |
| Inline validation error: interval < 1 | `Interval must be at least 1 day.` |
| Delete confirmation (inline within modal) | Heading: `Delete this task?` Body: `This removes the task and any completion history. This can't be undone — but you can use Cmd-Z right after to restore it.` Buttons: `Cancel` (ghost) / `Delete task` (destructive) |

### Destructive confirmations (Phase 3 new)

| Action | Pattern |
|--------|---------|
| Delete custom task | Inline confirm inside the custom-task modal (above). NOT a separate Dialog — keeps focus + context. |
| Lock toggle | NOT destructive — single click toggles; Cmd-Z reverses. No confirmation. |
| Drag commit | NOT destructive — Cmd-Z reverses. No confirmation. |
| Bulk task complete | n/a (no bulk in v1) |

### Error states (Phase 3 new)

| Surface | Copy |
|---------|------|
| Constraint clamp (the snap-back tooltip itself IS the error surface — see "Constraint snap-back tooltip" above) | reads from `ConstraintResult.reasons[]` |
| Calendar fails to load (React.lazy import error) | Heading: `Calendar didn't load.` Body: `Refresh the page to try again. Your plan and gantt are still working — switch back to the Gantt tab to keep editing.` Inline button: `Switch to Gantt` (sets `?view=gantt`) |
| Custom-task save fails (Zod validation server-side at `addTask()`) | Toast (red variant): `Couldn't save task. {first Zod error message}.` |
| Recurring task occurrence completion fails (storage quota exceeded mid-write) | Toast (amber variant): `Couldn't save your check. Storage might be full — try exporting your plan from Settings.` |

---

## Component Inventory

Phase 3 NEW surfaces only. Phase 1 + Phase 2 components inherited unchanged unless explicitly extended.

### 1. `<DragLayer>` (NEW — `src/features/gantt/drag/DragLayer.tsx`)

**Purpose:** Wraps the existing `<GanttView>` SVG in a `<DndContext>` provider. Mounts the `<DragOverlay>` sibling that hosts `<GhostOverlay>` content during drag. No visual chrome of its own.

**State machine:**
- `idle` — no drag in progress; ghost layer hidden; tooltip hidden.
- `dragging` — `useDraggable` active; `useTransientSchedule` recomputes `generateSchedule(plan + transientEdit, catalog)` on rAF-throttled pointermove; ghost layer renders the transient `ScheduleEvent[]`.
- `clamped` — substate of `dragging`; `canMove(...).clamped === true`; tooltip surfaces in floating-with-cursor mode for ~400ms; bar visually stops at constraint boundary; `lastConstraintViolation` written to `uiStore` for the sticky-pill phase.
- `committing` (≤1 frame) — pointerup fires; commit `ScheduleEdit` to `planStore` (which goes through zundo `temporal` → one history entry); ghost layer collapses; tooltip transitions from floating → sticky pill if last frame was clamped.

**A11y (Phase 3 minimum, Phase 4 expands):**
- `<DndContext>` Phase 3 ships pointer-only — no `KeyboardSensor`. Phase 4 adds keyboard drag (per CONTEXT deferred + POL-08). Document this in code comments so Phase 4 a11y agent finds it.
- `<DragOverlay>` itself is `aria-hidden` — sighted users see it; SR users get the post-commit state via `aria-live` on the ConstraintTooltip when `clamped`.

### 2. `<GhostOverlay>` (NEW — `src/features/gantt/drag/GhostOverlay.tsx`)

**Purpose:** Renders the transient `ScheduleEvent[]` from `useTransientSchedule` as a separate `<g>` layered above the committed bars. Per CONTEXT D-20.

**Visual contract:**
- Each ghost bar uses the SAME geometry contract as committed bars (height 20px, `rx="3"`, lifecycle hex from `lifecyclePalette`).
- Fill: lifecycle hex at **opacity 0.55**.
- Border: 1.5px stroke, lifecycle hex at opacity 1.0.
- The bar being dragged itself does NOT render in the ghost layer (it lives in the `<DragOverlay>` portal at full opacity, following the cursor). Downstream cascade bars DO render in the ghost layer.
- Locked events appear in the ghost layer at the SAME position as the committed layer (because cascade does not move them per D-13) — this is the intentional visual signal that "this stays put."

### 3. `<LockToggle>` (NEW — `src/features/gantt/lock/LockToggle.tsx`)

**Purpose:** Per-event lock affordance. Per CONTEXT D-11, D-12.

**Anatomy (one per draggable event bar):**
```
┌────────────────────────────────────────────┐
│ [─── lifecycle bar fill (20px tall) ───]🔓│   ← icon at top-right corner
└────────────────────────────────────────────┘
   ↑ 24×24 invisible hit-target wraps icon
```

**States:**
- Unlocked + bar not hovered → icon hidden (`opacity-0`)
- Unlocked + bar hovered (or focused) → `LockOpen` icon visible at `text-stone-400`, `transition-opacity duration-150`
- Locked → `Lock` icon always visible at `text-stone-700` (the new `--color-lifecycle-locked` token); bar gets a 2px outline ring in the same `stone-700` (CSS: `stroke-stone-700 stroke-2`)

**Interaction:**
- Click on icon → toggle lock state
- Alt-click anywhere on the bar → toggle lock state (per D-11 power-user shortcut)
- Lock state lives on `Planting.locks` per event type (per D-13); persisted via `planStore`; tracked by zundo (Cmd-Z reverses)

**A11y:**
- Icon is wrapped in `<button type="button" aria-label="…">` (see Copywriting Contract). 24×24 hit target ensures Phase 4 mobile compliance.
- Focus ring: 2px green-700 with offset (Phase 1 standard).
- Radix Tooltip wraps the button with `delayDuration={200}` for hover hint.

### 4. `<ConstraintTooltip>` (NEW — `src/features/gantt/tooltip/ConstraintTooltip.tsx`)

**Purpose:** Surfaces clamp reasons during snap-back and as a sticky pill afterward. Per CONTEXT D-09, D-10.

**Modes (single component, two visual variants):**

**Mode A — floating-with-cursor (during snap-back, ~400ms):**
- Position: follows cursor with 12px offset (right + bottom). If cursor is within 80px of viewport right/bottom edge, flip to left/top.
- Animation: fades in at clamp moment (150ms ease-out), follows cursor for 400ms, then transitions to Mode B at the bar's location.

**Mode B — sticky inline pill (after Mode A, until next drag-start or 8s timeout):**
- Position: portaled to `document.body`, absolutely positioned above the constrained bar (or below if bar is in top 100px of viewport).
- Anchored to the bar's bounding rect — re-anchors on scroll (passive listener).
- Auto-dismiss at 8s (per CONTEXT D-09). Click anywhere outside the bar dismisses immediately.

**Visual contract (both modes):**
- Container: `bg-white rounded-md shadow-[0_8px_24px_rgb(0_0_0_/_0.12)] border border-stone-200`
- 3px left-edge border in the lifecycle palette hex of the constrained event type (per D-09)
- Padding: `px-md py-sm` (16px / 8px)
- Min width: `--spacing-tooltip-min-w` (240px); max width: `--spacing-tooltip-max-w` (320px)
- Header: 14px / 600 / uppercase tracking-wider, color stone-900 (event-type label)
- Body: 14px / 400, color stone-900 (reason text from `ConstraintResult.reasons[0]`)
- Date strings within body wrapped in `<strong>` (font-weight 600)

**A11y readiness (Phase 4 wires actual a11y plumbing):**
- Component is portaled (`createPortal` to document.body) — Phase 4 can add `aria-live="polite"` without restructuring (per CONTEXT D-10).
- Component accepts `onDismiss` prop — Phase 4 wires Esc keybinding to call it.
- Component accepts `tabIndex={-1}` ref — Phase 4 makes it focusable.
- Phase 3 ships visual polish; Phase 4 a11y agent adds plumbing without changing the visual contract.

### 5. Tab strip — `<PlanViewTabs>` (NEW — `src/app/PlanViewTabs.tsx`)

**Purpose:** Switches between Gantt and Calendar views inside `/plan`. Per CONTEXT D-27.

**Visual style:** **Underlined tabs** (Phase 1 pattern — matches header nav active state for consistency). Reasons:
- Matches the existing AppShell nav-link pattern (active = green-700 underline, offset-4, decoration-2) so the pattern is reused, not re-invented.
- Pill toggles read as "settings switch" rather than "view switch" — wrong semantic.
- Segmented controls are heavier visual chrome and don't match Phase 1+2 aesthetic.

**Anatomy:**
```
┌──────────────────────────────────────────────────────────┐
│  [📊 Gantt]   [📅 Calendar]                              │  ← height 44px
│   ─────────                                              │  ← 2px green-700 underline on active
└──────────────────────────────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Container | `flex items-center gap-lg border-b border-stone-200 px-md` height = `--spacing-tab-strip-h` (44px) |
| Tab button | `<button type="button">` with leading icon (16px) + label (Label 14/500) + 4px gap |
| Active tab | `text-stone-900` + `border-b-2 border-green-700` (extends below container border to overlap) |
| Inactive tab | `text-stone-600` hover `text-stone-900` |
| Focus ring | 2px green-700, offset-2 (Phase 1 standard) |
| URL state | `useSearchParams('view')`; `view=gantt` (default) or `view=calendar` |

**Position:** sits inside `/plan` route, above the chart area (Gantt or Calendar), below the AppShell header.

### 6. `<CalendarView>` (NEW — `src/features/calendar/CalendarView.tsx`)

**Purpose:** FullCalendar 6.1 wrapper. Per CONTEXT D-22..D-26.

**Lazy-loaded:** `const CalendarView = React.lazy(() => import('./CalendarView'))` — wrapped in `<Suspense fallback={<CalendarLoadingSkeleton />}>`. Skeleton: a stone-100 grid placeholder at calendar dimensions (no shimmer animation — Phase 4 polish).

**FullCalendar configuration:**

| Prop | Value | Source |
|------|-------|--------|
| `plugins` | `[dayGridPlugin, timeGridPlugin, interactionPlugin]` | D-22 |
| `initialView` | `'dayGridMonth'` | D-23 |
| `headerToolbar` | `{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }` | D-23 |
| `buttonText` | `{ today: 'Today', month: 'Month', week: 'Week' }` | Copywriting contract above |
| `dayMaxEvents` | `3` | D-26 |
| `events` | `selectEventsForCalendar(scheduleEvents, tasks)` | D-24 |
| `dateClick` | opens day-detail drawer; writes `?date=YYYY-MM-DD` to URL | D-29 |
| `eventClick` | opens day-detail drawer focused on clicked event's day | D-29 |
| `eventContent` | custom render: lifecycle-palette hex bg + 1px left-border-2 in same hex; event title (plant name + event-type abbreviation) | D-24 |
| `editable` | `false` | D-25 (read-only) |
| `selectable` | `false` | D-25 |
| `nowIndicator` | `true` | matches gantt "Today" indicator |
| `firstDay` | `0` (Sunday) | US gardener convention |

**Theme integration:** pass Tailwind tokens via inline CSS variables on the FullCalendar root container (`--fc-border-color: var(--color-stone-200)`, `--fc-button-bg-color: white`, etc.). Custom CSS file `src/features/calendar/fullcalendar.css` imported by `CalendarView` for the few selectors FullCalendar can't theme via CSS vars (event chip border-radius, today highlight color = green-700 at 8% opacity).

### 7. `<DayDetailDrawer>` (NEW — `src/features/calendar/DayDetailDrawer.tsx`)

**Purpose:** Side drawer (right-side sheet) showing all events + tasks for the selected day. Per CONTEXT D-29, D-30, D-31.

**Built on:** `@radix-ui/react-dialog` with custom positioning to mount as a right-side sheet (NOT a centered modal). Phase 4 swaps to bottom-sheet on mobile via Tailwind breakpoint (per D-31).

**Anatomy:**
```
┌─────────────────────────────────────┐
│ ← Friday, May 15, 2026          [✕]│  ← header (h: 60px, border-b stone-200)
│   3 events · 2 tasks                │  ← subhead (Label 14, stone-600)
├─────────────────────────────────────┤
│ TOMATO — CHEROKEE PURPLE            │  ← group heading (Label 14/600 uppercase)
│ │■ Indoor seeding                   │  ← event row, lifecycle accent
│ │■ Water seedlings           [☐]    │  ← task row with checkbox
├─────────────────────────────────────┤
│ LETTUCE                             │
│ │■ Direct sow                       │
└─────────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Width | `--spacing-drawer-w` (400px) on ≥768px; full-width bottom sheet on mobile (Phase 4 wires the breakpoint swap) |
| Position | Right-side sheet, slides in from right (200ms ease-out per CONTEXT discretion default) |
| Background | `bg-white` |
| Border | `border-l border-stone-200` |
| Shadow | `shadow-[-8px_0_24px_rgb(0_0_0_/_0.08)]` |
| Scrim | `bg-stone-900/40 backdrop-blur-sm` (matches Phase 2 modal scrim) |
| Header height | 60px |
| Header padding | `px-lg py-md` |
| Body padding | `px-lg py-md`, scrollable (`overflow-y-auto`) |
| Group heading | Label 14/600 uppercase tracking-wider, color stone-900, `mt-md mb-sm` between groups |
| Event row | 1px left-edge border in lifecycle hex, `pl-sm py-sm` |
| Task row | Same as event row + checkbox on right (Radix `<Checkbox>` from `src/ui/`) |
| Close affordances | X button (top-right, 16px lucide `X`); outside-click; Esc key |
| URL state | `?date=YYYY-MM-DD` written on open; cleared on close (preserves `?view=calendar`) |

**A11y:**
- Radix Dialog handles focus trap, Esc, scrim click automatically.
- `aria-labelledby` points to the date heading.
- First focusable element is the X button (so Tab cycles through visible content).

### 8. Tasks dashboard — `<TasksDashboard>` (NEW — `src/features/tasks/TasksDashboard.tsx`)

**Purpose:** The `/tasks` route content. Today / This Week / Overdue with group-by toggle. Per CONTEXT D-32..D-37.

**Anatomy:**
```
┌──────────────────────────────────────────────────────┐
│ Tasks                                                │  ← Display 28/600
│ Today's work, this week, and what's overdue.         │  ← Body 16/400 stone-600
│                                                       │
│                  [Group by plant ▾]   [+ New task]   │  ← controls row
├──────────────────────────────────────────────────────┤
│ Today (5)                                            │  ← Heading 20/600
│   TOMATO — CHEROKEE PURPLE                           │  ← Group header (Label 14/600 uppercase)
│   ☐ Water seedlings                       Today      │
│   ☐ Check on harden-off                Overdue · 2d ⚠│
│                                                       │
│ This Week (12)                                       │
│   ...                                                │
│                                                       │
│ Overdue (1)                                          │  (hidden if 0)
│   ...                                                │
└──────────────────────────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Container | `max-w-4xl mx-auto px-md md:px-lg py-xl` |
| Page heading | Display 28/600, `mb-sm` |
| Page subhead | Body 16/400 stone-600, `mb-xl` |
| Controls row | flex justify-between, `mb-xl` |
| Group-by toggle | `<Button>` ghost variant from `src/ui/` (Phase 2), with `ChevronDown` icon |
| + New task | `<Button>` primary variant, `Plus` icon + label |
| Section | `mb-2xl` between sections, but using `--spacing-task-section-gap` (32px) |
| Section heading | Heading 20/600, `mb-md` |
| Group header | Label 14/600 uppercase tracking-wider stone-700, `mt-md mb-sm` |
| Task row | flex items-center, height `--spacing-task-row-h` (56px), border-b stone-100 (very subtle separator) |
| Task row content | checkbox (left, 16px) → plant icon (16px lifecycle hex chip) → title (Body) + group-by-secondary (Label stone-600) → due-date pill (right) |
| Empty state | center-aligned in section, `py-2xl`, see Copywriting Contract |

### 9. `<TaskRow>` (NEW — `src/features/tasks/TaskRow.tsx`)

**Purpose:** Single task row in the dashboard or day-detail drawer. Per CONTEXT D-34, D-36.

**Anatomy:**
```
┌─────────────────────────────────────────────────────────┐
│ [☐] [■] Water tomato seedlings              Today      │
│         Watering · Every 3 days                         │
└─────────────────────────────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Checkbox | Radix `<Checkbox>` from `src/ui/`, 16px, with green-700 fill when checked |
| Plant accent chip | 12px square (`rounded-sm`) in the lifecycle hex of the task's source event type (auto-tasks) or `stone-400` (custom free-floating) |
| Title | Body 16/400; `text-stone-500 line-through` when complete |
| Secondary line | Label 14/400 stone-600; shows category when grouped by plant, or plant name when grouped by category; recurring tasks append the cadence (`· Every 3 days`) |
| Due-date pill | Today: Label 14/500 stone-900. This Week: Label 14/400 stone-600 (`Wed, May 6`). Overdue: Label 14/500 red-700 with `AlertCircle` icon (16px). |
| Hover | `bg-stone-50` row hover affordance |
| Click on title | (Phase 4 — opens custom-task modal in edit mode for custom tasks; opens planting detail for auto-tasks) — Phase 3 ships hover affordance only, no click handler beyond the checkbox |

**Recurring-task rendering (per D-36):**
- Each occurrence renders as a separate row.
- `taskEmitter` projects recurring task into per-day occurrences.
- Checkbox state keyed by `${taskId}:${ISODate}` composite key.
- Visually identical to one-off tasks; the cadence in the secondary line is the only signal.

### 10. `<CustomTaskModal>` (NEW — `src/features/tasks/CustomTaskModal.tsx`)

**Purpose:** Authoring + editing custom tasks. Per CONTEXT D-35.

**Built on:** `@radix-ui/react-dialog` (same primitive as Phase 2 modals).

**Width:** `--spacing-modal-max-w` (640px) — inherited from Phase 2.

**Form layout (top to bottom):**
1. Title input — `<Input>` from `src/ui/`, label "What needs doing?", required
2. Attached planting `<Select>` — dropdown of current plantings with "None — free-floating" first option
3. Category `<Select>` — values from `TaskCategory` enum; default `custom` for free-floating, smart-default to `water`/`fertilize`/etc when planting is selected
4. Recurrence radio group: `One time` / `Daily` / `Weekly` / `Every N days`
5. (Conditional on "Every N days") interval `<Input type="number">` with `days` suffix
6. (Conditional on one-time) due date `<Input type="date">`
7. (Conditional on recurring) end date `<Input type="date">`, optional, label "Stop repeating after (optional)"

**Footer:**
- Left side: `Delete task` button (destructive variant) — only visible in edit mode; opens inline confirmation INSIDE the modal (replaces footer with `Cancel` / `Delete task` confirmation)
- Right side: `Cancel` (ghost) + `Add task` (primary, new mode) / `Save changes` (primary, edit mode)

**Validation:** inline error text below each field (Label 14/400 red-700). See Copywriting Contract for error messages.

**A11y:** Radix Dialog focus trap; first focusable = title input; Esc closes (with confirm if dirty — Phase 4 polish, Phase 3 ships immediate close with no confirm).

### 11. Header undo/redo affordance (Phase 3 extension to AppShell)

**Where:** AppShell header, right side of nav links (before any future user-menu), only visible on `/plan` and `/tasks` routes (not `/setup` or `/settings` where undo doesn't semantically apply).

**Anatomy:**
```
[↶ Undo]  [↷ Redo]
```

| Element | Spec |
|---------|------|
| Container | flex gap-xs, `mr-md` |
| Button | `<button>` ghost, 36×36 (icon-only), `Undo2` / `Redo2` lucide icons (16px) |
| Disabled state | `text-stone-400 cursor-not-allowed` when respective stack is empty |
| Tooltip on hover | Radix tooltip 200ms delay: `Undo (⌘Z)` / `Redo (⌘⇧Z)` (use `⌃` on non-Mac) |
| Aria-label | `Undo last change` / `Redo last change` |

**Why visible buttons in addition to keyboard:** discoverability. The keyboard shortcut is the power-user path; the visible buttons make undo discoverable for the first-time user who doesn't know Cmd-Z works here.

---

## Layout — Phase 3 Additions to Existing Routes

### `/plan` route (modified — was Phase 2 gantt-only)

```
┌────────────────────────────────────────────────────────────────┐
│ [iOS Private Mode banner — only when storage unavailable]      │
├────────────────────────────────────────────────────────────────┤
│ Garden Gantt    [Setup][Plan][Tasks][Settings]  [↶][↷] [pill]  │  ← header + undo/redo
├────────────────────────────────────────────────────────────────┤
│ [📊 Gantt]   [📅 Calendar]                                     │  ← NEW tab strip (44px)
│ ─────────                                                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   {GanttView with drag layer + lock toggles + ghost overlay}   │
│   OR                                                            │
│   {CalendarView (lazy-loaded) with day-click → drawer}         │
│                                                                 │
└────────────────────────────────────────────────────────────────┘

  Plus, when constraint clamp fires:
  ┌────────────────────────┐
  │█TRANSPLANT BLOCKED     │  ← floating tooltip → sticky pill
  │ Tender plant: clamped  │
  │ to **May 15, 2026**.   │
  └────────────────────────┘

  Plus, when calendar day is clicked:
                        ┌────────────────────┐  ← drawer slides in from right
                        │ Friday, May 15     │
                        │ 3 events · 2 tasks │
                        │  ...               │
                        └────────────────────┘
```

### `/tasks` route (replaced — was Phase 2 placeholder)

```
┌────────────────────────────────────────────────────────────────┐
│ [Header — undo/redo visible]                                    │
├────────────────────────────────────────────────────────────────┤
│   Tasks                                                         │
│   Today's work, this week, and what's overdue.                  │
│                                                                 │
│              [Group by plant ▾]            [+ New task]         │
│                                                                 │
│   Today (5)                                                     │
│     {TaskGroup × N}                                             │
│                                                                 │
│   This Week (12)                                                │
│     {TaskGroup × N}                                             │
│                                                                 │
│   Overdue (1)        ← hidden when 0                            │
│     {TaskGroup × N}                                             │
└────────────────────────────────────────────────────────────────┘
```

### Responsive behavior (Phase 3 baseline; Phase 4 mobile audit)

- Tab strip: Phase 3 ships desktop-ready; Phase 4 may stack the icons or convert to segmented control on mobile.
- Day-detail drawer: Phase 3 ships side-drawer at all viewports; Phase 4 swaps to bottom-sheet under 640px.
- Tasks dashboard: Phase 3 ships single-column at all viewports (already works on mobile).
- Drag interactions: Phase 3 ships pointer-only (touch works because PointerSensor handles touch events). Phase 4 audits mobile drag ergonomics.

---

## Gantt Visual Treatment — Phase 3 Additions

Phase 1 gantt visual contract (row geometry, lifecycle palette, today indicator, axis) inherited unchanged. Phase 3 ADDS:

| Layer | Spec |
|-------|------|
| **Drag-handle affordance** | Each draggable bar (per CONTEXT D-04: indoor-start, transplant, direct-sow whole-bar; D-05: harvest-window right-edge) gets `cursor: grab` on hover, `cursor: grabbing` during drag. Non-draggable bars (per D-06: harden-off, germination-window, auto-task events) get `cursor: default` and `pointer-events: none` on the drag-handle layer (still receive `<title>` hover). |
| **Right-edge resize handle** | Harvest-window bars only. 6px wide invisible hit-target on the right edge with `cursor: ew-resize`. No visual chrome (Phase 4 may add a subtle drag dots indicator). |
| **Lock outline ring** | Locked events get a 2px stroke in the new `--color-lifecycle-locked` (stone-700) token. Stroke is OUTSIDE the rect (`stroke-width: 2; stroke: var(--color-lifecycle-locked); fill: {lifecycle hex}`). The 2px ring sits above neighbor bars in the row (z-order via SVG document order). |
| **Lock icon** | 16×16 lucide `Lock` (locked) or `LockOpen` (hover-revealed unlocked) at top-right corner of the bar (-8px from top, -2px inside right edge). Wrapped in 24×24 invisible `<rect>` hit-target. |
| **Ghost overlay layer** | Separate `<g class="ghost-layer">` rendered AFTER the committed bars (so it draws on top). Each ghost bar at 0.55 opacity fill + 1.5px border at full opacity in lifecycle hex. Hidden (`display: none`) when not dragging. |
| **Cascade affected indicator** | During drag, downstream bars whose dates change get a subtle pulse: `animation: ghost-pulse 1.5s ease-in-out infinite` on the ghost-layer rect (opacity oscillates 0.45 ↔ 0.65). One-time CSS keyframe in `index.css`. |
| **Snap-to-day visual** | The dragged bar visually snaps to the nearest day boundary (per D-07). At zoom levels where days are <6px wide, the time axis enforces a 6px/day floor (`--spacing-bar-min-drag-px`) and the gantt becomes horizontally scrollable. |

**Z-order in the gantt SVG:**
1. Plot background (white)
2. Weekly grid lines + month ticks
3. Today indicator (green-700 vertical line)
4. Committed event bars (ordered by row)
5. Lock outline rings (on top of bar fill, same row)
6. Ghost overlay layer (on top of all committed bars during drag)
7. Lock icons (top-most, ALWAYS visible above ghost)
8. The actively-dragged bar (in `<DragOverlay>` portal — outside the SVG, follows cursor)

---

## Accessibility Baselines — Phase 3 minimums; Phase 4 audit

| Concern | Phase 3 Spec |
|---------|--------------|
| Color contrast | All NEW combinations verified ≥4.5:1 for text, ≥3:1 for graphics (see "WCAG AA verification" section under Color above) |
| Focus rings | Phase 1 standard inherited: 2px green-700, 2px offset on all keyboard-focusable elements |
| Keyboard navigation | Tab order: header → undo → redo → nav links → tab strip → gantt/calendar surface → drawer (when open). Esc dismisses drawer + tooltip + modal. **Drag is pointer-only in Phase 3** — Phase 4 adds keyboard-driven drag (POL-08). |
| Tooltip a11y readiness | ConstraintTooltip is portaled, accepts `onDismiss` and `tabIndex` props, is rendered with `role="status"` from day 1. Phase 4 wires `aria-live="polite"`, Esc keybinding, focus trap. |
| Lock toggle a11y | `<button>` with explicit `aria-label`. 24×24 hit target meets WCAG 2.5.5 readiness for Phase 4 mobile. |
| Calendar a11y | FullCalendar 6.1 ships its own a11y baseline (keyboard navigation between cells, screen-reader event announcements). Phase 3 trusts FullCalendar's defaults; Phase 4 audits per WCAG AA. |
| Drawer a11y | Radix Dialog handles focus trap, Esc, scrim click, `aria-modal="true"` automatically. |
| Tasks dashboard a11y | Each section is `<section aria-labelledby="…">`. Group-by toggle is `<button aria-pressed="…">`. Checkboxes use Radix `<Checkbox>` (correct ARIA out of box). |
| Color-only meaning | Lock state has icon + outline ring (not color-only). Overdue task has icon + text (`Overdue · N days`) + color (not color-only). Ghost overlay is decorative reinforcement of cascade preview, not load-bearing for meaning (the post-commit state IS the meaning). |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none added in Phase 3 (continuing Phase 2's copy-paste-only pattern; Radix primitives in `src/ui/` cover all needs) | not required |
| Third-party registries | none declared | not required |

**Phase 3 third-party libraries are runtime dependencies, NOT shadcn registry blocks** (`@dnd-kit/core`, `zundo`, `@fullcalendar/*`, `@radix-ui/react-tooltip`, `@radix-ui/react-popover`). They are NOT subject to the registry safety gate (which applies only to copy-paste blocks from third-party shadcn registries). They ARE subject to ordinary npm dependency review per the project's normal `npm install` discipline.

---

## State & URL Contracts

Phase 3 introduces several pieces of state that must follow the established conventions:

| State | Lives in | Persisted? | Tracked by undo? |
|-------|----------|-----------|------------------|
| `Planting.locks?: Partial<Record<EventType, boolean>>` | `planStore` | YES (v2→v3 migration) | YES |
| `completedTaskIds` semantic extension (`${taskId}:${ISODate}`) | `planStore` | YES (v2→v3 migration is no-op for current users) | YES |
| Custom tasks (`Task[]` with `TaskRecurrence`) | `planStore` | YES | YES |
| Transient drag state (`transientEdit`, `dragPreviewEvents`, `lastConstraintViolation`) | NEW `dragStore` (per CONTEXT integration points) | NO | NO |
| `taskGroupBy: 'plant' \| 'category'` | `uiStore` | NO (memory only, resets on refresh) | NO |
| Tab view (`gantt` / `calendar`) | URL `?view=` searchParam | YES (URL is the source) | NO (URL not in undo) |
| Day-detail drawer date | URL `?date=YYYY-MM-DD` searchParam | YES (URL is the source) | NO |
| `altClickTipDismissed` (3-time tip counter) | `uiStore` | NO (Phase 4 may persist if needed) | NO |

---

## Decisions & Rationale

Recorded so downstream agents understand the "why" without re-litigating.

| Decision | Rationale |
|----------|-----------|
| Stone-700 for the lock-outline token (NOT a new green or red) | Green is reserved (accent CTA + transplant fill — would collide); red is destructive (locking is not destructive); stone-700 reads as "fixed / metallic" semantically and meets ≥3:1 contrast against ALL six lifecycle fills (worst case: lime-400 = 3.4:1) |
| Ghost overlay opacity = 55% (not 60% nor 50%) | 55% passes the eye test against the 6 lifecycle hues uniformly: 60% loses preview affordance against the lighter hues (lime, yellow); 50% loses color signal against darker hues (orange, blue) at 20px bar height. 55% is a tested midpoint. |
| Ghost border at 1.5px (not 1px or 2px) | Committed bars use 1px borders. 2px borders would compete visually with locked-bar's 2px outline ring. 1.5px is the tested midpoint that signals "different layer" without overpowering the lock affordance. |
| Underlined tabs (not segmented control or pills) | Reuses the existing AppShell nav-link active pattern (green-700 underline, offset-4, decoration-2). Keeps "active state" pattern singular across the app — pill/segmented would introduce a second pattern for the same semantic. |
| Tooltip 8s auto-dismiss (default from CONTEXT D-09 retained) | Average reason text is ~80 chars (`"Tender plant: clamped transplant to last frost (May 15, 2026)."` = 64 chars). 8s gives slow readers ~10 chars/s — generous but not annoying. Tunable per discretion if user testing surfaces a different number. |
| Drawer 400px width (default from CONTEXT discretion range 300–400px) | Matches existing `--spacing-panel-w` (Phase 2 "My Plan" panel) — single drawer-width constant across the app. |
| Drawer 200ms ease-out animation (default from CONTEXT discretion 200–250ms) | 200ms is the share-worthy snappy default; 250ms feels slow on desktop. Phase 4 mobile may bump to 250ms to feel less abrupt on touch. |
| No bulk task selection (per CONTEXT D-34) | Explicit deferral — per-row checkboxes only. <50 tasks/wk doesn't justify the desktop/touch parity work. |
| Visible undo/redo header buttons IN ADDITION to keyboard | Discoverability. Cmd-Z is the power-user path; the visible buttons make undo findable for the first-time user. |
| ConstraintTooltip uses `role="status"` from day 1 (NOT `role="alert"`) | "alert" interrupts screen-reader flow; the snap-back is informational, not blocking. Phase 4 a11y agent adds `aria-live="polite"` to the same `role="status"` container. |
| Custom-task delete uses inline confirm INSIDE the modal (NOT a separate Dialog) | Keeps focus + context in one place. A second nested Dialog adds modal-on-modal friction without safety benefit (Cmd-Z reverses the delete anyway). |
| Lock outline OUTSIDE the rect (stroke not bg) | A bg-color outline would change the bar's color signal (locked tomato no longer reads as "transplant green"). A stroke preserves the fill color and adds a metal-ring outline — both signals coexist. |
| 24×24 invisible hit-target wrapping 16×16 lock icon | Phase 4 readiness. WCAG 2.5.5 target size is 24×24 minimum; building the wrapper now (per CONTEXT D-11) means Phase 4 mobile audit doesn't restructure the SVG. |

---

## Pre-Populated From

| Source | Decisions Used |
|--------|---------------|
| CONTEXT.md (D-01..D-21 drag), (D-22..D-28 calendar), (D-29..D-31 drawer), (D-32..D-37 tasks) | All locked — translated into visual + interaction contracts above |
| CONTEXT.md (Claude's Discretion) | Ghost opacity 55%, tab style underlined, drawer width 400px / 200ms, tooltip auto-dismiss 8s, lock-outline color stone-700, FullCalendar theme via CSS vars + small CSS file |
| CONTEXT.md (specifics) | Tooltip body reads from `ConstraintResult.reasons[]`; recurring-task key format `${taskId}:${ISODate}`; Phase 4 readiness audit (24×24 hit target, portaled tooltip, URL state for mobile-default) |
| CONTEXT.md (deferred) | Out-of-scope items not specified in this UI-SPEC: keyboard drag, mobile-default-to-calendar, bulk multi-select, completion stats, frost uncertainty band, calendar drag |
| `01-UI-SPEC.md` | Lifecycle palette (locked Phase 1), 4-role typography, 60/30/10 stone+green color contract, system font stack, focus ring spec |
| `02-UI-SPEC.md` | Copy-paste shadcn primitives in `src/ui/`, modal pattern (Radix Dialog at 640px max-w), `--spacing-panel-w` (400px reused for drawer), Phase 2 frost-tolerance badge typography pattern, error/empty-state copy voice |
| `03-RESEARCH.md` | Stack: @dnd-kit/core, zundo, FullCalendar 6.1 plugin set, Radix tooltip + popover for new primitives |
| `src/index.css` | Existing `@theme` token format + naming convention (`--color-…`, `--spacing-…`); existing `--spacing-panel-w`, `--spacing-modal-max-w` reused; new tokens added in same `@theme` block |
| `src/ui/` (existing primitives) | Button, Input, Label, Select, Dialog, DropdownMenu, Switch, Card, Badge, Toast — all reused; Phase 3 adds NO new primitive components, only feature components consuming existing primitives |
| User input | none — `--auto` mode; defaults documented and rationale captured |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
