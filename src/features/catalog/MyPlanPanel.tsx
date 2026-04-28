// src/features/catalog/MyPlanPanel.tsx
// Right-side slide-out drawer (UI-SPEC §5, D-21). Shows location summary, plantings list,
// succession Switch (only when plant.timing.successionIntervalDays defined), remove button.
//
// Source: [CITED: 02-UI-SPEC.md §5 Component Inventory item 5 — full copy table]
//         [CITED: 02-PATTERNS.md MyPlanPanel.tsx]

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useMemo, useState } from 'react';
import { MapPin, Trash2, X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Switch } from '../../ui/Switch';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '../../ui/Dialog';
import { useCatalogStore, selectMerged } from '../../stores/catalogStore';
import { getTemporal, usePlanStore } from '../../stores/planStore';
import { useUIStore } from '../../stores/uiStore';
import {
  clampSuccessionCount,
  expandSuccessions,
  getSuccessionCapacity,
  successionLastPlantingDate,
} from '../../domain/succession';
import { resolveStartMethod } from '../../domain/plantingTiming';
import { pushToast } from '../../ui/toast/useToast';
import type { Planting } from '../../domain/types';
import { cn } from '../../ui/cn';

function formatDate(iso: string): string {
  // Show YYYY-MM-DD for stability; localized formatting is a Phase 4 polish task.
  return iso.slice(0, 10);
}

export function MyPlanPanel() {
  const isOpen = useUIStore((s) => s.myPlanPanelOpen);
  const setOpen = useUIStore((s) => s.setMyPlanPanelOpen);
  const plan = usePlanStore((s) => s.plan);
  const removePlanting = usePlanStore((s) => s.removePlanting);
  const toggleSuccession = usePlanStore((s) => s.toggleSuccession);
  const setSuccessionCount = usePlanStore((s) => s.setSuccessionCount);
  const setPlantingStartMethod = usePlanStore((s) => s.setPlantingStartMethod);
  const merged = useCatalogStore(selectMerged);

  const [pendingRemove, setPendingRemove] = useState<Planting | null>(null);

  const plantings = plan?.plantings ?? [];

  // Compute per-planting succession derived count for the caption.
  const successionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!plan) return counts;
    const expanded = expandSuccessions(plan, merged);
    for (const p of expanded.plantings) {
      if (p.successionIndex > 0) {
        const baseId = p.id.replace(/-s\d+$/, '');
        counts.set(baseId, (counts.get(baseId) ?? 0) + 1);
      }
    }
    return counts;
  }, [plan, merged]);

  const navigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.location.hash = path;
    }
    setOpen(false);
  };

  const handleRemoveConfirm = () => {
    if (!pendingRemove) return;
    const plant = merged.get(pendingRemove.plantId);
    const name = plant?.name ?? 'planting';
    removePlanting(pendingRemove.id);
    setPendingRemove(null);
    // D-09 toast-with-undo (Plan 04-03 Task 2): reversible destructive op.
    pushToast({
      variant: 'success',
      duration: 5000,
      title: `Deleted ${name}.`,
      action: { label: 'Undo', onClick: () => getTemporal().undo() },
    });
  };

  const pendingPlant = pendingRemove
    ? merged.get(pendingRemove.plantId)
    : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            aria-labelledby="my-plan-heading"
            aria-describedby="my-plan-desc"
            className={cn(
              'fixed right-0 top-0 z-50 h-full w-[var(--spacing-panel-w)] max-w-[calc(100vw-32px)]',
              'bg-white shadow-lg border-l border-stone-200 p-6 overflow-y-auto',
              'transition-transform duration-200 ease-out',
              'data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full',
              'focus:outline-none',
            )}
          >
            <div className="flex items-center justify-between sticky top-0 bg-white -mt-6 -mx-6 px-6 pt-6 pb-3 border-b border-stone-100">
              <DialogTitle id="my-plan-heading">My Plan</DialogTitle>
              <DialogClose asChild>
                <button
                  type="button"
                  className="text-stone-500 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                  aria-label="Close My Plan"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <DialogDescription id="my-plan-desc" className="sr-only">
              Your current plan: location and plantings list.
            </DialogDescription>

            {/* Location summary */}
            {plan && (
              <button
                type="button"
                onClick={() => navigate('#/setup')}
                className="mt-4 flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                aria-label="Edit location"
              >
                <MapPin className="h-4 w-4" />
                <span>
                  ZIP {plan.location.zip} · zone {plan.location.zone} · last
                  frost {formatDate(plan.location.lastFrostDate)}
                </span>
              </button>
            )}

            {/* Plantings list / Empty state */}
            {plantings.length === 0 ? (
              <div className="mt-8 text-center">
                <p className="text-base font-semibold text-stone-900">
                  No plants in your plan yet.
                </p>
                <p className="text-sm text-stone-600 mt-1">
                  Pick some from the catalog to start your gantt.
                </p>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => navigate('#/catalog')}
                  data-coach-target="catalog-button"
                >
                  Browse plants
                </Button>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {plantings.map((planting) => {
                  const plant = merged.get(planting.plantId);
                  if (!plant) return null;
                  const successionCapacity = plan
                    ? getSuccessionCapacity(plan, planting, plant)
                    : null;
                  const showSuccession =
                    successionCapacity !== null && successionCapacity.upperBound >= 1;
                  const interval = successionCapacity?.intervalDays;
                  const successionCount =
                    successionCapacity !== null
                      ? clampSuccessionCount(
                          planting.successionCount,
                          successionCapacity,
                        )
                      : 0;
                  const lastSuccessionDate =
                    successionCapacity !== null && successionCount > 0
                      ? successionLastPlantingDate(
                          successionCapacity,
                          successionCount,
                        )
                      : null;
                  const startsIndoors =
                    resolveStartMethod(planting, plant) === 'indoor-start';
                  const derivedCount =
                    successionCounts.get(planting.id) ?? 0;
                  const isOn = !!planting.successionEnabled;
                  return (
                    <li
                      key={planting.id}
                      className="rounded-md border border-stone-200 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold text-stone-900 truncate">
                            {plant.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPendingRemove(planting)}
                          className="text-stone-500 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                          aria-label={`Remove ${plant.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-start gap-3">
                        <Switch
                          id={`start-indoors-${planting.id}`}
                          checked={startsIndoors}
                          onCheckedChange={(checked) =>
                            setPlantingStartMethod(
                              planting.id,
                              checked ? 'indoor-start' : 'direct-sow',
                            )
                          }
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`start-indoors-${planting.id}`}
                            className="text-sm font-medium text-stone-900"
                          >
                            Start indoors
                          </label>
                          <p className="text-sm text-stone-600 mt-0.5">
                            {startsIndoors
                              ? 'Seeds, germination, harden-off, then transplant.'
                              : 'Direct-sow in the garden.'}
                          </p>
                        </div>
                      </div>
                      {showSuccession && (
                        <div className="mt-2 flex items-start gap-3">
                          <Switch
                            id={`succession-${planting.id}`}
                            checked={isOn}
                            onCheckedChange={() =>
                              toggleSuccession(planting.id)
                            }
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={`succession-${planting.id}`}
                              className="text-sm font-medium text-stone-900"
                            >
                              Succession plantings
                            </label>
                            {isOn && derivedCount > 0 && interval && (
                              <p className="text-sm text-stone-600 mt-0.5">
                                Adds {derivedCount} more plantings every{' '}
                                {interval} days. Last planting:{' '}
                                {lastSuccessionDate
                                  ? formatDate(lastSuccessionDate)
                                  : 'n/a'}.
                              </p>
                            )}
                            {isOn && successionCapacity && (
                              <label className="mt-2 block">
                                <span className="text-xs font-medium text-stone-700">
                                  Additional plantings
                                </span>
                                <Input
                                  type="number"
                                  min={1}
                                  max={successionCapacity.upperBound}
                                  value={successionCount}
                                  onChange={(e) =>
                                    setSuccessionCount(
                                      planting.id,
                                      Number(e.target.value),
                                    )
                                  }
                                  className="mt-1 h-9"
                                  aria-label={`Additional succession plantings for ${plant.name}`}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Footer */}
            {plantings.length > 0 && (
              <div className="mt-6 sticky bottom-0 bg-white -mb-6 -mx-6 px-6 py-4 border-t border-stone-100 flex gap-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => navigate('#/catalog')}
                  data-coach-target="catalog-button"
                >
                  Add more plants
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => navigate('#/plan')}
                >
                  View my gantt
                </Button>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Remove-planting confirmation */}
      <Dialog
        open={pendingRemove !== null}
        onOpenChange={(o) => {
          if (!o) setPendingRemove(null);
        }}
      >
        {pendingRemove && pendingPlant && (
          <DialogPrimitive.Portal>
            <DialogOverlay />
            <DialogPrimitive.Content
              className={cn(
                'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
                'w-[calc(100vw-32px)] max-w-[var(--spacing-modal-max-w)]',
                'rounded-md bg-white p-6 shadow-lg border border-stone-200',
                'focus:outline-none',
              )}
            >
              <DialogTitle>
                Remove {pendingPlant.name}? This won&apos;t affect the catalog
                plant.
              </DialogTitle>
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setPendingRemove(null)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleRemoveConfirm}>
                  Remove planting
                </Button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </Dialog>
    </>
  );
}
