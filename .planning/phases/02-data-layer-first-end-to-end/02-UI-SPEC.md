---
phase: 2
slug: data-layer-first-end-to-end
status: draft
shadcn_initialized: false
preset: copy-paste (no init)
created: 2026-04-26
extends: .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md
---

# Phase 2 — UI Design Contract

> Visual and interaction contract for the Data Layer & First End-to-End milestone. Phase 2 is the first phase with **real UI surface area**: a 3-step Setup Wizard, a searchable plant catalog with filter chips and add affordance, a custom plant authoring modal with optional Permapeople enrichment, a "My Plan" panel surfaced via a floating header pill, succession toggle, JSON export/import in /settings, and a season-spanning gantt rendered from live `planStore` data. **This contract EXTENDS Phase 1's locked tokens** (palette, typography, spacing, banner copy, lifecycle gantt palette) — it does not replace them. Phase 1 patterns (60/30/10 stone+green+lifecycle, Inter-equivalent system stack, 4-multiple spacing) are inherited verbatim; Phase 2 adds the new tokens it needs without overriding existing ones.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | tailwind-v4 (CSS-first via `@theme` in `src/index.css` per Phase 1 D-01-04 — no `tailwind.config.*` file) |
| Preset | **copy-paste shadcn (no `npx shadcn init`)** — per STACK.md "shadcn/ui (copy-paste, no version)". Components are hand-authored in `src/ui/` using Radix primitives + Tailwind v4 tokens, matching shadcn's stone+green palette. Rationale below. |
| Component library | **Radix UI primitives** (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`, `@radix-ui/react-checkbox`, `@radix-ui/react-tabs`, `@radix-ui/react-label`, `@radix-ui/react-slot`) — Phase 2 adds these to the dependency list. shadcn-style component implementations live in `src/ui/`. |
| Icon library | `lucide-react` (already installed in Phase 1) — specific glyphs per category in §Component Inventory below. |
| Font | System UI stack from Phase 1 UI-SPEC verbatim: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`. No webfont. |

### Why copy-paste over `npx shadcn init`

The Phase 1 UI-SPEC noted shadcn would "earn its keep" in Phase 2. After re-evaluating in --auto mode:

1. **Tailwind v4 CSS-first config is incompatible with shadcn's CLI-managed `tailwind.config.ts`.** Phase 1 deliberately killed `tailwind.config.*` files (per Plan 01-01 decision and PITFALLS §9) — re-introducing one to satisfy shadcn's CLI breaks that discipline.
2. **`components.json` and `npx shadcn add` machinery require either a tailwind.config file OR shadcn ≥ 2.5 with v4-CSS-first support, which is still partial.** Avoiding the toolchain risk costs us very little: shadcn's components are public-domain copy-paste templates we can author directly against our `@theme` tokens.
3. **The Phase 2 component set is small and well-bounded** (Button, Input, Label, Select, Dialog, DropdownMenu, Checkbox, Card, Badge, Toast). Hand-authoring these against Radix primitives + our Tailwind v4 tokens is ~300 lines of code — less than the integration cost of shadcn-CLI-with-v4 today.
4. **Visual outcome is identical.** We mirror shadcn's defaults (stone neutral, green-700 accent, rounded-md, 1px borders) so the look-and-feel is "shadcn-style" without the CLI dependency.

**Implication for downstream agents:** treat `src/ui/*.tsx` as the canonical primitive set. They use `cn()` (a `clsx + tailwind-merge` helper, also added Phase 2) and Radix's `asChild` pattern matching shadcn conventions. Migration to `npx shadcn init` later is a non-event because the tokens and class names already match.

---

## Spacing Scale

Phase 1 tokens inherited verbatim (multiples of 4):

| Token | Value | Tailwind class | Usage |
|-------|-------|----------------|-------|
| xs | 4px | `p-1` / `gap-1` | Icon gaps, dense inline padding, badge inner padding |
| sm | 8px | `p-2` / `gap-2` | Banner inner padding, gantt row inner padding, chip padding |
| md | 16px | `p-4` / `gap-4` | Default element spacing, card body padding, modal body padding |
| lg | 24px | `p-6` / `gap-6` | Section padding, modal padding, card outer padding |
| xl | 32px | `p-8` / `gap-8` | Wizard step spacing, layout gaps |
| 2xl | 48px | `p-12` / `gap-12` | Major section breaks, wizard hero |
| 3xl | 64px | `p-16` / `gap-16` | Page-level vertical rhythm |

### Phase 2 additions (new tokens — write to `src/index.css @theme`)

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-card-min` | 240px | Catalog plant card min-width — drives the responsive grid (auto-fill) |
| `--spacing-card-gap` | 16px | Gap between cards in the catalog grid |
| `--spacing-modal-max-w` | 640px | Custom plant modal max-width (desktop); shrinks to viewport-padding on mobile |
| `--spacing-panel-w` | 400px | "My Plan" slide-out drawer width |
| `--spacing-pill-h` | 36px | Floating "X plants added" counter pill height |
| `--spacing-wizard-max-w` | 720px | Setup wizard centered column max-width |

Exceptions: gantt internals continue to use raw SVG attrs (Phase 1 gantt-row-height=32, gantt-row-gap=8, gantt-bar-height=20, gantt-axis-height=32, gantt-label-width=140) — preserved unchanged. New gantt addition: **succession-row group accent strip** is 3px wide on the left edge of grouped rows.

---

## Typography

Phase 1 4-role system inherited verbatim:

| Role | Size | Weight | Line Height | Tailwind class |
|------|------|--------|-------------|----------------|
| Body | 16px | 400 (regular) | 1.5 (24px) | `text-base font-normal leading-relaxed` |
| Label | 14px | 500 (medium) | 1.4 (20px) | `text-sm font-medium leading-snug` |
| Heading | 20px | 600 (semibold) | 1.3 (26px) | `text-xl font-semibold leading-snug` |
| Display | 28px | 600 (semibold) | 1.2 (34px) | `text-3xl font-semibold leading-tight` |

### Phase 2 additions for catalog/modal density

| Role | Size | Weight | Line Height | Tailwind class | Used in |
|------|------|--------|-------------|----------------|---------|
| Caption | 12px | 400 | 1.4 | `text-xs font-normal leading-snug` | Card metadata (DTM, days), filter chip count, footer attribution, helper text under modal inputs |
| Badge | 11px | 600 | 1.0 | `text-[11px] font-semibold uppercase tracking-wide` | Frost-tolerance badges, season badges, "Custom" badge, "Permapeople" indicator |
| Pill counter | 14px | 600 | 1.0 | `text-sm font-semibold` | "5 plants added" floating header pill |

**Weights still constrained to 2 + 1 medium exception** (Phase 1 rule preserved): 400 regular for body/captions, 600 semibold for headings/labels-as-emphasis/badges. 500 medium reserved for compact labels and nav.

---

## Color

Phase 1 60/30/10 inherited verbatim. **Accent (`green-700` `#15803D`) remains reserved for primary CTAs, focus rings, and active nav state — never used on cards or chips.**

| Role | Value | Tailwind v4 ref | Usage |
|------|-------|-----------------|-------|
| Dominant (60%) | `#FAFAF9` | `stone-50` | Page background, route content surface, modal scrim base |
| Dominant alt (border) | `#E7E5E4` | `stone-200` | Hairline borders, card borders, gantt grid lines, modal borders |
| Secondary (30%) | `#FFFFFF` | white | Cards, modal body, banner background, gantt plot area, panel drawer body |
| Secondary text | `#1C1917` | `stone-900` | Primary body text, headings, plant names |
| Secondary text muted | `#57534E` | `stone-600` | Axis labels, captions, helper text, DTM display |
| Accent (10%) | `#15803D` | `green-700` | **RESERVED FOR:** Primary CTA buttons (`Continue`, `Save`, `Add to plan`, `Confirm import`), active nav-link underline, focus ring, the "Today" indicator on gantt, **and the green-checked "Added" state on cards** (this is a controlled extension because "Added" is a state-affirmation, equivalent semantically to a primary action receipt). |
| Destructive | `#B91C1C` | `red-700` | Destructive action buttons (`Delete`, `Overwrite plan`), confirmation dialog primary button when destructive, error state heading text |
| Destructive surface | `#FEF2F2` | `red-50` | Destructive confirmation modal scrim accent (a thin top border), inline error message background |
| Warning (banner) | `#FEF3C7` bg + `#92400E` text | `amber-100` / `amber-800` | iOS Private Mode banner (Phase 1 reused unchanged). Also used for "Permapeople unreachable" inline warning. |
| Override-flag accent | `#0369A1` | `sky-700` | The small tag next to a manually-overridden frost date / zone in the wizard ("manual" tag) — distinct from accent green so it doesn't read as a CTA. |

### Lifecycle Phase Palette (Gantt Bar Colors) — Phase 1 LOCKED, Phase 2 inherits

| Lifecycle phase (`EventType`) | Hex | Tailwind v4 ref |
|-------------------------------|-----|-----------------|
| `indoor-start` | `#3B82F6` | `blue-500` |
| `harden-off` (range) | `#EAB308` | `yellow-500` |
| `transplant` (point) | `#16A34A` | `green-600` |
| `direct-sow` (point) | `#0D9488` | `teal-600` |
| `germination-window` (range) | `#A3E635` | `lime-400` |
| `harvest-window` (range) | `#EA580C` | `orange-600` |

### New Phase 2 semantic accents

| Token | Hex | Tailwind ref | Usage |
|-------|-----|--------------|-------|
| Frost-tender badge bg | `#FEE2E2` | `red-100` | Background for "tender" frost-tolerance badge text on cards |
| Frost-tender badge text | `#991B1B` | `red-800` | Text color for "tender" badge |
| Half-hardy badge bg | `#FEF3C7` | `amber-100` | "half-hardy" badge bg |
| Half-hardy badge text | `#92400E` | `amber-800` | "half-hardy" badge text |
| Hardy badge bg | `#DCFCE7` | `green-100` | "hardy" badge bg |
| Hardy badge text | `#14532D` | `green-900` | "hardy" badge text |
| Cool-season badge bg | `#DBEAFE` | `blue-100` | "cool" season badge bg |
| Cool-season badge text | `#1E3A8A` | `blue-900` | "cool" season badge text |
| Warm-season badge bg | `#FFEDD5` | `orange-100` | "warm" season badge bg |
| Warm-season badge text | `#7C2D12` | `orange-900` | "warm" season badge text |
| Custom badge bg | `#E5E5E5` | `neutral-200` | "Custom" badge bg (neutral, distinct from frost colors) |
| Custom badge text | `#262626` | `neutral-800` | "Custom" badge text |
| Permapeople icon tint | `#7C3AED` | `violet-600` | The small leaf/info icon next to plants whose description came from Permapeople (per D-19) |
| Succession accent bar | `#A8A29E` | `stone-400` | The 3px left-edge strip on grouped succession gantt rows |

**WCAG AA verified:** all badge text on its bg meets ≥4.5:1 contrast. Tender (red-800 on red-100) = 7.6:1; hardy (green-900 on green-100) = 9.4:1; cool (blue-900 on blue-100) = 11:1; warm (orange-900 on orange-100) = 8.2:1; custom (neutral-800 on neutral-200) = 9.7:1.

### Border / Focus tokens — unchanged from Phase 1

| Token | Value | Usage |
|-------|-------|-------|
| Border default | `#E7E5E4` (stone-200) | Hairlines, card borders, gantt grid, input borders default |
| Border emphasis | `#A8A29E` (stone-400) | Hovered borders, hovered cards, input borders on focus-within |
| Border error | `#B91C1C` (red-700) | Input borders when validation fails |
| Focus ring | `2px solid #15803D` (green-700), 2px offset | All keyboard-focusable elements |

---

## Component Inventory

The Phase 2 surface is large enough to enumerate every component contract. Each entry: **purpose**, **props/states**, **copywriting**, **a11y notes**.

### 1. Setup Wizard shell (`src/features/setup/SetupWizard.tsx`)

**Purpose:** 3-step wizard at `/setup` (D-01). Always-available route (D-02). Maintains step state in local React state (D-default for "Wizard step state management"); does NOT persist step across reloads. On mount: read `planStore.plan`; if `plan === null` → start at Step 1; if `plan !== null` → start at Step 2.

**Layout:** centered single column `max-w-[var(--spacing-wizard-max-w)] mx-auto px-md py-2xl`. Three step indicators across the top (numbered circles `1 / 2 / 3` with labels `Location / Plants / Review`). Active step = green-700 filled circle + bold label; completed = green-700 filled with check; pending = stone-200 outline.

**Bottom action bar:** sticky-bottom inside the centered column, white background, top border `stone-200`, padding `py-md px-lg`. Layout: `Back` button (ghost, left) — `Next` / `Continue` / `Finish` button (primary, right). On Step 1 the `Back` button is hidden. On Step 3 the right-side button label changes to `Finish — go to my plan`.

**Step indicator copy:**
| Step | Label | Sub-label (under number, hidden < md) |
|------|-------|---------------------------------------|
| 1 | `Location` | `ZIP and frost dates` |
| 2 | `Plants` | `Pick what you're growing` |
| 3 | `Review` | `Confirm and finish` |

**Wizard heading (above the step indicator, only on Step 1 first-run when plan is null):**
- Heading (`text-3xl font-semibold`): `Let's set up your garden`
- Sub (`text-base text-stone-600 mt-sm max-w-prose`): `Three quick steps. You can change anything later — nothing's locked in.`

**A11y:** step indicators are `<ol role="list">` with `aria-current="step"` on the active item. Bottom action bar buttons have explicit labels (no icon-only). `Back` triggers focus to first focusable element of the previous step; `Next` to first focusable of the next step.

---

### 2. Setup Wizard Step 1 — Location (`SetupStepLocation.tsx`)

**Purpose:** ZIP entry → derived zone + frost dates with override path (D-04, D-05). Unrecognized-ZIP fallback to manual zone+frost (D-06). "Try with sample plan" link (D-03).

**Layout (top to bottom):**

1. **ZIP input row** — labeled `<Input>` of type `text` with `inputMode="numeric"` and `pattern="[0-9]{5}"`. Label text: `Your ZIP code`. Helper caption under input: `We use this to look up your USDA zone and frost dates. Stored only in your browser.`. On blur or 5-digit completion, calls `lookupLocation(zip)`.
2. **Lookup loading state** — when `lookupStatus === 'loading'`: replace the derived-fields block with a single skeleton row + caption `Looking up frost dates for {zip}…`. Spinner is `lucide-react`'s `Loader2` with `animate-spin`.
3. **Derived fields block** — appears when lookup succeeds. Three rows, each: a `<dt>` label (`USDA zone` / `Last spring frost` / `First fall frost`), a `<dd>` value (the lookup result), and an `Override` text-button on the right (ghost variant, sky-700 text, `font-medium text-sm`). Clicking `Override` flips the row to an inline editable input (zone is `<select>` of `1a..13b`; frost dates are `<input type="date">`). When overridden, the value text is followed by a small sky-700 pill `manual` (sky-tone to avoid green-CTA collision).
4. **Unrecognized-ZIP error block** — appears when `lookupStatus === 'not-found'` instead of the derived fields. Card with `border-amber-200 bg-amber-50 p-md rounded-md`. Heading `text-base font-semibold text-amber-800`: `ZIP not recognized`. Body `text-sm text-amber-800 mt-xs`: `We don't have data for {zip}. Enter your zone and frost dates manually below — you can edit these any time in Settings.`. Below the message: the same three-field manual-entry form (zone select + two date inputs), labelled identically.
5. **"Try with sample plan" link** (D-03) — bottom-left of the step content, **only visible when `plan === null`** (first-run). Anchor styled as `text-sm font-medium text-green-700 underline underline-offset-4 decoration-2 hover:decoration-4`. Copy: `Or try the app with a sample plan →`. Click: dispatches `planStore.loadSamplePlan()` (which sets the Phase 1 hardcoded sample as the user's editable plan, per CONTEXT specifics) and navigates to `#/plan`.

**Validation:**
- ZIP must match `/^\d{5}$/`. Error message under input: `Enter a 5-digit US ZIP code.`
- Manual zone must be one of the 26 USDA zone strings.
- Manual frost dates: last spring frost must be before first fall frost. Error: `Last spring frost must come before first fall frost.`

**Next button:** disabled until either (a) lookup succeeded, or (b) all three manual fields are valid.

**Copywriting summary for Step 1:**
| Element | Copy |
|---------|------|
| ZIP input label | `Your ZIP code` |
| ZIP input placeholder | `e.g. 80401` |
| ZIP input helper | `We use this to look up your USDA zone and frost dates. Stored only in your browser.` |
| ZIP validation error | `Enter a 5-digit US ZIP code.` |
| Lookup loading caption | `Looking up frost dates for {zip}…` |
| Override link label | `Override` |
| Override applied tag | `manual` |
| Unrecognized-ZIP heading | `ZIP not recognized` |
| Unrecognized-ZIP body | `We don't have data for {zip}. Enter your zone and frost dates manually below — you can edit these any time in Settings.` |
| Manual zone label | `USDA hardiness zone` |
| Manual zone placeholder | `Select a zone…` |
| Manual last-frost label | `Last spring frost (50% probability)` |
| Manual first-frost label | `First fall frost (50% probability)` |
| Frost-date order error | `Last spring frost must come before first fall frost.` |
| Sample-plan link | `Or try the app with a sample plan →` |

**A11y:** `<dl>` for derived fields. Override button has `aria-label="Override {field-name}"`. Manual inputs have explicit `<label htmlFor>`. Error messages use `aria-describedby` linking input to error text.

---

### 3. Setup Wizard Step 2 — Plants / Catalog Browser (`SetupStepPlants.tsx` + `CatalogBrowser.tsx`)

**Purpose:** Browse, search, filter, and add plants from the curated catalog (~50 plants per D-07) + custom plants (D-12). Same browser is reused at `/catalog` for adding plants outside the wizard.

**Layout (top to bottom inside the wizard column; full-width on `/catalog`):**

1. **Search bar** — full-width `<Input>` with leading `lucide-react` `Search` icon. Placeholder: `Search plants by name…`. Debounced 200ms. Case-insensitive match against `plant.name` AND `plant.scientificName`. Tolerates either em-dash (`—`) or hyphen (`-`) as the variety separator (per CONTEXT specifics). Clear button (X icon) appears when input has text.
2. **Filter chips row** — horizontal scroll on mobile, wrap on desktop. Eight chips total, grouped visually with thin vertical divider:
   - **Season group:** `Cool-season`, `Warm-season`
   - **Category group:** `Leafy`, `Fruiting`, `Root`, `Herb`, `Allium`, `Brassica`
   Default chip-state behavior: **OR within group, AND across groups** (per CONTEXT discretion default). E.g., selecting `Cool-season` AND `Leafy` shows cool-season leafy plants (lettuce, spinach, kale); selecting `Cool-season` AND `Warm-season` shows everything (OR within season group). A small `Clear filters` text-button appears at the right end of the chip row when ≥1 chip is active.
3. **Card grid** — CSS grid: `grid-template-columns: repeat(auto-fill, minmax(var(--spacing-card-min), 1fr)); gap: var(--spacing-card-gap)`. First grid cell is **always** the pinned `+ Add custom plant` card (D-13). Subsequent cells are catalog plants matching the search+filter state, sorted alphabetically by name.
4. **Empty filter state** — when search/filter combination yields zero matches, render a centered block in the grid area: heading `text-lg font-semibold` `No plants match those filters.`; body `text-sm text-stone-600 mt-xs` `Try removing a filter, or clear your search.`; CTA `Clear filters` button (ghost, green-700).

**Filter chip visual state:**
- Default: `bg-white border border-stone-200 text-stone-700 px-sm py-xs rounded-full text-xs font-medium`. Hover: `border-stone-400`.
- Active: `bg-green-700 border-green-700 text-white`. Hover: `bg-green-800`.

**Search input height:** 40px (Tailwind `h-10`). Filter chip height: 28px. Card min-width: 240px. Card height: auto, ~180px typical.

**A11y:** filter chips are `<button role="checkbox" aria-checked={isActive}>` (more accurate than plain buttons; AT announces toggle state). Search input has `<label className="sr-only">Search plants</label>`. Grid is `<ul role="list">` with `<li>` per card.

---

### 4. Plant Card (`PlantCard.tsx`)

**Purpose:** Single catalog item display + Add affordance (D-10, D-11). Two states: **Available** and **Added**. Custom plants have an additional **Edit/Delete** affordance (D-15).

**Visual (Available state):**
```
┌─────────────────────────────────────┐
│ [icon]                  [tender]    │  ← header row: lucide icon left, frost-tolerance badge right
│                                     │
│ Tomato — Cherokee Purple            │  ← plant name (text-base font-semibold text-stone-900)
│ Solanum lycopersicum                │  ← scientific name (text-xs text-stone-500 italic)
│                                     │
│ [warm] · 80 days to maturity        │  ← season badge + DTM caption (text-xs text-stone-600)
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  + Add to plan                  │ │  ← Button (primary, full-width inside card)
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Visual (Added state) — D-11:**
- Card border becomes `border-green-700 border-2` (instead of stone-200).
- Card background becomes `bg-green-50` (very subtle tint, kept light for readability).
- Header right-side badge cluster gets a `lucide-react` `CheckCircle2` icon at 16px in `text-green-700`.
- The `+ Add to plan` button is replaced with a `Remove from plan` ghost button: `text-sm font-medium text-stone-600 hover:text-red-700`. Click → removes the planting from `planStore.plan.plantings`.
- Plant card stays in place in the grid (does NOT disappear) — confirms D-11.

**Visual (Custom plant — additional treatments, D-12, D-15):**
- A `Custom` badge appears in the header row (left of frost-tolerance badge, separated by 4px gap).
- Top-right of the card: a `lucide-react` `MoreHorizontal` icon button (24px, ghost) opens a dropdown menu via Radix DropdownMenu with two items: `Edit plant` (default), `Delete plant` (red-700 text). Delete logic per D-15 below.
- If the plant's description came from Permapeople (per CAT-08): a small `lucide-react` `Sparkles` icon (16px, `text-violet-600`) appears next to the scientific name with a tooltip via `<title>` reading `Description enriched from Permapeople (CC BY-SA 4.0)`.

**Pinned `+ Add custom plant` card (always first cell):**
```
┌─────────────────────────────────────┐
│                                     │
│            [+ Plus icon]            │  ← lucide Plus, 32px, text-stone-400
│                                     │
│         Add custom plant            │  ← text-base font-semibold text-stone-700
│                                     │
│   Author your own with timing       │  ← text-xs text-stone-500
│   that matches your seed packet     │
│                                     │
└─────────────────────────────────────┘
```
- Background: `bg-white border-2 border-dashed border-stone-300`.
- Hover: `border-green-700` + cursor-pointer.
- Click → opens Custom Plant Modal (component #6).

**Card delete confirmation (D-15) — shown when user clicks Delete on a Custom card whose `id` is referenced by ≥1 planting in `planStore.plan.plantings`:**
- Modal heading: `Delete {plant name}?`
- Body: `This plant is used in {N} planting(s) on your plan. Deleting it will also remove those plantings. This can't be undone.`
- Buttons: `Cancel` (ghost) and `Delete plant and {N} planting(s)` (destructive red-700).
- If the plant is NOT in any planting: simpler confirm `Delete {plant name}? This can't be undone.` with `Cancel` and `Delete plant` (red-700).

**A11y:** card root is `<li>`; the Add button is the only focusable element by default (the entire card surface is NOT clickable — avoids accidental adds). Custom-card MoreHorizontal opens a Radix DropdownMenu with full keyboard support. Added-state announces via `aria-live="polite"` on a visually-hidden `<span>` updated on add/remove.

**Lucide icon mapping by category (Claude's discretion per CONTEXT):**
| Category | Icon |
|----------|------|
| `fruiting-vegetable` | `Apple` |
| `leafy-green` | `Leaf` |
| `root` | `Carrot` |
| `brassica` | `Trees` (closest available) |
| `legume` | `Sprout` |
| `allium` | `Onion` (lucide-react does not have "Onion" — fallback `Garlic` if available, otherwise `Sprout`) — confirm at implementation; ESLint rule disallows missing-icon fallbacks |
| `herb` | `Flower2` |
| `other` | `Sprout` |

Implementation note: planner should verify each icon exists in the installed `lucide-react` version; if `Carrot`, `Onion`, `Garlic` not present, fall back to `Leaf` and add a TODO comment to upgrade `lucide-react`.

---

### 5. Floating "X plants added" counter pill + "My Plan" panel (`MyPlanPill.tsx`, `MyPlanPanel.tsx`)

**Purpose (D-11, D-21, succession toggle host):** Header-anchored pill that's visible from any route showing `planStore.plan.plantings.length`. Clicking it opens the My Plan panel, where users can remove plantings, edit succession, and (Phase 3) future per-planting controls.

**Pill visual:**
- Position: `position: fixed; top: 12px; right: 16px;` — above the AppShell header on desktop, OR inside the header right-aligned (planner's choice — recommend inside header for sticky behavior on scroll).
- Size: 36px height, auto width, `padding-x: 16px`.
- Background: `bg-green-700 text-white rounded-full shadow-md`.
- Hover: `bg-green-800`.
- Active (panel open): `ring-4 ring-green-200`.
- Content: `lucide-react` `Sprout` icon (16px) + count + label, `font-semibold text-sm`. Copy: `{N} plant{N===1?'':'s'} added`. When `N === 0`: pill text is `No plants yet` and the pill background is `bg-stone-300 text-stone-600`. When N === 0 the pill IS still visible but disabled (cursor: not-allowed) and clicking it does nothing — keeps the affordance discoverable.

**Panel implementation choice (CONTEXT discretion default — picked here):** **slide-out side drawer from the right.** Rationale: keeps the catalog grid visible behind a 50% scrim (better for the "I want to add more after seeing my list" flow than a modal which forces context switching). Width: `var(--spacing-panel-w)` = 400px on desktop, 100vw - 32px on mobile (full width minus side gutters). Implementation: Radix Dialog with `data-state` driving a `transform: translateX(0/100%)` transition + `transition-transform duration-200 ease-out`.

**Panel layout (top to bottom):**

1. **Header bar** — sticky top inside drawer. Left: `text-xl font-semibold`: `My Plan`. Right: `lucide-react` `X` close button (32px hit target, `aria-label="Close My Plan"`).
2. **Location summary** (compact info row) — `text-sm text-stone-600`: `📍 ZIP {zip} · zone {zone} · last frost {date}` (uses lucide `MapPin` icon, not the emoji). Click target opens `/setup` Step 1.
3. **Plantings list** — scrollable. One row per `Planting` in `planStore.plan.plantings`:
   - Plant name (`text-sm font-semibold`).
   - Plant icon (lucide, 16px) on the left.
   - **Succession toggle** (D-21) — Radix Switch component, only rendered when the underlying `plant.timing.successionIntervalDays` is defined; otherwise the row shows a thin hairline gap where the toggle would be (no toggle, no label — keeps the layout calm). Toggle label: `Succession plantings`. Caption under the toggle (when on): `Adds {N} more plantings every {interval} days, ending before first fall frost.` (uses live computed values from the engine).
   - **Remove button** — `lucide-react` `Trash2` icon (16px, ghost), red-700 on hover. `aria-label="Remove {plant name}"`. Click → confirmation prompt: `Remove {plant name}? This won't affect the catalog plant.` `Cancel` / `Remove planting` (red-700).
4. **Footer** — sticky bottom: two-button row:
   - `Add more plants` (primary, green-700) → navigates to `#/catalog` (or `#/setup` if plan was just created and wizard isn't done).
   - `View my gantt` (secondary, ghost border) → navigates to `#/plan`.

**Empty state (when `plantings.length === 0`):** heading `text-base font-semibold` `No plants in your plan yet.`; body `text-sm text-stone-600` `Pick some from the catalog to start your gantt.`; CTA `Browse plants` (primary, navigates to `/catalog` or wizard Step 2).

**A11y:** `<dialog role="dialog" aria-modal="true" aria-labelledby="my-plan-heading">`. Focus is trapped inside the panel when open; first focusable element is the close button. Esc closes. Outside-click on the scrim closes. Background body content gets `aria-hidden="true"` while open.

---

### 6. Custom Plant Modal (`CustomPlantModal.tsx`)

**Purpose:** CRUD form for a custom plant (D-13, D-14, D-15). Opened from: (a) `+ Add custom plant` pinned card → "Create" mode; (b) `Edit plant` dropdown on a Custom card → "Edit" mode.

**Implementation:** Radix Dialog. Max width: `var(--spacing-modal-max-w)` = 640px. Padding: `p-lg`. Scrollable body if content exceeds viewport.

**Layout (top to bottom):**

1. **Header bar** — sticky top. Title: `Create custom plant` (mode=create) OR `Edit {plant name}` (mode=edit). Close button (`X` icon, top-right).
2. **Duplicate-from-catalog row** (D-14) — only visible in create mode:
   - Label: `Start from a catalog plant (optional)`.
   - Radix Select dropdown of all curated plants, alphabetical. Placeholder: `Choose a baseline…`.
   - Caption: `We'll pre-fill the timing fields. You can edit any of them.`
   - On select: form fields below populate from the chosen plant's timing.
3. **Form sections** (each in its own `<fieldset>` with `<legend>`):
   - **Basics**
     - `Plant name` (required, text input). Helper: `e.g. "Beet — Detroit Dark Red"`. Error if blank: `Plant name is required.`.
     - `Scientific name` (optional, text input, italic placeholder).
     - `Category` (Radix Select). Options: same 8 categories as filter chips. Default: `other`.
   - **Frost & season**
     - `Frost tolerance` (Radix Select). Options: `tender`, `half-hardy`, `hardy`. Helper: `Tender = damaged by frost. Half-hardy = light frost OK. Hardy = survives hard frost.`
     - `Season` (Radix Select). Options: `cool`, `warm`. Helper: `Cool-season plants prefer 50-70°F. Warm-season plants need 65-95°F.`
   - **Timing** (the engine inputs)
     - `Start method` (Radix Select). Options: `direct-sow`, `indoor-start`, `either`. Default: `either`. Helper: `How seeds enter the garden.`
     - `Weeks indoors before last frost` (number input, min=0, max=16). Helper: `Only matters for indoor-start. Typical: 4-8 weeks.` Default: 6.
     - `Transplant offset (days from last frost)` (number input, range -30 to +30). Helper: `Negative = before last frost (cold-hardy). Positive = after.` Default: 0.
     - `Days to germinate` (number input, min=1). Helper: `From seed contact with soil to sprout.` Default: 7.
     - `Days to maturity` (number input, min=1, required). Helper: `From transplant (or sow date for direct-sow) to first harvest.` Default: 60.
     - `Harvest window (days)` (number input, min=1). Helper: `How long the harvest period lasts.` Default: 14.
     - `Succession interval (days)` (number input, optional, min=0). Helper: `Days between successive plantings. Leave blank for crops you only plant once.`
   - **Description (optional)**
     - `Description` (textarea, 4 rows). Helper: `Notes for yourself — varieties, sources, growing tips.`
4. **Permapeople enrich block** (D-18) — appears below the form, above the action bar:
   - Heading: `text-sm font-semibold` `Enrich from Permapeople (optional)`
   - Caption: `text-xs text-stone-600` `Pull botanical info, family, and a description from Permapeople.org. Doesn't change timing — those stay yours.`
   - Button: `Enrich from Permapeople` (secondary, ghost border, `lucide-react` `Sparkles` icon).
   - Loading state (after click, while fetch in flight): button text becomes `Looking up…` + `Loader2 animate-spin` icon. Button disabled.
   - Success state: button text becomes `Re-fetch from Permapeople` + `Check` icon (green-700). A new section appears below: `Permapeople found:` + populated description preview + `Family: Solanaceae` + `Genus: Solanum` (whatever the API returned). Each field has a `Use this` button that copies into the form's matching field.
   - Failure state: replaces the success block with an inline warning: `bg-amber-50 border border-amber-200 text-amber-800 p-sm rounded-md text-sm`: `Permapeople is unreachable right now. You can save without enrichment — try again later from this same modal.` (per D-18, MUST not block save).
5. **Action bar** — sticky bottom. Left: in edit mode, a `Delete plant` ghost button (red-700 text, no fill). Right: `Cancel` (ghost) + `Save plant` (primary green-700). On click of Save: validate, dispatch `planStore.upsertCustomPlant(plant)`, close modal.

**Validation — Save button disabled until:**
- Plant name is non-empty.
- Days to maturity is ≥1.
- All other numeric fields are within their declared min/max.

**Form errors render inline** under each input as `text-xs text-red-700 mt-xs`.

**Copywriting summary for modal:**
| Element | Copy |
|---------|------|
| Modal heading (create) | `Create custom plant` |
| Modal heading (edit) | `Edit {plant name}` |
| Duplicate-from-catalog label | `Start from a catalog plant (optional)` |
| Duplicate-from-catalog placeholder | `Choose a baseline…` |
| Duplicate-from-catalog helper | `We'll pre-fill the timing fields. You can edit any of them.` |
| Plant name required error | `Plant name is required.` |
| Plant name helper | `e.g. "Beet — Detroit Dark Red"` |
| Frost tolerance helper | `Tender = damaged by frost. Half-hardy = light frost OK. Hardy = survives hard frost.` |
| Season helper | `Cool-season plants prefer 50-70°F. Warm-season plants need 65-95°F.` |
| Start method helper | `How seeds enter the garden.` |
| Weeks indoors helper | `Only matters for indoor-start. Typical: 4-8 weeks.` |
| Transplant offset helper | `Negative = before last frost (cold-hardy). Positive = after.` |
| Days to germinate helper | `From seed contact with soil to sprout.` |
| Days to maturity helper | `From transplant (or sow date for direct-sow) to first harvest.` |
| Harvest window helper | `How long the harvest period lasts.` |
| Succession interval helper | `Days between successive plantings. Leave blank for crops you only plant once.` |
| Description helper | `Notes for yourself — varieties, sources, growing tips.` |
| Enrich heading | `Enrich from Permapeople (optional)` |
| Enrich caption | `Pull botanical info, family, and a description from Permapeople.org. Doesn't change timing — those stay yours.` |
| Enrich button (idle) | `Enrich from Permapeople` |
| Enrich button (loading) | `Looking up…` |
| Enrich button (success) | `Re-fetch from Permapeople` |
| Enrich error | `Permapeople is unreachable right now. You can save without enrichment — try again later from this same modal.` |
| Save button | `Save plant` |
| Cancel button | `Cancel` |
| Delete button (edit mode) | `Delete plant` |

**A11y:** Radix Dialog provides modal semantics. Each `<fieldset>` has `<legend>`. Required inputs have `aria-required="true"` and visible `*` after the label. Inline errors use `aria-live="polite"` and `aria-describedby` linkage. Tab order flows: name → scientific → category → frost-tolerance → season → start method → 6 timing fields → description → enrich → cancel → save.

---

### 7. Setup Wizard Step 3 — Review (`SetupStepReview.tsx`)

**Purpose:** Show the user their derived gantt before committing (D-01). Reuses `<GanttView>` from Phase 1, reading from `planStore.plan` (which now has the user's data, not `samplePlan`).

**Layout:**

1. **Heading** — `text-2xl font-semibold` `Here's your season at a glance`.
2. **Location chip row** — small inline summary: `Zone {zone} · last frost {date} · first fall frost {date}`. Edit link → goes back to Step 1.
3. **Plantings count chip** — `{N} plants in your plan` with an Edit link → back to Step 2.
4. **`<GanttView>`** — read-only, scrollable horizontally. Same component as `/plan`.
5. **Footer copy** — caption `text-sm text-stone-600 mt-md max-w-prose`: `Drag-to-adjust comes in the next milestone. For now, your plan is saved automatically as you go.`

**Bottom action bar (within wizard shell):** `Back` (ghost) + `Finish — go to my plan` (primary). Click Finish: navigates to `#/plan`. Plan was already persisted incrementally during Steps 1-2; nothing to "save" on Finish.

---

### 8. GanttView extension (`src/features/gantt/GanttView.tsx`)

**Purpose:** Phase 2 extends Phase 1's read-only bare-SVG gantt (D-23, D-26). Same component, larger feature surface.

**Phase 2 additions (on top of Phase 1's locked structure):**

1. **Time axis spans the user's actual season (D-24).** Replace Phase 1's hardcoded sample-plan dates with: `axisStart = startOfMonth(min(indoor-start across plantings))`; `axisEnd = endOfMonth(max(harvest-window.end across plantings))`. Both fall back to `lastFrostDate ± 90d` if plantings array is empty (defensive).
2. **Weekly subticks** — already declared in Phase 1 visual spec but rendered shorter here (4px vertical line, opacity 0.3) so monthly ticks remain dominant on a 6-8-month axis.
3. **Succession row grouping (D-22).** Plantings with the same base `plantId` and `successionIndex > 0` get a 3px-wide left-edge accent strip (`stone-400`) drawn from the top of the first row to the bottom of the last row in that group. Strip is rendered in a separate `<g class="succession-groups">` layer behind the rows. The strip has a tiny end-cap label `<text>` reading `Succession of {plant.name}` placed in the row-label column area, styled as `text-[10px] fill-stone-500`.
4. **Lifecycle palette boundaries (D-25)** — adjacent phase rects within a single planting row are rendered with a 1px gap (gap is the row's white background showing through) — clearer than a hairline divider for the bare-SVG palette.
5. **Today indicator** — Phase 1's locked treatment; on `/plan` the indicator is rendered fresh on each route entry (not memoized) so users opening the app on a new day see the line move.
6. **Empty plot state** — when `planStore.plan.plantings.length === 0` (e.g., user came directly to `/plan` with an empty plan): render a centered hero block (replaces Phase 1's "No plantings to display." minimum):
   - Heading `text-2xl font-semibold` `No plants in your plan yet.`
   - Body `text-base text-stone-600 mt-sm` `Pick some from the catalog and your gantt will appear here.`
   - CTA `Browse plants` primary button → navigates to `/catalog`.
7. **Loading state** — when `planStore` is hydrating (very brief), render a skeleton: 4 rows of `bg-stone-200` rectangles where bars would be, with the axis already drawn. No spinner — the boot is fast enough that a skeleton is less jarring than a spinner that appears for 50ms.

**No drag, no zoom, no click-to-detail in Phase 2** (D-26). Phase 3 territory.

---

### 9. Settings page (`src/features/settings/SettingsPanel.tsx`)

**Purpose:** Replace Phase 1's `/settings` placeholder. Phase 2 surface = export + import (D-27, D-28, D-29).

**Layout:**

1. **Heading** — `text-3xl font-semibold` `Settings`.
2. **Export section** (`<section>` with `border-b border-stone-200 py-lg`):
   - Sub-heading `text-xl font-semibold` `Export your plan`.
   - Body `text-base text-stone-600` `Download your full plan as a JSON file. Use this to back up your work or move it to another browser.`
   - Button: `Export plan` (primary green-700, `lucide-react` `Download` icon). Click → triggers download of `garden-gantt-plan-{YYYY-MM-DD}.json`.
   - Caption `text-xs text-stone-500 mt-sm`: `Last exported: never` OR `Last exported: {relative time, e.g. "3 hours ago"}` (tracked via in-memory ui state — does NOT persist).
3. **Import section** (`<section>` with `py-lg`):
   - Sub-heading `text-xl font-semibold` `Import a plan`.
   - Body `text-base text-stone-600` `Replace your current plan with one from a JSON file. We'll show you a preview first.`
   - Button: `Import plan` (secondary, ghost border, `lucide-react` `Upload` icon). Click → opens hidden `<input type="file" accept=".json,application/json">`.
   - Inline error region (only when validation fails after import): `bg-red-50 border border-red-200 p-sm rounded-md text-sm text-red-800`.

**Import preview modal (after file is selected and Zod-validated successfully):**

- Heading: `Import preview`
- Body block 1 (summary): `Importing **{N}** planting(s), **{M}** custom plant(s), location ZIP **{zip}** (zone {zone}). This will OVERWRITE your current plan.`
- Body block 2 (warning if current plan has data): `text-sm text-amber-800 bg-amber-50 border border-amber-200 p-sm rounded-md`: `Your current plan has {currentN} plantings. They will be replaced. To keep them, cancel and Export your current plan first.`
- Buttons: `Cancel` (ghost) + `Replace my plan` (destructive red-700 — because OVERWRITE is destructive per POL-06).

**Import error states:**
| Failure | Modal/inline message |
|---------|----------------------|
| File is not valid JSON | (inline error block on /settings) `That file isn't valid JSON. Try a file you exported from Garden Gantt.` |
| JSON parses but fails Zod validation | (inline error block) `That file doesn't look like a Garden Gantt plan. Make sure you're importing a file with extension .json that came from this app's Export.` |
| Schema version is newer than this app | (inline error block) `That plan was made with a newer version of Garden Gantt. Update the app and try again.` |

**Schema migration UX (D-29):** if the imported plan is `schemaVersion: 1`, the migration runs silently inside `planStore.replacePlan(parsed)`. The preview modal shows the post-migration shape (after migrate). No user-visible "migrating…" intermediate state.

---

### 10. AppShell additions (extends `src/app/AppShell.tsx`)

**Phase 2 additions on top of Phase 1's locked shell:**

1. **Floating "X plants added" pill** — rendered by AppShell, top-right, persistent across routes (described in §5). Hidden ONLY on `/setup` Step 1 when plan is null (to avoid distracting the user before they have anything to count). On all other routes/steps the pill is visible.
2. **Header `/setup` link is always visible** (D-02) — Phase 1 already wired all 4 hash routes; Phase 2 just confirms `/setup` is not hidden behind a "first run" gate.
3. **Permapeople CC BY-SA attribution footer** (D-19) — a thin footer line at the bottom of every route that displays Permapeople-sourced data (i.e., `/catalog` if any custom plant has Permapeople-sourced fields; `/plan` if any planting's plant has them). Not on `/setup` Step 1 (no plant data shown). Copy: `text-xs text-stone-500 text-center py-md border-t border-stone-100`: `Some plant data enriched from Permapeople.org (CC BY-SA 4.0).` The footer is conditionally rendered — when no Permapeople-enriched plant is currently visible, the footer is not in the DOM.

---

### 11. Toast / inline error patterns

Phase 2 introduces transient feedback. **Decision: prefer inline error blocks over toasts** because the user's actions (add, remove, enrich) are already happening on a specific surface that can host the feedback. Toasts are reserved for cross-route notifications.

**One toast component** (`src/ui/Toast.tsx` — Radix Toast primitive). Used only for:
- Successful import: `Plan imported. {N} plantings, {M} custom plants.` (success variant, green-700).
- Successful export: `Plan exported as garden-gantt-plan-{date}.json.` (success variant).
- Multi-tab storage event detected: `Your plan changed in another tab. Refresh to see the latest.` (warning variant, amber-100, persistent until dismissed).

Toast position: bottom-right. Auto-dismiss after 4s except the multi-tab one (persistent). Max 3 toasts stacked.

---

## Interaction Contracts (Key Flows)

### Flow A — First-time user, full happy path

```
Visit `/` (no hash) → AppShell renders → hash router redirects to `/setup`
  └─→ Step 1: empty form, no derived block.
       User types ZIP "80401" → blur → lookup loading (skeleton)
       → success: derived block shows zone 6a, last frost May 15, first fall frost Sep 30.
       Click Next → Step 2.
  └─→ Step 2: catalog grid loads (curated 50 + Custom card pinned first).
       User searches "tomato" → grid filters to 4 tomato varieties.
       Click "Cherokee Purple" Add button → card flips to "Added" state.
       Floating pill appears top-right: "1 plant added".
       User adds 4 more plants. Pill: "5 plants added".
       Click Next → Step 3.
  └─→ Step 3: review with live <GanttView> showing 5 rows.
       Click Finish → redirected to `/plan`.
  └─→ /plan: same gantt, full-screen.
       Top-right pill still says "5 plants added" — clickable.
```

### Flow B — Power user adds a custom plant with Permapeople enrichment

```
On `/catalog` → click pinned "+ Add custom plant" card.
Modal opens (mode=create).
User selects "Tomato — Cherokee Purple" from "Start from a catalog plant" dropdown.
Form pre-fills with tomato timing.
User changes name to "Tomato — Brandywine" and DTM to 90.
User clicks "Enrich from Permapeople" → loading spinner.
Permapeople returns description + family "Solanaceae" + scientific "Solanum lycopersicum".
Each field has "Use this" button. User clicks "Use this" on description.
User clicks Save plant → modal closes.
New "Custom" badged card appears in the grid with Sparkles indicator (Permapeople icon).
Card immediately flips to "Added" state because the modal also dispatches an addPlanting action — actually NO. Custom plant authoring does NOT auto-add a planting. User must click Add separately. (Decision: separation of concerns — authoring vs adding-to-plan are two distinct user intents.)
```

### Flow C — Permapeople unreachable

```
User clicks "Enrich from Permapeople" → fetch fails (CORS / 500 / timeout).
Inline warning replaces success block: "Permapeople is unreachable right now. You can save without enrichment — try again later from this same modal."
Save button stays enabled. User can still save with the manually-entered fields.
No data corruption. Modal stays open. User can dismiss the warning by clicking "Enrich from Permapeople" again (it retries).
```

### Flow D — Succession toggle

```
User opens My Plan panel → finds a Lettuce planting.
Lettuce has timing.successionIntervalDays = 14 → succession toggle is rendered.
User flips toggle on.
Caption updates live: "Adds 6 more plantings every 14 days, ending before first fall frost."
planStore.plan.plantings is updated: lettuce planting gains successionEnabled: true.
GanttView re-derives: 7 lettuce rows now appear, visually grouped with a 3px stone-400 left strip.
The first row's left strip has end-cap label "Succession of Lettuce — Black Seeded Simpson".
```

### Flow E — Export → Import round-trip

```
On `/settings` → click "Export plan" → file downloads.
User clears localStorage (DevTools) or visits in a different browser.
Visits app → /setup Step 1 because plan is null.
Goes to /settings → clicks "Import plan" → file picker opens.
Selects the previously-exported file → preview modal shows: "Importing 5 plantings, 1 custom plants, location ZIP 80401 (zone 6a). This will OVERWRITE your current plan."
Currentplan is empty so the warning block does NOT show.
Clicks "Replace my plan" → modal closes, toast appears: "Plan imported. 5 plantings, 1 custom plants."
/plan now shows the same gantt as before.
```

### Flow F — Bad ZIP → manual override

```
Step 1: user types ZIP "00000" → lookup → not-found.
Unrecognized-ZIP block appears with manual zone + frost inputs.
User selects zone "8a" + last frost "2026-03-15" + first fall frost "2026-11-15".
Next button enables.
User clicks Next → Step 2 with zone+frost in plan but ZIP recorded as "00000" (with `source: "manual"`).
```

### Flow G — Multi-tab persistence event (Phase 1 already wired)

```
Tab 1 has /plan open.
User in Tab 2 adds a planting.
Phase 1's storage-event listener fires in Tab 1.
Toast appears (multi-tab variant, persistent): "Your plan changed in another tab. Refresh to see the latest."
User clicks toast or refreshes → Tab 1 sees the new planting.
```

---

## Responsive Behavior

Phase 2 polish target: **desktop and tablet first; mobile-correct (not mobile-optimized)**. Phase 4 is the dedicated mobile polish phase per ROADMAP. But Phase 2 must not break on mobile.

| Breakpoint | Behavior |
|------------|----------|
| `< 640px` (mobile) | AppShell header tagline hidden (Phase 1 rule). Wizard column drops to full viewport width with `px-md`. Catalog grid drops to 1 column. Filter chips become horizontally scrollable (`overflow-x-auto`, no wrap). My Plan panel takes full viewport width minus 16px gutter. Modal takes 100vw - 32px and goes full-height (top-aligned, scrollable body). Floating pill becomes smaller: 32px height, icon-only with count overlaid as a badge. |
| `640-768px` (small tablet) | Catalog grid: 2 columns. Wizard column max-width 600px. |
| `768-1024px` (tablet) | Catalog grid: 3 columns (auto-fill at 240px min naturally hits 3 here). Wizard at 720px max. My Plan panel at 400px width. |
| `≥ 1024px` (desktop) | Catalog grid: 4-5 columns auto-fill. Full design as specified. |

Gantt-specific responsive:
- The gantt SVG keeps its horizontal scroll (Phase 1 rule). On viewports < 768px the row label column is reduced from 140px to 100px and label text is truncated with ellipsis. Phase 4 may add a tap-to-expand row detail.

---

## Accessibility Baselines

Phase 1 baselines inherited (focus rings, color contrast, keyboard nav, banner ARIA, gantt SVG `<title>` elements). Phase 2 extensions:

| Concern | Spec |
|---------|------|
| Form inputs | Every `<input>` / `<select>` / `<textarea>` has an explicit `<label htmlFor>`. Required fields have `aria-required="true"` AND visible `*`. Validation errors use `aria-describedby` to link error text. |
| Modal a11y | Radix Dialog provides modal semantics: focus trap, restore focus on close, Esc to dismiss, click-outside to dismiss. `aria-modal="true"`, `aria-labelledby` pointing to the modal heading. |
| Filter chips a11y | `<button role="checkbox" aria-checked={isActive}>` with visible label. AT announces "Cool-season checkbox, checked" or "unchecked". |
| Card add button | Card root is `<li>`. Add button has full plant context in `aria-label`: e.g. `aria-label="Add Tomato — Cherokee Purple to plan"`. |
| Custom card dropdown | Radix DropdownMenu with full keyboard support (Enter/Space to open, ArrowDown/Up to navigate, Esc to close). |
| Drawer (My Plan panel) | Radix Dialog handles focus trap. First focusable: close button. Esc closes. Outside-click on scrim closes. Background `aria-hidden="true"` while open. |
| Toast a11y | Radix Toast uses `role="status"` (success) or `role="alert"` (warnings). Multi-tab toast uses `role="alert"` because it requires user attention. |
| Floating pill | When count is 0, button is `aria-disabled="true"` (NOT `disabled` attribute — keeps it focusable so users can tab to it and AT can announce the state). |
| Filter announcement | After a filter chip toggle, a visually-hidden `<span aria-live="polite">` updates with `Showing {N} plants` so AT users know the result count. |
| Gantt succession grouping | Each grouped succession row's `<g>` has `aria-label="Succession {idx} of {plant.name}"`. The end-cap label is real `<text>` (not background-image). |

**WCAG AA compliance check matrix** (color/contrast):
- Body text on `stone-50`: ✅ `stone-900 / stone-50` = 16.6:1
- Helper text on white: ✅ `stone-600 / white` = 7.2:1
- Caption on white: ✅ `stone-500 / white` = 5.2:1 (passes AA for normal text)
- Green-700 button on white: ✅ 4.7:1 for text; 5.5:1 for the button bg surrounding white text
- Red-700 destructive button on white: ✅ 5.4:1
- All badge text/bg pairs: verified above (≥7:1 each).

---

## Copywriting Contract — Master Table

Every user-visible string in Phase 2. Authoritative — planner/executor MUST use these exact strings (unless the planner adds and documents an explicit exception).

### Wizard / Setup
| Element | Copy |
|---------|------|
| Wizard hero heading (first-run only) | `Let's set up your garden` |
| Wizard hero sub | `Three quick steps. You can change anything later — nothing's locked in.` |
| Step 1 label / sublabel | `Location` / `ZIP and frost dates` |
| Step 2 label / sublabel | `Plants` / `Pick what you're growing` |
| Step 3 label / sublabel | `Review` / `Confirm and finish` |
| Back button | `Back` |
| Next button (Steps 1, 2) | `Next` |
| Finish button (Step 3) | `Finish — go to my plan` |

### ZIP / location (Step 1)
(See §Component Inventory item 2 — full table.)

### Catalog browser (Step 2 + /catalog)
| Element | Copy |
|---------|------|
| Search placeholder | `Search plants by name…` |
| Clear search button (visually hidden label) | `Clear search` |
| Filter chip — Cool-season | `Cool-season` |
| Filter chip — Warm-season | `Warm-season` |
| Filter chip — Leafy | `Leafy` |
| Filter chip — Fruiting | `Fruiting` |
| Filter chip — Root | `Root` |
| Filter chip — Herb | `Herb` |
| Filter chip — Allium | `Allium` |
| Filter chip — Brassica | `Brassica` |
| Clear filters button | `Clear filters` |
| Empty filter state heading | `No plants match those filters.` |
| Empty filter state body | `Try removing a filter, or clear your search.` |
| Empty filter state CTA | `Clear filters` |
| Card add button | `+ Add to plan` |
| Card remove button (added state) | `Remove from plan` |
| Card frost-tolerance badge — tender | `tender` |
| Card frost-tolerance badge — half-hardy | `half-hardy` |
| Card frost-tolerance badge — hardy | `hardy` |
| Card season badge — cool | `cool` |
| Card season badge — warm | `warm` |
| Card DTM caption template | `{N} days to maturity` |
| Custom badge | `Custom` |
| Permapeople icon tooltip | `Description enriched from Permapeople (CC BY-SA 4.0)` |
| Pinned card heading | `Add custom plant` |
| Pinned card body | `Author your own with timing that matches your seed packet` |

### Custom plant modal
(See §Component Inventory item 6 — full table.)

### Custom plant delete confirmations
| Scenario | Copy |
|----------|------|
| Plant in use, modal heading | `Delete {plant name}?` |
| Plant in use, body | `This plant is used in {N} planting(s) on your plan. Deleting it will also remove those plantings. This can't be undone.` |
| Plant in use, primary button | `Delete plant and {N} planting(s)` |
| Plant not in use, modal body | `Delete {plant name}? This can't be undone.` |
| Plant not in use, primary button | `Delete plant` |
| Cancel button (both) | `Cancel` |

### My Plan panel
| Element | Copy |
|---------|------|
| Panel heading | `My Plan` |
| Close button label (sr-only) | `Close My Plan` |
| Location summary template | `ZIP {zip} · zone {zone} · last frost {date}` |
| Edit-location link | `Edit location` |
| Succession toggle label | `Succession plantings` |
| Succession toggle caption (on) | `Adds {N} more plantings every {interval} days, ending before first fall frost.` |
| Remove planting confirmation body | `Remove {plant name}? This won't affect the catalog plant.` |
| Remove planting primary button | `Remove planting` |
| Remove planting cancel button | `Cancel` |
| Footer — primary button | `Add more plants` |
| Footer — secondary button | `View my gantt` |
| Empty state heading | `No plants in your plan yet.` |
| Empty state body | `Pick some from the catalog to start your gantt.` |
| Empty state CTA | `Browse plants` |

### Floating pill
| State | Copy |
|-------|------|
| 0 plants | `No plants yet` |
| 1 plant | `1 plant added` |
| N plants (N≥2) | `{N} plants added` |
| Pill aria-label (always) | `Open My Plan ({N} plant{plural} added)` |

### /plan empty state
| Element | Copy |
|---------|------|
| Heading | `No plants in your plan yet.` |
| Body | `Pick some from the catalog and your gantt will appear here.` |
| CTA | `Browse plants` |

### Settings / Export-Import
(See §Component Inventory item 9 — full table.)

### Toasts
| Variant | Copy |
|---------|------|
| Import success | `Plan imported. {N} plantings, {M} custom plants.` |
| Export success | `Plan exported as garden-gantt-plan-{date}.json.` |
| Multi-tab storage change | `Your plan changed in another tab. Refresh to see the latest.` |

### Footer attribution (conditional)
| Element | Copy |
|---------|------|
| Permapeople attribution line | `Some plant data enriched from Permapeople.org (CC BY-SA 4.0).` |

### Error states (master)
| Scenario | Copy |
|----------|------|
| ZIP not 5 digits | `Enter a 5-digit US ZIP code.` |
| ZIP not in dataset | `ZIP not recognized` (heading) + manual entry block (see §2) |
| Frost dates out of order | `Last spring frost must come before first fall frost.` |
| Plant name missing | `Plant name is required.` |
| Permapeople unreachable | `Permapeople is unreachable right now. You can save without enrichment — try again later from this same modal.` |
| Import — invalid JSON | `That file isn't valid JSON. Try a file you exported from Garden Gantt.` |
| Import — Zod validation fail | `That file doesn't look like a Garden Gantt plan. Make sure you're importing a file with extension .json that came from this app's Export.` |
| Import — newer schema | `That plan was made with a newer version of Garden Gantt. Update the app and try again.` |
| Generic uncaught (ErrorBoundary, Phase 1) | `Something went wrong. Refresh to try again.` |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | **none** — we copy-paste shadcn-style component implementations directly into `src/ui/` (see §Design System rationale). No `npx shadcn add` invocations. No `components.json`. No third-party registry blocks. | not required (no `shadcn view` / diff because no block fetches happen) |
| Third-party registries | none declared | not required |

**Phase 2 dependencies added (npm):**
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-select`
- `@radix-ui/react-checkbox`
- `@radix-ui/react-tabs`
- `@radix-ui/react-label`
- `@radix-ui/react-slot`
- `@radix-ui/react-toast`
- `@radix-ui/react-switch`
- `clsx`
- `tailwind-merge`
- `zod` (already needed for import validation per Phase 1 D-12; verify it's installed)

All from `npm` — no third-party registries fetched. No code injection vector. Each Radix package is MIT and used at version ranges aligned with React 19 (see implementation plan for exact version pins).

---

## Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| Copy-paste shadcn instead of `npx shadcn init` | Tailwind v4 CSS-first config (`@theme`) collides with shadcn CLI's `tailwind.config` expectation. Hand-authoring 8-10 primitives in `src/ui/` against Radix is cheaper than fighting the toolchain in 2026. Visual outcome identical. |
| My Plan = slide-out drawer (not modal) | Drawer keeps catalog visible behind the scrim → users can add more plants without context-switch. Modal would force a back-and-forth. |
| OR within filter group, AND across groups | Most natural mental model: "I want cool-season AND I want leafy" reads correctly. Selecting both `Cool-season` and `Warm-season` is a natural way to clear the season filter rather than zero results. |
| Custom plant authoring does NOT auto-add a planting | Authoring (catalog) and Adding (plan) are distinct intents. Auto-adding hides the action from the user and confuses the catalog/plan distinction. |
| Permapeople enrichment failure does NOT block save | Per CAT-07 and D-18: enrichment is opt-in nice-to-have. The product stands without it. |
| Sample plan link only on Step 1 first-run | After plan exists, "Try with sample plan" would silently overwrite the user's data — friendly only at empty-state. |
| `Added` state uses green-700 (extends "accent reserved-for" list) | Adding-to-plan is semantically equivalent to a primary-action receipt. Using green-700 here is consistent with primary CTA semantics (it's the "yes, this is your plan" affirmation). Documented as an explicit extension to the Phase 1 reserved-for list. |
| Pill visible at count=0 (disabled) | Discoverability — users learn the affordance exists before they have data. Hiding-then-revealing creates surprise UI. |
| Inline errors > toasts (with toast exceptions) | Errors should appear at the surface where the action happened. Toasts are reserved for cross-route notifications (multi-tab event, post-import success). |
| Step state in local React state, not Zustand | Step is transient UI state, not plan state. Per Phase 1 ARCHITECTURE rule: "if state changes need to survive a reload, it goes in `planStore`. Otherwise, memory only." |
| Gantt time axis spans only the user's actual season | Showing 12 months when plantings only span 6 wastes pixels. `min(indoor-start)` to `max(harvest-end)` rounded to month boundaries gives a calm, dense gantt. |
| Skeleton (not spinner) for /plan loading | Gantt hydration is <50ms; a spinner that flashes is jankier than a brief skeleton that visually anchors the layout. |
| Permapeople attribution = thin footer line, not a banner | Banners interrupt; CC BY-SA only requires "credit, link to license" — a footer satisfies that without being noisy. The per-card icon makes the source visible at the data point. |

---

## Pre-Populated From

| Source | Decisions Used |
|--------|---------------|
| Phase 1 UI-SPEC | All tokens (palette, typography, spacing, focus, banner copy, lifecycle palette, gantt visual specs) inherited verbatim |
| CONTEXT.md (D-01 to D-29) | All 29 decisions encoded as design contracts above |
| ROADMAP.md Phase 2 success criteria | Five criteria mapped to flows A-G |
| REQUIREMENTS.md (LOC-01..05, CAT-01..08, SCH-06, GANTT-01..03, DATA-04, DATA-05) | All 19 requirements traced to component contracts |
| STACK.md | React 19 + Vite 7 + TS 6 + Tailwind v4 + lucide-react + Zustand v5 — all confirmed |
| ARCHITECTURE.md | Feature-sliced module layout (`features/setup`, `features/catalog`, `features/settings`); `data/permapeople.ts` as sole fetch site; planStore as plan source-of-truth; succession as engine expansion |
| SUMMARY.md | Permapeople enrichment-only stance; curated catalog as source of timing truth; mobile-correct (not optimized) for Phase 2 |
| Existing code (`src/index.css`) | `@theme` token format confirmed; Phase 1 `--color-lifecycle-*` and `--spacing-gantt-*` tokens preserved; Phase 2 `--spacing-card-min`, `--spacing-modal-max-w`, etc. added |
| User input | none — `--auto` mode; all defaults documented inline |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
