// src/features/settings/SettingsPanel.tsx
// /settings route content — Export + Import + (Phase 4) Clear plan sections.
// Source: [CITED: 02-UI-SPEC.md §9 Settings page (full layout + copy)]
//         [CITED: 02-11-PLAN.md Task 2]
//         [CITED: 02-CONTEXT.md D-27, D-28, D-29]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-03-PLAN.md Task 1 — Clear plan modal-confirm (D-09)]
import { useRef, useState, type ChangeEvent } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { Button } from '../../ui/Button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from '../../ui/Dialog';
import { usePlanStore } from '../../stores/planStore';
import { useUIStore } from '../../stores/uiStore';
import { pushToast } from '../../ui/toast/useToast';
import { exportPlan } from './exportPlan';
import { parseImportFile, type ImportResult } from './importPlan';
import { CORRUPT_IMPORT_COPY, ImportPreviewModal } from './ImportPreviewModal';

type SuccessResult = Extract<ImportResult, { ok: true }>;

export function SettingsPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewResult, setPreviewResult] = useState<SuccessResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [clearPlanOpen, setClearPlanOpen] = useState(false);
  // WR-07 (REVIEW Phase 4): read lastExportedAt from uiStore so it survives
  // navigation. exportPlan() already calls setLastExportedAt on success.
  const lastExportedAt = useUIStore((s) => s.exportReminder.lastExportedAt);

  const handleExport = () => {
    const r = exportPlan();
    if (r.ok) {
      setImportError(null);
    } else {
      setImportError(r.reason);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = await parseImportFile(file);
    if (r.ok) {
      setImportError(null);
      setPreviewResult(r);
    } else {
      setPreviewResult(null);
      setImportError(
        r.reason === 'invalid-json'
          ? "That file isn't valid JSON. Try a file you exported from Garden Gantt."
          : r.reason === 'newer-version'
            ? 'That plan was made with a newer version of Garden Gantt. Update the app and try again.'
            : // D-10 (Plan 04-03 Task 3) corrupt-input verbatim copy — sourced from
              // ImportPreviewModal so the modal file owns the literal under acceptance grep.
              CORRUPT_IMPORT_COPY,
      );
    }
    // Reset so picking the same file again still triggers onChange.
    e.target.value = '';
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold text-stone-900">Settings</h1>

      <section className="mt-8 border-b border-stone-200 pb-6">
        <h2 className="text-xl font-semibold text-stone-900">Export your plan</h2>
        <p className="mt-1 text-base text-stone-600">
          Download your full plan as a JSON file. Use this to back up your work or move it to
          another browser.
        </p>
        <Button variant="primary" className="mt-4" onClick={handleExport}>
          <Download className="h-4 w-4" /> Export plan
        </Button>
        <p className="mt-2 text-sm text-stone-500">
          {lastExportedAt
            ? `Last exported: ${lastExportedAt.slice(0, 10)}`
            : 'Last exported: never'}
        </p>
      </section>

      <section className="py-6">
        <h2 className="text-xl font-semibold text-stone-900">Import a plan</h2>
        <p className="mt-1 text-base text-stone-600">
          Replace your current plan with one from a JSON file. We&apos;ll show you a preview
          first.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" /> Import plan
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="sr-only"
          aria-hidden="true"
        />

        {importError && (
          <div className="mt-4 bg-red-50 border border-red-200 p-3 rounded-md text-sm text-red-800">
            {importError}
          </div>
        )}
      </section>

      {previewResult && (
        <ImportPreviewModal
          open={previewResult !== null}
          onOpenChange={(open) => {
            if (!open) setPreviewResult(null);
          }}
          result={previewResult}
        />
      )}

      {/* Phase 4 (Plan 04-04, D-06/D-07): Reset onboarding — re-arms coach marks.
          SEPARATE affordance from Clear plan (D-07): clearing the plan does NOT
          re-show coach marks; only this Reset button re-arms them. */}
      <section className="py-6 border-t border-stone-200 mt-2">
        <h2 className="text-xl font-semibold text-stone-900">Onboarding</h2>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-stone-900">
              Reset onboarding
            </p>
            <p className="text-base text-stone-700">
              Show the Plan-page tour again on your next visit.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              useUIStore.getState().setCoachMarksDismissed(false);
              pushToast({
                variant: 'success',
                duration: 5000,
                title: 'Tour will show next time you visit Plan.',
              });
            }}
          >
            Reset
          </Button>
        </div>
      </section>

      {/* Phase 4 (Plan 04-03): Danger zone — Clear plan with modal-confirm. */}
      <section className="py-6 border-t border-stone-200 mt-2">
        <h2 className="text-xl font-semibold text-stone-900">Danger zone</h2>
        <p className="mt-1 text-base text-stone-600">
          Wipe your plan and start fresh. Export first if you want a backup.
        </p>
        <Button
          variant="destructive"
          className="mt-4"
          onClick={() => setClearPlanOpen(true)}
        >
          <Trash2 className="h-4 w-4" /> Clear plan
        </Button>
      </section>

      <Dialog open={clearPlanOpen} onOpenChange={setClearPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear plan?</DialogTitle>
            <DialogDescription>
              This removes all plantings, custom plants, custom tasks, and drag adjustments.
              Export first if you want a backup. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setClearPlanOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                usePlanStore.getState().clearPlan();
                setClearPlanOpen(false);
              }}
            >
              Clear plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
