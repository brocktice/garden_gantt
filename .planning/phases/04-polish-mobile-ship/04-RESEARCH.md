# Phase 4: Polish, Mobile & Ship - Research

**Researched:** 2026-04-27
**Domain:** Mobile-responsive polish + a11y audit + onboarding/empty/error/loading states + export-reminder UX + Cloudflare Pages CI/CD
**Confidence:** HIGH (stack & integration points verified against repo; deploy verified against Cloudflare docs)

## Summary

Phase 4 is mostly **integration work over an already-locked stack** — no new framework, no new heavy dependency, and (per CONTEXT) no domain-core changes. The discuss phase produced a tight set of design decisions that pin most ambiguity down. The remaining research questions break into five clusters: (1) wiring `uiStore` to Zustand `persist` middleware (it is currently memory-only — D-06 and D-15 require persistence; this is a structural change, not a one-line patch); (2) a single `useIsMobile()` matchMedia hook + the React 19 idioms for it; (3) the @dnd-kit keyboard-sensor pattern that satisfies POL-08 (Linear-style focus + arrow drag); (4) a `Skeleton` primitive sized to Tailwind v4 conventions; (5) Cloudflare Pages git integration with a `public/_headers` file that uncaches `index.html` while letting Vite's hashed assets cache aggressively.

The two non-obvious pitfalls: **(a)** the existing `uiStore` is memory-only — adding `onboarding` and `exportReminder` slices means rewriting it with `persist` (and adding it to the multi-tab `withStorageDOMEvents` listener so reset-onboarding from one tab propagates), and **(b)** the existing `<foreignObject>`-hosted `LockToggle` inside the SVG already creates a DOM keyboard-tab-stop on every bar — the keyboard-drag affordance can build on this instead of rolling a separate roving-tabindex layer.

**Primary recommendation:** Slice the work along the CONTEXT boundary (mobile / onboarding / states-and-confirms / export-reminder / a11y / deploy), persist `uiStore` first as a Wave 0 chore so onboarding + export-reminder slices can land independently, ship a single `useIsMobile` hook before any mobile work begins, and put DEPLOY-01/03 as the last wave so the live URL reflects the polished build.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Mobile drag/edit model**
- **D-01:** Mobile breakpoint is **640px** (Tailwind `sm`). Below 640px = phone behavior; 640+ = desktop behavior. Same breakpoint drives CAL-04 default-to-calendar via the URL-param check from Phase 3 D-28. Tablets (iPad portrait at 768px) get the full desktop experience including drag.
- **D-02:** Phone (<640px) uses a **tap-to-edit modal**, not touch drag. Tap a bar → modal opens with date pickers for the bar's start (and end for `harvest-window`), lock toggle, and delete-planting button. Cascade preview rendered as text summary inside the modal (e.g., "Moves harvest to Aug 12") — no live ghost overlay on phones.
- **D-03:** Lock toggle on phones lives **inside the edit modal**. The filled-lock indicator on the bar still renders for at-a-glance status. Alt-click + hover-revealed lock icon stay desktop-only.
- **D-04:** Phone-landscape gantt: **horizontal scroll, fixed day-width**. Sticky plant-name column (left-side `position: sticky`). No pinch-zoom on the gantt SVG.

**Onboarding**
- **D-05:** Coach marks on the **first visit to `/plan` only**, pointing at: catalog button, drag affordance on a bar, lock-toggle, Calendar tab. Single dismissal kills the whole set.
- **D-06:** Onboarding flags live in **uiStore + persist** under `onboarding: { coachMarksDismissed: boolean }`. Settings gains a **"Reset onboarding"** button.
- **D-07:** Settings **"Clear plan"** re-triggers SetupWizard on next mount; coach marks do **not** re-show automatically.

**Empty / error / loading / confirm patterns**
- **D-08:** Loading — **skeletons** for catalog grid + ZIP-derive results; **spinner button** for Permapeople enrichment.
- **D-09:** Destructive split:
  - **Toast-with-undo (~5s)**: delete planting, delete custom task, clear completed-task ids, hide an event → dispatches `temporal.getState().undo()`.
  - **Modal-confirm**: clear plan, overwrite-on-import, delete custom plant.
- **D-10:** Errors **inline near input/action**: bad ZIP → red helper under input; Permapeople fail → inline pill on enrichment row; corrupt JSON import → inline error in import preview modal; localStorage full → **sticky top banner** reusing iOS Private Browsing pattern.
- **D-11:** Empty-state copy is **action-first, terse** (one sentence + one button, no themed/cute language).

**Export-reminder UX**
- **D-12:** Triggers when **(a) `dirtySinceExport >= 20`** OR **(b) `(now - lastExportedAt) >= 14 days` AND `dirtySinceExport > 0`**.
- **D-13:** Non-blocking banner above main content. Actions: `[Export plan] [Remind me later (3d)] [Don't remind for 30 days]`.
- **D-14:** **Coarse dirty-edit counting** — increment ONLY on schema-level mutations: `commitEdit`, `addPlanting`, `removePlanting`, `editPlanting`, custom plant CRUD, custom task CRUD, location overrides. Do NOT count: lock toggles, task completion toggles, undo/redo replays.
- **D-15:** Bookkeeping in **uiStore + persist**: `exportReminder: { lastExportedAt, dirtySinceExport, snoozedUntil }`. `exportPlan()` gets post-download side-effect to reset.

### Claude's Discretion

- **POL-07** verification: 200-event stress fixture + DevTools Performance trace; planner picks fixture shape (40 plantings × 5 events).
- **POL-08** keyboard drag: Linear-style; planner picks roving-tabindex layout, focus ring, screen-reader announcements, zundo integration (single history entry on Enter-commit, none on Esc-cancel).
- **POL-09** WCAG AA audit: planner picks tool (axe-core CLI vs Lighthouse vs manual). `--lifecycle-locked` from Phase 3 must pass against every lifecycle-phase fill.
- **DEPLOY-01**: Cloudflare Pages git integration on push to `main` is the simplest path. Planner decides whether GitHub Actions + Wrangler is needed (only if env-var injection or non-default preview settings required).
- **DEPLOY-03**: Vite already hashes assets; planner adds `public/_headers` rule for `/index.html: Cache-Control: no-cache`.
- **ConstraintTooltip a11y plumbing**: `aria-live="polite"`, Esc-dismiss at portal root, tab focus stop on the pill, screen-reader-only summary text.
- **Modal date pickers**: native `<input type=date>` is the boring correct choice on phones.
- **Toast UX details**: 5s default per D-09; planner picks animation/position.
- **Coach-mark visual style**, **sticky column width** (96-120px), **Skeleton component variants**.

### Deferred Ideas (OUT OF SCOPE)

- Touch drag on phones, pinch-zoom on gantt, starter-pack picker, per-route coach marks beyond `/plan`, single first-session sequenced tour, PWA / service worker, print stylesheet / PDF export, multi-frost-source / per-bed overrides, custom domain registration, per-PR preview deploys (planner discretion only), themed/cute empty-state copy, per-mark coach-mark dismissal granularity.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAL-04 | Calendar default on narrow viewports | `useIsMobile()` hook + Phase 3 D-28 `?view=calendar` URL param wiring (one-line set in `PlanViewTabs` mount) |
| POL-01 | Mobile-responsive: calendar default on phones; gantt readable in landscape; full editing on desktop/tablet | D-01 breakpoint + D-04 sticky-column horizontal scroll + D-02 tap-to-edit modal |
| POL-02 | First-run onboarding from blank slate to first gantt without dead ends | Existing `SetupWizard` covers ZIP→plants→plan; Phase 4 adds D-05 coach marks on `/plan` to close the gap |
| POL-03 | Real empty states with clear next-step CTA | D-11 surfaces (empty plan/tasks/drawer/catalog filter) + reusable `EmptyState` shape |
| POL-04 | Real error states (bad ZIP, Permapeople, localStorage full, corrupt import) | D-10 inline-near-action policy + extending existing `Banner.tsx` with `storage-full` variant |
| POL-05 | Loading states for async ops | D-08 `<Skeleton>` primitive + spinner-button on Permapeople enrichment |
| POL-06 | Confirmation dialogs before destructive actions with undo where possible | D-09 toast-with-undo (zundo) vs modal-confirm split |
| POL-07 | 60fps drag at 200 events | Stress fixture (40×5) + DevTools profile checkpoint; rAF throttling + memoized selectors already in place from Phase 3 |
| POL-08 | Keyboard accessibility incl. drag fallback | @dnd-kit `KeyboardSensor` + Linear-pattern focus/arrow controller; existing `LockToggle` foreignObject is already a tab stop |
| POL-09 | WCAG AA color contrast | axe-core CLI + manual contrast checker for token tweaks in `src/index.css @theme` |
| POL-10 | Periodic export prompt | D-12/13/14/15 export-reminder banner + dirty-edit counter wired to coarse setters |
| DEPLOY-01 | Cloudflare Pages CI/CD on push to `main` | Pages git integration (verified): build = `npm run build`, output dir = `dist` |
| DEPLOY-03 | Hashed assets + uncached `index.html` | Vite default hashing + `public/_headers` rule (verified syntax) |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Mobile breakpoint detection | Browser (matchMedia) | — | No backend; runtime viewport check only |
| CAL-04 default view | Browser (URL param + matchMedia) | — | Reads `?view=` from React Router; sets default on mount based on `useIsMobile()` |
| Tap-to-edit modal (mobile) | Browser (React component) | Plan store (commit) | Modal calls existing `commitEdit`/`setLock`/`removePlanting` setters — no new domain code |
| Coach marks | Browser (React portal) | uiStore (persist) | Visual overlay + `coachMarksDismissed` flag in persisted uiStore |
| Empty/error/loading states | Browser (React components) | — | All UI; no backend |
| Toast-with-undo | Browser (Radix Toast) | zundo `temporal` | Toast Action button calls `temporal.getState().undo()` — single history source |
| Modal-confirm | Browser (Radix Dialog) | Plan store (mutation) | Existing `Dialog` primitive used in Phase 2/3 |
| Storage-full banner | Browser (extends existing Banner) | `data/storage.ts` (probe + mid-session catch) | Storage-tier detection only; banner is UI |
| Export-reminder banner | Browser (React) | uiStore.exportReminder (persist) | All bookkeeping local; banner reads selectors |
| Dirty-edit counter | Plan store setters | uiStore (persist) | Coarse increment hook inside planStore setters; persisted to uiStore |
| Keyboard drag | Browser (@dnd-kit KeyboardSensor) | zundo `temporal` | Sensor + custom controller; commit goes through existing `commitEdit` |
| WCAG token tweaks | Browser (CSS via `@theme`) | — | Tailwind v4 token edits in `src/index.css` |
| Cloudflare Pages deploy | CDN / Static | CI (Pages git integration) | `dist/` to edge; `_headers` file for cache rules |
| 200-event perf checkpoint | Browser (test fixture) | — | DevTools Performance profile; no new infra |

## Project Constraints (from CLAUDE.md)

- **Single-user, no backend, no accounts.** All polish work stays browser-side; no service-worker / PWA in v1.
- **Tech stack locked**: React 19, Vite 7/8, TS 6, Zustand 5 (persist), Tailwind v4, shadcn/ui, SVAR React Gantt (or bare-SVG fallback already chosen — Phase 3 stayed bare-SVG + @dnd-kit), FullCalendar 6.1, date-fns v4, Vitest 4, Playwright 1.59, Cloudflare Pages.
- **Hosting target**: Cloudflare Pages (unlimited free bandwidth — share-worthy distribution profile).
- **Polish target**: Share-worthy. Visual quality matters; UX must justify recommending the URL.
- **GSD workflow enforced**: All edits go through a GSD command. Atomic commits via `gsd-sdk query commit` per slice.
- **`no-restricted-syntax` ESLint** bans raw `new Date()` outside `dateWrappers.ts` — phase 4's tap-to-edit modal date parsing must use the wrapper.

## Standard Stack

### Core (already installed — no version changes)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zustand` | `5.0.12` | State + `persist` middleware for `uiStore` | [VERIFIED: npm 2026-04-27] Already used for `planStore`/`catalogStore`; uiStore migration to persist is the structural prerequisite for D-06/D-15 |
| `zundo` | `2.3.0` | Undo/redo history wrapping `planStore` | Phase 3 already wraps. Toast-with-undo dispatches `temporal.getState().undo()` directly |
| `@dnd-kit/core` | `6.3.1` | Drag sensors incl. `KeyboardSensor` for POL-08 | Already mounted in DragLayer; adding `KeyboardSensor` is a sensor-list edit |
| `@radix-ui/react-toast` | `1.2.15` | Toast primitive for D-09 undo toasts | Already in `src/ui/Toast.tsx` |
| `@radix-ui/react-dialog` | `1.1.15` | Modal-confirm for D-09 irreversible ops | Already in `src/ui/Dialog.tsx` |
| `react-router` | `7.14.2` | `?view=` URL param for CAL-04 wiring | Already in `PlanViewTabs.tsx` |
| `lucide-react` | `1.11.0` | Icon set (existing) | Used throughout; consistent visual language |

### Supporting (NEW — minimal additions)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@axe-core/cli` | `4.11.2` | One-shot WCAG AA audit during POL-09 | [VERIFIED: npm] CLI run against built `dist/` (or dev URL) — emits violation report. Optional: `axe-core` (4.11.3) embedded in tests. Planner picks one. |

**No new runtime dependency required for:**
- Coach marks — DON'T install `react-joyride`/`shepherd.js`/`driver.js`. The 4-mark scope (D-05) is small enough that a hand-rolled Tailwind portal with absolute-positioned callouts beats a 30-100KB tour library. `react-joyride@3.0.2`, `shepherd.js@15.2.2`, `driver.js@1.4.0` are all available [VERIFIED: npm] but YAGNI.
- Skeletons — Tailwind's `animate-pulse` + a 2-prop `<Skeleton>` covers all D-08 surfaces.
- Mobile detection — `window.matchMedia` + `useSyncExternalStore` (already in deps via `use-sync-external-store`).
- Confirmation pattern — existing `Dialog` primitive.
- Toast undo — existing `Toast` + `ToastAction` primitives.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled coach marks | react-joyride 3.0.2 | Library handles overlay/scroll/auto-advance; but adds ~30KB and the 4-mark static scope doesn't justify it |
| Hand-rolled coach marks | driver.js 1.4.0 | ~10KB, simpler API; same YAGNI argument — 4 marks is a single component |
| Cloudflare Pages git integration | GitHub Actions + `wrangler pages deploy` | Only justified if (a) per-PR preview policy needs custom shaping, (b) build-time secrets must be injected, or (c) extra build steps (linting, tests) need to gate deploys. Default path: git integration. |
| `@axe-core/cli` one-shot audit | `axe-core` in Vitest tests | CLI is faster for one-time POL-09; in-test integration is overkill for a single audit pass. Planner can add to test suite if regressions surface. |
| Native `<input type=date>` for tap-to-edit modal | Custom day-grid (e.g., react-day-picker) | Native gets free a11y, system pickers on iOS/Android, zero install cost. Locked by CONTEXT specifics. |

**Installation:**

```bash
# OPTIONAL — only if planner picks axe-core CLI for POL-09
npm install -D @axe-core/cli
```

No production-bundle additions required. Phase 4 ships zero new runtime KB.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────┐
                    │   Browser (single user)     │
                    └──────────────┬──────────────┘
                                   │
        ┌──────────────────────────┴──────────────────────────┐
        │                                                       │
        ▼                                                       ▼
  ┌──────────────┐                                       ┌─────────────┐
  │  matchMedia  │                                       │  React tree │
  │  (max-width: │──────► useIsMobile() hook ───────────►│  (AppShell  │
  │  639px)      │                                       │   + routes) │
  └──────────────┘                                       └─────┬───────┘
                                                               │
        ┌──────────────────────────────────────────────────────┼──────────────┐
        │                                                       │              │
        ▼                                                       ▼              ▼
  ┌──────────────┐    ┌────────────────┐    ┌──────────────────────┐    ┌───────────┐
  │  PlanViewTabs│    │   GanttView    │    │ Mobile EditPlanting  │    │ Coach     │
  │  (CAL-04 set │    │  (D-04 sticky  │    │   Modal (D-02)       │    │ Marks     │
  │   ?view=cal  │    │  plant column, │    │   tap on bar →       │    │ portal    │
  │   on mobile) │    │  horiz scroll) │    │   commitEdit         │    │ (D-05)    │
  └──────┬───────┘    └────────┬───────┘    └──────────┬───────────┘    └─────┬─────┘
         │                      │                       │                      │
         └──────────────────────┴───────────────────────┴──────────────────────┘
                                            │
                                            ▼
                            ┌──────────────────────────────┐
                            │  planStore (zundo + persist) │◄──┐
                            │  setters increment            │   │ toast.undo()
                            │  uiStore.exportReminder       │   │ → temporal.undo()
                            │  .dirtySinceExport (D-14)     │   │
                            └──────────────┬───────────────┘   │
                                           │                    │
                                           ▼                    │
                  ┌────────────────────────────────────────┐   │
                  │  uiStore (NEW: persist middleware)     │   │
                  │  ├─ onboarding.coachMarksDismissed     │   │
                  │  ├─ exportReminder.lastExportedAt      │   │
                  │  ├─ exportReminder.dirtySinceExport    │   │
                  │  └─ exportReminder.snoozedUntil        │   │
                  └────────────┬───────────────────────────┘   │
                               │                                │
        ┌──────────────────────┴────────────┐                  │
        │                                    │                  │
        ▼                                    ▼                  │
  ┌──────────────┐                ┌────────────────────┐       │
  │ ExportReminderBanner          │ withStorageDOMEvents │       │
  │ (D-13 banner) │                │ (multi-tab sync)    │       │
  │ above main    │                └────────────────────┘       │
  └──────────────┘                                              │
                                                                │
  ┌────────────────────────────────────────────────────────┐   │
  │  Toast (Radix) — D-09 undo                             │───┘
  │  ToastAction onClick = temporal.getState().undo()      │
  └────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────┐
  │  Banner (extended) — variants:                         │
  │   1. iOS Private (existing)                            │
  │   2. storage-full (NEW, D-10)                          │
  │   3. export-reminder (NEW, D-13 — separate component)  │
  │  Stack policy: ONE banner visible; priority sort       │
  └────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────┐
  │  Build/Deploy pipeline                                 │
  │  git push main ──► Cloudflare Pages git integration    │
  │     ──► npm run build (tsc -b && vite build)           │
  │     ──► dist/ uploaded to edge                         │
  │     ──► /index.html served with no-cache               │
  │     ──► /assets/*.{hash}.{js,css} immutable max-age    │
  └────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── app/
│   ├── AppShell.tsx                  # MOUNTS: ExportReminderBanner, StorageFullBanner
│   ├── Banner.tsx                    # EXTEND with new variants OR keep iOS-only and add siblings
│   └── PlanViewTabs.tsx              # CAL-04: read useIsMobile() at mount → set ?view=calendar default
├── features/
│   ├── mobile/                        # NEW
│   │   ├── useIsMobile.ts             # single matchMedia hook (640px)
│   │   └── EditPlantingModal.tsx      # D-02 tap-to-edit modal
│   ├── onboarding/                    # NEW
│   │   ├── CoachMarks.tsx             # portal-mounted overlay, 4 marks
│   │   └── useCoachMarks.ts           # reads uiStore.onboarding, ref-tracks targets
│   ├── export-reminder/               # NEW
│   │   ├── ExportReminderBanner.tsx   # banner UI
│   │   └── useExportReminder.ts       # selector — should-show logic per D-12
│   ├── keyboard-drag/                 # NEW
│   │   └── useKeyboardBarDrag.ts      # POL-08 Linear-style controller (planner sketches)
│   ├── gantt/
│   │   └── GanttView.tsx              # WRAP plot in sticky-plant-column container at <640px
│   ├── settings/
│   │   ├── exportPlan.ts              # ADD post-download side-effect (D-15)
│   │   ├── ImportPreviewModal.tsx     # ADD inline corrupt-import error (D-10)
│   │   └── SettingsPanel.tsx          # ADD "Reset onboarding" button (D-06)
│   └── tasks/, calendar/, catalog/    # add empty-state copy per D-11
├── stores/
│   ├── uiStore.ts                    # REWRITE with persist middleware (Wave 0 chore)
│   └── planStore.ts                  # ADD dirty-counter increment per D-14
├── ui/
│   └── Skeleton.tsx                  # NEW reusable pulse primitive
└── index.css                          # @theme — token tweaks for WCAG AA
public/
├── _redirects                        # existing (Phase 1)
└── _headers                          # NEW (DEPLOY-03 cache rules)
tests/
└── fixtures/
    └── 200-event-stress.ts           # NEW POL-07 perf fixture
```

(Optional: `.github/workflows/deploy.yml` only if planner picks Wrangler over Pages git integration.)

### Pattern 1: Single-source mobile breakpoint hook

**What:** One `useIsMobile()` hook reading `window.matchMedia('(max-width: 639px)')` via `useSyncExternalStore`. Every consumer (CAL-04, EditPlantingModal trigger, sticky-column toggle, lock-icon visibility) reads from this hook — never re-derives.

**When to use:** Anywhere a component needs to branch on mobile vs desktop layout.

**Example:**

```typescript
// src/features/mobile/useIsMobile.ts
// Source: [VERIFIED: React 19 useSyncExternalStore docs]
//         [CITED: 04-CONTEXT.md D-01 — 640px breakpoint, single source of truth]
import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 639px)';

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false; // SPA — no SSR; default to desktop on first paint
}

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  // addEventListener('change', ...) is the modern API; addListener is deprecated.
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

### Pattern 2: Persisted `uiStore` with multi-tab sync

**What:** Wrap `uiStore` create() in `persist(...)` middleware, hook it into the existing `withStorageDOMEvents` listener so a second tab dismissing a coach mark or exporting a plan propagates.

**When to use:** Whenever Phase 4 needs cross-reload state. Today's uiStore is memory-only; D-06 + D-15 require persistence. **This is the structural prerequisite for the onboarding and export-reminder slices.**

**Example:**

```typescript
// src/stores/uiStore.ts (NEW shape)
// Source: [VERIFIED: Context7 /pmndrs/zustand persist + partialize]
//         [CITED: src/data/storage.ts withStorageDOMEvents]
//         [CITED: 04-CONTEXT.md D-06, D-15]
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { withStorageDOMEvents } from '../data/storage';
import type { EventType } from '../domain/types';

interface UIState {
  // Phase 1 (LOCKED — DO NOT persist; storage probe is per-tab)
  bannerDismissed: boolean;
  isStorageAvailable: boolean;
  // Phase 2 transient (memory only)
  myPlanPanelOpen: boolean;
  filterChips: Set<string>;
  searchQuery: string;
  importPreviewOpen: boolean;
  // Phase 3 transient (memory only)
  lastConstraintViolation: { eventId: string; eventType: EventType; reasons: string[] } | null;
  taskGroupBy: 'plant' | 'category';
  altClickTipDismissCount: number;
  // Phase 4 PERSISTED slices
  onboarding: {
    coachMarksDismissed: boolean;
  };
  exportReminder: {
    lastExportedAt: string | null;
    dirtySinceExport: number;
    snoozedUntil: string | null;
  };
  // setters omitted for brevity
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({ /* state + setters */ }),
    {
      name: 'gg-ui',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // CRITICAL: only persist Phase 4 slices. Banner dismiss + transient flags are
      // intentionally session-scoped (Phase 1/2/3 invariant — Pitfall K).
      partialize: (s) => ({
        onboarding: s.onboarding,
        exportReminder: s.exportReminder,
      }),
    },
  ),
);

// In main.tsx (alongside the existing planStore listener registration):
withStorageDOMEvents(useUIStore as unknown as Parameters<typeof withStorageDOMEvents>[0]);
```

### Pattern 3: Toast-with-undo wired to zundo

**What:** Reversible destructive ops dispatch the mutation, then show a Radix Toast with an Action button that calls `temporal.getState().undo()`. Single history source — no parallel undo log.

**When to use:** D-09 reversible ops (delete planting, delete custom task, hide event, clear completed-task ids). NOT for clear-plan / overwrite-on-import / delete-custom-plant — those use modal-confirm.

**Example:**

```typescript
// usage inside e.g. PlantingActions.tsx
// Source: [CITED: src/ui/Toast.tsx existing primitives]
//         [CITED: src/stores/planStore.ts getTemporal()]
//         [CITED: 04-CONTEXT.md D-09]
import { Toast, ToastTitle, ToastAction, ToastProvider, ToastViewport } from '../../ui/Toast';
import { getTemporal, usePlanStore } from '../../stores/planStore';

function handleDelete(plantingId: string, plantName: string) {
  usePlanStore.getState().removePlanting(plantingId);
  // Toast state managed by ToastProvider — assume `pushToast` helper exists or add one.
  pushToast({
    duration: 5000,
    variant: 'success',
    title: `Deleted ${plantName}`,
    action: { label: 'Undo', onClick: () => getTemporal().undo() },
  });
}
```

### Pattern 4: Sticky plant-name column on mobile gantt

**What:** Wrap the existing GanttView's two-column flex layout in a horizontal-scroll container; left column already has `shrink-0`, add `position: sticky; left: 0; z-index: 1` at <640px.

**When to use:** Phone-landscape gantt rendering (D-04). Desktop layout unchanged.

**Example:**

```tsx
// src/features/gantt/GanttView.tsx (modified excerpt)
// Source: [CITED: 04-CONTEXT.md D-04]
//         [CITED: src/features/gantt/GanttView.tsx existing structure]
import { useIsMobile } from '../mobile/useIsMobile';

const STICKY_COL_W_PHONE = 112; // CONTEXT discretion: 96-120px range

function GanttViewInner({ plan, events, merged }: GanttViewInnerProps) {
  const isMobile = useIsMobile();
  // ...existing useMemos...
  return (
    <div className="bg-white border border-stone-200 rounded">
      <div className={isMobile ? 'overflow-x-auto' : 'flex'}>
        <div
          className={isMobile
            ? 'sticky left-0 z-10 bg-white border-r border-stone-200 shrink-0'
            : 'border-r border-stone-200 shrink-0 bg-white'}
          style={{ width: isMobile ? STICKY_COL_W_PHONE : LABEL_WIDTH }}
        >
          {/* labels */}
        </div>
        <div className={isMobile ? '' : 'overflow-x-auto flex-1'}>
          {/* SVG plot */}
        </div>
      </div>
    </div>
  );
}
```

### Pattern 5: Cloudflare Pages cache headers

**What:** `public/_headers` file declares per-pattern Cache-Control. `index.html` no-cache (browsers re-fetch on every load), Vite's `assets/*.{hash}.{js,css,svg}` immutable for a year.

**When to use:** DEPLOY-03. Required so deploys propagate without stale-cache breakage.

**Example:**

```
# public/_headers
# Source: [VERIFIED: developers.cloudflare.com/pages/configuration/headers/]
# index.html must NOT cache so a deploy is reflected on the next page load.
/index.html
  Cache-Control: no-cache, no-store, must-revalidate

# Vite emits hashed filenames in /assets/ by default (e.g., index-A1b2C3.js).
# These are content-addressed → safe to cache aggressively + immutably.
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

### Anti-Patterns to Avoid

- **Per-mark coach-mark dismissal map** — D-05 + specifics explicitly chose single boolean. Don't model `{ markId: dismissed }`.
- **Touch drag on mobile gantt** — explicit deferral (D-02). Tap-to-edit modal is the entire mobile editing surface.
- **Custom day-grid date pickers in the tap-to-edit modal** — native `<input type=date>` is locked by CONTEXT discretion section. iOS/Android system pickers are excellent and free.
- **Counting lock toggles or task completions in `dirtySinceExport`** — D-14 explicitly excludes them. Only schema-meaningful mutations count.
- **Counting undo/redo replays** — same reason. zundo replays should not re-arm the export-reminder.
- **Multiple banners stacking** — ONE banner visible at a time. Priority: storage-full > iOS Private Browsing > export-reminder. Implementation: pick first qualifying.
- **A second undo log for toast-with-undo** — toast Action MUST call `temporal.getState().undo()`. Two sources of truth = state divergence.
- **Persisting `bannerDismissed` or transient Phase 2/3 flags** — these are deliberately session-scoped (Pitfall K from Phase 2). `partialize` must restrict persist to `onboarding` + `exportReminder` only.
- **GitHub Actions deploy when Pages git integration suffices** — adds a `wrangler` install + secret management. Only switch if there's a concrete reason (env-var injection, gating tests).
- **Service worker for stale-cache mitigation** — PROJECT.md POWER-V2-03 defers PWA. HTTP cache headers (DEPLOY-03) handle propagation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile breakpoint detection | Custom `window.innerWidth` + resize listener | `window.matchMedia` + `useSyncExternalStore` | matchMedia is the matching primitive; useSyncExternalStore avoids tearing in concurrent React |
| Date picker on phones | Custom day-grid component | Native `<input type=date>` | System pickers on iOS/Android are excellent + free a11y |
| Toast undo log | Parallel undo stack | `zundo`'s `temporal.getState().undo()` | Already wired in Phase 3; single source of truth |
| Skeleton animation | Custom keyframe library | Tailwind's `animate-pulse` utility | Already in Tailwind v4 by default |
| Confirmation dialog | New modal component | Existing `src/ui/Dialog.tsx` (Radix) | Already battle-tested across Phase 2/3 |
| Toast component | New toast primitive | Existing `src/ui/Toast.tsx` (Radix) | Already in repo |
| iOS Private banner equivalent for storage-full | Parallel banner system | Extend `src/app/Banner.tsx` with variant or co-mount sibling using same shape | Visual + a11y consistency, code reuse |
| Onboarding tour library | react-joyride / shepherd.js / driver.js | Hand-rolled portal with 4 absolute-positioned callouts | Static 4-mark scope (D-05); libraries add 10-100KB for features YAGNI |
| Multi-tab sync for new persisted store | Manual storage-event listener per store | `withStorageDOMEvents(useUIStore)` from `src/data/storage.ts` | Existing pattern; same listener primitive used by planStore/catalogStore |
| Cloudflare Pages CI/CD | GitHub Actions + Wrangler workflow | Cloudflare Pages git integration (auto-deploy on push) | Default path verified in Cloudflare docs; covers DEPLOY-01 in dashboard config — zero workflow YAML |

**Key insight:** Phase 4 is almost entirely a *configuration + glue* phase over the locked stack. The temptation to "just install a small library for X" is high (especially for coach marks); resist. The CONTEXT decisions tightly bound the surface area, and every locked surface already has a primitive in the repo.

## Runtime State Inventory

> Phase 4 is **not** a rename/refactor phase, but it does introduce **persisted state** under a new localStorage key. Documenting here so the planner knows what runtime state lands.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | NEW localStorage key `gg-ui` (uiStore persist envelope) holding `onboarding.coachMarksDismissed` + `exportReminder.{lastExportedAt, dirtySinceExport, snoozedUntil}` | Plan must register `withStorageDOMEvents(useUIStore)` in `main.tsx` (multi-tab sync). Migration: none required — first deploy initializes from defaults; absent state = `coachMarksDismissed: false`, `lastExportedAt: null`, `dirtySinceExport: 0`, `snoozedUntil: null` |
| Live service config | None — single-user, no backend, Permapeople is enrichment-only with existing CF Worker proxy | None |
| OS-registered state | None — web app | None |
| Secrets/env vars | None — Cloudflare Pages git integration uses repo defaults; no secrets needed for static deploy. CF Worker proxy (Phase 2) is separate infra not touched here. | None |
| Build artifacts | `dist/` regenerated by `vite build`. New `public/_headers` file ships into `dist/` automatically (Vite copies `public/*`). | Verify post-build that `dist/_headers` exists. |

**Schema bump:** No `planStore` schema bump required. uiStore persist `version: 1` starts fresh; if D-06 or D-15 shape changes later a migration function in the persist config handles it (zustand persist `migrate` callback).

## Common Pitfalls

### Pitfall 1: Persisting transient Phase 2/3 flags by accident

**What goes wrong:** Naive `persist(create(...))` without `partialize` serializes the whole UIState — `bannerDismissed`, `myPlanPanelOpen`, `filterChips`, `lastConstraintViolation`, etc. — which breaks the Phase 2 Pitfall K invariant ("filter chips and panel toggles MUST be transient").

**Why it happens:** Zustand persist defaults to persisting everything when `partialize` is omitted.

**How to avoid:** Always specify `partialize` and explicitly enumerate the persisted slices: `partialize: (s) => ({ onboarding: s.onboarding, exportReminder: s.exportReminder })`. Add a test in `tests/stores/uiStore.test.ts` that asserts the persisted envelope contains only those two keys.

**Warning signs:** Banner re-shows as "dismissed" after reload (already happens — that's correct); filter chips persist across sessions (regression).

### Pitfall 2: `useSyncExternalStore` returning stale snapshot from `matchMedia`

**What goes wrong:** Returning a fresh `window.matchMedia(QUERY).matches` from `getSnapshot` allocates a new MediaQueryList each call — cheap, but more importantly, `useSyncExternalStore` calls `getSnapshot` on every render and bails on `Object.is` equality. With booleans this is fine. But if a future refactor returns an object (e.g., `{ isMobile, isTablet }`), each render gets a new object reference and tears the consumer.

**Why it happens:** `useSyncExternalStore` requires referentially stable snapshots.

**How to avoid:** Keep `useIsMobile` returning a primitive boolean. If multiple breakpoints needed, expose them as separate hooks (`useIsMobile`, `useIsTablet`) — each returns a primitive.

**Warning signs:** "The result of getSnapshot should be cached" warning in DevTools.

### Pitfall 3: ConstraintTooltip a11y addition fights existing portal lifetime

**What goes wrong:** Phase 3 D-09 made ConstraintTooltip portaled with an 8s timeout that OUTLIVES the drag (sticky pill via `uiStore.lastConstraintViolation`). Adding `aria-live="polite"` naively fires the announcement on every render — including the 8s tail — duplicating the announcement.

**How to avoid:** Render the `aria-live` region only when the message changes (key it on `lastConstraintViolation.eventId + reasons.join('|')`). Use `aria-live="polite"` not `assertive` (drag-time interruption is bad UX). Esc-dismiss handler at the portal root must also clear `uiStore.lastConstraintViolation` so SR doesn't re-announce on re-render.

**Warning signs:** Screen reader announces "Can't transplant tomato before May 15" twice.

### Pitfall 4: KeyboardSensor fights the `<foreignObject>` LockToggle for focus

**What goes wrong:** The Phase 3 GanttView already places a focusable `<button>` (LockToggle) inside `<foreignObject>` on every bar. Adding @dnd-kit's `KeyboardSensor` to the same draggable `<g>` creates two tab stops per bar: the bar (now focusable for drag) and the lock button. Tab order becomes confusing.

**How to avoid:** Either (a) make the bar's draggable wrapper the primary tab stop and move LockToggle activation to a key shortcut on the focused bar (e.g., `L` while bar focused — already part of D-08 keyboard-drag spec), OR (b) keep both tab stops but order them deliberately: bar first (drag is the dominant action), lock button second. The CONTEXT specifies "L lock" as part of the keyboard-drag controller — option (a) aligns with D-08.

**Warning signs:** Tab from bar 1 lands on bar 1's lock button instead of bar 2.

### Pitfall 5: Toast-with-undo and Cmd-Z race

**What goes wrong:** User deletes a planting → toast appears → user immediately hits Cmd-Z (which calls `temporal.undo()`) → then clicks the toast Undo button (which calls `temporal.undo()` AGAIN). The second undo reverts something the user didn't intend to revert.

**How to avoid:** Dismiss the toast immediately when `temporal.pastStates.length` decreases (i.e., an undo happened from any source). Subscribe in the toast component to `useTemporalStore((s) => s.pastStates.length)` and call `setOpen(false)` when it drops past the toast's mount-time count.

**Warning signs:** "I undid one thing and it reverted two!" bug report.

### Pitfall 6: `_headers` file not ending up in `dist/`

**What goes wrong:** A `_headers` file placed at the repo root (instead of `public/`) is not copied by Vite into `dist/`. Cloudflare Pages then ignores it (it only honors files at the deployed root). Result: `index.html` ships with default cache, deploys don't propagate.

**How to avoid:** Place at `public/_headers`. Vite copies `public/*` to `dist/` automatically. Verify after first deploy by curl-ing `https://site/index.html -I` and checking `cache-control: no-cache`.

**Warning signs:** Users see stale UI after deploy; force-refresh fixes it.

### Pitfall 7: Coach mark target ref captured before render

**What goes wrong:** `useCoachMarks` collects refs to the target elements (catalog button, drag affordance, lock toggle, calendar tab). On first paint of `/plan` with an empty plan, the drag-affordance bar doesn't exist yet (EmptyGanttState shows instead). The coach mark either points at nothing or at a stale position.

**How to avoid:** Coach marks should appear AFTER first plan exists (i.e., after the user adds a plant). Gate `coachMarksDismissed === false && plan?.plantings.length > 0`. Alternative: coach marks appear in stages — show "add plants" mark immediately, the drag/lock/calendar marks only after a planting exists. CONTEXT D-05 implies a single set; planner picks staging strategy.

**Warning signs:** Coach mark callout floats over empty space; user dismisses without value.

### Pitfall 8: 200-event stress fixture violates real-world data shape

**What goes wrong:** A fixture that generates 200 plantings of the same plant won't exercise the same code paths as 40 plantings × 5 events each. Lifecycle event count per planting depends on plant traits (transplant vs direct-sow, harvest-window length, succession). A homogeneous fixture under-tests memo invalidation across rows.

**How to avoid:** Use a representative mix (e.g., 8 plants × 5 successions = 40 plantings; spread across at least 4 lifecycle types — indoor-start, transplant, direct-sow, harvest-window). CONTEXT specifics call out 40 plantings × ~5 events each; planner builds from the existing samplePlan with succession multiplied.

**Warning signs:** Profile shows uniform per-row cost; real plans show outliers.

### Pitfall 9: `<input type=date>` returns YYYY-MM-DD without timezone — must round-trip through dateWrappers

**What goes wrong:** The tap-to-edit modal (D-02) has native date pickers. A bare `new Date(value)` parse violates the `no-restricted-syntax` ESLint rule and (worse) introduces local-timezone interpretation that breaks the UTC-noon invariant from SCH-03.

**How to avoid:** Convert the YYYY-MM-DD picker value to UTC-noon ISO via `dateWrappers.ts` helpers (the same wrappers used by the existing setup wizard ZIP-derived dates). Treat the modal's date control as a string-in/string-out form field with conversion happening in a single helper.

**Warning signs:** Lint failure on the modal file; or off-by-one-day bugs at the spring frost boundary.

### Pitfall 10: `axe-core` audit run against dev server reports false positives from React DevTools / HMR overlays

**What goes wrong:** `axe-core` against `npm run dev` flags Vite's HMR overlay, React DevTools annotations, etc.

**How to avoid:** Run axe against `npm run preview` (production build served locally) or the deployed Cloudflare Pages URL. For POL-09 the planner picks the target — preview is the boring correct choice.

## Code Examples

Verified patterns from official sources and the existing repo.

### Skeleton primitive (D-08)

```tsx
// src/ui/Skeleton.tsx
// Source: [VERIFIED: Tailwind v4 animate-pulse utility]
//         [CITED: 04-CONTEXT.md D-08]
import { cn } from './cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: 'rect' | 'text' | 'circle';
}

export function Skeleton({ shape = 'rect', className, ...props }: SkeletonProps) {
  const shapeClass = {
    rect: 'rounded',
    text: 'rounded h-4',
    circle: 'rounded-full',
  }[shape];
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn('animate-pulse bg-stone-200', shapeClass, className)}
      {...props}
    />
  );
}
```

### Spinner button (D-08 Permapeople enrichment)

```tsx
// usage inside e.g. CustomPlantModal.tsx
// Source: [CITED: lucide-react Loader2 icon]
//         [CITED: src/ui/Button.tsx existing primitive]
import { Loader2 } from 'lucide-react';
import { Button } from '../../ui/Button';

<Button onClick={enrich} disabled={isEnriching}>
  {isEnriching
    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
    : <SomeIcon className="w-4 h-4 mr-2" aria-hidden="true" />}
  {isEnriching ? 'Enriching…' : 'Enrich from Permapeople'}
</Button>
```

### Export-reminder selector (D-12)

```typescript
// src/features/export-reminder/useExportReminder.ts
// Source: [CITED: 04-CONTEXT.md D-12]
//         [CITED: src/domain/dateWrappers.ts nowISOString / parseUTCNoon]
import { useUIStore } from '../../stores/uiStore';
import { differenceInCalendarDays, parseISO } from 'date-fns';

const DIRTY_THRESHOLD = 20;
const AGE_THRESHOLD_DAYS = 14;

export function useShouldShowExportReminder(): boolean {
  const dirty = useUIStore((s) => s.exportReminder.dirtySinceExport);
  const lastExported = useUIStore((s) => s.exportReminder.lastExportedAt);
  const snoozedUntil = useUIStore((s) => s.exportReminder.snoozedUntil);

  const now = new Date();
  // Snooze respected first.
  if (snoozedUntil && parseISO(snoozedUntil) > now) return false;

  // Trigger A: dirty count threshold.
  if (dirty >= DIRTY_THRESHOLD) return true;

  // Trigger B: age + dirty>0.
  if (lastExported && dirty > 0) {
    const daysSince = differenceInCalendarDays(now, parseISO(lastExported));
    if (daysSince >= AGE_THRESHOLD_DAYS) return true;
  }

  return false;
}
```

### Cloudflare Pages git integration (DEPLOY-01)

**No file required.** Configure once in the Cloudflare dashboard:

| Setting | Value |
|---------|-------|
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | (set via `NODE_VERSION` env var or `.nvmrc`; Vite 8 / TS 6 needs Node 20+) |

[VERIFIED: developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/]

Optional `wrangler.toml` (only needed if planner adds Pages Functions or wants config-as-code):

```toml
# wrangler.toml (OPTIONAL)
name = "garden-gantt"
pages_build_output_dir = "./dist"
compatibility_date = "2026-04-27"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `MediaQueryList.addListener` | `MediaQueryList.addEventListener('change', ...)` | Modern browsers; deprecated since Safari 14 | Use `addEventListener` in `useIsMobile` subscribe |
| `useState` + `useEffect` for matchMedia | `useSyncExternalStore` with subscribe/getSnapshot | React 18+ | Avoids tearing under concurrent rendering |
| Native `Temporal` API | Still polyfill-only on Safari | TC39 Stage 4 March 2026; Safari behind flag | Stick with date-fns v4 — locked by stack research |
| `wrangler pages publish` | `wrangler pages deploy` (or git integration) | wrangler 3+ | Use git integration; no wrangler invocation needed |
| Heading-based onboarding tour libs | Lightweight portal callouts (or none) | YAGNI ethos for hobby SPAs | Don't install a tour library for 4 marks |

**Deprecated/outdated:**
- `MediaQueryList.addListener` / `removeListener` — use `addEventListener('change', ...)`.
- `wrangler pages publish` — renamed to `wrangler pages deploy`.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + @testing-library/react 16.3.2 + happy-dom 20.9.0 |
| Config file | `vite.config.ts` (vitest section) — verify in repo |
| Quick run command | `npm test -- --run <pattern>` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAL-04 | Mobile viewport defaults to `?view=calendar` | unit | `npm test -- --run tests/app/PlanViewTabs.test.tsx` | ❌ Wave 0 |
| POL-01 | `useIsMobile` returns true at <640px, false at >=640px | unit | `npm test -- --run tests/features/mobile/useIsMobile.test.ts` | ❌ Wave 0 |
| POL-02 | Coach marks render on first /plan visit, hide after dismiss | component | `npm test -- --run tests/features/onboarding/CoachMarks.test.tsx` | ❌ Wave 0 |
| POL-03 | EmptyGanttState shows action CTA when plantings.length===0 | component | `npm test -- --run tests/features/gantt/EmptyGanttState.test.tsx` | ❌ Wave 0 |
| POL-04 | Bad ZIP shows inline error; corrupt import preserves state | component + integration | (existing setup tests + new import-error test) | ❌ Wave 0 (some) |
| POL-05 | Skeleton renders while catalog loading | component | `npm test -- --run tests/ui/Skeleton.test.tsx` | ❌ Wave 0 |
| POL-06 | Toast undo dispatches temporal.undo(); modal-confirm gates clear-plan | integration | `npm test -- --run tests/integration/destructive-actions.test.tsx` | ❌ Wave 0 |
| POL-07 | 200-event render under 16ms per frame during simulated drag | manual checkpoint | DevTools Performance trace against `tests/fixtures/200-event-stress.ts` plan | ❌ Wave 0 fixture; manual otherwise |
| POL-08 | Tab to bar, arrow to nudge, Enter to commit, Esc to cancel; one zundo entry per commit | component | `npm test -- --run tests/features/keyboard-drag/useKeyboardBarDrag.test.tsx` | ❌ Wave 0 |
| POL-09 | axe-core CLI reports zero WCAG AA violations against `npm run preview` | manual + CLI | `npx @axe-core/cli http://localhost:4173/#/plan` | ❌ Wave 0 (depends on tool choice) |
| POL-10 | Reminder banner appears after 20 dirty edits OR 14 days + 1 dirty edit; respects snooze | unit | `npm test -- --run tests/features/export-reminder/useExportReminder.test.ts` | ❌ Wave 0 |
| DEPLOY-01 | Push to main triggers CF Pages build (manual verify) | manual | First deploy + post-merge confirmation | n/a |
| DEPLOY-03 | `dist/index.html` cache-control verified | manual or CI smoke | `curl -I` against deployed URL OR a vitest checking `dist/_headers` exists post-build | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- --run tests/<changed-area>` (≤ 10s on a typical slice)
- **Per wave merge:** `npm test -- --run` + `npm run lint`
- **Phase gate:** Full suite green + axe audit clean + manual POL-07 perf trace + verified deploy URL before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/features/mobile/useIsMobile.test.ts` — covers POL-01 / CAL-04 breakpoint logic
- [ ] `tests/features/onboarding/CoachMarks.test.tsx` — covers POL-02 dismissal persistence
- [ ] `tests/features/export-reminder/useExportReminder.test.ts` — covers POL-10 trigger logic
- [ ] `tests/integration/destructive-actions.test.tsx` — covers POL-06 toast-undo + modal-confirm split
- [ ] `tests/features/keyboard-drag/useKeyboardBarDrag.test.tsx` — covers POL-08
- [ ] `tests/ui/Skeleton.test.tsx` — covers POL-05 primitive
- [ ] `tests/fixtures/200-event-stress.ts` — POL-07 perf fixture (40 plantings × ~5 events)
- [ ] `tests/stores/uiStore.test.ts` extension — assert `partialize` envelope shape, multi-tab sync
- [ ] `tests/app/PlanViewTabs.test.tsx` — covers CAL-04 default-view selection
- [ ] No framework install needed; Vitest 4 already in repo.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite 8 / TS 6 build | (verify ≥ 20) | — | n/a — must be available locally and on Cloudflare Pages |
| npm | Install + scripts | ✓ (assumed; package.json present) | — | — |
| `git` | Cloudflare Pages git integration | ✓ (repo present) | — | — |
| GitHub repo connection to Cloudflare account | DEPLOY-01 | **❓ unknown — user must connect once via dashboard** | — | Manual `wrangler pages deploy` if user prefers |
| `wrangler` | OPTIONAL — only if planner picks GH Actions workflow | not installed | — | Skip; use Pages git integration |
| `@axe-core/cli` | OPTIONAL — POL-09 audit | not installed | 4.11.2 (latest, npm-verified) | Lighthouse in Chrome DevTools (built-in) |
| Chromium / system browser for Playwright drag tests | (Phase 4 doesn't add e2e tests in CONTEXT — playwright not invoked) | (skip) | 1.59.1 (in deps) | n/a |
| Mobile device or DevTools device emulation | POL-01/D-04 manual QA | DevTools always present | — | DevTools mobile emulation acceptable for v1 share |

**Missing dependencies with no fallback:**
- **Cloudflare account + Pages project linked to GitHub repo**: one-time human action. The planner cannot install this; the user must complete OAuth in the Cloudflare dashboard. Plan should call this out as an explicit human step in the deploy slice.

**Missing dependencies with fallback:**
- `@axe-core/cli` — install on demand; or substitute Chrome DevTools Lighthouse for the audit pass.

## Security Domain

> Phase 4 is mostly UI polish + deploy. Security surface is small but non-zero.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Single-user, no accounts |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | No access control — local app |
| V5 Input Validation | yes | Zod schemas already validate import (Phase 1/2); `<input type=date>` parses must round-trip via `dateWrappers.ts`; ZIP validated by `lookupLocation` |
| V6 Cryptography | no | None — no secrets in browser, no auth tokens |

### Known Threat Patterns for SPA + Cloudflare Pages

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via untrusted import data | Tampering | Zod-validate every imported plan field (existing); never `dangerouslySetInnerHTML` from import. React's default JSX escaping handles the rendering side. |
| Stale-cache exploit (deploy doesn't propagate) | Repudiation / Availability | DEPLOY-03 `_headers` rule + Vite hashed assets |
| Permapeople response with HTML in description fields | Tampering / XSS | Render Permapeople text as plain text only; never set HTML. Existing pattern in `CustomPlantModal.tsx` already uses text rendering. |
| localStorage poisoning across origins | Tampering | Cloudflare Pages serves single origin; localStorage isolated per origin. No risk in deployed configuration. |
| Cache poisoning by misconfigured `_headers` | Spoofing | Verify post-deploy with `curl -I` that `index.html` returns `cache-control: no-cache`. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The existing Vite config does NOT override the default `assetsDir: 'assets'` or filename hashing — so `/assets/*` `_headers` rule matches what's emitted | Pattern 5 | LOW. If overridden, change the `_headers` glob to match. Verify with one local `npm run build` and `ls dist/`. [ASSUMED] |
| A2 | Cloudflare Pages git integration is already supported on the user's account (free tier) and the user is willing to do the one-time dashboard OAuth | Environment Availability | MEDIUM — if user prefers GH Actions, planner pivots to Wrangler workflow (still feasible; adds a YAML file + secret) [ASSUMED] |
| A3 | A `pushToast` helper or analogous `useToast` hook will be created during Phase 4 — current `Toast.tsx` exposes primitives but no programmatic-push API | Pattern 3 / Code Examples | LOW. If absent, the planner adds it as part of the toast-with-undo slice [ASSUMED — verified primitives, not the imperative API] |
| A4 | `axe-core` against `npm run preview` does not flag the React app's `aria-live` regions as violations under default config | Pitfall 10 | LOW. If false positives surface, planner adds an axe config exclusion list [ASSUMED] |
| A5 | The repo's build command in `package.json` (`tsc -b && vite build`) will succeed in CF Pages' default Node version. CF Pages currently defaults to Node 18; Vite 8 + TS 6 likely need 20+ | DEPLOY-01 | MEDIUM. If build fails, set `NODE_VERSION=20` (or higher) as a Pages env var or commit `.nvmrc`. [ASSUMED — recommend verifying CF Pages current Node default during deploy slice] |
| A6 | The `useIsMobile` hook returning `false` during SSR-style first paint is acceptable (no SSR — but `useSyncExternalStore` requires `getServerSnapshot` and we'd flicker if mobile defaults to desktop on phone first paint) | Pattern 1 | LOW-MEDIUM. Vite SPA does no SSR, so `getServerSnapshot` is only invoked in test environments. In production, first paint reads `getSnapshot` directly. Mobile first-paint flicker not expected. [ASSUMED — verify via Lighthouse mobile audit on deployed URL] |
| A7 | `temporal.getState().undo()` is a no-op when `pastStates.length === 0`, so calling it from a stale toast doesn't crash | Pitfall 5 | LOW. zundo's docs document this; behavior verified across Phase 3. [ASSUMED — verified by Phase 3 keybindings code that disables button on empty stack] |

## Open Questions

1. **Banner stacking implementation choice (single visible vs priority queue)**
   - What we know: CONTEXT integration-points note says "ONE banner visible at a time. Priority: storage-full > iOS Private Browsing > export-reminder."
   - What's unclear: Whether to implement as (a) a `<BannerStack>` component that picks the first qualifying banner and renders only it, or (b) keep three separate banner components and have each one suppress itself if a higher-priority banner is showing.
   - Recommendation: Option (a) — a single mount point with a small selector that returns `'storage-full' | 'ios-private' | 'export-reminder' | null` based on store state, then renders the corresponding component. Cleaner than each banner reaching into the others.

2. **Coach mark trigger gating: empty plan vs first-planting-added**
   - What we know: D-05 says coach marks point at "the catalog button, drag affordance on a bar, lock toggle on a bar, Calendar tab." Two of these (drag, lock) require a plant to exist.
   - What's unclear: Show all 4 marks immediately (and accept that drag/lock marks float over empty space until the user adds a plant) OR stage them (catalog mark first, others after first add).
   - Recommendation: Stage. Mark 1 (catalog button) appears immediately on first /plan visit when plantings.length === 0. Marks 2-4 appear after plantings.length transitions to >= 1. Single `coachMarksDismissed` flag still kills both stages.

3. **Toast position (top-right vs bottom-center)**
   - What we know: `Toast.tsx` viewport currently set to `bottom-4 right-4`. CONTEXT discretion lists position as planner's call.
   - What's unclear: Whether bottom-right covers the gantt's lock icons / horizontal-scroll affordances on mobile.
   - Recommendation: Keep bottom-right on desktop (current); switch to bottom-center on `useIsMobile()` so it doesn't compete with the sticky plant-name column or any phone bottom-bar UI. Implement via two `<ToastViewport>` instances + `useIsMobile`.

4. **`_headers` interaction with Cloudflare Pages preview deploys**
   - What we know: `_headers` applies to all deploys (production + previews) per CF docs.
   - What's unclear: Whether preview-deploy URLs (e.g., `commit-hash.garden-gantt.pages.dev`) will have stale-cache problems if the user shares them.
   - Recommendation: Same headers apply across previews — no special handling needed. If per-PR previews are disabled (planner discretion per CONTEXT), this is moot.

## Sources

### Primary (HIGH confidence)
- npm registry (live queries 2026-04-27): zustand@5.0.12, @axe-core/cli@4.11.2, axe-core@4.11.3, @axe-core/playwright@4.11.2, react-joyride@3.0.2, shepherd.js@15.2.2, driver.js@1.4.0
- [Cloudflare Pages `_headers` documentation](https://developers.cloudflare.com/pages/configuration/headers/) — `_headers` syntax verified; `/index.html` no-cache + `/static/*` immutable example confirmed
- [Cloudflare Pages Git Integration](https://developers.cloudflare.com/pages/configuration/git-integration/) — automatic per-branch preview deploys verified
- [Cloudflare Pages Vite framework guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/) — `npm run build` + `dist` output verified
- Existing repo source files: `src/app/AppShell.tsx`, `src/app/Banner.tsx`, `src/app/PlanViewTabs.tsx`, `src/ui/Toast.tsx`, `src/ui/Dialog.tsx`, `src/stores/uiStore.ts`, `src/stores/planStore.ts`, `src/data/storage.ts`, `src/features/gantt/GanttView.tsx`, `src/features/setup/SetupWizard.tsx`, `src/index.css`, `public/_redirects`, `package.json`
- `.planning/phases/04-polish-mobile-ship/04-CONTEXT.md` — locked design decisions
- `.planning/research/STACK.md` — stack confirmation

### Secondary (MEDIUM confidence)
- WebSearch — Cloudflare Pages Vite build configuration, Node version defaults
- React 19 `useSyncExternalStore` semantics for `matchMedia` (canonical pattern)
- @dnd-kit `KeyboardSensor` exists and integrates with existing `DndContext` (Phase 3 already uses sensors)

### Tertiary (LOW confidence)
- Cloudflare Pages default Node version may have changed since training data; verify during deploy slice (A5)
- `pushToast` programmatic API existence — primitives verified, helper hook is an assumption (A3)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library already in the repo; only `@axe-core/cli` is potentially new and is dev-only
- Architecture: HIGH — patterns derived directly from existing repo conventions (persist boundary, useSyncExternalStore for matchMedia, Banner/Toast/Dialog primitives)
- Pitfalls: HIGH — specific to repo state (uiStore-not-persisted, foreignObject lock-toggle focus collision, ConstraintTooltip portal lifetime) rather than generic warnings
- Deploy: HIGH — Cloudflare docs verified live; `_headers` example matches deployed app needs
- Onboarding library deferral: HIGH — 4-mark scope + locked single-dismissal model + Tailwind/shadcn conventions make a hand-rolled callout cheaper than any tour library

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (30 days — stable surface; Cloudflare Pages Node default is the only thing likely to drift)

## RESEARCH COMPLETE

**Phase:** 04 - Polish, Mobile & Ship
**Confidence:** HIGH

### Key Findings
- **uiStore is currently memory-only** — D-06 and D-15 require a structural change (wrap in `persist` middleware with `partialize` restricted to `onboarding` + `exportReminder`, register `withStorageDOMEvents`). This is the gating Wave 0 chore for the onboarding and export-reminder slices.
- **Phase 4 ships zero new runtime KB** — every CONTEXT decision maps to existing primitives in the repo (Toast, Dialog, Banner, animate-pulse, native `<input type=date>`, useSyncExternalStore). The only optional install is `@axe-core/cli` for POL-09 — and Lighthouse is a viable fallback.
- **Coach marks should NOT use a tour library.** 4 static marks + locked single-dismissal model is cheaper to hand-roll than to install + customize react-joyride/shepherd/driver.js.
- **Cloudflare Pages git integration is the deploy path.** Configure `npm run build` + `dist/` in dashboard once; commit `public/_headers` with `index.html: no-cache` + `/assets/*: immutable max-age=31536000`. No GitHub Actions / Wrangler workflow needed unless preview-deploy shaping or env-var injection is required.
- **Two non-obvious integration risks:** (a) the existing `<foreignObject>` LockToggle creates a per-bar focus stop that collides with @dnd-kit's KeyboardSensor — keyboard-drag controller (POL-08) needs to choose tab-stop ownership deliberately. (b) ConstraintTooltip's 8-second sticky-pill lifetime (Phase 3 D-09) means naive `aria-live` will double-announce — key the announcement on `eventId + reasons.join('|')`.

### File Created
`/home/brock/src/garden_gantt/.planning/phases/04-polish-mobile-ship/04-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All libs already in repo; npm versions verified live |
| Architecture | HIGH | Patterns derived from existing repo conventions |
| Pitfalls | HIGH | Repo-specific (uiStore, foreignObject focus, ConstraintTooltip lifetime) |
| Deploy | HIGH | Cloudflare docs verified live |
| Open Questions | MEDIUM | 4 minor planner choices documented; none block planning |

### Open Questions
- Banner stacking implementation (single mount + selector vs N siblings each suppressing) — recommend single mount + selector
- Coach mark staging (immediate-all vs catalog-first-then-rest after first planting) — recommend stage
- Toast position on mobile (bottom-right vs bottom-center) — recommend bottom-center on mobile
- `_headers` behavior on per-PR preview URLs — applies uniformly; no extra handling

### Ready for Planning
Research complete. Planner can now create PLAN.md files. Recommend slicing along CONTEXT boundary (mobile / onboarding / states-and-confirms / export-reminder / a11y / deploy) with `uiStore` persist as Wave 0.
