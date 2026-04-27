// src/features/tasks/CustomTaskModal.tsx
// PLACEHOLDER (Task 2 step) — full implementation lands in Plan 03-05 Task 3.
// Renders a Radix Dialog so the dashboard's "+ New task" CTA wiring is testable now.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/Dialog';
import type { CustomTask } from '../../domain/types';

export interface CustomTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTask: CustomTask | null;
}

export function CustomTaskModal({ open, onOpenChange, editingTask }: CustomTaskModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTask ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogDescription>
            Custom task authoring lands in Task 3 of this plan.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
