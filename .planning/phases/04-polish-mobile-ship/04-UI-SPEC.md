---
phase: 4
slug: polish-mobile-ship
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-27
---

# Phase 4 — UI Design Contract

> Visual and interaction contract for the **Polish, Mobile & Ship** phase. Phase 4 inherits the locked design system from Phase 1 (palette, type scale, spacing tokens, lifecycle gantt palette) and the additional `@theme` tokens shipped in Phases 2–3 (drawer, tooltip, lock UI). Phase 4 ADDS only what its scope requires: a 640px mobile breakpoint, a tap-to-edit modal, hand-rolled coach marks, three new banner variants, a pulse-skeleton primitive, an export-reminder banner, keyboard-drag affordances, and WCAG AA token tweaks. **Inherited primitives MUST NOT be re-specified.**

---

## Design System

| Property | Value |
|----------|-------|
| Tool | tailwind-v4 (no shadcn — manual; locked by Phase 1 — see `01-UI-SPEC.md`) |
| Preset | not applicable (no `components.json`) |
| Component library | hand-rolled primitives in `src/ui/` (Radix-based: Dialog, Toast, DropdownMenu, Switch, Select) — Phase 2 inventory locked, Phase 3 added ConstraintTooltip / DayDetailDrawer / LockToggle / EmptyGanttState |
| Icon library | `lucide-react@1.11.0` — used for X (banner dismiss), Lock/Unlock (lock toggle), Undo/Redo, Calendar/List (view tabs), Trash2 (destructive), AlertCircle (errors), Loader2 (spinners) |
| Font | System UI stack (locked Phase 1): `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`. No webfont in v1. |

**Inheritance:** Every token, color, type role, banner pattern, lifecycle palette hex, focus-ring style, and SVG visual treatment from Phase 1's `01-UI-SPEC.md` (and additions in `02-UI-SPEC.md` / `03-UI-SPEC.md`) is **load-bearing for Phase 4**. This document records ONLY Phase 4 deltas; the checker validates against the cumulative contract.

---

## Spacing Scale

Inherited from Phase 1 — unchanged. All Tailwind v4 defaults (multiples of 4): `4 / 8 / 16 / 24 / 32 / 48 / 64`.

### New Phase 4 `@theme` tokens (add to `src/index.css`)

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-touch-target-min` | `44px` | iOS HIG / WCAG 2.5.5 minimum tap target on phone — applies to mobile bar tap-handle, EditPlantingModal action buttons, Banner dismiss on phones |
| `--spacing-sticky-plant-col` | `112px` | Sticky plant-name column width at <640px (D-04). Tuned mid-range of 96–120px planner-discretion band; QA checkpoint allows ±16px adjustment. |
| `--spacing-coach-mark-callout` | `280px` | Max-width of a coach-mark callout bubble (4 marks: catalog button, drag affordance, lock toggle, calendar tab) |
| `--spacing-coach-mark-arrow` | `8px` | Triangle arrow size pointing from callout to target |
| `--spacing-banner-h` | `48px` | Single banner row height (storage-full / iOS Private / export-reminder all conform) — keeps stack predictable when multiple are eligible |
| `--spacing-skeleton-radius` | `4px` | Border radius of every `<Skeleton>` shape (matches `rx="3"` gantt-bar style + `rounded-md` button family) |
| `--spacing-keyboard-drag-step-px` | computed from `timeScale.pxPerDay` | Keyboard arrow-key delta = 1 day; Shift+arrow = 7 days. Lives in `useKeyboardBarDrag.ts`, not CSS — declared here for documentation. |

**Exceptions:**
- The 44px touch target IS the documented exception to the strict 4-px-multiple rule for icon-only mobile actions (44 ≠ multiple of 8 but IS multiple of 4 — passes baseline). Justified by iOS HIG / WCAG 2.5.5.
- Coach-mark callout positioning uses `position: absolute` pixel offsets computed from target `getBoundingClientRect()` — runtime values, not Tailwind utility classes.

---

## Typography

Inherited from Phase 1 — unchanged. 4 roles (Body 16/400/1.5, Label 14/500/1.4, Heading 20/600/1.3, Display 28/600/1.2).

### Phase 4 typography surfaces (no new sizes/weights)

| Surface | Role | Notes |
|---------|------|-------|
| Coach-mark callout heading | Label (14/500) | One short imperative ("Drag a bar to adjust dates") |
| Coach-mark callout body | Body (16/400) — capped at 2 lines | Optional clarification only when imperative is ambiguous |
| Coach-mark "Got it" button | Label (14/500) | Primary CTA color (green-700) |
| EditPlantingModal heading | Heading (20/600) | "Edit {plant.name}" |
| EditPlantingModal body | Body (16/400) | Date pickers + cascade-summary text ("Moves harvest to Aug 12") |
| Empty-state copy (D-11) | Body (16/400) for sentence; Label (14/500) for CTA button label | One sentence + one button — no themed/cute language |
| Error inline helper text (D-10) | Label (14/500) — color destructive (red-700) | "Couldn't fetch — try again" pattern |
| Banner heading (storage-full / export-reminder) | Label (14/500) | Single line; truncates with ellipsis if >1 line |
| Banner body (storage-full / export-reminder) | Body (16/400) | Constrained to single sentence per banner-h budget |
| Skeleton placeholder | n/a — visual only | No text inside skeletons |
| Toast title | Label (14/500) | "Deleted Cherokee Purple" |
| Toast action button | Label (14/500) — color accent (green-700) | "Undo" |

---

## Color

Inherited from Phase 1 — palette unchanged. 60% stone-50 dominant / 30% white secondary / 10% green-700 accent / red-700 destructive / amber for advisory banners. Lifecycle gantt palette (6 hexes) locked Phase 1.

### Phase 4 WCAG AA audit deltas

POL-09 mandates a token-tweak pass. The following pairs are pre-validated; the audit (planner picks `@axe-core/cli` or `axe-core` + Lighthouse) MUST confirm 4.5:1 for body / 3:1 for large text or surface a counter-token.

| Pair | Required ratio | Validated value | Notes |
|------|---------------|-----------------|-------|
| `stone-900` text on `stone-50` bg | 4.5:1 (body) | 17.5:1 ✓ | Inherited Phase 1 default |
| `stone-600` text on `stone-50` bg | 4.5:1 (body) | 6.4:1 ✓ | Axis labels, secondary copy |
| `green-700` accent on `white` bg | 4.5:1 (body) | 6.0:1 ✓ | CTA button labels, active nav, link text |
| `green-700` accent on `stone-50` bg | 4.5:1 (body) | 5.7:1 ✓ | CTA labels in route content |
| `red-700` destructive on `white` bg | 4.5:1 (body) | 6.5:1 ✓ | Destructive button labels, error helper text |
| `amber-800` text on `amber-100` bg | 4.5:1 (body) | 7.6:1 ✓ | iOS Private + storage-full banner |
| `--color-lifecycle-locked` (`#44403C` stone-700) ring on each of 6 lifecycle fills | 3:1 (non-text) | 4.0–6.5:1 ✓ | Phase 3 D-12 carryover — re-verified across blue/yellow/green/teal/lime/orange in audit |
| Focus ring `green-700` 2px / 2px offset on white | 3:1 (non-text) | 6.0:1 ✓ | All keyboard-focusable elements |
| Coach-mark callout `stone-900` on `white` bg | 4.5:1 (body) | 17.5:1 ✓ | New surface |
| Skeleton pulse `stone-200`→`stone-300` on `white` bg | n/a (decorative) | — | Animated, not load-bearing |

**Accent reserved for** (no expansion in Phase 4): primary CTA buttons, active nav-link underline, focus ring, Toast undo action label, coach-mark "Got it" button. **Never** on gantt bars (lifecycle palette owns those), **never** on body text, **never** on banners (amber pattern owns those), **never** on the export-reminder banner (uses a calmer slate to avoid feeling alarmist).

### New Phase 4 banner color contract

| Banner | bg / text | When |
|--------|-----------|------|
| iOS Private (existing — Phase 1) | `amber-100` / `amber-800` | `isStorageAvailable() === false` at boot |
| Storage-full (NEW — D-10) | `amber-100` / `amber-800` (REUSE iOS pattern) | mid-session quota-exceeded catch (try/catch around setItem in `data/storage.ts`) |
| Export-reminder (NEW — D-13) | `stone-100` bg / `stone-900` text / `green-700` primary CTA | dirty-edit threshold met per D-12; intentionally calmer than amber to avoid alarm |

Banner stack rule: **only ONE banner visible at a time**. Priority (highest first): storage-full > iOS Private > export-reminder. Implemented as priority-sort + render-top-only in `AppShell.tsx`.

---

## Copywriting Contract

Phase 4 ships the largest copy surface so far. Every string load-bearing for POL-02..06 + POL-10 is declared here. Tone: **action-first, terse, no themed language** (D-11 locked). Sentence case for headings (no Title Case), no exclamation points, no emoji.

### Empty states (POL-03, D-11)

| Surface | Heading | Body / CTA |
|---------|---------|------------|
| Empty plan (gantt + calendar with `plantings.length === 0`) | `No plants yet.` | CTA button: `Add your first plant →` (links to `#/setup` if no location set, else opens MyPlanPanel/CatalogBrowser) |
| Empty tasks dashboard (no auto-tasks + no custom tasks) | `No tasks today.` | No CTA — auto-tasks appear when plantings exist; manual prompt would be misleading |
| Empty day-detail drawer (clicked day with 0 events + 0 tasks) | `Nothing scheduled.` | No CTA — ambient state, drawer just shows headline |
| Empty catalog filter result (search/filter returns 0) | `No matches.` | CTA button: `Clear filters` (resets uiStore.filterChips + searchQuery) |
| Empty overdue/this-week/today section (within Tasks dashboard, with non-empty other sections) | (no per-section heading change — section just renders 0 rows under existing label) | n/a — section header itself ("Overdue", "Today", "This Week") tells the story; an inline `—` placeholder OR no rows is acceptable. Planner picks. |

### Error states (POL-04, D-10)

| Surface | Where it renders | Copy |
|---------|------------------|------|
| Bad ZIP | Inline red helper text directly under `ZipInput` (Input error variant) | `Couldn't find that ZIP. Try a 5-digit US ZIP, or enter your zone manually below.` |
| Permapeople fetch fail | Inline pill on the enrichment row (replaces "Enrich" button text temporarily) | `Couldn't fetch — try again` (button itself remains clickable for retry) |
| Corrupt JSON import | Inline error in `ImportPreviewModal` body, above the Cancel/Confirm row | `This file doesn't match the current plan format. Your current plan is unchanged.` |
| Storage full (mid-session) | Sticky top banner reusing iOS Private pattern (amber) | Heading: `Storage full.` Body: `Export your plan to free space. New changes won't be saved until you do.` Action: `[Export plan]` button inline |
| Generic uncaught render error | Existing top-level `ErrorBoundary` (Phase 1) — Phase 4 retunes copy only | Heading: `Something went wrong.` Body: `Refresh to try again. If it keeps happening, export your plan from Settings as a backup.` |

### Loading states (POL-05, D-08)

| Surface | Treatment | Copy |
|---------|-----------|------|
| Catalog grid (initial load + filter recompute >100ms) | `<Skeleton variant="card">` × N (matches existing PlantCard layout: image 96×96, 2 text lines) — uses `animate-pulse` on `bg-stone-200` | No copy — visual placeholder only |
| ZIP-derive result row (after ZIP entered, while `lookupLocation()` resolves) | `<Skeleton variant="line" w="full" h="20px">` inline replacing the result row | No copy — just the pulsing line |
| Permapeople enrichment fetch (per-plant) | `<Loader2 className="animate-spin">` icon replaces the enrichment-button leading icon; button label changes to `Enriching…` | Button label: `Enriching…` |
| Lazy-loaded CalendarView chunk (Phase 3 D-27) | Existing fallback (a centered text "Loading calendar…") — Phase 4 retunes to a single `<Skeleton variant="rect" h="60vh">` matching FullCalendar's grid silhouette | No copy in Phase 4 — fallback is purely visual |

### Destructive actions (POL-06, D-09)

| Action | Pattern | Copy |
|--------|---------|------|
| Delete planting | Toast-with-undo (5s) | Toast title: `Deleted {plant.name}.` Toast action: `Undo` (calls `getTemporal().undo()`) |
| Delete custom task | Toast-with-undo (5s) | Toast title: `Deleted {task.title}.` Toast action: `Undo` |
| Clear completed task ids (Tasks dashboard "Clear completed" button) | Toast-with-undo (5s) | Toast title: `Cleared {N} completed.` Toast action: `Undo` |
| Hide an event (locks-as-hide, if used) | Toast-with-undo (5s) | Toast title: `Hid {event-summary}.` Toast action: `Undo` |
| Clear entire plan (Settings) | Modal-confirm (Dialog) | Title: `Clear plan?` Body: `This removes all plantings, custom plants, custom tasks, and drag adjustments. Export first if you want a backup. This can't be undone.` Buttons: `[Cancel] [Clear plan]` (destructive red-700) |
| Overwrite-on-import | Modal-confirm (existing ImportPreviewModal — Phase 4 adds confirm step) | Title: `Replace your current plan?` Body: `Importing this file will replace your current plan ({N} plantings). Your current plan won't be exported automatically. Continue?` Buttons: `[Cancel] [Replace plan]` (destructive red-700) |
| Delete custom plant (catalog-level — has transitive plantings) | Modal-confirm | Title: `Delete {plant.name}?` Body: `This custom plant is used in {N} planting(s). Deleting it will also remove those plantings. This can't be undone.` Buttons: `[Cancel] [Delete plant]` (destructive red-700) |

### Onboarding coach marks (POL-02, D-05)

Four marks, single dismissal kills the whole set. First-visit-to-`#/plan` only; controlled by `uiStore.onboarding.coachMarksDismissed` (persisted, D-06). Numbered 1–4 in tab order.

| # | Anchor target (DOM ref) | Heading (Label 14/500) | Body (Body 16/400, capped 2 lines) |
|---|------------------------|------------------------|-------------------------------------|
| 1 | "Add plants" / catalog button in MyPlanPanel header | `Pick your plants here` | `Browse the catalog or add custom plants to start your gantt.` |
| 2 | First gantt bar (any planting) | `Drag to adjust dates` | `Bars snap to constraints (e.g. tomatoes can't go out before last frost).` |
| 3 | Lock icon on the same first bar (foreignObject — Phase 3) | `Lock to pin a date` | `Locked events stay put when you drag others.` |
| 4 | Calendar tab in PlanViewTabs | `Switch to calendar view` | `Same schedule, day-by-day. Great for "what's happening this week".` |

**Dismiss controls:** Each mark renders `[Skip tour] [Next →]` buttons (mark 4 shows `[Got it]` instead of `[Next →]`). `[Skip tour]` and `[Got it]` both flip `coachMarksDismissed = true`. `[Next →]` advances local-only state to mark `i+1`. No persistence per-mark — first dismissal action ends it permanently.

**Re-arm path (D-06):** Settings page adds a row labeled `Reset onboarding` with a `Reset` button. On click: flips `coachMarksDismissed` back to `false` AND shows a brief toast `Tour will show next time you visit Plan.` (5s, no action button).

### Mobile tap-to-edit modal (D-02)

| Element | Copy |
|---------|------|
| Modal title | `Edit {plant.name}` |
| Date label (start) | Field label: `{Phase name} starts` (e.g. `Transplant starts`, `Harvest starts`) — uses lifecyclePalette phase name |
| Date label (end, harvest-window only) | `Harvest ends` |
| Cascade summary (text, replacing ghost overlay) | `Moves harvest to {YYYY-MM-DD}.` (one line per affected downstream event; max 3 lines, then "+{N} more") |
| Lock toggle row | `Lock this date` (Switch primitive — on/off) |
| Constraint violation (snap-back) | `Can't move before {date} — {reason}.` (red-700 helper text under date input) |
| Delete planting button | `Delete planting` (destructive red-700, full-width at bottom) — kicks the toast-with-undo flow on tap |
| Cancel button | `Cancel` (secondary) |
| Save button | `Save` (primary green-700) |

### Export-reminder banner (POL-10, D-13)

| State | Copy |
|-------|------|
| Banner (always one line, fits in `--spacing-banner-h` 48px) | `You have {N} unsaved changes since {date}.` (date format: `Apr 27` — short month + day; if never exported: `since you started`) |
| Primary action | `Export plan` (green-700 text button, opens existing `exportPlan()` flow; on success → fires post-download side effect to reset counters per D-15) |
| Snooze 3d | `Remind me later` (stone-600 text button) |
| Snooze 30d | `Don't remind for 30 days` (stone-600 text button) |
| Post-export confirmation | Existing toast pattern: `Plan exported. {N} changes saved.` (no undo action — one-way op) |

### Settings additions

| Element | Copy |
|---------|------|
| "Reset onboarding" row | Label: `Reset onboarding` Helper text: `Show the Plan-page tour again on your next visit.` Button: `Reset` |
| "Clear plan" row (existing — Phase 4 reconfirms copy) | Label: `Clear plan` Helper text: `Remove all plantings and start over. Export first to keep a backup.` Button: `Clear plan` (destructive) — opens modal-confirm above |

### Keyboard a11y (POL-08)

| Surface | Copy / aria text |
|---------|------------------|
| Skip-to-main link (visible on first Tab from page top) | `Skip to main content` (anchored to `#main` — already present in AppShell from Phase 1) |
| Focused gantt bar — screen-reader announcement | `aria-label="{plant.name} {phase-name} from {start} to {end}. Press arrow keys to adjust, L to lock, Enter to commit, Escape to cancel."` |
| Constraint violation announcement (aria-live) | `Can't move before {date} — {reason}.` (mirrors visible ConstraintTooltip; `aria-live="polite"`) |
| Drag commit announcement | `Moved to {new-date}. {N} downstream events updated. Press Cmd-Z to undo.` (visually-hidden `aria-live="polite"` region) |
| Drag cancel announcement | `Drag canceled. Original date kept.` |
| Lock toggle keyboard activation (L key on focused bar) | `Locked.` / `Unlocked.` (aria-live polite) |

---

## Layout — Mobile Responsive (NEW Phase 4 surface)

Phase 1 declared "mobile gracefully degrades" — Phase 4 makes that real.

### Breakpoint contract

**One magic number: 640px** (Tailwind `sm`). Single source of truth: `useIsMobile()` hook reading `matchMedia('(max-width: 639px)')` via `useSyncExternalStore` (D-01).

| Viewport | Layout |
|----------|--------|
| `<640px` (phone portrait + landscape) | Mobile branch: tap-to-edit modal, sticky plant-name column, calendar default view, lock-in-modal, banners stack as full-width rows above content |
| `>=640px` (tablet portrait + desktop) | Desktop branch: full @dnd-kit drag, Alt-click + hover lock icon, gantt-default view, banners as sticky top rows (existing) |
| iPad portrait (768px) | DESKTOP branch (locked D-01) — gets full drag, no tap-to-edit modal |

### Mobile gantt sticky column (D-04)

```
┌──────────┬───────────────────────────────────────────┐
│ Tomato   │ ████████░░░░░░░░░ →scroll horizontally→  │ ← row 1
├──────────┼───────────────────────────────────────────┤
│ Lettuce  │ ░░░░████████████░░                         │
├──────────┼───────────────────────────────────────────┤
│ Garlic   │ ░░██████░░░░░░░░░░░                        │
└──────────┴───────────────────────────────────────────┘
  ↑ sticky        ↑ scrollable plot area
  --spacing-      pxPerDay unchanged from desktop
  sticky-plant-
  col (112px)
```

| Property | Value |
|----------|-------|
| Sticky column width | `--spacing-sticky-plant-col` (112px) |
| Sticky column bg | `white` with right border `stone-200` (separation from scrolling plot) |
| Sticky column z-index | `10` (above gantt SVG, below modals/toasts/banners) |
| Plant label font | 12px / 500 / `stone-900` (truncate with ellipsis if >col width) |
| Plot area horizontal scroll | `overflow-x: auto` on parent; SVG `width` = same as desktop (no shrinking) |
| Pinch-zoom | DISABLED — `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">` on mobile route mount? **No** — too aggressive, breaks accessibility. Instead: gantt SVG sits inside a touch-handled container that calls `event.preventDefault()` on `gesturestart` (Safari iOS specific). Phase 4 planner verifies. |
| Tap target on bars | Bar height stays 20px (visual); transparent overlay at 44px hit area extends above + below for tap detection |

### Mobile tap-to-edit modal (D-02)

Trigger: tap on any gantt bar (or its 44px hit overlay) at <640px.

```
┌────────────────────────────────────────────┐
│ Edit Cherokee Purple Tomato            [×] │  ← Heading (20/600)
├────────────────────────────────────────────┤
│                                             │
│  Transplant starts                          │  ← Label (14/500)
│  [📅 2026-05-15]                            │  ← native <input type=date>
│                                             │
│  Harvest ends                               │
│  [📅 2026-09-12]                            │
│                                             │
│  ⚠ Can't move before May 15 — frost tender. │  ← Inline error (red-700)
│                                             │
│  Moves harvest to Sep 18.                   │  ← Cascade summary (Body)
│  +2 more.                                   │
│                                             │
│  ───────────────────────────                │
│  Lock this date           [○━━━]            │  ← Switch row
│  ───────────────────────────                │
│                                             │
│  [        Delete planting        ]          │  ← Destructive, full-width
│                                             │
├────────────────────────────────────────────┤
│              [Cancel] [Save]                │  ← Footer actions
└────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Modal max-width | `--spacing-modal-max-w` (640px — Phase 2 token) — but on phones, full-viewport width minus 16px gutter |
| Modal max-height | `90vh` with internal scroll if cascade summary overflows |
| Date pickers | Native `<input type=date>` (boring correct choice — system pickers excellent on iOS/Android) |
| Date parsing | MUST go through `dateWrappers.ts` (ESLint enforces — no raw `new Date(string)` outside the wrapper module; `src/features/mobile/` is NOT in the allowlist) |
| Cascade summary max | 3 lines visible, then `+{N} more.` truncation row |
| Footer button order | Cancel left, Save right (matches platform convention) |
| Save behavior | Calls `commitEdit()` on planStore — same setter desktop drag uses → automatically participates in zundo, dirty-counter, persistence |

### Coach-mark visual style (D-05)

Hand-rolled portal overlay (no `react-joyride` per RESEARCH §Standard Stack). Visual style: **callout bubble with arrow pointing at target**, dark backdrop dimming non-target content.

```
        ╭────────────────────────╮
        │ Pick your plants here  │ ← Label (14/500)
        │                        │
        │ Browse the catalog or  │ ← Body (16/400)
        │ add custom plants to   │
        │ start your gantt.      │
        │                        │
        │       [Skip] [Next →]  │
        ╰─────────╲──────────────╯
                   ╲
                    ▼  ← arrow points at target
              ┌──────────────┐
              │ Add plants   │  ← target button (cut out from backdrop)
              └──────────────┘

  (rest of page dimmed via fixed backdrop @ rgba(0,0,0,0.4))
```

| Property | Value |
|----------|-------|
| Backdrop | `position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 50` |
| Target cutout | `box-shadow: 0 0 0 9999px rgba(0,0,0,0.4)` ring around target's bounding rect (computed each render); target itself remains visible at full opacity |
| Callout bubble | `bg-white text-stone-900 border border-stone-200 shadow-lg rounded-md p-4 max-w-[--spacing-coach-mark-callout]` |
| Callout positioning | Computed from target's `getBoundingClientRect()` — prefer below-target; fall back to above if no room. Re-computes on `resize`/`scroll` via ResizeObserver. |
| Arrow | 8×8px solid triangle, same color as bubble bg, positioned at the bubble edge facing the target |
| "Next →" / "Got it" button | Primary (green-700, white text) |
| "Skip tour" button | Secondary (transparent, stone-600 text) |
| Numbered indicator | Top-right of bubble: `1 of 4` (Label 14/500, stone-600) |
| Keyboard support | Esc → "Skip tour" equivalent (sets `coachMarksDismissed = true`); Enter → "Next →" / "Got it"; Tab cycles within callout buttons |
| ARIA | Bubble has `role="dialog"` `aria-modal="true"` `aria-labelledby` pointing at heading |

### Skeleton primitive (D-08)

`src/ui/Skeleton.tsx` — single component, shape-prop driven.

| Prop | Values | Purpose |
|------|--------|---------|
| `variant` | `'line' \| 'rect' \| 'card'` | Pre-canned shapes |
| `w` | string (CSS width) | Override width — defaults to `100%` |
| `h` | string (CSS height) | Override height — defaults: line=20px, rect=120px, card=auto (matches PlantCard layout) |
| `count` | number (default 1) | Render N copies stacked with `--spacing-card-gap` between |

**Visual:** `bg-stone-200 animate-pulse rounded-[--spacing-skeleton-radius]`. The `animate-pulse` is Tailwind's built-in keyframe — no new CSS needed beyond the radius token.

**Card variant:** matches existing `PlantCard` layout — 96×96 image placeholder + 2 text lines (one full-width line + one 70%-width line) + 1 small (badge) line. Lives in catalog grid skeleton during initial fetch / filter recompute.

### Banner stack (NEW + extended)

| Banner | Owner | Render condition | Priority |
|--------|-------|------------------|----------|
| Storage-full (D-10, NEW) | `src/app/StorageFullBanner.tsx` (or extend `Banner.tsx`) | Mid-session quota-exceeded — caught in `data/storage.ts` setItem try/catch, sets `uiStore.isStorageFull = true` | 1 (highest) |
| iOS Private (existing — Phase 1) | `src/app/Banner.tsx` | `isStorageAvailable() === false` at boot | 2 |
| Export-reminder (D-13, NEW) | `src/features/export-reminder/ExportReminderBanner.tsx` | `useExportReminder()` returns `shouldShow === true` per D-12 thresholds | 3 (lowest) |

**Render rule:** AppShell sorts eligible banners by priority and renders only the highest-priority one. Each conforms to `--spacing-banner-h` (48px) so layout doesn't shift.

```
┌────────────────────────────────────────────────────────────────┐
│ [single banner @ 48px tall, only one at a time]              [×]│
├────────────────────────────────────────────────────────────────┤
│ Garden Gantt          [Setup] [Plan] [Tasks] [Settings]        │  ← header (existing)
├────────────────────────────────────────────────────────────────┤
│   {Route content}                                               │
└────────────────────────────────────────────────────────────────┘
```

### Keyboard drag affordance (POL-08)

Linear-style — `KeyboardSensor` from `@dnd-kit/core` already in deps; the controller logic lives in `src/features/keyboard-drag/useKeyboardBarDrag.ts` (planner sketches concrete shape).

| Key | Action | zundo entry |
|-----|--------|-------------|
| Tab / Shift-Tab | Move focus between bars (bars become focusable via roving `tabindex`; first bar `tabindex=0`, others `tabindex=-1`; arrow keys within the gantt redirect focus) | none |
| ←/→ | Move focused bar by 1 day | none (stages a pending edit) |
| Shift+← / Shift+→ | Move focused bar by 7 days | none (stages a pending edit) |
| L | Toggle lock on focused bar | single zundo entry |
| Enter | Commit pending edit (if any) — calls `commitEdit()` | single zundo entry |
| Escape | Cancel pending edit + restore original date + announce cancel | none |

| Property | Value |
|----------|-------|
| Focus ring on bar | 2px solid `green-700` (focus token from Phase 1) drawn as SVG `<rect>` overlay, 2px outside the bar — uses CSS `outline-offset` equivalent via SVG |
| Visually-hidden announcer region | `<div aria-live="polite" class="sr-only">` mounted at AppShell — receives drag-progress, commit, cancel, lock messages from `useKeyboardBarDrag` |
| Pending-edit visual | While arrow-keys stage pending: bar renders at new x-position with `--lifecycle-locked` (stone-700) ring drawn around it (matches Phase 3 lock indicator visually — signals "uncommitted") |

---

## Inherited Components (Phase 4 USES — does NOT redesign)

These primitives ship Phase 1–3 and are referenced by Phase 4 work without modification:

| Primitive | Source | Phase 4 usage |
|-----------|--------|---------------|
| `Banner` | `src/app/Banner.tsx` (Phase 1) | Storage-full extends pattern; export-reminder is sibling component |
| `Toast`, `ToastAction`, `ToastProvider`, `ToastViewport` | `src/ui/Toast.tsx` (Phase 2) | All toast-with-undo flows (D-09 reversibles) |
| `Dialog` | `src/ui/Dialog.tsx` (Phase 2) | All modal-confirm (D-09 irreversibles) + EditPlantingModal frame |
| `Input` (with error variant) | `src/ui/Input.tsx` (Phase 2) | Bad-ZIP inline error (D-10) — sets `error` prop |
| `Switch` | `src/ui/Switch.tsx` (Phase 2) | Lock-this-date row in EditPlantingModal |
| `Button` (primary/secondary/destructive variants) | `src/ui/Button.tsx` (Phase 2) | All CTAs throughout Phase 4 |
| `Card`, `Badge`, `Label`, `Select`, `DropdownMenu` | `src/ui/*.tsx` (Phase 2) | Settings rows, catalog filter chips, etc. |
| `ConstraintTooltip` | `src/features/gantt/ConstraintTooltip.tsx` (Phase 3) | Phase 4 adds `aria-live="polite"`, Esc-dismiss handler at portal root, tab focus stop on the pill, sr-only summary text duplicating visible reason — does NOT restructure |
| `DayDetailDrawer` | `src/features/calendar/DayDetailDrawer.tsx` (Phase 3) | Phase 4 adds empty-state copy ("Nothing scheduled.") |
| `LockToggle` | `src/features/gantt/LockToggle.tsx` (Phase 3) | Hidden at <640px (D-03) — replaced by Switch row inside EditPlantingModal |
| `EmptyGanttState` | `src/features/gantt/EmptyGanttState.tsx` (Phase 2) | Copy retune to D-11 ("No plants yet." + "Add your first plant →") |
| `PlanViewTabs` | `src/app/PlanViewTabs.tsx` (Phase 3) | Phase 4 adds matchMedia-default-view selection at mount (CAL-04 wiring per Phase 3 D-28) |

---

## New Components (Phase 4 ships)

| Component | Path | Purpose | Notes |
|-----------|------|---------|-------|
| `Skeleton` | `src/ui/Skeleton.tsx` | Pulse loading placeholder | Single component, variant prop (`line`/`rect`/`card`) |
| `EditPlantingModal` | `src/features/mobile/EditPlantingModal.tsx` | Tap-to-edit modal at <640px | Opens on bar tap; uses Dialog frame; native date inputs |
| `useIsMobile` | `src/features/mobile/useIsMobile.ts` | Single matchMedia hook | `useSyncExternalStore` over `(max-width: 639px)` |
| `CoachMarks` | `src/features/onboarding/CoachMarks.tsx` | Portal-mounted overlay with 4 marks | Hand-rolled (no library) |
| `useCoachMarks` | `src/features/onboarding/useCoachMarks.ts` | Controller — reads `uiStore.onboarding`, ref-tracks targets | |
| `ExportReminderBanner` | `src/features/export-reminder/ExportReminderBanner.tsx` | Banner UI (stone palette, calmer than amber) | |
| `useExportReminder` | `src/features/export-reminder/useExportReminder.ts` | Selector — should-show logic per D-12 | |
| `useKeyboardBarDrag` | `src/features/keyboard-drag/useKeyboardBarDrag.ts` | POL-08 keyboard drag controller | Linear-style; planner sketches concrete API |
| `SkipToMain` | `src/ui/SkipToMain.tsx` | A11y skip link in AppShell | Anchored to existing `#main` from Phase 1 |
| `StorageFullBanner` | `src/app/StorageFullBanner.tsx` (or extend Banner.tsx) | Mid-session quota-exceeded banner | Reuses iOS Private amber pattern |

---

## Accessibility Contract (POL-08, POL-09 deliverable)

Phase 1 set baselines; Phase 4 makes them WCAG AA compliant end-to-end.

| Concern | Phase 4 commitment |
|---------|-------------------|
| Color contrast | All inherited tokens validated above (table in §Color). Audit tool: `@axe-core/cli` (one-shot against `dist/`) — planner picks Lighthouse if preferred. Any failure surfaces a token-tweak PR before phase verification. |
| Keyboard navigation | Skip-to-main link visible on first Tab; focus order is banner-dismiss → skip-link → app-name → 4 nav links → route content (per route's tab order). All interactive elements reachable; nothing keyboard-trapped. |
| Keyboard drag | POL-08 — Linear-style on gantt bars. Bars are focusable via roving tabindex; arrow keys move; L locks; Enter commits; Esc cancels. Single zundo entry on Enter-commit; no entry on Esc-cancel. |
| Focus ring | 2px solid `green-700` with 2px offset. `:focus-visible` (suppress on mouse). Tailwind utility: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700`. Applies to ALL focusable elements including SVG bars (rendered as overlay rect). |
| Touch target size | 44×44px minimum on phones for: bar tap-handle (transparent overlay), banner dismiss, modal action buttons, lock-Switch tap area. WCAG 2.5.5 AAA target — Phase 4 chooses to hit it because mobile usability demands it. |
| ARIA live regions | (1) ConstraintTooltip portal root: `aria-live="polite"`. (2) Visually-hidden gantt announcer (drag commit/cancel/lock messages). (3) Toast viewport: native Radix Toast aria handles this. (4) Banners: existing `role="status"` from Phase 1 unchanged. |
| ARIA labels on bars | `aria-label="{plant.name} {phase-name} from {start} to {end}. Press arrow keys to adjust, L to lock."` |
| Color-only meaning | Lifecycle phases distinguished by color AND (a) position in row sequence (b) phase-name in `aria-label` (c) phase-name in `<title>` SVG element. Locked state distinguished by color ring AND filled-lock icon. |
| Reduced motion | Respect `prefers-reduced-motion: reduce` — disable: skeleton pulse animation, ghost-pulse keyframe (Phase 3), coach-mark fade-in. Toast slide-in remains (helps perception of new content). |

---

## Deploy Visual Contract (DEPLOY-01, DEPLOY-03)

No UI per se, but the visual contract for what users see on the live URL:

| Concern | Spec |
|---------|------|
| Production URL | `https://{project}.pages.dev` (Cloudflare Pages default) — custom domain optional and out of v1 scope |
| Build artifacts | Vite default: `dist/index.html` + `dist/assets/{name}.{8-char-hash}.{js,css}` |
| Cache headers | `public/_headers` rule: `/index.html` → `Cache-Control: no-cache, no-store, must-revalidate`. Hashed assets get default Cloudflare immutable caching. |
| First paint | Banner row (if any) at top, header (60px), then route content. No skeleton on first render — initial JS bundle includes the AppShell synchronously. CalendarView lazy chunk uses skeleton fallback (above). |
| Stale-cache fix | Hard-refresh users get the latest `index.html` immediately; new asset hashes invalidate the bundle. No service worker → no double-cache trap. |
| Favicon / OG | Out of Phase 4 explicit scope; planner adds at discretion if it ships in the same wave (default favicon and `<meta property="og:title">` recommended for share-worthy v1 but not gated). |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none — manual primitive build (locked Phase 1) | not required |
| Third-party registries | none declared | not required |

**No `components.json`** in this project; no shadcn CLI in use. All primitives are hand-rolled in `src/ui/` per Phase 1 decision. Phase 4 introduces ZERO new third-party UI dependencies (per RESEARCH §Standard Stack — coach marks, skeletons, mobile detection all hand-rolled). Optional `@axe-core/cli` is a dev tool only, not a UI dependency.

---

## Decisions & Rationale

Recorded so downstream agents understand the "why" without re-litigating.

| Decision | Rationale |
|----------|-----------|
| Inherit ALL Phase 1–3 tokens unchanged | Three phases of token discipline already validated. Phase 4 redefining typography/color/spacing would invalidate snapshot tests + re-open Phase 3 D-12 contrast work. New tokens added only where Phase 4 has a new surface (touch target, sticky col, coach-mark, banner-h, skeleton radius). |
| Hand-rolled coach marks (no library) | 4 marks, single dismissal — `react-joyride@30KB` / `driver.js@10KB` / `shepherd.js@100KB` are all overkill. Hand-rolled portal + `getBoundingClientRect()` is ~80 LOC. RESEARCH confirms YAGNI. |
| Single boolean for coach-mark dismissal | D-05 + specifics: "first dismissal kills the whole set." Per-mark map adds state complexity for zero user benefit. The "Reset onboarding" affordance covers re-arm. |
| Tap-to-edit modal instead of touch drag | D-02. Touch drag on horizontally-scrolling SVG conflicts with native scroll gesture; long-press disambiguation is a UX rabbit hole. Modal is faster to ship and more reliable. Power users on tablets/desktop keep full drag. |
| Native `<input type=date>` in modal | System pickers on iOS/Android are excellent and free a11y. Custom day-grid would be ~200 LOC for worse UX. RESEARCH §Pattern. |
| Sticky plant-name column instead of responsive shrink | Plant identity is the load-bearing context. Shrinking bars proportionally below 640px makes everything illegible; horizontal scroll preserves bar resolution while keeping plant labels visible. |
| Toast-with-undo wires to zundo (not parallel undo log) | D-09 + specifics. Single source of history truth — Cmd-Z and toast Undo do exactly the same thing. No state divergence, no per-op undo plumbing. |
| Modal-confirm reserved for irreversible/transitive ops only | Cognitive cost of modal interrupts is too high for reversibles (delete planting). Toast-with-undo is the right pattern there. Modal earns its disruption only for clear-plan / overwrite-import / delete-custom-plant. |
| Export-reminder uses calmer stone palette, not amber | Amber semantics = "system warning" (storage-full, iOS Private). Export reminder is advisory hygiene, not warning. Stone palette signals "we're letting you know" without alarm. |
| One banner visible at a time, priority-sorted | Stacking 3 banners would push content down 144px on first paint — terrible UX. Priority sort (storage-full > iOS Private > export-reminder) ensures the most urgent message is the one shown. |
| 640px breakpoint exclusively | D-01. Tablets (iPad portrait at 768px) get desktop experience including drag. Below 640px is genuine phone territory where touch+small viewport need different patterns. |
| Skeletons over spinners (everywhere except Permapeople enrichment) | Skeletons preserve perceived layout (no jank). Spinner is appropriate for the per-plant enrichment because it's a per-button async — skeleton would over-occupy. |
| 44px touch target as the documented exception to 4-px multiples | iOS HIG / WCAG 2.5.5. 44 = 4×11 (still multiple of 4, so technically passes); flagged as exception because it doesn't fit the 4/8/16/24 progression. |
| `useIsMobile()` hook is the single source of truth for breakpoint | Scattered `matchMedia` calls drift over time. One hook, every consumer reads from it (CAL-04, sticky col, modal trigger, lock placement). |
| `aria-live="polite"` not `assertive` for ConstraintTooltip + drag announcer | Polite is the correct choice for drag feedback — assertive would interrupt screen-reader flow during drag. Constraint violations are not emergencies. |
| Reduced motion respected for skeleton + coach-mark fade, NOT for toast slide | `prefers-reduced-motion` users still benefit from a slide-in cue for new content (it disambiguates "did the toast just appear?"). Pulse animation purely decorative — drop it. |

---

## Pre-Populated From

| Source | Decisions Used |
|--------|---------------|
| `04-CONTEXT.md` D-01..D-15 + Specifics | All 15 locked decisions used directly: 640px breakpoint, tap-to-edit modal, lock-in-modal on phones, sticky column, coach-mark scope + dismissal model, persisted uiStore slices, loading/error/empty/destructive patterns, export-reminder thresholds + bookkeeping |
| `04-RESEARCH.md` Standard Stack + Patterns | Hand-rolled coach marks (no library), Skeleton primitive shape, useIsMobile hook pattern, axe-core CLI for POL-09, Cloudflare Pages git integration for DEPLOY-01, `_headers` for DEPLOY-03 |
| `01-UI-SPEC.md` (Phase 1) | Palette (stone neutral, green-700 accent, red-700 destructive, amber banner), typography (4 roles), spacing scale, lifecycle gantt palette (6 hexes), focus ring (green-700 2px/2px), system font stack, 60/30/10 split |
| `02-UI-SPEC.md` (Phase 2) | Existing primitives inventory (Button/Input/Dialog/Toast/Switch/etc.), spacing tokens (`--spacing-card-*`, `--spacing-modal-max-w`, `--spacing-pill-h`, `--spacing-wizard-max-w`) |
| `03-UI-SPEC.md` (Phase 3) | ConstraintTooltip portal (Phase 4 adds a11y plumbing), DayDetailDrawer (Phase 4 adds empty-state copy), LockToggle visual (Phase 4 hides at <640px), `--color-lifecycle-locked` token (Phase 4 re-verifies WCAG against all 6 fills), drawer/tooltip/tab-strip tokens, ghost-pulse keyframe (Phase 4 respects reduced-motion) |
| `REQUIREMENTS.md` (POL-01..10, DEPLOY-01, DEPLOY-03, CAL-04) | Phase 4 surface scope; success criteria mapped to copy/error/empty/loading/destructive contracts |
| `STATE.md` accumulated decisions | Phase 3 D-27/D-28 `?view=calendar` URL param wiring (CAL-04 implementation path); Phase 1 ESLint allowlist for `new Date()` (date parsing in EditPlantingModal must use `dateWrappers.ts`); Phase 1 persistence boundary (only `data/storage.ts` touches localStorage — uiStore persist rides this) |
| `CLAUDE.md` (project) | Stack constants (React 19 / Vite 7 / Tailwind v4 / Zustand 5 / lucide-react / FullCalendar 6.1 / @dnd-kit/core), share-worthy polish target, single-user no-backend constraint, Cloudflare Pages hosting |
| User input (auto mode) | none — all defaults derived from upstream artifacts per orchestrator instructions |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
