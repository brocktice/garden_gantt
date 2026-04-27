# Phase 4: Polish, Mobile & Ship - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

The gap between "technically works" and "I'd recommend this to my gardening friend." Phases 1–3 shipped a correct schedule engine, real ZIP/catalog data, drag-cascade-lock-undo, calendar view, and a Today/This Week/Overdue task dashboard. Phase 4 makes the result mobile-usable, onboarded, error-resilient, accessible, durable (export-reminder), and live on the public internet via Cloudflare Pages CI/CD.

**In scope:**
- Mobile-responsive layout via a 640px breakpoint: phones get tap-to-edit modal + horizontal-scroll gantt with sticky plant-name column; CAL-04 default-to-calendar uses same threshold (POL-01, CAL-04)
- First-visit coach marks on `/plan` only (catalog button, drag affordance, lock toggle, calendar tab) with persisted `coachMarksDismissed` flag and a "Reset onboarding" button in Settings (POL-02)
- Real empty states across plan, tasks, day-detail drawer, catalog filter result — action-first terse copy (POL-03)
- Real error states inline near the input/action — bad ZIP, Permapeople fail, corrupt import, localStorage-full sticky banner (POL-04)
- Real loading states — skeletons for catalog + ZIP-derive results, spinner button for Permapeople enrichment (POL-05)
- Destructive actions split — toast-with-undo for reversible (delete planting, delete custom task), modal-confirm for irreversible (clear plan, overwrite-on-import, delete custom plant) (POL-06)
- 60fps verification on a 200-event stress fixture; rAF + memoized selectors from Phase 3 already in place (POL-07)
- Keyboard accessibility including Linear-style keyboard drag fallback (focus + arrows ±1d / shift+arrows ±7d / L lock / Esc cancel) (POL-08)
- WCAG AA color-contrast audit + token tweaks; `--lifecycle-locked` from Phase 3 D-12 must pass against all phase fills (POL-09)
- Export-reminder banner with edit-count + age trigger, snooze controls, bookkeeping in `uiStore` (POL-10)
- Cloudflare Pages deploy with hashed assets and uncached `index.html` (DEPLOY-01, DEPLOY-03)
- ConstraintTooltip a11y plumbing (already portaled per Phase 3 D-10) — `aria-live="polite"`, Esc-dismiss, tab-focusable

**Out of scope:**
- Touch drag on phones (explicit deferral — phone path is tap-to-edit modal per D-01)
- Pinch-zoom on the gantt (D-04 — fixed day-width + horizontal scroll only)
- Tutorial overlays beyond `/plan` (Tasks + Calendar self-explain via empty states)
- Starter-pack picker / pre-bundled plant lists (rejected during onboarding discussion — empty-state CTA + coach marks suffice)
- Themed/cute empty-state copy (D-12 — terse action-first only)
- Live drag interactions on the calendar view (Phase 3 already deferred this; not revisited here)
- Custom domain registration (planner can wire if user supplies one; not required for share-worthy v1)
- PWA / service worker / offline-first (PROJECT.md POWER-V2-03)
- Print stylesheet / PDF export (PROJECT.md SHARE-V2-01/02)
- Bulk task multi-select (Phase 3 D-34 explicit deferral; not revisited)
- Per-PR preview deploys (planner's call; not required by DEPLOY-01)

</domain>

<decisions>
## Implementation Decisions

### Mobile drag/edit model

- **D-01:** Mobile breakpoint is **640px** (Tailwind `sm`). Below 640px = phone behavior; 640+ = desktop behavior. Same breakpoint drives CAL-04 default-to-calendar via the URL-param check already designed in Phase 3 D-28. Tablets (iPad portrait at 768px) get the full desktop experience including drag.
- **D-02:** Phone (<640px) uses a **tap-to-edit modal**, not touch drag. Tap a bar → modal opens with: date pickers for the bar's start (and end for `harvest-window`), lock toggle, and delete-planting button. Cascade preview is rendered as a text summary inside the modal (e.g., "Moves harvest to Aug 12") — no live ghost overlay on phones. Desktop/tablet keeps full @dnd-kit drag (Phase 3 unchanged). Avoids touch+long-press conflicts on the gantt's horizontally-scrolling layout and ships faster.
- **D-03:** Lock toggle on phones lives **inside the edit modal** as a row alongside dates. The filled-lock indicator on the bar (Phase 3 D-12) still renders for at-a-glance status. Alt-click + hover-revealed lock icon stay desktop-only — they don't degrade gracefully to touch and the modal already covers the gesture. The Phase 3 carry-forward "tap-and-hold equivalent" is therefore mooted.
- **D-04:** Phone-landscape gantt: **horizontal scroll, fixed day-width**. Keep existing day-width tokens unchanged. Add a sticky plant-name column (left-side `position: sticky`) so plant context survives horizontal scroll. No pinch-zoom on the gantt SVG. "Readable in landscape" (POL-01) means the user can horizontally scroll a season-axis with their plant labels still visible.

### Onboarding

- **D-05:** Coach marks on the **first visit to `/plan`** only. Marks point at: (a) the "Add plants" / catalog button, (b) drag affordance on a bar, (c) lock-toggle on a bar, (d) the Calendar view tab. Dismissible. Tasks dashboard and Calendar self-explain via empty states (D-12) — no coach marks there. **No starter-pack picker** in the wizard (rejected during discussion — keep onboarding cleanup-scoped, not flow-additive).
- **D-06:** Onboarding flags live in **uiStore + persist** under `onboarding: { coachMarksDismissed: boolean }`. Survives reload. Settings gains a **"Reset onboarding"** button that flips `coachMarksDismissed` back to `false` (for QA, demoing, or sharing the app with someone). No plan-schema bump.
- **D-07:** Settings **"Clear plan"** re-triggers the SetupWizard on the next mount (existing wizard is the canonical first-run flow). Coach marks do **not** re-show automatically when the plan is cleared — they're learned-once. The separate "Reset onboarding" button is the affordance for re-arming them.

### Empty / error / loading / confirm patterns

- **D-08:** Loading states — **skeletons** for catalog grid (pulse cards in the grid layout) and ZIP-derive results (inline pulse on the lookup result row). **Spinner button** for Permapeople enrichment fetch (the only remaining async hot path at user level — small spinner inside the "Enrich" button replacing the icon). All three reuse Tailwind utilities; no new component primitive needed beyond a reusable `<Skeleton>`.
- **D-09:** Destructive actions split:
  - **Toast-with-undo (~5s)** for reversible ops: delete planting, delete custom task, clear completed-task ids, hide an event. Toast shows "Deleted Cherokee Purple. Undo" — clicking Undo dispatches `temporal.getState().undo()`. zundo Cmd-Z remains available as a second safety net.
  - **Modal-confirm** (existing `Dialog` primitive) for irreversible/transitive ops: clear entire plan, overwrite-on-import, delete custom plant (catalog-level, transitive references in plantings).
- **D-10:** Errors **inline near the input/action**:
  - Bad ZIP → red helper text under ZIP input (`<Input>`'s error variant)
  - Permapeople fetch fail → inline pill on the enrichment row: "Couldn't fetch — try again"
  - Corrupt JSON import → inline error in the import preview modal; current state untouched (per existing DATA-07)
  - localStorage full → **sticky top banner** reusing the Phase 1 iOS Private Browsing banner pattern; copy: "Storage full — export your plan to free space."
- **D-11:** Empty-state copy is **action-first, terse**: one sentence + one button. No themed/cute language. Surfaces:
  - Empty plan (gantt + calendar) → "No plants yet." + "Add your first plant →"
  - Empty tasks dashboard → "No tasks today." (no CTA — auto-tasks appear when plantings exist)
  - Empty day-detail drawer → "Nothing scheduled."
  - Empty catalog filter result → "No matches." + "Clear filters"

### Export-reminder UX

- **D-12:** Reminder triggers when **(a) `dirtySinceExport >= 20`** OR **(b) `(now - lastExportedAt) >= 14 days` AND `dirtySinceExport > 0`**. No edits = no nagging. Pairs to actual data-loss risk — quiet plans don't pay storage-loss tax until they actually risk losing edits.
- **D-13:** Reminder appears as a **non-blocking banner above main content** (slim row above AppShell content area). Copy: "You have {N} unsaved changes since {date}." Actions: `[Export plan]` `[Remind me later]` `[Don't remind for 30 days]`. Dismissal sets `snoozedUntil = now + N days`; banner re-appears once both `snoozedUntil` has elapsed AND a threshold is met again.
- **D-14:** **Coarse dirty-edit counting**. Increment `dirtySinceExport` only on schema-level mutations: `commitEdit` (drag commit / ScheduleEdit append), `addPlanting`, `removePlanting`, `editPlanting`, custom plant CRUD, custom task CRUD, location override changes. **Do NOT count**: task completion toggles (TaskCompletion CRUD), lock toggles (Planting.locks), and undo/redo (zundo replays don't represent new edits). Wire via dedicated setters in `planStore` rather than a generic persist hook.
- **D-15:** Bookkeeping lives in **uiStore + persist**: `exportReminder: { lastExportedAt: string | null, dirtySinceExport: number, snoozedUntil: string | null }`. No plan-schema bump. `exportPlan()` (existing in `src/features/settings/exportPlan.ts`) gets a side-effect after successful download: `setLastExportedAt(nowISOString())` + `resetDirtyCounter()`.

### Claude's Discretion (planner picks during planning)

- **POL-07 verification method** — manual checkpoint with a 200-event stress fixture + DevTools Performance trace is the obvious choice given Phase 3 already shipped rAF throttling + memoized per-bar selectors. Planner picks fixture shape (e.g., 40 plantings × 5 events each) and writes the checkpoint test plan.
- **POL-08 keyboard drag implementation** — Linear-style was named as the documented target in Phase 3 specifics. Planner picks roving-tabindex layout, focus-ring style, screen-reader announcements (`aria-live`), and how committed/cancelled keyboard drags integrate with zundo (single history entry on Enter-commit, no entry on Esc-cancel).
- **POL-09 WCAG AA audit** — planner picks audit tool (axe-core CLI vs Lighthouse vs manual contrast checker). Token tweaks land in `src/index.css @theme`; `--lifecycle-locked` from Phase 3 D-12 must pass against every lifecycle-phase fill it can ring.
- **DEPLOY-01 wiring** — Cloudflare Pages git integration on push to `main` is the simplest path (matches D-15 of `.planning/research/STACK.md`). Planner decides whether GitHub Actions + Wrangler is needed instead (only if preview deploys per PR or env var injection are required). Production env: `npm run build` outputs `dist/` directly.
- **DEPLOY-03** — Vite already hashes JS/CSS assets by default; uncached `index.html` is one `public/_headers` rule (`/index.html\n  Cache-Control: no-cache, no-store, must-revalidate`). Planner adds.
- **ConstraintTooltip a11y plumbing** — already portaled (Phase 3 D-10). Planner adds `aria-live="polite"`, Esc-dismiss handler at portal root, tab focus stop on the pill, and screen-reader-only summary text duplicating the visible reason.
- **Modal copy/shape for tap-to-edit** — planner picks date-picker control (native `<input type=date>` vs a custom day-grid). Native `<input type=date>` is the boring correct choice on phones (system pickers are great).
- **Toast UX details** — exact undo timeout (5s default in D-09), animation, position (top-right vs bottom-center). Existing `<Toast>` primitive defines the surface.
- **Coach-mark visual style** — speech-bubble vs dotted-line callout vs Linear-style numbered hotspots. Planner picks; should match existing Tailwind v4 token system.
- **Sticky plant-name column width** at <640px (D-04) — likely 96–120px; planner tunes against actual phone screenshot QA.
- **Skeleton component variants** (D-08) — planner decides if one `<Skeleton>` with shape props is enough or if catalog/zip get separate purpose-built variants.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Core value (ZIP + plants → correct draggable gantt), single-user no-backend constraint, **share-worthy polish target** (the bar Phase 4 must clear).
- `.planning/REQUIREMENTS.md` — Phase 4 requirement IDs: POL-01..10, DEPLOY-01, DEPLOY-03, CAL-04. Note POL-02 specifies "first-run onboarding walks new users from blank slate to first gantt without dead ends."
- `.planning/ROADMAP.md` §Phase 4 — 6 success criteria; dependency on Phase 3.

### Phase 1 outputs (locked — engine + persistence boundary preserved)
- `.planning/phases/01-foundation-schedule-engine/01-CONTEXT.md` — Persistence boundary (only `src/data/storage.ts` touches `localStorage`), iOS-Safari Private Browsing banner pattern (reusable for D-10 storage-full case).
- `.planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md` — Locked palette, typography, spacing tokens. Phase 4 token tweaks for WCAG AA must respect this.
- `.planning/phases/01-foundation-schedule-engine/01-VERIFICATION.md` — Phase 1 file inventory.

### Phase 2 outputs (locked — first end-to-end live)
- `.planning/phases/02-data-layer-first-end-to-end/02-CONTEXT.md` — D-22..D-26 gantt rendering decisions; SetupWizard flow (D-08-ish), exportPlan/importPlan modules.
- `.planning/phases/02-data-layer-first-end-to-end/02-VERIFICATION.md` — Catalog at 50 plants, succession, custom plants, Permapeople optional, JSON export/import live.
- `.planning/phases/02-data-layer-first-end-to-end/02-CORS-SPIKE.md` — Permapeople fetches go through Cloudflare Worker proxy (matters for D-10 error inline-pill copy: "Couldn't fetch" applies whether direct or proxied).

### Phase 3 outputs (locked — interactions in place; Phase 4 polishes them)
- `.planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md` —
  - **D-09, D-10** — ConstraintTooltip portaled, Phase 4 wires `aria-live` + Esc-dismiss without restructuring.
  - **D-12** — `--lifecycle-locked` token must pass WCAG AA contrast (D-09 here).
  - **D-14..D-18** — zundo middleware: toast-with-undo (D-09 here) wires `temporal.getState().undo()` directly.
  - **D-27, D-28** — `?view=calendar` URL param + matchMedia hint already designed for one-line CAL-04 wiring.
  - **D-32..D-37** — Tasks dashboard already shipped Today/This Week/Overdue partitioning; Phase 4 adds empty-state copy (D-11 here).
- `.planning/phases/03-drag-cascade-calendar-tasks/03-VERIFICATION.md` — Phase 3 actual end state (drag, cascade, calendar tabs, task dashboard, lock UI, undo/redo).
- `.planning/phases/03-drag-cascade-calendar-tasks/03-UI-SPEC.md` — Drawer/tab/tooltip tokens; Phase 4 must not duplicate.

### Stack & architecture
- `.planning/research/STACK.md` — React 19 + Vite 7 + TS 6 + Zustand v5 + date-fns v4 + Tailwind v4 + FullCalendar 6.1 + zundo + @dnd-kit/core. **Cloudflare Pages** locked for hosting (D-15 in STACK).
- `.planning/research/ARCHITECTURE.md` — Pure-function domain core; persistence boundary; one-write-rule.
- `.planning/research/PITFALLS.md` — Pitfalls 7/8/9 (DST/year-rollover/UTC-noon) still apply during stress-fixture construction (POL-07).
- `.planning/research/SUMMARY.md` — Resolved conflicts.

### A11y references (POL-08, POL-09)
- WCAG 2.1 AA color-contrast: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum
- WCAG 2.5.5 target size (AAA but Phase 3 D-11 already wraps lock icon in 24×24 hit-target)
- Linear's keyboard drag pattern (the "documented target" referenced by Phase 3 specifics §5)
- React 19 `aria-live` semantics for the constraint tooltip pill

### Deploy (DEPLOY-01, DEPLOY-03)
- Cloudflare Pages git integration: https://developers.cloudflare.com/pages/configuration/git-integration/
- `_headers` file syntax for Cloudflare Pages: https://developers.cloudflare.com/pages/configuration/headers/
- Vite asset hashing (default behavior): https://vite.dev/guide/assets

### Reusable Tailwind / Radix components
- Existing primitives: `src/ui/{Button,Card,Dialog,Input,Label,Select,Switch,Toast,Badge,DropdownMenu}.tsx`
- Phase 3 added: `ConstraintTooltip`, `DayDetailDrawer`, `LockToggle`, `CustomTaskModal`, `PlanViewTabs`, `EmptyGanttState`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/Banner.tsx` — Already implements iOS Private Browsing banner. **Extend** with new variants for D-10 (`storage-full`) and D-13 (`export-reminder`) instead of building parallel banner systems.
- `src/ui/Toast.tsx` (Radix Toast) — Used for D-09 toast-with-undo. Toast already exists; Phase 4 adds an `action` slot and `undo` callback wiring to `temporal.getState().undo()`.
- `src/ui/Dialog.tsx` — Used for D-09 modal-confirm of irreversible ops. Already battle-tested across Phase 2/3 modals.
- `src/features/settings/exportPlan.ts` — Phase 4 wires post-download side-effect (D-15: `setLastExportedAt(nowISOString())` + `resetDirtyCounter()`).
- `src/features/settings/importPlan.ts` + `ImportPreviewModal.tsx` — Existing import preview is the surface for D-10 inline corrupt-import errors.
- `src/features/setup/SetupWizard.tsx` — Existing first-run flow; Phase 4 does NOT add steps. POL-02 onboarding gap is closed by coach marks (D-05) on `/plan`, not by adding wizard steps.
- `src/features/setup/lookupLocation.ts` — Already returns success + error; Phase 4 wires the error path to D-10 inline ZIP error.
- `src/features/gantt/GanttView.tsx` — Phase 4 wraps the SVG in a sticky-column-aware `<div>` for D-04 (mobile horizontal scroll + sticky plant-name column).
- `src/features/gantt/EmptyGanttState.tsx` — Already exists; Phase 4 retunes copy per D-11 ("No plants yet." + "Add your first plant →").
- `src/features/calendar/CalendarView.tsx` — Phase 4 routes a 640px viewport check at AppShell mount time to set `?view=calendar` default per Phase 3 D-28.
- `src/features/tasks/TasksDashboard.tsx` — Add empty-state copy per D-11 ("No tasks today.") for the case where there are no plantings + no custom tasks.
- `src/features/calendar/DayDetailDrawer.tsx` — Add empty-state copy per D-11 ("Nothing scheduled.").
- `src/stores/uiStore.ts` — Phase 4 extends with `onboarding: { coachMarksDismissed: boolean }` (D-06) and `exportReminder: { lastExportedAt, dirtySinceExport, snoozedUntil }` (D-15). Both persisted via Zustand persist already wired.
- `src/stores/planStore.ts` — Phase 4 adds dirty-counter increment hooks inside coarse setters per D-14. zundo middleware unchanged.
- `src/app/AppShell.tsx` — Phase 4 mounts the export-reminder banner here (D-13). Single mount-point above main route content.
- `src/app/PlanViewTabs.tsx` — Phase 4 adds the matchMedia-based default-view selection per Phase 3 D-28 (CAL-04).

### Established Patterns (must respect)
- **Persistence boundary** — only `src/data/storage.ts` touches `localStorage`. D-15 export-reminder bookkeeping rides existing uiStore persist; no new I/O site.
- **Pure-function domain core** — Phase 4 adds **zero** domain code. All polish is in the imperative shell.
- **ESLint `no-restricted-syntax` for raw `new Date()`** — keep allowlist as-is. New `<input type=date>` parsing in the tap-to-edit modal must use `dateWrappers.ts`.
- **Atomic commits via `gsd-sdk query commit`** — Phase 4 plans land as small atomic commits per slice (mobile, onboarding, states-and-confirms, export-reminder, a11y, deploy).
- **Tailwind v4 `@theme` tokens in `src/index.css`** — any new tokens for skeleton pulse, banner colors, or a11y-tweaked lifecycle palette go here.
- **Feature-sliced UI** — new `src/features/onboarding/CoachMarks.tsx`, `src/features/mobile/EditPlantingModal.tsx`. Polish primitives `src/ui/Skeleton.tsx`, `src/ui/Banner.tsx` (or extend `src/app/Banner.tsx`).
- **`coachMarksDismissed` flag** is a single boolean, not a per-mark map (D-05) — first dismissal kills the whole set.

### Integration Points
- **Banner stack** — only ONE banner visible at a time. Priority: storage-full > iOS Private Browsing > export-reminder. Implement as a stack with priority-sort + render-top-only, OR pick the first qualifying banner per render. Planner decides; spec note here so multiple banners don't pile up.
- **Toast vs ConstraintTooltip vs Banner** — three distinct surfaces:
  - Toast = transient feedback for user actions (D-09 undo)
  - ConstraintTooltip = drag-time inline pill (Phase 3)
  - Banner = persistent app-state notice (D-10/D-13)
- **Cmd-Z + toast-undo coexist** — both call `temporal.getState().undo()`. No state divergence concern.
- **Mobile breakpoint logic** lives in **one** place: a `useIsMobile()` hook reading `window.matchMedia('(max-width: 639px)')` (640px Tailwind sm breakpoint, exclusive). Hook is the single source of truth for D-01, D-04, CAL-04, D-03 (mobile lock placement).
- **Cloudflare Pages config** — `public/_redirects` already exists for hash-router fallback (Phase 1). Phase 4 adds `public/_headers` for index.html no-cache rule.

### New Modules Phase 4 Adds
- `src/features/mobile/EditPlantingModal.tsx` — D-02 tap-to-edit modal with date pickers + lock toggle + delete button.
- `src/features/mobile/useIsMobile.ts` — single-source matchMedia hook (640px breakpoint).
- `src/features/onboarding/CoachMarks.tsx` — D-05 portal-mounted overlay with 4 numbered marks + dismiss.
- `src/features/onboarding/useCoachMarks.ts` — controller hook reading `uiStore.onboarding.coachMarksDismissed`, ref-tracking targets.
- `src/features/export-reminder/ExportReminderBanner.tsx` — D-13 banner; reads `uiStore.exportReminder` selectors.
- `src/features/export-reminder/useExportReminder.ts` — selector that computes "should show" from D-12 thresholds.
- `src/ui/Skeleton.tsx` — D-08 reusable pulse component (or per-shape variants).
- `src/ui/SkipToMain.tsx` — POL-08 a11y skip link in AppShell.
- `src/features/keyboard-drag/useKeyboardBarDrag.ts` — POL-08 Linear-style focus + arrow keys + L + Esc; planner sketches the interface.
- `src/app/StorageFullBanner.tsx` (or extend Banner.tsx) — D-10.
- `tests/fixtures/200-event-stress.ts` — POL-07 stress fixture for the perf checkpoint.
- `public/_headers` — DEPLOY-03 index.html no-cache rule.
- (Possibly) `.github/workflows/deploy.yml` — DEPLOY-01 only if planner picks GH Actions + Wrangler over CF Pages git integration.

</code_context>

<specifics>
## Specific Ideas

- **640px is the single magic number** — D-01, D-04, CAL-04 default-to-calendar (Phase 3 D-28), and D-03 (mobile lock placement) all key off `(max-width: 639px)`. One `useIsMobile()` hook, no scattered `matchMedia` calls. Phase 3 already designed this; Phase 4 just implements it.
- **Phone tap-to-edit modal scope** — date pickers (start; end for harvest-window only), lock toggle row, and a Delete planting button at the bottom (kicks back through D-09 toast-with-undo). Cascade preview is a text summary ("Moves harvest to Aug 12") not a visual ghost. Keeps the modal responsive on small viewports without rebuilding ghost-overlay rendering for touch.
- **Coach marks dismissal model** — single boolean, single dismissal. Once user dismisses ONE mark (or hits "Got it"), the entire set is gone. Don't model this as per-mark dismissal — the user said no to per-route coach-marks for the same simplicity reason.
- **"Reset onboarding" button in Settings** is the only re-armament path. Important for QA and for when the user shares the URL with a friend on the same browser ("let me show you what new users see").
- **Wizard re-trigger on Clear plan but NOT on Reset onboarding** — these are deliberately separate. Clear plan = "I want to start over with my data." Reset onboarding = "I want to see the tutorial again." Don't conflate.
- **Toast-with-undo wires to zundo, not a separate undo log** — single source of truth. Toast dispatches `temporal.getState().undo()`. This means any undo-able op already integrated with zundo (drag-commit, planting CRUD, lock toggle, custom-task CRUD per Phase 3 D-15) is automatically eligible for toast-with-undo treatment.
- **Modal-confirm for clear-plan / overwrite-on-import / delete-custom-plant only** — these are either irreversible or transitive (deleting a custom plant removes its plantings; overwrite import discards everything; clear plan is the user's biggest panic-button). Everything else is toast-with-undo.
- **Inline ZIP error reuses existing `<Input>` error variant** — Phase 2 already shipped Input with error styling; Phase 4 wires the bad-ZIP path to set the error prop on ZipInput. No new component.
- **localStorage-full banner reuses iOS Private Browsing banner pattern** — Phase 1 already shipped the storage-probe and a non-blocking banner for quota=0. Phase 4 adds a second variant for quota-exceeded mid-session (catch in the persist `onError` or wrap setItem with try/catch and surface).
- **Coarse dirty-edit counting** — increment ONLY in setter functions for plan-schema-meaningful ops. Concrete list to wire in `planStore.ts`:
  - `commitEdit` (drag commit) → +1
  - `addPlanting`, `removePlanting`, `editPlanting` → +1 each
  - `addCustomPlant`, `editCustomPlant`, `removeCustomPlant` → +1 each
  - `addCustomTask`, `editCustomTask`, `removeCustomTask` → +1 each
  - `setLocation`, `setLastFrostOverride`, `setFirstFrostOverride` → +1 each
  - `setLock` (lock toggle) → **0** (intentionally not counted — reversible, not a real edit)
  - `toggleTaskCompletion` → **0** (transient)
  - `temporal.undo()` / `redo()` → **0** (zundo replay)
- **Export-reminder banner snooze copy** — "Remind me later" = snooze 3 days; "Don't remind for 30 days" = snooze 30 days. Banner re-appears once both `snoozedUntil < now` AND a threshold (D-12) is still met.
- **No PWA / service worker** for v1 (PROJECT.md POWER-V2-03). Cloudflare Pages serves uncached `index.html` (D-DEPLOY-03), hashed assets (Vite default). Stale-cache concern is handled by HTTP caching, not a service worker.
- **Modal date pickers use native `<input type=date>`** — system pickers on iOS/Android are excellent and already meet WCAG. Don't roll a custom day-grid.
- **Stress fixture for POL-07**: 40 plantings × ~5 events each = ~200 events. Use existing samplePlan as scaffold; multiply via succession + custom plants. Live in `tests/fixtures/200-event-stress.ts`.

</specifics>

<deferred>
## Deferred Ideas

- **Touch drag on phones** — explicitly rejected for Phase 4. v1.1 may revisit if user feedback after share-out demands it.
- **Pinch-zoom on the gantt** — explicitly rejected (D-04). v1.1 if feedback demands.
- **Starter-pack picker** ("Salsa garden", "Salad garden", etc.) — rejected during onboarding discussion. Could ship in v1.1 as catalog feature without changing wizard flow.
- **Per-route coach marks** (Tasks, Calendar) — rejected; tasks + calendar self-explain. Revisit if first-user feedback shows confusion.
- **Single first-session tour** (gantt → calendar → tasks sequenced walkthrough) — rejected for scope.
- **PWA / installable web app + service worker** — PROJECT.md POWER-V2-03; v2 milestone after Phase 4 ships.
- **Print stylesheet + PDF export** — PROJECT.md SHARE-V2-01/02; v2 milestone.
- **Multi-frost-source / per-bed frost overrides** — PROJECT.md POWER-V2-02; v2.
- **Custom domain registration / DNS** — out of v1 scope. Planner can wire if user supplies; not blocking for share-worthy.
- **Per-PR preview deploys** — Cloudflare Pages git integration provides these by default if the repo is GitHub-connected; planner enables or disables based on noise tolerance. Not a Phase 4 hard requirement.
- **Ad networks / 3rd-party analytics** — PROJECT.md Out of Scope; never.
- **"Completed N of M this week" stat on tasks dashboard** — Phase 3 deferred to v1.1.
- **Section "show more" / collapse for overflowing dashboard sections** — Phase 3 deferred unless trivial.
- **Tooltip with frost-date uncertainty band** (translucent ±2-week axis band at frost markers) — Phase 4-eligible polish but discretionary; planner picks if scope allows.
- **Bulk task multi-select** — Phase 3 D-34 explicit deferral; not revisited.
- **Themed/cute empty-state copy** — rejected (D-11).
- **Per-mark coach mark dismissal granularity** — rejected (D-05 / specifics: single dismissal kills the set).

</deferred>

---

*Phase: 04-polish-mobile-ship*
*Context gathered: 2026-04-27*
