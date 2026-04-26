// src/features/setup/SetupWizard.tsx
// 3-step Setup Wizard shell per UI-SPEC §Component Inventory item 1.
// Initial step is computed once on mount: Step 1 if `plan === null`, else Step 2 (D-02).
// Step state is local React state — NOT persisted (Pitfall: anti-pattern line 1046).
//
// Source: [CITED: .planning/phases/02-data-layer-first-end-to-end/02-UI-SPEC.md §1 lines 163-183]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-CONTEXT.md D-01, D-02]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-PATTERNS.md
//          src/features/setup/SetupWizard.tsx (NEW)]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-08-PLAN.md Task 2 Step 3]

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../ui/Button';
import { SetupStepLocation } from './SetupStepLocation';
import { SetupStepPlants } from './SetupStepPlants';
import { SetupStepReview } from './SetupStepReview';
import { usePlanStore } from '../../stores/planStore';
import { cn } from '../../ui/cn';
import type { Location } from '../../domain/types';

type Step = 1 | 2 | 3;

const STEPS: ReadonlyArray<{ n: Step; label: string; sub: string }> = [
  { n: 1, label: 'Location', sub: 'ZIP and frost dates' },
  { n: 2, label: 'Plants', sub: "Pick what you're growing" },
  { n: 3, label: 'Review', sub: 'Confirm and finish' },
];

export function SetupWizard() {
  const setLocation = usePlanStore((s) => s.setLocation);
  const plan = usePlanStore((s) => s.plan);
  const navigate = useNavigate();

  // Mount-only snapshot of plan presence, used for D-02 initial-step decision and
  // first-run hero copy. Subsequent plan updates (Step 1 saving location) MUST NOT
  // reset the step or hide the hero mid-flow — useState initializer captures once.
  const [planWasNullAtMount] = useState<boolean>(plan === null);
  const initialStep: Step = useMemo(
    () => (planWasNullAtMount ? 1 : 2),
    [planWasNullAtMount],
  );
  const [step, setStep] = useState<Step>(initialStep);

  // Step-1 validity + pending location: SetupStepLocation calls back with the
  // candidate Location whenever the form is valid. We capture it but do not write
  // to the store until the user clicks Next (avoids redundant store writes on every keystroke).
  const [locationValid, setLocationValid] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<Location | null>(null);

  const handleNext = () => {
    if (step === 1) {
      if (pendingLocation) setLocation(pendingLocation);
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleFinish = () => {
    navigate('/plan');
  };

  const plantingCount = plan?.plantings.length ?? 0;
  const nextDisabled =
    (step === 1 && !locationValid) || (step === 2 && plantingCount === 0);

  // Hero copy is only shown on Step 1 when the plan was null at mount (first-run UX per UI-SPEC §1).
  const showHero = step === 1 && planWasNullAtMount;

  return (
    <div className="max-w-[var(--spacing-wizard-max-w)] mx-auto px-4 py-12">
      {showHero && (
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-stone-900">
            Let&apos;s set up your garden
          </h1>
          <p className="mt-2 max-w-prose text-base text-stone-600">
            Three quick steps. You can change anything later — nothing&apos;s locked in.
          </p>
        </div>
      )}

      <ol role="list" className="flex items-center justify-between mb-8">
        {STEPS.map(({ n, label, sub }) => {
          const isActive = step === n;
          const isComplete = step > n;
          const circle = cn(
            'h-8 w-8 rounded-full flex items-center justify-center font-semibold',
            isActive && 'bg-green-700 text-white',
            isComplete && !isActive && 'bg-green-700 text-white',
            !isActive && !isComplete && 'border-2 border-stone-200 text-stone-500 font-medium',
          );
          const labelClass = cn(
            'mt-2 text-sm',
            isActive ? 'font-semibold text-stone-900' : 'font-medium text-stone-500',
          );
          return (
            <li
              key={n}
              {...(isActive ? { 'aria-current': 'step' as const } : {})}
              className="flex flex-col items-center"
            >
              <div className={circle} aria-hidden="true">
                {isComplete ? '✓' : n}
              </div>
              <p className={labelClass}>{label}</p>
              <p className="text-xs text-stone-500 hidden md:block">{sub}</p>
            </li>
          );
        })}
      </ol>

      <div className="min-h-[400px]">
        {step === 1 && (
          <SetupStepLocation
            onValidLocation={(loc) => {
              setPendingLocation(loc);
              setLocationValid(true);
            }}
            onLocationInvalid={() => {
              setLocationValid(false);
            }}
          />
        )}
        {step === 2 && <SetupStepPlants />}
        {step === 3 && <SetupStepReview />}
      </div>

      <div className="sticky bottom-0 mt-8 flex items-center justify-between border-t border-stone-200 bg-white py-4">
        {step > 1 ? (
          <Button variant="ghost" onClick={handleBack}>
            Back
          </Button>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={nextDisabled}
            aria-disabled={nextDisabled}
          >
            Next
          </Button>
        ) : (
          <Button variant="primary" onClick={handleFinish}>
            Finish — go to my plan
          </Button>
        )}
      </div>
    </div>
  );
}
