# Phase 3: Drag, Cascade, Calendar & Tasks — Pattern Map

**Mapped:** 2026-04-26
**Files analyzed:** 27 new + 7 modified
**Analogs found:** 31 / 34

## File Classification

### NEW files

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/features/gantt/drag/DragLayer.tsx` | component (drag-context wrapper) | event-driven | `src/features/gantt/GanttView.tsx` | role-match |
| `src/features/gantt/drag/useDragBar.ts` | hook | event-driven | `src/features/gantt/useDerivedSchedule.ts` | role-match |
| `src/features/gantt/drag/clampModifier.ts` | utility (pure) | transform | `src/domain/constraints.ts` (canMove caller) | role-match |
| `src/features/gantt/drag/GhostOverlay.tsx` | component (SVG overlay) | request-response | `src/features/gantt/GanttView.tsx` (rows `<g>`) | exact |
| `src/features/gantt/drag/useTransientSchedule.ts` | hook (memoized selector) | transform | `src/features/gantt/useDerivedSchedule.ts` | exact |
| `src/features/gantt/lock/LockToggle.tsx` | component (icon button) | request-response | `src/features/catalog/MyPlanPill.tsx` | role-match |
| `src/features/gantt/lock/useLockKeybinding.ts` | hook (event listener) | event-driven | `src/app/AppShell.tsx` `useCurrentHash` | partial |
| `src/features/gantt/tooltip/ConstraintTooltip.tsx` | component (portaled overlay) | request-response | `src/features/catalog/MyPlanPanel.tsx` (Radix portal) | role-match |
| `src/app/PlanViewTabs.tsx` | component (nav tabs) | request-response | `src/app/AppShell.tsx` (NAV_LINKS pattern) | exact |
| `src/features/calendar/CalendarView.tsx` | component (3rd-party wrapper) | request-response | `src/features/gantt/GanttView.tsx` | role-match |
| `src/features/calendar/selectEventsForCalendar.ts` | utility (pure selector) | transform | `src/features/gantt/useDerivedSchedule.ts` | partial |
| `src/features/calendar/DayDetailDrawer.tsx` | component (Radix Dialog right-sheet) | request-response | `src/features/catalog/MyPlanPanel.tsx` | exact |
| `src/features/calendar/fullcalendar.css` | config (CSS theme overrides) | n/a | `src/index.css` `@theme` block | partial |
| `src/features/tasks/TasksDashboard.tsx` | component (route page) | CRUD | `src/features/settings/SettingsPanel.tsx` | exact |
| `src/features/tasks/TaskGroup.tsx` | component (presentational list) | request-response | `src/features/catalog/MyPlanPanel.tsx` (plantings list) | role-match |
| `src/features/tasks/TaskRow.tsx` | component (presentational row) | request-response | `src/features/catalog/MyPlanPanel.tsx` `<li>` row | exact |
| `src/features/tasks/CustomTaskModal.tsx` | component (Radix Dialog form) | CRUD | `src/features/catalog/CustomPlantModal.tsx` | exact |
| `src/features/tasks/useTodayWeekOverdue.ts` | hook (memoized selector) | transform | `src/features/gantt/useDerivedSchedule.ts` | exact |
| `src/features/tasks/deriveTasks.ts` | utility (pure projection) | transform | `src/domain/taskEmitter.ts` | exact |
| `src/stores/dragStore.ts` | store (Zustand, transient) | event-driven | `src/stores/uiStore.ts` | exact |
| `src/stores/historyBindings.ts` | hook/effect (document keybinding) | event-driven | `src/app/AppShell.tsx` `useCurrentHash` | role-match |
| `tests/features/gantt/drag/clampModifier.test.ts` | test (unit, pure) | n/a | `tests/domain/constraints.test.ts` | exact |
| `tests/features/gantt/drag/useTransientSchedule.test.tsx` | test (component, memoized) | n/a | `tests/stores/planStore.test.ts` | role-match |
| `tests/features/calendar/selectEventsForCalendar.test.ts` | test (unit, pure) | n/a | `tests/domain/constraints.test.ts` | exact |
| `tests/features/calendar/DayDetailDrawer.test.tsx` | test (component) | n/a | `tests/features/catalog/CatalogBrowser.test.tsx` | exact |
| `tests/features/tasks/TasksDashboard.test.tsx` | test (component) | n/a | `tests/features/catalog/CatalogBrowser.test.tsx` | exact |
| `tests/stores/dragStore.test.ts` | test (store) | n/a | `tests/stores/planStore.test.ts` | exact |

### MODIFIED files

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/features/gantt/GanttView.tsx` | extend (wrap with DndContext + ghost layer) | event-driven | self (in-place) | exact |
| `src/stores/planStore.ts` | extend (zundo wrapTemporal + lock setters + addTask + commitEdit) | CRUD | self (in-place) | exact |
| `src/stores/uiStore.ts` | extend (lastConstraintViolation + taskGroupBy + altClickTipDismissed) | event-driven | self (in-place) | exact |
| `src/domain/types.ts` | extend (Planting.locks; recurring-completion key semantics) | n/a | self (in-place) | exact |
| `src/domain/scheduler.ts` | extend (consume `plan.edits` + `plan.locks`) | transform | self (in-place) | exact |
| `src/domain/migrations.ts` | extend (v2→v3 migration for `Planting.locks`) | transform | self (in-place) | exact |
| `src/app/App.tsx` | extend (lazy CalendarView; tasks route swap) | request-response | self (in-place) | exact |
| `src/app/AppShell.tsx` | extend (undo/redo buttons; mount historyBindings) | event-driven | self (in-place) | exact |
| `src/index.css` | extend (Phase 3 `@theme` tokens) | config | self (in-place) | exact |

---

## Pattern Assignments

### `src/stores/dragStore.ts` (store, transient)

**Analog:** `src/stores/uiStore.ts` (49 lines, in-memory-only Zustand store, no persist, no middleware)

**File header pattern + `create<State>` shape** (`src/stores/uiStore.ts` lines 1-49):
```typescript
// src/stores/dragStore.ts
// Transient drag state — held only in process memory; NEVER persisted, NEVER tracked by zundo
// (per .planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md D-17).
// rAF-throttled writes from drag handlers; cleared on pointerup commit/cancel.
import { create } from 'zustand';

interface DragState {
  transientEdit: ScheduleEdit | null;
  dragPreviewEvents: ScheduleEvent[] | null;
  isDragging: boolean;
  setTransientEdit: (edit: ScheduleEdit | null) => void;
  setDragPreviewEvents: (events: ScheduleEvent[] | null) => void;
  beginDrag: () => void;
  endDrag: () => void;
}

export const useDragStore = create<DragState>((set) => ({
  transientEdit: null,
  dragPreviewEvents: null,
  isDragging: false,
  setTransientEdit: (edit) => set({ transientEdit: edit }),
  setDragPreviewEvents: (events) => set({ dragPreviewEvents: events }),
  beginDrag: () => set({ isDragging: true }),
  endDrag: () => set({ isDragging: false, transientEdit: null, dragPreviewEvents: null }),
}));
```

**Critical:** NO `persist` middleware (uiStore.ts line 29 — `create<UIState>((set) => ({` is bare; never wrapped in `persist(...)`).

---

### `src/stores/planStore.ts` EXTEND (CRUD store + zundo wrap)

**Analog:** self — already uses `persist(...)` wrapper at lines 63-191.

**Existing setter pattern** (lines 75-86) to mirror for `commitEdit`, `setLock`, `addCustomTask`:
```typescript
addPlanting: (planting) =>
  set((s) =>
    s.plan
      ? {
          plan: {
            ...s.plan,
            plantings: [...s.plan.plantings, planting],
            updatedAt: nowISOString(),
          },
        }
      : s,
  ),
```

**zundo wrap order** (per CONTEXT D-14: persist outermost, temporal innermost):
```typescript
import { temporal } from 'zundo';
import { persist, createJSONStorage } from 'zustand/middleware';

export const usePlanStore = create<PlanState>()(
  persist(
    temporal(
      (set, get): PlanState => ({ /* ...existing setters... */ }),
      {
        limit: 20,
        partialize: (state) => ({ plan: state.plan }),
        // rAF-debounce drag-stream updates → one history entry per pointerup (D-16)
        handleSet: (handleSet) => {
          let raf = 0;
          return (pastState) => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => handleSet(pastState));
          };
        },
      },
    ),
    {
      name: 'garden-gantt:plan',
      version: 3, // bumped from 2 — schema migration adds Planting.locks
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, fromVersion) => {
        return migrateToCurrent(persisted, fromVersion) as PlanState;
      },
    },
  ),
);
```

**Schema bump pattern:** `src/stores/planStore.ts` line 35 (`SCHEMA_VERSION = CURRENT_SCHEMA_VERSION`) — bump `CURRENT_SCHEMA_VERSION` in `src/domain/migrations.ts` line 11 from `2` to `3`, add a `migrations[3]` entry following the v1→v2 pattern in `migrations.ts` lines 38-54.

**New setter signatures** (mirror existing addPlanting/toggleSuccession shape):
```typescript
commitEdit: (edit: ScheduleEdit) => void;        // append to plan.edits
setLock: (plantingId: string, eventType: EventType, locked: boolean) => void;
addCustomTask: (task: CustomTask) => void;       // append to plan.customTasks
toggleTaskCompletion: (compositeKey: string) => void;  // ${taskId}:${ISODate} or bare taskId
```

---

### `src/stores/uiStore.ts` EXTEND (transient flags)

**Analog:** self — extend the existing in-memory store (lines 12-49).

**Mirror Phase 2 transient flag pattern** (`src/stores/uiStore.ts` lines 12-49):
```typescript
// Phase 3 additions — transient drag/UI state (never persisted)
lastConstraintViolation: { eventId: string; reasons: string[]; eventType: EventType } | null;
taskGroupBy: 'plant' | 'category';
altClickTipDismissCount: number;  // increments per dismiss; suppressed when ≥3
setLastConstraintViolation: (v: UIState['lastConstraintViolation']) => void;
setTaskGroupBy: (g: 'plant' | 'category') => void;
incrementAltClickTipDismiss: () => void;
```

---

### `src/features/gantt/drag/DragLayer.tsx` (component, event-driven)

**Analog:** `src/features/gantt/GanttView.tsx` (root SVG container with provider-wrap candidate)

**Imports + wrap pattern** (model after `src/features/gantt/GanttView.tsx` lines 20-29):
```typescript
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { GanttView } from '../GanttView';
import { GhostOverlay } from './GhostOverlay';
import { useDragStore } from '../../../stores/dragStore';
import { useTransientSchedule } from './useTransientSchedule';
import { clampModifier } from './clampModifier';

export function DragLayer() {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const isDragging = useDragStore((s) => s.isDragging);
  const transientEvents = useTransientSchedule();
  // ... onDragStart / onDragMove / onDragEnd handlers commit ScheduleEdit on pointerup
  return (
    <DndContext sensors={sensors} modifiers={[clampModifier]} onDragStart={...} onDragEnd={...}>
      <GanttView />
      <DragOverlay dropAnimation={null}>
        {/* dragged bar at full opacity follows cursor */}
      </DragOverlay>
      {isDragging && <GhostOverlay events={transientEvents} />}
    </DndContext>
  );
}
```

---

### `src/features/gantt/drag/clampModifier.ts` (utility, pure)

**Analog:** `src/domain/constraints.ts` (pure, no React, calls `canMove` per CONTEXT D-08)

**Pattern to reproduce — pure constraint application** (`src/domain/constraints.ts` lines 47-69):
```typescript
import { canMove } from '../../../domain/constraints';
import type { Modifier } from '@dnd-kit/core';

export function makeClampModifier(deps: {
  scale: TimeScale;
  plan: GardenPlan;
  catalog: ReadonlyMap<string, Plant>;
  setViolation: (v: { eventId: string; reasons: string[] } | null) => void;
}): Modifier {
  return ({ transform, active }) => {
    const event: ScheduleEvent = active.data.current?.event;
    const plant = deps.catalog.get(event.plantId);
    if (!event || !plant) return transform;
    const candidatePx = transform.x;
    const candidateDate = deps.scale.xToDate(deps.scale.dateToX(event.start) + candidatePx);
    const result = canMove(event, candidateDate, deps.plan, plant);
    if ('clamped' in result && result.clamped) {
      deps.setViolation({ eventId: event.id, reasons: result.reasons });
      const clampedPx = deps.scale.dateToX(result.finalDate) - deps.scale.dateToX(event.start);
      return { ...transform, x: clampedPx };
    }
    deps.setViolation(null);
    return transform;
  };
}
```

**Date math:** MUST use `dateWrappers` (per CONTEXT integration points + `src/features/gantt/timeScale.ts` line 10 import); ESLint allowlist already includes `src/features/gantt/**`.

---

### `src/features/gantt/drag/useTransientSchedule.ts` (hook, memoized selector)

**Analog:** `src/features/gantt/useDerivedSchedule.ts` (26 lines — exact pattern match)

**Copy pattern verbatim** (`src/features/gantt/useDerivedSchedule.ts` lines 11-26):
```typescript
import { useMemo } from 'react';
import { usePlanStore } from '../../../stores/planStore';
import { useCatalogStore, selectMerged } from '../../../stores/catalogStore';
import { useDragStore } from '../../../stores/dragStore';
import { generateSchedule } from '../../../domain/scheduler';
import { expandSuccessions } from '../../../domain/succession';
import type { ScheduleEvent } from '../../../domain/types';

export function useTransientSchedule(): ScheduleEvent[] {
  const plan = usePlanStore((s) => s.plan);
  const catalog = useCatalogStore(selectMerged);
  const transientEdit = useDragStore((s) => s.transientEdit);
  return useMemo(() => {
    if (!plan) return [];
    const planWithTransient = transientEdit
      ? { ...plan, edits: [...plan.edits, transientEdit] }
      : plan;
    const expanded = expandSuccessions(planWithTransient, catalog);
    return generateSchedule(expanded, catalog);
  }, [plan, catalog, transientEdit]);
}
```

---

### `src/features/gantt/drag/GhostOverlay.tsx` (component, SVG `<g>`)

**Analog:** `src/features/gantt/GanttView.tsx` lines 224-277 (rows `<g>` with rect-per-event pattern)

**Copy the rect-per-event geometry from GanttView lines 242-273**, modify:
- `fillOpacity={0.55}` (per UI-SPEC §Color Phase 3 token)
- `stroke={lifecyclePalette[e.type]}`, `strokeWidth={1.5}`
- Skip the dragged event's own bar (it lives in `<DragOverlay>` portal)

```typescript
{events.map((e) => {
  const fill = lifecyclePalette[e.type];
  if (!fill || e.id === draggedEventId) return null;
  const x = scale.dateToX(e.start);
  const width = Math.max(scale.dateToX(e.end) - x, 4);
  return (
    <rect
      key={e.id}
      x={x}
      y={BAR_Y_OFFSET}
      width={width}
      height={BAR_HEIGHT}
      fill={fill}
      fillOpacity={0.55}
      stroke={fill}
      strokeWidth={1.5}
      rx={3}
    />
  );
})}
```

---

### `src/features/gantt/lock/LockToggle.tsx` (component, icon button)

**Analog:** `src/features/catalog/MyPlanPill.tsx` (44 lines — Lucide icon + button + cn() pattern)

**Imports + button pattern** (`src/features/catalog/MyPlanPill.tsx` lines 8-43):
```typescript
import { Lock, LockOpen } from 'lucide-react';
import { usePlanStore } from '../../../stores/planStore';
import { cn } from '../../../ui/cn';

interface LockToggleProps {
  plantingId: string;
  eventType: EventType;
  locked: boolean;
  plantName: string;
}

export function LockToggle({ plantingId, eventType, locked, plantName }: LockToggleProps) {
  const setLock = usePlanStore((s) => s.setLock);
  const Icon = locked ? Lock : LockOpen;
  return (
    <button
      type="button"
      onClick={() => setLock(plantingId, eventType, !locked)}
      aria-label={locked ? `Unlock ${plantName} ${eventType}` : `Lock ${plantName} ${eventType}`}
      className={cn(
        'inline-flex items-center justify-center w-6 h-6',  // 24x24 hit-target
        'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700',
        locked && 'opacity-100 text-stone-700',
        !locked && 'text-stone-400',
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
```

---

### `src/features/gantt/lock/useLockKeybinding.ts` (hook, document event listener)

**Analog:** `src/app/AppShell.tsx` lines 30-40 (`useCurrentHash` — document event listener with cleanup)

**Effect pattern with cleanup** (`src/app/AppShell.tsx` lines 30-40):
```typescript
useEffect(() => {
  const onClick = (e: MouseEvent) => {
    if (!e.altKey) return;
    const target = (e.target as Element)?.closest('[data-event-id]');
    if (!target) return;
    e.preventDefault();
    const eventId = target.getAttribute('data-event-id');
    const plantingId = target.getAttribute('data-planting-id');
    const eventType = target.getAttribute('data-event-type') as EventType;
    if (eventId && plantingId && eventType) {
      // toggle lock via planStore
    }
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}, []);
```

(`data-event-id` / `data-planting-id` / `data-event-type` attrs already shipped on every `<rect>` in `src/features/gantt/GanttView.tsx` lines 258-260 per Phase 2 D-26.)

---

### `src/features/gantt/tooltip/ConstraintTooltip.tsx` (component, portaled overlay)

**Analog:** `src/features/catalog/MyPlanPanel.tsx` (lines 76-91 — DialogPrimitive.Portal + DialogPrimitive.Content with custom positioning)

**Portal + portal-content pattern** (`src/features/catalog/MyPlanPanel.tsx` lines 78-91):
```typescript
import { createPortal } from 'react-dom';
import { useUIStore } from '../../../stores/uiStore';
import { lifecyclePalette } from '../lifecyclePalette';
import { cn } from '../../../ui/cn';

export function ConstraintTooltip() {
  const violation = useUIStore((s) => s.lastConstraintViolation);
  if (!violation) return null;
  const accent = lifecyclePalette[violation.eventType];
  return createPortal(
    <div
      role="status"
      tabIndex={-1}
      className={cn(
        'fixed z-50 bg-white rounded-md border border-stone-200',
        'shadow-[0_8px_24px_rgb(0_0_0_/_0.12)]',
        'min-w-[var(--spacing-tooltip-min-w)] max-w-[var(--spacing-tooltip-max-w)]',
        'px-4 py-2 border-l-[3px]',
      )}
      style={{ borderLeftColor: accent }}
    >
      <p className="text-sm font-semibold uppercase tracking-wider text-stone-900">
        {violation.eventType.toUpperCase()} BLOCKED
      </p>
      <p className="text-sm text-stone-900 mt-1">{violation.reasons[0]}</p>
    </div>,
    document.body,
  );
}
```

**`role="status"` from day 1** (per UI-SPEC Decisions table). Phase 4 wires `aria-live="polite"`.

---

### `src/app/PlanViewTabs.tsx` (component, nav tabs)

**Analog:** `src/app/AppShell.tsx` lines 22-82 (NAV_LINKS pattern + active-state styling)

**Tab strip pattern — copy AppShell active-link styling verbatim** (lines 67-82):
```typescript
import { useSearchParams } from 'react-router';
import { BarChart3, Calendar } from 'lucide-react';

const TABS = [
  { id: 'gantt' as const, label: 'Gantt', Icon: BarChart3 },
  { id: 'calendar' as const, label: 'Calendar', Icon: Calendar },
];

export function PlanViewTabs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') ?? 'gantt';
  return (
    <div className="flex items-center gap-6 border-b border-stone-200 px-4 h-11">
      {TABS.map(({ id, label, Icon }) => {
        const active = view === id;
        const className = active
          ? 'inline-flex items-center gap-1 text-sm font-medium text-stone-900 border-b-2 border-green-700 -mb-px h-11'
          : 'inline-flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 h-11';
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              if (id === 'gantt') next.delete('view');
              else next.set('view', id);
              setSearchParams(next);
            }}
            className={className}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
```

---

### `src/features/calendar/CalendarView.tsx` (component, FullCalendar wrapper)

**Analog:** `src/features/gantt/GanttView.tsx` (top-level render container that consumes `useDerivedSchedule`)

**Lazy-import shape** (mount in App.tsx via `React.lazy`):
```typescript
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useSearchParams } from 'react-router';
import { useDerivedSchedule } from '../gantt/useDerivedSchedule';
import { selectEventsForCalendar } from './selectEventsForCalendar';
import './fullcalendar.css';

export default function CalendarView() {  // default export for React.lazy
  const events = useDerivedSchedule();
  const [, setSearchParams] = useSearchParams();
  const calendarEvents = selectEventsForCalendar(events, /* tasks */ []);
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
      buttonText={{ today: 'Today', month: 'Month', week: 'Week' }}
      dayMaxEvents={3}
      events={calendarEvents}
      editable={false}
      selectable={false}
      nowIndicator
      firstDay={0}
      dateClick={(info) => {
        setSearchParams((sp) => {
          const next = new URLSearchParams(sp);
          next.set('date', info.dateStr);
          return next;
        });
      }}
    />
  );
}
```

---

### `src/features/calendar/selectEventsForCalendar.ts` (utility, pure selector)

**Analog:** `src/features/gantt/useDerivedSchedule.ts` + lifecycle palette consumption pattern in `GanttView.tsx` line 243

**Pure transform** (mirror domain-style purity from `src/domain/scheduler.ts`):
```typescript
import type { ScheduleEvent, Task } from '../../domain/types';
import { lifecyclePalette } from '../gantt/lifecyclePalette';

export interface CalendarEventInput {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: { eventType: string; plantingId?: string; taskId?: string };
}

export function selectEventsForCalendar(
  events: ScheduleEvent[],
  tasks: Task[],
): CalendarEventInput[] {
  const out: CalendarEventInput[] = [];
  for (const e of events) {
    const color = lifecyclePalette[e.type];
    if (!color) continue;  // skip task-only event types per palette contract
    out.push({
      id: e.id,
      title: e.type,
      start: e.start.slice(0, 10),
      end: e.end !== e.start ? e.end.slice(0, 10) : undefined,
      backgroundColor: color,
      borderColor: color,
      extendedProps: { eventType: e.type, plantingId: e.plantingId },
    });
  }
  for (const t of tasks) {
    out.push({
      id: t.id,
      title: t.title,
      start: t.dueDate.slice(0, 10),
      extendedProps: { eventType: 'task', taskId: t.id, plantingId: t.plantingId },
    });
  }
  return out;
}
```

---

### `src/features/calendar/DayDetailDrawer.tsx` (component, Radix Dialog right-sheet)

**Analog:** `src/features/catalog/MyPlanPanel.tsx` (266 lines — exact pattern: Radix Dialog as right-side sheet using DialogPrimitive.Content directly)

**Right-sheet positioning + URL-state pattern** (`src/features/catalog/MyPlanPanel.tsx` lines 78-103, with URL-driven open state instead of uiStore):
```typescript
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useSearchParams } from 'react-router';
import { Dialog, DialogClose, DialogOverlay, DialogPortal, DialogTitle } from '../../ui/Dialog';
import { X } from 'lucide-react';
import { cn } from '../../ui/cn';

export function DayDetailDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get('date');
  const isOpen = date !== null;

  const handleClose = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('date');
    setSearchParams(next);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-labelledby="day-detail-heading"
          className={cn(
            'fixed right-0 top-0 z-50 h-full w-[var(--spacing-drawer-w)] max-w-[calc(100vw-32px)]',
            'bg-white shadow-[-8px_0_24px_rgb(0_0_0_/_0.08)] border-l border-stone-200 p-6 overflow-y-auto',
            'transition-transform duration-200 ease-out',
            'data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full',
            'focus:outline-none',
          )}
        >
          <div className="flex items-center justify-between sticky top-0 bg-white -mt-6 -mx-6 px-6 pt-6 pb-3 border-b border-stone-100">
            <DialogTitle id="day-detail-heading">{/* formatted date */}</DialogTitle>
            <DialogClose asChild>
              <button type="button" aria-label="Close" className="text-stone-500 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>
          {/* event groups + task rows */}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
```

---

### `src/features/tasks/TasksDashboard.tsx` (component, route page)

**Analog:** `src/features/settings/SettingsPanel.tsx` (110 lines — exact route-page shape: max-w container + heading + sections)

**Page shell pattern** (`src/features/settings/SettingsPanel.tsx` lines 52-110):
```typescript
import { Plus } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useUIStore } from '../../stores/uiStore';
import { useTodayWeekOverdue } from './useTodayWeekOverdue';
import { TaskGroup } from './TaskGroup';
import { CustomTaskModal } from './CustomTaskModal';

export function TasksDashboard() {
  const { today, thisWeek, overdue } = useTodayWeekOverdue();
  const groupBy = useUIStore((s) => s.taskGroupBy);
  const setGroupBy = useUIStore((s) => s.setTaskGroupBy);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <h1 className="text-3xl font-semibold text-stone-900">Tasks</h1>
      <p className="mt-2 text-base text-stone-600 mb-8">Today's work, this week, and what's overdue.</p>

      <div className="flex justify-between mb-8">
        <Button variant="ghost" onClick={() => setGroupBy(groupBy === 'plant' ? 'category' : 'plant')}>
          Group by {groupBy === 'plant' ? 'plant' : 'category'}
        </Button>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      <section aria-labelledby="today-heading" className="mb-8">
        <h2 id="today-heading" className="text-xl font-semibold text-stone-900 mb-4">
          Today ({today.length})
        </h2>
        <TaskGroup tasks={today} groupBy={groupBy} />
      </section>
      {/* This Week + Overdue sections same shape */}

      <CustomTaskModal open={modalOpen} onOpenChange={setModalOpen} editingTask={null} />
    </div>
  );
}
```

---

### `src/features/tasks/TaskRow.tsx` (component, presentational row)

**Analog:** `src/features/catalog/MyPlanPanel.tsx` lines 144-201 (`<li>` row with checkbox/switch + plant accent + actions)

**Row anatomy pattern** (`src/features/catalog/MyPlanPanel.tsx` lines 154-200):
```typescript
import { AlertCircle } from 'lucide-react';
import { lifecyclePalette } from '../gantt/lifecyclePalette';
import { cn } from '../../ui/cn';

interface TaskRowProps {
  task: Task;
  completed: boolean;
  onToggle: () => void;
}

export function TaskRow({ task, completed, onToggle }: TaskRowProps) {
  const accent = task.plantingId ? lifecyclePalette['transplant'] /* derive */ : '#A8A29E';
  return (
    <li className="flex items-center gap-3 h-14 border-b border-stone-100 hover:bg-stone-50 px-3">
      <input type="checkbox" checked={completed} onChange={onToggle} className="h-4 w-4 accent-green-700" />
      <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: accent }} aria-hidden />
      <div className="flex-1 min-w-0">
        <p className={cn('text-base text-stone-900', completed && 'text-stone-500 line-through')}>
          {task.title}
        </p>
        <p className="text-sm text-stone-600">{task.category}</p>
      </div>
      {/* due-date pill */}
    </li>
  );
}
```

---

### `src/features/tasks/CustomTaskModal.tsx` (component, Radix Dialog form)

**Analog:** `src/features/catalog/CustomPlantModal.tsx` (762 lines — exact pattern: Dialog + form + Zod validation + dual create/edit mode + remount key)

**Mode-aware modal shell + remount key trick** (`src/features/catalog/CustomPlantModal.tsx` lines 131-160):
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/Select';
import type { CustomTask } from '../../domain/types';

export interface CustomTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTask: CustomTask | null;
}

export function CustomTaskModal(props: CustomTaskModalProps) {
  // Remount inner form on open + editingTask change to avoid setState-in-effect.
  return (
    <CustomTaskModalInner
      key={`${props.open ? 'open' : 'closed'}:${props.editingTask?.id ?? 'new'}`}
      {...props}
    />
  );
}

function CustomTaskModalInner({ open, onOpenChange, editingTask }: CustomTaskModalProps) {
  const isEdit = editingTask !== null;
  const [form, setForm] = useState<FormState>(() =>
    editingTask ? taskToForm(editingTask) : defaultForm(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  // ... validation pattern from CustomPlantModal lines 60-64 (parseNumInput for number|null inputs)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogDescription>{/* ... */}</DialogDescription>
        </DialogHeader>
        {/* form fields per UI-SPEC §10 */}
        <DialogFooter>
          {isEdit && <Button variant="destructive" onClick={/* inline confirm */}>Delete task</Button>}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>{isEdit ? 'Save changes' : 'Add task'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Critical:** `parseNumInput` pattern from `CustomPlantModal.tsx` lines 60-64 (number-or-null state for clearable number inputs — known bug fix ref: commit 29e7a01 "wizard infinite loop + clearable number inputs").

---

### `src/features/tasks/useTodayWeekOverdue.ts` (hook, memoized selector)

**Analog:** `src/features/gantt/useDerivedSchedule.ts` (exact pattern: useMemo over store reads)

```typescript
import { useMemo } from 'react';
import { usePlanStore } from '../../stores/planStore';
import { useCatalogStore, selectMerged } from '../../stores/catalogStore';
import { useDerivedSchedule } from '../gantt/useDerivedSchedule';
import { deriveTasks } from './deriveTasks';
import type { Task } from '../../domain/types';

export function useTodayWeekOverdue(): { today: Task[]; thisWeek: Task[]; overdue: Task[] } {
  const plan = usePlanStore((s) => s.plan);
  const events = useDerivedSchedule();
  const catalog = useCatalogStore(selectMerged);
  return useMemo(() => {
    if (!plan) return { today: [], thisWeek: [], overdue: [] };
    const allTasks = deriveTasks(events, plan.customTasks, catalog);
    return partitionByWindow(allTasks);  // pure helper — uses dateWrappers
  }, [plan, events, catalog]);
}
```

---

### `src/features/tasks/deriveTasks.ts` (utility, pure projection)

**Analog:** `src/domain/taskEmitter.ts` (144 lines — pure ScheduleEvent[] → Task[] projection)

**Pure projection pattern** (`src/domain/taskEmitter.ts` lines 87-144):
```typescript
import type { ScheduleEvent, CustomTask, Plant, Task, TaskRecurrence } from '../../domain/types';
import { parseDate, addDays, toISODate } from '../../domain/dateWrappers';

/** Project ScheduleEvents (auto) + CustomTasks (recurring + one-off) → flat Task[]. */
export function deriveTasks(
  events: ScheduleEvent[],
  customTasks: CustomTask[],
  catalog: ReadonlyMap<string, Plant>,
): Task[] {
  const out: Task[] = [];
  // Auto-tasks: water-seedlings / harden-off-day / fertilize-at-flowering events → Task
  for (const e of events) {
    if (e.type === 'water-seedlings' || e.type === 'harden-off-day' || e.type === 'fertilize-at-flowering') {
      out.push(autoEventToTask(e, catalog));
    }
  }
  // Custom tasks: expand recurring into per-occurrence Tasks (composite key per CONTEXT D-36)
  for (const ct of customTasks) {
    if (!ct.recurrence) {
      out.push({ ...ct, source: 'custom', completed: /* lookup completedTaskIds */ false });
    } else {
      out.push(...expandRecurrence(ct));
    }
  }
  return out;
}
```

**Date math:** ALL via `dateWrappers` (per CONTEXT integration points; this module is OUTSIDE `src/features/gantt/**` so the ESLint allowlist does NOT apply).

---

### `src/stores/historyBindings.ts` (hook/effect, document keybinding)

**Analog:** `src/app/AppShell.tsx` lines 30-40 (document event listener with cleanup)

```typescript
import { useEffect } from 'react';
import { usePlanStore } from './planStore';

export function useHistoryKeybindings() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as Element | null;
      // Suppress when focus is inside text input (per CONTEXT D-18)
      if (target?.matches('input, textarea, [contenteditable]')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      const temporal = (usePlanStore as unknown as { temporal: { getState: () => { undo: () => void; redo: () => void } } }).temporal;
      if (e.shiftKey) temporal.getState().redo();
      else temporal.getState().undo();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
```

Mounted from `AppShell.tsx` body (alongside the existing `useCurrentHash`).

---

### `src/app/App.tsx` EXTEND (lazy CalendarView + Tasks route swap)

**Existing route pattern** (`src/app/App.tsx` lines 22-40): mirror exactly for new lazy boundary.

```typescript
import { lazy, Suspense } from 'react';
import { TasksDashboard } from '../features/tasks/TasksDashboard';
import { DragLayer } from '../features/gantt/drag/DragLayer';
import { PlanViewTabs } from './PlanViewTabs';
import { useSearchParams } from 'react-router';

const CalendarView = lazy(() => import('../features/calendar/CalendarView'));

function PlanRoute() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') ?? 'gantt';
  return (
    <>
      <PlanViewTabs />
      {view === 'calendar' ? (
        <Suspense fallback={<div className="bg-stone-100 h-96" aria-hidden />}>
          <CalendarView />
        </Suspense>
      ) : (
        <DragLayer />
      )}
    </>
  );
}

// in <Routes>:
<Route path="/plan" element={<PlanRoute />} />
<Route path="/tasks" element={<TasksDashboard />} />
```

---

### `src/domain/types.ts` EXTEND

**Add to `Planting` interface** (after line 84):
```typescript
// Phase 3 (D-13): per-event-type lock map. Locked events held fixed during cascade reflow.
locks?: Partial<Record<EventType, boolean>>;
```

**Bump GardenPlan schemaVersion** (line 155): `schemaVersion: 3` (was `2`).

**Document the `completedTaskIds` semantic extension in a comment** (per CONTEXT D-36): bare `taskId` = one-off completion; `${taskId}:${ISODate}` = per-occurrence completion for recurring tasks. Existing one-off keys remain valid (no migration needed since Phase 2 didn't ship completed tasks).

---

### `src/domain/migrations.ts` EXTEND (v2→v3)

**Pattern from existing v1→v2 migration** (`src/domain/migrations.ts` lines 38-54):

```typescript
export const CURRENT_SCHEMA_VERSION = 3;  // bumped from 2

const migrations: Record<number, (s: unknown) => unknown> = {
  2: (state: unknown) => { /* existing v1→v2 unchanged */ },
  3: (state: unknown) => {
    if (!state || typeof state !== 'object') return state;
    const obj = state as { plan?: GardenPlan | null };
    if (!obj.plan) return { ...obj, plan: null };
    return {
      ...obj,
      plan: {
        ...obj.plan,
        schemaVersion: 3,
        plantings: obj.plan.plantings.map((p) => ({
          ...p,
          locks: p.locks ?? {},  // safe default: nothing locked
        })),
      },
    };
  },
};
```

---

### `src/index.css` EXTEND (Phase 3 `@theme` tokens)

**Pattern from existing `@theme` block** (`src/index.css` lines 4-26):

```css
@theme {
  /* ... existing Phase 1+2 tokens ... */

  /* Phase 3 additions */
  --color-lifecycle-locked: #44403C;          /* stone-700 — D-12 lock outline */
  --spacing-tooltip-min-w: 240px;
  --spacing-tooltip-max-w: 320px;
  --spacing-drawer-w: 400px;                  /* Same as --spacing-panel-w; UI-SPEC notes both never on screen at once */
  --spacing-tab-strip-h: 44px;
  --spacing-task-row-h: 56px;
  --spacing-task-section-gap: 32px;
  --spacing-lock-icon: 16px;
  --spacing-lock-hit: 24px;
  --spacing-bar-min-drag-px: 6px;
}

@keyframes ghost-pulse {
  0%, 100% { opacity: 0.45; }
  50%      { opacity: 0.65; }
}
```

---

## Test Patterns

### `tests/features/gantt/drag/clampModifier.test.ts` (unit, pure)

**Analog:** `tests/domain/constraints.test.ts` (76 lines — exact pure-function unit-test shape)

**Copy structure verbatim**: `describe` per rule + `it` per branch (clamp / pass-through / not-applicable). Reuse the inline `plan` fixture and the typed event factory pattern from constraints.test.ts lines 9-42.

### `tests/features/calendar/DayDetailDrawer.test.tsx` + `tests/features/tasks/TasksDashboard.test.tsx` (component)

**Analog:** `tests/features/catalog/CatalogBrowser.test.tsx` (97 lines — happy-dom + RTL + MemoryRouter + `vi.resetModules()` between tests)

**Header + render pattern** (`tests/features/catalog/CatalogBrowser.test.tsx` lines 1-38):
```typescript
/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

describe('TasksDashboard', () => {
  beforeEach(() => { window.localStorage.clear(); });
  afterEach(() => { cleanup(); });

  async function renderDashboard() {
    const { TasksDashboard } = await import('../../../src/features/tasks/TasksDashboard');
    return render(<MemoryRouter><TasksDashboard /></MemoryRouter>);
  }
});
```

### `tests/stores/dragStore.test.ts` (store)

**Analog:** `tests/stores/planStore.test.ts` (381 lines — exact: dynamic-import inside tests + `vi.resetModules()` for store isolation)

**Critical pattern** (lines 43-65): each test does `vi.resetModules()` then `await import('...store')` so persist-middleware bootstrap fires fresh per test. Use this pattern for both new store tests and the planStore-with-zundo extension tests.

### `tests/domain/migrations.test.ts` EXTEND (v2→v3)

**Analog:** self (lines 15-78 — exact v1→v2 test shape; copy and bump versions to v2→v3 + assert `Planting.locks` defaulted to `{}`).

---

## Shared Patterns

### Date math invariant
**Source:** `src/domain/dateWrappers.ts` (THE only allowed `new Date()` site outside `src/features/gantt/**`)
**Apply to:** `clampModifier.ts`, `selectEventsForCalendar.ts`, `deriveTasks.ts`, `useTodayWeekOverdue.ts` partition logic, `dragStore.ts` if any rAF date computation.
```typescript
import { parseDate, addDays, subDays, differenceInDays, toISODate } from '../../domain/dateWrappers';
```
ESLint `no-restricted-syntax` allows raw `new Date()` ONLY in `src/features/gantt/**` (per `src/features/gantt/timeScale.ts` line 109-114 documented exception). New gantt-drag modules under `src/features/gantt/drag/**` inherit the allowlist; new modules under `src/features/calendar/**` and `src/features/tasks/**` do NOT — they MUST use `dateWrappers`.

### Zustand store shape
**Source:** `src/stores/uiStore.ts` (transient) + `src/stores/planStore.ts` (persisted)
**Apply to:** all new stores (dragStore = transient; planStore extension = persisted+temporal+migrate)

Persisted stores follow the v1→v2 migration template in `src/domain/migrations.ts` lines 23-54 (caller validates via Zod after migrate; no validation inside migrate).

### Radix Dialog as right-side sheet
**Source:** `src/features/catalog/MyPlanPanel.tsx` lines 78-103 (DialogPrimitive.Portal + DialogPrimitive.Content with custom `fixed right-0 top-0 h-full w-[var(--spacing-panel-w)]` positioning + `data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full` slide animation)
**Apply to:** `DayDetailDrawer.tsx` (replace `--spacing-panel-w` with `--spacing-drawer-w`; both equal 400px per UI-SPEC).

### Modal create/edit dual mode + remount key
**Source:** `src/features/catalog/CustomPlantModal.tsx` lines 131-160 (outer wrapper that key={"open|closed:editingId"} the inner form to avoid setState-in-effect on prop change)
**Apply to:** `CustomTaskModal.tsx`. Same pattern verbatim.

### Clearable number input
**Source:** `src/features/catalog/CustomPlantModal.tsx` lines 60-64 (`parseNumInput` returning `number | null`; `null` = empty mid-typing)
**Apply to:** `CustomTaskModal.tsx` for the "Every N days" interval input. Recent commit `29e7a01` documents this as a Phase 2 smoke-test fix — do not regress.

### Hash-route active-link styling
**Source:** `src/app/AppShell.tsx` lines 67-82 (`text-green-700 underline underline-offset-4 decoration-2` for active; `text-stone-600 hover:text-stone-900` for inactive; `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700` ring)
**Apply to:** `PlanViewTabs.tsx` (use this exact active/inactive class set so the tab strip looks like the existing nav links per UI-SPEC §5).

### Lucide icon + button + cn() pattern
**Source:** `src/features/catalog/MyPlanPill.tsx` lines 22-43 (cn() conditional classes + aria-label + focus-visible ring)
**Apply to:** `LockToggle.tsx`, undo/redo header buttons in AppShell extension.

### Pure-function file header convention
**Source:** every file in `src/domain/**` (e.g., `src/domain/scheduler.ts` lines 1-10; `src/domain/constraints.ts` lines 1-6)
```typescript
// src/<path>/<filename>.ts
// One-line purpose statement.
// Source: [CITED: .planning/phases/03-drag-cascade-calendar-tasks/03-CONTEXT.md D-XX]
//
// Purity: zero React/Zustand/I/O; date math via dateWrappers only.
```
**Apply to:** `clampModifier.ts`, `selectEventsForCalendar.ts`, `deriveTasks.ts`.

### Component file header convention
**Source:** every file in `src/features/**` (e.g., `src/features/gantt/GanttView.tsx` lines 1-18; `src/features/catalog/MyPlanPanel.tsx` lines 1-7)
**Apply to:** all new feature components — header includes purpose + UI-SPEC + CONTEXT citations.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/features/calendar/fullcalendar.css` | config (CSS theme overrides) | n/a | First plain `.css` file imported by a feature module. Existing CSS is global at `src/index.css`. Use FullCalendar's documented CSS variable theming (`--fc-border-color`, etc.) — see RESEARCH.md §FullCalendar theming. |
| `src/features/gantt/drag/clampModifier.ts` (the @dnd-kit `Modifier` type wrapper) | utility | transform | No prior `@dnd-kit` usage; consult RESEARCH.md drag patterns + @dnd-kit Modifier docs (https://docs.dndkit.com/api-documentation/modifiers). The pure-function shape mirrors `canMove` exactly though — analog above is a strong role-match. |
| `src/stores/historyBindings.ts` (zundo `temporal.getState()` access) | hook | event-driven | No prior zundo usage. Consult RESEARCH.md §Undo/redo + zundo README (https://github.com/charkour/zundo) for the `temporal` accessor on a wrapped Zustand store. |

---

## Metadata

**Analog search scope:** `src/`, `tests/` (full)
**Files scanned:** 51 source files + 21 test files
**Pattern extraction date:** 2026-04-26
