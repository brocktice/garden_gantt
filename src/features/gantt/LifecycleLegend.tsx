// src/features/gantt/LifecycleLegend.tsx
// Color key for the gantt lifecycle bars. Reads from lifecyclePalette so the
// swatches stay in sync with what the chart actually renders.
//
// Source: src/features/gantt/lifecyclePalette.ts (single source of truth)
import { lifecyclePalette } from './lifecyclePalette';
import type { EventType } from '../../domain/types';

const LEGEND_ORDER: ReadonlyArray<{ type: EventType; label: string }> = [
  { type: 'indoor-start', label: 'Indoor start' },
  { type: 'germination-window', label: 'Germination' },
  { type: 'harden-off', label: 'Harden off' },
  { type: 'transplant', label: 'Transplant' },
  { type: 'direct-sow', label: 'Direct sow' },
  { type: 'harvest-window', label: 'Harvest' },
];

export function LifecycleLegend() {
  return (
    <div
      className="px-3 py-2 border-b border-stone-200 bg-stone-50 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-stone-700"
      role="group"
      aria-label="Gantt color legend"
    >
      {LEGEND_ORDER.map(({ type, label }) => {
        const color = lifecyclePalette[type];
        if (!color) return null;
        return (
          <span key={type} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm border border-stone-300"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            {label}
          </span>
        );
      })}
    </div>
  );
}
