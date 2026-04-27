---
phase: 04-polish-mobile-ship
reviewed: 2026-04-27T00:00:00Z
depth: standard
files_reviewed: 35
files_reviewed_list:
  - public/_headers
  - src/app/AppShell.tsx
  - src/app/PlanViewTabs.tsx
  - src/app/StorageFullBanner.tsx
  - src/data/storage.ts
  - src/domain/dateWrappers.ts
  - src/features/calendar/DayDetailDrawer.tsx
  - src/features/catalog/CatalogBrowser.tsx
  - src/features/catalog/CustomPlantModal.tsx
  - src/features/catalog/MyPlanPanel.tsx
  - src/features/export-reminder/ExportReminderBanner.tsx
  - src/features/export-reminder/useExportReminder.ts
  - src/features/gantt/EmptyGanttState.tsx
  - src/features/gantt/GanttView.tsx
  - src/features/gantt/lock/LockToggle.tsx
  - src/features/gantt/tooltip/ConstraintTooltip.tsx
  - src/features/keyboard-drag/useKeyboardBarDrag.ts
  - src/features/mobile/EditPlantingModal.tsx
  - src/features/mobile/useIsMobile.ts
  - src/features/onboarding/CoachMarks.tsx
  - src/features/onboarding/coachMarks.types.ts
  - src/features/onboarding/useCoachMarks.ts
  - src/features/settings/exportPlan.ts
  - src/features/settings/ImportPreviewModal.tsx
  - src/features/settings/SettingsPanel.tsx
  - src/features/setup/SetupStepLocation.tsx
  - src/features/tasks/CustomTaskModal.tsx
  - src/features/tasks/TasksDashboard.tsx
  - src/index.css
  - src/main.tsx
  - src/stores/planStore.ts
  - src/stores/uiStore.ts
  - src/ui/Skeleton.tsx
  - src/ui/SkipToMain.tsx
  - src/ui/toast/ToastHost.tsx
  - src/ui/toast/useToast.ts
findings:
  blocker: 3
  warning: 13
  info: 6
  total: 22
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-04-27
**Depth:** standard
**Files Reviewed:** 35
**Status:** issues_found

## Summary

The Phase 4 polish/mobile/ship surface is broadly well-constructed: persistence
discipline is tight (whitelisted partialize, dedicated storage probe, rAF-coalesced
zundo), date math is consistently routed through the `dateWrappers` allowlist, and
the banner-stack/toast-with-undo plumbing follows the documented contracts. That
said, several real correctness defects landed in this batch:

- A "Delete plant" button that does not delete (CustomPlantModal edit mode).
- A custom-plant ID derivation that silently overwrites existing plants on slug
  collision, including curated catalog entries with the same kebab form.
- Several setters (`setLock`, `clearPlan`, `clearCompletedTaskIds`,
  `toggleTaskCompletion`) bypass `incrementDirty()`, so the export-reminder
  D-12/D-14 contract diverges across the setter surface — and `clearPlan` leaves
  a stale dirty counter that will produce a wrong "N unsaved changes" banner.
- `EditPlantingModal` always commits an edit and increments dirty even when the
  user changed nothing, and deletes the planting with no confirmation — a UX
  regression vs. desktop and an irreversible-action contract violation.

A handful of smaller robustness issues (CSS-injection in `querySelector`,
deprecated `navigator.platform`, nested-Dialog focus, "today" computed in UTC
not local) round out the warning set.

## Critical Issues

### CR-01: "Delete plant" button in edit mode does nothing

**File:** `src/features/catalog/CustomPlantModal.tsx:722-737`
**Severity:** BLOCKER
**Issue:** In edit mode the modal renders a `Delete plant` button whose only
side effect is `onOpenChange(false)` — i.e., it closes the modal without
deleting anything. The comment above it acknowledges this and says the user
"must use the dropdown" instead, but the visible label is unambiguous and the
button advertises a destructive action it does not perform. This is silent
data-integrity confusion at best (user thinks plant is deleted, it isn't) and a
trust failure at worst.
**Fix:** Either remove the button entirely, or wire it to the actual delete
flow (open `DeletePlantDialog`/`removeCustomPlantWithCascade` with cascade
confirmation):
```tsx
onClick={() => {
  onOpenChange(false);
  // Hand off to the cascade-confirmation flow owned by CatalogBrowser
  // by lifting `pendingDelete` to a parent or via a callback prop.
  onRequestDelete?.(editingPlant);
}}
```
Add an `onRequestDelete` prop and surface it from `CatalogBrowser` to open
`DeletePlantDialog` with the correct reference count. If the architectural
decision is "edit modal must not delete", remove the button — do not ship a
control whose label lies about its behavior.

---

### CR-02: Custom plant slug collisions silently overwrite catalog entries

**File:** `src/features/catalog/CustomPlantModal.tsx:123-129, 207-208`
**Severity:** BLOCKER
**Issue:** New custom plants get their `id` from `kebabCase(form.name)`. The
kebab-case implementation collapses every non-`[a-z0-9]` run to a single dash
and trims leading/trailing dashes, so "Beet — Detroit Dark Red", "Beet Detroit
Dark Red", and "beet detroit dark red" all yield `beet-detroit-dark-red`.
Worse, curated catalog plant IDs (e.g. `tomato`, `lettuce`) are reachable —
typing "Tomato" as a custom plant name and saving builds id `tomato`, and
`upsertCustomPlant` happily writes a custom plant under that key, masking the
curated entry in `selectMerged` (custom plants override curated by id in the
merged view). This is silent data loss / catalog poisoning. There is no
collision check in `handleSave` or in `upsertCustomPlant`.
**Fix:** Detect collisions before `upsert` and either (a) suffix the slug with
a uniqueness counter or random nonce, or (b) reject the save with an inline
error directing the user to rename:
```tsx
const candidateId = kebabCase(form.name);
if (!isEdit && merged.has(candidateId)) {
  setErrors({ name: 'A plant with this name already exists. Pick a different name.' });
  return;
}
```
For long-term safety, also generate a guaranteed-unique id (e.g.
`custom-${kebabCase(name)}-${randomSuffix}`) so user-typed names never collide
with curated keys regardless of validation order.

---

### CR-03: `clearPlan` leaves stale dirty counter, producing a phantom export-reminder banner

**File:** `src/stores/planStore.ts:385` (and:280, 366, 389)
**Severity:** BLOCKER
**Issue:** `clearPlan` resets `plan` to `null` but does NOT reset
`useUIStore.exportReminder.dirtySinceExport`. After a user clears their plan,
the export-reminder banner (driven by `dirtySinceExport >= 20`) will still
show "You have N unsaved changes" pointing at a non-existent plan. The CTA
`Export plan` then short-circuits in `exportPlan()` with `{ ok: false, reason:
'No plan to export' }` and the banner never goes away — there is no path
through the UI to clear the dirty count without a successful export. Several
sibling setters likewise bypass `incrementDirty()` while the phase-2/3
`addPlanting/removePlanting/commitEdit` setters do call it, so the dirty
contract is now inconsistent across the API: `setLock` (line 280),
`toggleTaskCompletion` (line 366), `clearPlan` (line 385),
`clearCompletedTaskIds` (line 389) all silently skip dirty bookkeeping.
**Fix:** At minimum, reset dirty on `clearPlan`:
```ts
clearPlan: () => {
  set({ plan: null });
  useUIStore.getState().resetDirty();
},
```
For the broader inconsistency: audit each setter against D-14 and either add
`incrementDirty()` or document why a given setter is dirty-exempt (and
reflect that in the export-reminder selector). At a minimum, `setLock` is a
user-authored mutation that survives export and should bump the counter; if
`toggleTaskCompletion` is intentionally exempt, that should be a
prominently-commented invariant.

---

## Warnings

### WR-01: `EditPlantingModal.handleSave` always commits + dirties even when nothing changed

**File:** `src/features/mobile/EditPlantingModal.tsx:116-129`
**Severity:** WARNING
**Issue:** `handleSave` unconditionally builds a `ScheduleEdit` and calls
`commitEdit(edit)` with the current `startYMD`, regardless of whether the user
actually changed it. Because `commitEdit` calls `incrementDirty()`, opening the
modal and tapping `Save` (the natural way to dismiss it on mobile besides the
Cancel button at the bottom) inflates `dirtySinceExport` by one each time. It
also writes a redundant entry into `plan.edits` keyed by
`(plantingId, eventType)` — the dedupe later collapses it, but the timestamp
churns and the engine treats this as a deliberate user override, possibly
clamping subsequent reflow.
**Fix:** Short-circuit when no change occurred:
```ts
const handleSave = () => {
  const startChanged = startYMD !== initialStartYMD;
  const endChanged =
    eventType === 'harvest-window' && endYMD !== initialEndYMD;
  if (!startChanged && !endChanged) {
    onOpenChange(false);
    return;
  }
  // ... build + commit edit
};
```

---

### WR-02: `EditPlantingModal.handleDelete` removes a planting with no confirmation

**File:** `src/features/mobile/EditPlantingModal.tsx:131-135`
**Severity:** WARNING
**Issue:** Tapping the red `Delete planting` button calls `removePlanting`
immediately and closes the modal. There is no confirmation step and no
toast-with-undo, in contrast to `MyPlanPanel`'s desktop flow (which gates the
same destructive op behind a confirm Dialog) and the D-09 contract for
reversible destructive ops (which mandates a toast-with-undo). On a phone
where mis-taps are likely (the button is full-width inside a scrolling
modal), this is the riskiest path in the app.
**Fix:** Either gate the delete behind an inline confirm (analog of
`CustomTaskModal.confirmingDelete`) or push a toast-with-undo on success:
```ts
const handleDelete = () => {
  removePlanting(plantingId);
  pushToast({
    variant: 'success',
    duration: 5000,
    title: `Deleted ${plant.name}.`,
    action: { label: 'Undo', onClick: () => getTemporal().undo() },
  });
  onDelete?.();
  onOpenChange(false);
};
```

---

### WR-03: `ConstraintTooltip` selector susceptible to CSS-syntax errors / injection

**File:** `src/features/gantt/tooltip/ConstraintTooltip.tsx:117-119`
**Severity:** WARNING
**Issue:** `document.querySelector(`[data-event-id="${stickyViolation.eventId}"]`)`
interpolates an event id directly into a CSS attribute selector. Event ids are
generated internally today, but the schedule engine derives composite ids that
can include succession/recurrence suffixes; any future id containing a quote,
backslash, or unmatched bracket will throw `SyntaxError` from `querySelector`
and break the sticky-anchor compute path (the rAF schedule still resolves but
the tooltip silently misplaces).
**Fix:** Use `CSS.escape`:
```ts
const sel = `[data-event-id="${CSS.escape(stickyViolation.eventId)}"]`;
const el = document.querySelector(sel);
```
Apply the same pattern in `useKeyboardBarDrag` if/when it grows a similar
lookup, and in `CoachMarks.tsx:55` for the `data-coach-target` lookup
(arguably less risky because the values are static, but cheap insurance).

---

### WR-04: `TasksDashboard.todayISO` computes "today" in UTC, not local time

**File:** `src/features/tasks/TasksDashboard.tsx:31`
**Severity:** WARNING
**Issue:** `toISODate(parseDate(nowISOString())).slice(0, 10)` rolls `Date.now()`
through the noon-UTC convention: it takes the current instant, parses it to
UTCDate, sets `setUTCHours(12,0,0,0)`, then slices the YMD. The result is the
**UTC** calendar date, not the user's local date. For a user in
`America/Los_Angeles` (UTC-8), at 5pm local on April 26 the wall clock says
"today is the 26th" but `nowISOString()` returns `2026-04-27T01:xx:xx.xxxZ`
and `todayISO` computes to `2026-04-27` — Tasks dashboard sections will sort
the "today" group by tomorrow's date and a one-off task due `2026-04-26`
appears as "Overdue". Symmetric bug for users east of UTC for any window
between local midnight and `12:00 - tzOffset` UTC.
**Fix:** Compute today from the user's local calendar, then format YMD by hand
(this stays inside the dateWrappers contract — local "today" is a display
concept, not a stored datum):
```ts
// in dateWrappers (allowed site):
export function todayLocalYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
// caller:
const todayISO = todayLocalYMD();
```
Same suspect pattern exists in `CustomTaskModal.todayDate()` (line 97-99) and
in any cross-component "what's today" reads.

---

### WR-05: `localStorage.setItem` monkey-patch loses original error if `onFull` throws

**File:** `src/data/storage.ts:72-92`
**Severity:** WARNING
**Issue:** Inside `patched`, when `original(key, value)` throws QuotaExceeded,
the code calls `onFull()` and then re-throws. If `onFull()` itself throws
(e.g. zustand setState handler crashes), the original `QuotaExceededError` is
replaced by `onFull`'s error and zustand's persist layer no longer sees the
QuotaExceededError it was expecting — the storage failure is masked as a
generic crash. Less critically, `original = localStorage.setItem.bind(localStorage)`
is captured at patch time; if any other module patches `setItem` later, the
ordering is fragile.
**Fix:** Defensively guard `onFull`:
```ts
try {
  onFull();
} catch (notifyErr) {
  // Don't let the notifier mask the real storage error.
  console.error('watchQuotaExceeded onFull threw:', notifyErr);
}
throw err;
```

---

### WR-06: `AppShell` reads deprecated `navigator.platform` for Mac detection

**File:** `src/app/AppShell.tsx:115-116`
**Severity:** WARNING
**Issue:** `navigator.platform` is officially deprecated and returns
inconsistent or empty strings on modern browsers (Chrome, Firefox, Safari are
all moving to UA-CH / `userAgentData`). On affected browsers the regex falls
through and the undo/redo button hint always shows the Windows variant
("Ctrl+Z") even on macOS, which is a low-grade UX papercut on a flagship
keyboard shortcut.
**Fix:** Prefer `navigator.userAgentData.platform` (where available) with a
`navigator.userAgent` fallback:
```ts
const isMac = (() => {
  if (typeof navigator === 'undefined') return false;
  // userAgentData is available on Chromium-based browsers (2023+).
  const uaData = (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData;
  if (uaData?.platform) return /mac/i.test(uaData.platform);
  return /Mac|iPhone|iPad/i.test(navigator.userAgent);
})();
```

---

### WR-07: `SettingsPanel.lastExport` resets to "never" on every navigation

**File:** `src/features/settings/SettingsPanel.tsx:31, 36-38, 80-82`
**Severity:** WARNING
**Issue:** "Last exported" is held in component-local `useState`, not in
`uiStore.exportReminder.lastExportedAt` — so it shows the just-exported
filename only until the user navigates away from /settings. Re-entering the
route shows "Last exported: never" even though `setLastExportedAt` was
correctly written by `exportPlan`. Two contradicting truths are now
side-by-side: the export-reminder banner reads from the persisted value, the
settings page reads from local state.
**Fix:** Drop the local state and read from `useUIStore`:
```tsx
const lastExportedAt = useUIStore((s) => s.exportReminder.lastExportedAt);
// ...
<p>{lastExportedAt ? `Last exported: ${lastExportedAt.slice(0,10)}` : 'Last exported: never'}</p>
```
The filename suffix can be reconstructed (`garden-gantt-plan-${ymd}.json`) or
omitted — most users care about the date, not the filename pattern.

---

### WR-08: `SetupStepLocation` effect can dispatch `onValidLocation` repeatedly

**File:** `src/features/setup/SetupStepLocation.tsx:137-233`
**Severity:** WARNING
**Issue:** The validation effect lists `[zip, lookup, overrides, manualZone,
manualLast, manualFirst, onValidLocation, onLocationInvalid]`. `lookup` is the
return of `useLookupLocation` and `overrides` is local state — both stable.
But `onValidLocation` and `onLocationInvalid` are props; if the parent passes
an inline arrow (`<SetupStepLocation onValidLocation={(l) => setLoc(l)} />`),
the effect re-runs every parent re-render, which dispatches another setter,
which causes another re-render, and on. The current parents may avoid this,
but the contract is undocumented and brittle — any future caller that forgets
`useCallback` will create an infinite loop or a re-entry storm.
**Fix:** Either (a) document and assert the prop is stable, (b) ref-stabilize
the callbacks inside the hook, or (c) lift the effect into a `useEffect`
keyed on stable inputs only and call the callbacks via a ref:
```ts
const onValidRef = useRef(onValidLocation);
useEffect(() => { onValidRef.current = onValidLocation; }, [onValidLocation]);
// then call onValidRef.current(...) inside the validation effect with a
// dependency list that excludes the callbacks.
```

---

### WR-09: `ImportPreviewModal` nests a Dialog inside another Dialog

**File:** `src/features/settings/ImportPreviewModal.tsx:53-103`
**Severity:** WARNING
**Issue:** The "Replace plan" confirmation Dialog is rendered as a child of
the outer preview Dialog's `<DialogContent>`. Radix Dialog focus-trap and
inert-aria handling do not nest cleanly: when the inner dialog opens, focus
should move into it, but the outer trap may steal focus back on the next tab,
and screen readers can announce both labels. If the user clicks Cancel on the
inner dialog while the outer is still open, focus restoration is to the
outer's last focused element, not the trigger that opened the inner —
acceptable but inconsistent with the rest of the app's modal stack pattern.
**Fix:** Hoist the inner Dialog out of `DialogContent` into a sibling, the
way `MyPlanPanel.tsx:240-275` separates the panel and the confirm dialog into
two top-level `<Dialog>` siblings sharing component state. Radix's portal
will still render them at the document body level; lifting the JSX avoids the
focus-trap collision.

---

### WR-10: `useKeyboardBarDrag` `format()` formats UTCDate in local TZ, breaking pluralization edge

**File:** `src/features/keyboard-drag/useKeyboardBarDrag.ts:92-97, 110-119`
**Severity:** WARNING
**Issue:** `addDays(parseISO(p.originalStartISO), p.pendingDeltaDays)` returns
a Date instant; `format(newStart, 'yyyy-MM-dd')` from `date-fns` formats it in
local time. Because the original ISO is pinned to noon UTC, this lands on the
correct calendar day for any timezone in `[-12, +12]` — but for the
hypothetical UTC+13/UTC+14 (Samoa, Kiribati) edges, noon UTC + 13h falls on
the next local day. More immediately: the announcer string
`"Pending move +1 day to ${ymd}"` and the post-commit `"Moved to ${ymd}"`
display a YMD that may not match what the user thinks they selected if their
locale rolls into edge zones. Low-likelihood but a correctness gap given the
rest of the codebase uses `formatDateShort`/`isoNoonToYMD` to stay
TZ-agnostic.
**Fix:** Use the UTC-aware helper from dateWrappers:
```ts
import { formatDateShort } from '../../domain/dateWrappers';
// ...
const ymd = formatDateShort(newStart);
```
`formatDateShort` already wraps the value in `UTCDate` and slices the ISO,
matching the rest of the app.

Also: the pluralization at line 95 (`p.pendingDeltaDays === 1 || p.pendingDeltaDays === -1 ? '' : 's'`)
treats `pendingDeltaDays === 0` as plural ("0 days"), which is correct; but
when `pendingDeltaDays === 0` the announcer fires "Pending move +0 days" — a
no-op announcement should probably be suppressed.

---

### WR-11: `CoachMarks` declares `aria-modal="true"` without making the page inert

**File:** `src/features/onboarding/CoachMarks.tsx:108-141`
**Severity:** WARNING
**Issue:** The callout is rendered with `role="dialog"` and
`aria-modal="true"`, but the backdrop is a sibling `<div>` that does not
block keyboard focus from reaching the page behind. A user pressing Tab while
a coach mark is open can land on the underlying nav links / gantt bars while
the dialog claims modality. Screen reader users get an inconsistent picture:
the dialog is announced as modal, but VoiceOver/NVDA can navigate outside it.
**Fix:** Either drop the `aria-modal="true"` claim (the coach marks are
non-blocking by design — Esc to dismiss, click backdrop to dismiss) or
actually trap focus with Radix Dialog or focus-trap-react. Given the coach
marks are advisory not required, removing `aria-modal` and using
`role="dialog"` alone is the cleaner fix:
```tsx
<div
  role="dialog"
  aria-labelledby="coach-mark-heading"
  // drop aria-modal — this is non-blocking advisory UI
>
```

---

### WR-12: `useToastStore.useEffect` can dismiss many toasts on a single past-state delta

**File:** `src/ui/toast/ToastHost.tsx:73-79`
**Severity:** WARNING
**Issue:** When `pastStatesCount` drops, the effect iterates ALL current
toasts and dismisses every toast with `mountTimePastStatesCount > pastStatesCount`.
If three toast-with-undo entries are stacked (clear-completed + delete + edit
in quick succession) and the user undoes once, ALL three drop in one tick —
including unrelated toasts that happen to have a higher mount-time count.
The Pitfall 5 contract assumed one undoable toast at a time.
**Fix:** Track per-action correlation, not bulk past-states comparison.
Easiest patch: when a user clicks Undo from an action, or when an external
undo fires, only dismiss the *most recent* toast whose
`mountTimePastStatesCount === pastStatesCount + 1`:
```ts
useEffect(() => {
  const target = toasts.find(
    (t) => t.mountTimePastStatesCount === pastStatesCount + 1
  );
  if (target) dismiss(target.id);
}, [pastStatesCount, toasts, dismiss]);
```
This still solves the documented "user undoes by Cmd-Z" case without batch-
dismissing unrelated stacked toasts.

---

### WR-13: `CatalogBrowser.clearFilters` dispatches O(N) toggles instead of one set

**File:** `src/features/catalog/CatalogBrowser.tsx:100-103`
**Severity:** WARNING
**Issue:** `clearFilters` does `for (const id of filterChips) toggleChip(id);`
— each `toggleChip` call mutates the `uiStore.filterChips` Set and triggers a
re-render of every component subscribing to it. With 8 chips active that's 8
sequential renders of `CatalogBrowser`'s grid (plus any other consumer) when
one would suffice. More importantly, the iteration uses the captured snapshot
of `filterChips`, but each `toggleChip` re-creates the Set in the store —
intermediate re-renders see partially-cleared state, which is observable in
React DevTools and may flicker the chip styles.
**Fix:** Add a `clearFilterChips` action to `uiStore`:
```ts
// in uiStore:
clearFilterChips: () => set({ filterChips: new Set() }),
// in CatalogBrowser:
const clearFilters = () => {
  setSearch('');
  clearFilterChips();
};
```

---

## Info

### IN-01: `useCoachMarks` route check has dead-code branch

**File:** `src/features/onboarding/useCoachMarks.ts:33-34`
**Severity:** INFO
**Issue:** `currentRoute === '/plan' || currentRoute.startsWith('/plan?')` —
`useLocation().pathname` never includes the `?...` query string. `pathname`
is path-only by React Router 7's contract, so the second clause is
unreachable.
**Fix:** Drop the unreachable check, or relax to `currentRoute.startsWith('/plan')`
if sub-routes like `/plan/foo` should also activate the tour.

---

### IN-02: `CustomTaskModal.dueISO` bypasses `ymdToISONoon` helper

**File:** `src/features/tasks/CustomTaskModal.tsx:144, 156`
**Severity:** INFO
**Issue:** `const dueISO = `${form.dueDate}T12:00:00.000Z`;` and the analog
end-date concat both inline the noon-UTC convention rather than using the
`ymdToISONoon` helper from `dateWrappers`. The behavior is identical, but
inlining makes the SCH-03 invariant harder to grep and gives the impression
that the convention isn't centralized.
**Fix:** `const dueISO = ymdToISONoon(form.dueDate);`

---

### IN-03: `SetupStepLocation` re-implements `ymdToISONoon` / `isoNoonToYmd`

**File:** `src/features/setup/SetupStepLocation.tsx:70-76`
**Severity:** INFO
**Issue:** Local `ymdToISONoon` and `isoNoonToYmd` duplicate the helpers
exported from `dateWrappers.ts:108-118`. Both behave identically but the
duplication splits the SCH-03 allowlist contract surface.
**Fix:** Delete the local helpers and import from `dateWrappers`.

---

### IN-04: `MyPlanPanel.successionCounts` couples to id-suffix format

**File:** `src/features/catalog/MyPlanPanel.tsx:50-58`
**Severity:** INFO
**Issue:** `const baseId = p.id.replace(/-s\d+$/, '')` reverse-engineers the
`-s{n}` suffix that `expandSuccessions` emits. If the id format changes —
e.g. to `-succession-{n}` for clarity — this silently produces the wrong
grouping (every derived planting is its own base). The id format should be a
documented contract or, better, the derived shape should expose `baseId`
explicitly.
**Fix:** Have `expandSuccessions` return `{ id, baseId, successionIndex }`
and consume `baseId` here directly instead of regex-stripping.

---

### IN-05: `exportPlan` revokes the object URL synchronously after `.click()`

**File:** `src/features/settings/exportPlan.ts:55-57`
**Severity:** INFO
**Issue:** `a.remove(); URL.revokeObjectURL(url);` runs synchronously after
`a.click()`. In most browsers the click triggers the download synchronously
and revoke is fine, but Safari has historically been finicky about revoking
during the same task. Common pattern is to defer revocation:
```ts
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(url), 0);
```

---

### IN-06: `ToastHost.ToastItemView` non-null assertion is redundant

**File:** `src/ui/toast/ToastHost.tsx:128-130`
**Severity:** INFO
**Issue:** `item.action!.onClick();` inside an `{item.action && (...)}`
branch — the assertion is redundant. Either narrow with a local const
(`const action = item.action; if (!action) return null;`) or accept the
duplication and drop the `!`.
**Fix:**
```tsx
{item.action && (
  <ToastAction
    altText={item.action.label}
    onClick={() => {
      const a = item.action!;
      a.onClick();
      onDismiss();
    }}
  >
    {item.action.label}
  </ToastAction>
)}
```
(Or: pull `item.action` into a const above the JSX and use `action.onClick`.)

---

_Reviewed: 2026-04-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
