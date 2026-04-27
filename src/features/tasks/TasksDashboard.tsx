// src/features/tasks/TasksDashboard.tsx
// Route page at #/tasks — Today / This Week / Overdue sections + group-by toggle + + New task CTA.
// Per CONTEXT D-32..D-37 + UI-SPEC §8.
//
// Date math note: src/features/tasks/** is NOT in the ESLint allowlist for raw `new Date()`.
// All Date construction goes through dateWrappers.

import { useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useUIStore } from '../../stores/uiStore';
import { getTemporal, usePlanStore } from '../../stores/planStore';
import { useTodayWeekOverdue } from './useTodayWeekOverdue';
import { TaskGroup } from './TaskGroup';
import { CustomTaskModal } from './CustomTaskModal';
import { pushToast } from '../../ui/toast/useToast';
import { todayLocalYMD } from '../../domain/dateWrappers';
import type { CustomTask } from '../../domain/types';

export function TasksDashboard() {
  const { today, thisWeek, overdue } = useTodayWeekOverdue();
  const groupBy = useUIStore((s) => s.taskGroupBy);
  const setGroupBy = useUIStore((s) => s.setTaskGroupBy);
  const completedCount = usePlanStore(
    (s) => s.plan?.completedTaskIds?.length ?? 0,
  );
  const clearCompletedTaskIds = usePlanStore((s) => s.clearCompletedTaskIds);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CustomTask | null>(null);

  // WR-04 (REVIEW Phase 4): use local-calendar "today" so PST/Asia-east users
  // don't see tomorrow's date bucket fire prematurely. "Today" is a display
  // concept, not stored; goes through todayLocalYMD() in dateWrappers.
  const todayISO = todayLocalYMD();

  const isEmpty = today.length === 0 && thisWeek.length === 0 && overdue.length === 0;

  // D-09 toast-with-undo (Plan 04-03 Task 2): clearing completion is reversible.
  const handleClearCompleted = () => {
    if (completedCount === 0) return;
    const n = completedCount;
    clearCompletedTaskIds();
    pushToast({
      variant: 'success',
      duration: 5000,
      title: `Cleared ${n} completed.`,
      action: { label: 'Undo', onClick: () => getTemporal().undo() },
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <h1 className="text-3xl font-semibold text-stone-900">Tasks</h1>
      <p className="mt-2 text-base font-normal text-stone-600 mb-8">
        Today&apos;s work, this week, and what&apos;s overdue.
      </p>

      <div className="flex justify-between items-center mb-8">
        <Button
          variant="ghost"
          onClick={() => setGroupBy(groupBy === 'plant' ? 'category' : 'plant')}
          aria-pressed={groupBy === 'category'}
        >
          Group by {groupBy === 'plant' ? 'plant' : 'category'}
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
        <div className="flex items-center gap-2">
          {completedCount > 0 && (
            <Button variant="ghost" onClick={handleClearCompleted}>
              Clear completed
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => {
              setEditingTask(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> New task
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <div className="py-12 text-center">
          {/* Phase 4 (Plan 04-03 Task 2) D-11 retune: terse heading, no CTA. */}
          <h2 className="text-xl font-semibold text-stone-900 mb-2">No tasks today.</h2>
          <p className="text-base font-normal text-stone-600">
            Add a planting to your plan and tasks like watering and harden-off will show up
            here automatically. Or use <strong>+ New task</strong> to add a one-off.
          </p>
        </div>
      ) : (
        <>
          <section aria-labelledby="today-heading" className="mb-8">
            <h2
              id="today-heading"
              className="text-xl font-semibold text-stone-900 mb-4"
            >
              Today ({today.length})
            </h2>
            {today.length === 0 ? (
              <p className="text-sm text-stone-600 py-2">
                Nothing for today. Tomorrow&apos;s items appear in This Week.
              </p>
            ) : (
              <TaskGroup tasks={today} groupBy={groupBy} todayISO={todayISO} />
            )}
          </section>

          <section aria-labelledby="week-heading" className="mb-8">
            <h2
              id="week-heading"
              className="text-xl font-semibold text-stone-900 mb-4"
            >
              This Week ({thisWeek.length})
            </h2>
            {thisWeek.length === 0 ? (
              <p className="text-sm text-stone-600 py-2">Nothing scheduled this week.</p>
            ) : (
              <TaskGroup tasks={thisWeek} groupBy={groupBy} todayISO={todayISO} />
            )}
          </section>

          {overdue.length > 0 && (
            <section aria-labelledby="overdue-heading" className="mb-8">
              <h2
                id="overdue-heading"
                className="text-xl font-semibold text-stone-900 mb-4"
              >
                Overdue ({overdue.length})
              </h2>
              <TaskGroup tasks={overdue} groupBy={groupBy} todayISO={todayISO} />
            </section>
          )}
        </>
      )}

      <CustomTaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingTask={editingTask}
      />
    </div>
  );
}
