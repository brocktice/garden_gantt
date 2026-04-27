// src/features/tasks/TaskRow.tsx
// Single task row — checkbox + plant accent + title + secondary line + due-date pill.
// Per UI-SPEC §9 + CONTEXT D-32, D-34, D-36.
//
// Date math note: src/features/tasks/** is NOT in the ESLint allowlist for raw `new Date()`.
// All Date construction goes through dateWrappers; date-fns format() takes a Date instance
// (constructed via parseDate) and never triggers the rule.

import { AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { lifecyclePalette } from '../gantt/lifecyclePalette';
import { cn } from '../../ui/cn';
import { parseDate } from '../../domain/dateWrappers';
import type { Task, TaskCategory, EventType, TaskRecurrence } from '../../domain/types';

export interface TaskRowProps {
  task: Task;
  onToggle: () => void;
  groupBy: 'plant' | 'category';
  todayISO: string; // YYYY-MM-DD — for due-date pill formatting + overdue detection
  plantName?: string;
}

// Map auto-task category → a lifecycle palette accent (best-effort; falls back to stone-400).
const CATEGORY_TO_EVENT: Partial<Record<TaskCategory, EventType>> = {
  water: 'water-seedlings',
  'harden-off': 'harden-off-day',
  fertilize: 'fertilize-at-flowering',
  transplant: 'transplant',
  sow: 'indoor-start',
  harvest: 'harvest-window',
};

const STONE_400 = '#A8A29E';

function safeFormat(dueStr: string): string {
  try {
    return format(parseDate(`${dueStr}T12:00:00.000Z`), 'EEE, LLL d');
  } catch {
    return dueStr;
  }
}

function overdueDaysLabel(todayISO: string, dueStr: string): string {
  try {
    const days = Math.max(
      1,
      Math.floor(
        (parseDate(`${todayISO}T12:00:00.000Z`).getTime() -
          parseDate(`${dueStr}T12:00:00.000Z`).getTime()) /
          86400000,
      ),
    );
    return days === 1 ? '1 day' : `${days} days`;
  } catch {
    return '';
  }
}

function humanCategory(c: TaskCategory): string {
  return c
    .split('-')
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function recurrenceLabel(r: TaskRecurrence): string {
  if (r.type === 'daily') return 'Daily';
  if (r.type === 'weekly') return 'Weekly';
  return r.intervalDays ? `Every ${r.intervalDays} days` : 'Custom';
}

export function TaskRow({ task, onToggle, groupBy, todayISO, plantName }: TaskRowProps) {
  const dueStr = task.dueDate.slice(0, 10);
  const isOverdue = dueStr < todayISO;
  const isToday = dueStr === todayISO;

  const accentEventType = CATEGORY_TO_EVENT[task.category];
  const accent = (accentEventType && lifecyclePalette[accentEventType]) || STONE_400;

  const dueLabel = isToday
    ? 'Today'
    : isOverdue
      ? `Overdue · ${overdueDaysLabel(todayISO, dueStr)}`
      : safeFormat(dueStr);

  // Secondary line per UI-SPEC §9: when grouped by plant → category; when grouped by
  // category → plant name; recurring → append cadence.
  const secondaryParts: string[] = [];
  if (groupBy === 'plant') secondaryParts.push(humanCategory(task.category));
  else if (plantName) secondaryParts.push(plantName);
  if (task.recurrence) secondaryParts.push(recurrenceLabel(task.recurrence));
  const secondary = secondaryParts.join(' · ');

  return (
    <li
      className={cn(
        'flex items-center gap-3 h-[var(--spacing-task-row-h,56px)] border-b border-stone-100 hover:bg-stone-50 px-3',
      )}
    >
      <input
        type="checkbox"
        checked={task.completed}
        onChange={onToggle}
        aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
        className="h-4 w-4 accent-green-700 cursor-pointer"
      />
      <span
        className="w-3 h-3 rounded-sm shrink-0"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-base font-normal text-stone-900 truncate',
            task.completed && 'text-stone-500 line-through',
          )}
        >
          {task.title}
        </p>
        {secondary && (
          <p className="text-sm font-normal text-stone-600 truncate">{secondary}</p>
        )}
      </div>
      <span
        className={cn(
          'text-sm font-medium shrink-0 inline-flex items-center gap-1',
          isOverdue
            ? 'text-red-700'
            : isToday
              ? 'text-stone-900'
              : 'text-stone-600 font-normal',
        )}
      >
        {isOverdue && <AlertCircle className="h-4 w-4" />}
        {dueLabel}
      </span>
    </li>
  );
}
