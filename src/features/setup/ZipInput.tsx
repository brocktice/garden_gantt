// src/features/setup/ZipInput.tsx
// Presentational ZIP input row per UI-SPEC §Component Inventory item 2.
// Strips non-digits and caps at 5; numeric input mode optimizes mobile keyboards.
//
// Source: [CITED: .planning/phases/02-data-layer-first-end-to-end/02-UI-SPEC.md §2 — Setup Wizard Step 1]
//         [CITED: .planning/phases/02-data-layer-first-end-to-end/02-08-PLAN.md Task 1]

import { type ChangeEvent } from 'react';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';

export interface ZipInputProps {
  value: string;
  onChange: (next: string) => void;
  error?: string | undefined;
}

export function ZipInput({ value, onChange, error }: ZipInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Strip non-digits, cap at 5 (T-02-25/26: client-side input shape constraint).
    const digits = e.target.value.replace(/\D/g, '').slice(0, 5);
    onChange(digits);
  };
  const errorId = error ? 'zip-error' : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="zip-input">Your ZIP code</Label>
      <Input
        id="zip-input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]{5}"
        placeholder="e.g. 80401"
        value={value}
        onChange={handleChange}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={errorId}
        maxLength={5}
        autoComplete="postal-code"
      />
      <p className="text-sm text-stone-600">
        We use this to look up your USDA zone and frost dates. Stored only in your browser.
      </p>
      {error && (
        <p id="zip-error" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
