// src/features/tasks/TaskGroup.tsx
// Section subdivision: groups tasks under a plant or category header.
// Per UI-SPEC §8 (group headers + task rows).

import { TaskRow } from './TaskRow';
import { useCatalogStore, selectMerged } from '../../stores/catalogStore';
import { usePlanStore } from '../../stores/planStore';
import type { Task, TaskCategory } from '../../domain/types';

export interface TaskGroupProps {
  tasks: Task[];
  groupBy: 'plant' | 'category';
  todayISO: string;
}

const FREE_FLOATING_KEY = '__free__';

function humanCategory(c: TaskCategory): string {
  return c
    .split('-')
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function TaskGroup({ tasks, groupBy, todayISO }: TaskGroupProps) {
  const catalog = useCatalogStore(selectMerged);
  const plan = usePlanStore((s) => s.plan);
  const toggle = usePlanStore((s) => s.toggleTaskCompletion);

  function keyOf(t: Task): string {
    if (groupBy === 'plant') {
      if (!t.plantingId) return FREE_FLOATING_KEY;
      const planting = plan?.plantings.find((p) => p.id === t.plantingId);
      if (!planting) return t.plantingId;
      const plant = catalog.get(planting.plantId);
      return plant?.name ?? planting.label ?? planting.id;
    }
    return t.category;
  }

  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    const k = keyOf(t);
    const arr = groups.get(k) ?? [];
    arr.push(t);
    groups.set(k, arr);
  }

  // Sort group keys alphabetically; FREE_FLOATING_KEY pinned last.
  const sortedKeys = Array.from(groups.keys()).sort((a, b) =>
    a === FREE_FLOATING_KEY ? 1 : b === FREE_FLOATING_KEY ? -1 : a.localeCompare(b),
  );

  // Plant-name lookup for "Group by category" view (TaskRow secondary line).
  const lookupPlantName = (t: Task): string | undefined => {
    if (!t.plantingId) return undefined;
    const planting = plan?.plantings.find((p) => p.id === t.plantingId);
    if (!planting) return undefined;
    return catalog.get(planting.plantId)?.name ?? planting.label;
  };

  return (
    <>
      {sortedKeys.map((k) => {
        const groupTasks = groups.get(k)!;
        const heading =
          k === FREE_FLOATING_KEY
            ? 'Free-floating tasks'
            : groupBy === 'category'
              ? humanCategory(k as TaskCategory)
              : k;
        return (
          <div key={k} className="mt-4 mb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-700 mt-4 mb-2">
              {heading}
            </h3>
            <ul>
              {groupTasks.map((t) => {
                const pn = lookupPlantName(t);
                return (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={() => toggle(t.id)}
                    groupBy={groupBy}
                    todayISO={todayISO}
                    {...(pn !== undefined ? { plantName: pn } : {})}
                  />
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
}
