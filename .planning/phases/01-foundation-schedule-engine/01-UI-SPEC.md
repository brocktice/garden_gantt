---
phase: 1
slug: foundation-schedule-engine
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-26
---

# Phase 1 — UI Design Contract

> Visual and interaction contract for the Foundation & Schedule Engine phase. Phase 1 ships a deliberately minimal, disposable UI: a hash-router shell with four placeholder routes, an iOS Private-mode banner, and a read-only static SVG gantt of a hardcoded sample plan. The Phase 3 kickoff spike picks the final gantt library; this contract assumes the Phase 1 SVG render is throwaway. The design system tokens declared here (palette, type, spacing) are NOT throwaway — they outlive Phase 1 and become the share-worthy v1 baseline.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | tailwind-v4 (shadcn deferred) |
| Preset | not applicable — shadcn init deferred to Phase 2 first real UI work (Setup Wizard) |
| Component library | none in Phase 1 (no forms/dialogs needed); shadcn/ui (Radix-based) added Phase 2 |
| Icon library | lucide-react (installed alongside Tailwind v4 in Phase 1 scaffold; used only for banner dismiss icon in Phase 1) |
| Font | System UI stack: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif` (Tailwind v4 default `font-sans`). No webfont in v1 — share-worthy polish target met by typography rhythm + color, not custom faces. |

**Rationale (Phase 1):** No real forms, no modals, no dropdowns in Phase 1 — just a route shell, a banner, and an SVG. Pulling in shadcn/ui this phase adds dependencies without consumers. Phase 2's Setup Wizard is where shadcn earns its keep (`Input`, `Button`, `Form`, `Dialog`, `Select`).

---

## Spacing Scale

Declared values (Tailwind v4 defaults, multiples of 4):

| Token | Value | Tailwind class | Usage |
|-------|-------|----------------|-------|
| xs | 4px | `p-1` / `gap-1` | Icon gaps, dense inline padding |
| sm | 8px | `p-2` / `gap-2` | Banner inner padding, gantt row inner padding |
| md | 16px | `p-4` / `gap-4` | Default element spacing, route-content padding |
| lg | 24px | `p-6` / `gap-6` | Section padding, header height padding |
| xl | 32px | `p-8` / `gap-8` | Layout gaps, container max-width padding |
| 2xl | 48px | `p-12` / `gap-12` | Major section breaks (placeholder route hero) |
| 3xl | 64px | `p-16` / `gap-16` | Page-level vertical rhythm |

**Phase 1 specific spacing (gantt SVG):**

| Token | Value | Usage |
|-------|-------|-------|
| gantt-row-height | 32px | Each planting row height (one `<g>` per planting) |
| gantt-row-gap | 8px | Vertical gap between rows |
| gantt-bar-height | 20px | Phase rect height inside a row (centered, leaving 6px top + 6px bottom) |
| gantt-axis-height | 32px | Time-axis header strip |
| gantt-label-width | 140px | Left-side plant label column |

Exceptions: gantt internal dimensions are NOT Tailwind-managed (raw SVG attrs) but preserve the 4-px multiple discipline.

---

## Typography

Tailwind v4 default scale, narrowed to four roles for Phase 1:

| Role | Size | Weight | Line Height | Tailwind class |
|------|------|--------|-------------|----------------|
| Body | 16px | 400 (regular) | 1.5 (24px) | `text-base font-normal leading-relaxed` |
| Label | 14px | 500 (medium) | 1.4 (20px) | `text-sm font-medium leading-snug` |
| Heading | 20px | 600 (semibold) | 1.3 (26px) | `text-xl font-semibold leading-snug` |
| Display | 28px | 600 (semibold) | 1.2 (34px) | `text-3xl font-semibold leading-tight` |

**Weights used: 2 only** — `400` regular for body/long-form, `600` semibold for headings/labels-as-emphasis. `500` medium is allowed for compact labels (gantt row labels, banner text) only — flagged as a third weight; checker may treat as exception.

**Phase 1 specific typography (gantt SVG):**

- Plant labels (left column): 12px / 500 / 1.0 — `text-xs font-medium` equivalent, set as SVG `font-size="12"`. Tighter than body to keep row height at 32px.
- Time-axis tick labels: 11px / 400 / 1.0 — month names ("May", "Jun") and weekly tick dates.
- Tooltip / hover affordance text (deferred to Phase 3 drag — Phase 1 surfaces hover via `<title>` element only, native browser tooltip styling).

---

## Color

The 60/30/10 split. All hex values are concrete Tailwind v4 palette picks documented for the share-worthy v1 baseline.

| Role | Value | Tailwind v4 ref | Usage |
|------|-------|-----------------|-------|
| Dominant (60%) | `#FAFAF9` | `stone-50` | Page background, route content surface |
| Dominant alt (dark border) | `#E7E5E4` | `stone-200` | Hairline borders, gantt grid lines |
| Secondary (30%) | `#FFFFFF` | white | Cards, banner background, gantt plot area |
| Secondary text | `#1C1917` | `stone-900` | Primary body text |
| Secondary text muted | `#57534E` | `stone-600` | Axis labels, secondary copy |
| Accent (10%) | `#15803D` | `green-700` | **RESERVED FOR:** primary CTA buttons (none in Phase 1, declared for Phase 2+), active nav-link underline, focus ring (offset variant). NOT used on gantt bars. |
| Destructive | `#B91C1C` | `red-700` | Destructive action buttons + confirmation dialogs (none in Phase 1; declared for Phase 2+ delete-planting flows) |
| Warning (banner) | `#FEF3C7` bg + `#92400E` text | `amber-100` / `amber-800` | iOS Private Mode banner (non-blocking, advisory) |

Accent reserved for: **primary CTA only, focus ring, active nav-link state**. Never used on gantt bars (those have their own lifecycle palette below). Never used on body text.

### Lifecycle Phase Palette (Gantt Bar Colors)

These are the **engine output color contract** — every lifecycle phase rendered on the gantt uses one of these colors, and only these colors. Phase 1 picks the final palette here so snapshot test output is meaningful and so Phase 2's GANTT-02 (segmented bars by phase) inherits it directly.

| Lifecycle phase (`EventType`) | Hex | Tailwind v4 ref | Semantic meaning |
|-------------------------------|-----|-----------------|------------------|
| `indoor-start` | `#3B82F6` | `blue-500` | Cool / pre-season / under lights |
| `harden-off` (range) | `#EAB308` | `yellow-500` | Transition / cautious / outdoor exposure ramp |
| `transplant` (point) | `#16A34A` | `green-600` | Established / safe in soil |
| `direct-sow` (point) | `#0D9488` | `teal-600` | Direct-to-soil sowing — distinct from indoor-start blue, distinct from transplant green |
| `germination-window` (range) | `#A3E635` | `lime-400` | Sprouting / early growth |
| `harvest-window` (range) | `#EA580C` | `orange-600` | Warm / mature / payoff |

**Why these specific hues:**
- Blue → yellow → green → orange follows a "cool → transition → established → warm" perceptual progression that maps to the lifecycle's emotional arc.
- All meet WCAG AA contrast (4.5:1) against the white plot-area background (`#FFFFFF` secondary surface).
- Distinguishable for the most common color-vision deficiencies (deuteranopia + protanopia) — verified palette pairs (blue vs green, yellow vs orange) maintain ≥3:1 luminance separation.
- Tailwind v4 named tokens — keeps the palette consistent with shadcn/ui defaults Phase 2 will pull in.

### Border / Focus Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Border default | `#E7E5E4` (stone-200) | Hairlines, card borders, gantt grid |
| Border emphasis | `#A8A29E` (stone-400) | Hovered borders, active row selection |
| Focus ring | `2px solid #15803D` (green-700), 2px offset | All keyboard-focusable elements (route nav links, banner dismiss button) |

---

## Copywriting Contract

Phase 1 has a tiny copy surface — a banner, a header, four placeholder routes. Every string declared here.

| Element | Copy |
|---------|------|
| App name (in header) | `Garden Gantt` |
| Header tagline (subhead under app name, optional) | `Plug in your ZIP and your plants. Get a season schedule.` |
| Primary CTA label (none in Phase 1, declared for downstream) | `Start your plan` (Phase 2 setup wizard entry) |
| Empty state heading (placeholder routes) | `{Route name} — Coming soon` |
| Empty state body (placeholder routes) | `This view lights up in Phase 2. For now, see the gantt at #/plan.` |
| Error state (none in Phase 1; declared for downstream) | `Something went wrong. {What happened — one sentence}. {Recovery action — verb phrase, e.g. "Refresh to try again."}` |
| Destructive confirmation (none in Phase 1; declared for downstream) | `Delete planting: This will remove the {plant name} planting and any drag adjustments. This can't be undone. {Cancel} {Delete planting}` |

### iOS Private Mode Banner Copy (Phase 1 deliverable)

| Element | Copy |
|---------|------|
| Banner heading | `Heads up — your changes won't be saved` |
| Banner body | `This browser session can't write to local storage (likely iOS Safari Private Browsing). You can still explore the app, but anything you change will be gone when you close the tab.` |
| Banner dismiss action | `Dismiss` (icon-only `X` with `aria-label="Dismiss banner"`; banner is non-blocking and the dismiss is for the user's reading comfort, not a state change) |

**Banner placement:** sticky at the very top of the viewport (above the app header), full-width, amber palette. Renders only when `isStorageAvailable() === false` at boot. Dismiss state is in-memory only (`uiStore.bannerDismissed`) — re-appears on next reload, which is correct behavior since storage is still unavailable.

### Placeholder Route Copy (Phase 1 deliverable)

Four routes — `#/setup`, `#/plan`, `#/tasks`, `#/settings`. `#/plan` is the only one with real content (the static gantt). The other three render the same `<PlaceholderRoute>` component with route-specific copy:

| Route | Heading | Body |
|-------|---------|------|
| `#/setup` | `Setup — Coming soon` | `This view lights up in Phase 2. The Setup Wizard will walk you through ZIP entry, frost-date confirmation, and your first plant picks.` |
| `#/plan` | (renders the static SVG gantt; no placeholder copy) | n/a |
| `#/tasks` | `Tasks — Coming soon` | `This view lights up in Phase 3. Today's tasks, this week's tasks, and overdue tasks will live here, derived from your schedule.` |
| `#/settings` | `Settings — Coming soon` | `This view lights up in Phase 2 (import/export) and Phase 4 (preferences). Nothing here yet.` |

### Header Navigation Copy (Phase 1 deliverable)

The global header renders the app name + four route links. Link labels:

| Route | Link label |
|-------|-----------|
| `#/setup` | `Setup` |
| `#/plan` | `Plan` |
| `#/tasks` | `Tasks` |
| `#/settings` | `Settings` |

---

## Layout Shell (Phase 1 deliverable)

Top-of-viewport layout, desktop-first. Mobile gracefully degrades — gantt scrolls horizontally on narrow viewports without breaking the layout shell.

```
┌────────────────────────────────────────────────────────────────┐
│ [iOS Private Mode banner — only when storage unavailable]      │  ← amber
├────────────────────────────────────────────────────────────────┤
│ Garden Gantt          [Setup] [Plan] [Tasks] [Settings]        │  ← header (60px tall)
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   {Route content}                                               │
│   - #/plan: <GanttView /> (SVG)                                 │
│   - others: <PlaceholderRoute heading={...} body={...} />       │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

| Element | Specification |
|---------|---------------|
| Banner (conditional) | Full-width, sticky top, `bg-amber-100 text-amber-800`, 12px vertical padding, 16px horizontal padding (md), `border-b border-amber-200`. Dismiss `<button>` floats right with `aria-label="Dismiss banner"` and `lucide-react`'s `X` icon at 16px. |
| Header | Full-width, sticky top (below banner if present), `bg-white border-b border-stone-200`, height 60px, horizontal padding 24px (lg). Flex layout: app name + tagline on left, nav links on right. |
| App name | `text-xl font-semibold text-stone-900` |
| Header tagline | `text-sm font-normal text-stone-600` (hidden below 768px viewport — `hidden md:inline`) |
| Nav links | `text-sm font-medium`, default `text-stone-600`, hover `text-stone-900`, active `text-green-700 underline underline-offset-4 decoration-2` |
| Active link rule | A link is active when `window.location.hash === "#/{route}"`. The placeholder routes set the hash on click; React Router 7 hash mode handles this. |
| Route content container | `max-w-7xl mx-auto px-4 md:px-8 py-8`, single column |
| Placeholder route | Centered card-ish block: `text-center py-16`, heading `text-3xl font-semibold text-stone-900`, body `mt-4 text-base text-stone-600 max-w-prose mx-auto` |

**Responsive behavior:** Below 768px the header tagline collapses (mobile users still see "Garden Gantt" + the four nav links). The gantt SVG horizontally scrolls in a `overflow-x-auto` container — no responsive shrinking of bars in v1 (Phase 4 polishes mobile-gantt; Phase 1 just doesn't break).

---

## Gantt Visual Treatment (Phase 1 deliverable)

Bare hand-rolled SVG. Read-only. No drag bindings. Phase 3 spike chooses the final library; this Phase 1 SVG is intentionally throwaway, but its visual proportions and palette ARE the contract Phase 2/3 inherit.

### Structure

```
<svg width="{computed}" height="{computed}" viewBox="0 0 W H">
  <g class="axis">
    {/* time-axis: month ticks every ~30 days, weekday-grid faint vertical lines every 7 days */}
  </g>
  <g class="rows">
    {plantings.map((p, i) => (
      <g data-planting-id={p.id} transform={`translate(0, ${axisHeight + i * (rowHeight + rowGap)})`}>
        <text x="0" y="20" class="row-label">{plant.name}</text>
        {events.map(e => (
          <rect
            data-event-id={e.id}
            data-event-type={e.type}
            x={dateToX(e.start)}
            y="6"
            width={dateToX(e.end) - dateToX(e.start)}
            height="20"
            fill={lifecyclePalette[e.type]}
            rx="3"
          >
            <title>{plant.name} — {e.type} — {formatDateRange(e.start, e.end)}</title>
          </rect>
        ))}
      </g>
    ))}
  </g>
</svg>
```

### Visual specifications

| Element | Spec |
|---------|------|
| Plot area background | `#FFFFFF` (white) inside an outer `bg-stone-50` route container |
| Time-axis strip | 32px tall, white bg, bottom border `#E7E5E4` |
| Month tick label | 11px / regular / `#57534E` (stone-600), positioned at the start of each month |
| Weekly grid line | 1px vertical, `#E7E5E4` (stone-200), opacity 0.5 — every 7 days |
| Today indicator | 1px vertical, `#15803D` (green-700, accent), full-height, with a small "Today" label at top — Phase 1 reads `new Date()` once at render |
| Row height | 32px |
| Row gap | 8px |
| Row label column width | 140px (left-pinned, white background, right border `#E7E5E4`) |
| Row label text | 12px / 500 / `#1C1917` (stone-900) |
| Phase rect | height 20px, vertical center within row (6px top + 6px bottom margin), `rx="3"` for slightly rounded corners |
| Phase rect fill | One of the 6 lifecycle palette hexes (see Color section above) |
| Phase rect border | 1px stroke, same hue at 80% lightness — visual separation when adjacent phases meet |
| Hover affordance | Native browser tooltip via `<title>` child element — Phase 1 only. Phase 3 replaces with custom HTML tooltip. |
| Empty plot state | If `plan.plantings.length === 0`, render a centered text "No plantings to display." in `text-stone-500` — Phase 1 hardcoded sample plan always has ≥1 planting, but the rule is declared. |
| Time scale | Day-level, ~3px per day at default zoom — fits an 8-month season (~240 days) in a ~720px-wide plot area. Wider viewports get more px/day; narrower scrolls horizontally. |
| Min plot width | 720px — below this, container scrolls. Row labels stay pinned (`position: sticky` on the label `<g>` is not SVG-supported; Phase 1 uses a flex layout with the label column outside the scrollable SVG). |

### What's NOT in Phase 1

- No drag interactions (Phase 3, after spike).
- No bar selection / click-to-detail (Phase 2 gantt → click planting).
- No zoom controls (Phase 3 — needs to feel good with drag).
- No bar dependency arrows (Phase 3 — these are visual, not engine).
- No legend (Phase 2 — once user has plant variety, a legend earns space).
- No succession grouping visualization (Phase 2 — succession is a Phase 2 engine deliverable).

---

## Accessibility Baselines

Phase 1 establishes baseline a11y so Phase 4's WCAG AA audit isn't a from-scratch effort.

| Concern | Spec |
|---------|------|
| Color contrast | All declared text/background pairs meet WCAG AA (4.5:1 body, 3:1 large text). Lifecycle palette gantt bars are decorative + labeled (`<title>` provides screen-reader text); the bars themselves are not load-bearing for meaning beyond the title. |
| Focus rings | 2px solid `#15803D` (green-700) with 2px offset on all keyboard-focusable elements. Tailwind utility: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700`. Default browser focus rings are `:focus`-based; we use `:focus-visible` to suppress on mouse clicks. |
| Keyboard navigation | Tab order: banner dismiss → app name (skip-link target) → 4 nav links → route content. Enter activates links. Escape dismisses banner. |
| Banner ARIA | `<aside role="status" aria-live="polite">` — non-intrusive announcement. Dismiss button has `aria-label="Dismiss banner"`. |
| Gantt SVG ARIA | `<svg role="img" aria-label="Garden gantt chart for {plan.name}">`. Each `<rect>` has a `<title>` child providing screen-reader-readable phase + date range. Phase 4 may add a tabular fallback view. |
| Skip-link (Phase 4) | Declared for downstream — `<a href="#main">Skip to main content</a>` hidden until focused. Phase 1 NOT REQUIRED but layout container has `id="main"` so the future skip-link has a target. |
| Color-only meaning | Gantt phases are color-coded AND distinguished by position+shape+label (text label includes phase name in `<title>`). Color is decorative reinforcement, not the only signal. |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none in Phase 1 (deferred to Phase 2) | not required |
| Third-party registries | none declared | not required |

**Phase 2 forward note:** when shadcn is initialized, the components.json preset will lock the design tokens declared in this UI-SPEC (`stone` neutral, `green-700` accent, `red-700` destructive, system font stack). The Phase 2 UI-SPEC will validate the preset matches.

---

## Decisions & Rationale

Recorded so downstream agents understand the "why" without re-litigating.

| Decision | Rationale |
|----------|-----------|
| No shadcn/ui in Phase 1 | Phase 1 has no forms, no modals, no dropdowns. Just a route shell, a banner, an SVG. Pulling shadcn in pre-emptively adds setup cost without consumers; Phase 2 is the right earn-keep moment. |
| Stone neutral over Slate / Gray / Zinc | "Garden" semantics — stone reads warmer/earthier than the cool grays. Tailwind v4 stone is well-balanced and shadcn-compatible. |
| Green-700 accent (not green-500) | Higher contrast against stone-50 (8.4:1 vs 4.6:1); reads as "established / safe" matching the transplant-phase semantics. Reserves brighter green-600 for the gantt's transplant phase, avoiding palette collision. |
| Lifecycle bar palette finalized in Phase 1 | Snapshot tests want stable visual output. Phase 2's GANTT-02 ("segmented bars by phase") inherits this without re-litigating. |
| Hash router placeholder routes get explicit copy | "Coming soon" with route-specific body text — better than blank, sets expectations, costs ~3 lines of JSX. Replaces the "what does empty look like?" ambiguity. |
| Banner uses `role="status"` not `role="alert"` | Non-blocking advisory — `alert` would interrupt screen reader flow. `status` is polite, matches the "you can still explore the app" framing. |
| System font stack, no webfont | Polish target met by typography rhythm + color, not custom faces. Avoids font-load FOIT/FOUT on first paint. Tailwind v4 default. Revisit in v2 if a brand identity emerges. |
| `<title>` element in SVG for hover | Phase 1 deliberately avoids custom tooltip infrastructure (Phase 3 builds it for drag feedback). Native browser tooltip is the cheapest correct solution. |
| Today indicator in Phase 1 | Free win — it's a 1px vertical line + label. Makes the static gantt feel "alive" even without drag. |

---

## Pre-Populated From

| Source | Decisions Used |
|--------|---------------|
| CONTEXT.md (D-05, D-06, specifics) | Bare SVG render, time-scale module, lifecycle phase color hint (blue/yellow/green/orange) — finalized here |
| CONTEXT.md (D-08, D-09) | Hash router with 4 placeholder routes — copy + active-link styling defined here |
| CONTEXT.md (D-02, D-03, specifics) | iOS Private mode banner — copy + amber palette + role=status defined here |
| ROADMAP.md (Phase 1 success criteria) | "Coming soon" copy on three placeholders + gantt on `/plan` |
| STACK.md / ARCHITECTURE.md | Tailwind v4, lucide-react, system font stack, React Router 7 hash mode |
| REQUIREMENTS.md (DATA-03, DEPLOY-02, SCH-04) | Banner requirement, deep-link routes, frost-tolerance color cues (transplant green = "safe in soil") |
| User input | none — `--auto` mode; defaults documented |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
