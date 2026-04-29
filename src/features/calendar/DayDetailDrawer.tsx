// src/features/calendar/DayDetailDrawer.tsx
// Radix Dialog right-side sheet — events + tasks for the URL-selected day.
// Per CONTEXT D-29..D-31 + UI-SPEC §7.
// Source: [CITED: 03-PATTERNS.md §DayDetailDrawer.tsx]
//         [CITED: src/features/catalog/MyPlanPanel.tsx lines 78-103 (exact pattern)]
//
// Tasks slot: this plan passes [] for tasks; Plan 03-07 wires the real `useExpandedTasks`
// consumer once Plan 03-05's `deriveTasks` lands. The events grouping ships in this plan.

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { useDayDetailUrl } from './useDayDetailUrl';
import { useDerivedSchedule } from '../gantt/useDerivedSchedule';
import { useExpandedTasks } from '../tasks/useExpandedTasks';
import { useCatalogStore, selectMerged } from '../../stores/catalogStore';
import { usePlanStore } from '../../stores/planStore';
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '../../ui/Dialog';
import { lifecyclePalette } from '../gantt/lifecyclePalette';
import { cn } from '../../ui/cn';
import { parseDate } from '../../domain/dateWrappers';
import { expandSuccessions } from '../../domain/succession';
import { buildPlantingLabelMap } from '../../domain/plantingLabels';
import type { ScheduleEvent, Task } from '../../domain/types';

function safeFormat(selectedDate: string, pattern: string): string {
  try {
    return format(parseDate(`${selectedDate}T12:00:00.000Z`), pattern);
  } catch {
    return selectedDate;
  }
}

function humanLabel(type: string): string {
  return type
    .split('-')
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

const FREE_FLOATING_KEY = '__free__';

export function DayDetailDrawer() {
  const { selectedDate, isOpen, close } = useDayDetailUrl();
  const events = useDerivedSchedule();
  const allTasks = useExpandedTasks();
  const toggleTask = usePlanStore((s) => s.toggleTaskCompletion);
  const catalog = useCatalogStore(selectMerged);
  const plan = usePlanStore((s) => s.plan);
  const expandedPlantings = plan ? expandSuccessions(plan, catalog).plantings : [];
  const plantingLabels = buildPlantingLabelMap(expandedPlantings, catalog);

  if (!selectedDate) return null;

  // Filter events whose date span contains the selected day (UTC date prefix compare).
  const dayEvents: ScheduleEvent[] = events.filter((e) => {
    const eStart = e.start.slice(0, 10);
    const eEnd = e.end.slice(0, 10);
    return selectedDate >= eStart && selectedDate <= eEnd;
  });

  // Tasks whose dueDate matches the selected day (Plan 03-07 wiring — Pitfall 7).
  const dayTasks: Task[] = allTasks.filter(
    (t) => t.dueDate.slice(0, 10) === selectedDate,
  );

  // Group by plantingId (preserve insertion order from dayEvents).
  const groups = new Map<string, ScheduleEvent[]>();
  for (const e of dayEvents) {
    const arr = groups.get(e.plantingId) ?? [];
    arr.push(e);
    groups.set(e.plantingId, arr);
  }

  // Group tasks by plantingId; free-floating tasks bucket under FREE_FLOATING_KEY.
  const taskGroups = new Map<string, Task[]>();
  for (const t of dayTasks) {
    const k = t.plantingId ?? FREE_FLOATING_KEY;
    const arr = taskGroups.get(k) ?? [];
    arr.push(t);
    taskGroups.set(k, arr);
  }

  // Union of group keys: events first (preserve order), then any task-only groups.
  const allKeys: string[] = [
    ...groups.keys(),
    ...Array.from(taskGroups.keys()).filter((k) => !groups.has(k)),
  ];

  const heading = safeFormat(selectedDate, 'EEEE, LLLL d, yyyy');
  const headingShort = safeFormat(selectedDate, 'EEE, LLL d');

  const eventCount = dayEvents.length;
  const taskCount = dayTasks.length;
  const subhead = [
    eventCount > 0 ? `${eventCount} event${eventCount === 1 ? '' : 's'}` : null,
    taskCount > 0 ? `${taskCount} task${taskCount === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const isEmpty = eventCount === 0 && taskCount === 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-labelledby="day-detail-heading"
          aria-describedby="day-detail-desc"
          className={cn(
            'fixed right-0 top-0 z-50 h-full w-[var(--spacing-drawer-w,400px)] max-w-[calc(100vw-32px)]',
            'bg-white shadow-[-8px_0_24px_rgb(0_0_0_/_0.08)] border-l border-stone-200 overflow-y-auto',
            'transition-transform duration-200 ease-out',
            'data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full',
            'focus:outline-none',
          )}
        >
          <div className="flex items-center justify-between sticky top-0 bg-white px-6 pt-6 pb-3 border-b border-stone-100">
            <div>
              <DialogTitle
                id="day-detail-heading"
                className="text-xl font-semibold text-stone-900"
              >
                {heading}
              </DialogTitle>
              {subhead && <p className="text-sm font-normal text-stone-600 mt-1">{subhead}</p>}
              <DialogDescription id="day-detail-desc" className="sr-only">
                Lifecycle events and tasks for the selected day.
              </DialogDescription>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="text-stone-500 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="px-6 py-4">
            {isEmpty ? (
              <div className="py-12 text-center">
                {/* Phase 4 (Plan 04-03 Task 2) D-11 retune: terse heading, no CTA. */}
                <h2 className="text-xl font-semibold text-stone-900 mb-2">Nothing scheduled.</h2>
                <p className="text-base text-stone-600">
                  No lifecycle events or tasks for {headingShort}. Click another day to inspect, or
                  close this panel.
                </p>
              </div>
            ) : (
              allKeys.map((plantingId) => {
                const items = groups.get(plantingId) ?? [];
                const groupTasks = taskGroups.get(plantingId) ?? [];
                let groupName: string;
                if (plantingId === FREE_FLOATING_KEY) {
                  groupName = 'Free-floating tasks';
                } else {
                  groupName = plantingLabels.get(plantingId) ?? plantingId;
                }
                return (
                  <div key={plantingId} className="mt-4 mb-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-900 mb-2">
                      {groupName}
                    </h3>
                    {items.length > 0 && (
                      <ul className="space-y-1">
                        {items.map((e) => {
                          const accent = lifecyclePalette[e.type] ?? '#A8A29E';
                          return (
                            <li
                              key={e.id}
                              className="flex items-center gap-2 pl-2 py-2 border-l-2"
                              style={{ borderLeftColor: accent }}
                            >
                              <span className="text-base font-normal text-stone-900">
                                {humanLabel(e.type)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {groupTasks.length > 0 && (
                      <ul className={cn('space-y-1', items.length > 0 && 'mt-2')}>
                        {groupTasks.map((t) => (
                          <li
                            key={t.id}
                            className="flex items-center gap-2 pl-2 py-2 border-l-2"
                            style={{ borderLeftColor: '#A8A29E' }}
                          >
                            <input
                              type="checkbox"
                              checked={t.completed}
                              onChange={() => toggleTask(t.id)}
                              aria-label={`Mark "${t.title}" as ${t.completed ? 'incomplete' : 'complete'}`}
                              className="h-4 w-4 accent-green-700"
                            />
                            <span
                              className={cn(
                                'text-base font-normal text-stone-900',
                                t.completed && 'text-stone-500 line-through',
                              )}
                            >
                              {t.title}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
