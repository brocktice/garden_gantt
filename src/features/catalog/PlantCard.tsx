// src/features/catalog/PlantCard.tsx
// Single catalog card with Available/Added states (D-11) + Custom dropdown (D-15)
// + Permapeople icon (CAT-08). Visual per UI-SPEC §4.
//
// Source: [CITED: .planning/phases/02-data-layer-first-end-to-end/02-UI-SPEC.md §Component Inventory item 4]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-PATTERNS.md src/features/catalog/PlantCard.tsx (NEW)]

import { type ComponentType } from 'react';
import {
  AlertTriangle,
  Apple,
  Carrot,
  CheckCircle2,
  Flower2,
  Leaf,
  MoreHorizontal,
  Plus,
  Sparkles,
  Sprout,
  Trees,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardFooter, CardHeader } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import type { Plant, PlantCategory } from '../../domain/types';
import { cn } from '../../ui/cn';

const ICONS: Record<PlantCategory, ComponentType<{ className?: string }>> = {
  'fruiting-vegetable': Apple,
  'leafy-green': Leaf,
  root: Carrot,
  brassica: Trees,
  legume: Sprout,
  // lucide-react v1 has no Onion/Garlic glyph; Sprout is the closest semantically (allium = bulb crop).
  allium: Sprout,
  herb: Flower2,
  other: Sprout,
};

export interface PlantCardProps {
  plant: Plant;
  added: boolean;
  /** True when description came from Permapeople (CAT-08 — Sparkles indicator). */
  enrichedFromPermapeople?: boolean | undefined;
  onAdd: () => void;
  onRemove: () => void;
  /** Edit only meaningful for source==='custom'. */
  onEdit?: (() => void) | undefined;
  /** Delete only meaningful for source==='custom'. */
  onDelete?: (() => void) | undefined;
}

export function PlantCard({
  plant,
  added,
  enrichedFromPermapeople,
  onAdd,
  onRemove,
  onEdit,
  onDelete,
}: PlantCardProps) {
  const Icon = ICONS[plant.category] ?? Sprout;
  const isCustom = plant.source === 'custom';
  const tolerance = plant.timing.frostTolerance;
  const season = plant.timing.season;

  return (
    <Card
      className={cn(
        'flex flex-col h-full',
        added ? 'border-green-700 border-2 bg-green-50' : 'border-stone-200',
      )}
    >
      <CardHeader>
        <Icon className="h-5 w-5 text-stone-600" />
        <div className="flex items-center gap-1">
          {isCustom && <Badge variant="custom">Custom</Badge>}
          <Badge variant={tolerance}>{tolerance}</Badge>
          {added && (
            <CheckCircle2 className="h-4 w-4 text-green-700" aria-hidden="true" />
          )}
          {isCustom && (onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Options for ${plant.name}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>Edit plant</DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-red-700"
                  >
                    Delete plant
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardBody className="flex-1">
        <h3 className="text-base font-semibold text-stone-900">{plant.name}</h3>
        <p className="text-sm text-stone-500 italic flex items-center gap-1">
          <span>{plant.scientificName ?? ' '}</span>
          {enrichedFromPermapeople && (
            <Sparkles
              className="h-4 w-4 text-violet-600"
              aria-label="Description enriched from Permapeople (CC BY-SA 4.0)"
            >
              <title>Description enriched from Permapeople (CC BY-SA 4.0)</title>
            </Sparkles>
          )}
        </p>
        <p className="mt-2 text-sm text-stone-600 flex items-center">
          <Badge variant={season === 'cool' ? 'cool' : 'warm'}>{season}</Badge>
          <span className="ml-2">
            · {plant.timing.daysToMaturity} days to maturity
          </span>
        </p>
        {plant.provenance && (
          <p
            className={cn(
              'mt-2 text-xs flex items-start gap-1.5',
              plant.provenance.verified ? 'text-stone-500' : 'text-amber-700',
            )}
          >
            {!plant.provenance.verified && (
              <AlertTriangle
                className="h-3.5 w-3.5 mt-0.5 shrink-0"
                aria-hidden="true"
              />
            )}
            <span>
              {plant.provenance.verified ? 'Source: ' : 'Pending verification — '}
              {plant.provenance.url ? (
                <a
                  href={plant.provenance.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-stone-700"
                >
                  {plant.provenance.source}
                </a>
              ) : (
                plant.provenance.source
              )}
              {plant.provenance.publication && (
                <span className="italic"> · {plant.provenance.publication}</span>
              )}
            </span>
          </p>
        )}
      </CardBody>
      <CardFooter>
        {added ? (
          <Button
            variant="ghost"
            className="w-full text-stone-600 hover:text-red-700"
            onClick={onRemove}
          >
            Remove from plan
          </Button>
        ) : (
          <Button
            variant="primary"
            className="w-full"
            onClick={onAdd}
            aria-label={`Add ${plant.name} to plan`}
          >
            + Add to plan
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export interface AddCustomPlantCardProps {
  onClick: () => void;
}

/**
 * Pinned first-cell card (D-13) — opens CustomPlantModal in create mode.
 * Visual per UI-SPEC §4 "Pinned + Add custom plant card" block.
 */
export function AddCustomPlantCard({ onClick }: AddCustomPlantCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-full min-h-[180px] w-full rounded-md bg-white border-2 border-dashed border-stone-300',
        'flex flex-col items-center justify-center gap-2 p-4 transition-colors',
        'hover:border-green-700 cursor-pointer focus-visible:outline-2 focus-visible:outline-green-700',
      )}
    >
      <Plus className="h-8 w-8 text-stone-400" />
      <p className="text-base font-semibold text-stone-700">Add custom plant</p>
      <p className="text-sm text-stone-500 text-center max-w-[200px]">
        Author your own with timing that matches your seed packet
      </p>
    </button>
  );
}
