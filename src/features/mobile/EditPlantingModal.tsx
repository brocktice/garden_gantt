// src/features/mobile/EditPlantingModal.tsx
// Phase 4 Plan 04-02 Task 1: phone tap-to-edit modal that replaces touch-drag.
//
// At <640px viewport, tapping a gantt bar opens this modal. The Save button calls the
// SAME `commitEdit` setter the desktop drag uses, so this surface participates in
// zundo undo/redo + the dirty-counter side effect (D-02 rationale, RESEARCH §Pitfall 9).
//
// Source: [CITED: .planning/phases/04-polish-mobile-ship/04-02-PLAN.md Task 1]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-PATTERNS.md §EditPlantingModal]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-UI-SPEC.md §Mobile tap-to-edit modal]
//
// Date parsing constraint: this directory is NOT in ESLint `no-restricted-syntax`
// allowlist for raw `new Date(string)`. All YMD->ISO conversions go through
// `dateWrappers.ymdToISONoon` (string-concat helper added in Plan 04-02 Task 1).

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Switch } from '../../ui/Switch';
import { usePlanStore } from '../../stores/planStore';
import { useCatalogStore, selectMerged } from '../../stores/catalogStore';
import { useDerivedSchedule } from '../gantt/useDerivedSchedule';
import { canMove } from '../../domain/constraints';
import { ymdToISONoon, isoNoonToYMD, nowISOString } from '../../domain/dateWrappers';
import { cn } from '../../ui/cn';
import type { EventType, ScheduleEdit } from '../../domain/types';

const PHASE_LABELS: Record<EventType, string> = {
  'indoor-start': 'Indoor start',
  'harden-off': 'Harden off',
  'transplant': 'Transplant',
  'direct-sow': 'Direct sow',
  'germination-window': 'Germination',
  'harvest-window': 'Harvest starts',
  'water-seedlings': 'Water seedlings',
  'harden-off-day': 'Harden off (day)',
  'fertilize-at-flowering': 'Fertilize at flowering',
};

export interface EditPlantingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantingId: string;
  eventType: EventType;
  /** Plan 04-03 wires toast-with-undo here. */
  onDelete?: () => void;
}

export function EditPlantingModal({
  open,
  onOpenChange,
  plantingId,
  eventType,
  onDelete,
}: EditPlantingModalProps) {
  const plan = usePlanStore((s) => s.plan);
  const commitEdit = usePlanStore((s) => s.commitEdit);
  const setLock = usePlanStore((s) => s.setLock);
  const removePlanting = usePlanStore((s) => s.removePlanting);
  const merged = useCatalogStore(selectMerged);
  const events = useDerivedSchedule();

  const planting = useMemo(
    () => plan?.plantings.find((p) => p.id === plantingId) ?? null,
    [plan, plantingId],
  );
  const plant = planting ? merged.get(planting.plantId) ?? null : null;
  const event = useMemo(
    () => events.find((e) => e.plantingId === plantingId && e.type === eventType) ?? null,
    [events, plantingId, eventType],
  );

  const initialStartYMD = event ? isoNoonToYMD(event.start) : '';
  const initialEndYMD = event ? isoNoonToYMD(event.end) : '';

  const [startYMD, setStartYMD] = useState(initialStartYMD);
  const [endYMD, setEndYMD] = useState(initialEndYMD);

  // Bail if plan/planting/plant/event missing — modal cannot render meaningfully.
  if (!plan || !planting || !plant || !event) {
    return null;
  }

  const locked = planting.locks?.[eventType] === true;

  // Constraint preview: if user picks a date that violates an active rule, surface
  // the clamp reason. Memoize on (startYMD) to avoid recomputing on unrelated renders.
  const violation = (() => {
    if (!startYMD) return null;
    const candidateISO = ymdToISONoon(startYMD);
    const result = canMove(event, candidateISO, plan, plant);
    if ('clamped' in result && result.clamped) {
      const finalYMD = isoNoonToYMD(result.finalDate);
      const reason = result.reasons[0] ?? '';
      return `Can't move before ${finalYMD} — ${reason}`;
    }
    return null;
  })();

  // Cascade preview: only the directly-affected event for v1 (UI-SPEC: max 3 lines + overflow).
  // Future Plan 04-03 may expand to full diff via a transient generateSchedule pass.
  const cascadeLines: string[] = [];
  if (startYMD && startYMD !== initialStartYMD) {
    cascadeLines.push(`Moves ${PHASE_LABELS[eventType]} to ${startYMD}.`);
  }
  if (eventType === 'harvest-window' && endYMD && endYMD !== initialEndYMD) {
    cascadeLines.push(`Moves harvest end to ${endYMD}.`);
  }

  const handleSave = () => {
    const edit: ScheduleEdit = {
      plantingId,
      eventType,
      startOverride: ymdToISONoon(startYMD),
      reason: 'user-form-edit',
      editedAt: nowISOString(),
    };
    if (eventType === 'harvest-window' && endYMD) {
      edit.endOverride = ymdToISONoon(endYMD);
    }
    commitEdit(edit);
    onOpenChange(false);
  };

  const handleDelete = () => {
    removePlanting(plantingId);
    onDelete?.();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {plant.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-stone-900">
              {PHASE_LABELS[eventType]}
            </span>
            <input
              type="date"
              value={startYMD}
              onChange={(e) => setStartYMD(e.target.value)}
              className={cn(
                'mt-1 block w-full rounded border border-stone-300 px-3',
                'min-h-[var(--spacing-touch-target-min,44px)]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700',
              )}
              aria-label={`${PHASE_LABELS[eventType]} date`}
            />
          </label>

          {eventType === 'harvest-window' && (
            <label className="block">
              <span className="text-sm font-medium text-stone-900">Harvest ends</span>
              <input
                type="date"
                value={endYMD}
                onChange={(e) => setEndYMD(e.target.value)}
                className={cn(
                  'mt-1 block w-full rounded border border-stone-300 px-3',
                  'min-h-[var(--spacing-touch-target-min,44px)]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700',
                )}
                aria-label="Harvest end date"
              />
            </label>
          )}

          {violation && (
            <p className="text-sm font-medium text-red-700">{violation}</p>
          )}

          {cascadeLines.length > 0 && (
            <div className="text-base text-stone-700 space-y-1">
              {cascadeLines.slice(0, 3).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              {cascadeLines.length > 3 && (
                <p className="text-sm text-stone-500">
                  +{cascadeLines.length - 3} more.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-stone-200 pt-3">
            <span className="text-sm font-medium">Lock this date</span>
            <Switch
              checked={locked}
              onCheckedChange={(v) => setLock(plantingId, eventType, v)}
              aria-label="Lock this date"
            />
          </div>

          <Button
            variant="destructive"
            className={cn(
              'w-full',
              'min-h-[var(--spacing-touch-target-min,44px)]',
            )}
            onClick={handleDelete}
          >
            Delete planting
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
