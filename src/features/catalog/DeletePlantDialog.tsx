// src/features/catalog/DeletePlantDialog.tsx
// D-15 cascade-confirmation Dialog. CatalogBrowser opens this when a custom plant
// being deleted is referenced by ≥1 planting. Pure presentational — UI only.
//
// Source: [CITED: 02-UI-SPEC.md §4 cascade-confirm copy + §10 delete-plant section]
//         [CITED: 02-CONTEXT.md D-15]

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import type { Plant } from '../../domain/types';

export interface DeletePlantDialogProps {
  plant: Plant | null;
  referencingCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeletePlantDialog({
  plant,
  referencingCount,
  open,
  onOpenChange,
  onConfirm,
}: DeletePlantDialogProps) {
  if (!plant) return null;
  const plantingsLabel = `planting${referencingCount === 1 ? '' : 's'}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &apos;{plant.name}&apos;?</DialogTitle>
          <DialogDescription>
            This plant is used in {referencingCount} {plantingsLabel}. Deleting
            it will also remove those plantings.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete plant and {referencingCount} {plantingsLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
