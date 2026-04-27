// src/features/settings/ImportPreviewModal.tsx
// Radix Dialog preview before destructive overwrite (POL-06).
// Phase 4 (Plan 04-03): adds a second-step "Replace plan" confirmation per D-09
// irreversible-action contract — the preview modal's primary CTA opens this
// nested dialog rather than mutating immediately.
//
// Source: [CITED: 02-UI-SPEC.md §9 Settings page — Import preview modal]
//         [CITED: 02-11-PLAN.md Task 2]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-03-PLAN.md Task 1]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-UI-SPEC.md §Destructive actions]
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { usePlanStore } from '../../stores/planStore';
import type { ImportResult } from './importPlan';

type SuccessResult = Extract<ImportResult, { ok: true }>;

/**
 * D-10 (Plan 04-03 Task 3) inline error copy — "corrupt JSON" / "shape mismatch"
 * shown when importPlan returns invalid-schema. SettingsPanel renders this verbatim
 * in place of the preview modal; the current plan is NOT mutated on this branch.
 */
export const CORRUPT_IMPORT_COPY =
  "This file doesn't match the current plan format. Your current plan is unchanged.";

export interface ImportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: SuccessResult;
}

export function ImportPreviewModal({ open, onOpenChange, result }: ImportPreviewModalProps) {
  const currentPlan = usePlanStore((s) => s.plan);
  const replacePlan = usePlanStore((s) => s.replacePlan);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirm = () => {
    replacePlan(result.plan);
    setConfirmOpen(false);
    onOpenChange(false);
  };

  const currentPlantingCount = currentPlan?.plantings.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import preview</DialogTitle>
          <DialogDescription>
            Importing <strong>{result.meta.plantingsCount}</strong> planting(s),{' '}
            <strong>{result.meta.customPlantsCount}</strong> custom plant(s), location ZIP{' '}
            <strong>{result.meta.zip}</strong> (zone {result.meta.zone}). This will OVERWRITE
            your current plan.
          </DialogDescription>
        </DialogHeader>

        {currentPlan && currentPlan.plantings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-sm text-amber-800 mt-4">
            Your current plan has {currentPlan.plantings.length} plantings. They will be
            replaced. To keep them, cancel and Export your current plan first.
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Replace my plan
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* D-09 second-step confirmation for irreversible overwrite. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace your current plan?</DialogTitle>
            <DialogDescription>
              Importing this file will replace your current plan ({currentPlantingCount}{' '}
              plantings). Your current plan won&apos;t be exported automatically. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm}>
              Replace plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
