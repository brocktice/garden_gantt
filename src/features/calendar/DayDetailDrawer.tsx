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
import { useCatalogStore, selectMerged } from '../../stores/catalogStore';
import { usePlanStore } from '../../stores/planStore';
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '../../ui/Dialog';
import { lifecyclePalette } from '../gantt/lifecyclePalette';
import { cn } from '../../ui/cn';
import { parseDate } from '../../domain/dateWrappers';
import type { ScheduleEvent } from '../../domain/types';

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

export function DayDetailDrawer() {
  const { selectedDate, isOpen, close } = useDayDetailUrl();
  const events = useDerivedSchedule();
  const catalog = useCatalogStore(selectMerged);
  const plan = usePlanStore((s) => s.plan);

  if (!selectedDate) return null;

  // Filter events whose date span contains the selected day (UTC date prefix compare).
  const dayEvents: ScheduleEvent[] = events.filter((e) => {
    const eStart = e.start.slice(0, 10);
    const eEnd = e.end.slice(0, 10);
    return selectedDate >= eStart && selectedDate <= eEnd;
  });

  // Group by plantingId (preserve insertion order from dayEvents)
  const groups = new Map<string, ScheduleEvent[]>();
  for (const e of dayEvents) {
    const arr = groups.get(e.plantingId) ?? [];
    arr.push(e);
    groups.set(e.plantingId, arr);
  }

  // Tasks for the day come from Plan 03-05's deriveTasks; for THIS plan, tasks are not yet wired.
  // Plan 03-07 wires the real Task[] consumer via useExpandedTasks.
  const dayTasks: Array<{ id: string; title: string; plantingId?: string }> = [];

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
                <p className="text-xl font-semibold text-stone-900 mb-2">Nothing scheduled</p>
                <p className="text-base text-stone-600">
                  No lifecycle events or tasks for {headingShort}. Click another day to inspect, or
                  close this panel.
                </p>
              </div>
            ) : (
              Array.from(groups.entries()).map(([plantingId, items]) => {
                const planting = plan?.plantings.find((p) => p.id === plantingId);
                const plant = planting ? catalog.get(planting.plantId) : undefined;
                const groupName = plant?.name ?? planting?.label ?? plantingId;
                return (
                  <div key={plantingId} className="mt-4 mb-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-900 mb-2">
                      {groupName}
                    </h3>
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
