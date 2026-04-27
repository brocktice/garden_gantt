// src/features/tasks/CustomTaskModal.tsx
// Author + edit + delete modal for CustomTask. Per CONTEXT D-35 + UI-SPEC §10.
//
// Form covers:
//  - Title (required)
//  - Recurrence: One time | Daily | Weekly | Every N days  (radio group)
//  - Conditional fields:
//      One time → Due date
//      Daily / Weekly / Every N days → Stop repeating after (optional endDate)
//      Every N days → Interval (number, ≥1, clearable)
//  - Attach to planting (None | <plantings...>)
//  - Category (TaskCategory enum)
//  - Notes (optional)
//
// Reused for edit; delete button (edit mode only) shows an inline confirm.
//
// Date math note: src/features/tasks/** is NOT in the ESLint allowlist for raw `new Date()`.
// All Date construction goes through dateWrappers.

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/Select';
import { useCatalogStore, selectMerged } from '../../stores/catalogStore';
import { usePlanStore } from '../../stores/planStore';
import { nowISOString, parseDate, toISODate } from '../../domain/dateWrappers';
import type {
  CustomTask,
  TaskCategory,
  TaskRecurrence,
} from '../../domain/types';

export interface CustomTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTask: CustomTask | null;
}

type RecurrenceKind = 'one-time' | 'daily' | 'weekly' | 'interval';

interface FormState {
  title: string;
  recurrenceKind: RecurrenceKind;
  dueDate: string; // YYYY-MM-DD (one-time) OR start date for recurring
  intervalDays: number | null;
  endDate: string; // YYYY-MM-DD or empty
  plantingId: string; // '__none__' for free-floating
  category: TaskCategory;
  notes: string;
}

const FREE_FLOATING = '__none__';

const CATEGORIES: TaskCategory[] = [
  'sow',
  'transplant',
  'harden-off',
  'harvest',
  'water',
  'fertilize',
  'prune',
  'scout-pests',
  'custom',
];

function parseNumInput(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function newTaskId(): string {
  // Deterministic-enough for a single-user local app; nowISOString + small entropy.
  const ts = nowISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `t-${ts}-${rand}`;
}

function todayDate(): string {
  return toISODate(parseDate(nowISOString())).slice(0, 10);
}

function defaultForm(initialPlantingId?: string): FormState {
  return {
    title: '',
    recurrenceKind: 'one-time',
    dueDate: todayDate(),
    intervalDays: null,
    endDate: '',
    plantingId: initialPlantingId ?? FREE_FLOATING,
    category: initialPlantingId ? 'water' : 'custom',
    notes: '',
  };
}

function taskToForm(t: CustomTask): FormState {
  let recurrenceKind: RecurrenceKind = 'one-time';
  if (t.recurrence) {
    if (t.recurrence.type === 'daily') recurrenceKind = 'daily';
    else if (t.recurrence.type === 'weekly') recurrenceKind = 'weekly';
    else recurrenceKind = 'interval';
  }
  return {
    title: t.title,
    recurrenceKind,
    dueDate: t.dueDate.slice(0, 10),
    intervalDays:
      t.recurrence && t.recurrence.type === 'interval'
        ? (t.recurrence.intervalDays ?? null)
        : null,
    endDate: t.recurrence?.endDate ? t.recurrence.endDate.slice(0, 10) : '',
    // CR-01 (Plan 03-08): CustomTask now inherits plantingId from Task. Read the persisted
    // value when editing an attached task; default to FREE_FLOATING otherwise.
    plantingId: t.plantingId ?? FREE_FLOATING,
    category: t.category,
    notes: t.notes ?? '',
  };
}

function buildTask(
  form: FormState,
  isEdit: boolean,
  editingId: string | null,
): CustomTask {
  const id = isEdit && editingId ? editingId : newTaskId();
  const dueISO = `${form.dueDate}T12:00:00.000Z`;
  let recurrence: TaskRecurrence | undefined;
  if (form.recurrenceKind !== 'one-time') {
    if (form.recurrenceKind === 'daily') {
      recurrence = { type: 'daily' };
    } else if (form.recurrenceKind === 'weekly') {
      recurrence = { type: 'weekly' };
    } else {
      const interval = form.intervalDays && form.intervalDays >= 1 ? form.intervalDays : 7;
      recurrence = { type: 'interval', intervalDays: interval };
    }
    if (form.endDate.trim() !== '') {
      recurrence.endDate = `${form.endDate}T12:00:00.000Z`;
    }
  }
  const task: CustomTask = {
    id,
    source: 'custom',
    title: form.title.trim(),
    category: form.category,
    dueDate: dueISO,
    completed: false,
    // CR-01 (Plan 03-08): persist the attach-to-planting selection. Conditional spread
    // keeps the field absent when free-floating — no '__none__' string leaks into the
    // serialized plan.
    ...(form.plantingId !== FREE_FLOATING ? { plantingId: form.plantingId } : {}),
  };
  if (recurrence) task.recurrence = recurrence;
  if (form.notes.trim() !== '') task.notes = form.notes.trim();
  return task;
}

// ----------------------------------------------------------------------------

export function CustomTaskModal(props: CustomTaskModalProps) {
  // Remount inner form on open or editingTask change to avoid setState-in-effect.
  return (
    <CustomTaskModalInner
      key={`${props.open ? 'open' : 'closed'}:${props.editingTask?.id ?? 'new'}`}
      {...props}
    />
  );
}

function CustomTaskModalInner({ open, onOpenChange, editingTask }: CustomTaskModalProps) {
  const isEdit = editingTask !== null;
  const plan = usePlanStore((s) => s.plan);
  const catalog = useCatalogStore(selectMerged);
  const addCustomTask = usePlanStore((s) => s.addCustomTask);
  const editCustomTask = usePlanStore((s) => s.editCustomTask);
  const removeCustomTask = usePlanStore((s) => s.removeCustomTask);

  const [form, setForm] = useState<FormState>(() =>
    editingTask ? taskToForm(editingTask) : defaultForm(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const plantingOptions = useMemo(() => {
    const base = [{ value: FREE_FLOATING, label: 'None — free-floating task' }];
    if (!plan) return base;
    for (const p of plan.plantings) {
      const plant = catalog.get(p.plantId);
      base.push({
        value: p.id,
        label: plant?.name ?? p.label ?? p.id,
      });
    }
    return base;
  }, [plan, catalog]);

  const handleSave = () => {
    const fieldErrors: Record<string, string> = {};
    if (!form.title.trim()) {
      fieldErrors.title = "Add a title so you'll know what to do.";
    }
    if (
      form.recurrenceKind === 'interval' &&
      form.intervalDays !== null &&
      form.intervalDays < 1
    ) {
      fieldErrors.intervalDays = 'Interval must be at least 1 day.';
    }
    if (form.endDate.trim() !== '' && form.endDate < todayDate()) {
      fieldErrors.endDate = 'End date is in the past — pick a future date or leave blank.';
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const task = buildTask(form, isEdit, editingTask?.id ?? null);
    if (isEdit && editingTask) {
      editCustomTask(editingTask.id, task);
    } else {
      addCustomTask(task);
    }
    onOpenChange(false);
  };

  const handleDeleteConfirm = () => {
    if (editingTask) {
      removeCustomTask(editingTask.id);
    }
    onOpenChange(false);
  };

  const saveDisabled = !form.title.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the task details, or delete the task entirely.'
              : "Schedule a one-off chore or a recurring reminder. Attach it to a plant or leave it free-floating."}
          </DialogDescription>
        </DialogHeader>

        {/* Title */}
        <fieldset className="mt-6">
          <Label htmlFor="ct-title">
            Title<span className="text-red-700"> *</span>
          </Label>
          <Input
            id="ct-title"
            aria-required="true"
            autoFocus
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder='e.g. "Mulch the bed", "Spray neem oil"'
          />
          {errors.title && (
            <p className="text-sm text-red-700 mt-1" role="alert">
              {errors.title}
            </p>
          )}
        </fieldset>

        {/* Recurrence */}
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-stone-900 mb-2">
            How often?
          </legend>
          <div className="space-y-2" role="radiogroup" aria-label="Recurrence">
            {(
              [
                ['one-time', 'One time'],
                ['daily', 'Daily'],
                ['weekly', 'Weekly'],
                ['interval', 'Every N days'],
              ] as Array<[RecurrenceKind, string]>
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-base text-stone-900">
                <input
                  type="radio"
                  name="recurrenceKind"
                  value={value}
                  checked={form.recurrenceKind === value}
                  onChange={() => setForm({ ...form, recurrenceKind: value })}
                  className="h-4 w-4 accent-green-700"
                  aria-label={label}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Conditional: due date OR start date + interval + end date */}
        <fieldset className="mt-6 space-y-3">
          {form.recurrenceKind === 'one-time' ? (
            <div>
              <Label htmlFor="ct-due">Due</Label>
              <Input
                id="ct-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="ct-start">Start date</Label>
                <Input
                  id="ct-start"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
              {form.recurrenceKind === 'interval' && (
                <div>
                  <Label htmlFor="ct-interval">Interval (days)</Label>
                  <Input
                    id="ct-interval"
                    type="number"
                    min={1}
                    value={form.intervalDays ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, intervalDays: parseNumInput(e.target.value) })
                    }
                    placeholder="e.g. 3"
                  />
                  {errors.intervalDays && (
                    <p className="text-sm text-red-700 mt-1" role="alert">
                      {errors.intervalDays}
                    </p>
                  )}
                </div>
              )}
              <div>
                <Label htmlFor="ct-end">Stop repeating after (optional)</Label>
                <Input
                  id="ct-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-700 mt-1" role="alert">
                    {errors.endDate}
                  </p>
                )}
              </div>
            </>
          )}
        </fieldset>

        {/* Attach to planting */}
        <fieldset className="mt-6">
          <Label htmlFor="ct-attach">Attach to planting</Label>
          <Select
            value={form.plantingId}
            onValueChange={(v) => {
              // If attaching to a planting from the default "custom" category, smart-default
              // to "water" so the row gets a sensible accent.
              const next = { ...form, plantingId: v };
              if (v !== FREE_FLOATING && form.category === 'custom') {
                next.category = 'water';
              } else if (v === FREE_FLOATING && form.category === 'water') {
                next.category = 'custom';
              }
              setForm(next);
            }}
          >
            <SelectTrigger id="ct-attach" className="mt-1" aria-label="Attach to planting">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {plantingOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-sm text-stone-600">
            Free-floating tasks aren&apos;t tied to a specific plant.
          </p>
        </fieldset>

        {/* Category */}
        <fieldset className="mt-6">
          <Label htmlFor="ct-category">Category</Label>
          <Select
            value={form.category}
            onValueChange={(v) => setForm({ ...form, category: v as TaskCategory })}
          >
            <SelectTrigger id="ct-category" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </fieldset>

        {/* Notes */}
        <fieldset className="mt-6">
          <Label htmlFor="ct-notes">Notes (optional)</Label>
          <textarea
            id="ct-notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="block w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-base text-stone-900 placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-green-700 focus-visible:border-green-700"
          />
        </fieldset>

        {/* Footer / inline-confirm */}
        {confirmingDelete ? (
          <div className="mt-6 border-t border-stone-200 pt-4">
            <h4 className="text-base font-semibold text-stone-900">Delete this task?</h4>
            <p className="mt-1 text-sm text-stone-600">
              This removes the task and any completion history. This can&apos;t be undone — but
              you can use Cmd-Z right after to restore it.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={handleDeleteConfirm}>
                Delete task
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-between gap-2 border-t border-stone-200 pt-4">
            <div>
              {isEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-700 hover:text-red-800"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete task
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSave}
                disabled={saveDisabled}
              >
                {isEdit ? 'Save changes' : 'Add task'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
