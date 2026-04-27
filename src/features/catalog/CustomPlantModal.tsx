// src/features/catalog/CustomPlantModal.tsx
// CRUD form for a custom plant (D-13, D-14, D-15) + Permapeople enrich block (D-18, CAT-07).
// Permapeople failure does NOT block save (CAT-07).
//
// Source: [CITED: 02-UI-SPEC.md §6 Component Inventory item 6 — full copy table]
//         [CITED: 02-PATTERNS.md src/features/catalog/CustomPlantModal.tsx]
//         [CITED: 02-CONTEXT.md D-13/D-14/D-15/D-18, CAT-07/CAT-08]

import { useMemo, useState } from 'react';
import { Check, Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/Select';
import { useCatalogStore, selectMerged } from '../../stores/catalogStore';
import { usePlanStore } from '../../stores/planStore';
import { searchPlant, type EnrichmentFields } from '../../data/permapeople';
import { PlantSchema } from '../../domain/schemas';
import type { Plant, PlantCategory, PlantTiming } from '../../domain/types';

export interface CustomPlantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPlant: Plant | null;
  // CR-01 (REVIEW Phase 4): edit-mode "Delete plant" must hand off to the
  // cascade-confirm flow owned by CatalogBrowser (DeletePlantDialog with
  // referencingCount). Without this prop, the edit-mode delete button is
  // a no-op label-lie. Caller in CatalogBrowser closes the modal and opens
  // the confirm dialog with the correct reference count.
  onRequestDelete?: (plant: Plant) => void;
}

// Numeric fields are `number | null` so the user can clear them while typing
// (controlled-input + `Number('')` returning 0 made backspace impossible — #2026-04-26).
// `null` represents "currently empty"; submit-time validation enforces required fields
// and falls back to safe defaults for optional ones.
interface FormState {
  name: string;
  scientificName: string;
  category: PlantCategory;
  frostTolerance: 'tender' | 'half-hardy' | 'hardy';
  season: 'cool' | 'warm';
  startMethod: 'direct-sow' | 'indoor-start' | 'either';
  weeksIndoorBeforeLastFrost: number | null;
  transplantOffsetDaysFromLastFrost: number | null;
  daysToGermination: number | null;
  daysToMaturity: number | null;
  harvestWindowDays: number | null;
  successionIntervalDays: number | null;
  description: string;
}

function parseNumInput(v: string): number | null {
  if (v === '' || v === '-') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type EnrichState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: EnrichmentFields }
  | { status: 'error' };

const CATEGORIES: PlantCategory[] = [
  'fruiting-vegetable',
  'leafy-green',
  'root',
  'brassica',
  'legume',
  'allium',
  'herb',
  'other',
];

function defaultForm(): FormState {
  return {
    name: '',
    scientificName: '',
    category: 'other',
    frostTolerance: 'tender',
    season: 'warm',
    startMethod: 'either',
    weeksIndoorBeforeLastFrost: 6,
    transplantOffsetDaysFromLastFrost: 0,
    daysToGermination: 7,
    daysToMaturity: 60,
    harvestWindowDays: 14,
    successionIntervalDays: null,
    description: '',
  };
}

function plantToForm(plant: Plant): FormState {
  return {
    name: plant.name,
    scientificName: plant.scientificName ?? '',
    category: plant.category,
    frostTolerance: plant.timing.frostTolerance,
    season: plant.timing.season,
    startMethod: plant.timing.startMethod,
    weeksIndoorBeforeLastFrost: plant.timing.weeksIndoorBeforeLastFrost ?? 6,
    transplantOffsetDaysFromLastFrost:
      plant.timing.transplantOffsetDaysFromLastFrost ?? 0,
    daysToGermination: plant.timing.daysToGermination?.[0] ?? 7,
    daysToMaturity: plant.timing.daysToMaturity,
    harvestWindowDays: plant.timing.harvestWindowDays,
    successionIntervalDays: plant.timing.successionIntervalDays ?? null,
    description:
      typeof plant.enrichment?.description === 'string'
        ? (plant.enrichment.description as string)
        : '',
  };
}

function kebabCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CustomPlantModal({
  open,
  onOpenChange,
  editingPlant,
  onRequestDelete,
}: CustomPlantModalProps) {
  // Remount the inner form whenever the modal opens with a new editingPlant.
  // This avoids setState-in-effect for resetting form state (react-hooks rule).
  return (
    <CustomPlantModalInner
      key={`${open ? 'open' : 'closed'}:${editingPlant?.id ?? 'new'}`}
      open={open}
      onOpenChange={onOpenChange}
      editingPlant={editingPlant}
      {...(onRequestDelete ? { onRequestDelete } : {})}
    />
  );
}

function CustomPlantModalInner({
  open,
  onOpenChange,
  editingPlant,
  onRequestDelete,
}: CustomPlantModalProps) {
  const merged = useCatalogStore(selectMerged);
  const upsertCatalog = useCatalogStore((s) => s.upsertCustomPlant);
  const upsertPlan = usePlanStore((s) => s.upsertCustomPlant);

  const [form, setForm] = useState<FormState>(() =>
    editingPlant ? plantToForm(editingPlant) : defaultForm(),
  );
  const [enrich, setEnrich] = useState<EnrichState>({ status: 'idle' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateFromId, setDuplicateFromId] = useState<string>('');

  const isEdit = editingPlant !== null;

  const curatedSorted = useMemo(
    () =>
      Array.from(merged.values())
        .filter((p) => p.source === 'curated')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [merged],
  );

  const handleDuplicateFrom = (plantId: string) => {
    setDuplicateFromId(plantId);
    const src = merged.get(plantId);
    if (!src) return;
    setForm((f) => ({
      ...plantToForm(src),
      // Keep current name if user already typed one — duplicate-from is a baseline.
      name: f.name,
    }));
  };

  const handleEnrich = async () => {
    if (!form.name.trim()) return;
    setEnrich({ status: 'loading' });
    const result = await searchPlant(form.name.trim());
    if (result.status === 'ok') {
      setEnrich({ status: 'success', data: result.data });
    } else {
      setEnrich({ status: 'error' });
    }
  };

  const applyEnrichField = (field: keyof EnrichmentFields) => {
    if (enrich.status !== 'success') return;
    const value = enrich.data[field];
    if (typeof value !== 'string' || !value) return;
    if (field === 'description') {
      setForm((f) => ({ ...f, description: value }));
    } else if (field === 'scientificName') {
      setForm((f) => ({ ...f, scientificName: value }));
    }
  };

  const buildPlant = (): Plant => {
    const id = isEdit && editingPlant ? editingPlant.id : kebabCase(form.name);
    // Submit-time fallbacks for optional numeric fields when user cleared them.
    const weeks = form.weeksIndoorBeforeLastFrost ?? 0;
    const tOff = form.transplantOffsetDaysFromLastFrost ?? 0;
    const germ = form.daysToGermination ?? 7;
    const dtm = form.daysToMaturity ?? 60; // gated by validation; this is a safety floor
    const hwin = form.harvestWindowDays ?? 14;
    const timing: PlantTiming = {
      startMethod: form.startMethod,
      weeksIndoorBeforeLastFrost: weeks,
      transplantOffsetDaysFromLastFrost: tOff,
      daysToGermination: [germ, germ + 3],
      daysToMaturity: dtm,
      harvestWindowDays: hwin,
      frostTolerance: form.frostTolerance,
      hasFlowering: false,
      requiresHardening: form.startMethod === 'indoor-start',
      season: form.season,
    };
    if (form.successionIntervalDays && form.successionIntervalDays > 0) {
      timing.successionIntervalDays = form.successionIntervalDays;
    }

    const enrichment: Record<string, unknown> = {};
    if (form.description) enrichment.description = form.description;
    if (enrich.status === 'success') {
      enrichment.source = 'permapeople';
      if (enrich.data.family) enrichment.family = enrich.data.family;
      if (enrich.data.genus) enrichment.genus = enrich.data.genus;
      if (enrich.data.imageUrl) enrichment.imageUrl = enrich.data.imageUrl;
    }

    const plant: Plant = {
      id,
      source: 'custom',
      name: form.name.trim(),
      category: form.category,
      timing,
    };
    const sci = form.scientificName.trim();
    if (sci) plant.scientificName = sci;
    if (Object.keys(enrichment).length > 0) plant.enrichment = enrichment;
    return plant;
  };

  const handleSave = () => {
    // Inline validation
    const fieldErrors: Record<string, string> = {};
    if (!form.name.trim()) fieldErrors.name = 'Plant name is required.';
    if (form.daysToMaturity === null || form.daysToMaturity < 1)
      fieldErrors.daysToMaturity = 'Days to maturity must be at least 1.';
    // CR-02 (REVIEW Phase 4): collision check on custom-plant id derivation.
    // kebabCase(name) can collide with curated catalog ids (e.g. typing "Tomato"
    // produces id "tomato"). Without this check, upsertCustomPlant + selectMerged
    // precedence (custom > curated) would silently mask the curated entry.
    // Edit mode is exempt because the id is fixed to editingPlant.id.
    if (!isEdit && form.name.trim()) {
      const candidateId = kebabCase(form.name);
      if (candidateId && merged.has(candidateId)) {
        fieldErrors.name =
          'A plant with this name already exists. Pick a different name.';
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const plant = buildPlant();
    const parsed = PlantSchema.safeParse(plant);
    if (!parsed.success) {
      // Map Zod errors back to fields
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        next[path] = issue.message;
      }
      setErrors(next);
      return;
    }

    // Decision (per plan): write to BOTH catalogStore (canonical home) and planStore.customPlants
    // (export portability). catalogStore is browsed; planStore.customPlants travels with exports.
    upsertCatalog(plant);
    upsertPlan(plant);
    onOpenChange(false);
  };

  const saveDisabled =
    !form.name.trim() ||
    form.daysToMaturity === null ||
    form.daysToMaturity < 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit && editingPlant
              ? `Edit ${editingPlant.name}`
              : 'Create custom plant'}
          </DialogTitle>
        </DialogHeader>

        {/* Duplicate-from-catalog (create mode only) */}
        {!isEdit && (
          <fieldset className="mt-4">
            <Label htmlFor="duplicate-from">
              Start from a catalog plant (optional)
            </Label>
            <Select value={duplicateFromId} onValueChange={handleDuplicateFrom}>
              <SelectTrigger id="duplicate-from" className="mt-1">
                <SelectValue placeholder="Choose a baseline…" />
              </SelectTrigger>
              <SelectContent>
                {curatedSorted.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-sm text-stone-600">
              We&apos;ll pre-fill the timing fields. You can edit any of them.
            </p>
          </fieldset>
        )}

        {/* Basics */}
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-stone-900 mb-2">
            Basics
          </legend>
          <div className="space-y-3">
            <div>
              <Label htmlFor="cp-name">
                Plant name<span className="text-red-700"> *</span>
              </Label>
              <Input
                id="cp-name"
                aria-required="true"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder='e.g. "Beet — Detroit Dark Red"'
              />
              <p className="mt-1 text-sm text-stone-600">
                e.g. &quot;Beet — Detroit Dark Red&quot;
              </p>
              {errors.name && (
                <p className="text-sm text-red-700 mt-1" aria-live="polite">
                  {errors.name}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="cp-sci">Scientific name</Label>
              <Input
                id="cp-sci"
                value={form.scientificName}
                onChange={(e) =>
                  setForm({ ...form, scientificName: e.target.value })
                }
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="cp-cat">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm({ ...form, category: v as PlantCategory })
                }
              >
                <SelectTrigger id="cp-cat" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </fieldset>

        {/* Frost & season */}
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-stone-900 mb-2">
            Frost &amp; season
          </legend>
          <div className="space-y-3">
            <div>
              <Label htmlFor="cp-frost">Frost tolerance</Label>
              <Select
                value={form.frostTolerance}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    frostTolerance: v as FormState['frostTolerance'],
                  })
                }
              >
                <SelectTrigger id="cp-frost" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tender">tender</SelectItem>
                  <SelectItem value="half-hardy">half-hardy</SelectItem>
                  <SelectItem value="hardy">hardy</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-sm text-stone-600">
                Tender = damaged by frost. Half-hardy = light frost OK. Hardy =
                survives hard frost.
              </p>
            </div>
            <div>
              <Label htmlFor="cp-season">Season</Label>
              <Select
                value={form.season}
                onValueChange={(v) =>
                  setForm({ ...form, season: v as FormState['season'] })
                }
              >
                <SelectTrigger id="cp-season" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cool">cool</SelectItem>
                  <SelectItem value="warm">warm</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-sm text-stone-600">
                Cool-season plants prefer 50-70°F. Warm-season plants need
                65-95°F.
              </p>
            </div>
          </div>
        </fieldset>

        {/* Timing (engine inputs) */}
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-stone-900 mb-2">
            Timing
          </legend>
          <div className="space-y-3">
            <div>
              <Label htmlFor="cp-start">Start method</Label>
              <Select
                value={form.startMethod}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    startMethod: v as FormState['startMethod'],
                  })
                }
              >
                <SelectTrigger id="cp-start" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct-sow">direct-sow</SelectItem>
                  <SelectItem value="indoor-start">indoor-start</SelectItem>
                  <SelectItem value="either">either</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-sm text-stone-600">
                How seeds enter the garden.
              </p>
            </div>

            <div>
              <Label htmlFor="cp-weeks">Weeks indoors before last frost</Label>
              <Input
                id="cp-weeks"
                type="number"
                min={0}
                max={16}
                value={form.weeksIndoorBeforeLastFrost ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    weeksIndoorBeforeLastFrost: parseNumInput(e.target.value),
                  })
                }
              />
              <p className="mt-1 text-sm text-stone-600">
                Only matters for indoor-start. Typical: 4-8 weeks.
              </p>
            </div>

            <div>
              <Label htmlFor="cp-toff">
                Transplant offset (days from last frost)
              </Label>
              <Input
                id="cp-toff"
                type="number"
                min={-30}
                max={30}
                value={form.transplantOffsetDaysFromLastFrost ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    transplantOffsetDaysFromLastFrost: parseNumInput(
                      e.target.value,
                    ),
                  })
                }
              />
              <p className="mt-1 text-sm text-stone-600">
                Negative = before last frost (cold-hardy). Positive = after.
              </p>
            </div>

            <div>
              <Label htmlFor="cp-germ">Days to germinate</Label>
              <Input
                id="cp-germ"
                type="number"
                min={1}
                value={form.daysToGermination ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    daysToGermination: parseNumInput(e.target.value),
                  })
                }
              />
              <p className="mt-1 text-sm text-stone-600">
                From seed contact with soil to sprout.
              </p>
            </div>

            <div>
              <Label htmlFor="cp-dtm">
                Days to maturity<span className="text-red-700"> *</span>
              </Label>
              <Input
                id="cp-dtm"
                type="number"
                min={1}
                aria-required="true"
                value={form.daysToMaturity ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    daysToMaturity: parseNumInput(e.target.value),
                  })
                }
              />
              <p className="mt-1 text-sm text-stone-600">
                From transplant (or sow date for direct-sow) to first harvest.
              </p>
              {errors.daysToMaturity && (
                <p className="text-sm text-red-700 mt-1" aria-live="polite">
                  {errors.daysToMaturity}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="cp-hwin">Harvest window (days)</Label>
              <Input
                id="cp-hwin"
                type="number"
                min={1}
                value={form.harvestWindowDays ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    harvestWindowDays: parseNumInput(e.target.value),
                  })
                }
              />
              <p className="mt-1 text-sm text-stone-600">
                How long the harvest period lasts.
              </p>
            </div>

            <div>
              <Label htmlFor="cp-succ">Succession interval (days)</Label>
              <Input
                id="cp-succ"
                type="number"
                min={0}
                value={form.successionIntervalDays ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({
                    ...form,
                    successionIntervalDays: v === '' ? null : Number(v),
                  });
                }}
              />
              <p className="mt-1 text-sm text-stone-600">
                Days between successive plantings. Leave blank for crops you
                only plant once.
              </p>
            </div>
          </div>
        </fieldset>

        {/* Description */}
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-stone-900 mb-2">
            Description (optional)
          </legend>
          <Label htmlFor="cp-desc">Description</Label>
          <textarea
            id="cp-desc"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="block w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-base text-stone-900 placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-green-700 focus-visible:border-green-700"
          />
          <p className="mt-1 text-sm text-stone-600">
            Notes for yourself — varieties, sources, growing tips.
          </p>
        </fieldset>

        {/* Permapeople enrich block */}
        <section className="mt-6 border-t border-stone-200 pt-4">
          <h4 className="text-sm font-semibold text-stone-900">
            Enrich from Permapeople (optional)
          </h4>
          <p className="text-sm text-stone-600 mt-1">
            Pull botanical info, family, and a description from Permapeople.org.
            Doesn&apos;t change timing — those stay yours.
          </p>
          <div className="mt-3">
            {enrich.status === 'idle' && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleEnrich}
                disabled={!form.name.trim()}
              >
                <Sparkles className="h-4 w-4" />
                Enrich from Permapeople
              </Button>
            )}
            {enrich.status === 'loading' && (
              <Button type="button" variant="secondary" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
                Looking up…
              </Button>
            )}
            {enrich.status === 'success' && (
              <>
                <Button type="button" variant="secondary" onClick={handleEnrich}>
                  <Check className="h-4 w-4 text-green-700" />
                  Re-fetch from Permapeople
                </Button>
                <div className="mt-3 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm">
                  <p className="font-semibold text-stone-900">
                    Permapeople found:
                  </p>
                  {enrich.data.family && (
                    <p className="mt-1 text-stone-700">
                      Family: {enrich.data.family}
                    </p>
                  )}
                  {enrich.data.genus && (
                    <p className="text-stone-700">Genus: {enrich.data.genus}</p>
                  )}
                  {enrich.data.scientificName && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-stone-700 italic">
                        {enrich.data.scientificName}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => applyEnrichField('scientificName')}
                      >
                        Use this
                      </Button>
                    </div>
                  )}
                  {enrich.data.description && (
                    <div className="mt-2">
                      <p className="text-stone-700 line-clamp-3">
                        {enrich.data.description}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => applyEnrichField('description')}
                      >
                        Use this
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
            {enrich.status === 'error' && (
              // Phase 4 (Plan 04-03 Task 4) D-10: inline pill replaces the legacy
              // amber multi-line block. Pill sits adjacent to the Enrich button
              // (UI-SPEC: "on the enrichment row"). Button remains clickable for retry.
              <div className="flex items-center gap-3 flex-wrap">
                <Button type="button" variant="secondary" onClick={handleEnrich}>
                  <Sparkles className="h-4 w-4" />
                  Enrich from Permapeople
                </Button>
                <span
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center px-2 py-1 rounded-md bg-red-50 border border-red-200 text-sm font-medium text-red-700"
                >
                  Couldn&apos;t fetch — try again
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Action bar */}
        <div className="mt-6 flex items-center justify-between gap-2 border-t border-stone-200 pt-4">
          <div>
            {isEdit && editingPlant && onRequestDelete && (
              <Button
                type="button"
                variant="ghost"
                className="text-red-700 hover:text-red-800"
                onClick={() => {
                  // CR-01 (REVIEW Phase 4): edit-mode delete now hands off to
                  // CatalogBrowser's cascade-confirm flow. Close the modal and
                  // delegate; CatalogBrowser opens DeletePlantDialog with the
                  // correct referencingCount, then calls
                  // removeCustomPlantWithCascade on confirm.
                  const plant = editingPlant;
                  onOpenChange(false);
                  onRequestDelete(plant);
                }}
              >
                Delete plant
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={saveDisabled}
            >
              Save plant
            </Button>
          </div>
        </div>

        <DialogDescription className="sr-only">
          Form for creating or editing a custom plant.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
