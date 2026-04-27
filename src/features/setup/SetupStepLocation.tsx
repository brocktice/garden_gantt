// src/features/setup/SetupStepLocation.tsx
// Wizard Step 1 — Location entry per UI-SPEC §Component Inventory item 2.
// Implements: ZIP lookup → derived fields with per-field override (D-04, D-05),
// unrecognized-ZIP fallback to manual entry (D-06), and "Try with sample plan" link (D-03).
//
// Source: [CITED: .planning/phases/02-data-layer-first-end-to-end/02-UI-SPEC.md §2 lines 186-225]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-CONTEXT.md D-03..D-06]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-PATTERNS.md
//          src/features/setup/SetupStepLocation.tsx (NEW)]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-08-PLAN.md Task 1]

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ZipInput } from './ZipInput';
import { useLookupLocation } from './lookupLocation';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import { Badge } from '../../ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/Select';
import { usePlanStore } from '../../stores/planStore';
import { currentYear, nowISOString } from '../../domain/dateWrappers';
import type { Location } from '../../domain/types';

// 26 USDA hardiness zone strings (T-02-25 — manual zone constrained to this set).
const ZONES = [
  '1a',
  '1b',
  '2a',
  '2b',
  '3a',
  '3b',
  '4a',
  '4b',
  '5a',
  '5b',
  '6a',
  '6b',
  '7a',
  '7b',
  '8a',
  '8b',
  '9a',
  '9b',
  '10a',
  '10b',
  '11a',
  '11b',
  '12a',
  '12b',
  '13a',
  '13b',
] as const;

type OverrideFlags = {
  zone: boolean;
  lastFrostDate: boolean;
  firstFrostDate: boolean;
};

const ISO_NOON_RE = /^\d{4}-\d{2}-\d{2}T12:00:00\.000Z$/;

function ymdToISONoon(ymd: string): string {
  return `${ymd}T12:00:00.000Z`;
}

function isoNoonToYmd(iso: string): string {
  return iso.slice(0, 10);
}

export interface SetupStepLocationProps {
  onValidLocation: (loc: Location) => void;
  onLocationInvalid: () => void;
}

export function SetupStepLocation({
  onValidLocation,
  onLocationInvalid,
}: SetupStepLocationProps) {
  const plan = usePlanStore((s) => s.plan);
  const loadSamplePlan = usePlanStore((s) => s.loadSamplePlan);
  const navigate = useNavigate();

  const initialZip = plan?.location.zip ?? '';
  const initialZone = plan?.location.zone ?? '';
  const initialLast = plan?.location.lastFrostDate
    ? isoNoonToYmd(plan.location.lastFrostDate)
    : '';
  const initialFirst = plan?.location.firstFrostDate
    ? isoNoonToYmd(plan.location.firstFrostDate)
    : '';
  const initialOverrides = plan?.location.overrides ?? {};

  const [zip, setZip] = useState(initialZip);
  const [manualZone, setManualZone] = useState<string>(initialZone);
  const [manualLast, setManualLast] = useState<string>(initialLast);
  const [manualFirst, setManualFirst] = useState<string>(initialFirst);
  const [overrides, setOverrides] = useState<OverrideFlags>({
    zone: !!initialOverrides.zone,
    lastFrostDate: !!initialOverrides.lastFrostDate,
    firstFrostDate: !!initialOverrides.firstFrostDate,
  });

  const year = useMemo(() => currentYear(), []);
  const lookup = useLookupLocation(zip, year);

  // ZIP shape validation drives the inline error under the input — derived synchronously
  // (avoids react-hooks/set-state-in-effect by not storing the error in state).
  // Phase 4 (Plan 04-03 Task 3): on lookup not-found we surface the D-10 inline
  // error directly on ZipInput (replaces the legacy amber block below the field).
  const zipShapeError =
    zip.length > 0 && !/^\d{5}$/.test(zip)
      ? 'Enter a 5-digit US ZIP code.'
      : undefined;
  const zipNotFoundError =
    zip.length === 5 && lookup.status === 'not-found'
      ? "Couldn't find that ZIP. Try a 5-digit US ZIP, or enter your zone manually below."
      : undefined;
  const zipError = zipShapeError ?? zipNotFoundError;

  // Compute the effective Location (or null if invalid) and propagate to the parent.
  const frostOrderError = useMemo(() => {
    if (!manualLast || !manualFirst) return undefined;
    if (manualLast >= manualFirst) {
      return 'Last spring frost must come before first fall frost.';
    }
    return undefined;
  }, [manualLast, manualFirst]);

  useEffect(() => {
    // Path A: lookup ok and no override — synthesize from lookup directly.
    if (
      lookup.status === 'ok' &&
      !overrides.zone &&
      !overrides.lastFrostDate &&
      !overrides.firstFrostDate
    ) {
      onValidLocation({
        zip,
        zone: lookup.zone,
        lastFrostDate: lookup.lastFrostDate,
        firstFrostDate: lookup.firstFrostDate,
        source: 'lookup',
        lookupTimestamp: nowISOString(),
        overrides: {},
      });
      return;
    }

    // Path B: any override active OR lookup not-found — assemble from manual fields.
    // Manual entry is gated by manual-form-valid (all three fields set + ordering).
    const zoneVal = overrides.zone || lookup.status !== 'ok' ? manualZone : '';
    const lastVal =
      overrides.lastFrostDate || lookup.status !== 'ok' ? manualLast : '';
    const firstVal =
      overrides.firstFrostDate || lookup.status !== 'ok' ? manualFirst : '';

    // If lookup is ok but only some overrides apply, fall back to the lookup value
    // for non-overridden fields (so a single override doesn't invalidate the form).
    let effectiveZone = manualZone;
    let effectiveLast = manualLast;
    let effectiveFirst = manualFirst;
    if (lookup.status === 'ok') {
      effectiveZone = overrides.zone ? manualZone : lookup.zone;
      effectiveLast = overrides.lastFrostDate
        ? manualLast
        : isoNoonToYmd(lookup.lastFrostDate);
      effectiveFirst = overrides.firstFrostDate
        ? manualFirst
        : isoNoonToYmd(lookup.firstFrostDate);
    }

    const zoneOk =
      effectiveZone.length > 0 &&
      (ZONES as readonly string[]).includes(effectiveZone);
    const lastOk = /^\d{4}-\d{2}-\d{2}$/.test(effectiveLast);
    const firstOk = /^\d{4}-\d{2}-\d{2}$/.test(effectiveFirst);
    const orderOk = lastOk && firstOk && effectiveLast < effectiveFirst;
    const zipOk = /^\d{5}$/.test(zip);

    if (!zipOk || !zoneOk || !lastOk || !firstOk || !orderOk) {
      onLocationInvalid();
      // Suppress unused-var warnings on intermediate values used only for branching.
      void zoneVal;
      void lastVal;
      void firstVal;
      return;
    }

    const lastIso = ymdToISONoon(effectiveLast);
    const firstIso = ymdToISONoon(effectiveFirst);
    if (!ISO_NOON_RE.test(lastIso) || !ISO_NOON_RE.test(firstIso)) {
      onLocationInvalid();
      return;
    }

    const anyOverride =
      overrides.zone || overrides.lastFrostDate || overrides.firstFrostDate;
    const source: Location['source'] =
      lookup.status === 'ok' && !anyOverride ? 'lookup' : 'manual';
    const result: Location = {
      zip,
      zone: effectiveZone,
      lastFrostDate: lastIso,
      firstFrostDate: firstIso,
      source,
      overrides: {
        zone: overrides.zone,
        lastFrostDate: overrides.lastFrostDate,
        firstFrostDate: overrides.firstFrostDate,
      },
    };
    if (lookup.status === 'ok') {
      result.lookupTimestamp = nowISOString();
    }
    onValidLocation(result);
  }, [
    zip,
    lookup,
    overrides,
    manualZone,
    manualLast,
    manualFirst,
    onValidLocation,
    onLocationInvalid,
  ]);

  const showSamplePlanLink = plan === null;

  const handleSamplePlan = () => {
    loadSamplePlan();
    navigate('/plan');
  };

  const flipOverride = (field: keyof OverrideFlags) => {
    const enabling = !overrides[field];
    // When enabling an override, pre-seed the manual field with the current lookup
    // value so the inline editor starts pre-filled. Synchronous setState here is
    // an event-handler call, not an effect — react-hooks/set-state-in-effect is satisfied.
    if (enabling && lookup.status === 'ok') {
      if (field === 'zone' && manualZone === '') setManualZone(lookup.zone);
      if (field === 'lastFrostDate' && manualLast === '') {
        setManualLast(isoNoonToYmd(lookup.lastFrostDate));
      }
      if (field === 'firstFrostDate' && manualFirst === '') {
        setManualFirst(isoNoonToYmd(lookup.firstFrostDate));
      }
    }
    setOverrides((o) => ({ ...o, [field]: !o[field] }));
  };

  return (
    <div className="flex flex-col gap-6">
      <ZipInput value={zip} onChange={setZip} error={zipError} />

      {/* Lookup loading state */}
      {lookup.status === 'loading' && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 text-sm text-stone-600"
        >
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 rounded-full border-2 border-stone-200 border-t-green-700 animate-spin"
          />
          <span>Looking up frost dates for {zip}…</span>
        </div>
      )}

      {/* Derived fields block (lookup ok) */}
      {lookup.status === 'ok' && (
        <dl className="flex flex-col gap-4 border border-stone-200 rounded-md p-4 bg-white">
          {/* Zone row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <dt className="text-sm font-medium text-stone-600">USDA zone</dt>
              <dd className="flex items-center gap-2 text-base font-semibold text-stone-900">
                {overrides.zone ? (
                  <Select value={manualZone} onValueChange={setManualZone}>
                    <SelectTrigger
                      aria-label="USDA hardiness zone"
                      className="w-32"
                    >
                      <SelectValue placeholder="Select a zone…" />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONES.map((z) => (
                        <SelectItem key={z} value={z}>
                          {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span>{lookup.zone}</span>
                )}
                {overrides.zone && <Badge variant="manual">manual</Badge>}
              </dd>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-sky-700"
              onClick={() => flipOverride('zone')}
              aria-label="Override USDA zone"
            >
              {overrides.zone ? 'Use lookup value' : 'Override'}
            </Button>
          </div>

          {/* Last frost row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <dt className="text-sm font-medium text-stone-600">Last spring frost</dt>
              <dd className="flex items-center gap-2 text-base font-semibold text-stone-900">
                {overrides.lastFrostDate ? (
                  <Input
                    type="date"
                    aria-label="Last spring frost (50% probability)"
                    value={manualLast}
                    onChange={(e) => setManualLast(e.target.value)}
                    className="w-44"
                  />
                ) : (
                  <span>{isoNoonToYmd(lookup.lastFrostDate)}</span>
                )}
                {overrides.lastFrostDate && <Badge variant="manual">manual</Badge>}
              </dd>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-sky-700"
              onClick={() => flipOverride('lastFrostDate')}
              aria-label="Override last spring frost"
            >
              {overrides.lastFrostDate ? 'Use lookup value' : 'Override'}
            </Button>
          </div>

          {/* First fall frost row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <dt className="text-sm font-medium text-stone-600">First fall frost</dt>
              <dd className="flex items-center gap-2 text-base font-semibold text-stone-900">
                {overrides.firstFrostDate ? (
                  <Input
                    type="date"
                    aria-label="First fall frost (50% probability)"
                    value={manualFirst}
                    onChange={(e) => setManualFirst(e.target.value)}
                    className="w-44"
                  />
                ) : (
                  <span>{isoNoonToYmd(lookup.firstFrostDate)}</span>
                )}
                {overrides.firstFrostDate && <Badge variant="manual">manual</Badge>}
              </dd>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-sky-700"
              onClick={() => flipOverride('firstFrostDate')}
              aria-label="Override first fall frost"
            >
              {overrides.firstFrostDate ? 'Use lookup value' : 'Override'}
            </Button>
          </div>

          {frostOrderError &&
            (overrides.lastFrostDate || overrides.firstFrostDate) && (
              <p
                role="alert"
                className="text-sm text-red-700"
              >
                {frostOrderError}
              </p>
            )}
        </dl>
      )}

      {/* Unrecognized-ZIP — manual fallback fields (D-10 inline error renders on
          ZipInput via the `error` prop above). Phase 4 (Plan 04-03 Task 3) drops
          the duplicative amber heading; the manual fields remain for entry. */}
      {lookup.status === 'not-found' && zip.length === 5 && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-zone">USDA hardiness zone</Label>
              <Select value={manualZone} onValueChange={setManualZone}>
                <SelectTrigger id="manual-zone" aria-label="USDA hardiness zone">
                  <SelectValue placeholder="Select a zone…" />
                </SelectTrigger>
                <SelectContent>
                  {ZONES.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-last">Last spring frost (50% probability)</Label>
              <Input
                id="manual-last"
                type="date"
                value={manualLast}
                onChange={(e) => setManualLast(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-first">First fall frost (50% probability)</Label>
              <Input
                id="manual-first"
                type="date"
                value={manualFirst}
                onChange={(e) => setManualFirst(e.target.value)}
              />
            </div>
            {frostOrderError && (
              <p role="alert" className="text-sm text-red-700">
                {frostOrderError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Unreachable-fetch state */}
      {lookup.status === 'unreachable' && (
        <div
          role="status"
          aria-live="polite"
          className="border border-amber-200 bg-amber-50 p-4 rounded-md"
        >
          <p className="text-base font-semibold text-amber-800">
            Couldn&apos;t reach the zone data
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Check your connection and try again, or enter your zone and frost dates
            manually below.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-zone-unreachable">USDA hardiness zone</Label>
              <Select value={manualZone} onValueChange={setManualZone}>
                <SelectTrigger
                  id="manual-zone-unreachable"
                  aria-label="USDA hardiness zone"
                >
                  <SelectValue placeholder="Select a zone…" />
                </SelectTrigger>
                <SelectContent>
                  {ZONES.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-last-unreachable">
                Last spring frost (50% probability)
              </Label>
              <Input
                id="manual-last-unreachable"
                type="date"
                value={manualLast}
                onChange={(e) => setManualLast(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-first-unreachable">
                First fall frost (50% probability)
              </Label>
              <Input
                id="manual-first-unreachable"
                type="date"
                value={manualFirst}
                onChange={(e) => setManualFirst(e.target.value)}
              />
            </div>
            {frostOrderError && (
              <p role="alert" className="text-sm text-red-700">
                {frostOrderError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Sample-plan link — visible only when no plan exists yet (D-03). */}
      {showSamplePlanLink && (
        <div>
          <button
            type="button"
            onClick={handleSamplePlan}
            className="text-sm font-medium text-green-700 underline underline-offset-4 decoration-2 hover:decoration-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
          >
            Or try the app with a sample plan →
          </button>
        </div>
      )}
    </div>
  );
}
