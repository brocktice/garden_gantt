// src/features/settings/ImportPreviewModal.tsx
// Radix Dialog preview before destructive overwrite (POL-06).
// Source: [CITED: 02-UI-SPEC.md §9 Settings page — Import preview modal]
//         [CITED: 02-11-PLAN.md Task 2]
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

export interface ImportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: SuccessResult;
}

export function ImportPreviewModal({ open, onOpenChange, result }: ImportPreviewModalProps) {
  const currentPlan = usePlanStore((s) => s.plan);
  const replacePlan = usePlanStore((s) => s.replacePlan);

  const handleConfirm = () => {
    replacePlan(result.plan);
    onOpenChange(false);
  };

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
          <Button variant="destructive" onClick={handleConfirm}>
            Replace my plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
