# Phase 4: Polish, Mobile & Ship - Pattern Map

**Mapped:** 2026-04-27
**Files analyzed:** 22 new + 14 modified = 36
**Analogs found:** 33 / 36 (3 use research-only patterns)

---

## File Classification

### NEW files

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/features/mobile/useIsMobile.ts` | hook | event-driven (matchMedia) | `src/features/setup/lookupLocation.ts` (effect-subscribe shape) | role-match |
| `src/features/mobile/EditPlantingModal.tsx` | component (modal) | request-response | `src/features/settings/ImportPreviewModal.tsx` | exact (Dialog-confirm modal) |
| `src/features/onboarding/CoachMarks.tsx` | component (portal overlay) | event-driven | `src/features/gantt/tooltip/ConstraintTooltip.tsx` | exact (portal + getBoundingClientRect + resize/scroll listeners) |
| `src/features/onboarding/useCoachMarks.ts` | hook (controller) | request-response | `src/features/gantt/lock/useLockKeybinding.ts` | role-match (controller hook reading store) |
| `src/features/export-reminder/ExportReminderBanner.tsx` | component (banner) | request-response | `src/app/Banner.tsx` | exact |
| `src/features/export-reminder/useExportReminder.ts` | hook (selector) | derived state | `src/features/tasks/useTodayWeekOverdue.ts` (similar selector shape — not read but referenced from CONTEXT) | role-match |
| `src/features/keyboard-drag/useKeyboardBarDrag.ts` | hook (controller) | event-driven | `src/features/gantt/lock/useLockKeybinding.ts` + `src/stores/historyBindings.ts` | role-match (document keydown + delegated targeting) |
| `src/ui/Skeleton.tsx` | UI primitive | n/a (visual) | `src/ui/Switch.tsx` (smallest forwardRef primitive) | role-match (size + cn pattern) |
| `src/ui/SkipToMain.tsx` | UI primitive | n/a (a11y) | `src/ui/Button.tsx` (focus-visible pattern + cn) | partial |
| `src/app/StorageFullBanner.tsx` (or extend Banner.tsx) | component (banner) | event-driven | `src/app/Banner.tsx` | exact |
| `tests/fixtures/200-event-stress.ts` | test fixture | n/a (data) | `src/samplePlan.ts` (existing seed plan; multiplied via succession) | role-match |
| `public/_headers` | config | n/a | `public/_redirects` | role-match (CF Pages convention file) |

### MODIFIED files

| Modified File | Role | What Changes | Pattern Source for Edit |
|---------------|------|--------------|-------------------------|
| `src/stores/uiStore.ts` | store | Add `persist` middleware + `onboarding` + `exportReminder` slices | `src/stores/catalogStore.ts` (existing persist + migrate boilerplate) |
| `src/stores/planStore.ts` | store | Add `dirtySinceExport` increment hooks inside coarse setters | self (current setter shape) |
| `src/app/AppShell.tsx` | layout shell | Mount banners (Storage/Export-reminder), SkipToMain, sr-only aria-live announcer | self (existing Banner + ConstraintTooltip mount points lines 86, 161) |
| `src/app/Banner.tsx` | component (banner) | OPTIONAL: extend with variant prop, OR keep as iOS-only sibling | self |
| `src/app/PlanViewTabs.tsx` | layout | Mount-time `useIsMobile()` → set `?view=calendar` default if mobile | self (existing `useSearchParams` plumbing) |
| `src/features/gantt/GanttView.tsx` | component | Wrap left label column in sticky-positioned div at <640px | self (lines 162-189 — left label column already exists) |
| `src/features/gantt/EmptyGanttState.tsx` | component | Retune copy to D-11 ("No plants yet." + "Add your first plant →") | self |
| `src/features/calendar/DayDetailDrawer.tsx` | component | Retune empty-state copy to D-11 ("Nothing scheduled.") | self (lines 145-152 — empty branch already exists) |
| `src/features/tasks/TasksDashboard.tsx` | component | Retune empty-state copy to D-11 ("No tasks today.") | self (lines 56-63 — empty branch exists) |
| `src/features/catalog/CatalogBrowser.tsx` | component | Retune empty-filter copy to D-11 ("No matches." + "Clear filters") | self (lines 200-210 — empty branch exists); add `<Skeleton>` grid during initial fetch |
| `src/features/setup/lookupLocation.ts` | hook | Wire bad-ZIP error path to D-10 inline error on `<Input>` | self + `src/features/setup/ZipInput.tsx` (already has `error` prop) |
| `src/features/settings/exportPlan.ts` | utility | Post-download side-effect: `setLastExportedAt(nowISOString())` + reset dirty counter | self (line 58 — return on success) |
| `src/features/settings/ImportPreviewModal.tsx` | component (modal) | Inline corrupt-import error in body | self (line 47-52 — amber-bg warning row already shows current-plan count) |
| `src/features/settings/SettingsPanel.tsx` | component | Add "Reset onboarding" row (D-06); modal-confirm for "Clear plan" | self + `src/features/catalog/DeletePlantDialog.tsx` (Dialog-confirm shape) |
| `src/data/storage.ts` | utility | Wrap `setItem` in try/catch → set `uiStore.isStorageFull = true` on quota-exceeded | self (line 13-21 — existing probe try/catch shape) |
| `src/index.css` | config (theme) | Add Phase 4 `@theme` tokens (touch-target, sticky-col, banner-h, skeleton-radius); WCAG AA token tweaks | self |
| `src/main.tsx` | bootstrap | Wire `withStorageDOMEvents(useUIStore)` after persist migration | self (lines 20-21 — existing pattern for plan + catalog stores) |
| `src/features/gantt/tooltip/ConstraintTooltip.tsx` | component | Add `aria-live="polite"`, Esc-dismiss, tab focus stop, sr-only summary | self (lines 139-161 — portal root) |
| `src/features/gantt/lock/LockToggle.tsx` | component | Hide at <640px via `useIsMobile()` (D-03) | self |

---

## Pattern Assignments

### `src/features/mobile/useIsMobile.ts` (hook, event-driven)

**Analog:** Hand-rolled `useSyncExternalStore` over `matchMedia` (no perfect existing analog — closest is `src/features/setup/lookupLocation.ts` for effect-subscribe lifecycle).

**Pattern source:** RESEARCH §Pattern 1 (verbatim) + cleanup pattern from `src/stores/historyBindings.ts:50-52`.

**Concrete shape:**
```typescript
import { useSyncExternalStore } from 'react';
const QUERY = '(max-width: 639px)';
function getSnapshot(): boolean { return window.matchMedia(QUERY).matches; }
function subscribe(cb: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
```

---

### `src/features/mobile/EditPlantingModal.tsx` (component, request-response)

**Analog:** `src/features/settings/ImportPreviewModal.tsx` (lines 1-65 — full file)

**Imports pattern** (lines 1-15):
```typescript
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
  DialogHeader, DialogFooter,
} from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { usePlanStore } from '../../stores/planStore';
```

**Modal shell pattern** (ImportPreviewModal.tsx lines 34-63):
```typescript
return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit {plant.name}</DialogTitle>
      </DialogHeader>
      {/* body: native <input type=date> + Switch lock row + cascade summary */}
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>Save</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
```

**Date parsing constraint:** `src/features/mobile/` is NOT in ESLint allowlist for raw `new Date()`. Native `<input type=date>` returns `YYYY-MM-DD`; convert via `dateWrappers.ts` helpers (e.g., `ymdToISONoon` pattern from `src/features/setup/SetupStepLocation.tsx:62-64`):
```typescript
function ymdToISONoon(ymd: string): string { return `${ymd}T12:00:00.000Z`; }
```

**Save behavior:** Calls `usePlanStore.getState().commitEdit(...)` — same setter the desktop drag uses → automatically participates in zundo + dirty-counter.

**Switch row pattern** (already in `src/ui/Switch.tsx`):
```typescript
<Switch checked={locked} onCheckedChange={(v) => setLock(plantingId, eventType, v)} />
```

---

### `src/features/onboarding/CoachMarks.tsx` (component, event-driven portal)

**Analog:** `src/features/gantt/tooltip/ConstraintTooltip.tsx` (lines 50-162) — same portal + position-from-bounding-rect + resize/scroll observer shape.

**Portal pattern** (ConstraintTooltip.tsx lines 139-161):
```typescript
return createPortal(
  <div role="dialog" aria-modal="true" aria-labelledby="coach-mark-heading"
       className="fixed z-50 bg-white rounded-md border border-stone-200 shadow-lg p-4
                  max-w-[var(--spacing-coach-mark-callout)]"
       style={{ left: anchorPos.left, top: anchorPos.top }}>
    {/* heading + body + Skip/Next buttons */}
  </div>,
  document.body,
);
```

**Position-from-target pattern** (ConstraintTooltip.tsx lines 97-124):
```typescript
useLayoutEffect(() => {
  const compute = () => {
    const el = document.querySelector(`[data-coach-target="${currentMarkId}"]`);
    if (!el) return setAnchorPos(null);
    const r = el.getBoundingClientRect();
    setAnchorPos({ left: r.left + r.width / 2 - CALLOUT_W / 2, top: r.bottom + 12 });
  };
  queueMicrotask(compute);
  window.addEventListener('resize', compute);
  window.addEventListener('scroll', compute, true);
  return () => {
    window.removeEventListener('resize', compute);
    window.removeEventListener('scroll', compute, true);
  };
}, [currentMarkId]);
```

**Backdrop with target cutout** (UI-SPEC §Coach-mark visual style):
```typescript
<div className="fixed inset-0 z-40 bg-stone-900/40" />
{/* Target gets `position: relative; z-index: 50` via portal-mounted style or its own className wrap */}
```

**Esc/Enter keyboard** — mirror `src/stores/historyBindings.ts:32-52` document keydown shape.

---

### `src/features/onboarding/useCoachMarks.ts` (hook, controller)

**Analog:** `src/features/gantt/lock/useLockKeybinding.ts` (lines 1-42) — controller-style hook reading from store.

**Pattern:**
```typescript
import { useUIStore } from '../../stores/uiStore';
export function useCoachMarks() {
  const dismissed = useUIStore((s) => s.onboarding.coachMarksDismissed);
  const setDismissed = useUIStore((s) => s.setCoachMarksDismissed);
  const [currentMarkIndex, setCurrentMarkIndex] = useState(0);
  // first-visit-to-/plan logic + currentMarkId derivation
  return { active: !dismissed, currentMarkIndex, dismiss: () => setDismissed(true), advance: () => setCurrentMarkIndex(i => i + 1) };
}
```

---

### `src/features/export-reminder/ExportReminderBanner.tsx` (component, banner)

**Analog:** `src/app/Banner.tsx` (lines 1-40 — full file)

**Imports pattern** (Banner.tsx lines 1-5):
```typescript
import { X } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
```

**Banner shell pattern** (Banner.tsx lines 14-39, ADAPTED for stone palette per UI-SPEC):
```typescript
return (
  <aside
    role="status"
    aria-live="polite"
    className="sticky top-0 z-30 w-full bg-stone-100 text-stone-900 border-b border-stone-200 px-4 py-3"
  >
    <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
      <p className="text-sm font-normal">
        You have <strong>{count}</strong> unsaved changes since {date}.
      </p>
      <div className="flex gap-2">
        <button onClick={handleExport} className="text-sm font-medium text-green-700">Export plan</button>
        <button onClick={() => snooze(3)} className="text-sm text-stone-600">Remind me later</button>
        <button onClick={() => snooze(30)} className="text-sm text-stone-600">Don't remind for 30 days</button>
      </div>
    </div>
  </aside>
);
```

---

### `src/features/export-reminder/useExportReminder.ts` (hook, selector)

**Analog:** No exact analog — pattern from RESEARCH D-12. Closest existing shape: `src/stores/catalogStore.ts:86-96` `selectMerged` derived selector.

**Pattern (composition over uiStore):**
```typescript
export function useExportReminder() {
  const { lastExportedAt, dirtySinceExport, snoozedUntil } = useUIStore((s) => s.exportReminder);
  const now = nowISOString();
  if (snoozedUntil && now < snoozedUntil) return { shouldShow: false };
  const dirtyMet = dirtySinceExport >= 20;
  const ageMet = lastExportedAt && (Date.parse(now) - Date.parse(lastExportedAt) >= 14 * 86400000) && dirtySinceExport > 0;
  return { shouldShow: dirtyMet || ageMet, count: dirtySinceExport, lastExportedAt };
}
```

**dateWrappers constraint:** Use `nowISOString()` from `src/domain/dateWrappers.ts` per CONTEXT (no raw `new Date()` outside allowlist).

---

### `src/features/keyboard-drag/useKeyboardBarDrag.ts` (hook, event-driven)

**Analog:** `src/stores/historyBindings.ts` (lines 31-52) for document keydown pattern + `src/features/gantt/lock/useLockKeybinding.ts` (lines 19-42) for `data-event-id` delegated targeting.

**Form-focus suppression pattern** (historyBindings.ts lines 24-29):
```typescript
function isFormFocus(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches('input, textarea, [contenteditable="true"], [contenteditable=""]');
}
```

**Delegated target lookup** (useLockKeybinding.ts lines 22-31):
```typescript
const target = (e.target as Element | null)?.closest(
  '[data-event-id][data-planting-id][data-event-type]',
);
if (!target) return;
const plantingId = target.getAttribute('data-planting-id');
const eventType = target.getAttribute('data-event-type') as EventType | null;
```

**Commit through existing setter** (mirrors useLockKeybinding.ts:37):
```typescript
usePlanStore.getState().commitEdit({ plantingId, eventType, newStart, ... });
```

**zundo integration:** Single history entry on Enter (calls `commitEdit`); no entry on Escape (no setter call).

---

### `src/ui/Skeleton.tsx` (UI primitive)

**Analog:** `src/ui/Switch.tsx` (lines 1-33) — smallest forwardRef primitive with cn + Tailwind utility classes.

**Pattern:**
```typescript
import { cn } from './cn';
export interface SkeletonProps {
  variant?: 'line' | 'rect' | 'card';
  w?: string;
  h?: string;
  count?: number;
  className?: string;
}
export function Skeleton({ variant = 'line', w, h, count = 1, className }: SkeletonProps) {
  // bg-stone-200 animate-pulse rounded-[var(--spacing-skeleton-radius)]
  const items = Array.from({ length: count }).map((_, i) => (
    <div
      key={i}
      className={cn(
        'bg-stone-200 animate-pulse rounded-[var(--spacing-skeleton-radius)]',
        variant === 'line' && 'h-5 w-full',
        variant === 'rect' && 'h-32 w-full',
        variant === 'card' && 'h-48 w-full',
        className,
      )}
      style={{ width: w, height: h }}
    />
  ));
  return <>{items}</>;
}
```

---

### `src/ui/SkipToMain.tsx` (UI primitive, a11y)

**Analog:** `src/ui/Button.tsx` lines 13 (focus-visible style) + AppShell.tsx line 153 (existing `<main id="main">` anchor).

**Pattern:**
```typescript
export function SkipToMain() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50
                 bg-white border border-stone-200 px-3 py-2 rounded-md text-sm font-medium
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
    >
      Skip to main content
    </a>
  );
}
```

---

### `src/app/StorageFullBanner.tsx` (component) — OR extend `Banner.tsx`

**Analog:** `src/app/Banner.tsx` (lines 1-40 — full file). Reuse amber palette unchanged.

**Recommended:** Extend `Banner.tsx` with a `variant` prop, OR add this as a sibling. Per Phase 4 banner-stack contract (UI-SPEC §Banner stack), `AppShell.tsx` priority-sorts and renders only the highest-priority banner.

**Pattern from Banner.tsx adapted:**
```typescript
const isStorageFull = useUIStore((s) => s.isStorageFull);
if (!isStorageFull) return null;
return (
  <aside role="status" aria-live="polite"
         className="sticky top-0 z-30 w-full bg-amber-100 text-amber-800 border-b border-amber-200 px-4 py-3">
    <p className="text-sm font-semibold">Storage full.</p>
    <p className="mt-1 text-sm">Export your plan to free space. New changes won't be saved until you do.</p>
    <Button variant="primary" size="sm" onClick={handleExport}>Export plan</Button>
  </aside>
);
```

---

### `src/stores/uiStore.ts` (MODIFIED — add persist + slices)

**Analog for persist wrapper:** `src/stores/catalogStore.ts` lines 27-67 — entire persist + migrate boilerplate.

**Persist setup pattern** (catalogStore.ts lines 27-67):
```typescript
import { persist, createJSONStorage } from 'zustand/middleware';
const SCHEMA_VERSION = 1;
const migrations: Record<number, (state: unknown) => unknown> = {};
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({ /* state + setters */ }),
    {
      name: 'garden-gantt:ui',
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      // PARTIALIZE: only persist onboarding + exportReminder slices.
      // Phase 1/2/3 transient flags (filterChips, searchQuery, lastConstraintViolation, etc.)
      // are MEMORY-ONLY per Phase 2 Pitfall K — do NOT include in partialize output.
      partialize: (s) => ({
        onboarding: s.onboarding,
        exportReminder: s.exportReminder,
      }),
      migrate: (persisted, fromVersion) => {
        let st = persisted;
        for (let v = fromVersion + 1; v <= SCHEMA_VERSION; v++) {
          const m = migrations[v];
          if (m) st = m(st);
        }
        return st as UIState;
      },
    },
  ),
);
```

**New slice shapes (per D-06, D-15):**
```typescript
interface UIState {
  // ... existing Phase 1/2/3 slots ...
  onboarding: { coachMarksDismissed: boolean };
  setCoachMarksDismissed: (v: boolean) => void;
  exportReminder: { lastExportedAt: string | null; dirtySinceExport: number; snoozedUntil: string | null };
  setLastExportedAt: (iso: string) => void;
  incrementDirty: () => void;
  resetDirty: () => void;
  setSnoozedUntil: (iso: string | null) => void;
  isStorageFull: boolean;
  setStorageFull: (v: boolean) => void;
}
```

**Multi-tab sync wiring:** `src/main.tsx:20-21` already calls `withStorageDOMEvents(usePlanStore)` + `withStorageDOMEvents(useCatalogStore)`. Add a third line:
```typescript
withStorageDOMEvents(useUIStore);
```

---

### `src/stores/planStore.ts` (MODIFIED — coarse dirty-edit increments)

**Analog:** Self — existing setter shape (lines 120-350).

**Pattern:** Inside each coarse setter (per D-14 list), call `useUIStore.getState().incrementDirty()` after the `set()` call:
```typescript
commitEdit: (edit) => {
  set((s) => /* existing logic */);
  useUIStore.getState().incrementDirty();
},
```

**Apply to (D-14):** `commitEdit`, `addPlanting`, `removePlanting`, `editPlanting`, `addCustomTask`, `editCustomTask`, `removeCustomTask`, `upsertCustomPlant`, `removeCustomPlant`, `removeCustomPlantWithCascade`, `setLocation`.

**Do NOT increment on:** `setLock`, `toggleTaskCompletion`, `loadSamplePlan`, `replacePlan`, undo/redo replays (already filtered by zundo — replays don't go through setters).

---

### `src/data/storage.ts` (MODIFIED — quota-exceeded detection)

**Analog:** Self — existing `probeStorage` try/catch (lines 12-21).

**Pattern:** Add a `wrapSetItemForQuotaCatch` helper or wrap the persist storage adapter. Simpler: subscribe to persist `onError` (not standard) — instead, intercept by overriding `localStorage.setItem` once at app boot:
```typescript
export function watchQuotaExceeded(onFull: () => void): () => void {
  const original = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function patched(key, value) {
    try { original(key, value); }
    catch (err) {
      if (err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22)) {
        onFull();
      }
      throw err;
    }
  };
  return () => { localStorage.setItem = original; };
}
```
Wire from `src/main.tsx` after `probeStorage()`: `watchQuotaExceeded(() => useUIStore.getState().setStorageFull(true));`

---

### `src/app/AppShell.tsx` (MODIFIED — mount banners + skip link + announcer)

**Analog:** Self (lines 84-163 — existing render shape).

**Pattern (insert above existing `<Banner />` line 86):**
```typescript
<>
  <SkipToMain />
  {/* Priority-sorted banner stack — render only the highest-priority eligible banner */}
  {isStorageFull ? <StorageFullBanner /> : !isStorageAvailable ? <Banner /> : shouldShowExportReminder ? <ExportReminderBanner /> : null}
  <header /* existing */ />
  <main id="main" /* existing */>{children}</main>
  {/* sr-only live region for keyboard-drag announcements */}
  <div aria-live="polite" className="sr-only" id="kbd-drag-announcer" />
  {/* existing portals */}
  <MyPlanPanel />
  <PermapeopleAttributionFooter />
  <ConstraintTooltip />
  <CoachMarks /> {/* mount on /plan only — internal route check */}
</>
```

---

### `src/app/PlanViewTabs.tsx` (MODIFIED — CAL-04 default)

**Analog:** Self (lines 15-26 — existing `useSearchParams` plumbing).

**Pattern (add to existing component):**
```typescript
import { useEffect } from 'react';
import { useIsMobile } from '../features/mobile/useIsMobile';
// ... existing useSearchParams ...
const isMobile = useIsMobile();
useEffect(() => {
  // CAL-04: on mobile mount with no explicit ?view=, default to calendar.
  if (isMobile && !searchParams.has('view')) {
    const sp = new URLSearchParams(searchParams);
    sp.set('view', 'calendar');
    setSearchParams(sp, { replace: true });
  }
}, [isMobile]); // eslint-disable-line react-hooks/exhaustive-deps -- only react to mobile changes
```

---

### `src/features/gantt/GanttView.tsx` (MODIFIED — sticky plant column)

**Analog:** Self (lines 162-189 — left label column already exists OUTSIDE the SVG).

**Pattern:** The existing structure is already friendly: a sibling `<div>` left of the SVG + `<div className="overflow-x-auto flex-1">` wrapping the SVG. Add `position: sticky; left: 0; z-index: 10` to the label column wrapper at <640px:
```typescript
const isMobile = useIsMobile();
// ...
<div className="flex">
  <div
    className={cn(
      "border-r border-stone-200 shrink-0 bg-white",
      isMobile && "sticky left-0 z-10",
    )}
    style={{ width: isMobile ? 'var(--spacing-sticky-plant-col)' : LABEL_WIDTH }}
  >
    {/* existing label rows */}
  </div>
  <div className="overflow-x-auto flex-1">{/* existing SVG */}</div>
</div>
```

**Tap-handle overlay** (D-02 trigger): Add a transparent 44px-tall `<rect>` overlay per bar at <640px that fires `onClick={() => openEditModal(plantingId, eventType)}` — pattern from `src/features/gantt/lock/LockToggle.tsx:35-39` (button onClick + stopPropagation).

---

### `src/features/settings/exportPlan.ts` (MODIFIED — post-download side-effect)

**Analog:** Self (lines 50-58 — existing return path).

**Pattern (add before `return { ok: true, ... }` line 58):**
```typescript
// D-15: post-export bookkeeping — single side-effect site for "plan exported".
useUIStore.getState().setLastExportedAt(nowISOString());
useUIStore.getState().resetDirty();
return { ok: true, filename };
```

---

### `src/features/settings/SettingsPanel.tsx` (MODIFIED — Reset onboarding + Clear plan modal)

**Analog for "Reset onboarding" row:** Self (lines 56-68 — existing Export section structure).

**Analog for Clear-plan modal-confirm:** `src/features/catalog/DeletePlantDialog.tsx` (full file, lines 1-57).

**Pattern (DeletePlantDialog adapted for clear-plan):**
```typescript
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Clear plan?</DialogTitle>
      <DialogDescription>
        This removes all plantings, custom plants, custom tasks, and drag adjustments.
        Export first if you want a backup. This can't be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button variant="destructive" onClick={handleConfirmClear}>Clear plan</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### `src/features/setup/lookupLocation.ts` + `src/features/setup/ZipInput.tsx` (MODIFIED — wire D-10 inline error)

**Analog:** `src/features/setup/ZipInput.tsx:24, 36-48` — `error` prop + `aria-invalid` + red helper text already exist.

**Pattern (caller-side wiring):** When `useLookupLocation()` returns `{ status: 'not-found' }`, pass error string into `<ZipInput error="...">`. UI-SPEC §Error states copy: `Couldn't find that ZIP. Try a 5-digit US ZIP, or enter your zone manually below.`

---

### `src/features/gantt/tooltip/ConstraintTooltip.tsx` (MODIFIED — a11y plumbing)

**Analog:** Self (lines 139-161 — existing portal root).

**Patterns to add:**
```typescript
// 1. aria-live: change role="status" to also have aria-live (it implicitly does, but make it explicit)
<div role="status" aria-live="polite" aria-atomic="true" tabIndex={0} ...>

// 2. Esc-dismiss handler at portal root:
useEffect(() => {
  if (!violation) return;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setStickyViolation(null);
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}, [violation, setStickyViolation]);

// 3. sr-only summary text duplicating visible header + body:
<span className="sr-only">{header}: {body}</span>
```

---

### `tests/fixtures/200-event-stress.ts` (NEW)

**Analog:** `src/samplePlan.ts` — existing seeded GardenPlan; multiply via succession + custom plants to reach ~40 plantings × 5 events = ~200.

**Pattern (sketch):**
```typescript
import { samplePlan } from '../../src/samplePlan';
import type { GardenPlan } from '../../src/domain/types';
export const stressFixture: GardenPlan = {
  ...samplePlan,
  plantings: Array.from({ length: 40 }, (_, i) => ({
    id: `stress-${i}`,
    plantId: samplePlan.plantings[i % samplePlan.plantings.length]!.plantId,
    successionIndex: 0,
    successionEnabled: i % 3 === 0, // ~13 successions to push event count
  })),
};
```

---

### `public/_headers` (NEW — DEPLOY-03)

**Analog:** `public/_redirects` (CF Pages convention file, single line).

**Pattern (RESEARCH §DEPLOY-03 + Cloudflare Pages docs):**
```
/index.html
  Cache-Control: no-cache, no-store, must-revalidate
```

**No analog needed** — this is a static config file, syntax verified against Cloudflare Pages headers documentation in CONTEXT canonical refs.

---

## Shared Patterns

### Cn-utility for class composition
**Source:** `src/ui/cn.ts` (used universally — every UI component imports `cn`)
**Apply to:** All new components (Skeleton, SkipToMain, ExportReminderBanner, CoachMarks, EditPlantingModal, StorageFullBanner)
```typescript
import { cn } from '../../ui/cn';
className={cn('base-classes', conditional && 'extra-classes', className)}
```

### Focus-visible ring pattern (POL-08, POL-09)
**Source:** `src/ui/Button.tsx:13`, `src/ui/Input.tsx:11`, `src/ui/Switch.tsx:19`, `src/ui/Dialog.tsx:67`
**Apply to:** All new focusable elements (CoachMarks Skip/Next buttons, Skeleton has none, SkipToMain link, EditPlantingModal date inputs, Banner Export buttons)
```typescript
'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700'
```
For destructive actions: `outline-red-700` (Button.tsx:19).

### Dialog modal-confirm pattern (D-09 irreversible ops)
**Source:** `src/features/catalog/DeletePlantDialog.tsx` (lines 27-57)
**Apply to:** Settings "Clear plan" confirm; ImportPreviewModal already has confirm step.
```typescript
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Action?</DialogTitle>
      <DialogDescription>{rationale}</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button variant="destructive" onClick={onConfirm}>Action</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Toast-with-undo pattern (D-09 reversibles)
**Source:** `src/ui/Toast.tsx` (full file — primitives already exist) + `src/stores/planStore.ts:429-432` (`getTemporal()` accessor)
**Apply to:** delete planting, delete custom task, clear completed tasks, hide event
```typescript
import { Toast, ToastTitle, ToastAction } from '../../ui/Toast';
import { getTemporal } from '../../stores/planStore';

<Toast variant="success" duration={5000}>
  <ToastTitle>Deleted {plant.name}.</ToastTitle>
  <ToastAction altText="Undo" onClick={() => getTemporal().undo()}>Undo</ToastAction>
</Toast>
```

### Banner shell (D-10/D-13)
**Source:** `src/app/Banner.tsx` (lines 14-39)
**Apply to:** StorageFullBanner (amber, copy from UI-SPEC §Error states), ExportReminderBanner (stone palette per UI-SPEC §Color)
- `<aside role="status" aria-live="polite" className="sticky top-0 z-30 w-full ... border-b ... px-4 py-3">`
- Inner `<div className="max-w-7xl mx-auto flex items-start justify-between gap-4">`
- Dismiss: `<button aria-label="Dismiss banner">` (StorageFull is non-dismissible per spec — only export resolves it)

### Document keydown listener pattern (POL-08)
**Source:** `src/stores/historyBindings.ts:31-52` + `src/features/gantt/lock/useLockKeybinding.ts:19-42`
**Apply to:** useKeyboardBarDrag, CoachMarks Esc handler, ConstraintTooltip Esc-dismiss
```typescript
useEffect(() => {
  const onKey = (e: KeyboardEvent) => { /* check key + dispatch */ };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}, [/* deps */]);
```

### Persist middleware pattern (D-06, D-15)
**Source:** `src/stores/catalogStore.ts:27-67` (entire wrapper)
**Apply to:** uiStore rewrite (Wave 0)
- `name: 'garden-gantt:ui'`
- `version: 1` (incrementable later)
- `storage: createJSONStorage(() => localStorage)`
- `partialize` to whitelist ONLY persist-eligible slices (CRITICAL — Phase 2 Pitfall K explicitly bans persisting filterChips/searchQuery/transient drag flags)
- `migrate` boilerplate ready for future bumps

### Date wrapper invariant (CLAUDE.md project rule)
**Source:** `src/domain/dateWrappers.ts` (referenced; uses `nowISOString()`, `parseDate()`, `toISODate()`)
**Apply to:** EditPlantingModal native-date parsing, useExportReminder timestamp comparison, exportPlan post-side-effect, ConstraintTooltip Esc-dismiss timeout
- ESLint `no-restricted-syntax` bans raw `new Date()` outside the wrapper module
- Native `<input type=date>` returns `YYYY-MM-DD` strings — convert with `ymdToISONoon` helper (pattern at `src/features/setup/SetupStepLocation.tsx:62-64`)

### Empty-state shape (D-11)
**Source:** `src/features/tasks/TasksDashboard.tsx:56-63`, `src/features/calendar/DayDetailDrawer.tsx:145-152`, `src/features/gantt/EmptyGanttState.tsx:11-30`, `src/features/catalog/CatalogBrowser.tsx:200-210`
**Apply to:** All four surfaces — retune copy to D-11 terse action-first per UI-SPEC §Empty states table
```typescript
<div className="py-12 text-center">
  <h2 className="text-xl font-semibold text-stone-900 mb-2">{terseSentence}</h2>
  {/* optional: <Button variant="primary">{ctaLabel}</Button> */}
</div>
```

### sr-only live announcer (POL-08)
**Source:** No existing analog — pattern from UI-SPEC §Keyboard a11y + ConstraintTooltip portal
**Apply to:** AppShell mount once; useKeyboardBarDrag writes to it via `document.getElementById('kbd-drag-announcer').textContent = msg;`
```typescript
<div aria-live="polite" className="sr-only" id="kbd-drag-announcer" />
```

---

## No Analog Found

Files with no close match in the codebase (use RESEARCH.md / UI-SPEC.md patterns directly):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `public/_headers` | config | n/a | CF Pages convention; no codebase analog beyond `_redirects` (different shape). Use Cloudflare Pages `_headers` syntax verbatim from RESEARCH §DEPLOY-03. |
| `tests/fixtures/200-event-stress.ts` | test fixture | n/a | No `tests/fixtures/` directory exists yet; new convention. Build from `src/samplePlan.ts`. |
| `.github/workflows/deploy.yml` (OPTIONAL) | CI config | n/a | No `.github/` directory in repo; only needed if planner picks Wrangler over CF Pages git integration. RESEARCH §DEPLOY-01 recommends git integration → file likely unnecessary. |

---

## Metadata

**Analog search scope:**
- `src/ui/` — all 11 primitive components
- `src/app/` — Banner, AppShell, PlanViewTabs
- `src/stores/` — uiStore, planStore, catalogStore, historyBindings
- `src/features/gantt/` — GanttView, EmptyGanttState, ConstraintTooltip, LockToggle, useLockKeybinding
- `src/features/settings/` — exportPlan, ImportPreviewModal, SettingsPanel
- `src/features/setup/` — ZipInput, lookupLocation, SetupStepLocation
- `src/features/calendar/` — DayDetailDrawer
- `src/features/tasks/` — TasksDashboard
- `src/features/catalog/` — CatalogBrowser, PlantCard, DeletePlantDialog
- `src/data/` — storage
- `src/main.tsx`, `vite.config.ts`, `public/_redirects`

**Files scanned:** 28
**Pattern extraction date:** 2026-04-27

---

## PATTERN MAPPING COMPLETE
