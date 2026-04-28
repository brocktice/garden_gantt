// src/features/catalog/CatalogBrowser.tsx
// Search + 8 filter chips + responsive card grid + pinned "+ Add custom plant" card (D-10, D-13).
// Same component reused at /catalog and /setup Step 2 (UI-SPEC §3).
//
// Source: [CITED: 02-UI-SPEC.md §3]
//         [CITED: 02-PATTERNS.md src/features/catalog/CatalogBrowser.tsx (NEW)]
//         [CITED: D-15 cascade-confirmation Dialog wiring]

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, X } from 'lucide-react';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Skeleton } from '../../ui/Skeleton';
import { useCatalogStore, selectMerged } from '../../stores/catalogStore';
import { usePlanStore } from '../../stores/planStore';
import { useUIStore } from '../../stores/uiStore';
import { PlantCard, AddCustomPlantCard } from './PlantCard';
import { CustomPlantModal } from './CustomPlantModal';
import { DeletePlantDialog } from './DeletePlantDialog';
import { applyFilters, chips } from './filters';
import { plantingId } from '../../domain/ids';
import type { Plant } from '../../domain/types';

export function CatalogBrowser() {
  const navigate = useNavigate();
  const merged = useCatalogStore(selectMerged);
  const search = useUIStore((s) => s.searchQuery);
  const setSearch = useUIStore((s) => s.setSearchQuery);
  const filterChips = useUIStore((s) => s.filterChips);
  const toggleChip = useUIStore((s) => s.toggleFilterChip);
  const clearFilterChips = useUIStore((s) => s.clearFilterChips);

  const plan = usePlanStore((s) => s.plan);
  const addPlanting = usePlanStore((s) => s.addPlanting);
  const removePlanting = usePlanStore((s) => s.removePlanting);
  const removeCustomPlantWithCascade = usePlanStore(
    (s) => s.removeCustomPlantWithCascade,
  );

  const removeCustomPlant = useCatalogStore((s) => s.removeCustomPlant);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Plant | null>(null);
  // Catalog data is static JSON shipped at build, so there is no async loading
  // window in normal use. Keep this branch available for future async catalog
  // hydration without forcing an extra render on every catalog mount.
  const loadingFlash = false;

  const myPlantingsByPlantId = useMemo(() => {
    const map = new Map<string, string>(); // plantId -> planting.id
    for (const pl of plan?.plantings ?? []) {
      if (!map.has(pl.plantId)) map.set(pl.plantId, pl.id);
    }
    return map;
  }, [plan?.plantings]);

  const filtered = useMemo(
    () => applyFilters(Array.from(merged.values()), search, filterChips),
    [merged, search, filterChips],
  );

  // D-15 cascade-confirmation: count plantings referencing the pending-delete plant.
  const referencingCount = pendingDelete
    ? (plan?.plantings.filter((pl) => pl.plantId === pendingDelete.id).length ?? 0)
    : 0;

  const handleAdd = (plant: Plant) => {
    if (!plan) {
      navigate('/setup');
      return;
    }
    addPlanting({
      id: plantingId(plant.id, 0),
      plantId: plant.id,
      successionIndex: 0,
    });
  };

  const handleRemove = (plant: Plant) => {
    const plId = myPlantingsByPlantId.get(plant.id);
    if (plId) removePlanting(plId);
  };

  // D-15: zero-references → drop immediately. Otherwise open cascade-confirm Dialog.
  const handleDeleteRequest = (plant: Plant) => {
    const refCount =
      plan?.plantings.filter((pl) => pl.plantId === plant.id).length ?? 0;
    if (refCount === 0) {
      removeCustomPlant(plant.id);
    } else {
      setPendingDelete(plant);
    }
  };

  const handleDeleteConfirm = () => {
    if (!pendingDelete) return;
    removeCustomPlantWithCascade(pendingDelete.id);
    setPendingDelete(null);
  };

  const clearFilters = () => {
    // WR-13 (REVIEW Phase 4): single set() instead of O(N) toggleChip loop.
    setSearch('');
    clearFilterChips();
  };

  const hasActiveFilters = filterChips.size > 0 || search.length > 0;

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500 pointer-events-none" />
        <label className="sr-only" htmlFor="catalog-search">
          Search plants
        </label>
        <Input
          id="catalog-search"
          type="search"
          placeholder="Search plants by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9"
          aria-label="Search plants"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-900"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {chips.map((chip) => {
          const active = filterChips.has(chip.id);
          return (
            <button
              key={chip.id}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => toggleChip(chip.id)}
              className={
                active
                  ? 'bg-green-700 border border-green-700 text-white px-3 py-1 rounded-full text-sm font-medium hover:bg-green-800'
                  : 'bg-white border border-stone-200 text-stone-700 px-3 py-1 rounded-full text-sm font-medium hover:border-stone-400'
              }
            >
              {chip.label}
            </button>
          );
        })}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Grid */}
      <ul
        role="list"
        className="grid grid-cols-[repeat(auto-fill,minmax(var(--spacing-card-min),1fr))] gap-[var(--spacing-card-gap)]"
      >
        <li>
          <AddCustomPlantCard
            onClick={() => {
              setEditingPlant(null);
              setModalOpen(true);
            }}
          />
        </li>
        {/* Phase 4 (Plan 04-03 Task 2) D-08 catalog skeleton — brief flash on
            initial hydration + during catalog data resolution. */}
        {loadingFlash &&
          Array.from({ length: 11 }).map((_, i) => (
            <li key={`skeleton-${i}`} aria-hidden="true">
              <Skeleton shape="card" className="h-48 w-full" />
            </li>
          ))}
        {!loadingFlash && filtered.map((plant) => {
          const enriched =
            (plant.enrichment as { source?: string } | undefined)?.source ===
            'permapeople';
          return (
            <li key={plant.id}>
              <PlantCard
                plant={plant}
                added={myPlantingsByPlantId.has(plant.id)}
                enrichedFromPermapeople={enriched}
                onAdd={() => handleAdd(plant)}
                onRemove={() => handleRemove(plant)}
                onEdit={
                  plant.source === 'custom'
                    ? () => {
                        setEditingPlant(plant);
                        setModalOpen(true);
                      }
                    : undefined
                }
                onDelete={
                  plant.source === 'custom'
                    ? () => handleDeleteRequest(plant)
                    : undefined
                }
              />
            </li>
          );
        })}
      </ul>

      {/* Empty filter state — Phase 4 (Plan 04-03 Task 2) D-11 retune. */}
      {!loadingFlash && filtered.length === 0 && (
        <div className="text-center py-16 col-span-full">
          <h2 className="text-xl font-semibold text-stone-900">No matches.</h2>
          <p className="text-sm text-stone-600 mt-1">
            Try removing a filter, or clear your search.
          </p>
          <Button variant="primary" className="mt-4" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      <CustomPlantModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingPlant={editingPlant}
        onRequestDelete={handleDeleteRequest}
      />

      <DeletePlantDialog
        plant={pendingDelete}
        referencingCount={referencingCount}
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
